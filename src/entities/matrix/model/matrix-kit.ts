/**
 * Matrix room utilities — adapted from bastyon-chat/src/application/mtrxkit.js
 *
 * Handles deterministic room ID generation, membership utilities, etc.
 */
import { sha224, getmatrixid, areArraysEqual } from "@/shared/lib/matrix/functions";
import { MATRIX_SERVER } from "@/shared/config";

import type { MatrixClientService } from "./matrix-client";

const cacheStorage: Record<string, string> = {};

export class MatrixKit {
  private matrixService: MatrixClientService;

  constructor(matrixService: MatrixClientService) {
    this.matrixService = matrixService;
  }

  /** Check if room is a 1:1 (tete-a-tete) chat */
  isTetatetChat(room: Record<string, unknown>): boolean {
    if (typeof room.tetatet !== "undefined") return room.tetatet as boolean;

    const members = this.getRoomMembers(room);
    if (members.length !== 2) return false;

    const users = members.map((m) => ({ id: getmatrixid(m.userId as string) }));
    if (users.length !== 2) return false;

    const tid = this.tetatetId(users[0], users[1]);
    if (!tid) return false;

    const roomName = room.name as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canonicalAlias = ((room as any).getCanonicalAlias?.() as string) ?? "";

    const isTetatet = roomName === "#" + tid || canonicalAlias.indexOf(tid) > -1;
    room.tetatet = isTetatet;
    return isTetatet;
  }

  /** Check if room can be interacted with */
  canInteractWithRoom(room: Record<string, unknown>): boolean {
    const interactiveTypes = ["join", "invite"];
    return interactiveTypes.includes(room.selfMembership as string);
  }

  /** Find existing 1:1 room between two users */
  findOneToOneRoom(user1Id: string, user2Id: string): string | undefined {
    const rooms = this.matrixService.getRooms() as Record<string, unknown>[];
    const targetUserIds = [
      this.matrixId(user1Id),
      this.matrixId(user2Id)
    ].sort();

    for (const room of rooms) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roomAny = room as any;
      const joinRule = (roomAny.getJoinRule?.() as string) ?? "";
      if (joinRule === "public" || !this.canInteractWithRoom(room)) continue;

      const members = (roomAny.getMembers?.() as { userId: string }[]) ?? [];
      if (members.length !== 2) continue;

      const memberIds = members.map((m) => m.userId).sort();
      if (areArraysEqual(memberIds, targetUserIds)) {
        return (room.name as string).replace("#", "");
      }
    }
    return undefined;
  }

  /** Generate deterministic room ID for 1:1 chat */
  tetatetId(user1: { id: string }, user2: { id: string }, version?: number): string | null {
    if (!version) {
      const roomId = this.findOneToOneRoom(user1.id, user2.id);
      if (roomId) return roomId;
    }

    const seed = 2;
    if (user1.id === user2.id) return null;

    const ids = [user1.id, user2.id].sort();
    let id: string = String(parseInt(ids[0], 16) * parseInt(ids[1], 16) * seed);
    if (version) id += "-" + version;

    if (cacheStorage[id]) return cacheStorage[id];

    const hash = sha224(id).toString("hex");
    cacheStorage[id] = hash;
    return hash;
  }

  /** Generate deterministic room ID for group chat (product-based) */
  groupIdEq(users: { id: string }[]): string {
    const seed = 2;
    let id = 1 * seed;
    for (const u of users) {
      id = id * parseInt(u.id, 16);
    }

    const key = String(id);
    if (cacheStorage[key]) return cacheStorage[key];

    const hash = sha224(key).toString("hex");
    cacheStorage[key] = hash;
    return hash;
  }

  /** Check if chat is public */
  chatIsPublic(room: Record<string, unknown>): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roomAny = room as any;
    const joinRules = (roomAny.currentState?.getStateEvents?.("m.room.join_rules") ?? []) as unknown[];
    return joinRules.some((v: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rule = (v as any)?.event;
      return rule?.content?.join_rule === "public";
    });
  }

  /** Get room members */
  getRoomMembers(room: Record<string, unknown>): Record<string, unknown>[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stateMembers = (room as any).currentState?.members as Record<string, Record<string, unknown>> | undefined;
    if (!stateMembers) return [];
    return Object.values(stateMembers);
  }

  /** Extract users from chats for store */
  usersFromChats(rooms: Record<string, unknown>[]): Record<string, { userId: string; membership: string }[]> {
    const users: Record<string, { userId: string; membership: string }[]> = {};
    for (const room of rooms) {
      const roomId = room.roomId as string;
      const members = this.getRoomMembers(room);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summaryMembers = ((room as any).summary?.members ?? []) as unknown[];

      const allMembers = [...members, ...summaryMembers];
      const seen = new Set<string>();
      users[roomId] = [];

      for (const m of allMembers) {
        const member = m as Record<string, unknown>;
        const userId = getmatrixid(member.userId as string);
        if (seen.has(userId)) continue;
        seen.add(userId);
        users[roomId].push({
          userId,
          membership: member.membership as string
        });
      }
    }
    return users;
  }

  /** Convert address to Matrix user ID */
  matrixId(address: string, domain?: string): string {
    return `@${address}:${domain ?? MATRIX_SERVER}`;
  }
}
