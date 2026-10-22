import type { Request, Response } from "express";
import { getMyGames } from "../services/game.services.js";

// Historial de partidas del usuario autenticado.
export async function getMyGamesController(req: Request, res: Response) {
  // El userId sale del token (authMiddleware), nunca de la URL ni del query.
  const userId = res.locals.userId;

  const partidas = await getMyGames(userId);

  // Lista pública: id, estado, fechas y score ya calculado en el servicio.
  return res.status(200).json({ games: partidas });
}