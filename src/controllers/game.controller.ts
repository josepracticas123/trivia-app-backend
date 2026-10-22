/* Puerta de entrada de los controladores de partidas.
   Cada controlador vive en su archivo y aquí solo se re-exportan,
   para que las rutas sigan importando del mismo sitio. */
export { createGameController } from "./game.create.js";
export { getGameController } from "./game.get.js";
export { answerController } from "./game.answer.js";
export { getMyGamesController } from "./game.history.js";
