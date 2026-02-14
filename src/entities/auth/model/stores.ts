import {
  createAppInitializer,
  PocketnetInstanceConfigurator
} from "@/app/providers";
import { useChatStore } from "@/entities/chat";
import {
  getMatrixClientService,
  resetMatrixClientService,
  MatrixKit,
  Pcrypto,
} from "@/entities/matrix";
import type { UserWithPrivateKeys } from "@/entities/matrix/model/matrix-crypto";
import { getmatrixid } from "@/shared/lib/matrix/functions";
import { useLocalStorage } from "@/shared/lib/browser";
import { convertToHexString } from "@/shared/lib/convert-to-hex-string";
import { mergeObjects } from "@/shared/lib/merge-objects";
import { useAsyncOperation } from "@/shared/use";
import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import type { AuthData, UserData } from "./types";

import { getAddressFromPubKey } from "../lib";
import { createKeyPair } from "./key-pair";

const NAMESPACE = "auth";

/** Hex-encode a string: each char → 2-digit hex of its char code.
 *  Matches bastyon-chat/src/application/functions.js hexEncode() */
function hexEncode(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    let ch = text.charCodeAt(i);
    if (ch > 0xff) ch -= 0x350;
    let hex = ch.toString(16);
    while (hex.length < 2) hex = "0" + hex;
    result += hex;
  }
  return result;
}

/** Derive Matrix credentials matching original bastyon-chat:
 *  - username = hexEncode(address).toLowerCase()  (address stored hex-encoded in original)
 *  - password = SHA256(SHA256(Buffer.from(privateKey)))  (UTF-8 encoding, NOT "hex") */
function deriveMatrixCredentials(address: string, privateKey: string) {
  const passwordHash = bitcoin.crypto
    .sha256(bitcoin.crypto.sha256(Buffer.from(privateKey)))
    .toString("hex");
  return {
    username: hexEncode(address).toLowerCase(),
    password: passwordHash,
    address,
  };
}

/** Hex-decode a string: reverse of hexEncode.
 *  Matches bastyon-chat/src/application/functions.js hexDecode() */
function hexDecode(hex: string): string {
  let result = "";
  for (let i = 2; i <= hex.length; i += 2) {
    let ch = parseInt(hex.substring(i - 2, i), 16);
    if (ch >= 128) ch += 0x350;
    result += String.fromCharCode(ch);
  }
  return result;
}

/** Generate 12 BIP32 key pairs at m/33'/0'/0'/{1-12}' for Pcrypto encryption.
 *  Matches original: bitcoin.bip32.fromSeed(Buffer.from(privateKey, "hex")) */
function generateEncryptionKeys(privateKeyHex: string) {
  const key = Buffer.from(privateKeyHex, "hex");
  const root = bitcoin.bip32.fromSeed(key);

  const keys: Array<{ pair: unknown; public: string; private: Buffer }> = [];
  for (let i = 1; i <= 12; i++) {
    const child = root.derivePath(`m/33'/0'/0'/${i}'`);
    keys.push({
      pair: bitcoin.ECPair.fromPrivateKey(child.privateKey),
      public: child.publicKey.toString("hex"),
      private: child.privateKey,
    });
  }
  return keys;
}

export const useAuthStore = defineStore(NAMESPACE, () => {
  const { setLSValue: setLSAuthData, value: LSAuthData } =
    useLocalStorage<AuthData>(NAMESPACE, { address: null, privateKey: null });

  const appInitializer = createAppInitializer();

  const address = ref(LSAuthData.address);
  const privateKey = ref(LSAuthData.privateKey);
  const userInfo = ref<UserData>();

  // Matrix-related state
  const matrixReady = ref(false);
  const matrixError = ref<string | null>(null);
  const matrixKit = shallowRef<MatrixKit | null>(null);
  const pcrypto = shallowRef<Pcrypto | null>(null);

  const isAuthenticated = computed(() => !!(address.value && privateKey.value));

  const setAuthData = (authData: AuthData) => {
    address.value = authData.address;
    privateKey.value = authData.privateKey;
    setLSAuthData(authData);
  };

  const setUserInfo = (info: UserData) => {
    userInfo.value = info;
  };

  const { execute: editUserData, isLoading: isEditingUserData } =
    useAsyncOperation((userData: UserData) => {
      return appInitializer.editUserData({
        address: address.value!,
        userData: mergeObjects(userInfo.value!, userData)
      });
    });

  /** Initialize Matrix client, kit and crypto after login */
  const initMatrix = async () => {
    if (!address.value || !privateKey.value) {
      console.warn("[auth] initMatrix skipped: no credentials");
      matrixError.value = "No credentials";
      return;
    }

    console.log("[auth] initMatrix starting for", address.value);
    matrixReady.value = false;
    matrixError.value = "Initializing...";

    try {
      // Step 1: Check bitcoin global
      if (typeof bitcoin === "undefined") {
        throw new Error("bitcoin global not found — SDK scripts may not have loaded");
      }
      console.log("[auth] Step 1: bitcoin global OK");

      // Step 2: Get matrix service
      const matrixService = getMatrixClientService();
      matrixError.value = "Deriving credentials...";

      // Step 3: Derive credentials
      const credentials = deriveMatrixCredentials(address.value, privateKey.value);
      console.log("[auth] Step 3: credentials derived, user=%s", credentials.username);
      matrixService.setCredentials(credentials);

      // Step 4: Initialize MatrixKit
      matrixError.value = "Creating MatrixKit...";
      matrixKit.value = new MatrixKit(matrixService);
      console.log("[auth] Step 4: MatrixKit created");

      // Step 5: Generate encryption keys
      matrixError.value = "Generating encryption keys...";
      const encKeys = generateEncryptionKeys(privateKey.value);
      console.log("[auth] Step 5: %d encryption keys generated", encKeys.length);

      // Step 6: Init Pcrypto
      matrixError.value = "Initializing Pcrypto...";
      const cryptoInstance = new Pcrypto();
      const hexAddr = hexEncode(address.value);
      const cryptoUser: UserWithPrivateKeys = {
        userinfo: {
          id: hexAddr,
          keys: encKeys.map((k) => k.public),
        },
        private: encKeys,
      };
      cryptoInstance.init(cryptoUser);
      cryptoInstance.setHelpers({
        getUsersInfo: async (ids: string[]) => {
          // ids are hex-encoded addresses; decode to raw for Pocketnet API
          console.log("[auth] getUsersInfo called with %d ids: %s", ids.length, ids.map(id => id.slice(0, 16)).join(", "));
          try {
            const rawAddresses = ids.map((id) => hexDecode(id));
            console.log("[auth] getUsersInfo decoded addresses: %s", rawAddresses.join(", "));
            await appInitializer.loadUsersInfo(rawAddresses);
            const result = ids.map((hexId, idx) => {
              const userData = appInitializer.getUserData(rawAddresses[idx]);
              const keysRaw = userData?.keys;
              let keys: string[] = [];
              if (typeof keysRaw === "string") {
                keys = keysRaw.split(",").filter((k: string) => k);
              } else if (Array.isArray(keysRaw)) {
                keys = keysRaw;
              }
              console.log("[auth] getUsersInfo user %s: keysRaw type=%s, %d keys found", hexId.slice(0, 16), typeof keysRaw, keys.length);
              return { id: hexId, keys };
            });
            return result;
          } catch (e) {
            console.error("[auth] getUsersInfo error:", e);
            return ids.map((id) => ({ id, keys: [] as string[] }));
          }
        },
        isTetatetChat: (room: unknown) =>
          matrixKit.value?.isTetatetChat(room as Record<string, unknown>) ?? false,
        isChatPublic: (room: unknown) =>
          matrixKit.value?.chatIsPublic(room as Record<string, unknown>) ?? false,
        matrixId: (id: string) => matrixService.matrixId(id),
      });
      await cryptoInstance.prepare();
      pcrypto.value = cryptoInstance;
      console.log("[auth] Step 6: Pcrypto initialized (hexAddr=%s)", hexAddr);

      // Step 7: Wire Matrix events → chat store
      matrixError.value = "Wiring events...";
      const chatStore = useChatStore();
      chatStore.setHelpers(matrixKit.value!, cryptoInstance);

      matrixService.setHandlers({
        onSync: () => {
          chatStore.refreshRooms();
        },
        onTimeline: (event: unknown, room: unknown) => {
          chatStore.handleTimelineEvent(event, room as string);
        },
        onMembership: () => {
          chatStore.refreshRooms();
        },
        onTyping: (_event: unknown, member: unknown) => {
          const m = member as Record<string, unknown>;
          const roomId = (m.roomId as string) ?? "";
          const userId = getmatrixid((m.userId as string) ?? "");
          const isTyping = m.typing as boolean;
          if (!roomId) return;
          const current = chatStore.getTypingUsers(roomId);
          if (isTyping && !current.includes(userId)) {
            chatStore.setTypingUsers(roomId, [...current, userId]);
          } else if (!isTyping) {
            chatStore.setTypingUsers(roomId, current.filter((u) => u !== userId));
          }
        },
      });
      console.log("[auth] Step 7: events wired");

      // Step 8: Start the Matrix client (login + sync)
      matrixError.value = "Connecting to Matrix server...";
      console.log("[auth] Step 8: Starting Matrix client...");
      await matrixService.init();

      if (matrixService.isReady()) {
        console.log("[auth] Matrix client ready!");
        matrixReady.value = true;
        matrixError.value = null;
      } else {
        console.error("[auth] Matrix client NOT ready, error:", matrixService.error);
        matrixError.value = matrixService.error || "Matrix init failed";
      }
    } catch (e) {
      console.error("[auth] Matrix init error:", e);
      matrixError.value = String(e);
    }
  };

  const fetchUserInfo = async () => {
    if (!address.value || !privateKey.value) {
      console.log("[auth] fetchUserInfo skipped: no credentials");
      return;
    }
    console.log("[auth] fetchUserInfo starting for", address.value);

    await appInitializer.initializeAndFetchUserData(
      address.value,
      (userData: UserData) => {
        console.log("[auth] fetchUserInfo: user data received", userData?.name);
        setUserInfo(userData);
        PocketnetInstanceConfigurator.setUserAddress(address.value!);
        PocketnetInstanceConfigurator.setUserGetKeyPairFc(() =>
          createKeyPair(privateKey.value!)
        );
      }
    );
  };

  const { execute: login, isLoading: isLoggingIn } = useAsyncOperation(
    async (cryptoCredential: string) => {
      try {
        const keyPair = createKeyPair(cryptoCredential);
        const addr = getAddressFromPubKey(keyPair.publicKey);
        if (!addr) throw new Error("Failed to derive address");

        const authData: AuthData = {
          address: addr,
          privateKey: convertToHexString(keyPair.privateKey)
        };
        setAuthData(authData);
        await fetchUserInfo();

        // Initialize Matrix after successful auth
        await initMatrix();

        return { data: authData, error: null };
      } catch {
        return { data: null, error: "Invalid private key or mnemonic" };
      }
    }
  );

  const logout = () => {
    // Tear down Matrix
    resetMatrixClientService();
    matrixReady.value = false;
    matrixError.value = null;
    matrixKit.value = null;

    if (pcrypto.value) {
      // Destroy all room crypto instances
      for (const room of Object.values(pcrypto.value.rooms)) {
        room.destroy();
      }
      pcrypto.value = null;
    }

    setAuthData({ address: null, privateKey: null });
    userInfo.value = undefined;
  };

  return {
    address,
    editUserData,
    fetchUserInfo,
    initMatrix,
    isAuthenticated,
    isEditingUserData,
    isLoggingIn,
    login,
    logout,
    matrixError,
    matrixKit,
    matrixReady,
    pcrypto,
    privateKey,
    userInfo
  };
});
