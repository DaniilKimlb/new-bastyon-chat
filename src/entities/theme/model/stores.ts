import { isSystemDarkMode, setThemeHtml } from "@/entities/theme/lib";
import { Theme } from "@/entities/theme/model/types";
import { useLocalStorage } from "@/shared/lib/browser";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

const NAMESPACE = "theme";

export const useThemeStore = defineStore(NAMESPACE, () => {
  const { setLSValue: setLSTheme, value: lsTheme } =
    useLocalStorage<Theme>(NAMESPACE);

  const theme = ref(lsTheme);

  const isDarkMode = computed(
    () => theme.value === Theme.dark || (!theme.value && isSystemDarkMode())
  );

  const setTheme = (_theme: Theme) => {
    theme.value = _theme;
    setThemeHtml(_theme);
    setLSTheme(_theme);
  };

  const toggleTheme = () => {
    setTheme(isDarkMode.value ? Theme.light : Theme.dark);
  };

  const initTheme = () => {
    setTheme(isDarkMode.value ? Theme.dark : Theme.light);
  };

  return { initTheme, isDarkMode, setTheme, theme, toggleTheme };
});
