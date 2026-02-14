export const routeName = "WelcomePage";

export const route = {
  component: () => import("@/pages/welcome"),
  meta: { requiresGuest: true },
  name: routeName,
  path: "/welcome"
};
