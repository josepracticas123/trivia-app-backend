import type { Response } from "express";
import { ERRORES_MIDDLEWARE } from "./middlewareCatalog.js";

/* Igual que responderError, pero usando el catálogo de middlewares. */
export function responderMiddlewareError(
  res: Response,
  code: keyof typeof ERRORES_MIDDLEWARE,
) {
  const { code: codigoPublico, status, message } = ERRORES_MIDDLEWARE[code];

  return res.status(status).json({
    error: { code: codigoPublico, message },
  });
}