/** Réponse GET `/api/parents/by-school/{schoolId}/active-year-enrolled`. */
export interface ParentListRowDto {
  id: number;
  lastName: string;
  firstName: string;
  phone: string;
  email: string | null;
  enrolledChildrenCount: number;
}
