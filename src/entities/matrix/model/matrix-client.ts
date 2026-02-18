/**
 * Matrix client service — adapted from bastyon-chat/src/application/mtrx.js
 *
 * Wraps matrix-js-sdk-bastyon and handles:
 * - Login / registration
 * - IndexedDB store
 * - Sync events (Room.timeline, RoomMember.membership, etc.)
 * - Send/receive messages
 */
import axios, { type AxiosRequestConfig } from "axios";
// @ts-expect-error — no types for qs
import qs from "qs";
import * as sdk from "matrix-js-sdk-bastyon/lib/browser-index.js";

import { MATRIX_SERVER } from "@/shared/config";
import { createChatStorage, type ChatStorageInstance } from "@/shared/lib/matrix/chat-storage";
import { getmatrixid } from "@/shared/lib/matrix/functions";

import type { MatrixCredentials, MatrixClient, MatrixSDK } from "./types";

export type SyncCallback = () => void;
export type TimelineCallback = (event: unknown, room: unknown) => void;
export type MembershipCallback = (event: unknown, member: unknown) => void;
export type TypingCallback = (event: unknown, member: unknown) => void;

export class MatrixClientService {
  private baseUrl: string;
  client: MatrixClient | null = null;
  ready = false;
  error: string | false = false;
  private credentials: MatrixCredentials | null = null;
  private chatsReady = false;
  private db: ChatStorageInstance | null = null;
  private sdk = sdk;
  store: Record<string, unknown> | null = null;

  // Event callbacks
  private onSync: SyncCallback | null = null;
  private onTimeline: TimelineCallback | null = null;
  private onMembership: MembershipCallback | null = null;
  private onTyping: TypingCallback | null = null;

  constructor(domain?: string) {
    this.baseUrl = `https://${domain ?? MATRIX_SERVER}`;
  }

  setCredentials(credentials: MatrixCredentials) {
    this.credentials = credentials;
  }

  /** Set event handlers before init */
  setHandlers(handlers: {
    onSync?: SyncCallback;
    onTimeline?: TimelineCallback;
    onMembership?: MembershipCallback;
    onTyping?: TypingCallback;
  }) {
    if (handlers.onSync) this.onSync = handlers.onSync;
    if (handlers.onTimeline) this.onTimeline = handlers.onTimeline;
    if (handlers.onMembership) this.onMembership = handlers.onMembership;
    if (handlers.onTyping) this.onTyping = handlers.onTyping;
  }

  /** Custom request function using axios (matching bastyon-chat pattern) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private request(opts: any, clbk: (err: any, response: any, body: string) => void) {
    const cancelTokenSource = axios.CancelToken.source();

    const axiosOpts: AxiosRequestConfig = {
      url: opts.uri,
      params: opts.qs,
      data: JSON.parse(opts.body || "{}"),
      timeout: opts.timeout,
      headers: opts.headers,
      method: opts.method,
      withCredentials: opts.withCredentials,
      cancelToken: cancelTokenSource.token,
      paramsSerializer: (params: unknown) => qs.stringify(params as Record<string, unknown>, opts.qsStringifyOptions)
    };

    const req = axios(axiosOpts)
      .then((response) => response)
      .catch((e) => {
        const response = e.response;
        let error = e;
        try {
          const parsed = JSON.parse(response?.request?.responseText ?? "");
          error = new sdk.MatrixError(parsed);
        } catch { /* ignore */ }
        return { __error: error, ...response };
      })
      .then((response: Record<string, unknown>) => {
        const error = response?.__error as Error | undefined;
        const body = (response?.request as Record<string, unknown>)?.responseText ?? "";
        clbk(error ?? null, response, body as string);
      }) as unknown as { abort: () => void };

    (req as unknown as Record<string, unknown>).abort = () => cancelTokenSource.cancel();
    return req;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createMtrxClient(opts: any): MatrixClient {
    const client = sdk.createClient(opts);
    // Override getProfileInfo to avoid unnecessary calls
    client.getProfileInfo = () => Promise.resolve({ avatar_url: "", displayname: "" });
    return client;
  }

  /** Main login/register + start client flow */
  async getClient(): Promise<MatrixClient | null> {
    if (!this.credentials) throw new Error("No credentials set");

    const opts: Record<string, unknown> = {
      baseUrl: this.baseUrl,
      request: this.request.bind(this)
    };

    const client = this.createMtrxClient(opts);

    let userData;
    try {
      userData = await client.login("m.login.password", {
        user: this.credentials.username,
        password: this.credentials.password
      });
    } catch (e: unknown) {
      const errStr = typeof e === "string" ? e : (e as Error)?.message ?? "";
      if (errStr.indexOf("M_USER_DEACTIVATED") > -1) {
        this.error = "M_USER_DEACTIVATED";
        return null;
      }
      // Try to register
      try {
        if (await client.isUsernameAvailable(this.credentials.username)) {
          userData = await client.register(
            this.credentials.username,
            this.credentials.password,
            null,
            { type: "m.login.dummy" }
          );
        } else {
          throw new Error("Signup error, username is not available: " + errStr);
        }
      } catch (regErr) {
        throw regErr;
      }
    }

    localStorage.accessToken = userData.access_token;

    const indexedDBStore = new sdk.IndexedDBStore({
      indexedDB: window.indexedDB,
      dbName: "matrix-js-sdk-v6:" + this.credentials.username,
      localStorage: window.localStorage
    });

    const userClientData: Record<string, unknown> = {
      baseUrl: this.baseUrl,
      userId: userData.user_id,
      accessToken: userData.access_token,
      unstableClientRelationAggregation: true,
      timelineSupport: true,
      store: indexedDBStore,
      deviceId: userData.device_id,
      request: this.request.bind(this)
    };

    const userClient = this.createMtrxClient(userClientData);

    try {
      await indexedDBStore.startup();
    } catch (e) {
      console.error("Matrix IndexedDB startup error:", e);
    }

    this.client = userClient;
    this.initEvents();

    await userClient.startClient({
      pollTimeout: 60000,
      resolveInvitesToProfiles: true,
      initialSyncLimit: 20,
      disablePresence: true
    });

    return userClient;
  }

  private initEvents() {
    if (!this.client) return;

    const userId = this.client.credentials?.userId;

    this.client.on("RoomMember.membership", (event: unknown, member: unknown) => {
      if (!this.chatsReady) return;
      this.onMembership?.(event, member);
    });

    this.client.on("Room.timeline", (message: unknown, _room: unknown, toStartOfTimeline: unknown) => {
      if (!this.chatsReady) return;
      // Ignore events added to start of timeline (from pagination)
      if (toStartOfTimeline) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = message as any;
      if (!msg?.event?.content) return;

      // Parse file body
      if (msg.event.content.msgtype === "m.file") {
        try { msg.event.content.pbody = JSON.parse(msg.event.content.body); } catch { /* ignore */ }
      }

      // Pass reaction events from anyone (including self) for local update
      if (msg.event.type === "m.reaction") {
        this.onTimeline?.(message, msg.event.room_id);
        return;
      }

      if (msg.getSender() !== userId) {
        this.onTimeline?.(message, msg.event.room_id);
      }
    });

    this.client.on("RoomMember.typing", (event: unknown, member: unknown) => {
      this.onTyping?.(event, member);
    });

    this.client.on("sync", (state: string) => {
      console.log("[matrix-client] sync state:", state);
      if (state === "PREPARED" || state === "SYNCING") {
        if (!this.chatsReady) {
          this.chatsReady = true;
          console.log("[matrix-client] chatsReady = true");
        }
        this.onSync?.();
      }
    });
  }

  /** Full init: create client + init db */
  async init(): Promise<void> {
    try {
      this.client = await this.getClient();
      if (this.client) {
        this.store = this.client.store;
        this.ready = true;
      }
    } catch (e) {
      console.error("Matrix init error:", e);
      this.error = String(e);
    }

    // Init file storage
    try {
      this.db = await createChatStorage("files", 1);
    } catch { /* ignore */ }
  }

  isReady(): boolean {
    return this.ready && !this.error;
  }

  isChatsReady(): boolean {
    return this.chatsReady;
  }

  /** Send text message */
  async sendText(roomId: string, text: string): Promise<unknown> {
    if (!this.client) throw new Error("Client not initialized");
    const content = sdk.ContentHelpers.makeTextMessage(text);
    return this.client.sendMessage(roomId, content);
  }

  /** Send encrypted text message */
  async sendEncryptedText(roomId: string, content: Record<string, unknown>): Promise<unknown> {
    if (!this.client) throw new Error("Client not initialized");
    return this.client.sendEvent(roomId, "m.room.message", content);
  }

  /** Upload content to Matrix server */
  async uploadContent(file: Blob): Promise<string> {
    if (!this.client) throw new Error("Client not initialized");
    const src = await this.client.uploadContent(file);
    return this.client.mxcUrlToHttp(src.content_uri);
  }

  /** Get all rooms */
  getRooms(): unknown[] {
    return this.client?.getRooms() ?? [];
  }

  /** Get a specific room */
  getRoom(roomId: string): unknown {
    return this.client?.getRoom(roomId);
  }

  /** Create a room */
  async createRoom(opts: Record<string, unknown>): Promise<{ room_id: string }> {
    if (!this.client) throw new Error("Client not initialized");
    return this.client.createRoom(opts);
  }

  /** Join a room */
  async joinRoom(roomId: string): Promise<unknown> {
    if (!this.client) throw new Error("Client not initialized");
    return this.client.joinRoom(roomId);
  }

  /** Set power level */
  async setPowerLevel(roomId: string, userId: string, level: number, event: unknown): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setPowerLevel(roomId, userId, level, event);
    } catch { /* ignore */ }
  }

  /** Send state event */
  async sendStateEvent(roomId: string, type: string, content: unknown, stateKey: string): Promise<unknown> {
    if (!this.client) throw new Error("Client not initialized");
    return this.client.sendStateEvent(roomId, type, content, stateKey);
  }

  /** Get user ID */
  getUserId(): string | null {
    return this.client?.credentials?.userId ?? null;
  }

  /** Convert address to Matrix user ID */
  matrixId(address: string, domain?: string): string {
    return `@${address}:${domain ?? MATRIX_SERVER}`;
  }

  /** Check if a userId is the current user */
  isMe(userId: string): boolean {
    return getmatrixid(userId) === getmatrixid(this.getUserId() ?? "");
  }

  /** Send read receipt */
  async sendReadReceipt(event: unknown): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.sendReadReceipt(event);
    } catch { /* ignore */ }
  }

  /** Load older messages for a room (scrollback/pagination) */
  async scrollback(roomId: string, limit = 50): Promise<void> {
    if (!this.client) return;
    const room = this.client.getRoom(roomId);
    if (!room) return;
    try {
      await this.client.scrollback(room, limit);
    } catch (e) {
      console.warn("[matrix-client] scrollback error:", e);
    }
  }

  /** Send a reaction to an event */
  async sendReaction(roomId: string, eventId: string, emoji: string): Promise<unknown> {
    if (!this.client) throw new Error("Client not initialized");
    return this.client.sendEvent(roomId, "m.reaction", {
      "m.relates_to": {
        rel_type: "m.annotation",
        event_id: eventId,
        key: emoji,
      },
    });
  }

  /** Redact (delete) an event */
  async redactEvent(roomId: string, eventId: string, reason?: string): Promise<unknown> {
    if (!this.client) throw new Error("Client not initialized");
    return this.client.redactEvent(roomId, eventId, undefined, reason ? { reason } : undefined);
  }

  /** Set typing indicator */
  async setTyping(roomId: string, isTyping: boolean, timeout = 20000): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.sendTyping(roomId, isTyping, timeout);
    } catch { /* ignore */ }
  }

  /** Destroy the client */
  destroy() {
    if (this.client) {
      this.client.stopClient();
    }
    this.chatsReady = false;
    this.ready = false;
    this.error = false;
    this.client = null;
    this.store = null;
  }

  getSDK(): MatrixSDK {
    return this.sdk;
  }

  getDB(): ChatStorageInstance | null {
    return this.db;
  }
}

/** Singleton instance */
let instance: MatrixClientService | null = null;

export function getMatrixClientService(): MatrixClientService {
  if (!instance) {
    instance = new MatrixClientService();
  }
  return instance;
}

export function resetMatrixClientService() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
