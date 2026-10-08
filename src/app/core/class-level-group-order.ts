/**
 * Ordre pédagogique d’affichage (référentiel Guinée).
 * Indépendant des IDs auto-générés (CP2 / PRE ajoutés après coup).
 */

/** Codes {@code class_level_groups.code}. */
export const CLASS_LEVEL_GROUP_ORDER: Record<string, number> = {
  PRE: 1, // Pré scolaire (Garderie)
  MAT: 2, // Maternelle
  PRI: 3, // Primaire
  COL: 4, // Collège
  LYC: 5 // Lycée
};

/** Codes {@code class_levels.code} — progression scolaire. */
export const CLASS_LEVEL_CODE_ORDER: Record<string, number> = {
  GAR: 10,
  PS: 20,
  MS: 30,
  GS: 40,
  CP1: 50,
  CP2: 60,
  CE1: 70,
  CE2: 80,
  CM1: 90,
  CM2: 100,
  '7E': 110,
  '8E': 120,
  '9E': 130,
  '10E': 140,
  '11E': 150,
  '12E': 160,
  TLE: 170
};

export function classLevelGroupSortKey(groupCode: string | null | undefined): number {
  if (!groupCode) {
    return Number.MAX_SAFE_INTEGER;
  }
  return CLASS_LEVEL_GROUP_ORDER[groupCode] ?? Number.MAX_SAFE_INTEGER;
}

/** Préfère {@code sortOrder} administrable, sinon tables de codes historiques. */
export function classLevelGroupSortKeyFrom(
  group: { code?: string | null; sortOrder?: number | null } | null | undefined
): number {
  if (group?.sortOrder != null && Number.isFinite(group.sortOrder)) {
    return group.sortOrder;
  }
  return classLevelGroupSortKey(group?.code);
}

export function classLevelCodeSortKey(levelCode: string | null | undefined): number {
  if (!levelCode) {
    return Number.MAX_SAFE_INTEGER;
  }
  return CLASS_LEVEL_CODE_ORDER[levelCode] ?? Number.MAX_SAFE_INTEGER;
}

export function classLevelSortKeyFrom(level: ClassLevelSortable | null | undefined): number {
  if (level?.sortOrder != null && Number.isFinite(level.sortOrder)) {
    return level.sortOrder;
  }
  return classLevelCodeSortKey(level?.code);
}

export interface ClassLevelSortable {
  code?: string | null;
  /** Ordre administrable (prioritaire sur les tables de codes). */
  sortOrder?: number | null;
  group?: { code?: string | null; sortOrder?: number | null } | null;
}

export interface SchoolClassSortable {
  id?: number | null;
  name?: string | null;
  level?: ClassLevelSortable | null;
}

/** Groupe puis niveau (sortOrder / codes pédagogiques), puis code alphabétique. */
export function compareClassLevelsByPedagogy(a: ClassLevelSortable, b: ClassLevelSortable): number {
  const byGroup = classLevelGroupSortKeyFrom(a.group) - classLevelGroupSortKeyFrom(b.group);
  if (byGroup !== 0) {
    return byGroup;
  }
  const byLevel = classLevelSortKeyFrom(a) - classLevelSortKeyFrom(b);
  if (byLevel !== 0) {
    return byLevel;
  }
  return (a.code ?? '').localeCompare(b.code ?? '', 'fr');
}

/** Niveau pédagogique, puis nom de classe, puis id. */
export function compareSchoolClassesByLevel(a: SchoolClassSortable, b: SchoolClassSortable): number {
  const byLevel = compareClassLevelsByPedagogy(a.level ?? {}, b.level ?? {});
  if (byLevel !== 0) {
    return byLevel;
  }
  const byName = (a.name ?? '').localeCompare(b.name ?? '', 'fr');
  if (byName !== 0) {
    return byName;
  }
  return (a.id ?? 0) - (b.id ?? 0);
}

export function sortClassLevelsByPedagogy<T extends ClassLevelSortable>(levels: T[]): T[] {
  return (levels ?? []).slice().sort(compareClassLevelsByPedagogy);
}

export function sortSchoolClassesByLevel<T extends SchoolClassSortable>(classes: T[]): T[] {
  return (classes ?? []).slice().sort(compareSchoolClassesByLevel);
}
