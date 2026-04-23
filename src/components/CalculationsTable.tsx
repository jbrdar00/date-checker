import { formatDisplayDate } from '../utils/dateCalculations';
import type { SavedCalculationDto } from '../types/dto';

interface CalculationsTableProps {
  calculations: SavedCalculationDto[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year}. ${h}:${m}`;
}

export function CalculationsTable({
  calculations,
  onOpen,
  onDelete,
}: CalculationsTableProps) {
  if (calculations.length === 0) {
    return (
      <div className="calculations-table-empty">
        <p>Nema spremljenih kalkulacija.</p>
        <p>Kliknite „Nova kalkulacija” u bočnoj traci za početak.</p>
      </div>
    );
  }

  return (
    <div className="calculations-table-wrap">
      <table className="calculations-table">
        <thead>
          <tr>
            <th>Ime i prezime</th>
            <th>OIB</th>
            <th>Datum rođenja</th>
            <th>Rasponi</th>
            <th>Zadnja izmjena</th>
            <th className="calculations-table-actions">Akcije</th>
          </tr>
        </thead>
        <tbody>
          {calculations.map((calc) => (
            <tr
              key={calc.id}
              className="calculations-table-row"
              onClick={() => onOpen(calc.id)}
            >
              <td className="calculations-table-name">
                {calc.person.name?.trim() || '—'}
              </td>
              <td>{calc.person.oib || '—'}</td>
              <td>{calc.person.dateOfBirth ? formatDisplayDate(calc.person.dateOfBirth) : '—'}</td>
              <td>
                {calc.rows.length === 1
                  ? '1 raspon'
                  : `${calc.rows.length} raspona`}
              </td>
              <td className="calculations-table-date">
                {formatDateTime(calc.updatedAt)}
              </td>
              <td className="calculations-table-actions">
                <button
                  type="button"
                  className="btn-table btn-table--open"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(calc.id);
                  }}
                >
                  Otvori
                </button>
                <button
                  type="button"
                  className="btn-table btn-table--delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Obrisati ovu kalkulaciju?')) onDelete(calc.id);
                  }}
                  title="Obriši"
                >
                  Obriši
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
