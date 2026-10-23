import type { Request, Response } from "express";
import { joinGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";
import { joinCodeSchema } from "../schemas/game.schema.js";

// Un usuario se une a una sala multijugador con un código de invitación.
export async function joinGameController(req: Request, res: Response) {
  const userId = res.locals.userId; // ID del usuario autenticado.

  // Valida el body (code con formato de 6 caracteres).
  const resultadoValidacion = joinCodeSchema.safeParse(req.body);
  if (!resultadoValidacion.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  // Llama al servicio; devuelve { ok, game } o { ok, error }.
  const resultado = await joinGame(userId, resultadoValidacion.data.code);

  if (!resultado.ok) {
    // El error del servicio es una clave del catálogo; se pasa directamente.
    return responderError(res, resultado.error);
  }

  return res.status(200).json({ id: resultado.game.id, status: resultado.game.status });
}
