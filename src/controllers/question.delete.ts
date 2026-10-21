import type { Request, Response } from "express";
import { deleteQuestion } from "../services/question.service.js";
import { questionIdSchema } from "../schemas/question-id.schema.js";
import { responderError } from "../errors/responderError.js";
// Eliminamos una pregunta por su id.
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
