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
  onRefreshAdminEvents: () => Promise<void>;
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
  onRefreshAdminEvents,
}: AdminPageProps) {
  const [pendingItems, setPendingItems] = useState<EventItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  async function loadPending() {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const result = await api.getPendingModeration();
      setPendingItems(result.items);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : 'Failed to load pending events');
    } finally {
      setPendingLoading(false);
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  async function handleApprove(id: number) {
    await api.approveModeration(id);
    await Promise.all([loadPending(), onRefreshAdminEvents()]);
  }

  async function handleReject(id: number) {
    await api.rejectModeration(id);
    await Promise.all([loadPending(), onRefreshAdminEvents()]);
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
      </div>
      <div className="stack-lg">
        <div className="card">
          <div className="eyebrow">Pending Approvals</div>
          <h2>{pendingItems.length} pending</h2>
        </div>
        {pendingLoading && <div className="card muted">Loading pending events…</div>}
        {pendingError && <div className="notice error">{pendingError}</div>}
        {!pendingLoading && !pendingError && pendingItems.length === 0 && (
          <div className="card muted">No events pending approval.</div>
        )}
        {pendingItems.map((item) => (
          <article className="card stack" key={item.id}>
            <div className="row spread wrap gap-sm">
              <div>
                <div className="badge" style={{ borderColor: item.eventTypeColor }}>
                  {item.eventTypeName}
                </div>
                <h3>{item.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                  {new Date(item.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div className="row gap-sm">
                <button
                  className="btn btn-solid"
                  type="button"
                  onClick={() => void handleApprove(item.id)}
                >
                  Approve
                </button>
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => void handleReject(item.id)}
                >
                  Reject
                </button>
              </div>
            </div>
            <p>{item.description}</p>
          </article>
        ))}

        <div className="card">
          <div className="eyebrow">Event Inventory</div>
          <h2>{events.length} total events</h2>
        </div>
        <EventList items={events} onEdit={onEdit} onDelete={onDelete} emptyText="No events yet. Create your first one on the left." />
      </div>
    </section>
  );
}
