# MCP server design

> Status: **specified, not built.** No Worker code exists yet. This is the
> contract phase 4 of [the implementation plan](implementation-plan.md) will
> implement.

## What it is for

An operational risk database is full of answers nobody can get at. "What's open
in Payments?", "why did that payment duplicate?", "which controls keep failing?"
are all one query away and two weeks away at the same time, because the query
has to be asked by someone who knows SQL and the schema.

An MCP server closes that gap. Claude connects to the database through a small,
explicit set of tools and answers the question in the conversation where it was
asked. The web interface exists alongside it so that the answer can be checked
against the same data by a human — a chat demo where the numbers cannot be
verified demonstrates nothing.

## Architecture

```
Claude  ──MCP, streamable HTTP──▶  Worker /mcp  ──binding──▶  D1: risk_demo
                                        │
Browser ──static assets────────▶  same Worker  ──▶ /api/*  ──▶  same D1
```

A single Cloudflare Worker holds the D1 binding and serves three things: the
static site, a JSON API for the browser, and the MCP endpoint. The tools and the
HTTP routes call the same query functions, so there is exactly one place where a
query is written.

### The deployment constraint

The D1 binding and the Worker entry point must be declared in `wrangler.toml`,
which this repository's deployment setup owns and which the site build must not
modify. Two options, in order of preference:

1. **Extend this Worker.** The repository owner adds `main` and a
   `[[d1_databases]]` binding. One Worker, one origin, no CORS.
2. **A second Worker.** A separate `risk-mcp` Worker with its own config serves
   `/api/*` and `/mcp`; the static site calls it cross-origin.

## Read tools

All read tools are annotated `readOnlyHint: true` and `idempotentHint: true`, so
a client may call them without asking the user first.

### `list_incidents`

Filter the incident register.

| Argument | Type | Notes |
|---|---|---|
| `status` | enum | `open`, `under_investigation`, `pending_action`, `closed` |
| `severity` | enum | `low`, `medium`, `high`, `critical` |
| `department` | string | Name or `DEPT-` code |
| `system` | string | Name or `SYS-` code; matches primary **or** touched systems |
| `process` | string | Name or `PRC-` code |
| `category` | string | Risk category name or code; level-one codes include their children |
| `owner` | string | Person's name or email |
| `occurred_from` / `occurred_to` | date | ISO `YYYY-MM-DD` |
| `regulatory_reportable` | boolean | |
| `search` | string | Free text over title, description and root cause |
| `limit` | integer | Default 50, cap 200 |

Returns `{ total, returned, incidents[] }` from `v_incident_summary`, newest
first. `total` is the unpaginated count — it is what stops the model reporting
"there are 12 incidents" when it was handed the first 12 of 60.

### `get_incident`

| Argument | Type | Notes |
|---|---|---|
| `reference` | string | e.g. `INC-2026-018` |

Returns the full record: the incident row, its actions, the controls that were
in scope with their `failure_mode`, the systems touched, and the update
timeline. This is the tool most of a demo runs on, because it is the one where
the relationships do visible work.

### `list_actions`

| Argument | Type | Notes |
|---|---|---|
| `status` | enum | `not_started`, `in_progress`, `blocked`, `completed`, `cancelled` |
| `priority` | enum | `low`, `medium`, `high`, `critical` |
| `action_type` | enum | `remediate`, `enhance_control`, `new_control`, `investigate`, `accept_risk` |
| `overdue` | boolean | Open, with a due date in the past |
| `owner`, `department` | string | |
| `incident` | string | Incident reference |
| `control` | string | Control code |
| `due_before` | date | |
| `limit` | integer | Default 50, cap 200 |

Returns `v_action_summary` rows with the derived `is_overdue` flag.

### `list_controls`

| Argument | Type | Notes |
|---|---|---|
| `effectiveness` | enum | `effective`, `partially_effective`, `ineffective`, `not_tested` |
| `control_type` | enum | `preventive`, `detective`, `corrective`, `directive` |
| `automation` | enum | `manual`, `semi_automated`, `automated` |
| `department`, `system`, `process` | string | |
| `failed_only` | boolean | Only controls that failed in at least one incident |
| `test_due_before` | date | |

Returns `v_control_health` rows, including `failed_incident_count` and
`open_action_count`.

### `get_control`

| Argument | Type | Notes |
|---|---|---|
| `code` | string | e.g. `CTL-02` |

One control with the processes it covers, every incident it was in scope for
(and how it performed), and its open actions.

### `risk_summary`

| Argument | Type | Notes |
|---|---|---|
| `period_months` | integer | Default 12 |
| `department` | string | Optional scope |

One call for "how are we doing?": open and total counts by status and severity,
gross/net/recovered loss, the monthly incident series, the likelihood × impact
grid, per-department exposure, control effectiveness distribution, and the
overdue action count. It exists so the model does not have to make six calls and
do arithmetic to answer the most common question.

### `list_reference`

| Argument | Type | Notes |
|---|---|---|
| `entity` | enum | `departments`, `systems`, `processes`, `people`, `risk_categories` |

Lets the model resolve "the payments team" to a department id before filtering,
rather than guessing.

### `search`

| Argument | Type | Notes |
|---|---|---|
| `query` | string | |
| `limit` | integer | Default 20 |

Keyword search across incidents, actions and controls, each hit tagged with its
entity type and reference. The entry point for "what do we know about
phishing?".

## Write tools (phase 5)

| Tool | Effect |
|---|---|
| `create_incident` | Raises an event; allocates and returns the reference |
| `add_incident_update` | Appends to the timeline, optionally moving status |
| `create_action` | Raises a mitigation against an incident and, optionally, a control |
| `update_action_progress` | Moves status and percentage complete |
| `update_control_effectiveness` | Records a test result |

Rules:

- Annotated `readOnlyHint: false`, so the client confirms with the human first.
- **No hard deletes.** Statuses move to `cancelled` or `closed`.
- Every write is attributed and lands in `incident_updates` as an audit trail.
- The demo token is scoped to one seeded database, and a reset command restores
  it between runs.

## Implementation rules

**Parameterised statements only.** Tool arguments are never concatenated into
SQL. The closed enumerations in the schema turn most validation into a whitelist
check; free-text arguments (`search`) go in as bound parameters.

**Resolve names to ids server-side.** Tools take `"Payments"` or `"DEPT-02"`,
not `2`. The model should not have to hold a lookup table in its head, and the
server already has one.

**Always return `total`.** Every list tool reports how many rows matched, not
just how many it returned. Broad questions should degrade into a summary, never
into a flood.

**Structured content plus a text rendering.** Return structured output matching
the tool's schema, and a short readable rendering for clients that only consume
text.

**Few tools, described well.** Eight read tools with careful descriptions beat
thirty thin ones: the model picks better and the context cost is lower. Resist
adding `list_incidents_by_department`.

**Errors are instructions.** A bad enum value should come back with the valid
values, not a stack trace. The model will then fix its own call.

## Worked examples

**"What's open and material right now?"**
`risk_summary` → `list_incidents(status=open, severity=critical|high)`. Answer:
one critical (INC-2026-017, the core banking outage during month-end close),
three high, two medium, and £622k of net loss carried on incidents that are
still open.

**"Why did the duplicate payment happen, and is it fixed?"**
`get_incident(INC-2026-018)`. The record gives the root cause — duplicate
detection keyed on file hash alone, so an operator retry that re-generated the
file defeated it — the control that failed (CTL-02), and the two actions raised:
re-key detection on value date and control totals, and add idempotent upload
tokens. Neither is complete, so no, not yet.

**"Which controls keep letting us down?"**
`list_controls(failed_only=true)` surfaces CTL-07 (change advisory board
approval), CTL-10 (interest rate change independent review) and CTL-13 (records
retention enforcement) — all rated below effective, all with open actions
against them.

**"Draft the monthly risk report."**
`risk_summary` plus `list_actions(overdue=true)` is enough material for a first
draft that cites real references.
