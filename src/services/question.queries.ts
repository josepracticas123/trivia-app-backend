/* Consultas (lecturas) de preguntas y categorías. */
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
Limpiamos con select los campos que recibe el controlador y evitamos traer la respuesta correcta. */
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

/* Comprueba si hay una categoría por ID.
Devuelve true si Prisma la encuentra, y false si no existe. */
export async function categoryExist(categoryId: number) {
  const category = await prisma.category.findUnique({
    // Busca el campo único
    where: { id: categoryId },
    select: { id: true },
  });
  return category !== null;
}