import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  createGame,
  getGameById,
  submitAnswer,
} from "../services/game.services.js";
import { answerSchema } from "../schemas/answer.schema.js";

/* Crea una partida individual para el usuario autenticado. */
export async function createGameController(req: Request, res: Response) {
  // El id del usuario lo puso el authMiddleware en res.locals.
  const userId = res.locals.userId;

  const game = await createGame(userId);

  // Si no hay cinco preguntas en el catálogo, 409.
  if (!game) {
    return res.status(409).json({
      error: {
        code: "NOT_ENOUGH_QUESTIONS",
        message: "No hay suficientes preguntas para crear una partida",
      },
    });
  }

  // Devolvemos solo el id y el estado; las preguntas se piden con GET.
  return res.status(201).json({
    id: game.id,
    status: game.status,
  });
}

// devuelve el estado de una pregunta aun participante
export async function getGameController(req: Request, res: Response) {
  //La ide aviene siempre del token( ya la validó authMiddleware)
  const userId = res.locals.userId;

  /* en Espress. req.params.id llega como texto
  lo convertimos a número y validamos que se aun estero válido */
  const gameId = Number(req.params.id);
  if (!Number.isInteger(gameId) || gameId < 1) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "El id de la partida no es válido",
      },
    });
  }
  //¿existe?
  const game = await getGameById(gameId);
  if (!game) {
    return res.status(404).json({
      error: {
        code: "GAME_NOT_FOUND",
        message: "El id de la partida no es válido",
      },
    });
  }

  //¿es participante? game.players es un array de userId
  const esParticipante = game.players.some(
    (player) => player.userId === userId,
  );
  if (!esParticipante) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "No participas en esta partida",
      },
    });
  }

  /* respuesta pública,  campo a campo. nunca hacemos res.json(game) 
    porque game, incluye la solucion y revela la respuesta*/
  return res.status(200).json({
    id: game.id,
    status: game.status,
    questions: game.questions.map((question) => ({
      id: question.id, //el id de la pregunsta / de la partida (la copia) no el questionId del catalogo
      position: question.position,
      statement: question.statement,
      choices: question.choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
        position: choice.position,
      })),
      // no enviamos: solution, questionId, answer
    })),
  });
}

// responde la pregunta de partida que esta en el turno.
export async function answerController(req: Request, res: Response) {
  //el id del usuario lo puso el authmiddlewasre en res.locals, ya valisó el token
  const userId = res.locals.userId;

  //1- el id de la partida viene de la URL como texto: validar igual que en GET
  const gameId = Number(req.params.id);
  if (!Number.isInteger(gameId) || gameId < 1) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "El id de la partida no es válido",
      },
    });
  }

  //2- validar el cuerpo del zod ( mismo patrón que createQuestionsController)
  const resultadoValidacion = answerSchema.safeParse(req.body);
  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }
  /* 3- toda la lógica vive en el servicio.
  aquí solo orquestamos y traducimos  */
  const resultado = await submitAnswer(
    gameId,
    userId,
    resultadoValidacion.data.gameQuestionId,
    resultadoValidacion.data.choiceId,
  );

  /* 4- Esta tabla traduce cada error del servicio a su HTTP.  */

  if (!resultado.ok) {
    const errores = {
      GAME_NOT_FOUND:         { status: 404, code: "GAME_NOT_FOUND",         message: "La partida no existe" },
      NOT_PARTICIPANT:        { status: 403, code: "FORBIDDEN",              message: "No participas en esta partida" },
      GAME_FINISHED:          { status: 409, code: "GAME_FINISHED",          message: "La partida ya ha finalizado" },
      QUESTION_NOT_IN_GAME:   { status: 404, code: "QUESTION_NOT_IN_GAME",   message: "Esa pregunta no pertenece a esta partida" },
      WRONG_TURN:             { status: 409, code: "WRONG_TURN",             message: "Todavía no le toca a esa pregunta" },
      CHOICE_NOT_IN_QUESTION: { status: 400, code: "CHOICE_NOT_IN_QUESTION", message: "La opción no pertenece a esa pregunta" },
      ALREADY_ANSWERED:       { status: 409, code: "ALREADY_ANSWERED",       message: "Ya has respondido esta pregunta" },
    };

    const error = errores[resultado.error];
    return res.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
  }

 /* 5- 200: isCorrect y score los calculó el backend
 el cliente solo recibe, nunca envía ni modifica.  */
 return res.status(200).json({
  gameQuestionId:resultadoValidacion.data.gameQuestionId,
  isCorrect: resultado.isCorrect,
  score: resultado.score,
  finished: resultado.finished, // true al responder la quinta
 });
}
