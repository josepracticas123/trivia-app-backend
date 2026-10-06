-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "statement" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "solution" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);
