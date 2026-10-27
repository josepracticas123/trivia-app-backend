// tests/routes/games.multiplayer.test.ts
// Tests del reto 16: sala multijugador (crear, unirse, iniciar).
// Usan servicios simulados (mock) para no tocar la base de datos.

import express from "express"; // Framework web.
import request from "supertest"; // Cliente HTTP para probar rutas.
import { beforeEach, describe, it, expect, vi } from "vitest"; // Utilidades de Vitest.
import { gameRouter } from "../../src/routes/games.routes.js"; // Router de partidas.
import {
  createGame,
  createMultiplayerGame,
  joinGame,
  startGame,
  getGameById,
  submitAnswer,
  getMyGames,
} from "../../src/services/game.services.js"; // Servicios (se simulan).
import jwt from "jsonwebtoken";
import { prisma } from "../../src/lib/prisma.js"; // Se simula para authMiddleware.

// Sustituimos los servicios reales por versiones falsas.
vi.mock("../../src/services/game.services.js", () => ({
  createGame: vi.fn(),
  createMultiplayerGame: vi.fn(),
  joinGame: vi.fn(),
  startGame: vi.fn(),
  getGameById: vi.fn(),
  submitAnswer: vi.fn(),
  getMyGames: vi.fn(),
}));

vi.mock("../../src/sockets/index.js", () => ({
  io: { to: () => ({ emit: vi.fn() }) },
}));
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

// App mínima: solo monta el router de partidas.
const app = express();
app.use(express.json());
app.use("/api/games", gameRouter);

// Antes de cada test: limpia mocks y fija el secreto JWT.
beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = "Secreto-de-prueba";
  // authMiddleware consulta al usuario en BD; simulamos que existe.
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as never);
});

// Función auxiliar: genera un token JWT para un usuario.
function tokenDe(userId: number) {
  return jwt.sign({}, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: "1h",
  });
}

// Grupo: creación de partida multijugador.
describe("POST /api/games - multijugador", () => {
  // Test: crear sala devuelve 201 con código.
  it("crea sala WAITING con codigo (201)", async () => {
    // Simulamos que el servicio crea la sala.
    vi.mocked(createMultiplayerGame).mockResolvedValue({
      id: 1, status: "WAITING", code: "ABCDEF",
    } as never);

    const token = tokenDe(1); // Token del usuario 1.
    const res = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "MULTIPLAYER" });

    expect(res.status).toBe(201); // Debe responder 201 Created.
    expect(res.body.status).toBe("WAITING"); // Estado inicial WAITING.
    expect(res.body.code).toBe("ABCDEF"); // Devuelve el código.
  });

  // Test: modo inválido devuelve 400.
  it("modo invalido devuelve 400", async () => {
    const token = tokenDe(1);
    const res = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "INVALIDO" });

    expect(res.status).toBe(400); // Validación rechaza el modo.
    expect(createMultiplayerGame).not.toHaveBeenCalled(); // No se llamó al servicio.
  });
});

// Grupo: unirse a una sala.
describe("POST /api/games/join", () => {
  // Test: código inválido (formato) devuelve 400.
  it("codigo invalido devuelve 400", async () => {
    const token = tokenDe(1);
    const res = await request(app)
      .post("/api/games/join")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "12" }); // Código demasiado corto.

    expect(res.status).toBe(400); // Validación Zod rechaza.
  });

  // Test: join exitoso devuelve 200.
  it("join exitoso devuelve 200", async () => {
    vi.mocked(joinGame).mockResolvedValue({
      ok: true,
      game: { id: 1, status: "WAITING" },
    } as never);

    const token = tokenDe(2);
    const res = await request(app)
      .post("/api/games/join")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "ABCDEF" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("WAITING");
  });

  // Test: sala llena devuelve 409.
  it("sala llena devuelve 409", async () => {
    vi.mocked(joinGame).mockResolvedValue({
      ok: false,
      error: "SALA_LLENA",
    } as never);

    const token = tokenDe(3);
    const res = await request(app)
      .post("/api/games/join")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "ABCDEF" });

    expect(res.status).toBe(409); // SALA_LLENA → 409.
  });
});

// Grupo: turnos y revelación de resultados (reto 17).
describe("POST /api/games/:id/answers - turnos multijugador", () => {
  const body = { gameQuestionId: 12, choiceId: 45 };

  it("la primera respuesta de la ronda no revela acierto ni puntuación", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: true,
      mode: "MULTIPLAYER",
      gameQuestionId: 12,
      roundComplete: false,
      finished: false,
      nextTurn: { userId: 2, gameQuestionId: 12 },
      results: null,
      players: null,
      winnerUserId: null,
      isDraw: false,
    } as never);

    const res = await request(app)
      .post("/api/games/1/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      gameQuestionId: 12,
      roundComplete: false,
      finished: false,
      nextTurn: { userId: 2, gameQuestionId: 12 },
    });
    expect(res.body).not.toHaveProperty("isCorrect");
    expect(res.body).not.toHaveProperty("score");
    expect(res.body).not.toHaveProperty("results");
  });

  it("la segunda respuesta revela los dos resultados y las puntuaciones", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: true,
      mode: "MULTIPLAYER",
      gameQuestionId: 12,
      roundComplete: true,
      finished: false,
      nextTurn: { userId: 1, gameQuestionId: 13 },
      results: [
        { userId: 1, isCorrect: true },
        { userId: 2, isCorrect: false },
      ],
      players: [
        { userId: 1, score: 1 },
        { userId: 2, score: 0 },
      ],
      winnerUserId: null,
      isDraw: false,
    } as never);

    const res = await request(app)
      .post("/api/games/1/answers")
      .set("Authorization", `Bearer ${tokenDe(2)}`)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { userId: 1, isCorrect: true },
      { userId: 2, isCorrect: false },
    ]);
    expect(res.body.players).toEqual([
      { userId: 1, score: 1 },
      { userId: 2, score: 0 },
    ]);
    expect(res.body.nextTurn).toEqual({ userId: 1, gameQuestionId: 13 });
  });

  it.each([
    ["GAME_NOT_ACTIVE", 409, "GAME_NOT_ACTIVE"],
    ["CONFLICTO_CONCURRENCIA", 409, "CONFLICT"],
  ] as const)(
    "traduce %s a HTTP %i",
    async (errorServicio, status, codigo) => {
      vi.mocked(submitAnswer).mockResolvedValue({
        ok: false,
        error: errorServicio,
      } as never);

      const res = await request(app)
        .post("/api/games/1/answers")
        .set("Authorization", `Bearer ${tokenDe(1)}`)
        .send(body);

      expect(res.status).toBe(status);
      expect(res.body.error.code).toBe(codigo);
    },
  );
});

// Grupo: estado público del multijugador.
describe("GET /api/games/:id - estado multijugador", () => {
  it("devuelve el turno y las puntuaciones reveladas, sin soluciones", async () => {
    vi.mocked(getGameById).mockResolvedValue({
      id: 1,
      mode: "MULTIPLAYER",
      status: "ACTIVE",
      score: 0,
      nextQuestionId: 12,
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      finishedAt: null,
      currentTurn: { userId: 2, turnOrder: 2, gameQuestionId: 12 },
      players: [
        { userId: 1, turnOrder: 1, score: 0 },
        { userId: 2, turnOrder: 2, score: 0 },
      ],
      winnerUserId: null,
      isDraw: false,
      playersRaw: [{ userId: 1 }],
      questions: [
        {
          id: 12,
          position: 0,
          statement: "¿Capital de Portugal?",
          solution: 0, // no debe salir
          answered: false,
          answeredCount: 1,
          revealed: false,
          results: null,
          choices: [{ id: 45, text: "Lisboa", position: 0 }],
          answers: [{ userId: 1, isCorrect: true }],
        },
      ],
    } as never);

    const res = await request(app)
      .get("/api/games/1")
      .set("Authorization", `Bearer ${tokenDe(2)}`);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("MULTIPLAYER");
    expect(res.body.currentTurn).toEqual({
      userId: 2,
      turnOrder: 2,
      gameQuestionId: 12,
    });
    expect(res.body.players).toEqual([
      { userId: 1, turnOrder: 1, score: 0 },
      { userId: 2, turnOrder: 2, score: 0 },
    ]);
    expect(res.body.questions[0]).toMatchObject({
      answered: false,
      answeredCount: 1,
      revealed: false,
      results: null,
    });
    expect(res.body.questions[0]).not.toHaveProperty("solution");
    expect(res.body.questions[0]).not.toHaveProperty("answers");
  });
});

// Grupo: iniciar partida.
describe("POST /api/games/:id/start", () => {
  // Test: no creador devuelve 403.
  it("no creador devuelve 403", async () => {
    vi.mocked(startGame).mockResolvedValue({
      ok: false,
      error: "NOT_ADMIN",
    } as never);

    const token = tokenDe(2); // Usuario 2 (no creador).
    const res = await request(app)
      .post("/api/games/1/start")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403); // NOT_ADMIN → 403.
  });

  // Test: falta segundo jugador devuelve 400.
  it("falta segundo jugador devuelve 400", async () => {
    vi.mocked(startGame).mockResolvedValue({
      ok: false,
      error: "VALIDATION_ERROR",
    } as never);

    const token = tokenDe(1);
    const res = await request(app)
      .post("/api/games/1/start")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  // Test: inicio exitoso devuelve 200 ACTIVE.
  it("inicio exitoso devuelve 200 ACTIVE", async () => {
    vi.mocked(startGame).mockResolvedValue({
      ok: true,
      game: { id: 1, status: "ACTIVE" },
    } as never);

    const token = tokenDe(1); // Creador.
    const res = await request(app)
      .post("/api/games/1/start")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ACTIVE");
  });
});
