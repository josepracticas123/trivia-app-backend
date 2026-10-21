import { z } from "zod";
// Validar los datos que envía el cliente para responder una pregunta de partida.
export const answerSchema = z
  .object({
    /* La copia de la pregunta DENTRO de la partida, tal y como
    la devuelve GET /api/games/:id en el "id" de cada pregunta.
    Rango del campo Int de PostgreSQL: 1 .. 2147483647. */
    gameQuestionId: z.number().int().min(1).max(2147483647),

    // Id de la opción elegida dentro de esa pregunta (mismo rango).
    choiceId: z.number().int().min(1).max(2147483647),
  })
  /* Sin campos extra: aquí nunca llega ni isCorrect, ni score
ni solution; la puntuación se calcula siempre en el backend. */
  .strict();
