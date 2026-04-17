/** Élément déplaçable (palette ou cellule du grille). */
export interface TimetableDragItem {
  classSubjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherFullname?: string | null;
}

export interface TimetableSlotDto {
  id: number;
  dayOfWeek: number;
  slotIndex: number;
  classSubjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherFullname: string | null;
}

export interface TimetableViewDto {
  classId: number;
  slots: TimetableSlotDto[];
}

export interface TimetableCellWriteDto {
  dayOfWeek: number;
  slotIndex: number;
  classSubjectId: number | null;
}
