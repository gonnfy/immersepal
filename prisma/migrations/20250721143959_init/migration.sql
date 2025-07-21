-- CreateEnum
CREATE TYPE "AiContentType" AS ENUM ('EXPLANATION', 'TRANSLATION', 'AUDIO_PRIMARY', 'AUDIO_SECONDARY', 'AUDIO_EXPLANATION', 'AUDIO_TRANSLATION');

-- CreateEnum
CREATE TYPE "StudyRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

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

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "nextReviewAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deckId" TEXT NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyLog" (
    "id" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" "StudyRating" NOT NULL,
    "previousInterval" INTEGER NOT NULL,
    "previousEaseFactor" DOUBLE PRECISION NOT NULL,
    "newInterval" INTEGER NOT NULL,
    "newEaseFactor" DOUBLE PRECISION NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "StudyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AICardContent_cardId_contentType_idx" ON "AICardContent"("cardId" ASC, "contentType" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AICardContent_cardId_contentType_language_key" ON "AICardContent"("cardId" ASC, "contentType" ASC, "language" ASC);

-- CreateIndex
CREATE INDEX "AICardContent_cardId_idx" ON "AICardContent"("cardId" ASC);

-- CreateIndex
CREATE INDEX "Card_deckId_idx" ON "Card"("deckId" ASC);

-- CreateIndex
CREATE INDEX "Card_nextReviewAt_idx" ON "Card"("nextReviewAt" ASC);

-- CreateIndex
CREATE INDEX "Deck_userId_idx" ON "Deck"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Deck_userId_name_key" ON "Deck"("userId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "StudyLog_cardId_idx" ON "StudyLog"("cardId" ASC);

-- CreateIndex
CREATE INDEX "StudyLog_reviewedAt_idx" ON "StudyLog"("reviewedAt" ASC);

-- CreateIndex
CREATE INDEX "StudyLog_userId_idx" ON "StudyLog"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);

