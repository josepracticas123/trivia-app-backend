import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmGameReady } from "../../src/services/game.mutations.js";
import { prisma } from "../../src/lib/prisma.js";
import { getRandomQuestions } from "../../src/services/game.queries.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    game: { findUnique: vi.fn(), updateMany: vi.fn() },
    gamePlayer: { updateMany: vi.fn() },
    gameQuestion: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../src/services/game.queries.js", () => ({
  getRandomQuestions: vi.fn(),
}));

type Player = { userId: number; isReady: boolean };

let game = {
  id: 7,
  mode: "MULTIPLAYER",
  status: "WAITING",
  turnVersion: 0,
  players: [
    { userId: 1, isReady: false },
    { userId: 2, isReady: false },
  ] as Player[],
};

const questions = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  statement: `Pregunta ${index + 1}`,
  choices: [
    { text: "Correcta", position: 0, isCorrect: true },
    { text: "Incorrecta", position: 1, isCorrect: false },
  ],
}));

function snapshot() {
  return {
    ...game,
    players: game.players.map((player) => ({ ...player })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  game = {
    id: 7,
    mode: "MULTIPLAYER",
    status: "WAITING",
    turnVersion: 0,
    players: [
      { userId: 1, isReady: false },
      { userId: 2, isReady: false },
    ],
  };

  vi.mocked(getRandomQuestions).mockResolvedValue(questions as never);
  vi.mocked(prisma.game.findUnique).mockImplementation(
    async () => snapshot() as never,
  );
  vi.mocked(prisma.gamePlayer.updateMany).mockImplementation(
    async ({ where }: any) => {
      const player = game.players.find(
        (candidate) =>
          candidate.userId === where.userId &&
          candidate.isReady === where.isReady,
      );
      if (!player) return { count: 0 } as never;
      player.isReady = true;
      return { count: 1 } as never;
    },
  );
  vi.mocked(prisma.game.updateMany).mockImplementation(
    async ({ where, data }: any) => {
      if (where.id !== game.id || where.status !== game.status) {
        return { count: 0 } as never;
      }
      game.status = data.status;
      game.turnVersion += data.turnVersion.increment;
      return { count: 1 } as never;
    },
  );
  vi.mocked(prisma.gameQuestion.create).mockResolvedValue({} as never);
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
    callback({
      game: prisma.game,
      gamePlayer: prisma.gamePlayer,
      gameQuestion: prisma.gameQuestion,
    }),
  );
});

describe("confirmGameReady", () => {
  it("rechaza a un usuario ajeno sin cambiar datos", async () => {
    const result = await confirmGameReady(7, 3);

    expect(result).toEqual({ ok: false, error: "NOT_PARTICIPANT" });
    expect(game.status).toBe("WAITING");
    expect(game.players.every((player) => !player.isReady)).toBe(true);
    expect(prisma.gamePlayer.updateMany).not.toHaveBeenCalled();
  });

  it("el primer participante queda preparado y espera", async () => {
    const result = await confirmGameReady(7, 1);

    expect(result).toMatchObject({
      ok: true,
      started: false,
      game: { id: 7, status: "WAITING" },
    });
    expect(game.players[0].isReady).toBe(true);
    expect(game.status).toBe("WAITING");
    expect(prisma.gameQuestion.create).not.toHaveBeenCalled();
  });

  it("el segundo participante inicia la partida cuando ambos confirmaron", async () => {
    await confirmGameReady(7, 1);
    const result = await confirmGameReady(7, 2);

    expect(result).toMatchObject({
      ok: true,
      started: true,
      game: { id: 7, status: "ACTIVE", turnVersion: 1 },
    });
    expect(game.status).toBe("ACTIVE");
    expect(prisma.gameQuestion.create).toHaveBeenCalledTimes(5);
  });

  it("repetir la confirmacion es idempotente", async () => {
    await confirmGameReady(7, 1);
    const result = await confirmGameReady(7, 1);

    expect(result).toMatchObject({ ok: true, started: false });
    expect(prisma.gamePlayer.updateMany).toHaveBeenCalledTimes(1);
  });

  it.each(["ACTIVE", "FINISHED"] as const)(
    "rechaza una partida %s sin modificar la preparacion",
    async (status) => {
      game.status = status;
      game.players[0].isReady = false;

      const result = await confirmGameReady(7, 1);

      expect(result).toEqual({ ok: false, error: "PARTIDA_YA_INICIADA" });
      expect(game.players[0].isReady).toBe(false);
      expect(prisma.gamePlayer.updateMany).not.toHaveBeenCalled();
    },
  );
});
