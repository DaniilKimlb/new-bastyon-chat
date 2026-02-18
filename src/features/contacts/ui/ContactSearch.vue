<script setup lang="ts">
import { useContacts } from "../model/use-contacts";
import { UserAvatar } from "@/entities/user";

const { searchQuery, searchResults, isSearching, isCreatingRoom, debouncedSearch, getOrCreateRoom } = useContacts();

const emit = defineEmits<{
  select: [address: string];
  roomCreated: [roomId: string];
}>();

const handleInput = () => {
  debouncedSearch(searchQuery.value);
};

const handleSelect = async (address: string) => {
  emit("select", address);
  const roomId = await getOrCreateRoom(address);
  if (roomId) {
    emit("roomCreated", roomId);
    searchQuery.value = "";
    searchResults.value = [];
  }
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <input
      v-model="searchQuery"
      placeholder="Search users..."
      class="rounded-lg bg-chat-input-bg px-3 py-2 text-sm text-text-color outline-none placeholder:text-neutral-grad-2"
      @input="handleInput"
    />

    <div v-if="isSearching" class="flex items-center justify-center gap-2 p-3 text-sm text-text-on-main-bg-color">
      <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      Searching...
    </div>

    <div v-else-if="isCreatingRoom" class="flex items-center justify-center gap-2 p-3 text-sm text-text-on-main-bg-color">
      <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      Opening chat...
    </div>

    <div v-else-if="searchQuery && searchResults.length === 0 && !isSearching" class="p-3 text-center text-sm text-text-on-main-bg-color">
      No users found
    </div>

    <div v-else-if="searchResults.length" class="max-h-64 space-y-0.5 overflow-y-auto">
      <button
        v-for="user in searchResults"
        :key="user.address"
        class="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-neutral-grad-0"
        :disabled="isCreatingRoom"
        @click="handleSelect(user.address)"
      >
        <UserAvatar :address="user.address" size="sm" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-text-color">{{ user.name }}</div>
          <div class="truncate text-xs text-text-on-main-bg-color">{{ user.address }}</div>
        </div>
      </button>
    </div>
  </div>
</template>
