import { jsPDF } from 'jspdf';
import { formatDisplayDate } from './dateCalculations';
import { formatStazYYMMDD, formatStazUnformatted } from './stazFormat';
import { format2 } from './numbers';
import type { DateRangeRowDto, PartialDayDto, PersonDto } from '../types/dto';

const FONT_SIZE = 11;
const LINE_HEIGHT = 6;
const MARGIN = 20;
const PAGE_WIDTH = 210;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;

interface PdfData {
  person: PersonDto;
  rows: DateRangeRowDto[];
  rowWorkingDays: (number | null)[];
  totalWorkingDays: number;
  partialList: PartialDayDto[];
}

function addLine(
  doc: jsPDF,
  text: string,
  y: number,
  options?: { font?: 'helvetica'; style?: 'normal' | 'bold'; size?: number },
): number {
  const size = options?.size ?? FONT_SIZE;
  doc.setFontSize(size);
  doc.setFont('helvetica', options?.style ?? 'normal');
  doc.text(text, MARGIN, y, { maxWidth: MAX_WIDTH });
  return y + LINE_HEIGHT;
}

export function exportToPdf(data: PdfData): void {
  const doc = new jsPDF();
  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Provjera raspona datuma', MARGIN, y);
  y += LINE_HEIGHT * 2;

  // Person
  addLine(doc, 'Osoba', y, { style: 'bold', size: 12 });
  y += LINE_HEIGHT;
  if (data.person.name) y = addLine(doc, `Ime i prezime: ${data.person.name}`, y);
  if (data.person.oib) y = addLine(doc, `OIB: ${data.person.oib}`, y);
  if (data.person.dateOfBirth) y = addLine(doc, `Datum rođenja: ${formatDisplayDate(data.person.dateOfBirth)}`, y);
  y += LINE_HEIGHT;

  // Ranges
  addLine(doc, 'Pregled unesenih raspona datuma', y, { style: 'bold', size: 12 });
  y += LINE_HEIGHT;
  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];
    if (!row) continue;
    const wd = data.rowWorkingDays[i];
    const poslodavac = row.poslodavac ? ` · ${row.poslodavac}` : '';
    const line =
      `Red ${i + 1}: ${formatDisplayDate(row.start)} → ${formatDisplayDate(row.end)} · ${format2(row.hours ?? 8)} h/dan${poslodavac}` +
      (wd != null ? ` → ${format2(wd)} radnih dana` : '');
    y = addLine(doc, line, y);
  }
  y = addLine(
    doc,
    `Ukupan staž (bez dodatka): ${formatStazYYMMDD(data.totalWorkingDays)}`,
    y,
    { style: 'bold' },
  );
  y = addLine(doc, formatStazUnformatted(data.totalWorkingDays), y);
  y += LINE_HEIGHT;

  // Partial days
  addLine(doc, 'Dani bez punog radnog dana', y, { style: 'bold', size: 12 });
  y += LINE_HEIGHT;
  if (data.partialList.length > 0) {
    for (const p of data.partialList) {
      y = addLine(
        doc,
        `${p.dateDisplay} — ${format2(p.hours)} radnih sati (+${format2(p.hoursToAdd)} h do punog dana)`,
        y,
      );
    }
  } else {
    y = addLine(doc, 'Nema dana s manje od 8 radnih sati.', y);
  }
  y += LINE_HEIGHT;

  // Results
  addLine(doc, 'Rezultati', y, { style: 'bold', size: 12 });
  y += LINE_HEIGHT;
  y = addLine(
    doc,
    `Ukupan staž (bez dodatka): ${formatStazYYMMDD(data.totalWorkingDays)}`,
    y,
  );
  y = addLine(doc, formatStazUnformatted(data.totalWorkingDays), y);
  y += LINE_HEIGHT;

  doc.save('provjera-raspona-datuma.pdf');
}
