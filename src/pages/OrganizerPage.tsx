import { EventForm } from '../components/EventForm';
import { EventList } from '../components/EventList';
import type { EventItem, EventPayload, EventType, SessionUser } from '../lib/types';

interface OrganizerPageProps {
  user: SessionUser;
  types: EventType[];
  events: EventItem[];
  onSubmit: (payload: EventPayload) => Promise<void>;
}

export function OrganizerPage({ user, types, events, onSubmit }: OrganizerPageProps) {
  return (
    <section className="shell admin-layout">
      <div className="stack-lg">
        <div className="card">
          <div className="eyebrow">Organizer Panel</div>
          <h2>Welcome, {user.name}</h2>
          <p>Submit events for admin review. Approved events will appear on the public calendar.</p>
        </div>
        <EventForm types={types} onSubmit={onSubmit} showStatusControls={false} />
      </div>
      <div className="stack-lg">
        <div className="card">
          <div className="eyebrow">Your Submissions</div>
          <h2>
            {events.length} submitted event{events.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <EventList items={events} emptyText="No submissions yet. Submit your first event on the left." />
      </div>
    </section>
  );
}
