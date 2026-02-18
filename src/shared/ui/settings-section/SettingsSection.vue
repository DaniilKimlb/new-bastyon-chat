<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
}

defineProps<Props>();
</script>

<template>
  <div class="space-y-3">
    <div>
      <h3 class="text-sm font-medium text-text-color">{{ title }}</h3>
      <p v-if="description" class="mt-0.5 text-xs text-text-on-main-bg-color">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
