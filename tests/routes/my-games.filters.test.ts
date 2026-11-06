import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { meRouter } from "../../src/routes/me.routes.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    game: { findMany: vi.fn(), count: vi.fn() },
  },
}));

const app = express();
app.use(express.json());
app.use("/api/me", meRouter);

function tokenDe(userId = 7) {
  return jwt.sign({}, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: "1h",
  });
}

beforeEach(() => {
  process.env.JWT_SECRET = "secreto-de-prueba";
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 7 } as never);
  vi.mocked(prisma.game.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.game.count).mockResolvedValue(0);
});

describe("GET /api/me/games", () => {
  it.each(["WAITING", "ACTIVE", "FINISHED"] as const)(
    "filtra por estado %s antes de paginar",
    async (status) => {
      const response = await request(app)
        .get(`/api/me/games?status=${status}`)
        .set("Authorization", `Bearer ${tokenDe()}`);

      expect(response.status).toBe(200);
      expect(prisma.game.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { players: { some: { userId: 7 } }, status },
        }),
      );
      expect(prisma.game.count).toHaveBeenCalledWith({
        where: { players: { some: { userId: 7 } }, status },
      });
    },
  );

  it("aplica el estado antes de paginar y cuenta solo coincidencias", async () => {
    vi.mocked(prisma.game.count).mockResolvedValue(4);

    const response = await request(app)
      .get("/api/me/games?status=FINISHED&page=2&pageSize=2")
      .set("Authorization", `Bearer ${tokenDe()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [],
      total: 4,
      page: 2,
      pageSize: 2,
    });
    expect(prisma.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { players: { some: { userId: 7 } }, status: "FINISHED" },
        skip: 2,
        take: 2,
      }),
    );
  });

  it("incluye todos los estados si no se envía status", async () => {
    const response = await request(app)
      .get("/api/me/games?page=1&pageSize=5")
      .set("Authorization", `Bearer ${tokenDe()}`);

    expect(response.status).toBe(200);
    expect(prisma.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { players: { some: { userId: 7 } } },
      }),
    );
  });

  it("rechaza un estado inválido con 400 y VALIDATION_ERROR", async () => {
    const response = await request(app)
      .get("/api/me/games?status=PAUSED")
      .set("Authorization", `Bearer ${tokenDe()}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.game.findMany).not.toHaveBeenCalled();
  });

  it("requiere JWT válido", async () => {
    const response = await request(app).get("/api/me/games?status=ACTIVE");

    expect(response.status).toBe(401);
    expect(prisma.game.findMany).not.toHaveBeenCalled();
  });
});
