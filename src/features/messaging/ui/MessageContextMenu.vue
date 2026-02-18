<script setup lang="ts">
import { computed } from "vue";
import type { Message } from "@/entities/chat";
import { ContextMenu } from "@/shared/ui/context-menu";
import type { ContextMenuItem } from "@/shared/ui/context-menu";
import ReactionPicker from "./ReactionPicker.vue";

interface Props {
  show: boolean;
  x: number;
  y: number;
  message: Message | null;
  isOwn: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  action: [action: string, message: Message];
  react: [emoji: string, message: Message];
  openEmojiPicker: [message: Message];
}>();

const menuItems = computed<ContextMenuItem[]>(() => {
  const items: ContextMenuItem[] = [
    { label: "Reply", icon: "\u21A9", action: "reply" },
    { label: "Copy", icon: "\uD83D\uDCCB", action: "copy" },
    { label: "Forward", icon: "\u21AA", action: "forward" },
  ];
  if (props.isOwn) {
    items.push({ label: "Edit", icon: "\u270F\uFE0F", action: "edit" });
  }
  items.push({ label: "Select", icon: "\u2611", action: "select" });
  items.push({ label: "Pin", icon: "\uD83D\uDCCC", action: "pin" });
  if (props.isOwn) {
    items.push({ label: "Delete", icon: "\uD83D\uDDD1", action: "delete", danger: true });
  }
  return items;
});

const handleReaction = (emoji: string) => {
  if (props.message) {
    emit("react", emoji, props.message);
  }
  emit("close");
};

const handleAction = (action: string) => {
  if (props.message) {
    emit("action", action, props.message);
  }
};

const handleOpenEmojiPicker = () => {
  if (props.message) {
    emit("openEmojiPicker", props.message);
  }
  emit("close");
};
</script>

<template>
  <ContextMenu
    :show="props.show"
    :x="props.x"
    :y="props.y"
    :items="menuItems"
    @close="emit('close')"
    @select="handleAction"
  >
    <template #header>
      <div class="flex items-center gap-1 border-b border-neutral-grad-0 px-2 py-2">
        <ReactionPicker @select="handleReaction" />
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors hover:bg-neutral-grad-0"
          title="More reactions"
          @click="handleOpenEmojiPicker"
        >
          +
        </button>
      </div>
    </template>
  </ContextMenu>
</template>
