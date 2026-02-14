import type { Router } from "vue-router";

import { createRouteAuthGuardHandler } from "./auth-guard";

export const createRouterHandlers = (router: Router) => {
  createRouteAuthGuardHandler(router);
};
