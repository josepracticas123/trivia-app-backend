import type { Request, Response } from "express";
import { submitAnswer } from "../services/game.services.js";
import { answerSchema } from "../schemas/answer.schema.js";
import { idParamSchema } from "../schemas/question-id.schema.js";
import { responderError } from "../errors/responderError.js";
import { responderMiddlewareError } from "../errors/responderMiddlewareError.js";
import { io } from "../sockets/index.js";
import { prisma } from "../lib/prisma.js";

// Responde la pregunta de partida que está en el turno.
export async function answerController(req: Request, res: Response) {
  // El id del usuario lo puso el authMiddleware en res.locals; ya validó el token.
  const userId = res.locals.userId;

  /* 1- El id de la URL, misma validación que el GET (solo dígitos),
     1..2147483647. El 400 llega antes de llamar al servicio. */
  const resultadoId = idParamSchema.safeParse(req.params);
  if (!resultadoId.success) {
    return responderError(res, "PARTIDA_ID_INVALIDO");
  }
  const gameId = Number(resultadoId.data.id);

  // 2- Validar el cuerpo con zod (el mismo esquema que usa el controlador de creación).
  const resultadoValidacion = answerSchema.safeParse(req.body);
  if (!resultadoValidacion.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  /* 3- Toda la lógica vive en el servicio.
     Aquí solo orquestamos y traducimos. */
  const resultado = await submitAnswer(
    gameId,
    userId,
    resultadoValidacion.data.gameQuestionId,
    resultadoValidacion.data.choiceId,
  );

  /* 4- Cada error del servicio se traduce a su respuesta HTTP */
  if (!resultado.ok) {
    const traduccion = {
      GAME_NOT_FOUND: "GAME_NOT_FOUND",
      NOT_PARTICIPANT: "NOT_PARTICIPANT",
      GAME_NOT_ACTIVE: "GAME_NOT_ACTIVE",
      GAME_FINISHED: "GAME_FINISHED",
      QUESTION_NOT_IN_GAME: "QUESTION_NOT_IN_GAME",
      WRONG_TURN: "WRONG_TURN",
      CHOICE_NOT_IN_QUESTION: "CHOICE_NOT_IN_QUESTION",
      ALREADY_ANSWERED: "ALREADY_ANSWERED",
      CONFLICTO_CONCURRENCIA: "CONFLICTO_CONCURRENCIA",
    } as const;

    return responderError(res, traduccion[resultado.error]);
  }
  // Tras guardar y confirmar la respuesta, leemos estado fresco (id, status, turnVersion)
  const gameState = await prisma.game?.findUnique({
    where: { id: gameId },
    select: { id: true, status: true, turnVersion: true },
  });

  if (gameState) {
    // Emitimos aviso a la sala autorizada. Solo datos públicos.
   if (!io) {
     console.error("Socket.IO no inicializado: no se puede emitir game:updated");
     return responderMiddlewareError(res, "INTERNAL_SERVER_ERROR");
   }
   io.to(`game:${gameState.id}`).emit("game:updated", {
      id: gameState.id,
      status: gameState.status,
      turnVersion: gameState.turnVersion,
    });
  }
  // Modo individual: se conserva el contrato del reto 13.
  if (resultado.mode !== "MULTIPLAYER") {
    return res.status(200).json({
      gameQuestionId: resultadoValidacion.data.gameQuestionId,
      isCorrect: resultado.isCorrect,
      score: resultado.score,
      finished: resultado.finished,
    });
  }

  /* Modo multijugador: la primera respuesta de la ronda NO devuelve
     isCorrect, ni score, ni resultados. Solo cuando responde el segundo
     jugador se revelan los dos resultados y las puntuaciones. */
  return res.status(200).json({
    gameQuestionId: resultado.gameQuestionId,
    roundComplete: resultado.roundComplete,
    finished: resultado.finished,
    nextTurn: resultado.nextTurn,
    ...(resultado.roundComplete
      ? {
          results: resultado.results,
          players: resultado.players,
          winnerUserId: resultado.winnerUserId,
          isDraw: resultado.isDraw,
        }
      : {}),
  });
}
