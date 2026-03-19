export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_NAME: string;
  COOKIE_NAME: string;
  SESSION_TTL_DAYS: string;
}

type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'organizer' | 'admin';
};

type EventRecord = {
  id: number;
  title: string;
  slug: string;
  description: string;
  startAt: string;
  endAt: string | null;
  allDay: number;
  location: string | null;
  organizer: string | null;
  status: 'draft' | 'published';
  visibility: 'public' | 'private';

  moderationStatus: 'pending' | 'approved' | 'rejected';
  approvedAt: string | null;
  approvedById: number | null;

  eventTypeId: number;
  eventTypeName: string;
  eventTypeSlug: string;
  eventTypeColor: string;
  createdAt: string;
  updatedAt: string;
};

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true, app: env.APP_NAME });
    }

    if (url.pathname === '/api/auth/session' && request.method === 'GET') {
      const user = await getSessionUser(request, env);
      return json({ user });
    }

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json<{ email?: string; password?: string }>().catch(() => ({}));
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      if (!email || !password) return json({ error: 'Email and password are required.' }, 400);

      const row = await env.DB.prepare(
        'SELECT id, email, name, role, password_hash as passwordHash, password_salt as passwordSalt FROM users WHERE email = ? LIMIT 1',
      )
        .bind(email)
        .first<SessionUser & { passwordHash: string; passwordSalt: string }>();

      if (!row) return json({ error: 'Invalid credentials.' }, 401);

      const computed = await sha256(`${row.passwordSalt}${password}`);
      if (computed !== row.passwordHash) return json({ error: 'Invalid credentials.' }, 401);

      const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
      const ttlDays = Number(env.SESSION_TTL_DAYS || '14');
      const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

      await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(token, row.id, expiresAt, new Date().toISOString())
        .run();

      return json(
        {
          user: {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role,
          },
        },
        200,
        {
          'Set-Cookie': createCookie(env.COOKIE_NAME, token, ttlDays),
        },
      );
    }

    if (url.pathname === '/api/auth/register' && request.method === 'POST') {
      const body = await request.json<{ email?: string; name?: string; password?: string }>().catch(() => ({}));
      const email = (body.email || '').trim().toLowerCase();
      const name = (body.name || '').trim();
      const password = body.password || '';
      if (!email || !name || !password) return json({ error: 'Email, name, and password are required.' }, 400);
      if (!email.includes('@')) return json({ error: 'A valid email address is required.' }, 400);
      if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);

      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first<{ id: number }>();
      if (existing) return json({ error: 'An account with that email already exists.' }, 409);

      const salt = crypto.randomUUID().replaceAll('-', '');
      const hash = await sha256(`${salt}${password}`);
      const now = new Date().toISOString();

      const insert = await env.DB.prepare(
        'INSERT INTO users (email, name, role, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(email, name, 'organizer', hash, salt, now, now)
        .run();

      const userId = Number(insert.meta.last_row_id);
      const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
      const ttlDays = Number(env.SESSION_TTL_DAYS || '14');
      const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

      await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(token, userId, expiresAt, now)
        .run();

      return json(
        { user: { id: userId, email, name, role: 'organizer' } },
        201,
        { 'Set-Cookie': createCookie(env.COOKIE_NAME, token, ttlDays) },
      );
    }

    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      const token = getCookie(request, env.COOKIE_NAME);
      if (token) {
        ctx.waitUntil(env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run());
      }
      return json({ ok: true }, 200, {
        'Set-Cookie': `${env.COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`,
      });
    }

    if (url.pathname === '/api/event-types' && request.method === 'GET') {
      const result = await env.DB.prepare(
        'SELECT id, name, slug, color, is_active as isActive FROM event_types WHERE is_active = 1 ORDER BY name ASC',
      ).all();
      return json({ items: result.results || [] });
    }

    // Public listing: only approved + published + public events.
    if (url.pathname === '/api/events' && request.method === 'GET') {
      const typeSlug = url.searchParams.get('type');
      const items = await selectPublicEvents(env, typeSlug ?? undefined);
      return json({ items });
    }

    if (url.pathname === '/embed' && request.method === 'GET') {
      const type = url.searchParams.get('type') || '';
      const title = escapeHtml(url.searchParams.get('title') || 'Upcoming Events');
      return new Response(
        `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${title}</title>
          </head>
          <body style="margin:0;padding:16px;background:#f8fafc;">
            <calendar-embed data-type="${escapeHtml(type)}" data-title="${title}"></calendar-embed>
            <script type="module" src="/embed.js"></script>
          </body>
        </html>`,
        { headers: { 'content-type': 'text/html; charset=utf-8' } },
      );
    }

    if (url.pathname === '/api/organizer/events' && request.method === 'POST') {
      const user = await requireOrganizerOrAdmin(request, env);
      if (user instanceof Response) return user;
      const payload = await parseEventPayload(request);
      if (payload instanceof Response) return payload;

      const slug = payload.slug || slugify(payload.title);
      const now = new Date().toISOString();
      const insert = await env.DB.prepare(
        `INSERT INTO events (
          title, slug, description, start_at, end_at, all_day, location, organizer,
          status, visibility, event_type_id, created_by_id, created_at, updated_at,
          moderation_status, approved_at, approved_by_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          payload.title,
          slug,
          payload.description,
          payload.startAt,
          payload.endAt || null,
          payload.allDay ? 1 : 0,
          payload.location || null,
          payload.organizer || null,
          'draft',
          'public',
          payload.eventTypeId,
          user.id,
          now,
          now,
          'pending',
          null,
          null,
        )
        .run();

      const id = Number(insert.meta.last_row_id);
      const item = await selectEventById(env, id);
      return json({ item }, 201);
    }

    if (url.pathname === '/api/admin/events' && request.method === 'GET') {
      const user = await requireAdmin(request, env);
      if (user instanceof Response) return user;
      const items = await selectAllAdminEvents(env);
      return json({ items });
    }

    if (url.pathname === '/api/admin/moderation/pending' && request.method === 'GET') {
      const user = await requireAdmin(request, env);
      if (user instanceof Response) return user;
      const items = await selectPendingEvents(env);
      return json({ items });
    }

    const moderationIdMatch = url.pathname.match(/^\/api\/admin\/moderation\/(\d+)\/(approve|reject)$/);
    if (moderationIdMatch && request.method === 'POST') {
      const user = await requireAdmin(request, env);
      if (user instanceof Response) return user;
      const id = Number(moderationIdMatch[1]);
      const action = moderationIdMatch[2] as 'approve' | 'reject';
      const now = new Date().toISOString();

      const existing = await env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(id).first<{ id: number }>();
      if (!existing) return json({ error: 'Event not found.' }, 404);

      if (action === 'approve') {
        await env.DB.prepare(
          `UPDATE events SET moderation_status = 'approved', approved_at = ?, approved_by_id = ?, status = 'published', updated_at = ? WHERE id = ?`,
        )
          .bind(now, user.id, now, id)
          .run();
      } else {
        await env.DB.prepare(
          `UPDATE events SET moderation_status = 'rejected', approved_at = ?, approved_by_id = ?, status = 'draft', updated_at = ? WHERE id = ?`,
        )
          .bind(now, user.id, now, id)
          .run();
      }

      const item = await selectEventById(env, id);
      return json({ item });
    }

    if (url.pathname === '/api/admin/events' && request.method === 'POST') {
      const user = await requireAdmin(request, env);
      if (user instanceof Response) return user;
      const payload = await parseEventPayload(request);
      if (payload instanceof Response) return payload;

      const slug = payload.slug || slugify(payload.title);
      const now = new Date().toISOString();
      const insert = await env.DB.prepare(
        `INSERT INTO events (
          title, slug, description, start_at, end_at, all_day, location, organizer,
          status, visibility, event_type_id, created_by_id, created_at, updated_at,
          moderation_status, approved_at, approved_by_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          payload.title,
          slug,
          payload.description,
          payload.startAt,
          payload.endAt || null,
          payload.allDay ? 1 : 0,
          payload.location || null,
          payload.organizer || null,
          payload.status,
          payload.visibility,
          payload.eventTypeId,
          user.id,
          now,
          now,
          // Admin-created events are immediately approved.
          'approved',
          now,
          user.id,
        )
        .run();

      const id = Number(insert.meta.last_row_id);
      const item = await selectEventById(env, id);
      return json({ item }, 201);
    }

    const eventIdMatch = url.pathname.match(/^\/api\/admin\/events\/(\d+)$/);
    if (eventIdMatch && request.method === 'PUT') {
      const user = await requireAdmin(request, env);
      if (user instanceof Response) return user;
      const payload = await parseEventPayload(request);
      if (payload instanceof Response) return payload;

      const id = Number(eventIdMatch[1]);
      const existing = await env.DB.prepare('SELECT id, slug FROM events WHERE id = ?').bind(id).first<{ id: number; slug: string }>();
      if (!existing) return json({ error: 'Event not found.' }, 404);

      await env.DB.prepare(
        `UPDATE events SET
          title = ?, slug = ?, description = ?, start_at = ?, end_at = ?, all_day = ?,
          location = ?, organizer = ?, status = ?, visibility = ?, event_type_id = ?, updated_at = ?
        WHERE id = ?`,
      )
        .bind(
          payload.title,
          payload.slug || existing.slug || slugify(payload.title),
          payload.description,
          payload.startAt,
          payload.endAt || null,
          payload.allDay ? 1 : 0,
          payload.location || null,
          payload.organizer || null,
          payload.status,
          payload.visibility,
          payload.eventTypeId,
          new Date().toISOString(),
          id,
        )
        .run();

      const item = await selectEventById(env, id);
      return json({ item });
    }

    if (eventIdMatch && request.method === 'DELETE') {
      const user = await requireAdmin(request, env);
      if (user instanceof Response) return user;
      const id = Number(eventIdMatch[1]);
      await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }

    return env.ASSETS.fetch(request);
  },
};

function json(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}

function createCookie(name: string, value: string, ttlDays: number) {
  return `${name}=${value}; HttpOnly; Path=/; Max-Age=${ttlDays * 24 * 60 * 60}; SameSite=Lax; Secure`;
}

function getCookie(request: Request, name: string) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  const found = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : null;
}

async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = getCookie(request, env.COOKIE_NAME);
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, s.expires_at as expiresAt
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?
     LIMIT 1`,
  )
    .bind(token)
    .first<SessionUser & { expiresAt: string }>();

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}

async function requireAdmin(request: Request, env: Env): Promise<SessionUser | Response> {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Authentication required.' }, 401);
  if (user.role !== 'admin') return json({ error: 'Admin access required.' }, 403);
  return user;
}

async function requireOrganizerOrAdmin(request: Request, env: Env): Promise<SessionUser | Response> {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Authentication required.' }, 401);
  if (user.role !== 'organizer' && user.role !== 'admin') return json({ error: 'Organizer or admin access required.' }, 403);
  return user;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function parseEventPayload(request: Request) {
  const body = await request.json<Record<string, unknown>>().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON payload.' }, 400);

  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const startAt = String(body.startAt || '').trim();
  if (!title || !description || !startAt) return json({ error: 'Title, description, and start date are required.' }, 400);

  const status = body.status === 'draft' ? 'draft' : 'published';
  const visibility = body.visibility === 'private' ? 'private' : 'public';
  const eventTypeId = Number(body.eventTypeId || 0);
  if (!eventTypeId) return json({ error: 'Event type is required.' }, 400);

  return {
    title,
    slug: body.slug ? String(body.slug) : undefined,
    description,
    startAt,
    endAt: body.endAt ? String(body.endAt) : null,
    allDay: Boolean(body.allDay),
    location: body.location ? String(body.location) : '',
    organizer: body.organizer ? String(body.organizer) : '',
    eventTypeId,
    status,
    visibility,
  };
}

async function selectPublicEvents(env: Env, typeSlug?: string): Promise<EventRecord[]> {
  const base = `
    SELECT
      e.id,
      e.title,
      e.slug,
      e.description,
      e.start_at as startAt,
      e.end_at as endAt,
      e.all_day as allDay,
      e.location,
      e.organizer,
      e.status,
      e.visibility,
      e.moderation_status as moderationStatus,
      e.approved_at as approvedAt,
      e.approved_by_id as approvedById,
      e.event_type_id as eventTypeId,
      et.name as eventTypeName,
      et.slug as eventTypeSlug,
      et.color as eventTypeColor,
      e.created_at as createdAt,
      e.updated_at as updatedAt
    FROM events e
    JOIN event_types et ON et.id = e.event_type_id
  `;

  const where = `
    WHERE e.status = 'published'
      AND e.visibility = 'public'
      AND e.moderation_status = 'approved'
  `;

  const query = typeSlug
    ? `${base} ${where} AND et.slug = ? ORDER BY e.start_at ASC`
    : `${base} ${where} ORDER BY e.start_at ASC`;

  const stmt = env.DB.prepare(query);
  const result = typeSlug ? await stmt.bind(typeSlug).all<EventRecord>() : await stmt.all<EventRecord>();
  return (result.results || []) as EventRecord[];
}

async function selectEventById(env: Env, id: number): Promise<EventRecord | null> {
  const result = await env.DB.prepare(
    `SELECT
      e.id,
      e.title,
      e.slug,
      e.description,
      e.start_at as startAt,
      e.end_at as endAt,
      e.all_day as allDay,
      e.location,
      e.organizer,
      e.status,
      e.visibility,
      e.moderation_status as moderationStatus,
      e.approved_at as approvedAt,
      e.approved_by_id as approvedById,
      e.event_type_id as eventTypeId,
      et.name as eventTypeName,
      et.slug as eventTypeSlug,
      et.color as eventTypeColor,
      e.created_at as createdAt,
      e.updated_at as updatedAt
     FROM events e
     JOIN event_types et ON et.id = e.event_type_id
     WHERE e.id = ?
     LIMIT 1`,
  )
    .bind(id)
    .first<EventRecord>();
  return result ?? null;
}

const EVENT_SELECT_BASE = `
  SELECT
    e.id,
    e.title,
    e.slug,
    e.description,
    e.start_at as startAt,
    e.end_at as endAt,
    e.all_day as allDay,
    e.location,
    e.organizer,
    e.status,
    e.visibility,
    e.moderation_status as moderationStatus,
    e.approved_at as approvedAt,
    e.approved_by_id as approvedById,
    e.event_type_id as eventTypeId,
    et.name as eventTypeName,
    et.slug as eventTypeSlug,
    et.color as eventTypeColor,
    e.created_at as createdAt,
    e.updated_at as updatedAt
  FROM events e
  JOIN event_types et ON et.id = e.event_type_id
`;

async function selectAllAdminEvents(env: Env): Promise<EventRecord[]> {
  const result = await env.DB.prepare(`${EVENT_SELECT_BASE} ORDER BY e.start_at ASC`).all<EventRecord>();
  return (result.results || []) as EventRecord[];
}

async function selectPendingEvents(env: Env): Promise<EventRecord[]> {
  const result = await env.DB.prepare(
    `${EVENT_SELECT_BASE} WHERE e.moderation_status = 'pending' ORDER BY e.start_at ASC`,
  ).all<EventRecord>();
  return (result.results || []) as EventRecord[];
}