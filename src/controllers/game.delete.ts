import type { Request, Response } from "express";
import { deleteWaitingGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";
import { idParamSchema } from "../schemas/question-id.schema.js";
import { io, refreshPresenceForOnlineUsers } from "../sockets/index.js";
import { runPostCommitEffect } from "./post-commit-effects.js";

// El creador puede eliminar una sala multijugador que aún está esperando.
export async function deleteGameController(req: Request, res: Response) {
  const userId = res.locals.userId;

  const resultadoId = idParamSchema.safeParse(req.params);
  if (!resultadoId.success) {
    return responderError(res, "PARTIDA_ID_INVALIDO");
  }

  const gameId = Number(resultadoId.data.id);
  const resultado = await deleteWaitingGame(gameId, userId);

  if (!resultado.ok) {
    return responderError(res, resultado.error);
  }

  // El borrado ya se confirmó en la base de datos. Los sockets que estaban
  // en la sala aún pueden recibir este aviso aunque GamePlayer se borre en
  // cascada junto con la partida.
  await runPostCommitEffect("notify game deletion", () => {
    if (!io) throw new Error("Socket.IO unavailable");
    io.to(`game:${gameId}`).emit("game:deleted", { id: gameId });
  });
  await runPostCommitEffect("refresh presence after game deletion", () =>
    refreshPresenceForOnlineUsers(),
  );

  return res.status(204).send();
}
