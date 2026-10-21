import type { Request, Response } from "express";
import { registerUser } from "../services/auth.services.js";
import { registerSchema } from "../schemas/register.schema.js";
import { responderError } from "../errors/responderError.js";

// Registra al usuario nuevo, valida y pide el hash al servicio; devuelve 201 o 409.
export async function registerController(req: Request, res: Response) {
  // Validaremos el cuerpo con Zod; si fallase, dará error 400.
  const resultadoValidacion = registerSchema.safeParse(req.body);

  if (!resultadoValidacion.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  /* El servicio hará el hash, guarda el usuario y devuelve el id y el email,
    o null si el email ya existe. */
  const usuario = await registerUser(
    resultadoValidacion.data.email, // email normalizado por zod, trim + minúsculas
    resultadoValidacion.data.password, // tal cual lo escribe el usuario.
  );

  // Si el servicio devuelve null o email duplicado, error 409.
  if (!usuario) {
    return responderError(res, "EMAIL_ALREADY_EXISTS");
  }

  // Cuando el registro ha sido correcto, 201
  return res.status(201).json({
    id: usuario.id,
    email: usuario.email,
  });
}
