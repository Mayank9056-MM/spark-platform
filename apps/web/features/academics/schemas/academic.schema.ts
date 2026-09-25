import { z } from 'zod';

// Department
export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Department = z.infer<typeof departmentSchema>;

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(150),
  code: z
    .string()
    .trim()
    .min(1, 'Department code is required')
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, 'Must be uppercase alphanumeric, hyphens, or underscores'),
});
export type CreateDepartmentFormValues = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(150),
});
export type UpdateDepartmentFormValues = z.infer<typeof updateDepartmentSchema>;

// Program
export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  departmentId: z.string(),
  durationYears: z.number(),
  totalSemesters: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Program = z.infer<typeof programSchema>;

export const createProgramSchema = z.object({
  name: z.string().trim().min(1, 'Program name is required').max(150),
  code: z
    .string()
    .trim()
    .min(1, 'Program code is required')
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, 'Must be uppercase alphanumeric, hyphens, or underscores'),
  departmentId: z.string().uuid('Valid department must be selected'),
  durationYears: z.coerce.number().int().min(1).max(6),
  totalSemesters: z.coerce.number().int().min(1).max(12),
});
export type CreateProgramFormValues = z.infer<typeof createProgramSchema>;

// Academic Year
export const academicYearSchema = z.object({
  id: z.string(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AcademicYear = z.infer<typeof academicYearSchema>;

export const createAcademicYearSchema = z.object({
  label: z.string().trim().min(1, 'Academic year label is required (e.g. 2025-26)').max(50),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});
export type CreateAcademicYearFormValues = z.infer<typeof createAcademicYearSchema>;

// Curriculum Version
export const CURRICULUM_STATUSES = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type CurriculumStatus = (typeof CURRICULUM_STATUSES)[number];

export const curriculumVersionSchema = z.object({
  id: z.string(),
  programId: z.string(),
  label: z.string(),
  status: z.enum(CURRICULUM_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CurriculumVersion = z.infer<typeof curriculumVersionSchema>;

export const createCurriculumVersionSchema = z.object({
  programId: z.string().uuid('Valid program must be selected'),
  label: z.string().trim().min(1, 'Curriculum label required (e.g. R22-CSE)').max(100),
});
export type CreateCurriculumVersionFormValues = z.infer<typeof createCurriculumVersionSchema>;

export const updateCurriculumVersionSchema = z.object({
  label: z.string().trim().min(1, 'Curriculum label required').max(100),
});
export type UpdateCurriculumVersionFormValues = z.infer<typeof updateCurriculumVersionSchema>;

// Curriculum Structure Schemas
export const curriculumStructureSubjectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  isElective: z.boolean(),
  electiveGroupId: z.string().nullable(),
});
export type CurriculumStructureSubject = z.infer<typeof curriculumStructureSubjectSchema>;

export const curriculumStructureElectiveGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  minSelect: z.number(),
  maxSelect: z.number(),
});
export type CurriculumStructureElectiveGroup = z.infer<
  typeof curriculumStructureElectiveGroupSchema
>;

export const curriculumStructureSemesterSchema = z.object({
  id: z.string(),
  number: z.number(),
  subjects: z.array(curriculumStructureSubjectSchema),
  electiveGroups: z.array(curriculumStructureElectiveGroupSchema),
});
export type CurriculumStructureSemester = z.infer<typeof curriculumStructureSemesterSchema>;

export const curriculumStructureSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(CURRICULUM_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
  program: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    durationYears: z.number(),
    totalSemesters: z.number(),
  }),
  department: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
  }),
  semesters: z.array(curriculumStructureSemesterSchema),
});
export type CurriculumStructure = z.infer<typeof curriculumStructureSchema>;

// Semester Catalog
export const semesterCatalogSchema = z.object({
  id: z.string(),
  curriculumVersionId: z.string(),
  number: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SemesterCatalog = z.infer<typeof semesterCatalogSchema>;

export const createSemesterCatalogSchema = z.object({
  curriculumVersionId: z.string().uuid('Valid curriculum version required'),
  number: z.coerce.number().int().positive('Semester number must be positive'),
});
export type CreateSemesterCatalogFormValues = z.infer<typeof createSemesterCatalogSchema>;

// Subject Schemas
export const subjectSchema = z.object({
  id: z.string(),
  semesterCatalogId: z.string(),
  electiveGroupId: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  isElective: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Subject = z.infer<typeof subjectSchema>;

export const createSubjectSchema = z.object({
  semesterCatalogId: z.string().uuid('Valid semester catalog required'),
  code: z.string().trim().min(1, 'Subject code is required').max(20),
  name: z.string().trim().min(1, 'Subject name is required').max(150),
  isElective: z.boolean().optional(),
  electiveGroupId: z.string().uuid().optional(),
});
export type CreateSubjectFormValues = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = z.object({
  code: z.string().trim().min(1, 'Subject code is required').max(20).optional(),
  name: z.string().trim().min(1, 'Subject name is required').max(150).optional(),
  isElective: z.boolean().optional(),
  electiveGroupId: z.string().uuid().nullable().optional(),
});
export type UpdateSubjectFormValues = z.infer<typeof updateSubjectSchema>;

// Elective Group Schemas
export const electiveGroupSchema = z.object({
  id: z.string(),
  semesterCatalogId: z.string(),
  name: z.string(),
  minSelect: z.number(),
  maxSelect: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ElectiveGroup = z.infer<typeof electiveGroupSchema>;

export const createElectiveGroupSchema = z.object({
  semesterCatalogId: z.string().uuid('Valid semester catalog required'),
  name: z.string().trim().min(1, 'Elective group name is required').max(150),
  minSelect: z.coerce.number().int().positive('minSelect must be a positive integer').optional(),
  maxSelect: z.coerce.number().int().positive('maxSelect must be a positive integer').optional(),
});
export type CreateElectiveGroupFormValues = z.infer<typeof createElectiveGroupSchema>;

export const updateElectiveGroupSchema = z.object({
  name: z.string().trim().min(1, 'Elective group name is required').max(150).optional(),
  minSelect: z.coerce.number().int().positive('minSelect must be a positive integer').optional(),
  maxSelect: z.coerce.number().int().positive('maxSelect must be a positive integer').optional(),
});
export type UpdateElectiveGroupFormValues = z.infer<typeof updateElectiveGroupSchema>;
