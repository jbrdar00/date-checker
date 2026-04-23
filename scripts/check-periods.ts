/**
 * One-off script: for each period compute working days (app logic) and compare sum vs full range.
 * Run: npx tsx scripts/check-periods.ts
 */
import dayjs from 'dayjs';

const DATE_FORMAT = 'YYYY-MM-DD';
const FULL_DAY_HOURS = 8;

function toInternal(dateDDMMYYYY: string): string {
  const [d, m, y] = dateDDMMYYYY.split('.');
  return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function getDurationYMD(
  start: string,
  end: string,
): { years: number; months: number; days: number } | null {
  const s = dayjs(start, DATE_FORMAT, true);
  const e = dayjs(end, DATE_FORMAT, true);
  if (!s.isValid() || !e.isValid() || s.isAfter(e)) return null;
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
  const days = e.diff(cur, 'day') + 1;
  if (days < 0) return null;
  return { years, months, days };
}

function getWorkingDays(start: string, end: string, hoursPerDay: number): number | null {
  const dur = getDurationYMD(start, end);
  if (!dur) return null;
  let { years, months, days } = dur;
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

function formatGMD(workingDays: number): string {
  const total = round2(workingDays);
  const DAYS_PER_YEAR = 365;
  const DAYS_PER_MONTH = 30;
  const years = Math.floor(total / DAYS_PER_YEAR);
  const restAfterYears = total - years * DAYS_PER_YEAR;
  const months = Math.floor(restAfterYears / DAYS_PER_MONTH);
  const daysRem = restAfterYears - months * DAYS_PER_MONTH;
  const daysInt = Math.round(daysRem);
  const yy = Math.min(99, years).toString().padStart(2, '0');
  const mm = Math.min(99, months).toString().padStart(2, '0');
  const dd = Math.min(99, Math.max(0, daysInt)).toString().padStart(2, '0');
  return `${yy}g${mm}m${dd}d`;
}

const PERIODS = [
  '01.12.1994 – 10.02.1997',
  '01.01.1998 – 29.02.2004',
  '01.03.2004 – 30.11.2005',
  '01.12.2005 – 31.01.2011',
  '01.02.2011 – 28.02.2011',
  '16.05.2011 – 16.05.2014',
  '17.05.2014 – 22.02.2017',
  '01.03.2017 – 22.08.2019',
  '23.08.2019 – 31.08.2019',
  '01.09.2019 – 03.09.2019',
  '05.06.2020 – 10.01.2021',
  '11.01.2021 – 31.03.2022',
  '01.04.2022 – 31.03.2025',
  '01.04.2025 – 05.01.2026',
];

function main() {
  const rows: { label: string; start: string; end: string; wd: number; gmd: string }[] = [];
  let sumWD = 0;

  for (const line of PERIODS) {
    const parts = line.split(/\s*[–\-]\s*/);
    const startStr = parts[0]?.trim();
    const endStr = parts[1]?.trim();
    if (!startStr || !endStr) throw new Error(`Invalid line: ${line}`);
    const start = toInternal(startStr);
    const end = toInternal(endStr);
    const wd = getWorkingDays(start, end, 8) ?? 0;
    sumWD += wd;
    rows.push({
      label: line,
      start,
      end,
      wd,
      gmd: formatGMD(wd),
    });
  }

  console.log('--- Per-period working days (8h/day) ---\n');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    console.log(`${(i + 1).toString().padStart(2)}. ${r.label}`);
    console.log(`    ${r.wd.toFixed(2)} rd  ·  ${r.gmd}\n`);
  }

  console.log('--- Sum of all periods ---');
  console.log(`Sum (working days): ${sumWD.toFixed(2)}`);
  console.log(`Sum (GMD):          ${formatGMD(sumWD)}\n`);

  const firstStart = rows[0]!.start;
  const lastEnd = rows[rows.length - 1]!.end;
  const fullRangeWD = getWorkingDays(firstStart, lastEnd, 8);
  console.log('--- Single range (first start → last end) ---');
  console.log(`Range: ${firstStart} → ${lastEnd}`);
  console.log(`Working days (one range): ${fullRangeWD?.toFixed(2) ?? 'null'}`);
  if (fullRangeWD != null) {
    console.log(`GMD: ${formatGMD(fullRangeWD)}\n`);
  }

  console.log('--- Comparison ---');
  console.log(`Sum of periods:     ${sumWD.toFixed(2)}`);
  console.log(`One full range:    ${fullRangeWD?.toFixed(2) ?? 'N/A'}`);
  if (fullRangeWD != null) {
    const diff = sumWD - fullRangeWD;
    console.log(`Difference:         ${diff.toFixed(2)} (sum - fullRange)`);
  }
}

main();
