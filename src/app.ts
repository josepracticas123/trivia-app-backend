// Este archivo contiene la configuración principal de la aplicación Express,
// incluyendo las rutas y middlewares necesarios para manejar las peticiones HTTP.

import express from "express";

// Importa Swagger UI para mostrar la documentación de la API en /docs.
import swaggerUi from "swagger-ui-express";

// Importa la especificación OpenAPI generada desde swagger.ts.
import { swaggerSpec } from "./docs/swagger.js";

import {questionRouter} from "./routes/questions.routes.js"

// Importa los middlewares de manejo de errores.
import {
  jsonErrorMiddleware,
  notFoundMiddleware,
  errorMiddleware,
} from "./middlewares/error.middleware.js";

// Configura la aplicación.
// Abrir el puerto es responsabilidad de server.ts.
export const app = express();

// Muestra la documentación de la API en /docs usando Swagger UI.
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /api/openapi.json:
 *   get:
 *     summary: Obtener el documento OpenAPI
 *     description: Devuelve la especificación OpenAPI de esta API en formato JSON.
 *     responses:
 *       200:
 *         description: Documento OpenAPI 3.0
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - openapi
 *                 - info
 *                 - paths
 *               properties:
 *                 openapi:
 *                   type: string
 *                   example: "3.0.0"
 *                 info:
 *                   type: object
 *                 paths:
 *                   type: object
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 *                 message: Ha ocurrido un error interno en el servidor
 */
app.get("/api/openapi.json", (_req, res) => {
  res.json(swaggerSpec);
});

// Convierte los cuerpos JSON de las peticiones
// en datos disponibles en req.body.
app.use(express.json());

// Captura los errores producidos por un JSON mal formado.
app.use(jsonErrorMiddleware);

/**
 * @openapi
 * /:
 *   get:
 *     summary: Mensaje de bienvenida
 *     description: Comprueba que la API está disponible.
 *     responses:
 *       200:
 *         description: Mensaje de bienvenida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bienvenido a TriviaApp Backend
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 *                 message: Ha ocurrido un error interno en el servidor
 */
app.get("/", (_req, res) => {
  res.json({ message: "Bienvenido a TriviaApp Backend José Luis" });
});

// GET: consulta y muestra todas las preguntas.
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Comprobar estado de la API
 *     description: Comprueba que el servidor está funcionando correctamente.
 *     responses:
 *       200:
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 *                 message: Ha ocurrido un error interno en el servidor
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * @openapi
 * /api/questions:
 *   get:
 *     summary: Obtener todas las preguntas
 *     description: Devuelve todas las preguntas sin mostrar la respuesta correcta.
 *     responses:
 *       200:
 *         description: Lista de preguntas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/PreguntaPublica"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 *                 message: Ha ocurrido un error interno en el servidor
 */
app.use("/api/questions", questionRouter);

// GET: consulta una pregunta concreta usando su ID.
/**
 * @openapi
 * /api/questions/{id}:
 *   get:
 *     summary: Obtener una pregunta por ID
 *     description: Devuelve una pregunta concreta sin mostrar la respuesta correcta.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la pregunta.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 2147483647
 *         example: 1
 *     responses:
 *       200:
 *         description: Pregunta encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PreguntaPublica"
 *       400:
 *         description: El ID enviado no es válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Los datos enviados no son válidos
 *       404:
 *         description: La pregunta no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: QUESTION_NOT_FOUND
 *                 message: Pregunta no encontrada
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 *                 message: Ha ocurrido un error interno en el servidor
 */

// POST: crea y guarda una pregunta nueva.
/**
 * @openapi
 * /api/questions:
 *   post:
 *     summary: Crear una pregunta
 *     description: Crea una nueva pregunta de trivia.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PreguntaInput"
 *           example:
 *             enunciado: ¿Cuál es la capital de España?
 *             opciones:
 *               - Madrid
 *               - Barcelona
 *               - Valencia
 *               - Sevilla
 *             respuestaCorrecta: 0
 *     responses:
 *       201:
 *         description: Pregunta creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PreguntaPublica"
 *       400:
 *         description: El JSON está mal formado o los datos enviados no son válidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             examples:
 *               invalidJson:
 *                 summary: JSON mal formado
 *                 value:
 *                   error:
 *                     code: INVALID_JSON
 *                     message: El JSON enviado no es válido
 *               validationError:
 *                 summary: Datos no válidos
 *                 value:
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Los datos enviados no son válidos
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 *                 message: Ha ocurrido un error interno en el servidor
 */

// PUT: actualiza una pregunta existente usando su ID.
/**
 * @openapi
 * /api/questions/{id}:
 *   put:
 *     summary: Actualizar una pregunta
 *     description: Sustituye los datos de una pregunta existente.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la pregunta.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 2147483647
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PreguntaInput"
 *           example:
 *             enunciado: ¿Cuál es la capital de Francia?
 *             opciones:
 *               - París
 *               - Madrid
 *               - Roma
 *               - Berlín
 *             respuestaCorrecta: 0
 *     responses:
 *       200:
 *         description: Pregunta actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PreguntaPublica"
 *       400:
 *         description: El JSON está mal formado, o los datos o el ID no son válidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             examples:
 *               invalidJson:
 *                 summary: JSON mal formado
 *                 value:
 *                   error:
 *                     code: INVALID_JSON
 *                     message: El JSON enviado no es válido
 *               validationError:
 *                 summary: Datos o ID no válidos
 *                 value:
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Los datos enviados no son válidos
 *       404:
 *         description: La pregunta no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: QUESTION_NOT_FOUND
 *                 message: Pregunta no encontrada
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 *                 message: Ha ocurrido un error interno en el servidor
 */

// DELETE: elimina una pregunta usando su ID.
/**
 * @openapi
 * /api/questions/{id}:
 *   delete:
 *     summary: Eliminar una pregunta
 *     description: Elimina una pregunta existente por su ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la pregunta.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 2147483647
 *         example: 1
 *     responses:
 *       204:
 *         description: Pregunta eliminada correctamente
 *       400:
 *         description: El ID no es válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Los datos enviados no son válidos
 *       404:
 *         description: La pregunta no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: QUESTION_NOT_FOUND
 *                 message: Pregunta no encontrada
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 *                 message: Ha ocurrido un error interno en el servidor
 */


// Si ninguna ruta anterior coincide con la petición,
// devolvemos un error 404.
app.use(notFoundMiddleware);

// Los errores inesperados se gestionan mediante este middleware.
app.use(errorMiddleware);
