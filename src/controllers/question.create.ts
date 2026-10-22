import type { Request, Response } from "express";
import { createQuestion, categoryExist } from "../services/question.service.js";
import { questionSchema } from "../schemas/question.schema.js";
import { responderError } from "../errors/responderError.js";

// Validamos el cuerpo de la petición con el esquema de zod antes de tocar la BBDD.
export async function createQuestionController(req: Request, res: Response) {
  const resultadoValidacion = questionSchema.safeParse(req.body);

  if (!resultadoValidacion.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  // Comprobamos que la categoría exista antes de crear la pregunta.
  const existeCategoria = await categoryExist(
    resultadoValidacion.data.categoryId,
  );
  if (!existeCategoria) {
    return responderError(res, "VALIDATION_ERROR");
  }

  const pregunta = await createQuestion(resultadoValidacion.data);

  return res.status(201).json({
    id: pregunta.id,
    enunciado: pregunta.statement,
    categoryId: pregunta.categoryId,
    opciones: pregunta.choices.map((choice) => choice.text),
  });
}
