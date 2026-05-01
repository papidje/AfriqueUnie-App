/** Aligné sur {@code GradingDtos} (backend). */

export interface ClassSubjectColumn {
  classSubjectId: number;
  subjectCode: string;
  subjectName: string;
  coefficient: number;
}

export interface PeriodNotesGridRow {
  studentId: number;
  lastName: string;
  firstName: string;
  /** Une entrée par colonne, dans l’ordre de {@code columns} ; null si pas de moyenne. */
  averages: (number | null)[];
  generalAverage: number | null;
}

export interface PeriodNotesGridResponse {
  classId: number;
  gradingPeriodId: number;
  gradingPeriodName: string;
  /** Poids de la composition (0–1), identique à la config serveur. */
  compositionWeight: number;
  columns: ClassSubjectColumn[];
  rows: PeriodNotesGridRow[];
  /** ISO-8601 : dernier recalcul batch. */
  snapshotAsOf: string | null;
  dataFromSnapshot: boolean;
}

/** Ligne matière pour le bulletin / fiche élève (aligné {@code StudentPeriodSubjectRow}). */
export interface StudentPeriodSubjectRow {
  classSubjectId: number;
  subjectCode: string;
  subjectName: string;
  coefficient: number;
  continuousAverage: number | null;
  compositionAverage: number | null;
  periodFinalAverage: number | null;
}

/** Tableau de bord notes d’un élève sur une période (aligné {@code StudentPeriodDashboardResponse}). */
export interface StudentPeriodDashboardResponse {
  studentId: number;
  gradingPeriodId: number;
  gradingPeriodName: string;
  classId: number;
  compositionWeight: number;
  generalAverage: number | null;
  rankInClass: number | null;
  classSize: number;
  evaluatedEvaluationsCount: number;
  subjects: StudentPeriodSubjectRow[];
  /** ISO-8601 : dernier recalcul batch. */
  snapshotAsOf: string | null;
  dataFromSnapshot: boolean;
}
