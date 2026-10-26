/* Tipos y constantes compartidos de las partidas.
   Van aparte para que game.services.ts no engorde y el controlador
   pueda importarlos sin arrastrar toda la lógica. */

// Preguntas que se asignan al iniciar una partida, individual o multijugador.
export const PREGUNTAS_POR_PARTIDA = 5;

// Turnos que responde cada pregunta en multijugador: jugador 1 y jugador 2.
export const RESPUESTAS_POR_PREGUNTA_MULTIJUGADOR = 2;

// Resultado público de una ronda ya cerrada (ambos jugadores respondieron).
export type ResultadoRonda = {
  userId: number;
  isCorrect: boolean;
};

// Puntuación que el cliente puede ver: en multijugador solo cuenta rondas
// ya reveladas, para no filtrar el acierto pendiente.
export type PuntuacionJugador = {
  userId: number;
  score: number;
};

// A quién le toca responder y qué pregunta debe responder.
export type SiguienteTurno = {
  userId: number;
  gameQuestionId: number;
};

/* Resultado de submitAnswer.
   - En individual se mantiene el contrato anterior: isCorrect y score.
   - En multijugador la primera respuesta de una ronda NO revela isCorrect
     ni puntuación; solo la segunda (roundComplete: true) los revela. */
export type SubmitAnswerResult =
  | {
      ok: true;
      mode: "INDIVIDUAL";
      gameQuestionId: number;
      isCorrect: boolean;
      score: number;
      finished: boolean;
    }
  | {
      ok: true;
      mode: "MULTIPLAYER";
      gameQuestionId: number;
      roundComplete: boolean;
      finished: boolean;
      nextTurn: SiguienteTurno | null;
      // null mientras la ronda no está completa: no se filtra el acierto.
      results: ResultadoRonda[] | null;
      players: PuntuacionJugador[] | null;
      winnerUserId: number | null;
      isDraw: boolean;
    }
  | {
      ok: false;
      error:
        | "GAME_NOT_FOUND" // la partida no existe
        | "NOT_PARTICIPANT" // existe pero no participas
        | "GAME_NOT_ACTIVE" // la sala aún está en WAITING
        | "GAME_FINISHED" // ya está cerrada
        | "QUESTION_NOT_IN_GAME" // esa copia de pregunta no es de ESTA partida
        | "WRONG_TURN" // no es tu turno o no es la pregunta en juego
        | "CHOICE_NOT_IN_QUESTION" // la opción no pertenece a esa pregunta
        | "ALREADY_ANSWERED" // ya respondiste tú esa pregunta
        | "CONFLICTO_CONCURRENCIA"; // se agotaron los reintentos seguros
    };
