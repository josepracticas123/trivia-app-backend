import { z } from "zod";

//Validamos los datso qu ellegan del POST, api/auth/register.
export const registerSchema = z

  /* El email se normaliza, quitamso los espacios de los extremos y lo pasamos a minúsculas*/
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "El email no puede estar vacío")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "El formato del email no es válido"), // comprobar formato básico de email.
    password: z
      .string()
      .min(8, "La contraseña debe teenr al emnso 8 caracteres"), // L a contraseña se usa tal cual
  })
  .strict();
