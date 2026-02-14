import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { CallState } from "./types";
import type { Participant } from "./types";

const NAMESPACE = "media";

export const useMediaStore = defineStore(NAMESPACE, () => {
  const audioEnabled = ref(true);
  const videoEnabled = ref(true);
  const screenSharing = ref(false);
  const callState = ref<CallState>(CallState.idle);
  const participants = ref<Participant[]>([]);
  const localStream = ref<MediaStream | null>(null);
  const selectedAudioDevice = ref<string | null>(null);
  const selectedVideoDevice = ref<string | null>(null);

  const isInCall = computed(() =>
    callState.value === CallState.connected ||
    callState.value === CallState.connecting
  );

  const toggleAudio = () => {
    audioEnabled.value = !audioEnabled.value;
    if (localStream.value) {
      localStream.value.getAudioTracks().forEach(
        track => (track.enabled = audioEnabled.value)
      );
    }
  };

  const toggleVideo = () => {
    videoEnabled.value = !videoEnabled.value;
    if (localStream.value) {
      localStream.value.getVideoTracks().forEach(
        track => (track.enabled = videoEnabled.value)
      );
    }
  };

  const setCallState = (state: CallState) => {
    callState.value = state;
  };

  const setLocalStream = (stream: MediaStream | null) => {
    localStream.value = stream;
  };

  const addParticipant = (participant: Participant) => {
    const existing = participants.value.findIndex(p => p.id === participant.id);
    if (existing >= 0) {
      participants.value[existing] = participant;
    } else {
      participants.value.push(participant);
    }
  };

  const removeParticipant = (id: string) => {
    participants.value = participants.value.filter(p => p.id !== id);
  };

  const clearCall = () => {
    localStream.value?.getTracks().forEach(t => t.stop());
    localStream.value = null;
    participants.value = [];
    callState.value = CallState.idle;
    screenSharing.value = false;
  };

  return {
    addParticipant,
    audioEnabled,
    callState,
    clearCall,
    isInCall,
    localStream,
    participants,
    removeParticipant,
    screenSharing,
    selectedAudioDevice,
    selectedVideoDevice,
    setCallState,
    setLocalStream,
    toggleAudio,
    toggleVideo,
    videoEnabled
  };
});
