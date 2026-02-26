<script setup lang="ts">
import { useChatStore } from "@/entities/chat";

const chatStore = useChatStore();
const emit = defineEmits<{ scrollTo: [messageId: string] }>();

const currentPinned = computed(() => {
  const pins = chatStore.pinnedMessages;
  if (pins.length === 0) return null;
  return pins[chatStore.pinnedMessageIndex] ?? pins[0];
});

const handleClick = () => {
  if (currentPinned.value) {
    emit("scrollTo", currentPinned.value.id);
  }
};

const handleCycle = () => {
  chatStore.cyclePinnedMessage(1);
};

const handleUnpin = () => {
  if (currentPinned.value) {
    chatStore.unpinMessage(currentPinned.value.id);
  }
};
</script>

<template>
  <div
    v-if="currentPinned"
    class="flex shrink-0 items-center gap-2 overflow-hidden border-b border-neutral-grad-0 bg-background-total-theme px-3 py-2"
  >
    <!-- Pin icon + cycle -->
    <button
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-color-bg-ac transition-colors hover:bg-neutral-grad-0"
      title="Next pinned"
      @click="handleCycle"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
      </svg>
    </button>

    <!-- Pinned content (clickable to scroll) -->
    <button
      class="min-w-0 flex-1 text-left"
      @click="handleClick"
    >
      <div class="flex items-center gap-1">
        <span class="text-xs font-medium text-color-bg-ac">
          Pinned Message
          <template v-if="chatStore.pinnedMessages.length > 1">
            ({{ chatStore.pinnedMessageIndex + 1 }}/{{ chatStore.pinnedMessages.length }})
          </template>
        </span>
      </div>
      <div class="truncate text-xs text-text-on-main-bg-color">
        {{ currentPinned.content }}
      </div>
    </button>

    <!-- Unpin button -->
    <button
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
      title="Unpin"
      @click="handleUnpin"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18" /><path d="M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
