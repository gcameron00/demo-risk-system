/**
 * JSON API over D1 — GET /api/*. Filters map 1:1 to the MCP tool arguments in
 * docs/mcp-server.md, and these handlers call the exact same query functions
 * the MCP tools call (db.js), so there is one place a query is written.
 */

import * as db from './db.js';
import { ValidationError, NotFoundError } from './errors.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function boolParam(v) {
  if (v == null) return undefined;
  return v === 'true' || v === '1';
}

export async function handleApi(request, env, path) {
  const url = new URL(request.url);
  const q = url.searchParams;

  try {
    if (path === '/api/summary') {
      return json(await db.riskSummary(env, {
        period_months: q.get('period_months') ?? undefined,
        department: q.get('department') ?? undefined,
      }));
    }

    if (path === '/api/export') {
      return json(await db.exportDataset(env));
    }

    if (path === '/api/incidents') {
      return json(await db.listIncidents(env, {
        status: q.get('status') ?? undefined,
        severity: q.get('severity') ?? undefined,
        department: q.get('department') ?? undefined,
        system: q.get('system') ?? undefined,
        process: q.get('process') ?? undefined,
        category: q.get('category') ?? undefined,
        owner: q.get('owner') ?? undefined,
        occurred_from: q.get('occurred_from') ?? undefined,
        occurred_to: q.get('occurred_to') ?? undefined,
        regulatory_reportable: boolParam(q.get('regulatory_reportable')),
        search: q.get('search') ?? undefined,
        limit: q.get('limit') ?? undefined,
      }));
    }

    const incidentMatch = path.match(/^\/api\/incidents\/([^/]+)$/);
    if (incidentMatch) {
      return json(await db.getIncident(env, decodeURIComponent(incidentMatch[1])));
    }

    if (path === '/api/actions') {
      return json(await db.listActions(env, {
        status: q.get('status') ?? undefined,
        priority: q.get('priority') ?? undefined,
        action_type: q.get('action_type') ?? undefined,
        overdue: boolParam(q.get('overdue')),
        owner: q.get('owner') ?? undefined,
        department: q.get('department') ?? undefined,
        incident: q.get('incident') ?? undefined,
        control: q.get('control') ?? undefined,
        due_before: q.get('due_before') ?? undefined,
        limit: q.get('limit') ?? undefined,
      }));
    }

    if (path === '/api/controls') {
      return json(await db.listControls(env, {
        effectiveness: q.get('effectiveness') ?? undefined,
        control_type: q.get('control_type') ?? undefined,
        automation: q.get('automation') ?? undefined,
        department: q.get('department') ?? undefined,
        system: q.get('system') ?? undefined,
        process: q.get('process') ?? undefined,
        failed_only: boolParam(q.get('failed_only')),
        test_due_before: q.get('test_due_before') ?? undefined,
      }));
    }

    const controlMatch = path.match(/^\/api\/controls\/([^/]+)$/);
    if (controlMatch) {
      return json(await db.getControl(env, decodeURIComponent(controlMatch[1])));
    }

    const referenceMatch = path.match(/^\/api\/reference\/([^/]+)$/);
    if (referenceMatch) {
      const entity = decodeURIComponent(referenceMatch[1]);
      const rows = await db.listReference(env, entity);
      return json({ entity, total: rows.length, rows });
    }

    if (path === '/api/search') {
      return json(await db.search(env, { query: q.get('query') ?? undefined, limit: q.get('limit') ?? undefined }));
    }

    return json({ error: `No route for ${path}.` }, 404);
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400);
    if (err instanceof NotFoundError) return json({ error: err.message }, 404);
    console.error(`API ${path} failed:`, err);
    return json({ error: 'Internal error.' }, 500);
  }
}
