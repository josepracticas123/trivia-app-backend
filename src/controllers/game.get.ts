import type { Request, Response } from "express";
import { getGameById } from "../services/game.services.js";
import { idParamSchema } from "../schemas/question-id.schema.js";
import { responderError } from "../errors/responderError.js";
// Devuelve el estado de la partida a un participante.
export async function getGameController(req: Request, res: Response) {
  // El id del usuario lo puso el authMiddleware en res.locals (ya validó el token).
  const userId = res.locals.userId;

  /* El id llega a la URL como texto. El esquema acepta solo dígitos
     entre el 1 y el 2147483647: rechaza 0, negativos, 1.5, 1e100 y lo que
     no quepa en el campo Int de PostgreSQL. Se valida ANTES de tocar la BBDD. */
  const resultadoId = idParamSchema.safeParse(req.params);
  if (!resultadoId.success) {
    return responderError(res, "PARTIDA_ID_INVALIDO");
  }
  // Ya validado: convertimos a número para pasarlo al servicio.
  const gameId = Number(resultadoId.data.id);

  // ¿existe? El userId permite marcar qué preguntas ha respondido ESTE usuario.
  const game = await getGameById(gameId, userId);
  if (!game) {
    return responderError(res, "GAME_ID_NOT_FOUND");
  }

  // ¿es participante? game.players es un array de userId
  const esParticipante = game.players.some(
    (player) => player.userId === userId,
  );
  if (!esParticipante) {
    return responderError(res, "NOT_PARTICIPANT");
  }

  const esMultijugador = game.mode === "MULTIPLAYER";

  /* Respuesta pública, campo a campo. Nunca hacemos res.json(game)
     porque game incluye la solución y revelaría la respuesta. */
  return res.status(200).json({
    id: game.id,
    status: game.status,
    // Versión del snapshot recuperado. No contiene información sensible.
    turnVersion: game.turnVersion,
    // Cuándo empezó la partida y cuándo terminó (null mientras sigue activa).
    createdAt: game.createdAt,
    finishedAt: game.finishedAt,
    // Progreso que calculó el servicio a partir de las respuestas guardadas.
    score: game.score, // puntos acumulados (1 por acierto)
    nextQuestionId: game.nextQuestionId, // id de la pregunta de turno; null al terminar
    ...(esMultijugador
      ? {
          mode: game.mode,
          // A quién le toca y qué pregunta debe responder ahora.
          currentTurn: game.currentTurn,
          // Puntuación revelada: no incluye la ronda pendiente de que
          // responda el segundo jugador.
          players: game.players.map((player) => ({
            userId: player.userId,
            turnOrder: player.turnOrder,
            score: player.score,
          })),
          winnerUserId: game.winnerUserId,
          isDraw: game.isDraw,
        }
      : {}),
    questions: game.questions.map((question) => {
      const base = {
        id: question.id, // el id de la pregunta en la partida (la copia), no el questionId del catálogo
        position: question.position,
        statement: question.statement,
        // true si ya respondiste esta pregunta; el cliente la marca como hecha.
        answered: question.answered ?? question.answers.length > 0,
        choices: question.choices.map((choice) => ({
          id: choice.id,
          text: choice.text,
          position: choice.position,
        })),
        // no enviamos: solution, questionId, answers
      };

      if (!esMultijugador) return base;

      return {
        ...base,
        // Cuántos han respondido (0, 1 o 2) y si ya se pueden revelar
        // los resultados. Sin aciertos hasta que ambos hayan respondido.
        answeredCount: question.answeredCount,
        revealed: question.revealed,
        results: question.results,
      };
    }),
  });
}
