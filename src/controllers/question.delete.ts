import type { Request, Response } from "express";
import { deleteQuestion } from "../services/question.service.js";
import { questionIdSchema } from "../schemas/question-id.schema.js";
import { responderError } from "../errors/responderError.js";
/*
  Controlador para eliminar una pregunta por su ID.
  Flujo:
  1. Validar el parámetro 'id' de la URL usando questionIdSchema.
  2. Si la validación falla, responder error 400 (PREGUNTA_ID_INVALIDO).
  3. Convertir el ID de string a número (viene de la URL como parámetro).
  4. Llamar al servicio deleteQuestion con el ID.
  5. Si la pregunta no fue encontrada o no se pudo eliminar, responder error 404 (QUESTION_NOT_FOUND).
  6. Si la eliminación fue exitosa, responder con estado 204 (No Content), sin cuerpo en la respuesta.
*/
export async function deleteQuestionController(req: Request, res: Response) {
  const resultadoValidacion = questionIdSchema.safeParse(req.params);

  if (!resultadoValidacion.success) {
    return responderError(res, "PREGUNTA_ID_INVALIDO");
  }

  const id = Number(resultadoValidacion.data.id);
  const borrada = await deleteQuestion(id);

  if (!borrada) {
    return responderError(res, "QUESTION_NOT_FOUND");
  }

  // 204: borrada sin cuerpo.
  return res.status(204).send();
}
