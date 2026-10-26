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
      mode: {
        type: "string",
        enum: ["INDIVIDUAL", "MULTIPLAYER"],
        description: "Solo se incluye en partidas multijugador.",
        example: "MULTIPLAYER",
      },
      currentTurn: {
        type: "object",
        nullable: true,
        description:
          "Quién debe responder ahora y en qué pregunta. Null en individual, en WAITING o al terminar.",
        properties: {
          userId: { type: "integer", example: 2 },
          turnOrder: { type: "integer", enum: [1, 2], example: 2 },
          gameQuestionId: { type: "integer", example: 12 },
        },
        required: ["userId", "turnOrder", "gameQuestionId"],
      },
      players: {
        type: "array",
        description:
          "Puntuación revelada de cada jugador. En multijugador no cuenta la ronda que aún espera al segundo jugador.",
        items: {
          type: "object",
          properties: {
            userId: { type: "integer", example: 1 },
            turnOrder: { type: "integer", enum: [1, 2], example: 1 },
            score: { type: "integer", example: 2 },
          },
          required: ["userId", "turnOrder", "score"],
        },
      },
      winnerUserId: {
        type: "integer",
        nullable: true,
        description:
          "Ganador al terminar. Null si hay empate o la partida sigue activa.",
        example: 2,
      },
      isDraw: {
        type: "boolean",
        description: "true si la partida terminó en empate.",
        example: false,
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
            answered: {
              type: "boolean",
              description:
                "En multijugador, true si el usuario autenticado ya respondió esta pregunta.",
              example: true,
            },
            answeredCount: {
              type: "integer",
              description: "Respuestas recibidas para esta pregunta (0, 1 o 2).",
              example: 1,
            },
            revealed: {
              type: "boolean",
              description:
                "true cuando ya respondieron los dos jugadores y se pueden mostrar los resultados.",
              example: false,
            },
            results: {
              type: "array",
              nullable: true,
              description:
                "Resultados de la ronda. Solo se rellenan cuando revealed es true.",
              items: {
                type: "object",
                properties: {
                  userId: { type: "integer", example: 1 },
                  isCorrect: { type: "boolean", example: true },
                },
                required: ["userId", "isCorrect"],
              },
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
     el cliente solo la recibe (no puede enviarla ni modificarla).

     Individual: isCorrect, score y finished.
     Multijugador, primera respuesta de la ronda: NO incluye isCorrect,
     score, results ni players; solo el siguiente turno.
     Multijugador, segunda respuesta: roundComplete = true y se revelan
     results/players. La partida termina tras la décima respuesta. */
  RespuestaResultado: {
    type: "object",
    properties: {
      gameQuestionId: {
        type: "integer",
        example: 1,
      },
      isCorrect: {
        type: "boolean",
        description: "Solo en modo individual.",
        example: true,
      },
      score: {
        type: "integer",
        description: "Solo en modo individual: puntos acumulados.",
        example: 1,
      },
      roundComplete: {
        type: "boolean",
        description:
          "Multijugador: true cuando ya respondieron los dos jugadores de la ronda.",
        example: false,
      },
      finished: {
        type: "boolean",
        description:
          "true al responder la quinta pregunta individual o la décima multijugador.",
        example: false,
      },
      nextTurn: {
        type: "object",
        nullable: true,
        description:
          "Quién responde después y en qué pregunta; null al terminar.",
        properties: {
          userId: { type: "integer", example: 2 },
          gameQuestionId: { type: "integer", example: 12 },
        },
        required: ["userId", "gameQuestionId"],
      },
      results: {
        type: "array",
        nullable: true,
        description:
          "Resultados de los dos jugadores. Null mientras la ronda no está completa.",
        items: {
          type: "object",
          properties: {
            userId: { type: "integer", example: 1 },
            isCorrect: { type: "boolean", example: true },
          },
          required: ["userId", "isCorrect"],
        },
      },
      players: {
        type: "array",
        nullable: true,
        description:
          "Puntuaciones reveladas. Null mientras la ronda no está completa.",
        items: {
          type: "object",
          properties: {
            userId: { type: "integer", example: 1 },
            score: { type: "integer", example: 2 },
          },
          required: ["userId", "score"],
        },
      },
      winnerUserId: {
        type: "integer",
        nullable: true,
        description:
          "Ganador al terminar; null en empate o mientras la partida sigue.",
        example: null,
      },
      isDraw: {
        type: "boolean",
        description: "true si la partida terminó en empate.",
        example: false,
      },
    },
    required: ["gameQuestionId", "finished"],
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
