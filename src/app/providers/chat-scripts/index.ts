import { initializeChatConfig } from "./config";
import { loadChatScripts } from "./loadChatScripts";

export const setupChatScripts = async () => {
  initializeChatConfig();
  await loadChatScripts();
};

export * from "./config";
