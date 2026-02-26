import { computed } from "vue";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import { useLocaleStore } from "@/entities/locale";
import type { TranslationKey } from "./locales/en";

const messages = { en, ru } as const;

export function useI18n() {
  const localeStore = useLocaleStore();

  const locale = computed(() => localeStore.locale);

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    const dict = messages[locale.value] ?? messages.en;
    let text = dict[key] ?? messages.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return text;
  }

  return { t, locale };
}

export type { TranslationKey };
