import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import type { AppServer, AppSocket, SocketData } from "./socket.types.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./socket.types.js";

export let io: AppServer | undefined;

export function initSockets(server: HttpServer): AppServer {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  io.use(async (socket: AppSocket, next) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Token de autenticación requerido"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ["HS256"],
      }) as unknown;

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

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        return next(new Error("Token inválido o caducado"));
      }

      socket.data.userId = userId;

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
    } catch {
      return next(new Error("Token inválido o caducado"));
    }
  });

  io.on("connection", (socket: AppSocket) => {
    const userId = socket.data.userId;

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
      } catch {
        socket.emit("error:game", { message: "No se pudo unir a la sala" });
      }
    });
  });

  return io;
}
