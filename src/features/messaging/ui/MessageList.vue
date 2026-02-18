<script setup lang="ts">
import { ref, watch, onMounted, nextTick, onUnmounted } from "vue";
import { useChatStore } from "@/entities/chat";
import { useAuthStore } from "@/entities/auth";
import { isConsecutiveMessage } from "@/entities/chat/lib/message-utils";
import { formatDate } from "@/shared/lib/format";
import { UserAvatar } from "@/entities/user";
import { useMessages } from "../model/use-messages";
import { useToast } from "@/shared/lib/use-toast";
import MessageBubble from "./MessageBubble.vue";
import { MessageSkeleton } from "@/shared/ui/skeleton";
import MessageContextMenu from "./MessageContextMenu.vue";
import EmojiPicker from "./EmojiPicker.vue";
import MediaViewer from "./MediaViewer.vue";

const chatStore = useChatStore();
const authStore = useAuthStore();
const { loadMessages, toggleReaction, deleteMessage } = useMessages();
const { toast } = useToast();

const handleDeleteForMe = () => {
  if (chatStore.deletingMessage) {
    deleteMessage(chatStore.deletingMessage.id, false);
    chatStore.deletingMessage = null;
  }
};

const handleDeleteForEveryone = () => {
  if (chatStore.deletingMessage) {
    deleteMessage(chatStore.deletingMessage.id, true);
    chatStore.deletingMessage = null;
  }
};

const contextMenu = ref<{ show: boolean; x: number; y: number; message: import("@/entities/chat").Message | null; isOwn: boolean }>({
  show: false, x: 0, y: 0, message: null, isOwn: false,
});

const openContextMenu = (payload: { message: import("@/entities/chat").Message; x: number; y: number }) => {
  contextMenu.value = {
    show: true,
    x: payload.x,
    y: payload.y,
    message: payload.message,
    isOwn: payload.message.senderId === authStore.address,
  };
};

const closeContextMenu = () => {
  contextMenu.value.show = false;
};

const handleContextAction = (action: string, message: import("@/entities/chat").Message) => {
  switch (action) {
    case "reply":
      chatStore.replyingTo = { id: message.id, senderId: message.senderId, content: message.content };
      break;
    case "copy":
      navigator.clipboard.writeText(message.content).then(() => toast("Copied to clipboard"));
      break;
    case "edit":
      chatStore.editingMessage = { id: message.id, content: message.content };
      break;
    case "delete":
      chatStore.deletingMessage = message;
      break;
    case "select":
      chatStore.enterSelectionMode(message.id);
      break;
    case "forward":
      chatStore.enterSelectionMode(message.id);
      chatStore.forwardingMessages = true;
      break;
    case "pin":
      chatStore.pinMessage?.(message.id);
      break;
  }
  closeContextMenu();
};

const handleContextReaction = (emoji: string, message: import("@/entities/chat").Message) => {
  toggleReaction(message.id, emoji);
};

const emojiPickerTarget = ref<import("@/entities/chat").Message | null>(null);
const showEmojiPicker = ref(false);

const showMediaViewer = ref(false);
const mediaViewerMessageId = ref<string | null>(null);

const handleOpenMedia = (message: import("@/entities/chat").Message) => {
  mediaViewerMessageId.value = message.id;
  showMediaViewer.value = true;
};

const handleOpenEmojiPicker = (message: import("@/entities/chat").Message) => {
  emojiPickerTarget.value = message;
  showEmojiPicker.value = true;
};

const handleEmojiSelect = (emoji: string) => {
  if (emojiPickerTarget.value) {
    toggleReaction(emojiPickerTarget.value.id, emoji);
  }
  showEmojiPicker.value = false;
  emojiPickerTarget.value = null;
};

const listRef = ref<HTMLElement>();
const isNearBottom = ref(true);
const showScrollFab = ref(false);
const loading = ref(false);

/** Check if user is scrolled near the bottom */
const checkScroll = () => {
  if (!listRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = listRef.value;
  const distFromBottom = scrollHeight - scrollTop - clientHeight;
  isNearBottom.value = distFromBottom < 100;
  showScrollFab.value = distFromBottom > 300;
};

const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    if (!listRef.value) return;
    listRef.value.scrollTo({
      top: listRef.value.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  });
};

// Load messages when active room changes
watch(
  () => chatStore.activeRoomId,
  async (roomId) => {
    if (roomId) {
      loading.value = true;
      try {
        await loadMessages(roomId);
      } finally {
        loading.value = false;
      }
      scrollToBottom();
    }
  },
  { immediate: true },
);

// Auto-scroll only if user is near bottom
watch(
  () => chatStore.activeMessages.length,
  () => {
    if (isNearBottom.value) scrollToBottom();
  },
);

onMounted(() => {
  scrollToBottom();
  listRef.value?.addEventListener("scroll", checkScroll, { passive: true });
});

onUnmounted(() => {
  listRef.value?.removeEventListener("scroll", checkScroll);
});

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

const isGroup = computed(() => chatStore.activeRoom?.isGroup ?? false);

/** Typing indicator */
const typingText = computed(() => {
  const roomId = chatStore.activeRoomId;
  if (!roomId) return "";
  const typingUsers = chatStore.getTypingUsers(roomId);
  const myAddr = authStore.address ?? "";
  const others = typingUsers.filter(id => id !== myAddr);
  if (others.length === 0) return "";
  if (others.length === 1) return `${chatStore.getDisplayName(others[0])} is typing`;
  return `${others.length} people are typing`;
});

/** Scroll to a specific message and flash highlight */
const scrollToMessage = (messageId: string) => {
  nextTick(() => {
    const el = listRef.value?.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("search-highlight");
    setTimeout(() => el.classList.remove("search-highlight"), 1500);
  });
};

defineExpose({ scrollToMessage });
</script>

<template>
  <div ref="listRef" class="relative flex-1 overflow-y-auto px-4 py-3">
    <!-- Loading state -->
    <MessageSkeleton v-if="loading" />

    <!-- Empty state -->
    <div
      v-else-if="chatStore.activeMessages.length === 0"
      class="flex h-full flex-col items-center justify-center gap-2 text-text-on-main-bg-color"
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="opacity-20">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span class="text-sm">No messages yet. Start a conversation!</span>
    </div>

    <!-- Messages -->
    <TransitionGroup v-else name="msg" tag="div">
      <template
        v-for="(message, index) in chatStore.activeMessages"
        :key="message.id"
      >
        <!-- Date separator -->
        <div
          v-if="getDateLabel(message.timestamp, chatStore.activeMessages[index - 1]?.timestamp)"
          :key="'date-' + message.id"
          class="sticky top-0 z-10 my-3 flex justify-center"
        >
          <span class="rounded-full bg-neutral-grad-0/80 px-3 py-1 text-xs text-text-on-main-bg-color backdrop-blur-sm">
            {{ getDateLabel(message.timestamp, chatStore.activeMessages[index - 1]?.timestamp) }}
          </span>
        </div>

        <MessageBubble
          :message="message"
          :is-own="message.senderId === authStore.address"
          :is-group="isGroup"
          :show-avatar="!isConsecutiveMessage(message, chatStore.activeMessages[index + 1])"
          :is-first-in-group="!isConsecutiveMessage(chatStore.activeMessages[index - 1], message)"
          :class="isConsecutiveMessage(chatStore.activeMessages[index - 1], message) ? 'mt-0.5' : 'mt-2 first:mt-0'"
          :data-message-id="message.id"
          @contextmenu="openContextMenu"
          @reply="(msg) => { chatStore.replyingTo = { id: msg.id, senderId: msg.senderId, content: msg.content }; }"
          @open-media="handleOpenMedia"
        >
          <template #avatar>
            <UserAvatar :address="message.senderId" size="sm" />
          </template>
        </MessageBubble>
      </template>

      <!-- Typing indicator -->
      <div v-if="typingText" key="typing-indicator" class="flex items-center gap-2 px-10 py-1">
        <div class="flex gap-0.5">
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-text-on-main-bg-color [animation-delay:-0.3s]" />
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-text-on-main-bg-color [animation-delay:-0.15s]" />
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-text-on-main-bg-color" />
        </div>
        <span class="text-xs text-text-on-main-bg-color">{{ typingText }}</span>
      </div>
    </TransitionGroup>

    <!-- Context menu -->
    <MessageContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :message="contextMenu.message"
      :is-own="contextMenu.isOwn"
      @close="closeContextMenu"
      @action="handleContextAction"
      @react="handleContextReaction"
      @open-emoji-picker="handleOpenEmojiPicker"
    />

    <!-- Full emoji picker (from context menu [+]) -->
    <EmojiPicker
      :show="showEmojiPicker"
      @close="showEmojiPicker = false"
      @select="handleEmojiSelect"
    />

    <!-- Media viewer -->
    <MediaViewer
      :show="showMediaViewer"
      :message-id="mediaViewerMessageId"
      @close="showMediaViewer = false"
    />

    <!-- Scroll-to-bottom FAB -->
    <transition name="fab">
      <button
        v-if="showScrollFab"
        class="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-background-total-theme shadow-lg transition-all hover:bg-neutral-grad-0"
        @click="scrollToBottom(true)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-on-main-bg-color">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </transition>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="chatStore.deletingMessage"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          @click.self="chatStore.deletingMessage = null"
        >
          <div class="w-full max-w-xs rounded-xl bg-background-total-theme p-5 shadow-xl">
            <h3 class="mb-4 text-base font-semibold text-text-color">Delete message?</h3>
            <div class="flex flex-col gap-2">
              <button
                class="rounded-lg bg-color-bad px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-color-bad/90"
                @click="handleDeleteForEveryone"
              >
                Delete for everyone
              </button>
              <button
                class="rounded-lg bg-neutral-grad-0 px-4 py-2.5 text-sm font-medium text-text-color transition-colors hover:bg-neutral-grad-2"
                @click="handleDeleteForMe"
              >
                Delete for me
              </button>
              <button
                class="rounded-lg px-4 py-2 text-sm text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
                @click="chatStore.deletingMessage = null"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fab-enter-active,
.fab-leave-active {
  transition: all 0.2s ease;
}
.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(8px);
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: no-preference) {
  .msg-enter-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .msg-enter-from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>

<style>
@keyframes search-flash {
  0% { background-color: rgba(var(--color-bg-ac-rgb, 59 130 246), 0.25); }
  100% { background-color: transparent; }
}
.search-highlight {
  animation: search-flash 1.5s ease-out;
  border-radius: 8px;
}
</style>
