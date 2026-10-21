/* Tipos y constantes compartidos de las partidas.
   Van aparte para que game.services.ts no engorde y el controlador
   pueda importarlos sin arrastrar toda la lógica. */

// Preguntas que tiene cada partida individual.
export const PREGUNTAS_POR_PARTIDA = 5;

/* Resultado de submitAnswer: o el acierto con su puntuación,
   o uno de estos errores conocidos. */
export type SubmitAnswerResult =
  | { ok: true; isCorrect: boolean; score: number; finished: boolean }
  | {
      ok: false;
      error:
        | "GAME_NOT_FOUND" // la partida no existe
        | "NOT_PARTICIPANT" // existe pero no participas
        | "GAME_FINISHED" // ya está cerrada
        | "QUESTION_NOT_IN_GAME" // esa copia de pregunta no es de ESTA partida
        | "WRONG_TURN" // no le toca a esa pregunta
        | "CHOICE_NOT_IN_QUESTION" // la opción no pertenece a esa pregunta
        | "ALREADY_ANSWERED"; // respuesta duplicada (carrera)
    };