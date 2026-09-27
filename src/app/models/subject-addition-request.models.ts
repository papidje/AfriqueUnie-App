/** Demande d’ajout de matière au référentiel global. */
export type SubjectAdditionRequestStatus = 'OPEN' | 'ACCEPTED' | 'REFUSED';

export interface SubjectAdditionRequestSummary {
  id: number;
  subjectName: string;
  status: SubjectAdditionRequestStatus;
  schoolId: number;
  schoolName: string;
  classLevelId: number;
  classLevelCode: string;
  classLevelName: string;
  levelGroupCode: string;
  levelGroupName: string;
  requestedByUserId: number;
  requestedByFullName: string;
  createdAt: string;
  updatedAt?: string | null;
  closedAt?: string | null;
  commentCount: number;
}

export interface SubjectAdditionRequestComment {
  id: number;
  authorUserId: number;
  authorFullName: string;
  authorIsSuperAdmin: boolean;
  body: string;
  createdAt: string;
}

export interface SubjectAdditionRequestDetail extends Omit<SubjectAdditionRequestSummary, 'commentCount'> {
  createdSubjectId?: number | null;
  createdSubjectCode?: string | null;
  comments: SubjectAdditionRequestComment[];
}

export interface CreateSubjectAdditionRequestPayload {
  subjectName: string;
  classLevelId: number;
  comment: string;
}
