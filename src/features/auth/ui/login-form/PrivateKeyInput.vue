<script setup lang="ts">
interface Props {
  modelValue: string;
  error?: string;
}

defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const showKey = ref(false);
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="text-sm font-medium text-text-color">
      Private Key or Mnemonic
    </label>
    <div class="relative">
      <textarea
        :value="modelValue"
        :type="showKey ? 'text' : 'password'"
        placeholder="Enter your private key (WIF/hex) or mnemonic phrase..."
        rows="3"
        class="w-full rounded-lg border border-neutral-grad-2 bg-background-total-theme px-3 py-2 text-sm text-text-color outline-none transition-colors placeholder:text-neutral-grad-2 focus:border-color-bg-ac"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
      <button
        type="button"
        class="absolute right-2 top-2 text-xs text-color-txt-ac"
        @click="showKey = !showKey"
      >
        {{ showKey ? "Hide" : "Show" }}
      </button>
    </div>
    <span v-if="error" class="text-xs text-color-bad">{{ error }}</span>
  </div>
</template>
