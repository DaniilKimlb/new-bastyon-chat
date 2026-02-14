<script setup lang="ts">
import { useAuthStore } from "@/entities/auth";
import AvatarUpload from "./AvatarUpload.vue";

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  name: authStore.userInfo?.name ?? "",
  about: authStore.userInfo?.about ?? "",
  site: authStore.userInfo?.site ?? "",
  language: authStore.userInfo?.language ?? ""
});

const handleSave = async () => {
  await authStore.editUserData({
    ...authStore.userInfo!,
    name: form.value.name,
    about: form.value.about,
    site: form.value.site,
    language: form.value.language
  });
  router.push({ name: "ProfilePage" });
};

const handleAvatarUpload = (_file: File) => {
  // TODO: Upload avatar via SDK imageServer
};
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <AvatarUpload
      :current-image="authStore.userInfo?.image"
      @upload="handleAvatarUpload"
    />

    <Input v-model="form.name" label="Name" placeholder="Your display name" />
    <Input v-model="form.about" label="About" placeholder="Tell about yourself" />
    <Input v-model="form.site" label="Website" placeholder="https://..." />
    <Input v-model="form.language" label="Language" placeholder="en" />

    <div class="flex gap-3">
      <Button type="submit" :disabled="authStore.isEditingUserData">
        {{ authStore.isEditingUserData ? "Saving..." : "Save" }}
      </Button>
      <Button variant="ghost" @click="router.back()">Cancel</Button>
    </div>
  </form>
</template>
