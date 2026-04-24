/**
 * Thèmes et polices (alignés {@link School#themeName} / {@link School#fontName} côté API).
 */
export const SCHOOL_THEME_KEYS = [
  'classique',
  'emeraude',
  'bordeaux',
  'indigo',
  'terre-afrique',
  'ardoise',
] as const;
export type SchoolThemeKey = (typeof SCHOOL_THEME_KEYS)[number];

export const SCHOOL_FONT_KEYS = ['inter', 'montserrat', 'quicksand', 'lora'] as const;
export type SchoolFontKey = (typeof SCHOOL_FONT_KEYS)[number];

export const THEME_LABELS: Record<string, string> = {
  classique: 'Classique',
  emeraude: 'Émeraude',
  bordeaux: 'Bordeaux',
  indigo: 'Indigo',
  'terre-afrique': "Terre d'Afrique",
  ardoise: 'Ardoise',
};

export const THEME_SWATCH_PRIMARY: Record<string, string> = {
  classique: '#1E3A8A',
  emeraude: '#059669',
  bordeaux: '#7F1D1D',
  indigo: '#4F46E5',
  'terre-afrique': '#92400E',
  ardoise: '#334155',
};

export const FONT_LABELS: Record<string, string> = {
  inter: 'Inter (moderne)',
  montserrat: 'Montserrat (élégant)',
  quicksand: 'Quicksand (scolaire)',
  lora: 'Lora (académique)',
};

const THEME_CLASS_PREFIX = 'theme-';
const FONT_CLASS_PREFIX = 'font-';

export function toThemeClass(themeKey: string | null | undefined): string {
  const k = normalizeThemeKey(themeKey);
  return `${THEME_CLASS_PREFIX}${k}`;
}

export function toFontClass(fontKey: string | null | undefined): string {
  const k = normalizeFontKey(fontKey);
  return `${FONT_CLASS_PREFIX}${k}`;
}

export function normalizeThemeKey(themeKey: string | null | undefined): string {
  if (!themeKey) return 'classique';
  const t = themeKey.trim().toLowerCase();
  return (SCHOOL_THEME_KEYS as readonly string[]).includes(t) ? t : 'classique';
}

export function normalizeFontKey(fontKey: string | null | undefined): string {
  if (!fontKey) return 'inter';
  const t = fontKey.trim().toLowerCase();
  return (SCHOOL_FONT_KEYS as readonly string[]).includes(t) ? t : 'inter';
}

export const ALL_THEME_BODY_CLASSES = SCHOOL_THEME_KEYS.map((k) => toThemeClass(k));
export const ALL_FONT_BODY_CLASSES = SCHOOL_FONT_KEYS.map((k) => toFontClass(k));
