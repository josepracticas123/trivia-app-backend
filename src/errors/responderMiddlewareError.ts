import type { Response } from "express";
import { ERRORES_MIDDLEWARE } from "./middlewareCatalog.js";

/* Igual que responderError, pero usando el catálogo de middlewares.
   Solo se le pasa el código: el estado HTTP y el mensaje salen siempre
   del catálogo. Se usa desde los middlewares, no desde los controladores. */
export function responderMiddlewareError(
  res: Response,
  code: keyof typeof ERRORES_MIDDLEWARE,
) {
  const { status, message } = ERRORES_MIDDLEWARE[code];

  return res.status(status).json({
    error: { code, message },
  });
}