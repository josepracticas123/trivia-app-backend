import type { Request, Response } from "express";
import { registerUser } from "../services/auth.services.js";
import { registerSchema } from "../schemas/register.schema.js";

// registra el Usuari nuevo, valida y pide el has al servicio y da respuesta 201 o 409.
export async function registerController(req: Request, res: Response) {
  // validaremos el cuerpo con zod, si fallase dara error 400
  const resultadoValidacion = registerSchema.safeParse(req.body);

  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  /* El servicio hara el hash, guarda el usuario y devuelve el id y el email,
    o null si el email ya existe */
  const usuario = await registerUser(
    resultadoValidacion.data.email, // email normalizado por zod, trim + minúsculas
    resultadoValidacion.data.password, // tal cual lo escribe el usuario.
  );

  // Si el servicio devuelve null o email duplicado error 409
  if (!usuario) {
    return res.status(409).json({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "El email ya está registrado",
      },
    });
  }

  // Cuando el registro ha sido correcto, 201
  return res.status(201).json({
    id: usuario.id,
    email: usuario.email,
  });
}
