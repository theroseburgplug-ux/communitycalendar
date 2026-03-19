import { useEffect, useState } from 'react';
import { EventForm } from '../components/EventForm';
import { EventList } from '../components/EventList';
import { api } from '../lib/api';
import type { EventItem, EventPayload, EventType, SessionUser } from '../lib/types';

interface AdminPageProps {
  user: SessionUser;
  types: EventType[];
  events: EventItem[];
  editingEvent: EventItem | null;
  onSave: (payload: EventPayload) => Promise<void>;
  onEdit: (item: EventItem) => void;
  onDelete: (item: EventItem) => Promise<void>;
  onCancelEdit: () => void;
  onRefreshEvents: () => Promise<void>;
}

export function AdminPage({
  user,
  types,
  events,
  editingEvent,
  onSave,
  onEdit,
  onDelete,
  onCancelEdit,
  onRefreshEvents,
}: AdminPageProps) {
  const [pendingEvents, setPendingEvents] = useState<EventItem[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  async function loadPending() {
    setModerationLoading(true);
    setModerationError(null);
    try {
      const result = await api.listPendingModeration();
      setPendingEvents(result.items);
    } catch (err) {
      setModerationError(err instanceof Error ? err.message : 'Failed to load pending events');
    } finally {
      setModerationLoading(false);
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  async function handleApprove(id: number) {
    setModerationError(null);
    try {
      await api.approveModeration(id);
      await loadPending();
      await onRefreshEvents();
    } catch (err) {
      setModerationError(err instanceof Error ? err.message : 'Failed to approve event');
    }
  }

  async function handleReject(id: number) {
    setModerationError(null);
    try {
      await api.rejectModeration(id);
      await loadPending();
      await onRefreshEvents();
    } catch (err) {
      setModerationError(err instanceof Error ? err.message : 'Failed to reject event');
    }
  }

  return (
    <section className="shell admin-layout">
      <div className="stack-lg">
        <div className="card">
          <div className="eyebrow">Admin Panel</div>
          <h2>Welcome, {user.name}</h2>
          <p>Manage published and draft events from one place.</p>
        </div>
        <EventForm types={types} initialValue={editingEvent} onCancel={editingEvent ? onCancelEdit : undefined} onSubmit={onSave} />
        <div className="card stack">
          <div>
            <div className="eyebrow">Moderation Queue</div>
            <h2>{pendingEvents.length} pending event{pendingEvents.length !== 1 ? 's' : ''}</h2>
          </div>
          {moderationError ? <div className="notice error">{moderationError}</div> : null}
          {moderationLoading ? (
            <p className="muted">Loading pending events...</p>
          ) : pendingEvents.length === 0 ? (
            <p className="muted">No events pending review.</p>
          ) : (
            <div className="stack">
              {pendingEvents.map((item) => (
                <article className="card stack" key={item.id}>
                  <div className="row spread wrap gap-sm">
                    <div>
                      <div className="badge" style={{ borderColor: item.eventTypeColor }}>
                        {item.eventTypeName}
                      </div>
                      <h3>{item.title}</h3>
                    </div>
                    <div className="row gap-sm">
                      <button className="btn btn-solid" onClick={() => void handleApprove(item.id)}>
                        Approve
                      </button>
                      <button className="btn danger" onClick={() => void handleReject(item.id)}>
                        Reject
                      </button>
                    </div>
                  </div>
                  <p>{item.description}</p>
                  <div className="meta-grid">
                    <div>
                      <strong>Start</strong>
                      <span>{new Date(item.startAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <strong>Location</strong>
                      <span>{item.location || 'TBD'}</span>
                    </div>
                    <div>
                      <strong>Organizer</strong>
                      <span>{item.organizer || 'TBD'}</span>
                    </div>
                    <div>
                      <strong>Type</strong>
                      <span>{item.eventTypeName}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="stack-lg">
        <div className="card">
          <div className="eyebrow">Event Inventory</div>
          <h2>{events.length} total events</h2>
        </div>
        <EventList items={events} onEdit={onEdit} onDelete={onDelete} emptyText="No events yet. Create your first one on the left." />
      </div>
    </section>
  );
}
