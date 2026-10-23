import type { Request, Response } from "express";
import { joinGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";

export async function joinGameController(req: Request, res: Response) {
  const userId = res.locals.userId;
  const code = String(req.body?.code ?? "").trim().toUpperCase();

  if (!code) {
    return responderError(res, "VALIDATION_ERROR");
  }

  const resultado = (await joinGame(userId, code)) as
    | { ok: true; game: { id: number; status: string } }
    | { ok: false; error: string };

  if (!resultado.ok) {
    const mapa: Record<string, string> = {
      CODIGO_INVALIDO: "GAME_NOT_FOUND",
      PARTIDA_YA_INICIADA: "GAME_FINISHED",
      SALA_LLENA: "GAME_FINISHED",
    };
    const codigoError = mapa[resultado.error] ?? "VALIDATION_ERROR";
    return responderError(res, codigoError as any);
  }

  return res.status(200).json({ id: resultado.game.id, status: resultado.game.status });
}