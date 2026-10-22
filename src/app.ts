// Este archivo contiene la configuración principal de la aplicación Express,
// incluyendo las rutas y middlewares necesarios para manejar las peticiones HTTP.
import express from "express";
// Importa Swagger UI para mostrar la documentación de la API en /docs.
import swaggerUi from "swagger-ui-express";
// Importa la especificación OpenAPI generada desde swagger.ts.
import { swaggerSpec } from "./docs/swagger.js";
import { questionRouter } from "./routes/questions.routes.js";
import { categoryRouter } from "./routes/categories.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { meController } from "./controllers/auth.controller.js";
// Router de partidas (reto 13).
import { gameRouter } from "./routes/games.routes.js";
import { meRouter } from "./routes/me.routes.js";

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
  res.json({ message: "Bienvenido a TriviaApp Backend" });
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
 *                 message: El id de la pregunta no es válido
 *       404:
 *         description: La pregunta no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: QUESTION_NOT_FOUND
 *                 message: La pregunta no existe
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
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PreguntaInput"
 *           example:
 *             categoryId: 1
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
 *       401:
 *         description: Falta el token o el token no es válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       403:
 *         description: El usuario autenticado no tiene rol ADMIN.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
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
 *     security:
 *       - bearerAuth: []
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
 *             categoryId: 1
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
 *               invalidId:
 *                 summary: ID no válido
 *                 value:
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: El id de la pregunta no es válido
 *               validationError:
 *                 summary: Datos no válidos
 *                 value:
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Los datos enviados no son válidos
 *       401:
 *         description: Falta el token o el token no es válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       403:
 *         description: El usuario autenticado no tiene rol ADMIN.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       404:
 *         description: La pregunta no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: QUESTION_NOT_FOUND
 *                 message: La pregunta no existe
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
 *     security:
 *       - bearerAuth: []
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
 *                 message: El id de la pregunta no es válido
 *       404:
 *         description: La pregunta no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: QUESTION_NOT_FOUND
 *                 message: La pregunta no existe
 *       401:
 *         description: Falta el token o el token no es válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       403:
 *         description: El usuario autenticado no tiene rol ADMIN.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
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
// Ruta pública que lista las categorías
/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Obtener todas las categorías
 *     description: Devuelve las categorías disponibles para asignar a una pregunta.
 *     responses:
 *       200:
 *         description: Lista de categorías
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Categoria"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
app.use("/api/categories", categoryRouter);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Comprueba el email y la contraseña y devuelve un token JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegistroEntrada"
 *     responses:
 *       200:
 *         description: Inicio de sesión correcto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 expiresIn:
 *                   type: integer
 *                   example: 3600
 *                 user:
 *                   $ref: "#/components/schemas/UsuarioPublico"
 *       400:
 *         description: Datos no válidos
 *       401:
 *         description: Email o contraseña incorrectos
 */

// Ruta de registro de usuarios.
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registrar un usuario nuevo
 *     description: Crea una cuenta con email y contraseña. La contraseña se guarda como hash y nunca se devuelve.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegistroEntrada"
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UsuarioPublico"
 *       400:
 *         description: Email inválido, contraseña corta o campos inesperados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Los datos enviados no son válidos
 *       409:
 *         description: El email ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: EMAIL_ALREADY_EXISTS
 *                 message: El email ya está registrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
app.use("/api/auth", authRouter);

// Montamos el router bajo /api/games.
/**
 * @openapi
 * /api/games:
 *   post:
 *     summary: Crea una partida individual
 *     description: Crea una partida de cinco preguntas aleatorias para el usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Partida creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 status:
 *                   type: string
 *                   enum: [ACTIVE, FINISHED]
 *                   example: ACTIVE
 *       401:
 *         description: Token ausente, inválido o caducado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       409:
 *         description: No hay cinco preguntas disponibles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
app.use("/api/games", gameRouter);
app.use("/api/me", meRouter);

// Documentación Swagger del estado de la partida.
/**
 * @openapi
 * /api/games/{id}:
 *   get:
 *     summary: Obtiene el estado de una partida
 *     description: Devuelve las preguntas y opciones, la puntuación acumulada (score) y la siguiente pregunta pendiente (nextQuestionId) si el usuario autenticado participa en la partida. Nunca incluye las soluciones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Id de la partida.
 *     responses:
 *       200:
 *         description: Estado de la partida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PartidaEstado"
 *       400:
 *         description: El id no es un entero entre 1 y 2147483647 (se rechazan decimales y notación exponencial)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         description: Token ausente, inválido o caducado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       403:
 *         description: El usuario no participa en la partida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       404:
 *         description: La partida no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */

// Documentación Swagger de responder una pregunta de la partida.
/**
 * @openapi
 * /api/games/{id}/answers:
 *   post:
 *     summary: Responde la pregunta en turno de la partida
 *     description: Registra la respuesta del usuario autenticado. El backend comprueba el turno, que la opción pertenece a la pregunta y calcula la puntuación; nunca acepta puntuación enviada por el cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Id de la partida.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RespuestaInput"
 *           example:
 *             gameQuestionId: 1
 *             choiceId: 1
 *     responses:
 *       200:
 *         description: Respuesta registrada (puntuación calculada por el servidor)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RespuestaResultado"
 *       400:
 *         description: Id o cuerpo no válido, o la opción no pertenece a esa pregunta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         description: Token ausente, inválido o caducado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       403:
 *         description: El usuario no participa en la partida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       404:
 *         description: La partida o la pregunta no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       409:
 *         description: La pregunta no está en turno, ya fue respondida o la partida ha finalizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
// Devuelve los datos del usuario autenticado
/**
 * @openapi
 * /api/me:
 *   get:
 *     summary: Obtener el usuario autenticado
 *     description: Devuelve los datos del usuario identificado por el token JWT.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: "#/components/schemas/UsuarioAutenticado"
 *       401:
 *         description: Token ausente, inválido o caducado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
app.get("/api/me", authMiddleware, meController);

/**
 * @openapi
 * /api/me/games:
 *   get:
 *     summary: Historial de partidas del usuario autenticado
 *     description: Devuelve las partidas en las que participa el usuario autenticado, de la más reciente a la más antigua, con id, estado, fechas y puntuación.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista pública de partidas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/HistorialPartidas"
 *       401:
 *         description: Token ausente, inválido o caducado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */

/* Si ninguna ruta anterior coincide con la petición,
 devolvemos un error 404.*/
app.use(notFoundMiddleware);

// Los errores inesperados se gestionan mediante este middleware.
app.use(errorMiddleware);
