/* Puerta de entrada de los controladores de preguntas.
   Cada controlador vive en su archivo y aquí solo se re-exportan,
   para que las rutas sigan importando del mismo sitio. */
export {
  getQuestionsController,
  getQuestionByIdController,
} from "./question.get.js";
export { createQuestionController } from "./question.create.js";
export { updateQuestionController } from "./question.update.js";
export { deleteQuestionController } from "./question.delete.js";
