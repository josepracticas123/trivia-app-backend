/* Pruebas de la PROTECCIÓN de la base de datos.
   No tocan ninguna BBDD: solo comprueban que la protección rechaza
   configuraciones ajenas antes de borrar. */
import { describe, expect, it } from "vitest";
import { asegurarBaseDePruebas } from "./helpers/db-guard.js";

describe("protección de la base de pruebas", () => {
  it("acepta la base trivia_test", () => {
    expect(() =>
      asegurarBaseDePruebas("postgresql://u:p@localhost:5432/trivia_test"),
    ).not.toThrow();
  });

  it("rechaza una base que no es trivia_test", () => {
    expect(() =>
      asegurarBaseDePruebas("postgresql://u:p@localhost:5432/trivia"),
    ).toThrow(/solo pueden borrar en la base "trivia_test"/);
  });

  it("rechaza producción aunque el nombre empiece por trivia_test", () => {
    expect(() =>
      asegurarBaseDePruebas("postgresql://u:p@localhost:5432/trivia_test_prod"),
    ).toThrow(/apunta a "trivia_test_prod"/);
  });

  it("rechaza DATABASE_URL vacía", () => {
    expect(() => asegurarBaseDePruebas(undefined)).toThrow(
      /DATABASE_URL no está definida/,
    );
  });

  it("rechaza una URL inválida", () => {
    expect(() => asegurarBaseDePruebas("esto-no-es-una-url")).toThrow(
      /no es una URL válida/,
    );
  });
  it("rechaza trivia_test en un host remoto", () => {
    expect(() =>
      asegurarBaseDePruebas("postgresql://u:p@railway.app:5432/trivia_test"),
    ).toThrow(/localhost/);
  });
});
