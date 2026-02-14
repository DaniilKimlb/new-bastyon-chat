<script setup lang="ts">
import { useAuthStore } from "@/entities/auth";

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = () => {
  authStore.logout();
  router.push({ name: "WelcomePage" });
};
</script>

<template>
  <Button variant="danger" @click="handleLogout">
    Logout
  </Button>
</template>
