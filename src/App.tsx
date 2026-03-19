import { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { api } from './lib/api';
import type { EventItem, EventPayload, EventType, SessionUser } from './lib/types';
import { AdminPage } from './pages/AdminPage';
import { PublicCalendarPage } from './pages/PublicCalendarPage';

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [types, setTypes] = useState<EventType[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [currentView, setCurrentView] = useState<'calendar' | 'admin'>('calendar');
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBaseData(typeSlug = selectedType) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeSlug) params.set('type', typeSlug);
      const [sessionResponse, typeResponse, eventResponse] = await Promise.all([
        api.session(),
        api.getEventTypes(),
        api.getEvents(params),
      ]);
      setUser(sessionResponse.user);
      setTypes(typeResponse.items);
      setEvents(eventResponse.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBaseData('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adminEvents = useMemo(() => [...events].sort((a, b) => a.startAt.localeCompare(b.startAt)), [events]);

  async function refreshEvents(typeSlug = selectedType) {
    const params = new URLSearchParams();
    if (typeSlug) params.set('type', typeSlug);
    const result = await api.getEvents(params);
    setEvents(result.items);
  }

  async function handleLogin(email: string, password: string) {
    const result = await api.login(email, password);
    setUser(result.user);
    setCurrentView('admin');
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setCurrentView('calendar');
  }

  async function handleTypeChange(value: string) {
    setSelectedType(value);
    await refreshEvents(value);
  }

  async function handleSave(payload: EventPayload) {
    if (editingEvent) {
      await api.updateEvent(editingEvent.id, payload);
      setEditingEvent(null);
    } else {
      await api.createEvent(payload);
    }
    await refreshEvents(selectedType);
  }

  async function handleDelete(item: EventItem) {
    if (!confirm(`Delete \"${item.title}\"?`)) return;
    await api.deleteEvent(item.id);
    await refreshEvents(selectedType);
    if (editingEvent?.id === item.id) setEditingEvent(null);
  }

  return (
    <div className="app-shell">
      <Header user={user} currentView={currentView} onNavigate={setCurrentView} onLogout={() => void handleLogout()} />
      {loading ? <main className="shell"><div className="card">Loading...</div></main> : null}
      {error ? <main className="shell"><div className="card notice error">{error}</div></main> : null}
      {!loading && !error ? (
        currentView === 'admin' ? (
          user?.role === 'admin' ? (
            <AdminPage
              user={user}
              types={types}
              events={adminEvents}
              editingEvent={editingEvent}
              onSave={handleSave}
              onEdit={setEditingEvent}
              onDelete={handleDelete}
              onCancelEdit={() => setEditingEvent(null)}
            />
          ) : (
            <main className="shell narrow">
              <LoginForm onSubmit={handleLogin} />
            </main>
          )
        ) : (
          <PublicCalendarPage events={events.filter((event) => event.status === 'published' && event.visibility === 'public')} types={types} selectedType={selectedType} onTypeChange={(value) => void handleTypeChange(value)} />
        )
      ) : null}
    </div>
  );
}
