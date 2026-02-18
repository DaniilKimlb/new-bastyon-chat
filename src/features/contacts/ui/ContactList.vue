<script setup lang="ts">
import { ref } from "vue";
import { useChatStore } from "@/entities/chat";
import type { ChatRoom } from "@/entities/chat";
import { formatRelativeTime } from "@/shared/lib/format";
import { useLongPress } from "@/shared/lib/gestures";
import { ContextMenu } from "@/shared/ui/context-menu";
import type { ContextMenuItem } from "@/shared/ui/context-menu";
import { UserAvatar } from "@/entities/user";

interface Props {
  filter?: "all" | "personal" | "groups";
}

const props = withDefaults(defineProps<Props>(), { filter: "all" });

const chatStore = useChatStore();
const emit = defineEmits<{ selectRoom: [roomId: string] }>();

const handleSelect = (room: ChatRoom) => {
  if (ctxMenu.value.show) return;
  chatStore.setActiveRoom(room.id);
  emit("selectRoom", room.id);
};

const filteredRooms = computed(() => {
  const rooms = chatStore.sortedRooms;
  if (props.filter === "personal") return rooms.filter(r => !r.isGroup);
  if (props.filter === "groups") return rooms.filter(r => r.isGroup);
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

const handleCtxAction = (action: string) => {
  const roomId = ctxMenu.value.roomId;
  if (!roomId) return;
  switch (action) {
    case "pin": chatStore.togglePinRoom(roomId); break;
    case "mute": chatStore.toggleMuteRoom(roomId); break;
    case "read": chatStore.markRoomAsRead(roomId); break;
    case "delete": chatStore.removeRoom(roomId); break;
  }
  ctxMenu.value.show = false;
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

    <button
      v-for="room in filteredRooms"
      :key="room.id"
      class="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-neutral-grad-0"
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
          <span class="flex items-center gap-1 truncate text-sm font-medium text-text-color">
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
            class="shrink-0 text-[11px]"
            :class="room.unreadCount > 0 ? 'text-color-bg-ac' : 'text-text-on-main-bg-color'"
          >
            {{ formatRelativeTime(new Date(room.lastMessage.timestamp)) }}
          </span>
        </div>

        <!-- Preview row: last message + unread badge -->
        <div class="mt-0.5 flex items-center justify-between gap-2">
          <span class="truncate text-[13px] text-text-on-main-bg-color">
            {{ room.lastMessage?.content || "No messages" }}
          </span>
          <span
            v-if="room.unreadCount > 0"
            class="flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-medium text-white"
            :class="chatStore.mutedRoomIds.has(room.id) ? 'bg-neutral-grad-2' : 'bg-color-bg-ac'"
          >
            {{ room.unreadCount > 99 ? "99+" : room.unreadCount }}
          </span>
        </div>
      </div>
    </button>

    <!-- Room context menu -->
    <ContextMenu
      :show="ctxMenu.show"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :items="ctxMenuItems"
      @close="ctxMenu.show = false"
      @select="handleCtxAction"
    />
  </div>
</template>
