// Permite comprobar si un archivo existe antes de utilizarlo.
import fs from "node:fs";
// Permite obtener la ruta real de un archivo a partir de este módulo.
import { fileURLToPath } from "node:url";
// Librería que genera el documento OpenAPI a partir de los comentarios @openapi.
import swaggerJSDoc from "swagger-jsdoc";
import { maximum, minimum, required } from "zod/mini";
// Configuración principal de OpenAPI.
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Trivia App API",
    version: "1.0.0",
    description: "Documentación de la API de Trivia App",
  },
  // Esquemas reutilizables por las diferentes rutas de la API.
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      // Representa los datos para crear una cuenta.
      RegistroEntrada: {
        type: "object",
        additionalProperties: false,
        properties: {
          email: {
            type: "string",
            format: "email",
            description:
              "Se normaliza: se le quitan los espacios de los extremos y se pasa a minúsculas.",
            example: "juan@email.com",
          },
          password: {
            type: "string",
            minLength: 8,
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

      // Representa una categoría disponible para asignar a la pregunta.
      Categoria: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1,
          },

          name: {
            type: "string",
            example: "Geografía",
          },
        },
        required: ["id", "name"],
      },
      // Representa una pregunta que podemos devolver al cliente.
      // Importante: NO contiene respuestaCorrecta.
      PreguntaPublica: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1,
          },
          categoryId: {
            type: "integer",
            example: 1,
          },
          enunciado: {
            type: "string",
            example: "¿Cuál es la capital de España?",
          },
          opciones: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "string",
            },
            example: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
          },
        },
        required: ["id", "enunciado", "categoryId", "opciones"],
      },
      // Representa los datos necesarios para crear o actualizar una pregunta.
      // Aquí SÍ incluimos respuestaCorrecta porque forma parte de la entrada.
      PreguntaInput: {
        description:
          "El servidor elimina los espacios al principio y al final de enunciado y opciones. Los textos no pueden quedar vacíos después de esa limpieza y las opciones deben ser distintas después de limpiarlas.",
        type: "object",
        additionalProperties: false,
        properties: {
          categoryId: {
            type: "integer",
            minimum: 1,
            maximum: 2147483647,
          },
          enunciado: {
            type: "string",
            minLength: 1,
            example: "¿Cuál es la capital de España?",
          },
          opciones: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            uniqueItems: true,
            items: {
              type: "string",
              minLength: 1,
            },
            example: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
          },
          respuestaCorrecta: {
            type: "integer",
            minimum: 0,
            maximum: 3,
            example: 0,
          },
        },
        required: ["categoryId", "enunciado", "opciones", "respuestaCorrecta"],
      },
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
    },
  },
};

// Ruta del archivo TypeScript utilizado durante el desarrollo.
// Desde src/docs/swagger.ts subimos a src/ y buscamos app.ts.
const sourceFile = fileURLToPath(new URL("../app.ts", import.meta.url));
// Ruta del archivo JavaScript generado después de ejecutar npm run build.
// Desde dist/docs/swagger.js subimos a dist/ y buscamos app.js.
const compiledFile = fileURLToPath(new URL("../app.js", import.meta.url));
// Durante el desarrollo utilizamos app.ts.
// Después del build utilizamos app.js.
const appFile = fs.existsSync(sourceFile) ? sourceFile : compiledFile;
// Generamos el documento OpenAPI leyendo los comentarios @openapi
// que existen en app.ts durante desarrollo o app.js después del build.
export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: [appFile],
});
