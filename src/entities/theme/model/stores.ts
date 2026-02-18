import { isSystemDarkMode, setThemeHtml } from "@/entities/theme/lib";
import { Theme } from "@/entities/theme/model/types";
import { useLocalStorage } from "@/shared/lib/browser";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

const NAMESPACE = "theme";

const ACCENT_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Green", value: "#10B981" },
  { name: "Orange", value: "#F59E0B" },
  { name: "Pink", value: "#EC4899" },
  { name: "Red", value: "#EF4444" },
  { name: "Teal", value: "#14B8A6" },
] as const;

export { ACCENT_COLORS };

export const useThemeStore = defineStore(NAMESPACE, () => {
  const { setLSValue: setLSTheme, value: lsTheme } =
    useLocalStorage<Theme>(NAMESPACE);

  const { setLSValue: setLSAccent, value: lsAccent } =
    useLocalStorage<string>("accent_color");

  const theme = ref(lsTheme);
  const accentColor = ref(lsAccent || ACCENT_COLORS[0].value);

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

  const setAccentColor = (color: string) => {
    accentColor.value = color;
    setLSAccent(color);
    applyAccentColor(color);
  };

  const applyAccentColor = (color: string) => {
    document.documentElement.style.setProperty("--color-bg-ac", color);
    // Parse hex to RGB for alpha variants
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty("--color-bg-ac-rgb", `${r} ${g} ${b}`);
  };

  const initTheme = () => {
    setTheme(isDarkMode.value ? Theme.dark : Theme.light);
    if (accentColor.value) applyAccentColor(accentColor.value);
  };

  return { accentColor, initTheme, isDarkMode, setAccentColor, setTheme, theme, toggleTheme };
});
