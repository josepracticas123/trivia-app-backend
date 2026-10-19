import type { Request, Response } from "express";
import { registerUser } from "../services/auth.services.js";
import { registerSchema } from "../schemas/register.schema.js";
import { loginUser } from "../services/auth.services.js";
import { loginSchema } from "../schemas/login.schema.js";
import { prisma } from "../lib/prisma.js";
// Nos permite crear tokens JWT firmados.
import jwt from "jsonwebtoken";

// Registra el usuario nuevo, valida y pide el hash al servicio; devuelve 201 o 409.
export async function registerController(req: Request, res: Response) {
  // Validaremos el cuerpo con Zod; si fallase, dará error 400.
  const resultadoValidacion = registerSchema.safeParse(req.body);

  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  /* El servicio hará el hash, guarda el usuario y devuelve el id y el email,
    o null si el email ya existe. */
  const usuario = await registerUser(
    resultadoValidacion.data.email, // email normalizado por zod, trim + minúsculas
    resultadoValidacion.data.password, // tal cual lo escribe el usuario.
  );

  // Si el servicio devuelve null o email duplicado, error 409.
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

// Gestión del inicio de sesión de usuario.
export async function loginController(req: Request, res: Response) {
  //Comprobamos que el email y la contraseña tienen el formato deseado.
  const resultadoValidacion = loginSchema.safeParse(req.body);

  // Si los datos no son válidos, respondemos con un error 400.
  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  //Buscamos al usuario y comprobamos su contraseña con Argon2
  const usuario = await loginUser(
    resultadoValidacion.data.email,
    resultadoValidacion.data.password,
  );

  // Vamos a utilizar el mismo mensaje para  responder email o contraseña incorrecta
  if (!usuario) {
    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "El email o contraseña son incorrectos",
      },
    });
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

/* Devuelve los datos públicos del usuario, middleware guarda el ID en userId */

export async function meController(req: Request, res: Response) {
  //Buscamos el usuario usando el ID validado por middleware.
  const usuario = await prisma.user.findUnique({
    where: { id: res.locals.userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
  // Si el usuario y ano existe rechazaremos la petición
  // Si el usuario ya no existe, rechazamos la petición.
  if (!usuario) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "El usuario ya no existe",
      },
    });
  }

  // Devolvemos solo información pública.
  return res.status(200).json({ user: usuario });
}
