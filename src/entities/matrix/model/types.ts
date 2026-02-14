/** Types for Matrix SDK integration */

export interface MatrixCredentials {
  username: string;
  password: string;
  address: string;
}

export interface MatrixUserData {
  user_id: string;
  access_token: string;
  device_id: string;
}

export interface MatrixRoomSummary {
  roomId: string;
  name: string;
  lastModified: number;
  selfMembership: string;
  unreadCount: number;
  isGroup: boolean;
  members: MatrixRoomMember[];
}

export interface MatrixRoomMember {
  userId: string;
  membership: string;
  powerLevel: number;
}

export interface MatrixEvent {
  event: {
    content: Record<string, unknown>;
    event_id: string;
    origin_server_ts: number;
    room_id: string;
    sender: string;
    state_key?: string;
    type: string;
  };
  getId(): string;
  getSender(): string;
  getRoomId(): string;
  getContent(): Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MatrixClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MatrixRoom = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MatrixSDK = any;
