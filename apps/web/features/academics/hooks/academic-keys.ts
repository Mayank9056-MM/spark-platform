export const academicKeys = {
  all: ['academics'] as const,
  departments: () => [...academicKeys.all, 'departments'] as const,
  departmentList: (params?: Record<string, unknown>) =>
    [...academicKeys.departments(), 'list', params ?? {}] as const,
  departmentDetail: (id: string) => [...academicKeys.departments(), 'detail', id] as const,

  programs: () => [...academicKeys.all, 'programs'] as const,
  programList: (params?: Record<string, unknown>) =>
    [...academicKeys.programs(), 'list', params ?? {}] as const,
  programDetail: (id: string) => [...academicKeys.programs(), 'detail', id] as const,

  academicYears: () => [...academicKeys.all, 'academic-years'] as const,
  academicYearList: (params?: Record<string, unknown>) =>
    [...academicKeys.academicYears(), 'list', params ?? {}] as const,
  academicYearDetail: (id: string) => [...academicKeys.academicYears(), 'detail', id] as const,

  curricula: () => [...academicKeys.all, 'curricula'] as const,
  curriculumList: (params?: Record<string, unknown>) =>
    [...academicKeys.curricula(), 'list', params ?? {}] as const,
  curriculumDetail: (id: string) => [...academicKeys.curricula(), 'detail', id] as const,
  curriculumStructure: (id: string) => [...academicKeys.curricula(), 'structure', id] as const,

  semesters: () => [...academicKeys.all, 'semesters'] as const,
  semesterList: (params?: Record<string, unknown>) =>
    [...academicKeys.semesters(), 'list', params ?? {}] as const,
  semesterDetail: (id: string) => [...academicKeys.semesters(), 'detail', id] as const,

  subjects: () => [...academicKeys.all, 'subjects'] as const,
  subjectList: (params?: Record<string, unknown>) =>
    [...academicKeys.subjects(), 'list', params ?? {}] as const,

  electives: () => [...academicKeys.all, 'electives'] as const,
  electiveList: (params?: Record<string, unknown>) =>
    [...academicKeys.electives(), 'list', params ?? {}] as const,
};
