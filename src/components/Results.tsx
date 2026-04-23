import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  formatStazYYMMDD,
  formatStazUnformatted,
  formatYMDtoGMD,
} from '../utils/stazFormat';
import { formatDisplayDate } from '../utils/dateCalculations';
import { DATE_FORMAT } from '../constants/dateFormats';
import type {
  ContinuousStazResult,
  ContinuousPeriodResult,
} from '../types/dto';
import type { DateRangeRowDto } from '../types/dto';
import type { PartialDayDto } from '../types/dto';
import { Summary } from './Summary';
import { PartialDaysList } from './PartialDaysList';

type ResultsDetailTab = 'staz' | 'rasponi' | 'prekidi' | 'dani';

interface ResultsProps {
  totalWorkingDays: number;
  continuousStaz: ContinuousStazResult;
  sumYMD: { years: number; months: number; days: number };
  allFullTime: boolean;
  calculationDate: string;
  rows: DateRangeRowDto[];
  rowWorkingDays: (number | null)[];
  partialList: PartialDayDto[];
}

export function Results({
  totalWorkingDays,
  continuousStaz,
  sumYMD,
  allFullTime,
  calculationDate,
  rows,
  rowWorkingDays,
  partialList,
}: ResultsProps) {
  const [detailTab, setDetailTab] = useState<ResultsDetailTab>('rasponi');

  const currentPeriod = useMemo((): ContinuousPeriodResult | null => {
    const customToday = dayjs(calculationDate, DATE_FORMAT, true);
    const todayStr = customToday.isValid()
      ? customToday.format(DATE_FORMAT)
      : dayjs().format(DATE_FORMAT);
    return (
      continuousStaz.periods.find(
        (p) => p.start <= todayStr && p.end >= todayStr,
      ) ?? null
    );
  }, [continuousStaz.periods, calculationDate]);

  return (
    <section className="results">
      <div className="results-cards">
        <article className="result-card result-card--bez">
          <div className="result-card__accent" aria-hidden />
          <h3 className="result-card__title">Bez dodatka</h3>
          <p className="result-card__value">
            {formatStazYYMMDD(totalWorkingDays)}
          </p>
          <p className="result-card__sub">
            {formatStazUnformatted(totalWorkingDays)}
          </p>
          <p className="result-card__desc">
            {allFullTime
              ? 'Na puno radno vrijeme (8 h/dan): isto kao Zbroj GMD — zbroj godina, mjeseci i dana iz svakog raspona (normalizirano).'
              : 'Na kraće radno vrijeme: po kalendarskim danima — dan s 8+ h ukupno (iz svih raspona/poslodavaca) = 1 radni dan, inače proporcionalno (npr. 5,2 h = 0,65 rd).'}
          </p>
        </article>
        <article className="result-card result-card--zbroj-gmd">
          <div className="result-card__accent" aria-hidden />
          <h3 className="result-card__title">Zbroj GMD</h3>
          <p className="result-card__value">
            {formatYMDtoGMD(sumYMD.years, sumYMD.months, sumYMD.days)}
          </p>
          <p className="result-card__sub">
            {sumYMD.years}{' '}
            {sumYMD.years === 1
              ? 'godina'
              : sumYMD.years >= 2 && sumYMD.years <= 4
                ? 'godine'
                : 'godina'}
            , {sumYMD.months}{' '}
            {sumYMD.months === 1
              ? 'mjesec'
              : sumYMD.months >= 2 && sumYMD.months <= 4
                ? 'mjeseca'
                : 'mjeseci'}
            , {sumYMD.days} {sumYMD.days === 1 ? 'dan' : 'dana'}
          </p>
          <p className="result-card__desc">
            Zbroj godina, mjeseci i dana iz svakog raspona (normalizirano: 30
            dana = 1 mjesec, 12 mjeseci = 1 godina).
          </p>
        </article>
        <article className="result-card result-card--neprekidni">
          <div className="result-card__accent" aria-hidden />
          <h3 className="result-card__title">Neprekidni staž</h3>
          <p className="result-card__value">
            {formatStazYYMMDD(continuousStaz.totalWorkingDays)}
          </p>
          <p className="result-card__sub">
            {formatStazUnformatted(continuousStaz.totalWorkingDays)}
          </p>
          <p className="result-card__desc">
            Kalendarski, neprekidno do danas (pauza ≤ 8 dana). Računaju se samo
            rasponi označeni kao javna ustanova.
          </p>
        </article>
      </div>

      <nav className="results-detail-tabs" aria-label="Detalji rezultata">
        <button
          type="button"
          className={`results-detail-tabs__tab ${detailTab === 'rasponi' ? 'results-detail-tabs__tab--active' : ''}`}
          onClick={() => setDetailTab('rasponi')}
        >
          Pregled raspona
        </button>
        <button
          type="button"
          className={`results-detail-tabs__tab ${detailTab === 'staz' ? 'results-detail-tabs__tab--active' : ''}`}
          onClick={() => setDetailTab('staz')}
        >
          Neprekidni staž
        </button>
        <button
          type="button"
          className={`results-detail-tabs__tab ${detailTab === 'prekidi' ? 'results-detail-tabs__tab--active' : ''}`}
          onClick={() => setDetailTab('prekidi')}
        >
          Prekidi veći od 8 dana
        </button>
        <button
          type="button"
          className={`results-detail-tabs__tab ${detailTab === 'dani' ? 'results-detail-tabs__tab--active' : ''}`}
          onClick={() => setDetailTab('dani')}
        >
          Dani bez punog radnog vremena
        </button>
      </nav>

      <div className="results-detail-panel">
        {detailTab === 'rasponi' && (
          <Summary
            rows={rows}
            rowWorkingDays={rowWorkingDays}
            totalWorkingDays={totalWorkingDays}
            hideTitle
          />
        )}
        {detailTab === 'staz' && (
          <div className="detail-panel">
            {/* Samo trenutni neprekidni staž (razdoblje koje uključuje danas) */}
            {currentPeriod ? (
              <>
                <p className="detail-panel__meta">
                  Trenutno neprekidno razdoblje (do danas)
                </p>
                <p className="detail-panel__section-title">
                  Neprekidni staž – rasponi u razdoblju
                </p>
                <ul className="detail-list detail-list--periods">
                  <li className="detail-list__period-block">
                    <div className="detail-list__period-header">
                      <span className="detail-list__primary">
                        {formatDisplayDate(currentPeriod.start)} –{' '}
                        {formatDisplayDate(currentPeriod.end)}
                      </span>
                      <span className="detail-list__secondary">
                        {formatStazYYMMDD(currentPeriod.workingDays)} radnih
                        dana
                      </span>
                    </div>
                    <ul
                      className="detail-list detail-list--nested"
                      aria-label="Rasponi u razdoblju"
                    >
                      {currentPeriod.rowIndices.map((idx) => {
                        const row = rows[idx];
                        if (!row) return null;
                        return (
                          <li
                            key={idx}
                            className="detail-list__row detail-list__row--nested"
                          >
                            <span className="detail-list__primary">
                              {row.poslodavac?.trim() || '—'}
                            </span>
                            <span className="detail-list__secondary">
                              {formatDisplayDate(row.start)} –{' '}
                              {formatDisplayDate(row.end)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                </ul>
              </>
            ) : (
              <p className="detail-panel__empty">
                Nema trenutnog neprekidnog staža. Označite raspon(e) kao javna
                ustanova i provjerite da postoji razdoblje neprekidno do danas
                (pauza ≤ 8 dana).
              </p>
            )}
          </div>
        )}
        {detailTab === 'prekidi' && (
          <div className="detail-panel">
            {continuousStaz.breaks.length > 0 ? (
              <>
                <p className="detail-panel__meta">
                  Broj prekida većih od 8 dana:{' '}
                  <strong>{continuousStaz.breaks.length}</strong>
                </p>
                <ul className="detail-list detail-list--breaks">
                  {continuousStaz.breaks.map((b, i) => (
                    <li
                      key={i}
                      className="detail-list__row detail-list__row--break"
                    >
                      <span className="detail-list__primary">
                        {formatDisplayDate(b.endDate)} →{' '}
                        {formatDisplayDate(b.startDate)}
                      </span>
                      <span className="detail-list__secondary">
                        {b.gapDays} dana prekida
                        {b.endPoslodavac || b.startPoslodavac
                          ? ` · ${[b.endPoslodavac, b.startPoslodavac].filter(Boolean).join(' → ')}`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="detail-panel__empty">
                Nema prekida većih od 8 dana.
              </p>
            )}
          </div>
        )}
        {detailTab === 'dani' && (
          <PartialDaysList partialList={partialList} rows={rows} hideTitle />
        )}
      </div>
    </section>
  );
}
