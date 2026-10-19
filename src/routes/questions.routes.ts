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

/* Mapeamos todas las rutas que teníamos en el archivo de app, para eliminar de 
 aquel archivo las funciones y repartirlas en los diferentes archivos de
 servicios y controladores. */
questionRouter.get("/", getQuestionsController);
questionRouter.get("/:id", getQuestionByIdController);

// Así solo un ADMIN autenticado será el que podrá crear, modificar y eliminar.
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
