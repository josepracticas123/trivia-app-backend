import { prisma } from "../lib/prisma.js";

// Creamos el primer servicio. para la consulta select.
export async function getQuestions() {
  return prisma.question.findMany({
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

/* Buscamos la sola ppegunta por su ID, si no existe, dvuelv null
limiamos cons elect los campos que recibe el controlador y evitamos traer la respuesta correcta
*/

export async function getQuestionById(id: number) {
  return prisma.question.findUnique({
    where: { id },
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

/* El controlador nos mandará los datos válidos al servicio
el servicio adaptará los nombres públicos a los nombres de la base
statement, options y guardará la respuesta corrdecta. */

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

/* Función para actualizar las pregunta
El servicio actualiza los campos y comprueba cuántas filas cambió. Si no encontró ese ID, 
devuelve null; si lo encontró, 
vuelve a buscar la pregunta con getQuestionById, que devuelve solo los campos públicos.*/
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
