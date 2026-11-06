import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { authRouter } from "../../src/routes/auth.routes.js";
import { resetLoginRateLimitForTests } from "../../src/middlewares/login-rate-limit.middleware.js";
import { resetRegisterRateLimitForTests } from "../../src/middlewares/register-rate-limit.middleware.js";
import { loginUser, registerUser } from "../../src/services/auth.services.js";
// Simulamos Prisma para no necesitar DATABASE_URL en los tests.
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Simulamos el servicio para no depender de la base de datos.
vi.mock("../../src/services/auth.services.js", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
}));

// Creamos una aplicación pequeña para las pruebas.
const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    // Usamos un secreto exclusivo para estas pruebas.
    process.env.JWT_SECRET = "secreto-solo-para-tests";
    process.env.NODE_ENV = "production";
    resetLoginRateLimitForTests();
    vi.clearAllMocks();
  });

  it("devuelve 200 y un token si los datos son correctos", async () => {
    // Simulamos un usuario válido.
    vi.mocked(loginUser).mockResolvedValue({
      id: 42,
      email: "juan@email.com",
      displayName: "Juan",
    });

    const respuesta = await request(app).post("/api/auth/login").send({
      email: "juan@email.com",
      password: "secreta123",
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.token).toBeTypeOf("string");
    expect(respuesta.body.expiresIn).toBe(3600);
    expect(respuesta.body.user).toEqual({
      id: 42,
      email: "juan@email.com",
      displayName: "Juan",
    });

    // Comprobamos que el token identifica al usuario correcto.
    const contenidoToken = jwt.verify(
      respuesta.body.token,
      process.env.JWT_SECRET!,
    ) as jwt.JwtPayload;

    expect(contenidoToken.sub).toBe("42");

    // La respuesta pública no debe contener contraseñas ni hashes.
    expect(respuesta.body).not.toHaveProperty("password");
    expect(respuesta.body).not.toHaveProperty("passwordHash");
    expect(contenidoToken).not.toHaveProperty("password");
    expect(contenidoToken).not.toHaveProperty("passwordHash");
  });

  it("devuelve el mismo error para credenciales incorrectas", async () => {
    // Simulamos que las credenciales no son válidas.
    vi.mocked(loginUser).mockResolvedValue(null);

    const contraseñaIncorrecta = await request(app)
      .post("/api/auth/login")
      .send({
        email: "juan@email.com",
        password: "incorrecta123",
      });

    const emailInexistente = await request(app).post("/api/auth/login").send({
      email: "noexiste@email.com",
      password: "incorrecta123",
    });

    expect(contraseñaIncorrecta.status).toBe(401);
    expect(emailInexistente.status).toBe(401);

    expect(contraseñaIncorrecta.body).toEqual(emailInexistente.body);
    expect(contraseñaIncorrecta.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("limita el sexto intento de la misma IP con 429 y Retry-After", async () => {
    vi.mocked(loginUser).mockResolvedValue(null);

    for (let intento = 0; intento < 5; intento++) {
      const respuesta = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "203.0.113.10")
        .send({ email: "ana@email.com", password: "incorrecta123" });

      expect(respuesta.status).toBe(401);
    }

    const limitada = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "203.0.113.10")
      .send({ email: "ana@email.com", password: "incorrecta123" });

    expect(limitada.status).toBe(429);
    expect(Number(limitada.headers["retry-after"])).toBeGreaterThan(0);
    expect(limitada.body).toEqual({
      error: {
        code: "LOGIN_RATE_LIMITED",
        message:
          "Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.",
      },
    });
    expect(loginUser).toHaveBeenCalledTimes(5);
  });

  it("no limita los intentos cuando el servidor está en desarrollo", async () => {
    process.env.NODE_ENV = "development";
    vi.mocked(loginUser).mockResolvedValue(null);

    for (let intento = 0; intento < 6; intento++) {
      const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ email: "ana@email.com", password: "incorrecta123" });

      expect(respuesta.status).toBe(401);
    }

    expect(loginUser).toHaveBeenCalledTimes(6);
  });
});

/* Comprobamos que un usuario no pueda convertirse en admin
 enviando role: "ADMIN". */
describe("POST /api/auth/register", () => {
  // Agrupamos pruebas relacionadas con el registro de usuarios.
  beforeEach(() => {
    process.env.NODE_ENV = "production";
    resetRegisterRateLimitForTests();
    vi.clearAllMocks();
  });
  it("registra un nombre válido, lo recorta y lo devuelve", async () => {
    vi.mocked(registerUser).mockResolvedValue({
      id: 7,
      email: "ana@email.com",
      displayName: "Ana",
    });

    const respuesta = await request(app).post("/api/auth/register").send({
      displayName: "  Ana  ",
      email: "ana@email.com",
      password: "secreta123",
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({
      id: 7,
      email: "ana@email.com",
      displayName: "Ana",
    });
    // El controlador entrega al servicio el valor normalizado por Zod.
    expect(registerUser).toHaveBeenCalledWith(
      "ana@email.com",
      "secreta123",
      "Ana",
    );
  });
    it("permite que dos usuarios distintos compartan displayName", async () => {
    vi.mocked(registerUser)
      .mockResolvedValueOnce({
        id: 8,
        email: "ana1@email.com",
        displayName: "Ana",
      })
      .mockResolvedValueOnce({
        id: 9,
        email: "ana2@email.com",
        displayName: "Ana",
      });

    const primerRegistro = await request(app).post("/api/auth/register").send({
      displayName: "Ana",
      email: "ana1@email.com",
      password: "secreta123",
    });

    const segundoRegistro = await request(app).post("/api/auth/register").send({
      displayName: "Ana",
      email: "ana2@email.com",
      password: "secreta123",
    });

    expect(primerRegistro.status).toBe(201);
    expect(segundoRegistro.status).toBe(201);

    expect(primerRegistro.body).toMatchObject({
      id: 8,
      email: "ana1@email.com",
      displayName: "Ana",
    });
    expect(segundoRegistro.body).toMatchObject({
      id: 9,
      email: "ana2@email.com",
      displayName: "Ana",
    });
  });

  it("limita el sexto registro de la misma IP con 429 y Retry-After", async () => {
    vi.mocked(registerUser).mockImplementation(async (email, _password, displayName) => ({
      id: 7,
      email,
      displayName,
    }));

    for (let intento = 0; intento < 5; intento++) {
      const respuesta = await request(app)
        .post("/api/auth/register")
        .set("X-Forwarded-For", "203.0.113.11")
        .send({ displayName: "Ana", email: `ana${intento}@email.com`, password: "secreta123" });
      expect(respuesta.status).toBe(201);
    }

    const limitada = await request(app)
      .post("/api/auth/register")
      .set("X-Forwarded-For", "203.0.113.11")
      .send({ displayName: "Ana", email: "ana6@email.com", password: "secreta123" });

    expect(limitada.status).toBe(429);
    expect(Number(limitada.headers["retry-after"])).toBeGreaterThan(0);
    expect(limitada.body).toEqual({
      error: {
        code: "REGISTER_RATE_LIMITED",
        message: "Demasiados intentos de registro. Inténtalo de nuevo más tarde.",
      },
    });
    expect(registerUser).toHaveBeenCalledTimes(5);
  });

  it.each([
    ["nombre ausente", { email: "ana@email.com", password: "secreta123" }],
    [
      "solo espacios",
      { displayName: "   ", email: "ana@email.com", password: "secreta123" },
    ],
    [
      "un caracter",
      { displayName: "A", email: "ana@email.com", password: "secreta123" },
    ],
    [
      "mas de 30 caracteres",
      {
        displayName: "A".repeat(31),
        email: "ana@email.com",
        password: "secreta123",
      },
    ],
    [
      "tipo incorrecto",
      { displayName: 123, email: "ana@email.com", password: "secreta123" },
    ],
  ])("rechaza %s sin llamar al servicio", async (_caso, body) => {
    const respuesta = await request(app).post("/api/auth/register").send(body);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.code).toBe("VALIDATION_ERROR");
    expect(registerUser).not.toHaveBeenCalled();
  });

  // limpia pruebas para evitar que las llamadas anteriores no afecten a la siguiente
  it("rechaza el registro si el cliente envía un rol", async () => {
    // definimos que queremos ejecutar
    const respuesta = await request(app).post("/api/auth/register").send({
      displayName: "Ana",
      email: "adminnuevo@email.com",
      password: "secreta123",
      role: "ADMIN",
    });

    expect(respuesta.status).toBe(400); // simula la petición http
    expect(respuesta.body.error.code).toBe("VALIDATION_ERROR");
    expect(registerUser).not.toHaveBeenCalled();
  });
});
