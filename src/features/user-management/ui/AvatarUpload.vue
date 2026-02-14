<script setup lang="ts">
interface Props {
  currentImage?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ upload: [file: File] }>();

const fileInput = ref<HTMLInputElement>();

const handleClick = () => {
  fileInput.value?.click();
};

const handleChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit("upload", file);
  }
};
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="relative cursor-pointer" @click="handleClick">
      <Avatar :src="props.currentImage" name="User" size="lg" />
      <div
        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </div>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleChange"
    />
    <button class="text-xs text-color-txt-ac" @click="handleClick">
      Change avatar
    </button>
  </div>
</template>
