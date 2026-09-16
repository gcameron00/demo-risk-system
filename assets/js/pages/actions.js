/** Action tracker — what is being done about the incidents, and by when. */

import { listActions, listDepartments, listUsers } from '../api.js';
import {
  mountShell, badge, esc, formatDate, humanise, qs, setQuery, relativeDays,
  renderTable, showError, overdueBadge, dataTableDetails,
  ACTION_STATUSES, PRIORITIES,
} from '../ui.js';
import { barChart } from '../charts.js';

const main = document.getElementById('main');

try {
  const [all, departments, users] = await Promise.all([listActions(), listDepartments(), listUsers()]);

  const state = {
    q: qs('q', qs('ref', '')),
    status: qs('status', ''),
    priority: qs('priority', ''),
    type: qs('type', ''),
    department: qs('department', ''),
    owner: qs('owner', ''),
    overdue: qs('overdue', ''),
  };

  const open = all.filter((a) => a.is_open);

  await mountShell({
    active: 'actions',
    eyebrow: 'Register',
    title: 'Actions',
    sub: 'Mitigations raised from incidents — remediation, control enhancements and entirely new controls. Every action carries an owner, a due date and the control it strengthens.',
    counts: { actions: open.length },
  });

  const options = (rows, selected, labelKey = 'name') =>
    rows.map((r) => `<option value="${esc(r.id)}"${String(r.id) === String(selected) ? ' selected' : ''}>${esc(r[labelKey])}</option>`).join('');

  const byStatus = ACTION_STATUSES.map((status) => ({
    label: humanise(status),
    value: all.filter((a) => a.status === status).length,
  })).filter((row) => row.value > 0);

  main.innerHTML = `
    <div class="stats">
      <div class="stat">
        <span class="stat__label">Open actions</span>
        <span class="stat__value">${open.length}</span>
        <span class="stat__meta">of ${all.length} raised in total</span>
      </div>
      <div class="stat">
        <span class="stat__label">Overdue</span>
        <span class="stat__value">${all.filter((a) => a.is_overdue).length}</span>
        <span class="stat__meta">past the agreed due date</span>
      </div>
      <div class="stat">
        <span class="stat__label">Blocked</span>
        <span class="stat__value">${all.filter((a) => a.status === 'blocked').length}</span>
        <span class="stat__meta">waiting on a dependency</span>
      </div>
      <div class="stat">
        <span class="stat__label">Completed</span>
        <span class="stat__value">${all.filter((a) => a.status === 'completed').length}</span>
        <span class="stat__meta">${Math.round((all.filter((a) => a.status === 'completed').length / all.length) * 100)}% of the book</span>
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <h2 class="card__title">Actions by status</h2>
        <span class="card__sub">All actions ever raised</span>
      </div>
      <div class="card__body">
        <div id="status-chart"></div>
        <div id="status-table"></div>
      </div>
    </div>

    <div class="filter-bar">
      <label class="field field--grow">
        <span class="field__label">Search</span>
        <input type="search" id="f-q" placeholder="Title or reference…" value="${esc(state.q)}" />
      </label>
      <label class="field">
        <span class="field__label">Status</span>
        <select id="f-status">
          <option value="">All statuses</option>
          ${ACTION_STATUSES.map((s) => `<option value="${s}"${state.status === s ? ' selected' : ''}>${humanise(s)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Priority</span>
        <select id="f-priority">
          <option value="">All priorities</option>
          ${PRIORITIES.map((p) => `<option value="${p}"${state.priority === p ? ' selected' : ''}>${humanise(p)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Type</span>
        <select id="f-type">
          <option value="">All types</option>
          ${['remediate', 'enhance_control', 'new_control', 'investigate', 'accept_risk']
            .map((t) => `<option value="${t}"${state.type === t ? ' selected' : ''}>${humanise(t)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Department</span>
        <select id="f-department"><option value="">All departments</option>${options(departments, state.department)}</select>
      </label>
      <label class="field">
        <span class="field__label">Owner</span>
        <select id="f-owner"><option value="">Anyone</option>${options(users, state.owner, 'full_name')}</select>
      </label>
      <label class="field">
        <span class="field__label">&nbsp;</span>
        <button class="btn" id="f-overdue" type="button" aria-pressed="${state.overdue === '1'}">
          ${state.overdue === '1' ? '✓ ' : ''}Overdue only
        </button>
      </label>
      <span class="filter-bar__result" id="result-count"></span>
    </div>

    <div class="card">
      <div class="card__body card__body--flush" id="table"></div>
    </div>`;

  barChart(document.getElementById('status-chart'), { rows: byStatus, labelWidth: 150 });
  document.getElementById('status-table').innerHTML = dataTableDetails(
    'Show the status figures', ['Status', 'Actions'], byStatus.map((r) => [r.label, r.value]),
  );

  const tableEl = document.getElementById('table');
  const countEl = document.getElementById('result-count');

  async function apply() {
    const rows = await listActions({
      search: state.q || undefined,
      status: state.status || undefined,
      priority: state.priority || undefined,
      actionType: state.type || undefined,
      departmentId: state.department || undefined,
      ownerId: state.owner || undefined,
      overdue: state.overdue === '1',
    });

    setQuery(state);
    countEl.textContent = `${rows.length} of ${all.length} actions`;

    renderTable(tableEl, {
      rows,
      sort: { key: 'due_date', dir: 'asc' },
      columns: [
        { key: 'reference', label: 'Ref', cell: (r) => `<span class="mono">${esc(r.reference)}</span>` },
        { key: 'title', label: 'Action', cell: (r) => `
            <span class="cell-title">${esc(r.title)}</span>
            <div class="cell-sub">${esc(humanise(r.action_type))}${r.control ? ` · <a href="/controls/?control=${esc(r.control.code)}">${esc(r.control.code)}</a>` : ''}</div>` },
        { key: 'incident', label: 'From incident', value: (r) => r.incident?.reference,
          cell: (r) => r.incident
            ? `<a class="mono" href="/incidents/detail.html?ref=${esc(r.incident.reference)}">${esc(r.incident.reference)}</a>
               <div class="cell-sub">${esc(r.incident.title.slice(0, 40))}${r.incident.title.length > 40 ? '…' : ''}</div>`
            : '<span class="muted">—</span>' },
        { key: 'owner', label: 'Owner', value: (r) => r.owner?.full_name,
          cell: (r) => `${esc(r.owner?.full_name ?? '—')}<div class="cell-sub">${esc(r.department?.name ?? '')}</div>` },
        { key: 'priority', label: 'Priority', value: (r) => ['low', 'medium', 'high', 'critical'].indexOf(r.priority), cell: (r) => badge('priority', r.priority) },
        { key: 'status', label: 'Status', cell: (r) => r.is_overdue ? overdueBadge() : badge('actionStatus', r.status) },
        { key: 'progress', label: 'Progress', className: 'num', value: (r) => r.progress_pct,
          cell: (r) => `<div class="row row--tight" style="justify-content:flex-end">
              <div class="meter" style="width:70px"><div class="meter__fill" style="width:${r.progress_pct}%"></div></div>
              <span class="cell-sub">${r.progress_pct}%</span></div>` },
        { key: 'due_date', label: 'Due', className: 'num nowrap',
          cell: (r) => `${esc(formatDate(r.due_date))}${r.is_open && r.days_to_due !== null ? `<div class="cell-sub">${esc(relativeDays(r.days_to_due))}</div>` : ''}` },
      ],
      empty: 'No actions match these filters.',
    });
  }

  const bind = (id, key, event = 'change') => {
    const node = document.getElementById(id);
    node.addEventListener(event, () => { state[key] = node.value; apply(); });
  };
  bind('f-q', 'q', 'input');
  bind('f-status', 'status');
  bind('f-priority', 'priority');
  bind('f-type', 'type');
  bind('f-department', 'department');
  bind('f-owner', 'owner');

  const overdueBtn = document.getElementById('f-overdue');
  overdueBtn.addEventListener('click', () => {
    state.overdue = state.overdue === '1' ? '' : '1';
    overdueBtn.setAttribute('aria-pressed', state.overdue === '1');
    overdueBtn.textContent = `${state.overdue === '1' ? '✓ ' : ''}Overdue only`;
    apply();
  });

  await apply();
} catch (error) {
  await mountShell({ active: 'actions', title: 'Actions' }).catch(() => {});
  showError(main, error);
}
