// Este archivo contiene la configuración principal de la aplicación Express,
// incluyendo las rutas y middlewares necesarios para manejar las peticiones HTTP.

import express from "express";

import { prisma } from "./lib/prisma.js";

import { Prisma } from "@prisma/client";

// Importa Swagger UI para mostrar la documentación de la API en /docs.
import swaggerUi from "swagger-ui-express";

// Importa la especificación OpenAPI generada desde swagger.ts.
import { swaggerSpec } from "./docs/swagger.js";

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
app.get("/api/questions", async (_req, res) => {
  // Pide todas las preguntas guardadas en la tabla.
  const preguntas = await prisma.question.findMany({
    // Consulta select.
    select: {
      id: true,
      statement: true,
      options: true,
    },
  });

  //Nos sirve para  trasnformar cada pregunta en un objeto con el formato publico de la API.
  const preguntasPublicas = preguntas.map((pregunta) => {
    // Creamos un objeto público sin incluir respuestaCorrecta.
    return {
      id: pregunta.id,
      enunciado: pregunta.statement, // Campo público  enunciado
      opciones: pregunta.options,
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
app.get("/api/questions/:id", async (req, res) => {
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

  const pregunta = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true,
      statement: true,
      options: true,
    },
  });

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
    enunciado: pregunta.statement,
    opciones: pregunta.options,
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
app.post("/api/questions", async (req, res) => {
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

  const nuevaPregunta = await prisma.question.create({
    data: {
      statement: enunciado,
      options: opciones,
      solution: respuestaCorrecta,
    },
    select: {
      id: true,
      statement: true,
      options: true,
    },
  });
  return res.status(201).json({
    id: nuevaPregunta.id,
    enunciado: nuevaPregunta.statement,
    opciones: nuevaPregunta.options,
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
app.put("/api/questions/:id", async (req, res) => {
  // Validamos el ID de la URL.
  const resultadoValidacionId = questionIdSchema.safeParse(req.params);

  if (!resultadoValidacionId.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
  }

  // Express recibe los parametros como texto; Prisma esper un número.
  const id = Number(resultadoValidacionId.data.id);

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
  try {
    const preguntaActualizada = await prisma.question.update({
      where: { id },
      data: {
        statement: enunciado,
        options: opciones,
        solution: respuestaCorrecta,
      },
      select: {
        id: true,
        statement: true,
        options: true,
      },
    });

    return res.status(200).json({
      id: preguntaActualizada.id,
      enunciado: preguntaActualizada.statement,
      opciones: preguntaActualizada.options,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        error: { 
          code: "QUESTION_NOT_FOUND",
          message: "Pregunta no encontrada",
        },
      });
    }
    throw error;
  }
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
app.delete("/api/questions/:id", async (req, res) => {
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

  const resultado = await prisma.question.deleteMany({
    where: { id },
  });

  if (resultado.count === 0) {
    return res.status(404).json({
      error: {
        code: "QUESTION_NOT_FOUND",
        message: "Pregunta no encontrada",
      },
    });
  }

  // Respondemos con 204 sin contenido.
  return res.status(204).send();
});

// Si ninguna ruta anterior coincide con la petición,
// devolvemos un error 404.
app.use(notFoundMiddleware);

// Los errores inesperados se gestionan mediante este middleware.
app.use(errorMiddleware);
