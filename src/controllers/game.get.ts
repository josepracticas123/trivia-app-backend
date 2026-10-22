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

  // ¿existe?
  const game = await getGameById(gameId);
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

  /* Respuesta pública, campo a campo. Nunca hacemos res.json(game)
     porque game incluye la solución y revelaría la respuesta. */
  return res.status(200).json({
    id: game.id,
    status: game.status,
    // Cuándo empezó la partida y cuándo terminó (null mientras sigue activa).
    createdAt: game.createdAt,
    finishedAt: game.finishedAt,
    // Progreso que calculó el servicio a partir de las respuestas guardadas.
    score: game.score, // puntos acumulados (1 por acierto)
    nextQuestionId: game.nextQuestionId, // id de la pregunta de turno; null al terminar
    questions: game.questions.map((question) => ({
      id: question.id, // el id de la pregunta en la partida (la copia), no el questionId del catálogo
      position: question.position,
      statement: question.statement,
      // true si ya respondiste esta pregunta; el cliente la marca como hecha.
      answered: question.answers.length > 0,
      choices: question.choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
        position: choice.position,
      })),
      // no enviamos: solution, questionId, answers
    })),
  });
}
