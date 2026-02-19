<script setup lang="ts">
import { useChatStore } from "@/entities/chat";
import { useAuthStore } from "@/entities/auth";
import { MessageList, MessageInput } from "@/features/messaging";
import SelectionBar from "@/features/messaging/ui/SelectionBar.vue";
import ForwardPicker from "@/features/messaging/ui/ForwardPicker.vue";
import ChatSearch from "@/features/messaging/ui/ChatSearch.vue";
import { useToast } from "@/shared/lib/use-toast";
import { ChatInfoPanel } from "@/features/chat-info";
import PinnedBar from "@/features/messaging/ui/PinnedBar.vue";

const chatStore = useChatStore();
const authStore = useAuthStore();
const emit = defineEmits<{ back: [] }>();
const { toast } = useToast();

const showForwardPicker = ref(false);
const showSearch = ref(false);
const showInfoPanel = ref(false);
const messageListRef = ref<InstanceType<typeof MessageList>>();

const handleScrollToMessage = (messageId: string) => {
  messageListRef.value?.scrollToMessage(messageId);
};

const handleSelectionForward = () => {
  showForwardPicker.value = true;
};

// Auto-open ForwardPicker when "forward" is selected from context menu
watch(() => chatStore.forwardingMessages, (v) => {
  if (v) showForwardPicker.value = true;
});

const handleSelectionCopy = () => {
  const ids = chatStore.selectedMessageIds;
  const msgs = chatStore.activeMessages.filter(m => ids.has(m.id));
  const text = msgs.map(m => m.content).join("\n");
  navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard"));
  chatStore.exitSelectionMode();
};

const handleSelectionDelete = () => {
  // Set the first selected message as deletingMessage (triggers the delete modal in MessageList)
  const ids = chatStore.selectedMessageIds;
  const msg = chatStore.activeMessages.find(m => ids.has(m.id));
  if (msg) chatStore.deletingMessage = msg;
};

/** Typing indicator text */
const typingText = computed(() => {
  const roomId = chatStore.activeRoomId;
  if (!roomId) return "";
  const typingUsers = chatStore.getTypingUsers(roomId);
  const myAddr = authStore.address ?? "";
  const others = typingUsers.filter(id => id !== myAddr);
  if (others.length === 0) return "";
  if (others.length === 1) return "typing...";
  return `${others.length} typing...`;
});

/** Subtitle: typing indicator or member count */
const subtitle = computed(() => {
  if (typingText.value) return typingText.value;
  const room = chatStore.activeRoom;
  if (!room) return "";
  if (room.isGroup) return `${room.members.length} members`;
  return "";
});
</script>

<template>
  <div class="flex h-full flex-col bg-background-total-theme">
    <!-- Chat header -->
    <div
      v-if="chatStore.activeRoom"
      class="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-grad-0 px-3"
    >
      <!-- Back button (mobile) -->
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0 md:hidden"
        @click="emit('back')"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Room avatar + info (clickable to open info panel) -->
      <button
        class="flex min-w-0 flex-1 items-center gap-3 text-left"
        @click="showInfoPanel = true"
      >
        <Avatar :src="chatStore.activeRoom.avatar" :name="chatStore.activeRoom.name" size="sm" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-text-color">
            {{ chatStore.activeRoom.name }}
          </div>
          <div
            class="text-xs"
            :class="typingText ? 'text-color-bg-ac' : 'text-text-on-main-bg-color'"
          >
            {{ subtitle }}
          </div>
        </div>
      </button>

      <!-- Search button -->
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
        title="Search"
        @click="showSearch = !showSearch"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      <!-- Video call button -->
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
        title="Video call"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </button>

      <!-- More menu -->
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
        title="More"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
    </div>

    <!-- No room selected -->
    <div
      v-if="!chatStore.activeRoom"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-text-on-main-bg-color"
    >
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="opacity-30">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span class="text-sm">Select a chat to start messaging</span>
    </div>

    <!-- Messages -->
    <template v-else>
      <ChatSearch
        v-if="showSearch"
        @close="showSearch = false"
        @scroll-to="handleScrollToMessage"
      />
      <PinnedBar @scroll-to="handleScrollToMessage" />
      <MessageList ref="messageListRef" />
      <SelectionBar
        v-if="chatStore.selectionMode"
        @forward="handleSelectionForward"
        @copy="handleSelectionCopy"
        @delete="handleSelectionDelete"
      />
      <MessageInput v-else />
      <ForwardPicker
        :show="showForwardPicker"
        @close="showForwardPicker = false; chatStore.exitSelectionMode()"
      />
    </template>

    <ChatInfoPanel :show="showInfoPanel" @close="showInfoPanel = false" />
  </div>
</template>
