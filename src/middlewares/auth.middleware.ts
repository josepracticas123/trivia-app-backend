import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { responderMiddlewareError } from "../errors/responderMiddlewareError.js";

// Comprueba que el token JWT sea válido y que el usuario exista.
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Leemos la cabecera Authorization.
  const authorization = req.headers.authorization;

  // Rechazamos peticiones sin un token Bearer.
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return responderMiddlewareError(res, "UNAUTHORIZED");
  }

  // Extraemos el token de la cabecera.
  const token = authorization.slice("Bearer ".length);

  // Leemos el secreto de JWT desde las variables de entorno.
  const jwtSecret = process.env.JWT_SECRET;

  // Si falta el secreto, el servidor está mal configurado: nada puede funcionar.
  if (!jwtSecret) {
    return responderMiddlewareError(res, "JWT_SECRET_MISSING");
  }

  try {
    // Verificamos la firma, la caducidad y el algoritmo permitido.
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    });

    /* Un token firmado sin exp nunca caducaría, así que lo rechazamos.
       payload puede ser string o JwtPayload; descartamos el string y
       comprobamos que exp exista y sea un número finito. */
    if (
      typeof payload === "string" ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp)
    ) {
      return responderMiddlewareError(res, "INVALID_TOKEN");
    }

    // Comprobamos que el token tenga un ID de usuario válido.
    if (typeof payload.sub !== "string" || !/^[1-9]\d*$/.test(payload.sub)) {
      return responderMiddlewareError(res, "INVALID_TOKEN");
    }
    // Convertimos sub a número y validamos el rango ANTES de tocar la base.
    const userId = Number(payload.sub);

    // Comprueba que el id esté dentro del rango del campo Int de la base.
    if (!Number.isSafeInteger(userId) || userId < 1 || userId > 2147483647) {
      return responderMiddlewareError(res, "INVALID_TOKEN");
    }

    // Buscamos al usuario en la base de datos mediante su ID.
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    // Si ya no existe, no permitimos el acceso.
    if (!usuario) {
      return responderMiddlewareError(res, "TOKEN_USER_MISSING");
    }

    // Guardamos el ID para utilizarlo en las siguientes rutas.
    res.locals.userId = usuario.id;

    return next();
  } catch (error) {
    /* Cualquier fallo de verificación (firma, formato o caducidad)
       conserva el mensaje del contrato anterior. */
    if (error instanceof jwt.JsonWebTokenError) {
      return responderMiddlewareError(res, "TOKEN_INVALID_OR_EXPIRED");
    }

    // Los errores de base de datos u otros fallos pasan al middleware global.
    return next(error);
  }
}
