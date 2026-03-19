import type { SessionUser } from '../lib/types';

interface HeaderProps {
  user: SessionUser | null;
  onNavigate: (view: 'calendar' | 'admin') => void;
  currentView: 'calendar' | 'admin';
  onLogout: () => void;
}

export function Header({ user, onNavigate, currentView, onLogout }: HeaderProps) {
  return (
    <header className="shell header">
      <div>
        <div className="eyebrow">Cloudflare + D1 + Embed Ready</div>
        <h1>Community Calendar</h1>
      </div>
      <nav className="header-actions">
        <button className={currentView === 'calendar' ? 'btn btn-solid' : 'btn'} onClick={() => onNavigate('calendar')}>
          Public Calendar
        </button>
        {user?.role === 'admin' && (
          <button className={currentView === 'admin' ? 'btn btn-solid' : 'btn'} onClick={() => onNavigate('admin')}>
            Admin Panel
          </button>
        )}
        {user ? (
          <button className="btn" onClick={onLogout}>
            Log out
          </button>
        ) : null}
      </nav>
    </header>
  );
}
