export const routeName = "ProfileEditPage";

export const route = {
  component: () => import("@/pages/profile-edit"),
  meta: { requiresAuth: true },
  name: routeName,
  path: "/profile/edit"
};
