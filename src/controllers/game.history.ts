import type { Request, Response } from "express";
import { getMyGames } from "../services/game.services.js";
import { paginationQuerySchema } from "../schemas/query.schema.js";
import { responderError } from "../errors/responderError.js";

export async function getMyGamesController(req: Request, res: Response) {
  const userId = res.locals.userId;

  // Validamos page/pageSize (reutilizamos el mismo esquema).
  const resultado = paginationQuerySchema.safeParse(req.query);
  if (!resultado.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  const { page, pageSize } = resultado.data;

  const { items, total } = await getMyGames(userId, page, pageSize);

  return res.status(200).json({ items, total, page, pageSize });
}