import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { io as Client, Socket } from "socket.io-client";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import jwt from "jsonwebtoken";
import { initSockets } from "../../src/sockets/index.js";
import { prisma } from "../../src/lib/prisma.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../src/sockets/socket.types.js";
import { resolve } from "node:path";

type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
    gamePlayer: { findFirst: vi.fn() },
  },
}));
let httpServer: ReturnType<typeof createServer>;
let port: number;
let ioServer: ReturnType<typeof initSockets>;
// Guardamos todos los clientes para encerrarlos incluso si un test falla.
const clients: AppClientSocket[] = [];
function registerClient(socket: AppClientSocket): AppClientSocket {
  clients.push(socket);
  return socket;
}
beforeAll(async () => {
  process.env.JWT_SECRET = "Secreto-de-prueba-123456789012345678901234";
  process.env.FRONTEND_ORIGIN = "http://localhost";
  httpServer = createServer();
  ioServer = initSockets(httpServer);
  await new Promise<void>((resolve) =>
    httpServer.listen(0, () => {
      port = (httpServer.address() as AddressInfo).port;
      resolve();
    }),
  );
});

afterAll(async () => {
  // Primero cerramos socket.io y sus sconexiones webSocket
  await new Promise<void>((resolve) => ioServer.close(() => resolve()));
  // Después cerramos el servidor HTTP
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

afterEach(() => {
  // Cerramos todos los sockets registrados aunque el test haya fallado
  for (const client of clients) {
    client.disconnect();
  }
  clients.length = 0;

  // Reiniciamos los mocks para que no afecten al siguiente test
  vi.mocked(prisma.gamePlayer.findFirst).mockReset();
  vi.mocked(prisma.user.findUnique).mockReset();
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as never);
});

function tokenDe(userId: number, expiresIn: string | number = "1h") {
  const opts: jwt.SignOptions = {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({}, process.env.JWT_SECRET!, opts);
}

describe("Socket.IO integración", () => {
  it("rechaza conexión sin token", async () => {
    const socket = registerClient(
      Client(`http://localhost:${port}`) as AppClientSocket,
    );
    await new Promise<void>((resolve) => {
      socket.on("connect_error", (err) => {
        expect(err.message).toContain("requerido");
        socket.disconnect();
        resolve();
      });
    });
  });
  it("rechaza conexión con token inválido", async () => {
    // Usamos un texto que no puede verificarse como JWT.
    const socket = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: "token.invalido" },
      }) as AppClientSocket,
    );

    // Esperamos el rechazo real del servidor.
    const error = await new Promise<Error>((resolve) =>
      socket.once("connect_error", resolve),
    );

    expect(error.message).toContain("inválido");
  });

  it("acepta conexión con token válido", async () => {
    const socket = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(1) },
      }) as AppClientSocket,
    );
    await new Promise<void>((resolve) =>
      socket.on("connect", () => {
        socket.disconnect();
        resolve();
      }),
    );
  });

  it("usuario ajeno no se une a la sala", async () => {
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 2 } as never);

    const socket = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(2) },
      }) as AppClientSocket,
    );
    await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
    // Escuchamos el error antes de emitir para no perder una respuesta rápida.
    const gameError = new Promise<{ message: string }>((resolve) =>
      socket.once("error:game", resolve),
    );

    socket.emit("join:game", 1);

    const payload = await gameError;
    expect(payload.message).toBe("No participas en esta partida");
  });

  it("dos participantes reciben game:updated", async () => {
    // Para este test basta con simular que ambos usuarios pertenecen a la partida.
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue({} as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as never);
    // Lo registramos para que afterEach lo cierre si el test falla.
    const s1 = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(1) },
      }) as AppClientSocket,
    );
    // Igual para el segundo jugador.
    const s2 = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(2) },
      }) as AppClientSocket,
    );

    await Promise.all([
      new Promise<void>((resolve) => s1.on("connect", () => resolve())),
      new Promise<void>((resolve) => s2.on("connect", () => resolve())),
    ]);
    //Preparamos los listeners antes de emitir: así no perdemos una respuesta rápida
    const joined1 = new Promise<void>((resolve) =>
      s1.once("joined:game", () => resolve()),
    );
    const joined2 = new Promise<void>((resolve) =>
      s2.once("joined:game", () => resolve()),
    );
    // Ahora ambos clientes solicitan entrar en la sala
    s1.emit("join:game", 1);
    s2.emit("join:game", 1);
    await Promise.all([joined1, joined2]);

    // Las conexiones son concurrentes: comprobamos ambas llamadas sin asumir orden.
    expect(prisma.gamePlayer.findFirst).toHaveBeenCalledWith({
      where: { gameId: 1, userId: 1 },
    });
    expect(prisma.gamePlayer.findFirst).toHaveBeenCalledWith({
      where: { gameId: 1, userId: 2 },
    });

    const recibido1 = new Promise<void>((resolve) =>
      s1.on("game:updated", (p) => {
        expect(p.id).toBe(1);
        expect(p.status).toBe("ACTIVE");
        resolve();
      }),
    );
    const recibido2 = new Promise<void>((resolve) =>
      s2.on("game:updated", (p) => {
        expect(p.id).toBe(1);
        expect(p.status).toBe("ACTIVE");
        resolve();
      }),
    );

    ioServer
      .to("game:1")
      .emit("game:updated", { id: 1, status: "ACTIVE", turnVersion: 1 });

    await Promise.all([recibido1, recibido2]);
    s1.disconnect();
    s2.disconnect();
  });

  it("un socket nuevo debe volver a emitir join:game", async () => {
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue({
      gameId: 7,
      userId: 1,
    } as never);

    // El cliente conserva el id de partida fuera del socket.
    const gameId = 7;
    const firstSocket = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(1) },
      }) as AppClientSocket,
    );

    await new Promise<void>((resolve) => firstSocket.on("connect", resolve));
    // Escuchamos antes de emitir para no perder una respuesta muy rápida.
    const joinedFirst = new Promise<void>((resolve) =>
      firstSocket.once("joined:game", () => resolve()),
    );
    firstSocket.emit("join:game", gameId);
    await joinedFirst;
    firstSocket.disconnect();

    // Esta conexión nueva no conserva datos ni salas del socket anterior.
    const newSocket = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(1) },
      }) as AppClientSocket,
    );
    await new Promise<void>((resolve) => newSocket.on("connect", resolve));

    const joinedAgain = new Promise<void>((resolve) =>
      newSocket.on("joined:game", (payload) => {
        expect(payload.gameId).toBe(gameId);
        resolve();
      }),
    );
    newSocket.emit("join:game", gameId);
    await joinedAgain;

    // La autorización se verifica una vez por cada suscripción.
    expect(prisma.gamePlayer.findFirst).toHaveBeenCalledTimes(2);
    newSocket.disconnect();
  });

  it("expira la conexión al vencer el token", async () => {
    const socket = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(1, "1s") },
      }) as AppClientSocket,
    );
    await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    expect(socket.disconnected).toBe(true);
    socket.disconnect();
  });
});
