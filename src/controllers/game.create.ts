import type { Request, Response } from "express";
import { createGame, createMultiplayerGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";
import { createGameSchema } from "../schemas/game.schema.js";

/*
  Controlador para crear una partida nueva.
  Flujo:
  1. Obtener el userId del usuario autenticado (res.locals.set por authMiddleware).
  2. Validar el body de la petición usando createGameSchema de Zod.
  3. Si la validación falla, responder error 400 (datos inválidos).
  4. Obtener el modo de la partida (individual o multijugador) del body.
  5. Si el modo es MULTIPLAYER:
       - Llamar a createMultiplayerGame(userId).
       - Crear sala en estado WAITING con código de invitación de 6 caracteres.
       - Devolver la ID de la partida, status y código al cliente.
  6. Si el modo es individual (por defecto):
       - Llamar a createGame(userId).
       - Si no se crea la partida (falta de preguntas en el catálogo), responder error 409 (NOT_ENOUGH_QUESTIONS).
       - Devolver la ID de la partida y status al cliente.
*/
export async function createGameController(req: Request, res: Response) {
  // Crea una partida individual o multijugador según el body.
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
