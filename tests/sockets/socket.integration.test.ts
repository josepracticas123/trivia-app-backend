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
import {
  resetPresenceForTests,
  updateOnlineUserDisplayName,
} from "../../src/services/presence.js";
import {
  acceptGameInvitation,
  cancelPendingInvitationsForReceiver,
  cancelPendingInvitationsFromSender,
  createGameInvitation,
  expirePendingGameInvitations,
  getPendingIncomingInvitations,
  respondToGameInvitation,
} from "../../src/services/game-invitations.js";
import { prisma } from "../../src/lib/prisma.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../src/sockets/socket.types.js";
import { resolve } from "node:path";

type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const invitationServiceMocks = vi.hoisted(() => ({
  acceptGameInvitation: vi.fn(),
  cancelPendingInvitationsForReceiver: vi.fn(),
  cancelPendingInvitationsFromSender: vi.fn(),
  createGameInvitation: vi.fn(),
  expirePendingGameInvitations: vi.fn(),
  getPendingIncomingInvitations: vi.fn(),
  respondToGameInvitation: vi.fn(),
}));

vi.mock("../../src/services/game-invitations.js", () => invitationServiceMocks);

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 1, displayName: "Jugador" }),
    },
    gamePlayer: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    gameInvitation: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
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
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 1,
    displayName: "Jugador",
  } as never);
  vi.mocked(prisma.gamePlayer.findMany).mockReset();
  vi.mocked(prisma.gamePlayer.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.gameInvitation.findMany).mockReset();
  vi.mocked(prisma.gameInvitation.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.gameInvitation.updateMany).mockReset();
  vi.mocked(prisma.gameInvitation.updateMany).mockResolvedValue({ count: 0 } as never);
  vi.mocked(expirePendingGameInvitations).mockReset().mockResolvedValue([]);
  vi.mocked(getPendingIncomingInvitations).mockReset().mockResolvedValue([]);
  vi.mocked(cancelPendingInvitationsFromSender).mockReset().mockResolvedValue([]);
  vi.mocked(cancelPendingInvitationsForReceiver).mockReset().mockResolvedValue([]);
  vi.mocked(createGameInvitation).mockReset();
  vi.mocked(acceptGameInvitation).mockReset();
  vi.mocked(respondToGameInvitation).mockReset();
  resetPresenceForTests();
});

function tokenDe(userId: number, expiresIn: string | number = "1h") {
  const opts: jwt.SignOptions = {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({}, process.env.JWT_SECRET!, opts);
}

function acceptedInvitationResult(
  inviteId: string,
  senderId: number,
  receiverId: number,
  cancelledInvitations: Array<{
    inviteId: string;
    senderId: number;
    receiverId: number;
  }> = [],
) {
  return {
    ok: true as const,
    inviteId,
    gameId: 99,
    status: "WAITING" as const,
    senderId,
    receiverId,
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    cancelledInvitations,
  };
}

async function connectedClient(userId: number): Promise<AppClientSocket> {
  const socket = registerClient(
    Client(`http://localhost:${port}`, {
      auth: { token: tokenDe(userId) },
    }) as AppClientSocket,
  );
  await new Promise<void>((resolve) => socket.once("connect", resolve));
  return socket;
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

  it("rechaza conexión cuando el token solo se envía en la query string", async () => {
    const socket = registerClient(
      Client(`http://localhost:${port}`, {
        query: { token: tokenDe(1) },
      }) as AppClientSocket,
    );

    const error = await new Promise<Error>((resolve) =>
      socket.once("connect_error", resolve),
    );

    expect(error.message).toContain("requerido");
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
      socket.on("connect", resolve),
    );
    expect(ioServer.sockets.adapter.rooms.get("user:1")?.has(socket.id)).toBe(
      true,
    );
    socket.disconnect();
  });

  it("limita solicitudes de presencia repetidas del mismo socket", async () => {
    const socket = await connectedClient(91);
    const limited = new Promise<{ message: string }>((resolve) =>
      socket.once("presence:error", resolve),
    );

    socket.emit("presence:request", { limit: 10 });
    socket.emit("presence:request", { limit: 10 });

    await expect(limited).resolves.toEqual({
      message: "Espera antes de volver a solicitar la presencia",
    });
  });

  it("notifica el nuevo nombre cuando cambia la presencia de un usuario online", async () => {
    const socket = await connectedClient(92);
    const changed = new Promise((resolve) =>
      socket.once("presence:changed", resolve),
    );

    updateOnlineUserDisplayName(92, "Nombre actualizado");

    await expect(changed).resolves.toEqual({
      userId: 92,
      displayName: "Nombre actualizado",
      status: "AVAILABLE",
    });
  });

  it("mantiene presencia online hasta que se desconecta la última pestaña", async () => {
    const first = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(31) },
      }) as AppClientSocket,
    );
    const observer = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(32) },
      }) as AppClientSocket,
    );
    await Promise.all([
      new Promise<void>((resolve) => first.once("connect", resolve)),
      new Promise<void>((resolve) => observer.once("connect", resolve)),
    ]);

    const second = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(31) },
      }) as AppClientSocket,
    );
    await new Promise<void>((resolve) => second.once("connect", resolve));

    const offlined = new Promise<void>((resolve) => {
      observer.on("presence:changed", (payload) => {
        if (payload.userId === 31 && payload.status === "OFFLINE") resolve();
      });
    });
    first.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(second.connected).toBe(true);
    expect(cancelPendingInvitationsFromSender).not.toHaveBeenCalled();

    second.disconnect();
    await offlined;
    expect(observer.connected).toBe(true);
    expect(cancelPendingInvitationsFromSender).toHaveBeenCalledWith(31);
  });

  it("devuelve el contrato paginado de presencia sin incluir al usuario actual", async () => {
    const first = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(41) },
      }) as AppClientSocket,
    );
    const second = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(42) },
      }) as AppClientSocket,
    );
    await Promise.all([
      new Promise<void>((resolve) => first.once("connect", resolve)),
      new Promise<void>((resolve) => second.once("connect", resolve)),
    ]);

    const page = new Promise((resolve) =>
      first.once("presence:available", resolve),
    );
    first.emit("presence:request", { limit: 10 });
    expect(await page).toEqual({
      items: [{ userId: 42, displayName: "Jugador", status: "AVAILABLE" }],
      nextCursor: null,
    });
  });

  it("envía una invitación privada con el payload público exacto", async () => {
    const sender = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(51) },
      }) as AppClientSocket,
    );
    const receiver = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(52) },
      }) as AppClientSocket,
    );
    await Promise.all([
      new Promise<void>((resolve) => sender.once("connect", resolve)),
      new Promise<void>((resolve) => receiver.once("connect", resolve)),
    ]);

    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    const expiresAt = new Date(Date.now() + 120_000);
    vi.mocked(createGameInvitation).mockResolvedValue({
      ok: true,
      inviteId,
      expiresAt,
    });
    const received = new Promise((resolve) =>
      receiver.once("game:invite", resolve),
    );
    const acknowledgement = new Promise((resolve) => {
      sender.emit(
        "game:invite:send",
        { receiverId: 52 },
        (result) => resolve(result),
      );
    });

    expect(await received).toEqual({
      inviteId,
      from: { userId: 51, displayName: "Jugador" },
      expiresAt: expiresAt.toISOString(),
    });
    expect(await acknowledgement).toEqual({
      ok: true,
      inviteId,
      expiresAt: expiresAt.toISOString(),
    });
  });

  it("restaura invitaciones entrantes pendientes al conectarse", async () => {
    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    const expiresAt = new Date(Date.now() + 60_000);
    vi.mocked(getPendingIncomingInvitations).mockResolvedValue([
      {
        inviteId,
        from: { userId: 81, displayName: "Emisor" },
        expiresAt,
      },
    ]);

    const receiver = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(82) },
      }) as AppClientSocket,
    );
    const invite = new Promise((resolve) =>
      receiver.once("game:invite", resolve),
    );
    await new Promise<void>((resolve) => receiver.once("connect", resolve));
    expect(await invite).toEqual({
      inviteId,
      from: { userId: 81, displayName: "Emisor" },
      expiresAt: expiresAt.toISOString(),
    });
    expect(getPendingIncomingInvitations).toHaveBeenCalledWith(82);
  });

  it("notifica la aceptación y la sala privada a ambos jugadores", async () => {
    const sender = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(61) },
      }) as AppClientSocket,
    );
    const receiver = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(62) },
      }) as AppClientSocket,
    );
    await Promise.all([
      new Promise<void>((resolve) => sender.once("connect", resolve)),
      new Promise<void>((resolve) => receiver.once("connect", resolve)),
    ]);

    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    vi.mocked(acceptGameInvitation).mockResolvedValue({
      ok: true,
      inviteId,
      gameId: 99,
      status: "WAITING",
      senderId: 61,
      receiverId: 62,
      createdAt,
      cancelledInvitations: [],
    });

    const senderAccepted = new Promise((resolve) =>
      sender.once("game:invite:accepted", resolve),
    );
    const receiverAccepted = new Promise((resolve) =>
      receiver.once("game:invite:accepted", resolve),
    );
    const created = new Promise((resolve) =>
      sender.once("game:created", resolve),
    );
    const joined = new Promise((resolve) =>
      receiver.once("game:joined", resolve),
    );
    const acknowledgement = new Promise((resolve) => {
      receiver.emit(
        "game:invite:accept",
        { inviteId },
        (result) => resolve(result),
      );
    });

    expect(await Promise.all([
      senderAccepted,
      receiverAccepted,
      created,
      joined,
      acknowledgement,
    ])).toEqual([
      { inviteId, gameId: 99, status: "WAITING" },
      { inviteId, gameId: 99, status: "WAITING" },
      {
        id: 99,
        mode: "MULTIPLAYER",
        status: "WAITING",
        code: null,
        createdAt: createdAt.toISOString(),
      },
      { id: 99, status: "WAITING", turnVersion: 0 },
      { ok: true, inviteId, gameId: 99, status: "WAITING" },
    ]);
  });

  it("responde éxito si falla la unión de sockets después del commit", async () => {
    const [sender, receiver] = await Promise.all([
      connectedClient(91),
      connectedClient(92),
    ]);
    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    vi.mocked(acceptGameInvitation).mockResolvedValue(
      acceptedInvitationResult(inviteId, 91, 92) as never,
    );

    const roomJoinSpy = vi.spyOn(ioServer, "in").mockImplementation(() => {
      throw new Error("socket join failure");
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const senderAccepted = new Promise((resolve) =>
        sender.once("game:invite:accepted", resolve),
      );
      const receiverAccepted = new Promise((resolve) =>
        receiver.once("game:invite:accepted", resolve),
      );
      const acknowledgement = new Promise((resolve) => {
        receiver.emit(
          "game:invite:accept",
          { inviteId },
          (result) => resolve(result),
        );
      });

      expect(await Promise.all([
        senderAccepted,
        receiverAccepted,
        acknowledgement,
      ])).toEqual([
        { inviteId, gameId: 99, status: "WAITING" },
        { inviteId, gameId: 99, status: "WAITING" },
        { ok: true, inviteId, gameId: 99, status: "WAITING" },
      ]);
      expect(roomJoinSpy).toHaveBeenCalledTimes(2);
      expect(errorLog).toHaveBeenCalledTimes(2);
      expect(errorLog).toHaveBeenCalledWith(
        "Invitation acceptance post-commit effect failed",
        expect.objectContaining({
          operation: "join sender sockets to game room",
          errorType: "Error",
        }),
      );
    } finally {
      roomJoinSpy.mockRestore();
      errorLog.mockRestore();
    }
  });

  it("permite recuperar el ack de una aceptación idempotente", async () => {
    const [sender, receiver] = await Promise.all([
      connectedClient(96),
      connectedClient(97),
    ]);
    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    vi.mocked(acceptGameInvitation).mockResolvedValue(
      acceptedInvitationResult(inviteId, 96, 97) as never,
    );

    const accept = () =>
      new Promise((resolve) => {
        receiver.emit(
          "game:invite:accept",
          { inviteId },
          (result) => resolve(result),
        );
      });

    const firstAck = await accept();
    const retriedAck = await accept();

    expect(firstAck).toEqual({
      ok: true,
      inviteId,
      gameId: 99,
      status: "WAITING",
    });
    expect(retriedAck).toEqual(firstAck);
    expect(acceptGameInvitation).toHaveBeenCalledTimes(2);
    expect(sender.connected).toBe(true);
  });

  it("responde éxito y conserva eventos si falla el refresco de presencia", async () => {
    const [sender, receiver] = await Promise.all([
      connectedClient(101),
      connectedClient(102),
    ]);
    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    const cancelledInviteId = "a338e227-a97a-4f11-9682-aef688f2d772";
    vi.mocked(acceptGameInvitation).mockResolvedValue(
      acceptedInvitationResult(inviteId, 101, 102, [
        { inviteId: cancelledInviteId, senderId: 101, receiverId: 103 },
      ]) as never,
    );
    vi.mocked(prisma.gamePlayer.findMany).mockRejectedValueOnce(
      new Error("database details must not be logged"),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const cancellationNotice = new Promise((resolve) =>
        sender.once("game:invite:cancelled", resolve),
      );
      const acknowledgement = new Promise((resolve) => {
        receiver.emit(
          "game:invite:accept",
          { inviteId },
          (result) => resolve(result),
        );
      });

      expect(await Promise.all([cancellationNotice, acknowledgement])).toEqual([
        { inviteId: cancelledInviteId },
        { ok: true, inviteId, gameId: 99, status: "WAITING" },
      ]);
      expect(errorLog).toHaveBeenCalledWith(
        "Invitation acceptance post-commit effect failed",
        {
          operation: "refresh online user presence",
          errorType: "Error",
        },
      );
      expect(errorLog.mock.calls.flat()).not.toContain(
        "database details must not be logged",
      );
    } finally {
      errorLog.mockRestore();
    }
  });

  it("mantiene INTERNAL_ERROR si falla la transacción antes de confirmar", async () => {
    const receiver = await connectedClient(111);
    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    vi.mocked(acceptGameInvitation).mockRejectedValueOnce(
      new Error("transaction failed"),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const acceptedEvent = vi.fn();
    receiver.on("game:invite:accepted", acceptedEvent);

    try {
      const acknowledgement = new Promise((resolve) => {
        receiver.emit(
          "game:invite:accept",
          { inviteId },
          (result) => resolve(result),
        );
      });

      expect(await acknowledgement).toEqual({
        ok: false,
        error: "INTERNAL_ERROR",
      });
      expect(acceptedEvent).not.toHaveBeenCalled();
      expect(errorLog).toHaveBeenCalledWith(
        "Error accepting game invitation:",
        expect.any(Error),
      );
    } finally {
      errorLog.mockRestore();
    }
  });

  it("continúa la notificación a la otra persona si el receptor se desconecta tras el commit", async () => {
    const [sender, receiver] = await Promise.all([
      connectedClient(116),
      connectedClient(117),
    ]);
    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    let finishAcceptance!: (result: never) => void;
    let markAcceptanceStarted!: () => void;
    const acceptanceStarted = new Promise<void>((resolve) => {
      markAcceptanceStarted = resolve;
    });
    let markPresenceRefreshFinished!: () => void;
    const presenceRefreshFinished = new Promise<void>((resolve) => {
      markPresenceRefreshFinished = resolve;
    });
    vi.mocked(prisma.gamePlayer.findMany).mockImplementation(async () => {
      markPresenceRefreshFinished();
      return [] as never;
    });
    vi.mocked(acceptGameInvitation).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishAcceptance = resolve;
          markAcceptanceStarted();
        }),
    );

    const senderAccepted = new Promise((resolve) =>
      sender.once("game:invite:accepted", resolve),
    );
    const acknowledgement = vi.fn();
    receiver.emit(
      "game:invite:accept",
      { inviteId },
      acknowledgement,
    );
    await acceptanceStarted;
    receiver.disconnect();
    finishAcceptance(acceptedInvitationResult(inviteId, 116, 117) as never);

    expect(await senderAccepted).toEqual({
      inviteId,
      gameId: 99,
      status: "WAITING",
    });
    await presenceRefreshFinished;
    expect(acknowledgement).not.toHaveBeenCalled();
  });

  it("cancela las invitaciones al desconectarse el último socket del receptor", async () => {
    const sender = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(71) },
      }) as AppClientSocket,
    );
    const receiver = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(72) },
      }) as AppClientSocket,
    );
    await Promise.all([
      new Promise<void>((resolve) => sender.once("connect", resolve)),
      new Promise<void>((resolve) => receiver.once("connect", resolve)),
    ]);

    const inviteId = "8f98f5a2-f48b-4c80-aeda-726abc150111";
    vi.mocked(cancelPendingInvitationsForReceiver).mockResolvedValue([
      { inviteId, senderId: 71 },
    ]);
    const cancelled = new Promise((resolve) =>
      sender.once("game:invite:cancelled", resolve),
    );
    receiver.disconnect();
    expect(await cancelled).toEqual({ inviteId });
    expect(cancelPendingInvitationsForReceiver).toHaveBeenCalledWith(72);
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

  it("los participantes reciben game:deleted cuando se elimina su sala", async () => {
    vi.mocked(prisma.gamePlayer.findFirst).mockResolvedValue({} as never);

    const s1 = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(1) },
      }) as AppClientSocket,
    );
    const s2 = registerClient(
      Client(`http://localhost:${port}`, {
        auth: { token: tokenDe(2) },
      }) as AppClientSocket,
    );

    await Promise.all([
      new Promise<void>((resolve) => s1.once("connect", resolve)),
      new Promise<void>((resolve) => s2.once("connect", resolve)),
    ]);

    const joined1 = new Promise<void>((resolve) =>
      s1.once("joined:game", () => resolve()),
    );
    const joined2 = new Promise<void>((resolve) =>
      s2.once("joined:game", () => resolve()),
    );
    s1.emit("join:game", 7);
    s2.emit("join:game", 7);
    await Promise.all([joined1, joined2]);

    const deleted1 = new Promise<void>((resolve) =>
      s1.once("game:deleted", (payload) => {
        expect(payload).toEqual({ id: 7 });
        resolve();
      }),
    );
    const deleted2 = new Promise<void>((resolve) =>
      s2.once("game:deleted", (payload) => {
        expect(payload).toEqual({ id: 7 });
        resolve();
      }),
    );

    ioServer.to("game:7").emit("game:deleted", { id: 7 });

    await Promise.all([deleted1, deleted2]);
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
