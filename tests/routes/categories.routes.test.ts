import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Simulamos el servicio para que la prueba no acceda a la base de datos.
vi.mock("../../src/services/category.services.js", () => ({
  getCategories: vi.fn(),
}));

import { getCategories } from "../../src/services/category.services.js";
import { categoryRouter } from "../../src/routes/categories.routes.js";

// Creamos una aplicación Express pequeña que monta las rutas reales.
const app = express();
app.use(express.json());
app.use("/api/categories", categoryRouter);

describe("GET /api/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite consultar categorías sin autenticación", async () => {
    // Preparamos la respuesta simulada del servicio.
    vi.mocked(getCategories).mockResolvedValue([
      { id: 1, name: "Historia" },
      { id: 2, name: "Ciencia" },
    ]);

    // Enviamos la petición sin cabecera Authorization.
    const response = await request(app).get("/api/categories");

    // Verificamos que la ruta es pública y devuelve las categorías.
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, name: "Historia" },
      { id: 2, name: "Ciencia" },
    ]);
    expect(getCategories).toHaveBeenCalledOnce();
  });
});
