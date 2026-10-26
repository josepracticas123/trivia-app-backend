import { Server as SocketIOServer } from "socket.io";
import { server } from "../server.js";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export const io = new SocketIOServer(server, {
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

  socket.on("join:game", async (gameId: number) => {
    try {
      const participacion = await prisma.gamePlayer.findFirst({
        where: { gameId, userId },
      });

      if (!participacion) {
        socket.emit("error:game", { message: "No participas en esta partida" });
        return;
      }

      await socket.join(`game:${gameId}`);
      socket.emit("joined:game", { gameId });
    } catch {
      socket.emit("error:game", { message: "No se pudo unir a la sala" });
    }
  });
});
