import type { Request, Response } from "express";
import { startGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";
import { idParamSchema } from "../schemas/question-id.schema.js";

// El creador inicia la partida multijugador.
export async function startGameController(req: Request, res: Response) {
  const userId = res.locals.userId; // ID del usuario autenticado.

  // Valida el id de la URL (1–2147483647).
  const resultadoId = idParamSchema.safeParse(req.params);
  if (!resultadoId.success) {
    return responderError(res, "PARTIDA_ID_INVALIDO");
  }
  const gameId = Number(resultadoId.data.id);

  // Llama al servicio; devuelve { ok, game } o { ok, error }.
  const resultado = await startGame(gameId, userId);

  if (!resultado.ok) {
    return responderError(res, resultado.error);
  }

  return res
    .status(200)
    .json({ id: resultado.game.id, status: resultado.game.status });
}
