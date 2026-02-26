<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useChatStore } from "@/entities/chat";

const emit = defineEmits<{
  close: [];
  scrollTo: [messageId: string];
  "update:query": [query: string];
}>();

const chatStore = useChatStore();

const query = ref("");
const currentIndex = ref(0);
const allLoaded = ref(false);
const loadingAll = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedQuery = ref("");

watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    debouncedQuery.value = val;
    currentIndex.value = 0;
    emit("update:query", val);

    // Load full history on first search so we can find all matches
    const roomId = chatStore.activeRoomId;
    if (val.trim() && roomId && !allLoaded.value) {
      loadingAll.value = true;
      await chatStore.loadAllMessages(roomId);
      allLoaded.value = true;
      loadingAll.value = false;
    }
  }, 300);
});

const matches = computed(() => {
  const q = debouncedQuery.value.toLowerCase().trim();
  if (!q) return [];
  return chatStore.activeMessages
    .filter(m => m.content.toLowerCase().includes(q))
    .map(m => m.id);
});

const totalMatches = computed(() => matches.value.length);

const goTo = (index: number) => {
  if (matches.value.length === 0) return;
  currentIndex.value = ((index % matches.value.length) + matches.value.length) % matches.value.length;
  emit("scrollTo", matches.value[currentIndex.value]);
};

const goNext = () => goTo(currentIndex.value + 1);
const goPrev = () => goTo(currentIndex.value - 1);

watch(matches, (val) => {
  if (val.length > 0) {
    goTo(val.length - 1);
  }
});

const inputRef = ref<HTMLInputElement>();

onMounted(() => {
  inputRef.value?.focus();
});
</script>

<template>
  <div class="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-grad-0 bg-background-total-theme px-3">
    <button
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0"
      @click="emit('close')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
      </svg>
    </button>

    <input
      ref="inputRef"
      v-model="query"
      type="text"
      placeholder="Search in chat..."
      class="flex-1 bg-transparent text-sm text-text-color outline-none placeholder:text-neutral-grad-2"
      @keydown.enter="goNext"
      @keydown.escape="emit('close')"
    />

    <span v-if="debouncedQuery" class="shrink-0 text-xs text-text-on-main-bg-color">
      <template v-if="loadingAll">Loading...</template>
      <template v-else>{{ totalMatches > 0 ? `${currentIndex + 1} of ${totalMatches}` : "No results" }}</template>
    </span>

    <button
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0 disabled:opacity-30"
      :disabled="totalMatches === 0"
      @click="goPrev"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>

    <button
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-on-main-bg-color transition-colors hover:bg-neutral-grad-0 disabled:opacity-30"
      :disabled="totalMatches === 0"
      @click="goNext"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  </div>
</template>
