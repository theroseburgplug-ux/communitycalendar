import { EventForm } from '../components/EventForm';
import { EventList } from '../components/EventList';
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
        <div className="card">
          <div className="eyebrow">Event Inventory</div>
          <h2>{events.length} total events</h2>
        </div>
        <EventList items={events} onEdit={onEdit} onDelete={onDelete} emptyText="No events yet. Create your first one on the left." />
      </div>
    </section>
  );
}
