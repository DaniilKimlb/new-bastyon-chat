<script setup lang="ts">
const emit = defineEmits<{ select: [emoji: string] }>();

const QUICK_EMOJIS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F525}"];
</script>

<template>
  <div class="flex items-center gap-1 rounded-full bg-background-total-theme px-2 py-1 shadow-lg">
    <button
      v-for="emoji in QUICK_EMOJIS"
      :key="emoji"
      class="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-neutral-grad-0"
      @click="emit('select', emoji)"
    >
      {{ emoji }}
    </button>
  </div>
</template>
