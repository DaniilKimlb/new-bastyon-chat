import { getMatrixClientService } from "@/entities/matrix";
import type { MatrixKit } from "@/entities/matrix";
import type { Pcrypto, PcryptoRoomInstance } from "@/entities/matrix/model/matrix-crypto";
import { getmatrixid } from "@/shared/lib/matrix/functions";
import { matrixIdToAddress, messageTypeFromMime, parseFileInfo } from "../lib/chat-helpers";
import { defineStore } from "pinia";
import { computed, ref, shallowRef, triggerRef } from "vue";

import type { ChatRoom, FileInfo, Message, ReplyTo } from "./types";
import { MessageStatus, MessageType } from "./types";

const NAMESPACE = "chat";

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
      } else if (msgtype === "m.audio") {
        previewBody = "[voice message]";
        previewType = MessageType.audio;
      } else if (msgtype === "m.video") {
        previewBody = "[video]";
        previewType = MessageType.video;
      } else {
        previewBody = (content?.body as string) ?? "";
      }

      lastMessage = {
        id: raw.event_id as string,
        roomId,
        senderId: matrixIdToAddress(raw.sender as string),
        content: previewBody,
        timestamp: (raw.origin_server_ts as number) ?? 0,
        status: MessageStatus.sent,
        type: previewType,
      };
    }
    if (lastMessage && lastTs) break;
  }

  // Resolve display name
  let displayName = name;
  if (!isGroup) {
    // 1:1 chat: use the other member's rawDisplayName
    const otherMember = members.find(
      (m: Record<string, unknown>) => getmatrixid(m.userId as string) !== getmatrixid(myUserId)
    );
    displayName = (otherMember?.rawDisplayName as string)
      || (otherMember?.name as string)
      || (otherMember ? matrixIdToAddress(otherMember.userId as string) : null)
      || name;
  } else if (name.startsWith("#") && name.length > 20) {
    // Group with auto-generated hash name: build from member display names
    const memberNames = members
      .filter((m: Record<string, unknown>) => getmatrixid(m.userId as string) !== getmatrixid(myUserId))
      .map((m: Record<string, unknown>) => (m.rawDisplayName as string) || (m.name as string) || "?")
      .slice(0, 3);
    displayName = memberNames.join(", ") + (members.length > 4 ? "..." : "");
  }

  // Resolve avatar URL
  let avatar: string | undefined;
  if (!isGroup) {
    // 1:1: use the other member's address (UserAvatar will resolve via Pocketnet)
    // We store the address so ContactList can use UserAvatar
    const otherMember = members.find(
      (m: Record<string, unknown>) => getmatrixid(m.userId as string) !== getmatrixid(myUserId)
    );
    if (otherMember) {
      avatar = `__pocketnet__:${matrixIdToAddress(otherMember.userId as string)}`;
    }
  } else {
    // Group: try to get room avatar from Matrix state
    try {
      const avatarEvent = room.currentState?.getStateEvents?.("m.room.avatar", "");
      const avatarUrl = avatarEvent?.getContent?.()?.url ?? avatarEvent?.event?.content?.url;
      if (avatarUrl && typeof avatarUrl === "string") {
        avatar = avatarUrl;
      }
    } catch { /* ignore */ }
  }

  return {
    id: roomId,
    name: displayName,
    avatar,
    lastMessage,
    unreadCount,
    members: memberIds,
    isGroup,
    updatedAt: lastTs || 0,
  };
}

export const useChatStore = defineStore(NAMESPACE, () => {
  const rooms = ref<ChatRoom[]>([]);
  const activeRoomId = ref<string | null>(null);
  const messages = ref<Record<string, Message[]>>({});
  const typing = ref<Record<string, string[]>>({});
  const replyingTo = ref<ReplyTo | null>(null);

  // Edit/delete state (Batch 3)
  const editingMessage = ref<{ id: string; content: string } | null>(null);
  const deletingMessage = ref<Message | null>(null);

  // User display name cache: address → display name
  const userDisplayNames = ref<Record<string, string>>({});

  /** Look up a user's display name; falls back to truncated address */
  const getDisplayName = (address: string): string => {
    if (!address) return "?";
    const cached = userDisplayNames.value[address];
    if (cached) return cached;
    // Fallback: truncated address
    if (address.length > 16) return address.slice(0, 8) + "\u2026" + address.slice(-4);
    return address;
  };

  // Selection/forward state (Batch 4)
  const selectionMode = ref(false);
  const selectedMessageIds = ref<Set<string>>(new Set());
  const forwardingMessages = ref(false);

  const enterSelectionMode = (messageId: string) => {
    selectionMode.value = true;
    selectedMessageIds.value = new Set([messageId]);
  };

  const toggleSelection = (messageId: string) => {
    const s = selectedMessageIds.value;
    if (s.has(messageId)) s.delete(messageId);
    else s.add(messageId);
    selectedMessageIds.value = new Set(s);
  };

  const exitSelectionMode = () => {
    selectionMode.value = false;
    selectedMessageIds.value = new Set();
    forwardingMessages.value = false;
  };

  // Pinned messages (Batch 10)
  const pinnedMessages = ref<Message[]>([]);
  const pinnedMessageIndex = ref(0);

  const pinMessage = (messageId: string) => {
    const roomId = activeRoomId.value;
    if (!roomId) return;
    const msg = messages.value[roomId]?.find(m => m.id === messageId);
    if (msg && !pinnedMessages.value.some(p => p.id === messageId)) {
      pinnedMessages.value.push(msg);
      pinnedMessageIndex.value = pinnedMessages.value.length - 1;
    }
  };

  const unpinMessage = (messageId: string) => {
    pinnedMessages.value = pinnedMessages.value.filter(m => m.id !== messageId);
    if (pinnedMessageIndex.value >= pinnedMessages.value.length) {
      pinnedMessageIndex.value = Math.max(0, pinnedMessages.value.length - 1);
    }
  };

  const cyclePinnedMessage = (direction: 1 | -1) => {
    if (pinnedMessages.value.length === 0) return;
    pinnedMessageIndex.value = (pinnedMessageIndex.value + direction + pinnedMessages.value.length) % pinnedMessages.value.length;
  };

  // Room-level pin/mute (Batch 7)
  const pinnedRoomIds = ref<Set<string>>(new Set(JSON.parse(localStorage.getItem("chat_pinned_rooms") || "[]")));
  const mutedRoomIds = ref<Set<string>>(new Set(JSON.parse(localStorage.getItem("chat_muted_rooms") || "[]")));

  const persistRoomSets = () => {
    localStorage.setItem("chat_pinned_rooms", JSON.stringify([...pinnedRoomIds.value]));
    localStorage.setItem("chat_muted_rooms", JSON.stringify([...mutedRoomIds.value]));
  };

  const togglePinRoom = (roomId: string) => {
    const s = new Set(pinnedRoomIds.value);
    if (s.has(roomId)) s.delete(roomId);
    else s.add(roomId);
    pinnedRoomIds.value = s;
    persistRoomSets();
  };

  const toggleMuteRoom = (roomId: string) => {
    const s = new Set(mutedRoomIds.value);
    if (s.has(roomId)) s.delete(roomId);
    else s.add(roomId);
    mutedRoomIds.value = s;
    persistRoomSets();
  };

  const markRoomAsRead = (roomId: string) => {
    const room = rooms.value.find(r => r.id === roomId);
    if (room) room.unreadCount = 0;
  };

  // References to matrix helpers (set by auth store after init)
  const matrixKitRef = shallowRef<MatrixKit | null>(null);
  const pcryptoRef = shallowRef<Pcrypto | null>(null);

  const activeRoom = computed(() =>
    rooms.value.find((r) => r.id === activeRoomId.value)
  );

  const activeMessages = computed(() =>
    activeRoomId.value ? (messages.value[activeRoomId.value] ?? []) : []
  );

  const activeMediaMessages = computed(() =>
    activeMessages.value.filter(m => m.type === MessageType.image || m.type === MessageType.video)
  );

  const sortedRooms = computed(() =>
    [...rooms.value].sort((a, b) => {
      const aPinned = pinnedRoomIds.value.has(a.id) ? 1 : 0;
      const bPinned = pinnedRoomIds.value.has(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return b.updatedAt - a.updatedAt;
    })
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

    const interactiveRooms = matrixRooms.filter((r) => {
      const membership = r.selfMembership ?? r.getMyMembership?.();
      if (membership !== "join" && membership !== "invite") return false;

      // Filter out spaces (m.space rooms)
      try {
        const createEvent = r.currentState?.getStateEvents?.("m.room.create", "");
        const createContent = createEvent?.getContent?.() ?? createEvent?.event?.content;
        if (createContent?.type === "m.space") return false;
      } catch { /* ignore */ }

      // Filter rooms with no other members (self-only rooms)
      const memberCount = r.getJoinedMemberCount?.() ?? r.currentState?.getJoinedMemberCount?.() ?? 0;
      if (memberCount < 2) {
        // Keep rooms that have timeline events (could be an old chat where other member left)
        const hasTimeline = (r.timeline?.length ?? 0) > 0 ||
          (r.getLiveTimeline?.()?.getEvents?.()?.length ?? 0) > 0;
        if (!hasTimeline) return false;
      }

      return true;
    });

    rooms.value = interactiveRooms
      .map((r) => {
        const chatRoom = matrixRoomToChatRoom(r, kit, myUserId);
        // Preserve unreadCount=0 for active room — SDK hasn't processed the read receipt yet
        if (chatRoom.id === activeRoomId.value) chatRoom.unreadCount = 0;
        // If we already have loaded messages for this room, use the latest as preview.
        // This avoids "[encrypted]" for our own optimistic messages that are plaintext.
        const loadedMsgs = messages.value[chatRoom.id];
        if (loadedMsgs?.length) {
          chatRoom.lastMessage = loadedMsgs[loadedMsgs.length - 1];
          chatRoom.updatedAt = Math.max(chatRoom.updatedAt, chatRoom.lastMessage.timestamp);
        }
        return chatRoom;
      })
      // Filter out rooms with no messages
      .filter((r) => r.lastMessage !== undefined);

    // Build user display name cache from room members
    for (const r of interactiveRooms) {
      const members = kit.getRoomMembers(r);
      for (const m of members) {
        const addr = matrixIdToAddress((m as Record<string, unknown>).userId as string);
        const dn = (m as Record<string, unknown>).rawDisplayName as string
          || (m as Record<string, unknown>).name as string;
        if (addr && dn && dn !== addr) {
          userDisplayNames.value[addr] = dn;
        }
      }
    }

    // Decrypt [encrypted] previews asynchronously
    decryptRoomPreviews(interactiveRooms);
  };

  /** Decrypt last-message previews for rooms that show [encrypted] */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decryptRoomPreviews = async (matrixRooms: any[]) => {
    for (const matrixRoom of matrixRooms) {
      const roomId = matrixRoom.roomId as string;
      const room = rooms.value.find(r => r.id === roomId);
      if (!room?.lastMessage || room.lastMessage.content !== "[encrypted]") continue;

      try {
        const roomCrypto = await ensureRoomCrypto(roomId);
        if (!roomCrypto) continue;

        // Find the last encrypted message event
        let timelineEvents: unknown[] = [];
        try {
          const lt = matrixRoom.getLiveTimeline?.();
          if (lt) timelineEvents = lt.getEvents?.() ?? [];
          if (!timelineEvents.length) timelineEvents = matrixRoom.timeline ?? [];
        } catch { /* ignore */ }

        for (let i = timelineEvents.length - 1; i >= 0; i--) {
          const raw = getRawEvent(timelineEvents[i]);
          if (!raw?.content || raw.type !== "m.room.message") continue;
          const content = raw.content as Record<string, unknown>;
          if (content.msgtype !== "m.encrypted") continue;

          try {
            const decrypted = await roomCrypto.decryptEvent(raw);
            if (decrypted.body && room.lastMessage) {
              room.lastMessage.content = decrypted.body;
            }
          } catch { /* leave as [encrypted] */ }
          break;
        }
      } catch { /* ignore */ }
    }
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
          console.log("[chat-store] setActiveRoom: sending read receipt, events count=%d", events.length);
          if (events.length > 0) {
            const lastEvent = events[events.length - 1];
            console.log("[chat-store] setActiveRoom: last event id=%s type=%s", lastEvent?.event?.event_id, lastEvent?.event?.type);
            matrixService.sendReadReceipt(lastEvent);
          }
        } else {
          console.log("[chat-store] setActiveRoom: no matrixRoom found");
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
    triggerRef(messages);

    // Update room's last message and timestamp
    const room = rooms.value.find((r) => r.id === roomId);
    if (room) {
      room.lastMessage = message;
      room.updatedAt = message.timestamp;
      if (roomId !== activeRoomId.value) {
        room.unreadCount++;
      }
      triggerRef(rooms);
    }
  };

  const setMessages = (roomId: string, msgs: Message[]) => {
    messages.value[roomId] = msgs;
  };

  /** Replace a temporary message ID with the server-assigned event_id */
  const updateMessageId = (roomId: string, tempId: string, serverId: string) => {
    const roomMessages = messages.value[roomId];
    if (roomMessages) {
      const msg = roomMessages.find((m) => m.id === tempId);
      if (msg) {
        msg.id = serverId;
        triggerRef(messages);
      }
    }
  };

  const updateMessageStatus = (
    roomId: string,
    messageId: string,
    status: Message["status"]
  ) => {
    const roomMessages = messages.value[roomId];
    if (roomMessages) {
      const msg = roomMessages.find((m) => m.id === messageId);
      if (msg) {
        msg.status = status;
        triggerRef(messages);
      }
    }
  };

  /** Update content of a message (for edit) */
  const updateMessageContent = (roomId: string, messageId: string, newContent: string) => {
    const roomMessages = messages.value[roomId];
    if (roomMessages) {
      const msg = roomMessages.find((m) => m.id === messageId);
      if (msg) {
        msg.content = newContent;
        msg.edited = true;
        triggerRef(messages);
      }
    }
  };

  /** Remove a single message from a room */
  const removeMessage = (roomId: string, messageId: string) => {
    const roomMessages = messages.value[roomId];
    if (roomMessages) {
      messages.value[roomId] = roomMessages.filter((m) => m.id !== messageId);
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

  /** Parse a single timeline event into a Message (or null if not a message) */
  const parseSingleEvent = async (
    event: unknown,
    roomId: string,
    roomCrypto: PcryptoRoomInstance | undefined,
  ): Promise<Message | null> => {
    const raw = getRawEvent(event);
    if (!raw?.content || raw.type !== "m.room.message") return null;

    const content = raw.content as Record<string, unknown>;
    let body = (content.body as string) ?? "";
    let msgType = MessageType.text;

    // Try to decrypt if encrypted
    if (content.msgtype === "m.encrypted") {
      if (roomCrypto) {
        try {
          const decrypted = await roomCrypto.decryptEvent(raw);
          body = decrypted.body;
        } catch {
          body = "[encrypted]";
        }
      } else {
        body = "[no room crypto]";
      }
    }

    // Determine message type and parse file info
    const mtype = content.msgtype as string;
    let fileInfo: FileInfo | undefined;

    if (mtype === "m.image" || mtype === "m.file" || mtype === "m.audio" || mtype === "m.video") {
      fileInfo = parseFileInfo(content, mtype);
      if (fileInfo) {
        if (mtype === "m.image") msgType = MessageType.image;
        else if (mtype === "m.audio") msgType = MessageType.audio;
        else if (mtype === "m.video") msgType = MessageType.video;
        else msgType = messageTypeFromMime(fileInfo.type);
        body = fileInfo.name;
      } else {
        if (mtype === "m.image") msgType = MessageType.image;
        else if (mtype === "m.audio") msgType = MessageType.audio;
        else if (mtype === "m.video") msgType = MessageType.video;
        else msgType = MessageType.file;
      }
    }

    // Parse reply reference
    let replyTo: ReplyTo | undefined;
    const relatesTo = content["m.relates_to"] as Record<string, unknown> | undefined;
    const inReplyTo = relatesTo?.["m.in_reply_to"] as Record<string, unknown> | undefined;
    if (inReplyTo?.event_id) {
      replyTo = {
        id: inReplyTo.event_id as string,
        senderId: "",
        content: "",
      };
    }

    // Parse forwarded_from metadata
    let forwardedFrom: Message["forwardedFrom"] | undefined;
    const fwdMeta = content["forwarded_from"] as Record<string, unknown> | undefined;
    if (fwdMeta?.sender_id) {
      forwardedFrom = {
        senderId: fwdMeta.sender_id as string,
        senderName: (fwdMeta.sender_name as string) || undefined,
      };
    }

    return {
      id: raw.event_id as string,
      roomId,
      senderId: matrixIdToAddress(raw.sender as string),
      content: body,
      timestamp: (raw.origin_server_ts as number) ?? 0,
      status: MessageStatus.sent,
      type: msgType,
      fileInfo,
      replyTo,
      forwardedFrom,
    };
  };

  /** Parse timeline events into Message array — decrypts in parallel, collects reactions */
  const parseTimelineEvents = async (
    timelineEvents: unknown[],
    roomId: string,
  ): Promise<Message[]> => {
    // Ensure room crypto is initialized before parsing
    const roomCrypto = await ensureRoomCrypto(roomId);

    // Separate messages and reactions
    const messageEvents: unknown[] = [];
    const reactionEvents: Record<string, unknown>[] = [];

    for (const event of timelineEvents) {
      const raw = getRawEvent(event);
      if (!raw) continue;
      if (raw.type === "m.reaction" && raw.content) {
        reactionEvents.push(raw);
      } else {
        messageEvents.push(event);
      }
    }

    // Decrypt all messages in parallel
    const results = await Promise.all(
      messageEvents.map((event) => parseSingleEvent(event, roomId, roomCrypto).catch(() => null))
    );

    const msgs = results.filter((m): m is Message => m !== null && m.content !== "");

    // Apply reactions to messages
    const msgMap = new Map(msgs.map(m => [m.id, m]));
    const matrixService = getMatrixClientService();
    for (const raw of reactionEvents) {
      const content = raw.content as Record<string, unknown>;
      const relatesTo = content?.["m.relates_to"] as Record<string, unknown> | undefined;
      if (!relatesTo) continue;
      const targetId = relatesTo.event_id as string;
      const emoji = relatesTo.key as string;
      if (!targetId || !emoji) continue;

      const targetMsg = msgMap.get(targetId);
      if (!targetMsg) continue;

      if (!targetMsg.reactions) targetMsg.reactions = {};
      if (!targetMsg.reactions[emoji]) {
        targetMsg.reactions[emoji] = { count: 0, users: [] };
      }
      const reactionSenderId = matrixIdToAddress(raw.sender as string);
      const rd = targetMsg.reactions[emoji];
      if (!rd.users.includes(reactionSenderId)) {
        rd.users.push(reactionSenderId);
        rd.count++;
        if (matrixService.isMe(raw.sender as string)) {
          rd.myEventId = raw.event_id as string;
        }
      }
    }

    // Resolve reply references (fill in sender/content/type from parsed messages)
    for (const msg of msgs) {
      if (msg.replyTo?.id) {
        const referenced = msgMap.get(msg.replyTo.id);
        if (referenced) {
          msg.replyTo.senderId = referenced.senderId;
          msg.replyTo.content = referenced.content.slice(0, 100);
          msg.replyTo.type = referenced.type;
        }
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

  /** Apply existing read receipts from the Matrix room to set correct message statuses.
   *  Walks the timeline backwards, finds the latest event that has a read receipt
   *  from a non-self user, and marks all own messages up to that point as "read". */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyExistingReceipts = (matrixRoom: any, timelineEvents: unknown[], msgs: Message[], myUserId: string | null) => {
    if (!myUserId || msgs.length === 0) return;
    try {
      const myAddr = matrixIdToAddress(myUserId);
      // Find the latest event that has a read receipt from a non-self user
      let readUpToEventId: string | null = null;
      for (let i = timelineEvents.length - 1; i >= 0; i--) {
        const ev = timelineEvents[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const receipts: Array<{ userId: string; type: string }> = matrixRoom.getReceiptsForEvent?.(ev) ?? [];
        const hasOtherRead = receipts.some(
          (r) => r.type === "m.read" && r.userId !== myUserId
        );
        if (hasOtherRead) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          readUpToEventId = (ev as any)?.getId?.() ?? (ev as any)?.event?.event_id ?? null;
          break;
        }
      }
      if (!readUpToEventId) return;

      // Find the index of this event in our messages and mark all own messages up to it
      const readUpToIdx = msgs.findIndex(m => m.id === readUpToEventId);
      if (readUpToIdx < 0) {
        // Event not in our parsed messages — mark all as read (receipt is beyond our range)
        for (const msg of msgs) {
          if (msg.senderId === myAddr && msg.status === MessageStatus.sent) {
            msg.status = MessageStatus.read;
          }
        }
        return;
      }
      for (let i = readUpToIdx; i >= 0; i--) {
        const msg = msgs[i];
        if (msg.senderId !== myAddr) continue;
        if (msg.status === MessageStatus.sent) {
          msg.status = MessageStatus.read;
        }
      }
    } catch (e) {
      console.warn("[chat-store] applyExistingReceipts error:", e);
    }
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
      const msgs = await parseTimelineEvents(timelineEvents, roomId);

      // Apply existing read receipts to determine message status.
      // Walk timeline backwards, find the latest read receipt from a non-self user,
      // and mark all own messages up to that point as "read".
      applyExistingReceipts(matrixRoom, timelineEvents, msgs, matrixService.getUserId());

      setMessages(roomId, msgs);
    } catch (e) {
      console.error("[chat-store] loadRoomMessages fatal error for room %s:", roomId, e);
      // Set empty messages so UI doesn't hang
      setMessages(roomId, []);
    }
  };

  /** Apply a reaction event to a stored message */
  const applyReaction = (roomId: string, raw: Record<string, unknown>) => {
    const content = raw.content as Record<string, unknown>;
    const relatesTo = content?.["m.relates_to"] as Record<string, unknown> | undefined;
    if (!relatesTo) return;

    const targetEventId = relatesTo.event_id as string;
    const emoji = relatesTo.key as string;
    if (!targetEventId || !emoji) return;

    const roomMessages = messages.value[roomId];
    if (!roomMessages) return;

    const targetMsg = roomMessages.find(m => m.id === targetEventId);
    if (!targetMsg) return;

    if (!targetMsg.reactions) targetMsg.reactions = {};
    if (!targetMsg.reactions[emoji]) {
      targetMsg.reactions[emoji] = { count: 0, users: [] };
    }

    const reactionSender = matrixIdToAddress(raw.sender as string);
    const reactionData = targetMsg.reactions[emoji];
    if (!reactionData.users.includes(reactionSender)) {
      reactionData.users.push(reactionSender);
      reactionData.count++;
    }

    // Update own reaction event ID — but only if the new ID is a real server ID ($...)
    // The SDK fires timeline events with local IDs (~...) before server confirmation
    const matrixService = getMatrixClientService();
    const incomingId = raw.event_id as string;
    if (matrixService.isMe(raw.sender as string) && incomingId) {
      const currentId = reactionData.myEventId;
      // Only update if: no ID yet, current is optimistic/local, or incoming is a real server ID
      if (!currentId || !currentId.startsWith("$") || incomingId.startsWith("$")) {
        reactionData.myEventId = incomingId;
      }
    }
    triggerRef(messages);
  };

  /** Set the server-confirmed event ID for an own reaction */
  const setReactionEventId = (roomId: string, messageId: string, emoji: string, eventId: string) => {
    const roomMessages = messages.value[roomId];
    if (!roomMessages) return;
    const msg = roomMessages.find(m => m.id === messageId);
    if (msg?.reactions?.[emoji]) {
      msg.reactions[emoji].myEventId = eventId;
      triggerRef(messages);
    }
  };

  /** Optimistic add: instantly show a reaction before server confirms */
  const optimisticAddReaction = (roomId: string, messageId: string, emoji: string, userAddress: string) => {
    const roomMessages = messages.value[roomId];
    if (!roomMessages) return;
    const msg = roomMessages.find(m => m.id === messageId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = { count: 0, users: [] };
    }
    const rd = msg.reactions[emoji];
    if (!rd.users.includes(userAddress)) {
      rd.users.push(userAddress);
      rd.count++;
    }
    // myEventId will be set by applyReaction when the server echoes back
    rd.myEventId = "__optimistic__";
    triggerRef(messages);
  };

  /** Optimistic remove: instantly hide a reaction before server confirms */
  const optimisticRemoveReaction = (roomId: string, messageId: string, emoji: string, userAddress: string) => {
    const roomMessages = messages.value[roomId];
    if (!roomMessages) return;
    const msg = roomMessages.find(m => m.id === messageId);
    if (!msg?.reactions?.[emoji]) return;
    const rd = msg.reactions[emoji];
    rd.users = rd.users.filter(u => u !== userAddress);
    rd.count = rd.users.length;
    delete rd.myEventId;
    if (rd.count === 0) {
      delete msg.reactions[emoji];
    }
    triggerRef(messages);
  };

  /** Handle incoming timeline event from Matrix sync */
  const handleTimelineEvent = async (event: unknown, roomId: string) => {
    try {
      const raw = getRawEvent(event);
      if (!raw?.content) return;

      // Handle reaction events
      if (raw.type === "m.reaction") {
        applyReaction(roomId, raw);
        return;
      }

      if (raw.type !== "m.room.message") return;

      // Skip our own events — they're already in the list via optimistic add.
      // Processing them here causes race conditions: the timeline echo may arrive
      // before updateMessageId replaces tempId → duplicate check fails → decrypt
      // errors appear because the event gets re-processed.
      const matrixService = getMatrixClientService();
      const myUserId = matrixService.getUserId();
      if (myUserId && raw.sender === myUserId) return;

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

      if (mtype === "m.image" || mtype === "m.file" || mtype === "m.audio" || mtype === "m.video") {
        fileInfo = parseFileInfo(content, mtype);
        if (fileInfo) {
          if (mtype === "m.image") msgType = MessageType.image;
          else if (mtype === "m.audio") msgType = MessageType.audio;
          else if (mtype === "m.video") msgType = MessageType.video;
          else msgType = messageTypeFromMime(fileInfo.type);
          body = fileInfo.name;
        } else {
          if (mtype === "m.image") msgType = MessageType.image;
          else if (mtype === "m.audio") msgType = MessageType.audio;
          else if (mtype === "m.video") msgType = MessageType.video;
          else msgType = MessageType.file;
        }
      }

      // Parse reply reference
      let replyTo: ReplyTo | undefined;
      const relatesTo = content["m.relates_to"] as Record<string, unknown> | undefined;
      const inReplyTo = relatesTo?.["m.in_reply_to"] as Record<string, unknown> | undefined;
      if (inReplyTo?.event_id) {
        const replyId = inReplyTo.event_id as string;
        // Try to find the referenced message in already loaded messages
        const referenced = messages.value[roomId]?.find(m => m.id === replyId);
        replyTo = {
          id: replyId,
          senderId: referenced?.senderId ?? "",
          content: referenced?.content.slice(0, 100) ?? "",
          type: referenced?.type,
        };
      }

      // Parse forwarded_from metadata
      let forwardedFrom: Message["forwardedFrom"] | undefined;
      const fwdMeta = content["forwarded_from"] as Record<string, unknown> | undefined;
      if (fwdMeta?.sender_id) {
        forwardedFrom = {
          senderId: fwdMeta.sender_id as string,
          senderName: (fwdMeta.sender_name as string) || undefined,
        };
      }

      const message: Message = {
        id: raw.event_id as string,
        roomId,
        senderId: matrixIdToAddress(raw.sender as string),
        content: body,
        timestamp: (raw.origin_server_ts as number) ?? Date.now(),
        status: MessageStatus.sent,
        type: msgType,
        fileInfo,
        replyTo,
        forwardedFrom,
      };

      addMessage(roomId, message);

      // Auto-send read receipt if this room is currently active
      if (roomId === activeRoomId.value) {
        try {
          const matrixService = getMatrixClientService();
          matrixService.sendReadReceipt(event);
        } catch { /* ignore */ }
      }

      // Also refresh rooms list to update sidebar
      refreshRooms();
    } catch (e) {
      console.error("[chat-store] handleTimelineEvent error:", e);
    }
  };

  /** Handle read receipt events from other users */
  const handleReceiptEvent = (event: unknown, room: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receiptEvent = event as any;
      const roomObj = room as Record<string, unknown>;
      const roomId = roomObj?.roomId as string;
      console.log("[chat-store] handleReceiptEvent roomId=%s", roomId);
      if (!roomId) { console.log("[chat-store] handleReceiptEvent: no roomId"); return; }

      const roomMessages = messages.value[roomId];
      if (!roomMessages) { console.log("[chat-store] handleReceiptEvent: no messages for room"); return; }

      const matrixService = getMatrixClientService();
      const myUserId = matrixService.getUserId();
      console.log("[chat-store] handleReceiptEvent myUserId=%s", myUserId);

      // Get receipt content: { eventId: { "m.read": { userId: { ts } } } }
      const content = receiptEvent?.getContent?.() ?? receiptEvent?.event?.content;
      console.log("[chat-store] handleReceiptEvent content=", JSON.stringify(content));
      if (!content) { console.log("[chat-store] handleReceiptEvent: no content"); return; }

      for (const [eventId, receiptTypes] of Object.entries(content)) {
        const readReceipts = (receiptTypes as Record<string, unknown>)?.["m.read"] as Record<string, unknown> | undefined;
        if (!readReceipts) continue;

        // Check if someone OTHER than us sent a read receipt for one of OUR messages
        for (const userId of Object.keys(readReceipts)) {
          console.log("[chat-store] receipt: userId=%s read eventId=%s (me=%s)", userId, eventId, myUserId);
          if (userId === myUserId) continue; // skip our own receipts

          // Find this event in our messages and mark it (and all previous) as read
          const msgIdx = roomMessages.findIndex(m => m.id === eventId);
          console.log("[chat-store] receipt: msgIdx=%d for eventId=%s, total msgs=%d", msgIdx, eventId, roomMessages.length);
          if (msgIdx >= 0) {
            const myAddr = matrixIdToAddress(myUserId ?? "");
            console.log("[chat-store] receipt: marking read, myAddr=%s, msg.senderId=%s", myAddr, roomMessages[msgIdx].senderId);
            // Mark this message and all earlier own messages as read
            for (let i = msgIdx; i >= 0; i--) {
              const msg = roomMessages[i];
              if (msg.senderId !== myAddr) continue;
              if (msg.status === MessageStatus.read) break; // already read, stop
              if (msg.status === MessageStatus.sent || msg.status === MessageStatus.delivered) {
                msg.status = MessageStatus.read;
                console.log("[chat-store] receipt: marked msg %s as read", msg.id);
              }
            }
          }
        }
      }
      triggerRef(messages);
    } catch (e) {
      console.warn("[chat-store] handleReceiptEvent error:", e);
    }
  };

  /** Handle redaction events (reaction removal, message deletion) */
  const handleRedactionEvent = (event: unknown, room: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ev = event as any;
      const redactedEventId: string = ev?.event?.redacts ?? ev?.getAssociatedId?.();
      if (!redactedEventId) return;

      const roomObj = room as Record<string, unknown>;
      const roomId = (roomObj?.roomId as string) ?? "";
      if (!roomId) return;

      const roomMessages = messages.value[roomId];
      if (!roomMessages) return;

      // Check if the redacted event was a reaction — find and remove it
      for (const msg of roomMessages) {
        if (!msg.reactions) continue;
        for (const [emoji, data] of Object.entries(msg.reactions)) {
          if (data.myEventId === redactedEventId) {
            // It's our own reaction being redacted
            const matrixService = getMatrixClientService();
            const myAddr = matrixIdToAddress(matrixService.getUserId() ?? "");
            data.users = data.users.filter(u => u !== myAddr);
            data.count = data.users.length;
            delete data.myEventId;
            if (data.count === 0) delete msg.reactions[emoji];
            triggerRef(messages);
            return;
          }
        }
      }

      // If we didn't find it as a known reaction eventId, re-parse reactions
      // from the Matrix room timeline to get accurate state
      const matrixService = getMatrixClientService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matrixRoom = matrixService.getRoom(roomId) as any;
      if (matrixRoom) {
        rebuildReactionsForRoom(roomId, matrixRoom);
      }
    } catch (e) {
      console.warn("[chat-store] handleRedactionEvent error:", e);
    }
  };

  /** Rebuild reactions for all messages in a room from the Matrix timeline */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rebuildReactionsForRoom = (roomId: string, matrixRoom: any) => {
    const roomMessages = messages.value[roomId];
    if (!roomMessages) return;

    const timelineEvents = getTimelineEvents(matrixRoom);
    const matrixService = getMatrixClientService();

    // Collect all non-redacted reaction events
    const reactionMap = new Map<string, Record<string, { count: number; users: string[]; myEventId?: string }>>();

    for (const ev of timelineEvents) {
      const raw = getRawEvent(ev);
      if (!raw || raw.type !== "m.reaction") continue;
      // Skip redacted events (no content or unsigned.redacted_because)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsigned = (raw as any).unsigned;
      if (unsigned?.redacted_because) continue;
      const content = raw.content as Record<string, unknown>;
      if (!content) continue;

      const relatesTo = content["m.relates_to"] as Record<string, unknown> | undefined;
      if (!relatesTo) continue;
      const targetId = relatesTo.event_id as string;
      const emoji = relatesTo.key as string;
      if (!targetId || !emoji) continue;

      if (!reactionMap.has(targetId)) reactionMap.set(targetId, {});
      const targetReactions = reactionMap.get(targetId)!;
      if (!targetReactions[emoji]) targetReactions[emoji] = { count: 0, users: [] };

      const sender = matrixIdToAddress(raw.sender as string);
      const rd = targetReactions[emoji];
      if (!rd.users.includes(sender)) {
        rd.users.push(sender);
        rd.count++;
      }
      if (matrixService.isMe(raw.sender as string)) {
        rd.myEventId = raw.event_id as string;
      }
    }

    // Apply to stored messages
    for (const msg of roomMessages) {
      msg.reactions = reactionMap.get(msg.id) ?? undefined;
    }
    triggerRef(messages);
  };

  return {
    activeMediaMessages,
    activeMessages,
    activeRoom,
    activeRoomId,
    addMessage,
    addRoom,
    deletingMessage,
    editingMessage,
    enterSelectionMode,
    exitSelectionMode,
    forwardingMessages,
    getDisplayName,
    getTypingUsers,
    handleReceiptEvent,
    handleRedactionEvent,
    handleTimelineEvent,
    loadRoomMessages,
    markRoomAsRead,
    messages,
    mutedRoomIds,
    optimisticAddReaction,
    optimisticRemoveReaction,
    setReactionEventId,
    pinMessage,
    pinnedMessageIndex,
    pinnedMessages,
    pinnedRoomIds,
    cyclePinnedMessage,
    refreshRooms,
    removeMessage,
    removeRoom,
    replyingTo,
    rooms,
    selectedMessageIds,
    selectionMode,
    setActiveRoom,
    setHelpers,
    setMessages,
    setTypingUsers,
    sortedRooms,
    toggleMuteRoom,
    togglePinRoom,
    toggleSelection,
    totalUnread,
    typing,
    unpinMessage,
    updateMessageContent,
    updateMessageId,
    updateMessageStatus,
  };
});
