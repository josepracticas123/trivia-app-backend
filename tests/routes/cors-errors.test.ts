import express from "express";
import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "../../src/app.js";

describe("CORS en errores de entrada", () => {
  // JSON malformado con Origin permitido: debe ser 400 INVALID_JSON con cabeceras CORS.
  it("POST con JSON malformado devuelve 400 INVALID_JSON y CORS", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("Content-Type", "application/json")
      .send("{ esto no es json valido");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  // Preflight de Authorization: debe responder con cabeceras CORS.
  it("OPTIONS preflight responde con cabeceras CORS", async () => {
    const res = await request(app)
      .options("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Authorization");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });
  it("cuerpo demasiado grande devuelve 413 con CORS", async () => {
    // Genera un body mayor de 100 KB.
    const bodyGrande = JSON.stringify({
      email: "a@b.com",
      password: "x".repeat(200000),
    });
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("Content-Type", "application/json")
      .send(bodyGrande);

    expect(res.status).toBe(413);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });
});
