import { PocketnetInstance } from "./pocketnetinstance";

export const initializeChatConfig = () => {
  window.testpocketnet = false;
  window.POCKETNETINSTANCE = PocketnetInstance;
};

export * from "./configurator";
