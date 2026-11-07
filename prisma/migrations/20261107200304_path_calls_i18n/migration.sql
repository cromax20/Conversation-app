/*
  Warnings:

  - Added the required column `startLevel` to the `LanguageProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "sceneIndex" INTEGER;

-- AlterTable
ALTER TABLE "LanguageProgress" ADD COLUMN     "examsPassed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startLevel" TEXT NOT NULL DEFAULT 'A1';
