import type { Request, Response } from "express";
import { createGame, createMultiplayerGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";
import { createGameSchema } from "../schemas/game.schema.js";

// Crea una partida individual o multijugador según el body.
export async function createGameController(req: Request, res: Response) {
  const userId = res.locals.userId; // ID del usuario autenticado (del token).

  // Valida el body con Zod (mode opcional, por defecto INDIVIDUAL).
  const resultado = createGameSchema.safeParse(req.body ?? {});
  if (!resultado.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  const mode = resultado.data.mode;

  // Modo multijugador: crea sala WAITING con código de invitación.
  if (mode === "MULTIPLAYER") {
    const game = await createMultiplayerGame(userId);
    return res.status(201).json({
      id: game.id,
      status: game.status,
      code: game.code, // Código para que otro jugador entre.
    });
  }

  // Modo individual (por defecto).
  const game = await createGame(userId);
  if (!game) {
    return responderError(res, "NOT_ENOUGH_QUESTIONS"); // Menos de 5 preguntas en catálogo.
  }
  return res.status(201).json({
    id: game.id,
    status: game.status,
  });
}
