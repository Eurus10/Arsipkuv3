export interface YearColorTheme {
  name: string;
  cardBg: string;
  cardBorder: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  folderFill: string;
  yearBadgeBg: string;
  yearBadgeText: string;
  yearBadgeBorder: string;
  examBadgeBg: string;
  examBadgeText: string;
  examBadgeBorder: string;
  buttonBg: string;
  buttonHoverBg: string;
  buttonText: string;
  buttonShadow: string;
  glowGradient: string;
  accentText: string;
}

// Preset color themes for school years
export const THEMES: Record<string, YearColorTheme> = {
  emerald: {
    name: 'Hijau Emerald',
    cardBg: 'bg-white hover:bg-emerald-50/25',
    cardBorder: 'border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md',
    iconBg: 'bg-emerald-50',
    iconBorder: 'border-emerald-200',
    iconColor: 'text-emerald-700',
    folderFill: 'fill-emerald-100 stroke-emerald-600',
    yearBadgeBg: 'bg-emerald-50',
    yearBadgeText: 'text-emerald-800',
    yearBadgeBorder: 'border-emerald-200',
    examBadgeBg: 'bg-emerald-50',
    examBadgeText: 'text-emerald-800',
    examBadgeBorder: 'border-emerald-200',
    buttonBg: 'bg-emerald-600',
    buttonHoverBg: 'hover:bg-emerald-700',
    buttonText: 'text-white',
    buttonShadow: 'shadow-emerald-600/20',
    glowGradient: 'from-emerald-100/40 to-transparent',
    accentText: 'text-emerald-700',
  },
  violet: {
    name: 'Ungu Violet',
    cardBg: 'bg-white hover:bg-violet-50/25',
    cardBorder: 'border-slate-200 hover:border-violet-300 shadow-xs hover:shadow-md',
    iconBg: 'bg-violet-50',
    iconBorder: 'border-violet-200',
    iconColor: 'text-violet-700',
    folderFill: 'fill-violet-100 stroke-violet-600',
    yearBadgeBg: 'bg-violet-50',
    yearBadgeText: 'text-violet-800',
    yearBadgeBorder: 'border-violet-200',
    examBadgeBg: 'bg-violet-50',
    examBadgeText: 'text-violet-800',
    examBadgeBorder: 'border-violet-200',
    buttonBg: 'bg-violet-600',
    buttonHoverBg: 'hover:bg-violet-700',
    buttonText: 'text-white',
    buttonShadow: 'shadow-violet-600/20',
    glowGradient: 'from-violet-100/40 to-transparent',
    accentText: 'text-violet-700',
  },
  amber: {
    name: 'Kuning Amber',
    cardBg: 'bg-white hover:bg-amber-50/25',
    cardBorder: 'border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md',
    iconBg: 'bg-amber-50',
    iconBorder: 'border-amber-200',
    iconColor: 'text-amber-700',
    folderFill: 'fill-amber-100 stroke-amber-600',
    yearBadgeBg: 'bg-amber-50',
    yearBadgeText: 'text-amber-800',
    yearBadgeBorder: 'border-amber-200',
    examBadgeBg: 'bg-amber-50',
    examBadgeText: 'text-amber-800',
    examBadgeBorder: 'border-amber-200',
    buttonBg: 'bg-amber-600',
    buttonHoverBg: 'hover:bg-amber-700',
    buttonText: 'text-white',
    buttonShadow: 'shadow-amber-600/20',
    glowGradient: 'from-amber-100/40 to-transparent',
    accentText: 'text-amber-700',
  },
  sky: {
    name: 'Biru Langit',
    cardBg: 'bg-white hover:bg-sky-50/25',
    cardBorder: 'border-slate-200 hover:border-sky-300 shadow-xs hover:shadow-md',
    iconBg: 'bg-sky-50',
    iconBorder: 'border-sky-200',
    iconColor: 'text-sky-700',
    folderFill: 'fill-sky-100 stroke-sky-600',
    yearBadgeBg: 'bg-sky-50',
    yearBadgeText: 'text-sky-800',
    yearBadgeBorder: 'border-sky-200',
    examBadgeBg: 'bg-sky-50',
    examBadgeText: 'text-sky-800',
    examBadgeBorder: 'border-sky-200',
    buttonBg: 'bg-sky-600',
    buttonHoverBg: 'hover:bg-sky-700',
    buttonText: 'text-white',
    buttonShadow: 'shadow-sky-600/20',
    glowGradient: 'from-sky-100/40 to-transparent',
    accentText: 'text-sky-700',
  },
  rose: {
    name: 'Merah Rose',
    cardBg: 'bg-white hover:bg-rose-50/25',
    cardBorder: 'border-slate-200 hover:border-rose-300 shadow-xs hover:shadow-md',
    iconBg: 'bg-rose-50',
    iconBorder: 'border-rose-200',
    iconColor: 'text-rose-700',
    folderFill: 'fill-rose-100 stroke-rose-600',
    yearBadgeBg: 'bg-rose-50',
    yearBadgeText: 'text-rose-800',
    yearBadgeBorder: 'border-rose-200',
    examBadgeBg: 'bg-rose-50',
    examBadgeText: 'text-rose-800',
    examBadgeBorder: 'border-rose-200',
    buttonBg: 'bg-rose-600',
    buttonHoverBg: 'hover:bg-rose-700',
    buttonText: 'text-white',
    buttonShadow: 'shadow-rose-600/20',
    glowGradient: 'from-rose-100/40 to-transparent',
    accentText: 'text-rose-700',
  },
  cyan: {
    name: 'Cyan Teal',
    cardBg: 'bg-white hover:bg-cyan-50/25',
    cardBorder: 'border-slate-200 hover:border-cyan-300 shadow-xs hover:shadow-md',
    iconBg: 'bg-cyan-50',
    iconBorder: 'border-cyan-200',
    iconColor: 'text-cyan-700',
    folderFill: 'fill-cyan-100 stroke-cyan-600',
    yearBadgeBg: 'bg-cyan-50',
    yearBadgeText: 'text-cyan-800',
    yearBadgeBorder: 'border-cyan-200',
    examBadgeBg: 'bg-cyan-50',
    examBadgeText: 'text-cyan-800',
    examBadgeBorder: 'border-cyan-200',
    buttonBg: 'bg-cyan-600',
    buttonHoverBg: 'hover:bg-cyan-700',
    buttonText: 'text-white',
    buttonShadow: 'shadow-cyan-600/20',
    glowGradient: 'from-cyan-100/40 to-transparent',
    accentText: 'text-cyan-700',
  },
};

const THEME_KEYS = ['violet', 'emerald', 'amber', 'sky', 'rose', 'cyan'];

/**
 * Returns a deterministic color theme for any school year string
 */
export function getYearColorTheme(schoolYear: string): YearColorTheme {
  const cleanYear = (schoolYear || '').trim().toLowerCase();

  // Known year mappings for consistency
  if (cleanYear.includes('2024/2025') || cleanYear.includes('2024-2025')) {
    return THEMES.violet;
  }
  if (cleanYear.includes('2025/2026') || cleanYear.includes('2025-2026')) {
    return THEMES.emerald;
  }
  if (cleanYear.includes('2023/2024') || cleanYear.includes('2023-2024')) {
    return THEMES.amber;
  }
  if (cleanYear.includes('2026/2027') || cleanYear.includes('2026-2027')) {
    return THEMES.sky;
  }
  if (cleanYear.includes('2022/2023') || cleanYear.includes('2022-2023')) {
    return THEMES.rose;
  }

  // Deterministic hash for any other custom year
  let hash = 0;
  for (let i = 0; i < cleanYear.length; i++) {
    hash = (hash << 5) - hash + cleanYear.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % THEME_KEYS.length;
  const key = THEME_KEYS[index];
  return THEMES[key] || THEMES.violet;
}
