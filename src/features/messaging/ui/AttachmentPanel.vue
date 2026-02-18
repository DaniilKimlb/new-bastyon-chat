<script setup lang="ts">
import { BottomSheet } from "@/shared/ui/bottom-sheet";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: []; selectPhoto: []; selectFile: [] }>();

const actions = [
  {
    label: "Photo or Video",
    icon: "image",
    action: () => { emit("selectPhoto"); emit("close"); },
  },
  {
    label: "File",
    icon: "file",
    action: () => { emit("selectFile"); emit("close"); },
  },
];
</script>

<template>
  <BottomSheet :show="props.show" @close="emit('close')">
    <div class="grid grid-cols-2 gap-3 p-2">
      <button
        v-for="item in actions"
        :key="item.label"
        class="flex flex-col items-center gap-2 rounded-xl py-4 transition-colors hover:bg-neutral-grad-0"
        @click="item.action()"
      >
        <!-- Photo icon -->
        <div
          v-if="item.icon === 'image'"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-color-bg-ac/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-color-bg-ac">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <!-- File icon -->
        <div
          v-if="item.icon === 'file'"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-color-bg-ac/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-color-bg-ac">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <span class="text-sm font-medium text-text-color">{{ item.label }}</span>
      </button>
    </div>
  </BottomSheet>
</template>
