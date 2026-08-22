/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,id]` on the table `academic_years` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `curriculum_versions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `divisions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `faculty_assignments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `programs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `semester_catalogs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `semester_enrollments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `student_enrollments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `subject_offerings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `time_slots` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `curriculum_versions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `faculty_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `divisionId` to the `lectures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `facultyUserId` to the `lectures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `lectures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `semester_catalogs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `semester_enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dayOfWeek` to the `timetables` table without a default value. This is not possible if the table is not empty.
  - Added the required column `divisionId` to the `timetables` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `timetables` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `timetables` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `timetables` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "admissions" DROP CONSTRAINT "admissions_initialCurriculumId_fkey";

-- DropForeignKey
ALTER TABLE "admissions" DROP CONSTRAINT "admissions_initialProgramId_fkey";

-- DropForeignKey
ALTER TABLE "curriculum_versions" DROP CONSTRAINT "curriculum_versions_programId_fkey";

-- DropForeignKey
ALTER TABLE "divisions" DROP CONSTRAINT "divisions_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "divisions" DROP CONSTRAINT "divisions_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "divisions" DROP CONSTRAINT "divisions_programId_fkey";

-- DropForeignKey
ALTER TABLE "faculty_assignments" DROP CONSTRAINT "faculty_assignments_subjectOfferingId_fkey";

-- DropForeignKey
ALTER TABLE "lectures" DROP CONSTRAINT "lectures_facultyAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "lectures" DROP CONSTRAINT "lectures_roomId_fkey";

-- DropForeignKey
ALTER TABLE "lectures" DROP CONSTRAINT "lectures_subjectOfferingId_fkey";

-- DropForeignKey
ALTER TABLE "programs" DROP CONSTRAINT "programs_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "promotion_batches" DROP CONSTRAINT "promotion_batches_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "promotion_batches" DROP CONSTRAINT "promotion_batches_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "role_assignments" DROP CONSTRAINT "role_assignments_roleId_fkey";

-- DropForeignKey
ALTER TABLE "role_assignments" DROP CONSTRAINT "role_assignments_userId_fkey";

-- DropForeignKey
ALTER TABLE "semester_catalogs" DROP CONSTRAINT "semester_catalogs_curriculumVersionId_fkey";

-- DropForeignKey
ALTER TABLE "semester_enrollments" DROP CONSTRAINT "semester_enrollments_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "semester_enrollments" DROP CONSTRAINT "semester_enrollments_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "semester_enrollments" DROP CONSTRAINT "semester_enrollments_semesterCatalogId_fkey";

-- DropForeignKey
ALTER TABLE "semester_enrollments" DROP CONSTRAINT "semester_enrollments_studentEnrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_curriculumVersionId_fkey";

-- DropForeignKey
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_programId_fkey";

-- DropForeignKey
ALTER TABLE "subject_offerings" DROP CONSTRAINT "subject_offerings_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "subject_offerings" DROP CONSTRAINT "subject_offerings_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "subject_offerings" DROP CONSTRAINT "subject_offerings_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_semesterCatalogId_fkey";

-- DropForeignKey
ALTER TABLE "timetables" DROP CONSTRAINT "timetables_facultyAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "timetables" DROP CONSTRAINT "timetables_roomId_fkey";

-- DropForeignKey
ALTER TABLE "timetables" DROP CONSTRAINT "timetables_subjectOfferingId_fkey";

-- DropForeignKey
ALTER TABLE "timetables" DROP CONSTRAINT "timetables_timeSlotId_fkey";

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "correctedByUserId" TEXT;

-- AlterTable
ALTER TABLE "curriculum_versions" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "faculty_assignments" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "lectures" ADD COLUMN     "divisionId" TEXT NOT NULL,
ADD COLUMN     "facultyUserId" TEXT NOT NULL,
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "semester_catalogs" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "semester_enrollments" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "timetables" ADD COLUMN     "dayOfWeek" "DayOfWeek" NOT NULL,
ADD COLUMN     "divisionId" TEXT NOT NULL,
ADD COLUMN     "endTime" TIME NOT NULL,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "startTime" TIME NOT NULL;

-- CreateTable
CREATE TABLE "_OrganizationToSemesterCatalog" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationToSemesterCatalog_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CurriculumVersionToOrganization" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CurriculumVersionToOrganization_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OrganizationToSemesterCatalog_B_index" ON "_OrganizationToSemesterCatalog"("B");

-- CreateIndex
CREATE INDEX "_CurriculumVersionToOrganization_B_index" ON "_CurriculumVersionToOrganization"("B");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_organizationId_id_key" ON "academic_years"("organizationId", "id");

-- CreateIndex
CREATE INDEX "curriculum_versions_organizationId_idx" ON "curriculum_versions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_organizationId_id_key" ON "curriculum_versions"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organizationId_id_key" ON "departments"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "divisions_organizationId_id_key" ON "divisions"("organizationId", "id");

-- CreateIndex
CREATE INDEX "faculty_assignments_organizationId_idx" ON "faculty_assignments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_assignments_organizationId_id_key" ON "faculty_assignments"("organizationId", "id");

-- CreateIndex
CREATE INDEX "lectures_organizationId_idx" ON "lectures"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_id_key" ON "organizations"("id");

-- CreateIndex
CREATE UNIQUE INDEX "programs_organizationId_id_key" ON "programs"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organizationId_id_key" ON "roles"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_organizationId_id_key" ON "rooms"("organizationId", "id");

-- CreateIndex
CREATE INDEX "semester_catalogs_organizationId_idx" ON "semester_catalogs"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "semester_catalogs_organizationId_id_key" ON "semester_catalogs"("organizationId", "id");

-- CreateIndex
CREATE INDEX "semester_enrollments_organizationId_idx" ON "semester_enrollments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "semester_enrollments_organizationId_id_key" ON "semester_enrollments"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_organizationId_id_key" ON "student_enrollments"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "subject_offerings_organizationId_id_key" ON "subject_offerings"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_organizationId_id_key" ON "subjects"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_organizationId_id_key" ON "time_slots"("organizationId", "id");

-- CreateIndex
CREATE INDEX "timetables_organizationId_idx" ON "timetables"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_organizationId_id_key" ON "users"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organizationId_userId_fkey" FOREIGN KEY ("organizationId", "userId") REFERENCES "users"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organizationId_roleId_fkey" FOREIGN KEY ("organizationId", "roleId") REFERENCES "roles"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_organizationId_departmentId_fkey" FOREIGN KEY ("organizationId", "departmentId") REFERENCES "departments"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_organizationId_programId_fkey" FOREIGN KEY ("organizationId", "programId") REFERENCES "programs"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_catalogs" ADD CONSTRAINT "semester_catalogs_organizationId_curriculumVersionId_fkey" FOREIGN KEY ("organizationId", "curriculumVersionId") REFERENCES "curriculum_versions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_organizationId_programId_fkey" FOREIGN KEY ("organizationId", "programId") REFERENCES "programs"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_organizationId_academicYearId_fkey" FOREIGN KEY ("organizationId", "academicYearId") REFERENCES "academic_years"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_organizationId_departmentId_fkey" FOREIGN KEY ("organizationId", "departmentId") REFERENCES "departments"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_organizationId_initialProgramId_fkey" FOREIGN KEY ("organizationId", "initialProgramId") REFERENCES "programs"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_organizationId_initialCurriculumId_fkey" FOREIGN KEY ("organizationId", "initialCurriculumId") REFERENCES "curriculum_versions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_organizationId_programId_fkey" FOREIGN KEY ("organizationId", "programId") REFERENCES "programs"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_organizationId_curriculumVersionId_fkey" FOREIGN KEY ("organizationId", "curriculumVersionId") REFERENCES "curriculum_versions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_enrollments" ADD CONSTRAINT "semester_enrollments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_enrollments" ADD CONSTRAINT "semester_enrollments_organizationId_studentEnrollmentId_fkey" FOREIGN KEY ("organizationId", "studentEnrollmentId") REFERENCES "student_enrollments"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_enrollments" ADD CONSTRAINT "semester_enrollments_organizationId_semesterCatalogId_fkey" FOREIGN KEY ("organizationId", "semesterCatalogId") REFERENCES "semester_catalogs"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_enrollments" ADD CONSTRAINT "semester_enrollments_organizationId_academicYearId_fkey" FOREIGN KEY ("organizationId", "academicYearId") REFERENCES "academic_years"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_enrollments" ADD CONSTRAINT "semester_enrollments_organizationId_divisionId_fkey" FOREIGN KEY ("organizationId", "divisionId") REFERENCES "divisions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_organizationId_divisionId_fkey" FOREIGN KEY ("organizationId", "divisionId") REFERENCES "divisions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_organizationId_academicYearId_fkey" FOREIGN KEY ("organizationId", "academicYearId") REFERENCES "academic_years"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_organizationId_semesterCatalogId_fkey" FOREIGN KEY ("organizationId", "semesterCatalogId") REFERENCES "semester_catalogs"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_organizationId_subjectId_fkey" FOREIGN KEY ("organizationId", "subjectId") REFERENCES "subjects"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_organizationId_divisionId_fkey" FOREIGN KEY ("organizationId", "divisionId") REFERENCES "divisions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_organizationId_academicYearId_fkey" FOREIGN KEY ("organizationId", "academicYearId") REFERENCES "academic_years"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_assignments" ADD CONSTRAINT "faculty_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_assignments" ADD CONSTRAINT "faculty_assignments_organizationId_subjectOfferingId_fkey" FOREIGN KEY ("organizationId", "subjectOfferingId") REFERENCES "subject_offerings"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_organizationId_subjectOfferingId_fkey" FOREIGN KEY ("organizationId", "subjectOfferingId") REFERENCES "subject_offerings"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_organizationId_divisionId_fkey" FOREIGN KEY ("organizationId", "divisionId") REFERENCES "divisions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_organizationId_facultyAssignmentId_fkey" FOREIGN KEY ("organizationId", "facultyAssignmentId") REFERENCES "faculty_assignments"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_organizationId_timeSlotId_fkey" FOREIGN KEY ("organizationId", "timeSlotId") REFERENCES "time_slots"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_organizationId_roomId_fkey" FOREIGN KEY ("organizationId", "roomId") REFERENCES "rooms"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_organizationId_divisionId_fkey" FOREIGN KEY ("organizationId", "divisionId") REFERENCES "divisions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_organizationId_subjectOfferingId_fkey" FOREIGN KEY ("organizationId", "subjectOfferingId") REFERENCES "subject_offerings"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_organizationId_facultyAssignmentId_fkey" FOREIGN KEY ("organizationId", "facultyAssignmentId") REFERENCES "faculty_assignments"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_organizationId_roomId_fkey" FOREIGN KEY ("organizationId", "roomId") REFERENCES "rooms"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_correctedByUserId_fkey" FOREIGN KEY ("correctedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationToSemesterCatalog" ADD CONSTRAINT "_OrganizationToSemesterCatalog_A_fkey" FOREIGN KEY ("A") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationToSemesterCatalog" ADD CONSTRAINT "_OrganizationToSemesterCatalog_B_fkey" FOREIGN KEY ("B") REFERENCES "semester_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CurriculumVersionToOrganization" ADD CONSTRAINT "_CurriculumVersionToOrganization_A_fkey" FOREIGN KEY ("A") REFERENCES "curriculum_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CurriculumVersionToOrganization" ADD CONSTRAINT "_CurriculumVersionToOrganization_B_fkey" FOREIGN KEY ("B") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
