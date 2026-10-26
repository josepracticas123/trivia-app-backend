-- Reto 17: turnos alternos, una respuesta por jugador y control de versión.
--
-- Estrategia de migración:
--   1) Añadir columnas nuevas con valores por defecto seguros.
--   2) Rellenar los datos existentes (partidas individuales y salas del reto 16).
--   3) Convertir a NOT NULL y crear las restricciones únicas.

-- 1. Estado del turno y control de versión de la partida.
ALTER TABLE "Game"
  ADD COLUMN IF NOT EXISTS "currentPosition" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currentTurnOrder" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "turnVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "winnerUserId" INTEGER;

-- 2. Turno y puntuación de cada participante.
ALTER TABLE "GamePlayer"
  ADD COLUMN IF NOT EXISTS "turnOrder" INTEGER,
  ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0;

-- El creador ocupa el turno 1; el resto se ordena por antigüedad.
WITH "ordenados" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "gameId"
      ORDER BY "isCreator" DESC, "id" ASC
    ) AS "numero"
  FROM "GamePlayer"
)
UPDATE "GamePlayer" AS "jugador"
SET "turnOrder" = "ordenados"."numero"
FROM "ordenados"
WHERE "jugador"."id" = "ordenados"."id";

ALTER TABLE "GamePlayer" ALTER COLUMN "turnOrder" SET NOT NULL;

-- 3. Cada respuesta pasa a pertenecer a un usuario.
-- Las respuestas antiguas (reto 16) no guardaban quién respondió. Se asignan
-- al jugador del turno 1 para no perder el histórico; las partidas nuevas
-- siempre guardan el userId real.
ALTER TABLE "Answer" ADD COLUMN IF NOT EXISTS "userId" INTEGER;

WITH "respuestas_historicas" AS (
  SELECT
    "respuesta"."id" AS "answerId",
    "jugador"."userId" AS "userId"
  FROM "Answer" AS "respuesta"
  INNER JOIN "GameQuestion" AS "pregunta"
    ON "pregunta"."id" = "respuesta"."gameQuestionId"
  INNER JOIN "GamePlayer" AS "jugador"
    ON "jugador"."gameId" = "pregunta"."gameId"
   AND "jugador"."turnOrder" = 1
)
UPDATE "Answer" AS "respuesta"
SET "userId" = "respuestas_historicas"."userId"
FROM "respuestas_historicas"
WHERE "respuesta"."id" = "respuestas_historicas"."answerId";

-- Si alguna respuesta quedó sin jugador (dato huérfano), no se puede aplicar
-- userId NOT NULL. Se aborta la migración en vez de borrar datos en silencio.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Answer" WHERE "userId" IS NULL) THEN
    RAISE EXCEPTION 'Hay respuestas sin jugador asignable: revisar antes de aplicar la migración';
  END IF;
END $$;

ALTER TABLE "Answer" ALTER COLUMN "userId" SET NOT NULL;

-- 4. Puntuación histórica: aciertos ya guardados por cada jugador.
UPDATE "GamePlayer" AS "jugador"
SET "score" = COALESCE(
  (
    SELECT COUNT(*)::INTEGER
    FROM "Answer" AS "respuesta"
    INNER JOIN "GameQuestion" AS "pregunta"
      ON "pregunta"."id" = "respuesta"."gameQuestionId"
    WHERE "pregunta"."gameId" = "jugador"."gameId"
      AND "respuesta"."userId" = "jugador"."userId"
      AND "respuesta"."isCorrect" = TRUE
  ),
  0
);

-- 5. Posición actual de las partidas ya existentes.
-- Una pregunta se considera cerrada cuando ya tiene las respuestas que le
-- corresponden: 1 en individual y 2 en multijugador.
UPDATE "Game" AS "partida"
SET "currentPosition" = COALESCE(
  (
    SELECT COUNT(*)::INTEGER
    FROM "GameQuestion" AS "pregunta"
    WHERE "pregunta"."gameId" = "partida"."id"
      AND (
        SELECT COUNT(*)
        FROM "Answer" AS "respuesta"
        WHERE "respuesta"."gameQuestionId" = "pregunta"."id"
      ) >= CASE WHEN "partida"."mode" = 'MULTIPLAYER' THEN 2 ELSE 1 END
  ),
  0
);

-- Una partida terminada ya consumió sus cinco preguntas.
UPDATE "Game"
SET "currentPosition" = 5
WHERE "status" = 'FINISHED';

-- Si la sala está esperando, empieza por el primer jugador.
UPDATE "Game"
SET "currentTurnOrder" = 1
WHERE "status" = 'WAITING';

-- En una partida multijugador activa, si el jugador 1 ya respondió la pregunta
-- en curso, el turno pasa al jugador 2.
UPDATE "Game" AS "partida"
SET "currentTurnOrder" = 2
WHERE "partida"."mode" = 'MULTIPLAYER'
  AND "partida"."status" = 'ACTIVE'
  AND EXISTS (
    SELECT 1
    FROM "GameQuestion" AS "pregunta"
    WHERE "pregunta"."gameId" = "partida"."id"
      AND "pregunta"."position" = "partida"."currentPosition"
      AND EXISTS (
        SELECT 1
        FROM "Answer" AS "respuesta"
        WHERE "respuesta"."gameQuestionId" = "pregunta"."id"
      )
  );

-- 6. Restricciones de integridad.
-- Antes: una sola respuesta por pregunta. Ahora: una por jugador y pregunta.
DROP INDEX IF EXISTS "Answer_gameQuestionId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Answer_gameQuestionId_userId_key"
  ON "Answer"("gameQuestionId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "GamePlayer_gameId_turnOrder_key"
  ON "GamePlayer"("gameId", "turnOrder");

-- La FK también se crea una sola vez (permite reanudar una migración a medias).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Answer_userId_fkey'
  ) THEN
    ALTER TABLE "Answer"
      ADD CONSTRAINT "Answer_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
