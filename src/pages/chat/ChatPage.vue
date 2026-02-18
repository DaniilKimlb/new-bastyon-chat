<script setup lang="ts">
import ChatSidebar from "@/widgets/sidebar/ChatSidebar.vue";
import ChatWindow from "@/widgets/chat-window/ChatWindow.vue";
import { useChatStore } from "@/entities/chat";

const chatStore = useChatStore();

const showSidebar = ref(true);
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
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
</script>

<template>
  <div class="flex h-screen bg-background-total-theme">
    <!-- Sidebar -->
    <transition name="slide-sidebar">
      <ChatSidebar
        v-if="!isMobile || showSidebar"
        class="h-full w-full md:w-80 md:shrink-0"
        @select-room="onSelectRoom"
      />
    </transition>

    <!-- Chat window -->
    <transition name="slide-chat">
      <ChatWindow
        v-if="!isMobile || !showSidebar"
        class="h-full flex-1"
        @back="onBackToSidebar"
      />
    </transition>
  </div>
</template>

<style scoped>
.slide-sidebar-enter-active,
.slide-sidebar-leave-active,
.slide-chat-enter-active,
.slide-chat-leave-active {
  transition: transform 0.25s ease;
}
.slide-sidebar-enter-from {
  transform: translateX(-100%);
}
.slide-sidebar-leave-to {
  transform: translateX(-100%);
}
.slide-chat-enter-from {
  transform: translateX(100%);
}
.slide-chat-leave-to {
  transform: translateX(100%);
}
</style>
