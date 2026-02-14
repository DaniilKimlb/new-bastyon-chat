import { useThemeStore } from "@/entities/theme";

export const setupInitialTheme = () => {
  const themeStore = useThemeStore();
  themeStore.initTheme();
};
