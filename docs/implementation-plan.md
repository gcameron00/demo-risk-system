# Implementation plan

The goal is a demo that stands up in front of an audience: a real MCP server,
over a real Cloudflare D1 database, with a web interface that shows the same
data so nobody has to take the chat window on trust.

This plan is sequenced so that **every phase leaves something demonstrable**. If
the build stops after phase 1, there is still a clickable mock-up; after phase 4
there is a working MCP demo even if writes never land.

Status as of 2026-09-16: phases 0 and 1 are complete and deployed.

---

## Phase 0 — Foundations ✅ done

Decide the shape of the data before building anything on top of it.

| Task | Output |
|---|---|
| Document the project | `README.md`, `/about/` |
| Design the operational risk schema | `db/schema.sql` — 12 tables, 4 views |
| Author a dataset that can carry a demo | `assets/data/demo.json` |
| Generate loadable seed SQL from it | `tools/generate-seed.mjs` → `db/seed.sql` |

**Key decisions taken here**

- *One source of truth for the demo data.* The browser reads `demo.json`; D1
  reads SQL generated from the same file. Two hand-maintained copies would have
  drifted within a week.
- *Closed enumerations, enforced with `CHECK`.* Status, severity, effectiveness
  and the rest are fixed vocabularies. That is what lets the MCP server validate
  a tool argument without a lookup round-trip, and what stops an assistant
  inventing a status.
- *Views, not repeated logic.* `is_overdue`, `risk_score` and the department
  rollups are defined once in SQL so the UI and the MCP server cannot disagree.
- *A realistic dataset, not a synthetic one.* Twenty-two incidents spread across
  twelve months, with recoveries, near misses, zero-loss regulatory events and
  controls that failed more than once. A demo dataset where everything is neat
  demonstrates nothing.

**Acceptance:** `db/schema.sql` + `db/seed.sql` load into a fresh D1 database
with foreign keys on, and the row counts match `demo.json`.

---

## Phase 1 — Front-end mock-up ✅ done

A complete, clickable interface over the fixture — the thing this issue asked
for.

| Task | Output |
|---|---|
| App shell, theming, component CSS | `assets/css/styles.css`, `assets/js/ui.js` |
| Data access layer shaped like the future API | `assets/js/api.js` |
| Charts without a charting library | `assets/js/charts.js` |
| Dashboard | `index.html` |
| Incident register and detail record | `incidents/` |
| Action tracker | `actions/` |
| Control library | `controls/` |
| Reference registers | `registers/` |
| Design documentation in the product | `data-model/`, `mcp/`, `about/` |

**Key decisions taken here**

- *The data access layer is the seam.* Pages never call `fetch`. Swapping the
  fixture for `/api/*` is a change to `api.js` alone — that is the whole reason
  it exists this early.
- *`api.js` function names mirror the MCP tool names.* `listIncidents`,
  `getIncident`, `listActions`, `listControls`, `getSummary`. When the MCP server
  is written, its tool list is already specified by working code.
- *Every filter lives in the URL.* Any view can be linked to, which matters when
  you want the dashboard heat map to hand off to a filtered register mid-demo.
- *"Today" is pinned to `meta.as_of`.* Overdue actions stay overdue; the demo
  does not quietly heal itself over time.

**Acceptance:** every screen renders from `demo.json` with no console errors;
filters round-trip through the URL; light and dark both legible.

---

## Phase 2 — Provision D1 and load the data

Small phase, no code.

```bash
npx wrangler d1 create risk_demo
npx wrangler d1 execute risk_demo --file=db/schema.sql --remote
npx wrangler d1 execute risk_demo --file=db/seed.sql   --remote
```

Then verify against the fixture — counts per table, and a couple of joins that
exercise the relationships:

```sql
SELECT COUNT(*) FROM incidents;                              -- 22
SELECT COUNT(*) FROM actions WHERE status <> 'completed';    -- open book
SELECT c.code, COUNT(*) FROM incident_controls ic
  JOIN controls c ON c.id = ic.control_id
 WHERE ic.failure_mode = 'failed'
 GROUP BY c.code ORDER BY 2 DESC;                            -- the weak controls
```

**Acceptance:** the four views return sensible rows, and the numbers agree with
what the dashboard shows from the fixture.

---

## Phase 3 — The API over D1

The browser stops reading a file and starts reading the database.

**Blocked on a decision that is not the site build's to make.** A D1 binding and
a Worker entry point must be declared in `wrangler.toml`, which this repository's
deployment setup owns and which must not be modified by the site builder. Two
ways forward:

1. **Extend this Worker** — the repository owner adds a `main` entry point and a
   `[[d1_databases]]` binding to `wrangler.toml`. One Worker serves the static
   assets, `/api/*` and later `/mcp`. Simplest to demo: one URL.
2. **A second Worker** — a separate `risk-mcp` Worker with its own config holds
   the D1 binding and serves both `/api/*` and `/mcp`; the static site calls it
   cross-origin. Keeps this repository's deployment untouched at the cost of CORS
   configuration and a second deploy.

Option 1 is recommended. Option 2 is the fallback if the deployment pipeline
should stay frozen.

| Task | Notes |
|---|---|
| Worker entry point with an asset fallthrough | Static assets keep serving as they do now |
| `GET /api/incidents`, `/api/incidents/:reference` | Filters map 1:1 to `listIncidents` arguments |
| `GET /api/actions`, `/api/controls`, `/api/controls/:code` | Same pattern |
| `GET /api/summary` | Backs the dashboard in one call |
| `GET /api/reference/:entity` | Departments, systems, processes, people, categories |
| Swap `api.js` to `fetch('/api/...')` | Keep the fixture behind a flag for offline demos |

**Key decisions to take here**

- *Parameterised statements only.* No query string is ever concatenated from
  request input. The closed enumerations make validation a whitelist check.
- *Pagination from the start.* `limit` (default 50, cap 200) and a `total`
  alongside the rows. Retrofitting pagination after an assistant has learned the
  unpaginated shape is painful.
- *Keep the fixture path alive.* A demo that dies because D1 is having a bad
  afternoon is worse than no demo. One flag, two data sources, same interface.

**Acceptance:** the site renders identically against D1 and against the fixture.
That equivalence is the test.

---

## Phase 4 — The MCP server, read tools

The actual point of the exercise.

| Task | Notes |
|---|---|
| Remote MCP endpoint at `/mcp` | Streamable HTTP on the Worker holding the D1 binding |
| `list_incidents`, `get_incident` | The two tools most of a demo runs on |
| `list_actions`, `list_controls`, `get_control` | |
| `risk_summary` | One call answers "how are we doing?" |
| `list_reference`, `search` | Name-to-id resolution, and a keyword entry point |
| Tool annotations | Read-only and idempotent, so clients can call without prompting |
| Connect from Claude and rehearse | Against `docs/demo-script.md` |

Full argument and return specification: [`docs/mcp-server.md`](mcp-server.md).

**Key decisions to take here**

- *Few tools, well described.* Eight read tools with good descriptions beat
  thirty thin ones — the model picks better and the context cost is lower.
- *Return structured content plus a short text rendering.* Structured output for
  clients that can use it; readable text so nothing breaks for clients that
  cannot.
- *Never return an unbounded result set.* Broad questions should degrade to a
  summary, not flood the context window.
- *Reuse the phase-3 query layer.* The tools call the same functions the HTTP
  routes call. One place to write a query, one place for it to be wrong.

**Acceptance:** Claude, connected to the server with no other context, can answer
every question in the demo script — and the answers match the dashboard.

---

## Phase 5 — Write tools

Where it gets interesting, and where it gets dangerous.

| Task | Notes |
|---|---|
| `create_incident` | Allocates and returns the reference |
| `add_incident_update` | Appends to the timeline, optionally moves status |
| `create_action` | Against an incident and, optionally, a control |
| `update_action_progress` | Status and percentage |
| `update_control_effectiveness` | Records a test result |
| Audit trail | Every write lands in `incident_updates`, attributed |
| Reset command | Restore the demo database to seed state between runs |

**Rules these must follow**

- Annotated as non-read-only and destructive-where-true, so the client asks the
  human first.
- No hard deletes — statuses move to `cancelled` or `closed`.
- Attribution is mandatory: who asked, through which tool, when.
- A demo token scoped to one seeded database. Blast radius zero.

**Acceptance:** "raise an action against INC-2026-017 to bring the patch calendar
back into policy, assign it to James Whitfield, due end of October" produces a
correct row, a confirmation prompt, and an audit entry — and the action appears
in the web UI on refresh.

---

## Phase 6 — Hardening and polish

Only worth doing once phases 4 and 5 are proven.

- Authorisation: OAuth or a scoped bearer token; map an identity to a `users`
  row so writes are attributed to a person rather than "the demo".
- Rate limiting and query timeouts on the Worker.
- Observability: log every tool call with arguments and row counts — useful for
  the demo narrative as much as for operations.
- Front-end: saved views, CSV export, a printable monthly pack.
- A `/api/health` endpoint reporting row counts and the dataset version.

---

## Risks worth naming

| Risk | Mitigation |
|---|---|
| `wrangler.toml` must change for D1, but the site build must not touch it | Phase 3 is explicitly gated on the repository owner's decision; a second Worker is the fallback |
| An assistant answering confidently from a stale or partial query | Every list tool returns `total` alongside its rows; the UI shows the same numbers so mismatches are visible immediately |
| Demo data drifting from the database | `db/seed.sql` is generated from `demo.json`; never edited by hand |
| Overdue actions quietly becoming not-overdue | "Today" is pinned to `meta.as_of`; when D1 goes live, keep pinning it rather than using `date('now')` for the demo dataset |
| Write tools doing something embarrassing live | Phase 5 ships with confirmation prompts, no hard deletes, and a one-command reset |
