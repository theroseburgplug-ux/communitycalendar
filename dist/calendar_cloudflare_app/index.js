//#region worker/index.ts
var JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
var worker_default = { async fetch(request, env, ctx) {
	const url = new URL(request.url);
	if (url.pathname === "/api/health") return json({
		ok: true,
		app: env.APP_NAME
	});
	if (url.pathname === "/api/auth/session" && request.method === "GET") return json({ user: await getSessionUser(request, env) });
	if (url.pathname === "/api/auth/login" && request.method === "POST") {
		const body = await request.json().catch(() => ({}));
		const email = (body.email || "").trim().toLowerCase();
		const password = body.password || "";
		if (!email || !password) return json({ error: "Email and password are required." }, 400);
		const row = await env.DB.prepare("SELECT id, email, name, role, password_hash as passwordHash, password_salt as passwordSalt FROM users WHERE email = ? LIMIT 1").bind(email).first();
		if (!row) return json({ error: "Invalid credentials." }, 401);
		if (await sha256(`${row.passwordSalt}${password}`) !== row.passwordHash) return json({ error: "Invalid credentials." }, 401);
		const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
		const ttlDays = Number(env.SESSION_TTL_DAYS || "14");
		const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1e3).toISOString();
		await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(token, row.id, expiresAt, (/* @__PURE__ */ new Date()).toISOString()).run();
		return json({ user: {
			id: row.id,
			email: row.email,
			name: row.name,
			role: row.role
		} }, 200, { "Set-Cookie": createCookie(env.COOKIE_NAME, token, ttlDays) });
	}
	if (url.pathname === "/api/auth/logout" && request.method === "POST") {
		const token = getCookie(request, env.COOKIE_NAME);
		if (token) ctx.waitUntil(env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run());
		return json({ ok: true }, 200, { "Set-Cookie": `${env.COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure` });
	}
	if (url.pathname === "/api/event-types" && request.method === "GET") return json({ items: (await env.DB.prepare("SELECT id, name, slug, color, is_active as isActive FROM event_types WHERE is_active = 1 ORDER BY name ASC").all()).results || [] });
	if (url.pathname === "/api/events" && request.method === "GET") return json({ items: await selectEvents(env, url.searchParams.get("type") ?? void 0) });
	if (url.pathname === "/embed" && request.method === "GET") {
		const type = url.searchParams.get("type") || "";
		const title = escapeHtml(url.searchParams.get("title") || "Upcoming Events");
		return new Response(`<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${title}</title>
          </head>
          <body style="margin:0;padding:16px;background:#f8fafc;">
            <calendar-embed data-type="${escapeHtml(type)}" data-title="${title}"></calendar-embed>
            <script type="module" src="/embed.js"><\/script>
          </body>
        </html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
	}
	if (url.pathname === "/api/admin/events" && request.method === "POST") {
		const user = await requireAdmin(request, env);
		if (user instanceof Response) return user;
		const payload = await parseEventPayload(request);
		if (payload instanceof Response) return payload;
		const slug = payload.slug || slugify(payload.title);
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const insert = await env.DB.prepare(`INSERT INTO events (
          title, slug, description, start_at, end_at, all_day, location, organizer,
          status, visibility, event_type_id, created_by_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(payload.title, slug, payload.description, payload.startAt, payload.endAt || null, payload.allDay ? 1 : 0, payload.location || null, payload.organizer || null, payload.status, payload.visibility, payload.eventTypeId, user.id, now, now).run();
		return json({ item: await selectEventById(env, Number(insert.meta.last_row_id)) }, 201);
	}
	const eventIdMatch = url.pathname.match(/^\/api\/admin\/events\/(\d+)$/);
	if (eventIdMatch && request.method === "PUT") {
		const user = await requireAdmin(request, env);
		if (user instanceof Response) return user;
		const payload = await parseEventPayload(request);
		if (payload instanceof Response) return payload;
		const id = Number(eventIdMatch[1]);
		const existing = await env.DB.prepare("SELECT id, slug FROM events WHERE id = ?").bind(id).first();
		if (!existing) return json({ error: "Event not found." }, 404);
		await env.DB.prepare(`UPDATE events SET
          title = ?, slug = ?, description = ?, start_at = ?, end_at = ?, all_day = ?,
          location = ?, organizer = ?, status = ?, visibility = ?, event_type_id = ?, updated_at = ?
        WHERE id = ?`).bind(payload.title, payload.slug || existing.slug || slugify(payload.title), payload.description, payload.startAt, payload.endAt || null, payload.allDay ? 1 : 0, payload.location || null, payload.organizer || null, payload.status, payload.visibility, payload.eventTypeId, (/* @__PURE__ */ new Date()).toISOString(), id).run();
		return json({ item: await selectEventById(env, id) });
	}
	if (eventIdMatch && request.method === "DELETE") {
		const user = await requireAdmin(request, env);
		if (user instanceof Response) return user;
		const id = Number(eventIdMatch[1]);
		await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
		return json({ ok: true });
	}
	return env.ASSETS.fetch(request);
} };
function json(data, status = 200, extraHeaders) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...JSON_HEADERS,
			...extraHeaders
		}
	});
}
function createCookie(name, value, ttlDays) {
	return `${name}=${value}; HttpOnly; Path=/; Max-Age=${ttlDays * 24 * 60 * 60}; SameSite=Lax; Secure`;
}
function getCookie(request, name) {
	const header = request.headers.get("Cookie");
	if (!header) return null;
	const found = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
	return found ? found.slice(name.length + 1) : null;
}
async function getSessionUser(request, env) {
	const token = getCookie(request, env.COOKIE_NAME);
	if (!token) return null;
	const row = await env.DB.prepare(`SELECT u.id, u.email, u.name, u.role, s.expires_at as expiresAt
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?
     LIMIT 1`).bind(token).first();
	if (!row) return null;
	if (new Date(row.expiresAt).getTime() < Date.now()) {
		await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
		return null;
	}
	return {
		id: row.id,
		email: row.email,
		name: row.name,
		role: row.role
	};
}
async function requireAdmin(request, env) {
	const user = await getSessionUser(request, env);
	if (!user) return json({ error: "Authentication required." }, 401);
	if (user.role !== "admin") return json({ error: "Admin access required." }, 403);
	return user;
}
async function sha256(value) {
	const bytes = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function slugify(value) {
	return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
function escapeHtml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}
async function parseEventPayload(request) {
	const body = await request.json().catch(() => null);
	if (!body) return json({ error: "Invalid JSON payload." }, 400);
	const title = String(body.title || "").trim();
	const description = String(body.description || "").trim();
	const startAt = String(body.startAt || "").trim();
	if (!title || !description || !startAt) return json({ error: "Title, description, and start date are required." }, 400);
	const status = body.status === "draft" ? "draft" : "published";
	const visibility = body.visibility === "private" ? "private" : "public";
	const eventTypeId = Number(body.eventTypeId || 0);
	if (!eventTypeId) return json({ error: "Event type is required." }, 400);
	return {
		title,
		slug: body.slug ? String(body.slug) : void 0,
		description,
		startAt,
		endAt: body.endAt ? String(body.endAt) : null,
		allDay: Boolean(body.allDay),
		location: body.location ? String(body.location) : "",
		organizer: body.organizer ? String(body.organizer) : "",
		eventTypeId,
		status,
		visibility
	};
}
async function selectEvents(env, typeSlug) {
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
      e.event_type_id as eventTypeId,
      et.name as eventTypeName,
      et.slug as eventTypeSlug,
      et.color as eventTypeColor,
      e.created_at as createdAt,
      e.updated_at as updatedAt
    FROM events e
    JOIN event_types et ON et.id = e.event_type_id
  `;
	const query = typeSlug ? `${base} WHERE et.slug = ? ORDER BY e.start_at ASC` : `${base} ORDER BY e.start_at ASC`;
	const stmt = env.DB.prepare(query);
	return (typeSlug ? await stmt.bind(typeSlug).all() : await stmt.all()).results || [];
}
async function selectEventById(env, id) {
	return await env.DB.prepare(`SELECT
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
      e.event_type_id as eventTypeId,
      et.name as eventTypeName,
      et.slug as eventTypeSlug,
      et.color as eventTypeColor,
      e.created_at as createdAt,
      e.updated_at as updatedAt
     FROM events e
     JOIN event_types et ON et.id = e.event_type_id
     WHERE e.id = ?
     LIMIT 1`).bind(id).first() ?? null;
}
//#endregion
//#region \0virtual:cloudflare/worker-entry
var worker_entry_default = worker_default ?? {};
//#endregion
export { worker_entry_default as default };
