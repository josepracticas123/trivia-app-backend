// Permite comprobar si un archivo existe antes de utilizarlo.
import fs from "node:fs";
// Permite obtener la ruta real de un archivo a partir de este módulo.
import { fileURLToPath } from "node:url";
// Librería que genera el documento OpenAPI a partir de los comentarios @openapi.
import swaggerJSDoc from "swagger-jsdoc";
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
    schemas: {
      // Representa una pregunta que podemos devolver al cliente.
      // Importante: NO contiene respuestaCorrecta.
      PreguntaPublica: {
        type: "object",
        properties: {
          id: {
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
            example: [
              "Madrid",
              "Barcelona",
              "Valencia",
              "Sevilla",
            ],
          },
        },
        required: ["id", "enunciado", "opciones"],
      },
      // Representa los datos necesarios para crear o actualizar una pregunta.
      // Aquí SÍ incluimos respuestaCorrecta porque forma parte de la entrada.
      PreguntaInput: {
        type: "object",
        properties: {
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
            example: [
              "Madrid",
              "Barcelona",
              "Valencia",
              "Sevilla",
            ],
          },
          respuestaCorrecta: {
            type: "integer",
            minimum: 0,
            maximum: 3,
            example: 0,
          },
        },
        required: ["enunciado", "opciones", "respuestaCorrecta"],
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
