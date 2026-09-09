export interface FeeStructureDto {
  id: number;
  tenantId: number;
  classLevelId: number;
  classLevelCode: string;
  classLevelName: string;
  schoolYearId: number;
  schoolYearLabel: string;
  registrationFee: number;
  reRegistrationFee: number;
  monthlyTuitionFee: number;
  /** Non null = scolarité saisie en mode annuel (toggle Annuelle). */
  annualTuitionFee: number | null;
  suppliesFee: number;
  suppliesColumnEnabled: boolean;
  currency: string;
  /** true si des encaissements existent déjà pour ce niveau / année. */
  locked?: boolean;
}

export interface FeeStructureWritePayload {
  classLevelId: number;
  schoolYearId: number;
  registrationFee: number;
  reRegistrationFee: number;
  /** Mode mensuel : montant ; mode annuel : 0. */
  monthlyTuitionFee: number;
  /** Mode annuel : montant ; mode mensuel : null. */
  annualTuitionFee: number | null;
  suppliesFee: number;
  suppliesColumnEnabled: boolean;
  currency: string;
}

export type TuitionInputMode = 'MONTHLY' | 'ANNUAL';

export function resolveTuitionInputMode(fs: Pick<FeeStructureDto, 'annualTuitionFee'> | null | undefined): TuitionInputMode {
  return fs?.annualTuitionFee != null ? 'ANNUAL' : 'MONTHLY';
}

export function resolveTuitionDisplayAmount(fs: FeeStructureDto | null | undefined): number | null {
  if (!fs) {
    return null;
  }
  if (fs.annualTuitionFee != null) {
    return Number(fs.annualTuitionFee);
  }
  return Number(fs.monthlyTuitionFee ?? 0);
}
