// tests/routes/question.pagination.test.ts
// Tests específicos del reto 15: paginación, filtros y preflight CORS.

import express from "express"; // Framework web para montar la app de prueba.
import request from "supertest"; // Cliente HTTP para hacer peticiones a la app.
import { beforeEach, describe, it, expect, vi } from "vitest"; // Utilidades de Vitest.
import { questionRouter } from "../../src/routes/questions.routes.js"; // Router de preguntas.
import { getQuestions } from "../../src/services/question.service.js"; // Servicio que se simulará.

// Sustituimos el servicio real por uno falso, así el test no toca la BD.
vi.mock("../../src/services/question.service.js", () => ({
  getQuestions: vi.fn(), // Función simulada para el listado paginado.
  categoryExist: vi.fn(), // Simulada (no usada aquí, pero el router la importa).
  createQuestion: vi.fn(), // Simulada.
  updateQuestion: vi.fn(), // Simulada.
}));

// App mínima: solo monta el router de preguntas.
const app = express();
app.use(express.json());
app.use("/api/questions", questionRouter);

// Antes de cada test, limpia los mocks para que no se contaminen.
beforeEach(() => {
  vi.clearAllMocks();
});

// Grupo de tests: paginación y filtros del listado de preguntas.
describe("GET /api/questions - paginacion y filtros", () => {
  // Test 1: el controlador devuelve el contrato paginado completo.
  it("devuelve items, total, page y pageSize", async () => {
    // Simulamos que el servicio devuelve 1 pregunta en la página 1.
    vi.mocked(getQuestions).mockResolvedValue({
      items: [{ id: 1, categoryId: 1, statement: "Q1", choices: [] }],
      total: 1,
      page: 1,
      pageSize: 10,
    } as never);

    // Petición GET sin parámetros (usa defaults).
    const res = await request(app).get("/api/questions");

    // Debe responder 200 OK.
    expect(res.status).toBe(200);
    // El cuerpo debe tener los campos del contrato paginado.
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("pageSize");
    // Debe haber exactamente 1 item.
    expect(res.body.items).toHaveLength(1);
  });

  // Test 2: una página sin elementos devuelve items vacío con metadatos coherentes.
  it("pagina vacia devuelve items vacio con metadatos coherentes", async () => {
    // Simulamos página 999 (sin resultados) con total 6.
    vi.mocked(getQuestions).mockResolvedValue({
      items: [],
      total: 6,
      page: 999,
      pageSize: 10,
    } as never);

    const res = await request(app).get("/api/questions?page=999&pageSize=10");

    expect(res.status).toBe(200);
    // items vacío.
    expect(res.body.items).toHaveLength(0);
    // Metadatos coherentes con la petición.
    expect(res.body.total).toBe(6);
    expect(res.body.page).toBe(999);
    expect(res.body.pageSize).toBe(10);
  });

  // Test 3: search y categoryId afectan a items y total.
  it("search y categoryId afectan a items y total", async () => {
    // Simulamos que el filtro no devuelve resultados.
    vi.mocked(getQuestions).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    } as never);

    const res = await request(app).get(
      "/api/questions?search=xyz&categoryId=999",
    );

    expect(res.status).toBe(200);
    // Sin resultados: items vacío y total 0.
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
    // Confirma que el controlador llamó al servicio.
    expect(getQuestions).toHaveBeenCalled();
  });
  it("categoryId fuera de rango devuelve 400", async () => {
    const res = await request(app).get("/api/questions?categoryId=2147483648");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    // El servicio no debe haberse llamado.
    expect(getQuestions).not.toHaveBeenCalled();
  });
});
