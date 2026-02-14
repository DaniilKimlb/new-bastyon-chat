import type { InjectionKey } from "vue";

import type { AppRoutes } from "./app-routes";
import type { AppPages } from "./router";

export const EAppProviders = {
  AppPages: Symbol() as InjectionKey<typeof AppPages>,
  AppRoutes: Symbol() as InjectionKey<typeof AppRoutes>
};
