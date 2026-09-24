/*
  Warnings:

  - A unique constraint covering the columns `[id,programId]` on the table `curriculum_versions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_id_programId_key" ON "curriculum_versions"("id", "programId");
