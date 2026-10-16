import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { authRouter } from "../routes/auth.routes.js";
import { loginUser, registerUser } from "../services/auth.services.js";
// Simulamos Prisma para no necesitar DATABASE_URL en los tests.
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Simulamos el servicio para no depender de la base de datos.
vi.mock("../services/auth.services.js", () => ({
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
    vi.clearAllMocks();
  });

  it("devuelve 200 y un token si los datos son correctos", async () => {
    // Simulamos un usuario válido.
    vi.mocked(loginUser).mockResolvedValue({
      id: 42,
      email: "juan@email.com",
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
});

/* Comprueba qu eun usuario no pueda convertirse en admin,
 enviando ROLE: "ADMIN  */
describe("POST /api/auth/register", () => {
  //agrupamos pruebas relacioonadas con el registro de usuarios
  beforeEach(() => {
    vi.clearAllMocks();
  });
  // limpia pruebas para evitar que las llamadas anteriores no afecten a la siguiente
  it("rechaza el registro si el cliente envía un rol", async () => {
    // definimos que queremos ejecutar
    const respuesta = await request(app).post("/api/auth/register").send({
      email: "adminnuevo@email.com",
      password: "secreta123",
      role: "ADMIN",
    });

    expect(respuesta.status).toBe(400); // simula la petición http
    expect(respuesta.body.error.code).toBe("VALIDATION_ERROR");
    expect(registerUser).not.toHaveBeenCalled();
  });
});
