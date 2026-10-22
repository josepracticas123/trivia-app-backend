/* Escrituras (crear, actualizar, borrar) de preguntas. */
import { prisma } from "../lib/prisma.js";
import { getQuestionById } from "./question.queries.js";

/* El controlador nos mandará los datos válidos al servicio;
el servicio adaptará los nombres públicos a los nombres de la base
(statement, choices) y guardará la respuesta correcta. */
export async function createQuestion(input: {
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number;
  categoryId: number;
}) {
  return prisma.question.create({
    data: {
      statement: input.enunciado,
      category: {
        connect: { id: input.categoryId },
      },
      choices: {
        create: input.opciones.map((text, position) => ({
          text,
          position,
          isCorrect: position === input.respuestaCorrecta,
        })),
      },
    },
    select: {
      id: true,
      statement: true,
      categoryId: true,
      choices: {
        select: {
          text: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });
}

/* Función para actualizar la pregunta.
El servicio actualiza los campos y comprueba cuántas filas cambió. Si no encontró ese ID,
devuelve null; si lo encontró, vuelve a buscar la pregunta con getQuestionById,
que devuelve solo los campos públicos. */
export async function updateQuestion(
  id: number,
  input: {
    enunciado: string;
    opciones: string[];
    respuestaCorrecta: number;
    categoryId: number;
  },
) {
  // Comprobamos si existe antes de intentar actualizarla.
  const existingQuestion = await prisma.question.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingQuestion) {
    return null;
  }

  // Actualizamos la pregunta, su categoría y sus opciones.
  await prisma.question.update({
    where: { id },
    data: {
      statement: input.enunciado,
      category: {
        connect: { id: input.categoryId },
      },
      choices: {
        deleteMany: {},
        create: input.opciones.map((text, position) => ({
          text,
          position,
          isCorrect: position === input.respuestaCorrecta,
        })),
      },
    },
  });

  // Devolvemos la pregunta actualizada con sus opciones ordenadas.
  return getQuestionById(id);
}

/* Buscamos y eliminamos la pregunta por el id.
Devuelve true si se borró; false si no existía esa pregunta. */
export async function deleteQuestion(id: number) {
  const result = await prisma.question.deleteMany({
    where: { id },
  });

  // Como el id es único, count solo puede ser 0 o 1.
  return result.count > 0;
}