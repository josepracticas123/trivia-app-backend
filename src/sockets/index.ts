import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

// Instancia de Socket.IO. Se inicializa de forma diferida en `initSockets`
// para evitar la dependencia circular con `src/server.ts` (que crea el
// servidor HTTP y luego monta Socket.IO sobre él).
export let io: SocketIOServer | undefined;

export function initSockets(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Token de autenticación requerido"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        sub: string;
      };
      socket.data.userId = Number(decoded.sub);
      next();
    } catch {
      return next(new Error("Token inválido o caducado"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    socket.on("join:game", async (gameId: number | string) => {
      try {
        const gid = Number(gameId);

        // Validamos que sea un entero válido mayor que 0
        if (Number.isNaN(gid) || !Number.isInteger(gid) || gid < 1) {
          socket.emit("error:game", { message: "No se pudo unir a la sala" });
          return;
        }

        const participacion = await prisma.gamePlayer.findFirst({
          where: { gameId: gid, userId },
        });

        if (!participacion) {
          socket.emit("error:game", { message: "No participas en esta partida" });
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
