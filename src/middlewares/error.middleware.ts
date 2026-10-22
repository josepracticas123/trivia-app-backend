import type { Request, Response, NextFunction } from "express";
import { responderMiddlewareError } from "../errors/responderMiddlewareError.js";

// Captura errores producidos al intentar interpretar un JSON mal formado.
export const jsonErrorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // El body supera el límite de express.json() (100 KB por defecto).
  // body-parser lanza un error con type "entity.too.large": lo convertimos en 413.
  if (
    err instanceof Error &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    return responderMiddlewareError(res, "PAYLOAD_TOO_LARGE");
  }

  // El body no es un JSON con sintaxis correcta.
  if (err instanceof SyntaxError && "body" in err) {
    return responderMiddlewareError(res, "INVALID_JSON");
  }

  // Si no es un error de JSON, lo pasamos al siguiente middleware.
  next(err);
};
// Ninguna ruta ha coincidido con la petición: respondemos 404.
export const notFoundMiddleware = (req: Request, res: Response) => {
  return responderMiddlewareError(res, "ROUTE_NOT_FOUND");
};
// Último middleware: cualquier error inesperado acaba aquí como 500.
export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Al cliente solo le damos un mensaje genérico: nunca detalles internos.
  console.error(err); // El detalle real queda en la consola, para depurar.
  return responderMiddlewareError(res, "INTERNAL_SERVER_ERROR");
};
