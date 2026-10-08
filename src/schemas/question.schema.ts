import { z } from "zod";

//Define como debe ser una pregunta válida recibida por la API, reglas de como debe ser una pregunta.
export const questionSchema = z
  .object({
    categoryId: z.number().int().min(1).max(2147483647),
    enunciado: z.string().trim().min(1), // El enunciado no puede estar vacío
    opciones: z // Las opciones deben ser un array de strings, cada uno no vacío, y debe haber exactamente 4 opciones únicas.
      .array(z.string().trim().min(1))
      .length(4)
      .refine((opciones) => new Set(opciones).size === 4), // Las opciones deben ser únicas y no vacías
    respuestaCorrecta: z.number().int().min(0).max(3), // La respuesta correcta debe ser un índice válido (0-3)
  })
  .strict(); // No se permiten propiedades adicionales en el objeto de la pregunta
