<script setup lang="ts">
import { useAuthStore } from "@/entities/auth";
import { useThemeStore } from "@/entities/theme";
import { useTorStore } from "@/entities/tor";
import { useUserStore } from "@/entities/user/model";
import Avatar from "@/shared/ui/avatar/Avatar.vue";
import { Toggle } from "@/shared/ui/toggle";
import { useSidebarTab } from "../model/use-sidebar-tab";

const authStore = useAuthStore();
const themeStore = useThemeStore();
const torStore = useTorStore();
const userStore = useUserStore();
const router = useRouter();
const { openSettingsContent } = useSidebarTab();

const { t } = useI18n();

const torStatusText = computed(() => {
  switch (torStore.status) {
    case "started": return t("tor.connected");
    case "running":
    case "install": return t("tor.connecting");
    case "failed": return t("tor.error");
    default: return t("tor.off");
  }
});

const isElectron = !!(window as any).electronAPI?.isElectron;

// Eagerly load current user's profile for the settings header
watch(
  () => authStore.address,
  (addr) => { if (addr) userStore.loadUserIfMissing(addr); },
  { immediate: true },
);

const currentUser = computed(() =>
  authStore.address ? userStore.getUser(authStore.address) : undefined,
);

const torStatusColor = computed(() => {
  switch (torStore.status) {
    case "started": return "text-green-500";
    case "running":
    case "install": return "text-yellow-500";
    case "failed": return "text-red-500";
    default: return "text-text-on-main-bg-color";
  }
});

const torDotClass = computed(() => {
  switch (torStore.status) {
    case "started": return "bg-green-500";
    case "running":
    case "install": return "bg-yellow-500 animate-pulse";
    case "failed": return "bg-red-500";
    default: return "bg-neutral-400";
  }
});

const handleLogout = () => {
  authStore.logout();
  router.push({ name: "WelcomePage" });
};
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div
      class="flex h-14 shrink-0 items-center border-b border-neutral-grad-0 px-4"
    >
      <span class="text-base font-semibold text-text-color">{{ t("settings.title") }}</span>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Profile header -->
      <div class="flex flex-col items-center px-4 pb-4 pt-6">
        <Avatar
          :src="currentUser?.image"
          :name="currentUser?.name || authStore.address || t('settings.anonymous')"
          size="xl"
        />
        <p class="mt-3 text-lg font-semibold text-text-color">
          {{ authStore.userInfo?.name || t("settings.anonymous") }}
        </p>
        <p
          v-if="authStore.address"
          class="mt-0.5 break-all text-center text-xs text-text-on-main-bg-color"
        >
          {{ authStore.address }}
        </p>
      </div>

      <!-- Menu items -->
      <div class="px-2 pb-4">
        <!-- My Profile -->
        <button
          class="flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-neutral-grad-0"
          @click="openSettingsContent('profile')"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="shrink-0 text-text-on-main-bg-color"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="flex-1 text-left text-sm text-text-color">{{ t("settings.myProfile") }}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="shrink-0 text-text-on-main-bg-color"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <!-- Appearance -->
        <button
          class="flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-neutral-grad-0"
          @click="openSettingsContent('appearance')"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="shrink-0 text-text-on-main-bg-color"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span class="flex-1 text-left text-sm text-text-color">{{ t("settings.appearance") }}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="shrink-0 text-text-on-main-bg-color"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <!-- Dark Mode -->
        <div
          class="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-neutral-grad-0"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="shrink-0 text-text-on-main-bg-color"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span class="flex-1 text-sm text-text-color">{{ t("settings.darkMode") }}</span>
          <Toggle
            :model-value="themeStore.isDarkMode"
            @update:model-value="themeStore.toggleTheme()"
          />
        </div>

        <!-- Tor Proxy (Electron only) -->
        <div
          v-if="isElectron"
          class="rounded-lg px-3 py-3 transition-colors hover:bg-neutral-grad-0"
        >
          <div class="flex items-center gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="shrink-0 text-text-on-main-bg-color"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span class="flex-1 text-sm text-text-color">{{ t("settings.torProxy") }}</span>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full" :class="torDotClass" />
                <span class="text-xs font-medium" :class="torStatusColor">{{ torStatusText }}</span>
              </div>
              <Toggle
                :model-value="torStore.isEnabled"
                @update:model-value="torStore.toggle()"
              />
            </div>
          </div>
          <p
            v-if="torStore.isConnecting && torStore.info"
            class="mt-2 pl-8 text-xs text-yellow-500"
          >
            {{ torStore.info }}
          </p>
          <p
            v-else-if="torStore.status === 'failed'"
            class="mt-2 pl-8 text-xs text-red-500"
          >
            {{ t("settings.torFailed") }}
          </p>
        </div>

        <!-- Divider -->
        <div class="my-1 border-t border-neutral-grad-0" />

        <!-- Logout -->
        <button
          class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-color-bad transition-colors hover:bg-neutral-grad-0"
          @click="handleLogout"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="shrink-0"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span class="flex-1 text-left text-sm">{{ t("settings.logout") }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
