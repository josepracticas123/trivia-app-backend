import { describe, it, expect, vi, beforeEach } from "vitest";
import { joinGame, startGame } from "../../src/services/game.mutations.js";
import { prisma } from "../../src/lib/prisma.js";
import { Prisma } from "@prisma/client";
import { getRandomQuestions } from "../../src/services/game.queries.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    game: { findUnique: vi.fn(), updateMany: vi.fn() },
    gamePlayer: { count: vi.fn(), create: vi.fn() },
    gameQuestion: { create: vi.fn() },
    $transaction: vi.fn(async (cb: any) => {
      const tx = {
        gamePlayer: { count: vi.fn(), create: vi.fn() },
        game: { updateMany: vi.fn() },
        gameQuestion: { create: vi.fn() },
      };
      // Copiamos los mocks actuales al tx para que los tests controlen el comportamiento.
      tx.gamePlayer.count = vi.mocked(prisma.gamePlayer.count);
      tx.gamePlayer.create = vi.mocked(prisma.gamePlayer.create);
      tx.game.updateMany = vi.mocked(prisma.game.updateMany);
      tx.gameQuestion.create = vi.mocked(prisma.gameQuestion.create);
      return cb(tx);
    }),
  },
}));

vi.mock("../../src/services/game.queries.js", () => ({
  getRandomQuestions: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("joinGame - P2034", () => {
  it("P2034 seguido de éxito: reintenta y completa", async () => {
    const game = { id: 1, status: "WAITING", players: [] };
    vi.mocked(prisma.game.findUnique).mockResolvedValue(game as never);
    // Primer intento: P2034; segundo: OK.
    vi.mocked(prisma.gamePlayer.count)
      .mockResolvedValueOnce(1 as never)
      .mockResolvedValueOnce(1 as never);
    vi.mocked(prisma.gamePlayer.create)
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("conflict", {
          code: "P2034",
          clientVersion: "7.10.0",
        }),
      )
      .mockResolvedValueOnce({} as never);

    const res = await joinGame(2, "ABCDEF");
    expect(res.ok).toBe(true);
    expect(prisma.gamePlayer.create).toHaveBeenCalledTimes(2);
  });

  it("P2034 tras el que ya no procede: devuelve conflicto", async () => {
    const game = { id: 1, status: "WAITING", players: [] };
    vi.mocked(prisma.game.findUnique).mockResolvedValue(game as never);
    vi.mocked(prisma.gamePlayer.count).mockResolvedValue(2 as never); // ya lleno

    const res = await joinGame(3, "ABCDEF");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("SALA_LLENA");
  });

  it("conflictos repetidos hasta agotar: devuelve CONFLICTO_CONCURRENCIA", async () => {
    const game = { id: 1, status: "WAITING", players: [] };
    vi.mocked(prisma.game.findUnique).mockResolvedValue(game as never);
    vi.mocked(prisma.gamePlayer.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.gamePlayer.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2034",
        clientVersion: "7.10.0",
      }),
    );

    const res = await joinGame(4, "ABCDEF");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("CONFLICTO_CONCURRENCIA");
    expect(prisma.gamePlayer.create).toHaveBeenCalledTimes(3);
  });
});

describe("startGame - P2034", () => {
  const gameMultiplayer = {
    id: 1,
    status: "WAITING",
    mode: "MULTIPLAYER",
    players: [
      { userId: 1, isCreator: true },
      { userId: 2, isCreator: false },
    ],
  };

  const preguntas = [
    { id: 100, statement: "P1", position: 0, questionId: 100,
      choices: [{ id: 1, text: "A", position: 0, isCorrect: true }, { id: 2, text: "B", position: 1, isCorrect: false }, { id: 3, text: "C", position: 2, isCorrect: false }, { id: 4, text: "D", position: 3, isCorrect: false }] },
    { id: 101, statement: "P2", position: 1, questionId: 101,
      choices: [{ id: 5, text: "A", position: 0, isCorrect: false }, { id: 6, text: "B", position: 1, isCorrect: true }, { id: 7, text: "C", position: 2, isCorrect: false }, { id: 8, text: "D", position: 3, isCorrect: false }] },
    { id: 102, statement: "P3", position: 2, questionId: 102,
      choices: [{ id: 9, text: "A", position: 0, isCorrect: false }, { id: 10, text: "B", position: 1, isCorrect: false }, { id: 11, text: "C", position: 2, isCorrect: true }, { id: 12, text: "D", position: 3, isCorrect: false }] },
    { id: 103, statement: "P4", position: 3, questionId: 103,
      choices: [{ id: 13, text: "A", position: 0, isCorrect: false }, { id: 14, text: "B", position: 1, isCorrect: true }, { id: 15, text: "C", position: 2, isCorrect: false }, { id: 16, text: "D", position: 3, isCorrect: false }] },
    { id: 104, statement: "P5", position: 4, questionId: 104,
      choices: [{ id: 17, text: "A", position: 0, isCorrect: true }, { id: 18, text: "B", position: 1, isCorrect: false }, { id: 19, text: "C", position: 2, isCorrect: false }, { id: 20, text: "D", position: 3, isCorrect: false }] },
  ];

  beforeEach(() => {
    vi.mocked(getRandomQuestions).mockResolvedValue(preguntas as never);
  });

  it("P2034 seguido de éxito: reintenta y completa", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValue(gameMultiplayer as never);
    // Primer intento: P2034 en updateMany; segundo: OK.
    vi.mocked(prisma.game.updateMany)
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("conflict", {
          code: "P2034",
          clientVersion: "7.10.0",
        }),
      )
      .mockResolvedValueOnce({ count: 1 } as never);

    const res = await startGame(1, 1);
    expect(res.ok).toBe(true);
    expect(prisma.game.updateMany).toHaveBeenCalledTimes(2);
  });

  it("P2034 tras el que ya no procede: partida ya iniciada", async () => {
    const gameIniciada = { ...gameMultiplayer, status: "ACTIVE" };
    vi.mocked(prisma.game.findUnique)
      .mockResolvedValueOnce(gameMultiplayer as never) // 1er intento: WAITING
      .mockResolvedValueOnce(gameIniciada as never);   // 2º intento: ya ACTIVE

    vi.mocked(prisma.game.updateMany)
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("conflict", {
          code: "P2034",
          clientVersion: "7.10.0",
        }),
      );

    const res = await startGame(1, 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("PARTIDA_YA_INICIADA");
  });

  it("conflictos repetidos hasta agotar: devuelve CONFLICTO_CONCURRENCIA", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValue(gameMultiplayer as never);
    vi.mocked(prisma.game.updateMany).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2034",
        clientVersion: "7.10.0",
      }),
    );

    const res = await startGame(1, 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("CONFLICTO_CONCURRENCIA");
    expect(prisma.game.updateMany).toHaveBeenCalledTimes(3);
  });
});
