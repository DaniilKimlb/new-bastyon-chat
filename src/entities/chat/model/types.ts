export interface ChatRoom {
  id: string;
  name: string;
  lastMessage?: Message;
  unreadCount: number;
  members: string[];
  avatar?: string;
  isGroup: boolean;
  updatedAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  timestamp: number;
  status: MessageStatus;
  type: MessageType;
}

export enum MessageStatus {
  sending = "sending",
  sent = "sent",
  delivered = "delivered",
  read = "read",
  failed = "failed"
}

export enum MessageType {
  text = "text",
  image = "image",
  file = "file",
  system = "system"
}
