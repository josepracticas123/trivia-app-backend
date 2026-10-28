import { Router } from "express";
import { getCategoriesController } from "../controllers/category.controller.js";

// Router independiente para agrupar las categorías.
// Todas las rutas quedan bajo /api/categories.
// Datos: Solicita lista de categorías, devuelve arreglo de objetos con id y nombre.

// /* Cuando llega el GET a la raiz del router, ejecutamos el controlador de listar la categoría. */
export const categoryRouter = Router();

categoryRouter.get("/", getCategoriesController);
