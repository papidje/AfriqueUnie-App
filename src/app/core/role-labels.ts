/** Libellés français pour rôles JWT ({@code ROLE_*}) ou valeurs API ({@code ADMIN_ECOLE}, …). */
const ROLE_LABELS: Record<string, string> = {
  ROLE_SUPER_ADMIN: 'Super administrateur',
  SUPER_ADMIN: 'Super administrateur',
  ROLE_ADMIN_ECOLE: 'Administrateur d’école',
  ADMIN_ECOLE: 'Administrateur d’école',
  ROLE_DIRECTOR: 'Directeur·rice',
  DIRECTOR: 'Directeur·rice',
  ROLE_STAFF: 'Personnel administratif',
  STAFF: 'Personnel administratif',
  ROLE_TEACHER: 'Enseignant(e)',
  TEACHER: 'Enseignant(e)',
  // Ancien rôle API / JWT (fusionné dans STAFF)
  ROLE_ACCOUNTANT: 'Personnel administratif',
  ACCOUNTANT: 'Personnel administratif',
};

export function formatRoleLabel(role: string | null | undefined): string {
  if (!role || !role.trim()) {
    return 'Utilisateur';
  }
  const trimmed = role.trim();
  const withoutPrefix = trimmed.replace(/^ROLE_/, '');
  return ROLE_LABELS[trimmed] ?? ROLE_LABELS[withoutPrefix] ?? ROLE_LABELS[`ROLE_${withoutPrefix}`] ?? trimmed;
}

export function formatRoleLabelsList(roles: string[] | null | undefined): string {
  if (!roles?.length) {
    return 'Aucun rôle attribué';
  }
  return roles.map((r) => formatRoleLabel(r)).join(', ');
}
