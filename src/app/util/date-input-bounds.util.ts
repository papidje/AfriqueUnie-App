/**
 * Bornes de saisie pour les champs date (calendrier local, format YYYY-MM-DD).
 */

export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addCalendarMonths(base: Date, months: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + months, base.getDate());
}

function addCalendarYears(base: Date, years: number): Date {
  return new Date(base.getFullYear() + years, base.getMonth(), base.getDate());
}

/** Élève : âge entre 3 mois et 30 ans → date de naissance dans [today−30y, today−3m]. */
export function studentBirthDateBounds(now = new Date()): { min: string; max: string } {
  return {
    min: toYmdLocal(addCalendarYears(now, -30)),
    max: toYmdLocal(addCalendarMonths(now, -3))
  };
}

/** Staff / profil : âge entre 18 et 100 ans. */
export function staffBirthDateBounds(now = new Date()): { min: string; max: string } {
  return {
    min: toYmdLocal(addCalendarYears(now, -100)),
    max: toYmdLocal(addCalendarYears(now, -18))
  };
}

/** Dates Date pour Material datepicker (profil). */
export function staffBirthDateBoundsAsDate(now = new Date()): { min: Date; max: Date } {
  return {
    min: addCalendarYears(now, -100),
    max: addCalendarYears(now, -18)
  };
}

/**
 * Ouverture d’établissement : du 1er janvier 1958 au 31 octobre de l’année civile courante.
 */
export function schoolOpenDateBounds(now = new Date()): { min: string; max: string } {
  const max = new Date(now.getFullYear(), 9, 31); // octobre = mois 9
  return { min: '1958-01-01', max: toYmdLocal(max) };
}

/** Extrait YYYY-MM-DD depuis une valeur API flexible. */
export function toDateInputValue(raw: unknown): string {
  if (typeof raw === 'string' && raw.length >= 10) {
    return raw.slice(0, 10);
  }
  if (Array.isArray(raw) && raw.length >= 3) {
    const y = Number(raw[0]);
    const m = Number(raw[1]);
    const d = Number(raw[2]);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return '';
}
