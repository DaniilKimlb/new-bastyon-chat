<script setup lang="ts">
import MainLayout from "@/widgets/layouts/MainLayout.vue";
import { useThemeStore, Theme } from "@/entities/theme";
import { ACCENT_COLORS } from "@/entities/theme/model/stores";

const themeStore = useThemeStore();
const router = useRouter();
</script>

<template>
  <MainLayout>
    <div class="mx-auto max-w-2xl p-6">
      <!-- Header with back -->
      <div class="mb-6 flex items-center gap-3">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
          @click="router.back()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-xl font-bold text-text-color">Appearance</h1>
      </div>

      <div class="space-y-6">
        <!-- Theme selector -->
        <div>
          <h2 class="mb-3 text-sm font-medium text-text-on-main-bg-color">Theme</h2>
          <div class="flex gap-3">
            <button
              class="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
              :class="!themeStore.isDarkMode ? 'border-color-bg-ac bg-color-bg-ac/5' : 'border-neutral-grad-0 hover:border-neutral-grad-2'"
              @click="themeStore.setTheme(Theme.light)"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                </svg>
              </div>
              <span class="text-sm font-medium text-text-color">Light</span>
            </button>
            <button
              class="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
              :class="themeStore.isDarkMode ? 'border-color-bg-ac bg-color-bg-ac/5' : 'border-neutral-grad-0 hover:border-neutral-grad-2'"
              @click="themeStore.setTheme(Theme.dark)"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 shadow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </div>
              <span class="text-sm font-medium text-text-color">Dark</span>
            </button>
          </div>
        </div>

        <!-- Accent color -->
        <div>
          <h2 class="mb-3 text-sm font-medium text-text-on-main-bg-color">Accent Color</h2>
          <div class="flex flex-wrap gap-3">
            <button
              v-for="color in ACCENT_COLORS"
              :key="color.value"
              class="flex flex-col items-center gap-1.5"
              @click="themeStore.setAccentColor(color.value)"
            >
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all"
                :class="themeStore.accentColor === color.value ? 'border-text-color scale-110' : 'border-transparent'"
                :style="{ backgroundColor: color.value }"
              >
                <svg
                  v-if="themeStore.accentColor === color.value"
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span class="text-[11px] text-text-on-main-bg-color">{{ color.name }}</span>
            </button>
          </div>
        </div>

        <!-- Preview -->
        <div>
          <h2 class="mb-3 text-sm font-medium text-text-on-main-bg-color">Preview</h2>
          <div class="overflow-hidden rounded-xl border border-neutral-grad-0 bg-background-total-theme">
            <div class="flex items-center gap-2 border-b border-neutral-grad-0 px-3 py-2">
              <div class="h-8 w-8 rounded-full bg-neutral-grad-0" />
              <div>
                <div class="text-sm font-medium text-text-color">Chat Preview</div>
                <div class="text-xs text-text-on-main-bg-color">online</div>
              </div>
            </div>
            <div class="space-y-2 p-3">
              <div class="flex justify-start">
                <div class="max-w-[70%] rounded-2xl rounded-bl-sm bg-chat-bubble-other px-3 py-1.5 text-sm text-text-color">
                  Hey! How are you?
                </div>
              </div>
              <div class="flex justify-end">
                <div class="max-w-[70%] rounded-2xl rounded-br-sm bg-chat-bubble-own px-3 py-1.5 text-sm text-text-on-bg-ac-color">
                  I'm great, thanks!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>
