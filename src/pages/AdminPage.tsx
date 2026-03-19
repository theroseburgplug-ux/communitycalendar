import { EventForm } from '../components/EventForm';
import { EventList } from '../components/EventList';
import type { EventItem, EventPayload, EventType, SessionUser } from '../lib/types';

interface AdminPageProps {
  user: SessionUser;
  types: EventType[];
  events: EventItem[];
  pendingEvents: EventItem[];
  editingEvent: EventItem | null;
  onSave: (payload: EventPayload) => Promise<void>;
  onEdit: (item: EventItem) => void;
  onDelete: (item: EventItem) => Promise<void>;
  onCancelEdit: () => void;
  onApprove: (item: EventItem) => Promise<void>;
  onReject: (item: EventItem) => Promise<void>;
}

export function AdminPage({
  user,
  types,
  events,
  pendingEvents,
  editingEvent,
  onSave,
  onEdit,
  onDelete,
  onCancelEdit,
  onApprove,
  onReject,
}: AdminPageProps) {
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
        {pendingEvents.length > 0 ? (
          <>
            <div className="card">
              <div className="eyebrow">Pending Review</div>
              <h2>{pendingEvents.length} pending submission{pendingEvents.length !== 1 ? 's' : ''}</h2>
            </div>
            <EventList
              items={pendingEvents}
              onApprove={onApprove}
              onReject={onReject}
              emptyText="No pending submissions."
            />
          </>
        ) : null}
        <div className="card">
          <div className="eyebrow">Event Inventory</div>
          <h2>{events.length} total events</h2>
        </div>
        <EventList items={events} onEdit={onEdit} onDelete={onDelete} emptyText="No events yet. Create your first one on the left." />
      </div>
    </section>
  );
}

