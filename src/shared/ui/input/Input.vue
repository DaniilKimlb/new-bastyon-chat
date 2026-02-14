<script setup lang="ts">
interface Props {
  modelValue?: string;
  label?: string;
  error?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  label: "",
  error: "",
  placeholder: "",
  type: "text",
  disabled: false
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const onInput = (e: Event) => {
  emit("update:modelValue", (e.target as HTMLInputElement).value);
};
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="props.label" class="text-sm font-medium text-text-color">
      {{ props.label }}
    </label>
    <input
      :value="props.modelValue"
      :type="props.type"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      class="h-10 rounded-lg border border-neutral-grad-2 bg-background-total-theme px-3 text-text-color outline-none transition-colors placeholder:text-neutral-grad-2 focus:border-color-bg-ac disabled:opacity-50"
      @input="onInput"
    />
    <span v-if="props.error" class="text-xs text-color-bad">
      {{ props.error }}
    </span>
  </div>
</template>
