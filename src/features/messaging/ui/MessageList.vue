<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";
import { useChatStore } from "@/entities/chat";
import { useAuthStore } from "@/entities/auth";
import { isConsecutiveMessage } from "@/entities/chat/lib/message-utils";
import { formatDate } from "@/shared/lib/format";
import { UserAvatar } from "@/entities/user";
import { useMessages } from "../model/use-messages";
import MessageBubble from "./MessageBubble.vue";

const chatStore = useChatStore();
const authStore = useAuthStore();
const { loadMessages } = useMessages();

const listRef = ref<HTMLElement>();

const scrollToBottom = () => {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight;
    }
  });
};

// Load messages when active room changes
watch(
  () => chatStore.activeRoomId,
  async (roomId) => {
    if (roomId) {
      await loadMessages(roomId);
      scrollToBottom();
    }
  },
  { immediate: true },
);

watch(
  () => chatStore.activeMessages.length,
  () => scrollToBottom(),
);

onMounted(scrollToBottom);

const getDateLabel = (
  timestamp: number,
  prevTimestamp?: number,
): string | null => {
  const date = new Date(timestamp);
  if (!prevTimestamp) return formatDate(date);

  const prevDate = new Date(prevTimestamp);
  if (date.toDateString() !== prevDate.toDateString()) {
    return formatDate(date);
  }
  return null;
};
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto px-4 py-3">
    <div
      v-if="chatStore.activeMessages.length === 0"
      class="flex h-full items-center justify-center text-sm text-text-on-main-bg-color"
    >
      No messages yet. Start a conversation!
    </div>

    <div v-else class="space-y-1">
      <template
        v-for="(message, index) in chatStore.activeMessages"
        :key="message.id"
      >
        <div
          v-if="
            getDateLabel(
              message.timestamp,
              chatStore.activeMessages[index - 1]?.timestamp,
            )
          "
          class="my-3 text-center text-xs text-text-on-main-bg-color"
        >
          {{
            getDateLabel(
              message.timestamp,
              chatStore.activeMessages[index - 1]?.timestamp,
            )
          }}
        </div>

        <MessageBubble
          :message="message"
          :is-own="message.senderId === authStore.address"
          :show-avatar="
            !isConsecutiveMessage(chatStore.activeMessages[index - 1], message)
          "
        >
          <template #avatar>
            <UserAvatar :address="message.senderId" size="sm" />
          </template>
        </MessageBubble>
      </template>
    </div>
  </div>
</template>
