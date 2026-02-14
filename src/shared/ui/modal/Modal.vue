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
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
