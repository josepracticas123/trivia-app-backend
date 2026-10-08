import { z } from "zod";

// Valida que el ID sea un entero positivo dentro del rango de PostgreSQL Int.
export const questionIdSchema = z
  .object({
    id: z
      .string()
      .regex(/^\d+$/)
      .refine((id) => {
        const numero = Number(id);
        return Number.isInteger(numero) && numero >= 1 && numero <= 2147483647;
      }),
  })
  .strict();
