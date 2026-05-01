export interface ClassLevelGroupRef {
  id: number;
  code: string;
  name: string;
}

export interface ClassLevel {
  id: number;
  code: string;
  name: string;
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

export interface SchoolClassDto {
  id: number;
  name: string;
  /** Présent sur l’endpoint overview et sur l’entité classe. */
  capacity?: number;
  /** 3 trimestres ou 2 semestres (périodes générées à la création). */
  periodType?: SchoolClassPeriodType;
  enrolledStudentCount?: number;
  subjectCount?: number;
  year?: { id: number; label?: string };
  level?: ClassLevel;
}
