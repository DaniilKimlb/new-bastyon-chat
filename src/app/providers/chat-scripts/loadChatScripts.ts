import { IS_DEV } from "@/shared/config";
import { loadScript } from "@/shared/lib/loadScript";

const scriptsToLoad = {
  async: [
    "https://cdn.jsdelivr.net/npm/moment-mini@2.29.4/moment.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.7/underscore-min.js",
    "https://cdn.jsdelivr.net/npm/linkifyjs@3.0.5/dist/linkify.min.js",
    "/js/widgets",
    "/js/buildChat",
    "/js/media",
    "/js/lib/bastyonCalls/bastyonCalls.min.js",
    "/js/vendor/unmute",
    "/js/vendor/joypixels",
    "/js/vendor/hammer.min.js",
    "/js/vendor/xss.min.js"
  ],
  await: [
    "/js/satolist",
    "/js/functionsfirst",
    "/js/functions",
    "/js/lib/pocketnet/btc17",
    "/js/lib/pocketnet/buffer",
    "/js/lib/client/system16",
    "/js/lib/client/sdk",
    "/js/lib/client/actions",
    "/js/kit",
    "/js/lib/client/api",
    "/js/lib/client/resoursesdbls",
    "/js/lib/client/resoursesdb"
  ]
};

export const loadChatScripts = async (): Promise<void> => {
  try {
    const normalizeScriptName = (scriptName: string): string => {
      if (scriptName.endsWith(".js")) {
        return scriptName;
      }
      const suffix = IS_DEV ? "" : ".min";
      return `${scriptName}${suffix}.js`;
    };

    for (const script of scriptsToLoad.async) {
      loadScript(normalizeScriptName(script));
    }

    for (const script of scriptsToLoad.await) {
      await loadScript(normalizeScriptName(script));
    }
  } catch (error) {
    console.error("Failed to load chat scripts", error);
  }
};
