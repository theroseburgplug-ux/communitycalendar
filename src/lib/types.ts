export type UserRole = 'user' | 'organizer' | 'admin';
export type EventStatus = 'draft' | 'pending' | 'published' | 'rejected';
export type Visibility = 'public' | 'private';

export interface EventType {
  id: number;
  name: string;
  slug: string;
  color: string;
  isActive: number;
}

export interface EventItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  startAt: string;
  endAt: string | null;
  allDay: number;
  location: string | null;
  organizer: string | null;
  status: EventStatus;
  visibility: Visibility;
  eventTypeId: number;
  eventTypeName: string;
  eventTypeSlug: string;
  eventTypeColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface EventPayload {
  title: string;
  slug?: string;
  description: string;
  startAt: string;
  endAt?: string | null;
  allDay: boolean;
  location?: string;
  organizer?: string;
  eventTypeId: number;
  status: EventStatus;
  visibility: Visibility;
}
