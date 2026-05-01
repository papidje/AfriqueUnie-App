/** Élément déplaçable (palette ou cellule du grille). */
export interface TimetableDragItem {
  classSubjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherFullname?: string | null;
}

import type { EvaluationType } from './evaluation.models';

export interface TimetableSlotDto {
  id: number;
  dayOfWeek: number;
  slotIndex: number;
  classSubjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherFullname: string | null;
}

export interface TimetableEvaluationDto {
  id: number;
  title: string;
  type: EvaluationType;
  classSubjectId: number;
  subjectCode: string;
  subjectName: string;
  startDate: string;
  endDate: string;
  gradingPeriodId: number;
  gradingPeriodName: string;
}

export interface TimetableViewDto {
  classId: number;
  slots: TimetableSlotDto[];
  /** Présent si l’URL demande `includeEvaluations=true` et un `weekStart` (lundi de la semaine). */
  evaluations?: TimetableEvaluationDto[];
}

export interface TimetableCellWriteDto {
  dayOfWeek: number;
  slotIndex: number;
  classSubjectId: number | null;
}
