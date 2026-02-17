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

  return {
    loadMessages,
    sendFile,
    sendMessage,
    setTyping,
  };
}
