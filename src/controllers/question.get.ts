import type { Request, Response } from "express";
import { getQuestions, getQuestionById } from "../services/question.service.js";
import { questionIdSchema } from "../schemas/question-id.schema.js";
import { responderError } from "../errors/responderError.js";
import { paginationQuerySchema } from "../schemas/query.schema.js";

export async function getQuestionsController(req: Request, res: Response) {
  // Validamos los query params.
  const resultado = paginationQuerySchema.safeParse(req.query);
  if (!resultado.success) {
    return responderError(res, "VALIDATION_ERROR"); // ajusta al código de error que uses
  }

  const { page, pageSize, search, categoryId } = resultado.data;

  // Llamamos al servicio con los parámetros validados.
  const { items, total } = await getQuestions({ page, pageSize, search, categoryId });

  // Adaptamos cada pregunta al formato público.
  const itemsPublicos = items.map((pregunta) => ({
    id: pregunta.id,
    enunciado: pregunta.statement,
    categoryId: pregunta.categoryId,
    opciones: pregunta.choices.map((choice) => choice.text),
  }));

  // Devolvemos items + metadatos de paginación.
  return res.json({ items: itemsPublicos, total, page, pageSize });
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
