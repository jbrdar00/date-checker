import { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { DATE_FORMAT, formatDisplayDate } from '../utils/dateCalculations';
import { FULL_DAY_HOURS } from '../types/enums';
import type { DateRangeRowDto } from '../types/dto';
import type { HoursPerDateMap } from '../types/dto';

const WEEKDAY_LABELS = ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'];
const MONTH_LABELS = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac',
];

export interface RangesCalendarProps {
  rows: DateRangeRowDto[];
  hoursPerDate: HoursPerDateMap;
}

function isDateInRange(dateKey: string, start: string, end: string): boolean {
  if (!start || !end) return false;
  return dateKey >= start && dateKey <= end;
}

const MIN_YEAR = 1990;
const MAX_YEAR = dayjs().year() + 2;

export function RangesCalendar({ rows, hoursPerDate }: RangesCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => dayjs().startOf('month'));

  const yearRange = useMemo(() => {
    let min = MIN_YEAR;
    let max = MAX_YEAR;
    rows.forEach((r) => {
      if (r.start) {
        const y = dayjs(r.start, DATE_FORMAT).year();
        if (y < min) min = y;
      }
      if (r.end) {
        const y = dayjs(r.end, DATE_FORMAT).year();
        if (y > max) max = y;
      }
    });
    return { min, max };
  }, [rows]);

  const { weeks } = useMemo(() => {
    const start = viewMonth.startOf('month');
    const startWeekday = start.day() === 0 ? 6 : start.day() - 1;
    const cells: { date: dayjs.Dayjs; key: string; inMonth: boolean }[] = [];
    const firstCell = start.subtract(startWeekday, 'day');
    for (let i = 0; i < 42; i++) {
      const d = firstCell.add(i, 'day');
      const key = d.format(DATE_FORMAT);
      cells.push({
        date: d,
        key,
        inMonth: d.month() === viewMonth.month(),
      });
    }
    const weeks: typeof cells[] = [];
    for (let w = 0; w < 6; w++) {
      weeks.push(cells.slice(w * 7, w * 7 + 7));
    }
    return { weeks };
  }, [viewMonth]);

  const getColorsForDate = (dateKey: string): string[] => {
    return rows
      .filter((r) => r.color && isDateInRange(dateKey, r.start, r.end))
      .map((r) => r.color as string);
  };

  const getRowsForDate = useCallback(
    (dateKey: string): DateRangeRowDto[] =>
      rows.filter((r) => r.start && r.end && isDateInRange(dateKey, r.start, r.end)),
    [rows],
  );

  const [hoveredDate, setHoveredDate] = useState<{
    dateKey: string;
    rect: DOMRect;
  } | null>(null);

  const handleCellMouseEnter = useCallback(
    (dateKey: string, el: HTMLTableCellElement | null) => {
      const rowsOnDay = getRowsForDate(dateKey);
      if (rowsOnDay.length === 0 || !el) return;
      setHoveredDate({ dateKey, rect: el.getBoundingClientRect() });
    },
    [getRowsForDate],
  );

  const handleCellMouseLeave = useCallback(() => {
    setHoveredDate(null);
  }, []);

  return (
    <section className="ranges-calendar">
      <h2 className="ranges-calendar__title">Kalendar raspona</h2>
      <div className="ranges-calendar__nav">
        <button
          type="button"
          className="ranges-calendar__nav-btn"
          onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
          aria-label="Prethodni mjesec"
        >
          ‹
        </button>
        <div className="ranges-calendar__nav-selects">
          <select
            className="ranges-calendar__select"
            value={viewMonth.month()}
            onChange={(e) => setViewMonth((m) => m.month(Number(e.target.value)))}
            aria-label="Mjesec"
          >
            {MONTH_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="ranges-calendar__select"
            value={viewMonth.year()}
            onChange={(e) => setViewMonth((m) => m.year(Number(e.target.value)))}
            aria-label="Godina"
          >
            {Array.from({ length: yearRange.max - yearRange.min + 1 }, (_, i) => yearRange.min + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="ranges-calendar__nav-btn"
          onClick={() => setViewMonth((m) => m.add(1, 'month'))}
          aria-label="Sljedeći mjesec"
        >
          ›
        </button>
      </div>
      <div className="ranges-calendar__grid-wrap">
        <table className="ranges-calendar__table" role="grid" aria-label="Kalendar">
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((label) => (
                <th key={label} className="ranges-calendar__th">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map(({ date, key, inMonth }) => {
                  const colors = getColorsForDate(key);
                  const hours = hoursPerDate[key] ?? 0;
                  const isFullDay = hours >= FULL_DAY_HOURS;
                  const isPartialDay = hours > 0 && hours < FULL_DAY_HOURS;
                  const dayClass =
                    isFullDay
                      ? 'ranges-calendar__cell--full'
                      : isPartialDay
                        ? 'ranges-calendar__cell--partial'
                        : '';
                  const rowsOnDay = getRowsForDate(key);
                  const hasEmployment = rowsOnDay.length > 0;
                  return (
                    <td
                      key={key}
                      className={`ranges-calendar__cell ${inMonth ? 'ranges-calendar__cell--in-month' : 'ranges-calendar__cell--out-month'} ${dayClass} ${hasEmployment ? 'ranges-calendar__cell--has-employment' : ''}`}
                      onMouseEnter={(e) => handleCellMouseEnter(key, e.currentTarget)}
                      onMouseLeave={handleCellMouseLeave}
                    >
                      <span className="ranges-calendar__cell-day">{date.date()}</span>
                      {colors.length > 0 && (
                        <span className="ranges-calendar__cell-lines" aria-hidden>
                          {colors.slice(0, 3).map((c, i) => (
                            <span
                              key={`${key}-${i}`}
                              className="ranges-calendar__cell-line"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hoveredDate && (() => {
        const rowsOnDay = getRowsForDate(hoveredDate.dateKey);
        const { rect } = hoveredDate;
        const displayDate = dayjs(hoveredDate.dateKey, DATE_FORMAT).format('DD.MM.YYYY');
        return (
          <div
            className="ranges-calendar__popover"
            style={{
              left: rect.left + rect.width / 2,
              top: rect.top,
              transform: 'translate(-50%, -100%) translateY(-8px)',
            }}
            role="tooltip"
            aria-live="polite"
          >
            <div className="ranges-calendar__popover-title">
              {displayDate}
            </div>
            <ul className="ranges-calendar__popover-list">
              {rowsOnDay.map((row, i) => (
                <li key={i} className="ranges-calendar__popover-item">
                  <span className="ranges-calendar__popover-poslodavac">
                    {row.poslodavac?.trim() || '—'}
                  </span>
                  <span className="ranges-calendar__popover-range">
                    od {formatDisplayDate(row.start)} do {formatDisplayDate(row.end)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </section>
  );
}
