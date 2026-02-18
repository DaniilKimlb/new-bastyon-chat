<script setup lang="ts">
import { ref, nextTick } from "vue";
import { useChatStore } from "@/entities/chat";
import { useMessages } from "../model/use-messages";
import EmojiPicker from "./EmojiPicker.vue";
import AttachmentPanel from "./AttachmentPanel.vue";

const chatStore = useChatStore();
const { sendMessage, sendFile, sendReply, editMessage, setTyping } = useMessages();

const text = ref("");
const textareaRef = ref<HTMLTextAreaElement>();
const fileInputRef = ref<HTMLInputElement>();
const sending = ref(false);
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

// Watch for edit mode
watch(() => chatStore.editingMessage, (editing) => {
  if (editing) {
    text.value = editing.content;
    nextTick(() => {
      textareaRef.value?.focus();
      autoResize();
    });
  }
}, { immediate: true });

const isEditing = computed(() => !!chatStore.editingMessage);

const cancelEdit = () => {
  chatStore.editingMessage = null;
  text.value = "";
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.style.height = "auto";
  });
};

/** Auto-resize textarea to fit content (1 to 6 rows) */
const autoResize = () => {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  const lineHeight = 22; // ~text-sm line height
  const maxHeight = lineHeight * 6;
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
};

const handleSend = () => {
  if (!text.value.trim()) return;
  if (isEditing.value) {
    editMessage(chatStore.editingMessage!.id, text.value);
    chatStore.editingMessage = null;
  } else if (chatStore.replyingTo) {
    sendReply(text.value);
  } else {
    sendMessage(text.value);
  }
  text.value = "";
  setTyping(false);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = "auto";
    }
  });
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleInput = () => {
  autoResize();
  setTyping(true);
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    setTyping(false);
  }, 5000);
};

const showAttachmentPanel = ref(false);
const photoInputRef = ref<HTMLInputElement>();

const openFilePicker = () => {
  fileInputRef.value?.click();
};

const openPhotoPicker = () => {
  photoInputRef.value?.click();
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
    target.value = "";
  }
};

const cancelReply = () => {
  chatStore.replyingTo = null;
};

// Voice recording
const isRecording = ref(false);
const recordingDuration = ref(0);
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingTimer: ReturnType<typeof setInterval> | null = null;

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      if (audioChunks.length === 0) return;
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
      sending.value = true;
      try {
        await sendFile(file);
      } finally {
        sending.value = false;
      }
    };

    mediaRecorder.start(100);
    isRecording.value = true;
    recordingDuration.value = 0;
    recordingTimer = setInterval(() => {
      recordingDuration.value++;
    }, 1000);
  } catch (e) {
    console.error("Failed to start recording:", e);
  }
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  isRecording.value = false;
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
};

const cancelRecording = () => {
  audioChunks = [];
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onstop = () => {
      mediaRecorder?.stream?.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.stop();
  }
  isRecording.value = false;
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
};

const showEmojiPicker = ref(false);

const insertEmoji = (emoji: string) => {
  const el = textareaRef.value;
  if (el) {
    const start = el.selectionStart ?? text.value.length;
    const end = el.selectionEnd ?? text.value.length;
    text.value = text.value.slice(0, start) + emoji + text.value.slice(end);
    nextTick(() => {
      el.selectionStart = el.selectionEnd = start + emoji.length;
      el.focus();
      autoResize();
    });
  } else {
    text.value += emoji;
  }
  showEmojiPicker.value = false;
};
</script>

<template>
  <div class="border-t border-neutral-grad-0 bg-background-total-theme">
    <!-- Editing bar -->
    <div
      v-if="isEditing"
      class="flex items-center gap-2 border-b border-neutral-grad-0 px-3 py-2"
    >
      <div class="flex h-8 w-8 items-center justify-center text-color-bg-ac">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-xs font-medium text-color-bg-ac">Editing</div>
        <div class="truncate text-xs text-text-on-main-bg-color">{{ chatStore.editingMessage?.content }}</div>
      </div>
      <button
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color hover:bg-neutral-grad-0"
        @click="cancelEdit"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Reply preview bar -->
    <div
      v-else-if="chatStore.replyingTo"
      class="flex items-center gap-2 border-b border-neutral-grad-0 px-3 py-2"
    >
      <div class="h-8 w-0.5 shrink-0 rounded-full bg-color-bg-ac" />
      <div class="min-w-0 flex-1">
        <div class="truncate text-xs font-medium text-color-bg-ac">
          {{ chatStore.replyingTo.senderId }}
        </div>
        <div class="truncate text-xs text-text-on-main-bg-color">
          {{ chatStore.replyingTo.content }}
        </div>
      </div>
      <button
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color hover:bg-neutral-grad-0"
        @click="cancelReply"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Recording bar -->
    <div v-if="isRecording" class="flex items-center gap-3 p-3">
      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-color-bad transition-colors hover:bg-neutral-grad-0"
        title="Cancel"
        @click="cancelRecording"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div class="flex flex-1 items-center gap-2">
        <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-color-bad" />
        <span class="text-sm font-medium text-text-color">{{ formatDuration(recordingDuration) }}</span>
        <span class="text-xs text-text-on-main-bg-color">Recording...</span>
      </div>

      <button
        class="send-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-color-bg-ac text-white transition-all hover:bg-color-bg-ac-1"
        title="Send voice"
        @click="stopRecording"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>

    <!-- Input row -->
    <div v-else class="flex items-end gap-2 p-3">
      <!-- Attachment button -->
      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
        :disabled="sending"
        title="Attach"
        @click="showAttachmentPanel = true"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      <!-- Hidden file inputs -->
      <input
        ref="photoInputRef"
        type="file"
        class="hidden"
        multiple
        accept="image/*,video/*"
        @change="handleFileSelect"
      />
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z"
        @change="handleFileSelect"
      />

      <!-- Emoji button -->
      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
        title="Emoji"
        @click="showEmojiPicker = !showEmojiPicker"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      <!-- Auto-resizing textarea -->
      <textarea
        ref="textareaRef"
        v-model="text"
        placeholder="Message"
        rows="1"
        class="flex-1 resize-none rounded-2xl bg-chat-input-bg px-4 py-2.5 text-sm leading-[22px] text-text-color outline-none placeholder:text-neutral-grad-2"
        :disabled="sending"
        @keydown="handleKeydown"
        @input="handleInput"
      />

      <!-- Send / Confirm edit button -->
      <button
        v-if="text.trim() || sending"
        class="send-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-color-bg-ac text-white transition-all hover:bg-color-bg-ac-1 disabled:opacity-50"
        :disabled="!text.trim() || sending"
        @click="handleSend"
      >
        <svg v-if="sending" class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" viewBox="0 0 24 24" />
        <svg
          v-else-if="isEditing"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg
          v-else
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>

      <!-- Mic button (shown when input is empty) -->
      <button
        v-else
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
        title="Voice message"
        @click="startRecording"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    </div>

    <EmojiPicker
      :show="showEmojiPicker"
      @close="showEmojiPicker = false"
      @select="insertEmoji"
    />

    <AttachmentPanel
      :show="showAttachmentPanel"
      @close="showAttachmentPanel = false"
      @select-photo="openPhotoPicker"
      @select-file="openFilePicker"
    />
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .send-btn:active {
    animation: send-pulse 0.15s ease;
  }
}
@keyframes send-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
</style>
