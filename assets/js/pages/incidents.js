/** Incident register — filterable list, every filter reflected in the URL. */

import { listIncidents, listDepartments, listSystems, listCategories, listUsers, getMeta } from '../api.js';
import {
  mountShell, badge, esc, formatDate, formatMoney, humanise, qs, setQuery,
  renderTable, showError, INCIDENT_STATUSES, SEVERITIES,
} from '../ui.js';

const main = document.getElementById('main');

try {
  const [all, departments, systems, categories, users, meta] = await Promise.all([
    listIncidents(),
    listDepartments(),
    listSystems(),
    listCategories(),
    listUsers(),
    getMeta(),
  ]);

  const state = {
    q: qs('q', ''),
    status: qs('status', ''),
    severity: qs('severity', ''),
    department: qs('department', ''),
    system: qs('system', ''),
    category: qs('category', ''),
    owner: qs('owner', ''),
    open: qs('open', ''),
    likelihood: qs('likelihood', ''),
    impact: qs('impact', ''),
  };

  await mountShell({
    active: 'incidents',
    eyebrow: 'Register',
    title: 'Incidents',
    sub: `Every operational risk event recorded against ${meta.organisation}. Select a row for the full record, its failed controls and its remediation actions.`,
    counts: { incidents: all.filter((i) => i.is_open).length },
  });

  const options = (rows, selected, valueKey = 'id', labelKey = 'name') =>
    rows.map((r) => `<option value="${esc(r[valueKey])}"${String(r[valueKey]) === String(selected) ? ' selected' : ''}>${esc(r[labelKey])}</option>`).join('');

  main.innerHTML = `
    <div class="filter-bar">
      <label class="field field--grow">
        <span class="field__label">Search</span>
        <input type="search" id="f-q" placeholder="Title, reference, root cause…" value="${esc(state.q)}" />
      </label>
      <label class="field">
        <span class="field__label">Status</span>
        <select id="f-status">
          <option value="">All statuses</option>
          ${INCIDENT_STATUSES.map((s) => `<option value="${s}"${state.status === s ? ' selected' : ''}>${humanise(s)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Severity</span>
        <select id="f-severity">
          <option value="">All severities</option>
          ${SEVERITIES.map((s) => `<option value="${s}"${state.severity === s ? ' selected' : ''}>${humanise(s)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Department</span>
        <select id="f-department"><option value="">All departments</option>${options(departments, state.department)}</select>
      </label>
      <label class="field">
        <span class="field__label">System</span>
        <select id="f-system"><option value="">All systems</option>${options(systems, state.system)}</select>
      </label>
      <label class="field">
        <span class="field__label">Category</span>
        <select id="f-category"><option value="">All categories</option>${options(categories, state.category)}</select>
      </label>
      <label class="field">
        <span class="field__label">Owner</span>
        <select id="f-owner"><option value="">Anyone</option>${options(users, state.owner, 'id', 'full_name')}</select>
      </label>
      <label class="field">
        <span class="field__label">&nbsp;</span>
        <button class="btn" id="f-reset" type="button">Clear filters</button>
      </label>
      <span class="filter-bar__result" id="result-count"></span>
    </div>

    <div id="scope-note"></div>

    <div class="card">
      <div class="card__body card__body--flush" id="table"></div>
    </div>`;

  const tableEl = document.getElementById('table');
  const countEl = document.getElementById('result-count');
  const noteEl = document.getElementById('scope-note');

  async function apply() {
    let rows = await listIncidents({
      search: state.q || undefined,
      status: state.status || undefined,
      severity: state.severity || undefined,
      departmentId: state.department || undefined,
      systemId: state.system || undefined,
      categoryId: state.category || undefined,
      ownerId: state.owner || undefined,
      openOnly: state.open === '1',
    });

    // The dashboard heat map links here with a specific likelihood × impact cell.
    if (state.likelihood) rows = rows.filter((i) => i.likelihood === Number(state.likelihood));
    if (state.impact) rows = rows.filter((i) => i.impact === Number(state.impact));

    setQuery(state);
    countEl.textContent = `${rows.length} of ${all.length} incidents`;

    const scopes = [];
    if (state.open === '1') scopes.push('open incidents only');
    if (state.likelihood) scopes.push(`likelihood ${state.likelihood}`);
    if (state.impact) scopes.push(`impact ${state.impact}`);
    noteEl.innerHTML = scopes.length
      ? `<div class="banner"><span class="banner__glyph" aria-hidden="true">🔎</span>
           <span>Filtered to ${esc(scopes.join(', '))}. <a href="/incidents/">Show the whole register</a>.</span></div>`
      : '';

    renderTable(tableEl, {
      rows,
      rowHref: (row) => `/incidents/detail.html?ref=${row.reference}`,
      sort: { key: 'occurred_date', dir: 'desc' },
      columns: [
        { key: 'reference', label: 'Reference', cell: (r) => `<a class="mono" href="/incidents/detail.html?ref=${esc(r.reference)}">${esc(r.reference)}</a>` },
        { key: 'title', label: 'Incident', cell: (r) => `
            <span class="cell-title">${esc(r.title)}</span>
            <div class="cell-sub">${esc(r.category?.name ?? 'Uncategorised')}${r.regulatory_reportable ? ' · <span class="tag">Reportable</span>' : ''}</div>` },
        { key: 'department', label: 'Department', value: (r) => r.department?.name, cell: (r) => esc(r.department?.name ?? '—') },
        { key: 'system', label: 'System', value: (r) => r.system?.name, cell: (r) => esc(r.system?.name ?? '—') },
        { key: 'severity', label: 'Severity', value: (r) => ['low', 'medium', 'high', 'critical'].indexOf(r.severity), cell: (r) => badge('severity', r.severity) },
        { key: 'status', label: 'Status', cell: (r) => badge('incidentStatus', r.status) },
        { key: 'occurred_date', label: 'Occurred', className: 'num nowrap', cell: (r) => formatDate(r.occurred_date) },
        { key: 'net_loss', label: 'Net loss', className: 'num', value: (r) => r.net_loss, cell: (r) => formatMoney(r.net_loss) },
        { key: 'actions', label: 'Actions', className: 'num', value: (r) => r.actions.length,
          cell: (r) => `${r.actions.filter((a) => !a.is_open).length}/${r.actions.length}<div class="cell-sub">done</div>` },
      ],
      empty: 'No incidents match these filters.',
    });
  }

  const bind = (id, key, event = 'change') => {
    const node = document.getElementById(id);
    node.addEventListener(event, () => { state[key] = node.value; apply(); });
  };
  bind('f-q', 'q', 'input');
  bind('f-status', 'status');
  bind('f-severity', 'severity');
  bind('f-department', 'department');
  bind('f-system', 'system');
  bind('f-category', 'category');
  bind('f-owner', 'owner');
  document.getElementById('f-reset').addEventListener('click', () => { location.href = '/incidents/'; });

  await apply();
} catch (error) {
  await mountShell({ active: 'incidents', title: 'Incidents' }).catch(() => {});
  showError(main, error);
}
