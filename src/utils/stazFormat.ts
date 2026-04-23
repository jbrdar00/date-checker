import { round2 } from './numbers';

/** Calendar days per year and per month for staž conversion (working days treated as days). */
const DAYS_PER_YEAR = 365;
const DAYS_PER_MONTH = 30;

export interface StazYMD {
  years: number;
  months: number;
  days: number;
}

/** Convert working days (treated as calendar days) to years, months, days. Months normalized to 0–11 (12m → 1y). */
export function workingDaysToYMD(workingDays: number): StazYMD {
  if (!Number.isFinite(workingDays) || workingDays < 0) {
    return { years: 0, months: 0, days: 0 };
  }
  const total = round2(workingDays);
  let years = Math.floor(total / DAYS_PER_YEAR);
  const restAfterYears = total - years * DAYS_PER_YEAR;
  let months = Math.floor(restAfterYears / DAYS_PER_MONTH);
  const daysRem = restAfterYears - months * DAYS_PER_MONTH;
  const daysInt = Math.round(daysRem);
  // 12 months = 1 year (e.g. 02g12m00d → 03g00m00d)
  if (months >= 12) {
    years += Math.floor(months / 12);
    months = months % 12;
  }
  return { years, months, days: daysInt };
}

/** Format as 6 digits: YYMMDD (2 digits each, zero-padded). */
export function formatStazYYMMDD(workingDays: number): string {
  const { years, months, days } = workingDaysToYMD(workingDays);
  const yy = Math.min(99, years).toString().padStart(2, '0');
  const mm = Math.min(99, months).toString().padStart(2, '0');
  const dd = Math.min(99, Math.max(0, days)).toString().padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/** Format as xxgyymzzd (e.g. 05g03m15d for 5 years, 3 months, 15 days). */
export function formatStazGMD(workingDays: number): string {
  const { years, months, days } = workingDaysToYMD(workingDays);
  return formatYMDtoGMD(years, months, days);
}

/** Format (years, months, days) as xxgyymzzd. */
export function formatYMDtoGMD(
  years: number,
  months: number,
  days: number,
): string {
  const yy = Math.min(99, Math.max(0, years)).toString().padStart(2, '0');
  const mm = Math.min(99, Math.max(0, months)).toString().padStart(2, '0');
  const dd = Math.min(99, Math.max(0, days)).toString().padStart(2, '0');
  return `${yy}g${mm}m${dd}d`;
}

function pluralCroatian(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** Croatian text for years/months/days (e.g. "2 godine 1 mjesec i 5 dana"). */
export function formatStazCroatian(workingDays: number): string {
  const { years, months, days } = workingDaysToYMD(workingDays);
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${pluralCroatian(years, 'godina', 'godine', 'godina')}`);
  }
  if (months > 0) {
    parts.push(`${months} ${pluralCroatian(months, 'mjesec', 'mjeseca', 'mjeseci')}`);
  }
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} ${pluralCroatian(days, 'dan', 'dana', 'dana')}`);
  }
  if (parts.length === 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} i ${parts[1]}`;
  return `${parts[0]} ${parts[1]} i ${parts[2] ?? ''}`;
}

/** Unformatted line: "Neformatirano: X radnih dana / Y godine Z mjesec i W dana" (Croatian). */
export function formatStazUnformatted(workingDays: number): string {
  const raw = round2(workingDays);
  const radnihDana = raw === 1 ? 'radni dan' : 'radnih dana';
  const croatian = formatStazCroatian(workingDays);
  return `Neformatirano: ${raw.toFixed(2)} ${radnihDana} / ${croatian}`;
}
