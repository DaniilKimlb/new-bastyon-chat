import { defineStore } from "pinia";
import { ref } from "vue";

import type { User } from "./types";

const NAMESPACE = "user";

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

  return {
    getUser,
    setUser,
    setUsers,
    users
  };
});
