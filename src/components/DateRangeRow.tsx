import { formatDisplayDate } from '../utils/dateCalculations';
import { format2 } from '../utils/numbers';
import type { DateRangeRowDto } from '../types/dto';

export type RowField = 'start' | 'end' | 'hours' | 'poslodavac' | 'javnaUstanova' | 'color';

interface DateRangeRowProps {
  row: DateRangeRowDto;
  onChange: (id: number, field: RowField, value: string | number | boolean) => void;
  onRemove: (id: number) => void;
  onSave: (id: number) => void;
  isSaved: boolean;
  canRemove: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const ChevronDown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export function DateRangeRow({
  row,
  onChange,
  onRemove,
  onSave,
  isSaved,
  canRemove,
  isExpanded,
  onToggle,
}: DateRangeRowProps) {
  const rangeText =
    row.start && row.end
      ? `${formatDisplayDate(row.start)} – ${formatDisplayDate(row.end)}`
      : 'Nije unesen raspon';
  const subtitle = [row.poslodavac?.trim() || 'Poslodavac nije unesen', `${format2(row.hours ?? 8)} h/dan`].join(' · ');

  return (
    <div className={`range-item ${isExpanded ? 'range-item--expanded' : ''}`}>
      <div className="range-item__row">
        <button
          type="button"
          className="range-item__trigger"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <span className="range-item__chevron" aria-hidden>
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </span>
          {row.color && (
            <span
              className="range-item__dot"
              style={{ backgroundColor: row.color }}
              title="Boja na kalendaru"
              aria-hidden
            />
          )}
          <span className="range-item__text">
            <span className="range-item__title">{rangeText}</span>
            <span className="range-item__subtitle">{subtitle}</span>
          </span>
        </button>
        <div className="range-item__actions">
          <label
            className="range-item__juv"
            onClick={(e) => e.stopPropagation()}
            title="Javna ustanova (uključi u neprekidni staž)"
          >
            <input
              type="checkbox"
              checked={row.javnaUstanova === true}
              onChange={(e) => onChange(row.id, 'javnaUstanova', e.target.checked)}
              aria-label="Javna ustanova"
            />
            <span>J.u.</span>
          </label>
          <button
            type="button"
            className="range-item__remove"
            disabled={!canRemove}
            onClick={(e) => {
              e.stopPropagation();
              canRemove && onRemove(row.id);
            }}
            title={canRemove ? 'Ukloni raspon' : undefined}
            aria-label="Ukloni raspon"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="range-item__form">
          <div className="range-form__group">
            <label className="range-form__label">Poslodavac</label>
            <input
              type="text"
              className="range-form__input"
              value={row.poslodavac}
              onChange={(e) => onChange(row.id, 'poslodavac', e.target.value)}
              placeholder="Naziv poslodavca"
            />
          </div>
          <div className="range-form__row">
            <div className="range-form__group">
              <label className="range-form__label">Početak</label>
              <input
                type="date"
                className="range-form__input"
                value={row.start}
                onChange={(e) => onChange(row.id, 'start', e.target.value)}
              />
            </div>
            <div className="range-form__group">
              <label className="range-form__label">Završetak</label>
              <input
                type="date"
                className="range-form__input"
                value={row.end}
                onChange={(e) => onChange(row.id, 'end', e.target.value)}
              />
            </div>
            <div className="range-form__group range-form__group--hours">
              <label className="range-form__label">Radni sati/dan</label>
              <input
                type="number"
                min={0.1}
                max={8}
                step={0.1}
                className="range-form__input"
                value={row.hours ?? 8}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v)) onChange(row.id, 'hours', Math.min(8, Math.max(0.1, v)));
                }}
              />
            </div>
          </div>
          <div className="range-form__row range-form__row--options">
            <label className="range-form__checkbox-wrap">
              <input
                type="checkbox"
                checked={row.javnaUstanova === true}
                onChange={(e) => onChange(row.id, 'javnaUstanova', e.target.checked)}
              />
              <span>Javna ustanova</span>
            </label>
            <label className="range-form__color-wrap">
              <span className="range-form__label-inline">Boja na kalendaru</span>
              <input
                type="color"
                value={row.color ?? '#2563eb'}
                onChange={(e) => onChange(row.id, 'color', e.target.value)}
                className="range-form__color"
                title="Odaberi boju"
              />
            </label>
          </div>
          <div className="range-form__footer">
            <button
              type="button"
              className="range-form__save-btn"
              onClick={() => onSave(row.id)}
              title="Spremi red i uključi u izračun"
            >
              Spremi
            </button>
            {isSaved && (
              <span className="range-form__saved-hint" aria-hidden>
                Red je spremljen i uključen u izračun
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
