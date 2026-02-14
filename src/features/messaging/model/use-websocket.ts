import { ref, onUnmounted } from "vue";
import { PROXY_NODES } from "@/shared/config";

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const messageHandlers = new Set<(data: unknown) => void>();

  const getWsUrl = (): string => {
    const node = PROXY_NODES[reconnectAttempts.value % PROXY_NODES.length];
    return `wss://${node.host}:${node.wss}`;
  };

  const connect = () => {
    if (ws.value?.readyState === WebSocket.OPEN) return;

    const url = getWsUrl();
    ws.value = new WebSocket(url);

    ws.value.onopen = () => {
      isConnected.value = true;
      reconnectAttempts.value = 0;
    };

    ws.value.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        messageHandlers.forEach(handler => handler(data));
      } catch {
        // Non-JSON message
      }
    };

    ws.value.onclose = () => {
      isConnected.value = false;
      scheduleReconnect();
    };

    ws.value.onerror = () => {
      ws.value?.close();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectAttempts.value >= maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30_000);
    reconnectTimer = setTimeout(() => {
      reconnectAttempts.value++;
      connect();
    }, delay);
  };

  const send = (data: unknown) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data));
    }
  };

  const onMessage = (handler: (data: unknown) => void) => {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  };

  const disconnect = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws.value?.close();
    ws.value = null;
    isConnected.value = false;
  };

  onUnmounted(disconnect);

  return {
    connect,
    disconnect,
    isConnected,
    onMessage,
    send
  };
}
