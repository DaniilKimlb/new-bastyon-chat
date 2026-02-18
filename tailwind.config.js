/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,jsx,md,svelte,ts,tsx,vue}", "./index.html"],
  plugins: [],
  theme: {
    extend: {
      colors: {
        "background-hidden-layer": "rgb(var(--background-hidden-layer))",
        "background-main": "rgb(var(--background-main))",
        "background-main-contrast": "rgb(var(--background-main-contrast))",
        "background-overlay": "rgba(0, 0, 0, 0.5)",
        "background-secondary-theme": "rgb(var(--background-secondary-theme))",
        "background-total-theme": "rgb(var(--background-total-theme))",
        "color-bad": "rgb(var(--color-bad))",
        "color-bg-ac": "rgb(var(--color-bg-ac))",
        "color-bg-ac-1": "rgb(var(--color-bg-ac-1))",
        "color-bg-ac-2": "rgb(var(--color-bg-ac-2))",
        "color-bg-ac-bright": "rgba(var(--color-bg-ac-bright), var(--tw-bg-opacity))",
        "color-bg-orange": "rgba(var(--color-bg-orange), var(--tw-bg-opacity))",
        "color-bg-selection": "rgb(var(--color-bg-selection))",
        "color-good": "rgb(var(--color-good))",
        "color-nrml": "rgb(var(--color-nrml))",
        "color-shadow-base": "rgb(var(--color-shadow-base))",
        "color-shadow-var": "rgb(var(--color-shadow-var))",
        "color-star-yellow": "rgb(var(--color-star-yellow))",
        "color-txt-ac": "rgb(var(--color-txt-ac))",
        "color-txt-ac-1": "rgb(var(--color-txt-ac-1))",
        "color-txt-ac-2": "rgb(var(--color-txt-ac-2))",
        "color-txt-gray": "rgb(var(--color-txt-gray))",
        "color-txt-gray-dark": "rgb(var(--color-txt-gray-dark))",
        "color-txt-orange": "rgb(var(--color-txt-orange))",
        "color-yellow": "rgb(var(--color-yellow))",
        "neutral-grad-0": "rgb(var(--neutral-grad-0))",
        "neutral-grad-2": "rgb(var(--neutral-grad-2))",
        "neutral-grad-3": "rgb(var(--neutral-grad-3))",
        "text-color": "rgb(var(--text-color))",
        "text-on-bg-ac-color": "rgb(var(--text-on-bg-ac-color))",
        "text-on-bg-shadow-color": "rgb(var(--text-on-bg-shadow-color))",
        "text-on-main-bg-color": "rgb(var(--text-on-main-bg-color))",
        "voice-message-fillStyle": "rgb(var(--voice-message-fillStyle))",
        // Chat-specific colors
        "chat-bubble-own": "rgb(var(--chat-bubble-own))",
        "chat-bubble-other": "rgb(var(--chat-bubble-other))",
        "chat-sidebar": "rgb(var(--chat-sidebar))",
        "chat-input-bg": "rgb(var(--chat-input-bg))"
      },
      fontSize: {
        "chat-base": "var(--font-size-base)",
      },
      borderRadius: {
        "bubble": "var(--bubble-radius)",
        "bubble-sm": "var(--bubble-radius-small)",
      },
      gap: {
        "msg": "var(--message-spacing)",
      },
      spacing: {
        "app-margin-bottom": "var(--app-margin-bottom)",
        "app-margin-bottom-default": "var(--app-margin-bottom-default)",
        "app-margin-top": "var(--app-margin-top)",
        "app-margin-top-default": "var(--app-margin-top-default)",
        keyboardheight: "var(--keyboardheight)",
        "safe-area-inset-bottom": "var(--safe-area-inset-bottom)",
        "safe-area-inset-left": "var(--safe-area-inset-left)",
        "safe-area-inset-right": "var(--safe-area-inset-right)",
        "safe-area-inset-top": "var(--safe-area-inset-top)"
      }
    }
  }
};
