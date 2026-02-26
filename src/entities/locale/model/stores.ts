import type { Locale } from "@/entities/locale/model/types";
import { useLocalStorage } from "@/shared/lib/browser";
import { defineStore } from "pinia";
import { ref } from "vue";

const NAMESPACE = "locale";

function detectBrowserLocale(): Locale {
  const lang = navigator.language?.slice(0, 2);
  return lang === "ru" ? "ru" : "en";
}

export const useLocaleStore = defineStore(NAMESPACE, () => {
  const { setLSValue: setLSLocale, value: lsLocale } =
    useLocalStorage<Locale>(NAMESPACE);

  const locale = ref<Locale>(lsLocale ?? detectBrowserLocale());

  const setLocale = (_locale: Locale) => {
    locale.value = _locale;
    setLSLocale(_locale);
    document.documentElement.lang = _locale;
  };

  // Set initial lang attribute
  document.documentElement.lang = locale.value;

  return { locale, setLocale };
});
