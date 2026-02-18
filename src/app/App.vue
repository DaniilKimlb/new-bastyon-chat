<script setup lang="ts">
import { useAuthStore } from "@/entities/auth";
import { useToast } from "@/shared/lib/use-toast";
import Toast from "@/shared/ui/toast/Toast.vue";

import { AppPages, AppRoutes, EAppProviders } from "./providers";

const { message: toastMessage, type: toastType, show: toastShow, close: toastClose } = useToast();

provide(EAppProviders.AppRoutes, AppRoutes);
provide(EAppProviders.AppPages, AppPages);

const authStore = useAuthStore();

onMounted(async () => {
  try {
    await authStore.fetchUserInfo();
  } catch (e) {
    console.error("[App] fetchUserInfo error:", e);
  }

  // Initialize Matrix on reload if already logged in
  if (authStore.isAuthenticated && !authStore.matrixReady) {
    await authStore.initMatrix();
  }
});
</script>

<template>
  <div class="relative min-h-screen bg-background-total-theme text-text-color">
    <transition mode="out-in" name="fade">
      <router-view />
    </transition>
    <Toast :message="toastMessage" :type="toastType" :show="toastShow" @close="toastClose" />
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
