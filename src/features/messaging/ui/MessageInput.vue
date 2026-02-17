<script setup lang="ts">
import { ref } from "vue";
import { useMessages } from "../model/use-messages";

const { sendMessage, sendFile, setTyping } = useMessages();

const text = ref("");
const fileInputRef = ref<HTMLInputElement>();
const sending = ref(false);
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

const openFilePicker = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files?.length) return;

  sending.value = true;
  try {
    for (const file of Array.from(files)) {
      await sendFile(file);
    }
  } finally {
    sending.value = false;
    // Reset input so same file can be selected again
    target.value = "";
  }
};
</script>

<template>
  <div
    class="flex items-end gap-2 border-t border-neutral-grad-0 bg-background-total-theme p-3"
  >
    <!-- Attachment button -->
    <button
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
      :disabled="sending"
      title="Attach file"
      @click="openFilePicker"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
    </button>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      multiple
      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z"
      @change="handleFileSelect"
    />

    <textarea
      v-model="text"
      placeholder="Type a message..."
      rows="1"
      class="flex-1 resize-none rounded-xl bg-chat-input-bg px-4 py-2.5 text-sm text-text-color outline-none placeholder:text-neutral-grad-2"
      :disabled="sending"
      @keydown="handleKeydown"
      @input="handleInput"
    />
    <button
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-color-bg-ac text-white transition-colors hover:bg-color-bg-ac-1 disabled:opacity-50"
      :disabled="!text.trim() || sending"
      @click="handleSend"
    >
      <svg
        v-if="!sending"
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
      <div v-else class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
    </button>
  </div>
</template>
