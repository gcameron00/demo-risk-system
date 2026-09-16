# Data model

Twelve tables and four views in Cloudflare D1 (SQLite). The DDL is
[`db/schema.sql`](../db/schema.sql); the demo rows are
[`db/seed.sql`](../db/seed.sql), generated from
[`assets/data/demo.json`](../assets/data/demo.json).

## Shape

**Incidents** sit in the middle. Everything else either explains an incident or
is what gets changed because of one.

```
departments ─┐                                    ┌─ users
processes   ─┼──▶  incidents  ◀──── incident_controls ────▶ controls
systems     ─┤         │  ▲                                   │
risk_categories        │  └── incident_systems ── systems     │
                       ▼                                      │
                    actions ◀─────────────────────────────────┘
                       
incidents ──▶ incident_updates          controls ◀── control_processes ──▶ processes
```

Reading that as sentences:

- An incident happened **in a department**, on a **process**, on a **system**,
  and is classified under a **risk category**.
- It was **reported by** one person and is **owned by** another.
- Several **controls** were in scope; each one either failed, partly held, or
  turned out not to apply. That is `incident_controls.failure_mode`, and it is
  the most useful column in the schema.
- It touched other **systems** beyond the primary one (`incident_systems`).
- It produced **actions** — remediation, an enhancement to an existing control,
  or a new control. Actions point back at the incident *and* at the control they
  strengthen.
- It accumulated **updates** over its life.

## Tables

### Organisation

| Table | Purpose | Notable columns |
|---|---|---|
| `departments` | Org units, nesting through `parent_department_id` | `head_user_id`, `location`, `cost_centre` |
| `users` | People — owners, reporters, control owners | `department_id`, `manager_id`, `role` |

`departments.head_user_id` and `users.manager_id` are self- and
cross-referencing, so the seed inserts them `NULL` and back-fills with `UPDATE`
statements at the end. That keeps the file loadable with
`PRAGMA foreign_keys = ON`.

`users.role` (`risk_manager`, `risk_analyst`, `department_head`, `contributor`,
`auditor`, `admin`) is not used for anything yet — it is there for phase 5, when
writes need to be attributed and authorised.

### Estate

| Table | Purpose | Notable columns |
|---|---|---|
| `systems` | Applications and platforms | `vendor`, `hosting`, `criticality`, `owner_user_id` |
| `processes` | Business processes | `department_id`, `owner_user_id`, `criticality`, `frequency` |

Systems and processes are the two lenses on how work gets done, and incidents
cite both: *what broke* (the process) and *where it broke* (the system).

### Taxonomy

`risk_categories` is a two-level Basel-style event taxonomy — seven level-one
categories (internal fraud, external fraud, employment practices, clients and
business practices, physical assets, business disruption, execution and process
management) with level-two children such as *Payment & card fraud*, *Systems
outage* and *Change & release failure*. `parent_id` gives the hierarchy;
`basel_level` makes "roll up to level one" a trivial query.

### Controls

`controls` carries both ratings that matter:

- `effectiveness` — how it actually operates (`effective`,
  `partially_effective`, `ineffective`, `not_tested`), set by testing
- `design_rating` — whether it would work even if performed perfectly
  (`strong`, `adequate`, `deficient`)

A control that is well designed but poorly operated needs a different fix from
one that was never going to work, and the demo data contains both.

`control_type` (`preventive`, `detective`, `corrective`, `directive`) and
`automation` (`manual`, `semi_automated`, `automated`) support the questions
risk functions actually ask — *how much of our control environment is a person
remembering to do something?*

`control_processes` is the many-to-many: a control covers several processes, a
process is covered by several controls. Gaps in that table are control coverage
gaps.

### Incidents

The wide table. Worth calling out:

- `severity` is the assessed seriousness. `likelihood` and `impact` (1–5) are
  scored separately and multiply into the risk score used by the heat map. They
  are related but not the same thing, and the data reflects that.
- `gross_loss`, `recovery_amount`, `net_loss` are stored separately rather than
  derived, because recoveries arrive late and the gross figure is what gets
  reported.
- `regulatory_reportable` is its own flag, not a function of loss. Several
  incidents in the dataset have zero net loss and are reportable — a sanctions
  near miss costs nothing and matters enormously.
- `root_cause_category` is a closed vocabulary (`human_error`,
  `control_failure`, `system_failure`, `process_design`, `third_party`,
  `external_event`, `capacity`, `other`) so themes can be counted rather than
  read.

`incident_updates` is the timeline — note, author, timestamp and any status
transition. It is what makes an incident comprehensible six months later.

### Actions

Actions are the reason the whole system exists: an incident that produces no
change is just a story.

`action_type` distinguishes the three real outcomes:

- `remediate` — fix the damage from this event (recall the payments, pay the
  redress, re-decision the applications)
- `enhance_control` — the control existed and did not hold; change it
- `new_control` — there was no control; build one

plus `investigate` and `accept_risk` for completeness. `control_id` links the
action to the control it changes, which closes the loop back to `controls`.

## Views

Defined so that the web UI and the MCP server cannot compute the same thing two
different ways:

| View | Answers |
|---|---|
| `v_incident_summary` | The register, with lookups resolved, `risk_score` derived and action counts attached |
| `v_action_summary` | The action book with incident and control context, plus `is_overdue` |
| `v_control_health` | Per control: failure count, linked incidents, open actions, process coverage |
| `v_department_exposure` | Per department: incident counts, significant events, net loss, open actions |

One caveat: `v_action_summary.is_overdue` compares against `date('now')`, while
the demo front end pins "today" to `meta.as_of` in the dataset so the demo does
not drift. When D1 goes live, either keep the pinned date in the query layer or
accept that the demo data ages.

## Conventions

- Integer surrogate primary keys. Human-facing identifiers are `code`
  (`DEPT-01`, `SYS-02`, `CTL-14`, `PRC-07`) or `reference` (`INC-2026-018`,
  `ACT-024`) and are unique — the MCP tools accept those, not opaque ids.
- Dates are ISO-8601 `YYYY-MM-DD` strings; timestamps are ISO-8601 UTC. SQLite
  string comparison then gives correct date ordering for free.
- Enumerations are closed and enforced with `CHECK` constraints. This is load
  bearing: it lets tool arguments be validated against a whitelist, and it stops
  an assistant inventing a status that no report will ever count.
- Money is `REAL` for demo simplicity. A production system would store integer
  minor units.

## Regenerating

```bash
node tools/generate-seed.mjs      # assets/data/demo.json -> db/seed.sql
```

The generator has no dependencies and writes a deterministic file. Never edit
`db/seed.sql` by hand — edit the JSON and regenerate, or the browser and the
database will disagree.
