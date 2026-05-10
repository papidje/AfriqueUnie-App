/**
 * Rôles alignés sur {@code User.UserRole} (backend) et sur {@code schools.users.role} (PostgreSQL).
 * Les claims JWT / Spring Security utilisent le préfixe {@code ROLE_}.
 */
export const UserRoleName = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_ECOLE: 'ADMIN_ECOLE',
  DIRECTOR: 'DIRECTOR',
  STAFF: 'STAFF',
  TEACHER: 'TEACHER',
  ACCOUNTANT: 'ACCOUNTANT',
} as const;

export type UserRoleNameType = (typeof UserRoleName)[keyof typeof UserRoleName];

/** Autorités Spring / tableau {@code roles} dans le JWT. */
export const AppRoles = {
  SUPER_ADMIN: 'ROLE_SUPER_ADMIN',
  ADMIN_ECOLE: 'ROLE_ADMIN_ECOLE',
  DIRECTOR: 'ROLE_DIRECTOR',
  STAFF: 'ROLE_STAFF',
  TEACHER: 'ROLE_TEACHER',
  ACCOUNTANT: 'ROLE_ACCOUNTANT',
} as const;

export type AppRoleAuthority = (typeof AppRoles)[keyof typeof AppRoles];

/**
 * Rôles de l’app école (dashboard, pédagogie, finances) — le super-admin est cantonné à `/super-admin`.
 */
export const SCHOOL_PORTAL_ROLES: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
  AppRoles.STAFF,
  AppRoles.TEACHER,
  AppRoles.ACCOUNTANT,
];

/** Tous les rôles (ex. saisie, contrôles) — inclut le super-admin. */
export const ALL_APP_ROLES: AppRoleAuthority[] = [...SCHOOL_PORTAL_ROLES, AppRoles.SUPER_ADMIN];

/** Navigation / routes : élèves (GET `/api/students` + fiche, aligné backend). */
export const ROLES_STUDENTS_NAV: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
  AppRoles.STAFF,
  AppRoles.TEACHER,
  AppRoles.ACCOUNTANT,
];

/** Édition fiche élève / parent (PUT/DELETE côté API, hors comptable). */
export const ROLES_STUDENT_WRITE: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
  AppRoles.STAFF,
];

/** Navigation / routes : classes (année active + ouverture de classe) */
export const ROLES_CLASSES_NAV: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
  AppRoles.STAFF,
  AppRoles.TEACHER,
];

/** Inscriptions (route dédiée) : pas les enseignants. */
export const ROLES_STUDENT_REGISTRATION: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
  AppRoles.STAFF,
];

/** Création d’année scolaire : admin, directeur, staff (pas enseignant / comptable). */
export const ROLES_SCHOOL_YEAR_NAV: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
  AppRoles.STAFF,
];

/** Navigation : gestion utilisateurs (hors staff-only) */
export const ROLES_USERS_NAV: AppRoleAuthority[] = [
  AppRoles.SUPER_ADMIN,
  AppRoles.ADMIN_ECOLE,
];

/** Navigation : lien « Finance » (hors enseignants). */
export const ROLES_FINANCIAL_NAV: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
  AppRoles.STAFF,
  AppRoles.ACCOUNTANT,
];

/** Centre de communication (API `/api/communication`) : admin, directeur, staff uniquement. */
export const ROLES_COMMUNICATION_NAV: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
  AppRoles.STAFF,
];

/** Paramètres des tarifs (barèmes) : directeur + admin établissement uniquement. */
export const ROLES_FEE_SETTINGS_NAV: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
];

/** Module administration Angular (/admin) : jamais le staff. */
export const ROLES_ADMIN_MODULE: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.DIRECTOR,
];
