<script setup lang="ts">
import { useMediaStore } from "@/entities/media";
import { useWebRTC } from "../model/use-webrtc";
import ParticipantGrid from "./ParticipantGrid.vue";
import CallControls from "./CallControls.vue";

interface Props {
  roomId: string;
}

const props = defineProps<Props>();
const mediaStore = useMediaStore();
const { startCall, endCall, startScreenShare, stopScreenShare } = useWebRTC();

onMounted(() => {
  startCall(props.roomId);
});

const handleToggleScreenShare = () => {
  if (mediaStore.screenSharing) {
    stopScreenShare();
  } else {
    startScreenShare();
  }
};

const handleEndCall = () => {
  endCall();
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-background-main-contrast">
    <ParticipantGrid class="flex-1" />
    <CallControls
      @toggle-screen-share="handleToggleScreenShare"
      @end-call="handleEndCall"
    />
  </div>
</template>
