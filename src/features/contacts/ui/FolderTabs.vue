<script setup lang="ts">
interface Props {
  modelValue: "all" | "personal" | "groups";
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [value: "all" | "personal" | "groups"] }>();

const tabs = [
  { value: "all" as const, label: "All" },
  { value: "personal" as const, label: "Personal" },
  { value: "groups" as const, label: "Groups" },
];
</script>

<template>
  <div class="flex border-b border-neutral-grad-0">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="relative flex-1 py-2.5 text-center text-sm font-medium transition-colors"
      :class="props.modelValue === tab.value ? 'text-color-bg-ac' : 'text-text-on-main-bg-color hover:text-text-color'"
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
      <div
        v-if="props.modelValue === tab.value"
        class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-color-bg-ac"
      />
    </button>
  </div>
</template>
