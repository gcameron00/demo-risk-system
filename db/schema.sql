-- Meridian Risk — Cloudflare D1 schema
--
-- Operational risk management demo database.
-- Target: Cloudflare D1 (SQLite). Apply with:
--   npx wrangler d1 execute risk_demo --file=db/schema.sql --remote
--
-- Conventions
--   * Integer surrogate primary keys; human-facing identifiers live in `code`/`reference`.
--   * Dates are ISO-8601 strings (YYYY-MM-DD); timestamps are ISO-8601 UTC.
--   * Money is stored in minor-unit-agnostic REAL for demo simplicity; a production
--     system would use INTEGER minor units.
--   * Enumerations are enforced with CHECK constraints so the MCP server can rely on
--     a closed vocabulary when it builds filters.

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS incident_updates;
DROP TABLE IF EXISTS control_processes;
DROP TABLE IF EXISTS incident_systems;
DROP TABLE IF EXISTS incident_controls;
DROP TABLE IF EXISTS actions;
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS controls;
DROP TABLE IF EXISTS risk_categories;
DROP TABLE IF EXISTS processes;
DROP TABLE IF EXISTS systems;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;

-- ---------------------------------------------------------------------------
-- Organisation
-- ---------------------------------------------------------------------------

CREATE TABLE departments (
  id                   INTEGER PRIMARY KEY,
  code                 TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  parent_department_id INTEGER REFERENCES departments(id),
  head_user_id         INTEGER,  -- FK to users(id); set after users are loaded
  location             TEXT,
  cost_centre          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  job_title     TEXT,
  department_id INTEGER REFERENCES departments(id),
  manager_id    INTEGER REFERENCES users(id),
  role          TEXT NOT NULL DEFAULT 'contributor'
                  CHECK (role IN ('risk_manager','risk_analyst','department_head','contributor','auditor','admin')),
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_department ON users(department_id);

-- ---------------------------------------------------------------------------
-- Estate: systems and processes
-- ---------------------------------------------------------------------------

CREATE TABLE systems (
  id            INTEGER PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  vendor        TEXT,
  hosting       TEXT CHECK (hosting IN ('on_premise','cloud','saas','hybrid')),
  criticality   TEXT NOT NULL DEFAULT 'medium'
                  CHECK (criticality IN ('low','medium','high','critical')),
  owner_user_id INTEGER REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'live'
                  CHECK (status IN ('live','retired','in_development')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_systems_owner ON systems(owner_user_id);

CREATE TABLE processes (
  id            INTEGER PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  department_id INTEGER REFERENCES departments(id),
  owner_user_id INTEGER REFERENCES users(id),
  criticality   TEXT NOT NULL DEFAULT 'medium'
                  CHECK (criticality IN ('low','medium','high','critical')),
  frequency     TEXT CHECK (frequency IN ('continuous','daily','weekly','monthly','quarterly','annual','ad_hoc')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_processes_department ON processes(department_id);

-- ---------------------------------------------------------------------------
-- Risk taxonomy (Basel-style two-level event categories)
-- ---------------------------------------------------------------------------

CREATE TABLE risk_categories (
  id          INTEGER PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  parent_id   INTEGER REFERENCES risk_categories(id),
  basel_level INTEGER NOT NULL DEFAULT 1 CHECK (basel_level IN (1,2))
);

-- ---------------------------------------------------------------------------
-- Controls
-- ---------------------------------------------------------------------------

CREATE TABLE controls (
  id               INTEGER PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  description      TEXT,
  control_type     TEXT NOT NULL
                     CHECK (control_type IN ('preventive','detective','corrective','directive')),
  automation       TEXT NOT NULL DEFAULT 'manual'
                     CHECK (automation IN ('manual','semi_automated','automated')),
  frequency        TEXT CHECK (frequency IN ('continuous','per_transaction','per_event','daily','weekly','monthly','quarterly','annual')),
  owner_user_id    INTEGER REFERENCES users(id),
  department_id    INTEGER REFERENCES departments(id),
  system_id        INTEGER REFERENCES systems(id),
  effectiveness    TEXT NOT NULL DEFAULT 'not_tested'
                     CHECK (effectiveness IN ('effective','partially_effective','ineffective','not_tested')),
  design_rating    TEXT CHECK (design_rating IN ('strong','adequate','deficient')),
  last_tested_date TEXT,
  next_test_date   TEXT,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','retired','proposed')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_controls_owner ON controls(owner_user_id);
CREATE INDEX idx_controls_effectiveness ON controls(effectiveness);

-- A control can cover many processes; a process is covered by many controls.
CREATE TABLE control_processes (
  control_id INTEGER NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  process_id INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  PRIMARY KEY (control_id, process_id)
);

-- ---------------------------------------------------------------------------
-- Incidents
-- ---------------------------------------------------------------------------

CREATE TABLE incidents (
  id                    INTEGER PRIMARY KEY,
  reference             TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT,
  category_id           INTEGER REFERENCES risk_categories(id),
  department_id         INTEGER REFERENCES departments(id),
  process_id            INTEGER REFERENCES processes(id),
  primary_system_id     INTEGER REFERENCES systems(id),
  status                TEXT NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','under_investigation','pending_action','closed')),
  severity              TEXT NOT NULL DEFAULT 'medium'
                          CHECK (severity IN ('low','medium','high','critical')),
  likelihood            INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact                INTEGER CHECK (impact BETWEEN 1 AND 5),
  occurred_date         TEXT NOT NULL,
  discovered_date       TEXT,
  closed_date           TEXT,
  reported_by_user_id   INTEGER REFERENCES users(id),
  owner_user_id         INTEGER REFERENCES users(id),
  gross_loss            REAL NOT NULL DEFAULT 0,
  recovery_amount       REAL NOT NULL DEFAULT 0,
  net_loss              REAL NOT NULL DEFAULT 0,
  currency              TEXT NOT NULL DEFAULT 'GBP',
  regulatory_reportable  INTEGER NOT NULL DEFAULT 0 CHECK (regulatory_reportable IN (0,1)),
  customers_affected    INTEGER NOT NULL DEFAULT 0,
  root_cause            TEXT,
  root_cause_category   TEXT CHECK (root_cause_category IN
                          ('human_error','control_failure','system_failure','process_design','third_party','external_event','capacity','other')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_department ON incidents(department_id);
CREATE INDEX idx_incidents_occurred ON incidents(occurred_date);

-- Which controls were in scope when the incident happened, and how they performed.
CREATE TABLE incident_controls (
  incident_id  INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  control_id   INTEGER NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  failure_mode TEXT NOT NULL DEFAULT 'failed'
                 CHECK (failure_mode IN ('failed','partially_effective','effective','not_applicable','absent')),
  PRIMARY KEY (incident_id, control_id)
);

-- An incident can touch several systems beyond its primary one.
CREATE TABLE incident_systems (
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  system_id   INTEGER NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  impact_type TEXT NOT NULL DEFAULT 'affected'
                CHECK (impact_type IN ('source','affected','recovery')),
  PRIMARY KEY (incident_id, system_id)
);

-- ---------------------------------------------------------------------------
-- Actions (mitigations: remediate, enhance an existing control, add a new one)
-- ---------------------------------------------------------------------------

CREATE TABLE actions (
  id             INTEGER PRIMARY KEY,
  reference      TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  description    TEXT,
  incident_id    INTEGER REFERENCES incidents(id) ON DELETE SET NULL,
  control_id     INTEGER REFERENCES controls(id) ON DELETE SET NULL,
  action_type    TEXT NOT NULL DEFAULT 'remediate'
                   CHECK (action_type IN ('remediate','enhance_control','new_control','accept_risk','investigate')),
  priority       TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low','medium','high','critical')),
  status         TEXT NOT NULL DEFAULT 'not_started'
                   CHECK (status IN ('not_started','in_progress','blocked','completed','cancelled')),
  owner_user_id  INTEGER REFERENCES users(id),
  department_id  INTEGER REFERENCES departments(id),
  created_date   TEXT NOT NULL,
  due_date       TEXT,
  completed_date TEXT,
  progress_pct   INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_due ON actions(due_date);
CREATE INDEX idx_actions_incident ON actions(incident_id);
CREATE INDEX idx_actions_owner ON actions(owner_user_id);

-- ---------------------------------------------------------------------------
-- Incident timeline
-- ---------------------------------------------------------------------------

CREATE TABLE incident_updates (
  id          INTEGER PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL,
  note        TEXT NOT NULL,
  status_from TEXT,
  status_to   TEXT
);

CREATE INDEX idx_incident_updates_incident ON incident_updates(incident_id);

-- ---------------------------------------------------------------------------
-- Views — the read surface the MCP server and the web UI share
-- ---------------------------------------------------------------------------

-- Incidents with their lookups resolved, plus derived action counts.
CREATE VIEW v_incident_summary AS
SELECT
  i.id,
  i.reference,
  i.title,
  i.status,
  i.severity,
  i.likelihood,
  i.impact,
  i.likelihood * i.impact          AS risk_score,
  i.occurred_date,
  i.discovered_date,
  i.closed_date,
  i.gross_loss,
  i.net_loss,
  i.currency,
  i.regulatory_reportable,
  i.customers_affected,
  i.root_cause_category,
  d.name                           AS department_name,
  p.name                           AS process_name,
  s.name                           AS system_name,
  rc.name                          AS category_name,
  owner.full_name                  AS owner_name,
  reporter.full_name               AS reported_by_name,
  (SELECT COUNT(*) FROM actions a WHERE a.incident_id = i.id)                              AS action_count,
  (SELECT COUNT(*) FROM actions a WHERE a.incident_id = i.id AND a.status <> 'completed')   AS open_action_count
FROM incidents i
LEFT JOIN departments    d        ON d.id  = i.department_id
LEFT JOIN processes      p        ON p.id  = i.process_id
LEFT JOIN systems        s        ON s.id  = i.primary_system_id
LEFT JOIN risk_categories rc      ON rc.id = i.category_id
LEFT JOIN users          owner    ON owner.id    = i.owner_user_id
LEFT JOIN users          reporter ON reporter.id = i.reported_by_user_id;

-- Actions with their incident and control context, and an overdue flag.
CREATE VIEW v_action_summary AS
SELECT
  a.id,
  a.reference,
  a.title,
  a.action_type,
  a.priority,
  a.status,
  a.created_date,
  a.due_date,
  a.completed_date,
  a.progress_pct,
  CASE
    WHEN a.status IN ('completed','cancelled') THEN 0
    WHEN a.due_date IS NULL                    THEN 0
    WHEN a.due_date < date('now')              THEN 1
    ELSE 0
  END                       AS is_overdue,
  i.reference               AS incident_reference,
  i.title                   AS incident_title,
  i.severity                AS incident_severity,
  c.code                    AS control_code,
  c.name                    AS control_name,
  u.full_name               AS owner_name,
  d.name                    AS department_name
FROM actions a
LEFT JOIN incidents   i ON i.id = a.incident_id
LEFT JOIN controls    c ON c.id = a.control_id
LEFT JOIN users       u ON u.id = a.owner_user_id
LEFT JOIN departments d ON d.id = a.department_id;

-- Controls with their coverage and failure history — the "which controls keep
-- letting us down" question.
CREATE VIEW v_control_health AS
SELECT
  c.id,
  c.code,
  c.name,
  c.control_type,
  c.automation,
  c.frequency,
  c.effectiveness,
  c.design_rating,
  c.last_tested_date,
  c.next_test_date,
  u.full_name AS owner_name,
  d.name      AS department_name,
  s.name      AS system_name,
  (SELECT COUNT(*) FROM incident_controls ic
     WHERE ic.control_id = c.id AND ic.failure_mode = 'failed')                  AS failed_incident_count,
  (SELECT COUNT(*) FROM incident_controls ic WHERE ic.control_id = c.id)         AS linked_incident_count,
  (SELECT COUNT(*) FROM actions a
     WHERE a.control_id = c.id AND a.status <> 'completed')                      AS open_action_count,
  (SELECT COUNT(*) FROM control_processes cp WHERE cp.control_id = c.id)         AS process_coverage_count
FROM controls c
LEFT JOIN users       u ON u.id = c.owner_user_id
LEFT JOIN departments d ON d.id = c.department_id
LEFT JOIN systems     s ON s.id = c.system_id;

-- Per-department exposure, the shape a heat map or a management pack needs.
CREATE VIEW v_department_exposure AS
SELECT
  d.id,
  d.code,
  d.name,
  COUNT(i.id)                                                          AS incident_count,
  SUM(CASE WHEN i.status <> 'closed' THEN 1 ELSE 0 END)                AS open_incident_count,
  SUM(CASE WHEN i.severity IN ('high','critical') THEN 1 ELSE 0 END)   AS significant_incident_count,
  COALESCE(SUM(i.net_loss), 0)                                         AS net_loss_total,
  (SELECT COUNT(*) FROM actions a
     WHERE a.department_id = d.id AND a.status <> 'completed')          AS open_action_count
FROM departments d
LEFT JOIN incidents i ON i.department_id = d.id
GROUP BY d.id, d.code, d.name;
