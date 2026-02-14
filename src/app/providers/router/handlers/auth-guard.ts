import type { Router } from "vue-router";

import { useAuthStore } from "@/entities/auth";

import { pages } from "../pages";

export const createRouteAuthGuardHandler = (router: Router) => {
  router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore();
    if (to.matched.some(record => record.meta.requiresAuth)) {
      if (!authStore.isAuthenticated) {
        next({
          name: pages.welcome,
          query: { redirect: to.fullPath }
        });
      } else {
        next();
      }
    } else if (to.matched.some(record => record.meta.requiresGuest)) {
      if (authStore.isAuthenticated) {
        next({
          name: pages.chat
        });
      } else {
        next();
      }
    } else {
      next();
    }
  });
};
