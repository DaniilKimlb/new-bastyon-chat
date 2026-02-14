<script setup lang="ts">
interface Props {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
  src: "",
  name: "",
  size: "md"
});

const initials = computed(() => {
  if (!props.name) return "?";
  return props.name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
});

const sizeClass = computed(() => ({
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base"
}[props.size]));

const imgError = ref(false);
const showFallback = computed(() => !props.src || imgError.value);
</script>

<template>
  <div
    :class="sizeClass"
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-color-bg-ac text-text-on-bg-ac-color"
  >
    <img
      v-if="!showFallback"
      :src="props.src"
      :alt="props.name"
      class="h-full w-full object-cover"
      @error="imgError = true"
    />
    <span v-else class="font-medium">{{ initials }}</span>
  </div>
</template>
