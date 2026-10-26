/* Pruebas de INTEGRACIÓN del reto 17 contra PostgreSQL real (trivia_test).

   Comprueban lo que los mocks no pueden garantizar:
   - el orden de turnos y la revelación diferida;
   - la restricción única [gameQuestionId, userId];
   - el control de versión con peticiones simultáneas;
   - la finalización tras diez respuestas y el ganador/empate;
   - que el modo individual sigue funcionando.

   Se ejecutan solo con: npm run test:integration */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import {
  createGame,
  createMultiplayerGame,
  getGameById,
  joinGame,
  startGame,
  submitAnswer,
} from "../../src/services/game.services.js";
import { asegurarBaseDePruebas } from "./helpers/db-guard.js";

asegurarBaseDePruebas(process.env.DATABASE_URL);

const idsUsuarios: number[] = [];
const idsPartidas: number[] = [];

let jugador1 = 0;
let jugador2 = 0;
let ajeno = 0;

beforeAll(async () => {
  const crearUsuario = async (etiqueta: string) => {
    const usuario = await prisma.user.create({
      data: {
        email: `${etiqueta}-${Date.now()}-${Math.random()}@test.com`,
        passwordHash: "x",
      },
    });
    idsUsuarios.push(usuario.id);
    return usuario.id;
  };

  jugador1 = await crearUsuario("reto17-p1");
  jugador2 = await crearUsuario("reto17-p2");
  ajeno = await crearUsuario("reto17-ajeno");
});

afterEach(async () => {
  asegurarBaseDePruebas(process.env.DATABASE_URL);
  if (idsPartidas.length > 0) {
    await prisma.game.deleteMany({ where: { id: { in: idsPartidas } } });
    idsPartidas.length = 0;
  }
});

afterAll(async () => {
  asegurarBaseDePruebas(process.env.DATABASE_URL);
  if (idsUsuarios.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: idsUsuarios } } });
  }
  await prisma.$disconnect();
});

type PreguntaConOpciones = Awaited<
  ReturnType<typeof cargarPreguntas>
>[number];

async function cargarPreguntas(gameId: number) {
  return prisma.gameQuestion.findMany({
    where: { gameId },
    orderBy: { position: "asc" },
    include: { choices: { orderBy: { position: "asc" } } },
  });
}

function opcionCorrecta(pregunta: PreguntaConOpciones) {
  return pregunta.choices.find(
    (choice) => choice.position === pregunta.solution,
  )!;
}

function opcionIncorrecta(pregunta: PreguntaConOpciones) {
  return pregunta.choices.find(
    (choice) => choice.position !== pregunta.solution,
  )!;
}

async function crearPartidaIniciada() {
  const game = await createMultiplayerGame(jugador1);
  idsPartidas.push(game.id);
  if (!game.code) throw new Error("La sala no tiene código");

  const entrada = await joinGame(jugador2, game.code);
  expect(entrada.ok).toBe(true);

  const inicio = await startGame(game.id, jugador1);
  expect(inicio.ok).toBe(true);

  const preguntas = await cargarPreguntas(game.id);
  expect(preguntas).toHaveLength(5);
  return { game, preguntas };
}

describe("Turnos multijugador reales", () => {
  it("solo responde el jugador del turno y el acierto se oculta hasta el segundo", async () => {
    const { game, preguntas } = await crearPartidaIniciada();
    const primera = preguntas[0];

    // El jugador 2 intenta adelantarse.
    const adelanto = await submitAnswer(
      game.id,
      jugador2,
      primera.id,
      opcionCorrecta(primera).id,
    );
    expect(adelanto).toEqual({ ok: false, error: "WRONG_TURN" });

    // El jugador 1 responde bien: NO se revela nada todavía.
    const primero = await submitAnswer(
      game.id,
      jugador1,
      primera.id,
      opcionCorrecta(primera).id,
    );
    expect(primero.ok).toBe(true);
    if (primero.ok && primero.mode === "MULTIPLAYER") {
      expect(primero.roundComplete).toBe(false);
      expect(primero.results).toBeNull();
      expect(primero.players).toBeNull();
      expect(primero.nextTurn).toEqual({
        userId: jugador2,
        gameQuestionId: primera.id,
      });
    }

    // GET como jugador 2: sabe que P1 respondió, pero no si acertó.
    const estadoPendiente = await getGameById(game.id, jugador2);
    expect(estadoPendiente!.players).toEqual([
      { userId: jugador1, turnOrder: 1, score: 0 },
      { userId: jugador2, turnOrder: 2, score: 0 },
    ]);
    expect(estadoPendiente!.currentTurn).toEqual({
      userId: jugador2,
      turnOrder: 2,
      gameQuestionId: primera.id,
    });
    expect(estadoPendiente!.questions[0]).toMatchObject({
      answeredCount: 1,
      revealed: false,
      results: null,
    });

    // El jugador 2 responde mal y ahora sí se revela la ronda.
    const segundo = await submitAnswer(
      game.id,
      jugador2,
      primera.id,
      opcionIncorrecta(primera).id,
    );
    expect(segundo.ok).toBe(true);
    if (segundo.ok && segundo.mode === "MULTIPLAYER") {
      expect(segundo.roundComplete).toBe(true);
      expect(segundo.results).toEqual([
        { userId: jugador1, isCorrect: true },
        { userId: jugador2, isCorrect: false },
      ]);
      expect(segundo.players).toEqual([
        { userId: jugador1, score: 1 },
        { userId: jugador2, score: 0 },
      ]);
      expect(segundo.nextTurn).toEqual({
        userId: jugador1,
        gameQuestionId: preguntas[1].id,
      });
    }
  });

  it("una petición ajena no puede responder", async () => {
    const { game, preguntas } = await crearPartidaIniciada();

    const resultado = await submitAnswer(
      game.id,
      ajeno,
      preguntas[0].id,
      opcionCorrecta(preguntas[0]).id,
    );

    expect(resultado).toEqual({ ok: false, error: "NOT_PARTICIPANT" });
  });

  it("dos respuestas simultáneas del mismo jugador no duplican puntos", async () => {
    const { game, preguntas } = await crearPartidaIniciada();
    const primera = preguntas[0];
    const choiceId = opcionCorrecta(primera).id;

    const resultados = await Promise.all([
      submitAnswer(game.id, jugador1, primera.id, choiceId),
      submitAnswer(game.id, jugador1, primera.id, choiceId),
    ]);

    const exitosos = resultados.filter((resultado) => resultado.ok);
    const fallidos = resultados.filter((resultado) => !resultado.ok);

    expect(exitosos).toHaveLength(1);
    expect(fallidos).toHaveLength(1);
    if (!fallidos[0].ok) {
      expect(fallidos[0].error).toBe("ALREADY_ANSWERED");
    }

    const respuestas = await prisma.answer.count({
      where: { gameQuestionId: primera.id },
    });
    const partida = await prisma.game.findUnique({ where: { id: game.id } });
    const jugador = await prisma.gamePlayer.findUnique({
      where: {
        gameId_userId: { gameId: game.id, userId: jugador1 },
      },
    });

    expect(respuestas).toBe(1);
    expect(jugador?.score).toBe(1);
    expect(partida?.currentPosition).toBe(0);
    expect(partida?.currentTurnOrder).toBe(2);
    // startGame incrementa la versión a 1 y la respuesta la deja en 2.
    expect(partida?.turnVersion).toBe(2);
  });

  it("dos jugadores simultáneos dejan la partida coherente, sin saltarse turnos", async () => {
    const { game, preguntas } = await crearPartidaIniciada();
    const primera = preguntas[0];

    const [p1, p2] = await Promise.all([
      submitAnswer(
        game.id,
        jugador1,
        primera.id,
        opcionCorrecta(primera).id,
      ),
      submitAnswer(
        game.id,
        jugador2,
        primera.id,
        opcionIncorrecta(primera).id,
      ),
    ]);

    expect(p1.ok).toBe(true);
    // El jugador 2 puede haber llegado antes de que P1 guardara: si falla,
    // debe ser por turno, nunca por datos corruptos. Después se reintenta.
    if (!p2.ok) expect(p2.error).toBe("WRONG_TURN");

    const p2Final =
      p2.ok
        ? p2
        : await submitAnswer(
            game.id,
            jugador2,
            primera.id,
            opcionIncorrecta(primera).id,
          );
    expect(p2Final.ok).toBe(true);

    const respuestas = await prisma.answer.findMany({
      where: { gameQuestionId: primera.id },
      orderBy: { userId: "asc" },
    });
    const partida = await prisma.game.findUnique({ where: { id: game.id } });

    expect(respuestas).toHaveLength(2);
    expect(respuestas.map((r) => r.userId).sort()).toEqual(
      [jugador1, jugador2].sort(),
    );
    expect(partida?.currentPosition).toBe(1);
    expect(partida?.currentTurnOrder).toBe(1);
    // startGame (1) + respuesta de P1 (1) + respuesta de P2 (1) = 3.
    expect(partida?.turnVersion).toBe(3);
  });

  it("diez respuestas cierran la partida con ganador y no aceptan más", async () => {
    const { game, preguntas } = await crearPartidaIniciada();

    for (let posicion = 0; posicion < 5; posicion++) {
      const pregunta = preguntas[posicion];

      const p1 = await submitAnswer(
        game.id,
        jugador1,
        pregunta.id,
        opcionCorrecta(pregunta).id,
      );
      expect(p1.ok).toBe(true);
      if (p1.ok && p1.mode === "MULTIPLAYER") {
        expect(p1.results).toBeNull();
        expect(p1.finished).toBe(false);
      }

      const p2 = await submitAnswer(
        game.id,
        jugador2,
        pregunta.id,
        posicion < 2
          ? opcionCorrecta(pregunta).id
          : opcionIncorrecta(pregunta).id,
      );
      expect(p2.ok).toBe(true);
      if (p2.ok && p2.mode === "MULTIPLAYER") {
        expect(p2.finished).toBe(posicion === 4);
      }
    }

    const partida = await prisma.game.findUnique({ where: { id: game.id } });
    expect(partida?.status).toBe("FINISHED");
    expect(partida?.currentPosition).toBe(5);
    expect(partida?.winnerUserId).toBe(jugador1);
    expect(partida?.finishedAt).not.toBeNull();

    const respuestas = await prisma.answer.count({
      where: { gameQuestion: { gameId: game.id } },
    });
    expect(respuestas).toBe(10);

    const estado = await getGameById(game.id, jugador2);
    expect(estado!.players).toEqual([
      { userId: jugador1, turnOrder: 1, score: 5 },
      { userId: jugador2, turnOrder: 2, score: 2 },
    ]);
    expect(estado!.winnerUserId).toBe(jugador1);
    expect(estado!.isDraw).toBe(false);
    expect(estado!.questions.every((q) => q.revealed)).toBe(true);

    // Reintentar la última respuesta ya aceptada sigue siendo duplicado,
    // aunque la partida esté FINISHED.
    const ultima = preguntas[4];
    const repetida = await submitAnswer(
      game.id,
      jugador2,
      ultima.id,
      opcionIncorrecta(ultima).id,
    );
    expect(repetida).toEqual({ ok: false, error: "ALREADY_ANSWERED" });
  });

  it("un empate se cierra con winnerUserId null e isDraw true", async () => {
    const { game, preguntas } = await crearPartidaIniciada();

    for (let posicion = 0; posicion < 5; posicion++) {
      const pregunta = preguntas[posicion];

      await submitAnswer(
        game.id,
        jugador1,
        pregunta.id,
        posicion < 2
          ? opcionCorrecta(pregunta).id
          : opcionIncorrecta(pregunta).id,
      );
      await submitAnswer(
        game.id,
        jugador2,
        pregunta.id,
        posicion < 2
          ? opcionCorrecta(pregunta).id
          : opcionIncorrecta(pregunta).id,
      );
    }

    const partida = await prisma.game.findUnique({ where: { id: game.id } });
    const estado = await getGameById(game.id, jugador1);

    expect(partida?.winnerUserId).toBeNull();
    expect(estado!.isDraw).toBe(true);
    expect(estado!.players.map((p) => p.score)).toEqual([2, 2]);
  });
});

describe("Modo individual (regresión del reto 13)", () => {
  it("cinco respuestas siguen cerrando la partida y sumando puntos", async () => {
    const game = await createGame(jugador1);
    expect(game).not.toBeNull();
    idsPartidas.push(game!.id);

    const preguntas = await cargarPreguntas(game!.id);
    expect(preguntas).toHaveLength(5);

    for (let posicion = 0; posicion < 5; posicion++) {
      const pregunta = preguntas[posicion];
      const respuesta = await submitAnswer(
        game!.id,
        jugador1,
        pregunta.id,
        opcionCorrecta(pregunta).id,
      );

      expect(respuesta.ok).toBe(true);
      if (respuesta.ok && respuesta.mode === "INDIVIDUAL") {
        expect(respuesta.isCorrect).toBe(true);
        expect(respuesta.score).toBe(posicion + 1);
        expect(respuesta.finished).toBe(posicion === 4);
      }
    }

    const partida = await prisma.game.findUnique({ where: { id: game!.id } });
    const estado = await getGameById(game!.id, jugador1);

    expect(partida?.status).toBe("FINISHED");
    expect(partida?.currentPosition).toBe(5);
    expect(estado!.score).toBe(5);
    expect(estado!.nextQuestionId).toBeNull();
  });
});
