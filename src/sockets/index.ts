import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import type { AppServer, AppSocket, SocketData } from "./socket.types.js";
import { isAllowedFrontendOrigin } from "../config/cors.js";
import type {
  ClientToServerEvents,
  PresenceUserPayload,
  ServerToClientEvents,
} from "./socket.types.js";
import {
  cancelPendingInvitationsFromSender,
  createGameInvitation,
  expirePendingGameInvitations,
  getPendingIncomingInvitations,
  acceptGameInvitation,
  cancelPendingInvitationsForReceiver,
  respondToGameInvitation,
} from "../services/game-invitations.js";
import {
  findUsersInLiveMultiplayerGames,
  getAvailableUsersPage,
  getOnlineUser,
  getOnlineUserIds,
  registerOnlineSocket,
  setPresenceChangedEmitter,
  unregisterOnlineSocket,
  updateOnlineUserStatus,
} from "../services/presence.js";

export let io: AppServer | undefined;
let invitationExpiryTimer: NodeJS.Timeout | undefined;
const PRESENCE_REQUEST_COOLDOWN_MS = 1_000;
const INVITATION_EXPIRY_SWEEP_MS = 30_000;

async function runPostCommitEffect(
  operation: string,
  effect: () => void | Promise<void>,
): Promise<void> {
  try {
    await effect();
  } catch (error) {
    console.error("Invitation acceptance post-commit effect failed", {
      operation,
      errorType: error instanceof Error ? error.name : typeof error,
    });
  }
}

function emitPresenceChanged(payload: PresenceUserPayload | (Omit<PresenceUserPayload, "status"> & { status: "OFFLINE" })) {
  io?.emit("presence:changed", payload);
}

async function cancelUserInvitations(userId: number): Promise<void> {
  const [sent, received] = await Promise.all([
    cancelPendingInvitationsFromSender(userId),
    cancelPendingInvitationsForReceiver(userId),
  ]);
  for (const invitation of sent) {
    const payload = { inviteId: invitation.inviteId };
    io?.to(`user:${userId}`).emit("game:invite:cancelled", payload);
    io?.to(`user:${invitation.receiverId}`).emit("game:invite:cancelled", payload);
  }
  for (const invitation of received) {
    const payload = { inviteId: invitation.inviteId };
    io?.to(`user:${userId}`).emit("game:invite:cancelled", payload);
    io?.to(`user:${invitation.senderId}`).emit("game:invite:cancelled", payload);
  }
}

export async function refreshPresenceForOnlineUsers(): Promise<void> {
  const onlineIds = getOnlineUserIds();
  const occupiedIds = await findUsersInLiveMultiplayerGames(onlineIds);
  for (const userId of onlineIds) {
    const user = getOnlineUser(userId);
    if (!user) continue;
    const updated = updateOnlineUserStatus(
      userId,
      occupiedIds.has(userId) ? "IN_GAME" : "AVAILABLE",
    );
    if (updated) {
      emitPresenceChanged(updated);
      if (updated.status === "IN_GAME") {
        await cancelUserInvitations(userId);
      }
    }
  }
}

async function broadcastExpiredInvitations(): Promise<void> {
  const expired = await expirePendingGameInvitations();
  for (const invitation of expired) {
    const payload = { inviteId: invitation.inviteId };
    io?.to(`user:${invitation.senderId}`).emit("game:invite:expired", payload);
    io?.to(`user:${invitation.receiverId}`).emit("game:invite:expired", payload);
  }
}

function validInviteId(inviteId: unknown): inviteId is string {
  return (
    typeof inviteId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      inviteId,
    )
  );
}

export function initSockets(server: HttpServer): AppServer {
  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(server, {
    cors: {
      origin(origin, callback) {
        callback(null, isAllowedFrontendOrigin(origin));
      },
      credentials: true,
    },
  });
  setPresenceChangedEmitter(emitPresenceChanged);

  io.use(async (socket: AppSocket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Token de autenticación requerido"));
    }

    let decoded: unknown;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ["HS256"],
      });
    } catch {
      return next(new Error("Token inválido o caducado"));
    }

    if (typeof decoded !== "object" || decoded === null) {
      return next(new Error("Token inválido o caducado"));
    }

    const payload = decoded as Record<string, unknown>;
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return next(new Error("Token inválido o caducado"));
    }

    const now = Date.now();
    if (payload.exp * 1000 <= now) {
      return next(new Error("Token inválido o caducado"));
    }

    const sub = payload.sub;
    if (typeof sub !== "string" || !/^\d+$/.test(sub)) {
      return next(new Error("Token inválido o caducado"));
    }

    const userId = Number(sub);
    if (!Number.isSafeInteger(userId) || userId < 1 || userId > 2147483647) {
      return next(new Error("Token inválido o caducado"));
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, displayName: true },
      });

      if (!user) {
        return next(new Error("Token inválido o caducado"));
      }

      const occupiedIds = await findUsersInLiveMultiplayerGames([userId]);
      socket.data.userId = userId;
      socket.data.displayName = user.displayName;
      socket.data.presenceStatus = occupiedIds.has(userId) ? "IN_GAME" : "AVAILABLE";
      await socket.join(`user:${userId}`);

      const remainingMs = payload.exp * 1000 - now;
      const timeout = setTimeout(() => {
        socket.disconnect(true);
      }, remainingMs);
      socket.data.expirationTimeout = timeout;
      socket.once("disconnect", () => {
        if (socket.data.expirationTimeout) {
          clearTimeout(socket.data.expirationTimeout);
          delete socket.data.expirationTimeout;
        }
      });

      next();
    } catch (error) {
      console.error("Error authenticating Socket.IO connection:", error);
      return next(new Error("No se pudo autenticar la conexión"));
    }
  });

  io.on("connection", (socket: AppSocket) => {
    const userId = socket.data.userId;
    let nextPresenceRequestAt = 0;
    const registration = registerOnlineSocket(
      {
        userId,
        displayName: socket.data.displayName,
        status: socket.data.presenceStatus,
      },
      socket.id,
    );
    if (registration.firstSocket) emitPresenceChanged(registration.presence);
    void (async () => {
      try {
        await broadcastExpiredInvitations();
        const pending = await getPendingIncomingInvitations(userId);
        for (const invitation of pending) {
          socket.emit("game:invite", {
            inviteId: invitation.inviteId,
            from: invitation.from,
            expiresAt: invitation.expiresAt.toISOString(),
          });
        }
      } catch (error) {
        console.error("Error restoring pending game invitations:", error);
      }
    })();

    socket.on("presence:request", async (payload) => {
      const limit = payload?.limit ?? 50;
      const cursor = payload?.cursor;
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        (cursor !== undefined &&
          (!Number.isSafeInteger(cursor) || cursor < 1))
      ) {
        socket.emit("presence:error", {
          message: "La paginación de presencia no es válida",
        });
        return;
      }

      const now = Date.now();
      if (now < nextPresenceRequestAt) {
        socket.emit("presence:error", {
          message: "Espera antes de volver a solicitar la presencia",
        });
        return;
      }
      nextPresenceRequestAt = now + PRESENCE_REQUEST_COOLDOWN_MS;

      try {
        await refreshPresenceForOnlineUsers();
        socket.emit(
          "presence:available",
          getAvailableUsersPage(limit, cursor, userId),
        );
      } catch (error) {
        console.error("Error loading available players:", error);
        socket.emit("presence:error", {
          message: "No se pudo cargar la presencia",
        });
      }
    });

    socket.on("game:invite:send", (payload, acknowledge) => {
      void (async () => {
        const ack = typeof acknowledge === "function" ? acknowledge : () => {};
        try {
          if (
            !payload ||
            !Number.isSafeInteger(payload.receiverId) ||
            payload.receiverId < 1
          ) {
            ack({ ok: false, error: "VALIDATION_ERROR" });
            return;
          }
          await broadcastExpiredInvitations();
          const result = await createGameInvitation(userId, payload.receiverId);
          if (!result.ok) {
            ack({ ok: false, error: result.error });
            return;
          }
          const sender = getOnlineUser(userId);
          if (!sender) {
            ack({ ok: false, error: "USER_NOT_AVAILABLE" });
            return;
          }
          const expiresAt = result.expiresAt.toISOString();
          io?.to(`user:${payload.receiverId}`).emit("game:invite", {
            inviteId: result.inviteId,
            from: { userId, displayName: sender.displayName },
            expiresAt,
          });
          ack({
            ok: true,
            inviteId: result.inviteId,
            expiresAt,
          });
        } catch (error) {
          console.error("Error sending game invitation:", error);
          ack({ ok: false, error: "INTERNAL_ERROR" });
        }
      })();
    });

    socket.on("game:invite:accept", (payload, acknowledge) => {
      void (async () => {
        const ack = typeof acknowledge === "function" ? acknowledge : () => {};
        let acceptedResult: Awaited<ReturnType<typeof acceptGameInvitation>> & {
          ok: true;
        };
        try {
          if (!payload || !validInviteId(payload.inviteId)) {
            ack({ ok: false, error: "VALIDATION_ERROR" });
            return;
          }
          const result = await acceptGameInvitation(userId, payload.inviteId);
          if (!result.ok) {
            if (
              (result.error === "INVITE_UNAVAILABLE" ||
                result.error === "INVITE_EXPIRED") &&
              result.senderId !== undefined
            ) {
              const cancelled = { inviteId: payload.inviteId };
              const event =
                result.error === "INVITE_EXPIRED"
                  ? "game:invite:expired"
                  : "game:invite:cancelled";
              io?.to(`user:${result.senderId}`).emit(event, cancelled);
              io?.to(`user:${userId}`).emit(event, cancelled);
            }
            ack({ ok: false, error: result.error });
            return;
          }

          acceptedResult = result;
        } catch (error) {
          console.error("Error accepting game invitation:", error);
          ack({ ok: false, error: "INTERNAL_ERROR" });
          return;
        }

        const {
          inviteId,
          gameId,
          senderId,
          receiverId,
          createdAt,
          cancelledInvitations,
        } = acceptedResult;
        const acceptedPayload = { inviteId, gameId, status: "WAITING" as const };

        try {
          await runPostCommitEffect("join sender sockets to game room", async () => {
            if (!io) throw new Error("Socket.IO unavailable");
            await io.in(`user:${senderId}`).socketsJoin(`game:${gameId}`);
          });
          await runPostCommitEffect("join receiver sockets to game room", async () => {
            if (!io) throw new Error("Socket.IO unavailable");
            await io.in(`user:${receiverId}`).socketsJoin(`game:${gameId}`);
          });
          await runPostCommitEffect("notify sender of accepted invitation", () => {
            if (!io) throw new Error("Socket.IO unavailable");
            io.to(`user:${senderId}`).emit("game:invite:accepted", acceptedPayload);
          });
          await runPostCommitEffect("notify receiver of accepted invitation", () => {
            if (!io) throw new Error("Socket.IO unavailable");
            io.to(`user:${receiverId}`).emit("game:invite:accepted", acceptedPayload);
          });
          await runPostCommitEffect("notify sender of created game", () => {
            if (!io) throw new Error("Socket.IO unavailable");
            io.to(`user:${senderId}`).emit("game:created", {
              id: gameId,
              mode: "MULTIPLAYER",
              status: "WAITING",
              code: null,
              createdAt: createdAt.toISOString(),
            });
          });
          await runPostCommitEffect("notify receiver of joined game", () => {
            if (!io) throw new Error("Socket.IO unavailable");
            io.to(`user:${receiverId}`).emit("game:joined", {
              id: gameId,
              status: "WAITING",
              turnVersion: 0,
            });
          });
          await runPostCommitEffect("notify game room of update", () => {
            if (!io) throw new Error("Socket.IO unavailable");
            io.to(`game:${gameId}`).emit("game:updated", {
              id: gameId,
              status: "WAITING",
              turnVersion: 0,
            });
          });

          for (const invitation of cancelledInvitations) {
            const cancelledPayload = { inviteId: invitation.inviteId };
            await runPostCommitEffect("notify related invitation cancellation to sender", () => {
              if (!io) throw new Error("Socket.IO unavailable");
              io.to(`user:${invitation.senderId}`).emit(
                "game:invite:cancelled",
                cancelledPayload,
              );
            });
            await runPostCommitEffect("notify related invitation cancellation to receiver", () => {
              if (!io) throw new Error("Socket.IO unavailable");
              io.to(`user:${invitation.receiverId}`).emit(
                "game:invite:cancelled",
                cancelledPayload,
              );
            });
          }
          await runPostCommitEffect("refresh online user presence", () =>
            refreshPresenceForOnlineUsers(),
          );
        } catch (error) {
          console.error("Invitation acceptance post-commit processing failed", {
            errorType: error instanceof Error ? error.name : typeof error,
          });
        }

        try {
          ack({ ok: true, inviteId, gameId, status: "WAITING" });
        } catch {
          console.error("Invitation acceptance acknowledgement could not be sent");
        }
      })();
    });

    socket.on("game:invite:reject", (payload, acknowledge) => {
      void (async () => {
        const ack = typeof acknowledge === "function" ? acknowledge : () => {};
        try {
          if (!payload || !validInviteId(payload.inviteId)) {
            ack({ ok: false, error: "VALIDATION_ERROR" });
            return;
          }
          const result = await respondToGameInvitation(
            userId,
            payload.inviteId,
            "REJECTED",
          );
          if (!result.ok) {
            ack({ ok: false, error: result.error });
            return;
          }
          const response = { inviteId: payload.inviteId };
          io?.to(`user:${userId}`).emit("game:invite:rejected", response);
          io?.to(`user:${result.otherUserId}`).emit("game:invite:rejected", response);
          ack({ ok: true, inviteId: payload.inviteId });
        } catch (error) {
          console.error("Error rejecting game invitation:", error);
          ack({ ok: false, error: "INTERNAL_ERROR" });
        }
      })();
    });

    socket.on("game:invite:cancel", (payload, acknowledge) => {
      void (async () => {
        const ack = typeof acknowledge === "function" ? acknowledge : () => {};
        try {
          if (!payload || !validInviteId(payload.inviteId)) {
            ack({ ok: false, error: "VALIDATION_ERROR" });
            return;
          }
          const result = await respondToGameInvitation(
            userId,
            payload.inviteId,
            "CANCELLED",
          );
          if (!result.ok) {
            ack({ ok: false, error: result.error });
            return;
          }
          const response = { inviteId: payload.inviteId };
          io?.to(`user:${userId}`).emit("game:invite:cancelled", response);
          io?.to(`user:${result.otherUserId}`).emit("game:invite:cancelled", response);
          ack({ ok: true, inviteId: payload.inviteId });
        } catch (error) {
          console.error("Error cancelling game invitation:", error);
          ack({ ok: false, error: "INTERNAL_ERROR" });
        }
      })();
    });

    socket.on("join:game", async (gameId: number | string) => {
      try {
        const gid = Number(gameId);

        if (Number.isNaN(gid) || !Number.isInteger(gid) || gid < 1) {
          socket.emit("error:game", { message: "No se pudo unir a la sala" });
          return;
        }

        const participacion = await prisma.gamePlayer.findFirst({
          where: { gameId: gid, userId },
        });

        if (!participacion) {
          socket.emit("error:game", {
            message: "No participas en esta partida",
          });
          return;
        }

        await socket.join(`game:${gid}`);
        socket.emit("joined:game", { gameId: gid });
      } catch (error) {
        console.error("Error in join:game:", error);
        socket.emit("error:game", { message: "No se pudo unir a la sala" });
      }
    });

    socket.once("disconnect", (reason) => {
      const unregistration = unregisterOnlineSocket(userId, socket.id);
      if (!unregistration.wentOffline) return;
      if (unregistration.presence) {
        emitPresenceChanged({ ...unregistration.presence, status: "OFFLINE" });
      }
      void cancelUserInvitations(userId).catch((error) => {
        console.error(`Error cancelling invitations after disconnect (${reason}):`, error);
      });
    });
  });

  if (invitationExpiryTimer) clearInterval(invitationExpiryTimer);
  invitationExpiryTimer = setInterval(() => {
    void broadcastExpiredInvitations().catch((error) => {
      console.error("Error expiring game invitations:", error);
    });
  }, INVITATION_EXPIRY_SWEEP_MS);
  invitationExpiryTimer.unref();

  return io;
}
