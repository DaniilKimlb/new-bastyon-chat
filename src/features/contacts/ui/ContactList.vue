<script setup lang="ts">
import { useChatStore } from "@/entities/chat";
import type { ChatRoom } from "@/entities/chat";
import { formatTime } from "@/shared/lib/format";

const chatStore = useChatStore();
const emit = defineEmits<{ selectRoom: [roomId: string] }>();

const handleSelect = (room: ChatRoom) => {
  chatStore.setActiveRoom(room.id);
  emit("selectRoom", room.id);
};
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="chatStore.sortedRooms.length === 0"
      class="p-4 text-center text-sm text-text-on-main-bg-color"
    >
      No conversations yet
    </div>

    <button
      v-for="room in chatStore.sortedRooms"
      :key="room.id"
      class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-grad-0"
      :class="room.id === chatStore.activeRoomId ? 'bg-neutral-grad-0' : ''"
      @click="handleSelect(room)"
    >
      <Avatar :src="room.avatar" :name="room.name" size="md" />
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between">
          <span class="truncate text-sm font-medium text-text-color">
            {{ room.name }}
          </span>
          <span
            v-if="room.lastMessage"
            class="shrink-0 text-[10px] text-text-on-main-bg-color"
          >
            {{ formatTime(new Date(room.lastMessage.timestamp)) }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="truncate text-xs text-text-on-main-bg-color">
            {{ room.lastMessage?.content || "No messages" }}
          </span>
          <span
            v-if="room.unreadCount > 0"
            class="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-color-bg-ac text-[10px] text-white"
          >
            {{ room.unreadCount > 99 ? "99+" : room.unreadCount }}
          </span>
        </div>
      </div>
    </button>
  </div>
</template>
