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

export interface SchoolClassDto {
  id: number;
  name: string;
  /** Présent sur l’endpoint overview et sur l’entité classe. */
  capacity?: number;
  enrolledStudentCount?: number;
  subjectCount?: number;
  year?: { id: number; label?: string };
  level?: ClassLevel;
}
