const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Converts various date formats (Excel serial numbers like 43621, ISO dates, DD/MM/YYYY)
 * into standard Indonesian Date string e.g. "12 Desember 2020"
 */
export function formatIndonesianDate(raw: any): string {
  if (raw === null || raw === undefined) return '';

  const strVal = String(raw).trim();
  if (!strVal) return '';

  // 1. Check if raw is a Date object
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const day = raw.getDate();
    const month = INDONESIAN_MONTHS[raw.getMonth()];
    const year = raw.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // 2. Check if raw is pure numeric Excel serial date (e.g., 43621 or "43621")
  const numVal = Number(strVal);
  if (!isNaN(numVal) && numVal > 10000 && numVal < 100000) {
    // Excel serial date formula (Excel base date 1899-12-30)
    const utcDays = Math.floor(numVal - 25569);
    const utcValue = utcDays * 86400;
    const dateObj = new Date(utcValue * 1000);
    if (!isNaN(dateObj.getTime())) {
      const day = dateObj.getUTCDate();
      const month = INDONESIAN_MONTHS[dateObj.getUTCMonth()];
      const year = dateObj.getUTCFullYear();
      return `${day} ${month} ${year}`;
    }
  }

  // 3. If string already contains an Indonesian month name (e.g. "12 Desember 2020")
  if (INDONESIAN_MONTHS.some((m) => strVal.toLowerCase().includes(m.toLowerCase()))) {
    return strVal;
  }

  // 4. Try parsing slotted strings like DD/MM/YYYY or YYYY-MM-DD
  const parts = strVal.split(/[/.-]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);

    if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
      if (p3 > 1900) {
        // DD/MM/YYYY format
        const day = p1;
        const monthIdx = p2 - 1;
        const year = p3;
        if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31) {
          return `${day} ${INDONESIAN_MONTHS[monthIdx]} ${year}`;
        }
      } else if (p1 > 1900) {
        // YYYY-MM-DD format
        const year = p1;
        const monthIdx = p2 - 1;
        const day = p3;
        if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31) {
          return `${day} ${INDONESIAN_MONTHS[monthIdx]} ${year}`;
        }
      }
    }
  }

  // 5. Fallback JS Date.parse
  const parsedDate = new Date(strVal);
  if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900) {
    const day = parsedDate.getDate();
    const month = INDONESIAN_MONTHS[parsedDate.getMonth()];
    const year = parsedDate.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return strVal;
}

/**
 * Extracts year, month (1-12), and day (1-31) from various date formats
 */
export function extractBirthYearMonthDay(raw: any): { year: number; month: number; day: number } | null {
  if (!raw) return null;

  const formatted = formatIndonesianDate(raw);
  if (!formatted) return null;

  // Check if matches "12 Desember 2020"
  const tokens = formatted.split(/\s+/);
  if (tokens.length >= 3) {
    const day = parseInt(tokens[0], 10);
    const year = parseInt(tokens[tokens.length - 1], 10);
    const monthName = tokens.slice(1, tokens.length - 1).join(' ');
    
    const monthIdx = INDONESIAN_MONTHS.findIndex(
      (m) => m.toLowerCase() === monthName.toLowerCase()
    );

    if (!isNaN(day) && !isNaN(year) && monthIdx !== -1) {
      return { day, month: monthIdx + 1, year };
    }
  }

  // Try split by slashes/dashes
  const parts = String(raw).split(/[/.-]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);

    if (p3 > 1900) {
      return { day: p1, month: p2, year: p3 };
    } else if (p1 > 1900) {
      return { day: p3, month: p2, year: p1 };
    }
  }

  return null;
}
