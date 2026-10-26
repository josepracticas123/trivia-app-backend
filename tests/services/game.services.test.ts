/* Pruebas del servicio de partidas con Prisma SIMULADO.
   No mockeamos el servicio (ese es el trabajo del otro test de rutas):
   aquí el servicio REAL se ejecuta contra una BBDD falsa en memoria,
   para probar turnos, revelación de resultados, puntuación y duplicados. */
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGameById, submitAnswer } from "../../src/services/game.services.js";
import { prisma } from "../../src/lib/prisma.js";

// Sustituimos prisma por un doble de pruebas: SOLO las funciones que usa el
// servicio de partidas. La transacción reutiliza los mismos mocks.
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    game: { findUnique: vi.fn(), updateMany: vi.fn() },
    answer: { create: vi.fn() },
    gamePlayer: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

type RespuestaFake = {
  userId: number;
  isCorrect: boolean;
};

type PreguntaFake = {
  id: number;
  position: number;
  solution: number;
  answers: RespuestaFake[];
};

type JugadorFake = {
  userId: number;
  turnOrder: number;
  score: number;
};

type PartidaFake = {
  id: number;
  mode: "INDIVIDUAL" | "MULTIPLAYER";
  status: "WAITING" | "ACTIVE" | "FINISHED";
  currentPosition: number;
  currentTurnOrder: number;
  turnVersion: number;
  winnerUserId: number | null;
  players: JugadorFake[];
  questions: PreguntaFake[];
  choices: { id: number; gameQuestionId: number; position: number }[];
  p2002: boolean; // simula que la BBDD rechaza el INSERT por duplicado
  forzarConflicto: boolean; // simula que otra petición cambió la versión
};

/* Datos: 5 preguntas (ids 100..104), 4 opciones cada una.
   Cada opción tiene id = pregunta * 10 + posición. La correcta es position 0. */
function crearPartida(mode: PartidaFake["mode"] = "INDIVIDUAL"): PartidaFake {
  const questions: PreguntaFake[] = [0, 1, 2, 3, 4].map((i) => ({
    id: 100 + i,
    position: i,
    solution: 0,
    answers: [],
  }));

  const choices = questions.flatMap((q) =>
    [0, 1, 2, 3].map((position) => ({
      id: q.id * 10 + position,
      gameQuestionId: q.id,
      position,
    })),
  );

  return {
    id: 7,
    mode,
    status: "ACTIVE",
    currentPosition: 0,
    currentTurnOrder: 1,
    turnVersion: 0,
    winnerUserId: null,
    players:
      mode === "MULTIPLAYER"
        ? [
            { userId: 1, turnOrder: 1, score: 0 },
            { userId: 2, turnOrder: 2, score: 0 },
          ]
        : [{ userId: 1, turnOrder: 1, score: 0 }],
    questions,
    choices,
    p2002: false,
    forzarConflicto: false,
  };
}

let estado: PartidaFake;

// El "resultado" de prisma.game.findUnique: la partida tal y como la vería el
// servicio, releída del estado en cada llamada.
function devolverPartida() {
  return {
    id: estado.id,
    mode: estado.mode,
    status: estado.status,
    currentPosition: estado.currentPosition,
    currentTurnOrder: estado.currentTurnOrder,
    turnVersion: estado.turnVersion,
    winnerUserId: estado.winnerUserId,
    players: estado.players.map((player) => ({ ...player })),
    questions: estado.questions.map((q) => ({
      id: q.id,
      position: q.position,
      solution: q.solution,
      answers: q.answers.map((answer) => ({ ...answer })),
      choices: estado.choices.filter((c) => c.gameQuestionId === q.id),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  estado = crearPartida();

  vi.mocked(prisma.game.findUnique as any).mockImplementation(
    async () => devolverPartida() as never,
  );

  /* Control de versión: solo actualiza si el WHERE coincide con el estado.
     Si no, devuelve count 0 como haría PostgreSQL cuando otra petición ganó. */
  vi.mocked(prisma.game.updateMany as any).mockImplementation(
    async ({ where, data }: any) => {
      if (estado.forzarConflicto) {
        estado.forzarConflicto = false;
        return { count: 0 };
      }

      const coincide =
        where.id === estado.id &&
        where.status === estado.status &&
        where.turnVersion === estado.turnVersion &&
        where.currentPosition === estado.currentPosition &&
        where.currentTurnOrder === estado.currentTurnOrder;

      if (!coincide) return { count: 0 };

      estado.turnVersion += data.turnVersion?.increment ?? 0;
      if (data.currentPosition !== undefined)
        estado.currentPosition = data.currentPosition;
      if (data.currentTurnOrder !== undefined)
        estado.currentTurnOrder = data.currentTurnOrder;
      if (data.status !== undefined) estado.status = data.status;
      if (data.winnerUserId !== undefined)
        estado.winnerUserId = data.winnerUserId;

      return { count: 1 };
    },
  );

  // Guarda la respuesta... o revienta con P2002 si simulamos un duplicado.
  vi.mocked(prisma.answer.create as any).mockImplementation(
    async ({ data }: any) => {
      if (estado.p2002) {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed",
          { code: "P2002", clientVersion: "test" },
        );
      }

      const pregunta = estado.questions.find(
        (q) => q.id === data.gameQuestionId,
      );
      if (pregunta?.answers.some((a) => a.userId === data.userId)) {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed",
          { code: "P2002", clientVersion: "test" },
        );
      }

      pregunta?.answers.push({
        userId: data.userId,
        isCorrect: data.isCorrect,
      });
      return { id: pregunta?.answers.length ?? 0, ...data };
    },
  );

  // La puntuación persistida del jugador sube dentro de la transacción.
  vi.mocked(prisma.gamePlayer.update as any).mockImplementation(
    async ({ where, data }: any) => {
      const jugador = estado.players.find(
        (p) => p.userId === where.gameId_userId.userId,
      );
      if (jugador && data.score?.increment) {
        jugador.score += data.score.increment;
      }
      return jugador as never;
    },
  );

  /* Transacción: ejecuta el callback con un tx que apunta a los mismos mocks.
     Si algo falla, restaura el estado, como haría el ROLLBACK de PostgreSQL. */
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
    const copia = structuredClone(estado);
    try {
      return await fn({
        game: prisma.game,
        answer: prisma.answer,
        gamePlayer: prisma.gamePlayer,
      });
    } catch (error) {
      estado = copia;
      // El flag del test no forma parte del estado de la BBDD: si la
      // transacción se revierte, el siguiente intento debe poder continuar.
      estado.forzarConflicto = false;
      throw error;
    }
  });
});

// La opción correcta de una pregunta es la posición 0.
const opcionCorrecta = (questionId: number) => questionId * 10;
const opcionIncorrecta = (questionId: number) => questionId * 10 + 1;

describe("submitAnswer - modo individual", () => {
  it("flujo de 5 respuestas: la puntuación sube y la quinta finaliza", async () => {
    for (let i = 0; i < 5; i++) {
      const resultado = await submitAnswer(
        7,
        1,
        100 + i,
        opcionCorrecta(100 + i),
      );

      expect(resultado).toEqual({
        ok: true,
        mode: "INDIVIDUAL",
        gameQuestionId: 100 + i,
        isCorrect: true,
        score: i + 1, // 1, 2, 3, 4 y 5
        finished: i === 4, // solo la quinta es true
      });
    }

    expect(estado.status).toBe("FINISHED");
    expect(estado.currentPosition).toBe(5);
    expect(estado.players[0].score).toBe(5);
  });

  it("responder fuera de turno devuelve WRONG_TURN sin guardar nada", async () => {
    const resultado = await submitAnswer(7, 1, 101, opcionCorrecta(101));

    expect(resultado).toEqual({ ok: false, error: "WRONG_TURN" });
    expect(prisma.answer.create).not.toHaveBeenCalled();
  });

  it("elegir una opción ajena devuelve CHOICE_NOT_IN_QUESTION", async () => {
    const resultado = await submitAnswer(7, 1, 100, opcionCorrecta(101));

    expect(resultado).toEqual({
      ok: false,
      error: "CHOICE_NOT_IN_QUESTION",
    });
    expect(prisma.answer.create).not.toHaveBeenCalled();
  });

  it("mantiene los errores de permisos y de estado", async () => {
    const noParticipa = await submitAnswer(7, 99, 100, opcionCorrecta(100));
    expect(noParticipa).toEqual({ ok: false, error: "NOT_PARTICIPANT" });

    estado.status = "FINISHED";
    const cerrada = await submitAnswer(7, 1, 100, opcionCorrecta(100));
    expect(cerrada).toEqual({ ok: false, error: "GAME_FINISHED" });

    estado = crearPartida("MULTIPLAYER");
    estado.status = "WAITING";
    const esperando = await submitAnswer(7, 1, 100, opcionCorrecta(100));
    expect(esperando).toEqual({ ok: false, error: "GAME_NOT_ACTIVE" });

    vi.mocked(prisma.game.findUnique).mockResolvedValueOnce(null as never);
    const inexistente = await submitAnswer(7, 1, 100, opcionCorrecta(100));
    expect(inexistente).toEqual({ ok: false, error: "GAME_NOT_FOUND" });
  });
});

describe("submitAnswer - turnos multijugador", () => {
  beforeEach(() => {
    estado = crearPartida("MULTIPLAYER");
  });

  it("el jugador 1 responde primero y NO se revela si acertó", async () => {
    const resultado = await submitAnswer(7, 1, 100, opcionCorrecta(100));

    expect(resultado).toMatchObject({
      ok: true,
      mode: "MULTIPLAYER",
      gameQuestionId: 100,
      roundComplete: false,
      finished: false,
      nextTurn: { userId: 2, gameQuestionId: 100 },
    });
    // Sin pistas del acierto del primero.
    expect(resultado).not.toHaveProperty("isCorrect");
    expect(resultado).not.toHaveProperty("score");
    if (resultado.ok && resultado.mode === "MULTIPLAYER") {
      expect(resultado.results).toBeNull();
      expect(resultado.players).toBeNull();
    }
    expect(estado.currentPosition).toBe(0); // sigue en la misma pregunta
    expect(estado.currentTurnOrder).toBe(2);
  });

  it("el jugador 2 no puede adelantarse al jugador 1", async () => {
    const resultado = await submitAnswer(7, 2, 100, opcionCorrecta(100));

    expect(resultado).toEqual({ ok: false, error: "WRONG_TURN" });
    expect(prisma.answer.create).not.toHaveBeenCalled();
  });

  it("cuando responde el jugador 2 se revelan ambos resultados y se avanza", async () => {
    await submitAnswer(7, 1, 100, opcionCorrecta(100));
    const resultado = await submitAnswer(7, 2, 100, opcionIncorrecta(100));

    expect(resultado).toEqual({
      ok: true,
      mode: "MULTIPLAYER",
      gameQuestionId: 100,
      roundComplete: true,
      finished: false,
      nextTurn: { userId: 1, gameQuestionId: 101 },
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
    });
    expect(estado.currentPosition).toBe(1);
    expect(estado.currentTurnOrder).toBe(1);
  });

  it("reintentar la misma respuesta se rechaza como duplicada", async () => {
    await submitAnswer(7, 1, 100, opcionCorrecta(100));

    const repetida = await submitAnswer(7, 1, 100, opcionIncorrecta(100));

    expect(repetida).toEqual({ ok: false, error: "ALREADY_ANSWERED" });
    expect(estado.questions[0].answers).toHaveLength(1);
    expect(estado.players[0].score).toBe(1);
  });

  it("una respuesta duplicada de la BBDD (P2002) no suma puntos", async () => {
    estado.p2002 = true;

    const resultado = await submitAnswer(7, 1, 100, opcionCorrecta(100));

    expect(resultado).toEqual({ ok: false, error: "ALREADY_ANSWERED" });
    expect(estado.questions[0].answers).toHaveLength(0);
    expect(estado.players[0].score).toBe(0);
    // La transacción revirtió también el avance de turno.
    expect(estado.currentTurnOrder).toBe(1);
  });

  it("un conflicto de versión reintenta con el estado nuevo", async () => {
    estado.forzarConflicto = true;

    const resultado = await submitAnswer(7, 1, 100, opcionCorrecta(100));

    expect(resultado).toMatchObject({ ok: true, roundComplete: false });
    expect(prisma.game.updateMany).toHaveBeenCalledTimes(2);
    expect(estado.questions[0].answers).toHaveLength(1);
  });
});

describe("submitAnswer - finalización multijugador", () => {
  beforeEach(() => {
    estado = crearPartida("MULTIPLAYER");
  });

  it("diez respuestas cierran la partida con ganador", async () => {
    // P1 acierta las 5; P2 acierta solo las 2 primeras.
    for (let posicion = 0; posicion < 5; posicion++) {
      const pregunta = 100 + posicion;

      const p1 = await submitAnswer(
        7,
        1,
        pregunta,
        opcionCorrecta(pregunta),
      );
      expect(p1.ok).toBe(true);
      if (p1.ok && p1.mode === "MULTIPLAYER") {
        expect(p1.finished).toBe(false);
        expect(p1.results).toBeNull();
      }

      const p2 = await submitAnswer(
        7,
        2,
        pregunta,
        posicion < 2
          ? opcionCorrecta(pregunta)
          : opcionIncorrecta(pregunta),
      );

      expect(p2.ok).toBe(true);
      if (p2.ok && p2.mode === "MULTIPLAYER") {
        expect(p2.roundComplete).toBe(true);
        expect(p2.finished).toBe(posicion === 4);
        if (posicion === 4) {
          expect(p2.results).toEqual([
            { userId: 1, isCorrect: true },
            { userId: 2, isCorrect: false },
          ]);
          expect(p2.players).toEqual([
            { userId: 1, score: 5 },
            { userId: 2, score: 2 },
          ]);
          expect(p2.winnerUserId).toBe(1);
          expect(p2.isDraw).toBe(false);
          expect(p2.nextTurn).toBeNull();
        }
      }
    }

    expect(estado.status).toBe("FINISHED");
    expect(estado.currentPosition).toBe(5);
    expect(estado.winnerUserId).toBe(1);
  });

  it("si empatan, el ganador es null y isDraw es true", async () => {
    // Ambos aciertan las mismas 2 preguntas.
    for (let posicion = 0; posicion < 5; posicion++) {
      const pregunta = 100 + posicion;
      await submitAnswer(
        7,
        1,
        pregunta,
        posicion < 2 ? opcionCorrecta(pregunta) : opcionIncorrecta(pregunta),
      );
      const ultima = await submitAnswer(
        7,
        2,
        pregunta,
        posicion < 2 ? opcionCorrecta(pregunta) : opcionIncorrecta(pregunta),
      );

      if (posicion === 4) {
        expect(ultima.ok).toBe(true);
        if (ultima.ok && ultima.mode === "MULTIPLAYER") {
          expect(ultima.players).toEqual([
            { userId: 1, score: 2 },
            { userId: 2, score: 2 },
          ]);
          expect(ultima.winnerUserId).toBeNull();
          expect(ultima.isDraw).toBe(true);
        }
      }
    }

    expect(estado.winnerUserId).toBeNull();
  });
});

describe("getGameById", () => {
  it("en individual devuelve score y nextQuestionId del servidor", async () => {
    estado.players[0].score = 3;
    estado.currentPosition = 2;

    const game = await getGameById(7, 1);

    expect(game).not.toBeNull();
    expect(game!.score).toBe(3);
    expect(game!.nextQuestionId).toBe(102);
    expect(game!.questions).toHaveLength(5);
  });

  it("en multijugador oculta el resultado del primero hasta que responde el segundo", async () => {
    estado = crearPartida("MULTIPLAYER");
    // El jugador 1 ya acertó la primera pregunta.
    estado.questions[0].answers.push({ userId: 1, isCorrect: true });
    estado.players[0].score = 1;
    estado.currentTurnOrder = 2;

    const pendiente = await getGameById(7, 2);

    expect(pendiente!.score).toBe(0); // el score de P2 no incluye la ronda abierta
    expect(pendiente!.players).toEqual([
      { userId: 1, turnOrder: 1, score: 0 }, // tampoco se publica el punto de P1
      { userId: 2, turnOrder: 2, score: 0 },
    ]);
    expect(pendiente!.currentTurn).toEqual({
      userId: 2,
      turnOrder: 2,
      gameQuestionId: 100,
    });
    expect(pendiente!.questions[0]).toMatchObject({
      answered: false, // para el jugador 2
      answeredCount: 1,
      revealed: false,
      results: null,
    });

    // El jugador 2 responde (mal) y la ronda queda revelada.
    estado.questions[0].answers.push({ userId: 2, isCorrect: false });
    // El turno avanza a la siguiente pregunta, como hace submitAnswer.
    estado.currentPosition = 1;
    estado.currentTurnOrder = 1;

    const revelada = await getGameById(7, 2);

    expect(revelada!.players).toEqual([
      { userId: 1, turnOrder: 1, score: 1 },
      { userId: 2, turnOrder: 2, score: 0 },
    ]);
    expect(revelada!.questions[0]).toMatchObject({
      answered: true,
      answeredCount: 2,
      revealed: true,
      results: [
        { userId: 1, isCorrect: true },
        { userId: 2, isCorrect: false },
      ],
    });
    expect(revelada!.nextQuestionId).toBe(101);
  });

  it("devuelve null si la partida no existe", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValueOnce(null as never);

    const game = await getGameById(7);

    expect(game).toBeNull();
  });
});
