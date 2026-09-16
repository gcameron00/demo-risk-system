#!/usr/bin/env node
/**
 * Generates db/seed.sql from assets/data/demo.json.
 *
 * The browser reads demo.json directly; D1 reads the generated SQL. Keeping one
 * source of truth means the mock-up and the real database can never drift.
 *
 *   node tools/generate-seed.mjs
 *
 * No dependencies — plain Node, no package.json, nothing for the deploy
 * workflow to trip over.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'assets/data/demo.json'), 'utf8'));

const sqlValue = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};

/** One multi-row INSERT per table, chunked so no statement gets unwieldy. */
function insertRows(table, columns, rows, transform = (r) => r) {
  if (!rows.length) return '';
  const out = [];
  const chunkSize = 25;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map(transform);
    const values = chunk
      .map((row) => `  (${columns.map((c) => sqlValue(row[c] ?? null)).join(', ')})`)
      .join(',\n');
    out.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values};`);
  }
  return out.join('\n\n');
}

const section = (title) =>
  `-- ${'-'.repeat(73)}\n-- ${title}\n-- ${'-'.repeat(73)}`;

const parts = [];

parts.push(`-- Meridian Risk — demo seed data for Cloudflare D1
--
-- GENERATED FILE — do not edit by hand.
-- Source: assets/data/demo.json   Regenerate: node tools/generate-seed.mjs
--
-- Apply after db/schema.sql:
--   npx wrangler d1 execute risk_demo --file=db/seed.sql --remote
--
-- Self-referencing columns (departments.head_user_id, users.manager_id) are
-- inserted NULL and back-filled at the end, so the file loads cleanly with
-- foreign key enforcement switched on.
--
-- Organisation: ${data.meta.organisation} (fictional)
-- Dataset version: ${data.meta.version}   as of ${data.meta.as_of}`);

parts.push(section('Organisation'));

parts.push(
  insertRows(
    'departments',
    ['id', 'code', 'name', 'parent_department_id', 'location', 'cost_centre'],
    // Parents before children so the self-referencing FK resolves.
    [...data.departments].sort(
      (a, b) => (a.parent_department_id ? 1 : 0) - (b.parent_department_id ? 1 : 0)
    )
  )
);

parts.push(
  insertRows(
    'users',
    ['id', 'full_name', 'email', 'job_title', 'department_id', 'role', 'status'],
    data.users
  )
);

parts.push(section('Estate'));

parts.push(
  insertRows(
    'systems',
    ['id', 'code', 'name', 'description', 'vendor', 'hosting', 'criticality', 'owner_user_id', 'status'],
    data.systems
  )
);

parts.push(
  insertRows(
    'processes',
    ['id', 'code', 'name', 'description', 'department_id', 'owner_user_id', 'criticality', 'frequency'],
    data.processes
  )
);

parts.push(section('Risk taxonomy'));

parts.push(
  insertRows(
    'risk_categories',
    ['id', 'code', 'name', 'parent_id', 'basel_level'],
    [...data.risk_categories].sort((a, b) => a.basel_level - b.basel_level)
  )
);

parts.push(section('Controls'));

parts.push(
  insertRows(
    'controls',
    [
      'id', 'code', 'name', 'description', 'control_type', 'automation', 'frequency',
      'owner_user_id', 'department_id', 'system_id', 'effectiveness', 'design_rating',
      'last_tested_date', 'next_test_date', 'status',
    ],
    data.controls
  )
);

parts.push(insertRows('control_processes', ['control_id', 'process_id'], data.control_processes));

parts.push(section('Incidents'));

parts.push(
  insertRows(
    'incidents',
    [
      'id', 'reference', 'title', 'description', 'category_id', 'department_id', 'process_id',
      'primary_system_id', 'status', 'severity', 'likelihood', 'impact', 'occurred_date',
      'discovered_date', 'closed_date', 'reported_by_user_id', 'owner_user_id', 'gross_loss',
      'recovery_amount', 'net_loss', 'currency', 'regulatory_reportable', 'customers_affected',
      'root_cause', 'root_cause_category',
    ],
    data.incidents,
    (r) => ({ ...r, currency: r.currency ?? data.meta.currency })
  )
);

parts.push(insertRows('incident_controls', ['incident_id', 'control_id', 'failure_mode'], data.incident_controls));
parts.push(insertRows('incident_systems', ['incident_id', 'system_id', 'impact_type'], data.incident_systems));

parts.push(section('Actions'));

parts.push(
  insertRows(
    'actions',
    [
      'id', 'reference', 'title', 'description', 'incident_id', 'control_id', 'action_type',
      'priority', 'status', 'owner_user_id', 'department_id', 'created_date', 'due_date',
      'completed_date', 'progress_pct',
    ],
    data.actions
  )
);

parts.push(section('Incident timeline'));

parts.push(
  insertRows(
    'incident_updates',
    ['id', 'incident_id', 'user_id', 'created_at', 'note', 'status_from', 'status_to'],
    data.incident_updates
  )
);

parts.push(section('Back-fill self-referencing columns'));

parts.push(
  data.departments
    .filter((d) => d.head_user_id)
    .map((d) => `UPDATE departments SET head_user_id = ${d.head_user_id} WHERE id = ${d.id};`)
    .join('\n')
);

parts.push(
  data.users
    .filter((u) => u.manager_id)
    .map((u) => `UPDATE users SET manager_id = ${u.manager_id} WHERE id = ${u.id};`)
    .join('\n')
);

writeFileSync(join(root, 'db/seed.sql'), parts.filter(Boolean).join('\n\n') + '\n');

const counts = Object.entries(data)
  .filter(([, v]) => Array.isArray(v))
  .map(([k, v]) => `${k}=${v.length}`)
  .join(' ');
console.log(`Wrote db/seed.sql (${counts})`);
