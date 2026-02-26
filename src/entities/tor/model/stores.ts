import type { TorMode, TorStatus } from "./types";
import { useLocalStorage } from "@/shared/lib/browser";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

const NAMESPACE = "tor";

export const useTorStore = defineStore(NAMESPACE, () => {
  const { setLSValue: setLSMode, value: lsMode } =
    useLocalStorage<TorMode>("tor_mode", "auto");

  const mode = ref<TorMode>(lsMode || "auto");
  const status = ref<TorStatus>("stopped");
  const info = ref("");

  // --- Computed ---
  const isConnected = computed(() => status.value === "started");
  const isConnecting = computed(
    () => status.value === "running" || status.value === "install"
  );
  const isEnabled = computed(() => mode.value !== "neveruse");
  const statusLabel = computed(() => {
    switch (status.value) {
      case "started":
        return "Connected";
      case "running":
      case "install":
        return "Connecting...";
      case "failed":
        return "Error";
      default:
        return "Off";
    }
  });

  // --- Actions ---
  const setMode = (newMode: TorMode) => {
    mode.value = newMode;
    setLSMode(newMode);
    (window as any).electronAPI?.torSetMode(newMode);
  };

  const toggle = () => {
    setMode(mode.value === "neveruse" ? "auto" : "neveruse");
  };

  const init = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    // Subscribe to live status updates from the main process
    api.onTorStatus((data: { status: TorStatus; info: string }) => {
      status.value = data.status;
      info.value = data.info || "";
    });

    // Send stored mode preference to main so TorControl starts with user choice
    await api.torSetMode(mode.value);

    // Query current status (covers events we missed before subscribing)
    const current = await api.torGetStatus();
    if (current) {
      status.value = current.status;
      info.value = current.info || "";
    }
  };

  return {
    mode,
    status,
    info,
    isConnected,
    isConnecting,
    isEnabled,
    statusLabel,
    setMode,
    toggle,
    init,
  };
});
