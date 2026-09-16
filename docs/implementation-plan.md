# Implementation plan

The goal is a demo that stands up in front of an audience: a real MCP server,
over a real Cloudflare D1 database, with a web interface that shows the same
data so nobody has to take the chat window on trust.

This plan is sequenced so that **every phase leaves something demonstrable**. If
the build stops after phase 1, there is still a clickable mock-up; after phase 4
there is a working MCP demo even if writes never land.

Status as of 2026-09-16: phases 0 and 1 are complete and deployed. Phase 2 is
complete — `risk_demo` is live in Cloudflare D1, loaded via the Cloudflare
API directly (no `wrangler` CLI was available in that build environment).
Phases 3 and 4 are built as code — a second Worker, `worker/`, per the phase
3 fallback option. Deployment is now automatic:
`.github/workflows/deploy-risk-mcp.yml` runs `wrangler deploy` from `worker/`
on every push to `main` that touches it, reusing the same Cloudflare
credentials as the static site's `deploy.yml`. Merging this branch is what
ships it — see [`worker/README.md`](../worker/README.md).

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

## Phase 2 — Provision D1 and load the data ✅ done

Small phase, no code. `risk_demo` was created and loaded via direct
Cloudflare API calls rather than `wrangler d1 execute` (no CLI available in
that build environment), which is equivalent — the schema and seed SQL are
unchanged and ran verbatim.

Verified against the acceptance queries below; results matched the fixture
exactly:

```sql
SELECT COUNT(*) FROM incidents;                              -- 22 ✓
SELECT COUNT(*) FROM actions WHERE status <> 'completed';    -- 17 ✓
SELECT c.code, COUNT(*) FROM incident_controls ic
  JOIN controls c ON c.id = ic.control_id
 WHERE ic.failure_mode = 'failed'
 GROUP BY c.code ORDER BY 2 DESC;                            -- CTL-07 leads with 2 ✓
```

**Acceptance:** the four views return sensible rows, and the numbers agree with
what the dashboard shows from the fixture. Met.

---

## Phase 3 — The API over D1 ✅ built, deploys automatically on merge

The browser stops reading a file and starts reading the database.

**The decision that wasn't the site build's to make has been made:** the
repository owner chose **option 2**, a second Worker, so the root
`wrangler.toml` stays exactly as the deploy pipeline left it. `worker/` is
that Worker — its own `wrangler.toml`, its own `[[d1_databases]]` binding to
the now-live `risk_demo` database, serving both `/api/*` and `/mcp`. The
static site would call it cross-origin (CORS is handled in
`worker/src/index.js`).

1. ~~**Extend this Worker**~~ — not taken.
2. **A second Worker** — taken. See `worker/README.md`.

| Task | Notes | Status |
|---|---|---|
| Worker entry point | `worker/src/index.js` — this Worker serves `/api/*` and `/mcp` only; static assets are unaffected, still served by the existing Worker | ✅ |
| `GET /api/incidents`, `/api/incidents/:reference` | Filters map 1:1 to `listIncidents` arguments | ✅ `worker/src/routes.js` |
| `GET /api/actions`, `/api/controls`, `/api/controls/:code` | Same pattern | ✅ |
| `GET /api/summary` | Backs the dashboard in one call | ✅ |
| `GET /api/reference/:entity` | Departments, systems, processes, people, categories | ✅ |
| `GET /api/search` | Not in the original table; added as the natural REST mirror of the `search` tool | ✅ |
| Swap `api.js` to read from D1 | Done via `GET /api/export`, which returns the exact shape of `demo.json` — `index()` and every page are unchanged. Set `window.MERIDIAN_API_BASE` to switch; unset keeps the fixture | ✅ |
| Deploy `worker/` | `.github/workflows/deploy-risk-mcp.yml` runs on push to `main` | ✅ automatic on merge |

**Key decisions taken here**

- *Parameterised statements only.* Every filter value in `worker/src/db.js` is
  bound, never concatenated. The closed enumerations turn most validation into
  a whitelist check (`ValidationError` names the valid values).
- *Pagination from the start.* `limit` (default 50, cap 200) and `total`
  alongside the rows, on every list endpoint.
- *Keep the fixture path alive.* `/api/export` swaps the *source* underneath
  the same `index()` denormalisation, rather than replacing it — so the UI's
  rich per-page logic didn't need to change, and the fixture stays the
  default with zero risk to what's live today.

**Acceptance:** the site renders identically against D1 and against the
fixture — verified once `worker/` is deployed and `MERIDIAN_API_BASE` is set;
the query layer itself was validated by running the equivalent SQL directly
against the live `risk_demo` database (see phase 4 acceptance below, same
data).

---

## Phase 4 — The MCP server, read tools ✅ built, deploys automatically on merge

The actual point of the exercise.

| Task | Notes | Status |
|---|---|---|
| Remote MCP endpoint at `/mcp` | Streamable HTTP (plain JSON response, no SSE) — `worker/src/mcp.js` | ✅ |
| `list_incidents`, `get_incident` | The two tools most of a demo runs on | ✅ `worker/src/tools.js` |
| `list_actions`, `list_controls`, `get_control` | | ✅ |
| `risk_summary` | One call answers "how are we doing?" | ✅ |
| `list_reference`, `search` | Name-to-id resolution, and a keyword entry point | ✅ |
| Tool annotations | `readOnlyHint: true`, `idempotentHint: true` on all eight | ✅ |
| Connect from Claude and rehearse | Against `docs/demo-script.md` | ⬜ once merged and live |

Full argument and return specification: [`docs/mcp-server.md`](mcp-server.md).

**Key decisions taken here**

- *Few tools, well described.* Eight read tools, matching the spec exactly —
  no `list_incidents_by_department` crept in.
- *Return structured content plus a short text rendering.* Every tool
  handler in `tools.js` returns `{ structured, text }`; `mcp.js` maps that to
  `structuredContent` and `content: [{type:'text', ...}]`.
- *Never return an unbounded result set.* `list_controls` and `list_reference`
  cap at 200 rows even though the spec doesn't ask for a `limit` argument on
  them (there are only 20 controls today, but the cap costs nothing).
- *Reuse the phase-3 query layer.* `tools.js` calls the exact same functions
  in `db.js` that `routes.js` calls — one place a query is written, per the
  implementation rule in `mcp-server.md`.
- *Errors are instructions.* `ValidationError`/`NotFoundError` come back as a
  tool result with `isError: true` and a plain message naming valid values,
  not a stack trace or a JSON-RPC protocol error.

**Acceptance:** Claude, connected to the server with no other context, can
answer every question in the demo script — and the answers match the
dashboard. Not yet run end-to-end (needs deployment), but every SQL query
`db.js` runs was validated directly against the live `risk_demo` database
during this build pass, including the worked examples in
`docs/mcp-server.md` — e.g. `risk_summary`'s counts came back as "1 critical,
3 high" open, exactly as documented.

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
