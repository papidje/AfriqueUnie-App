/** Réponse GET `/api/parents/by-school/{schoolId}/active-year-enrolled`. */
export interface ParentListRowDto {
  id: number;
  lastName: string;
  firstName: string;
  phone: string;
  email: string | null;
  enrolledChildrenCount: number;
  asFatherCount?: number | null;
  asMotherCount?: number | null;
}

/** Rôle affiché pour l’icône père/mère sur la liste parents. */
export function parentListGenderRole(row: ParentListRowDto): string {
  const asFather = Number(row.asFatherCount || 0) > 0;
  const asMother = Number(row.asMotherCount || 0) > 0;
  if (asFather && asMother) {
    return 'PERE_ET_MERE';
  }
  if (asMother) {
    return 'MERE';
  }
  if (asFather) {
    return 'PERE';
  }
  return '';
}
