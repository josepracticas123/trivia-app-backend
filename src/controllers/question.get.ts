import type { Request, Response } from "express";
import { getQuestions, getQuestionById } from "../services/question.service.js";
import { questionIdSchema } from "../schemas/question-id.schema.js";
import { responderError } from "../errors/responderError.js";
// Controlador que llama al servicio y adapta los datos de la BBDD al formato público.
export async function getQuestionsController(_req: Request, res: Response) {
  const preguntas = await getQuestions();

  const preguntasPublicas = preguntas.map((pregunta) => ({
    id: pregunta.id,
    enunciado: pregunta.statement,
    categoryId: pregunta.categoryId,
    opciones: pregunta.choices.map((choice) => choice.text),
  }));
  return res.json(preguntasPublicas);
}

// Validamos el id de la URL; si no cumple las reglas, respondemos con un error.
export async function getQuestionByIdController(req: Request, res: Response) {
  const resultadoValidacion = questionIdSchema.safeParse(req.params);

  if (!resultadoValidacion.success) {
    return responderError(res, "PREGUNTA_ID_INVALIDO");
  }

  // Convertimos a número porque en la URL llega como texto.
  const id = Number(resultadoValidacion.data.id);
  const pregunta = await getQuestionById(id);

  if (!pregunta) {
    return responderError(res, "QUESTION_NOT_FOUND");
  }

  // Respondemos en el formato público.
  return res.json({
    id: pregunta.id,
    enunciado: pregunta.statement,
    categoryId: pregunta.categoryId,
    opciones: pregunta.choices.map((choice) => choice.text),
  });
}
