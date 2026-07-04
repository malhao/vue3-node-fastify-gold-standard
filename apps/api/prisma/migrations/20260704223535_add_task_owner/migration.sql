/*
  Warnings:

  - Added the required column `userId` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tasks_createdAt_id_idx";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "tasks_userId_createdAt_id_idx" ON "tasks"("userId", "createdAt", "id");
