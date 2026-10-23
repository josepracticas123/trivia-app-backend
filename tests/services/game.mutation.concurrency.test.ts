import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  joinGame,
  startGame,
  createMultiplayerGame,
} from "../../src/services/game.mutations.js";
import { prisma } from "../../src/lib/prisma.js";

describe("Concurrencia real - BD local", () => {
  let codigo: string;
  let gameId: number;
  let creadorId = 9001;
  let jugadorB = 9002;

  beforeEach(async () => {
    // Limpia datos de pruebas previos si existen
    await prisma.gamePlayer.deleteMany({
      where: { userId: { in: [creadorId, jugadorB] } },
    });
    await prisma.gameQuestion.deleteMany({
      where: { game: { code: { startsWith: "TEST" } } },
    });
    await prisma.game.deleteMany({ where: { code: { startsWith: "TEST" } } });

    const game = await createMultiplayerGame(creadorId);
    gameId = game.id;
    codigo = game.code!;
  });

  afterAll(async () => {
    await prisma.gamePlayer.deleteMany({
      where: { userId: { in: [creadorId, jugadorB] } },
    });
    await prisma.gameQuestion.deleteMany({
      where: { game: { code: { startsWith: "TEST" } } },
    });
    await prisma.game.deleteMany({ where: { code: { startsWith: "TEST" } } });
    await prisma.$disconnect();
  });

  it("dos joinGame simultáneos: solo uno entra, el otro recibe SALA_LLENA", async () => {
    const [resA, resB] = await Promise.all([
      joinGame(creadorId, codigo), // el creador ya está dentro → devuelve ok (idempotente)
      joinGame(jugadorB, codigo), // segundo jugador → ok
    ]);

    // Un tercero intentando entrar debería recibir SALA_LLENA
    const resC = await joinGame(9003, codigo);
    expect(resC.ok).toBe(false);
    if (!resC.ok) expect(resC.error).toBe("SALA_LLENA");

    // Verificación en BD: exactamente 2 jugadores
    const count = await prisma.gamePlayer.count({ where: { gameId } });
    expect(count).toBe(2);
  });

  it("dos startGame simultáneos: uno inicia, el otro recibe PARTIDA_YA_INICIADA", async () => {
    // Asegurar que hay 2 jugadores
    await joinGame(jugadorB, codigo);

    const [res1, res2] = await Promise.all([
      startGame(gameId, creadorId),
      startGame(gameId, creadorId),
    ]);

    const exitoso = res1.ok ? res1 : res2;
    const fallido = res1.ok ? res2 : res1;

    expect(exitoso.ok).toBe(true);
    if (exitoso.ok) expect(exitoso.game.status).toBe("ACTIVE");

    expect(fallido.ok).toBe(false);
    if (!fallido.ok) expect(fallido.error).toBe("PARTIDA_YA_INICIADA");

    // Verificación en BD: exactamente 5 preguntas, sin duplicar
    const preguntas = await prisma.gameQuestion.count({ where: { gameId } });
    expect(preguntas).toBe(5);
  });
});
