/* Pruebas del servicio de partidas con Prisma SIMULADO.
   No mockeamos el servicio (ese es el trabajo del otro test de rutas):
   aquí el servicio REAL se ejecuta contra una BBDD falsa en memoria,
   para probar su lógica: turnos, puntuación, duplicados... */
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGameById, submitAnswer } from "../../src/services/game.services.js";
import { prisma } from "../../src/lib/prisma.js";

// Sustituimos prisma por un doble de pruebas: SOLO las funciones
// que el servicio de partidas usa realmente.
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    game: { findUnique: vi.fn(), update: vi.fn() },
    gameChoice: { findUnique: vi.fn() },
    answer: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
// ---------- Nuestra BBDD falsa ----------
// Un objeto "estado" que hace de tablas: cada test lo reinicia.

type PreguntaFake = {
  id: number;
  position: number;
  solution: number;                    // posición de la correcta (0..3)
  answers: { isCorrect: boolean }[];  // respuestas ya dadas
};

type PartidaFake = {
  id: number;
  status: "ACTIVE" | "FINISHED";
  players: { userId: number }[];
  questions: PreguntaFake[];
  choices: { id: number; gameQuestionId: number; position: number }[];
  p2002: boolean; // si es true, answer.create falla como un duplicado
};

// Datos de partida: 5 preguntas (ids 100..104), 4 opciones cada una.
// Cada opción tiene id = pregunta * 10 + posición (1000, 1001...).
// La correcta SIEMPRE es la de posición 0 (= solution).
function crearPartidaSimulada(): PartidaFake {
  const questions: PreguntaFake[] = [0, 1, 2, 3, 4].map((i) => ({
    id: 100 + i,
    position: i,
    solution: 0,
    answers: [],
  }));

  const choices = questions.flatMap((q) =>
    [0, 1, 2, 3].map((p) => ({
      id: q.id * 10 + p,
      gameQuestionId: q.id,
      position: p,
    })),
  );

  return {
    id: 7,
    status: "ACTIVE",
    players: [{ userId: 1 }],
    questions,
    choices,
    p2002: false,
  };
}

// El "resultado" de prisma.game.findUnique: la partida tal y como
// la vería el servicio (con answers y choices dentro de cada pregunta).
// Es una función (no un valor) para que se relee el estado EN CADA llamada.
function devolverPartida() {
  return {
    id: estado.id,
    status: estado.status,
    players: estado.players,
    questions: estado.questions.map((q) => ({
      id: q.id,
      position: q.position,
      solution: q.solution,
      answers: q.answers.map((a) => ({ isCorrect: a.isCorrect })),
      choices: estado.choices.filter((c) => c.gameQuestionId === q.id),
    })),
  };
}

let estado: PartidaFake;
beforeEach(() => {
  vi.clearAllMocks();
  estado = crearPartidaSimulada();

  /* Carga la partida actual (se relee en cada llamada).
     Nota: "... as any" evita la bronca de tipos de Prisma, que tipa estos
     métodos como constructores encadenables en vez de promesas. */
  vi.mocked(prisma.game.findUnique as any).mockImplementation(
    async () => devolverPartida() as never,
  );

  // Busca una opción por su id dentro de la BBDD falsa.
  vi.mocked(prisma.gameChoice.findUnique as any).mockImplementation(
    async ({ where }: any) =>
      (estado.choices.find((c) => c.id === where.id) ?? null) as never,
  );

  // Guarda la respuesta... o revienta con P2002 si simulamos un duplicado.
  vi.mocked(prisma.answer.create as any).mockImplementation(async ({ data }: any) => {
    if (estado.p2002) {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      });
    }
    const pregunta = estado.questions.find((q) => q.id === data.gameQuestionId);
    pregunta?.answers.push({ isCorrect: data.isCorrect });
    return { id: pregunta?.answers.length ?? 0, ...data };
  });

  // Si la transacción pide cerrar la partida, se cierra.
  vi.mocked(prisma.game.update as any).mockImplementation(async ({ data }: any) => {
    if (data.status) estado.status = data.status;
    return devolverPartida() as never;
  });

  // $transaction: ejecuta el callback con un "tx" que apunta a nuestros
  // mismos mocks, así que las escrituras caen en el estado simulado.
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
    fn({ answer: prisma.answer, game: prisma.game }),
  );
});
describe("submitAnswer", () => {
  // El flujo completo: 5 respuestas correctas, puntuación 1→2→3→4→5
  // y la quinta cierra la partida.
  it("flujo de 5 respuestas: la puntuación sube y la quinta finaliza", async () => {
    for (let i = 0; i < 5; i++) {
      const resultado = await submitAnswer(7, 1, 100 + i, (100 + i) * 10);

      expect(resultado).toEqual({
        ok: true,
        isCorrect: true,
        score: i + 1,               // 1, 2, 3, 4 y 5
        finished: i === 4,          // solo la quinta es true
      });
    }

    // La partida quedó cerrada (se pidió update con status FINISHED).
    expect(estado.status).toBe("FINISHED");
    expect(prisma.game.update).toHaveBeenCalledOnce();
  });

  // El turno es la PRIMERA pregunta sin responder: saltarla es 409.
  it("responder fuera de turno devuelve WRONG_TURN sin guardar nada", async () => {
    // La pregunta 101 es la segunda; aún no toca.
    const resultado = await submitAnswer(7, 1, 101, 1010);

    expect(resultado).toEqual({ ok: false, error: "WRONG_TURN" });
    // Nada se guardó en la BBDD falsa.
    expect(prisma.answer.create).not.toHaveBeenCalled();
  });

  // Una opción de OTRA pregunta no vale, ni siquiera si es el turno.
  it("elegir una opción ajena devuelve CHOICE_NOT_IN_QUESTION", async () => {
    // Preguntamos por la 100, pero mandamos la opción 1010 (es de la 101).
    const resultado = await submitAnswer(7, 1, 100, 1010);

    expect(resultado).toEqual({ ok: false, error: "CHOICE_NOT_IN_QUESTION" });
    expect(prisma.answer.create).not.toHaveBeenCalled();
  });

  // Un usuario que no participa no puede responder.
  it("responde 403 a nivel lógico: NOT_PARTICIPANT", async () => {
    estado.players = [{ userId: 99 }]; // el id 1 ya no está

    const resultado = await submitAnswer(7, 1, 100, 1000);

    expect(resultado).toEqual({ ok: false, error: "NOT_PARTICIPANT" });
    // Ni siquiera se llega a buscar la opción.
    expect(prisma.gameChoice.findUnique).not.toHaveBeenCalled();
  });

  // Partida inexistente y partida cerrada.
  it("devuelve GAME_NOT_FOUND si la partida no existe", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValueOnce(null as never);

    const resultado = await submitAnswer(7, 1, 100, 1000);

    expect(resultado).toEqual({ ok: false, error: "GAME_NOT_FOUND" });
  });

  it("devuelve GAME_FINISHED si la partida ya está cerrada", async () => {
    estado.status = "FINISHED";

    const resultado = await submitAnswer(7, 1, 100, 1000);

    expect(resultado).toEqual({ ok: false, error: "GAME_FINISHED" });
  });

  /* El duplicado (carrera): otra petición se coló y la BBDD rechaza
     la segunda respuesta con P2002 → el servicio lo traduce a 409
     y NUNCA suma el punto dos veces. */
  it("un duplicado P2002 devuelve ALREADY_ANSWERED y no suma puntos", async () => {
    estado.p2002 = true; // la BBDD va a rechazar el INSERT

    const resultado = await submitAnswer(7, 1, 100, 1000);

    expect(resultado).toEqual({ ok: false, error: "ALREADY_ANSWERED" });
    // La respuesta no quedó guardada: la puntuación no se infla.
    expect(estado.questions[0].answers).toHaveLength(0);
    expect(prisma.game.update).not.toHaveBeenCalled();
  });
});
describe("getGameById", () => {
  // Mejora del tutor: score y nextQuestionId calculados de las respuestas.
  it("devuelve score y nextQuestionId calculados del servidor", async () => {
    // Simulamos que la pregunta 100 ya se respondió bien.
    estado.questions[0].answers.push({ isCorrect: true });

    const game = await getGameById(7);

    expect(game).not.toBeNull();
    expect(game!.score).toBe(1);              // 1 acierto
    expect(game!.nextQuestionId).toBe(101);   // la de position 1 es la de turno
    expect(game!.questions).toHaveLength(5);
  });

  // El score cuenta ACIERTOS, no respuestas: 3 correctas de 5 → 3 puntos.
  it("score solo suma aciertos y nextQuestionId es null al terminar", async () => {
    // Respondemos las 5: correctas las de position 0, 1 y 2; mal las otras.
    estado.questions[0].answers.push({ isCorrect: true });
    estado.questions[1].answers.push({ isCorrect: true });
    estado.questions[2].answers.push({ isCorrect: true });
    estado.questions[3].answers.push({ isCorrect: false });
    estado.questions[4].answers.push({ isCorrect: false });
    estado.status = "FINISHED";

    const game = await getGameById(7);

    expect(game!.score).toBe(3);
    expect(game!.nextQuestionId).toBeNull();  // ya no queda ninguna
  });

  it("devuelve null si la partida no existe", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValueOnce(null as never);

    const game = await getGameById(7);

    expect(game).toBeNull();
  });
});