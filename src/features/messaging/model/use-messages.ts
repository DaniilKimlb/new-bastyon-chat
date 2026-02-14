import { useChatStore, MessageStatus, MessageType } from "@/entities/chat";
import { useAuthStore } from "@/entities/auth";
import { getMatrixClientService } from "@/entities/matrix";
import type { PcryptoRoomInstance } from "@/entities/matrix/model/matrix-crypto";

import type { Message } from "@/entities/chat";

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
    sendMessage,
    setTyping,
  };
}
