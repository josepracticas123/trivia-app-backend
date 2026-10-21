/* Catálogo de errores de NEGOCIO: los que responde un controlador
   (por ejemplo "esa partida no existe" o "no eres admin").
   Cada código tiene su estado HTTP y su mensaje, y solo uno:
   si dos casos necesitan textos distintos, son dos códigos distintos.
   Los errores de los middlewares están aparte, en middlewareCatalog.ts. */

export const ERRORES = {
  // --- Validación y peticiones mal formadas ---
  VALIDATION_ERROR: {
    status: 400,
    message: "Los datos enviados no son válidos",
  },
  PARTIDA_ID_INVALIDO: {
    status: 400,
    message: "El id de la partida no es válido",
  },
  PREGUNTA_ID_INVALIDO: {
    status: 400,
    message: "El id de la pregunta no es válido",
  },
  CHOICE_NOT_IN_QUESTION: {
    status: 400,
    message: "La opción no pertenece a esa pregunta",
  },

  // --- Autenticación ---
  INVALID_CREDENTIALS: {
    status: 401,
    message: "El email o contraseña son incorrectos",
  },
  USER_NOT_FOUND: {
    status: 401,
    message: "El usuario ya no existe",
  },

  // --- Permisos ---
  NOT_PARTICIPANT: {
    status: 403,
    message: "No participas en esta partida",
  },
  NOT_ADMIN: {
    status: 403,
    message: "No tienes permisos para realizar esta acción",
  },

  // --- Recursos no encontrados ---
  GAME_NOT_FOUND: {
    status: 404,
    message: "La partida no existe",
  },
  QUESTION_NOT_FOUND: {
    status: 404,
    message: "La pregunta no existe",
  },
  QUESTION_NOT_IN_GAME: {
    status: 404,
    message: "Esa pregunta no pertenece a esta partida",
  },
  CATEGORY_NOT_FOUND: {
    status: 404,
    message: "La categoría indicada no existe",
  },

  // --- Conflictos de estado ---
  EMAIL_ALREADY_EXISTS: {
    status: 409,
    message: "El email ya está registrado",
  },
  GAME_FINISHED: {
    status: 409,
    message: "La partida ya ha finalizado",
  },
  WRONG_TURN: {
    status: 409,
    message: "Todavía no le toca a esa pregunta",
  },
  ALREADY_ANSWERED: {
    status: 409,
    message: "Ya has respondido esta pregunta",
  },
  NOT_ENOUGH_QUESTIONS: {
    status: 409,
    message: "No hay preguntas suficientes para crear una partida",
  },
} as const;