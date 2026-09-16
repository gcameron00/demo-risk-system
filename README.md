# Meridian Risk — operational risk demo

A demonstration of what changes when an assistant can query an operational risk
management system directly, instead of waiting for someone to export a report.

The project has three parts:

| Part | What it is | Status |
|---|---|---|
| **Database** | A Cloudflare D1 (SQLite) schema for operational risk — incidents, actions, controls, departments, people, processes and systems, with real relationships between them | **Built and provisioned** — `db/schema.sql`, `db/seed.sql` are loaded into a live `risk_demo` D1 database |
| **Web interface** | A static dashboard and three registers over that data — no framework, no build step | **Built** — this is what deploys today, still reading `assets/data/demo.json` by default |
| **MCP server** | A Cloudflare Worker exposing the database to Claude as a small set of MCP tools | **Built, deploys automatically on merge to `main`** — a second Worker in [`worker/`](worker/) implements the full read surface from [`docs/mcp-server.md`](docs/mcp-server.md); see [`worker/README.md`](worker/README.md) |

Everything in the dataset is fictional. Meridian Financial Group, its staff and
every incident in the register were written for this demo.

## Quick start

It is static files. Serve the repository root with anything:

```bash
npx serve .          # or: python3 -m http.server 8000
```

Then open <http://localhost:8000>. There is nothing to install and nothing to
build.

To work on it against a local Worker instead:

```bash
npx wrangler dev
```

## What is in the box

```
worker/                     risk-mcp: a second Worker holding the D1 binding, /api/* and /mcp
index.html                  Dashboard — KPIs, 12-month trend, risk heat map, exposure
incidents/index.html        Incident register — filter by status, severity, department, system, category
incidents/detail.html       One incident: root cause, failed controls, actions, timeline
actions/index.html          Action tracker — overdue, blocked, by owner
controls/index.html         Control library — effectiveness, coverage, failure history
registers/index.html        Departments · Systems · Processes · People
data-model/index.html       The schema, an ERD and how to load it into D1
mcp/index.html              The MCP tool specification
about/index.html            What is real, what is mocked, how to read the data

assets/css/styles.css       One stylesheet. Light and dark both selected, not inverted
assets/js/api.js            The only module that knows where data comes from
assets/js/ui.js             App shell, formatters, status badges, sortable tables
assets/js/charts.js         Inline-SVG line chart, bar chart, heat map, status meter
assets/js/pages/*.js        One module per page
assets/data/demo.json       The dataset — single source of truth

db/schema.sql               D1 DDL: 12 tables, 4 views, check constraints, indexes
db/seed.sql                 Generated demo rows
tools/generate-seed.mjs     demo.json -> seed.sql (plain Node, no dependencies)

docs/                       Data model, MCP design, implementation plan, front-end notes, demo script
```

## Documentation

- [`docs/implementation-plan.md`](docs/implementation-plan.md) — the phased build-out, what is done and what comes next
- [`docs/data-model.md`](docs/data-model.md) — every table, column and relationship, and why
- [`docs/mcp-server.md`](docs/mcp-server.md) — the MCP tool surface, transport, authorisation and safety rules
- [`docs/frontend.md`](docs/frontend.md) — architecture, conventions and the chart rules
- [`docs/demo-script.md`](docs/demo-script.md) — a fifteen-minute walkthrough that actually lands

## The data model in one paragraph

An **incident** is an operational risk event that already happened. It is linked
to the **department** it happened in, the **process** that broke, the **system**
it broke on and a two-level Basel-style **risk category**. It names the
**people** who reported and own it. It is linked to the **controls** that were in
scope — recording, for each one, whether it failed, partly held or was not
applicable — and to the **systems** it touched beyond the primary one. Out of it
come **actions**: remediation, an enhancement to an existing control, or an
entirely new control. Actions carry an owner, a due date and progress.
**Incident updates** give each incident a timeline.

Full detail: [`docs/data-model.md`](docs/data-model.md), or the
[Data model page](https://demo-risk-system.workers.dev/data-model/) in the site
itself.

## Loading the database

```bash
npx wrangler d1 create risk_demo

npx wrangler d1 execute risk_demo --file=db/schema.sql --remote
npx wrangler d1 execute risk_demo --file=db/seed.sql   --remote

npx wrangler d1 execute risk_demo --remote \
  --command="SELECT status, COUNT(*) AS n FROM incidents GROUP BY status"
```

`db/seed.sql` is generated from `assets/data/demo.json`:

```bash
node tools/generate-seed.mjs
```

Edit the JSON, regenerate, reload — the browser and the database never drift
apart. That also means Claude can be pointed at `assets/data/demo.json` to shape
a demo scenario, and the SQL follows.

## Deployment

Pushes to `main` deploy to Cloudflare Workers via
`.github/workflows/deploy.yml`, using `wrangler.toml` and `.assetsignore`.

**Do not modify `wrangler.toml`, `.assetsignore`, or anything under
`.github/workflows/`** — they own deployment.

This matters for the MCP server: a D1 binding and a Worker entry point have to be
declared in `wrangler.toml`. Rather than modify the root config above, the MCP
server ships as a second Worker (`worker/`) with its own `wrangler.toml` and
its own deploy step — see [`worker/README.md`](worker/README.md). See also
[`docs/implementation-plan.md`](docs/implementation-plan.md#phase-3--the-api-over-d1).

## Conventions

- **No framework, no build step, no dependencies.** ES modules, served as-is.
- **One data access layer.** Pages never fetch; they call `assets/js/api.js`.
  Its function names mirror the MCP tool names on purpose.
- **Enumerations are closed** and enforced by `CHECK` constraints, so both the UI
  and the MCP server can rely on a fixed vocabulary.
- **Status colour never carries meaning alone** — every badge has a text label.
- **"Today" is pinned** to `meta.as_of` in the dataset, so overdue stays overdue
  and screenshots do not rot.
