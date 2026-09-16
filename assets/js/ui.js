/**
 * Shared UI kit: app shell, formatters, status badges, sortable tables.
 *
 * Pages ship a minimal HTML skeleton (`#sidebar`, `#topbar`, `#main`) and this
 * module fills in the chrome, so navigation lives in exactly one place.
 */

import { getMeta } from './api.js';

/* -------------------------------------------------------------------------- */
/* Escaping & small DOM helpers                                               */
/* -------------------------------------------------------------------------- */

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function el(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export const qs = (key, fallback = null) =>
  new URLSearchParams(location.search).get(key) ?? fallback;

/** Reflect the current filter state in the URL so any view is linkable. */
export function setQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== null && value !== undefined) search.set(key, value);
  }
  const url = search.toString() ? `?${search}` : location.pathname;
  history.replaceState(null, '', url);
}

/* -------------------------------------------------------------------------- */
/* Formatters                                                                 */
/* -------------------------------------------------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return `${formatDate(iso)}, ${iso.slice(11, 16)}`;
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-GB').format(value);
}

/** Compact money for tiles and axes; full precision lives in tables. */
export function formatMoney(value, { compact = true, currency = 'GBP' } = {}) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    notation: compact && Math.abs(value) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: compact && Math.abs(value) >= 10_000 ? 1 : 0,
  }).format(value);
}

/** `partially_effective` -> `Partially effective`. */
export function humanise(value) {
  if (!value) return '—';
  const text = String(value).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function relativeDays(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'today';
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  return `${Math.abs(days)} day${days === -1 ? '' : 's'} ago`;
}

/* -------------------------------------------------------------------------- */
/* Status vocabulary                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Tone maps onto the four reserved status colours. Every badge renders a
 * coloured dot *and* its label — colour never carries the meaning on its own.
 */
const TONES = {
  severity: { low: 'neutral', medium: 'warning', high: 'serious', critical: 'critical' },
  incidentStatus: { open: 'critical', under_investigation: 'serious', pending_action: 'warning', closed: 'good' },
  actionStatus: { not_started: 'neutral', in_progress: 'accent', blocked: 'critical', completed: 'good', cancelled: 'neutral' },
  priority: { low: 'neutral', medium: 'warning', high: 'serious', critical: 'critical' },
  effectiveness: { effective: 'good', partially_effective: 'warning', ineffective: 'critical', not_tested: 'neutral' },
  criticality: { low: 'neutral', medium: 'warning', high: 'serious', critical: 'critical' },
  failureMode: { failed: 'critical', partially_effective: 'warning', effective: 'good', not_applicable: 'neutral', absent: 'critical' },
  design: { strong: 'good', adequate: 'warning', deficient: 'critical' },
};

export function badge(kind, value, { label } = {}) {
  if (!value) return '<span class="muted">—</span>';
  const tone = TONES[kind]?.[value] ?? 'neutral';
  return `<span class="badge badge--${tone}"><span class="badge__dot" aria-hidden="true"></span>${esc(label ?? humanise(value))}</span>`;
}

export const overdueBadge = () =>
  '<span class="badge badge--critical" title="Past its due date"><span class="badge__dot" aria-hidden="true"></span>Overdue</span>';

export const INCIDENT_STATUSES = ['open', 'under_investigation', 'pending_action', 'closed'];
export const SEVERITIES = ['critical', 'high', 'medium', 'low'];
export const ACTION_STATUSES = ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled'];
export const PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const EFFECTIVENESS = ['effective', 'partially_effective', 'ineffective', 'not_tested'];

/* -------------------------------------------------------------------------- */
/* App shell                                                                  */
/* -------------------------------------------------------------------------- */

const ICONS = {
  dashboard: '<path d="M3 3h7v8H3zM14 3h7v5h-7zM14 11h7v10h-7zM3 14h7v7H3z"/>',
  incidents: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  actions: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
  controls: '<path d="M12 3l8 4v5c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V7l8-4z"/>',
  registers: '<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="1.4"/><circle cx="14" cy="12" r="1.4"/><circle cx="10" cy="19" r="1.4"/>',
  model: '<rect x="3" y="3" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/><path d="M6.5 9v5a2 2 0 0 0 2 2h5.5"/>',
  mcp: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="4"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};

const NAV = [
  { group: 'Risk', items: [
    { href: '/', key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/incidents/', key: 'incidents', label: 'Incidents', icon: 'incidents' },
    { href: '/actions/', key: 'actions', label: 'Actions', icon: 'actions' },
    { href: '/controls/', key: 'controls', label: 'Controls', icon: 'controls' },
    { href: '/registers/', key: 'registers', label: 'Registers', icon: 'registers' },
  ]},
  { group: 'Reference', items: [
    { href: '/data-model/', key: 'data-model', label: 'Data model', icon: 'model' },
    { href: '/mcp/', key: 'mcp', label: 'MCP server', icon: 'mcp' },
    { href: '/about/', key: 'about', label: 'About', icon: 'about' },
  ]},
];

const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/**
 * Build the sidebar and page header.
 *
 * @param {{active:string, title:string, eyebrow?:string, sub?:string, counts?:object, actions?:string}} options
 */
export async function mountShell({ active, title, eyebrow = '', sub = '', counts = {}, actions = '' }) {
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  const meta = await getMeta().catch(() => null);

  if (sidebar) {
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
      <a class="brand" href="/">
        <svg class="brand__mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 2 4 8v9c0 7 5.2 11.7 12 13 6.8-1.3 12-6 12-13V8L16 2z"
                fill="var(--series-1-wash)" stroke="var(--series-1)" stroke-width="1.6"/>
          <path d="M11 16.5l3.4 3.4L21 12.5" stroke="var(--series-1)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>
          <span class="brand__name">Meridian Risk</span><br>
          <span class="brand__sub">Operational risk</span>
        </span>
      </a>
      ${NAV.map((section) => `
        <nav class="nav" aria-label="${esc(section.group)}">
          <span class="nav__label">${esc(section.group)}</span>
          ${section.items.map((item) => `
            <a class="nav__link" href="${item.href}"${item.key === active ? ' aria-current="page"' : ''}>
              ${icon(item.icon)}<span>${esc(item.label)}</span>
              ${counts[item.key] !== undefined ? `<span class="nav__count">${esc(counts[item.key])}</span>` : ''}
            </a>`).join('')}
        </nav>`).join('')}
      <div class="sidebar__foot">
        <span>Demonstration data only.<br>${esc(meta?.organisation ?? '')} is fictional.</span>
        <span>Data as at ${esc(meta ? formatDate(meta.as_of) : '—')}</span>
      </div>`;
  }

  if (topbar) {
    topbar.className = 'topbar';
    topbar.innerHTML = `
      <div class="topbar__titles">
        ${eyebrow ? `<div class="topbar__eyebrow">${esc(eyebrow)}</div>` : ''}
        <h1>${esc(title)}</h1>
        ${sub ? `<p class="topbar__sub">${esc(sub)}</p>` : ''}
      </div>
      <div class="topbar__actions">
        ${actions}
        <button class="btn btn--icon" id="theme-toggle" type="button" title="Switch light / dark theme" aria-label="Switch light / dark theme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
          </svg>
        </button>
      </div>`;

    topbar.querySelector('#theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme
        ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('mr-theme', next); } catch { /* private mode */ }
    });
  }

  document.title = `${title} · Meridian Risk`;
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Render a sortable table.
 *
 * @param {HTMLElement} container
 * @param {{columns:Array, rows:Array, empty?:string, sort?:{key:string,dir:string}, rowHref?:Function}} config
 *   Each column: `{ key, label, cell(row), value(row), className, sortable }`.
 *   `value()` feeds sorting; `cell()` returns HTML.
 */
export function renderTable(container, { columns, rows, empty = 'Nothing to show.', sort = null, rowHref = null }) {
  let state = sort;

  const draw = () => {
    if (!rows.length) {
      container.innerHTML = `<p class="empty">${esc(empty)}</p>`;
      return;
    }

    let ordered = rows;
    if (state) {
      const column = columns.find((c) => c.key === state.key);
      if (column) {
        const pick = column.value ?? ((row) => row[column.key]);
        ordered = [...rows].sort((a, b) => {
          const x = pick(a);
          const y = pick(b);
          const cmp = typeof x === 'number' && typeof y === 'number'
            ? x - y
            : String(x ?? '').localeCompare(String(y ?? ''));
          return state.dir === 'desc' ? -cmp : cmp;
        });
      }
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>${columns.map((c) => {
            const sortable = c.sortable !== false;
            const isSorted = state?.key === c.key;
            return `<th${c.className ? ` class="${c.className}${sortable ? ' sortable' : ''}"` : sortable ? ' class="sortable"' : ''}`
              + `${sortable ? ` data-key="${esc(c.key)}" tabindex="0" role="button"` : ''}`
              + `${isSorted ? ` aria-sort="${state.dir === 'desc' ? 'descending' : 'ascending'}"` : ''}>${esc(c.label)}</th>`;
          }).join('')}</tr></thead>
          <tbody>${ordered.map((row) => {
            const href = rowHref?.(row);
            return `<tr${href ? ` data-href="${esc(href)}" style="cursor:pointer"` : ''}>${
              columns.map((c) => `<td${c.className ? ` class="${c.className}"` : ''}>${c.cell(row)}</td>`).join('')
            }</tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;

    container.querySelectorAll('th.sortable').forEach((th) => {
      const activate = () => {
        const key = th.dataset.key;
        state = state?.key === key
          ? { key, dir: state.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: 'asc' };
        draw();
      };
      th.addEventListener('click', activate);
      th.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
      });
    });

    if (rowHref) {
      container.querySelectorAll('tr[data-href]').forEach((tr) => {
        tr.addEventListener('click', (event) => {
          if (event.target.closest('a')) return;
          location.href = tr.dataset.href;
        });
      });
    }
  };

  draw();
}

/** A collapsed table of the numbers behind a chart — the non-visual fallback. */
export function dataTableDetails(caption, headers, rows) {
  return `
    <details class="data-table-toggle">
      <summary>${esc(caption)}</summary>
      <table class="table">
        <thead><tr>${headers.map((h, i) => `<th${i ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((cell, i) => `<td${i ? ' class="num"' : ''}>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </details>`;
}

export function showError(container, error) {
  container.innerHTML = `
    <div class="card"><div class="card__body">
      <h2 class="card__title">Could not load the data</h2>
      <p class="prose-block">${esc(error?.message ?? 'Unknown error')}</p>
    </div></div>`;
}
