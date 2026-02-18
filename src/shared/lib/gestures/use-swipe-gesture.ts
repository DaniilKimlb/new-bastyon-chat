import { ref } from "vue";

export interface UseSwipeGestureOptions {
  direction?: "left" | "right";
  threshold?: number;
  maxOffset?: number;
  onTrigger: () => void;
}

export function useSwipeGesture(options: UseSwipeGestureOptions) {
  const { direction = "right", threshold = 60, maxOffset = 100, onTrigger } = options;

  const offsetX = ref(0);
  const isSwiping = ref(false);
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let decided = false;

  const onTouchstart = (e: TouchEvent) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
    decided = false;
    isSwiping.value = false;
  };

  const onTouchmove = (e: TouchEvent) => {
    if (!tracking) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!decided) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        decided = true;
        if (Math.abs(dy) > Math.abs(dx)) {
          tracking = false;
          return;
        }
      } else {
        return;
      }
    }

    const directedDx = direction === "right" ? dx : -dx;
    if (directedDx < 0) {
      offsetX.value = 0;
      return;
    }

    isSwiping.value = true;
    offsetX.value = Math.min(directedDx, maxOffset);
    e.preventDefault();
  };

  const onTouchend = () => {
    if (isSwiping.value && offsetX.value >= threshold) {
      onTrigger();
    }
    offsetX.value = 0;
    isSwiping.value = false;
    tracking = false;
    decided = false;
  };

  return { offsetX, isSwiping, onTouchstart, onTouchmove, onTouchend };
}
