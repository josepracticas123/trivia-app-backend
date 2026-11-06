CREATE TYPE "GameInvitationStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED',
    'EXPIRED'
);

CREATE TABLE "GameInvitation" (
    "id" UUID NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "status" "GameInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "gameId" INTEGER,

    CONSTRAINT "GameInvitation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameInvitation_senderId_createdAt_idx"
    ON "GameInvitation"("senderId", "createdAt");
CREATE INDEX "GameInvitation_receiverId_status_expiresAt_idx"
    ON "GameInvitation"("receiverId", "status", "expiresAt");
CREATE INDEX "GameInvitation_gameId_idx"
    ON "GameInvitation"("gameId");

CREATE UNIQUE INDEX "GameInvitation_one_pending_per_sender"
    ON "GameInvitation"("senderId")
    WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "GameInvitation_one_pending_per_pair"
    ON "GameInvitation" (
        LEAST("senderId", "receiverId"),
        GREATEST("senderId", "receiverId")
    )
    WHERE "status" = 'PENDING';

ALTER TABLE "GameInvitation"
    ADD CONSTRAINT "GameInvitation_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameInvitation"
    ADD CONSTRAINT "GameInvitation_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameInvitation"
    ADD CONSTRAINT "GameInvitation_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
