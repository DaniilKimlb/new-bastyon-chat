<script setup lang="ts">
import { Drawer } from "@/shared/ui/drawer";
import { DRAWER_CHAT_MENU_ID } from "./index";
</script>

<template>
  <Drawer :id="DRAWER_CHAT_MENU_ID">
    <template #content>
      <div class="p-4">
        <h2 class="mb-4 text-lg font-bold text-text-color">Chat Menu</h2>
        <slot />
      </div>
    </template>
  </Drawer>
</template>
