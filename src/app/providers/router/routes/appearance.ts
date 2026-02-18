export const routeName = "AppearancePage";

export const route = {
  component: () => import("@/pages/settings/AppearancePage.vue"),
  meta: { requiresAuth: true },
  name: routeName,
  path: "/settings/appearance",
};
