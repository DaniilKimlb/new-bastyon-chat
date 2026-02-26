<script setup lang="ts">
const router = useRouter();

const goToLogin = () => {
  router.push({ name: "LoginPage" });
};
</script>

<template>
  <div
    class="flex min-h-full flex-col items-center justify-center bg-background-total-theme p-6"
  >
    <div class="flex max-w-md flex-col items-center gap-6 text-center">
      <h1 class="text-3xl font-bold text-text-color">Bastyon Chat</h1>
      <p class="text-text-on-main-bg-color">
        Decentralized messaging with video calls. Private, secure,
        and censorship-resistant.
      </p>
      <Button size="lg" @click="goToLogin">Get Started</Button>
    </div>
  </div>
</template>
