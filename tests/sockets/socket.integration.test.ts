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
import express from "express";
import request from "supertest";
import { gameRouter } from "../../src/routes/games.routes.js";
import { startGame } from "../../src/services/game.services.js";

type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
vi.mock("../../src/services/game.services.js", () => ({
  startGame: vi.fn(),
}));

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
    gamePlayer: { findFirst: vi.fn() },
  },
}));
let httpServer: ReturnType<typeof createServer>;
let port: number;
let ioServer: ReturnType<typeof initSockets>;
const app = express();
app.use(express.json());
app.use("/api/games", gameRouter);

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
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

afterEach(() => {
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
    const socket = Client(`http://localhost:${port}`) as AppClientSocket;
    await new Promise<void>((resolve) => {
      socket.on("connect_error", (err) => {
        expect(err.message).toContain("requerido");
        socket.disconnect();
        resolve();
      });
    });
  });

  it("acepta conexión con token válido", async () => {
    const socket = Client(`http://localhost:${port}`, {
      auth: { token: tokenDe(1) },
    }) as AppClientSocket;
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

    const socket = Client(`http://localhost:${port}`, {
      auth: { token: tokenDe(2) },
    }) as AppClientSocket;
    await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
    socket.emit("join:game", 1);

    await new Promise<void>((resolve) => {
      socket.on("error:game", (payload) => {
        expect(payload.message).toBe("No participas en esta partida");
        socket.disconnect();
        resolve();
      });
    });
  });

  it("dos participantes reciben game:updated", async () => {
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue({
      gameId: 1,
      userId: 1,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as never);

    const s1 = Client(`http://localhost:${port}`, {
      auth: { token: tokenDe(1) },
    }) as AppClientSocket;
    const s2 = Client(`http://localhost:${port}`, {
      auth: { token: tokenDe(1) },
    }) as AppClientSocket;

    await Promise.all([
      new Promise<void>((resolve) => s1.on("connect", () => resolve())),
      new Promise<void>((resolve) => s2.on("connect", () => resolve())),
    ]);

    s1.emit("join:game", 1);
    s2.emit("join:game", 1);
    await Promise.all([
      new Promise<void>((resolve) => s1.on("joined:game", () => resolve())),
      new Promise<void>((resolve) => s2.on("joined:game", () => resolve())),
    ]);

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

  it("expira la conexión al vencer el token", async () => {
    const socket = Client(`http://localhost:${port}`, {
      auth: { token: tokenDe(1, "1s") },
    }) as AppClientSocket;
    await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    expect(socket.disconnected).toBe(true);
    socket.disconnect();
  });
  it("dos usuarios participantes reciben game:updated al iniciar", async () => {
    // 1. Mock: startGame devuelve éxito con estado confirmado
    vi.mocked(startGame).mockResolvedValue({
      ok: true,
      game: { id: 1, status: "ACTIVE", turnVersion: 1 },
    } as never);

    // 2. Mock prisma: auth acepta ambos usuarios
    vi.mocked(prisma.user.findUnique).mockImplementation((async (args: {
      where: { id: number };
    }) => ({
      id: args.where.id,
    })) as never);
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue({
      gameId: 1,
      userId: 1,
    } as never);

    // 3. Tokens distintos
    const tokenA = tokenDe(1);
    const tokenB = tokenDe(2);

    // 4. Conectar dos sockets
    const sA = Client(`http://localhost:${port}`, {
      auth: { token: tokenA },
    }) as AppClientSocket;
    const sB = Client(`http://localhost:${port}`, {
      auth: { token: tokenB },
    }) as AppClientSocket;

    await Promise.all([
      new Promise<void>((r) => sA.on("connect", () => r())),
      new Promise<void>((r) => sB.on("connect", () => r())),
    ]);

    // 5. Unirse a la sala
    sA.emit("join:game", 1);
    sB.emit("join:game", 1);
    await Promise.all([
      new Promise<void>((r) => sA.on("joined:game", () => r())),
      new Promise<void>((r) => sB.on("joined:game", () => r())),
    ]);

    // 6. Preparar recepción de game:updated en ambos
    const recibidoA = new Promise<void>((resolve) =>
      sA.on("game:updated", (p) => {
        expect(p.id).toBe(1);
        expect(p.status).toBe("ACTIVE");
        expect(p.turnVersion).toBe(1);
        resolve();
      }),
    );
    const recibidoB = new Promise<void>((resolve) =>
      sB.on("game:updated", (p) => {
        expect(p.id).toBe(1);
        expect(p.status).toBe("ACTIVE");
        expect(p.turnVersion).toBe(1);
        resolve();
      }),
    );

    // 7. Ejecutar operación HTTP (como creador, userId 1)
    const res = await request(app)
      .post("/api/games/1/start")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ACTIVE");

    // 8. Verificar que ambos recibieron el aviso
    await Promise.all([recibidoA, recibidoB]);

    sA.disconnect();
    sB.disconnect();
  });
  it("operación HTTP fallida no emite game:updated", async () => {
    vi.mocked(startGame).mockResolvedValue({
      ok: false,
      error: "NOT_ADMIN",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as never);
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue({
      gameId: 1,
      userId: 1,
    } as never);

    const socket = Client(`http://localhost:${port}`, {
      auth: { token: tokenDe(1) },
    }) as AppClientSocket;
    await new Promise<void>((r) => socket.on("connect", () => r()));
    socket.emit("join:game", 1);
    await new Promise<void>((r) => socket.on("joined:game", () => r()));

    let recibido = false;
    socket.on("game:updated", () => {
      recibido = true;
    });

    const res = await request(app)
      .post("/api/games/1/start")
      .set("Authorization", `Bearer ${tokenDe(2)}`); // no creador

    expect(res.status).not.toBe(200);

    // Esperar un poco para asegurar que no llega el evento
    await new Promise<void>((r) => setTimeout(r, 200));
    expect(recibido).toBe(false);

    socket.disconnect();
  });
});
