# risk-mcp

A second Cloudflare Worker, deliberately separate from the repository root's
`wrangler.toml` (owned by the static site's deploy pipeline — see the root
`README.md`). It holds the `risk_demo` D1 binding and serves:

- `GET /api/*` — a JSON API over the database (see `src/routes.js`)
- `POST /mcp` — the MCP endpoint: eight read-only tools over the same data
  (see `src/tools.js` and `src/mcp.js`)

No dependencies, no build step — plain ES modules, same convention as the
rest of this repository.

## Deploy

The `risk_demo` D1 database has already been provisioned and seeded (phase 2
of `docs/implementation-plan.md`), and its `database_id` is already in
`wrangler.toml` below. From this directory:

```bash
cd worker
npx wrangler deploy
```

Note the `*.workers.dev` URL wrangler prints — you'll need it for both steps
below.

## Wire up the browser UI (optional)

By default the site still reads `assets/data/demo.json`, unchanged. To point
it at the live D1-backed API instead, set `window.MERIDIAN_API_BASE` to this
Worker's URL before `assets/js/api.js` loads — e.g. in each page's `<head>`:

```html
<script>window.MERIDIAN_API_BASE = 'https://risk-mcp.<your-subdomain>.workers.dev';</script>
```

`api.js` then fetches `${MERIDIAN_API_BASE}/api/export` (same shape as
`demo.json`) instead of the static file. Everything downstream — the
denormalising `index()` step, every page — is unchanged, so this is a
one-line, reversible switch. Leaving the global unset keeps today's behaviour
exactly as deployed.

## Connect Claude to the MCP server

Add a remote MCP connector pointed at `https://risk-mcp.<your-subdomain>.workers.dev/mcp`.
No authentication is configured yet (phase 6) — this is a read-only demo
server over a seeded, disposable database.

Rehearse against `docs/demo-script.md` once connected; the worked examples in
`docs/mcp-server.md` show the exact tool calls behind each question.

## What's not here yet

Phase 5 (write tools: `create_incident`, `add_incident_update`,
`create_action`, `update_action_progress`, `update_control_effectiveness`)
is not implemented. It needs its own pass — attribution, an audit trail via
`incident_updates`, no hard deletes, and a reset-to-seed command — before it
should run against a database anyone is demoing from.
