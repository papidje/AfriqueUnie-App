/**
 * Aligne l’heure de début d’une évaluation sur la grille « semaine type »
 * (lundi–vendredi, créneaux 8h–8h+1 … 15h–16h, indices 0..7).
 */
export function evaluationStartToGridCell(startDateIso: string): { dayOfWeek: number; slotIndex: number } | null {
  const d = new Date(startDateIso);
  if (isNaN(d.getTime())) {
    return null;
  }
  const dow = d.getDay();
  if (dow < 1 || dow > 5) {
    return null;
  }
  const h = d.getHours();
  const m = d.getMinutes();
  const fractional = h + m / 60;
  if (fractional < 8) {
    return null;
  }
  if (fractional >= 16) {
    return null;
  }
  const slotIndex = Math.min(7, Math.max(0, Math.floor(fractional) - 8));
  return { dayOfWeek: dow, slotIndex };
}

/**
 * Indique si l’intervalle [startDateIso, endDateIso] chevauche le créneau horaire
 * (lundi–vendredi, 8h + slotIndex → 9h + slotIndex) de la semaine dont le lundi est {@code weekMondayIso} (YYYY-MM-DD).
 */
export function evaluationOverlapsTimetableSlot(
  startDateIso: string,
  endDateIso: string,
  weekMondayIso: string,
  dayOfWeek: number,
  slotIndex: number
): boolean {
  const evStart = new Date(startDateIso);
  const evEnd = new Date(endDateIso);
  if (isNaN(evStart.getTime()) || isNaN(evEnd.getTime())) {
    return false;
  }
  if (dayOfWeek < 1 || dayOfWeek > 5 || slotIndex < 0 || slotIndex > 7) {
    return false;
  }
  const parts = weekMondayIso.split('-').map((x) => Number(x));
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return false;
  }
  const [y, mo, da] = parts;
  const base = new Date(y, mo - 1, da);
  const dayOffset = dayOfWeek - 1;
  const slotStartH = 8 + slotIndex;
  const slotStart = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, slotStartH, 0, 0, 0);
  const slotEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, slotStartH + 1, 0, 0, 0);
  return evStart < slotEnd && slotStart < evEnd;
}
