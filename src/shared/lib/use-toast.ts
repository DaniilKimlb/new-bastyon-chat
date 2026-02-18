import { ref } from "vue";

const message = ref("");
const type = ref<"info" | "success" | "error">("info");
const show = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function useToast() {
  const toast = (msg: string, t: "info" | "success" | "error" = "info", duration = 3000) => {
    if (hideTimer) clearTimeout(hideTimer);
    message.value = msg;
    type.value = t;
    show.value = true;
    hideTimer = setTimeout(() => {
      show.value = false;
    }, duration);
  };

  const close = () => {
    show.value = false;
  };

  return { message, type, show, toast, close };
}
