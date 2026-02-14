export const routeName = "LoginPage";

export const route = {
  component: () => import("@/pages/login"),
  meta: { requiresGuest: true },
  name: routeName,
  path: "/login"
};
