import { useEffect, useState } from 'react';
import type { EventItem, EventPayload, EventType } from '../lib/types';

interface EventFormProps {
  types: EventType[];
  initialValue?: EventItem | null;
  onCancel?: () => void;
  onSubmit: (payload: EventPayload) => Promise<void>;
}

function toInputValue(value: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 16);
}

export function EventForm({ types, initialValue, onCancel, onSubmit }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [eventTypeId, setEventTypeId] = useState<number>(types[0]?.id ?? 1);
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialValue) return;
    setTitle(initialValue.title);
    setDescription(initialValue.description);
    setStartAt(toInputValue(initialValue.startAt));
    setEndAt(toInputValue(initialValue.endAt));
    setAllDay(Boolean(initialValue.allDay));
    setLocation(initialValue.location || '');
    setOrganizer(initialValue.organizer || '');
    setEventTypeId(initialValue.eventTypeId);
    setStatus(initialValue.status);
    setVisibility(initialValue.visibility);
  }, [initialValue]);

  return (
    <form
      className="card stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
          await onSubmit({
            title,
            description,
            startAt: new Date(startAt).toISOString(),
            endAt: endAt ? new Date(endAt).toISOString() : null,
            allDay,
            location,
            organizer,
            eventTypeId,
            status,
            visibility,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unable to save event');
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="row spread wrap gap-sm">
        <div>
          <div className="eyebrow">{initialValue ? 'Edit Event' : 'New Event'}</div>
          <h2>{initialValue ? `Update ${initialValue.title}` : 'Create event'}</h2>
        </div>
        {onCancel ? (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
      </label>
      <div className="grid two">
        <label>
          Start
          <input value={startAt} onChange={(e) => setStartAt(e.target.value)} type="datetime-local" required />
        </label>
        <label>
          End
          <input value={endAt} onChange={(e) => setEndAt(e.target.value)} type="datetime-local" />
        </label>
      </div>
      <label className="checkbox-row">
        <input checked={allDay} onChange={(e) => setAllDay(e.target.checked)} type="checkbox" />
        All day event
      </label>
      <div className="grid two">
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label>
          Organizer
          <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
        </label>
      </div>
      <div className="grid three">
        <label>
          Event type
          <select value={eventTypeId} onChange={(e) => setEventTypeId(Number(e.target.value))}>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label>
          Visibility
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
      </div>
      {error ? <div className="notice error">{error}</div> : null}
      <button className="btn btn-solid" disabled={loading} type="submit">
        {loading ? 'Saving...' : initialValue ? 'Update event' : 'Create event'}
      </button>
    </form>
  );
}
