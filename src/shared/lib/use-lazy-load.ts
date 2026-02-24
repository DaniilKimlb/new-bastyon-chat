import { ref, onMounted, onUnmounted, type Ref } from "vue";

export function useLazyLoad(targetRef: Ref<HTMLElement | undefined>, rootMargin = "200px") {
  const isVisible = ref(false);
  let observer: IntersectionObserver | undefined;

  onMounted(() => {
    if (!targetRef.value) return;
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
          observer?.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(targetRef.value);
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { isVisible };
}
