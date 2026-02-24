<script setup lang="ts">
import { useChatStore } from "@/entities/chat";
import { UserAvatar } from "@/entities/user";
import { useAuthStore } from "@/entities/auth";
import { hexEncode, hexDecode } from "@/shared/lib/matrix/functions";
import { MATRIX_SERVER } from "@/shared/config";
import { useContacts } from "@/features/contacts/model/use-contacts";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const chatStore = useChatStore();
const authStore = useAuthStore();
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

// Power levels
const powerLevels = computed(() => {
  if (!room.value) return { myLevel: 0, levels: {} };
  return chatStore.getRoomPowerLevels(room.value.id);
});

const isAdmin = computed(() => powerLevels.value.myLevel >= 50);

// room.members stores hex-encoded IDs — build Matrix ID directly without re-encoding
const getMemberPowerLevel = (hexId: string): number => {
  const matrixId = `@${hexId}:${MATRIX_SERVER}`;
  return powerLevels.value.levels[matrixId] ?? 0;
};

const isMemberAdmin = (hexId: string): boolean => getMemberPowerLevel(hexId) >= 50;

// My hex ID for self-check (room.members are hex-encoded)
const myHexId = computed(() => hexEncode(authStore.address ?? "").toLowerCase());

// Add member overlay
const showAddMember = ref(false);
const { searchQuery: addSearchQuery, searchResults: addSearchResults, isSearching: addIsSearching, debouncedSearch: addDebouncedSearch } = useContacts();
const addingMember = ref(false);

const handleAddMemberSearch = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  addSearchQuery.value = value;
  addDebouncedSearch(value);
};

// inviteMember expects raw address — search results give raw addresses
const handleAddMember = async (address: string) => {
  if (!room.value || addingMember.value) return;
  addingMember.value = true;
  const ok = await chatStore.inviteMember(room.value.id, address);
  addingMember.value = false;
  if (ok) {
    showAddMember.value = false;
    addSearchQuery.value = "";
  }
};

// Member actions — address here is a hex-encoded ID from room.members
const memberAction = ref<{ show: boolean; hexId: string; x: number; y: number }>({
  show: false, hexId: "", x: 0, y: 0,
});

const openMemberMenu = (e: MouseEvent, hexId: string) => {
  if (!isAdmin.value) return;
  if (hexId === myHexId.value) return; // can't manage self
  memberAction.value = { show: true, hexId, x: e.clientX, y: e.clientY };
};

const kickingMember = ref(false);

// kickMember expects raw address — decode hex before passing
const handleKickMember = async () => {
  if (!room.value || kickingMember.value) return;
  kickingMember.value = true;
  const rawAddr = hexDecode(memberAction.value.hexId);
  await chatStore.kickMember(room.value.id, rawAddr);
  kickingMember.value = false;
  memberAction.value.show = false;
};

const togglingAdmin = ref(false);

// setMemberPowerLevel expects raw address — decode hex before passing
const handleToggleAdmin = async () => {
  if (!room.value || togglingAdmin.value) return;
  togglingAdmin.value = true;
  const hexId = memberAction.value.hexId;
  const rawAddr = hexDecode(hexId);
  const currentLevel = getMemberPowerLevel(hexId);
  const newLevel = currentLevel >= 50 ? 0 : 50;
  await chatStore.setMemberPowerLevel(room.value.id, rawAddr, newLevel);
  togglingAdmin.value = false;
  memberAction.value.show = false;
};

const memberMenuStyle = computed(() => {
  const x = Math.min(memberAction.value.x, (window?.innerWidth ?? 800) - 200);
  const y = Math.min(memberAction.value.y, (window?.innerHeight ?? 600) - 150);
  return { left: `${x}px`, top: `${y}px` };
});

// Leave / Delete — track which action was triggered
const confirmAction = ref<"leave" | "delete" | null>(null);

const handleLeaveGroup = () => {
  if (!room.value) return;
  chatStore.leaveGroup(room.value.id);
  confirmAction.value = null;
  emit("close");
};

const handleDeleteChat = () => {
  if (!room.value) return;
  chatStore.removeRoom(room.value.id);
  confirmAction.value = null;
  emit("close");
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
        class="fixed right-0 top-0 z-50 h-full w-[320px] max-w-full bg-background-total-theme shadow-xl"
        @click.stop
      >
        <div v-if="room" class="flex h-full flex-col">
          <!-- Header -->
          <div class="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-grad-0 px-4">
            <button
              class="flex h-11 w-11 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
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
              <UserAvatar
                v-if="room.avatar?.startsWith('__pocketnet__:')"
                :address="room.avatar.replace('__pocketnet__:', '')"
                size="xl"
              />
              <Avatar v-else :src="room.avatar" :name="room.name" size="xl" />
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
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-medium uppercase text-text-on-main-bg-color">
                  Members ({{ room.members.length }})
                </span>
                <!-- Add member button (admin only) -->
                <button
                  v-if="isAdmin"
                  class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-color-bg-ac transition-colors hover:bg-neutral-grad-0"
                  @click="showAddMember = !showAddMember"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </div>

              <!-- Add member search (inline) -->
              <div v-if="showAddMember" class="mb-3">
                <input
                  :value="addSearchQuery"
                  type="text"
                  placeholder="Search users to add..."
                  class="mb-2 w-full rounded-lg bg-chat-input-bg px-3 py-2 text-sm text-text-color outline-none placeholder:text-neutral-grad-2"
                  @input="handleAddMemberSearch"
                />
                <div class="max-h-[200px] overflow-y-auto">
                  <div v-if="addIsSearching" class="flex justify-center py-2">
                    <div class="h-5 w-5 animate-spin rounded-full border-2 border-color-bg-ac border-t-transparent" />
                  </div>
                  <button
                    v-for="user in addSearchResults"
                    :key="user.address"
                    class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-neutral-grad-0"
                    :disabled="addingMember"
                    @click="handleAddMember(user.address)"
                  >
                    <UserAvatar :address="user.address" size="sm" />
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-sm text-text-color">{{ user.name }}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-color-bg-ac">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <div v-if="addSearchResults.length === 0 && addSearchQuery && !addIsSearching" class="py-2 text-center text-xs text-text-on-main-bg-color">
                    No users found
                  </div>
                </div>
              </div>

              <!-- Member list -->
              <div class="flex flex-col gap-1">
                <div
                  v-for="member in room.members"
                  :key="member"
                  class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                  :class="isAdmin && member !== myHexId ? 'cursor-pointer hover:bg-neutral-grad-0' : ''"
                  @click="(e: MouseEvent) => openMemberMenu(e, member)"
                >
                  <UserAvatar :address="hexDecode(member)" size="sm" />
                  <span class="min-w-0 flex-1 truncate text-sm text-text-color">
                    {{ chatStore.getDisplayName(member) }}
                  </span>
                  <span
                    v-if="isMemberAdmin(member)"
                    class="shrink-0 rounded bg-color-bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-color-bg-ac"
                  >
                    admin
                  </span>
                </div>
              </div>
            </div>

            <!-- Danger zone -->
            <div class="border-t border-neutral-grad-0 px-4 py-3">
              <button
                class="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-color-bad transition-colors hover:bg-neutral-grad-0"
                @click="confirmAction = 'leave'"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {{ room.isGroup ? "Leave group" : "Delete chat" }}
              </button>

              <!-- Delete group button (admin only) -->
              <button
                v-if="room.isGroup && isAdmin"
                class="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-color-bad transition-colors hover:bg-neutral-grad-0"
                @click="confirmAction = 'delete'"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete group for everyone
              </button>

              <!-- Confirmation dialog -->
              <transition name="panel-fade">
                <div
                  v-if="confirmAction"
                  class="mt-3 rounded-lg border border-color-bad/30 bg-color-bad/5 p-3"
                >
                  <p class="mb-3 text-sm text-text-color">
                    <template v-if="confirmAction === 'delete'">
                      This will kick all members and delete the group. Are you sure?
                    </template>
                    <template v-else-if="room.isGroup">
                      Do you really want to leave this group?
                    </template>
                    <template v-else>
                      Do you really want to delete this chat?
                    </template>
                  </p>
                  <div class="flex gap-2">
                    <button
                      class="flex-1 rounded-lg bg-neutral-grad-0 px-3 py-2 text-sm font-medium text-text-color transition-colors hover:bg-neutral-grad-2"
                      @click="confirmAction = null"
                    >
                      Cancel
                    </button>
                    <button
                      class="flex-1 rounded-lg bg-color-bad px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-color-bad/90"
                      @click="confirmAction === 'delete' ? handleDeleteChat() : (room?.isGroup ? handleLeaveGroup() : handleDeleteChat())"
                    >
                      {{ confirmAction === 'delete' ? "Delete" : (room.isGroup ? "Leave" : "Delete") }}
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Member action menu (admin) -->
    <transition name="panel-fade">
      <div
        v-if="memberAction.show"
        class="fixed inset-0 z-[60]"
        @click="memberAction.show = false"
      >
        <div
          class="absolute w-52 overflow-hidden rounded-xl border border-neutral-grad-0 bg-background-total-theme shadow-lg"
          :style="memberMenuStyle"
          @click.stop
        >
          <!-- Member info header -->
          <div class="flex items-center gap-3 border-b border-neutral-grad-0 px-4 py-3">
            <UserAvatar :address="hexDecode(memberAction.hexId)" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium text-text-color">
                {{ chatStore.getDisplayName(memberAction.hexId) }}
              </div>
              <span
                v-if="isMemberAdmin(memberAction.hexId)"
                class="text-[10px] font-medium text-color-bg-ac"
              >
                Admin
              </span>
            </div>
          </div>

          <div class="py-1">
            <button
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-color hover:bg-neutral-grad-0"
              :disabled="togglingAdmin"
              @click="handleToggleAdmin"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {{ isMemberAdmin(memberAction.hexId) ? "Remove admin" : "Make admin" }}
            </button>
            <button
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-color-bad hover:bg-neutral-grad-0"
              :disabled="kickingMember"
              @click="handleKickMember"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" />
              </svg>
              Remove from group
            </button>
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
