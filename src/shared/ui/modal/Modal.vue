<script setup lang="ts">
interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const onOverlayClick = () => {
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="props.show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-background-overlay"
        @click.self="onOverlayClick"
      >
        <div
          class="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-background-total-theme p-6 shadow-xl"
        >
          <slot />
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active {
  transition: opacity 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.modal-fade-leave-active {
  transition: opacity 0.2s ease-in;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Content card scale entrance */
.modal-fade-enter-active > div {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.modal-fade-leave-active > div {
  transition: transform 0.2s ease-in, opacity 0.2s ease-in;
}
.modal-fade-enter-from > div {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}
.modal-fade-leave-to > div {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}
</style>
