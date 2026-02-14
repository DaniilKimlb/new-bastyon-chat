export const isSystemDarkMode = () => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};
