// Router para las operaciones de partidas (games).
// Maneja la creación, unión, inicio y estado de las partidas.
// Rutas bajo /api/games. Requiere autenticación JWT para todas las operaciones.
// Datos: Entran con datos de jugador, salen con estado de partida, mensajes de error.
import { Router } from "express";
// Controladores de juegos.
import {
  answerController,
  createGameController,
  getGameController,
  joinGameController,
  startGameController,
} from "../controllers/game.controller.js";
// Middleware de autenticación.
import { authMiddleware } from "../middlewares/auth.middleware.js";

// Router para partidas
export const gameRouter = Router();

// POST /api/games → crear partida (individual o multijugador según body)
// Requiere autenticación. El cuerpo define el tipo de partida.
gameRouter.post("/", authMiddleware, createGameController);

// POST /api/games/join → unirse a una sala con código
// Debe ir ANTES de /:id. Requiere autenticación.
gameRouter.post("/join", authMiddleware, joinGameController);

// POST /api/games/:id/start → iniciar la partida (solo creador)
// Requiere autenticación y que el usuario sea el creador.
gameRouter.post("/:id/start", authMiddleware, startGameController);

// GET /api/games/:id → estado de la partida
// Requiere autenticación para ver el estado.
gameRouter.get("/:id", authMiddleware, getGameController);

// POST /api/games/:id/answers → responder una pregunta
// Requiere autenticación. Se envesta la respuesta del usuario.
gameRouter.post("/:id/answers", authMiddleware, answerController);