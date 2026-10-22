import type { Response } from "express";
import { ERRORES } from "./errorCatalog.js";

/* Responde un error al cliente usando el catálogo de negocio.
   La clave elige el error; al cliente le llega el campo `code`,
   que es el código público del contrato. */
export function responderError(res: Response, code: keyof typeof ERRORES) {
  const { code: codigoPublico, status, message } = ERRORES[code];

  return res.status(status).json({
    error: { code: codigoPublico, message },
  });
}