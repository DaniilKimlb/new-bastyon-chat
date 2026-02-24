<script setup lang="ts">
import { useChatStore } from "@/entities/chat";

type FilterValue = "all" | "personal" | "groups" | "invites";

interface Props {
  modelValue: FilterValue;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [value: FilterValue] }>();
const chatStore = useChatStore();

const tabs = [
  { value: "all" as const, label: "All" },
  { value: "personal" as const, label: "Personal" },
  { value: "groups" as const, label: "Groups" },
  { value: "invites" as const, label: "Invites" },
];
</script>

<template>
  <div class="flex border-b border-neutral-grad-0">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="relative flex-1 py-2.5 text-center text-sm font-medium transition-colors"
      :class="[
        props.modelValue === tab.value ? 'text-color-bg-ac' : 'text-text-on-main-bg-color hover:text-text-color',
        tab.value === 'invites' && chatStore.inviteCount === 0 ? 'hidden' : '',
      ]"
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
      <span
        v-if="tab.value === 'invites' && chatStore.inviteCount > 0"
        class="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-color-bg-ac px-1 text-[10px] font-medium text-white"
      >
        {{ chatStore.inviteCount }}
      </span>
      <div
        v-if="props.modelValue === tab.value"
        class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-color-bg-ac"
      />
    </button>
  </div>
</template>
