import dayjs from 'dayjs';
import { DATE_FORMAT } from '../constants/dateFormats';
import type { DateRangeRowDto } from '../types/dto';

/** Returns true if the row has valid start, end (start <= end). */
export function isRowFilled(row: DateRangeRowDto): boolean {
  const s = dayjs(row.start, DATE_FORMAT, true);
  const e = dayjs(row.end, DATE_FORMAT, true);
  return s.isValid() && e.isValid() && !s.isAfter(e);
}

/** Add button is enabled only when all current rows are filled. */
export function canAddRow(rows: DateRangeRowDto[]): boolean {
  return rows.length > 0 && rows.every(isRowFilled);
}
