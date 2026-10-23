// Esquemas Zod para las partidas multijugador.
import { z } from "zod";

// Validación del body de POST /api/games (modo de partida).
// Por defecto INDIVIDUAL; solo acepta INDIVIDUAL o MULTIPLAYER.
// .strict() rechaza campos adicionales.
export const createGameSchema = z
  .object({
    mode: z.enum(["INDIVIDUAL", "MULTIPLAYER"]).default("INDIVIDUAL"),
  })
  .strict();

// Validación del body de POST /api/games/join (código de invitación).
// El código son 6 caracteres alfanuméricos (sin 0, 1, I, O para evitar ambigüedad).
export const joinCodeSchema = z
  .object({
    code: z
      .string()
      .trim() // Quita espacios.
      .toUpperCase() // Normaliza a mayúsculas.
      .regex(/^[A-Z2-9]{6}$/, "Código de invitación inválido"), // Formato exacto.
  })
  .strict(); // Rechaza campos adicionales.
