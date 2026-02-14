<script setup lang="ts">
import { useChatStore } from "@/entities/chat";
import { MessageList, MessageInput } from "@/features/messaging";

const chatStore = useChatStore();
const emit = defineEmits<{ back: [] }>();
</script>

<template>
  <div class="flex h-full flex-col bg-background-total-theme">
    <!-- Chat header -->
    <div
      v-if="chatStore.activeRoom"
      class="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-grad-0 px-4"
    >
      <button
        class="rounded-lg p-1 text-text-on-main-bg-color hover:bg-neutral-grad-0 md:hidden"
        @click="emit('back')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
      </button>
      <Avatar :src="chatStore.activeRoom.avatar" :name="chatStore.activeRoom.name" size="sm" />
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-text-color">
          {{ chatStore.activeRoom.name }}
        </div>
        <div class="text-xs text-text-on-main-bg-color">
          {{ chatStore.activeRoom.members.length }} members
        </div>
      </div>
      <button
        class="rounded-lg p-2 text-text-on-main-bg-color hover:bg-neutral-grad-0"
        title="Start video call"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </button>
    </div>

    <!-- No room selected -->
    <div
      v-if="!chatStore.activeRoom"
      class="flex flex-1 items-center justify-center text-text-on-main-bg-color"
    >
      Select a conversation to start chatting
    </div>

    <!-- Messages -->
    <template v-else>
      <MessageList />
      <MessageInput />
    </template>
  </div>
</template>
