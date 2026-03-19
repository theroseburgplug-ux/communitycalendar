import { useState } from 'react';
import { EventForm } from '../components/EventForm';
import type { EventPayload, EventType, SessionUser } from '../lib/types';
import { api } from '../lib/api';

interface OrganizerPageProps {
  user: SessionUser;
  types: EventType[];
  onSuccess: () => void;
}

export function OrganizerPage({ user, types, onSuccess }: OrganizerPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: EventPayload) {
    setError(null);
    try {
      await api.organizerSubmitEvent({
        ...payload,
        status: 'draft',
        visibility: 'public',
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit event');
      throw err;
    }
  }

  if (submitted) {
    return (
      <main className="shell narrow">
        <div className="card stack">
          <div>
            <div className="eyebrow">Submission Received</div>
            <h2>Event submitted for review</h2>
          </div>
          <p>Your event has been submitted and is pending admin approval. It will appear on the public calendar once approved.</p>
          <div className="row gap-sm">
            <button className="btn btn-solid" onClick={() => { setSubmitted(false); }}>
              Submit another event
            </button>
            <button className="btn" onClick={onSuccess}>
              Back to calendar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell narrow">
      <div className="stack-lg">
        <div className="card">
          <div className="eyebrow">Organizer</div>
          <h2>Submit an event</h2>
          <p>Welcome, {user.name}. Fill in the details below and your event will be reviewed before appearing on the public calendar.</p>
        </div>
        <EventForm types={types} onSubmit={handleSubmit} />
      </div>
    </main>
  );
}
