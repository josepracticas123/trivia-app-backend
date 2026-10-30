import type { Request, Response } from "express";
import { deleteWaitingGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";
import { idParamSchema } from "../schemas/question-id.schema.js";

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

  return res.status(204).send();
}