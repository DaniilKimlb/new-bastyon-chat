/**
 * Custom E2E encryption — adapted from bastyon-chat/src/application/pcrypto.js
 *
 * Uses secp256k1 elliptic curves + AES-SIV (miscreant) for message encryption.
 * Uses AES-CBC with PBKDF2 for file encryption.
 *
 * This is a TypeScript adaptation of the original Bastyon custom encryption
 * (NOT standard Matrix encryption).
 */

import * as miscreant from "miscreant";
// @ts-expect-error — no types for pbkdf2
import pbkdf2 from "pbkdf2";
// @ts-expect-error — no types for bn.js default export
import BN from "bn.js";

import {
  sha224,
  md5,
  getmatrixid,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  Base64,
  readFile,
} from "@/shared/lib/matrix/functions";
import { createChatStorage, type ChatStorageInstance } from "@/shared/lib/matrix/chat-storage";

const SALT = "PR7srzZt4EfcNb3s27grgmiG8aB9vYNV82";
const KEY_COUNT = 12;

// secp256k1 curve order
const secp256k1CurveN = new BN(
  "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
  16
);

// ---- PcryptoFile: AES-CBC file encryption ----

class PcryptoFile {
  private iv = new Uint8Array([19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34]);

  async randomKey(): Promise<string> {
    const array = new Uint32Array(24);
    return window.crypto.getRandomValues(array).toString();
  }

  async deriveKey(str: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(str),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode("matrix.pocketnet"), iterations: 10000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-CBC", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async encrypt(data: ArrayBuffer, secret: string): Promise<ArrayBuffer> {
    const key = await this.deriveKey(secret);
    return crypto.subtle.encrypt({ name: "AES-CBC", iv: this.iv }, key, data);
  }

  async decrypt(data: ArrayBuffer, secret: string): Promise<ArrayBuffer> {
    const key = await this.deriveKey(secret);
    return crypto.subtle.decrypt({ name: "AES-CBC", iv: this.iv }, key, data);
  }

  async encryptFile(file: Blob, secret: string): Promise<File> {
    const buffer = await readFile(file);
    const encrypted = await this.encrypt(buffer, secret);
    return new File([encrypted], "encrypted", { type: "encrypted/" + file.type });
  }

  async decryptFile(file: Blob, secret: string): Promise<File> {
    const buffer = await readFile(file);
    const decrypted = await this.decrypt(buffer, secret);
    return new File([decrypted], "decrypted", { type: file.type.replace("encrypted/", "") });
  }
}

// ---- AES-SIV encryption for text messages ----

async function aesDecrypt(
  keyData: Uint8Array,
  data: { encrypted: string; nonce: string }
): Promise<string> {
  const key = await miscreant.SIV.importKey(keyData, "AES-SIV");
  const encrypted = new Uint8Array(base64ToArrayBuffer(data.encrypted));
  const nonce = new Uint8Array(base64ToArrayBuffer(data.nonce));
  const decrypted = await key.open(encrypted, [nonce]);
  return new TextDecoder().decode(decrypted);
}

async function aesEncrypt(
  text: string,
  keyData: Uint8Array
): Promise<{ encrypted: string; nonce: string }> {
  const key = await miscreant.SIV.importKey(keyData, "AES-SIV");
  const plaintext = new Uint8Array(new TextEncoder().encode(text));
  const nonce = new Uint8Array(32);
  window.crypto.getRandomValues(nonce);
  const ciphertext = await key.seal(plaintext, [nonce]);
  return {
    encrypted: arrayBufferToBase64(ciphertext),
    nonce: arrayBufferToBase64(nonce)
  };
}

// ---- User info type for crypto ----

interface CryptoUserInfo {
  id: string;
  keys: string[];
  source?: { id: string };
}

// ---- PcryptoRoom: per-room crypto state ----

export interface PcryptoRoomInstance {
  canBeEncrypt(): boolean;
  prepare(): Promise<PcryptoRoomInstance>;
  encryptEvent(text: string): Promise<Record<string, unknown>>;
  decryptEvent(event: Record<string, unknown>): Promise<{ body: string; msgtype: string }>;
  encryptFile(file: Blob): Promise<{ file: File; secrets: Record<string, unknown> }>;
  decryptFile(file: Blob, secret: string): Promise<File>;
  encryptKey(key: string): Promise<{ block: number; keys: string; v: number }>;
  decryptKey(event: Record<string, unknown>): Promise<string>;
  clear(): void;
  destroy(): void;
}

// ---- Main Pcrypto class ----

export interface UserWithPrivateKeys {
  userinfo: { id: string; keys?: string[] } | null;
  private: Array<{ pair: unknown; public: string; private: Buffer }> | null;
}

export class Pcrypto {
  private user: UserWithPrivateKeys | null = null;
  currentBlock = { height: 1 };
  rooms: Record<string, PcryptoRoomInstance> = {};
  private ls: ChatStorageInstance | null = null;
  private lse: ChatStorageInstance | null = null;
  private pcryptoFile = new PcryptoFile();

  // Callbacks to resolve user info
  private getUsersInfo: ((ids: string[]) => Promise<CryptoUserInfo[]>) | null = null;
  private getIsTetatetChat: ((room: unknown) => boolean) | null = null;
  private getIsChatPublic: ((room: unknown) => boolean) | null = null;
  private getMatrixId: ((id: string) => string) | null = null;

  init(user: UserWithPrivateKeys) {
    this.user = user;
  }

  setHelpers(helpers: {
    getUsersInfo: (ids: string[]) => Promise<CryptoUserInfo[]>;
    isTetatetChat: (room: unknown) => boolean;
    isChatPublic: (room: unknown) => boolean;
    matrixId: (id: string) => string;
  }) {
    this.getUsersInfo = helpers.getUsersInfo;
    this.getIsTetatetChat = helpers.isTetatetChat;
    this.getIsChatPublic = helpers.isChatPublic;
    this.getMatrixId = helpers.matrixId;
  }

  async prepare(): Promise<void> {
    try {
      const [ls, lse] = await Promise.all([
        createChatStorage("messages", 1),
        createChatStorage("events", 1)
      ]);
      this.ls = ls;
      this.lse = lse;
    } catch (e) {
      console.error("Pcrypto storage init error:", e);
    }
  }

  async addRoom(chat: Record<string, unknown>): Promise<PcryptoRoomInstance> {
    const roomId = chat.roomId as string;

    if (this.rooms[roomId]) {
      return this.rooms[roomId].prepare();
    }

    const room = await this.createPcryptoRoom(chat);
    this.rooms[roomId] = room;
    return room.prepare();
  }

  private async createPcryptoRoom(chat: Record<string, unknown>): Promise<PcryptoRoomInstance> {
    const pcrypto = this;
    const roomId = chat.roomId as string;
    let users: Record<string, { id: string; life: { start: number; end?: number }[] }> = {};
    let usersInfo: Record<string, CryptoUserInfo> = {};

    const lcachekey = "pcrypto9_" + roomId + "_";
    const ecachekey = "e_pcrypto9_";
    const version = 2;

    // ---- helpers ----
    function getPreparedUsers(): CryptoUserInfo[] {
      const result: CryptoUserInfo[] = [];
      for (const u of Object.values(usersInfo)) {
        if (u.keys && u.keys.length >= KEY_COUNT) result.push(u);
      }
      return result.sort((a, b) => (a.source?.id ?? a.id).localeCompare(b.source?.id ?? b.id));
    }

    function getUsersHistory() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatAny = chat as any;
      const oldEvents = (chatAny.oldState?.getStateEvents?.("m.room.member") ?? []) as unknown[];
      const curEvents = (chatAny.currentState?.getStateEvents?.("m.room.member") ?? []) as unknown[];
      console.log("[pcrypto] getUsersHistory: oldState=%d, currentState=%d events", oldEvents.length, curEvents.length);
      const stateEvents = [...oldEvents, ...curEvents];

      const isTetatet = pcrypto.getIsTetatetChat?.(chat) ?? false;
      const seen = new Set<string>();
      const history: { time: number; membership: string; id: string }[] = [];

      for (const ue of stateEvents) {
        const ev = (ue as Record<string, unknown>).event as Record<string, unknown>;
        if (!ev) continue;
        const eventId = ev.event_id as string;
        if (seen.has(eventId)) continue;
        seen.add(eventId);

        const content = ev.content as Record<string, unknown>;
        const membership = content.membership as string;

        if (membership === "invite" || membership === "join" || (membership === "leave" && !isTetatet)) {
          history.push({
            time: (ev.origin_server_ts as number) || 1,
            membership,
            id: membership === "invite"
              ? getmatrixid(ev.state_key as string)
              : getmatrixid(ev.sender as string)
          });
        }
      }

      history.sort((a, b) => a.time - b.time);

      users = {};
      for (const h of history) {
        if (!users[h.id]) users[h.id] = { id: h.id, life: [] };
        const life = users[h.id].life;
        if (h.membership === "join" || h.membership === "invite") {
          life.push({ start: isTetatet ? 1 : h.time });
        } else if (h.membership === "leave" && life.length && !isTetatet) {
          const last = life[life.length - 1];
          last.end = h.time;
        }
      }
    }

    async function fetchUsersInfo(): Promise<void> {
      const ids = Object.values(users).map((u) => u.id);
      if (!pcrypto.getUsersInfo) return;
      const infos = await pcrypto.getUsersInfo(ids);
      usersInfo = {};
      for (const ui of infos) {
        usersInfo[ui.id] = ui;
      }
    }

    // ---- AES key derivation ----
    function cuhash(preparedUsers: CryptoUserInfo[], num: number, block: number): Buffer {
      const keyConcat = preparedUsers.map((u) => u.keys[num]).join("");
      return pbkdf2.pbkdf2Sync(
        sha224(keyConcat + block).toString("hex"),
        SALT,
        1,
        32,
        "sha256"
      );
    }

    function computeScalars(block: number): typeof BN {
      const preparedUsers = getPreparedUsers();
      if (!pcrypto.user?.private) throw new Error("No private keys");
      const privates = pcrypto.user.private.map((k) => k.private);

      let sum: typeof BN | null = null;
      for (let i = 0; i < KEY_COUNT; i++) {
        const ch = new BN(cuhash(preparedUsers, i, block));
        const a = new BN(privates[i]);
        const mul = a.mul(ch).umod(secp256k1CurveN);
        sum = !sum ? mul : sum.add(mul).umod(secp256k1CurveN);
      }
      return sum;
    }

    function computePublicPoints(userId: string, block: number): Buffer {
      const preparedUsers = getPreparedUsers();
      const user = usersInfo[userId];
      if (!user) throw new Error("User not found: " + userId);

      const publics = user.keys.map((k) => Buffer.from(k, "hex"));
      let sum: Buffer | null = null;

      for (let i = 0; i < KEY_COUNT; i++) {
        const ch = cuhash(preparedUsers, i, block);
        // Wrap in Buffer.from() — bitcoin.ecc may return Uint8Array instead of Buffer
        const mul = Buffer.from(bitcoin.ecc.pointMultiply(publics[i], ch, undefined, true));
        sum = !sum ? mul : Buffer.from(bitcoin.ecc.pointAdd(sum, mul, undefined, true));
      }
      return sum!;
    }

    function computeAesKey(userId: string, block: number): Uint8Array {
      const publicPoint = computePublicPoints(userId, block);
      const scalar = computeScalars(block);
      // Zero-padded big-endian 32-byte buffer (matches original's s.toBuffer("be", 32))
      const buf = scalar.toArrayLike(Buffer, "be", 32);

      // Wrap in Buffer.from() — bitcoin.ecc may return Uint8Array
      const shared = Buffer.from(bitcoin.ecc.pointMultiply(publicPoint, buf, undefined, true));
      return pbkdf2.pbkdf2Sync(shared.toString("hex"), SALT, 64, 32, "sha512");
    }

    function computeAesKeys(block: number): Record<string, Uint8Array> {
      const preparedUsers = getPreparedUsers();
      const keys: Record<string, Uint8Array> = {};
      for (const user of preparedUsers) {
        if (user.id !== pcrypto.user?.userinfo?.id) {
          keys[user.id] = computeAesKey(user.id, block);
        }
      }
      return keys;
    }

    function getBlock(): number {
      const isTetatet = pcrypto.getIsTetatetChat?.(chat) ?? false;
      return isTetatet ? pcrypto.currentBlock.height : 10;
    }

    function usershash(): string {
      const preparedUsers = getPreparedUsers();
      const ids = preparedUsers
        .map((u) => u.id)
        .filter((uid) => uid !== pcrypto.user?.userinfo?.id);
      return md5(ids.join("") + "_v12_" + version);
    }

    // ---- Room interface ----
    const room: PcryptoRoomInstance = {
      canBeEncrypt(): boolean {
        const publicChat = pcrypto.getIsChatPublic?.(chat) ?? false;
        if (publicChat) return false;
        if (!pcrypto.user?.private || pcrypto.user.private.length !== 12) return false;
        if (!pcrypto.user.userinfo?.id || !users[pcrypto.user.userinfo.id]) return false;

        const allUsers = Object.values(usersInfo);
        const prepared = getPreparedUsers();
        return allUsers.length > 1 && allUsers.length < 50 && prepared.length / allUsers.length > 0.6;
      },

      async prepare(): Promise<PcryptoRoomInstance> {
        getUsersHistory();
        const userIds = Object.keys(users);
        console.log("[pcrypto] room %s prepare: %d members found: %s", roomId, userIds.length, userIds.join(", "));
        await fetchUsersInfo();
        const prepared = getPreparedUsers();
        console.log("[pcrypto] room %s: %d usersInfo, %d prepared (need %d keys each)", roomId,
          Object.keys(usersInfo).length, prepared.length, KEY_COUNT);
        for (const u of Object.values(usersInfo)) {
          console.log("[pcrypto]   user %s: %d keys", u.id.slice(0, 16) + "...", u.keys?.length ?? 0);
        }
        console.log("[pcrypto]   me = %s", pcrypto.user?.userinfo?.id?.slice(0, 16) + "...");
        return room;
      },

      async encryptEvent(text: string): Promise<Record<string, unknown>> {
        const preparedUsers = getPreparedUsers();
        const block = getBlock();
        const keys = computeAesKeys(block);

        const body: Record<string, unknown> = {};
        for (const user of preparedUsers) {
          if (user.id !== pcrypto.user?.userinfo?.id || preparedUsers.length <= 1) {
            body[user.id] = await aesEncrypt(text, keys[user.id]);
          }
        }

        return {
          block,
          version,
          msgtype: "m.encrypted",
          body: Base64.encode(JSON.stringify(body))
        };
      },

      async decryptEvent(event: Record<string, unknown>): Promise<{ body: string; msgtype: string }> {
        const content = event.content as Record<string, unknown>;
        if (!pcrypto.user?.userinfo) throw new Error("No user info");

        // Check cached
        const cacheKey = `${ecachekey}${pcrypto.user.userinfo.id}-${(content.edited as string) || (event.event_id as string)}`;
        try {
          const cached = await pcrypto.lse?.get(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached as string);
            if (parsed) return parsed;
          }
        } catch { /* not cached */ }

        const sender = getmatrixid(event.sender as string);
        const me = pcrypto.user.userinfo.id;
        const bodyRaw = Base64.decode(content.body as string);
        const body = JSON.parse(bodyRaw);
        const block = content.block as number;
        const bodyKeys = Object.keys(body);

        let keyIndex: string;
        let bodyIndex: string;

        if (sender === me) {
          const otherKey = Object.keys(body).find((k) => k !== me);
          if (!otherKey) throw new Error("emptyforme");
          keyIndex = otherKey;
          bodyIndex = otherKey;
        } else {
          bodyIndex = me;
          keyIndex = sender;
        }

        if (!body[bodyIndex]) throw new Error("emptyforme");

        // --- Detailed step-by-step diagnostics ---
        const preparedUsers = getPreparedUsers();
        const diag: string[] = [];

        // 1. Verify sha224 works (known test vector)
        const sha224test = sha224("test").toString("hex").slice(0, 8);
        diag.push("sha:" + sha224test); // expected: "90a3ed9e"

        // 2. cuhash for i=0 fingerprint
        const ch0 = cuhash(preparedUsers, 0, block);
        diag.push("ch0:" + ch0.toString("hex").slice(0, 8));

        // 3. Check if my API-returned keys match locally generated keys
        const myApiKeys = usersInfo[me]?.keys;
        const myLocalKeys = pcrypto.user?.userinfo?.keys;
        if (myApiKeys && myLocalKeys) {
          const keysMatch = myApiKeys[0] === myLocalKeys[0];
          diag.push("kmatch:" + (keysMatch ? "Y" : "N:" + myApiKeys[0]?.slice(0, 8) + "v" + myLocalKeys[0]?.slice(0, 8)));
        } else {
          diag.push("kmatch:nodata");
        }

        // 4. Scalar fingerprint (aggregated private scalar)
        try {
          const scalar = computeScalars(block);
          const scBuf = scalar.toArrayLike(Buffer, "be", 32);
          diag.push("sc:" + scBuf.toString("hex").slice(0, 8));
        } catch (e) {
          diag.push("sc:ERR:" + String(e).slice(0, 20));
        }

        // 5. Public point fingerprint (for keyIndex user)
        try {
          const pp = computePublicPoints(keyIndex, block);
          diag.push("pp:" + pp.toString("hex").slice(0, 8));
        } catch (e) {
          diag.push("pp:ERR:" + String(e).slice(0, 20));
        }

        // 6. ECDH shared secret fingerprint
        try {
          const scalar = computeScalars(block);
          const scBuf = scalar.toArrayLike(Buffer, "be", 32);
          const pp = computePublicPoints(keyIndex, block);
          const shared = Buffer.from(bitcoin.ecc.pointMultiply(pp, scBuf, undefined, true));
          diag.push("sh:" + shared.toString("hex").slice(0, 8));
        } catch (e) {
          diag.push("sh:ERR:" + String(e).slice(0, 20));
        }

        const keys = computeAesKeys(block);
        if (!keys[keyIndex]) {
          throw new Error("No AES key | " + diag.join(" "));
        }

        const keyHex = Buffer.from(keys[keyIndex]).toString("hex");
        diag.push("aes:" + keyHex.slice(0, 8));

        // 7. bodyIndex/keyIndex info
        diag.push("bi:" + bodyIndex.slice(0, 8) + " ki:" + keyIndex.slice(0, 8));
        diag.push("blk:" + block);

        try {
          const decrypted = await aesDecrypt(keys[keyIndex], body[bodyIndex]);
          const result = { body: decrypted, msgtype: "m.text" };
          pcrypto.lse?.set(cacheKey, JSON.stringify(result)).catch(() => {});
          return result;
        } catch {
          throw new Error(diag.join(" "));
        }
      },

      async encryptFile(file: Blob): Promise<{ file: File; secrets: Record<string, unknown> }> {
        const secret = await pcrypto.pcryptoFile.randomKey();
        const secrets = await room.encryptKey(secret);
        const encryptedFile = await pcrypto.pcryptoFile.encryptFile(file as File, secret);
        return { file: encryptedFile, secrets };
      },

      async decryptFile(file: Blob, secret: string): Promise<File> {
        return pcrypto.pcryptoFile.decryptFile(file as File, secret);
      },

      async encryptKey(key: string): Promise<{ block: number; keys: string; v: number }> {
        const preparedUsers = getPreparedUsers();
        const block = getBlock();
        const aesKeys = computeAesKeys(block);

        const encrypted: Record<string, unknown> = {};
        for (const user of preparedUsers) {
          if (user.id !== pcrypto.user?.userinfo?.id || preparedUsers.length <= 1) {
            encrypted[user.id] = await aesEncrypt(key, aesKeys[user.id]);
          }
        }

        return {
          block,
          keys: Base64.encode(JSON.stringify(encrypted)),
          v: version
        };
      },

      async decryptKey(event: Record<string, unknown>): Promise<string> {
        if (!pcrypto.user?.userinfo) throw new Error("No user info");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = event.content as any;
        const secrets = (content.keys ?? content.info?.secrets?.keys ?? content.pbody?.secrets?.keys) as string;
        const block = (content.block ?? content.info?.secrets?.block ?? content.pbody?.secrets?.block) as number;

        if (!secrets || !block) throw new Error("Missing secrets or block");

        const sender = getmatrixid(event.sender as string);
        const me = pcrypto.user.userinfo.id;
        const body = JSON.parse(Base64.decode(secrets));

        let keyIndex: string;
        let bodyIndex: string;

        if (sender === me) {
          const otherKey = Object.keys(body).find((k) => k !== me);
          if (!otherKey || !body[otherKey]) throw new Error("emptyforme");
          keyIndex = otherKey;
          bodyIndex = otherKey;
        } else {
          bodyIndex = me;
          keyIndex = sender;
        }

        if (!body[bodyIndex]) throw new Error("emptyforme");

        const keys = computeAesKeys(block);
        return aesDecrypt(keys[keyIndex], body[bodyIndex]);
      },

      clear() {
        users = {};
        usersInfo = {};
      },

      destroy() {
        room.clear();
      }
    };

    return room;
  }

  setBlock(block: { height: number }) {
    if (block.height > this.currentBlock.height) {
      this.currentBlock = block;
    }
  }

  destroy() {
    for (const room of Object.values(this.rooms)) {
      room.clear();
      room.destroy();
    }
    this.rooms = {};
  }
}
