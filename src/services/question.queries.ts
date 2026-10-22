/* Consultas (lecturas) de preguntas y categorías. */
import { prisma } from "../lib/prisma.js";

/*Consulta paginada de preguntas.
page: número de página (por defecto 1)
pageSize: tamaño de página (por defecto 10, máximo 50)
search: texto a buscar en el enunciado (opcional)
categoryId: filtrar por categoría (opcional)*/
export async function getQuestions(params:{
  page: number;
  pageSize: number;
  search?:number;
  categoryId?:number;
}){
  const {page, pageSize, search, categoryId} = params;
 //construimos el filtro where una sola vez para usarlo en items y total.
 const where: {
  //si hay search, filtramos por enunciado (insensible a mayúsculas).
  ...search 
 }
};


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