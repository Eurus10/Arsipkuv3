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
    cardBg: 'bg-[#111918] hover:bg-[#152322]',
    cardBorder: 'border-emerald-500/25 hover:border-emerald-400/70',
    iconBg: 'bg-emerald-500/15',
    iconBorder: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    folderFill: 'fill-emerald-500/30 stroke-emerald-400',
    yearBadgeBg: 'bg-emerald-500/20',
    yearBadgeText: 'text-emerald-300',
    yearBadgeBorder: 'border-emerald-500/40',
    examBadgeBg: 'bg-emerald-950/80',
    examBadgeText: 'text-emerald-200',
    examBadgeBorder: 'border-emerald-700/40',
    buttonBg: 'bg-emerald-600',
    buttonHoverBg: 'hover:bg-emerald-500',
    buttonText: 'text-white',
    buttonShadow: 'shadow-emerald-900/30',
    glowGradient: 'from-emerald-500/15 to-transparent',
    accentText: 'text-emerald-400',
  },
  violet: {
    name: 'Ungu Violet',
    cardBg: 'bg-[#161324] hover:bg-[#1D1932]',
    cardBorder: 'border-violet-500/25 hover:border-violet-400/70',
    iconBg: 'bg-violet-500/15',
    iconBorder: 'border-violet-500/30',
    iconColor: 'text-violet-400',
    folderFill: 'fill-violet-500/30 stroke-violet-400',
    yearBadgeBg: 'bg-violet-500/20',
    yearBadgeText: 'text-violet-300',
    yearBadgeBorder: 'border-violet-500/40',
    examBadgeBg: 'bg-violet-950/80',
    examBadgeText: 'text-violet-200',
    examBadgeBorder: 'border-violet-700/40',
    buttonBg: 'bg-violet-600',
    buttonHoverBg: 'hover:bg-violet-500',
    buttonText: 'text-white',
    buttonShadow: 'shadow-violet-900/30',
    glowGradient: 'from-violet-500/15 to-transparent',
    accentText: 'text-violet-400',
  },
  amber: {
    name: 'Kuning Amber',
    cardBg: 'bg-[#1C1711] hover:bg-[#261E14]',
    cardBorder: 'border-amber-500/25 hover:border-amber-400/70',
    iconBg: 'bg-amber-500/15',
    iconBorder: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    folderFill: 'fill-amber-500/30 stroke-amber-400',
    yearBadgeBg: 'bg-amber-500/20',
    yearBadgeText: 'text-amber-300',
    yearBadgeBorder: 'border-amber-500/40',
    examBadgeBg: 'bg-amber-950/80',
    examBadgeText: 'text-amber-200',
    examBadgeBorder: 'border-amber-700/40',
    buttonBg: 'bg-amber-600',
    buttonHoverBg: 'hover:bg-amber-500',
    buttonText: 'text-white',
    buttonShadow: 'shadow-amber-900/30',
    glowGradient: 'from-amber-500/15 to-transparent',
    accentText: 'text-amber-400',
  },
  sky: {
    name: 'Biru Langit',
    cardBg: 'bg-[#111824] hover:bg-[#162132]',
    cardBorder: 'border-sky-500/25 hover:border-sky-400/70',
    iconBg: 'bg-sky-500/15',
    iconBorder: 'border-sky-500/30',
    iconColor: 'text-sky-400',
    folderFill: 'fill-sky-500/30 stroke-sky-400',
    yearBadgeBg: 'bg-sky-500/20',
    yearBadgeText: 'text-sky-300',
    yearBadgeBorder: 'border-sky-500/40',
    examBadgeBg: 'bg-sky-950/80',
    examBadgeText: 'text-sky-200',
    examBadgeBorder: 'border-sky-700/40',
    buttonBg: 'bg-sky-600',
    buttonHoverBg: 'hover:bg-sky-500',
    buttonText: 'text-white',
    buttonShadow: 'shadow-sky-900/30',
    glowGradient: 'from-sky-500/15 to-transparent',
    accentText: 'text-sky-400',
  },
  rose: {
    name: 'Merah Rose',
    cardBg: 'bg-[#1C1217] hover:bg-[#26161F]',
    cardBorder: 'border-rose-500/25 hover:border-rose-400/70',
    iconBg: 'bg-rose-500/15',
    iconBorder: 'border-rose-500/30',
    iconColor: 'text-rose-400',
    folderFill: 'fill-rose-500/30 stroke-rose-400',
    yearBadgeBg: 'bg-rose-500/20',
    yearBadgeText: 'text-rose-300',
    yearBadgeBorder: 'border-rose-500/40',
    examBadgeBg: 'bg-rose-950/80',
    examBadgeText: 'text-rose-200',
    examBadgeBorder: 'border-rose-700/40',
    buttonBg: 'bg-rose-600',
    buttonHoverBg: 'hover:bg-rose-500',
    buttonText: 'text-white',
    buttonShadow: 'shadow-rose-900/30',
    glowGradient: 'from-rose-500/15 to-transparent',
    accentText: 'text-rose-400',
  },
  cyan: {
    name: 'Cyan Teal',
    cardBg: 'bg-[#101A1F] hover:bg-[#14242C]',
    cardBorder: 'border-cyan-500/25 hover:border-cyan-400/70',
    iconBg: 'bg-cyan-500/15',
    iconBorder: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    folderFill: 'fill-cyan-500/30 stroke-cyan-400',
    yearBadgeBg: 'bg-cyan-500/20',
    yearBadgeText: 'text-cyan-300',
    yearBadgeBorder: 'border-cyan-500/40',
    examBadgeBg: 'bg-cyan-950/80',
    examBadgeText: 'text-cyan-200',
    examBadgeBorder: 'border-cyan-700/40',
    buttonBg: 'bg-cyan-600',
    buttonHoverBg: 'hover:bg-cyan-500',
    buttonText: 'text-white',
    buttonShadow: 'shadow-cyan-900/30',
    glowGradient: 'from-cyan-500/15 to-transparent',
    accentText: 'text-cyan-400',
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
