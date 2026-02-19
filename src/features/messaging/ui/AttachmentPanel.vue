<script setup lang="ts">
import { computed } from "vue";

interface Props {
  show: boolean;
  x: number;
  y: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: []; selectPhoto: []; selectFile: [] }>();

const panelStyle = computed(() => {
  const menuW = 200;
  const menuH = 112;
  const pad = 8;
  let left = props.x - menuW / 2;
  let top = props.y - menuH - pad;
  // Clamp to viewport
  left = Math.max(pad, Math.min(left, window.innerWidth - menuW - pad));
  if (top < pad) top = props.y + pad;
  return { left: `${left}px`, top: `${top}px` };
});

const selectPhoto = () => { emit("selectPhoto"); emit("close"); };
const selectFile = () => { emit("selectFile"); emit("close"); };
</script>

<template>
  <Teleport to="body">
    <transition name="attach-popup">
      <div v-if="props.show" class="fixed inset-0 z-50" @click.self="emit('close')">
        <div
          class="fixed z-50 w-[200px] overflow-hidden rounded-xl border border-neutral-grad-0 bg-background-total-theme shadow-xl"
          :style="panelStyle"
        >
          <button
            class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-color transition-colors hover:bg-neutral-grad-0"
            @click="selectPhoto"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-color-bg-ac">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Photo or Video
          </button>
          <button
            class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-color transition-colors hover:bg-neutral-grad-0"
            @click="selectFile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-color-bg-ac">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            File
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.attach-popup-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.attach-popup-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.attach-popup-enter-from,
.attach-popup-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}
</style>
