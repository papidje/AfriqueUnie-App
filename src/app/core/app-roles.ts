/**
 * Rôles alignés sur {@code User.UserRole} (backend) et sur {@code schools.users.role} (PostgreSQL).
 * Les claims JWT / Spring Security utilisent le préfixe {@code ROLE_}.
 */
export const UserRoleName = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_ECOLE: 'ADMIN_ECOLE',
  STAFF: 'STAFF',
  TEACHER: 'TEACHER',
} as const;

export type UserRoleNameType = (typeof UserRoleName)[keyof typeof UserRoleName];

/** Autorités Spring / tableau {@code roles} dans le JWT. */
export const AppRoles = {
  SUPER_ADMIN: 'ROLE_SUPER_ADMIN',
  ADMIN_ECOLE: 'ROLE_ADMIN_ECOLE',
  STAFF: 'ROLE_STAFF',
  TEACHER: 'ROLE_TEACHER',
} as const;

export type AppRoleAuthority = (typeof AppRoles)[keyof typeof AppRoles];

export const ALL_APP_ROLES: AppRoleAuthority[] = [
  AppRoles.SUPER_ADMIN,
  AppRoles.ADMIN_ECOLE,
  AppRoles.STAFF,
  AppRoles.TEACHER,
];

/** Navigation / routes : élèves */
export const ROLES_STUDENTS_NAV: AppRoleAuthority[] = [
  AppRoles.SUPER_ADMIN,
  AppRoles.ADMIN_ECOLE,
  AppRoles.STAFF,
];

/** Navigation / routes : classes (année active + ouverture de classe) */
export const ROLES_CLASSES_NAV: AppRoleAuthority[] = [
  AppRoles.ADMIN_ECOLE,
  AppRoles.STAFF,
  AppRoles.TEACHER,
];

/** Création / paramétrage année scolaire (même périmètre que les classes). */
export const ROLES_SCHOOL_YEAR_NAV: AppRoleAuthority[] = [...ROLES_CLASSES_NAV];

/** Navigation : gestion utilisateurs (hors staff-only) */
export const ROLES_USERS_NAV: AppRoleAuthority[] = [
  AppRoles.SUPER_ADMIN,
  AppRoles.ADMIN_ECOLE,
];
