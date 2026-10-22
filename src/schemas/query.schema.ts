import { z } from "zod";

// Esquema para los query params de paginación/filtros.
// page y pageSize llegan como string desde la URL, por eso usamos coerce.
export const paginationQuerySchema = z.object({
  // page: por defecto 1, mínimo 1
  page: z.coerce.number().int().min(1).max(1000).default(1),
  // pageSize: por defecto 10, entre 1 y 50
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  // search opcional (texto)
  search: z.string().max(100).optional(),
  // categoryId opcional (número)
  categoryId: z.coerce.number().int().min(1).max(2147483647).optional(),
});