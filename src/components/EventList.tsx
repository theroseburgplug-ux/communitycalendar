import type { EventItem } from '../lib/types';

interface EventListProps {
  items: EventItem[];
  emptyText?: string;
  onEdit?: (item: EventItem) => void;
  onDelete?: (item: EventItem) => void;
  onApprove?: (item: EventItem) => Promise<void>;
  onReject?: (item: EventItem) => Promise<void>;
}

function formatDateRange(startAt: string, endAt: string | null) {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;

  const startText = start.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  if (!end) return startText;

  const endText = end.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `${startText} → ${endText}`;
}

export function EventList({ items, emptyText = 'No events found.', onEdit, onDelete, onApprove, onReject }: EventListProps) {
  if (!items.length) {
    return <div className="card muted">{emptyText}</div>;
  }

  return (
    <div className="stack">
      {items.map((item) => (
        <article className="card stack" key={item.id}>
          <div className="row spread wrap gap-sm">
            <div>
              <div className="badge" style={{ borderColor: item.eventTypeColor }}>
                {item.eventTypeName}
              </div>
              <h3>{item.title}</h3>
            </div>
            {(onEdit || onDelete || onApprove || onReject) && (
              <div className="row gap-sm">
                {onApprove ? (
                  <button className="btn success" onClick={() => void onApprove(item)}>
                    Approve
                  </button>
                ) : null}
                {onReject ? (
                  <button className="btn danger" onClick={() => void onReject(item)}>
                    Reject
                  </button>
                ) : null}
                {onEdit ? (
                  <button className="btn" onClick={() => onEdit(item)}>
                    Edit
                  </button>
                ) : null}
                {onDelete ? (
                  <button className="btn danger" onClick={() => onDelete(item)}>
                    Delete
                  </button>
                ) : null}
              </div>
            )}
          </div>
          <p>{item.description}</p>
          <div className="meta-grid">
            <div>
              <strong>When</strong>
              <span>{formatDateRange(item.startAt, item.endAt)}</span>
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
              <strong>Status</strong>
              <span>{item.status}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
