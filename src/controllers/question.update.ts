import type { Request, Response } from "express";
import { updateQuestion, categoryExist } from "../services/question.service.js";
import { questionIdSchema } from "../schemas/question-id.schema.js";
import { questionSchema } from "../schemas/question.schema.js";
import { responderError } from "../errors/responderError.js";

// Actualizamos una pregunta existente.
export async function updateQuestionController(req: Request, res: Response) {
  // Validamos el id de la URL.
  const resultadoId = questionIdSchema.safeParse(req.params);
  if (!resultadoId.success) {
    return responderError(res, "PREGUNTA_ID_INVALIDO");
  }

  // Validamos el cuerpo.
  const resultadoValidacion = questionSchema.safeParse(req.body);
  if (!resultadoValidacion.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  // La categoría debe existir antes de actualizar.
  const existeCategoria = await categoryExist(
    resultadoValidacion.data.categoryId,
  );
  if (!existeCategoria) {
    return responderError(res, "CATEGORY_NOT_FOUND");
  }

  const id = Number(resultadoId.data.id);
  const pregunta = await updateQuestion(id, resultadoValidacion.data);

  if (!pregunta) {
    return responderError(res, "QUESTION_NOT_FOUND");
  }

  return res.json({
    id: pregunta.id,
    enunciado: pregunta.statement,
    categoryId: pregunta.categoryId,
    opciones: pregunta.choices.map((choice) => choice.text),
  });
}
