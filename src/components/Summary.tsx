import dayjs from 'dayjs';
import { DATE_FORMAT, formatDisplayDate, getWorkingDays } from '../utils/dateCalculations';
import { format2 } from '../utils/numbers';
import { formatStazGMD } from '../utils/stazFormat';
import type { DateRangeRowDto } from '../types/dto';

const FULL_DAY_HOURS = 8;

interface SummaryProps {
  rows: DateRangeRowDto[];
  rowWorkingDays: (number | null)[];
  totalWorkingDays: number;
  hideTitle?: boolean;
}

export function Summary({
  rows,
  rowWorkingDays,
  hideTitle = false,
}: SummaryProps) {
  return (
    <section className="summary">
      {!hideTitle && <h2>Pregled unesenih raspona datuma</h2>}
      <ul className="detail-list detail-list--summary">
        {rows.map((row, i) => {
          const start = dayjs(row.start, DATE_FORMAT, true);
          const end = dayjs(row.end, DATE_FORMAT, true);
          const valid =
            start.isValid() && end.isValid() && !start.isAfter(end);
          const workingDays = rowWorkingDays[i];
          const hours = row.hours ?? 8;
          return (
            <li
              key={row.id}
              className={`detail-list__row detail-list__row--summary ${valid ? '' : 'detail-list__row--invalid'}`}
            >
              <span className="detail-list__num" aria-hidden>
                {i + 1}
              </span>
              <span className="detail-list__main">
                <span className="detail-list__primary">
                  {formatDisplayDate(row.start)} – {formatDisplayDate(row.end)}
                </span>
                <span className="detail-list__secondary">
                  {row.poslodavac?.trim() || '—'} · {format2(hours)} h/dan
                </span>
              </span>
              {valid && workingDays != null ? (
                <span className="detail-list__badges">
                  <span className="detail-list__badge" title="Stvarni staž (prema h/dan)">
                    {formatStazGMD(workingDays)}
                  </span>
                  <span className="detail-list__badge detail-list__badge--fulltime" title="Staž da je puno radno vrijeme (8 h/dan)">
                    {formatStazGMD(getWorkingDays(row.start, row.end, FULL_DAY_HOURS) ?? 0)}
                  </span>
                </span>
              ) : (
                <span className="detail-list__badge detail-list__badge--invalid">Nevaljano</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
