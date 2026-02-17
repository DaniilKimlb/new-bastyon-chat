<script setup lang="ts">
import type { Message } from "@/entities/chat";
import { MessageStatus, MessageType } from "@/entities/chat";
import { formatTime } from "@/shared/lib/format";
import { useFileDownload } from "../model/use-file-download";
import { ref, onMounted } from "vue";

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

const props = defineProps<Props>();
const { getState, download, saveFile, formatSize } = useFileDownload();

const time = computed(() => formatTime(new Date(props.message.timestamp)));

const isMedia = computed(() =>
  props.message.type === MessageType.image ||
  props.message.type === MessageType.video ||
  props.message.type === MessageType.audio
);

const isFile = computed(() => props.message.type === MessageType.file);

const hasFileInfo = computed(() => !!props.message.fileInfo);

const fileState = computed(() => getState(props.message.id));

const lightboxOpen = ref(false);

const statusIcon = computed(() => {
  switch (props.message.status) {
    case MessageStatus.sending:
      return "\u{23F3}";
    case MessageStatus.sent:
      return "\u{2713}";
    case MessageStatus.delivered:
      return "\u{2713}\u{2713}";
    case MessageStatus.read:
      return "\u{2713}\u{2713}";
    case MessageStatus.failed:
      return "\u{2717}";
    default:
      return "";
  }
});

/** File extension icon based on type */
const fileIcon = computed(() => {
  const type = props.message.fileInfo?.type ?? "";
  if (type.startsWith("application/pdf")) return "pdf";
  if (type.includes("zip") || type.includes("archive") || type.includes("rar")) return "zip";
  if (type.includes("word") || type.includes("document")) return "doc";
  if (type.includes("sheet") || type.includes("excel")) return "xls";
  if (type.includes("presentation") || type.includes("powerpoint")) return "ppt";
  if (type.startsWith("text/")) return "txt";
  return "file";
});

/** Auto-load images on mount */
onMounted(() => {
  if (props.message.type === MessageType.image && props.message.fileInfo) {
    download(props.message);
  }
});

const handleMediaClick = () => {
  if (props.message.type === MessageType.image && fileState.value.objectUrl) {
    lightboxOpen.value = true;
  }
};

const handleFileDownload = async () => {
  if (!props.message.fileInfo) return;

  const url = fileState.value.objectUrl ?? await download(props.message);

  if (url) {
    saveFile(url, props.message.fileInfo.name);
  }
};

const handleVideoAudioLoad = () => {
  if (!props.message.fileInfo) return;
  download(props.message);
};
</script>

<template>
  <div
    class="flex gap-2"
    :class="props.isOwn ? 'flex-row-reverse' : 'flex-row'"
  >
    <div v-if="!props.isOwn && props.showAvatar" class="shrink-0">
      <slot name="avatar" />
    </div>
    <div v-else-if="!props.isOwn" class="w-8 shrink-0" />

    <!-- Image message -->
    <div
      v-if="message.type === MessageType.image && hasFileInfo"
      class="max-w-[70%] overflow-hidden rounded-2xl"
      :class="
        props.isOwn
          ? 'rounded-br-sm bg-chat-bubble-own'
          : 'rounded-bl-sm bg-chat-bubble-other'
      "
    >
      <!-- Image container -->
      <div class="relative cursor-pointer" @click="handleMediaClick">
        <!-- Loading state -->
        <div
          v-if="fileState.loading"
          class="flex h-48 w-64 items-center justify-center bg-neutral-grad-0"
        >
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-color-bg-ac border-t-transparent" />
        </div>

        <!-- Error state -->
        <div
          v-else-if="fileState.error"
          class="flex h-48 w-64 items-center justify-center bg-neutral-grad-0 text-xs text-color-bad"
        >
          Failed to load image
        </div>

        <!-- Loaded image -->
        <img
          v-else-if="fileState.objectUrl"
          :src="fileState.objectUrl"
          :alt="message.fileInfo?.name"
          class="block max-h-[360px] max-w-full object-cover"
          loading="lazy"
        />

        <!-- Timestamp overlay on image -->
        <div class="absolute bottom-1 right-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5">
          <span class="text-[10px] text-white/90">{{ time }}</span>
          <span v-if="props.isOwn" class="text-[10px] text-white/90">{{ statusIcon }}</span>
        </div>
      </div>

      <!-- Lightbox -->
      <Teleport to="body">
        <div
          v-if="lightboxOpen && fileState.objectUrl"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          @click.self="lightboxOpen = false"
        >
          <button
            class="absolute right-4 top-4 text-white hover:text-white/80"
            @click="lightboxOpen = false"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
          <img
            :src="fileState.objectUrl"
            :alt="message.fileInfo?.name"
            class="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      </Teleport>
    </div>

    <!-- Video message -->
    <div
      v-else-if="message.type === MessageType.video && hasFileInfo"
      class="max-w-[70%] overflow-hidden rounded-2xl"
      :class="
        props.isOwn
          ? 'rounded-br-sm bg-chat-bubble-own'
          : 'rounded-bl-sm bg-chat-bubble-other'
      "
    >
      <div class="relative">
        <video
          v-if="fileState.objectUrl"
          :src="fileState.objectUrl"
          controls
          class="block max-h-[360px] max-w-full"
          preload="metadata"
        />
        <div
          v-else-if="fileState.loading"
          class="flex h-48 w-64 items-center justify-center bg-neutral-grad-0"
        >
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-color-bg-ac border-t-transparent" />
        </div>
        <button
          v-else
          class="flex h-48 w-64 items-center justify-center bg-neutral-grad-0 hover:bg-neutral-grad-2 transition-colors"
          @click="handleVideoAudioLoad"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="text-color-bg-ac">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      </div>
      <div class="flex items-center justify-between px-3 py-1.5">
        <span class="truncate text-xs" :class="props.isOwn ? 'text-white/70' : 'text-text-on-main-bg-color'">
          {{ message.fileInfo?.name }}
        </span>
        <div class="flex items-center gap-1" :class="props.isOwn ? 'text-white/60' : 'text-text-on-main-bg-color'">
          <span class="text-[10px]">{{ time }}</span>
          <span v-if="props.isOwn" class="text-[10px]">{{ statusIcon }}</span>
        </div>
      </div>
    </div>

    <!-- Audio message -->
    <div
      v-else-if="message.type === MessageType.audio && hasFileInfo"
      class="max-w-[70%] rounded-2xl px-3 py-2"
      :class="
        props.isOwn
          ? 'rounded-br-sm bg-chat-bubble-own text-text-on-bg-ac-color'
          : 'rounded-bl-sm bg-chat-bubble-other text-text-color'
      "
    >
      <audio
        v-if="fileState.objectUrl"
        :src="fileState.objectUrl"
        controls
        class="h-10 w-full min-w-[200px]"
      />
      <button
        v-else-if="!fileState.loading"
        class="flex items-center gap-2 text-sm hover:underline"
        @click="handleVideoAudioLoad"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {{ message.fileInfo?.name }}
      </button>
      <div v-else class="flex items-center gap-2">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span class="text-xs">Loading...</span>
      </div>
      <div
        class="mt-1 flex items-center justify-end gap-1"
        :class="props.isOwn ? 'text-white/60' : 'text-text-on-main-bg-color'"
      >
        <span class="text-[10px]">{{ time }}</span>
        <span v-if="props.isOwn" class="text-[10px]">{{ statusIcon }}</span>
      </div>
    </div>

    <!-- File message -->
    <div
      v-else-if="isFile && hasFileInfo"
      class="max-w-[70%] rounded-2xl px-3 py-2"
      :class="
        props.isOwn
          ? 'rounded-br-sm bg-chat-bubble-own text-text-on-bg-ac-color'
          : 'rounded-bl-sm bg-chat-bubble-other text-text-color'
      "
    >
      <button
        class="flex w-full items-center gap-3 text-left"
        @click="handleFileDownload"
      >
        <!-- File icon -->
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          :class="props.isOwn ? 'bg-white/20' : 'bg-color-bg-ac/10'"
        >
          <svg
            v-if="fileState.loading"
            class="h-5 w-5 animate-spin"
            :class="props.isOwn ? 'text-white' : 'text-color-bg-ac'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" />
          </svg>
          <svg
            v-else
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            :class="props.isOwn ? 'text-white' : 'text-color-bg-ac'"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>

        <!-- File info -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">
            {{ message.fileInfo?.name }}
          </p>
          <p class="text-xs opacity-60">
            {{ formatSize(message.fileInfo?.size ?? 0) }}
            <template v-if="fileIcon !== 'file'"> &middot; {{ fileIcon.toUpperCase() }}</template>
          </p>
        </div>

        <!-- Download arrow -->
        <svg
          v-if="!fileState.loading"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="shrink-0 opacity-60"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      <!-- Error -->
      <p v-if="fileState.error" class="mt-1 text-xs text-color-bad">
        {{ fileState.error }}
      </p>

      <div
        class="mt-1 flex items-center justify-end gap-1"
        :class="props.isOwn ? 'text-white/60' : 'text-text-on-main-bg-color'"
      >
        <span class="text-[10px]">{{ time }}</span>
        <span v-if="props.isOwn" class="text-[10px]">{{ statusIcon }}</span>
      </div>
    </div>

    <!-- Text message (default) -->
    <div
      v-else
      class="max-w-[70%] rounded-2xl px-3 py-2"
      :class="
        props.isOwn
          ? 'rounded-br-sm bg-chat-bubble-own text-text-on-bg-ac-color'
          : 'rounded-bl-sm bg-chat-bubble-other text-text-color'
      "
    >
      <p class="whitespace-pre-wrap break-words text-sm">
        {{ props.message.content }}
      </p>
      <div
        class="mt-1 flex items-center justify-end gap-1"
        :class="props.isOwn ? 'text-white/60' : 'text-text-on-main-bg-color'"
      >
        <span class="text-[10px]">{{ time }}</span>
        <span v-if="props.isOwn" class="text-[10px]">{{ statusIcon }}</span>
      </div>
    </div>
  </div>
</template>
