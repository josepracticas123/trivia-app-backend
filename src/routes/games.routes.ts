// Importamos Router de Express: es el que crea "mini-apps" para agrupar rutas.
import { Router } from "express";
// El controlador que creaste ayer (el que llama a createGame).
import {
  answerController,
  createGameController,
  getGameController,
} from "../controllers/game.controller.js";
// El middleware del reto 12: comprueba el token JWT del usuario.
import { authMiddleware } from "../middlewares/auth.middleware.js";

// Creamos el Router de partidas.
export const gameRouter = Router();

/* POST /api/games crea un apartida, la cadena es:
middleware primero (token) y solo si pasa, create controles después
si no hay token 401 y ni se toca controller. */
gameRouter.post("/", authMiddleware, createGameController);

// GET /api/games/:id → estado de la partida. También privada:
// primero authMiddleware (¿token?), después el controlador.
gameRouter.get("/:id", authMiddleware, getGameController);
/* POST /api/games/:id/answers responder la pregunta en turno.
   Misma cadena que las otras: primero el token (401 si falta),
   después el controlador. */
gameRouter.post("/:id/answers", authMiddleware, answerController);