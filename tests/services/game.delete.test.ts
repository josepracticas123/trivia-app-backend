import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteWaitingGame } from "../../src/services/game.mutations.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    game: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

let game = {
  id: 7,
  mode: "MULTIPLAYER",
  status: "WAITING",
  players: [{ userId: 1, isCreator: true }],
};

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
    players: [{ userId: 1, isCreator: true }],
  };

  vi.mocked(prisma.game.findUnique).mockImplementation(
    async () => snapshot() as never,
  );
});

describe("deleteWaitingGame", () => {
  it("no borra una sala que pasa a ACTIVE antes del borrado atómico", async () => {
    vi.mocked(prisma.game.deleteMany).mockImplementation(
      async ({ where }: any) => {
        // Verifica que el DELETE exige seguir WAITING y que el usuario sea creador.
        expect(where).toMatchObject({
          id: 7,
          mode: "MULTIPLAYER",
          status: "WAITING",
          players: {
            some: {
              userId: 1,
              isCreator: true,
            },
          },
        });

        // Simula que otra petición inició la partida justo antes del DELETE.
        game.status = "ACTIVE";

        // La condición status: WAITING ya no coincide: no se borra ninguna fila.
        return { count: 0 } as never;
      },
    );

    const result = await deleteWaitingGame(7, 1);

    expect(result).toEqual({
      ok: false,
      error: "PARTIDA_YA_INICIADA",
    });
    expect(game.status).toBe("ACTIVE");
    expect(prisma.game.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.game.findUnique).toHaveBeenCalledTimes(2);
  });
});