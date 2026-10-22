/* Pruebas de las rutas de partidas a nivel HTTP (supertest).
   Nivel "de arriba": montamos gameRouter en una app mínima y
   comprobamos el código de respuesta y el cuerpo que ve el cliente.
   - El servicio de partidas se SIMULA: estas pruebas no tocan la BBDD real.
   - Prisma solo se simula para lo que necesita authMiddleware (el usuario). */
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameRouter } from "../../src/routes/games.routes.js";
import {
  createGame,
  getGameById,
  submitAnswer,
} from "../../src/services/game.services.js";
import { prisma } from "../../src/lib/prisma.js";

// Simulamos el servicio de partidas: decidimos nosotros qué devuelve.
vi.mock("../../src/services/game.services.js", () => ({
  createGame: vi.fn(),
  getGameById: vi.fn(),
  submitAnswer: vi.fn(),
}));

// Simulamos prisma: authMiddleware solo pide el usuario del token.
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

// App mínima, igual que en app.ts pero sin middlewares globales.
const app = express();
app.use(express.json());
app.use("/api/games", gameRouter);

// Helper: crea un token JWT válido para el usuario que queramos.
function tokenDe(userId = 1) {
  return jwt.sign({}, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: "1h",
  });
}

beforeEach(() => {
  process.env.JWT_SECRET = "Secreto-de-prueba";
  vi.clearAllMocks();
  // Por defecto: el usuario del token (id 1) existe en la BBDD.
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as never);
});

/* POST /api/games — crear partida individual */
describe("POST /api/games", () => {
  // Sin token, authMiddleware corta la petición ANTES del controlador.
  it("devuelve 401 si no se envía token", async () => {
    const response = await request(app).post("/api/games");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  // Con token válido, el servicio crea la partida y respondemos 201.
  it("devuelve 201 con id y status cuando el servicio crea la partida", async () => {
    vi.mocked(createGame).mockResolvedValue({
      id: 7,
      status: "ACTIVE",
    } as never);

    const response = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 7, status: "ACTIVE" });
    // El controlador pide la partida al servicio para EL usuario del token.
    expect(createGame).toHaveBeenCalledWith(1);
  });

  // Si el catálogo no tiene 5 preguntas, el servicio devuelve null → 409.
  it("devuelve 409 si no hay preguntas suficientes", async () => {
    vi.mocked(createGame).mockResolvedValue(null);

    const response = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("NOT_ENOUGH_QUESTIONS");
  });
});

/* GET /api/games/:id — estado de la partida */
describe("GET /api/games/:id", () => {
  // Requisito del tutor: el id debe ser SOLO dígitos entre 1 y 2147483647.
  // Cualquier otra cosa → 400 y SIN LLAMAR al servicio (no se toca la BBDD).
  it.each(["0", "-5", "1.5", "1e100", "2147483648"])(
    "devuelve 400 sin llamar al servicio si el id es %s",
    async (id) => {
      const response = await request(app)
        .get(`/api/games/${id}`)
        .set("Authorization", `Bearer ${tokenDe(1)}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      // La validación es ANTES del servicio: nunca se llega a consultar.
      expect(getGameById).not.toHaveBeenCalled();
    },
  );

  // Id bien formado pero inexistente: el error corresponde al recurso → 404.
  it("devuelve 404 si la partida no existe", async () => {
    vi.mocked(getGameById).mockResolvedValue(null);

    const response = await request(app)
      .get("/api/games/99999")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("GAME_NOT_FOUND");
    // El mensaje también forma parte del contrato anterior.
    expect(response.body.error.message).toBe(
      "El id de la partida no es válido",
    );
  });

  // Existe pero el usuario autenticado no es participante → 403.
  it("devuelve 403 si el usuario no participa en la partida", async () => {
    vi.mocked(getGameById).mockResolvedValue({
      id: 7,
      status: "ACTIVE",
      score: 0,
      nextQuestionId: 100,
      players: [{ userId: 99 }], // ¡otro usuario!
      questions: [],
    } as never);

    const response = await request(app)
      .get("/api/games/7")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  // El happy path: el controlador construye la respuesta PÚBLICA campo a campo.
  it("devuelve 200 con score y nextQuestionId, y SIN las soluciones", async () => {
    vi.mocked(getGameById).mockResolvedValue({
      id: 7,
      status: "ACTIVE",
      score: 2,
      nextQuestionId: 42,
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      finishedAt: null,
      players: [{ userId: 1 }],
      questions: [
        {
          id: 42,
          position: 0,
          statement: "¿Cuál es la capital de España?",
          // Campos "peligrosos" que existen en la BBDD pero NO deben salir:
          solution: 0,
          questionId: 9,
          answers: [{ isCorrect: true }],
          choices: [
            { id: 100, text: "Madrid", position: 0 },
            { id: 101, text: "Sevilla", position: 1 },
          ],
        },
      ],
    } as never);

    const response = await request(app)
      .get("/api/games/7")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(200);

    // El progreso sí viaja...
    expect(response.body.score).toBe(2);
    expect(response.body.nextQuestionId).toBe(42);

    // ...pero las soluciones NUNCA: comprobamos que la copia de la
    // pregunta solo lleva los campos públicos.
    expect(response.body.questions[0]).toEqual({
      id: 42,
      position: 0,
      statement: "¿Cuál es la capital de España?",
      answered: true,
      choices: [
        { id: 100, text: "Madrid", position: 0 },
        { id: 101, text: "Sevilla", position: 1 },
      ],
    });
    expect(response.body.createdAt).toBe("2026-10-01T10:00:00.000Z");
    expect(response.body.finishedAt).toBeNull();
    expect(response.body.questions[0]).not.toHaveProperty("solution");
    expect(response.body.questions[0]).not.toHaveProperty("answers");
    expect(response.body.questions[0]).not.toHaveProperty("questionId");
  });
   
  // El enunciado pide poder CONTINUAR una partida: una pregunta pendiente
  // (sin respuestas) debe marcarse como NO respondida, y su solución sigue oculta.
  it("marca answered:false en una pregunta pendiente y sigue sin solución", async () => {
    vi.mocked(getGameById).mockResolvedValue({
      id: 8,
      status: "ACTIVE",
      score: 0,
      nextQuestionId: 55,
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      finishedAt: null,
      players: [{ userId: 1 }],
      questions: [
        {
          id: 55,
          position: 0,
          statement: "¿Cuál es la capital de Portugal?",
          solution: 2, // no debe salir
          questionId: 9,
          answers: [], // pendiente: nadie la ha respondido
          choices: [
            { id: 200, text: "Lisboa", position: 0 },
            { id: 201, text: "Oporto", position: 1 },
          ],
        },
      ],
    } as never);

    const response = await request(app)
      .get("/api/games/8")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(200);

    // La pendiente es la de turno y va marcada como NO respondida.
    expect(response.body.nextQuestionId).toBe(55);
    expect(response.body.questions[0].answered).toBe(false);

    // Y aunque la pendiente es justo la que hay que responder,
    // la solución sigue sin viajar.
    expect(response.body.questions[0]).not.toHaveProperty("solution");
  });

});

/* POST /api/games/:id/answers — responder la pregunta de turno */
describe("POST /api/games/:id/answers", () => {
  // Cuerpo válido de referencia: se reutiliza en los tests de error.
  const bodyValido = { gameQuestionId: 12, choiceId: 45 };

  it("devuelve 401 si no se envía token", async () => {
    const response = await request(app)
      .post("/api/games/7/answers")
      .send(bodyValido);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  // El id de la URL: igual que en el GET, 400 sin llamar al servicio.
  it.each(["0", "1e100"])(
    "devuelve 400 sin llamar al servicio si el id de la URL es %s",
    async (id) => {
      const response = await request(app)
        .post(`/api/games/${id}/answers`)
        .set("Authorization", `Bearer ${tokenDe(1)}`)
        .send(bodyValido);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(submitAnswer).not.toHaveBeenCalled();
    },
  );

  // El body: zod exige números enteros entre 1 y 2147483647 en AMBOS campos
  // y el .strict() rechaza campos extra como isCorrect.
  it.each([
    { gameQuestionId: 0, choiceId: 1 },
    { gameQuestionId: -5, choiceId: 1 },
    { gameQuestionId: 1.5, choiceId: 1 },
    { gameQuestionId: 1, choiceId: 0 },
    { gameQuestionId: 1, choiceId: 2147483648 },
    { gameQuestionId: 1, choiceId: 1, isCorrect: true }, // campo prohibido
  ])("devuelve 400 sin llamar al servicio con el body %j", async (body) => {
    const response = await request(app)
      .post("/api/games/7/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(submitAnswer).not.toHaveBeenCalled();
  });

  // Cada error del servicio tiene su HTTP (la tabla del controlador).
  it.each([
    ["GAME_NOT_FOUND", 404, "GAME_NOT_FOUND"],
    ["NOT_PARTICIPANT", 403, "FORBIDDEN"],
    ["GAME_FINISHED", 409, "GAME_FINISHED"],
    ["WRONG_TURN", 409, "WRONG_TURN"],
    ["CHOICE_NOT_IN_QUESTION", 400, "CHOICE_NOT_IN_QUESTION"],
    ["ALREADY_ANSWERED", 409, "ALREADY_ANSWERED"],
  ] as const)(
    "traduce el error %s del servicio a HTTP %i",
    async (errorServicio, status, codigo) => {
      vi.mocked(submitAnswer).mockResolvedValue({
        ok: false,
        error: errorServicio,
      } as never);

      const response = await request(app)
        .post("/api/games/7/answers")
        .set("Authorization", `Bearer ${tokenDe(1)}`)
        .send(bodyValido);

      expect(response.status).toBe(status);
      expect(response.body.error.code).toBe(codigo);
    },
  );

  // Happy path: el backend ya calculó isCorrect y score; solo los reenvía.
  it("devuelve 200 con isCorrect, score y finished", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: true,
      isCorrect: true,
      score: 2,
      finished: false,
    } as never);

    const response = await request(app)
      .post("/api/games/7/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send(bodyValido);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      gameQuestionId: 12,
      isCorrect: true,
      score: 2,
      finished: false,
    });
    // El controlador pasa al servicio: partida, usuario y los DOS ids del body.
    expect(submitAnswer).toHaveBeenCalledWith(7, 1, 12, 45);
  });
});
