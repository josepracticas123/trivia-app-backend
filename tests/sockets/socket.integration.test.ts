import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { io as Client, Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { initSockets } from "../../src/sockets/index.js";
import { prisma } from "../../src/lib/prisma.js";
import type { ClientToServerEvents, ServerToClientEvents } from "../../src/sockets/socket.types.js";

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

beforeAll(async () => {
  process.env.JWT_SECRET = "Secreto-de-prueba-123456789012345678901234";
  process.env.FRONTEND_ORIGIN = "http://localhost";
  httpServer = createServer();
  ioServer = initSockets(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, () => {
    port = (httpServer.address() as AddressInfo).port;
    resolve();
  }));
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
  const opts: jwt.SignOptions = { algorithm: "HS256", subject: String(userId), expiresIn: expiresIn as jwt.SignOptions["expiresIn"] };
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
    const socket = Client(`http://localhost:${port}`, { auth: { token: tokenDe(1) } }) as AppClientSocket;
    await new Promise<void>((resolve) => socket.on("connect", () => { socket.disconnect(); resolve(); }));
  });

  it("usuario ajeno no se une a la sala", async () => {
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 2 } as never);

    const socket = Client(`http://localhost:${port}`, { auth: { token: tokenDe(2) } }) as AppClientSocket;
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
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue({ gameId: 1, userId: 1 } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as never);

    const s1 = Client(`http://localhost:${port}`, { auth: { token: tokenDe(1) } }) as AppClientSocket;
    const s2 = Client(`http://localhost:${port}`, { auth: { token: tokenDe(1) } }) as AppClientSocket;

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

    const recibido1 = new Promise<void>((resolve) => s1.on("game:updated", (p) => {
      expect(p.id).toBe(1);
      expect(p.status).toBe("ACTIVE");
      resolve();
    }));
    const recibido2 = new Promise<void>((resolve) => s2.on("game:updated", (p) => {
      expect(p.id).toBe(1);
      expect(p.status).toBe("ACTIVE");
      resolve();
    }));

    ioServer.to("game:1").emit("game:updated", { id: 1, status: "ACTIVE", turnVersion: 1 });

    await Promise.all([recibido1, recibido2]);
    s1.disconnect();
    s2.disconnect();
  });

  it("expira la conexión al vencer el token", async () => {
    const socket = Client(`http://localhost:${port}`, { auth: { token: tokenDe(1, "1s") } }) as AppClientSocket;
    await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    expect(socket.disconnected).toBe(true);
    socket.disconnect();
  });
});

