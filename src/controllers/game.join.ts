import type { Request, Response } from "express";
import { joinGame } from "../services/game.services.js";
import { responderError } from "../errors/responderError.js";
import { responderMiddlewareError } from "../errors/responderMiddlewareError.js";
import { joinCodeSchema } from "../schemas/game.schema.js";
import { io } from "../sockets/index.js";
import { prisma } from "../lib/prisma.js";
// Un usuario se une a una sala multijugador con un código de invitación.
export async function joinGameController(req: Request, res: Response) {
  const userId = res.locals.userId; // ID del usuario autenticado.

  // Valida el body (code con formato de 6 caracteres).
  const resultadoValidacion = joinCodeSchema.safeParse(req.body);
  if (!resultadoValidacion.success) {
    return responderError(res, "VALIDATION_ERROR");
  }

  // Llama al servicio; devuelve { ok, game } o { ok, error }.
  const resultado = await joinGame(userId, resultadoValidacion.data.code);

  if (!resultado.ok) {
    // El error del servicio es una clave del catálogo; se pasa directamente.
    return responderError(res, resultado.error);
  }
  //Tras confirmar la unión en BD, leemos estado fresco para emitir los datos públicos
  const gameState = await prisma.game?.findUnique({
    where:{id:resultado.game.id},
    select:{id:true, status:true, turnVersion:true},
  });

  if(gameState){
    //Avisamos a todos los sockets unidos a la sala tras el commit.
    //Solo enviamos datos públicos: id, status, turnVersión. no enviamos soluciones
   if (!io) {
     console.error("Socket.IO no inicializado: no se puede emitir game:updated");
     return responderMiddlewareError(res, "INTERNAL_SERVER_ERROR");
   }
   io.to(`game:${gameState.id}`).emit("game:updated", {
      id:gameState.id,
      status: gameState.status,
      turnVersion:gameState.turnVersion,
    });
  }

  return res.status(200).json({ id: resultado.game.id, status: resultado.game.status });
}
