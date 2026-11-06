import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameRouter } from "../../src/routes/games.routes.js";
import {
  confirmGameReady,
  createMultiplayerGame,
  deleteWaitingGame,
  joinGame,
  submitAnswer,
} from "../../src/services/game.services.js";
import { prisma } from "../../src/lib/prisma.js";
import { refreshPresenceForOnlineUsers } from "../../src/sockets/index.js";

const { emit, to, socketState } = vi.hoisted(() => {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const socketState: { io: { to: typeof to } | undefined } = {
    io: { to },
  };
  return { emit, to, socketState };
});

vi.mock("../../src/sockets/index.js", () => ({
  get io() {
    return socketState.io;
  },
  refreshPresenceForOnlineUsers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/services/game.services.js", () => ({
  confirmGameReady: vi.fn(),
  createGame: vi.fn(),
  createMultiplayerGame: vi.fn(),
  deleteWaitingGame: vi.fn(),
  getGameById: vi.fn(),
  getMyGames: vi.fn(),
  joinGame: vi.fn(),
  startGame: vi.fn(),
  submitAnswer: vi.fn(),
}));

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    game: { findUnique: vi.fn() },
  },
}));

const app = express();
app.use(express.json());
app.use("/api/games", gameRouter);

function tokenDe(userId = 1) {
  return jwt.sign({}, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: "1h",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = "secreto-de-prueba";
  socketState.io = { to };
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as never);
  vi.mocked(refreshPresenceForOnlineUsers).mockResolvedValue(undefined);
});

describe("eventos de partidas", () => {
  it("notifica la creación en la sala privada del creador con fecha ISO", async () => {
    const createdAt = new Date("2026-11-05T10:00:00.000Z");
    vi.mocked(createMultiplayerGame).mockResolvedValue({
      id: 12,
      mode: "MULTIPLAYER",
      status: "WAITING",
      code: "ABCDEF",
      createdAt,
    } as never);

    const response = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ mode: "MULTIPLAYER" });

    expect(response.status).toBe(201);
    expect(to).toHaveBeenCalledWith("user:1");
    expect(emit).toHaveBeenCalledWith("game:created", {
      id: 12,
      mode: "MULTIPLAYER",
      status: "WAITING",
      code: "ABCDEF",
      createdAt: "2026-11-05T10:00:00.000Z",
    });
  });

  it("notifica la unión al jugador y actualiza la sala existente", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 2 } as never);
    vi.mocked(joinGame).mockResolvedValue({
      ok: true,
      game: { id: 12, status: "WAITING", turnVersion: 0 },
    } as never);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: 12,
      status: "WAITING",
      turnVersion: 0,
    } as never);

    const response = await request(app)
      .post("/api/games/join")
      .set("Authorization", `Bearer ${tokenDe(2)}`)
      .send({ code: "ABCDEF" });

    expect(response.status).toBe(200);
    expect(to).toHaveBeenCalledWith("game:12");
    expect(emit).toHaveBeenNthCalledWith(1, "game:updated", {
      id: 12,
      status: "WAITING",
      turnVersion: 0,
    });
    expect(to).toHaveBeenCalledWith("user:2");
    expect(emit).toHaveBeenNthCalledWith(2, "game:joined", {
      id: 12,
      status: "WAITING",
      turnVersion: 0,
    });
  });

  it("intenta notificar al jugador aunque falle game:updated", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 2 } as never);
    vi.mocked(joinGame).mockResolvedValue({
      ok: true,
      game: { id: 12, status: "WAITING", turnVersion: 0 },
    } as never);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: 12,
      status: "WAITING",
      turnVersion: 0,
    } as never);
    to.mockImplementationOnce(() => {
      throw new Error("game room unavailable");
    });

    const response = await request(app)
      .post("/api/games/join")
      .set("Authorization", `Bearer ${tokenDe(2)}`)
      .send({ code: "ABCDEF" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 12, status: "WAITING" });
    expect(joinGame).toHaveBeenCalledTimes(1);
    expect(joinGame).toHaveBeenCalledWith(2, "ABCDEF");
    expect(to).toHaveBeenNthCalledWith(1, "game:12");
    expect(to).toHaveBeenNthCalledWith(2, "user:2");
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("game:joined", {
      id: 12,
      status: "WAITING",
      turnVersion: 0,
    });
  });

  it("notifica el inicio con estado ACTIVE y la nueva versión", async () => {
    vi.mocked(confirmGameReady).mockResolvedValue({
      ok: true,
      started: true,
      game: { id: 12, status: "ACTIVE", turnVersion: 1 },
    } as never);

    const response = await request(app)
      .post("/api/games/12/start")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(200);
    expect(to).toHaveBeenCalledWith("game:12");
    expect(emit).toHaveBeenCalledWith("game:updated", {
      id: 12,
      status: "ACTIVE",
      turnVersion: 1,
    });
  });

  it.each([
    ["ACTIVE", 4],
    ["FINISHED", 10],
  ] as const)(
    "notifica el turno/resultado con status %s sin incluir respuestas",
    async (status, turnVersion) => {
      vi.mocked(submitAnswer).mockResolvedValue({
        ok: true,
        mode: "MULTIPLAYER",
        gameQuestionId: 55,
        roundComplete: true,
        finished: status === "FINISHED",
        nextTurn: null,
      } as never);
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: 12,
        status,
        turnVersion,
      } as never);

      const response = await request(app)
        .post("/api/games/12/answers")
        .set("Authorization", `Bearer ${tokenDe(1)}`)
        .send({ gameQuestionId: 55, choiceId: 99 });

      expect(response.status).toBe(200);
      expect(to).toHaveBeenCalledWith("game:12");
      expect(emit).toHaveBeenCalledWith("game:updated", {
        id: 12,
        status,
        turnVersion,
      });
      expect(emit.mock.calls[0][1]).not.toHaveProperty("results");
      expect(emit.mock.calls[0][1]).not.toHaveProperty("solution");
    },
  );

  it("refresca presencia al finalizar aunque falle la lectura para notificar", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: true,
      mode: "INDIVIDUAL",
      gameQuestionId: 55,
      isCorrect: true,
      score: 5,
      finished: true,
    } as never);
    vi.mocked(prisma.game.findUnique).mockRejectedValueOnce(
      new Error("secondary read unavailable"),
    );

    const response = await request(app)
      .post("/api/games/12/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ gameQuestionId: 55, choiceId: 99 });

    expect(response.status).toBe(200);
    expect(refreshPresenceForOnlineUsers).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      gameQuestionId: 55,
      isCorrect: true,
      score: 5,
      finished: true,
    });
  });

  it("refresca presencia cuando finaliza y la lectura secundaria funciona", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: true,
      mode: "INDIVIDUAL",
      gameQuestionId: 55,
      isCorrect: true,
      score: 5,
      finished: true,
    } as never);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: 12,
      status: "FINISHED",
      turnVersion: 5,
    } as never);

    const response = await request(app)
      .post("/api/games/12/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ gameQuestionId: 55, choiceId: 99 });

    expect(response.status).toBe(200);
    expect(refreshPresenceForOnlineUsers).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith("game:12");
    expect(emit).toHaveBeenCalledWith("game:updated", {
      id: 12,
      status: "FINISHED",
      turnVersion: 5,
    });
  });

  it("no refresca presencia si la respuesta no finaliza la partida", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: true,
      mode: "INDIVIDUAL",
      gameQuestionId: 55,
      isCorrect: true,
      score: 1,
      finished: false,
    } as never);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: 12,
      status: "ACTIVE",
      turnVersion: 1,
    } as never);

    const response = await request(app)
      .post("/api/games/12/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ gameQuestionId: 55, choiceId: 99 });

    expect(response.status).toBe(200);
    expect(refreshPresenceForOnlineUsers).not.toHaveBeenCalled();
  });

  it("conserva 200 y no reintenta la mutación si falla presencia tras finalizar", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: true,
      mode: "INDIVIDUAL",
      gameQuestionId: 55,
      isCorrect: true,
      score: 5,
      finished: true,
    } as never);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: 12,
      status: "FINISHED",
      turnVersion: 5,
    } as never);
    vi.mocked(refreshPresenceForOnlineUsers).mockRejectedValueOnce(
      new Error("presence unavailable"),
    );

    const response = await request(app)
      .post("/api/games/12/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ gameQuestionId: 55, choiceId: 99 });

    expect(response.status).toBe(200);
    expect(submitAnswer).toHaveBeenCalledTimes(1);
    expect(refreshPresenceForOnlineUsers).toHaveBeenCalledTimes(1);
  });

  it("conserva el error de submitAnswer y no ejecuta efectos post-commit", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: false,
      error: "ALREADY_ANSWERED",
    } as never);

    const response = await request(app)
      .post("/api/games/12/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ gameQuestionId: 55, choiceId: 99 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ALREADY_ANSWERED");
    expect(submitAnswer).toHaveBeenCalledTimes(1);
    expect(prisma.game.findUnique).not.toHaveBeenCalled();
    expect(refreshPresenceForOnlineUsers).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("notifica la eliminación con el payload existente", async () => {
    vi.mocked(deleteWaitingGame).mockResolvedValue({ ok: true });

    const response = await request(app)
      .delete("/api/games/12")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(204);
    expect(to).toHaveBeenCalledWith("game:12");
    expect(emit).toHaveBeenCalledWith("game:deleted", { id: 12 });
  });

  it("conserva 201 si falla el refresco de presencia tras crear una sala", async () => {
    vi.mocked(createMultiplayerGame).mockResolvedValue({
      id: 12,
      mode: "MULTIPLAYER",
      status: "WAITING",
      code: "ABCDEF",
      createdAt: new Date("2026-11-05T10:00:00.000Z"),
    } as never);
    vi.mocked(refreshPresenceForOnlineUsers).mockRejectedValueOnce(
      new Error("presence unavailable"),
    );

    const response = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ mode: "MULTIPLAYER" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 12, status: "WAITING", code: "ABCDEF" });
  });

  it("conserva 201 si falla la notificación tras crear una sala", async () => {
    vi.mocked(createMultiplayerGame).mockResolvedValue({
      id: 12,
      mode: "MULTIPLAYER",
      status: "WAITING",
      code: "ABCDEF",
      createdAt: new Date("2026-11-05T10:00:00.000Z"),
    } as never);
    to.mockImplementationOnce(() => {
      throw new Error("socket adapter unavailable");
    });

    const response = await request(app)
      .post("/api/games")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ mode: "MULTIPLAYER" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 12, status: "WAITING", code: "ABCDEF" });
  });

  it("conserva 200 al unirse cuando Socket.IO no está disponible", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 2 } as never);
    vi.mocked(joinGame).mockResolvedValue({
      ok: true,
      game: { id: 12, status: "WAITING", turnVersion: 0 },
    } as never);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: 12,
      status: "WAITING",
      turnVersion: 0,
    } as never);
    socketState.io = undefined;

    const response = await request(app)
      .post("/api/games/join")
      .set("Authorization", `Bearer ${tokenDe(2)}`)
      .send({ code: "ABCDEF" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 12, status: "WAITING" });
  });

  it("conserva 200 cuando falla la notificación tras guardar una respuesta", async () => {
    vi.mocked(submitAnswer).mockResolvedValue({
      ok: true,
      mode: "INDIVIDUAL",
      gameQuestionId: 55,
      isCorrect: true,
      score: 1,
      finished: false,
    } as never);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      id: 12,
      status: "ACTIVE",
      turnVersion: 1,
    } as never);
    to.mockImplementationOnce(() => {
      throw new Error("socket adapter unavailable");
    });

    const response = await request(app)
      .post("/api/games/12/answers")
      .set("Authorization", `Bearer ${tokenDe(1)}`)
      .send({ gameQuestionId: 55, choiceId: 99 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      gameQuestionId: 55,
      isCorrect: true,
      score: 1,
      finished: false,
    });
  });

  it("conserva 200 al confirmar preparación cuando Socket.IO no está disponible", async () => {
    vi.mocked(confirmGameReady).mockResolvedValue({
      ok: true,
      started: true,
      game: { id: 12, status: "ACTIVE", turnVersion: 1 },
    } as never);
    socketState.io = undefined;

    const response = await request(app)
      .post("/api/games/12/start")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 12, status: "ACTIVE", started: true });
  });

  it("conserva 204 si falla el refresco de presencia tras eliminar", async () => {
    vi.mocked(deleteWaitingGame).mockResolvedValue({ ok: true });
    vi.mocked(refreshPresenceForOnlineUsers).mockRejectedValueOnce(
      new Error("presence unavailable"),
    );

    const response = await request(app)
      .delete("/api/games/12")
      .set("Authorization", `Bearer ${tokenDe(1)}`);

    expect(response.status).toBe(204);
  });

  it("mantiene el error de negocio cuando la unión no se confirma", async () => {
    vi.mocked(joinGame).mockResolvedValue({
      ok: false,
      error: "SALA_LLENA",
    } as never);

    const response = await request(app)
      .post("/api/games/join")
      .set("Authorization", `Bearer ${tokenDe(2)}`)
      .send({ code: "ABCDEF" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("GAME_FULL");
    expect(refreshPresenceForOnlineUsers).not.toHaveBeenCalled();
    expect(to).not.toHaveBeenCalled();
  });
});
