<script setup lang="ts">
import { useThemeStore } from "@/entities/theme";

interface ReactionData {
  count: number;
  users: string[];
  myEventId?: string;
}

interface Props {
  reactions: Record<string, ReactionData>;
  isOwn: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  toggle: [emoji: string];
  addReaction: [];
}>();

const themeStore = useThemeStore();

const hasMyReaction = computed(() => {
  return Object.values(props.reactions).some(r => !!r.myEventId);
});

const MAX_VISIBLE = 5;

const visibleReactions = computed(() => {
  const entries = Object.entries(props.reactions);
  return entries.slice(0, MAX_VISIBLE);
});

const overflowCount = computed(() => {
  const total = Object.keys(props.reactions).length;
  return total > MAX_VISIBLE ? total - MAX_VISIBLE : 0;
});

const chipClass = (isMine: boolean) => {
  if (props.isOwn) {
    return isMine
      ? "bg-white/25 text-white border border-white/30"
      : "bg-white/10 text-white/80 border border-transparent hover:bg-white/20";
  }
  return isMine
    ? "bg-color-bg-ac/20 text-color-bg-ac border border-color-bg-ac/30"
    : "bg-neutral-grad-0 text-text-on-main-bg-color border border-transparent hover:bg-neutral-grad-2";
};
</script>

<template>
  <div v-if="Object.keys(reactions).length" class="mt-1 flex flex-wrap gap-1">
    <button
      v-for="[emoji, data] in visibleReactions"
      :key="emoji"
      type="button"
      class="reaction-chip inline-flex cursor-pointer items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-colors"
      :class="[chipClass(!!data.myEventId), themeStore.animationsEnabled ? 'animate-reaction' : '']"
      @click.stop="emit('toggle', emoji)"
    >
      <span>{{ emoji }}</span>
      <span v-if="data.count > 0" class="tabular-nums">{{ data.count }}</span>
    </button>

    <!-- Overflow indicator -->
    <span
      v-if="overflowCount > 0"
      class="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs"
      :class="isOwn ? 'text-white/60' : 'text-text-on-main-bg-color'"
    >
      +{{ overflowCount }}
    </span>

    <!-- Add reaction button (hidden when user already has a reaction) -->
    <button
      v-if="!hasMyReaction"
      type="button"
      class="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-xs transition-colors"
      :class="isOwn ? 'text-white/50 hover:bg-white/10 hover:text-white/80' : 'text-text-on-main-bg-color hover:bg-neutral-grad-0'"
      @click.stop="emit('addReaction')"
    >
      +
    </button>
  </div>
</template>

<style>
@keyframes reaction-pop {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: no-preference) {
  .animate-reaction {
    animation: reaction-pop 0.25s ease;
  }
}
</style>
