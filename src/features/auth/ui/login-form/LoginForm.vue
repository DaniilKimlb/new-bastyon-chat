<script setup lang="ts">
import { useAuthStore } from "@/entities/auth";
import PrivateKeyInput from "./PrivateKeyInput.vue";

const router = useRouter();
const authStore = useAuthStore();

const cryptoCredential = ref("");
const errorMessage = ref("");

const handleLogin = async () => {
  errorMessage.value = "";

  if (!cryptoCredential.value.trim()) {
    errorMessage.value = "Please enter a private key or mnemonic";
    return;
  }

  const result = await authStore.login(cryptoCredential.value.trim());
  if (result?.error) {
    errorMessage.value = result.error;
  } else {
    router.push({ name: "ChatPage" });
  }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-text-color">Sign In</h1>
      <p class="mt-2 text-sm text-text-on-main-bg-color">
        Enter your Bastyon private key or mnemonic phrase
      </p>
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="handleLogin">
      <PrivateKeyInput
        v-model="cryptoCredential"
        :error="errorMessage"
      />

      <Button
        type="submit"
        size="lg"
        :disabled="authStore.isLoggingIn"
        class="w-full"
      >
        <Spinner v-if="authStore.isLoggingIn" size="sm" class="mr-2" />
        {{ authStore.isLoggingIn ? "Signing in..." : "Sign In" }}
      </Button>
    </form>

    <p class="text-center text-xs text-text-on-main-bg-color">
      Your private key never leaves your device
    </p>
  </div>
</template>
