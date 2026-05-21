import { UserAffiliationVm } from '../../modules/admin/user-management/user-affiliations.models';

export interface ProfileSchoolSummary {
  id: number;
  name: string;
}

export interface UserProfile {
  username: string;
  fullname: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  biography: string | null;
  email: string;
  isActive: boolean;
  roles: string[];
  /** ISO-8601 ou équivalent renvoyé par l’API */
  lastLoginAt: string | null;
  schools: ProfileSchoolSummary[];
  /** Rôles par établissement (affiliations actives), comme l’annuaire admin. */
  activeAffiliations: UserAffiliationVm[];
}
