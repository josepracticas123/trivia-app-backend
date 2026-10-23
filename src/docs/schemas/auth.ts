import { maxLength } from "zod";

/* Esquemas OpenAPI de autenticación y usuario.
   Los nombres NO se cambian: los @openapi hacen $ref a ellos. */
export const authSchemas = {
  // Representa los datos para crear una cuenta.
  RegistroEntrada: {
    type: "object",
    additionalProperties: false,
    properties: {
      email: {
        type: "string",
        format: "email",
        maxLength: 254,
        description:
          "Se normaliza: se le quitan los espacios de los extremos y se pasa a minúsculas.",
        example: "juan@email.com",
      },
      password: {
        type: "string",
        minLength: 8,
        maxLength: 128,
        description: "Mínimo 8 caracteres; se usa tal cual, sin recortar.",
        example: "secreta123",
      },
    },
    required: ["email", "password"],
  },
  // Representa los datos públicos que se devuelven al registrarse.
  UsuarioPublico: {
    type: "object",
    properties: {
      id: {
        type: "integer",
        example: 1,
      },
      email: {
        type: "string",
        example: "juan@email.com",
      },
    },
    required: ["id", "email"],
  },

  // Datos que puede consultar el propio usuario autenticado.
  // Incluye el rol porque GET /api/me lo devuelve.
  UsuarioAutenticado: {
    type: "object",
    properties: {
      id: {
        type: "integer",
        example: 1,
      },
      email: {
        type: "string",
        example: "juan@email.com",
      },
      role: {
        type: "string",
        enum: ["USER", "ADMIN"],
        example: "USER",
      },
    },
    required: ["id", "email", "role"],
  },
};
