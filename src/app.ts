// Este archivo contiene la configuración principal de la aplicación Express,
// incluyendo las rutas y middlewares necesarios para manejar las peticiones HTTP.

import express from "express";

// Importa Swagger UI para mostrar la documentación de la API en /docs.
import swaggerUi from "swagger-ui-express";

// Importa la especificación OpenAPI generada desde swagger.ts.
import { swaggerSpec } from "./docs/swagger.js";

// Importa las preguntas desde el archivo de datos.
import { preguntas } from "./data/questions.js";

// Importa el tipo Pregunta desde el archivo de tipos.
import type { Pregunta } from "./types/question.js";

// Importa el esquema de validación de preguntas.
import { questionSchema } from "./schemas/question.schema.js";

// Importa el esquema de validación del ID de pregunta.
import { questionIdSchema } from "./schemas/question-id.schema.js";

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

// Devuelve el documento OpenAPI en formato JSON.
app.get("/api/openapi.json", (_req, res) => {
  res.json(swaggerSpec);
});

// Convierte los cuerpos JSON de las peticiones
// en datos disponibles en req.body.
app.use(express.json());

// Captura los errores producidos por un JSON mal formado.
app.use(jsonErrorMiddleware);

// Guarda el siguiente ID disponible para una nueva pregunta.
// Si no hay preguntas, el ID inicial será 1.
let siguienteId =
  preguntas.length > 0
    ? Math.max(...preguntas.map((pregunta) => pregunta.id)) + 1
    : 1;

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
 */
app.get("/", (_req, res) => {
  res.json({ message: "Bienvenido a TriviaApp Backend" });
});

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
 */
app.get("/api/questions", (_req, res) => {
  const preguntasPublicas = preguntas.map((pregunta) => {
    // Creamos un objeto público sin incluir respuestaCorrecta.
    return {
      id: pregunta.id,
      enunciado: pregunta.enunciado,
      opciones: pregunta.opciones,
    };
  });

  // Devolvemos las preguntas públicas como respuesta JSON.
  res.json(preguntasPublicas);
});

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
 *           type: string
 *         example: "1"
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
 */
app.get("/api/questions/:id", (req, res) => {
  // Validamos los parámetros de la URL usando Zod.
  const resultadoValidacion = questionIdSchema.safeParse(req.params);

  // Si el ID no cumple el esquema, devolvemos un error 400.
  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  // Usamos el ID que Zod ha validado.
  const id = Number(resultadoValidacion.data.id);

  // Buscamos la pregunta con ese ID.
  const pregunta = preguntas.find((pregunta) => pregunta.id === id);

  // Si no existe, devolvemos un error 404.
  if (!pregunta) {
    return res.status(404).json({
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "Pregunta no encontrada",
      },
    });
  }

  // Devolvemos la pregunta sin mostrar respuestaCorrecta.
  return res.json({
    id: pregunta.id,
    enunciado: pregunta.enunciado,
    opciones: pregunta.opciones,
  });
});

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
 *         description: Los datos enviados no son válidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Los datos enviados no son válidos
 */
app.post("/api/questions", (req, res) => {
  // Validamos el body usando el esquema de Zod.
  const resultadoValidacion = questionSchema.safeParse(req.body);

  // Si la validación falla, devolvemos un error 400.
  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  // Usamos los datos que Zod ha validado.
  const { enunciado, opciones, respuestaCorrecta } = resultadoValidacion.data;

  // Creamos la nueva pregunta.
  const nuevaPregunta: Pregunta = {
    id: siguienteId++,
    enunciado,
    opciones,
    respuestaCorrecta,
  };

  // Añadimos la pregunta al array.
  preguntas.push(nuevaPregunta);

  // Devolvemos la pregunta sin revelar respuestaCorrecta.
  return res.status(201).json({
    id: nuevaPregunta.id,
    enunciado: nuevaPregunta.enunciado,
    opciones: nuevaPregunta.opciones,
  });
});

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
 *           type: string
 *         example: "1"
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
 *         description: Los datos o el ID no son válidos
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
 */
app.put("/api/questions/:id", (req, res) => {
  // Validamos el ID de la URL.
  const resultadoValidacionId = questionIdSchema.safeParse(req.params);

  // Si el ID no es válido, devolvemos un error 400.
  if (!resultadoValidacionId.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  // Convertimos el ID validado a número.
  const id = Number(resultadoValidacionId.data.id);

  // Buscamos la pregunta.
  const pregunta = preguntas.find((pregunta) => pregunta.id === id);

  // Si no existe, devolvemos un error 404.
  if (!pregunta) {
    return res.status(404).json({
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "Pregunta no encontrada",
      },
    });
  }

  // Validamos el body de la petición.
  const resultadoValidacion = questionSchema.safeParse(req.body);

  // Si el body no es válido, devolvemos un error 400.
  if (!resultadoValidacion.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  // Usamos únicamente los datos validados por Zod.
  const { enunciado, opciones, respuestaCorrecta } = resultadoValidacion.data;

  // Sustituimos los datos de la pregunta.
  pregunta.enunciado = enunciado;
  pregunta.opciones = opciones;
  pregunta.respuestaCorrecta = respuestaCorrecta;

  // Devolvemos la pregunta actualizada sin respuestaCorrecta.
  return res.status(200).json({
    id: pregunta.id,
    enunciado: pregunta.enunciado,
    opciones: pregunta.opciones,
  });
});

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
 *           type: string
 *         example: "1"
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
 */
app.delete("/api/questions/:id", (req, res) => {
  // Validamos el ID de la URL.
  const resultadoValidacionId = questionIdSchema.safeParse(req.params);

  // Si el ID no es válido, devolvemos un error 400.
  if (!resultadoValidacionId.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  // Convertimos el ID validado a número.
  const id = Number(resultadoValidacionId.data.id);

  // Buscamos la posición de la pregunta.
  const index = preguntas.findIndex((pregunta) => pregunta.id === id);

  // Si no existe, devolvemos un error 404.
  if (index === -1) {
    return res.status(404).json({
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "Pregunta no encontrada",
      },
    });
  }

  // Eliminamos la pregunta del array.
  preguntas.splice(index, 1);

  // Respondemos con 204 sin contenido.
  return res.status(204).send();
});

// Si ninguna ruta anterior coincide con la petición,
// devolvemos un error 404.
app.use(notFoundMiddleware);

// Los errores inesperados se gestionan mediante este middleware.
app.use(errorMiddleware);
