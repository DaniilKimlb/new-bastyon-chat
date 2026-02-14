<script setup lang="ts">
import { useContacts } from "../model/use-contacts";

const { searchQuery, searchResults, isSearching, searchUsers } = useContacts();

const handleInput = () => {
  searchUsers(searchQuery.value);
};

const emit = defineEmits<{
  select: [address: string];
}>();
</script>

<template>
  <div class="flex flex-col gap-2">
    <input
      v-model="searchQuery"
      placeholder="Search users..."
      class="rounded-lg bg-chat-input-bg px-3 py-2 text-sm text-text-color outline-none placeholder:text-neutral-grad-2"
      @input="handleInput"
    />

    <div v-if="isSearching" class="p-2 text-center text-sm text-text-on-main-bg-color">
      Searching...
    </div>

    <div v-else-if="searchResults.length" class="space-y-1">
      <button
        v-for="user in searchResults"
        :key="user.address"
        class="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-neutral-grad-0"
        @click="emit('select', user.address)"
      >
        <Avatar :src="user.image" :name="user.name" size="sm" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-text-color">{{ user.name }}</div>
          <div class="truncate text-xs text-text-on-main-bg-color">{{ user.address }}</div>
        </div>
      </button>
    </div>
  </div>
</template>
