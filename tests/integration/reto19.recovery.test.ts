/* Pruebas de integración del reto 19 contra PostgreSQL real (trivia_test).
Comprueban recuperación tras reconeción, versiones y jugadas perdidas.  */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { io as createClient, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { initSockets } from "../../src/sockets/index.js";
import { prisma } from "../../src/lib/prisma.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../src/sockets/socket.types.js";
import { asegurarBaseDePruebas } from "./helpers/db-guard.js";
// Nunca permitimos que estas pruebas borren otra BBDD
asegurarBaseDePruebas(process.env.DATABASE_URL);

// Guardamos ids para borrar solamente los datos creados por este archivo.
const userIds: number[] = [];
const gameIds: number[] = [];
const clients: AppClientSocket[] = [];

type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: ReturnType<typeof createServer>;
let socketServer: ReturnType<typeof initSockets>;
let port: number;

beforeAll(async () => {
  // Socket.IO necesita un origen permitido durante las pruebas.
  process.env.FRONTEND_ORIGIN = "http://localhost";

  // Creamos un servidor temporal; el puerto 0 pide uno libre al sistema.
  await iniciarServidor();
});
afterEach(async () => {
  // Así también se cancelan los temporizadores de caducidad del servidor.
  for (const client of clients) client.disconnect();
  clients.length = 0;

  // Confirmamos la protección antes de borrar datos.
  asegurarBaseDePruebas(process.env.DATABASE_URL);

  if (gameIds.length > 0) {
    await prisma.game.deleteMany({
      where: { id: { in: gameIds } },
    });
    gameIds.length = 0;
  }
});
afterAll(async () => {
  asegurarBaseDePruebas(process.env.DATABASE_URL);

  // Cerramos primero Socket.IO y después el servidor HTTP temporal.
  await detenerServidor();

  // Finalmente borramos solo los usuarios creados para este archivo.
  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  await prisma.$disconnect();
});

async function iniciarServidor() {
  httpServer = createServer(app);
  socketServer = initSockets(httpServer);
  await new Promise<void>((resolve) =>
    httpServer.listen(0, () => {
      port = (httpServer.address() as AddressInfo).port;
      resolve();
    }),
  );
}

async function detenerServidor() {
  await new Promise<void>((resolve) => socketServer.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
}

function crearToken(userId: number, expiresIn: string | number = "1h"): string {
  return jwt.sign({}, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

function esperarEvento<T>(socket: AppClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

async function entrarEnSala(socket: AppClientSocket, gameId: number) {
  // El listener se registra antes de emitir, porque el servidor local responde
  // muy rápido y no queremos perder el evento.
  const joined = esperarEvento<{ gameId: number }>(socket, "joined:game");
  socket.emit("join:game", gameId);
  return joined;
}

async function recuperarPartida(gameId: number, token: string) {
  const response = await fetch(`http://localhost:${port}/api/games/${gameId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(200);
  return response.json() as Promise<{
    id: number;
    turnVersion: number;
    score: number;
    nextQuestionId: number | null;
    questions: { id: number; answered: boolean }[];
  }>;
}

async function crearUsuario(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await prisma.user.create({
    data: { email: `${prefix}-${suffix}@example.test`, passwordHash: "no-se-usa" },
  });
  userIds.push(user.id);
  return user;
}

async function crearPartidaIndividual(userId: number) {
  const game = await prisma.game.create({
    data: {
      status: "ACTIVE",
      players: { create: { userId, turnOrder: 1, score: 0 } },
      questions: {
        create: Array.from({ length: 5 }, (_, position) => ({
          position,
          statement: `Pregunta ${position + 1}`,
          solution: 0,
          choices: {
            create: [
              { text: "Correcta", position: 0 },
              { text: "Incorrecta", position: 1 },
            ],
          },
        })),
      },
    },
    include: { questions: { include: { choices: true } } },
  });
  gameIds.push(game.id);
  return game;
}

describe("Reto 19: recuperación de estado", () => {
  it("vuelve a entrar y recupera el progreso persistido tras una reconexión", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const user = await prisma.user.create({
      data: {
        email: `recovery-${suffix}@example.test`,
        passwordHash: "no-se-usa-en-esta-prueba",
      },
    });
    userIds.push(user.id);

    // Creamos una partida con dos preguntas: la primera ya fue contestada y
    // la segunda es la que debe recuperar el cliente al volver a conectarse.
    const game = await prisma.game.create({
      data: {
        status: "ACTIVE",
        currentPosition: 0,
        currentTurnOrder: 1,
        turnVersion: 3,
        players: {
          create: { userId: user.id, turnOrder: 1, score: 0 },
        },
        questions: {
          create: [
            {
              position: 0,
              statement: "Pregunta ya respondida",
              solution: 0,
              choices: {
                create: [
                  { text: "Correcta", position: 0 },
                  { text: "Incorrecta", position: 1 },
                ],
              },
            },
            {
              position: 1,
              statement: "Pregunta pendiente",
              solution: 1,
              choices: {
                create: [
                  { text: "Incorrecta", position: 0 },
                  { text: "Correcta", position: 1 },
                ],
              },
            },
          ],
        },
      },
      include: { questions: { include: { choices: true } } },
    });
    gameIds.push(game.id);

    const firstQuestion = game.questions.find((question) => question.position === 0)!;
    const secondQuestion = game.questions.find((question) => question.position === 1)!;
    const correctChoice = firstQuestion.choices.find(
      (choice) => choice.position === 0,
    )!;

    // Simulamos una jugada que ya quedó confirmada en la transacción del juego.
    await prisma.$transaction([
      prisma.answer.create({
        data: {
          gameQuestionId: firstQuestion.id,
          choiceId: correctChoice.id,
          userId: user.id,
          isCorrect: true,
        },
      }),
      prisma.gamePlayer.update({
        where: { gameId_userId: { gameId: game.id, userId: user.id } },
        data: { score: 1 },
      }),
      prisma.game.update({
        where: { id: game.id },
        data: { currentPosition: 1, turnVersion: 4 },
      }),
    ]);

    const token = crearToken(user.id);
    const socket = createClient(`http://localhost:${port}`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token },
    }) as AppClientSocket;
    clients.push(socket);

    let connected = esperarEvento<void>(socket, "connect");
    socket.connect();
    await connected;

    const firstJoin = await entrarEnSala(socket, game.id);
    expect(firstJoin).toEqual({ gameId: game.id });
    const beforeDisconnect = await recuperarPartida(game.id, token);

    expect(beforeDisconnect).toMatchObject({
      id: game.id,
      turnVersion: 4,
      score: 1,
      nextQuestionId: secondQuestion.id,
    });
    expect(beforeDisconnect.questions).toMatchObject([
      { id: firstQuestion.id, answered: true },
      { id: secondQuestion.id, answered: false },
    ]);

    // El servidor recibe un socket nuevo: la sala del anterior no se conserva.
    socket.disconnect();
    connected = esperarEvento<void>(socket, "connect");
    socket.connect();
    await connected;

    const secondJoin = await entrarEnSala(socket, game.id);
    expect(secondJoin).toEqual({ gameId: game.id });

    // La recuperación HTTP refleja la jugada y la versión que sobrevivieron
    // a la desconexión, sin depender de socket.data del socket anterior.
    const recovered = await recuperarPartida(game.id, token);
    expect(recovered).toEqual(beforeDisconnect);
  });

  it("tras un reinicio vuelve a autorizarse y lee el estado persistido", async () => {
    const user = await crearUsuario("restart");
    const game = await crearPartidaIndividual(user.id);
    const token = crearToken(user.id);

    // Simula el proceso de backend apagándose: la partida no está en memoria.
    await detenerServidor();
    await iniciarServidor();

    const socket = createClient(`http://localhost:${port}`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token },
    }) as AppClientSocket;
    clients.push(socket);
    const connected = esperarEvento<void>(socket, "connect");
    socket.connect();
    await connected;

    await expect(entrarEnSala(socket, game.id)).resolves.toEqual({ gameId: game.id });
    const recovered = await recuperarPartida(game.id, token);
    expect(recovered).toMatchObject({
      id: game.id,
      turnVersion: 0,
      score: 0,
      nextQuestionId: game.questions[0].id,
    });
  });

  it("consulta el estado tras perder la respuesta y no duplica la jugada", async () => {
    const user = await crearUsuario("lost-response");
    const game = await crearPartidaIndividual(user.id);
    const question = game.questions[0];
    const choice = question.choices.find((item) => item.position === 0)!;
    const token = crearToken(user.id);
    const socket = createClient(`http://localhost:${port}`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token },
    }) as AppClientSocket;
    clients.push(socket);
    const connected = esperarEvento<void>(socket, "connect");
    socket.connect();
    await connected;
    await entrarEnSala(socket, game.id);

    // En producción el cliente podría perder este body; el commit y el aviso
    // sí se producen. Comprobamos el flujo de recuperación posterior.
    const updated = esperarEvento<{ turnVersion: number }>(socket, "game:updated");
    const accepted = await fetch(`http://localhost:${port}/api/games/${game.id}/answers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ gameQuestionId: question.id, choiceId: choice.id }),
    });
    expect(accepted.status).toBe(200);
    expect((await updated).turnVersion).toBe(1);

    const recovered = await recuperarPartida(game.id, token);
    expect(recovered).toMatchObject({ turnVersion: 1, score: 1, nextQuestionId: game.questions[1].id });
    expect(recovered.questions[0]).toMatchObject({ id: question.id, answered: true });

    // La consulta evita reintentar. Incluso ante un reintento accidental, la
    // protección persistida no crea una segunda respuesta ni otro avance.
    const retry = await fetch(`http://localhost:${port}/api/games/${game.id}/answers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ gameQuestionId: question.id, choiceId: choice.id }),
    });
    expect(retry.status).toBe(409);
    expect((await retry.json()).error.code).toBe("ALREADY_ANSWERED");
    const persisted = await prisma.game.findUniqueOrThrow({
      where: { id: game.id },
      include: { questions: { include: { answers: true } }, players: true },
    });
    expect(persisted.turnVersion).toBe(1);
    expect(persisted.questions[0].answers).toHaveLength(1);
    expect(persisted.players[0].score).toBe(1);

    // Una respuesta antigua (por ejemplo, provocada por un aviso retrasado)
    // no sustituye el snapshot más reciente: el cliente compara la versión.
    const stale = { ...recovered, turnVersion: 0, score: 0 };
    const applyIfCurrent = <T extends { turnVersion: number }>(
      current: T,
      candidate: T,
    ) => (candidate.turnVersion >= current.turnVersion ? candidate : current);
    expect(applyIfCurrent(recovered, stale)).toBe(recovered);
  });

  it("no permite recuperar una partida con token caducado ni usuario ajeno", async () => {
    const owner = await crearUsuario("owner");
    const outsider = await crearUsuario("outsider");
    const game = await crearPartidaIndividual(owner.id);

    const expired = crearToken(owner.id, -1);
    const expiredSocket = createClient(`http://localhost:${port}`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token: expired },
    }) as AppClientSocket;
    clients.push(expiredSocket);
    const deniedConnection = esperarEvento<Error>(expiredSocket, "connect_error");
    expiredSocket.connect();
    expect((await deniedConnection).message).toContain("inválido");

    const outsiderToken = crearToken(outsider.id);
    const outsiderSocket = createClient(`http://localhost:${port}`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token: outsiderToken },
    }) as AppClientSocket;
    clients.push(outsiderSocket);
    const connected = esperarEvento<void>(outsiderSocket, "connect");
    outsiderSocket.connect();
    await connected;
    const deniedRoom = esperarEvento<{ message: string }>(outsiderSocket, "error:game");
    outsiderSocket.emit("join:game", game.id);
    expect((await deniedRoom).message).toBe("No participas en esta partida");

    const response = await fetch(`http://localhost:${port}/api/games/${game.id}`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    expect(response.status).toBe(403);
  });
});
