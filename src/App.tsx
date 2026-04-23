import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  getWorkingDays,
  getSumOfDurationsYMD,
  getHoursPerDate,
  getTotalWorkingDaysByRangeMode,
  type RangeRoundingMode,
  getPartialAndFullDays,
  getContinuousStaz,
  canAddRow,
  exportToPdf,
  parsePdfDocument,
} from './utils';
import {
  DateRangeRow,
  PersonCard,
  Results,
  RangesCalendar,
  CalculationsTable,
  SettingsView,
} from './components';
import packageJson from '../package.json';
import {
  getAllCalculations,
  getCalculation,
  saveCalculation,
  deleteCalculation,
} from './db/indexedDb';
import { getRandomRangeColor } from './constants/rangeColors';
import type { DateRangeRowDto, PersonDto } from './types/dto';
import type { RowField } from './components';
import './App.css';

const initialPerson: PersonDto = {
  name: '',
  oib: '',
  dateOfBirth: '',
};

function createInitialRow(
  id: number,
  usedColors?: Set<string>,
): DateRangeRowDto {
  return {
    id,
    start: '',
    end: '',
    hours: 8,
    poslodavac: '',
    color: getRandomRangeColor(usedColors),
  };
}

const initialRow: DateRangeRowDto = createInitialRow(1);

function App() {
  const GearIcon = () => (
    <svg
      className="settings-fab__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36.53.56 1.16.6 1.8V11a1 1 0 0 1 0 2v.2c-.04.64-.24 1.27-.6 1.8Z" />
    </svg>
  );
  const [view, setView] = useState<'list' | 'editor' | 'settings'>('list');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [calculations, setCalculations] = useState<
    Awaited<ReturnType<typeof getAllCalculations>>
  >([]);
  const [person, setPerson] = useState<PersonDto>(initialPerson);
  const [rows, setRows] = useState<DateRangeRowDto[]>([initialRow]);
  const [savedRowIds, setSavedRowIds] = useState<number[]>([initialRow.id]);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(
    initialRow.id,
  );
  const activeRows = useMemo(
    () => rows.filter((r) => savedRowIds.includes(r.id)),
    [rows, savedRowIds],
  );
  const [editorTab, setEditorTab] = useState<
    'person' | 'ranges' | 'results' | 'calendar'
  >('ranges');
  const [rangeRoundingMode, setRangeRoundingMode] =
    useState<RangeRoundingMode>('sum_decimals');
  const actualToday = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [calculationDateOverride, setCalculationDateOverride] = useState('');
  const calculationDate = calculationDateOverride || actualToday;
  const effectiveRows = useMemo(
    () =>
      activeRows
        .filter((r) => r.start <= calculationDate)
        .map((r) => ({
          ...r,
          end: r.end > calculationDate ? calculationDate : r.end,
        })),
    [activeRows, calculationDate],
  );

  useEffect(() => {
    const lastRow = rows[rows.length - 1];
    if (lastRow && !savedRowIds.includes(lastRow.id)) {
      setExpandedRowId(lastRow.id);
    }
  }, [rows.length, savedRowIds]);

  useEffect(() => {
    const stored = localStorage.getItem('range-rounding-mode');
    if (stored === 'sum_decimals' || stored === 'round_each_range') {
      setRangeRoundingMode(stored);
    }
  }, []);

  const refreshList = useCallback(async () => {
    const list = await getAllCalculations();
    setCalculations(list);
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const openCalculation = useCallback(async (id: string) => {
    const calc = await getCalculation(id);
    if (!calc) return;
    setPerson(calc.person);
    const rawRows = calc.rows.length > 0 ? calc.rows : [initialRow];
    const usedColors = new Set<string>();
    const loadedRows = rawRows.map((r) => {
      const color = r.color ?? getRandomRangeColor(usedColors);
      if (color) usedColors.add(color);
      return { ...r, color };
    });
    setRows(loadedRows);
    setSavedRowIds(loadedRows.map((r) => r.id));
    setCalculationDateOverride('');
    setExpandedRowId(loadedRows[loadedRows.length - 1]?.id ?? null);
    setCurrentId(id);
    setView('editor');
  }, []);

  const newCalculation = useCallback(() => {
    setPerson(initialPerson);
    setRows([initialRow]);
    setSavedRowIds([initialRow.id]);
    setCalculationDateOverride('');
    setExpandedRowId(initialRow.id);
    setCurrentId(null);
    setView('editor');
  }, []);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(
    'Kliknite "Provjeri nadogradnje" za provjeru nove verzije.',
  );

  const importPdf = useCallback(async (file: File) => {
    setImportError(null);
    try {
      const buf = await file.arrayBuffer();
      const { PDFParse } = await import('pdf-parse');
      // Required in browser: set worker URL before parsing (pdf.js)
      PDFParse.setWorker(
        'https://cdn.jsdelivr.net/npm/pdf-parse@2.4.5/dist/pdf-parse/web/pdf.worker.mjs',
      );
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const result = await parser.getText();
      const text =
        (result && typeof result === 'object' && 'text' in result
          ? (result as { text?: string }).text
          : typeof result === 'string'
            ? result
            : '') ?? '';
      const parsed = parsePdfDocument(text);
      setPerson(parsed.person);
      setRows(parsed.rows);
      setSavedRowIds(parsed.rows.map((r) => r.id));
      setCalculationDateOverride('');
      setExpandedRowId(parsed.rows[parsed.rows.length - 1]?.id ?? null);
      setCurrentId(null);
      setView('editor');
      if (parsed.errors.length > 0) {
        setImportError(parsed.errors.join('. '));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setImportError(`Uvoz nije uspio: ${message}`);
    }
  }, []);

  const handlePdfInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) importPdf(file);
      e.target.value = '';
    },
    [importPdf],
  );

  const backToList = useCallback(() => {
    setView('list');
    setCurrentId(null);
    refreshList();
  }, [refreshList]);

  const handleCheckUpdates = useCallback(async () => {
    if (!window.electronAPI) {
      setUpdateStatus('Auto-update je dostupan samo u Electron aplikaciji.');
      return;
    }
    setIsUpdateDownloaded(false);
    setIsCheckingUpdates(true);
    const result = await window.electronAPI.checkForUpdates();
    if (!result.ok) {
      setUpdateStatus(result.message ?? 'Provjera nadogradnji nije uspjela.');
      setIsCheckingUpdates(false);
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.installUpdate();
    if (!result.ok) {
      setUpdateStatus(
        result.message ?? 'Instalacija nadogradnje nije uspjela.',
      );
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteCalculation(id);
      if (currentId === id) {
        setView('list');
        setCurrentId(null);
      }
      refreshList();
    },
    [currentId, refreshList],
  );

  const updatePerson = useCallback((field: keyof PersonDto, value: string) => {
    setPerson((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => {
      const usedColors = new Set(
        prev.map((r) => r.color).filter(Boolean) as string[],
      );
      return [
        ...prev,
        createInitialRow(Math.max(0, ...prev.map((r) => r.id)) + 1, usedColors),
      ];
    });
  }, []);

  const removeRow = useCallback((id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSavedRowIds((prev) => prev.filter((sid) => sid !== id));
  }, []);

  const saveRow = useCallback((id: number) => {
    setSavedRowIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setExpandedRowId(null);
  }, []);

  const updateRow = useCallback(
    (id: number, field: RowField, value: string | number | boolean) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const rowWorkingDays = effectiveRows.map((row) =>
    getWorkingDays(row.start, row.end, row.hours),
  );
  const hoursPerDate = getHoursPerDate(effectiveRows);
  const { partialList } = getPartialAndFullDays(hoursPerDate);
  const sumYMD = getSumOfDurationsYMD(effectiveRows);
  const allFullTime = effectiveRows.every((r) => (r.hours ?? 8) === 8);
  const totalWorkingDays = allFullTime
    ? sumYMD.years * 365 + sumYMD.months * 30 + sumYMD.days
    : getTotalWorkingDaysByRangeMode(effectiveRows, rangeRoundingMode);
  const continuousStaz = getContinuousStaz(
    effectiveRows,
    rowWorkingDays,
    partialList,
    hoursPerDate,
    calculationDate,
  );

  const addRowEnabled = canAddRow(rows);

  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);

  useEffect(() => {
    if (!saveSuccessVisible) return;
    const t = setTimeout(() => setSaveSuccessVisible(false), 3000);
    return () => clearTimeout(t);
  }, [saveSuccessVisible]);

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubscribe = window.electronAPI.onUpdaterStatus((payload) => {
      setUpdateStatus(payload.message);
      if (payload.type === 'checking') setIsCheckingUpdates(true);
      if (payload.type === 'not-available' || payload.type === 'error') {
        setIsCheckingUpdates(false);
        setIsUpdateDownloaded(false);
      }
      if (payload.type === 'downloaded') {
        setIsCheckingUpdates(false);
        setIsUpdateDownloaded(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = useCallback(async () => {
    const saved = await saveCalculation({
      ...(currentId ? { id: currentId } : {}),
      person,
      rows,
    });
    setCurrentId(saved.id);
    refreshList();
    setSaveSuccessVisible(true);
  }, [currentId, person, rows, refreshList]);

  const handleExportPdf = useCallback(() => {
    exportToPdf({
      person,
      rows: effectiveRows,
      rowWorkingDays,
      totalWorkingDays: Number(totalWorkingDays),
      partialList,
    });
  }, [person, effectiveRows, rowWorkingDays, totalWorkingDays, partialList]);

  return (
    <div className="app-layout">
      <main className="app-main">
        {view !== 'settings' && (
          <button
            type="button"
            className="settings-fab"
            onClick={() => setView('settings')}
            title="Postavke"
            aria-label="Postavke"
          >
            <GearIcon />
          </button>
        )}
        {view === 'list' && (
          <div className="main-content main-content--list">
            <div className="main-toolbar">
              <h1 className="main-title">Kalkulacije</h1>
              <div className="main-toolbar-actions">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfInputChange}
                  className="main-toolbar-file-input"
                  aria-label="Uvezi PDF"
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => pdfInputRef.current?.click()}
                >
                  Uvezi PDF (HZMO)
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={newCalculation}
                >
                  + Nova kalkulacija
                </button>
              </div>
            </div>
            {importError && (
              <div className="import-error" role="alert">
                {importError}
              </div>
            )}
            <CalculationsTable
              calculations={calculations}
              onOpen={openCalculation}
              onDelete={handleDelete}
            />
          </div>
        )}

        {view === 'settings' && (
          <div className="main-content main-content--settings">
            <SettingsView
              appVersion={packageJson.version}
              updateStatus={updateStatus}
              isCheckingUpdates={isCheckingUpdates}
              isUpdateDownloaded={isUpdateDownloaded}
              onCheckUpdates={handleCheckUpdates}
              onInstallUpdate={handleInstallUpdate}
              onBack={backToList}
            />
          </div>
        )}

        {view === 'editor' && (
          <div className="main-content main-content--editor">
            {saveSuccessVisible && (
              <div
                className="save-success-toast"
                role="status"
                aria-live="polite"
              >
                Uspješno spremljeno
              </div>
            )}
            <header className="editor-toolbar">
              <button
                type="button"
                className="btn-back"
                onClick={backToList}
                title="Natrag na listu"
              >
                ‹ Natrag
              </button>
              <h1 className="editor-title">
                {currentId ? 'Uredi kalkulaciju' : 'Nova kalkulacija'}
              </h1>
              <div className="editor-toolbar-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSave}
                >
                  Spremi
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleExportPdf}
                >
                  Izvoz u PDF
                </button>
              </div>
            </header>

            <div className="editor-scroll">
              <nav className="editor-tabs" aria-label="Sadržaj kalkulacije">
                <button
                  type="button"
                  className={`editor-tabs__tab ${editorTab === 'person' ? 'editor-tabs__tab--active' : ''}`}
                  onClick={() => setEditorTab('person')}
                >
                  Generalne informacije
                </button>
                <button
                  type="button"
                  className={`editor-tabs__tab ${editorTab === 'ranges' ? 'editor-tabs__tab--active' : ''}`}
                  onClick={() => setEditorTab('ranges')}
                >
                  Radni rasponi
                </button>
                <button
                  type="button"
                  className={`editor-tabs__tab ${editorTab === 'results' ? 'editor-tabs__tab--active' : ''}`}
                  onClick={() => setEditorTab('results')}
                >
                  Rezultati
                </button>
                <button
                  type="button"
                  className={`editor-tabs__tab ${editorTab === 'calendar' ? 'editor-tabs__tab--active' : ''}`}
                  onClick={() => setEditorTab('calendar')}
                >
                  Kalendar
                </button>
              </nav>

              <div className="editor-tab-panels">
                {editorTab === 'person' && (
                  <div className="editor-tab-panel editor-tab-panel--person">
                    <PersonCard person={person} onChange={updatePerson} />
                    <section
                      className="person-card"
                      aria-labelledby="calc-date-card-title"
                    >
                      <h2
                        id="calc-date-card-title"
                        className="person-card__title"
                      >
                        Datum izračuna
                      </h2>
                      <div className="person-card__inner">
                        <div className="person-card__field">
                          <label
                            htmlFor="actual-today"
                            className="person-card__label"
                          >
                            Današnji datum
                          </label>
                          <input
                            id="actual-today"
                            type="date"
                            className="person-card__input"
                            value={actualToday}
                            disabled
                          />
                        </div>
                        <div className="person-card__field">
                          <label
                            htmlFor="calc-date-override"
                            className="person-card__label"
                          >
                            Fiktivni datum (retroaktivni izračun)
                          </label>
                          <input
                            id="calc-date-override"
                            type="date"
                            className="person-card__input"
                            value={calculationDateOverride}
                            onChange={(e) =>
                              setCalculationDateOverride(e.target.value)
                            }
                          />
                          <p className="person-card__hint">
                            Ako je prazno, koristi se današnji datum.
                          </p>
                        </div>
                      </div>
                    </section>
                    <section
                      className="person-card person-card--wide"
                      aria-labelledby="rounding-settings-title"
                    >
                      <h2
                        id="rounding-settings-title"
                        className="person-card__title"
                      >
                        Postavke zaokruživanja
                      </h2>
                      <div className="person-card__inner">
                        <label className="settings-option">
                          <input
                            type="radio"
                            name="rounding-mode"
                            checked={rangeRoundingMode === 'sum_decimals'}
                            onChange={() => {
                              setRangeRoundingMode('sum_decimals');
                              localStorage.setItem(
                                'range-rounding-mode',
                                'sum_decimals',
                              );
                            }}
                          />
                          <span>
                            <strong>
                              Zbroj decimalnih raspona (trenutni način)
                            </strong>
                            <span className="person-card__hint">
                              Svaki raspon računa se decimalno (npr. 7.5 radnih
                              dana + 7.5 radnih dana), pa se na kraju zbroje svi
                              rasponi = 15 radnih dana.
                            </span>
                          </span>
                        </label>
                        <label className="settings-option">
                          <input
                            type="radio"
                            name="rounding-mode"
                            checked={rangeRoundingMode === 'round_each_range'}
                            onChange={() => {
                              setRangeRoundingMode('round_each_range');
                              localStorage.setItem(
                                'range-rounding-mode',
                                'round_each_range',
                              );
                            }}
                          />
                          <span>
                            <strong>Zaokruži svaki raspon pa zbroji</strong>
                            <span className="person-card__hint">
                              Svaki raspon se prvo zaokruži na cijeli radni
                              dan(npr. 5.5 radnih dana {`->`} 6 radnih dana), pa
                              se tek onda zbraja ukupno.
                            </span>
                          </span>
                        </label>
                      </div>
                    </section>
                  </div>
                )}
                {editorTab === 'ranges' && (
                  <div className="editor-tab-panel editor-tab-panel--ranges">
                    <div className="ranges-list">
                      {rows.map((row, index) => (
                        <DateRangeRow
                          key={row.id}
                          row={row}
                          onChange={updateRow}
                          onRemove={removeRow}
                          onSave={saveRow}
                          isSaved={savedRowIds.includes(row.id)}
                          canRemove={rows.length > 1 && index > 0}
                          isExpanded={expandedRowId === row.id}
                          onToggle={() =>
                            setExpandedRowId((id) =>
                              id === row.id ? null : row.id,
                            )
                          }
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-add-row"
                      onClick={addRow}
                      disabled={!addRowEnabled}
                      title={
                        addRowEnabled
                          ? 'Dodaj novi red'
                          : 'Ispunite sve trenutne redove da biste dodali novi.'
                      }
                    >
                      + Dodaj raspon
                    </button>
                  </div>
                )}
                {editorTab === 'results' && (
                  <div className="editor-tab-panel editor-tab-panel--results">
                    <div className="results-panel">
                      <Results
                        totalWorkingDays={Number(totalWorkingDays)}
                        continuousStaz={continuousStaz}
                        sumYMD={sumYMD}
                        allFullTime={allFullTime}
                        calculationDate={calculationDate}
                        rows={effectiveRows}
                        rowWorkingDays={rowWorkingDays}
                        partialList={partialList}
                      />
                    </div>
                  </div>
                )}
                {editorTab === 'calendar' && (
                  <div className="editor-tab-panel editor-tab-panel--calendar">
                    <RangesCalendar
                      rows={effectiveRows}
                      hoursPerDate={hoursPerDate}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
