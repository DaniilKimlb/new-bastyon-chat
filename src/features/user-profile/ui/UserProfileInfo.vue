<script setup lang="ts">
import { useAuthStore } from "@/entities/auth";

const authStore = useAuthStore();
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <Avatar
      :src="authStore.userInfo?.image"
      :name="authStore.userInfo?.name || 'User'"
      size="lg"
    />

    <div class="text-center">
      <h2 class="text-xl font-bold text-text-color">
        {{ authStore.userInfo?.name || "Anonymous" }}
      </h2>
      <p class="mt-1 text-sm text-text-on-main-bg-color">
        {{ authStore.address }}
      </p>
    </div>

    <div v-if="authStore.userInfo" class="w-full space-y-3">
      <div
        v-if="authStore.userInfo.about"
        class="rounded-lg bg-background-secondary-theme p-4"
      >
        <div class="mb-1 text-xs font-medium text-text-on-main-bg-color">About</div>
        <p class="text-sm text-text-color">{{ authStore.userInfo.about }}</p>
      </div>

      <div
        v-if="authStore.userInfo.site"
        class="rounded-lg bg-background-secondary-theme p-4"
      >
        <div class="mb-1 text-xs font-medium text-text-on-main-bg-color">Website</div>
        <a
          :href="authStore.userInfo.site"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-color-txt-ac hover:underline"
        >
          {{ authStore.userInfo.site }}
        </a>
      </div>

      <div class="rounded-lg bg-background-secondary-theme p-4">
        <div class="mb-1 text-xs font-medium text-text-on-main-bg-color">Language</div>
        <p class="text-sm text-text-color">
          {{ authStore.userInfo.language || "Not set" }}
        </p>
      </div>
    </div>
  </div>
</template>
