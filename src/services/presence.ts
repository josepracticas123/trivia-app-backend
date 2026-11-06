import { prisma } from "../lib/prisma.js";

export type PresenceStatus = "AVAILABLE" | "IN_GAME";

export interface PresenceUser {
  userId: number;
  displayName: string;
  status: PresenceStatus;
}

interface OnlineUser extends PresenceUser {
  socketIds: Set<string>;
}

const onlineUsers = new Map<number, OnlineUser>();
let presenceChangedEmitter: ((presence: PresenceUser) => void) | undefined;

export function setPresenceChangedEmitter(
  emitter: ((presence: PresenceUser) => void) | undefined,
) {
  presenceChangedEmitter = emitter;
}

export function registerOnlineSocket(
  user: PresenceUser,
  socketId: string,
): { firstSocket: boolean; presence: PresenceUser } {
  const existing = onlineUsers.get(user.userId);
  if (existing) {
    existing.socketIds.add(socketId);
    existing.displayName = user.displayName;
    existing.status = user.status;
    return {
      firstSocket: false,
      presence: {
        userId: existing.userId,
        displayName: existing.displayName,
        status: existing.status,
      },
    };
  }

  const onlineUser: OnlineUser = {
    ...user,
    socketIds: new Set([socketId]),
  };
  onlineUsers.set(user.userId, onlineUser);
  return { firstSocket: true, presence: user };
}

export function unregisterOnlineSocket(
  userId: number,
  socketId: string,
): { wentOffline: boolean; presence?: PresenceUser } {
  const user = onlineUsers.get(userId);
  if (!user) return { wentOffline: false };

  user.socketIds.delete(socketId);
  if (user.socketIds.size > 0) return { wentOffline: false };

  onlineUsers.delete(userId);
  return {
    wentOffline: true,
    presence: {
      userId: user.userId,
      displayName: user.displayName,
      status: "AVAILABLE",
    },
  };
}

export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUser(userId: number): PresenceUser | undefined {
  const user = onlineUsers.get(userId);
  if (!user) return undefined;
  return {
    userId: user.userId,
    displayName: user.displayName,
    status: user.status,
  };
}

export function updateOnlineUserStatus(
  userId: number,
  status: PresenceStatus,
): PresenceUser | undefined {
  const user = onlineUsers.get(userId);
  if (!user || user.status === status) return undefined;
  user.status = status;
  return {
    userId: user.userId,
    displayName: user.displayName,
    status: user.status,
  };
}

export function updateOnlineUserDisplayName(
  userId: number,
  displayName: string,
): PresenceUser | undefined {
  const user = onlineUsers.get(userId);
  if (!user || user.displayName === displayName) return undefined;

  user.displayName = displayName;
  const presence = {
    userId: user.userId,
    displayName: user.displayName,
    status: user.status,
  };
  presenceChangedEmitter?.(presence);
  return presence;
}

export function getAvailableUsersPage(
  limit: number,
  cursor?: number,
  excludeUserId?: number,
) {
  const users = [...onlineUsers.values()]
    .filter(
      (user) =>
        user.status === "AVAILABLE" &&
        user.userId !== excludeUserId &&
        user.userId > (cursor ?? 0),
    )
    .sort((left, right) => left.userId - right.userId);
  const items = users.slice(0, limit).map(({ userId, displayName, status }) => ({
    userId,
    displayName,
    status,
  }));
  const hasMore = users.length > limit;

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].userId : null,
  };
}

export function getOnlineUserIds(): number[] {
  return [...onlineUsers.keys()];
}

export async function findUsersInLiveMultiplayerGames(
  userIds: number[],
): Promise<Set<number>> {
  if (userIds.length === 0) return new Set();
  const participations = await prisma.gamePlayer.findMany({
    where: {
      userId: { in: userIds },
      game: {
        mode: "MULTIPLAYER",
        status: { in: ["WAITING", "ACTIVE"] },
      },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return new Set(participations.map((participation) => participation.userId));
}

export function resetPresenceForTests() {
  onlineUsers.clear();
}
