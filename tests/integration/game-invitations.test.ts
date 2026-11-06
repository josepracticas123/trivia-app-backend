import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import {
  acceptGameInvitation,
  cancelPendingInvitationsFromSender,
  cancelPendingInvitationsForReceiver,
  createGameInvitation,
  expirePendingGameInvitations,
  getPendingIncomingInvitations,
  respondToGameInvitation,
} from "../../src/services/game-invitations.js";
import {
  createMultiplayerGame,
  joinGame,
} from "../../src/services/game.mutations.js";
import {
  registerOnlineSocket,
  resetPresenceForTests,
} from "../../src/services/presence.js";
import { asegurarBaseDePruebas } from "./helpers/db-guard.js";

asegurarBaseDePruebas(process.env.DATABASE_URL);

const userIds: number[] = [];
const gameIds: number[] = [];
let senderId = 0;
let receiverId = 0;

async function cleanRecords() {
  asegurarBaseDePruebas(process.env.DATABASE_URL);
  resetPresenceForTests();
  if (gameIds.length > 0) {
    await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
  }
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  gameIds.length = 0;
  userIds.length = 0;
}

function markOnline(userId: number, displayName: string) {
  registerOnlineSocket(
    { userId, displayName, status: "AVAILABLE" },
    `test-socket-${userId}`,
  );
}

beforeEach(async () => {
  await cleanRecords();
  for (const displayName of ["Emisor", "Receptor", "Otro"]) {
    const user = await prisma.user.create({
      data: {
        email: `${displayName.toLowerCase()}-${Date.now()}-${Math.random()}@test.com`,
        passwordHash: "x",
        displayName,
      },
    });
    userIds.push(user.id);
  }
  [senderId, receiverId] = userIds;
  markOnline(senderId, "Emisor");
  markOnline(receiverId, "Receptor");
  markOnline(userIds[2], "Otro");
});

afterAll(async () => {
  await cleanRecords();
  await prisma.$disconnect();
});

describe("invitaciones de partidas - base de pruebas", () => {
  it("crea una invitación privada pendiente y solo el receptor puede aceptarla", async () => {
    const created = await createGameInvitation(senderId, receiverId);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const unauthorized = await acceptGameInvitation(senderId, created.inviteId);
    expect(unauthorized).toEqual({
      ok: false,
      error: "NOT_INVITE_RECIPIENT",
    });

    const accepted = await acceptGameInvitation(receiverId, created.inviteId);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    gameIds.push(accepted.gameId);

    const retriedAcceptance = await acceptGameInvitation(
      receiverId,
      created.inviteId,
    );
    expect(retriedAcceptance).toEqual(accepted);

    expect(await acceptGameInvitation(senderId, created.inviteId)).toEqual({
      ok: false,
      error: "NOT_INVITE_RECIPIENT",
    });

    const game = await prisma.game.findUnique({
      where: { id: accepted.gameId },
      include: { players: true },
    });
    expect(game?.status).toBe("WAITING");
    expect(game?.mode).toBe("MULTIPLAYER");
    expect(game?.code).toBeNull();
    expect(game?.players.map((player) => player.userId).sort()).toEqual(
      [senderId, receiverId].sort(),
    );
    const invitation = await prisma.gameInvitation.findUnique({
      where: { id: created.inviteId },
    });
    expect(invitation?.status).toBe("ACCEPTED");
    expect(invitation?.gameId).toBe(accepted.gameId);
  });

  it("no recupera una aceptación si la partida vinculada ya no existe", async () => {
    const created = await createGameInvitation(senderId, receiverId);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const accepted = await acceptGameInvitation(receiverId, created.inviteId);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    gameIds.push(accepted.gameId);

    await prisma.game.delete({ where: { id: accepted.gameId } });
    gameIds.splice(gameIds.indexOf(accepted.gameId), 1);

    expect(await acceptGameInvitation(receiverId, created.inviteId)).toEqual({
      ok: false,
      error: "INVITE_NOT_PENDING",
    });
  });

  it("rechaza auto-invitaciones y mantiene una sola invitación saliente", async () => {
    expect(await createGameInvitation(senderId, senderId)).toEqual({
      ok: false,
      error: "SELF_INVITE",
    });
    const first = await createGameInvitation(senderId, receiverId);
    expect(first.ok).toBe(true);
    const second = await createGameInvitation(senderId, userIds[2]);
    expect(second).toEqual({
      ok: false,
      error: "OUTGOING_INVITE_PENDING",
    });
  });

  it("recupera invitaciones entrantes pendientes sin datos privados", async () => {
    const invitation = await createGameInvitation(senderId, receiverId);
    expect(invitation.ok).toBe(true);
    if (!invitation.ok) return;

    const pending = await getPendingIncomingInvitations(receiverId);
    expect(pending).toEqual([
      {
        inviteId: invitation.inviteId,
        from: { userId: senderId, displayName: "Emisor" },
        expiresAt: invitation.expiresAt,
      },
    ]);
  });

  it("permite al receptor rechazar y al emisor cancelar", async () => {
    const rejectedInvitation = await createGameInvitation(senderId, receiverId);
    expect(rejectedInvitation.ok).toBe(true);
    if (!rejectedInvitation.ok) return;
    expect(
      await respondToGameInvitation(
        receiverId,
        rejectedInvitation.inviteId,
        "REJECTED",
      ),
    ).toEqual({ ok: true, otherUserId: senderId });
    expect(await acceptGameInvitation(receiverId, rejectedInvitation.inviteId))
      .toEqual({ ok: false, error: "INVITE_NOT_PENDING" });

    const cancelledInvitation = await createGameInvitation(senderId, receiverId);
    expect(cancelledInvitation.ok).toBe(true);
    if (!cancelledInvitation.ok) return;
    expect(
      await respondToGameInvitation(
        senderId,
        cancelledInvitation.inviteId,
        "CANCELLED",
      ),
    ).toEqual({ ok: true, otherUserId: receiverId });
    expect(await acceptGameInvitation(receiverId, cancelledInvitation.inviteId))
      .toEqual({ ok: false, error: "INVITE_NOT_PENDING" });
  });

  it("expira las invitaciones caducadas y no permite aceptarlas", async () => {
    const invitation = await createGameInvitation(senderId, receiverId);
    expect(invitation.ok).toBe(true);
    if (!invitation.ok) return;

    await prisma.gameInvitation.update({
      where: { id: invitation.inviteId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const expired = await expirePendingGameInvitations();
    expect(expired).toContainEqual({
      inviteId: invitation.inviteId,
      senderId,
      receiverId,
    });
    expect(await acceptGameInvitation(receiverId, invitation.inviteId)).toEqual({
      ok: false,
      error: "INVITE_NOT_PENDING",
    });
  });

  it("expira una invitación vencida antes de crear su reemplazo", async () => {
    const first = await createGameInvitation(senderId, receiverId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await prisma.gameInvitation.update({
      where: { id: first.inviteId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const replacement = await createGameInvitation(senderId, receiverId);
    expect(replacement.ok).toBe(true);
    expect(await prisma.gameInvitation.findUnique({ where: { id: first.inviteId } }))
      .toMatchObject({ status: "EXPIRED" });
  });

  it("serializa aceptaciones concurrentes y conserva una sola partida", async () => {
    const created = await createGameInvitation(senderId, receiverId);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const results = await Promise.all([
      acceptGameInvitation(receiverId, created.inviteId),
      acceptGameInvitation(receiverId, created.inviteId),
    ]);
    const successful = results.filter((result) => result.ok);
    expect(successful.length).toBeGreaterThan(0);
    if (successful.length === 0) return;

    const gameIdsForInvitation = new Set(successful.map((result) => result.gameId));
    expect(gameIdsForInvitation.size).toBe(1);
    const acceptedGameId = successful[0].gameId;
    gameIds.push(acceptedGameId);

    const linkedGames = await prisma.game.findMany({
      where: { invitations: { some: { id: created.inviteId } } },
      select: { id: true },
    });
    expect(linkedGames).toEqual([{ id: acceptedGameId }]);

    const retry = await acceptGameInvitation(receiverId, created.inviteId);
    expect(retry.ok).toBe(true);
    if (retry.ok) expect(retry.gameId).toBe(acceptedGameId);
  });

  it("cancela las invitaciones del emisor al quedar desconectado", async () => {
    const invitation = await createGameInvitation(senderId, receiverId);
    expect(invitation.ok).toBe(true);
    if (!invitation.ok) return;

    const cancelled = await cancelPendingInvitationsFromSender(senderId);
    expect(cancelled).toContainEqual({
      inviteId: invitation.inviteId,
      receiverId,
    });
  });

  it("cancela las invitaciones entrantes al quedar offline el receptor", async () => {
    const invitation = await createGameInvitation(senderId, receiverId);
    expect(invitation.ok).toBe(true);
    if (!invitation.ok) return;

    const cancelled = await cancelPendingInvitationsForReceiver(receiverId);
    expect(cancelled).toContainEqual({
      inviteId: invitation.inviteId,
      senderId,
    });
  });

  it("aplica el límite de cinco invitaciones por cada diez minutos", async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const invitation = await createGameInvitation(senderId, receiverId);
      expect(invitation.ok).toBe(true);
      if (!invitation.ok) return;
      const rejected = await respondToGameInvitation(
        receiverId,
        invitation.inviteId,
        "REJECTED",
      );
      expect(rejected.ok).toBe(true);
    }
    expect(await createGameInvitation(senderId, receiverId)).toEqual({
      ok: false,
      error: "INVITE_RATE_LIMITED",
    });
  });

  it("impide invitar a participantes de una sala multijugador en espera", async () => {
    const game = await prisma.game.create({
      data: {
        mode: "MULTIPLAYER",
        code: `WAIT${Date.now()}`.slice(-6),
        status: "WAITING",
        players: {
          create: { userId: senderId, isCreator: true, turnOrder: 1 },
        },
      },
    });
    gameIds.push(game.id);

    expect(await createGameInvitation(senderId, userIds[2])).toEqual({
      ok: false,
      error: "USER_NOT_AVAILABLE",
    });
  });

  it("impide que un usuario cree o se una a una segunda sala multijugador", async () => {
    const currentGame = await prisma.game.create({
      data: {
        mode: "MULTIPLAYER",
        code: `A${Date.now().toString().slice(-5)}`,
        status: "WAITING",
        players: {
          create: { userId: senderId, isCreator: true, turnOrder: 1 },
        },
      },
    });
    gameIds.push(currentGame.id);

    await expect(createMultiplayerGame(senderId)).rejects.toThrow(
      "USER_ALREADY_IN_GAME",
    );

    const otherGame = await prisma.game.create({
      data: {
        mode: "MULTIPLAYER",
        code: `B${Date.now().toString().slice(-5)}`,
        status: "WAITING",
        players: {
          create: { userId: userIds[2], isCreator: true, turnOrder: 1 },
        },
      },
    });
    gameIds.push(otherGame.id);
    expect(await joinGame(senderId, otherGame.code!)).toEqual({
      ok: false,
      error: "USER_ALREADY_IN_GAME",
    });
  });

  it("serializa dos creaciones concurrentes del mismo usuario", async () => {
    const results = await Promise.allSettled([
      createMultiplayerGame(senderId),
      createMultiplayerGame(senderId),
    ]);
    const created = results.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof createMultiplayerGame>>> =>
        result.status === "fulfilled",
    );
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    expect(created).toHaveLength(1);
    expect(rejected).toBeDefined();
    if (created[0]) gameIds.push(created[0].value.id);
    expect(rejected?.reason).toMatchObject({
      message: "USER_ALREADY_IN_GAME",
    });
  });
});
