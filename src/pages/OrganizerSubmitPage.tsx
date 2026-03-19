import { useState } from 'react';
import { EventForm } from '../components/EventForm';
import { api } from '../lib/api';
import type { EventPayload, EventType } from '../lib/types';

interface OrganizerSubmitPageProps {
  types: EventType[];
}

export function OrganizerSubmitPage({ types }: OrganizerSubmitPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: EventPayload) {
    setError(null);
    try {
      await api.organizerSubmitEvent(payload);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
      throw err;
    }
  }

  if (submitted) {
    return (
      <main className="shell narrow">
        <div className="card stack" style={{ marginTop: '1.5rem' }}>
          <div>
            <div className="eyebrow">Submitted</div>
            <h2>Event submitted for approval</h2>
          </div>
          <p>
            Thank you! Your event has been submitted and is pending review by an admin. It will appear on the public
            calendar once approved.
          </p>
          <button className="btn btn-solid" type="button" onClick={() => setSubmitted(false)}>
            Submit another event
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell narrow">
      <div className="stack-lg" style={{ paddingTop: '1.5rem' }}>
        <div className="card">
          <div className="eyebrow">Organizer Portal</div>
          <h2>Submit an event</h2>
          <p className="muted">Events are reviewed by an admin before appearing on the public calendar.</p>
        </div>
        {error ? <div className="notice error">{error}</div> : null}
        <EventForm types={types} onSubmit={handleSubmit} />
      </div>
    </main>
  );
}
