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
      /* Estado público de una partida individual,
    igual que el controlador: no contiene solución ni questionId,
    la solucion nunca sale del cliente */
      PartidaEstado: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          status: {
            type: "string",
            enum: ["ACTIVE", "FINISHED"], //enum gamestatus de prisma
            example: "ACTIVE",
          },
          score: {
            type: "integer",
            description:
              "Puntos acumulados, calculados en el servidor (1 por acierto).",
            example: 3,
          },
          nextQuestionId: {
            type: "integer",
            nullable: true, // ← OpenAPI 3.0: null al terminar la partida
            description:
              "Id de la siguiente pregunta pendiente (la de turno); null cuando ya no queda ninguna.",
            example: 14,
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "integer",
                  description:
                    "Id de la pregunta DENTRO de la partida (la copia), no del catalogo.",
                  example: 12,
                },
                position: {
                  type: "integer",
                  description: "Orden de la partida (0..4).",
                  example: 0,
                },
                statement: {
                  type: "string",
                  example: "¿Cuál es la capital de Portugal?",
                },
                choices: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 45 },
                      text: { type: "string", example: "Lisboa" },
                      position: { type: "integer", example: 0 },
                    },
                    required: ["id", "text", "position"],
                  },
                },
              },
              required: ["id", "position", "statement", "choices"],
            },
          },
        },
        required: ["id", "status", "score", "nextQuestionId", "questions"],
      },

      /* Datos que el cliente envía para responder.
      El strict() del zod rechaza campos extra: aquí nunca
      puede venir isCorrect ni score (lo calcula el servidor). */
      RespuestaInput: {
        type: "object",
        properties: {
          gameQuestionId: {
            type: "integer",
            description: "Id de la pregunta DENTRO de la partida (la copia).",
            example: 1,
          },
          choiceId: {
            type: "integer",
            description: "Id de la opción elegida dentro de esa pregunta",
            example: 1,
          },
        },
        required: ["gameQuestionId", "choiceId"],
      },

      /* Resultado de responder: la puntuación la calcula SIEMPRE el backend,
      el cliente solo la recibe ( no puede enviarla ni modificarla) */
      RespuestaResultado: {
        type: "object",
        propertie: {
          gameQuestionId: {
            type: "integer",
            example: 1,
          },
          isCorrect: { type: "boolean", example: true },
          score: {
            type: "integer",
            description: "Puntos acumulados, calculados por el servidor.",
            example: 1,
          },
          finished: {
            type: "boolean",
            description:
              "true al responder la quinta pregunta (patida FINISHED)",
            examle: false,
          },
        },
        required: ["gameQuestionId", "isCorrect", "score", "finished"],
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
