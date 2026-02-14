import { ref, onUnmounted } from "vue";
import { useMediaStore, CallState, getMediaConstraints, getScreenShareConstraints } from "@/entities/media";
import { createPeerConnectionConfig, SFU_CONFIG } from "./webrtc-config";

export function useWebRTC() {
  const mediaStore = useMediaStore();
  const peerConnection = ref<RTCPeerConnection | null>(null);
  const sfuSocket = ref<WebSocket | null>(null);

  const connectToSFU = () => {
    sfuSocket.value = new WebSocket(SFU_CONFIG.wsUrl);

    sfuSocket.value.onopen = () => {
      mediaStore.setCallState(CallState.connecting);
    };

    sfuSocket.value.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data as string);

      switch (message.type) {
        case "offer":
          await handleOffer(message.sdp);
          break;
        case "answer":
          await handleAnswer(message.sdp);
          break;
        case "ice-candidate":
          await handleIceCandidate(message.candidate);
          break;
        case "participant-joined":
          mediaStore.addParticipant({
            id: message.participantId,
            address: message.address,
            name: message.name,
            stream: null,
            audioEnabled: true,
            videoEnabled: true
          });
          break;
        case "participant-left":
          mediaStore.removeParticipant(message.participantId);
          break;
      }
    };

    sfuSocket.value.onclose = () => {
      if (mediaStore.callState !== CallState.idle) {
        mediaStore.setCallState(CallState.disconnected);
      }
    };
  };

  const createPeerConnection = () => {
    const config = createPeerConnectionConfig();
    peerConnection.value = new RTCPeerConnection(config);

    peerConnection.value.onicecandidate = (event) => {
      if (event.candidate && sfuSocket.value?.readyState === WebSocket.OPEN) {
        sfuSocket.value.send(JSON.stringify({
          type: "ice-candidate",
          candidate: event.candidate.toJSON()
        }));
      }
    };

    peerConnection.value.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        // Associate stream with participant
        const participant = mediaStore.participants.find(
          p => !p.stream || p.stream.id !== stream.id
        );
        if (participant) {
          participant.stream = stream;
        }
      }
    };

    peerConnection.value.onconnectionstatechange = () => {
      const state = peerConnection.value?.connectionState;
      if (state === "connected") {
        mediaStore.setCallState(CallState.connected);
      } else if (state === "failed" || state === "disconnected") {
        mediaStore.setCallState(CallState.failed);
      }
    };
  };

  const startCall = async (roomId: string) => {
    try {
      const constraints = getMediaConstraints(
        mediaStore.selectedAudioDevice,
        mediaStore.selectedVideoDevice
      );
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStore.setLocalStream(stream);

      createPeerConnection();
      connectToSFU();

      stream.getTracks().forEach(track => {
        peerConnection.value!.addTrack(track, stream);
      });

      const offer = await peerConnection.value!.createOffer();
      await peerConnection.value!.setLocalDescription(offer);

      sfuSocket.value?.send(JSON.stringify({
        type: "join",
        roomId,
        sdp: offer.sdp
      }));
    } catch (err) {
      console.error("Failed to start call:", err);
      mediaStore.setCallState(CallState.failed);
    }
  };

  const handleOffer = async (sdp: string) => {
    if (!peerConnection.value) return;
    await peerConnection.value.setRemoteDescription({ type: "offer", sdp });
    const answer = await peerConnection.value.createAnswer();
    await peerConnection.value.setLocalDescription(answer);
    sfuSocket.value?.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
  };

  const handleAnswer = async (sdp: string) => {
    if (!peerConnection.value) return;
    await peerConnection.value.setRemoteDescription({ type: "answer", sdp });
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection.value) return;
    await peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia(
        getScreenShareConstraints()
      );
      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = peerConnection.value
        ?.getSenders()
        .find(s => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      mediaStore.screenSharing = true;

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };

  const stopScreenShare = async () => {
    const videoTrack = mediaStore.localStream?.getVideoTracks()[0];
    if (videoTrack) {
      const sender = peerConnection.value
        ?.getSenders()
        .find(s => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }
    }
    mediaStore.screenSharing = false;
  };

  const endCall = () => {
    sfuSocket.value?.send(JSON.stringify({ type: "leave" }));
    sfuSocket.value?.close();
    peerConnection.value?.close();
    peerConnection.value = null;
    sfuSocket.value = null;
    mediaStore.clearCall();
  };

  onUnmounted(endCall);

  return {
    endCall,
    startCall,
    startScreenShare,
    stopScreenShare
  };
}
