const rawFrontendOrigins = process.env.FRONTEND_ORIGIN;

if (!rawFrontendOrigins) {
  throw new Error(
    "Falta FRONTEND_ORIGIN en las variables de entorno. Configúrala en el archivo .env.",
  );
}

function normalizeFrontendOrigin(origin: string): string {
  const trimmedOrigin = origin.trim();

  if (!trimmedOrigin) {
    throw new Error("FRONTEND_ORIGIN debe incluir al menos un origen válido.");
  }

  const url = new URL(trimmedOrigin);

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.origin !== trimmedOrigin
  ) {
    throw new Error(
      "Cada FRONTEND_ORIGIN debe incluir protocolo y puerto, sin rutas ni barra final.",
    );
  }

  return url.origin;
}

export const allowedFrontendOrigins = [
  ...new Set(
    rawFrontendOrigins
      .split(",")
      .map((origin) => normalizeFrontendOrigin(origin))
      .filter(Boolean),
  ),
];

if (allowedFrontendOrigins.length === 0) {
  throw new Error("FRONTEND_ORIGIN debe incluir al menos un origen válido.");
}

export function isAllowedFrontendOrigin(origin: string | undefined) {
  if (origin === undefined) {
    return true;
  }

  const trimmedOrigin = origin.trim();
  return trimmedOrigin.length > 0 && allowedFrontendOrigins.includes(trimmedOrigin);
}
