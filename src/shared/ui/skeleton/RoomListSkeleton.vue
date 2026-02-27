<template>
  <div class="space-y-1">
    <div v-for="i in 6" :key="i" class="flex items-center gap-3 px-3 py-2.5">
      <div class="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-grad-2/40" />
      <div class="min-w-0 flex-1 space-y-1.5">
        <div class="h-3.5 w-24 animate-pulse rounded bg-neutral-grad-2/40" />
        <div
          class="h-3 animate-pulse rounded bg-neutral-grad-2/40"
          :style="{ width: `${100 + (i * 29) % 80}px` }"
        />
      </div>
      <div class="h-3 w-8 animate-pulse rounded bg-neutral-grad-2/40" />
    </div>
  </div>
</template>
