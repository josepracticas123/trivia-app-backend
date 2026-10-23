/* Mutaciones de partidas: crean o modifican datos.
   Separadas de las consultas para que cada fichero tenga un propósito claro. */
import { prisma } from "../lib/prisma.js";

// Para reconocer los errores conocidos de Prisma (el P2002 de duplicados)
import { Prisma } from "@prisma/client";
import {
  PREGUNTAS_POR_PARTIDA,
  type SubmitAnswerResult,
} from "./game.types.js";
import { getRandomQuestions } from "./game.queries.js";

/*Genera un código de invitación de 6 caracteres ( letras * números)
 Se repite hasta encontrar uno que no exista en la base.*/
export async function generarCodigoUnico(): Promise<string> {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos (0/O, 1/I)
  let codigo = "";
  let existe = true;

  while (existe) {
    codigo = "";
    for (let i = 0; i < 6; i++) {
      codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
    }
    // Comprobamos si ya existe en la base.
    const partida = await prisma.game.findUnique({ where: { code: codigo } });
    existe = partida !== null;
  }
  return codigo;
}

/* Crea una partida multijugador en estado WAITING.
   El creador queda vinculado como participante con isCreator = true.
   Devuelve la partida con el código generado. */
export async function createMultiplayerGame(userId: number) {
  const codigo = await generarCodigoUnico();

  const game = await prisma.game.create({
    data: {
      mode: "MULTIPLAYER",
      code: codigo,
      status: "WAITING",
      players: {
        create: { userId, isCreator: true },
      },
    },
  });

  return game;
}
/* Un usuario se une a una sala multijugador con un código.
devuelve ok, true, game----------- o --------- ok, false, error*/
export async function joinGame(userId: number, code: string) {
  // 1- Buscamos la partida por código.
  const game = await prisma.game.findUnique({
    where: { code },
    include: { players: true },
  });
  //codigo desconocido
  if (!game) return { ok: false, error: "CODIGO_INVALIDO" };
  //Solo s epuede unir si esta en WAITING
  if (game.status !== "WAITING")
    return { ok: false, error: "PARTIDA_YA_INICIADA" };

  // Ya está dentro (no duplicar).
  if (game.players.some((p) => p.userId === userId)) {
    return { ok: true, game };
  }
  //Sala llena (máximo 2).
  if (game.players.length >= 2) return { ok: false, error: "SALA_LLENA" };

  // 2. Añadimos al participante de forma atómica: contamos y creamos en la misma transacción
  //    para evitar que dos peticiones simultáneas pasen del límite de 2.
  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.gamePlayer.count({ where: { gameId: game.id } });
      if (count >= 2) throw new Error("SALA_LLENA");
      await tx.gamePlayer.create({
        data: { gameId: game.id, userId, isCreator: false },
      });
    }, { isolationLevel: "Serializable" });
  } catch {
    return { ok: false, error: "SALA_LLENA" };
  }

  return { ok: true, game };
} /* El creador inicia la partida cuando hay 2 jugadores.
   Asigna 5 preguntas compartidas, establece primer turno y pasa a ACTIVE. */
export async function startGame(gameId: number, userId: number) {
  // 1. Cargamos la partida con participantes.
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: true },
  });

  if (!game) return { ok: false, error: "PARTIDA_NO_EXISTE" };
  if (game.mode !== "MULTIPLAYER")
    return { ok: false, error: "NO_ES_MULTIJUGADOR" };
  if (game.status !== "WAITING")
    return { ok: false, error: "PARTIDA_YA_INICIADA" };

  // Solo el creador puede iniciar.
  const creador = game.players.find((p) => p.isCreator);
  if (!creador || creador.userId !== userId) {
    return { ok: false, error: "NO_ES_CREADOR" };
  }

  // Deben ser exactamente 2 jugadores.
  if (game.players.length !== 2)
    return { ok: false, error: "FALTAN_JUGADORES" };

  // 2. Elegimos 5 preguntas aleatorias compartidas.
  const preguntas = await getRandomQuestions();
  if (preguntas.length < 5) return { ok: false, error: "NO_HAY_PREGUNTAS" };

  // 3. Creamos las preguntas congeladas y activamos la partida en una transacción.
  await prisma.$transaction(async (tx) => {
    for (const [indice, pregunta] of preguntas.entries()) {
      await tx.gameQuestion.create({
        data: {
          gameId: game.id,
          position: indice,
          statement: pregunta.statement,
          solution: pregunta.choices.findIndex((c) => c.isCorrect),
          questionId: pregunta.id,
          choices: {
            create: pregunta.choices.map((c) => ({
              text: c.text,
              position: c.position,
            })),
          },
        },
      });
    }

    // Primer turno: el creador empieza (o el primer jugador). Aquí asignamos el turno
    // implícitamente por position 0; el GET/answer usará el primer sin responder.
    await tx.game.update({
      where: { id: gameId },
      data: { status: "ACTIVE" },
    });
  });

  return { ok: true, game: { ...game, status: "ACTIVE" } };
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
