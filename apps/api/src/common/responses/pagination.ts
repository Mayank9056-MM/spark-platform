export type AcademicYearId = string;

export interface AcademicYearDTO {
  readonly id: AcademicYearId;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAcademicYearInput {
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface UpdateAcademicYearInput {
  readonly label?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface ListAcademicYearsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'label' | 'startDate' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListAcademicYearsResult {
  readonly academicYears: AcademicYearDTO[];
  readonly total: number;
}
