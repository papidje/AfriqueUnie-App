import {
  MonthlyTuitionStatusDto,
  StudentPaymentInfoDto
} from '../../models/finance.models';

export interface PaymentProgressSegment {
  id: string;
  label: string;
  fullLabel: string;
  due: number;
  paid: number;
  kind: 'insReins' | 'supplies' | 'month';
  endCumulative: number;
}

export interface PaymentProgressModel {
  segments: PaymentProgressSegment[];
  totalDue: number;
  paidTotal: number;
  maxRemaining: number;
  inscriptionDueAmount: number;
  monthlyUnitAmount: number;
}

export function buildPaymentProgressModel(info: StudentPaymentInfoDto): PaymentProgressModel {
  const rows: PaymentProgressSegment[] = [];
  let cumulative = 0;

  const insDue = Math.max(0, Number(info.insReinsExpected || 0));
  const insPaid = Math.max(0, Math.min(insDue, Number(info.insReinsPaid || 0)));
  const inscriptionDueAmount = insDue;
  if (insDue > 0) {
    cumulative += insDue;
    const full = info.insReinsType === 'REINSCRIPTION' ? 'Réinscription' : 'Inscription';
    rows.push({
      id: 'ins-reins',
      label: info.insReinsType === 'REINSCRIPTION' ? 'Réins.' : 'Ins.',
      fullLabel: full,
      due: insDue,
      paid: insPaid,
      kind: 'insReins',
      endCumulative: cumulative
    });
  }

  const suppliesOn = info.suppliesColumnEnabled !== false;
  const suppliesDue = suppliesOn ? Math.max(0, Number(info.suppliesExpected || 0)) : 0;
  if (suppliesDue > 0) {
    const suppliesPaid = info.suppliesPaid ? suppliesDue : 0;
    cumulative += suppliesDue;
    rows.push({
      id: 'supplies',
      label: 'Four.',
      fullLabel: 'Fournitures',
      due: suppliesDue,
      paid: suppliesPaid,
      kind: 'supplies',
      endCumulative: cumulative
    });
  }

  const monthAmounts: number[] = [];
  for (const m of info.monthlyTuition ?? []) {
    const due = Math.max(0, Number(m.dueAmount || 0));
    if (due <= 0) {
      continue;
    }
    const paid = Math.max(0, Math.min(due, Number(m.paidAmount || 0)));
    cumulative += due;
    monthAmounts.push(due);
    rows.push({
      id: `month-${m.monthCode}`,
      label: abbreviateMonth(m),
      fullLabel: m.monthLabel || m.monthCode,
      due,
      paid,
      kind: 'month',
      endCumulative: cumulative
    });
  }

  const totalDue = cumulative;
  const paidTotal = rows.reduce((s, r) => s + r.paid, 0);
  return {
    segments: rows,
    totalDue,
    paidTotal,
    maxRemaining: Math.max(0, totalDue - paidTotal),
    inscriptionDueAmount,
    monthlyUnitAmount:
      monthAmounts.length > 0
        ? Math.round(monthAmounts.reduce((a, b) => a + b, 0) / monthAmounts.length)
        : 0
  };
}

export function formatMoneyGnf(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function abbreviateMonth(m: MonthlyTuitionStatusDto): string {
  const code = (m.monthCode || '').toUpperCase();
  const byCode: Record<string, string> = {
    OCT: 'Oct',
    NOV: 'Nov',
    DEC: 'Déc',
    JAN: 'Jan',
    FEB: 'Fév',
    MAR: 'Mar',
    APR: 'Avr',
    MAY: 'Mai',
    JUN: 'Juin'
  };
  if (byCode[code]) {
    return byCode[code];
  }
  const label = (m.monthLabel || '').trim();
  if (label.length <= 4) {
    return label;
  }
  return label.slice(0, 3);
}
