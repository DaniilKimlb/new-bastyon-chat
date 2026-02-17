/**
 * Custom E2E encryption — DIRECT PORT from bastyon-chat/src/application/pcrypto.js
 *
 * Uses secp256k1 elliptic curves + AES-SIV (miscreant) for message encryption.
 * Uses AES-CBC with PBKDF2 for file encryption.
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
  Base64,
  readFile,
} from "@/shared/lib/matrix/functions";
import { createChatStorage, type ChatStorageInstance } from "@/shared/lib/matrix/chat-storage";

const salt = "PR7srzZt4EfcNb3s27grgmiG8aB9vYNV82";
const m = 12;

// secp256k1 curve order
const secp256k1CurveN = new BN(
  "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
  16
);

// ---- helpers matching original functions.js ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _arrayBufferToBase64(buffer: any): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function _base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// ---- PcryptoFile: AES-CBC file encryption (unchanged) ----

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

// ---- AES-SIV encrypt/decrypt — EXACT match of original lines 1061-1090 ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const decrypt = async function (keyData: any, { encrypted, nonce }: { encrypted: string; nonce: string }): Promise<string> {
  const key = await miscreant.SIV.importKey(keyData, "AES-SIV");

  const _encrypted = new Uint8Array(_base64ToArrayBuffer(encrypted));
  const _nonce = new Uint8Array(_base64ToArrayBuffer(nonce));

  const k = await key.open(_encrypted, _nonce);

  const decrypted = new TextDecoder().decode(k);

  return decrypted;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const encrypt = async function (text: string, keyData: any): Promise<{ encrypted: string; nonce: string }> {
  const key = await miscreant.SIV.importKey(keyData, "AES-SIV");

  const plaintext = new Uint8Array(new TextEncoder().encode(text));
  const nonce = new Uint8Array(32);

  window.crypto.getRandomValues(nonce);

  const ciphertext = await key.seal(plaintext, nonce);

  const encrypted = {
    encrypted: _arrayBufferToBase64(ciphertext.buffer),
    nonce: _arrayBufferToBase64(nonce.buffer),
  };

  return encrypted;
};

// ---- User info type ----

interface CryptoUserInfo {
  id: string;
  keys: string[];
}

// ---- PcryptoRoom interface ----

export interface PcryptoRoomInstance {
  canBeEncrypt(): boolean;
  prepare(): Promise<PcryptoRoomInstance>;
  encryptEvent(text: string): Promise<Record<string, unknown>>;
  decryptEvent(event: Record<string, unknown>): Promise<{ body: string; msgtype: string }>;
  decryptEventGroup(event: Record<string, unknown>): Promise<{ body: string; msgtype: string }>;
  encryptEventGroup(text: string): Promise<Record<string, unknown>>;
  getOrCreateCommonKey(): Promise<{ key: string; hash: string; block: number }>;
  sendCommonKey(): Promise<{ key: string; hash: string; block: number }>;
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
  currentblock = { height: 1 };
  rooms: Record<string, PcryptoRoomInstance> = {};
  private ls: ChatStorageInstance | null = null;
  private lse: ChatStorageInstance | null = null;
  private pcryptoFile = new PcryptoFile();

  // Callbacks
  private getUsersInfoCb: ((ids: string[]) => Promise<CryptoUserInfo[]>) | null = null;
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
    this.getUsersInfoCb = helpers.getUsersInfo;
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

  /**
   * DIRECT PORT of PcryptoRoom from pcrypto.js
   * Preserves original variable names, flow, and logic.
   */
  private async createPcryptoRoom(chat: Record<string, unknown>): Promise<PcryptoRoomInstance> {
    const pcrypto = this;
    const roomId = chat.roomId as string;

    // Exact same variables as original
    let users: Record<string, { id: string; life: { start: number; end?: number }[] }> = {};
    let usersinfo: Record<string, CryptoUserInfo> = {};

    const version = 2;
    const ecachekey = "e_pcrypto10_";

    // ---- getusersbytime — EXACT match of original lines 294-307 ----
    function getusersbytime(time: number): { id: string; life: { start: number; end?: number }[] }[] {
      const result: typeof users[string][] = [];
      for (const ui of Object.values(users)) {
        const l = ui.life.find(function (l) {
          if (!time) {
            if (l.start && !l.end) return true;
          } else {
            if (l.start < time && (!l.end || l.end > time)) return true;
          }
          return false;
        });
        if (l) result.push(ui);
      }
      return result;
    }

    // ---- getusersinfobytime — EXACT match of original lines 280-292 ----
    function getusersinfobytime(time: number): CryptoUserInfo[] {
      const us = getusersbytime(time);
      // _.map then _.filter(truthy) — map to usersinfo, filter out undefined
      return us.map(function (u) { return usersinfo[u.id]; }).filter(function (u) { return !!u; });
    }

    // ---- preparedUsers — EXACT match of original lines 66-86 ----
    function preparedUsers(time: number, v?: number): CryptoUserInfo[] {
      const filtered = getusersinfobytime(time).filter(function (ui) {
        return ui.keys && ui.keys.length >= m;
      });
      if (!v || v <= 1) {
        return filtered;
      }
      // v >= 2: sort by user ID (matches original sortBy u.source.id where source.id = address)
      return filtered.sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });
    }

    // ---- preparedUsersById — EXACT match of original lines 88-110 ----
    // When usersIds is provided, use ONLY those specific users (not all room members)
    function preparedUsersById(ids: string[], v?: number): CryptoUserInfo[] {
      const ui: CryptoUserInfo[] = [];
      for (const u of Object.values(users)) {
        if (ids.indexOf(u.id) > -1) {
          const info = usersinfo[u.id];
          if (info && info.keys && info.keys.length >= m) {
            ui.push(info);
          }
        }
      }
      if (!v || v <= 1) {
        return ui;
      }
      return ui.sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });
    }

    // ---- getusershistory — EXACT match of original lines 175-278 ----
    function getusershistory() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatAny = chat as any;
      const tetatet = pcrypto.getIsTetatetChat?.(chat) ?? false;

      // Collect all member state events (dedup by event_id)
      const oldState = (chatAny.oldState?.getStateEvents?.("m.room.member") ?? []) as unknown[];
      const curState = (chatAny.currentState?.getStateEvents?.("m.room.member") ?? []) as unknown[];

      const seen = new Set<string>();
      const allevents: unknown[] = [];
      for (const e of [...curState, ...oldState]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ev = (e as any)?.event;
        if (!ev) continue;
        if (seen.has(ev.event_id)) continue;
        seen.add(ev.event_id);
        allevents.push(e);
      }

      // Build history — EXACT match of original lines 183-218
      type HistoryEntry = { time: number; membership: string; id: string };
      let history: HistoryEntry[] = [];

      for (const ue of allevents) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = (ue as any).event;
        const membership = event.content.membership as string;

        if (
          membership == "invite" ||
          membership == "join" ||
          (membership == "leave" && !tetatet)
        ) {
          history.push({
            time: event.origin_server_ts || 1,
            membership: membership,
            id:
              membership == "invite"
                ? getmatrixid(event.state_key)
                : getmatrixid(event.sender),
          });
        }
      }

      // Sort by time
      history = history.sort(function (a, b) { return a.time - b.time; });

      // Build users dict — EXACT match of original lines 244-278
      users = {};

      for (const ui of history) {
        if (!users[ui.id]) {
          users[ui.id] = {
            id: ui.id,
            life: [],
          };
        }

        const l = users[ui.id].life;

        if (
          ui.membership &&
          (ui.membership == "join" || ui.membership == "invite")
        ) {
          l.push({
            start: tetatet ? 1 : ui.time,
          });
        } else {
          if (l.length && ui.membership == "leave" && !tetatet) {
            const last = l[l.length - 1];
            last.end = ui.time;
          }
        }
      }

    }

    // ---- getusersinfo — EXACT match of original lines 157-173 ----
    async function getusersinfo(): Promise<void> {
      const us = Object.values(users).map(function (uh) { return uh.id; });
      if (!pcrypto.getUsersInfoCb) return;
      const _usersinfo = await pcrypto.getUsersInfoCb(us);
      usersinfo = {};
      for (const ui of _usersinfo) {
        usersinfo[ui.id] = ui;
      }
    }

    // ---- eaa object — EXACT match of original lines 405-527 ----
    const eaa = {
      cuhash: function (users: CryptoUserInfo[], num: number, block: number): Buffer {
        const input = users.map(function (u) { return u.keys[num]; }).join("") + (block || pcrypto.currentblock.height);
        const hashHex = sha224(input).toString("hex");
        const result = pbkdf2.pbkdf2Sync(
          hashHex,
          salt,
          1,
          32,
          "sha256"
        );
        return result;
      },

      userspublics: function (time: number, block: number, usersIds: string[] | null, v: number) {
        // Original line 423: use preparedUsersById when usersIds is provided
        const _users = usersIds ? preparedUsersById(usersIds, v) : preparedUsers(time, v);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sum: Record<string, any> = {};

        for (const user of _users) {
          // Original skips self in userspublics (line 430)
          if (user.id == pcrypto.user?.userinfo?.id && _users.length > 1) {
            continue;
          }

          const publics = user.keys.map(function (key) {
            return Buffer.from(key, "hex");
          });

          sum[user.id] = eaa.points(time, block, publics, usersIds, v);
        }

        return sum;
      },

      current: function (time: number, block: number, usersIds: string[] | null, v: number) {
        const privates = pcrypto.user!.private!.map(function (key) {
          return key.private;
        });

        // toArrayLike(Buffer, 'be', 32) gives a zero-padded 32-byte big-endian Buffer
        // (toBuffer() fails in Vite because bn.js can't find Buffer in its own scope)
        const scalarBN = eaa.scalars(time, block, privates, usersIds, v);
        const buf = Buffer.from(scalarBN.toArrayLike(Uint8Array, "be", 32));

        return buf;
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scalars: function (time: number, block: number, scalars: any[], usersIds: string[] | null, v: number) {
        // Original line 458: use preparedUsersById when usersIds is provided
        const _users = usersIds ? preparedUsersById(usersIds, v) : preparedUsers(time, v);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let sum: any = null;

        for (let i = 0; i < m; i++) {
          const ch = new BN(eaa.cuhash(_users, i, block));

          const a = new BN(scalars[i], 16);

          const mul = a.mul(ch).umod(secp256k1CurveN);

          if (!i) {
            sum = mul;
          } else {
            sum = sum.add(mul).umod(secp256k1CurveN);
          }
        }

        return sum;
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      points: function (time: number, block: number, points: any[], usersIds: string[] | null, v: number) {
        // Original line 482: use preparedUsersById when usersIds is provided
        const _users = usersIds ? preparedUsersById(usersIds, v) : preparedUsers(time, v);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let sum: any = null;

        for (let i = 0; i < m; i++) {
          const ch = eaa.cuhash(_users, i, block);

          const mul = bitcoin.ecc.pointMultiply(points[i], ch, undefined, true);

          if (!i) {
            sum = mul;
          } else {
            sum = bitcoin.ecc.pointAdd(sum, mul, undefined, true);
          }
        }

        return sum;
      },

      aeskeys: function (time: number, block: number, usersIds: string[] | null, v: number) {
        const us = eaa.userspublics(time, block, usersIds, v);
        const c = eaa.current(time, block, usersIds, v);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const su: Record<string, any> = {};

        for (const [id, s] of Object.entries(us)) {
          if (id != pcrypto.user?.userinfo?.id) {
            const shared = bitcoin.ecc.pointMultiply(s, c, undefined, true);
            // pointMultiply may return Uint8Array, not Buffer — use Buffer.from for hex
            const safeHex = Buffer.from(shared).toString("hex");
            su[id] = pbkdf2.pbkdf2Sync(
              safeHex,
              salt,
              64,
              32,
              "sha512"
            );
          }
        }

        return su;
      },
    };

    // ---- usershash — match of original lines 824-839 ----
    function usershash(): string {
      const _users = preparedUsers(0, version);
      return md5(
        _users
          .map(function (user) { return user.id; })
          .filter(function (uid) { return uid && uid != pcrypto.user?.userinfo?.id; })
          .join("") + "_v13_" + version
      );
    }

    // ---- Group chat helpers (common key system) ----

    /** Find the common key state event for a user+hash */
    function getCommonKeyEvent(userid?: string, _hash?: string): unknown | undefined {
      const hash = _hash || usershash();
      const uid = userid || pcrypto.user?.userinfo?.id;
      if (!uid) return undefined;

      const state_key = "pcrypto." + uid + "." + hash;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatAny = chat as any;
      const events = chatAny.currentState?.getStateEvents?.("m.room.encryption") ?? [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found = (events as any[]).find((e: any) => {
        return e?.event?.state_key === state_key;
      });

      return found;
    }

    /** Get common key event, trying multiple senders */
    function getCommonKey(sender: string, hash: string): Record<string, unknown> | undefined {
      // Try the message sender first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let evt = getCommonKeyEvent(sender, hash) as any;
      if (evt) return evt.event;

      // Try self
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      evt = getCommonKeyEvent(undefined, hash) as any;
      if (evt) return evt.event;

      // Try all known users
      for (const uid of Object.keys(users)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        evt = getCommonKeyEvent(uid, hash) as any;
        if (evt) return evt.event;
      }

      return undefined;
    }

    // ---- Room interface ----
    const room: PcryptoRoomInstance = {
      canBeEncrypt(): boolean {
        const publicChat = pcrypto.getIsChatPublic?.(chat) ?? false;
        if (publicChat) return false;
        if (!pcrypto.user?.private || pcrypto.user.private.length !== 12) return false;
        if (!pcrypto.user.userinfo?.id || !users[pcrypto.user.userinfo.id]) return false;

        const usersinfoArray = Object.values(usersinfo);
        return usersinfoArray.length > 1 && usersinfoArray.length < 50;
      },

      async prepare(): Promise<PcryptoRoomInstance> {
        getusershistory();
        await getusersinfo();

        return room;
      },

      // ---- encryptEvent — routes to group or 1:1 path ----
      async encryptEvent(text: string): Promise<Record<string, unknown>> {
        const tetatet = pcrypto.getIsTetatetChat?.(chat) ?? false;

        // Group chats use common key + AES-CBC
        if (!tetatet) {
          return room.encryptEventGroup(text);
        }

        // 1:1 chats use per-user ECDH + AES-SIV
        const _users = preparedUsers(0, version);

        const encryptedEvent: Record<string, unknown> = {
          block: pcrypto.currentblock.height,
          version: version,
          msgtype: "m.encrypted",
          body: {} as Record<string, unknown>,
        };

        const body: Record<string, unknown> = {};
        for (let i = 0; i < _users.length; i++) {
          const user = _users[i];
          if (user.id != pcrypto.user?.userinfo?.id || _users.length <= 1) {
            body[user.id] = await room._encrypt(user.id, text, version);
          }
        }

        encryptedEvent.body = Base64.encode(JSON.stringify(body));
        return encryptedEvent;
      },

      // ---- decryptEvent — routes to group or 1:1 path ----
      async decryptEvent(event: Record<string, unknown>): Promise<{ body: string; msgtype: string }> {
        const content = event.content as Record<string, unknown>;
        if (!pcrypto.user?.userinfo) throw new Error("userinfo");

        // Group messages have a 'hash' field → use group decryption (AES-CBC)
        if (content.hash) {
          console.log("[pcrypto] decryptEvent → GROUP path, hash=%s", content.hash);
          return room.decryptEventGroup(event);
        }
        console.log("[pcrypto] decryptEvent → 1:1 path, keys: %s", Object.keys(content).join(","));

        const k = `${ecachekey}${pcrypto.user.userinfo.id}-${(content.edited as string) || (event.event_id as string)}`;

        // Check cache
        try {
          const stored = await pcrypto.lse?.get(k);
          if (stored) {
            const parsed = JSON.parse(stored as string);
            if (parsed) return parsed;
          }
        } catch { /* not cached */ }

        // Decrypt
        const sender = getmatrixid(event.sender as string);
        const me = pcrypto.user.userinfo.id;

        let keyindex: string | undefined;
        let bodyindex: string | undefined;

        // Decode Base64 body
        const bodyStr = content.body as string;
        let decoded_atob: string;
        try {
          decoded_atob = window.atob(bodyStr);
        } catch (e) {
          throw new Error("Invalid Base64 in body: " + String(e));
        }

        // Guard: if decoded string doesn't start with '{', it's not pcrypto JSON
        if (!decoded_atob.startsWith("{")) {
          throw new Error("Not pcrypto format (body is not JSON)");
        }

        let body: Record<string, unknown>;
        try {
          body = JSON.parse(decoded_atob);
        } catch (e) {
          throw new Error("Not pcrypto format (JSON parse failed): " + String(e));
        }
        const time = (event.origin_server_ts as number) || 1;
        const block = content.block as number;
        const eventVersion = content.version as number | undefined;
        const bodyKeyCount = Object.keys(body).length;

        // Check if prepared users (with valid keys) cover the body users
        const preparedBefore = preparedUsers(0, eventVersion || version);
        if (preparedBefore.length < bodyKeyCount) {
          getusershistory();
          await getusersinfo();

          // If room state is still incomplete, populate users from body keys + sender
          const preparedAfter = preparedUsers(0, eventVersion || version);
          if (preparedAfter.length < bodyKeyCount && pcrypto.getUsersInfoCb) {
            const bodyUserIds = Object.keys(body);
            const allUserIds = [...new Set([...bodyUserIds, sender])];
            for (const uid of allUserIds) {
              if (!users[uid]) {
                users[uid] = { id: uid, life: [{ start: 1 }] };
              }
            }
            await getusersinfo();
          }
        }

        if (sender == me) {
          // Find the other user's key (like _.find on object)
          for (const [i] of Object.entries(body)) {
            if (i != me) {
              keyindex = i;
              bodyindex = i;
              break;
            }
          }
        } else {
          bodyindex = me;
          keyindex = sender;
        }

        if (!bodyindex || !body[bodyindex]) {
          throw new Error("emptyforme");
        }

        // self.decrypt — match original lines 529-556
        const decrypted = await room._decrypt(keyindex!, body[bodyindex], time, block, null, eventVersion);

        const data = {
          body: decrypted,
          msgtype: "m.text",
        };

        pcrypto.lse?.set(k, JSON.stringify(data)).catch(() => {});

        return data;
      },

      // ---- decryptEventGroup — group messages use AES-CBC with a common key ----
      async decryptEventGroup(event: Record<string, unknown>): Promise<{ body: string; msgtype: string }> {
        if (!pcrypto.user?.userinfo) throw new Error("userinfo");

        const content = event.content as Record<string, unknown>;
        const hash = content.hash as string;
        const sender = getmatrixid(event.sender as string);

        const cacheKey = `${ecachekey}${pcrypto.user.userinfo.id}-${(content.edited as string) || (event.event_id as string)}`;

        // Check cache
        try {
          const stored = await pcrypto.lse?.get(cacheKey);
          if (stored) {
            const parsed = JSON.parse(stored as string);
            if (parsed) return parsed;
          }
        } catch { /* not cached */ }

        // Find the common key state event
        console.log("[pcrypto] decryptEventGroup: sender=%s hash=%s", sender?.slice(0, 16), hash);
        const commonKeyEvt = getCommonKey(sender, hash);
        if (!commonKeyEvt) {
          // Debug: list all encryption state events to understand what's available
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chatAny = chat as any;
          const allEncEvents = chatAny.currentState?.getStateEvents?.("m.room.encryption") ?? [];
          console.error("[pcrypto] No common key found. Available state events (%d):", allEncEvents.length);
          for (const e of (allEncEvents as any[]).slice(0, 10)) {
            console.error("  state_key=%s hash=%s", e?.event?.state_key, e?.event?.content?.hash);
          }
          throw new Error("No common key event found for hash=" + hash);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ckContent = (commonKeyEvt as any).content;
        console.log("[pcrypto] decryptEventGroup: commonKey event: block=%s version=%s keysLen=%d sender=%s",
          ckContent?.block, ckContent?.version, (ckContent?.keys as string)?.length,
          getmatrixid((commonKeyEvt as any).sender));

        // Decrypt the common key (AES-SIV per-user encrypted key)
        let commonKey: string;
        try {
          commonKey = await room.decryptKey(commonKeyEvt);
        } catch (e) {
          console.error("[pcrypto] decryptEventGroup: decryptKey FAILED:", e);
          throw e;
        }
        console.log("[pcrypto] decryptEventGroup: common key decrypted OK, length=%d", commonKey?.length);

        // Decrypt message body (hex-encoded AES-CBC ciphertext)
        const bodyHex = content.body as string;
        const bodyBytes = Buffer.from(bodyHex, "hex");
        let decryptedBuffer: ArrayBuffer;
        try {
          decryptedBuffer = await pcrypto.pcryptoFile.decrypt(bodyBytes.buffer, commonKey);
        } catch (e) {
          console.error("[pcrypto] decryptEventGroup: AES-CBC decrypt FAILED:", e);
          throw e;
        }

        const dec = new TextDecoder();
        const data = {
          body: dec.decode(new Uint8Array(decryptedBuffer)),
          msgtype: "m.text",
        };
        pcrypto.lse?.set(cacheKey, JSON.stringify(data)).catch(() => {});

        return data;
      },

      // ---- encryptEventGroup — group encryption with common key + AES-CBC ----
      async encryptEventGroup(text: string): Promise<Record<string, unknown>> {
        // Get or create the common key for this room
        const info = await room.getOrCreateCommonKey();

        const encryptedEvent: Record<string, unknown> = {
          msgtype: "m.encrypted",
          body: {},
          block: info.block,
          hash: info.hash,
        };

        const utf8Encode = new TextEncoder();
        const encrypted = await pcrypto.pcryptoFile.encrypt(utf8Encode.encode(text).buffer, info.key);

        encryptedEvent.body = Buffer.from(encrypted).toString("hex");

        return encryptedEvent;
      },

      // ---- getOrCreateCommonKey — find or create group common key ----
      async getOrCreateCommonKey(): Promise<{ key: string; hash: string; block: number }> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ce = getCommonKeyEvent() as any;

        if (ce) {
          const evt = ce.event;
          const key = await room.decryptKey(evt);
          return {
            key,
            hash: evt.content.hash as string,
            block: evt.content.block as number,
          };
        }

        // Need to create a new common key
        return room.sendCommonKey();
      },

      // ---- sendCommonKey — create and send a new common key as state event ----
      async sendCommonKey(): Promise<{ key: string; hash: string; block: number }> {
        const hash = usershash();
        const secret = await pcrypto.pcryptoFile.randomKey();
        const encrypted = await room.encryptKey(secret);

        // Send as state event (requires matrix client access)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chatAny = chat as any;
        const matrixClient = chatAny.client;
        if (!matrixClient?.sendStateEvent) {
          throw new Error("Cannot send state event: no matrix client access");
        }

        const stateContent = {
          hash,
          keys: encrypted.keys,
          block: encrypted.block,
          version: version,
        };

        const stateKey = "pcrypto." + pcrypto.user!.userinfo!.id + "." + hash;
        await matrixClient.sendStateEvent(roomId, "m.room.encryption", stateContent, stateKey);

        return {
          key: secret,
          hash,
          block: encrypted.block,
        };
      },

      // Internal decrypt — EXACT match of original self.decrypt (lines 529-556)
      // Original: aeskeysls normalizes time/block, then tries once and throws on failure
      async _decrypt(
        userid: string,
        encData: { encrypted: string; nonce: string },
        time: number,
        block: number,
        usersIds: string[] | null,
        v: number | undefined
      ): Promise<string> {
        // aeskeysls normalization (original lines 352-362)
        let _time = time;
        let _block = block;
        if (!_time) _time = 0;
        if (!_block) {
          const tetatet = pcrypto.getIsTetatetChat?.(chat) ?? false;
          _block = tetatet ? pcrypto.currentblock.height : 10;
        }

        const keys = eaa.aeskeys(_time, _block, usersIds, v || version);

        if (keys[userid]) {
          return await decrypt(keys[userid], encData);
        }

        throw new Error("emptykey");
      },

      // Internal encrypt — match original self.encrypt (lines 558-572)
      async _encrypt(
        userid: string,
        text: string,
        v?: number
      ): Promise<{ encrypted: string; nonce: string }> {
        let _time = 0;
        let _block: number;
        const tetatet = pcrypto.getIsTetatetChat?.(chat) ?? false;
        if (!tetatet) {
          _block = 10;
        } else {
          _block = pcrypto.currentblock.height;
        }

        const keys = eaa.aeskeys(_time, _block, null, v || version);

        if (keys[userid]) {
          return await encrypt(text, keys[userid]);
        }

        throw new Error("emptykey");
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
        const _users = preparedUsers(0, version);
        const tetatet = pcrypto.getIsTetatetChat?.(chat) ?? false;
        let block = pcrypto.currentblock.height;
        if (!tetatet) block = 10;

        const encrypted: Record<string, unknown> = {};
        for (let i = 0; i < _users.length; i++) {
          const user = _users[i];
          if (user.id != pcrypto.user?.userinfo?.id || _users.length <= 1) {
            encrypted[user.id] = await room._encrypt(user.id, key, version);
          }
        }

        return {
          block,
          keys: Base64.encode(JSON.stringify(encrypted)),
          v: version
        };
      },

      async decryptKey(event: Record<string, unknown>): Promise<string> {
        if (!pcrypto.user?.userinfo) throw new Error("userinfo");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = event.content as any;
        const eventType = event.type as string | undefined;

        let secrets: string;
        let block: number;
        let v: number | undefined;

        // Match original: different extraction for m.room.encryption vs file events
        if (eventType === "m.room.encryption") {
          secrets = content.keys;
          block = content.block;
          v = content.version || 1;
        } else {
          secrets = content.keys ?? content.info?.secrets?.keys ?? content.pbody?.secrets?.keys;
          block = content.block ?? content.info?.secrets?.block ?? content.pbody?.secrets?.block;
          v = content.version ?? content.info?.secrets?.v ?? content.pbody?.secrets?.v ?? 1;
        }

        if (!secrets || !block) {
          console.error("[pcrypto] decryptKey: missing secrets=%s block=%s", !!secrets, block);
          throw new Error("Missing secrets or block");
        }

        const sender = getmatrixid(event.sender as string);
        const me = pcrypto.user.userinfo.id;
        const body = JSON.parse(Base64.decode(secrets));
        const time = (event.origin_server_ts as number) || 1;

        // Build users list from body keys + sender (matches original lines 757-762)
        const bodyUsers = Object.keys(body);
        const usersList = [...new Set([...bodyUsers, sender])];

        console.log("[pcrypto] decryptKey: type=%s sender=%s me=%s block=%d v=%s bodyKeys=%s time=%d",
          eventType, sender?.slice(0, 16), me?.slice(0, 16), block, v,
          bodyUsers.map(k => k.slice(0, 12)).join(","), time);

        // Check if prepared users (with valid 12+ keys) cover the body users
        const preparedBefore = preparedUsers(0, v || version);
        if (preparedBefore.length < bodyUsers.length) {
          // First try normal re-prepare from room state events
          getusershistory();
          await getusersinfo();

          // If room state is still incomplete (e.g. member events not fully loaded),
          // directly populate users dict from the body keys + sender
          const preparedAfter = preparedUsers(0, v || version);
          if (preparedAfter.length < bodyUsers.length && pcrypto.getUsersInfoCb) {
            console.log("[pcrypto] decryptKey: room state incomplete (prepared=%d, body=%d), fetching users directly",
              preparedAfter.length, bodyUsers.length);
            // Add all body users + sender to the users dict with open-ended life
            for (const uid of usersList) {
              if (!users[uid]) {
                users[uid] = { id: uid, life: [{ start: 1 }] };
              }
            }
            await getusersinfo();
          }
        }

        let keyindex: string | undefined;
        let bodyindex: string | undefined;

        if (sender == me) {
          for (const [i] of Object.entries(body)) {
            if (i != me) {
              keyindex = i;
              bodyindex = i;
              break;
            }
          }
        } else {
          bodyindex = me;
          keyindex = sender;
        }

        if (!bodyindex || !body[bodyindex]) {
          console.error("[pcrypto] decryptKey: emptyforme — bodyindex=%s hasMeInBody=%s sender=%s",
            bodyindex, !!body[me], sender?.slice(0, 16));
          throw new Error("emptyforme");
        }

        console.log("[pcrypto] decryptKey: keyindex=%s bodyindex=%s → calling _decrypt",
          keyindex?.slice(0, 16), bodyindex?.slice(0, 16));

        // Pass usersList to _decrypt (matches original which passes users array)
        return room._decrypt(keyindex!, body[bodyindex], time, block, usersList, v);
      },

      clear() {
        users = {};
        usersinfo = {};
      },

      destroy() {
        room.clear();
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as PcryptoRoomInstance & { _decrypt: any; _encrypt: any };

    return room;
  }

  setBlock(block: { height: number }) {
    if (block.height > this.currentblock.height) {
      this.currentblock = block;
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
