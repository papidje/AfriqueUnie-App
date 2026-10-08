export interface ClassLevelGroupRef {
  id: number;
  code: string;
  name: string;
  sortOrder?: number;
}

export interface ClassLevel {
  id: number;
  code: string;
  name: string;
  sortOrder?: number;
  group?: ClassLevelGroupRef | null;
}

export interface SchoolYearDto {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

/** Corps attendu par {@code POST /api/school-years} (école + champs métier). */
export interface CreateSchoolYearPayload {
  school: { id: number };
  label: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

/** Aligné sur {@code PeriodType} côté API. */
export type SchoolClassPeriodType = 'TRIMESTER' | 'SEMESTER';

/** Filière lycée (Baccalauréat Unique). */
export type AcademicStream = 'SE' | 'SM' | 'SS';

export interface SchoolClassDto {
  id: number;
  name: string;
  /** Présent sur l’endpoint overview et sur l’entité classe. */
  capacity?: number;
  /** 3 trimestres ou 2 semestres (périodes générées à la création). */
  periodType?: SchoolClassPeriodType;
  /** Filière lycée ; absente hors groupe LYC. */
  stream?: AcademicStream | null;
  enrolledStudentCount?: number;
  subjectCount?: number;
  year?: { id: number; label?: string; startDate?: string; endDate?: string };
  level?: ClassLevel;
}
