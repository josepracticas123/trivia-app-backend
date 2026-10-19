import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

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
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Falta el token de autenticación",
      },
    });
  }

  // Extraemos el token de la cabecera.
  const token = authorization.slice("Bearer ".length);

  // Leemos el secreto de JWT.
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Error de configuración del servidor",
      },
    });
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
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "El token no es válido",
        },
      });
    }

    // Comprobamos que el token tenga un ID de usuario válido.
    if (typeof payload.sub !== "string" || !/^[1-9]\d*$/.test(payload.sub)) {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "El token no es válido",
        },
      });
    }
    // Convertimos sub a número y validamos el rango ANTES de tocar la base.
    const userId = Number(payload.sub);

    // Comprueba que el id esté dentro del rango del campo Int de la base.
    if(!Number.isSafeInteger(userId) || userId < 1 || userId > 2147483647){
      return res.status(401).json({
        error:{
          code: "INVALID_TOKEN",
          message: "El token no es válido",
        }
      })
    }

    // Buscamos al usuario en la base de datos mediante su ID.
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    // Si ya no existe, no permitimos el acceso.
    if (!usuario) {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "El usuario del token ya no existe",
        },
      });
    }

    // Guardamos el ID para utilizarlo en las siguientes rutas.
    res.locals.userId = usuario.id;

    return next();
  } catch (error) {
    // Los tokens inválidos o caducados se rechazan.
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "El token no es válido o ha caducado",
        },
      });
    }

    // Los errores de base de datos u otros fallos pasan al middleware global.
    return next(error);
  }
}

/**
 * Comprueba que el usuario autenticado tenga el rol ADMIN.
 */
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: res.locals.userId },
      select: { role: true },
    });

    if (!usuario) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "El usuario ya no existe",
        },
      });
    }

    if (usuario.role !== "ADMIN") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "No tienes permisos para realizar esta acción",
        },
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
