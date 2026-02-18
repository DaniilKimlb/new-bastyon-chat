import { ref } from "vue";

export interface UseLongPressOptions {
  delay?: number;
  moveThreshold?: number;
  onTrigger: (e: PointerEvent) => void;
}

export function useLongPress(options: UseLongPressOptions) {
  const { delay = 500, moveThreshold = 10, onTrigger } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;
  const pressed = ref(false);

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pressed.value = false;
  };

  const onPointerdown = (e: PointerEvent) => {
    startX = e.clientX;
    startY = e.clientY;
    pressed.value = true;
    timer = setTimeout(() => {
      onTrigger(e);
      pressed.value = false;
    }, delay);
  };

  const onPointermove = (e: PointerEvent) => {
    if (!timer) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) > moveThreshold) {
      clear();
    }
  };

  const onPointerup = () => clear();
  const onPointerleave = () => clear();
  const onContextmenu = (e: Event) => e.preventDefault();

  return { pressed, onPointerdown, onPointermove, onPointerup, onPointerleave, onContextmenu };
}
