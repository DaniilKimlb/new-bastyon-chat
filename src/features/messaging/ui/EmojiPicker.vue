<script setup lang="ts">
import { ref, computed } from "vue";
import { BottomSheet } from "@/shared/ui/bottom-sheet";
import { EMOJI_CATEGORIES } from "@/shared/lib/emoji-data";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: []; select: [emoji: string] }>();

const search = ref("");
const activeCategory = ref(0);

const filteredEmojis = computed(() => {
  if (!search.value) return null;
  const q = search.value.toLowerCase();
  const cat = EMOJI_CATEGORIES.find(c => c.name.toLowerCase().includes(q));
  if (cat) return cat.emojis;
  return EMOJI_CATEGORIES.flatMap(c => c.emojis);
});

const handleSelect = (emoji: string) => {
  emit("select", emoji);
};
</script>

<template>
  <BottomSheet :show="props.show" @close="emit('close')">
    <input
      v-model="search"
      type="text"
      placeholder="Search emoji..."
      class="mb-3 w-full rounded-lg bg-chat-input-bg px-3 py-2 text-sm text-text-color outline-none placeholder:text-neutral-grad-2"
    />

    <!-- Category tabs -->
    <div v-if="!search" class="mb-2 flex gap-1 overflow-x-auto border-b border-neutral-grad-0 pb-2">
      <button
        v-for="(cat, i) in EMOJI_CATEGORIES"
        :key="cat.name"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg transition-colors"
        :class="activeCategory === i ? 'bg-color-bg-ac/10' : 'hover:bg-neutral-grad-0'"
        @click="activeCategory = i"
      >
        {{ cat.icon }}
      </button>
    </div>

    <!-- Emoji grid -->
    <div class="max-h-[45vh] overflow-y-auto">
      <!-- Search results -->
      <template v-if="filteredEmojis">
        <div class="grid grid-cols-8 gap-0.5">
          <button
            v-for="emoji in filteredEmojis"
            :key="emoji"
            class="flex h-10 w-full items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-neutral-grad-0"
            @click="handleSelect(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </template>

      <!-- Category view -->
      <template v-else>
        <div
          v-for="(cat, i) in EMOJI_CATEGORIES"
          v-show="activeCategory === i"
          :key="cat.name"
        >
          <div class="mb-1 text-xs font-medium text-text-on-main-bg-color">{{ cat.name }}</div>
          <div class="grid grid-cols-8 gap-0.5">
            <button
              v-for="emoji in cat.emojis"
              :key="emoji"
              class="flex h-10 w-full items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-neutral-grad-0"
              @click="handleSelect(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </BottomSheet>
</template>
