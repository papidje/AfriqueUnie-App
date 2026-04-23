export interface ParentRegistrationDto {
  lastName: string;
  firstName: string;
  phone: string;
  email?: string | null;
  profession?: string | null;
  address?: string | null;
}

export interface StudentRegistrationDto {
  civility: 'MONSIEUR' | 'MADAME';
  firstName: string;
  lastName: string;
  birthDate: string; // yyyy-mm-dd
  emergencyContactName: string;
  emergencyContactPhone: string;
}

/** Valeurs `PaymentMode` côté API (inscription / encaissement). */
export type RegistrationPaymentMode = 'ESPECES' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'VIREMENT';

export interface RegistrationDto {
  student: StudentRegistrationDto;
  father: ParentRegistrationDto;
  mother: ParentRegistrationDto;
  classId: number;
  /** 0 ou omis : pas de paiement à l’inscription (encaissement séparé). */
  amountPaid?: number | null;
  currency?: string | null;
  paymentMode?: RegistrationPaymentMode | null;
}

/** Réponse POST `/api/student-registrations` (élève créé). */
export interface StudentRegistrationResponse {
  id: number;
  civility?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  matricule?: string | null;
}

export interface ParentDto {
  id: number;
  tenantId: number;
  lastName: string;
  firstName: string;
  phone: string;
  email?: string | null;
  profession?: string | null;
  address?: string | null;
}
