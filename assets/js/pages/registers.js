/**
 * Reference registers — departments, systems, processes and people.
 *
 * These are the dimensions everything else hangs off, so each row shows its own
 * incident and control counts rather than just its attributes.
 */

import {
  listDepartments, listSystems, listProcesses, listUsers,
  listIncidents, listControls, listActions,
} from '../api.js';
import { mountShell, badge, esc, humanise, qs, setQuery, renderTable, showError } from '../ui.js';

const main = document.getElementById('main');

const TABS = [
  { key: 'departments', label: 'Departments' },
  { key: 'systems', label: 'Systems' },
  { key: 'processes', label: 'Processes' },
  { key: 'people', label: 'People' },
];

try {
  const [departments, systems, processes, users, incidents, controls, actions] = await Promise.all([
    listDepartments(), listSystems(), listProcesses(), listUsers(),
    listIncidents(), listControls(), listActions(),
  ]);

  await mountShell({
    active: 'registers',
    eyebrow: 'Reference data',
    title: 'Registers',
    sub: 'Departments, systems, processes and people. Everything in the incident, control and action registers points back at these rows.',
  });

  let tab = TABS.some((t) => t.key === qs('tab')) ? qs('tab') : 'departments';

  main.innerHTML = `
    <div class="tabs" role="tablist">
      ${TABS.map((t) => `
        <button class="tab" role="tab" data-tab="${t.key}" aria-selected="${t.key === tab}">${t.label}</button>`).join('')}
    </div>
    <div class="card"><div class="card__body card__body--flush" id="table"></div></div>
    <p class="small muted" id="hint"></p>`;

  const tableEl = document.getElementById('table');
  const hintEl = document.getElementById('hint');

  const countIncidents = (predicate) => incidents.filter(predicate).length;
  const openIncidents = (predicate) => incidents.filter((i) => i.is_open && predicate(i)).length;

  const VIEWS = {
    departments: () => ({
      hint: 'Counts cover every incident and action recorded against the department.',
      config: {
        rows: departments,
        sort: { key: 'code', dir: 'asc' },
        columns: [
          { key: 'code', label: 'Code', cell: (r) => `<span class="mono">${esc(r.code)}</span>` },
          { key: 'name', label: 'Department', cell: (r) => `
              <a class="cell-title" href="/incidents/?department=${r.id}">${esc(r.name)}</a>
              ${r.parent ? `<div class="cell-sub">Part of ${esc(r.parent.name)}</div>` : ''}` },
          { key: 'head', label: 'Head', value: (r) => r.head?.full_name, cell: (r) => esc(r.head?.full_name ?? '—') },
          { key: 'location', label: 'Location', cell: (r) => esc(r.location ?? '—') },
          { key: 'people', label: 'People', className: 'num',
            value: (r) => users.filter((u) => u.department_id === r.id).length,
            cell: (r) => users.filter((u) => u.department_id === r.id).length },
          { key: 'incidents', label: 'Incidents', className: 'num',
            value: (r) => countIncidents((i) => i.department_id === r.id),
            cell: (r) => `${countIncidents((i) => i.department_id === r.id)}<div class="cell-sub">${openIncidents((i) => i.department_id === r.id)} open</div>` },
          { key: 'controls', label: 'Controls', className: 'num',
            value: (r) => controls.filter((c) => c.department_id === r.id).length,
            cell: (r) => controls.filter((c) => c.department_id === r.id).length },
          { key: 'actions', label: 'Open actions', className: 'num',
            value: (r) => actions.filter((a) => a.department_id === r.id && a.is_open).length,
            cell: (r) => actions.filter((a) => a.department_id === r.id && a.is_open).length },
        ],
      },
    }),

    systems: () => ({
      hint: 'A system is counted when it is the primary system on an incident or listed among the systems touched.',
      config: {
        rows: systems,
        sort: { key: 'code', dir: 'asc' },
        columns: [
          { key: 'code', label: 'Code', cell: (r) => `<span class="mono">${esc(r.code)}</span>` },
          { key: 'name', label: 'System', cell: (r) => `
              <a class="cell-title" href="/incidents/?system=${r.id}">${esc(r.name)}</a>
              <div class="cell-sub">${esc(r.description ?? '')}</div>` },
          { key: 'vendor', label: 'Vendor', cell: (r) => esc(r.vendor ?? '—') },
          { key: 'hosting', label: 'Hosting', cell: (r) => `<span class="tag">${esc(humanise(r.hosting))}</span>` },
          { key: 'criticality', label: 'Criticality',
            value: (r) => ['low', 'medium', 'high', 'critical'].indexOf(r.criticality),
            cell: (r) => badge('criticality', r.criticality) },
          { key: 'owner', label: 'Owner', value: (r) => r.owner?.full_name, cell: (r) => esc(r.owner?.full_name ?? '—') },
          { key: 'incidents', label: 'Incidents', className: 'num',
            value: (r) => countIncidents((i) => i.primary_system_id === r.id || i.systems.some((s) => s.id === r.id)),
            cell: (r) => countIncidents((i) => i.primary_system_id === r.id || i.systems.some((s) => s.id === r.id)) },
          { key: 'controls', label: 'Controls', className: 'num',
            value: (r) => controls.filter((c) => c.system_id === r.id).length,
            cell: (r) => controls.filter((c) => c.system_id === r.id).length },
        ],
      },
    }),

    processes: () => ({
      hint: 'Control coverage counts the controls mapped to the process through control_processes.',
      config: {
        rows: processes,
        sort: { key: 'code', dir: 'asc' },
        columns: [
          { key: 'code', label: 'Code', cell: (r) => `<span class="mono">${esc(r.code)}</span>` },
          { key: 'name', label: 'Process', cell: (r) => `
              <span class="cell-title">${esc(r.name)}</span>
              <div class="cell-sub">${esc(r.description ?? '')}</div>` },
          { key: 'department', label: 'Department', value: (r) => r.department?.name, cell: (r) => esc(r.department?.name ?? '—') },
          { key: 'owner', label: 'Owner', value: (r) => r.owner?.full_name, cell: (r) => esc(r.owner?.full_name ?? '—') },
          { key: 'frequency', label: 'Runs', cell: (r) => `<span class="tag">${esc(humanise(r.frequency))}</span>` },
          { key: 'criticality', label: 'Criticality',
            value: (r) => ['low', 'medium', 'high', 'critical'].indexOf(r.criticality),
            cell: (r) => badge('criticality', r.criticality) },
          { key: 'controls', label: 'Controls', className: 'num',
            value: (r) => r.controls.length, cell: (r) => r.controls.length },
          { key: 'incidents', label: 'Incidents', className: 'num',
            value: (r) => countIncidents((i) => i.process_id === r.id),
            cell: (r) => countIncidents((i) => i.process_id === r.id) },
        ],
      },
    }),

    people: () => ({
      hint: 'Ownership counts show where accountability actually sits across the register.',
      config: {
        rows: users,
        sort: { key: 'full_name', dir: 'asc' },
        columns: [
          { key: 'full_name', label: 'Name', cell: (r) => `
              <span class="cell-title">${esc(r.full_name)}</span>
              <div class="cell-sub">${esc(r.email)}</div>` },
          { key: 'job_title', label: 'Job title', cell: (r) => esc(r.job_title ?? '—') },
          { key: 'department', label: 'Department', value: (r) => r.department?.name, cell: (r) => esc(r.department?.name ?? '—') },
          { key: 'role', label: 'System role', cell: (r) => `<span class="tag">${esc(humanise(r.role))}</span>` },
          { key: 'manager', label: 'Reports to', value: (r) => r.manager?.full_name, cell: (r) => esc(r.manager?.full_name ?? '—') },
          { key: 'incidents', label: 'Incidents owned', className: 'num',
            value: (r) => countIncidents((i) => i.owner_user_id === r.id),
            cell: (r) => `<a href="/incidents/?owner=${r.id}">${countIncidents((i) => i.owner_user_id === r.id)}</a>` },
          { key: 'actions', label: 'Open actions', className: 'num',
            value: (r) => actions.filter((a) => a.owner_user_id === r.id && a.is_open).length,
            cell: (r) => `<a href="/actions/?owner=${r.id}">${actions.filter((a) => a.owner_user_id === r.id && a.is_open).length}</a>` },
          { key: 'controls', label: 'Controls owned', className: 'num',
            value: (r) => controls.filter((c) => c.owner_user_id === r.id).length,
            cell: (r) => controls.filter((c) => c.owner_user_id === r.id).length },
        ],
      },
    }),
  };

  function draw() {
    const view = VIEWS[tab]();
    hintEl.textContent = view.hint;
    renderTable(tableEl, view.config);
    setQuery({ tab });
    main.querySelectorAll('.tab').forEach((button) => {
      button.setAttribute('aria-selected', button.dataset.tab === tab);
    });
  }

  main.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => { tab = button.dataset.tab; draw(); });
  });

  draw();
} catch (error) {
  await mountShell({ active: 'registers', title: 'Registers' }).catch(() => {});
  showError(main, error);
}
