/* Pruebas de INTEGRACIÓN: concurrencia real contra la base de datos de pruebas.

   A diferencia de las pruebas con mocks, esta usa una base de datos REAL
   (trivia_test) a través de Prisma. Por eso vive en tests/integration/ y
   se ejecuta únicamente con:  npm run test:integration

   Crea sus propios usuarios y partidas y borra únicamente esos registros,
   aprovechando las relaciones en cascada del esquema. */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  joinGame,
  startGame,
  createMultiplayerGame,
} from "../../src/services/game.mutations.js";
import { prisma } from "../../src/lib/prisma.js";
import { asegurarBaseDePruebas } from "./helpers/db-guard.js";

/* Abortamos al cargar el fichero si la URL no es la de pruebas. */
asegurarBaseDePruebas(process.env.DATABASE_URL);

const idsUsuarios: number[] = [];
const idsPartidas: number[] = [];

let creadorId = 0;
let jugadorBId = 0;
let jugadorCId = 0;
let gameId = 0;
let codigo = "";

async function limpiarBaseDeDatos() {
  asegurarBaseDePruebas(process.env.DATABASE_URL);

  if (idsPartidas.length > 0) {
    await prisma.game.deleteMany({ where: { id: { in: idsPartidas } } });
  }
  if (idsUsuarios.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: idsUsuarios } } });
  }

  idsPartidas.length = 0;
  idsUsuarios.length = 0;
}

beforeEach(async () => {
  await limpiarBaseDeDatos();

  // Se registran los IDs inmediatamente después de crear cada registro,
  // para que la limpieza funcione aunque la preparación falle a mitad.
  const creador = await prisma.user.create({
    data: {
      email: `creador-${Date.now()}-${Math.random()}@test.com`,
      passwordHash: "x",
    },
  });
  idsUsuarios.push(creador.id);
  creadorId = creador.id;

  const jugadorB = await prisma.user.create({
    data: {
      email: `jugadorb-${Date.now()}-${Math.random()}@test.com`,
      passwordHash: "x",
    },
  });
  idsUsuarios.push(jugadorB.id);
  jugadorBId = jugadorB.id;

  const jugadorC = await prisma.user.create({
    data: {
      email: `jugadorc-${Date.now()}-${Math.random()}@test.com`,
      passwordHash: "x",
    },
  });
  idsUsuarios.push(jugadorC.id);
  jugadorCId = jugadorC.id;

  const game = await createMultiplayerGame(creador.id);
  idsPartidas.push(game.id);
  gameId = game.id;

  if (!game.code) {
    throw new Error("createMultiplayerGame no generó código de invitación");
  }
  codigo = game.code;
});

afterAll(async () => {
  await limpiarBaseDeDatos();
  await prisma.$disconnect();
});

describe("Concurrencia real - BD de pruebas", () => {
  it("entrada repetida del creador es idempotente", async () => {
    const res = await joinGame(creadorId, codigo);
    expect(res.ok).toBe(true);

    const count = await prisma.gamePlayer.count({ where: { gameId } });
    expect(count).toBe(1);
  });

  it("dos usuarios nuevos compiten por la última plaza: solo uno entra", async () => {
    const [resB, resC] = await Promise.all([
      joinGame(jugadorBId, codigo),
      joinGame(jugadorCId, codigo),
    ]);

    const exitosos = [resB, resC].filter((r) => r.ok);
    const fallidos = [resB, resC].filter((r) => !r.ok);

    expect(exitosos).toHaveLength(1);
    expect(fallidos).toHaveLength(1);
    if (!fallidos[0].ok) expect(fallidos[0].error).toBe("SALA_LLENA");

    const count = await prisma.gamePlayer.count({ where: { gameId } });
    expect(count).toBe(2);
  });

  it("dos startGame simultáneos: uno inicia, el otro recibe PARTIDA_YA_INICIADA", async () => {
    await joinGame(jugadorBId, codigo);

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

    const preguntas = await prisma.gameQuestion.count({ where: { gameId } });
    expect(preguntas).toBe(5);
  });
});
