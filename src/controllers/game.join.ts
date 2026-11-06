import type { Request, Response } from "express";
import { joinGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";
import { joinCodeSchema } from "../schemas/game.schema.js";
import { io, refreshPresenceForOnlineUsers } from "../sockets/index.js";
import { prisma } from "../lib/prisma.js";
import { runPostCommitEffect } from "./post-commit-effects.js";
// Un usuario se une a una sala multijugador con un código de invitación.
export async function joinGameController(req: Request, res: Response) {
  const userId = res.locals.userId; // ID del usuario autenticado.

  // Valida el body (code con formato de 6 caracteres).
  const resultadoValidacion = joinCodeSchema.safeParse(req.body);
  if (!resultadoValidacion.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  // Llama al servicio; devuelve { ok, game } o { ok, error }.
  const resultado = await joinGame(userId, resultadoValidacion.data.code);

  if (!resultado.ok) {
    // El error del servicio es una clave del catálogo; se pasa directamente.
    return responderError(res, resultado.error);
  }
  // Tras confirmar la unión, leemos el estado público actualizado.
  const gameState = await runPostCommitEffect(
    "load joined game state for notification",
    () =>
      prisma.game?.findUnique({
        where: { id: resultado.game.id },
        select: { id: true, status: true, turnVersion: true },
      }),
  );

  await runPostCommitEffect("refresh presence after joining game", () =>
    refreshPresenceForOnlineUsers(),
  );

  if (gameState) {
    const payload = {
      id: gameState.id,
      status: gameState.status,
      turnVersion: gameState.turnVersion,
    };
    await runPostCommitEffect("notify joined game room", () => {
      if (!io) throw new Error("Socket.IO unavailable");
      io.to(`game:${gameState.id}`).emit("game:updated", payload);
    });
    await runPostCommitEffect("notify joining user", () => {
      if (!io) throw new Error("Socket.IO unavailable");
      io.to(`user:${userId}`).emit("game:joined", payload);
    });
  }

  return res.status(200).json({ id: resultado.game.id, status: resultado.game.status });
}
