import { Router } from "express";
import {
  answerController,
  createGameController,
  getGameController,
  joinGameController,
  startGameController,
} from "../controllers/game.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const gameRouter = Router();

// POST /api/games → crear partida (individual o multijugador según body)
gameRouter.post("/", authMiddleware, createGameController);

// POST /api/games/join → unirse a una sala con código (debe ir ANTES de /:id)
gameRouter.post("/join", authMiddleware, joinGameController);

// POST /api/games/:id/start → iniciar la partida (solo creador)
gameRouter.post("/:id/start", authMiddleware, startGameController);

// GET /api/games/:id → estado de la partida
gameRouter.get("/:id", authMiddleware, getGameController);

// POST /api/games/:id/answers → responder
gameRouter.post("/:id/answers", authMiddleware, answerController);