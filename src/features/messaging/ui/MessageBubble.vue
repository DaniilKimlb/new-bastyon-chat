<script setup lang="ts">
import type { Message } from "@/entities/chat";
import { MessageStatus } from "@/entities/chat";
import { formatTime } from "@/shared/lib/format";

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

const props = defineProps<Props>();

const time = computed(() => formatTime(new Date(props.message.timestamp)));

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

    <div
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
