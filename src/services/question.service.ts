import { prisma } from "../lib/prisma.js";

// Creamos el primer servicio. para la consulta select.
export async function getQuestions() {
  return prisma.question.findMany({
    select: {
      id: true,
      statement: true,
      options: true,
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
      options: true,
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
}) {
  return prisma.question.create({
    data: {
      statement: input.enunciado,
      options: input.opciones,
      solution: input.respuestaCorrecta,
    },
    select: {
      id: true,
      statement: true,
      options: true,
    },
  });
}

/* Función para actualizar las pregunta
El servicio actualiza los campos y comprueba cuántas filas cambió. Si no encontró ese ID, 
devuelve null; si lo encontró, 
vuelve a buscar la pregunta con getQuestionById, que devuelve solo los campos públicos.*/
export async function updateQuestion(
  id: number,
  input: { enunciado: string; opciones: string[]; respuestaCorrecta: number },
) {
  const resultado = await prisma.question.updateMany({
    where: { id },
    data: {
      statement: input.enunciado,
      options: input.opciones,
      solution: input.respuestaCorrecta,
    },
  });
  if (resultado.count === 0) {
    return null;
  }
  return getQuestionById(id);
}

/*deleteMany devuelve cuántas filas eliminó. 
Esta función devuelve true si encontró y borró una pregunta; 
devuelve false si ese ID no existía. */
export async function deleteQuestion(id: number) {
    const resultado = await prisma.question.deleteMany({ // Devuelve cuantas filas eliminó
        where: {id},
    });
    return resultado.count > 0;
}