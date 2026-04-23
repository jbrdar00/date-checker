/**
 * Full verification: parse PDF and run all calculations, print summary.
 * Run: npx tsx scripts/verify-pdf-full.ts [path-to-pdf]
 */
import { readFileSync } from 'fs';
import { PDFParse } from 'pdf-parse';
import { parsePdfDocument } from '../src/utils/parseHZMOpdf';
import {
  getWorkingDays,
  getHoursPerDate,
  getPartialAndFullDays,
  getContinuousStaz,
  getDurationYMD,
  formatDisplayDate,
} from '../src/utils/dateCalculations';
import {
  formatStazYYMMDD,
  formatStazUnformatted,
} from '../src/utils/stazFormat';

const pdfPath =
  process.argv[2] ||
  '/Users/jbrdar/Downloads/Elektronicki_zapis_260228_191117.pdf';

async function main() {
  const buf = readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const result = await parser.getText();
  const text = result?.text ?? (typeof result === 'string' ? result : '') ?? '';

  const parsed = parsePdfDocument(text);
  const { person, rows } = parsed;

  const rowWorkingDays = rows.map((row) =>
    getWorkingDays(row.start, row.end, row.hours ?? 8),
  );
  const totalWorkingDays = rowWorkingDays.reduce((s, wd) => s + (wd ?? 0), 0);
  const hoursPerDate = getHoursPerDate(rows);
  const { partialList, hoursToAddForFull, workingDaysWithAddition } =
    getPartialAndFullDays(hoursPerDate);
  const continuousStaz = getContinuousStaz(
    rows,
    rowWorkingDays,
    partialList,
    hoursPerDate,
  );

  console.log('========== OSOBA ==========');
  console.log('Ime i prezime:', person.name);
  console.log('OIB:', person.oib);
  console.log('Datum rođenja:', person.dateOfBirth);
  console.log('');

  console.log('========== PREGLED RASPO NA (svaki red) ==========');
  rows.forEach((row, i) => {
    const wd = rowWorkingDays[i];
    const dur =
      row.start && row.end ? getDurationYMD(row.start, row.end) : null;
    const durStr = dur ? `${dur.years}g ${dur.months}m ${dur.days}d` : '—';
    console.log(
      `${i + 1}. ${formatDisplayDate(row.start)} – ${formatDisplayDate(row.end)} | ${row.hours} h/dan | ${row.poslodavac || '—'} | ${wd ?? '—'} radnih dana (${durStr})`,
    );
  });
  console.log('');

  console.log('========== UKUPAN STAŽ ==========');
  console.log(
    'Ukupan staž (bez dodatka):',
    formatStazYYMMDD(totalWorkingDays),
    '|',
    formatStazUnformatted(totalWorkingDays),
  );
  console.log(
    'Ukupan staž (s dodatkom):',
    formatStazYYMMDD(workingDaysWithAddition),
    '|',
    formatStazUnformatted(workingDaysWithAddition),
  );
  console.log('Dodano sati do punog dana:', hoursToAddForFull, 'h');
  console.log('Broj djelomičnih dana:', partialList.length);
  console.log('');

  console.log('========== NEPREKIDNI STAŽ (pauza ≤ 8 dana) ==========');
  console.log(
    'Neprekidni staž (kalendarski, neprekidno do danas):',
    formatStazYYMMDD(continuousStaz.totalWorkingDays),
    '|',
    formatStazUnformatted(continuousStaz.totalWorkingDays),
  );
  console.log('Broj neprekidnih razdoblja:', continuousStaz.periods.length);
  continuousStaz.periods.forEach((p, i) => {
    console.log(
      `  Razdoblje ${i + 1}: kalendarski ${p.workingDays.toFixed(0)} dana`,
    );
  });
  if (continuousStaz.breaks.length > 0) {
    console.log('Prekidi veći od 8 dana:');
    continuousStaz.breaks.forEach((b, i) => {
      const endPos = b.endPoslodavac ? ` (${b.endPoslodavac})` : '';
      const startPos = b.startPoslodavac ? ` (${b.startPoslodavac})` : '';
      console.log(
        `  ${i + 1}. ${formatDisplayDate(b.endDate)}${endPos} → ${formatDisplayDate(b.startDate)}${startPos} · ${b.gapDays} dana prekida`,
      );
    });
  }
  console.log('');

  if (parsed.errors.length > 0) {
    console.log('Upozorenja/grješke pri uvozu:', parsed.errors.join('; '));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
