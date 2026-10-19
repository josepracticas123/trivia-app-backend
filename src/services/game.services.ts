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
