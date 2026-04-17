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

export interface RegistrationDto {
  student: StudentRegistrationDto;
  father: ParentRegistrationDto;
  mother: ParentRegistrationDto;
  classId: number;
  amountPaid: number;
  currency?: string | null;
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
