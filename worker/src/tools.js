/**
 * The eight read tools from docs/mcp-server.md. Each has a JSON Schema for
 * its arguments, is annotated readOnlyHint/idempotentHint so a client can
 * call it without asking the human first, and returns both structured
 * content and a short text rendering.
 */

import * as db from './db.js';

const money = (n, currency = 'GBP') =>
  `${currency} ${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

function renderRows(rows, take, fmt) {
  if (!rows.length) return 'No matches.';
  const shown = rows.slice(0, take).map(fmt).join('\n');
  return rows.length > take ? `${shown}\n… and ${rows.length - take} more.` : shown;
}

export const TOOLS = [
  {
    name: 'list_incidents',
    description:
      'Filter the incident register by status, severity, department, system, process, risk category, owner, date range, regulatory-reportable flag, or free text. Always returns `total` (the unpaginated count) alongside the rows actually returned, so a broad question degrades into a summary rather than a flood.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'under_investigation', 'pending_action', 'closed'] },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        department: { type: 'string', description: 'Name or DEPT- code' },
        system: { type: 'string', description: 'Name or SYS- code; matches primary or touched systems' },
        process: { type: 'string', description: 'Name or PRC- code' },
        category: { type: 'string', description: 'Risk category name or code; level-one codes include their children' },
        owner: { type: 'string', description: "Person's name or email" },
        occurred_from: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        occurred_to: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        regulatory_reportable: { type: 'boolean' },
        search: { type: 'string', description: 'Free text over title, description and root cause' },
        limit: { type: 'integer', description: 'Default 50, cap 200' },
      },
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (env, args) => {
      const result = await db.listIncidents(env, args);
      const text = `${result.total} incident(s) matched (showing ${result.returned}).\n` +
        renderRows(result.incidents, 10, (i) =>
          `${i.reference} — ${i.title} (${i.status}, ${i.severity}, ${i.occurred_date})`);
      return { structured: result, text };
    },
  },
  {
    name: 'get_incident',
    description:
      'The full record for one incident: the incident itself, the controls in scope with how each performed, the systems touched, its actions, and the update timeline. This is the tool most questions about "what happened and is it fixed" run on.',
    inputSchema: {
      type: 'object',
      properties: { reference: { type: 'string', description: 'e.g. INC-2026-018' } },
      required: ['reference'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (env, args) => {
      const result = await db.getIncident(env, args.reference);
      const i = result.incident;
      const lines = [
        `${i.reference} — ${i.title}`,
        `${i.status}, ${i.severity} (occurred ${i.occurred_date}). Net loss ${money(i.net_loss, i.currency)}.`,
        i.root_cause ? `Root cause: ${i.root_cause}` : null,
        result.controls.length ? `Controls: ${result.controls.map((c) => `${c.code} (${c.failure_mode})`).join(', ')}` : null,
        result.actions.length ? `Actions: ${result.actions.map((a) => `${a.reference} ${a.status}`).join(', ')}` : 'No actions raised.',
      ].filter(Boolean);
      return { structured: result, text: lines.join('\n') };
    },
  },
  {
    name: 'list_actions',
    description:
      'Filter the action tracker by status, priority, type, overdue flag, owner, department, incident or control. Includes the derived `is_overdue` flag from v_action_summary.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        action_type: { type: 'string', enum: ['remediate', 'enhance_control', 'new_control', 'investigate', 'accept_risk'] },
        overdue: { type: 'boolean', description: 'Open, with a due date in the past' },
        owner: { type: 'string' },
        department: { type: 'string' },
        incident: { type: 'string', description: 'Incident reference' },
        control: { type: 'string', description: 'Control code' },
        due_before: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        limit: { type: 'integer', description: 'Default 50, cap 200' },
      },
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (env, args) => {
      const result = await db.listActions(env, args);
      const text = `${result.total} action(s) matched (showing ${result.returned}).\n` +
        renderRows(result.actions, 10, (a) =>
          `${a.reference} — ${a.title} (${a.status}${a.is_overdue ? ', OVERDUE' : ''}, due ${a.due_date ?? 'n/a'})`);
      return { structured: result, text };
    },
  },
  {
    name: 'list_controls',
    description:
      'Filter the control library by effectiveness, type, automation, department, system, process, or "failed at least once". Includes failure and open-action counts from v_control_health — the "which controls keep letting us down" question.',
    inputSchema: {
      type: 'object',
      properties: {
        effectiveness: { type: 'string', enum: ['effective', 'partially_effective', 'ineffective', 'not_tested'] },
        control_type: { type: 'string', enum: ['preventive', 'detective', 'corrective', 'directive'] },
        automation: { type: 'string', enum: ['manual', 'semi_automated', 'automated'] },
        department: { type: 'string' },
        system: { type: 'string' },
        process: { type: 'string' },
        failed_only: { type: 'boolean', description: 'Only controls that failed in at least one incident' },
        test_due_before: { type: 'string', description: 'ISO date YYYY-MM-DD' },
      },
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (env, args) => {
      const result = await db.listControls(env, args);
      const text = `${result.total} control(s) matched (showing ${result.returned}).\n` +
        renderRows(result.controls, 10, (c) =>
          `${c.code} — ${c.name} (${c.effectiveness}, ${c.failed_incident_count} failure(s), ${c.open_action_count} open action(s))`);
      return { structured: result, text };
    },
  },
  {
    name: 'get_control',
    description:
      'One control in full: the processes it covers, every incident it was in scope for and how it performed, and its open actions.',
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'e.g. CTL-02' } },
      required: ['code'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (env, args) => {
      const result = await db.getControl(env, args.code);
      const c = result.control;
      const lines = [
        `${c.code} — ${c.name}`,
        `${c.control_type}, ${c.automation}, currently ${c.effectiveness}.`,
        result.incidents.length
          ? `Linked incidents: ${result.incidents.map((i) => `${i.reference} (${i.failure_mode})`).join(', ')}`
          : 'No linked incidents.',
        result.actions.length ? `Open actions: ${result.actions.map((a) => a.reference).join(', ')}` : 'No open actions.',
      ];
      return { structured: result, text: lines.join('\n') };
    },
  },
  {
    name: 'risk_summary',
    description:
      'One call for "how are we doing?": open and total counts by status and severity, gross/net/recovered loss, the monthly incident series, the likelihood x impact grid, per-department exposure, control effectiveness distribution, and the overdue action count.',
    inputSchema: {
      type: 'object',
      properties: {
        period_months: { type: 'integer', description: 'Default 12' },
        department: { type: 'string', description: 'Optional scope' },
      },
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (env, args) => {
      const s = await db.riskSummary(env, args);
      const lines = [
        `${s.counts.incidents} incidents (${s.counts.open_incidents} open: ${s.counts.critical_open} critical, ${s.counts.high_open} high).`,
        `Net loss last ${s.period_months}mo: ${money(s.loss.net)}. Net loss carried on open incidents: ${money(s.loss.net_open)}.`,
        `${s.actions.open} open actions, ${s.actions.overdue} overdue, ${s.actions.blocked} blocked.`,
        `${s.controls.ineffective} ineffective control(s) of ${s.controls.total}.`,
      ];
      return { structured: s, text: lines.join('\n') };
    },
  },
  {
    name: 'list_reference',
    description:
      'Resolve names to ids: departments, systems, processes, people or risk categories, in full. Use this before filtering when unsure of the exact name or code.',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', enum: ['departments', 'systems', 'processes', 'people', 'risk_categories'] },
      },
      required: ['entity'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (env, args) => {
      const rows = await db.listReference(env, args.entity);
      const text = `${rows.length} ${args.entity}.\n` + renderRows(rows, 20, (r) => `${r.code ?? r.id} — ${r.name ?? r.full_name}`);
      return { structured: { entity: args.entity, total: rows.length, rows }, text };
    },
  },
  {
    name: 'search',
    description:
      'Keyword search across incidents, actions and controls, each hit tagged with its entity type and reference. The entry point for "what do we know about phishing?".',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', description: 'Default 20' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (env, args) => {
      const result = await db.search(env, args);
      const text = `${result.total} hit(s).\n` +
        renderRows(result.hits, 15, (h) => `[${h.entity_type}] ${h.reference} — ${h.title} (${h.detail})`);
      return { structured: result, text };
    },
  },
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
