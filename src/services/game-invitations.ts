import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getOnlineUser, isUserOnline } from "./presence.js";
import type { GameInviteResultPayload } from "../sockets/socket.types.js";

export const INVITATION_TTL_MS = 2 * 60 * 1000;
const INVITATION_WINDOW_MS = 10 * 60 * 1000;
const MAX_INVITATIONS_PER_WINDOW = 5;
const MAX_PENDING_INCOMING = 5;

type InviteError =
  | "SELF_INVITE"
  | "USER_NOT_AVAILABLE"
  | "OUTGOING_INVITE_PENDING"
  | "INVITE_ALREADY_PENDING"
  | "INVITE_RATE_LIMITED"
  | "TOO_MANY_PENDING_INVITES"
  | "INVITE_NOT_FOUND"
  | "NOT_INVITE_RECIPIENT"
  | "NOT_INVITE_SENDER"
  | "INVITE_EXPIRED"
  | "INVITE_NOT_PENDING"
  | "INVITE_UNAVAILABLE"
  | "CONFLICT";

type Result<T> =
  | ({ ok: true } & T)
  | { ok: false; error: InviteError; senderId?: number };

async function lockUsers(
  tx: Prisma.TransactionClient,
  userIds: number[],
): Promise<void> {
  const sortedIds = [...new Set(userIds)].sort((left, right) => left - right);
  await tx.$queryRaw`
    SELECT "id" FROM "user"
    WHERE "id" IN (${Prisma.join(sortedIds)})
    ORDER BY "id"
    FOR UPDATE
  `;
}

async function isInLiveMultiplayerGame(
  tx: Prisma.TransactionClient,
  userId: number,
): Promise<boolean> {
  const participation = await tx.gamePlayer.findFirst({
    where: {
      userId,
      game: {
        mode: "MULTIPLAYER",
        status: { in: ["WAITING", "ACTIVE"] },
      },
    },
    select: { id: true },
  });
  return participation !== null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createGameInvitation(
  senderId: number,
  receiverId: number,
): Promise<Result<{ inviteId: string; expiresAt: Date }>> {
  if (senderId === receiverId) return { ok: false, error: "SELF_INVITE" };

  const sender = getOnlineUser(senderId);
  const receiver = getOnlineUser(receiverId);
  if (
    !sender ||
    !receiver ||
    sender.status !== "AVAILABLE" ||
    receiver.status !== "AVAILABLE"
  ) {
    return { ok: false, error: "USER_NOT_AVAILABLE" };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);
  try {
    return await prisma.$transaction(
      async (tx) => {
        await lockUsers(tx, [senderId, receiverId]);

        // El índice único parcial considera PENDING aunque ya haya vencido.
        // Expiramos primero dentro de la misma transacción para que una fila
        // vencida no bloquee la nueva invitación hasta el siguiente barrido.
        await tx.gameInvitation.updateMany({
          where: {
            status: "PENDING",
            expiresAt: { lte: now },
            OR: [{ senderId }, { receiverId }],
          },
          data: { status: "EXPIRED", respondedAt: now },
        });

        if (
          !isUserOnline(senderId) ||
          !isUserOnline(receiverId) ||
          (await isInLiveMultiplayerGame(tx, senderId)) ||
          (await isInLiveMultiplayerGame(tx, receiverId))
        ) {
          return { ok: false, error: "USER_NOT_AVAILABLE" } as const;
        }

        const pairPending = await tx.gameInvitation.findFirst({
          where: {
            status: "PENDING",
            expiresAt: { gt: now },
            OR: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId },
            ],
          },
          select: { id: true },
        });
        if (pairPending) {
          return { ok: false, error: "INVITE_ALREADY_PENDING" } as const;
        }

        const [outgoing, incoming, recent] = await Promise.all([
          tx.gameInvitation.count({
            where: { senderId, status: "PENDING", expiresAt: { gt: now } },
          }),
          tx.gameInvitation.count({
            where: { receiverId, status: "PENDING", expiresAt: { gt: now } },
          }),
          tx.gameInvitation.count({
            where: {
              senderId,
              createdAt: { gte: new Date(now.getTime() - INVITATION_WINDOW_MS) },
            },
          }),
        ]);

        if (outgoing > 0) {
          return { ok: false, error: "OUTGOING_INVITE_PENDING" } as const;
        }
        if (incoming >= MAX_PENDING_INCOMING) {
          return { ok: false, error: "TOO_MANY_PENDING_INVITES" } as const;
        }
        if (recent >= MAX_INVITATIONS_PER_WINDOW) {
          return { ok: false, error: "INVITE_RATE_LIMITED" } as const;
        }

        const invitation = await tx.gameInvitation.create({
          data: { senderId, receiverId, expiresAt },
          select: { id: true },
        });
        return {
          ok: true,
          inviteId: invitation.id,
          expiresAt,
        } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "INVITE_ALREADY_PENDING" };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return { ok: false, error: "CONFLICT" };
    }
    throw error;
  }
}

export async function acceptGameInvitation(
  receiverId: number,
  inviteId: string,
): Promise<
  Result<
    GameInviteResultPayload & {
      senderId: number;
      receiverId: number;
      createdAt: Date;
      cancelledInvitations: Array<{
        inviteId: string;
        senderId: number;
        receiverId: number;
      }>;
    }
  >
> {
  const now = new Date();
  try {
    return await prisma.$transaction(
      async (tx) => {
        const invitation = await tx.gameInvitation.findUnique({
          where: { id: inviteId },
          select: {
            id: true,
            senderId: true,
            receiverId: true,
            status: true,
            expiresAt: true,
            gameId: true,
          },
        });
        if (!invitation) return { ok: false, error: "INVITE_NOT_FOUND" } as const;
        if (invitation.receiverId !== receiverId) {
          return { ok: false, error: "NOT_INVITE_RECIPIENT" } as const;
        }
        await lockUsers(tx, [invitation.senderId, invitation.receiverId]);

        if (invitation.status === "ACCEPTED") {
          if (invitation.gameId === null) {
            return { ok: false, error: "INVITE_NOT_PENDING" } as const;
          }
          const game = await tx.game.findUnique({
            where: { id: invitation.gameId },
            select: { createdAt: true },
          });
          if (!game) {
            return { ok: false, error: "INVITE_NOT_PENDING" } as const;
          }
          return {
            ok: true,
            inviteId: invitation.id,
            gameId: invitation.gameId,
            status: "WAITING",
            senderId: invitation.senderId,
            receiverId: invitation.receiverId,
            createdAt: game.createdAt,
            cancelledInvitations: [],
          } as const;
        }

        if (invitation.status !== "PENDING") {
          return { ok: false, error: "INVITE_NOT_PENDING" } as const;
        }
        if (invitation.expiresAt <= now) {
          await tx.gameInvitation.updateMany({
            where: { id: inviteId, status: "PENDING" },
            data: { status: "EXPIRED", respondedAt: now },
          });
          return {
            ok: false,
            error: "INVITE_EXPIRED",
            senderId: invitation.senderId,
          } as const;
        }
        if (
          !isUserOnline(invitation.senderId) ||
          !isUserOnline(invitation.receiverId) ||
          (await isInLiveMultiplayerGame(tx, invitation.senderId)) ||
          (await isInLiveMultiplayerGame(tx, invitation.receiverId))
        ) {
          await tx.gameInvitation.updateMany({
            where: { id: inviteId, status: "PENDING" },
            data: { status: "CANCELLED", respondedAt: now },
          });
          return {
            ok: false,
            error: "INVITE_UNAVAILABLE",
            senderId: invitation.senderId,
          } as const;
        }

        const game = await tx.game.create({
          data: {
            mode: "MULTIPLAYER",
            code: null,
            status: "WAITING",
            players: {
              create: [
                { userId: invitation.senderId, isCreator: true, turnOrder: 1 },
                { userId: invitation.receiverId, isCreator: false, turnOrder: 2 },
              ],
            },
          },
          select: { id: true, status: true, createdAt: true },
        });
        const accepted = await tx.gameInvitation.updateMany({
          where: {
            id: inviteId,
            receiverId,
            status: "PENDING",
            expiresAt: { gt: now },
          },
          data: {
            status: "ACCEPTED",
            respondedAt: now,
            gameId: game.id,
          },
        });
        if (accepted.count !== 1) {
          throw new Error("INVITATION_ACCEPTANCE_CONFLICT");
        }

        const otherInvitations = await tx.gameInvitation.findMany({
          where: {
            id: { not: inviteId },
            status: "PENDING",
            OR: [
              { senderId: { in: [invitation.senderId, invitation.receiverId] } },
              { receiverId: { in: [invitation.senderId, invitation.receiverId] } },
            ],
          },
          select: { id: true, senderId: true, receiverId: true },
        });
        const cancelledInvitations: Array<{
          inviteId: string;
          senderId: number;
          receiverId: number;
        }> = [];
        for (const otherInvitation of otherInvitations) {
          const cancelled = await tx.gameInvitation.updateMany({
            where: { id: otherInvitation.id, status: "PENDING" },
            data: { status: "CANCELLED", respondedAt: now },
          });
          if (cancelled.count === 1) {
            cancelledInvitations.push({
              inviteId: otherInvitation.id,
              senderId: otherInvitation.senderId,
              receiverId: otherInvitation.receiverId,
            });
          }
        }

        return {
          ok: true,
          inviteId,
          gameId: game.id,
          status: "WAITING",
          senderId: invitation.senderId,
          receiverId: invitation.receiverId,
          createdAt: game.createdAt,
          cancelledInvitations,
        } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "OUTGOING_INVITE_PENDING" };
    }
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034") ||
      (error instanceof Error &&
        error.message === "INVITATION_ACCEPTANCE_CONFLICT")
    ) {
      return { ok: false, error: "CONFLICT" };
    }
    throw error;
  }
}

export async function respondToGameInvitation(
  userId: number,
  inviteId: string,
  action: "REJECTED" | "CANCELLED",
): Promise<Result<{ otherUserId: number }>> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.gameInvitation.findUnique({
      where: { id: inviteId },
      select: { id: true, senderId: true, receiverId: true, status: true },
    });
    if (!invitation) return { ok: false, error: "INVITE_NOT_FOUND" } as const;
    const actorIsSender = invitation.senderId === userId;
    if (action === "REJECTED" && invitation.receiverId !== userId) {
      return { ok: false, error: "NOT_INVITE_RECIPIENT" } as const;
    }
    if (action === "CANCELLED" && !actorIsSender) {
      return { ok: false, error: "NOT_INVITE_SENDER" } as const;
    }
    if (invitation.status !== "PENDING") {
      return { ok: false, error: "INVITE_NOT_PENDING" } as const;
    }

    const changed = await tx.gameInvitation.updateMany({
      where: { id: inviteId, status: "PENDING", expiresAt: { gt: now } },
      data: { status: action, respondedAt: now },
    });
    if (changed.count !== 1) {
      return { ok: false, error: "INVITE_EXPIRED" } as const;
    }
    return {
      ok: true,
      otherUserId: actorIsSender ? invitation.receiverId : invitation.senderId,
    } as const;
  });
}

export async function cancelPendingInvitationsFromSender(
  senderId: number,
): Promise<Array<{ inviteId: string; receiverId: number }>> {
  const invitations = await prisma.gameInvitation.findMany({
    where: { senderId, status: "PENDING" },
    select: { id: true, receiverId: true },
  });
  const cancelled: Array<{ inviteId: string; receiverId: number }> = [];
  for (const invitation of invitations) {
    const result = await prisma.gameInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
    if (result.count === 1) {
      cancelled.push({ inviteId: invitation.id, receiverId: invitation.receiverId });
    }
  }
  return cancelled;
}

export async function cancelPendingInvitationsForReceiver(
  receiverId: number,
): Promise<Array<{ inviteId: string; senderId: number }>> {
  const invitations = await prisma.gameInvitation.findMany({
    where: { receiverId, status: "PENDING" },
    select: { id: true, senderId: true },
  });
  const cancelled: Array<{ inviteId: string; senderId: number }> = [];
  for (const invitation of invitations) {
    const result = await prisma.gameInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
    if (result.count === 1) {
      cancelled.push({ inviteId: invitation.id, senderId: invitation.senderId });
    }
  }
  return cancelled;
}

export async function expirePendingGameInvitations(
): Promise<Array<{ inviteId: string; senderId: number; receiverId: number }>> {
  const now = new Date();
  const expired = await prisma.gameInvitation.findMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
    select: { id: true, senderId: true, receiverId: true },
  });
  const results: Array<{ inviteId: string; senderId: number; receiverId: number }> = [];
  for (const invitation of expired) {
    const result = await prisma.gameInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING", expiresAt: { lte: now } },
      data: { status: "EXPIRED", respondedAt: now },
    });
    if (result.count === 1) {
      results.push({
        inviteId: invitation.id,
        senderId: invitation.senderId,
        receiverId: invitation.receiverId,
      });
    }
  }
  return results;
}

export async function getPendingIncomingInvitations(receiverId: number): Promise<
  Array<{
    inviteId: string;
    from: { userId: number; displayName: string };
    expiresAt: Date;
  }>
> {
  const invitations = await prisma.gameInvitation.findMany({
    where: {
      receiverId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      expiresAt: true,
      sender: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return invitations.map((invitation) => ({
    inviteId: invitation.id,
    from: {
      userId: invitation.sender.id,
      displayName: invitation.sender.displayName,
    },
    expiresAt: invitation.expiresAt,
  }));
}
