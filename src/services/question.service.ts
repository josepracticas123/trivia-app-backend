/* Puerta de entrada de los servicios de preguntas.
   Las lecturas y las escrituras viven en su propio archivo
   y aquí solo se re-exportan, para no romper los imports existentes. */
export {
  getQuestions,
  getQuestionById,
  categoryExist,
} from "./question.queries.js";
export {
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "./question.mutations.js";
