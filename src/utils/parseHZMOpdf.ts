import type { PersonDto, DateRangeRowDto } from '../types/dto';
import { getRandomRangeColor } from '../constants/rangeColors';

const HOURS_MIN = 0.1;
const HOURS_MAX = 8;

/** Clamp hours to 0.1–8, keep one decimal (e.g. 2.4). */
function toWorkingHours(hoursDecimal: number): number {
  const n = Number.isFinite(hoursDecimal) ? hoursDecimal : 8;
  const clamped = Math.max(HOURS_MIN, Math.min(HOURS_MAX, n));
  return Math.round(clamped * 10) / 10;
}

/** Parse DD.MM.YYYY. or DD.MM.YYYY to YYYY-MM-DD. */
function parseCroatianDate(s: string): string {
  const trimmed = s.trim().replace(/\.$/, '');
  const m = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return '';
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
}

/** Replace comma decimal with dot and parse number. */
function parseHours(s: string): number {
  const n = parseFloat(s.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 8;
}

/** Today's date as YYYY-MM-DD (for ongoing employment when PDF has no end date). */
function getTodayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface ParseHZMOResult {
  person: PersonDto;
  rows: DateRangeRowDto[];
  errors: string[];
}

/** Return true if line looks like a person name (not a label or number). */
function looksLikeName(line: string): boolean {
  const t = line.trim();
  if (t.length < 2 || t.length > 120) return false;
  if (/^\d+$/.test(t) || /^\d{11}$/.test(t.replace(/\s/g, ''))) return false;
  if (
    /^(OIB|IME|PREZIME|DRŽAVLJANSTVO|Datum|Osnova|Trajanje|Početak|Prestanak|Radno|Općina|REGOB|R\.b\.|HRVATSKO)/i.test(
      t,
    )
  )
    return false;
  if (/^\d{2}\.\d{2}\.\d{4}/.test(t)) return false;
  return /[A-Za-zČĆŽŠĐčćžšđ]/.test(t);
}

/** Return true if line looks like employer name (letters, maybe spaces/dots, no date pattern). */
function looksLikeEmployer(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 200) return false;
  if (/^\d{1,2}[,.]\d\s+\d{2}\.\d{2}\.\d{4}/.test(t)) return false;
  if (/^\d{2}\.\d{2}\.\d{4}/.test(t)) return false;
  if (/^[\d\s,.-]+$/.test(t)) return false;
  return /[A-Za-zČĆŽŠĐčćžšđ]/.test(t);
}

/**
 * Get header text: everything before the first employment date row (hours + dates line).
 * In HZMO PDF, person data (IME, PREZIME, OIB, DATUM ROÐENJA) is in this header.
 */
function getHeaderText(text: string): string {
  const firstRow = text.match(
    /\d{1,2}[,.]\d\s+\d{2}\.\d{2}\.\d{4}\.\s+\d{2}\.\d{2}\.\d{4}\./,
  );
  const firstSingle = text.match(
    /\d{1,2}[,.]\d\s+\d{2}\.\d{2}\.\d{4}\.(?!\s+\d{2}\.\d{2}\.\d{4})/,
  );
  const pos1 = firstRow ? text.indexOf(firstRow[0]) : text.length;
  const pos2 = firstSingle ? text.indexOf(firstSingle[0]) : text.length;
  const cut = Math.min(pos1, pos2);
  return text.slice(0, cut);
}

/**
 * Parse HZMO "Elektronički zapis" PDF text.
 * Layout: person block has values then labels (e.g. MILENA, POPOVIĆ, 75673562821, 21.06.1980., then PREZIME, IME, OIB, DATUM ROÐENJA).
 * Document date "Zagreb, DD.MM.YYYY." is NOT date of birth. Employer name is on the line AFTER the date-range line.
 */
export function parseHZMODocument(text: string): ParseHZMOResult {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const textByLines = text.split(/\r?\n/).map((l) => l.trim());
  const headerText = getHeaderText(text);
  const headerLines = headerText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const person: PersonDto = {
    name: '',
    oib: '',
    dateOfBirth: '',
  };

  // ----- OIB: person OIB is in header, the 11-digit line that appears immediately BEFORE the birth date line -----
  for (let i = 0; i < headerLines.length; i++) {
    const line = headerLines[i];
    if (line === undefined) continue;
    const dateMatch = line.match(/^(\d{2}\.\d{2}\.\d{4})\.?$/);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1];
    if (dateStr === '22.01.2025') continue;
    const prev = headerLines[i - 1];
    if (prev && /^\d{11}$/.test(prev.replace(/\s/g, ''))) {
      person.oib = prev.replace(/\s/g, '').slice(0, 11);
      break;
    }
  }
  if (!person.oib) {
    const oibInFooter = text.match(/OIB:\s*(\d{11})\s+\d+\/\d+/);
    if (oibInFooter?.[1]) person.oib = oibInFooter[1];
  }
  if (!person.oib) {
    const anyInHeader = headerText.match(/\b(\d{11})\b/);
    if (anyInHeader?.[1]) person.oib = anyInHeader[1];
  }

  // ----- Date of birth: in header, the date that is NOT document issue "22.01.2025" -----
  for (let i = 0; i < headerLines.length; i++) {
    const line = headerLines[i];
    if (line === undefined) continue;
    const dateMatch = line.match(/^(\d{2}\.\d{2}\.\d{4})\.?$/);
    if (!dateMatch?.[1]) continue;
    const d = dateMatch[1];
    if (d === '22.01.2025') continue;
    person.dateOfBirth = parseCroatianDate(d + '.');
    break;
  }

  // ----- Name: in HZMO PDF, IME and PREZIME values appear BEFORE the labels (e.g. MILENA, POPOVIĆ then PREZIME, IME) -----
  const nameLike = headerLines.filter(
    (l) =>
      l.length >= 2 &&
      l.length <= 80 &&
      /^[A-ZČĆŽŠĐa-zčćžšđ\-]+$/.test(l) &&
      !/^(HRVATSKO|DATUM|OSOBNI|PREZIME|IME|DRŽAVLJANSTVO|OIB|ELEKTRONIČKI|VSS|VŠS|KV|OMIŠ|SPLIT|ZAGREB|RADNI|NAKNADA|HRVATSKI|Trajanje|Početak|Prestanak|Radno|Općina|Ugovor|Stvarna|Potrebna|REGOB|R\.b\.|KONFEDER|ACIJE|ODNOS|PRAVNE|OSOBE|DRŽAVLJANI|OBV|SIG|PLAĆE|ZBOG|BOLOVANJA|PREMA|PROPISIMA)$/i.test(
        l,
      ),
  );
  if (nameLike.length >= 2) {
    person.name = nameLike.slice(0, 2).join(' ').trim();
  } else if (nameLike.length === 1) {
    const first = nameLike[0];
    if (first) person.name = first;
  }
  if (!person.name) {
    const imeIdx = headerLines.indexOf('IME');
    const prezimeIdx = headerLines.indexOf('PREZIME');
    const imeLinePrev = imeIdx > 0 ? headerLines[imeIdx - 1] : undefined;
    const prezLinePrev = prezimeIdx > 0 ? headerLines[prezimeIdx - 1] : undefined;
    if (imeIdx >= 0 && imeLinePrev !== undefined && looksLikeName(imeLinePrev)) {
      const prez = prezimeIdx >= 0 && prezLinePrev !== undefined && looksLikeName(prezLinePrev) ? prezLinePrev : '';
      person.name = [imeLinePrev, prez].filter(Boolean).join(' ');
    }
  }
  if (!person.name) {
    const imeLine = lines.find(
      (l) =>
        /^[A-ZČĆŽŠĐ][a-zčćžšđ]+$/.test(l) &&
        l.length > 2 &&
        !/^(VSS|VŠS|KV|OMIŠ|SPLIT|ZAGREB|RADNI|NAKNADA|HRVATSKI|ELEKTRONIČKI|Datum|Osnova|Trajanje|Početak|Prestanak|Radno|Općina|Ugovor|Stvarna|Potrebna|REGOB|OIB|R\.b\.|HRVATSKO)/i.test(
          l,
        ),
    );
    const prezimeLine = lines.find(
      (l) =>
        /^[A-ZČĆŽŠĐ][a-zčćžšđ\-]+$/i.test(l) && l.length > 2 && l !== imeLine,
    );
    if (imeLine && prezimeLine)
      person.name = `${imeLine} ${prezimeLine}`.trim();
    else if (imeLine) person.name = imeLine;
  }

  // Rows: match "X,X or X.X  DD.MM.YYYY.  DD.MM.YYYY." (hours, end, start - order in PDF) or "X,X  DD.MM.YYYY." (single date)
  const rowPattern =
    /(\d{1,2}[,.]\d)\s+(\d{2}\.\d{2}\.\d{4}\.)\s+(\d{2}\.\d{2}\.\d{4}\.)/g;
  const singleDatePattern =
    /(\d{1,2}[,.]\d)\s+(\d{2}\.\d{2}\.\d{4}\.)(?!\s+\d{2}\.\d{2}\.)/g;
  const rows: {
    start: string;
    end: string;
    hours: number;
    poslodavac: string;
  }[] = [];
  let m;
  const used = new Set<string>();
  while ((m = rowPattern.exec(text)) !== null) {
    const hoursStr = m[1];
    const endStr = m[2];
    const startStr = m[3];
    if (hoursStr === undefined || endStr === undefined || startStr === undefined) continue;
    const key = `${startStr}-${endStr}`;
    if (used.has(key)) continue;
    used.add(key);
    const start = parseCroatianDate(startStr);
    const end = parseCroatianDate(endStr);
    const hours = parseHours(hoursStr);
    if (!start || !end) continue;
    rows.push({ start, end, hours: toWorkingHours(hours), poslodavac: '' });
  }
  // Single date (ongoing): no end date in PDF = person still working there → end = today
  const todayStr = getTodayYYYYMMDD();
  while ((m = singleDatePattern.exec(text)) !== null) {
    const hoursStr = m[1];
    const dateStr = m[2];
    if (hoursStr === undefined || dateStr === undefined) continue;
    const start = parseCroatianDate(dateStr);
    if (!start) continue;
    const key = `${start}-${todayStr}`;
    if (used.has(key)) continue;
    used.add(key);
    const hours = parseHours(hoursStr);
    rows.push({
      start,
      end: todayStr,
      hours: toWorkingHours(hours),
      poslodavac: '',
    });
  }

  // Sort by start date and attach employer (poslodavac)
  rows.sort((a, b) => a.start.localeCompare(b.start));

  // In HZMO PDF the employer name is on the line AFTER the line containing "hours  end_date  start_date"
  const rowPatternInline =
    /(\d{1,2}[,.]\d)\s+(\d{2}\.\d{2}\.\d{4}\.)\s+(\d{2}\.\d{2}\.\d{4}\.)/;
  const singleDateInline =
    /(\d{1,2}[,.]\d)\s+(\d{2}\.\d{2}\.\d{4}\.)(?!\s+\d{2}\.\d{2}\.\d{4})/;
  for (let i = 0; i < textByLines.length; i++) {
    const line = textByLines[i];
    if (line === undefined) continue;
    let start = '';
    let end = '';
    const matchTwo = line.match(rowPatternInline);
    const matchOne = line.match(singleDateInline);
    const startStrTwo = matchTwo?.[3];
    const endStrTwo = matchTwo?.[2];
    const startStrOne = matchOne?.[2];
    if (matchTwo && startStrTwo !== undefined && endStrTwo !== undefined) {
      start = parseCroatianDate(startStrTwo);
      end = parseCroatianDate(endStrTwo);
    } else if (matchOne && startStrOne !== undefined) {
      start = parseCroatianDate(startStrOne);
      end = getTodayYYYYMMDD();
    } else continue;
    const r = rows.find((row) => row.start === start && row.end === end);
    if (!r || r.poslodavac !== '') continue;

    const nextLine = textByLines[i + 1]?.trim() || '';
    if (nextLine.length > 2 && looksLikeEmployer(nextLine)) {
      r.poslodavac = nextLine.replace(/\s+/g, ' ').trim();
      continue;
    }
    const matched = (matchTwo || matchOne)?.[0];
    const beforePattern = matched
      ? line.slice(0, line.indexOf(matched)).trim()
      : '';
    if (beforePattern.length > 2 && looksLikeEmployer(beforePattern)) {
      r.poslodavac = beforePattern.replace(/\s+/g, ' ').trim();
      continue;
    }
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const prevLine = textByLines[j];
      if (prevLine === undefined) continue;
      const prev = prevLine.trim();
      if (prev.length < 3) continue;
      if (
        /^(Početak|Prestanak|Osnova|Trajanje|Radno|Stvarna|Potrebna|OIB|REGOB|R\.b\.|Datum)/i.test(
          prev,
        )
      )
        continue;
      if (
        /^\d{1,2}[,.]\d\s+\d{2}\.\d{2}\.\d{4}/.test(prev) ||
        /^\d{2}\.\d{2}\.\d{4}/.test(prev)
      )
        continue;
      if (looksLikeEmployer(prev)) {
        r.poslodavac = prev.replace(/\s+/g, ' ').trim();
        break;
      }
    }
  }

  const usedColors = new Set<string>();
  const dateRangeRows: DateRangeRowDto[] = rows.map((row, index) => ({
    id: index + 1,
    start: row.start,
    end: row.end,
    hours: row.hours,
    poslodavac: row.poslodavac,
    javnaUstanova: true,
    color: getRandomRangeColor(usedColors),
  }));

  if (dateRangeRows.length === 0)
    errors.push('Nije pronađen nijedan raspon datuma u PDF-u.');
  if (!person.oib) errors.push('OIB nije pronađen.');
  if (!person.dateOfBirth) errors.push('Datum rođenja nije pronađen.');

  return {
    person: { ...person, name: person.name || 'Uvezeno iz PDF-a' },
    rows:
      dateRangeRows.length > 0
        ? dateRangeRows
        : [
            {
              id: 1,
              start: '',
              end: '',
              hours: 8,
              poslodavac: '',
              javnaUstanova: true,
              color: getRandomRangeColor(),
            },
          ],
    errors,
  };
}

/** Detect eRadnaKnjizica format: "Ime i prezime:", "Prijave na mirovinsko osiguranje", "REGOB:" with dates. */
function isERadnaKnjizicaFormat(text: string): boolean {
  return (
    /Ime i prezime:\s*.+/.test(text) &&
    /Prijave na mirovinsko osiguranje/i.test(text) &&
    /OIB:\s*\d+\s+REGOB:\s*\d+\s+\d{2}\.\d{2}\.\d{4}\.\s+\d{2}\.\d{2}\.\d{4}\.?/.test(
      text,
    )
  );
}

/**
 * Parse eRadnaKnjizica / ERPS "ELEKTRONIČKI ZAPIS" PDF text.
 * Layout: "Ime i prezime: NAME", "Datum rođenja: DD.MM.YYYY.", "OIB: 11digits";
 * then table rows: employer line(s), then "OIB: X REGOB: Y DD.MM.YYYY. DD.MM.YYYY.", then "RADNI ODNOS ... HOURS".
 */
export function parseERadnaKnjizicaDocument(text: string): ParseHZMOResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const person: PersonDto = {
    name: '',
    oib: '',
    dateOfBirth: '',
  };

  // Person: Ime i prezime: ... / Datum rođenja: ... / OIB: ...
  const nameMatch = text.match(/Ime i prezime:\s*(.+?)(?:\n|$)/);
  const nameVal = nameMatch?.[1];
  if (nameVal) person.name = nameVal.trim();

  const dobMatch = text.match(/Datum rođenja:\s*(\d{2}\.\d{2}\.\d{4})\.?/);
  const dobVal = dobMatch?.[1];
  if (dobVal) person.dateOfBirth = parseCroatianDate(dobVal + '.');

  const oibMatch = text.match(/OIB:\s*(\d{11})\b/);
  const oibVal = oibMatch?.[1];
  if (oibVal) person.oib = oibVal;

  // Rows: find "OIB: ... REGOB: ... DD.MM.YYYY. DD.MM.YYYY." (Početak, Prestanak) or single date (ongoing → end = today)
  const dateLineRegex =
    /OIB:\s*\d+\s+REGOB:\s*\d+\s+(\d{2}\.\d{2}\.\d{4})\.?\s+(\d{2}\.\d{2}\.\d{4})\.?/;
  // One date only (ongoing employment): match line ending with DD.MM.YYYY. and no second date
  const dateLineRegexSingle =
    /OIB:\s*\d+\s+REGOB:\s*\d+\s+(\d{2}\.\d{2}\.\d{4})\.?\s*$/;
  const dateOnlyRegex =
    /^(\d{2}\.\d{2}\.\d{4})\.?\s+(\d{2}\.\d{2}\.\d{4})\.?\s*$/;
  const todayStr = getTodayYYYYMMDD();
  const rows: {
    start: string;
    end: string;
    hours: number;
    poslodavac: string;
  }[] = [];

  const singleDateRegex = /^(\d{2}\.\d{2}\.\d{4})\.?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    let m = line.match(dateLineRegex);
    let dateLineIndex = i;
    if (!m && i + 1 < lines.length && /OIB:\s*\d+\s+REGOB:\s*\d+/.test(line)) {
      const nextLine = lines[i + 1] ?? '';
      const dateMatch =
        nextLine.match(dateOnlyRegex) ??
        nextLine.match(/(\d{2}\.\d{2}\.\d{4})\.?\s+(\d{2}\.\d{2}\.\d{4})\.?/);
      if (dateMatch && dateMatch[1] && dateMatch[2]) {
        m = dateMatch;
        dateLineIndex = i + 1;
      }
      // Dates on two separate lines: line i+1 = start, line i+2 = end (e.g. "08.12.2020." then "18.12.2020.")
      if (!m && i + 2 < lines.length) {
        const startLine = lines[i + 1] ?? '';
        const endLine = lines[i + 2] ?? '';
        const startMatch = startLine.match(singleDateRegex);
        const endMatch = endLine.match(singleDateRegex);
        if (startMatch?.[1] && endMatch?.[1]) {
          const start = parseCroatianDate(startMatch[1] + '.');
          const end = parseCroatianDate(endMatch[1] + '.');
          if (start && end) {
            m = [startLine + ' ' + endLine, startMatch[1], endMatch[1]] as RegExpMatchArray;
            dateLineIndex = i + 2;
          }
        }
      }
    }
    // Single date (ongoing): no end date in PDF → end = today (same line or next line)
    if (!m) {
      const singleMatch = line.match(dateLineRegexSingle);
      if (singleMatch?.[1]) {
        const start = parseCroatianDate(singleMatch[1] + '.');
        if (start) {
          m = [singleMatch[0], singleMatch[1], todayStr] as RegExpMatchArray;
          dateLineIndex = i;
        }
      }
      if (!m && i + 1 < lines.length && /OIB:\s*\d+\s+REGOB:\s*\d+\s*$/.test(line.trim())) {
        const nextLine = lines[i + 1] ?? '';
        const singleDateNext = nextLine.match(/^(\d{2}\.\d{2}\.\d{4})\.?\s*$/);
        if (singleDateNext?.[1]) {
          const start = parseCroatianDate(singleDateNext[1] + '.');
          if (start) {
            m = [nextLine, singleDateNext[1], todayStr] as RegExpMatchArray;
            dateLineIndex = i + 1;
          }
        }
      }
    }
    if (!m || !m[1]) continue;
    const start = parseCroatianDate(m[1] + '.');
    const end =
      m[2] && m[2].length === 10 && m[2].includes('-')
        ? m[2]
        : m[2]
          ? parseCroatianDate(m[2] + '.')
          : todayStr;
    if (!start || !end) continue;
    // Do not deduplicate by (start,end): same date range can appear for different employers (e.g. two schools, same period).

    const contentStart = dateLineIndex;
    // Hours: handle page-break split rows (date line on one page, "RADNI ODNOS ... X,X" on next page).
    let hours = 8;
    for (
      let j = contentStart + 1;
      j < Math.min(contentStart + 80, lines.length);
      j++
    ) {
      const ln = (lines[j] ?? '').trim();
      if (!ln) continue;

      // Skip page/header noise between split row parts.
      if (
        /^ERPS$/i.test(ln) ||
        /^Stranica\s+\d+\s+od\s+\d+/i.test(ln) ||
        /^--\s*\d+\s+of\s+\d+\s*--$/i.test(ln) ||
        /^R\.br\.$/i.test(ln) ||
        /^Podaci o poslodavcu/i.test(ln) ||
        /^Osnova osiguranja/i.test(ln) ||
        /^Radno$/i.test(ln) ||
        /^vrijeme$/i.test(ln) ||
        /^\(sati$/i.test(ln) ||
        /^dnevno\)$/i.test(ln) ||
        /^Razina$/i.test(ln) ||
        /^stečene$/i.test(ln) ||
        /^potrebne$/i.test(ln) ||
        /^kvalifikacije$/i.test(ln) ||
        /^mjesta rada-/i.test(ln) ||
        /^prebivališta/i.test(ln) ||
        /^Trajanje staža/i.test(ln) ||
        /^osiguranja$/i.test(ln)
      ) {
        continue;
      }

      // Stop when next employment block starts and we still have not found hours.
      if (/^\d+\.\s*/.test(ln) || /^OIB:\s*\d+\s+REGOB:/.test(ln)) break;

      // Primary: line containing RADNI ODNOS with hours.
      const inRadniOdnos = /RADNI ODNOS/i.test(ln)
        ? ln.match(/(\d{1,2}[,.]\d)/)
        : null;
      if (inRadniOdnos?.[1]) {
        hours = toWorkingHours(parseHours(inRadniOdnos[1]));
        break;
      }

      // Fallback: standalone hours line (e.g. "8,0 VSS ...").
      const standalone = ln.match(
        /^(\d{1,2}[,.]\d)\s+(?:VSS|VŠS|SSS|NSS|KV|PKV|NKV|-|mr\.|dr\.)/i,
      );
      if (standalone?.[1]) {
        hours = toWorkingHours(parseHours(standalone[1]));
        break;
      }
    }

    // Employer: lines before the OIB/date block until we hit "N." or header
    const employerParts: string[] = [];
    const blockStart = i;
    for (let k = blockStart - 1; k >= 0; k--) {
      let prev = lines[k] ?? '';
      if (
        /^\d+\.\s*$/.test(prev) ||
        /^R\.br\./i.test(prev) ||
        /^Podaci o poslodavcu/i.test(prev)
      )
        break;
      if (/^OIB:\s*\d+\s+REGOB:/.test(prev)) break;
      if (/RADNI ODNOS/i.test(prev)) break;
      // Row number and employer can be on same line: "5. OSNOVNA ŠKOLA..."
      const numPrefix = prev.match(/^(\d+\.)\s*(.+)$/);
      if (numPrefix?.[2]) prev = numPrefix[2].trim();
      if (
        prev.length >= 2 &&
        !/^\d{2}\.\d{2}\.\d{4}/.test(prev) &&
        /[A-Za-zČĆŽŠĐčćžšđ]/.test(prev)
      ) {
        employerParts.unshift(prev);
      }
    }
    const poslodavac = employerParts.join(' ').replace(/\s+/g, ' ').trim();

    rows.push({ start, end, hours, poslodavac });
  }

  rows.sort((a, b) => a.start.localeCompare(b.start));

  const usedColors = new Set<string>();
  const dateRangeRows: DateRangeRowDto[] = rows.map((row, index) => ({
    id: index + 1,
    start: row.start,
    end: row.end,
    hours: row.hours,
    poslodavac: row.poslodavac,
    javnaUstanova: true,
    color: getRandomRangeColor(usedColors),
  }));

  if (dateRangeRows.length === 0)
    errors.push('Nije pronađen nijedan raspon datuma u PDF-u.');
  if (!person.oib) errors.push('OIB nije pronađen.');
  if (!person.dateOfBirth) errors.push('Datum rođenja nije pronađen.');

  return {
    person: { ...person, name: person.name || 'Uvezeno iz PDF-a' },
    rows:
      dateRangeRows.length > 0
        ? dateRangeRows
        : [
            {
              id: 1,
              start: '',
              end: '',
              hours: 8,
              poslodavac: '',
              javnaUstanova: true,
              color: getRandomRangeColor(),
            },
          ],
    errors,
  };
}

/** Parse PDF text: auto-detect HZMO vs eRadnaKnjizica format and use the appropriate parser. */
export function parsePdfDocument(text: string): ParseHZMOResult {
  if (isERadnaKnjizicaFormat(text)) {
    return parseERadnaKnjizicaDocument(text);
  }
  return parseHZMODocument(text);
}
