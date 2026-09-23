/**
 * Proctor Code Color Accent System
 * Provides unique, vibrant, and high-contrast color accents for each teacher code.
 */

export interface ProctorColorConfig {
  code: string;
  badge: string;
  badgeHover: string;
  badgeSolid: string;
  text: string;
  border: string;
  bg: string;
  dot: string;
  cardBg: string;
}

const PROCTOR_PALETTES: Array<Omit<ProctorColorConfig, 'code'>> = [
  // 0: Emerald (Green) - Code A
  {
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    badgeHover: 'hover:bg-emerald-500/30 hover:border-emerald-400',
    badgeSolid: 'bg-emerald-600 text-white shadow-emerald-500/20',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/15',
    dot: 'bg-emerald-400',
    cardBg: 'bg-emerald-950/30',
  },
  // 1: Sky (Light Blue) - Code B
  {
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    badgeHover: 'hover:bg-sky-500/30 hover:border-sky-400',
    badgeSolid: 'bg-sky-600 text-white shadow-sky-500/20',
    text: 'text-sky-300',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/15',
    dot: 'bg-sky-400',
    cardBg: 'bg-sky-950/30',
  },
  // 2: Amber (Gold) - Code C
  {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    badgeHover: 'hover:bg-amber-500/30 hover:border-amber-400',
    badgeSolid: 'bg-amber-600 text-white shadow-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/15',
    dot: 'bg-amber-400',
    cardBg: 'bg-amber-950/30',
  },
  // 3: Violet (Purple) - Code D
  {
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    badgeHover: 'hover:bg-violet-500/30 hover:border-violet-400',
    badgeSolid: 'bg-violet-600 text-white shadow-violet-500/20',
    text: 'text-violet-300',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/15',
    dot: 'bg-violet-400',
    cardBg: 'bg-violet-950/30',
  },
  // 4: Rose (Coral/Pink) - Code E
  {
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    badgeHover: 'hover:bg-rose-500/30 hover:border-rose-400',
    badgeSolid: 'bg-rose-600 text-white shadow-rose-500/20',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/15',
    dot: 'bg-rose-400',
    cardBg: 'bg-rose-950/30',
  },
  // 5: Teal (Teal) - Code F
  {
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    badgeHover: 'hover:bg-teal-500/30 hover:border-teal-400',
    badgeSolid: 'bg-teal-600 text-white shadow-teal-500/20',
    text: 'text-teal-300',
    border: 'border-teal-500/40',
    bg: 'bg-teal-500/15',
    dot: 'bg-teal-400',
    cardBg: 'bg-teal-950/30',
  },
  // 6: Indigo (Indigo) - Code G
  {
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    badgeHover: 'hover:bg-indigo-500/30 hover:border-indigo-400',
    badgeSolid: 'bg-indigo-600 text-white shadow-indigo-500/20',
    text: 'text-indigo-300',
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-500/15',
    dot: 'bg-indigo-400',
    cardBg: 'bg-indigo-950/30',
  },
  // 7: Orange (Warm Orange) - Code H
  {
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    badgeHover: 'hover:bg-orange-500/30 hover:border-orange-400',
    badgeSolid: 'bg-orange-600 text-white shadow-orange-500/20',
    text: 'text-orange-300',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/15',
    dot: 'bg-orange-400',
    cardBg: 'bg-orange-950/30',
  },
  // 8: Fuchsia (Magenta) - Code I
  {
    badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    badgeHover: 'hover:bg-fuchsia-500/30 hover:border-fuchsia-400',
    badgeSolid: 'bg-fuchsia-600 text-white shadow-fuchsia-500/20',
    text: 'text-fuchsia-300',
    border: 'border-fuchsia-500/40',
    bg: 'bg-fuchsia-500/15',
    dot: 'bg-fuchsia-400',
    cardBg: 'bg-fuchsia-950/30',
  },
  // 9: Lime (Lime Green) - Code J
  {
    badge: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
    badgeHover: 'hover:bg-lime-500/30 hover:border-lime-400',
    badgeSolid: 'bg-lime-600 text-white shadow-lime-500/20',
    text: 'text-lime-300',
    border: 'border-lime-500/40',
    bg: 'bg-lime-500/15',
    dot: 'bg-lime-400',
    cardBg: 'bg-lime-950/30',
  },
  // 10: Cyan (Cyan) - Code K
  {
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    badgeHover: 'hover:bg-cyan-500/30 hover:border-cyan-400',
    badgeSolid: 'bg-cyan-600 text-white shadow-cyan-500/20',
    text: 'text-cyan-300',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/15',
    dot: 'bg-cyan-400',
    cardBg: 'bg-cyan-950/30',
  },
  // 11: Pink (Pink) - Code L
  {
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    badgeHover: 'hover:bg-pink-500/30 hover:border-pink-400',
    badgeSolid: 'bg-pink-600 text-white shadow-pink-500/20',
    text: 'text-pink-300',
    border: 'border-pink-500/40',
    bg: 'bg-pink-500/15',
    dot: 'bg-pink-400',
    cardBg: 'bg-pink-950/30',
  },
  // 12: Yellow (Bright Yellow) - Code M
  {
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    badgeHover: 'hover:bg-yellow-500/30 hover:border-yellow-400',
    badgeSolid: 'bg-yellow-600 text-slate-950 shadow-yellow-500/20 font-black',
    text: 'text-yellow-300',
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-500/15',
    dot: 'bg-yellow-400',
    cardBg: 'bg-yellow-950/30',
  },
  // 13: Blue (Royal Blue) - Code N
  {
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    badgeHover: 'hover:bg-blue-500/30 hover:border-blue-400',
    badgeSolid: 'bg-blue-600 text-white shadow-blue-500/20',
    text: 'text-blue-300',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/15',
    dot: 'bg-blue-400',
    cardBg: 'bg-blue-950/30',
  },
  // 14: Purple (Deep Purple) - Code O
  {
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    badgeHover: 'hover:bg-purple-500/30 hover:border-purple-400',
    badgeSolid: 'bg-purple-600 text-white shadow-purple-500/20',
    text: 'text-purple-300',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/15',
    dot: 'bg-purple-400',
    cardBg: 'bg-purple-950/30',
  },
  // 15: Red (Crimson) - Code P
  {
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    badgeHover: 'hover:bg-red-500/30 hover:border-red-400',
    badgeSolid: 'bg-red-600 text-white shadow-red-500/20',
    text: 'text-red-300',
    border: 'border-red-500/40',
    bg: 'bg-red-500/15',
    dot: 'bg-red-400',
    cardBg: 'bg-red-950/30',
  },
  // 16: Green (Leaf Green) - Code Q
  {
    badge: 'bg-green-500/20 text-green-300 border-green-500/40',
    badgeHover: 'hover:bg-green-500/30 hover:border-green-400',
    badgeSolid: 'bg-green-600 text-white shadow-green-500/20',
    text: 'text-green-300',
    border: 'border-green-500/40',
    bg: 'bg-green-500/15',
    dot: 'bg-green-400',
    cardBg: 'bg-green-950/30',
  },
];

/**
 * Get distinct styling configuration for a teacher code
 */
export function getProctorCodeColor(code: string | undefined | null): ProctorColorConfig {
  const clean = (code || '').trim().toUpperCase();
  if (!clean || clean === '—' || clean === '-') {
    return {
      code: '',
      badge: 'bg-[#121520] border-[#2D364C] text-slate-500 hover:border-slate-400',
      badgeHover: 'hover:border-slate-400',
      badgeSolid: 'bg-slate-800 text-slate-400',
      text: 'text-slate-500',
      border: 'border-[#2D364C]',
      bg: 'bg-transparent',
      dot: 'bg-slate-600',
      cardBg: 'bg-[#121520]',
    };
  }

  // If single letter A-Z, map directly to palette index (A->0, B->1, etc.)
  let idx = 0;
  if (/^[A-Z]$/.test(clean)) {
    idx = (clean.charCodeAt(0) - 65) % PROCTOR_PALETTES.length;
  } else {
    // Hash for multi-char codes (e.g. AA, 01, G1)
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash * 31 + clean.charCodeAt(i)) % PROCTOR_PALETTES.length;
    }
    idx = Math.abs(hash);
  }

  const palette = PROCTOR_PALETTES[idx];
  return {
    code: clean,
    ...palette,
  };
}

/**
 * Clean & Restful Cell Style helper:
 * Avoids visual fatigue by keeping the matrix neutral slate by default,
 * and illuminating only the active spotlighted teacher on hover/click.
 */
export function getProctorMatrixCellStyle({
  code,
  isConflict = false,
  isSpotlight = false,
  hasActiveSpotlight = false,
}: {
  code?: string | null;
  isConflict?: boolean;
  isSpotlight?: boolean;
  hasActiveSpotlight?: boolean;
}): string {
  const clean = (code || '').trim().toUpperCase();
  const isFilled = clean && clean !== '—' && clean !== '-';

  // 1. Conflict State takes highest priority (Alert in Red)
  if (isConflict) {
    return 'bg-rose-500/25 border-2 border-rose-500 text-rose-200 font-black animate-pulse shadow-sm';
  }

  // 2. Empty / Unassigned State
  if (!isFilled) {
    return hasActiveSpotlight
      ? 'bg-[#0d1017]/30 border-[#1a2130]/40 text-slate-600/40 select-none'
      : 'bg-[#0e121b]/60 border border-[#1e2536] text-slate-500 hover:border-slate-400 select-none';
  }

  // 3. Spotlight Active State
  if (hasActiveSpotlight) {
    if (isSpotlight) {
      return 'bg-emerald-400 text-slate-950 font-black border border-emerald-300 ring-2 ring-emerald-300/90 shadow-lg scale-110 z-20 transition-all';
    }
    // Dimmed out when other teacher is spotlighted
    return 'opacity-25 bg-[#141a26] text-slate-400 border-[#1f2638] transition-all';
  }

  // 4. Default Restful Slate State (Clean & Anti-Fatigue)
  return 'bg-[#182030] text-slate-100 border border-[#2d3a50] hover:border-emerald-400/90 hover:text-white font-bold transition-all shadow-xs';
}

