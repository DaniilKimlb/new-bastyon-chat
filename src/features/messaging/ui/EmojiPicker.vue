<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useThemeStore } from "@/entities/theme";
import { EMOJI_CATEGORIES } from "@/shared/lib/emoji-data";

const PANEL_W = 320;
const PANEL_H = 360;
const PAD = 8;

interface Props {
  show: boolean;
  x?: number;
  y?: number;
  mode?: "reaction" | "input";
}

const props = withDefaults(defineProps<Props>(), {
  x: 0,
  y: 0,
  mode: "reaction",
});
const emit = defineEmits<{ close: []; select: [emoji: string] }>();

const themeStore = useThemeStore();

const search = ref("");
const activeCategory = ref(0);

// Reset state when picker opens
watch(() => props.show, (v) => {
  if (v) {
    search.value = "";
    activeCategory.value = themeStore.recentEmojis.length > 0 ? -1 : 0;
  }
});

// Fixed-size panel, pure computed position — no DOM measurement needed
const panelStyle = computed(() => {
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;

  // Horizontal: clamp within viewport
  let left = Math.max(PAD, Math.min(props.x, vw - PANEL_W - PAD));

  // Vertical: prefer above anchor (like Telegram), fall back to below
  const spaceAbove = props.y - PAD;
  const spaceBelow = vh - props.y - PAD;

  let top: number;
  if (spaceAbove >= PANEL_H) {
    // Fits above — place panel bottom edge at anchor y
    top = props.y - PANEL_H;
  } else if (spaceBelow >= PANEL_H) {
    // Fits below — place panel top edge at anchor y
    top = props.y;
  } else {
    // Doesn't fit either way — use whichever side has more space, clamp
    if (spaceAbove >= spaceBelow) {
      top = PAD;
    } else {
      top = vh - PANEL_H - PAD;
    }
  }

  // Final safety clamp
  top = Math.max(PAD, Math.min(top, vh - PANEL_H - PAD));

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${PANEL_W}px`,
    height: `${PANEL_H}px`,
  };
});

const filteredEmojis = computed(() => {
  if (!search.value) return null;
  const q = search.value.toLowerCase();
  const results: string[] = [];
  for (const cat of EMOJI_CATEGORIES) {
    if (cat.name.toLowerCase().includes(q)) {
      results.push(...cat.emojis);
    }
  }
  return results.length > 0 ? results : EMOJI_CATEGORIES.flatMap(c => c.emojis);
});

const handleSelect = (emoji: string) => {
  emit("select", emoji);
  if (props.mode === "reaction") {
    emit("close");
  }
};

const categoryTabs = computed(() => {
  const tabs: { name: string; icon: string; index: number }[] = [];
  if (themeStore.recentEmojis.length > 0) {
    tabs.push({ name: "Recent", icon: "🕐", index: -1 });
  }
  EMOJI_CATEGORIES.forEach((cat, i) => {
    tabs.push({ name: cat.name, icon: cat.icon, index: i });
  });
  return tabs;
});
</script>

<template>
  <Teleport to="body">
    <transition name="emoji-popup">
      <div v-if="props.show" class="fixed inset-0 z-50" @click.self="emit('close')">
        <div
          class="absolute flex flex-col overflow-hidden rounded-xl border border-neutral-grad-0 bg-background-total-theme shadow-xl"
          :style="panelStyle"
        >
          <!-- Search -->
          <div class="shrink-0 p-2 pb-0">
            <input
              v-model="search"
              type="text"
              placeholder="Search emoji..."
              class="w-full rounded-lg bg-chat-input-bg px-3 py-1.5 text-sm text-text-color outline-none placeholder:text-neutral-grad-2"
            />
          </div>

          <!-- Category tabs -->
          <div v-if="!search" class="flex shrink-0 gap-0.5 overflow-x-auto border-b border-neutral-grad-0 px-2 py-1.5">
            <button
              v-for="tab in categoryTabs"
              :key="tab.index"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base transition-colors"
              :class="activeCategory === tab.index ? 'bg-color-bg-ac/10' : 'hover:bg-neutral-grad-0'"
              :title="tab.name"
              @click="activeCategory = tab.index"
            >
              {{ tab.icon }}
            </button>
          </div>

          <!-- Emoji grid (fills remaining space, always scrollable) -->
          <div class="min-h-0 flex-1 overflow-y-auto p-2">
            <!-- Search results -->
            <template v-if="filteredEmojis">
              <div class="grid grid-cols-8 gap-0.5">
                <button
                  v-for="emoji in filteredEmojis"
                  :key="emoji"
                  class="flex h-9 w-full items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-neutral-grad-0"
                  @click="handleSelect(emoji)"
                >
                  {{ emoji }}
                </button>
              </div>
            </template>

            <!-- Category / recent view -->
            <template v-else>
              <!-- Recent -->
              <div v-show="activeCategory === -1 && themeStore.recentEmojis.length > 0">
                <div class="mb-1 text-xs font-medium text-text-on-main-bg-color">Recent</div>
                <div class="grid grid-cols-8 gap-0.5">
                  <button
                    v-for="emoji in themeStore.recentEmojis"
                    :key="'recent-' + emoji"
                    class="flex h-9 w-full items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-neutral-grad-0"
                    @click="handleSelect(emoji)"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>

              <!-- Standard categories -->
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
                    class="flex h-9 w-full items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-neutral-grad-0"
                    @click="handleSelect(emoji)"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.emoji-popup-enter-active {
  transition: opacity 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.emoji-popup-leave-active {
  transition: opacity 0.12s ease-in, transform 0.12s ease-in;
}
.emoji-popup-enter-from {
  opacity: 0;
  transform: scale(0.85);
}
.emoji-popup-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

/* Smooth emoji button hover */
.emoji-btn {
  transition: transform 0.1s ease;
}
</style>
