import type { Request, Response } from "express";
import {
  getPublicUserById,
  updateDisplayNameById,
} from "../services/auth.services.js";
import { updateMyProfileSchema } from "../schemas/profile.schema.js";
import { responderError } from "../errors/responderError.js";
import { updateOnlineUserDisplayName } from "../services/presence.js";

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
// PATCH /api/me: solo permite cambiar el nombre del usuario autenticado.
export async function updateMeController(req: Request, res: Response) {
  const validation = updateMyProfileSchema.safeParse(req.body);

  if (!validation.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  const user = await updateDisplayNameById(
    res.locals.userId,
    validation.data.displayName,
  );
  updateOnlineUserDisplayName(user.id, user.displayName);

  return res.status(200).json({ user });
}
