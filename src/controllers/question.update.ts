import type { Request, Response } from "express";
import { updateQuestion, categoryExist } from "../services/question.service.js";
import { questionIdSchema } from "../schemas/question-id.schema.js";
import { questionSchema } from "../schemas/question.schema.js";
import { responderError } from "../errors/responderError.js";

/*
  Controlador para actualizar una pregunta existente.
  Flujo:
  1. Validar el ID de la URL usando questionIdSchema.
  2. Si el ID no es válido, responder error 400 (PREGUNTA_ID_INVALIDO).
  2. Validar el cuerpo de la petición usando questionSchema.
  3. Si la validación falla, responder error 400 (datos inválidos).
  4. Verificar que la categoría existe antes de actualizar (integridad referencial).
  5. Si la categoría no existe, responder error 400.
  6. Convertir el ID de string a número (viene de la URL).
  7. Llamar al servicio updateQuestion con el ID y los datos validados.
  8. Si la pregunta no fue encontrada, responder error 404 (QUESTION_NOT_FOUND).
  9. Devolver la pregunta actualizada con sus datos completos.
*/
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
    return responderError(res, "VALIDATION_ERROR");
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
