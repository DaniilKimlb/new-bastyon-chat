import type { Theme } from "@/entities/theme/model";

export function setThemeHtml(theme: Theme) {
  document.documentElement.setAttribute("theme", theme);
}
