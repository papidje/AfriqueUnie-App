import { formatDate } from '@angular/common';

const LOCALE = 'fr-FR';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Fallback si les données de locale ne sont pas chargées ou si formatDate échoue. */
function manualFormat(d: Date, kind: 'date' | 'datetime' | 'at'): string {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const HH = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  if (kind === 'date') {
    return `${dd}/${mm}/${yyyy}`;
  }
  if (kind === 'datetime') {
    return `${dd}/${mm}/${yyyy} ${HH}:${min}`;
  }
  return `${dd}/${mm}/${yyyy} à ${HH}:${min}`;
}

function safeFormat(d: Date, kind: 'date' | 'datetime' | 'at'): string {
  try {
    if (kind === 'date') {
      return formatDate(d, 'dd/MM/yyyy', LOCALE);
    }
    if (kind === 'datetime') {
      return formatDate(d, 'dd/MM/yyyy HH:mm', LOCALE);
    }
    return formatDate(d, "dd/MM/yyyy 'à' HH:mm", LOCALE);
  } catch {
    return manualFormat(d, kind);
  }
}

/** Parse une date « flexible » : ISO date seule, ISO datetime, tableau [y,m,d], Date, nombre (ms). */
export function parseFlexibleDate(value: unknown): Date | null {
  if (value == null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (dateOnly) {
      return new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const y = Number(value[0]);
    const mo = Number(value[1]);
    const day = Number(value[2]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) {
      return null;
    }
    return new Date(y, mo - 1, day);
  }
  return null;
}

/** Affichage type 30/06/2026 */
export function formatDisplayDate(value: unknown): string {
  const d = parseFlexibleDate(value);
  return d == null ? '—' : safeFormat(d, 'date');
}

/** Affichage type 30/06/2026 14:30 */
export function formatDisplayDateTime(value: unknown): string {
  const d = parseFlexibleDate(value);
  return d == null ? '—' : safeFormat(d, 'datetime');
}

/** Affichage type 30/06/2026 à 14:30 */
export function formatDisplayDateTimeAt(value: unknown): string {
  const d = parseFlexibleDate(value);
  return d == null ? '—' : safeFormat(d, 'at');
}
