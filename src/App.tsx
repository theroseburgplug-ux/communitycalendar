import { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { api } from './lib/api';
import type { EventItem, EventPayload, EventType, SessionUser } from './lib/types';
import { AdminPage } from './pages/AdminPage';
import { OrganizerPage } from './pages/OrganizerPage';
import { PublicCalendarPage } from './pages/PublicCalendarPage';

type AppView = 'calendar' | 'admin' | 'organizer' | 'register';

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [types, setTypes] = useState<EventType[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [organizerEvents, setOrganizerEvents] = useState<EventItem[]>([]);
  const [pendingEvents, setPendingEvents] = useState<EventItem[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [currentView, setCurrentView] = useState<AppView>('calendar');
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUserData(loadedUser: SessionUser) {
    if (loadedUser.role === 'admin') {
      const pending = await api.getPendingEvents();
      setPendingEvents(pending.items);
    } else if (loadedUser.role === 'organizer') {
      const org = await api.getOrganizerEvents();
      setOrganizerEvents(org.items);
    }
  }

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

      if (sessionResponse.user) {
        await loadUserData(sessionResponse.user);
      }
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

  async function refreshPendingEvents() {
    const result = await api.getPendingEvents();
    setPendingEvents(result.items);
  }

  async function refreshOrganizerEvents() {
    const result = await api.getOrganizerEvents();
    setOrganizerEvents(result.items);
  }

  async function handleLogin(email: string, password: string) {
    const result = await api.login(email, password);
    setUser(result.user);
    await loadUserData(result.user);
    if (result.user.role === 'admin') {
      setCurrentView('admin');
    } else if (result.user.role === 'organizer') {
      setCurrentView('organizer');
    }
  }

  async function handleRegister(name: string, email: string, password: string) {
    const result = await api.register(name, email, password);
    setUser(result.user);
    await loadUserData(result.user);
    setCurrentView('organizer');
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setCurrentView('calendar');
    setPendingEvents([]);
    setOrganizerEvents([]);
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

  async function handleSubmitEvent(payload: EventPayload) {
    await api.submitEvent(payload);
    await refreshOrganizerEvents();
  }

  async function handleDelete(item: EventItem) {
    if (!confirm(`Delete \"${item.title}\"?`)) return;
    await api.deleteEvent(item.id);
    await refreshEvents(selectedType);
    if (editingEvent?.id === item.id) setEditingEvent(null);
  }

  async function handleApprove(item: EventItem) {
    await api.approveEvent(item.id);
    await Promise.all([refreshPendingEvents(), refreshEvents(selectedType)]);
  }

  async function handleReject(item: EventItem) {
    if (!confirm(`Reject \"${item.title}\"?`)) return;
    await api.rejectEvent(item.id);
    await refreshPendingEvents();
  }

  function renderContent() {
    if (loading) return <main className="shell"><div className="card">Loading...</div></main>;
    if (error) return <main className="shell"><div className="card notice error">{error}</div></main>;

    if (currentView === 'register') {
      return (
        <main className="shell narrow">
          <RegisterForm onSubmit={handleRegister} onShowLogin={() => setCurrentView('admin')} />
        </main>
      );
    }

    if (currentView === 'admin') {
      if (user?.role === 'admin') {
        return (
          <AdminPage
            user={user}
            types={types}
            events={adminEvents}
            pendingEvents={pendingEvents}
            editingEvent={editingEvent}
            onSave={handleSave}
            onEdit={setEditingEvent}
            onDelete={handleDelete}
            onCancelEdit={() => setEditingEvent(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        );
      }
      return (
        <main className="shell narrow">
          <LoginForm onSubmit={handleLogin} />
        </main>
      );
    }

    if (currentView === 'organizer') {
      if (user?.role === 'organizer' || user?.role === 'admin') {
        return (
          <OrganizerPage
            user={user}
            types={types}
            events={organizerEvents}
            onSubmit={handleSubmitEvent}
          />
        );
      }
      return (
        <main className="shell narrow">
          <LoginForm onSubmit={handleLogin} />
        </main>
      );
    }

    return (
      <PublicCalendarPage
        events={events.filter((event) => event.status === 'published' && event.visibility === 'public')}
        types={types}
        selectedType={selectedType}
        onTypeChange={(value) => void handleTypeChange(value)}
      />
    );
  }

  return (
    <div className="app-shell">
      <Header user={user} currentView={currentView} onNavigate={setCurrentView} onLogout={() => void handleLogout()} />
      {renderContent()}
    </div>
  );
}
