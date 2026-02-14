export const routeName = "ChatPage";

export const route = {
  component: () => import("@/pages/chat"),
  meta: { requiresAuth: true },
  name: routeName,
  path: "/chat"
};
