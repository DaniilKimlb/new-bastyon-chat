<script setup lang="ts">
import { useAuthStore } from "@/entities/auth";

const authStore = useAuthStore();

const isMac = (window as any).electronAPI?.platform === "darwin";
const isMaximized = ref(false);

onMounted(() => {
  const api = (window as any).electronAPI;
  if (!api) return;
  api.onMaximized?.(() => { isMaximized.value = true; });
  api.onUnmaximized?.(() => { isMaximized.value = false; });
});

const minimize = () => (window as any).electronAPI?.minimize();
const maximize = () => (window as any).electronAPI?.maximize();
const close = () => (window as any).electronAPI?.close();
</script>

<template>
  <!-- Custom title bar — only rendered in Electron -->
  <div class="title-bar">
    <!-- macOS: empty space for traffic lights -->
    <div v-if="isMac" class="w-[76px] shrink-0" />

    <!-- App name + username -->
    <div class="flex min-w-0 flex-1 items-center gap-2 px-3">
      <span class="text-xs font-semibold text-text-color">Bastyon Chat</span>
      <span
        v-if="authStore.userInfo?.name"
        class="truncate text-xs text-text-on-main-bg-color"
      >
        — {{ authStore.userInfo.name }}
      </span>
    </div>

    <!-- Window controls (Windows/Linux only — macOS uses native traffic lights) -->
    <div v-if="!isMac" class="flex shrink-0">
      <button class="win-btn hover:bg-neutral-grad-0" @click="minimize" title="Minimize">
        <svg width="10" height="1" viewBox="0 0 10 1">
          <rect width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <button class="win-btn hover:bg-neutral-grad-0" @click="maximize" title="Maximize">
        <svg v-if="!isMaximized" width="10" height="10" viewBox="0 0 10 10">
          <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" fill="none" stroke-width="1" />
        </svg>
        <svg v-else width="10" height="10" viewBox="0 0 10 10">
          <rect x="2.5" y="0.5" width="7" height="7" stroke="currentColor" fill="none" stroke-width="1" />
          <rect x="0.5" y="2.5" width="7" height="7" stroke="currentColor" fill="rgb(var(--background-total-theme))" stroke-width="1" />
        </svg>
      </button>
      <button class="win-btn hover:!bg-red-500 hover:!text-white" @click="close" title="Close">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  height: 32px;
  flex-shrink: 0;
  background: rgb(var(--background-total-theme));
  border-bottom: 1px solid rgb(var(--neutral-grad-0));
  -webkit-app-region: drag;
  user-select: none;
}

.win-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 32px;
  color: rgb(var(--text-on-main-bg-color));
  -webkit-app-region: no-drag;
  transition: background-color 0.1s;
}
</style>
