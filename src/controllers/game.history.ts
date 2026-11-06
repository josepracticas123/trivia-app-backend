import type { Request, Response } from "express";
import { getMyGames } from "../services/game.services.js";
import { gameHistoryQuerySchema } from "../schemas/query.schema.js";
import { responderError } from "../errors/responderError.js";

export async function getMyGamesController(req: Request, res: Response) {
  const userId = res.locals.userId;

  const resultado = gameHistoryQuerySchema.safeParse(req.query);
  if (!resultado.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  const { page, pageSize, status } = resultado.data;

  const { items, total } = await getMyGames(userId, page, pageSize, status);

  return res.status(200).json({ items, total, page, pageSize });
}