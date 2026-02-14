import type { RouteRecordRaw } from "vue-router";

import { route as chatRoute } from "./chat";
import { route as loginRoute } from "./login";
import { route as profileRoute } from "./profile";
import { route as profileEditRoute } from "./profile-edit";
import { route as settingsRoute } from "./settings";
import { route as welcomeRoute } from "./welcome";

export const routes: RouteRecordRaw[] = [
  loginRoute,
  chatRoute,
  welcomeRoute,
  profileRoute,
  profileEditRoute,
  settingsRoute,
  {
    path: "/:pathMatch(.*)*",
    redirect: "/welcome"
  }
];
