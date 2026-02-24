<script setup lang="ts">
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-bg-ac disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-color-bg-ac text-text-on-bg-ac-color hover:bg-color-bg-ac-1",
        secondary:
          "bg-neutral-grad-0 text-text-color hover:bg-neutral-grad-2/20",
        outline:
          "border border-neutral-grad-2 bg-transparent text-text-color hover:bg-neutral-grad-0",
        ghost: "text-text-color hover:bg-neutral-grad-0",
        danger: "bg-color-bad text-white hover:bg-color-bad/80"
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface Props {
  variant?: NonNullable<ButtonVariants["variant"]>;
  size?: NonNullable<ButtonVariants["size"]>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  size: "md",
  disabled: false,
  type: "button"
});
</script>

<template>
  <button
    :class="buttonVariants({ variant: props.variant, size: props.size })"
    :disabled="props.disabled"
    :type="props.type"
  >
    <slot />
  </button>
</template>
