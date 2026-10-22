/* Prueba de INTEGRACIÓN del bloque 3: acceso ajeno a partidas.

   A diferencia del resto de pruebas (que simulan la BBDD), esta usa una
   base de datos REAL (trivia_test) a través de Prisma. Por eso vive en
   tests/integration/ y se ejecuta con:  npm run test:integration

   Qué garantiza: que un usuario NO puede leer la partida de otro.
   Si alguien elimina la comprobación de participante del controlador,
   esta prueba falla. */
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { gameRouter } from "../../src/routes/games.routes.js";
import { meRouter } from "../../src/routes/me.routes.js";
import { prisma } from "../../src/lib/prisma.js";
import { asegurarBaseDePruebas } from "./helpers/db-guard.js";

/* Abortamos al cargar el fichero si la URL no es la de pruebas.
   Así ni siquiera se crea o se borra nada en una base ajena. */
asegurarBaseDePruebas(process.env.DATABASE_URL);

// App mínima: solo lo necesario para las rutas que probamos.
const app = express();
app.use(express.json());
app.use("/api/games", gameRouter);
app.use("/api/me", meRouter);

// Token de verdad, firmado con el secreto de pruebas (.env.test).
function tokenDe(userId: number) {
  return jwt.sign({}, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: "1h",
  });
}

/* Ids creados por estas pruebas. Solo se borra lo nuestro: nunca
   datos que ya existieran en la base de pruebas. */
const idsUsuarios: number[] = [];
const idsPartidas: number[] = [];

/* Vacía SOLO lo creado por este fichero.
   Los borrados van en cascada desde Game y User (ver schema.prisma),
   así que no hace falta borrar cada tabla hija a mano. */
async function limpiarBaseDeDatos() {
  // Doble comprobación: nunca borrar si la base no es la de pruebas.
  asegurarBaseDePruebas(process.env.DATABASE_URL);

  if (idsPartidas.length > 0) {
    await prisma.game.deleteMany({ where: { id: { in: idsPartidas } } });
  }
  if (idsUsuarios.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: idsUsuarios } } });
  }

  idsPartidas.length = 0;
  idsUsuarios.length = 0;
}

/* Crea dos usuarios y una partida que pertenece SOLO al usuario A.
   Devuelve los ids para montar tokens. */
async function escenarioDosUsuarios() {
  const usuarioA = await prisma.user.create({
    data: { email: "a@test.com", passwordHash: "x" },
  });
  const usuarioB = await prisma.user.create({
    data: { email: "b@test.com", passwordHash: "x" },
  });
  idsUsuarios.push(usuarioA.id, usuarioB.id);

  const partidaDeA = await prisma.game.create({
    data: { players: { create: { userId: usuarioA.id } } },
  });
  idsPartidas.push(partidaDeA.id);
  return { usuarioA, usuarioB, partidaDeA };
}

// Antes de TODAS las pruebas de este fichero: pizarra en blanco.
beforeEach(limpiarBaseDeDatos);
// Al terminar: no dejamos datos de prueba colgando.
afterAll(async () => {
  await limpiarBaseDeDatos();
  await prisma.$disconnect();
});

describe("acceso ajeno a una partida", () => {
  it("devuelve 403 si otro usuario intenta ver mi partida", async () => {
    const { usuarioA, usuarioB, partidaDeA } = await escenarioDosUsuarios();

    // B pide la partida de A → 403 (no participa).
    const respuestaAjeno = await request(app)
      .get(`/api/games/${partidaDeA.id}`)
      .set("Authorization", `Bearer ${tokenDe(usuarioB.id)}`);

    expect(respuestaAjeno.status).toBe(403);

    // Y A sí puede verla → 200 (confirma que el test no pasa por error).
    const respuestaPropia = await request(app)
      .get(`/api/games/${partidaDeA.id}`)
      .set("Authorization", `Bearer ${tokenDe(usuarioA.id)}`);

    expect(respuestaPropia.status).toBe(200);
  });

  it("devuelve 403 si otro usuario intenta RESPONDER en mi partida", async () => {
    const { usuarioA, usuarioB, partidaDeA } = await escenarioDosUsuarios();

    // Una pregunta de la partida con una opción, para tener algo que responder.
    const pregunta = await prisma.gameQuestion.create({
      data: {
        gameId: partidaDeA.id,
        position: 0,
        statement: "¿Capital de España?",
        solution: 0,
        choices: {
          create: [
            { text: "Madrid", position: 0 },
            { text: "Sevilla", position: 1 },
          ],
        },
      },
      include: { choices: true },
    });

    // B intenta responder en la partida de A → 403.
    const respuestaAjeno = await request(app)
      .post(`/api/games/${partidaDeA.id}/answers`)
      .set("Authorization", `Bearer ${tokenDe(usuarioB.id)}`)
      .send({ gameQuestionId: pregunta.id, choiceId: pregunta.choices[0].id });

    expect(respuestaAjeno.status).toBe(403);

    // A sí puede responder → 200. (Confirma que el 403 era por ser ajeno.)
    const respuestaPropia = await request(app)
      .post(`/api/games/${partidaDeA.id}/answers`)
      .set("Authorization", `Bearer ${tokenDe(usuarioA.id)}`)
      .send({ gameQuestionId: pregunta.id, choiceId: pregunta.choices[0].id });

    expect(respuestaPropia.status).toBe(200);
  });

  it("el historial de B no incluye las partidas de A", async () => {
    const { usuarioA, usuarioB } = await escenarioDosUsuarios();

    // A ve su partida en el historial; B ve su historial vacío.
    const historialA = await request(app)
      .get("/api/me/games")
      .set("Authorization", `Bearer ${tokenDe(usuarioA.id)}`);
    const historialB = await request(app)
      .get("/api/me/games")
      .set("Authorization", `Bearer ${tokenDe(usuarioB.id)}`);

    expect(historialA.status).toBe(200);
    expect(historialA.body.items).toHaveLength(1);
    expect(historialA.body.total).toBe(1);
    expect(historialA.body.page).toBe(1);
    expect(historialA.body.pageSize).toBe(10);

    expect(historialB.status).toBe(200);
    expect(historialB.body.items).toHaveLength(0);
    expect(historialB.body.total).toBe(0);
    expect(historialB.body.page).toBe(1);
    expect(historialB.body.pageSize).toBe(10);
  });
});
