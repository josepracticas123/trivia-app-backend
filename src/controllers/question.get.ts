import type { Request, Response } from "express";
import { getQuestions, getQuestionById } from "../services/question.service.js";
import { questionIdSchema } from "../schemas/question-id.schema.js";
import { responderError } from "../errors/responderError.js";
import { paginationQuerySchema } from "../schemas/query.schema.js";

/*
  Controlador para obtener preguntas.
  Flujo:
  1. Validar query params de paginación y búsqueda usando Zod schema.
  2. Si la validación falla, responder error 400.
  3. Llamar al servicio getQuestions con los parámetros validados.
  4. Mapear las preguntas a formato público (quitar hash, exponer solo datos visibles).
  5. Devolver items + metadata de paginación (total, page, pageSize).
*/
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

/*
  Controlador para obtener una pregunta por ID.
  Flujo:
  1. Validar el parámetro 'id' de la URL usando Zod schema.
  2. Si la validación falla, responder error 400 (PREGUNTA_ID_INVALIDO).
  3. Convertir el ID de texto a número (llega en la URL como string).
  4. Consultar la pregunta en la base de datos.
  5. Si no existe, responder error 404 (QUESTION_NOT_FOUND).
  6. Devolver los datos públicos de la pregunta (sin el hash de la contraseña).
*/
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
