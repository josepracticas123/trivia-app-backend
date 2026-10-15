import { Request, Response } from "express";
import { getCategories } from "../services/category.services.js";

/* Hacemos una petición HTTP, pedimos las categorías al servicio, y las envía al cliente en JSON */
export async function getCategoriesController(_req: Request, res: Response) {
  const categories = await getCategories();
  return res.json(categories);
}
