<script setup lang="ts">
import AppHeader from "@/widgets/header/AppHeader.vue";
</script>

<template>
  <div class="flex h-full flex-col bg-background-total-theme">
    <AppHeader />
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>
