interface SettingsViewProps {
  appVersion: string;
  updateStatus: string;
  isCheckingUpdates: boolean;
  isUpdateDownloaded: boolean;
  onCheckUpdates: () => void;
  onInstallUpdate: () => void;
  onBack: () => void;
}

export function SettingsView({
  appVersion,
  updateStatus,
  isCheckingUpdates,
  isUpdateDownloaded,
  onCheckUpdates,
  onInstallUpdate,
  onBack,
}: SettingsViewProps) {
  return (
    <div className="settings-view">
      <div className="settings-view-header">
        <h1 className="settings-view-title">Postavke</h1>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Natrag
        </button>
      </div>
      <section className="settings-card">
        <h2 className="settings-card__title">Verzija softvera</h2>
        <p className="settings-card__value">v{appVersion}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={onCheckUpdates}
          disabled={isCheckingUpdates}
        >
          {isCheckingUpdates ? 'Provjera...' : 'Provjeri nadogradnje'}
        </button>
        {isUpdateDownloaded && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onInstallUpdate}
          >
            Instaliraj nadogradnju
          </button>
        )}
        <p className="settings-card__status">{updateStatus}</p>
      </section>
    </div>
  );
}
