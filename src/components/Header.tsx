import type { SessionUser } from '../lib/types';

interface HeaderProps {
  user: SessionUser | null;
  onNavigate: (view: 'calendar' | 'account' | 'submit' | 'admin') => void;
  currentView: 'calendar' | 'account' | 'submit' | 'admin';
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
        {user == null && (
          <button className={currentView === 'account' ? 'btn btn-solid' : 'btn'} onClick={() => onNavigate('account')}>
            Account
          </button>
        )}
        {(user?.role === 'organizer' || user?.role === 'admin') && (
          <button className={currentView === 'submit' ? 'btn btn-solid' : 'btn'} onClick={() => onNavigate('submit')}>
            Submit Event
          </button>
        )}
        {user?.role === 'admin' && (
          <button className={currentView === 'admin' ? 'btn btn-solid' : 'btn'} onClick={() => onNavigate('admin')}>
            Admin Panel
          </button>
        )}
        {user != null && (
          <button className="btn" onClick={onLogout}>
            Log out
          </button>
        )}
      </nav>
    </header>
  );
}

