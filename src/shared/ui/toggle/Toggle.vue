<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: "md",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const toggle = () => {
  if (!props.disabled) {
    emit("update:modelValue", !props.modelValue);
  }
};
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-bg-ac"
    :class="[
      modelValue ? 'bg-color-bg-ac' : 'bg-neutral-grad-2',
      disabled ? 'cursor-not-allowed opacity-50' : '',
      size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
    ]"
    @click="toggle"
  >
    <span
      class="pointer-events-none inline-block rounded-full bg-white shadow transition-transform"
      :class="[
        size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        modelValue
          ? size === 'sm' ? 'translate-x-4' : 'translate-x-5'
          : 'translate-x-0.5',
      ]"
    />
  </button>
</template>
