import type { Request, Response } from "express";
import { getPublicUserById } from "../services/auth.services.js";
import { responderError } from "../errors/responderError.js";
/* Devuelve los datos públicos del usuario. El middleware deja el ID
   validado en res.locals.userId; la consulta a la base la hace el servicio. */
export async function meController(_req: Request, res: Response) {
  const usuario = await getPublicUserById(res.locals.userId);

  // Si el usuario ya no existe, rechazamos la petición.
  if (!usuario) {
    return responderError(res, "USER_NOT_FOUND");
  }

  // Devolvemos solo información pública.
  return res.status(200).json({ user: usuario });
}
