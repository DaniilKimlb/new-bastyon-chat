<script setup lang="ts">
import { useMediaStore } from "@/entities/media";

const mediaStore = useMediaStore();

const emit = defineEmits<{
  toggleScreenShare: [];
  endCall: [];
}>();
</script>

<template>
  <div class="flex items-center justify-center gap-4 bg-background-main-contrast/90 p-4">
    <!-- Mute audio -->
    <button
      class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
      :class="
        mediaStore.audioEnabled
          ? 'bg-neutral-grad-3 text-white hover:bg-neutral-grad-2'
          : 'bg-color-bad text-white'
      "
      @click="mediaStore.toggleAudio()"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path v-if="mediaStore.audioEnabled" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path v-if="mediaStore.audioEnabled" d="M19 10v2a7 7 0 01-14 0v-2" />
        <line v-if="mediaStore.audioEnabled" x1="12" y1="19" x2="12" y2="23" />
        <line v-if="mediaStore.audioEnabled" x1="8" y1="23" x2="16" y2="23" />
        <line v-if="!mediaStore.audioEnabled" x1="1" y1="1" x2="23" y2="23" />
      </svg>
    </button>

    <!-- Toggle video -->
    <button
      class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
      :class="
        mediaStore.videoEnabled
          ? 'bg-neutral-grad-3 text-white hover:bg-neutral-grad-2'
          : 'bg-color-bad text-white'
      "
      @click="mediaStore.toggleVideo()"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon v-if="mediaStore.videoEnabled" points="23 7 16 12 23 17 23 7" />
        <rect v-if="mediaStore.videoEnabled" x="1" y="5" width="15" height="14" rx="2" ry="2" />
        <line v-if="!mediaStore.videoEnabled" x1="1" y1="1" x2="23" y2="23" />
      </svg>
    </button>

    <!-- Screen share -->
    <button
      class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
      :class="
        mediaStore.screenSharing
          ? 'bg-color-bg-ac text-white'
          : 'bg-neutral-grad-3 text-white hover:bg-neutral-grad-2'
      "
      @click="emit('toggleScreenShare')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    </button>

    <!-- End call -->
    <button
      class="flex h-12 w-14 items-center justify-center rounded-full bg-color-bad text-white transition-colors hover:bg-color-bad/80"
      @click="emit('endCall')"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
        <line x1="23" y1="1" x2="1" y2="23" />
      </svg>
    </button>
  </div>
</template>
