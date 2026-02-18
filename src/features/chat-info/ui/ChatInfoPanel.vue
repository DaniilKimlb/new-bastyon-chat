<script setup lang="ts">
import { useChatStore } from "@/entities/chat";
import { UserAvatar } from "@/entities/user";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const chatStore = useChatStore();
const room = computed(() => chatStore.activeRoom);

const mediaCount = computed(() => {
  if (!room.value) return 0;
  return chatStore.activeMessages.filter(m => m.type === "image" || m.type === "video").length;
});

const fileCount = computed(() => {
  if (!room.value) return 0;
  return chatStore.activeMessages.filter(m => m.type === "file" || m.type === "audio").length;
});

const isMuted = computed(() => {
  if (!room.value) return false;
  return chatStore.mutedRoomIds.has(room.value.id);
});

const toggleMute = () => {
  if (room.value) chatStore.toggleMuteRoom(room.value.id);
};
</script>

<template>
  <Teleport to="body">
    <transition name="panel-fade">
      <div
        v-if="props.show"
        class="fixed inset-0 z-40 bg-black/40"
        @click="emit('close')"
      />
    </transition>
    <transition name="panel-slide">
      <div
        v-if="props.show"
        class="fixed right-0 top-0 z-50 h-full w-[320px] bg-background-total-theme shadow-xl"
        @click.stop
      >
        <div v-if="room" class="flex h-full flex-col">
          <!-- Header -->
          <div class="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-grad-0 px-4">
            <button
              class="flex h-9 w-9 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
              @click="emit('close')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18" /><path d="M6 6l12 12" />
              </svg>
            </button>
            <span class="text-base font-semibold text-text-color">Info</span>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto">
            <!-- Avatar + Name -->
            <div class="flex flex-col items-center gap-3 p-6">
              <Avatar :src="room.avatar" :name="room.name" size="xl" />
              <div class="text-center">
                <h2 class="text-lg font-semibold text-text-color">{{ room.name }}</h2>
                <p class="text-sm text-text-on-main-bg-color">
                  {{ room.isGroup ? `${room.members.length} members` : "Direct message" }}
                </p>
              </div>
            </div>

            <!-- Notifications toggle -->
            <div class="border-t border-neutral-grad-0 px-4 py-3">
              <button
                class="flex w-full items-center justify-between"
                @click="toggleMute"
              >
                <div class="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-on-main-bg-color">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span class="text-sm text-text-color">Notifications</span>
                </div>
                <div
                  class="h-5 w-9 rounded-full transition-colors"
                  :class="isMuted ? 'bg-neutral-grad-2' : 'bg-color-bg-ac'"
                >
                  <div
                    class="h-5 w-5 rounded-full bg-white shadow transition-transform"
                    :class="isMuted ? '' : 'translate-x-4'"
                  />
                </div>
              </button>
            </div>

            <!-- Shared media counts -->
            <div class="border-t border-neutral-grad-0 px-4 py-3">
              <div class="mb-2 text-xs font-medium uppercase text-text-on-main-bg-color">Shared</div>
              <div class="flex gap-4">
                <div class="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-on-main-bg-color">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span class="text-sm text-text-color">{{ mediaCount }} media</span>
                </div>
                <div class="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-on-main-bg-color">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span class="text-sm text-text-color">{{ fileCount }} files</span>
                </div>
              </div>
            </div>

            <!-- Members (group only) -->
            <div v-if="room.isGroup" class="border-t border-neutral-grad-0 px-4 py-3">
              <div class="mb-2 text-xs font-medium uppercase text-text-on-main-bg-color">
                Members ({{ room.members.length }})
              </div>
              <div class="flex flex-col gap-1">
                <div
                  v-for="member in room.members"
                  :key="member"
                  class="flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  <UserAvatar :address="member" size="sm" />
                  <span class="truncate text-sm text-text-color">{{ member }}</span>
                </div>
              </div>
            </div>

            <!-- Danger zone -->
            <div class="border-t border-neutral-grad-0 px-4 py-3">
              <button
                class="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-color-bad transition-colors hover:bg-neutral-grad-0"
                @click="chatStore.removeRoom(room.id); emit('close')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {{ room.isGroup ? "Leave group" : "Delete chat" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease;
}
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.2s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}
</style>
