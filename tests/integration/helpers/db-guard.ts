/* Protección para las pruebas de INTEGRACIÓN: borran datos de verdad.
   Solo se permite borrar en la base de pruebas (trivia_test). Si la
   DATABASE_URL apunta a otra base, se aborta ANTES de tocar nada. */

const BASE_PERMITIDA = "trivia_test";
const HOSTS_PERMITIDOS = ["localhost", "127.0.0.1"];

export function asegurarBaseDePruebas(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no está definida: las pruebas de integración necesitan apuntar a la base trivia_test",
    );
  }

  let url: URL;
  let nombreBase: string;
  try {
    url = new URL(databaseUrl);
    nombreBase = url.pathname.replace(/^\//, "");
  } catch {
    throw new Error(
      "DATABASE_URL no es una URL válida: se aborta para no borrar datos por error",
    );
  }

  if (nombreBase !== BASE_PERMITIDA) {
    throw new Error(
      `Las pruebas de integración solo pueden borrar en la base "${BASE_PERMITIDA}", pero DATABASE_URL apunta a "${nombreBase}". Se aborta sin borrar nada.`,
    );
  }

  if (!HOSTS_PERMITIDOS.includes(url.hostname)) {
    throw new Error(
      `Las pruebas de integración solo pueden borrar en "${BASE_PERMITIDA}" en localhost, pero DATABASE_URL apunta a "${url.hostname}". Se aborta sin borrar nada.`,
    );
  }
}