import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

// El test de esta ruta no necesita JWT real: simulamos el usuario autenticado.
vi.mock("../../src/middlewares/auth.middleware.js", () => ({
  authMiddleware: (
    _req: unknown,
    res: express.Response,
    next: () => void,
  ) => {
    res.locals.userId = 42;
    next(); // Continúa la petición hasta el controlador PATCH.
  },
}));


// Simulamos servicios: comprobamos el contrato HTTP sin depender de PostgreSQL.
vi.mock("../../src/services/auth.services.js", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  getPublicUserById: vi.fn(),
  updateDisplayNameById: vi.fn(),
}));

// La ruta /games no se prueba en este archivo.
vi.mock("../../src/controllers/game.controller.js", () => ({
  getMyGamesController: vi.fn(),
}));

import { meRouter } from "../../src/routes/me.routes.js";
import { updateDisplayNameById } from "../../src/services/auth.services.js";
import {
  getOnlineUser,
  registerOnlineSocket,
  resetPresenceForTests,
} from "../../src/services/presence.js";

const app = express();
app.use(express.json());
app.use("/api/me", meRouter);

describe("PATCH /api/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPresenceForTests();
  });

  it("actualiza solo el displayName del usuario autenticado", async () => {
    registerOnlineSocket(
      { userId: 42, displayName: "Nombre anterior", status: "AVAILABLE" },
      "socket-42",
    );
    vi.mocked(updateDisplayNameById).mockResolvedValue({
      id: 42,
      email: "ana@email.com",
      role: "USER",
      displayName: "Ana",
    });

    const response = await request(app).patch("/api/me").send({
      displayName: "  Ana  ", // Verifica que Zod recorta espacios exteriores.
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: 42,
        email: "ana@email.com",
        role: "USER",
        displayName: "Ana",
      },
    });

    // El ID viene del middleware/JWT, nunca del cuerpo HTTP.
    expect(updateDisplayNameById).toHaveBeenCalledWith(42, "Ana");
    expect(getOnlineUser(42)).toEqual({
      userId: 42,
      displayName: "Ana",
      status: "AVAILABLE",
    });
  });

  it("rechaza un nombre demasiado corto", async () => {
    const response = await request(app).patch("/api/me").send({
      displayName: " A ",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateDisplayNameById).not.toHaveBeenCalled();
  });

  it("rechaza campos que intentarían modificar privilegios u otra cuenta", async () => {
    const response = await request(app).patch("/api/me").send({
      displayName: "Ana",
      id: 999,
      role: "ADMIN",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateDisplayNameById).not.toHaveBeenCalled();
  });
});
