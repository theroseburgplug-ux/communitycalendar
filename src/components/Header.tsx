import type { AppView, SessionUser } from '../lib/types';

interface HeaderProps {
  user: SessionUser | null;
  onNavigate: (view: AppView) => void;
  currentView: AppView;
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
        {(user?.role === 'organizer' || user?.role === 'admin') && (
          <button className={currentView === 'organizer' ? 'btn btn-solid' : 'btn'} onClick={() => onNavigate('organizer')}>
            Submit Event
          </button>
        )}
        {user?.role === 'admin' && (
          <button className={currentView === 'admin' ? 'btn btn-solid' : 'btn'} onClick={() => onNavigate('admin')}>
            Admin Panel
          </button>
        )}
        {user ? (
          <button className="btn" onClick={onLogout}>
            Log out
          </button>
        ) : (
          <button className={currentView === 'account' ? 'btn btn-solid' : 'btn'} onClick={() => onNavigate('account')}>
            Account
          </button>
        )}
      </nav>
    </header>
  );
}
