import type { Response } from "express";
import { ERRORES } from "./errorCatalog.js";

/* Responde un error al cliente usando el catálogo de negocio.
   Solo se le pasa el código: el estado HTTP y el mensaje salen SIEMPRE
   del catálogo. Así no hay ningún texto escrito suelto por el código. */
export function responderError(res: Response, code: keyof typeof ERRORES) {
  const { status, message } = ERRORES[code];

  return res.status(status).json({
    error: { code, message },
  });
}