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

/* Historial de partidas de un usuario, de la más reciente a la más antigua.
   El usuario viene de la sesión validada, nunca de un userId del cliente. */
export async function getMyGames(userId: number) {
  const partidas = await prisma.game.findMany({
    where: {
      // Solo las partidas en las que participa ESTE usuario.
      players: { some: { userId } },
    },
    // De la más reciente a la más antigua.
    orderBy: { createdAt: "desc" },
    // Campos explícitos: nada de credenciales ni soluciones.
    select: {
      id: true,
      status: true,
      createdAt: true,
      finishedAt: true,
      questions: {
        select: {
          answers: { select: { isCorrect: true } },
        },
      },
    },
  });

  // Score calculado en el servidor: 1 punto por respuesta correcta.
  return partidas.map((partida) => ({
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
}
