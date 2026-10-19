import type { Request, Response, NextFunction } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { authMiddleware, adminMiddleware } from "./auth.middleware.js";
import { prisma } from "../lib/prisma.js";

// Agrupamos todas las pruebas relacionadas con authMiddleware.
describe("authMiddleware", () => {
  // Configuramos el entorno antes de cada test.
  beforeEach(() => {
    process.env.JWT_SECRET = "secreto-solo-para-tests";
    vi.restoreAllMocks();
  });

  // Comprobamos que el middleware rechaza una petición sin token.
  it("devuelve 401 si falta el token", async () => {
    // Simulamos una petición sin cabecera Authorization.
    const req = {
      headers: {},
    } as Request;

    // Simulamos la respuesta HTTP.
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    } as unknown as Response;

    // Simulamos la función next.
    const next = vi.fn() as unknown as NextFunction;

    // Ejecutamos el middleware.
    await authMiddleware(req, res, next);

    // Comprobamos que devuelve 401 Unauthorized.
    expect(res.status).toHaveBeenCalledWith(401);

    // Comprobamos el mensaje de error.
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "UNAUTHORIZED",
        message: "Falta el token de autenticación",
      },
    });

    // La petición no debe continuar.
    expect(next).not.toHaveBeenCalled();
  });

  // Comprobamos que un token inválido se rechaza.
  it("devuelve 401 si el token es inválido", async () => {
    // Simulamos una petición con un token inventado.
    const req = {
      headers: {
        authorization: "Bearer token-inventado",
      },
    } as Request;

    // Simulamos la respuesta HTTP.
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    } as unknown as Response;

    // Simulamos la función next.
    const next = vi.fn() as unknown as NextFunction;

    // Ejecutamos el middleware.
    await authMiddleware(req, res, next);

    // Comprobamos que devuelve 401 Unauthorized.
    expect(res.status).toHaveBeenCalledWith(401);

    // Comprobamos el error esperado.
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_TOKEN",
        message: "El token no es válido o ha caducado",
      },
    });

    // La petición no debe continuar.
    expect(next).not.toHaveBeenCalled();
  });

  // Comprobamos que un token caducado se rechaza.
  it("devuelve 401 si el token ha caducado", async () => {
    // Generamos un token firmado que ya ha caducado.
    const tokenCaducado = jwt.sign({ sub: "1" }, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      expiresIn: -1,
    });

    // Simulamos una petición con el token caducado.
    const req = {
      headers: {
        authorization: `Bearer ${tokenCaducado}`,
      },
    } as Request;

    // Simulamos la respuesta HTTP.
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    } as unknown as Response;

    // Simulamos la función next.
    const next = vi.fn() as unknown as NextFunction;

    // Ejecutamos el middleware.
    await authMiddleware(req, res, next);

    // Comprobamos que devuelve 401 Unauthorized.
    expect(res.status).toHaveBeenCalledWith(401);

    // Comprobamos el mensaje de error.
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_TOKEN",
        message: "El token no es válido o ha caducado",
      },
    });

    // La petición no debe continuar.
    expect(next).not.toHaveBeenCalled();
  });

  // Comprobamos que se rechaza un token válido si su usuario no existe.
  it("devuelve 401 si el usuario del token no existe", async () => {
    // Creamos un token válido para un usuario inexistente.
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      subject: "999999",
      expiresIn: "1h",
    });

    // Simulamos una petición con ese token.
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;

    // Simulamos la respuesta HTTP.
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    } as unknown as Response;

    // Simulamos la función next.
    const next = vi.fn() as unknown as NextFunction;

    // Simulamos que Prisma no encuentra al usuario.
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);

    // Ejecutamos el middleware.
    await authMiddleware(req, res, next);

    // Comprobamos que devuelve 401 Unauthorized.
    expect(res.status).toHaveBeenCalledWith(401);

    // Comprobamos el error esperado.
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_TOKEN",
        message: "El usuario del token ya no existe",
      },
    });

    // La petición no debe continuar.
    expect(next).not.toHaveBeenCalled();
  });

  // Un token firmado con el secreto correcto pero sin exp nunca caducaría,
  // por eso el middleware lo rechaza sin consultar la base.
  it("devuelve 401 si el token no incluye exp", async () => {
    // Token válido firmado, con sub correcto pero SIN expiresIn.
    const tokenSinExp = jwt.sign({ sub: "1" }, process.env.JWT_SECRET!, {
      algorithm: "HS256",
    });

    const req = {
      headers: { authorization: `Bearer ${tokenSinExp}` },
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    } as unknown as Response;

    const next = vi.fn() as unknown as NextFunction;

    // Espiamos Prisma para comprobar que nunca se consulta.
    const findUnique = vi.spyOn(prisma.user, "findUnique");

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_TOKEN",
        message: "El token no es válido",
      },
    });

    // La base no se consulta y la petición no continúa.
    expect(findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  /* El sub debe caber en el Int de la base (1 .. 2147483647).
     Un valor fuera de rango se rechaza sin consultar Prisma. */
  it.each(["0", "2147483648", "9007199254740993"])(
    "devuelve 401 si el sub %s está fuera de rango",
    async (sub) => {
      // Token firmado correctamente con un sub que no es un ID válido.
      const token = jwt.sign({ sub }, process.env.JWT_SECRET!, {
        algorithm: "HS256",
        expiresIn: "1h",
      });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        locals: {},
      } as unknown as Response;

      const next = vi.fn() as unknown as NextFunction;

      const findUnique = vi.spyOn(prisma.user, "findUnique");

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: "INVALID_TOKEN",
          message: "El token no es válido",
        },
      });

      expect(findUnique).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    },
  );

  // Un token válido con un sub en rango continúa y guarda el id del usuario.
  it("continúa si el token es válido y el usuario existe", async () => {
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      subject: "1",
      expiresIn: "1h",
    });

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    } as unknown as Response;

    const next = vi.fn() as unknown as NextFunction;

    // Prisma encuentra al usuario con id 1.
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: 1,
    } as never);

    await authMiddleware(req, res, next);

    // El middleware guarda la identidad y continúa hacia el controlador.
    expect(res.locals.userId).toBe(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// Agrupamos por separado las pruebas de adminMiddleware.
describe("adminMiddleware", () => {
  // Limpiamos los mocks antes de cada prueba.
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Comprobamos que un usuario con rol USER no puede realizar
  // operaciones reservadas para administradores.
  it("devuelve 403 si el usuario tiene rol USER", async () => {
    // Simulamos una petición HTTP.
    const req = {} as Request;

    // Simulamos la respuesta HTTP y el ID del usuario autenticado.
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: { userId: 1 },
    } as unknown as Response;

    // Simulamos la función next.
    const next = vi.fn() as unknown as NextFunction;

    // Simulamos que Prisma encuentra al usuario con rol USER.
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      role: "USER",
    } as never);

    // Ejecutamos el middleware de autorización.
    await adminMiddleware(req, res, next);

    // Comprobamos que devuelve 403 Forbidden.
    expect(res.status).toHaveBeenCalledWith(403);

    // Comprobamos el error esperado.
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "FORBIDDEN",
        message: "No tienes permisos para realizar esta acción",
      },
    });

    // El usuario no debe llegar al controlador protegido.
    expect(next).not.toHaveBeenCalled();
  });
});
