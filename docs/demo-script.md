# Demo script

A fifteen-minute walkthrough. It works today with the web interface alone; the
bracketed parts light up once the MCP server exists.

The narrative spine: **a risk register is full of answers nobody can get at, and
an assistant with query access changes who can ask.**

---

## 0 · Framing (1 min)

> "This is Meridian Financial Group. It doesn't exist, but its risk register
> looks like one that does: twenty-two incidents over the last year, twenty
> controls, thirty-seven remediation actions, and the relationships between them.
> The database is real Cloudflare D1. What I want to show you is what happens
> when an assistant can query it directly."

## 1 · The position (2 min) — [Dashboard](/)

Point at the tiles, not the charts:

- **6 open incidents**, one critical, three high, five regulatory reportable.
- **£1.05m net loss** over twelve months, against £1.64m gross — recoveries are
  doing real work.
- **4 overdue actions** of 17 open, one of them blocked. This is the number that
  would make a risk committee uncomfortable.
- **3 ineffective controls** of 20.

Then the heat map. Switch it to *All, last 12 months* to show the spread, and
select a cell — it hands off to the filtered register. That handoff is the point:
every view in this app is a URL.

> "Nothing here needed a person to prepare it. It is the database, rendered."

## 2 · One incident, end to end (4 min) — [INC-2026-018](/incidents/detail.html?ref=INC-2026-018)

The clearest story in the dataset.

- **What happened:** a domestic payment file went to clearing twice after an
  operator retried a timed-out upload. £412k out the door, £380k recovered so
  far, 2,140 customers touched, regulatory reportable.
- **Why the control didn't catch it:** scroll to *Controls in scope*. CTL-02
  detects duplicates by file hash. The retry re-generated the file, so the hash
  changed and the check passed. Rated **ineffective**, design **deficient**.
- **What's being done:** two actions — re-key detection on originator, value date
  and control totals; and add idempotent upload tokens so a retry can't create a
  second logical submission. Plus a recall running at 75%.
- **The timeline** shows the investigation as it happened.

> "Incident, failed control, actions against that control. That triangle is the
> whole data model, and it's the thing most spreadsheets lose."

## 3 · The same story from the control's side (2 min) — [CTL-02](/controls/?control=CTL-02)

Open the control record. Same facts, different entry point: what it covers, the
incident it didn't prevent, the action outstanding against it.

Then step back to the full library and sort by **Failures**. CTL-07 (change
advisory board approval), CTL-10 (interest rate review) and CTL-13 (records
retention) are the recurring offenders.

> "This is the question a risk function can never answer quickly: which of our
> controls keep failing? It's one sort here — and one tool call in a moment."

## 4 · The action book (2 min) — [Actions](/actions/?overdue=1)

Filter to overdue. Four items — including the change freeze for month-end close,
which is both overdue and blocked while the firmware remediation runs, and the
treasury federation that would have prevented INC-2026-009 repeating.

Show the owner filter. Note that accountability is a real column, not a
free-text field.

## 5 · [The MCP server (4 min)](/mcp/)

*Once phase 4 is built.* Connect Claude and ask, without giving it any other
context:

1. **"What's open and material right now?"** — one `risk_summary` call, then a
   filtered `list_incidents`. Compare the answer to the dashboard on screen.
   They match, because they are the same query layer.
2. **"Why did the duplicate payment happen, and is it fixed?"** —
   `get_incident(INC-2026-018)`. It reads the root cause, names CTL-02, and says
   no, because both actions are open.
3. **"Which controls keep letting us down?"** — `list_controls(failed_only=true)`.
4. **"Draft the operational risk section of this month's board pack."** — this is
   where the demo lands. `risk_summary` plus the overdue action list is enough
   for a draft that cites real references.

*If the server isn't built yet*, show the [MCP page](/mcp/) instead and talk
through the tool list. The eight read tools map one-for-one onto the functions
already powering these screens — that equivalence is the design, not a
coincidence.

## 6 · Close (1 min)

> "Two things to take away. First, the model is small — twelve tables — and most
> of the value is in three join tables that record which control was in scope and
> how it performed. Second, the assistant isn't doing anything clever: it's
> asking eight well-described questions of a database that was always able to
> answer them. The hard part was deciding what those eight questions are."

---

## Setting up

1. `npx serve .` and open `http://localhost:8000`, or use the deployed site at
   <https://demo-risk-system.gcameron.com>.
2. Pick a theme before you start — the toggle is top right, and switching
   mid-demo is a distraction.
3. Open the tabs you'll need in advance: dashboard, INC-2026-018, CTL-02,
   actions filtered to overdue.
4. If the MCP server is connected, confirm it responds to `risk_summary` before
   the audience arrives.

## Numbers worth having memorised

| | |
|---|---|
| Incidents in the register | 22, over 12 months |
| Open | 6 — 1 critical, 3 high, 2 medium |
| Net loss, 12 months | £1.05m (£1.64m gross, £589k recovered) |
| Net loss carried on open incidents | £622k |
| Actions | 37 raised, 17 open, 4 overdue, 1 blocked |
| Controls | 20 — 7 effective, 10 partially effective, 3 ineffective |
| Largest single net loss | INC-2026-017, core banking outage, £340k |
| Most customers affected | INC-2026-017, 118,000 |
