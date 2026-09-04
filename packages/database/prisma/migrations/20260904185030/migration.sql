-- AlterEnum
ALTER TYPE "StudentLifecycleStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "admissions_userId_key";

-- CreateIndex
CREATE INDEX "admissions_userId_idx" ON "admissions"("userId");
