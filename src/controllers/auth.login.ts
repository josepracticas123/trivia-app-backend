import type { Request, Response } from "express";
import { loginUser } from "../services/auth.services.js";
import { loginSchema } from "../schemas/login.schema.js";
import { responderError } from "../errors/responderError.js";
// Nos permite crear tokens JWT firmados.
import jwt from "jsonwebtoken";

// Gestiona el inicio de sesión de usuario.
export async function loginController(req: Request, res: Response) {
  // Comprobamos que el email y la contraseña tienen el formato deseado.
  const resultadoValidacion = loginSchema.safeParse(req.body);

  // Si los datos no son válidos, respondemos con un error 400.
  if (!resultadoValidacion.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  // Buscamos al usuario y comprobamos su contraseña con Argon2
  const usuario = await loginUser(
    resultadoValidacion.data.email,
    resultadoValidacion.data.password,
  );

  // Vamos a utilizar el mismo mensaje para responder email o contraseña incorrecta
  if (!usuario) {
    return responderError(res, "INVALID_CREDENTIALS");
  }

  // Leemos el secreto que usamos para firmar el token.
  const jwtSecret = process.env.JWT_SECRET;

  // Comprobamos que el secreto existe antes de crear el token.
  if (!jwtSecret) {
    throw new Error("Falta JWT_SECRET en las variables de entorno.");
  }

  // Creamos un token que caduca en una hora.
  const token = jwt.sign({}, jwtSecret, {
    // Guardamos el ID del usuario como identidad del token.
    subject: String(usuario.id),
    expiresIn: "1h",
  });

  // Devolvemos el token y solo los datos públicos del usuario.
  return res.status(200).json({
    token,
    expiresIn: 3600,
    user: {
      id: usuario.id,
      email: usuario.email,
    },
  });
}
