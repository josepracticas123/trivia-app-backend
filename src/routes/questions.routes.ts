import { Router } from "express";
import {
  authMiddleware,
  adminMiddleware,
} from "../middlewares/auth.middleware.js";
import {
  getQuestionsController,
  getQuestionByIdController,
  createQuestionController,
  updateQuestionController,
  deleteQuestionController,
} from "../controllers/question.controller.js";

export const questionRouter = Router();

/*Mapeamos todas la srutas que teníamos en el archivo de app, para eliminar de 
 aquel archivo las funciones y repartirlas en los diferentes archivos de
 servicios, controlador*/
questionRouter.get("/", getQuestionsController);
questionRouter.get("/:id", getQuestionByIdController);

// Así solo un ADMIN autenticado sera el qu epodrá crear, modificar, eliminar.
questionRouter.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createQuestionController,
);
questionRouter.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  updateQuestionController,
);
questionRouter.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deleteQuestionController,
);
