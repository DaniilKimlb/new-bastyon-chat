<script setup lang="ts">
import { ref } from "vue";

interface Props {
  show: boolean;
  height?: string;
  dragDismiss?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  height: "auto",
  dragDismiss: true,
});
const emit = defineEmits<{ close: [] }>();

const sheetRef = ref<HTMLElement>();
let startY = 0;
let currentY = 0;
const translateY = ref(0);
const dragging = ref(false);

const onDragStart = (e: TouchEvent) => {
  if (!props.dragDismiss) return;
  startY = e.touches[0].clientY;
  dragging.value = true;
};

const onDragMove = (e: TouchEvent) => {
  if (!dragging.value) return;
  currentY = e.touches[0].clientY;
  const delta = currentY - startY;
  translateY.value = Math.max(0, delta);
};

const onDragEnd = () => {
  if (!dragging.value) return;
  dragging.value = false;
  const sheetHeight = sheetRef.value?.offsetHeight ?? 300;
  if (translateY.value > sheetHeight * 0.3) {
    emit("close");
  }
  translateY.value = 0;
};
</script>

<template>
  <Teleport to="body">
    <transition name="bs-fade">
      <div
        v-if="props.show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
        @click.self="emit('close')"
      >
        <transition name="bs-slide" appear>
          <div
            v-if="props.show"
            ref="sheetRef"
            class="w-full max-w-lg rounded-t-2xl bg-background-total-theme pb-safe"
            :style="{
              maxHeight: '85vh',
              height: props.height,
              transform: `translateY(${translateY}px)`,
              transition: dragging ? 'none' : 'transform 0.3s ease',
            }"
            @touchstart="onDragStart"
            @touchmove="onDragMove"
            @touchend="onDragEnd"
          >
            <div class="flex justify-center py-3">
              <div class="h-1 w-10 rounded-full bg-neutral-grad-2" />
            </div>
            <div class="overflow-y-auto px-4 pb-4" :style="{ maxHeight: 'calc(85vh - 40px)' }">
              <slot />
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.bs-fade-enter-active,
.bs-fade-leave-active {
  transition: opacity 0.2s;
}
.bs-fade-enter-from,
.bs-fade-leave-to {
  opacity: 0;
}
.bs-slide-enter-active,
.bs-slide-leave-active {
  transition: transform 0.3s ease;
}
.bs-slide-enter-from,
.bs-slide-leave-to {
  transform: translateY(100%);
}
@media (prefers-reduced-motion: reduce) {
  .bs-fade-enter-active,
  .bs-fade-leave-active,
  .bs-slide-enter-active,
  .bs-slide-leave-active {
    transition: none;
  }
}
</style>
