// tests/services/question.queries.test.ts
// Verifica que getQuestions aplica el mismo filtro a findMany y count.

import { beforeEach, describe, it, expect, vi } from "vitest";
import { getQuestions } from "../../src/services/question.queries.js";
import { prisma } from "../../src/lib/prisma.js";

// Simulamos Prisma para no tocar la BD.
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    question: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // findMany devuelve un array vacío; count devuelve 0.
  vi.mocked(prisma.question.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.question.count).mockResolvedValue(0 as never);
});

describe("getQuestions - filtros compartidos", () => {
  // Verifica que findMany y count reciben el mismo where.
  it("aplica el mismo filtro a findMany y count", async () => {
    await getQuestions({ page: 1, pageSize: 10, search: "abc", categoryId: 2 });

    // El filtro esperado (mismo para ambos).
    const filtroEsperado = {
      statement: { contains: "abc", mode: "insensitive" },
      categoryId: 2,
    };

    // findMany debe recibir ese where.
    expect(prisma.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: filtroEsperado }),
    );

    // count debe recibir el mismo where.
    expect(prisma.question.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: filtroEsperado }),
    );
  });

  // Verifica que sin filtros, where es vacío en ambos.
  it("sin filtros, where vacio en ambos", async () => {
    await getQuestions({ page: 2, pageSize: 5 });

    // Ambos deben tener where vacío ({}).
    expect(prisma.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
    expect(prisma.question.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
