<script setup lang="ts">
import MainLayout from "@/widgets/layouts/MainLayout.vue";
import ChatSidebar from "@/widgets/sidebar/ChatSidebar.vue";
import ChatWindow from "@/widgets/chat-window/ChatWindow.vue";
import { useAuthStore } from "@/entities/auth";
import { useChatStore } from "@/entities/chat";

const authStore = useAuthStore();
const chatStore = useChatStore();

const showSidebar = ref(true);
const isMobile = ref(false);
const showDebug = ref(true);

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
  showSidebar.value = true;
};
</script>

<template>
  <MainLayout>
    <!-- Debug status bar (temporary) -->
    <div
      v-if="showDebug"
      class="relative z-50 border-b border-yellow-600 bg-yellow-100 px-3 py-2 text-xs text-yellow-900"
    >
      <button
        class="absolute right-2 top-1 text-yellow-600"
        @click="showDebug = false"
      >&times;</button>
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <span><b>Auth:</b> {{ authStore.isAuthenticated ? 'YES' : 'NO' }}</span>
        <span><b>Addr:</b> {{ authStore.address?.slice(0, 10) ?? 'null' }}...</span>
        <span><b>Matrix:</b> {{ authStore.matrixReady ? 'READY' : 'NOT READY' }}</span>
        <span v-if="authStore.matrixError" class="text-red-700">
          <b>MatrixErr:</b> {{ authStore.matrixError }}
        </span>
        <span><b>Rooms:</b> {{ chatStore.rooms.length }}</span>
        <span><b>Active:</b> {{ chatStore.activeRoomId ?? 'none' }}</span>
        <span><b>Msgs:</b> {{ chatStore.activeMessages.length }}</span>
      </div>
    </div>

    <div class="flex" style="height: calc(100vh - 32px)">
      <ChatSidebar
        v-if="!isMobile || showSidebar"
        class="w-full md:w-80 md:shrink-0"
        @select-room="onSelectRoom"
      />
      <ChatWindow
        v-if="!isMobile || !showSidebar"
        class="flex-1"
        @back="onBackToSidebar"
      />
    </div>
  </MainLayout>
</template>
