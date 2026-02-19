<script setup lang="ts">
import { computed } from "vue";

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: string;
  danger?: boolean;
}

interface Props {
  show: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: []; select: [action: string] }>();

const style = computed(() => {
  const menuWidth = 280; // wide enough for reaction row + more button
  const menuHeight = props.items.length * 44 + 60; // +60 for header
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(props.x, vw - menuWidth - 8);
  const top = props.y + menuHeight > vh ? Math.max(8, props.y - menuHeight) : props.y;
  return { left: `${Math.max(8, left)}px`, top: `${top}px` };
});

const handleSelect = (action: string) => {
  emit("select", action);
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <transition name="ctx-menu">
      <div v-if="props.show" class="fixed inset-0 z-50" @click.self="emit('close')" @contextmenu.prevent="emit('close')">
        <div
          class="absolute min-w-[200px] overflow-hidden rounded-xl border border-neutral-grad-0 bg-background-total-theme py-1 shadow-xl"
          :style="style"
        >
          <slot name="header" />
          <button
            v-for="item in props.items"
            :key="item.action"
            class="flex h-[44px] w-full items-center gap-3 px-4 text-sm transition-colors hover:bg-neutral-grad-0"
            :class="item.danger ? 'text-color-bad' : 'text-text-color'"
            @click="handleSelect(item.action)"
          >
            <span v-if="item.icon" class="w-5 text-center">{{ item.icon }}</span>
            {{ item.label }}
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.ctx-menu-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.ctx-menu-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.ctx-menu-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
.ctx-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
@media (prefers-reduced-motion: reduce) {
  .ctx-menu-enter-active,
  .ctx-menu-leave-active {
    transition: none;
  }
}
</style>
