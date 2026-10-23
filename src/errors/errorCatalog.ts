/* Catálogo de errores de NEGOCIO: los que responde un controlador
   (por ejemplo "esa partida no existe" o "no eres admin").
   La CLAVE (PARTIDA_ID_INVALIDO, NOT_ADMIN...) es INTERNA: solo sirve
   para elegir el error dentro del código.
   El campo `code` es lo que ve el cliente y NO se puede cambiar sin
   romper el contrato con el frontend.
   Los errores de los middlewares están aparte, en middlewareCatalog.ts. */

export const ERRORES = {
  // --- Validación y peticiones mal formadas ---
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    status: 400,
    message: "Los datos enviados no son válidos",
  },
  PARTIDA_ID_INVALIDO: {
    code: "VALIDATION_ERROR",
    status: 400,
    message: "El id de la partida no es válido",
  },
  PREGUNTA_ID_INVALIDO: {
    code: "VALIDATION_ERROR",
    status: 400,
    message: "El id de la pregunta no es válido",
  },
  CHOICE_NOT_IN_QUESTION: {
    code: "CHOICE_NOT_IN_QUESTION",
    status: 400,
    message: "La opción no pertenece a esa pregunta",
  },

  // --- Autenticación ---
  INVALID_CREDENTIALS: {
    code: "INVALID_CREDENTIALS",
    status: 401,
    message: "El email o contraseña son incorrectos",
  },
  USER_NOT_FOUND: {
    code: "UNAUTHORIZED",
    status: 401,
    message: "El usuario ya no existe",
  },

  // --- Permisos ---
  NOT_PARTICIPANT: {
    code: "FORBIDDEN",
    status: 403,
    message: "No participas en esta partida",
  },
  NOT_ADMIN: {
    code: "FORBIDDEN",
    status: 403,
    message: "No tienes permisos para realizar esta acción",
  },

  // --- Recursos no encontrados ---
  GAME_NOT_FOUND: {
    code: "GAME_NOT_FOUND",
    status: 404,
    message: "La partida no existe",
  },
  /* Mismo código público que GAME_NOT_FOUND, pero conserva el mensaje
     que el cliente recibía al pedir una partida por id. */
  GAME_ID_NOT_FOUND: {
    code: "GAME_NOT_FOUND",
    status: 404,
    message: "El id de la partida no es válido",
  },
  QUESTION_NOT_FOUND: {
    code: "QUESTION_NOT_FOUND",
    status: 404,
    message: "La pregunta no existe",
  },
  QUESTION_NOT_IN_GAME: {
    code: "QUESTION_NOT_IN_GAME",
    status: 404,
    message: "Esa pregunta no pertenece a esta partida",
  },

  // --- Conflictos de estado ---
  EMAIL_ALREADY_EXISTS: {
    code: "EMAIL_ALREADY_EXISTS",
    status: 409,
    message: "El email ya está registrado",
  },
  GAME_FINISHED: {
    code: "GAME_FINISHED",
    status: 409,
    message: "La partida ya ha finalizado",
  },
  SALA_LLENA: {
    code: "GAME_FULL",
    status: 409,
    message: "La sala ya tiene dos jugadores",
  },
  PARTIDA_YA_INICIADA: {
    code: "GAME_ALREADY_STARTED",
    status: 409,
    message: "La partida ya ha sido iniciada",
  },
  WRONG_TURN: {
    code: "WRONG_TURN",
    status: 409,
    message: "Todavía no le toca a esa pregunta",
  },
  ALREADY_ANSWERED: {
    code: "ALREADY_ANSWERED",
    status: 409,
    message: "Ya has respondido esta pregunta",
  },
  NOT_ENOUGH_QUESTIONS: {
    code: "NOT_ENOUGH_QUESTIONS",
    status: 409,
    message: "No hay suficientes preguntas para crear una partida",
  },
} as const;
