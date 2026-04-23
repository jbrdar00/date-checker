import type { SavedCalculationDto } from '../types/dto';

interface CalculationListViewProps {
  calculations: SavedCalculationDto[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('hr-HR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rangeLabel(calc: SavedCalculationDto): string {
  const count = calc.rows.length;
  return count === 1 ? '1 raspon' : `${count} raspona`;
}

export function CalculationListView({
  calculations,
  onOpen,
  onNew,
  onDelete,
}: CalculationListViewProps) {
  return (
    <div className="calculation-list">
      <div className="calculation-list-header">
        <h1 className="calculation-list-title">Kalkulator radnog staža</h1>
        <p className="calculation-list-subtitle">
          Odaberite postojeći unos ili krenite s novim.
        </p>
      </div>

      <button
        type="button"
        className="btn-new-calculation"
        onClick={onNew}
      >
        <span className="btn-new-icon">+</span>
        Nova kalkulacija
      </button>

      <ul className="calculation-cards">
        {calculations.length === 0 ? (
          <li className="calculation-empty">
            <p>Nema spremljenih kalkulacija.</p>
            <p>Kliknite „Nova kalkulacija” za početak.</p>
          </li>
        ) : (
          calculations.map((calc) => (
            <li key={calc.id} className="calculation-card-wrap">
              <button
                type="button"
                className="calculation-card"
                onClick={() => onOpen(calc.id)}
              >
                <div className="calculation-card-main">
                  <span className="calculation-card-name">
                    {calc.person.name?.trim() || 'Bez imena'}
                  </span>
                  {calc.person.oib ? (
                    <span className="calculation-card-oib">OIB {calc.person.oib}</span>
                  ) : null}
                  <span className="calculation-card-meta">{rangeLabel(calc)}</span>
                </div>
                <span className="calculation-card-date">
                  {formatDate(calc.updatedAt)}
                </span>
                <span className="calculation-card-chevron">›</span>
              </button>
              <button
                type="button"
                className="calculation-card-delete"
                onClick={(e) => onDelete(calc.id, e)}
                title="Obriši"
                aria-label="Obriši"
              >
                Obriši
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
