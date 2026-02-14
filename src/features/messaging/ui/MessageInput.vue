<script setup lang="ts">
import { ref } from "vue";
import { useMessages } from "../model/use-messages";

const { sendMessage, setTyping } = useMessages();

const text = ref("");
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

const handleSend = () => {
  if (!text.value.trim()) return;
  sendMessage(text.value);
  text.value = "";
  setTyping(false);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleInput = () => {
  setTyping(true);
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    setTyping(false);
  }, 5000);
};
</script>

<template>
  <div
    class="flex items-end gap-2 border-t border-neutral-grad-0 bg-background-total-theme p-3"
  >
    <textarea
      v-model="text"
      placeholder="Type a message..."
      rows="1"
      class="flex-1 resize-none rounded-xl bg-chat-input-bg px-4 py-2.5 text-sm text-text-color outline-none placeholder:text-neutral-grad-2"
      @keydown="handleKeydown"
      @input="handleInput"
    />
    <button
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-color-bg-ac text-white transition-colors hover:bg-color-bg-ac-1 disabled:opacity-50"
      :disabled="!text.trim()"
      @click="handleSend"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
      </svg>
    </button>
  </div>
</template>
