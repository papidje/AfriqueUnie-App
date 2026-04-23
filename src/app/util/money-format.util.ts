/**
 * Affiche un montant entier avec espaces comme séparateurs de milliers, suffixe « GNF ».
 * Exemple : 1235000 → « 1 235 000 GNF »
 */
export function formatGnfAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '0 GNF';
  }
  const n = Math.trunc(value);
  const neg = n < 0;
  const body = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '-' : '') + body + ' GNF';
}
