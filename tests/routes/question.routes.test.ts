import express from "express";
import request from "supertest";
import {
  getQuestions,
  categoryExist,
  createQuestion,
  updateQuestion,
} from "../../src/services/question.service.js";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { questionRouter } from "../../src/routes/questions.routes.js";
import jwt from "jsonwebtoken";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/services/question.service.js", () => ({
  getQuestions: vi.fn(),
  // El controlador consulta si existe la categoria antes de crear.
  categoryExist: vi.fn(),

  // Simulamos la creación para no escribir en la BBDD real
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
}));
// Simulamos prisma
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));
//APP mínima para comprobar estas rutas
const app = express();
app.use(express.json());
app.use("/api/questions", questionRouter);

beforeEach(() => {
  //Secreto fijo par avalidar tokens durante tests
  process.env.JWT_SECRET = "Secreto-de-prueba";
  //Limpiamos las respuestas simuladas antes de cada test
  vi.clearAllMocks();
});
/* Comprobamos que cualquier persona puede consultar las preguntas, 
incluso si no envía un token de autenticación */
describe("GET /api/questions", () => {
  // La lectura de preguntas es pública y debe responder 200 sin token.
  it("es pública: responde aunque no se envíe token", async () => {
    // decidimos qué devolvería el servicio real.
    vi.mocked(getQuestions).mockResolvedValue({
      items: [
        {
          id: 1,
          categoryId: 1,
          statement: "¿Cuál es la capital de España?",
          choices: [
            { text: "Madrid", position: 0 },
            { text: "Barcelona", position: 1 },
            { text: "Valencia", position: 2 },
            { text: "Sevilla", position: 3 },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    } as never);

    // No podemos autorizar Bearer, a propósito
    const response = await request(app).get("/api/questions");

    //Si devuelve 200, confirmamos que authModdleware no protege el GET
    expect(response.status).toBe(200);

    // Confirma que el controlador devuelve exactamente una pregunta
    expect(response.body.items).toHaveLength(1);

    /*Confrima que transforma el formato interno del servicio
     (statement y choices) al formato público de la API
     (enunciado y opciones) */
    expect(response.body.items).toEqual([
      {
        id: 1,
        enunciado: "¿Cuál es la capital de España?",
        categoryId: 1,
        opciones: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
      },
    ]);
  });
});

/* Comprobamos que no podemos crear una pregunta si la
petición no incluye un token válido. */
describe("POST /api/questions", () => {
  // Sin token, el middleware de autenticación detiene la petición
  // antes de llegar al controlador y responde 401.
  it("Devuelve 401 si se intenta crear un apregunta sin token", async () => {
    const response = await request(app)
      .post("/api/questions")

      /* El cuerpo es válido: queremos demostrar que el fallo 
    se debe a no enviar el token, no a la validación de JSON. */
      .send({
        categoryId: 1,
        enunciado: "¿Cuál es la capital de Italia?",
        opciones: ["Roma", "Milan", "Napoles", "Turín"],
        respuestaCorrecta: 0,
      });

    //Sin autorización: Bearer "token", authMiddleware corta la petición
    expect(response.status).toBe(401);
    // Comprobamos que es un error de autenticación.
    expect(response.body).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Falta el token de autenticación",
      },
    });
  });
  // Un USER tiene un token válido, por lo que está autenticado,
  // pero no tiene permisos de ADMIN para crear preguntas: debe recibir 403
  it("devuelve 403 si un USER intenta crear una pregunta", async () => {
    // JWT válido que representa al usuario con id 1.
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      subject: "1",
      expiresIn: "1h",
    });

    // authMiddleware: el usuario existe.
    // adminMiddleware: pero tiene rol USER.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 1 } as never)
      .mockResolvedValueOnce({ role: "USER" } as never);

    const response = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId: 1,
        enunciado: "¿Cuál es la capital de Italia?",
        opciones: ["Roma", "Milán", "Nápoles", "Turín"],
        respuestaCorrecta: 0,
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  /* Comprueba que un admin autenticado puede crear preguntas. */
  it("devuelve 201 si un ADMIN crea una pregunta válida", async () => {
    // Token válido que identifica al usuario 1.
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      subject: "1",
      expiresIn: "1h",
    });

    // authMiddleware encuentra al usuario.
    // adminMiddleware comprueba que su rol es ADMIN.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 1 } as never)
      .mockResolvedValueOnce({ role: "ADMIN" } as never);

    // La categoría indicada en el cuerpo existe.
    vi.mocked(categoryExist).mockResolvedValue(true);

    // Simulamos lo que devuelve el servicio tras guardar en la BBDD.
    // Es formato interno: statement y choices.
    vi.mocked(createQuestion).mockResolvedValue({
      id: 2,
      statement: "¿Cuál es la capital de Italia?",
      categoryId: 1,
      choices: [
        { text: "Roma", position: 0 },
        { text: "Milán", position: 1 },
        { text: "Nápoles", position: 2 },
        { text: "Turín", position: 3 },
      ],
    } as never);

    const response = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId: 1,
        enunciado: "¿Cuál es la capital de Italia?",
        opciones: ["Roma", "Milán", "Nápoles", "Turín"],
        respuestaCorrecta: 0,
      });

    // ADMIN pasa ambos middlewares y el controlador crea la pregunta.
    expect(response.status).toBe(201);

    // La API devuelve el formato público, sin respuestaCorrecta.
    expect(response.body).toEqual({
      id: 2,
      enunciado: "¿Cuál es la capital de Italia?",
      categoryId: 1,
      opciones: ["Roma", "Milán", "Nápoles", "Turín"],
    });

    // Confirma que el controlador llegó a usar el servicio de creación.
    expect(createQuestion).toHaveBeenCalledOnce();
  });

  // Un admin autenticado intenta crear una pregunta pero la categoría no existe.
  // Debe devolver 400 VALIDATION_ERROR y NO llamar al servicio de creación.
  it("devuelve 400 VALIDATION_ERROR si la categoría no existe al crear", async () => {
    // Token válido que identifica al usuario 1.
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      subject: "1",
      expiresIn: "1h",
    });

    // authMiddleware encuentra al usuario.
    // adminMiddleware comprueba que su rol es ADMIN.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 1 } as never)
      .mockResolvedValueOnce({ role: "ADMIN" } as never);

    // La categoría indicada NO existe.
    vi.mocked(categoryExist).mockResolvedValue(false);

    const response = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId: 999,
        enunciado: "¿Cuál es la capital de Italia?",
        opciones: ["Roma", "Milán", "Nápoles", "Turín"],
        respuestaCorrecta: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
    // No debe llamar al servicio ni crear nada
    expect(createQuestion).not.toHaveBeenCalled();
  });
});
describe("PUT /api/questions/:id", () => {
  // Un admin autenticado intenta actualizar una pregunta pero la categoría no existe.
  // Debe devolver 400 VALIDATION_ERROR y NO llamar al servicio de actualización.
  it("devuelve 400 VALIDATION_ERROR si la categoría no existe al actualizar", async () => {
    // Token válido que identifica al usuario 1.
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      subject: "1",
      expiresIn: "1h",
    });

    // authMiddleware encuentra al usuario.
    // adminMiddleware comprueba que su rol es ADMIN.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 1 } as never)
      .mockResolvedValueOnce({ role: "ADMIN" } as never);

    // La categoría indicada NO existe.
    vi.mocked(categoryExist).mockResolvedValue(false);

    const response = await request(app)
      .put("/api/questions/1")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId: 999,
        enunciado: "Pregunta actualizada",
        opciones: ["A", "B", "C", "D"],
        respuestaCorrecta: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
      },
    });
    // No debe llamar al servicio ni modificar nada
    expect(updateQuestion).not.toHaveBeenCalled();
  });
});
