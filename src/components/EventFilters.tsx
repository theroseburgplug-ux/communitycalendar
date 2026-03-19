import type { EventType } from '../lib/types';

interface EventFiltersProps {
  types: EventType[];
  selectedType: string;
  onTypeChange: (value: string) => void;
}

export function EventFilters({ types, selectedType, onTypeChange }: EventFiltersProps) {
  return (
    <div className="card filters-row">
      <div>
        <div className="eyebrow">Filter</div>
        <h3>Event Type</h3>
      </div>
      <select value={selectedType} onChange={(e) => onTypeChange(e.target.value)}>
        <option value="">All event types</option>
        {types.map((type) => (
          <option key={type.id} value={type.slug}>
            {type.name}
          </option>
        ))}
      </select>
    </div>
  );
}
