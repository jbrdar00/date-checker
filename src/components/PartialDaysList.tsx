import { format2 } from '../utils/numbers';
import type { PartialDayDto } from '../types/dto';
import type { DateRangeRowDto } from '../types/dto';

interface PartialDaysListProps {
  partialList: PartialDayDto[];
  rows: DateRangeRowDto[];
  hideTitle?: boolean;
}

function getEmployersForDate(
  dateKey: string,
  rows: DateRangeRowDto[],
): string[] {
  const names = rows
    .filter(
      (r) =>
        r.start &&
        r.end &&
        dateKey >= r.start &&
        dateKey <= r.end &&
        r.poslodavac?.trim(),
    )
    .map((r) => r.poslodavac!.trim());
  return [...new Set(names)];
}

export function PartialDaysList({
  partialList,
  rows,
  hideTitle = false,
}: PartialDaysListProps) {
  return (
    <section className="partial-days">
      {!hideTitle && <h2>Dani bez punog radnog dana</h2>}
      {!hideTitle && (
        <p className="section-desc">
          Za svaki datum zbrajaju se sati iz svih raspona koji ga uključuju.
          Dani s 8+ sati se ne prikazuju (računaju se kao puni radni dan).
        </p>
      )}
      {partialList.length > 0 ? (
        <ul className="detail-list detail-list--partial">
          {partialList.map(({ date, dateDisplay, hours, hoursToAdd }) => {
            const employers = getEmployersForDate(date, rows);
            return (
              <li
                key={date}
                className="detail-list__row detail-list__row--partial"
              >
                <span className="detail-list__primary">{dateDisplay}</span>
                <span className="detail-list__main">
                  <span className="detail-list__secondary">
                    <strong>{format2(hours)}</strong> radnih sati
                  </span>

                  {employers.length > 0 && (
                    <span className="detail-list__employers">
                      Poslodavac: {employers.join(', ')}
                    </span>
                  )}
                </span>
                <span className="detail-list__badge">
                  +{format2(hoursToAdd)} h
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="detail-panel__empty">
          Nema dana s manje od 8 radnih sati.
        </p>
      )}
    </section>
  );
}
