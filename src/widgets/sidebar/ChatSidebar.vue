<script setup lang="ts">
import { ContactList, ContactSearch } from "@/features/contacts";

const emit = defineEmits<{ selectRoom: [] }>();

const handleSelectRoom = () => {
  emit("selectRoom");
};
</script>

<template>
  <div
    class="flex h-full flex-col border-r border-neutral-grad-0 bg-chat-sidebar"
  >
    <div class="shrink-0 border-b border-neutral-grad-0 p-3">
      <ContactSearch />
    </div>

    <div class="flex-1 overflow-y-auto">
      <ContactList @select-room="handleSelectRoom" />
    </div>
  </div>
</template>
