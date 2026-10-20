import { z } from "zod";
//Vaidar los datos que envía el cliente para responder una pregunta de partida.
export const answerSchema = z
  .object({
    /* La copia de la pregunta DENTRO de la partida (copia)
  tal y como devuelve GET api/game/:id en el id de cada pregunta */
    gameQuestionId: z.number().int().min(1),

    //Id de la opción elegida ( el id de cada choice de esa pregunta)
    choiceId: z.number().int().min(1),
  })
  /* sin campos extra: aqui nunca llega ni isCorrect, ni score
ni solution, la puntuación se calcula siempre en backend*/
  .strict();
