/*
  Warnings:

  - You are about to drop the column `backAudioUrl` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `frontAudioUrl` on the `Card` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AiContentType" ADD VALUE 'AUDIO_PRIMARY';
ALTER TYPE "AiContentType" ADD VALUE 'AUDIO_SECONDARY';
ALTER TYPE "AiContentType" ADD VALUE 'AUDIO_EXPLANATION';
ALTER TYPE "AiContentType" ADD VALUE 'AUDIO_TRANSLATION';

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "backAudioUrl",
DROP COLUMN "frontAudioUrl";
