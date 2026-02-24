import { ref, onMounted, onUnmounted } from "vue";

const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
const isSlow = ref(false);

function updateOnline() {
  isOnline.value = navigator.onLine;
}

function updateConnection() {
  const conn = (navigator as any).connection;
  if (conn) {
    const type = conn.effectiveType as string;
    isSlow.value = type === "slow-2g" || type === "2g" || type === "3g";
  }
}

// Global listeners (only initialized once)
let initialized = false;
function initListeners() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  const conn = (navigator as any).connection;
  if (conn) {
    updateConnection();
    conn.addEventListener("change", updateConnection);
  }
}

export function useConnectivity() {
  initListeners();
  return { isOnline, isSlow };
}
