export interface StudentListRow {
  id: number;
  civility: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  matricule: string;
}

export interface ParentDetailDto {
  id: number;
  tenantId?: number;
  lastName: string;
  firstName: string;
  phone: string;
  email: string | null;
  profession: string | null;
  address: string | null;
}

export interface StudentDetailDto {
  id: number;
  civility: string;
  firstName: string;
  lastName: string;
  birthDate: string | number[];
  birthPlace?: string | null;
  nationality?: string | null;
  matricule: string;
  address?: string | null;
  communicationPhone?: string | null;
  communicationEmail?: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  tutorName?: string | null;
  tutorProfession?: string | null;
  tutorPhone?: string | null;
  tutorEmail?: string | null;
  photoPath?: string | null;
  enrollmentStatus?: string | null;
  classHistory?: string | null;
  /** Présent si l’élève est affecté à une classe (périodes de notation, bulletin). */
  schoolClassId?: number | null;
  schoolClassName?: string | null;
  schoolYearLabel?: string | null;
  father: ParentDetailDto | null;
  mother: ParentDetailDto | null;
}

export interface StudentProfileUpdatePayload {
  civility?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  address?: string | null;
  communicationPhone?: string | null;
  communicationEmail?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  tutorName?: string | null;
  tutorProfession?: string | null;
  tutorPhone?: string | null;
  tutorEmail?: string | null;
  enrollmentStatus?: string | null;
  classHistory?: string | null;
}
