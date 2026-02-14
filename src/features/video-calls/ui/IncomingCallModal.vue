<script setup lang="ts">
interface Props {
  callerName: string;
  callerAddress: string;
}

defineProps<Props>();
const emit = defineEmits<{
  accept: [];
  reject: [];
}>();
</script>

<template>
  <Modal :show="true" @close="emit('reject')">
    <div class="flex flex-col items-center gap-4 py-4">
      <Avatar :name="callerName" size="lg" />
      <div class="text-center">
        <h3 class="text-lg font-bold text-text-color">Incoming Call</h3>
        <p class="text-sm text-text-on-main-bg-color">{{ callerName }}</p>
      </div>

      <div class="flex gap-4">
        <button
          class="flex h-14 w-14 items-center justify-center rounded-full bg-color-good text-white"
          @click="emit('accept')"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        </button>
        <button
          class="flex h-14 w-14 items-center justify-center rounded-full bg-color-bad text-white"
          @click="emit('reject')"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
        </button>
      </div>
    </div>
  </Modal>
</template>
