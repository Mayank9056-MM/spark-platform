/*
  Warnings:

  - You are about to drop the `_CurriculumVersionToOrganization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OrganizationToSemesterCatalog` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE';
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT_ALL_DEVICES';
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_COMPLETED';

-- DropForeignKey
ALTER TABLE "_CurriculumVersionToOrganization" DROP CONSTRAINT "_CurriculumVersionToOrganization_A_fkey";

-- DropForeignKey
ALTER TABLE "_CurriculumVersionToOrganization" DROP CONSTRAINT "_CurriculumVersionToOrganization_B_fkey";

-- DropForeignKey
ALTER TABLE "_OrganizationToSemesterCatalog" DROP CONSTRAINT "_OrganizationToSemesterCatalog_A_fkey";

-- DropForeignKey
ALTER TABLE "_OrganizationToSemesterCatalog" DROP CONSTRAINT "_OrganizationToSemesterCatalog_B_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "requestId" TEXT;

-- DropTable
DROP TABLE "_CurriculumVersionToOrganization";

-- DropTable
DROP TABLE "_OrganizationToSemesterCatalog";

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_action_createdAt_idx" ON "audit_logs"("organizationId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_catalogs" ADD CONSTRAINT "semester_catalogs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
