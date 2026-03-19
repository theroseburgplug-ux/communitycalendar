import { EventFilters } from '../components/EventFilters';
import { EventList } from '../components/EventList';
import type { EventItem, EventType } from '../lib/types';

interface PublicCalendarPageProps {
  events: EventItem[];
  types: EventType[];
  selectedType: string;
  onTypeChange: (value: string) => void;
}

export function PublicCalendarPage({ events, types, selectedType, onTypeChange }: PublicCalendarPageProps) {
  return (
    <section className="shell stack-lg">
      <div className="hero card">
        <div className="eyebrow">Public View</div>
        <h2>Browse upcoming events</h2>
        <p>
          Lightweight, filterable, and ready to reuse in an embeddable widget.
        </p>
      </div>
      <EventFilters types={types} selectedType={selectedType} onTypeChange={onTypeChange} />
      <EventList items={events} />
    </section>
  );
}
