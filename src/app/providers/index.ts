import type { App } from "vue";

import { createPinia } from "pinia";

import { setupAssets } from "./assets";
import { setupChatScripts } from "./chat-scripts";
import { setupRouter } from "./router";
import { setupInitialTheme } from "./theme";

export const setupProviders = async (app: App) => {
  setupAssets();
  await setupChatScripts();
  app.use(createPinia());
  setupInitialTheme();
  await setupRouter(app);
};

export * from "./app-routes";
export * from "./chat-scripts";
export * from "./initializers";
export * from "./router";
export * from "./types";
