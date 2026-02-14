<script setup lang="ts">
import MainLayout from "@/widgets/layouts/MainLayout.vue";
import { useThemeStore } from "@/entities/theme";

const themeStore = useThemeStore();
</script>

<template>
  <MainLayout>
    <div class="mx-auto max-w-2xl p-6">
      <h1 class="mb-6 text-xl font-bold text-text-color">Settings</h1>

      <div class="space-y-4">
        <div
          class="flex items-center justify-between rounded-lg bg-background-secondary-theme p-4"
        >
          <span class="text-text-color">Dark Mode</span>
          <button
            class="h-6 w-11 rounded-full transition-colors"
            :class="
              themeStore.isDarkMode ? 'bg-color-bg-ac' : 'bg-neutral-grad-2'
            "
            @click="themeStore.toggleTheme()"
          >
            <div
              class="h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="themeStore.isDarkMode ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
        </div>
      </div>
    </div>
  </MainLayout>
</template>
