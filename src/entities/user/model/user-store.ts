import { defineStore } from "pinia";
import { ref } from "vue";
import { createAppInitializer } from "@/app/providers/initializers/app-initializer";

import type { User } from "./types";

const NAMESPACE = "user";

/** Shared app initializer instance for loading user profiles on demand */
let _appInit: ReturnType<typeof createAppInitializer> | null = null;
function getAppInit() {
  if (!_appInit) _appInit = createAppInitializer();
  return _appInit;
}

/** In-flight requests to avoid duplicate loads */
const pendingLoads = new Map<string, Promise<void>>();

export const useUserStore = defineStore(NAMESPACE, () => {
  const users = ref<Record<string, User>>({});

  const getUser = (address: string): User | undefined => {
    return users.value[address];
  };

  const setUser = (address: string, user: User) => {
    users.value[address] = user;
  };

  const setUsers = (userList: User[]) => {
    for (const user of userList) {
      users.value[user.address] = user;
    }
  };

  /** Load a user profile if not already cached. Deduplicates in-flight requests. */
  const loadUserIfMissing = (address: string): void => {
    if (!address || users.value[address]) return;
    if (pendingLoads.has(address)) return;

    const promise = (async () => {
      try {
        const appInit = getAppInit();
        await appInit.initApi();
        const userData = await appInit.loadUserData([address]);
        if (userData) {
          users.value[address] = {
            address,
            name: userData.name ?? "",
            about: userData.about ?? "",
            image: userData.image ?? "",
            site: userData.site ?? "",
            language: userData.language ?? "",
          };
        }
      } catch {
        // Silently fail — user will see address as fallback
      } finally {
        pendingLoads.delete(address);
      }
    })();

    pendingLoads.set(address, promise);
  };

  return {
    getUser,
    loadUserIfMissing,
    setUser,
    setUsers,
    users
  };
});
