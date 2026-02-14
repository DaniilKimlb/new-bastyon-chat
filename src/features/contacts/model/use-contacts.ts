import { ref } from "vue";
import { useUserStore } from "@/entities/user";
import type { User } from "@/entities/user";

export function useContacts() {
  const userStore = useUserStore();
  const searchQuery = ref("");
  const searchResults = ref<User[]>([]);
  const isSearching = ref(false);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    isSearching.value = true;
    try {
      // TODO: Search via SDK/proxy node
      // For now, search in cached users
      searchResults.value = Object.values(userStore.users).filter(
        user =>
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.address.toLowerCase().includes(query.toLowerCase())
      );
    } finally {
      isSearching.value = false;
    }
  };

  return {
    isSearching,
    searchQuery,
    searchResults,
    searchUsers
  };
}
