/**
 * Incident detail — the record that shows the relationships doing their work:
 * department, process and system on one side; failed controls and the actions
 * raised against them on the other.
 */

import { getIncident } from '../api.js';
import {
  mountShell, badge, esc, formatDate, formatDateTime, formatMoney, formatNumber,
  humanise, qs, showError,
} from '../ui.js';

const main = document.getElementById('main');

try {
  const incident = await getIncident(qs('ref') ?? qs('id'));

  if (!incident) {
    await mountShell({ active: 'incidents', title: 'Incident not found' });
    main.innerHTML = `
      <div class="card"><div class="card__body">
        <h2 class="card__title">No such incident</h2>
        <p class="prose-block">Nothing matches <code>${esc(qs('ref') ?? qs('id') ?? '')}</code>.
        <a href="/incidents/">Back to the register</a>.</p>
      </div></div>`;
  } else {
    await mountShell({
      active: 'incidents',
      eyebrow: `Incident ${incident.reference}`,
      title: incident.title,
      actions: '<a class="btn" href="/incidents/">← All incidents</a>',
    });

    const openActions = incident.actions.filter((a) => a.is_open);
    const relatedSystems = incident.systems.length
      ? incident.systems
      : (incident.system ? [{ ...incident.system, impact_type: 'source' }] : []);

    main.innerHTML = `
      <div class="row">
        ${badge('severity', incident.severity, { label: `${humanise(incident.severity)} severity` })}
        ${badge('incidentStatus', incident.status)}
        ${incident.regulatory_reportable ? '<span class="badge badge--warning"><span class="badge__dot" aria-hidden="true"></span>Regulatory reportable</span>' : ''}
        <span class="tag">Risk score ${incident.risk_score} (L${incident.likelihood} × I${incident.impact})</span>
        <span class="tag">${incident.status === 'closed' ? `Closed in ${incident.days_open} days` : `Open ${incident.days_open} days`}</span>
      </div>

      <div class="detail-grid">
        <div class="stack" style="gap:1.25rem">
          <div class="card">
            <div class="card__head"><h2 class="card__title">What happened</h2></div>
            <div class="card__body stack" style="gap:1rem">
              <p class="prose-block" style="margin:0">${esc(incident.description)}</p>
              <div>
                <h3 class="section__title">Root cause</h3>
                <p class="prose-block" style="margin:0.25rem 0 0">${esc(incident.root_cause ?? 'Under investigation.')}</p>
                <p class="small muted" style="margin:0.35rem 0 0">Categorised as ${esc(humanise(incident.root_cause_category))}.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__head">
              <h2 class="card__title">Remediation actions</h2>
              <span class="card__sub">${openActions.length} open of ${incident.actions.length}</span>
            </div>
            <div class="card__body">
              <div class="linked-list">
                ${incident.actions.length ? incident.actions.map((action) => `
                  <div class="linked-item">
                    <div class="linked-item__body">
                      <a class="cell-title" href="/actions/?ref=${esc(action.reference)}">${esc(action.title)}</a>
                      <div class="cell-sub">
                        ${esc(action.reference)} · ${esc(humanise(action.action_type))} ·
                        owner ${esc(action.owner?.full_name ?? '—')} · due ${esc(formatDate(action.due_date))}
                      </div>
                      ${action.control ? `<div class="cell-sub">Against control
                        <a href="/controls/?control=${esc(action.control.code)}">${esc(action.control.code)} ${esc(action.control.name)}</a></div>` : ''}
                      <div class="row row--tight" style="margin-top:0.4rem">
                        <div class="meter" style="width:120px"><div class="meter__fill" style="width:${action.progress_pct}%"></div></div>
                        <span class="cell-sub">${action.progress_pct}%</span>
                      </div>
                    </div>
                    <div class="stack" style="align-items:flex-end;flex:none">
                      ${badge('actionStatus', action.status)}
                      ${badge('priority', action.priority, { label: `${humanise(action.priority)} priority` })}
                    </div>
                  </div>`).join('') : '<p class="empty">No actions raised yet.</p>'}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__head">
              <h2 class="card__title">Controls in scope</h2>
              <span class="card__sub">How each performed</span>
            </div>
            <div class="card__body">
              <div class="linked-list">
                ${incident.controls.length ? incident.controls.map((control) => `
                  <div class="linked-item">
                    <div class="linked-item__body">
                      <a class="cell-title" href="/controls/?control=${esc(control.code)}">${esc(control.code)} — ${esc(control.name)}</a>
                      <div class="cell-sub">${esc(humanise(control.control_type))} · ${esc(humanise(control.automation))} · owner ${esc(control.owner?.full_name ?? '—')}</div>
                    </div>
                    <div class="stack" style="align-items:flex-end;flex:none">
                      ${badge('failureMode', control.failure_mode, { label: `Performance: ${humanise(control.failure_mode)}` })}
                      ${badge('effectiveness', control.effectiveness, { label: `Now: ${humanise(control.effectiveness)}` })}
                    </div>
                  </div>`).join('') : '<p class="empty">No controls linked to this incident.</p>'}
              </div>
            </div>
          </div>
        </div>

        <div class="stack" style="gap:1.25rem">
          <div class="card">
            <div class="card__head"><h2 class="card__title">Record</h2></div>
            <div class="card__body">
              <dl class="kv">
                <dt>Reference</dt><dd class="mono">${esc(incident.reference)}</dd>
                <dt>Category</dt><dd>${esc(incident.category?.name ?? '—')}${incident.category?.parent ? `<div class="cell-sub">${esc(incident.category.parent.name)}</div>` : ''}</dd>
                <dt>Department</dt><dd><a href="/incidents/?department=${incident.department_id}">${esc(incident.department?.name ?? '—')}</a></dd>
                <dt>Process</dt><dd>${esc(incident.process?.name ?? '—')}${incident.process ? `<div class="cell-sub">${esc(incident.process.code)} · ${esc(humanise(incident.process.frequency))}</div>` : ''}</dd>
                <dt>Owner</dt><dd>${esc(incident.owner?.full_name ?? '—')}<div class="cell-sub">${esc(incident.owner?.job_title ?? '')}</div></dd>
                <dt>Reported by</dt><dd>${esc(incident.reported_by?.full_name ?? '—')}</dd>
                <dt>Occurred</dt><dd>${esc(formatDate(incident.occurred_date))}</dd>
                <dt>Discovered</dt><dd>${esc(formatDate(incident.discovered_date))}</dd>
                <dt>Closed</dt><dd>${incident.closed_date ? esc(formatDate(incident.closed_date)) : '<span class="muted">Still open</span>'}</dd>
              </dl>
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h2 class="card__title">Impact</h2></div>
            <div class="card__body">
              <dl class="kv">
                <dt>Gross loss</dt><dd class="mono">${esc(formatMoney(incident.gross_loss, { compact: false }))}</dd>
                <dt>Recovered</dt><dd class="mono">${esc(formatMoney(incident.recovery_amount, { compact: false }))}</dd>
                <dt>Net loss</dt><dd class="mono"><strong>${esc(formatMoney(incident.net_loss, { compact: false }))}</strong></dd>
                <dt>Customers</dt><dd>${esc(formatNumber(incident.customers_affected))}</dd>
              </dl>
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h2 class="card__title">Systems touched</h2></div>
            <div class="card__body">
              <div class="linked-list">
                ${relatedSystems.length ? relatedSystems.map((system) => `
                  <div class="linked-item">
                    <div class="linked-item__body">
                      <a class="cell-title" href="/incidents/?system=${system.id}">${esc(system.name)}</a>
                      <div class="cell-sub">${esc(system.code)} · ${esc(system.vendor ?? '')}</div>
                    </div>
                    <div class="stack" style="align-items:flex-end;flex:none">
                      <span class="tag">${esc(humanise(system.impact_type))}</span>
                      ${badge('criticality', system.criticality, { label: `${humanise(system.criticality)} criticality` })}
                    </div>
                  </div>`).join('') : '<p class="empty">No systems recorded.</p>'}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h2 class="card__title">Timeline</h2></div>
            <div class="card__body">
              ${incident.updates.length ? `<div class="timeline">${incident.updates.map((update) => `
                <div class="timeline__item">
                  <span class="timeline__dot" aria-hidden="true"></span>
                  <div>
                    <div class="timeline__meta">${esc(formatDateTime(update.created_at))} · ${esc(update.user?.full_name ?? 'System')}</div>
                    <div class="timeline__note">${esc(update.note)}</div>
                    ${update.status_from && update.status_to !== update.status_from
                      ? `<div class="cell-sub">Status ${esc(humanise(update.status_from))} → ${esc(humanise(update.status_to))}</div>` : ''}
                  </div>
                </div>`).join('')}</div>` : '<p class="empty">No updates recorded.</p>'}
            </div>
          </div>
        </div>
      </div>`;
  }
} catch (error) {
  await mountShell({ active: 'incidents', title: 'Incident' }).catch(() => {});
  showError(main, error);
}
