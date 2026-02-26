import type { Message } from "../model/types";
import { MessageType } from "../model/types";

export function sortMessagesByTime(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

export function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();

  for (const msg of messages) {
    const date = new Date(msg.timestamp).toDateString();
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(msg);
  }

  return groups;
}

export function isConsecutiveMessage(prev: Message | undefined, current: Message | undefined): boolean {
  if (!prev || !current) return false;
  // System messages (join/leave/kick) break message grouping
  if (prev.type === MessageType.system || current.type === MessageType.system) return false;
  return (
    prev.senderId === current.senderId &&
    current.timestamp - prev.timestamp < 60_000
  );
}
