import { prisma } from "../lib/prisma.js";

// Para reconocer los errores conocidos de prisma( el p2002 de duplicados)
import { Prisma } from "@prisma/client";

// Preguntas qu etiene cada aprtida individual.
export const PREGUNTAS_POR_PARTIDA = 5;

/* Devuelve 5 preguntas aleatorias del catálogo con sus opciones ordenadas. */
export async function getRandomQuestions() {
  // $queryRaw ejecuta SQL directo; necesitamos CAST porque los enteros
  // de PostgreSQL llegan como bigint y Prisma los espera como number.
  const filas = await prisma.$queryRaw<{ id: number }[]>`
    SELECT CAST(id AS INTEGER) AS id
    FROM "Question"
    ORDER BY RANDOM()
    LIMIT 5
  `;

  const ids = filas.map((fila) => fila.id);

  // Recuperamos las preguntas completas con sus opciones.
  return prisma.question.findMany({
    where: { id: { in: ids } },
    include: {
      choices: {
        orderBy: { position: "asc" },
      },
    },
  });
}
/* Crea una partida individual para un usuario.
   Si hay menos de 5 preguntas en el catálogo, devuelve null. */
export async function createGame(userId: number) {
  // Elegimos 5 preguntas aleatorias con sus opciones.
  const preguntas = await getRandomQuestions();

  // Si no hay cinco, el controlador devolverá 409.
  if (preguntas.length < 5) {
    return null;
  }

  // Creamos la partida, el participante y las preguntas congeladas
  // en una sola transacción: o se crea todo, o no se crea nada.
  return prisma.$transaction(async (tx) => {
    // 1. La partida.
    const game = await tx.game.create({
      data: {
        players: {
          // 2. El participante: el usuario autenticado.
          create: { userId },
        },
      },
    });

    // 3. Por cada pregunta del catálogo, guardamos una copia
    // con sus opciones copiadas a GameChoice.
    for (const [indice, pregunta] of preguntas.entries()) {
      await tx.gameQuestion.create({
        data: {
          gameId: game.id,
          position: indice,
          // Copias: si cambia el catálogo, la partida no se altera.
          statement: pregunta.statement,
          // La solución es la posición de la opción correcta (0..3).
          solution: pregunta.choices.findIndex((choice) => choice.isCorrect),
          questionId: pregunta.id, // origen, opcional
          choices: {
            create: pregunta.choices.map((choice) => ({
              text: choice.text,
              position: choice.position,
            })),
          },
        },
      });
    }

    return game;
  });
}
/* Busca una partida por su id con participantes, preguntas, opciones y respuestas.
   Devuelve null si no existe: el controlador responde 404.
   Añade score y nextQuestionId calculados SIEMPRE en el servidor
   a partir de las respuestas guardadas (el cliente manda estas cifras). */
export async function getGameById(gameId: number) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      // Participantes: solo el userId nos sirve para comprobar ¿es tuya?.
      players: { select: { userId: true } },
      // Las 5 preguntas en orden de juego (posición de 0..4), con sus opciones
      // y las respuestas ya dadas (con ellas calculamos el progreso).
      questions: {
        orderBy: { position: "asc" },
        include: {
          choices: { orderBy: { position: "asc" } },
          answers: { select: { isCorrect: true } },
        },
      },
    },
  });

  if (!game) return null;

  // Puntos: 1 por cada respuesta correcta (como máximo 1 por pregunta).
  const score = game.questions.reduce(
    (total, q) => total + q.answers.filter((a) => a.isCorrect).length,
    0,
  );

  // Siguiente pregunta pendiente: la primera sin respuesta (null si no queda).
  const siguiente = game.questions.find((q) => q.answers.length === 0);

  return { ...game, score, nextQuestionId: siguiente?.id ?? null };
}
/* Registra la respuesta de un jugador y actualiza la partida. */
export type SubmitAnswerResult =
  | { ok: true; isCorrect: boolean; score: number; finished: boolean }
  | {
      ok: false;
      error:
        | "GAME_NOT_FOUND" // la partida no existe
        | "NOT_PARTICIPANT" // existe pero no participas
        | "GAME_FINISHED" // ya está cerrada
        | "QUESTION_NOT_IN_GAME" // esa copia de pregunta no es de ESTA partida
        | "WRONG_TURN" // no le toca a esa pregunta
        | "CHOICE_NOT_IN_QUESTION" // la opción no pertenece a esa pregunta
        | "ALREADY_ANSWERED"; // respuesta duplicada (carrera)
    };

/* Registra la respuesta de un jugador y actualiza la partida. */
export async function submitAnswer(
  gameId: number,
  userId: number,
  gameQuestionId: number,
  choiceId: number,
): Promise<SubmitAnswerResult> {
  // BLOQUE 1: cargar la partida con participantes, preguntas y respuestas
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: { select: { userId: true } },
      questions: {
        orderBy: { position: "asc" }, // en orden de juego
        include: { answers: { select: { isCorrect: true } } },
      },
    },
  });

  if (!game) return { ok: false, error: "GAME_NOT_FOUND" }; // → 404
  if (!game.players.some((player) => player.userId === userId))
    return { ok: false, error: "NOT_PARTICIPANT" }; // → 403
  if (game.status === "FINISHED") return { ok: false, error: "GAME_FINISHED" }; // → 409

  //  BLOQUE 2: la pregunta debe ser de ESTA partida y estar en SU TURNO
  const question = game.questions.find((q) => q.id === gameQuestionId);
  if (!question) return { ok: false, error: "QUESTION_NOT_IN_GAME" }; // → 404

  // El turno es la PRIMERA pregunta sin responder (las van en position 0..4).
  const turno = game.questions.find((q) => q.answers.length === 0);
  if (!turno) return { ok: false, error: "GAME_FINISHED" }; // defensa extra
  if (turno.id !== gameQuestionId) return { ok: false, error: "WRONG_TURN" }; // → 409

  // BLOQUE 3: la opción debe existir y pertenecer a ESA pregunta
  const choice = await prisma.gameChoice.findUnique({
    where: { id: choiceId },
  });
  if (!choice || choice.gameQuestionId !== gameQuestionId)
    return { ok: false, error: "CHOICE_NOT_IN_QUESTION" }; // → 400

  // BLOQUE 4: calcular el punto (¡en el servidor!) y guardar todo

  // La solución copiada es la POSICIÓN de la opción correcta (0..3).
  // El backend decide: el cliente no envía ni modifica esto.
  const isCorrect = choice.position === question.solution;

  // Puntos que ya llevas: suma de respuestas correctas anteriores.
  const previousScore = game.questions.reduce(
    (total, q) => total + q.answers.filter((a) => a.isCorrect).length,
    0,
  );
  const score = previousScore + (isCorrect ? 1 : 0);

  // ¿Esta era la quinta respuesta?
  const answered = game.questions.filter((q) => q.answers.length > 0).length;
  const finished = answered + 1 === PREGUNTAS_POR_PARTIDA;

  try {
    // Transacción: se guarda la respuesta y, si era la quinta, se cierra
    // la partida. O se hace todo, o no se hace nada.
    await prisma.$transaction(async (tx) => {
      await tx.answer.create({
        data: { gameQuestionId, choiceId, isCorrect },
      });
      if (finished) {
        await tx.game.update({
          where: { id: gameId },
          data: { status: "FINISHED", finishedAt: new Date() },
        });
      }
    });
  } catch (error) {
    // Última línea de defensa: tu tabla Answer tiene @@unique([gameQuestionId]),
    // así que un duplicado revienta con P2002 → 409 y NUNCA suma dos veces.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "ALREADY_ANSWERED" };
    }
    // Otros errores de BBDD → suben solos al middleware global (Express 5).
    throw error;
  }

  return { ok: true, isCorrect, score, finished };
}
