const QUEUE_KEY = "bastyon-chat:offline-queue";

export interface QueuedMessage {
  id: string;
  roomId: string;
  content: string;
  timestamp: number;
}

function loadQueue(): QueuedMessage[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMessage[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(msg: QueuedMessage) {
  const queue = loadQueue();
  queue.push(msg);
  saveQueue(queue);
}

export function dequeue(): QueuedMessage | undefined {
  const queue = loadQueue();
  const msg = queue.shift();
  saveQueue(queue);
  return msg;
}

export function getQueue(): QueuedMessage[] {
  return loadQueue();
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}
