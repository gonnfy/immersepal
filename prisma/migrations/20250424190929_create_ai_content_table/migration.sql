/*
  Warnings:

  - You are about to drop the column `explanation` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `translation` on the `Card` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AiContentType" AS ENUM ('EXPLANATION', 'TRANSLATION');

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "explanation",
DROP COLUMN "translation",
ALTER COLUMN "nextReviewAt" SET DATA TYPE TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "AICardContent" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "contentType" "AiContentType" NOT NULL,
    "language" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AICardContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AICardContent_cardId_idx" ON "AICardContent"("cardId");

-- CreateIndex
CREATE INDEX "AICardContent_cardId_contentType_idx" ON "AICardContent"("cardId", "contentType");

-- CreateIndex
CREATE UNIQUE INDEX "AICardContent_cardId_contentType_language_key" ON "AICardContent"("cardId", "contentType", "language");
