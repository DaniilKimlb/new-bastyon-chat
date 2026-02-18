import { useChatStore, MessageStatus, MessageType } from "@/entities/chat";
import type { FileInfo, Message } from "@/entities/chat";
import { useAuthStore } from "@/entities/auth";
import { getMatrixClientService } from "@/entities/matrix";
import type { PcryptoRoomInstance } from "@/entities/matrix/model/matrix-crypto";

export function useMessages() {
  const chatStore = useChatStore();
  const authStore = useAuthStore();

  const sendMessage = async (content: string) => {
    const roomId = chatStore.activeRoomId;
    if (!roomId || !content.trim()) return;

    const matrixService = getMatrixClientService();
    if (!matrixService.isReady()) return;

    const trimmed = content.trim();

    // Optimistic message
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const message: Message = {
      id: tempId,
      roomId,
      senderId: authStore.address ?? "",
      content: trimmed,
      timestamp: Date.now(),
      status: MessageStatus.sending,
      type: MessageType.text,
    };
    chatStore.addMessage(roomId, message);

    try {
      // Check if room has encryption
      const roomCrypto = authStore.pcrypto?.rooms[roomId] as PcryptoRoomInstance | undefined;

      if (roomCrypto?.canBeEncrypt()) {
        // Send encrypted
        const encrypted = await roomCrypto.encryptEvent(trimmed);
        await matrixService.sendEncryptedText(roomId, encrypted);
      } else {
        // Send plaintext
        await matrixService.sendText(roomId, trimmed);
      }

      chatStore.updateMessageStatus(roomId, tempId, MessageStatus.sent);
    } catch (e) {
      console.error("Failed to send message:", e);
      chatStore.updateMessageStatus(roomId, tempId, MessageStatus.failed);
    }
  };

  /** Send a file/image/video/audio message */
  const sendFile = async (file: File) => {
    const roomId = chatStore.activeRoomId;
    if (!roomId || !file) return;

    const matrixService = getMatrixClientService();
    if (!matrixService.isReady()) return;

    // Determine message type from MIME
    let msgType = MessageType.file;
    if (file.type.startsWith("image/")) msgType = MessageType.image;
    else if (file.type.startsWith("video/")) msgType = MessageType.video;
    else if (file.type.startsWith("audio/")) msgType = MessageType.audio;

    // Optimistic message
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const message: Message = {
      id: tempId,
      roomId,
      senderId: authStore.address ?? "",
      content: file.name,
      timestamp: Date.now(),
      status: MessageStatus.sending,
      type: msgType,
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size,
        url: "",
      },
    };
    chatStore.addMessage(roomId, message);

    try {
      const roomCrypto = authStore.pcrypto?.rooms[roomId] as PcryptoRoomInstance | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileInfo: Record<string, any> = {
        name: file.name,
        type: file.type,
        size: file.size,
      };

      let fileToUpload: Blob = file;

      // Encrypt the file if room has encryption
      if (roomCrypto?.canBeEncrypt()) {
        const encrypted = await roomCrypto.encryptFile(file);
        fileInfo.secrets = encrypted.secrets;
        fileToUpload = encrypted.file;
      }

      // Upload to Matrix server
      const url = await matrixService.uploadContent(fileToUpload);
      fileInfo.url = url;

      // Send as m.file event with body = JSON of fileInfo
      // (This is the bastyon-chat format for all file types)
      const body = JSON.stringify(fileInfo);
      await matrixService.sendEncryptedText(roomId, {
        body,
        msgtype: "m.file",
      });

      chatStore.updateMessageStatus(roomId, tempId, MessageStatus.sent);
    } catch (e) {
      console.error("Failed to send file:", e);
      chatStore.updateMessageStatus(roomId, tempId, MessageStatus.failed);
    }
  };

  const loadMessages = async (roomId: string) => {
    await chatStore.loadRoomMessages(roomId);
  };

  /** Set typing indicator */
  const setTyping = (isTyping: boolean) => {
    const roomId = chatStore.activeRoomId;
    if (!roomId) return;
    const matrixService = getMatrixClientService();
    matrixService.setTyping(roomId, isTyping);
  };

  /** Toggle a reaction on a message: sends if not reacted, redacts if already reacted */
  const toggleReaction = async (messageId: string, emoji: string) => {
    const roomId = chatStore.activeRoomId;
    if (!roomId) return;

    const matrixService = getMatrixClientService();
    if (!matrixService.isReady()) return;

    // Check if we already reacted with this emoji
    const roomMessages = chatStore.messages[roomId] ?? [];
    const msg = roomMessages.find(m => m.id === messageId);
    const existing = msg?.reactions?.[emoji];

    try {
      if (existing?.myEventId) {
        // Remove reaction by redacting
        await matrixService.redactEvent(roomId, existing.myEventId);
      } else {
        // Send reaction
        await matrixService.sendReaction(roomId, messageId, emoji);
      }
    } catch (e) {
      console.error("Failed to toggle reaction:", e);
    }
  };

  /** Send message with reply context */
  const sendReply = async (content: string) => {
    const roomId = chatStore.activeRoomId;
    const replyTo = chatStore.replyingTo;
    if (!roomId || !content.trim() || !replyTo) return;

    const matrixService = getMatrixClientService();
    if (!matrixService.isReady()) return;

    const trimmed = content.trim();

    // Optimistic message
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const message: Message = {
      id: tempId,
      roomId,
      senderId: authStore.address ?? "",
      content: trimmed,
      timestamp: Date.now(),
      status: MessageStatus.sending,
      type: MessageType.text,
      replyTo: {
        id: replyTo.id,
        senderId: replyTo.senderId,
        content: replyTo.content,
      },
    };
    chatStore.addMessage(roomId, message);
    chatStore.replyingTo = null;

    try {
      const roomCrypto = authStore.pcrypto?.rooms[roomId] as PcryptoRoomInstance | undefined;

      const msgContent: Record<string, unknown> = {
        body: trimmed,
        msgtype: "m.text",
        "m.relates_to": {
          "m.in_reply_to": {
            event_id: replyTo.id,
          },
        },
      };

      if (roomCrypto?.canBeEncrypt()) {
        const encrypted = await roomCrypto.encryptEvent(trimmed);
        // Merge reply relation into encrypted content
        const encContent = { ...encrypted, "m.relates_to": msgContent["m.relates_to"] };
        await matrixService.sendEncryptedText(roomId, encContent);
      } else {
        await matrixService.sendEncryptedText(roomId, msgContent);
      }

      chatStore.updateMessageStatus(roomId, tempId, MessageStatus.sent);
    } catch (e) {
      console.error("Failed to send reply:", e);
      chatStore.updateMessageStatus(roomId, tempId, MessageStatus.failed);
    }
  };

  /** Edit an existing message (Matrix m.replace relation) */
  const editMessage = async (messageId: string, newContent: string) => {
    const roomId = chatStore.activeRoomId;
    if (!roomId || !newContent.trim()) return;

    const matrixService = getMatrixClientService();
    if (!matrixService.isReady()) return;

    const trimmed = newContent.trim();

    try {
      const roomCrypto = authStore.pcrypto?.rooms[roomId] as PcryptoRoomInstance | undefined;

      const editContent: Record<string, unknown> = {
        body: `* ${trimmed}`,
        msgtype: "m.text",
        "m.new_content": {
          body: trimmed,
          msgtype: "m.text",
        },
        "m.relates_to": {
          rel_type: "m.replace",
          event_id: messageId,
        },
      };

      if (roomCrypto?.canBeEncrypt()) {
        const encrypted = await roomCrypto.encryptEvent(trimmed);
        const encContent = {
          ...encrypted,
          "m.new_content": { body: trimmed, msgtype: "m.text" },
          "m.relates_to": editContent["m.relates_to"],
        };
        await matrixService.sendEncryptedText(roomId, encContent);
      } else {
        await matrixService.sendEncryptedText(roomId, editContent);
      }

      // Update local message
      chatStore.updateMessageContent(roomId, messageId, trimmed);
    } catch (e) {
      console.error("Failed to edit message:", e);
    }
  };

  /** Delete a message */
  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    const roomId = chatStore.activeRoomId;
    if (!roomId) return;

    const matrixService = getMatrixClientService();
    if (!matrixService.isReady()) return;

    try {
      if (forEveryone) {
        await matrixService.redactEvent(roomId, messageId, "deleted");
      }
      chatStore.removeMessage(roomId, messageId);
    } catch (e) {
      console.error("Failed to delete message:", e);
    }
  };

  /** Forward a message to another room — handles text, files, images, audio, video */
  const forwardMessage = async (message: Message, targetRoomId: string, withSenderInfo = true) => {
    const matrixService = getMatrixClientService();
    if (!matrixService.isReady()) return;

    try {
      const roomCrypto = authStore.pcrypto?.rooms[targetRoomId] as PcryptoRoomInstance | undefined;

      const forwardMeta: Record<string, unknown> | undefined = withSenderInfo
        ? { sender_id: message.senderId, sender_name: message.senderId }
        : undefined;

      // Forward file/media messages by re-sending the file info
      if (message.fileInfo && message.type !== MessageType.text) {
        const fileBody: Record<string, unknown> = {
          name: message.fileInfo.name,
          type: message.fileInfo.type,
          size: message.fileInfo.size,
          url: message.fileInfo.url,
        };
        if (message.fileInfo.secrets) {
          fileBody.secrets = message.fileInfo.secrets;
        }
        if (message.fileInfo.w) fileBody.w = message.fileInfo.w;
        if (message.fileInfo.h) fileBody.h = message.fileInfo.h;

        const content: Record<string, unknown> = {
          body: JSON.stringify(fileBody),
          msgtype: "m.file",
        };
        if (forwardMeta) content["forwarded_from"] = forwardMeta;

        await matrixService.sendEncryptedText(targetRoomId, content);
        return;
      }

      // Forward text message
      const forwardContent: Record<string, unknown> = {
        body: message.content,
        msgtype: "m.text",
      };
      if (forwardMeta) forwardContent["forwarded_from"] = forwardMeta;

      if (roomCrypto?.canBeEncrypt()) {
        const encrypted = await roomCrypto.encryptEvent(message.content);
        const encContent = { ...encrypted };
        if (forwardMeta) {
          (encContent as Record<string, unknown>)["forwarded_from"] = forwardMeta;
        }
        await matrixService.sendEncryptedText(targetRoomId, encContent);
      } else {
        await matrixService.sendEncryptedText(targetRoomId, forwardContent);
      }
    } catch (e) {
      console.error("Failed to forward message:", e);
    }
  };

  return {
    deleteMessage,
    editMessage,
    forwardMessage,
    loadMessages,
    sendFile,
    sendMessage,
    sendReply,
    setTyping,
    toggleReaction,
  };
}
