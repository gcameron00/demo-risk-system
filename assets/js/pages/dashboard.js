/** Dashboard — the "how are we doing?" view. */

import { getSummary, listIncidents, listActions } from '../api.js';
import {
  mountShell, badge, esc, formatDate, formatMoney, formatNumber, humanise,
  dataTableDetails, renderTable, showError, overdueBadge,
} from '../ui.js';
import { lineChart, barChart, heatmap, statusMeter } from '../charts.js';

const main = document.getElementById('main');

try {
  const [summary, incidents, actions] = await Promise.all([
    getSummary(),
    listIncidents({ openOnly: true }),
    listActions({ openOnly: true }),
  ]);

  await mountShell({
    active: 'dashboard',
    eyebrow: 'Operational risk',
    title: 'Dashboard',
    sub: `Position as at ${formatDate(summary.today)}. Figures cover the trailing twelve months unless stated.`,
    counts: {
      incidents: summary.counts.openIncidents,
      actions: summary.counts.openActions,
      controls: summary.counts.controls,
    },
  });

  const { counts, loss } = summary;

  main.innerHTML = `
    <div class="banner">
      <span class="banner__glyph" aria-hidden="true">ℹ️</span>
      <span>
        Demonstration data. Meridian Financial Group, its people and every incident below are fictional —
        the dataset exists to show what a risk register looks like when an assistant can query it over MCP.
        <a href="/about/">How this demo works</a>.
      </span>
    </div>

    <section class="section">
      <h2 class="section__title">Position</h2>
      <div class="stats">
        <div class="stat">
          <span class="stat__label">Open incidents</span>
          <span class="stat__value stat__value--hero">${counts.openIncidents}</span>
          <span class="stat__meta">${counts.criticalOpen} critical · ${counts.highOpen} high · ${counts.reportableOpen} reportable</span>
        </div>
        <div class="stat">
          <span class="stat__label">Net loss, 12 months</span>
          <span class="stat__value">${formatMoney(loss.net12m)}</span>
          <span class="stat__meta">${formatMoney(loss.gross12m)} gross, ${formatMoney(loss.recovered12m)} recovered</span>
        </div>
        <div class="stat">
          <span class="stat__label">Overdue actions</span>
          <span class="stat__value">${counts.overdueActions}</span>
          <span class="stat__meta">of ${counts.openActions} open · ${counts.blockedActions} blocked · ${counts.dueSoonActions} due in 30 days</span>
        </div>
        <div class="stat">
          <span class="stat__label">Ineffective controls</span>
          <span class="stat__value">${counts.ineffectiveControls}</span>
          <span class="stat__meta">of ${counts.controls} in the register · ${counts.controlsDueForTest} due for testing</span>
        </div>
        <div class="stat">
          <span class="stat__label">Customers affected</span>
          <span class="stat__value">${formatNumber(loss.customersAffected12m)}</span>
          <span class="stat__meta">across all incidents in the last 12 months</span>
        </div>
      </div>
    </section>

    <div class="grid grid--wide-left">
      <div class="card">
        <div class="card__head">
          <h2 class="card__title">Incidents raised by month</h2>
          <span class="card__sub">Last 12 months</span>
        </div>
        <div class="card__body">
          <div id="trend"></div>
          <div id="trend-table"></div>
        </div>
      </div>

      <div class="card">
        <div class="card__head">
          <h2 class="card__title">Risk heat map</h2>
          <span class="card__sub">
            <label class="sr-only" for="heat-scope">Heat map population</label>
            <select id="heat-scope">
              <option value="open">Open incidents</option>
              <option value="all">All, last 12 months</option>
            </select>
          </span>
        </div>
        <div class="card__body">
          <div id="heat"></div>
          <p class="small muted" style="margin:0.75rem 0 0">
            Select a cell to open the matching incidents. Colour shows how many incidents sit in each
            likelihood × impact pairing; the count is printed in the cell.
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid--2">
      <div class="card">
        <div class="card__head">
          <h2 class="card__title">Incidents by risk category</h2>
          <span class="card__sub">All recorded incidents</span>
        </div>
        <div class="card__body">
          <div id="by-category"></div>
          <div id="by-category-table"></div>
        </div>
      </div>

      <div class="card">
        <div class="card__head">
          <h2 class="card__title">Control effectiveness</h2>
          <span class="card__sub">${counts.controls} controls</span>
        </div>
        <div class="card__body">
          <div id="control-health"></div>
          <h3 class="section__title" style="margin-top:1.5rem">Controls that failed in an incident</h3>
          <div class="linked-list" id="weak-controls"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <h2 class="card__title">Open incidents needing attention</h2>
        <span class="card__sub"><a href="/incidents/?open=1">View the full register →</a></span>
      </div>
      <div class="card__body card__body--flush" id="open-incidents"></div>
    </div>

    <div class="grid grid--2">
      <div class="card">
        <div class="card__head">
          <h2 class="card__title">Actions at risk</h2>
          <span class="card__sub"><a href="/actions/?overdue=1">All overdue →</a></span>
        </div>
        <div class="card__body card__body--flush" id="risk-actions"></div>
      </div>

      <div class="card">
        <div class="card__head">
          <h2 class="card__title">Exposure by department</h2>
          <span class="card__sub">Net loss, all incidents</span>
        </div>
        <div class="card__body card__body--flush" id="dept-table"></div>
      </div>
    </div>`;

  /* --- Trend ------------------------------------------------------------- */

  lineChart(document.getElementById('trend'), {
    points: summary.byMonth,
    format: (v) => `${v} incident${v === 1 ? '' : 's'}`,
    yLabel: 'Incidents',
    tipRows: (p) => `
      <div class="viz-tooltip__row">${p.value} incident${p.value === 1 ? '' : 's'}, ${p.significant} high or critical</div>
      <div class="viz-tooltip__row">${formatMoney(p.netLoss)} net loss</div>`,
  });
  document.getElementById('trend-table').innerHTML = dataTableDetails(
    'Show the monthly figures',
    ['Month', 'Incidents', 'High or critical', 'Net loss'],
    summary.byMonth.map((m) => [m.label, m.value, m.significant, formatMoney(m.netLoss, { compact: false })]),
  );

  /* --- Heat map ---------------------------------------------------------- */

  const heatEl = document.getElementById('heat');
  const drawHeat = (scope) => {
    heatmap(heatEl, {
      cells: summary.heatmap[scope],
      onSelect: (cell) => {
        const params = new URLSearchParams({ likelihood: cell.likelihood, impact: cell.impact });
        if (scope === 'open') params.set('open', '1');
        location.href = `/incidents/?${params}`;
      },
    });
  };
  drawHeat('open');
  document.getElementById('heat-scope').addEventListener('change', (event) => drawHeat(event.target.value));

  /* --- Category breakdown ------------------------------------------------ */

  barChart(document.getElementById('by-category'), {
    rows: summary.byCategory.map((row) => ({ ...row, href: null })),
    format: (v) => String(v),
  });
  document.getElementById('by-category-table').innerHTML = dataTableDetails(
    'Show the category figures',
    ['Risk category', 'Incidents'],
    summary.byCategory.map((row) => [row.label, row.value]),
  );

  /* --- Control health ---------------------------------------------------- */

  const TONE = { effective: 'good', partially_effective: 'warning', ineffective: 'critical', not_tested: 'neutral' };
  statusMeter(document.getElementById('control-health'), {
    segments: ['effective', 'partially_effective', 'ineffective', 'not_tested'].map((key) => ({
      label: humanise(key),
      tone: TONE[key],
      value: summary.controlEffectiveness.find((c) => c.label === key)?.value ?? 0,
    })),
  });

  document.getElementById('weak-controls').innerHTML = summary.weakestControls.slice(0, 6).map((control) => `
    <div class="linked-item">
      <div class="linked-item__body">
        <a href="/controls/?control=${esc(control.code)}" class="cell-title">${esc(control.code)} — ${esc(control.name)}</a>
        <div class="cell-sub">${esc(control.department?.name ?? '')} · owner ${esc(control.owner?.full_name ?? '—')}</div>
      </div>
      <div class="stack" style="align-items:flex-end;flex:none">
        ${badge('effectiveness', control.effectiveness)}
        <span class="cell-sub">${control.failedCount} failure${control.failedCount === 1 ? '' : 's'} · ${control.openActionCount} open action${control.openActionCount === 1 ? '' : 's'}</span>
      </div>
    </div>`).join('') || '<p class="empty">No control failures recorded.</p>';

  /* --- Attention tables -------------------------------------------------- */

  renderTable(document.getElementById('open-incidents'), {
    rows: [...incidents].sort((a, b) => b.risk_score - a.risk_score || b.net_loss - a.net_loss),
    rowHref: (row) => `/incidents/detail.html?ref=${row.reference}`,
    sort: { key: 'risk', dir: 'desc' },
    columns: [
      { key: 'reference', label: 'Reference', cell: (r) => `<a class="mono" href="/incidents/detail.html?ref=${esc(r.reference)}">${esc(r.reference)}</a>` },
      { key: 'title', label: 'Incident', cell: (r) => `<span class="cell-title">${esc(r.title)}</span><div class="cell-sub">${esc(r.department?.name ?? '')} · ${esc(r.system?.name ?? '—')}</div>` },
      { key: 'severity', label: 'Severity', value: (r) => ['low', 'medium', 'high', 'critical'].indexOf(r.severity), cell: (r) => badge('severity', r.severity) },
      { key: 'status', label: 'Status', cell: (r) => badge('incidentStatus', r.status) },
      { key: 'risk', label: 'Risk score', className: 'num', value: (r) => r.risk_score, cell: (r) => `${r.risk_score}<div class="cell-sub">L${r.likelihood} × I${r.impact}</div>` },
      { key: 'net_loss', label: 'Net loss', className: 'num', value: (r) => r.net_loss, cell: (r) => formatMoney(r.net_loss) },
      { key: 'actions', label: 'Open actions', className: 'num', value: (r) => r.actions.filter((a) => a.is_open).length, cell: (r) => r.actions.filter((a) => a.is_open).length },
      { key: 'age', label: 'Age', className: 'num', value: (r) => r.days_open, cell: (r) => `${r.days_open} days` },
    ],
    empty: 'No open incidents.',
  });

  renderTable(document.getElementById('risk-actions'), {
    rows: actions.filter((a) => a.is_overdue || a.status === 'blocked' || (a.days_to_due ?? 99) <= 21),
    rowHref: (row) => `/actions/?ref=${row.reference}`,
    sort: { key: 'due_date', dir: 'asc' },
    columns: [
      { key: 'title', label: 'Action', cell: (r) => `<span class="cell-title">${esc(r.title)}</span><div class="cell-sub">${esc(r.reference)} · ${esc(r.owner?.full_name ?? '—')}</div>` },
      { key: 'status', label: 'Status', cell: (r) => r.is_overdue ? overdueBadge() : badge('actionStatus', r.status) },
      { key: 'due_date', label: 'Due', className: 'num nowrap', cell: (r) => formatDate(r.due_date) },
    ],
    empty: 'Nothing overdue or blocked.',
  });

  renderTable(document.getElementById('dept-table'), {
    rows: summary.departmentExposure,
    sort: { key: 'netLoss', dir: 'desc' },
    columns: [
      { key: 'name', label: 'Department', cell: (r) => `<a href="/incidents/?department=${r.id}">${esc(r.name)}</a>` },
      { key: 'incidents', label: 'Incidents', className: 'num', cell: (r) => r.incidents },
      { key: 'significant', label: 'High+', className: 'num', cell: (r) => r.significant },
      { key: 'openActions', label: 'Open actions', className: 'num', cell: (r) => r.openActions },
      { key: 'netLoss', label: 'Net loss', className: 'num', cell: (r) => formatMoney(r.netLoss) },
    ],
  });
} catch (error) {
  await mountShell({ active: 'dashboard', title: 'Dashboard' }).catch(() => {});
  showError(main, error);
}
