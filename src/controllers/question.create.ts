import type { Request, Response } from "express";
import { createQuestion, categoryExist } from "../services/question.service.js";
import { questionSchema } from "../schemas/question.schema.js";
import { responderError } from "../errors/responderError.js";

/*
  Controlador para crear una nueva pregunta.
  Flujo:
  1. Validar el cuerpo de la petición usando el esquema Zod questionSchema.
  2. Si la validación falla, responder error 400 (datos inválidos).
  3. Verificar que la categoría existe en la base de datos (validación de integridad).
  4. Si la categoría no existe, responder error 400.
  5. Llamar al servicio createQuestion con los datos validados.
  6. Devolver la pregunta creada con estado 201, incluyendo id, enunciado, categoría y opciones.
*/
export async function createQuestionController(req: Request, res: Response) {
  // Validamos el cuerpo de la petición con el esquema de zod antes de tocar la BBDD.
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
