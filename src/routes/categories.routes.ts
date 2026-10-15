import { Router } from "express";
import { getCategoriesController } from "../controllers/category.controller.js";

//Router independiente para agrupar las categorías.
export const categoryRouter = Router();

/* Cuando llega el GET a la raiz del router, ejecutamos el controlador de listar la categoría. */
categoryRouter.get("/", getCategoriesController);
