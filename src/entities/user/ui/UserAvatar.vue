<script setup lang="ts">
import { useUserStore } from "../model";

interface Props {
  address: string;
  size?: "sm" | "md" | "lg";
}

const props = withDefaults(defineProps<Props>(), { size: "md" });

const userStore = useUserStore();

const user = computed(() => userStore.getUser(props.address));
</script>

<template>
  <Avatar
    :src="user?.image"
    :name="user?.name || address"
    :size="props.size"
  />
</template>
