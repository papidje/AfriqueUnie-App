/** Aligné sur {@code EvaluationType} (backend). */
export type EvaluationType = 'INTERROGATION' | 'DEVOIR' | 'COMPOSITION' | 'QUIZ';

export const EVALUATION_TYPE_OPTIONS: { value: EvaluationType; label: string }[] = [
  { value: 'INTERROGATION', label: 'Interrogation' },
  { value: 'DEVOIR', label: 'Devoir' },
  { value: 'COMPOSITION', label: 'Composition' },
  { value: 'QUIZ', label: 'Quiz' }
];

export interface GradingPeriodSummary {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  /** true si au moins une évaluation existe sur cette période (dates verrouillées). */
  locked: boolean;
}

export interface EvaluationResponse {
  id: number;
  classSubjectId: number;
  gradingPeriodId: number;
  gradingPeriodName: string;
  title: string;
  description: string | null;
  type: EvaluationType;
  coefficient: number;
  /** Barème (note max), ex. 20. */
  maxScore: number;
  startDate: string;
  endDate: string;
  subjectCode: string;
  subjectName: string;
}

export interface CreateEvaluationRequest {
  classSubjectId: number;
  gradingPeriodId: number;
  title: string;
  description: string | null;
  type: EvaluationType;
  coefficient: number;
  maxScore: number;
  startDate: string;
  endDate: string;
}

export interface StudentGradeRowResponse {
  studentId: number;
  lastName: string;
  firstName: string;
  gradeId: number | null;
  value: number | null;
  comment: string | null;
}

export interface GradeSheetResponse {
  evaluation: EvaluationResponse;
  rows: StudentGradeRowResponse[];
}

export interface GradeUpsertRequest {
  studentId: number;
  value: number | null;
  comment: string | null;
}
