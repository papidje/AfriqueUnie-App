/**
 * Ordre d’affichage des groupes de niveaux (référentiel global).
 * Codes alignés sur {@code class_level_groups.code}.
 */
export const CLASS_LEVEL_GROUP_ORDER: Record<string, number> = {
  PRE: 1, // Pré scolaire (Garderie)
  MAT: 2, // Maternelle
  PRI: 3, // Primaire
  COL: 4, // Collège
  LYC: 5  // Lycée
};

export function classLevelGroupSortKey(groupCode: string | null | undefined): number {
  if (!groupCode) {
    return Number.MAX_SAFE_INTEGER;
  }
  return CLASS_LEVEL_GROUP_ORDER[groupCode] ?? Number.MAX_SAFE_INTEGER;
}
