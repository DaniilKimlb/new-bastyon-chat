import { ref } from "vue";
import { createAppInitializer } from "@/app/providers/initializers/app-initializer";
import { useUserStore } from "@/entities/user";
import { useAuthStore } from "@/entities/auth";
import { useChatStore } from "@/entities/chat";
import { getMatrixClientService } from "@/entities/matrix";
import { getmatrixid, hexEncode } from "@/shared/lib/matrix/functions";
import { MATRIX_SERVER } from "@/shared/config";

import type { User } from "@/entities/user";

let _appInit: ReturnType<typeof createAppInitializer> | null = null;
function getAppInit() {
  if (!_appInit) _appInit = createAppInitializer();
  return _appInit;
}

export function useContacts() {
  const userStore = useUserStore();
  const authStore = useAuthStore();
  const chatStore = useChatStore();
  const searchQuery = ref("");
  const searchResults = ref<User[]>([]);
  const isSearching = ref(false);
  const isCreatingRoom = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    isSearching.value = true;
    try {
      const appInit = getAppInit();
      const results = await appInit.searchUsers(query.trim());

      // Filter out self
      const myAddress = authStore.address ?? "";
      searchResults.value = results
        .filter(u => u.address !== myAddress)
        .map(u => ({
          address: u.address,
          name: u.name || u.address,
          about: "",
          image: u.image,
          site: "",
          language: "",
        }));

      // Cache found users in user store
      for (const user of searchResults.value) {
        userStore.setUser(user.address, user);
      }
    } catch {
      // Fallback to cached users
      searchResults.value = Object.values(userStore.users).filter(
        user =>
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.address.toLowerCase().includes(query.toLowerCase())
      );
    } finally {
      isSearching.value = false;
    }
  };

  const debouncedSearch = (query: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => searchUsers(query), 300);
  };

  /** Get or create a 1:1 room with the given address. Returns the room ID. */
  const getOrCreateRoom = async (targetAddress: string): Promise<string | null> => {
    isCreatingRoom.value = true;
    try {
      const matrixService = getMatrixClientService();
      const myUserId = matrixService.getUserId();
      if (!myUserId) return null;

      const targetMatrixId = `@${hexEncode(targetAddress).toLowerCase()}:${MATRIX_SERVER}`;
      const myRawId = getmatrixid(myUserId);

      // Check existing rooms for a 1:1 with this user
      const rooms = matrixService.getRooms() as Array<Record<string, unknown>>;
      for (const room of rooms) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roomAny = room as any;
        const members = (roomAny.getMembers?.() ?? roomAny.currentState?.getMembers?.() ?? []) as Array<{ userId: string }>;
        if (members.length === 2) {
          const memberIds = members.map(m => getmatrixid(m.userId));
          const targetRawId = getmatrixid(targetMatrixId);
          if (memberIds.includes(myRawId) && memberIds.includes(targetRawId)) {
            const roomId = roomAny.roomId as string;
            chatStore.setActiveRoom(roomId);
            return roomId;
          }
        }
      }

      // Create new room — match bastyon-chat createRoom pattern
      const result = await matrixService.createRoom({
        visibility: "private",
        invite: [targetMatrixId],
        is_direct: true,
        initial_state: [
          {
            type: "m.set.encrypted",
            state_key: "",
            content: { encrypted: true },
          },
        ],
      });

      const roomId = result.room_id;

      // Set equal power levels for the invited user
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newRoom = matrixService.getRoom(roomId) as any;
        if (newRoom) {
          const powerEvent = newRoom.currentState?.getStateEvents?.("m.room.power_levels");
          if (powerEvent?.length) {
            await matrixService.setPowerLevel(roomId, targetMatrixId, 100, powerEvent[0]);
          }
        }
      } catch {
        // Power level setting is best-effort
      }

      // Refresh rooms so the new room appears in the list
      chatStore.refreshRooms();
      chatStore.setActiveRoom(roomId);

      return roomId;
    } catch (e: unknown) {
      // If room already exists (M_ROOM_IN_USE), try to find and join it
      const err = e as { errcode?: string };
      if (err?.errcode === "M_ROOM_IN_USE") {
        // Room exists — refresh and find it
        await chatStore.refreshRooms();
        const targetRawId = getmatrixid(`@${hexEncode(targetAddress).toLowerCase()}:${MATRIX_SERVER}`);
        const existingRoom = chatStore.sortedRooms.find(r => {
          // Check if room name contains the target address or avatar matches
          return r.avatar === `__pocketnet__:${targetRawId}`;
        });
        if (existingRoom) {
          chatStore.setActiveRoom(existingRoom.id);
          return existingRoom.id;
        }
      }
      console.error("[useContacts] getOrCreateRoom error:", e);
      return null;
    } finally {
      isCreatingRoom.value = false;
    }
  };

  return {
    isSearching,
    isCreatingRoom,
    searchQuery,
    searchResults,
    searchUsers,
    debouncedSearch,
    getOrCreateRoom,
  };
}
