import dayjs from 'dayjs';
import { DATE_FORMAT, DISPLAY_DATE_FORMAT } from '../constants/dateFormats';
import { FULL_DAY_HOURS } from '../types/enums';
import type { DateRangeRowDto, PartialDayDto } from '../types/dto';
import type { HoursPerDateMap, PartialAndFullDaysResult, ContinuousStazResult, ContinuousPeriodResult, ContinuousStazBreak } from '../types/dto';
import { round2 } from './numbers';

export { DATE_FORMAT, DISPLAY_DATE_FORMAT };

/** Format a date string (YYYY-MM-DD) for display as DD.MM.YYYY. Returns '—' if invalid. */
export function formatDisplayDate(value: string): string {
  const d = dayjs(value, DATE_FORMAT, true);
  return d.isValid() ? d.format(DISPLAY_DATE_FORMAT) : '—';
}

/**
 * Duration in whole years, months, and days (government-style).
 * Step from start: add whole years, then whole months; remaining days = calendar days to end (inclusive).
 * If end is the last day of its month, remainder is counted as complete months only: 01.01.1998–29.02.2004 → (6,2,0).
 * 17.02–17.03 → (0,1,1); 22.06–31.08 → (0,2,10); 01.02–28.02 → (0,1,0) full month.
 */
export function getDurationYMD(
  start: string,
  end: string,
): { years: number; months: number; days: number } | null {
  const s = dayjs(start, DATE_FORMAT, true);
  const e = dayjs(end, DATE_FORMAT, true);
  if (!s.isValid() || !e.isValid() || s.isAfter(e)) return null;
  // Full single calendar month: same month, start on 1st, end on last day → (0, 1, 0)
  if (
    s.year() === e.year() &&
    s.month() === e.month() &&
    s.date() === 1 &&
    e.add(1, 'day').month() !== e.month()
  ) {
    return { years: 0, months: 1, days: 0 };
  }
  let cur = s;
  let years = 0;
  while (cur.add(1, 'year').isBefore(e) || cur.add(1, 'year').isSame(e, 'day')) {
    years += 1;
    cur = cur.add(1, 'year');
  }
  // If cur is 1st of month and end is last day of its month: count remainder as complete months only (e.g. 01.01.1998–29.02.2004 → 6y 2m 0d)
  const isLastDayOfMonth = e.add(1, 'day').month() !== e.month();
  if (cur.date() === 1 && isLastDayOfMonth && (cur.isBefore(e) || cur.isSame(e, 'day'))) {
    const months = (e.year() - cur.year()) * 12 + (e.month() - cur.month()) + 1;
    if (months >= 0) return { years, months, days: 0 };
  }
  let months = 0;
  while (cur.add(1, 'month').isBefore(e) || cur.add(1, 'month').isSame(e, 'day')) {
    months += 1;
    cur = cur.add(1, 'month');
  }
  // Inclusive: from cur to end, both dates count (e.g. 01.11–30.11 = 30 days)
  const days = e.diff(cur, 'day') + 1;
  if (days < 0) return null;
  return { years, months, days };
}

/**
 * Government-style working days: duration (Y,M,D) → years*365 + months*30 + days.
 * Same calendar day in next month (e.g. 17.02–17.03) counts as 1 month + 1 day = 31.
 * Then scale by hours per day: result * (hoursPerDay / 8).
 */
export function getWorkingDays(
  start: string,
  end: string,
  hoursPerDay: number,
): number | null {
  const dur = getDurationYMD(start, end);
  if (!dur) return null;
  let { years, months, days } = dur;
  // (y,m,0) = complete years + complete months only → base = y*365 + m*30 (no extra day)
  if (days === 0 && (months > 0 || years > 0)) {
    const baseWorkingDays = years * 365 + months * 30;
    const scaled = (baseWorkingDays * hoursPerDay) / FULL_DAY_HOURS;
    return round2(scaled);
  }
  if (years === 0 && months === 0 && days === 0) days = 1;
  const baseWorkingDays = years * 365 + months * 30 + days;
  const scaled = (baseWorkingDays * hoursPerDay) / FULL_DAY_HOURS;
  return round2(scaled);
}

/**
 * Sum of (years, months, days) over all rows, normalized (30 d = 1 m, 12 m = 1 y).
 * Used for the "Zbroj GMD" card: total when you add each period's gmd and normalize.
 */
export function getSumOfDurationsYMD(
  rows: DateRangeRowDto[],
): { years: number; months: number; days: number } {
  let totalYears = 0;
  let totalMonths = 0;
  let totalDays = 0;
  for (const row of rows) {
    const dur = getDurationYMD(row.start, row.end);
    if (!dur) continue;
    totalYears += dur.years;
    totalMonths += dur.months;
    totalDays += dur.days;
  }
  totalMonths += Math.floor(totalDays / 30);
  totalDays = totalDays % 30;
  totalYears += Math.floor(totalMonths / 12);
  totalMonths = totalMonths % 12;
  return { years: totalYears, months: totalMonths, days: totalDays };
}

/**
 * Working days from calendar days: each day contributes min(1, totalHours/8).
 * Preklapanja: dan s 8+ h ukupno (više poslodavaca) = 1 puni radni dan.
 */
export function getWorkingDaysFromHoursPerDate(hoursPerDate: HoursPerDateMap): number {
  let sum = 0;
  for (const totalHours of Object.values(hoursPerDate)) {
    if (totalHours <= 0) continue;
    sum += Math.min(1, totalHours / FULL_DAY_HOURS);
  }
  return round2(sum);
}

/**
 * Ukupno radnih dana kad su rasponi miješani (8h + manje od 8h):
 * 8h rasponi računaju se po GMD (zbroj YMD → 365/30/1), a dani koji su samo u rasponima <8h
 * proporcionalno (min(1, totalHours/8)). Dan u 8h rasponu ne broji se dvostruko.
 */
export function getTotalWorkingDaysMixed(rows: DateRangeRowDto[]): number {
  const rows8h = rows.filter((r) => (r.hours ?? FULL_DAY_HOURS) === FULL_DAY_HOURS);
  const rowsPart = rows.filter((r) => (r.hours ?? FULL_DAY_HOURS) < FULL_DAY_HOURS);
  if (rowsPart.length === 0) {
    const sumYMD = getSumOfDurationsYMD(rows);
    return sumYMD.years * 365 + sumYMD.months * 30 + sumYMD.days;
  }
  const sumYMD8h = getSumOfDurationsYMD(rows8h);
  const W8h = sumYMD8h.years * 365 + sumYMD8h.months * 30 + sumYMD8h.days;
  const datesIn8h = new Set<string>(Object.keys(getHoursPerDate(rows8h)));
  const hoursPerDateAll = getHoursPerDate(rows);
  let Wpartial = 0;
  for (const [dateKey, totalHours] of Object.entries(hoursPerDateAll)) {
    if (datesIn8h.has(dateKey)) continue;
    if (totalHours <= 0) continue;
    Wpartial += Math.min(1, totalHours / FULL_DAY_HOURS);
  }
  return round2(W8h + Wpartial);
}

export type RangeRoundingMode = 'sum_decimals' | 'round_each_range';

/**
 * Total from individual ranges with configurable rounding mode.
 * - sum_decimals: sum decimal results from all ranges, then round2 total.
 * - round_each_range: round each range to whole day first (Math.round), then sum.
 */
export function getTotalWorkingDaysByRangeMode(
  rows: DateRangeRowDto[],
  mode: RangeRoundingMode,
): number {
  let total = 0;
  for (const row of rows) {
    const wd = getWorkingDays(row.start, row.end, row.hours ?? FULL_DAY_HOURS);
    if (wd == null) continue;
    total += mode === 'round_each_range' ? Math.round(wd) : wd;
  }
  return mode === 'round_each_range' ? total : round2(total);
}

/** Returns a map: date string (YYYY-MM-DD) -> total hours from all ranges that include that date. */
export function getHoursPerDate(rows: DateRangeRowDto[]): HoursPerDateMap {
  const map: HoursPerDateMap = {};
  for (const row of rows) {
    const s = dayjs(row.start, DATE_FORMAT, true);
    const e = dayjs(row.end, DATE_FORMAT, true);
    if (!s.isValid() || !e.isValid() || s.isAfter(e)) continue;
    const hours = row.hours ?? FULL_DAY_HOURS;
    let d = s;
    while (!d.isAfter(e)) {
      const key = d.format(DATE_FORMAT);
      map[key] = (map[key] ?? 0) + hours;
      d = d.add(1, 'day');
    }
  }
  return map;
}

export function getPartialAndFullDays(
  hoursPerDate: HoursPerDateMap,
): PartialAndFullDaysResult {
  const entries = Object.entries(hoursPerDate).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  let fullDaysCount = 0;
  const partialList: PartialAndFullDaysResult['partialList'] = [];
  let partialHoursSum = 0;
  for (const [dateKey, totalHours] of entries) {
    if (totalHours >= FULL_DAY_HOURS) {
      fullDaysCount += 1;
    } else if (totalHours > 0) {
      const d = dayjs(dateKey, DATE_FORMAT);
      const hoursToAdd = FULL_DAY_HOURS - totalHours;
      partialList.push({
        date: dateKey,
        dateDisplay: d.format(DISPLAY_DATE_FORMAT),
        hours: round2(totalHours),
        hoursToAdd: round2(hoursToAdd),
      });
      partialHoursSum += totalHours;
    }
  }
  const partialDaysCount = partialList.length;
  const hoursToAddForFull = round2(partialDaysCount * FULL_DAY_HOURS - partialHoursSum);
  const workingDaysWithAddition = round2(
    fullDaysCount + (partialHoursSum + hoursToAddForFull) / FULL_DAY_HOURS,
  );
  return {
    fullDaysCount,
    partialList,
    partialHoursSum: round2(partialHoursSum),
    partialDaysCount,
    hoursToAddForFull,
    workingDaysWithAddition,
  };
}

const MAX_GAP_DAYS = 8;

/**
 * Group ranges into continuous periods (gap between end of one and start of next ≤ 8 days).
 * Only rows with javnaUstanova === true are included.
 * Neprekidni staž = kalendarsko trajanje razdoblja koje je neprekidno do danas (interval koji uključuje danas).
 */
export function getContinuousStaz(
  rows: DateRangeRowDto[],
  _rowWorkingDays: (number | null)[],
  _partialList: PartialDayDto[],
  _hoursPerDate: HoursPerDateMap,
  calculationDate?: string,
): ContinuousStazResult {
  const sorted = [...rows]
    .map((row, i) => ({ row, origIndex: i }))
    .filter(({ row }) => row.javnaUstanova === true)
    .filter(({ row }) => dayjs(row.start, DATE_FORMAT, true).isValid() && dayjs(row.end, DATE_FORMAT, true).isValid())
    .sort((a, b) => dayjs(a.row.start, DATE_FORMAT).valueOf() - dayjs(b.row.start, DATE_FORMAT).valueOf());

  if (sorted.length === 0) {
    return { totalWorkingDays: 0, totalWorkingDaysWithAddition: 0, periods: [], breaks: [] };
  }

  const first = sorted[0];
  if (!first) return { totalWorkingDays: 0, totalWorkingDaysWithAddition: 0, periods: [], breaks: [] };

  const groups: { start: string; end: string; rowIndices: number[] }[] = [];
  const breaks: ContinuousStazBreak[] = [];
  let current: { start: string; end: string; rowIndices: number[] } = {
    start: first.row.start,
    end: first.row.end,
    rowIndices: [first.origIndex],
  };

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (!item) continue;
    const prevEnd = dayjs(current.end, DATE_FORMAT);
    const nextStart = dayjs(item.row.start, DATE_FORMAT);
    const gapDays = nextStart.diff(prevEnd, 'day');
    // Spajamo ako je jaz ≤8 dana ILI ako se preklapa (next start prije prev end) = unija zaposlenja
    if (gapDays <= MAX_GAP_DAYS) {
      // Proširi interval na kasniji od dva kraja (unija)
      const currentEndD = dayjs(current.end, DATE_FORMAT);
      const itemEndD = dayjs(item.row.end, DATE_FORMAT);
      current.end = (currentEndD.isAfter(itemEndD) ? currentEndD : itemEndD).format(DATE_FORMAT);
      current.rowIndices.push(item.origIndex);
    } else {
      const lastIdx = current.rowIndices[current.rowIndices.length - 1];
      const endPoslodavac =
        lastIdx !== undefined ? (rows[lastIdx]?.poslodavac?.trim() || undefined) : undefined;
      breaks.push({
        endDate: current.end,
        startDate: item.row.start,
        gapDays,
        endPoslodavac,
        startPoslodavac: item.row.poslodavac?.trim() || undefined,
      });
      groups.push(current);
      current = {
        start: item.row.start,
        end: item.row.end,
        rowIndices: [item.origIndex],
      };
    }
  }
  groups.push(current);

  // Neprekidni staž = samo razdoblje neprekidno do danas (interval koji uključuje danas)
  const customToday = calculationDate
    ? dayjs(calculationDate, DATE_FORMAT, true)
    : null;
  const todayStr = customToday?.isValid()
    ? customToday.format(DATE_FORMAT)
    : dayjs().format(DATE_FORMAT);
  const currentPeriod = groups.find(
    (g) => g.start <= todayStr && g.end >= todayStr,
  );

  let totalWorkingDays = 0;
  let totalWorkingDaysWithAddition = 0;
  if (currentPeriod) {
    const endDate = todayStr;
    const dur = getDurationYMD(currentPeriod.start, endDate);
    if (dur) {
      let { years, months, days } = dur;
      if (days === 0 && (months > 0 || years > 0)) days = 1;
      if (years === 0 && months === 0 && days === 0) days = 1;
      totalWorkingDays = years * 365 + months * 30 + days;
      totalWorkingDaysWithAddition = totalWorkingDays;
    }
  }

  const periods: ContinuousPeriodResult[] = groups.map((g) => {
    const endDate = g.end >= todayStr ? todayStr : g.end;
    const dur = getDurationYMD(g.start, endDate);
    if (!dur) return { start: g.start, end: g.end, rowIndices: g.rowIndices, workingDays: 0, workingDaysWithAddition: 0 };
    let { years, months, days } = dur;
    if (days === 0 && (months > 0 || years > 0)) days = 1;
    if (years === 0 && months === 0 && days === 0) days = 1;
    const value = years * 365 + months * 30 + days;
    return { start: g.start, end: g.end, rowIndices: g.rowIndices, workingDays: value, workingDaysWithAddition: value };
  });

  return { totalWorkingDays, totalWorkingDaysWithAddition, periods, breaks };
}
