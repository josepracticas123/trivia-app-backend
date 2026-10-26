/* Mutaciones de partidas: crean o modifican datos.
   Separadas de las consultas para que cada fichero tenga un propósito claro. */
import { prisma } from "../lib/prisma.js";
import { ERRORES } from "../errors/errorCatalog.js";

// Para reconocer los errores conocidos de Prisma (el P2002 de duplicados)
import { Prisma } from "@prisma/client";
import {
  PREGUNTAS_POR_PARTIDA,
  RESPUESTAS_POR_PREGUNTA_MULTIJUGADOR,
  type PuntuacionJugador,
  type ResultadoRonda,
  type SiguienteTurno,
  type SubmitAnswerResult,
} from "./game.types.js";
import { getRandomQuestions } from "./game.queries.js";

/*Genera un código de invitación de 6 caracteres ( letras * números)
 Se repite hasta encontrar uno que no exista en la base.*/
// Genera un código de invitación de 6 caracteres único (no existente en la BD).
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
// Crea una partida multijugador en estado WAITING con código de invitación.
// Vincula al creador como participante con isCreator = true.
export async function createMultiplayerGame(userId: number) {
  const codigo = await generarCodigoUnico();

  const game = await prisma.game.create({
    data: {
      mode: "MULTIPLAYER",
      code: codigo,
      status: "WAITING",
      players: {
        // El creador es siempre el jugador 1.
        create: { userId, isCreator: true, turnOrder: 1 },
      },
    },
  });

  return game;
}
const MAX_REINTENTOS = 3;
type JoinGameError =
  | "GAME_NOT_FOUND"
  | "PARTIDA_YA_INICIADA"
  | "SALA_LLENA"
  | "CONFLICTO_CONCURRENCIA";

export async function joinGame(
  userId: number,
  code: string,
): Promise<
  | { ok: true; game: { id: number; status: string; turnVersion: number } }
  | { ok: false; error: JoinGameError }
> {
  for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
    // Re-evaluamos el estado en cada intento.
    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!game) return { ok: false, error: "GAME_NOT_FOUND" };
    if (game.status !== "WAITING")
      return { ok: false, error: "PARTIDA_YA_INICIADA" };
    if (game.players.some((p) => p.userId === userId))
      return { ok: true, game };
    if (game.players.length >= 2) return { ok: false, error: "SALA_LLENA" };

    try {
      await prisma.$transaction(
        async (tx) => {
          const count = await tx.gamePlayer.count({
            where: { gameId: game.id },
          });
          if (count >= 2) throw new Error("SALA_LLENA");
          await tx.gamePlayer.create({
            data: {
              gameId: game.id,
              userId,
              isCreator: false,
              // El primer jugador que entra ocupa el turno 2.
              turnOrder: count + 1,
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
      return { ok: true, game };
    } catch (error) {
      /* P2002 puede significar dos cosas:
         - este mismo usuario ya estaba dentro (idempotente);
         - otro usuario se ha quedado con la plaza o con el turnOrder. En ese
           caso hay que releer y, si la sala ya está llena, devolver SALA_LLENA. */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const yaDentro = await prisma.gamePlayer.findUnique({
          where: { gameId_userId: { gameId: game.id, userId } },
        });
        if (yaDentro) return { ok: true, game };

        if (intento === MAX_REINTENTOS - 1) {
          return { ok: false, error: "SALA_LLENA" };
        }
        continue;
      }
      // Sala llena (nuestro throw manual).
      if (error instanceof Error && error.message === "SALA_LLENA") {
        return { ok: false, error: "SALA_LLENA" };
      }
      // Conflicto de concurrencia Serializable → reintentar.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        if (intento === MAX_REINTENTOS - 1) {
          return { ok: false, error: "CONFLICTO_CONCURRENCIA" };
        }
        continue;
      }
      // Cualquier otro fallo → se propaga.
      throw error;
    }
  }
  return { ok: false, error: "CONFLICTO_CONCURRENCIA" };
}
type StartGameError =
  | "GAME_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "PARTIDA_YA_INICIADA"
  | "NOT_ADMIN"
  | "NOT_ENOUGH_QUESTIONS"
  | "CONFLICTO_CONCURRENCIA";

export async function startGame(
  gameId: number,
  userId: number,
): Promise<
  | { ok: true; game: { id: number; status: string; turnVersion: number } }
  | { ok: false; error: StartGameError }
> {
  for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game) return { ok: false, error: "GAME_NOT_FOUND" };
    if (game.mode !== "MULTIPLAYER")
      return { ok: false, error: "VALIDATION_ERROR" };
    if (game.status !== "WAITING")
      return { ok: false, error: "PARTIDA_YA_INICIADA" };

    const creador = game.players.find((p) => p.isCreator);
    if (!creador || creador.userId !== userId)
      return { ok: false, error: "NOT_ADMIN" };
    if (game.players.length !== 2)
      return { ok: false, error: "VALIDATION_ERROR" };

    const preguntas = await getRandomQuestions();
    if (preguntas.length < 5)
      return { ok: false, error: "NOT_ENOUGH_QUESTIONS" };

    try {
      await prisma.$transaction(
        async (tx) => {
          const actualizado = await tx.game.updateMany({
            where: { id: gameId, status: "WAITING" },
            data: {
              status: "ACTIVE",
              // Empieza la primera pregunta y el turno del jugador 1.
              currentPosition: 0,
              currentTurnOrder: 1,
              turnVersion: { increment: 1 },
            },
          });
          if (actualizado.count !== 1) throw new Error("PARTIDA_YA_INICIADA");

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
        },
        { isolationLevel: "Serializable" },
      );
      return { ok: true, game: { id: game.id, status: game.status, turnVersion: game.turnVersion } };

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { ok: false, error: "PARTIDA_YA_INICIADA" };
      }
      if (error instanceof Error && error.message === "PARTIDA_YA_INICIADA") {
        return { ok: false, error: "PARTIDA_YA_INICIADA" };
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        if (intento === MAX_REINTENTOS - 1) {
          return { ok: false, error: "CONFLICTO_CONCURRENCIA" };
        }
        continue;
      }
      throw error;
    }
  }
  return { ok: false, error: "CONFLICTO_CONCURRENCIA" };
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
          // 2. El participante: el usuario autenticado. En individual
          //    también ocupa el turno 1, pero responde una sola vez.
          create: { userId, isCreator: true, turnOrder: 1 },
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

/* Carga la partida con todo lo necesario para validar una respuesta:
   participantes con su turno, preguntas en orden, opciones y respuestas. */
async function cargarPartidaParaResponder(gameId: number) {
  return prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        select: { userId: true, turnOrder: true, score: true },
        orderBy: { turnOrder: "asc" },
      },
      questions: {
        orderBy: { position: "asc" },
        include: {
          choices: { orderBy: { position: "asc" } },
          answers: { select: { userId: true, isCorrect: true } },
        },
      },
    },
  });
}

/* Calcula el ganador con las puntuaciones ya actualizadas.
   Devuelve null cuando hay empate entre los dos jugadores. */
function calcularGanador(players: PuntuacionJugador[]): number | null {
  if (players.length !== 2) return null;
  const [primero, segundo] = players;
  if (primero.score === segundo.score) return null;
  return primero.score > segundo.score ? primero.userId : segundo.userId;
}

/* Registra una respuesta individual o multijugador.

   Concurrencia: cada intento lee el estado y después intenta actualizar la
   partida con un WHERE que incluye turnVersion, currentPosition y
   currentTurnOrder. Si otra petición se adelantó, updateMany devuelve 0 y se
   reintenta con el estado nuevo. La restricción única
   [gameQuestionId, userId] es la última defensa contra duplicados. */
export async function submitAnswer(
  gameId: number,
  userId: number,
  gameQuestionId: number,
  choiceId: number,
): Promise<SubmitAnswerResult> {
  for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
    // BLOQUE 1: leer el estado actual.
    const game = await cargarPartidaParaResponder(gameId);

    if (!game) return { ok: false, error: "GAME_NOT_FOUND" }; // → 404
    if (!game.players.some((player) => player.userId === userId))
      return { ok: false, error: "NOT_PARTICIPANT" }; // → 403
    if (game.status === "WAITING") return { ok: false, error: "GAME_NOT_ACTIVE" }; // → 409

    // BLOQUE 2: la pregunta debe ser de ESTA partida.
    const question = game.questions.find((q) => q.id === gameQuestionId);
    if (!question) return { ok: false, error: "QUESTION_NOT_IN_GAME" }; // → 404

    /* Reintentar una respuesta ya aceptada es un duplicado, incluso si con
       ella terminó la partida. Se comprueba ANTES que el estado FINISHED. */
    if (question.answers.some((answer) => answer.userId === userId))
      return { ok: false, error: "ALREADY_ANSWERED" }; // → 409

    if (game.status === "FINISHED") return { ok: false, error: "GAME_FINISHED" }; // → 409

    /* BLOQUE 3: debe ser la pregunta en juego. En multijugador, además,
       debe ser el turno del usuario: primero turnOrder 1 y después 2. */
    const preguntaEnJuego = game.questions.find(
      (q) => q.position === game.currentPosition,
    );
    if (!preguntaEnJuego || preguntaEnJuego.id !== gameQuestionId)
      return { ok: false, error: "WRONG_TURN" }; // → 409

    if (game.mode === "MULTIPLAYER") {
      const jugadorDelTurno = game.players.find(
        (player) => player.turnOrder === game.currentTurnOrder,
      );
      if (!jugadorDelTurno || jugadorDelTurno.userId !== userId)
        return { ok: false, error: "WRONG_TURN" }; // → 409
    }

    // BLOQUE 4: la opción debe existir y pertenecer a ESA pregunta.
    const choice = question.choices.find((c) => c.id === choiceId);
    if (!choice) return { ok: false, error: "CHOICE_NOT_IN_QUESTION" }; // → 400

    // BLOQUE 5: la solución y el punto se calculan SOLO en el servidor.
    const isCorrect = choice.position === question.solution;
    const esMultijugador = game.mode === "MULTIPLAYER";
    const rondaCompleta =
      esMultijugador && game.currentTurnOrder === RESPUESTAS_POR_PREGUNTA_MULTIJUGADOR;

    /* Siguiente estado. En multijugador la misma pregunta pasa del jugador 1
       al 2; solo cuando responde el 2 se avanza a la siguiente pregunta. */
    let siguientePosicion = game.currentPosition;
    let siguienteTurno = 1;
    if (esMultijugador && !rondaCompleta) {
      siguienteTurno = 2;
    } else {
      siguientePosicion = game.currentPosition + 1;
    }
    const finished = siguientePosicion >= PREGUNTAS_POR_PARTIDA;

    // Puntuaciones con el punto recién calculado. Se guardan en GamePlayer.
    const puntuaciones: PuntuacionJugador[] = game.players.map((player) => ({
      userId: player.userId,
      score: player.score + (player.userId === userId && isCorrect ? 1 : 0),
    }));

    const ganador = finished ? calcularGanador(puntuaciones) : null;
    const isDraw = finished && ganador === null;

    /* Resultados de la ronda: solo se devuelven cuando ya respondieron los
       dos. Mientras falte el jugador 2, no se filtra si el jugador 1 acertó. */
    const results: ResultadoRonda[] | null =
      esMultijugador && rondaCompleta
        ? game.players.map((player) => {
            const respuesta =
              player.userId === userId
                ? { userId, isCorrect }
                : question.answers.find(
                    (answer) => answer.userId === player.userId,
                  );
            return {
              userId: player.userId,
              isCorrect: respuesta?.isCorrect ?? false,
            };
          })
        : null;

    const siguientePregunta = game.questions.find(
      (q) => q.position === siguientePosicion,
    );
    const siguienteJugador = game.players.find(
      (player) => player.turnOrder === siguienteTurno,
    );
    const nextTurn: SiguienteTurno | null =
      !finished && siguientePregunta && siguienteJugador
        ? {
            userId: siguienteJugador.userId,
            gameQuestionId: siguientePregunta.id,
          }
        : null;

    try {
      /* Transacción: respuesta + avance de turno + puntuación + cierre.
         El WHERE actúa como control de versión: si otra petición cambió la
         partida, count será 0 y este intento se descarta y se repite. */
      await prisma.$transaction(
        async (tx) => {
          const actualizado = await tx.game.updateMany({
            where: {
              id: gameId,
              status: "ACTIVE",
              turnVersion: game.turnVersion,
              currentPosition: game.currentPosition,
              currentTurnOrder: game.currentTurnOrder,
            },
            data: {
              turnVersion: { increment: 1 },
              currentPosition: siguientePosicion,
              currentTurnOrder: siguienteTurno,
              ...(finished
                ? {
                    status: "FINISHED",
                    finishedAt: new Date(),
                    winnerUserId: ganador,
                  }
                : {}),
            },
          });

          if (actualizado.count !== 1) throw new Error("VERSION_CONFLICT");

          await tx.answer.create({
            data: { gameQuestionId, choiceId, userId, isCorrect },
          });

          if (isCorrect) {
            await tx.gamePlayer.update({
              where: { gameId_userId: { gameId, userId } },
              data: { score: { increment: 1 } },
            });
          }
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      /* P2002: la restricción única [gameQuestionId, userId] ha rechazado un
         duplicado que se coló entre la lectura y la escritura. */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { ok: false, error: "ALREADY_ANSWERED" };
      }

      // Versión cambiada o conflicto Serializable: releer y reintentar.
      if (
        (error instanceof Error && error.message === "VERSION_CONFLICT") ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034")
      ) {
        if (intento === MAX_REINTENTOS - 1) {
          return { ok: false, error: "CONFLICTO_CONCURRENCIA" };
        }
        continue;
      }

      // Otros errores de BBDD → suben solos al middleware global (Express 5).
      throw error;
    }

    if (!esMultijugador) {
      return {
        ok: true,
        mode: "INDIVIDUAL",
        gameQuestionId,
        isCorrect,
        score:
          puntuaciones.find((puntuacion) => puntuacion.userId === userId)
            ?.score ?? 0,
        finished,
      };
    }

    return {
      ok: true,
      mode: "MULTIPLAYER",
      gameQuestionId,
      roundComplete: rondaCompleta,
      finished,
      nextTurn,
      // Mientras la ronda no está completa estos campos son null.
      results,
      players: rondaCompleta ? puntuaciones : null,
      winnerUserId: ganador,
      isDraw,
    };
  }

  return { ok: false, error: "CONFLICTO_CONCURRENCIA" };
}
