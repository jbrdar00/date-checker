/**
 * Run: npx tsx scripts/calc-person.ts
 * Reads rows from stdin (JSON array) or from first arg file path.
 */
import { readFileSync } from 'fs';
import { getSumOfDurationsYMD, getTotalWorkingDaysMixed, getWorkingDays, getHoursPerDate, getDurationYMD } from '../src/utils/dateCalculations';
import { formatYMDtoGMD, formatStazGMD, formatStazYYMMDD, formatStazUnformatted } from '../src/utils/stazFormat';
import type { DateRangeRowDto } from '../src/types/dto';

const DISPLAY_DATE_FORMAT = 'DD.MM.YYYY';

function formatDate(s: string): string {
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}.`;
}

const input = process.argv[2]
  ? readFileSync(process.argv[2], 'utf-8')
  : readFileSync(0, 'utf-8');
const rows: DateRangeRowDto[] = JSON.parse(input);

const sumYMD = getSumOfDurationsYMD(rows);
const totalWD = getTotalWorkingDaysMixed(rows);
const allFullTime = rows.every((r) => (r.hours ?? 8) === 8);

console.log('--- Po rasponu (radni dani, GMD) ---\n');
let i = 1;
for (const row of rows) {
  const wd = getWorkingDays(row.start, row.end, row.hours ?? 8);
  const gmd = wd != null ? formatStazGMD(wd) : '—';
  const hours = row.hours ?? 8;
  console.log(
    `${i}. ${formatDate(row.start)} – ${formatDate(row.end)}  ${hours} h/dan  →  ${wd?.toFixed(2) ?? '—'} rd  ·  ${gmd}`
  );
  i++;
}

console.log('\n--- Trajanje (y,m,d) po rasponu (prije normalizacije) ---');
let rawY = 0, rawM = 0, rawD = 0;
for (const row of rows) {
  const dur = getDurationYMD(row.start, row.end);
  if (!dur) continue;
  rawY += dur.years;
  rawM += dur.months;
  rawD += dur.days;
  console.log(`${row.id}. (${dur.years}, ${dur.months}, ${dur.days})  ${formatDate(row.start)} – ${formatDate(row.end)}`);
}
console.log(`\nZbroj (prije norm.): ${rawY}y ${rawM}m ${rawD}d`);

console.log('\n--- Zbroj GMD (nakon normalizacije: 30d→1m, 12m→1y) ---');
console.log(`${formatYMDtoGMD(sumYMD.years, sumYMD.months, sumYMD.days)}`);
console.log(`(${sumYMD.years} godina, ${sumYMD.months} mjeseci, ${sumYMD.days} dana)\n`);

// Zbroj "staž da je puno radno vrijeme" (8h/dan) po rasponu: zbroj getWorkingDays(..., 8) → ukupno rd → GMD
const FULL_DAY = 8;
let sumFullTimeWD = 0;
for (const row of rows) {
  const wd = getWorkingDays(row.start, row.end, FULL_DAY);
  if (wd != null) sumFullTimeWD += wd;
}
console.log('--- Zbroj svih narančastih (staž puno radno vrijeme 8h/dan) ---');
console.log(`Ukupno radnih dana: ${Math.round(sumFullTimeWD * 100) / 100}`);
console.log(`GMD: ${formatStazGMD(sumFullTimeWD)}`);
console.log('');

console.log('--- Bez dodatka ---');
console.log(`Total working days: ${totalWD.toFixed(2)}`);
console.log(`YYMMDD: ${formatStazYYMMDD(totalWD)}`);
console.log(`${formatStazUnformatted(totalWD)}`);
console.log(`\n(allFullTime = ${allFullTime})`);

// Radni staž samo za dane koji nisu do punog radnog vremena (< 8 h): zbroj (sati/8) po danu
const hoursPerDate = getHoursPerDate(rows);
const FULL_DAY = 8;
let partialOnlyWD = 0;
for (const totalHours of Object.values(hoursPerDate)) {
  if (totalHours > 0 && totalHours < FULL_DAY) partialOnlyWD += totalHours / FULL_DAY;
}
console.log('\n--- Radni staž samo djelomični dani (< 8 h) ---');
console.log(`Radnih dana (sati/8 po danu): ${Math.round(partialOnlyWD * 100) / 100}`);

// Zbroj sati koje fale do punog dana (za svaki dan < 8h: 8 - sati)
let hoursMissingToFull = 0;
for (const totalHours of Object.values(hoursPerDate)) {
  if (totalHours > 0 && totalHours < FULL_DAY) hoursMissingToFull += FULL_DAY - totalHours;
}
console.log('\n--- Sati koje fale do punog radnog dana ---');
console.log(`Ukupno sati: ${Math.round(hoursMissingToFull * 100) / 100} h`);
