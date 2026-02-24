<script setup lang="ts">
import ChatSidebar from "@/widgets/sidebar/ChatSidebar.vue";
import ChatWindow from "@/widgets/chat-window/ChatWindow.vue";
import { GroupCreationPanel } from "@/features/group-creation";
import { useChatStore } from "@/entities/chat";

const chatStore = useChatStore();

const showSidebar = ref(true);
const isMobile = ref(false);

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
const checkMobile = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    isMobile.value = window.innerWidth < 768;
  }, 150);
};

onMounted(() => {
  isMobile.value = window.innerWidth < 768;
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  clearTimeout(resizeTimer);
});

const onSelectRoom = () => {
  if (isMobile.value) {
    showSidebar.value = false;
  }
};

const onBackToSidebar = () => {
  chatStore.setActiveRoom(null);
  showSidebar.value = true;
};

const showGroupCreation = ref(false);

const onNewGroup = () => {
  showGroupCreation.value = true;
};

const onGroupCreated = () => {
  showGroupCreation.value = false;
  if (isMobile.value) showSidebar.value = false;
};

const onCloseGroupCreation = () => {
  showGroupCreation.value = false;
};
</script>

<template>
  <div class="flex h-screen bg-background-total-theme" :class="{ 'relative overflow-hidden': isMobile }">
    <!-- Desktop: show both side by side -->
    <template v-if="!isMobile">
      <ChatSidebar
        class="h-full w-80 shrink-0"
        @select-room="onSelectRoom"
        @new-group="onNewGroup"
      />
      <GroupCreationPanel
        v-if="showGroupCreation"
        class="h-full flex-1"
        @created="onGroupCreated"
        @close="onCloseGroupCreation"
      />
      <ChatWindow
        v-else
        class="h-full flex-1"
        @back="onBackToSidebar"
      />
    </template>

    <!-- Mobile: v-show preserves state (scroll position etc.) -->
    <template v-else>
      <ChatSidebar
        v-show="showSidebar && !showGroupCreation"
        class="absolute inset-0 z-10 h-full w-full"
        @select-room="onSelectRoom"
        @new-group="onNewGroup"
      />
      <ChatWindow
        v-show="!showSidebar && !showGroupCreation"
        class="absolute inset-0 z-10 h-full w-full"
        @back="onBackToSidebar"
      />
      <GroupCreationPanel
        v-if="showGroupCreation"
        class="absolute inset-0 z-20 h-full w-full"
        @created="onGroupCreated"
        @close="onCloseGroupCreation"
      />
    </template>
  </div>
</template>
