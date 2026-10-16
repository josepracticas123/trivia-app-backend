import { toLowerCase, z } from "zod";

// Validar los datos que llegan al iniciar sesión.
export const loginSchema = z
  .object({
    // Convertimos el email en minúsculas y quitamos los espacios
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "El email no puede estar vacío")
      .pipe(z.email("El formato del email no es válido")),

    // Comprobamos la longitud, no modificamos la contraseña.
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
  })
  // Rechazamos propiedades diferentes a las qu eno tenemos definidas arriba.
  .strict();
