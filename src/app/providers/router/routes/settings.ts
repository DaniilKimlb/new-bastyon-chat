export const routeName = "SettingsPage";

export const route = {
  component: () => import("@/pages/settings"),
  meta: { requiresAuth: true },
  name: routeName,
  path: "/settings"
};
