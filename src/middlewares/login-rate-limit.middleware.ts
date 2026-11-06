import type { NextFunction, Request, Response } from "express";

const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

type RegistroIntentos = {
  intentos: number;
  reiniciaEn: number;
};

const intentosPorIp = new Map<string, RegistroIntentos>();

function obtenerIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  const ahora = Date.now();
  const ip = obtenerIp(req);
  const registro = intentosPorIp.get(ip);

  if (!registro || registro.reiniciaEn <= ahora) {
    intentosPorIp.set(ip, {
      intentos: 1,
      reiniciaEn: ahora + VENTANA_MS,
    });
    return next();
  }

  if (registro.intentos >= MAX_INTENTOS) {
    const retryAfter = Math.max(
      1,
      Math.ceil((registro.reiniciaEn - ahora) / 1000),
    );

    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: {
        code: "LOGIN_RATE_LIMITED",
        message:
          "Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.",
      },
    });
  }

  registro.intentos += 1;
  return next();
}

/* Solo para aislar pruebas automáticas; no se expone como ruta HTTP. */
export function resetLoginRateLimitForTests() {
  intentosPorIp.clear();
}
