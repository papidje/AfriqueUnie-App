/** Matière du référentiel (évite la collision avec {@link import('rxjs').Subject}). */
export interface SchoolSubject {
  id: number;
  code: string;
  name: string;
  /** Absent ou `null` = référentiel global ; sinon matière propre à l’établissement. */
  schoolId?: number | null;
}

export interface ClassSubjectRow {
  id: number;
  classId: number;
  schoolId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  coefficient: number;
  teacherId: number | null;
  teacherFullname: string | null;
}

export interface ClassPlanningView {
  classId: number;
  className: string;
  schoolId: number;
  subjects: ClassSubjectRow[];
}

export interface TeacherSummary {
  id: number;
  fullname: string;
  email: string | null;
}

export interface CreateClassSubjectPayload {
  subjectId: number;
  coefficient: number;
  teacherId?: number | null;
}
