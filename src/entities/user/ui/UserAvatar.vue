<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "../model";
import { useLazyLoad } from "@/shared/lib/use-lazy-load";

interface Props {
  address: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const props = withDefaults(defineProps<Props>(), { size: "md" });

const userStore = useUserStore();
const rootRef = ref<HTMLElement>();
const { isVisible } = useLazyLoad(rootRef);

const user = computed(() => userStore.getUser(props.address));

// Only load profile when element is visible
watch(isVisible, (visible) => {
  if (visible) userStore.loadUserIfMissing(props.address);
});

watch(() => props.address, (addr) => {
  if (isVisible.value) userStore.loadUserIfMissing(addr);
});
</script>

<template>
  <div ref="rootRef">
    <Avatar
      v-if="isVisible"
      :src="user?.image"
      :name="user?.name || address"
      :size="props.size"
    />
    <div
      v-else
      class="rounded-full bg-neutral-grad-0"
      :class="{
        'h-8 w-8': props.size === 'sm',
        'h-10 w-10': props.size === 'md',
        'h-14 w-14': props.size === 'lg',
        'h-20 w-20': props.size === 'xl',
      }"
    />
  </div>
</template>
