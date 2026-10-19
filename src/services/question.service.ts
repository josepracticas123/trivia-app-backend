import { prisma } from "../lib/prisma.js";

// Creamos el primer servicio, para la consulta select.
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

/* Buscamos la pregunta por su ID; si no existe, devuelve null.
Limpiamos con select los campos que recibe el controlador y evitamos traer la respuesta correcta.
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
statement, options y guardará la respuesta correcta. */

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

/* Buscamos y eliminamos la pregunta por el id.
Devuelve true si se borró; false si no existía esa pregunta. */
export async function deleteQuestion(id: number) {
  const result = await prisma.question.deleteMany({
    where: { id },
  });

  // Como el id es único, count solo puede ser 0 o 1.
  return result.count > 0;
}

/* Comprueba si hay una categoría por ID. 
Devuelve true si Prisma la encuentra, y false si no existe. */
export async function categoryExist(categoryId: number) {
  const category = await prisma.category.findUnique({ // Busca el campo único
    where: { id: categoryId },
    select: { id: true },
  });
  return category !== null;
}
