/**
 * Control library. Selecting a control opens an inline record showing what it
 * covers, which incidents it failed to stop, and what is being done about it.
 */

import { listControls, listDepartments, getControl } from '../api.js';
import {
  mountShell, badge, esc, formatDate, humanise, qs, setQuery,
  renderTable, showError, EFFECTIVENESS,
} from '../ui.js';
import { statusMeter } from '../charts.js';

const main = document.getElementById('main');

try {
  const [all, departments] = await Promise.all([listControls(), listDepartments()]);

  const state = {
    q: qs('q', ''),
    effectiveness: qs('effectiveness', ''),
    type: qs('type', ''),
    department: qs('department', ''),
    control: qs('control', ''),
  };

  await mountShell({
    active: 'controls',
    eyebrow: 'Library',
    title: 'Controls',
    sub: 'The mitigations already in place. Effectiveness comes from testing; the failure count comes from the incidents each control was in scope for.',
    counts: { controls: all.length },
  });

  const options = (rows, selected) =>
    rows.map((r) => `<option value="${esc(r.id)}"${String(r.id) === String(selected) ? ' selected' : ''}>${esc(r.name)}</option>`).join('');

  main.innerHTML = `
    <div class="card">
      <div class="card__head">
        <h2 class="card__title">Effectiveness of the control population</h2>
        <span class="card__sub">${all.length} active controls</span>
      </div>
      <div class="card__body"><div id="health"></div></div>
    </div>

    <div id="detail"></div>

    <div class="filter-bar">
      <label class="field field--grow">
        <span class="field__label">Search</span>
        <input type="search" id="f-q" placeholder="Name, code or description…" value="${esc(state.q)}" />
      </label>
      <label class="field">
        <span class="field__label">Effectiveness</span>
        <select id="f-effectiveness">
          <option value="">Any rating</option>
          ${EFFECTIVENESS.map((e) => `<option value="${e}"${state.effectiveness === e ? ' selected' : ''}>${humanise(e)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Type</span>
        <select id="f-type">
          <option value="">All types</option>
          ${['preventive', 'detective', 'corrective', 'directive']
            .map((t) => `<option value="${t}"${state.type === t ? ' selected' : ''}>${humanise(t)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Department</span>
        <select id="f-department"><option value="">All departments</option>${options(departments, state.department)}</select>
      </label>
      <span class="filter-bar__result" id="result-count"></span>
    </div>

    <div class="card">
      <div class="card__body card__body--flush" id="table"></div>
    </div>`;

  const TONE = { effective: 'good', partially_effective: 'warning', ineffective: 'critical', not_tested: 'neutral' };
  statusMeter(document.getElementById('health'), {
    segments: EFFECTIVENESS.map((key) => ({
      label: humanise(key),
      tone: TONE[key],
      value: all.filter((c) => c.effectiveness === key).length,
    })),
  });

  const detailEl = document.getElementById('detail');
  const tableEl = document.getElementById('table');
  const countEl = document.getElementById('result-count');

  async function drawDetail() {
    if (!state.control) { detailEl.innerHTML = ''; return; }
    const control = await getControl(state.control);
    if (!control) { detailEl.innerHTML = ''; return; }

    const failures = control.incidents.filter((i) => i.failure_mode === 'failed' || i.failure_mode === 'partially_effective');

    detailEl.innerHTML = `
      <div class="card">
        <div class="card__head">
          <h2 class="card__title">${esc(control.code)} — ${esc(control.name)}</h2>
          <span class="card__sub"><a href="/controls/">Close record ✕</a></span>
        </div>
        <div class="card__body">
          <p class="prose-block" style="margin:0 0 1rem">${esc(control.description)}</p>
          <div class="row" style="margin-bottom:1.25rem">
            ${badge('effectiveness', control.effectiveness, { label: `Operating: ${humanise(control.effectiveness)}` })}
            ${badge('design', control.design_rating, { label: `Design: ${humanise(control.design_rating)}` })}
            <span class="tag">${esc(humanise(control.control_type))}</span>
            <span class="tag">${esc(humanise(control.automation))}</span>
            <span class="tag">Runs ${esc(humanise(control.frequency))}</span>
          </div>
          <div class="grid grid--3">
            <div>
              <h3 class="section__title">Ownership</h3>
              <dl class="kv" style="margin-top:0.5rem">
                <dt>Owner</dt><dd>${esc(control.owner?.full_name ?? '—')}</dd>
                <dt>Department</dt><dd>${esc(control.department?.name ?? '—')}</dd>
                <dt>System</dt><dd>${esc(control.system?.name ?? 'Not system-specific')}</dd>
                <dt>Last tested</dt><dd>${esc(formatDate(control.last_tested_date))}</dd>
                <dt>Next test</dt><dd>${esc(formatDate(control.next_test_date))}</dd>
              </dl>
            </div>
            <div>
              <h3 class="section__title">Processes covered</h3>
              <div class="stack" style="margin-top:0.5rem">
                ${control.processes.length
                  ? control.processes.map((p) => `<span>${esc(p.name)} <span class="cell-sub">${esc(p.code)}</span></span>`).join('')
                  : '<span class="muted">None mapped.</span>'}
              </div>
              <h3 class="section__title" style="margin-top:1rem">Open actions</h3>
              <div class="stack" style="margin-top:0.5rem">
                ${control.actions.filter((a) => a.is_open).length
                  ? control.actions.filter((a) => a.is_open).map((a) =>
                      `<a href="/actions/?ref=${esc(a.reference)}">${esc(a.reference)} — ${esc(a.title)}</a>`).join('')
                  : '<span class="muted">None outstanding.</span>'}
              </div>
            </div>
            <div>
              <h3 class="section__title">Incidents it did not prevent</h3>
              <div class="stack" style="margin-top:0.5rem">
                ${failures.length
                  ? failures.map((i) => `
                      <div>
                        <a href="/incidents/detail.html?ref=${esc(i.reference)}">${esc(i.reference)} — ${esc(i.title)}</a>
                        <div class="cell-sub">${esc(formatDate(i.occurred_date))} · ${esc(humanise(i.failure_mode))}</div>
                      </div>`).join('')
                  : '<span class="muted">No failures recorded.</span>'}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function apply() {
    const rows = await listControls({
      search: state.q || undefined,
      effectiveness: state.effectiveness || undefined,
      controlType: state.type || undefined,
      departmentId: state.department || undefined,
    });

    setQuery(state);
    countEl.textContent = `${rows.length} of ${all.length} controls`;

    renderTable(tableEl, {
      rows,
      rowHref: (row) => `/controls/?control=${row.code}`,
      sort: { key: 'code', dir: 'asc' },
      columns: [
        { key: 'code', label: 'Code', cell: (r) => `<a class="mono" href="/controls/?control=${esc(r.code)}">${esc(r.code)}</a>` },
        { key: 'name', label: 'Control', cell: (r) => `
            <span class="cell-title">${esc(r.name)}</span>
            <div class="cell-sub">${esc(humanise(r.control_type))} · ${esc(humanise(r.automation))} · ${esc(humanise(r.frequency))}</div>` },
        { key: 'owner', label: 'Owner', value: (r) => r.owner?.full_name,
          cell: (r) => `${esc(r.owner?.full_name ?? '—')}<div class="cell-sub">${esc(r.department?.name ?? '')}</div>` },
        { key: 'system', label: 'System', value: (r) => r.system?.name ?? '', cell: (r) => esc(r.system?.name ?? '—') },
        { key: 'coverage', label: 'Processes', className: 'num', value: (r) => r.processes.length, cell: (r) => r.processes.length },
        { key: 'effectiveness', label: 'Effectiveness',
          value: (r) => EFFECTIVENESS.indexOf(r.effectiveness), cell: (r) => badge('effectiveness', r.effectiveness) },
        { key: 'failures', label: 'Failures', className: 'num',
          value: (r) => r.incidents.filter((i) => i.failure_mode === 'failed').length,
          cell: (r) => {
            const failed = r.incidents.filter((i) => i.failure_mode === 'failed').length;
            return failed ? `<strong>${failed}</strong>` : '<span class="muted">0</span>';
          } },
        { key: 'open_actions', label: 'Open actions', className: 'num',
          value: (r) => r.actions.filter((a) => a.is_open).length,
          cell: (r) => r.actions.filter((a) => a.is_open).length },
        { key: 'next_test_date', label: 'Next test', className: 'num nowrap', cell: (r) => formatDate(r.next_test_date) },
      ],
      empty: 'No controls match these filters.',
    });
  }

  const bind = (id, key, event = 'change') => {
    const node = document.getElementById(id);
    node.addEventListener(event, () => { state[key] = node.value; apply(); });
  };
  bind('f-q', 'q', 'input');
  bind('f-effectiveness', 'effectiveness');
  bind('f-type', 'type');
  bind('f-department', 'department');

  await drawDetail();
  await apply();
} catch (error) {
  await mountShell({ active: 'controls', title: 'Controls' }).catch(() => {});
  showError(main, error);
}
