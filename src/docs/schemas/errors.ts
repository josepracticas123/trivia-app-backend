/* Esquema OpenAPI del formato de error de la API.
   El nombre NO se cambia: los @openapi hacen $ref a "Error". */
export const errorSchemas = {
  // Representa el formato de los errores que devuelve nuestra API.
  Error: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: {
            type: "string",
            example: "VALIDATION_ERROR",
          },
          message: {
            type: "string",
            example: "Los datos enviados no son válidos",
          },
        },
        required: ["code", "message"],
      },
    },
    required: ["error"],
  },
};
