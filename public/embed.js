class CalendarEmbed extends HTMLElement {
  connectedCallback() {
    const type = this.getAttribute('data-type') || '';
    const title = this.getAttribute('data-title') || 'Upcoming Events';
    this.innerHTML = `<div style="font-family: Inter, Arial, sans-serif; border:1px solid #e5e7eb; border-radius:16px; padding:16px; background:#fff; color:#111827;">
      <div style="font-size:12px; text-transform:uppercase; letter-spacing:.12em; color:#f08c3c; font-weight:700;">Embedded Calendar</div>
      <h3 style="margin:6px 0 14px;">${title}</h3>
      <div data-list>Loading events...</div>
    </div>`;

    const url = new URL('/api/events', window.location.origin);
    if (type) url.searchParams.set('type', type);

    fetch(url.toString(), { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const list = this.querySelector('[data-list]');
        const items = (data.items || []).filter((item) => item.status === 'published' && item.visibility === 'public');
        if (!list) return;
        if (!items.length) {
          list.innerHTML = '<div style="color:#6b7280;">No events found.</div>';
          return;
        }
        list.innerHTML = items
          .map(
            (item) => `
              <article style="padding:12px 0; border-top:1px solid #e5e7eb;">
                <div style="display:inline-block; font-size:12px; border:1px solid ${item.eventTypeColor}; border-radius:999px; padding:4px 8px; margin-bottom:8px; color:#4b5563;">${item.eventTypeName}</div>
                <h4 style="margin:0 0 6px;">${item.title}</h4>
                <div style="font-size:14px; color:#374151; margin-bottom:6px;">${new Date(item.startAt).toLocaleString()}</div>
                <div style="font-size:14px; color:#6b7280;">${item.location || 'TBD'}</div>
              </article>`,
          )
          .join('');
      })
      .catch(() => {
        const list = this.querySelector('[data-list]');
        if (list) list.textContent = 'Unable to load events.';
      });
  }
}

customElements.define('calendar-embed', CalendarEmbed);
