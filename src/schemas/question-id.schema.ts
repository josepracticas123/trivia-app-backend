import { z } from "zod";
// Define el esquema de validación para el ID de una pregunta, asegurando que sea un número entero positivo representado como string.
export const questionIdSchema = z
  .object({
    id: z.string().regex(/^\d+$/), // El ID debe ser un número entero positivo representado como string
  })
  .strict(); // No se permiten propiedades adicionales en el objeto del ID de la pregunta
