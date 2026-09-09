import { FeeStructureDto } from '../../models/fee-structure.models';

/** Même ordre que le backend (FinanceService / TuitionMonthDues). */
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

export function tuitionTotalExpected(fs: FeeStructureDto, payablePercent = 100): number {
  const catalog =
    fs.annualTuitionFee != null
      ? Math.max(0, Number(fs.annualTuitionFee))
      : Math.max(0, Number(fs.monthlyTuitionFee ?? 0)) * REGISTRATION_MONTH_ORDER.length;
  const p = Math.max(0, Math.min(100, Number(payablePercent) || 0));
  if (p >= 100) {
    return catalog;
  }
  if (p <= 0) {
    return 0;
  }
  return Math.round(catalog * (p / 100));
}

/** Dûs mensuels Oct→Juin après application du % à payer. */
export function tuitionMonthDues(fs: FeeStructureDto, payablePercent = 100): number[] {
  const base =
    fs.annualTuitionFee != null
      ? duesFromAnnual(Math.max(0, Number(fs.annualTuitionFee)))
      : REGISTRATION_MONTH_ORDER.map(() => Math.max(0, Number(fs.monthlyTuitionFee ?? 0)));
  const p = Math.max(0, Math.min(100, Number(payablePercent) || 0));
  if (p >= 100) {
    return base;
  }
  if (p <= 0) {
    return REGISTRATION_MONTH_ORDER.map(() => 0);
  }
  return duesFromAnnual(Math.round(tuitionTotalExpected(fs, 100) * (p / 100)));
}

/**
 * Annuelle : autres mois au millier inférieur de (annuel / 9) ;
 * 1er mois = reste (ex. 1 675 000 → 187 000 + 8 × 186 000).
 */
export function duesFromAnnual(annualRaw: number): number[] {
  const annual = Math.max(0, Math.round(annualRaw));
  const count = REGISTRATION_MONTH_ORDER.length;
  if (annual === 0) {
    return Array(count).fill(0);
  }
  const average = Math.floor(annual / count);
  const otherMonths = Math.floor(average / 1000) * 1000;
  const firstMonth = annual - otherMonths * (count - 1);
  return [firstMonth, ...Array(count - 1).fill(otherMonths)];
}

export function maxOpenDeclarationAmount(fs: FeeStructureDto): number {
  const reg = Math.max(0, Number(fs.registrationFee ?? 0));
  const sup = fs.suppliesColumnEnabled ? Math.max(0, Number(fs.suppliesFee ?? 0)) : 0;
  return reg + sup + tuitionTotalExpected(fs);
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
  const dues = tuitionMonthDues(fs);

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
  for (let i = 0; i < REGISTRATION_MONTH_ORDER.length; i++) {
    if (R <= 0) {
      break;
    }
    const code = REGISTRATION_MONTH_ORDER[i];
    const remain = dues[i] ?? 0;
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
