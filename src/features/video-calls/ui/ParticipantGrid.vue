<script setup lang="ts">
import { useMediaStore } from "@/entities/media";

const mediaStore = useMediaStore();

const localVideoRef = ref<HTMLVideoElement>();

watch(() => mediaStore.localStream, (stream) => {
  if (localVideoRef.value && stream) {
    localVideoRef.value.srcObject = stream;
  }
});

onMounted(() => {
  if (localVideoRef.value && mediaStore.localStream) {
    localVideoRef.value.srcObject = mediaStore.localStream;
  }
});

const gridCols = computed(() => {
  const count = mediaStore.participants.length + 1;
  if (count <= 1) return "grid-cols-1";
  if (count <= 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  return "grid-cols-3";
});
</script>

<template>
  <div :class="gridCols" class="grid h-full gap-2 p-2">
    <!-- Local video -->
    <div class="relative overflow-hidden rounded-lg bg-neutral-grad-0">
      <video
        ref="localVideoRef"
        autoplay
        muted
        playsinline
        class="h-full w-full object-cover"
        :class="{ hidden: !mediaStore.videoEnabled }"
      />
      <div
        v-if="!mediaStore.videoEnabled"
        class="flex h-full items-center justify-center"
      >
        <Avatar name="You" size="lg" />
      </div>
      <div class="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        You {{ !mediaStore.audioEnabled ? "(muted)" : "" }}
      </div>
    </div>

    <!-- Remote participants -->
    <div
      v-for="participant in mediaStore.participants"
      :key="participant.id"
      class="relative overflow-hidden rounded-lg bg-neutral-grad-0"
    >
      <video
        v-if="participant.stream && participant.videoEnabled"
        autoplay
        playsinline
        class="h-full w-full object-cover"
        :srcObject="participant.stream"
      />
      <div v-else class="flex h-full items-center justify-center">
        <Avatar :name="participant.name" size="lg" />
      </div>
      <div class="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {{ participant.name }} {{ !participant.audioEnabled ? "(muted)" : "" }}
      </div>
    </div>
  </div>
</template>
