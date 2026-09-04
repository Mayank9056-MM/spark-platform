/*
  Warnings:

  - A unique constraint covering the columns `[admissionId]` on the table `student_enrollments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `admissionId` to the `student_enrollments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "student_enrollments" ADD COLUMN     "admissionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_admissionId_key" ON "student_enrollments"("admissionId");

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
