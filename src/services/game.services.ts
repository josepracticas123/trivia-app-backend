// Barrel del servicio de partidas: reexporta las consultas y las mutaciones
// para que controladores y pruebas sigan importando desde game.services.js.
export { getRandomQuestions, getGameById, getMyGames } from "./game.queries.js";
export { createGame, submitAnswer } from "./game.mutations.js";
export {
  confirmGameReady,
  createMultiplayerGame,
  deleteWaitingGame,
  joinGame,
  startGame,
} from "./game.mutations.js";
