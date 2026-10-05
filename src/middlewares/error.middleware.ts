import type { Request, Response, NextFunction } from "express";

// Captura errores producidos al intentar interpretar un JSON mal formado.
export const jsonErrorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Comprobamos si el error viene de un JSON con sintaxis incorrecta.
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "El JSON enviado no es válido",
      },
    });
  }

  // Si no es un error de JSON, lo pasamos al siguiente middleware.
  next(err);
};
// Captura rutas no encontradas y devuelve un error 404.
export const notFoundMiddleware = (req: Request, res: Response) => {
  // Si ninguna ruta anterior coincide con la petición, devolvemos un 404.
  return res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Ruta no encontrada",
    },
  });
};
// Captura errores inesperados y devuelve un error 500.
export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Los errores inesperados no deben mostrar detalles internos al cliente, solo un mensaje genérico.
  console.error(err); // Registramos el error en la consola para depuración.
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ha ocurrido un error interno en el servidor",
    },
  });
};
