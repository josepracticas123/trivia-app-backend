import type { Request, Response } from "express";
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../services/question.service.js";
import { questionIdSchema } from "../schemas/question-id.schema.js";
import { questionSchema } from "../schemas/question.schema.js";

// Controlador que llama al servicio y adapta los datos de la BBDD el formato publico
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

//Validamos los datos con el objeto existente, si el ID no cumple las reglas respodnemos un error.
export async function getQuestionByIdController(req: Request, res: Response) {
  const resultadoValidacion = questionIdSchema.safeParse(req.params);

  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }
  // Con  ésto lo convertimos  a number.
  const id = Number(resultadoValidacion.data.id);

  // Pedimos buscar esa pregunta.
  const pregunta = await getQuestionById(id);

  // Convertimos el null del servicio en una respuesta de error.
  if (!pregunta) {
    return res.status(404).json({
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "Pregunta no encontrada",
      },
    });
  }

  return res.json({
    id: pregunta.id,
    enunciado: pregunta.statement,
    categoryId: pregunta.categoryId,
    opciones: pregunta.choices.map((choice) => choice.text),
  });
}
/* Con req.body es el JSOn qu eenvía el cliente, si safeParse lo valida. 
   si no son los datos correctos mandamos el error.*/
export async function createQuestionController(req: Request, res: Response) {
  const resultadoValidacion = questionSchema.safeParse(req.body);

  //El if termina cuando los resultados son invalidos.
  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }
  // Para devolver la pregunta sin la solución. Se ejecuta con los datos qu epasaron la validación.
  const nuevaPregunta = await createQuestion(resultadoValidacion.data);

  //Añadimos la verificación de que la pregunta se creó.
  return res.status(201).json({
    id: nuevaPregunta.id,
    enunciado: nuevaPregunta.statement,
    opciones: nuevaPregunta.options,
  });
}

/* Validamos el ID que viene en la URL, si no es válido
devolveremos el error 400, y el JSON del cuerpo */

export async function updateQuestionController(req: Request, res: Response) {
  const resultadoValidacionId = questionIdSchema.safeParse(req.params);

  if (!resultadoValidacionId.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "los datos enviados no son válidos",
      },
    });
  }

  const id = Number(resultadoValidacionId.data.id);

  // Validamos los datos enviados formato JSON si no enviamos un error.
  const resultadoValidacionJson = questionSchema.safeParse(req.body);

  if (!resultadoValidacionJson.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  //Pasamos el servicio ID valido sino devolveremos el error.
  const preguntaActualizada = await updateQuestion(
    id,
    resultadoValidacionJson.data,
  );
  if (!preguntaActualizada) {
    return res.status(404).json({
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "Pregunta no encontrada",
      },
    });
  }
  /*Si el servicio devuelve una pregunta, Express responde con 200 OK.
   Construimos el objeto con los nombres públicos y no incluimos la solución. */
  return res.json({
    id: preguntaActualizada.id,
    enunciado: preguntaActualizada.statement,
    opciones: preguntaActualizada.options,
  });
}

export async function deleteQuestionController(req: Request, res: Response) {
  const resultadoValidacionId = questionIdSchema.safeParse(req.params);

  if (!resultadoValidacionId.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }
  // Después de confirmar que es un ID válido, esta línea lo convierte a número para prisma.
  const id = Number(resultadoValidacionId.data.id);
  //El servicio intenta borrar la pregunta y devuelve true si la encontró o false si no existía
  const eliminada = await deleteQuestion(id);
  //Si no se borró ninguna fila, respondemos 404 porque ese ID no existe
  if (!eliminada) {
    return res.status(404).json({
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "Pregunta no encontrada",
      },
    });
  }
  //si el servicio borró la pregunta respondemos 204 No Content
  return res.status(204).send();
}
