import { FeeStructureDto } from '../../models/fee-structure.models';

/** Même ordre que le backend (FinanceService.allocateAndPersistFromDeclaredTotal). */
export const REGISTRATION_MONTH_ORDER = [
  'OCT',
  'NOV',
  'DEC',
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN'
] as const;

const MONTH_LABELS: Record<string, string> = {
  OCT: 'Octobre',
  NOV: 'Novembre',
  DEC: 'Décembre',
  JAN: 'Janvier',
  FEB: 'Février',
  MAR: 'Mars',
  APR: 'Avril',
  MAY: 'Mai',
  JUN: 'Juin'
};

export interface RegistrationAllocationLine {
  id: string;
  label: string;
  amount: number;
}

export function maxOpenDeclarationAmount(fs: FeeStructureDto): number {
  const reg = Math.max(0, Number(fs.registrationFee ?? 0));
  const sup = fs.suppliesColumnEnabled ? Math.max(0, Number(fs.suppliesFee ?? 0)) : 0;
  const monthly = Math.max(0, Number(fs.monthlyTuitionFee ?? 0));
  return reg + sup + monthly * REGISTRATION_MONTH_ORDER.length;
}

/**
 * Simule la répartition pour un montant saisi (plafonné au reliquat théorique total).
 */
export function computeRegistrationAllocationLines(
  amountInput: number,
  fs: FeeStructureDto
): RegistrationAllocationLine[] {
  const maxOpen = maxOpenDeclarationAmount(fs);
  const total = Math.min(Math.max(0, amountInput), maxOpen);
  if (total <= 0) {
    return [];
  }
  const reg = Math.max(0, Number(fs.registrationFee ?? 0));
  const suppliesOn = !!fs.suppliesColumnEnabled;
  const supFee = suppliesOn ? Math.max(0, Number(fs.suppliesFee ?? 0)) : 0;
  const monthly = Math.max(0, Number(fs.monthlyTuitionFee ?? 0));

  let R = total;
  const lines: RegistrationAllocationLine[] = [];

  if (reg > 0 && R > 0) {
    const pay = Math.min(R, reg);
    lines.push({ id: 'ins', label: 'Inscription', amount: pay });
    R -= pay;
  }
  if (suppliesOn && supFee > 0 && R >= supFee) {
    lines.push({ id: 'sup', label: 'Fournitures', amount: supFee });
    R -= supFee;
  }
  for (const code of REGISTRATION_MONTH_ORDER) {
    if (R <= 0) {
      break;
    }
    const remain = monthly;
    const pay = Math.min(R, remain);
    if (pay > 0) {
      lines.push({
        id: `m-${code}`,
        label: `Scolarité (${MONTH_LABELS[code] ?? code})`,
        amount: pay
      });
      R -= pay;
    }
  }
  return lines;
}
