<script setup lang="ts">
import { useAuthStore } from "@/entities/auth";

import { AppPages, AppRoutes, EAppProviders } from "./providers";

provide(EAppProviders.AppRoutes, AppRoutes);
provide(EAppProviders.AppPages, AppPages);

const authStore = useAuthStore();

onMounted(async () => {
  console.log("[App] onMounted, isAuthenticated=%s", authStore.isAuthenticated);

  try {
    await authStore.fetchUserInfo();
    console.log("[App] fetchUserInfo done");
  } catch (e) {
    console.error("[App] fetchUserInfo error:", e);
  }

  // Initialize Matrix on reload if already logged in
  if (authStore.isAuthenticated && !authStore.matrixReady) {
    console.log("[App] Starting initMatrix...");
    await authStore.initMatrix();
    console.log("[App] initMatrix done, matrixReady=%s, error=%s",
      authStore.matrixReady, authStore.matrixError);
  }
});
</script>

<template>
  <div class="relative min-h-screen bg-background-total-theme text-text-color">
    <transition mode="out-in" name="fade">
      <router-view />
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
