import { setupProviders } from "@/app/providers";
import { AppLoading } from "@/app/ui/app-loading";
import { createApp } from "vue";

import App from "./App.vue";

async function setupApp() {
  createApp(AppLoading).mount("#appLoading");
  const app = createApp(App);
  await setupProviders(app);
  return app;
}

export const app = setupApp();
