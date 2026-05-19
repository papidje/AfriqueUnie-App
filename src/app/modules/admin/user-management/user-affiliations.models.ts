/** Modèle partagé écran annuaire / édition affiliations. */
export interface UserAffiliationVm {
  schoolId: number;
  schoolName: string;
  role: string;
  /** Présent si l’API expose {@code UserAffiliationResponse#active} (annuaire tenant). */
  active?: boolean;
  /** Invitation non acceptée ({@code active} et pas encore visible côté tenant). */
  invitationPending?: boolean;
  /** Compte suspendu pour cet établissement (réactivation possible). */
  reactivationEligible?: boolean;
}
