import type { EventItem, EventPayload, EventType, SessionUser } from './types';

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const api = {
  session: () => request<{ user: SessionUser | null }>('/api/auth/session'),
  login: (email: string, password: string) =>
    request<{ user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, name: string, password: string) =>
    request<{ user: SessionUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),
  logout: () =>
    request<{ ok: true }>('/api/auth/logout', {
      method: 'POST',
    }),
  getEventTypes: () => request<{ items: EventType[] }>('/api/event-types'),
  getEvents: (params?: URLSearchParams) =>
    request<{ items: EventItem[] }>(`/api/events${params ? `?${params.toString()}` : ''}`),
  organizerSubmitEvent: (payload: EventPayload) =>
    request<{ item: EventItem }>('/api/organizer/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createEvent: (payload: EventPayload) =>
    request<{ item: EventItem }>('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateEvent: (id: number, payload: EventPayload) =>
    request<{ item: EventItem }>(`/api/admin/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteEvent: (id: number) =>
    request<{ ok: true }>(`/api/admin/events/${id}`, {
      method: 'DELETE',
    }),
  getAdminEvents: () => request<{ items: EventItem[] }>('/api/admin/events'),
  getPendingModeration: () => request<{ items: EventItem[] }>('/api/admin/moderation/pending'),
  approveModeration: (id: number) =>
    request<{ item: EventItem }>(`/api/admin/moderation/${id}/approve`, { method: 'POST' }),
  rejectModeration: (id: number) =>
    request<{ item: EventItem }>(`/api/admin/moderation/${id}/reject`, { method: 'POST' }),
};
