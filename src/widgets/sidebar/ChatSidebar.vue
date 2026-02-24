<script setup lang="ts">
import { ContactList, ContactSearch, FolderTabs } from "@/features/contacts";
import { useAuthStore } from "@/entities/auth";
import { useChatStore } from "@/entities/chat";
import { RoomListSkeleton } from "@/shared/ui/skeleton";

const emit = defineEmits<{ selectRoom: []; newGroup: [] }>();
const authStore = useAuthStore();
const chatStore = useChatStore();

onMounted(() => {
  chatStore.loadCachedRooms();
});

const router = useRouter();
const menuOpen = ref(false);
const searchOpen = ref(false);
const activeFilter = ref<"all" | "personal" | "groups" | "invites">("all");
const roomsLoading = ref(true);

// Hide skeleton once rooms appear or after 3s max
let stopWatch: ReturnType<typeof watch> | undefined;
const cancelLoading = () => {
  roomsLoading.value = false;
  stopWatch?.();
};
stopWatch = watch(
  () => chatStore.sortedRooms.length,
  (len) => {
    if (len > 0) cancelLoading();
  },
  { immediate: true },
);
setTimeout(cancelLoading, 3000);

// Auto-switch away from "invites" tab when no invites remain
watch(
  () => chatStore.inviteCount,
  (count) => {
    if (count === 0 && activeFilter.value === "invites") {
      activeFilter.value = "all";
    }
  },
);

const handleSelectRoom = () => {
  searchOpen.value = false;
  emit("selectRoom");
};

const handleRoomCreated = () => {
  searchOpen.value = false;
  emit("selectRoom");
};

const navigate = (name: string) => {
  menuOpen.value = false;
  router.push({ name });
};

const handleLogout = () => {
  menuOpen.value = false;
  authStore.logout();
  router.push({ name: "WelcomePage" });
};
</script>

<template>
  <div
    class="flex h-full flex-col border-r border-neutral-grad-0 bg-chat-sidebar"
  >
    <!-- Sidebar header -->
    <div
      class="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-grad-0 px-3"
    >
      <!-- Hamburger menu -->
      <div class="relative">
        <button
          class="flex h-11 w-11 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
          @click="menuOpen = !menuOpen"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <!-- Dropdown menu -->
        <Teleport to="body">
          <div
            v-if="menuOpen"
            class="fixed inset-0 z-40"
            @click="menuOpen = false"
          />
        </Teleport>
        <transition name="menu-fade">
          <div
            v-if="menuOpen"
            class="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-neutral-grad-0 bg-background-total-theme py-1 shadow-lg"
          >
            <button
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-color hover:bg-neutral-grad-0"
              @click="navigate('ProfilePage')"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </button>
            <button
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-color hover:bg-neutral-grad-0"
              @click="navigate('SettingsPage')"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                />
              </svg>
              Settings
            </button>
            <div class="my-1 border-t border-neutral-grad-0" />
            <button
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-color-bad hover:bg-neutral-grad-0"
              @click="handleLogout"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </transition>
      </div>

      <span class="flex-1 text-base font-semibold text-text-color"> </span>

      <!-- Search / New Chat toggle -->
      <button
        class="flex h-11 w-11 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
        title="Search users"
        @click="searchOpen = !searchOpen"
      >
        <svg
          v-if="!searchOpen"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <svg
          v-else
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <!-- New Group -->
      <button
        class="flex h-11 w-11 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
        title="New group"
        @click="emit('newGroup')"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
    </div>

    <!-- Search bar (collapsible) -->
    <div v-if="searchOpen" class="shrink-0 border-b border-neutral-grad-0 p-3">
      <ContactSearch @room-created="handleRoomCreated" />
    </div>

    <FolderTabs v-model="activeFilter" />

    <div class="flex-1 overflow-y-auto">
      <RoomListSkeleton v-if="roomsLoading" />
      <ContactList
        v-else
        :filter="activeFilter"
        @select-room="handleSelectRoom"
      />
    </div>
  </div>
</template>

<style scoped>
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
