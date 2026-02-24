<script setup lang="ts">
interface Props {
  message: string;
  type?: "info" | "success" | "error";
  show: boolean;
}

const props = withDefaults(defineProps<Props>(), { type: "info" });
const emit = defineEmits<{ close: [] }>();

const typeClasses = computed(() => ({
  info: "bg-color-bg-ac text-text-on-bg-ac-color",
  success: "bg-color-good text-white",
  error: "bg-color-bad text-white"
}[props.type]));

watch(() => props.show, (val) => {
  if (val) {
    setTimeout(() => emit("close"), 3000);
  }
});
</script>

<template>
  <Teleport to="body">
    <transition name="toast-slide">
      <div
        v-if="props.show"
        :class="typeClasses"
        class="fixed left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg"
        style="bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))"
      >
        {{ props.message }}
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s;
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
