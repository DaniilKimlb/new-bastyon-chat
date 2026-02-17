import { getMatrixClientService } from "@/entities/matrix";
import type { MatrixKit } from "@/entities/matrix";
import type { Pcrypto, PcryptoRoomInstance } from "@/entities/matrix/model/matrix-crypto";
import { getmatrixid } from "@/shared/lib/matrix/functions";
import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import type { ChatRoom, FileInfo, Message } from "./types";
import { MessageStatus, MessageType } from "./types";

const NAMESPACE = "chat";

/** Determine MessageType from MIME type string */
function messageTypeFromMime(mime: string): MessageType {
  if (!mime) return MessageType.file;
  if (mime.startsWith("image/")) return MessageType.image;
  if (mime.startsWith("video/")) return MessageType.video;
  if (mime.startsWith("audio/")) return MessageType.audio;
  return MessageType.file;
}

/** Parse file metadata from raw event content.
 *  m.file events: body is JSON string with {name, type, size, url, secrets}
 *                 matrix-client.ts already parses it into content.pbody
 *  m.image events: info contains {w, h, secrets, url, ...} */
function parseFileInfo(content: Record<string, unknown>, msgtype: string): FileInfo | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pbody = content.pbody as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info = content.info as any;

  if (msgtype === "m.file" && pbody) {
    return {
      name: pbody.name ?? "file",
      type: (pbody.type ?? "").replace("encrypted/", ""),
      size: pbody.size ?? 0,
      url: pbody.url ?? "",
      secrets: pbody.secrets ? {
        block: pbody.secrets.block,
        keys: pbody.secrets.keys,
        v: pbody.secrets.v ?? pbody.secrets.version ?? 1,
      } : undefined,
    };
  }

  if (msgtype === "m.image" && info) {
    return {
      name: (content.body as string) ?? "image",
      type: info.mimetype ?? "image/jpeg",
      size: info.size ?? 0,
      url: info.url ?? (content.url as string) ?? "",
      w: info.w,
      h: info.h,
      secrets: info.secrets ? {
        block: info.secrets.block,
        keys: info.secrets.keys,
        v: info.secrets.v ?? info.secrets.version ?? 1,
      } : undefined,
    };
  }

  // Try parsing body as JSON for m.file without pbody
  if (msgtype === "m.file" && typeof content.body === "string") {
    try {
      const parsed = JSON.parse(content.body);
      if (parsed.url) {
        return {
          name: parsed.name ?? "file",
          type: (parsed.type ?? "").replace("encrypted/", ""),
          size: parsed.size ?? 0,
          url: parsed.url,
          secrets: parsed.secrets ? {
            block: parsed.secrets.block,
            keys: parsed.secrets.keys,
            v: parsed.secrets.v ?? parsed.secrets.version ?? 1,
          } : undefined,
        };
      }
    } catch { /* not JSON, ignore */ }
  }

  return undefined;
}

/** Extract raw event data from a MatrixEvent object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRawEvent(matrixEvent: any): Record<string, unknown> | null {
  // MatrixEvent has .event property with raw data
  if (matrixEvent?.event) return matrixEvent.event;
  // Fallback: maybe it's already a raw event
  if (matrixEvent?.type && matrixEvent?.sender) return matrixEvent;
  return null;
}

/** Convert a Matrix SDK room object into our ChatRoom type */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matrixRoomToChatRoom(room: any, kit: MatrixKit, myUserId: string): ChatRoom {
  const roomId = room.roomId as string;
  const name = (room.name as string) ?? roomId;
  const isGroup = !kit.isTetatetChat(room);

  // Get members
  const members = kit.getRoomMembers(room);
  const memberIds = members.map((m: Record<string, unknown>) => getmatrixid(m.userId as string));

  // Unread notification count
  const unreadCount = (room.getUnreadNotificationCount?.("total") as number) ?? 0;

  // Get timeline events
  let timelineEvents: unknown[] = [];
  try {
    const liveTimeline = room.getLiveTimeline?.();
    if (liveTimeline) {
      timelineEvents = liveTimeline.getEvents?.() ?? [];
    }
    if (!timelineEvents.length) {
      timelineEvents = room.timeline ?? [];
    }
  } catch { /* ignore */ }

  // Find last message event (search backwards, skip state events)
  let lastMessage: Message | undefined;
  let lastTs = 0;
  for (let i = timelineEvents.length - 1; i >= 0; i--) {
    const raw = getRawEvent(timelineEvents[i]);
    if (!raw) continue;
    // Use timestamp from latest event (any type)
    if (!lastTs && raw.origin_server_ts) {
      lastTs = raw.origin_server_ts as number;
    }
    // Find last actual message
    if (!lastMessage && raw.type === "m.room.message" && raw.content) {
      const content = raw.content as Record<string, unknown>;
      const msgtype = content.msgtype as string;
      let previewBody: string;
      let previewType = MessageType.text;

      if (msgtype === "m.encrypted") {
        previewBody = "[encrypted]";
      } else if (msgtype === "m.file") {
        const fi = parseFileInfo(content, msgtype);
        previewBody = fi ? fi.name : "[file]";
        previewType = fi ? messageTypeFromMime(fi.type) : MessageType.file;
      } else if (msgtype === "m.image") {
        previewBody = "[photo]";
        previewType = MessageType.image;
      } else {
        previewBody = (content?.body as string) ?? "";
      }

      lastMessage = {
        id: raw.event_id as string,
        roomId,
        senderId: getmatrixid(raw.sender as string),
        content: previewBody,
        timestamp: (raw.origin_server_ts as number) ?? 0,
        status: MessageStatus.sent,
        type: previewType,
      };
    }
    if (lastMessage && lastTs) break;
  }

  return {
    id: roomId,
    name: isGroup ? name : memberIds.find((id: string) => id !== getmatrixid(myUserId)) ?? name,
    lastMessage,
    unreadCount,
    members: memberIds,
    isGroup,
    updatedAt: lastTs || Date.now(),
  };
}

export const useChatStore = defineStore(NAMESPACE, () => {
  const rooms = ref<ChatRoom[]>([]);
  const activeRoomId = ref<string | null>(null);
  const messages = ref<Record<string, Message[]>>({});
  const typing = ref<Record<string, string[]>>({});

  // References to matrix helpers (set by auth store after init)
  const matrixKitRef = shallowRef<MatrixKit | null>(null);
  const pcryptoRef = shallowRef<Pcrypto | null>(null);

  const activeRoom = computed(() =>
    rooms.value.find((r) => r.id === activeRoomId.value)
  );

  const activeMessages = computed(() =>
    activeRoomId.value ? (messages.value[activeRoomId.value] ?? []) : []
  );

  const sortedRooms = computed(() =>
    [...rooms.value].sort((a, b) => b.updatedAt - a.updatedAt)
  );

  const totalUnread = computed(() =>
    rooms.value.reduce((sum, r) => sum + r.unreadCount, 0)
  );

  /** Set helper references from auth store */
  const setHelpers = (kit: MatrixKit, crypto: Pcrypto) => {
    matrixKitRef.value = kit;
    pcryptoRef.value = crypto;
  };

  /** Refresh rooms list from Matrix SDK */
  const refreshRooms = () => {
    const matrixService = getMatrixClientService();
    const kit = matrixKitRef.value;
    if (!matrixService.isReady() || !kit) {
      console.warn("[chat-store] refreshRooms skipped: ready=%s, kit=%s",
        matrixService.isReady(), !!kit);
      return;
    }

    const myUserId = matrixService.getUserId() ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matrixRooms = matrixService.getRooms() as any[];

    console.log("[chat-store] refreshRooms: %d rooms from SDK", matrixRooms.length);

    const interactiveRooms = matrixRooms.filter((r) => {
      const membership = r.selfMembership ?? r.getMyMembership?.();
      return membership === "join" || membership === "invite";
    });

    console.log("[chat-store] refreshRooms: %d interactive rooms", interactiveRooms.length);

    rooms.value = interactiveRooms.map((r) =>
      matrixRoomToChatRoom(r, kit, myUserId)
    );
  };

  const setActiveRoom = (roomId: string | null) => {
    activeRoomId.value = roomId;
    if (roomId) {
      const room = rooms.value.find((r) => r.id === roomId);
      if (room) room.unreadCount = 0;

      // Send read receipt for last event in the room
      try {
        const matrixService = getMatrixClientService();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matrixRoom = matrixService.getRoom(roomId) as any;
        if (matrixRoom) {
          const events = matrixRoom.timeline ?? matrixRoom.getLiveTimeline?.()?.getEvents?.() ?? [];
          if (events.length > 0) {
            matrixService.sendReadReceipt(events[events.length - 1]);
          }
        }
      } catch (e) {
        console.warn("[chat-store] sendReadReceipt error:", e);
      }
    }
  };

  const addRoom = (room: ChatRoom) => {
    const existing = rooms.value.findIndex((r) => r.id === room.id);
    if (existing >= 0) {
      rooms.value[existing] = room;
    } else {
      rooms.value.push(room);
    }
  };

  const removeRoom = (roomId: string) => {
    rooms.value = rooms.value.filter((r) => r.id !== roomId);
    delete messages.value[roomId];
    if (activeRoomId.value === roomId) {
      activeRoomId.value = null;
    }
  };

  const addMessage = (roomId: string, message: Message) => {
    if (!messages.value[roomId]) {
      messages.value[roomId] = [];
    }

    // Avoid duplicate messages
    if (messages.value[roomId].some((m) => m.id === message.id)) return;

    messages.value[roomId].push(message);

    // Update room's last message and timestamp
    const room = rooms.value.find((r) => r.id === roomId);
    if (room) {
      room.lastMessage = message;
      room.updatedAt = message.timestamp;
      if (roomId !== activeRoomId.value) {
        room.unreadCount++;
      }
    }
  };

  const setMessages = (roomId: string, msgs: Message[]) => {
    messages.value[roomId] = msgs;
  };

  const updateMessageStatus = (
    roomId: string,
    messageId: string,
    status: Message["status"]
  ) => {
    const roomMessages = messages.value[roomId];
    if (roomMessages) {
      const msg = roomMessages.find((m) => m.id === messageId);
      if (msg) msg.status = status;
    }
  };

  /** Set typing indicator for a room */
  const setTypingUsers = (roomId: string, userIds: string[]) => {
    typing.value[roomId] = userIds;
  };

  /** Get typing users for a room */
  const getTypingUsers = (roomId: string): string[] => {
    return typing.value[roomId] ?? [];
  };

  /** Ensure a PcryptoRoom instance exists for the given room */
  const ensureRoomCrypto = async (roomId: string): Promise<PcryptoRoomInstance | undefined> => {
    const pcrypto = pcryptoRef.value;
    if (!pcrypto) return undefined;

    // Already exists
    if (pcrypto.rooms[roomId]) return pcrypto.rooms[roomId];

    // Create: get the Matrix room object
    const matrixService = getMatrixClientService();
    const matrixRoom = matrixService.getRoom(roomId);
    if (!matrixRoom) return undefined;

    try {
      return await pcrypto.addRoom(matrixRoom as Record<string, unknown>);
    } catch (e) {
      console.warn("[chat-store] ensureRoomCrypto failed for", roomId, e);
      return undefined;
    }
  };

  /** Parse timeline events into Message array */
  const parseTimelineEvents = async (
    timelineEvents: unknown[],
    roomId: string,
  ): Promise<Message[]> => {
    // Ensure room crypto is initialized before parsing
    const roomCrypto = await ensureRoomCrypto(roomId);
    const msgs: Message[] = [];

    for (const event of timelineEvents) {
      try {
        const raw = getRawEvent(event);
        if (!raw) continue;

        // Log event types for debugging
        if (msgs.length === 0 && timelineEvents.indexOf(event) < 5) {
          console.log("[chat-store] event type=%s sender=%s", raw.type, raw.sender);
        }

        if (!raw.content) continue;
        if (raw.type !== "m.room.message") continue;

        const content = raw.content as Record<string, unknown>;
        let body = (content.body as string) ?? "";
        let msgType = MessageType.text;

        // Try to decrypt if encrypted (msgtype "m.encrypted" per bastyon-chat format)
        if (content.msgtype === "m.encrypted") {
          if (roomCrypto) {
            try {
              const decrypted = await roomCrypto.decryptEvent(raw);
              body = decrypted.body;
            } catch (e) {
              console.error("[chat-store] decrypt failed for event %s:", raw.event_id, e);
              body = "[encrypted]";
            }
          } else {
            body = "[no room crypto]";
          }
        }

        // Determine message type and parse file info
        const mtype = content.msgtype as string;
        let fileInfo: FileInfo | undefined;

        if (mtype === "m.image" || mtype === "m.file") {
          fileInfo = parseFileInfo(content, mtype);
          if (fileInfo) {
            msgType = mtype === "m.image"
              ? MessageType.image
              : messageTypeFromMime(fileInfo.type);
            body = fileInfo.name;
          } else {
            msgType = mtype === "m.image" ? MessageType.image : MessageType.file;
          }
        }

        msgs.push({
          id: raw.event_id as string,
          roomId,
          senderId: getmatrixid(raw.sender as string),
          content: body,
          timestamp: (raw.origin_server_ts as number) ?? 0,
          status: MessageStatus.sent,
          type: msgType,
          fileInfo,
        });
      } catch (e) {
        console.error("[chat-store] parseEvent error (skipping):", e);
      }
    }

    return msgs;
  };

  /** Get timeline events from a Matrix room */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTimelineEvents = (matrixRoom: any): unknown[] => {
    try {
      // Try getLiveTimeline().getEvents() first (standard API)
      const liveTimeline = matrixRoom.getLiveTimeline?.();
      if (liveTimeline) {
        const events = liveTimeline.getEvents?.();
        if (events?.length) return events;
      }
      // Fallback to room.timeline property
      if (matrixRoom.timeline?.length) return matrixRoom.timeline;
    } catch (e) {
      console.warn("[chat-store] getTimelineEvents error:", e);
    }
    return [];
  };

  /** Load timeline events for a room and convert to Messages */
  const loadRoomMessages = async (roomId: string) => {
    try {
      const matrixService = getMatrixClientService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matrixRoom = matrixService.getRoom(roomId) as any;
      if (!matrixRoom) {
        console.warn("[chat-store] loadRoomMessages: room not found:", roomId);
        return;
      }

      // Paginate backwards to load message history
      try {
        await matrixService.scrollback(roomId, 50);
      } catch (e) {
        console.warn("[chat-store] scrollback failed:", e);
      }

      const timelineEvents = getTimelineEvents(matrixRoom);
      console.log("[chat-store] loadRoomMessages: %d events for room %s",
        timelineEvents.length, roomId);

      const msgs = await parseTimelineEvents(timelineEvents, roomId);
      console.log("[chat-store] loadRoomMessages: %d messages parsed", msgs.length);
      setMessages(roomId, msgs);
    } catch (e) {
      console.error("[chat-store] loadRoomMessages fatal error for room %s:", roomId, e);
      // Set empty messages so UI doesn't hang
      setMessages(roomId, []);
    }
  };

  /** Handle incoming timeline event from Matrix sync */
  const handleTimelineEvent = async (event: unknown, roomId: string) => {
    try {
      const raw = getRawEvent(event);
      if (!raw?.content || raw.type !== "m.room.message") return;

      const content = raw.content as Record<string, unknown>;
      let body = (content.body as string) ?? "";
      let msgType = MessageType.text;

      // Decrypt if encrypted
      if (content.msgtype === "m.encrypted") {
        const roomCrypto = await ensureRoomCrypto(roomId);
        if (roomCrypto) {
          try {
            const decrypted = await roomCrypto.decryptEvent(raw);
            body = decrypted.body;
          } catch (e) {
            console.warn("[chat-store] handleTimelineEvent decrypt failed:", e);
            body = "[decrypt error: " + String(e) + "]";
          }
        } else {
          body = "[no room crypto]";
        }
      }

      const mtype = content.msgtype as string;
      let fileInfo: FileInfo | undefined;

      if (mtype === "m.image" || mtype === "m.file") {
        fileInfo = parseFileInfo(content, mtype);
        if (fileInfo) {
          msgType = mtype === "m.image"
            ? MessageType.image
            : messageTypeFromMime(fileInfo.type);
          body = fileInfo.name;
        } else {
          msgType = mtype === "m.image" ? MessageType.image : MessageType.file;
        }
      }

      const message: Message = {
        id: raw.event_id as string,
        roomId,
        senderId: getmatrixid(raw.sender as string),
        content: body,
        timestamp: (raw.origin_server_ts as number) ?? Date.now(),
        status: MessageStatus.sent,
        type: msgType,
        fileInfo,
      };

      addMessage(roomId, message);

      // Also refresh rooms list to update sidebar
      refreshRooms();
    } catch (e) {
      console.error("[chat-store] handleTimelineEvent error:", e);
    }
  };

  return {
    activeMessages,
    activeRoom,
    activeRoomId,
    addMessage,
    addRoom,
    getTypingUsers,
    handleTimelineEvent,
    loadRoomMessages,
    messages,
    refreshRooms,
    removeRoom,
    rooms,
    setActiveRoom,
    setHelpers,
    setMessages,
    setTypingUsers,
    sortedRooms,
    totalUnread,
    typing,
    updateMessageStatus,
  };
});
