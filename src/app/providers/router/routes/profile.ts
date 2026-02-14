export const routeName = "ProfilePage";

export const route = {
  component: () => import("@/pages/profile"),
  meta: { requiresAuth: true },
  name: routeName,
  path: "/profile"
};
