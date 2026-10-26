/* Consultas de partidas: solo leen de la base, no modifican nada.
   Separadas de las mutaciones para que cada fichero tenga un propósito claro. */
import { prisma } from "../lib/prisma.js";

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

/* Busca una partida por su id con participantes, preguntas, opciones y respuestas.
   Devuelve null si no existe: el controlador responde 404.

   En multijugador solo se publican los resultados y las puntuaciones de las
   rondas en las que YA respondieron los dos jugadores. Mientras falta el
   segundo, el acierto del primero queda oculto. */
export async function getGameById(gameId: number, userId?: number) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      // Participantes con su orden de turno y puntuación persistida.
      players: {
        select: { userId: true, turnOrder: true, score: true },
        orderBy: { turnOrder: "asc" },
      },
      // Las 5 preguntas en orden de juego (posición de 0..4), con sus opciones
      // y las respuestas ya dadas (con ellas calculamos el progreso).
      questions: {
        orderBy: { position: "asc" },
        include: {
          choices: { orderBy: { position: "asc" } },
          answers: { select: { userId: true, isCorrect: true } },
        },
      },
    },
  });

  if (!game) return null;

  const esMultijugador = game.mode === "MULTIPLAYER";
  const respuestasPorPregunta = esMultijugador ? 2 : 1;

  // Puntuación revelada: en multijugador no se cuenta una respuesta hasta que
  // la ronda tiene las dos. Así una puntuación intermedia no delata al primero.
  const scoreRevelado = new Map<number, number>(
    game.players.map((player) => [player.userId, 0]),
  );

  const questions = game.questions.map((question) => {
    const answeredCount = question.answers.length;
    const revealed =
      game.status === "FINISHED" || answeredCount >= respuestasPorPregunta;

    if (revealed) {
      for (const answer of question.answers) {
        if (answer.isCorrect) {
          scoreRevelado.set(
            answer.userId,
            (scoreRevelado.get(answer.userId) ?? 0) + 1,
          );
        }
      }
    }

    return {
      ...question,
      answered:
        esMultijugador && userId !== undefined
          ? question.answers.some((answer) => answer.userId === userId)
          : answeredCount > 0,
      // Campos específicos de multijugador para que el cliente pinte el turno
      // sin calcular reglas: cuántos han respondido y si ya toca revelar.
      ...(esMultijugador
        ? {
            answeredCount,
            revealed,
            results: revealed
              ? game.players.map((player) => ({
                  userId: player.userId,
                  isCorrect:
                    question.answers.find(
                      (answer) => answer.userId === player.userId,
                    )?.isCorrect ?? false,
                }))
              : null,
          }
        : {}),
    };
  });

  const players = game.players.map((player) => ({
    userId: player.userId,
    turnOrder: player.turnOrder,
    // En individual la puntuación guardada es la verdad; en multijugador se
    // publica la revelada hasta que la partida termina.
    score: esMultijugador
      ? (scoreRevelado.get(player.userId) ?? 0)
      : player.score,
  }));

  const siguiente = game.questions.find(
    (q) => q.position === game.currentPosition,
  );
  const nextQuestionId =
    game.status === "FINISHED" ? null : (siguiente?.id ?? null);

  const jugadorDelTurno =
    esMultijugador && game.status === "ACTIVE"
      ? game.players.find(
          (player) => player.turnOrder === game.currentTurnOrder,
        )
      : null;

  const currentTurn =
    jugadorDelTurno && siguiente
      ? {
          userId: jugadorDelTurno.userId,
          turnOrder: jugadorDelTurno.turnOrder,
          gameQuestionId: siguiente.id,
        }
      : null;

  // En individual se conserva el score del único jugador. En multijugador el
  // score superior es el del usuario autenticado, siempre que ya sea revelable.
  const scoreIndividual = esMultijugador
    ? (userId !== undefined ? (scoreRevelado.get(userId) ?? 0) : 0)
    : (game.players.find((player) => player.userId === userId)?.score ??
      game.players[0]?.score ??
      game.questions.reduce(
        (total, question) =>
          total + question.answers.filter((answer) => answer.isCorrect).length,
        0,
      ));

  const ganador =
    esMultijugador && game.status === "FINISHED"
      ? (game.winnerUserId ?? calcularGanador(players))
      : null;

  return {
    ...game,
    questions,
    players,
    score: scoreIndividual,
    nextQuestionId,
    currentTurn,
    winnerUserId: ganador,
    isDraw:
      esMultijugador && game.status === "FINISHED" && ganador === null,
  };
}

/* Ganador de una partida ya cerrada; null cuando hay empate. */
function calcularGanador(
  players: { userId: number; score: number }[],
): number | null {
  if (players.length !== 2) return null;
  const [primero, segundo] = players;
  if (primero.score === segundo.score) return null;
  return primero.score > segundo.score ? primero.userId : segundo.userId;
}

export async function getMyGames(userId: number, page: number, pageSize: number) {
  const where = { players: { some: { userId } } };

  const [partidas, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], // orden estable (desempate por id)
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        createdAt: true,
        finishedAt: true,
        questions: {
          select: { answers: { select: { isCorrect: true } } },
        },
      },
    }),
    prisma.game.count({ where }),
  ]);

  const items = partidas.map((partida) => ({
    id: partida.id,
    status: partida.status,
    createdAt: partida.createdAt,
    finishedAt: partida.finishedAt,
    score: partida.questions.reduce(
      (total, pregunta) =>
        total + pregunta.answers.filter((respuesta) => respuesta.isCorrect).length,
      0,
    ),
  }));

  return { items, total, page, pageSize };
}
