/* Catálogo de errores de los MIDDLEWARES: fallos que pasan antes de
   llegar al controlador (falta el token, JSON roto, ruta que no existe...).
   La CLAVE es interna; el campo `code` es lo que ve el cliente. */

export const ERRORES_MIDDLEWARE = {
  // --- Autenticación (401) ---
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    status: 401,
    message: "Falta el token de autenticación",
  },
  INVALID_TOKEN: {
    code: "INVALID_TOKEN",
    status: 401,
    message: "El token no es válido",
  },
  /* Firma inválida, formato roto o token caducado: el cliente recibe
     el mismo mensaje que antes de centralizar los errores. */
  TOKEN_INVALID_OR_EXPIRED: {
    code: "INVALID_TOKEN",
    status: 401,
    message: "El token no es válido o ha caducado",
  },
  TOKEN_USER_MISSING: {
    code: "INVALID_TOKEN",
    status: 401,
    message: "El usuario del token ya no existe",
  },

  // --- Peticiones mal formadas ---
  PAYLOAD_TOO_LARGE: {
    code: "PAYLOAD_TOO_LARGE",
    status: 413,
    message: "El cuerpo de la petición es demasiado grande",
  },
  INVALID_JSON: {
    code: "INVALID_JSON",
    status: 400,
    message: "El JSON enviado no es válido",
  },
  ROUTE_NOT_FOUND: {
    code: "ROUTE_NOT_FOUND",
    status: 404,
    message: "Ruta no encontrada",
  },

  // --- Configuración y fallos internos ---
  JWT_SECRET_MISSING: {
    code: "INTERNAL_SERVER_ERROR",
    status: 500,
    message: "Error de configuración del servidor",
  },
  INTERNAL_SERVER_ERROR: {
    code: "INTERNAL_SERVER_ERROR",
    status: 500,
    message: "Ha ocurrido un error interno en el servidor",
  },
} as const;