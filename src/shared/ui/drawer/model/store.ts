import { defineStore } from "pinia";
import { ref } from "vue";

const NAMESPACE = "drawer";

export const useDrawerStore = defineStore(NAMESPACE, () => {
  const currentDrawerId = ref<string>();

  const setDrawerId = (drawerId: string | undefined) => {
    currentDrawerId.value = drawerId;
  };

  return { currentDrawerId, setDrawerId };
});
