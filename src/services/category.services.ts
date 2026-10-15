import { prisma } from "../lib/prisma.js";
/*  Consulta la bbdd y devuelve todas las categorias, no sabe nada de hattp*/
export async function getCategories() {
  return prisma.category.findMany({
    // Pedimos los campos qu equeremos devolver
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
