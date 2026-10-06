export interface StudentListRow {
  id: number;
  civility: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  matricule: string;
  enrollmentStatus?: string | null;
  communicationPhone?: string | null;
}

export interface ParentDetailDto {
  id: number;
  tenantId?: number;
  /** MONSIEUR | MADAME (peut être absent sur les fiches anciennes). */
  civility?: string | null;
  lastName: string;
  firstName: string;
  phone: string;
  email: string | null;
  profession: string | null;
  address: string | null;
  children?: ParentChildRowDto[] | null;
}

export interface ParentChildRowDto {
  id: number;
  firstName: string;
  lastName: string;
  matricule?: string | null;
  className?: string | null;
  enrollmentStatus?: string | null;
  /** PERE | MERE | PERE_ET_MERE | TUTEUR */
  relation?: string | null;
  /** MONSIEUR | MADAME */
  civility?: string | null;
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
  /** Numéro de carte scolaire (modifiable). */
  cardNumber?: string | null;
  address?: string | null;
  communicationPhone?: string | null;
  communicationEmail?: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  photoPath?: string | null;
  enrollmentStatus?: string | null;
  classHistory?: string | null;
  /** Présent si l’élève est affecté à une classe (périodes de notation, bulletin). */
  schoolClassId?: number | null;
  schoolClassName?: string | null;
  schoolId?: number | null;
  schoolYearLabel?: string | null;
  father: ParentDetailDto | null;
  mother: ParentDetailDto | null;
  tutor: ParentDetailDto | null;
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
  enrollmentStatus?: string | null;
  classHistory?: string | null;
  cardNumber?: string | null;
}
