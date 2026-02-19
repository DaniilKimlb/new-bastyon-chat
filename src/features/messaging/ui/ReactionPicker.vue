<script setup lang="ts">
import { useThemeStore } from "@/entities/theme";

const emit = defineEmits<{ select: [emoji: string] }>();

const themeStore = useThemeStore();
</script>

<template>
  <div class="flex items-center gap-1 rounded-full bg-background-total-theme px-2 py-1 shadow-lg">
    <button
      v-for="emoji in themeStore.quickReactions"
      :key="emoji"
      class="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-neutral-grad-0"
      @click="emit('select', emoji)"
    >
      {{ emoji }}
    </button>
  </div>
</template>
