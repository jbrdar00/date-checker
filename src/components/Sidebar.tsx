interface SidebarProps {
  activeView: 'list' | 'editor' | 'settings';
  onNavigate: (view: 'list' | 'settings') => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">◇</span>
        <span className="sidebar-brand-text">Kalkulator staža</span>
      </div>
      <nav className="sidebar-nav">
        <button
          type="button"
          className={`sidebar-item ${activeView === 'list' ? 'sidebar-item--active' : ''}`}
          onClick={() => onNavigate('list')}
        >
          <span className="sidebar-item-icon">≡</span>
          Kalkulacije
        </button>
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className={`sidebar-item ${activeView === 'settings' ? 'sidebar-item--active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <span className="sidebar-item-icon">⚙</span>
          Postavke
        </button>
      </div>
    </aside>
  );
}
