<script setup lang="ts">
import { parseMessage } from "@/shared/lib/message-format";
import type { Segment } from "@/shared/lib/message-format";

interface Props {
  text: string;
}

const props = defineProps<Props>();

const segments = computed<Segment[]>(() => parseMessage(props.text));
</script>

<template>
  <span class="whitespace-pre-wrap break-words">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.type === 'text'">{{ seg.content }}</span>
      <a
        v-else-if="seg.type === 'link'"
        :href="seg.href"
        target="_blank"
        rel="noopener noreferrer"
        class="text-color-txt-ac underline hover:no-underline"
        @click.stop
      >{{ seg.content }}</a>
      <span
        v-else-if="seg.type === 'mention'"
        class="cursor-pointer font-medium text-color-txt-ac"
      >{{ seg.content }}</span>
    </template>
  </span>
</template>
