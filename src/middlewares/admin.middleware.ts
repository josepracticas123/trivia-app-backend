import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { responderError } from "../errors/responderError.js";

/**
 * Comprueba que el usuario autenticado tenga el rol ADMIN.
 * Debe ir DESPUÉS de authMiddleware, que es quien deja res.locals.userId.
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
      return responderError(res, "USER_NOT_FOUND");
    }

    if (usuario.role !== "ADMIN") {
      return responderError(res, "NOT_ADMIN");
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
