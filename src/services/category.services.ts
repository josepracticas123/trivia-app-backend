import { prisma } from "../lib/prisma.js";
/* Consulta la BBDD y devuelve todas las categorías; no sabe nada de HTTP. */
export async function getCategories() {
  return prisma.category.findMany({
    // Pedimos los campos que queremos devolver.
    select: {
      id: true,
      name: true,
    },
    //Los datos recibidos los ordenamos.
    orderBy: {
      name: "asc",
    },
  });
}
