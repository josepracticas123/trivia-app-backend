/* Esquemas OpenAPI de partidas y respuestas.
   Los nombres NO se cambian: los @openapi hacen $ref a ellos. */
export const gameSchemas = {
  /* Estado público de una partida, igual que el controlador:
     no contiene solution ni questionId. Una sala WAITING aún no tiene
     preguntas; cuando pase a ACTIVE tendrá las preguntas compartidas. */
  PartidaEstado: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      status: {
        type: "string",
        enum: ["WAITING", "ACTIVE", "FINISHED"], // enum GameStatus de Prisma
        example: "ACTIVE",
      },
      score: {
        type: "integer",
        description:
          "Puntos acumulados, calculados en el servidor (1 por acierto).",
        example: 3,
      },
      nextQuestionId: {
        type: "integer",
        nullable: true, // ← OpenAPI 3.0: null al terminar la partida
        description:
          "Id de la siguiente pregunta pendiente (la de turno); null cuando ya no queda ninguna.",
        example: 14,
      },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description:
                "Id de la pregunta DENTRO de la partida (la copia), no del catálogo.",
              example: 12,
            },
            position: {
              type: "integer",
              description: "Orden de la partida (0..4).",
              example: 0,
            },
            statement: {
              type: "string",
              example: "¿Cuál es la capital de Portugal?",
            },
            choices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 45 },
                  text: { type: "string", example: "Lisboa" },
                  position: { type: "integer", example: 0 },
                },
                required: ["id", "text", "position"],
              },
            },
          },
          required: ["id", "position", "statement", "choices"],
        },
      },
    },
    required: ["id", "status", "score", "nextQuestionId", "questions"],
  },

  /* Datos que el cliente envía para responder.
     El strict() de zod rechaza campos extra: aquí nunca
     puede venir isCorrect ni score (lo calcula el servidor). */
  RespuestaInput: {
    type: "object",
    properties: {
      gameQuestionId: {
        type: "integer",
        description: "Id de la pregunta DENTRO de la partida (la copia).",
        example: 1,
      },
      choiceId: {
        type: "integer",
        description: "Id de la opción elegida dentro de esa pregunta.",
        example: 1,
      },
    },
    required: ["gameQuestionId", "choiceId"],
  },

  /* Resultado de responder: la puntuación la calcula SIEMPRE el backend,
     el cliente solo la recibe (no puede enviarla ni modificarla). */
  RespuestaResultado: {
    type: "object",
    properties: {
      gameQuestionId: {
        type: "integer",
        example: 1,
      },
      isCorrect: { type: "boolean", example: true },
      score: {
        type: "integer",
        description: "Puntos acumulados, calculados por el servidor.",
        example: 1,
      },
      finished: {
        type: "boolean",
        description:
          "true al responder la quinta pregunta (partida FINISHED).",
        example: false,
      },
    },
    required: ["gameQuestionId", "isCorrect", "score", "finished"],
  },

  /* Historial público de partidas de un usuario.
     Igual que el controlador: id, estado, fechas y puntuación calculada. */
  PartidaHistorial: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      status: {
        type: "string",
        enum: ["WAITING", "ACTIVE", "FINISHED"],
        example: "FINISHED",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "Fecha y hora de creación de la partida.",
        example: "2026-01-15T10:30:00Z",
      },
      finishedAt: {
        type: "string",
        format: "date-time",
        nullable: true,
        description:
          "Fecha y hora de finalización de la partida; null si aún está activa.",
        example: "2026-01-15T10:45:00Z",
      },
      score: {
        type: "integer",
        description: "Puntos acumulados (1 por acierto).",
        example: 3,
      },
    },
    required: ["id", "status", "createdAt", "finishedAt", "score"],
  },

  /* Envolvente del historial: lista paginada de partidas públicas. */
  HistorialPartidas: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/PartidaHistorial" },
      },
      total: { type: "integer", example: 3 },
      page: { type: "integer", example: 1 },
      pageSize: { type: "integer", example: 10 },
    },
    required: ["items", "total", "page", "pageSize"],
  },
};
