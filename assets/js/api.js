/**
 * Data access layer.
 *
 * Every page talks to the database through this module and nothing else. Today
 * it reads a bundled JSON fixture; when the Worker gains a `/api/*` route over
 * D1, only the private `load()` and the query bodies below change — no page
 * script needs to know. The function names and their filter arguments
 * deliberately mirror the MCP tool surface described in docs/mcp-server.md, so
 * "what the chat assistant can ask for" and "what the UI can show" stay the
 * same shape.
 */

const SOURCE = '/assets/data/demo.json';

/**
 * Set `window.MERIDIAN_API_BASE` (e.g. to the deployed risk-mcp Worker's
 * origin) to read from D1 instead of the bundled fixture. Unset, behaviour
 * is exactly what ships today. See worker/README.md.
 */
const API_BASE = typeof window !== 'undefined' ? window.MERIDIAN_API_BASE : null;

let cache = null;

async function load() {
  if (cache) return cache;
  const source = API_BASE ? `${API_BASE}/api/export` : SOURCE;
  const res = await fetch(source, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Could not load demo data (${res.status})`);
  cache = index(await res.json());
  return cache;
}

/** Denormalise once, so pages can read `incident.department.name` directly. */
function index(raw) {
  const byId = (rows) => new Map(rows.map((r) => [r.id, r]));

  const departments = raw.departments.map((d) => ({ ...d }));
  const users = raw.users.map((u) => ({ ...u }));
  const systems = raw.systems.map((s) => ({ ...s }));
  const processes = raw.processes.map((p) => ({ ...p }));
  const categories = raw.risk_categories.map((c) => ({ ...c }));
  const controls = raw.controls.map((c) => ({ ...c }));
  const incidents = raw.incidents.map((i) => ({ ...i }));
  const actions = raw.actions.map((a) => ({ ...a }));

  const deptMap = byId(departments);
  const userMap = byId(users);
  const sysMap = byId(systems);
  const procMap = byId(processes);
  const catMap = byId(categories);
  const ctlMap = byId(controls);
  const incMap = byId(incidents);

  for (const d of departments) {
    d.parent = deptMap.get(d.parent_department_id) ?? null;
    d.head = userMap.get(d.head_user_id) ?? null;
  }
  for (const u of users) {
    u.department = deptMap.get(u.department_id) ?? null;
    u.manager = userMap.get(u.manager_id) ?? null;
  }
  for (const s of systems) s.owner = userMap.get(s.owner_user_id) ?? null;
  for (const p of processes) {
    p.department = deptMap.get(p.department_id) ?? null;
    p.owner = userMap.get(p.owner_user_id) ?? null;
  }
  for (const c of categories) c.parent = catMap.get(c.parent_id) ?? null;

  for (const c of controls) {
    c.owner = userMap.get(c.owner_user_id) ?? null;
    c.department = deptMap.get(c.department_id) ?? null;
    c.system = sysMap.get(c.system_id) ?? null;
    c.processes = [];
    c.incidents = [];
    c.actions = [];
  }

  for (const p of processes) p.controls = [];
  for (const cp of raw.control_processes) {
    const control = ctlMap.get(cp.control_id);
    const process = procMap.get(cp.process_id);
    if (!control || !process) continue;
    control.processes.push(process);
    process.controls.push(control);
  }

  const today = raw.meta.as_of;

  for (const i of incidents) {
    i.department = deptMap.get(i.department_id) ?? null;
    i.process = procMap.get(i.process_id) ?? null;
    i.system = sysMap.get(i.primary_system_id) ?? null;
    i.category = catMap.get(i.category_id) ?? null;
    i.owner = userMap.get(i.owner_user_id) ?? null;
    i.reported_by = userMap.get(i.reported_by_user_id) ?? null;
    i.risk_score = (i.likelihood ?? 0) * (i.impact ?? 0);
    i.is_open = i.status !== 'closed';
    i.days_open = daysBetween(i.occurred_date, i.closed_date ?? today);
    i.controls = [];
    i.systems = [];
    i.actions = [];
    i.updates = [];
  }

  for (const link of raw.incident_controls) {
    const incident = incMap.get(link.incident_id);
    const control = ctlMap.get(link.control_id);
    if (!incident || !control) continue;
    incident.controls.push({ ...control, failure_mode: link.failure_mode });
    control.incidents.push({ ...incident, failure_mode: link.failure_mode });
  }

  for (const link of raw.incident_systems) {
    const incident = incMap.get(link.incident_id);
    const system = sysMap.get(link.system_id);
    if (!incident || !system) continue;
    incident.systems.push({ ...system, impact_type: link.impact_type });
  }

  for (const a of actions) {
    a.incident = incMap.get(a.incident_id) ?? null;
    a.control = ctlMap.get(a.control_id) ?? null;
    a.owner = userMap.get(a.owner_user_id) ?? null;
    a.department = deptMap.get(a.department_id) ?? null;
    a.is_open = a.status !== 'completed' && a.status !== 'cancelled';
    a.is_overdue = Boolean(a.is_open && a.due_date && a.due_date < today);
    a.days_to_due = a.due_date ? daysBetween(today, a.due_date) : null;
    if (a.incident) a.incident.actions.push(a);
    if (a.control) a.control.actions.push(a);
  }

  const updates = raw.incident_updates
    .map((u) => ({ ...u, user: userMap.get(u.user_id) ?? null }))
    .sort((x, y) => y.created_at.localeCompare(x.created_at));
  for (const u of updates) incMap.get(u.incident_id)?.updates.push(u);

  incidents.sort((a, b) => b.occurred_date.localeCompare(a.occurred_date));
  actions.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));

  return {
    meta: raw.meta,
    today,
    departments, users, systems, processes, categories, controls, incidents, actions, updates,
    maps: { deptMap, userMap, sysMap, procMap, catMap, ctlMap, incMap },
  };
}

function daysBetween(from, to) {
  if (!from || !to) return null;
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

const matches = (haystack, needle) =>
  !needle || String(haystack ?? '').toLowerCase().includes(needle.toLowerCase());

/* -------------------------------------------------------------------------- */
/* Query surface                                                              */
/* -------------------------------------------------------------------------- */

export async function getMeta() {
  const db = await load();
  return { ...db.meta, today: db.today };
}

/** `list_incidents` — the workhorse filter, shared by the register and search. */
export async function listIncidents(filters = {}) {
  const db = await load();
  const { status, severity, departmentId, systemId, processId, categoryId, ownerId,
          openOnly, from, to, search } = filters;

  return db.incidents.filter((i) => {
    if (status && i.status !== status) return false;
    if (severity && i.severity !== severity) return false;
    if (openOnly && !i.is_open) return false;
    if (departmentId && i.department_id !== Number(departmentId)) return false;
    if (processId && i.process_id !== Number(processId)) return false;
    if (categoryId && i.category_id !== Number(categoryId)) return false;
    if (ownerId && i.owner_user_id !== Number(ownerId)) return false;
    if (systemId) {
      const id = Number(systemId);
      const touches = i.primary_system_id === id || i.systems.some((s) => s.id === id);
      if (!touches) return false;
    }
    if (from && i.occurred_date < from) return false;
    if (to && i.occurred_date > to) return false;
    if (search) {
      const hit = matches(i.title, search) || matches(i.reference, search) ||
                  matches(i.description, search) || matches(i.root_cause, search);
      if (!hit) return false;
    }
    return true;
  });
}

/** `get_incident` — by reference (INC-2026-018) or numeric id. */
export async function getIncident(key) {
  const db = await load();
  if (key == null) return null;
  const asNumber = Number(key);
  return (
    db.incidents.find((i) => i.reference.toLowerCase() === String(key).toLowerCase()) ??
    (Number.isFinite(asNumber) ? db.maps.incMap.get(asNumber) : null) ??
    null
  );
}

/** `list_actions` — filterable, including the overdue cut management asks for. */
export async function listActions(filters = {}) {
  const db = await load();
  const { status, priority, overdue, openOnly, incidentId, controlId, ownerId,
          departmentId, actionType, search } = filters;

  return db.actions.filter((a) => {
    if (status && a.status !== status) return false;
    if (priority && a.priority !== priority) return false;
    if (actionType && a.action_type !== actionType) return false;
    if (overdue && !a.is_overdue) return false;
    if (openOnly && !a.is_open) return false;
    if (incidentId && a.incident_id !== Number(incidentId)) return false;
    if (controlId && a.control_id !== Number(controlId)) return false;
    if (ownerId && a.owner_user_id !== Number(ownerId)) return false;
    if (departmentId && a.department_id !== Number(departmentId)) return false;
    if (search && !(matches(a.title, search) || matches(a.reference, search) || matches(a.description, search))) return false;
    return true;
  });
}

/** `list_controls` — includes the derived failure counts the health view exposes. */
export async function listControls(filters = {}) {
  const db = await load();
  const { effectiveness, controlType, automation, departmentId, systemId, processId, search } = filters;

  return db.controls.filter((c) => {
    if (effectiveness && c.effectiveness !== effectiveness) return false;
    if (controlType && c.control_type !== controlType) return false;
    if (automation && c.automation !== automation) return false;
    if (departmentId && c.department_id !== Number(departmentId)) return false;
    if (systemId && c.system_id !== Number(systemId)) return false;
    if (processId && !c.processes.some((p) => p.id === Number(processId))) return false;
    if (search && !(matches(c.name, search) || matches(c.code, search) || matches(c.description, search))) return false;
    return true;
  });
}

export async function getControl(key) {
  const db = await load();
  const asNumber = Number(key);
  return (
    db.controls.find((c) => c.code.toLowerCase() === String(key).toLowerCase()) ??
    (Number.isFinite(asNumber) ? db.maps.ctlMap.get(asNumber) : null) ??
    null
  );
}

export async function listDepartments() { return (await load()).departments; }
export async function listUsers() { return (await load()).users; }
export async function listSystems() { return (await load()).systems; }
export async function listProcesses() { return (await load()).processes; }
export async function listCategories() { return (await load()).categories; }

/**
 * `risk_summary` — the one call a dashboard (or an assistant asked "how are we
 * doing?") needs. Everything here is derivable from the tables; it lives in one
 * place so the UI and the MCP server can't compute it differently.
 */
export async function getSummary() {
  const db = await load();
  const { incidents, actions, controls, departments, today } = db;

  const open = incidents.filter((i) => i.is_open);
  const openActions = actions.filter((a) => a.is_open);
  const overdue = actions.filter((a) => a.is_overdue);

  const windowStart = shiftMonths(today, -11);
  const inWindow = incidents.filter((i) => i.occurred_date >= monthStart(windowStart));

  return {
    today,
    counts: {
      incidents: incidents.length,
      openIncidents: open.length,
      criticalOpen: open.filter((i) => i.severity === 'critical').length,
      highOpen: open.filter((i) => i.severity === 'high').length,
      reportableOpen: open.filter((i) => i.regulatory_reportable).length,
      actions: actions.length,
      openActions: openActions.length,
      overdueActions: overdue.length,
      blockedActions: actions.filter((a) => a.status === 'blocked').length,
      dueSoonActions: openActions.filter((a) => a.days_to_due !== null && a.days_to_due >= 0 && a.days_to_due <= 30).length,
      controls: controls.length,
      ineffectiveControls: controls.filter((c) => c.effectiveness === 'ineffective').length,
      controlsDueForTest: controls.filter((c) => c.next_test_date && c.next_test_date <= shiftMonths(today, 1)).length,
    },
    loss: {
      net12m: sum(inWindow, (i) => i.net_loss),
      gross12m: sum(inWindow, (i) => i.gross_loss),
      recovered12m: sum(inWindow, (i) => i.recovery_amount),
      netOpen: sum(open, (i) => i.net_loss),
      customersAffected12m: sum(inWindow, (i) => i.customers_affected),
    },
    byMonth: monthlySeries(incidents, today, 12),
    byCategory: groupCount(incidents, (i) => i.category?.name ?? 'Uncategorised'),
    byRootCause: groupCount(incidents, (i) => i.root_cause_category ?? 'other'),
    byActionStatus: groupCount(actions, (a) => a.status),
    controlEffectiveness: groupCount(controls, (c) => c.effectiveness),
    heatmap: { open: heatmapCells(open), all: heatmapCells(inWindow) },
    departmentExposure: departments
      .map((d) => {
        const own = incidents.filter((i) => i.department_id === d.id);
        return {
          id: d.id,
          code: d.code,
          name: d.name,
          incidents: own.length,
          openIncidents: own.filter((i) => i.is_open).length,
          significant: own.filter((i) => i.severity === 'high' || i.severity === 'critical').length,
          netLoss: sum(own, (i) => i.net_loss),
          openActions: actions.filter((a) => a.department_id === d.id && a.is_open).length,
        };
      })
      .sort((a, b) => b.netLoss - a.netLoss),
    weakestControls: controls
      .map((c) => ({
        ...c,
        failedCount: c.incidents.filter((i) => i.failure_mode === 'failed').length,
        openActionCount: c.actions.filter((a) => a.is_open).length,
      }))
      .filter((c) => c.failedCount > 0 || c.effectiveness === 'ineffective')
      .sort((a, b) => b.failedCount - a.failedCount || a.code.localeCompare(b.code)),
  };
}

const sum = (rows, pick) => rows.reduce((total, row) => total + (pick(row) || 0), 0);

function groupCount(rows, pick) {
  const counts = new Map();
  for (const row of rows) {
    const key = pick(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

const monthStart = (iso) => `${iso.slice(0, 7)}-01`;

function shiftMonths(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  return date.toISOString().slice(0, 10);
}

/** Incident counts and net loss for the trailing `count` months, oldest first. */
function monthlySeries(incidents, today, count) {
  const buckets = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const key = shiftMonths(monthStart(today), -offset).slice(0, 7);
    buckets.push({ key, label: monthLabel(key), value: 0, netLoss: 0, significant: 0 });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const i of incidents) {
    const bucket = index.get(i.occurred_date.slice(0, 7));
    if (!bucket) continue;
    bucket.value += 1;
    bucket.netLoss += i.net_loss || 0;
    if (i.severity === 'high' || i.severity === 'critical') bucket.significant += 1;
  }
  return buckets;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
}

/** 5×5 likelihood (y) by impact (x) grid over the supplied incidents. */
function heatmapCells(incidents) {
  const cells = [];
  for (let likelihood = 5; likelihood >= 1; likelihood -= 1) {
    for (let impact = 1; impact <= 5; impact += 1) {
      cells.push({
        likelihood,
        impact,
        incidents: incidents.filter((i) => i.likelihood === likelihood && i.impact === impact),
      });
    }
  }
  return cells.map((c) => ({ ...c, count: c.incidents.length }));
}
