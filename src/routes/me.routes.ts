// Router para las rutas del usuario autenticado ("/api/me").
import { Router } from "express";
// El middleware del reto 12 valida el token JWT y deja el userId en res.locals.
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { getMyGamesController } from "../controllers/game.controller.js";

// Creamos el router de "me".
export const meRouter = Router();

/* GET /api/me/games → historial de partidas del usuario autenticado.
   La cadena es la de siempre: primero el token (401 si falta),
   después el controlador. */
meRouter.get("/games", authMiddleware, getMyGamesController);
