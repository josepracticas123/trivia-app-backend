import type { Request, Response } from "express";
import { createGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";

/* Crea una partida individual para el usuario autenticado. */
export async function createGameController(req: Request, res: Response) {
  // El id del usuario lo puso el authMiddleware en res.locals.
  const userId = res.locals.userId;

  const game = await createGame(userId);

  // Si no hay cinco preguntas en el catálogo, 409.
  if (!game) {
    return responderError(res, "NOT_ENOUGH_QUESTIONS");
  }

  // Devolvemos solo el id y el estado; las preguntas se piden con GET.
  return res.status(201).json({
    id: game.id,
    status: game.status,
  });
}
