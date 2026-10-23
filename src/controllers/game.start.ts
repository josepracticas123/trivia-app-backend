import type { Request, Response } from "express";
import { startGame } from "../services/game.mutations.js";
import { responderError } from "../errors/responderError.js";

//El creador inicia la partida multijugador
export async function startGameController(req: Request, res: Response) {
  const userId = res.locals.userId;
  const gameId = Number(req.params.id);

  // Validamos qu eel id se aun número válido
  if (!Number.isInteger(gameId) || gameId < 1) {
    return responderError(res, "VALIDATION_ERROR");
  }

  const resultado = (await startGame(gameId, userId)) as
    | { ok: true; game: { id: number; status: string } }
    | { ok: false; error: string };

  if (!resultado.ok) {
    const mapa: Record<string, string> = {
      PARTIDA_NO_EXISTE: "GAME_NOT_FOUND",
      NO_ES_MULTIJUGADOR: "VALIDATION_ERROR",
      PARTIDA_YA_INICIADA: "GAME_FINISHED",
      NO_ES_CREADOR: "NOT_ADMIN",
      FALTAN_JUGADORES: "VALIDATION_ERROR",
      NO_HAY_PREGUNTAS: "NOT_ENOUGH_QUESTIONS",
    };
    const codigoError = mapa[resultado.error] ?? "VALIDATION_ERROR";
    return responderError(res, codigoError as any);
  }

  return res
    .status(200)
    .json({ id: resultado.game.id, status: resultado.game.status });
}
