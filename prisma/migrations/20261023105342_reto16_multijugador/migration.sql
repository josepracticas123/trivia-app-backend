-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('INDIVIDUAL', 'MULTIPLAYER');

-- AlterEnum
ALTER TYPE "GameStatus" ADD VALUE 'WAITING';

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "code" TEXT,
ADD COLUMN     "mode" "GameMode" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "GamePlayer" ADD COLUMN     "isCreator" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");
