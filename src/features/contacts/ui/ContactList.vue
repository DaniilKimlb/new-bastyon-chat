<script setup lang="ts">
import { ref } from "vue";
import { useChatStore } from "@/entities/chat";
import type { ChatRoom, Message } from "@/entities/chat";
import { MessageType } from "@/entities/chat";
import { useAuthStore } from "@/entities/auth";
import { formatRelativeTime } from "@/shared/lib/format";
import { stripMentionAddresses } from "@/shared/lib/message-format";
import { useLongPress } from "@/shared/lib/gestures";
import { ContextMenu } from "@/shared/ui/context-menu";
import type { ContextMenuItem } from "@/shared/ui/context-menu";
import { UserAvatar } from "@/entities/user";
import { RecycleScroller } from "vue-virtual-scroller";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";

interface Props {
  filter?: "all" | "personal" | "groups" | "invites";
}

const props = withDefaults(defineProps<Props>(), { filter: "all" });

const chatStore = useChatStore();
const authStore = useAuthStore();
const { t } = useI18n();
const emit = defineEmits<{ selectRoom: [roomId: string] }>();

const handleSelect = (room: ChatRoom) => {
  if (ctxMenu.value.show) return;
  chatStore.setActiveRoom(room.id);
  emit("selectRoom", room.id);
};

/** Format last message preview with type-aware icons */
const formatPreview = (msg: Message | undefined, room: ChatRoom): string => {
  if (!msg) return t("contactList.noMessages");
  let preview: string;
  switch (msg.type) {
    case MessageType.image:
      preview = msg.content && msg.content !== "[photo]" ? `📷 ${msg.content}` : "📷 " + t("message.photo");
      break;
    case MessageType.video:
      preview = msg.content && msg.content !== "[video]" ? `🎬 ${msg.content}` : "🎬 " + t("message.video");
      break;
    case MessageType.audio:
      preview = msg.content && msg.content !== "[voice message]" ? `🎤 ${msg.content}` : "🎤 " + t("message.voiceMessage");
      break;
    case MessageType.file:
      preview = `📎 ${msg.content || t("message.file")}`;
      break;
    case MessageType.system:
      // System messages already contain the actor name, no sender prefix needed
      return msg.content;
    default:
      preview = msg.content || "";
  }
  // Strip mention hex addresses for preview (e.g. @hexid:Name → @Name)
  preview = stripMentionAddresses(preview);

  // Add sender prefix for group chats
  if (room.isGroup && msg.senderId) {
    const myAddr = authStore.address ?? "";
    const senderName = msg.senderId === myAddr ? "You" : chatStore.getDisplayName(msg.senderId);
    preview = `${senderName}: ${preview}`;
  }
  return preview;
};

/** Get typing users for a room (excluding self) */
const getTypingText = (roomId: string): string => {
  const typingUsers = chatStore.getTypingUsers(roomId);
  const myAddr = authStore.address ?? "";
  const others = typingUsers.filter(id => id !== myAddr);
  if (others.length === 0) return "";
  if (others.length === 1) return "typing...";
  return `${others.length} typing...`;
};

const filteredRooms = computed(() => {
  const rooms = chatStore.sortedRooms;
  if (props.filter === "personal") return rooms.filter(r => !r.isGroup && r.membership !== "invite");
  if (props.filter === "groups") return rooms.filter(r => r.isGroup && r.membership !== "invite");
  if (props.filter === "invites") return rooms.filter(r => r.membership === "invite");
  return rooms;
});

// Context menu
const ctxMenu = ref<{ show: boolean; x: number; y: number; roomId: string | null }>({
  show: false, x: 0, y: 0, roomId: null,
});

const ctxMenuItems = computed<ContextMenuItem[]>(() => {
  const roomId = ctxMenu.value.roomId;
  if (!roomId) return [];
  const isPinned = chatStore.pinnedRoomIds.has(roomId);
  const isMuted = chatStore.mutedRoomIds.has(roomId);
  return [
    { label: isPinned ? "Unpin" : "Pin", icon: "\u{1F4CC}", action: "pin" },
    { label: isMuted ? "Unmute" : "Mute", icon: isMuted ? "\u{1F514}" : "\u{1F515}", action: "mute" },
    { label: "Mark as Read", icon: "\u{2705}", action: "read" },
    { label: "Delete", icon: "\u{1F5D1}", action: "delete", danger: true },
  ];
});

const openCtxMenu = (e: PointerEvent, room: ChatRoom) => {
  ctxMenu.value = { show: true, x: e.clientX, y: e.clientY, roomId: room.id };
};

const deleteConfirm = ref<{ show: boolean; roomId: string | null }>({ show: false, roomId: null });

const handleCtxAction = (action: string) => {
  const roomId = ctxMenu.value.roomId;
  if (!roomId) return;
  switch (action) {
    case "pin": chatStore.togglePinRoom(roomId); break;
    case "mute": chatStore.toggleMuteRoom(roomId); break;
    case "read": chatStore.markRoomAsRead(roomId); break;
    case "delete":
      deleteConfirm.value = { show: true, roomId };
      break;
  }
  ctxMenu.value.show = false;
};

const confirmDeleteRoom = () => {
  if (deleteConfirm.value.roomId) {
    chatStore.removeRoom(deleteConfirm.value.roomId);
  }
  deleteConfirm.value = { show: false, roomId: null };
};

// Per-room long press: cache a single useLongPress instance per room
const longPressCache = new Map<string, ReturnType<typeof useLongPress>>();

const getRoomLongPress = (room: ChatRoom) => {
  let handlers = longPressCache.get(room.id);
  if (!handlers) {
    handlers = useLongPress({
      onTrigger: (e) => openCtxMenu(e, room),
    });
    longPressCache.set(room.id, handlers);
  }
  return handlers;
};
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="filteredRooms.length === 0"
      class="p-6 text-center text-sm text-text-on-main-bg-color"
    >
      No conversations yet
    </div>

    <RecycleScroller
      v-if="filteredRooms.length > 0"
      :items="filteredRooms"
      :item-size="68"
      key-field="id"
      class="h-full"
    >
      <template #default="{ item: room }">
        <button
          class="flex h-[68px] w-full items-center gap-3 px-3 py-2.5 transition-colors hover:bg-neutral-grad-0"
          :class="room.id === chatStore.activeRoomId ? 'bg-color-bg-ac/10' : ''"
          @click="handleSelect(room)"
          @contextmenu.prevent="(e: MouseEvent) => { ctxMenu = { show: true, x: e.clientX, y: e.clientY, roomId: room.id }; }"
          @pointerdown="(e: PointerEvent) => getRoomLongPress(room).onPointerdown(e)"
          @pointermove="(e: PointerEvent) => getRoomLongPress(room).onPointermove(e)"
          @pointerup="() => getRoomLongPress(room).onPointerup()"
          @pointerleave="() => getRoomLongPress(room).onPointerleave()"
        >
          <!-- Avatar -->
          <div class="relative shrink-0">
            <UserAvatar
              v-if="room.avatar?.startsWith('__pocketnet__:')"
              :address="room.avatar.replace('__pocketnet__:', '')"
              size="md"
            />
            <Avatar v-else :src="room.avatar" :name="room.name" size="md" />
            <!-- Group indicator -->
            <div
              v-if="room.isGroup"
              class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background-total-theme"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="text-text-on-main-bg-color">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <!-- Name row: name + timestamp + pin/mute icons -->
            <div class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-1 truncate text-[15px] font-medium text-text-color">
                {{ room.name }}
                <svg v-if="chatStore.pinnedRoomIds.has(room.id)" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-text-on-main-bg-color">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                <svg v-if="chatStore.mutedRoomIds.has(room.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-text-on-main-bg-color">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              </span>
              <span
                v-if="room.lastMessage"
                class="shrink-0 text-xs"
                :class="room.unreadCount > 0 ? 'text-color-bg-ac' : 'text-text-on-main-bg-color'"
              >
                {{ formatRelativeTime(new Date(room.lastMessage.timestamp)) }}
              </span>
            </div>

            <!-- Preview row: last message + unread badge -->
            <div class="mt-0.5 flex items-center justify-between gap-2">
              <span
                v-if="getTypingText(room.id)"
                class="truncate text-sm text-color-bg-ac"
              >
                <span class="inline-flex gap-0.5 align-middle">
                  <span class="inline-block h-1 w-1 animate-bounce rounded-full bg-color-bg-ac [animation-delay:-0.3s]" />
                  <span class="inline-block h-1 w-1 animate-bounce rounded-full bg-color-bg-ac [animation-delay:-0.15s]" />
                  <span class="inline-block h-1 w-1 animate-bounce rounded-full bg-color-bg-ac" />
                </span>
                {{ getTypingText(room.id) }}
              </span>
              <span v-else-if="room.membership === 'invite'" class="truncate text-sm italic text-color-bg-ac">
                Invitation to chat
              </span>
              <span
                v-else-if="room.lastMessage?.type === MessageType.system"
                class="truncate text-sm italic text-text-on-main-bg-color"
              >
                {{ formatPreview(room.lastMessage, room) }}
              </span>
              <span v-else class="truncate text-sm text-text-on-main-bg-color">
                {{ formatPreview(room.lastMessage, room) }}
              </span>
              <transition name="badge-pop">
                <span
                  v-if="room.unreadCount > 0"
                  class="flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-medium text-white"
                  :class="chatStore.mutedRoomIds.has(room.id) ? 'bg-neutral-grad-2' : 'bg-color-bg-ac'"
                >
                  {{ room.unreadCount > 99 ? "99+" : room.unreadCount }}
                </span>
              </transition>
            </div>
          </div>
        </button>
      </template>
    </RecycleScroller>

    <!-- Room context menu -->
    <ContextMenu
      :show="ctxMenu.show"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :items="ctxMenuItems"
      @close="ctxMenu.show = false"
      @select="handleCtxAction"
    />

    <!-- Delete chat confirmation modal -->
    <Teleport to="body">
      <transition name="fade">
        <div
          v-if="deleteConfirm.show"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          @click.self="deleteConfirm = { show: false, roomId: null }"
        >
          <div class="w-full max-w-xs rounded-xl bg-background-total-theme p-5 shadow-xl">
            <h3 class="mb-3 text-base font-semibold text-text-color">Delete chat?</h3>
            <p class="mb-4 text-sm text-text-on-main-bg-color">Do you really want to leave and delete this chat?</p>
            <div class="flex gap-2">
              <button
                class="flex-1 rounded-lg bg-neutral-grad-0 px-4 py-2.5 text-sm font-medium text-text-color transition-colors hover:bg-neutral-grad-2"
                @click="deleteConfirm = { show: false, roomId: null }"
              >
                Cancel
              </button>
              <button
                class="flex-1 rounded-lg bg-color-bad px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-color-bad/90"
                @click="confirmDeleteRoom"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.badge-pop-enter-active {
  animation: badge-bounce-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.badge-pop-leave-active {
  transition: transform 0.15s ease-in, opacity 0.15s ease-in;
}
.badge-pop-leave-to {
  opacity: 0;
  transform: scale(0);
}
@keyframes badge-bounce-in {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}
</style>
