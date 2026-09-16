-- Meridian Risk — demo seed data for Cloudflare D1
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
-- Organisation: Meridian Financial Group (fictional)
-- Dataset version: 1.0.0   as of 2026-09-16

-- -------------------------------------------------------------------------
-- Organisation
-- -------------------------------------------------------------------------

INSERT INTO departments (id, code, name, parent_department_id, location, cost_centre) VALUES
  (1, 'DEPT-01', 'Retail Banking Operations', NULL, 'Leeds', 'CC-1100'),
  (3, 'DEPT-03', 'Technology & Infrastructure', NULL, 'Manchester', 'CC-2100'),
  (5, 'DEPT-05', 'Finance', NULL, 'London', 'CC-3100'),
  (6, 'DEPT-06', 'Human Resources', NULL, 'London', 'CC-4100'),
  (7, 'DEPT-07', 'Compliance & Financial Crime', NULL, 'London', 'CC-5100'),
  (9, 'DEPT-09', 'Internal Audit', NULL, 'London', 'CC-6100'),
  (2, 'DEPT-02', 'Payments', 1, 'Leeds', 'CC-1120'),
  (4, 'DEPT-04', 'Information Security', 3, 'Manchester', 'CC-2140'),
  (8, 'DEPT-08', 'Customer Service', 1, 'Glasgow', 'CC-1160');

INSERT INTO users (id, full_name, email, job_title, department_id, role, status) VALUES
  (1, 'Priya Raman', 'priya.raman@meridian.example', 'Head of Operational Risk', 7, 'risk_manager', 'active'),
  (2, 'Daniel Okafor', 'daniel.okafor@meridian.example', 'Payments Operations Manager', 2, 'department_head', 'active'),
  (3, 'Sofia Marchetti', 'sofia.marchetti@meridian.example', 'Chief Information Security Officer', 4, 'department_head', 'active'),
  (4, 'James Whitfield', 'james.whitfield@meridian.example', 'Head of Technology', 3, 'department_head', 'active'),
  (5, 'Amara Nwosu', 'amara.nwosu@meridian.example', 'Head of Retail Operations', 1, 'department_head', 'active'),
  (6, 'Tom Beckett', 'tom.beckett@meridian.example', 'Financial Controller', 5, 'department_head', 'active'),
  (7, 'Lena Hofmann', 'lena.hofmann@meridian.example', 'Senior Compliance Officer', 7, 'risk_manager', 'active'),
  (8, 'Rahul Mehta', 'rahul.mehta@meridian.example', 'Infrastructure Engineer', 3, 'contributor', 'active'),
  (9, 'Grace Liu', 'grace.liu@meridian.example', 'Customer Service Manager', 8, 'department_head', 'active'),
  (10, 'Oliver Grant', 'oliver.grant@meridian.example', 'HR Business Partner', 6, 'department_head', 'active'),
  (11, 'Fatima Al-Hassan', 'fatima.alhassan@meridian.example', 'Operational Risk Analyst', 7, 'risk_analyst', 'active'),
  (12, 'Marcus Doyle', 'marcus.doyle@meridian.example', 'Payments Engineer', 2, 'contributor', 'active'),
  (13, 'Chloe Bennett', 'chloe.bennett@meridian.example', 'Internal Audit Lead', 9, 'auditor', 'active'),
  (14, 'Hassan Farouk', 'hassan.farouk@meridian.example', 'Security Analyst', 4, 'contributor', 'active'),
  (15, 'Ingrid Sorensen', 'ingrid.sorensen@meridian.example', 'Process Excellence Lead', 1, 'contributor', 'active'),
  (16, 'Peter Adeyemi', 'peter.adeyemi@meridian.example', 'Third-Party Risk Manager', 3, 'risk_manager', 'active');

-- -------------------------------------------------------------------------
-- Estate
-- -------------------------------------------------------------------------

INSERT INTO systems (id, code, name, description, vendor, hosting, criticality, owner_user_id, status) VALUES
  (1, 'SYS-01', 'Core Banking Platform', 'Ledger of record for retail accounts, balances and interest.', 'Temenos', 'on_premise', 'critical', 4, 'live'),
  (2, 'SYS-02', 'Payment Gateway', 'Outbound and inbound domestic and SWIFT payment routing.', 'FasterPay', 'hybrid', 'critical', 2, 'live'),
  (3, 'SYS-03', 'Customer CRM', 'Customer records, cases and complaint workflow.', 'Salesforce', 'saas', 'high', 9, 'live'),
  (4, 'SYS-04', 'Data Warehouse', 'Regulatory and management reporting data store.', 'Snowflake', 'saas', 'medium', 6, 'live'),
  (5, 'SYS-05', 'Identity & Access Management', 'Single sign-on, MFA and joiner/mover/leaver provisioning.', 'Okta', 'saas', 'critical', 3, 'live'),
  (6, 'SYS-06', 'Document Management', 'Customer documentation, KYC evidence and records retention.', 'Microsoft', 'saas', 'medium', 15, 'live'),
  (7, 'SYS-07', 'Loan Origination System', 'Application capture, credit decisioning and offer generation.', 'In-house', 'cloud', 'high', 5, 'live'),
  (8, 'SYS-08', 'Treasury Management System', 'Liquidity, FX and wholesale payment instruction management.', 'Finastra', 'on_premise', 'high', 6, 'live'),
  (9, 'SYS-09', 'Customer Mobile App', 'iOS and Android retail banking channel.', 'In-house', 'cloud', 'high', 4, 'live'),
  (10, 'SYS-10', 'Internet Banking Portal', 'Browser-based retail banking channel.', 'In-house', 'cloud', 'critical', 4, 'live'),
  (11, 'SYS-11', 'HR & Payroll', 'Employee records, payroll calculation and disbursement.', 'Workday', 'saas', 'medium', 10, 'live'),
  (12, 'SYS-12', 'General Ledger', 'Statutory books, journals and financial consolidation.', 'Oracle', 'on_premise', 'high', 6, 'live');

INSERT INTO processes (id, code, name, description, department_id, owner_user_id, criticality, frequency) VALUES
  (1, 'PRC-01', 'Domestic Payment Processing', 'Capture, validate and submit domestic payment files to clearing.', 2, 2, 'critical', 'daily'),
  (2, 'PRC-02', 'International Wire Transfers', 'SWIFT instruction creation, screening and settlement.', 2, 12, 'high', 'daily'),
  (3, 'PRC-03', 'Customer Onboarding (KYC)', 'Identity verification, screening and account opening.', 1, 15, 'high', 'continuous'),
  (4, 'PRC-04', 'Account Closure', 'Closure requests, balance settlement and records archival.', 1, 15, 'medium', 'continuous'),
  (5, 'PRC-05', 'Loan Underwriting', 'Credit assessment, affordability checks and decisioning.', 1, 5, 'high', 'continuous'),
  (6, 'PRC-06', 'Complaint Handling', 'Logging, investigation and resolution of customer complaints.', 8, 9, 'high', 'continuous'),
  (7, 'PRC-07', 'Month-End Financial Close', 'Journal posting, reconciliation and management reporting.', 5, 6, 'high', 'monthly'),
  (8, 'PRC-08', 'User Access Provisioning', 'Joiner, mover and leaver access grants and revocations.', 4, 3, 'critical', 'continuous'),
  (9, 'PRC-09', 'Change & Release Management', 'Approval, testing and deployment of production changes.', 3, 4, 'high', 'weekly'),
  (10, 'PRC-10', 'Third-Party Vendor Onboarding', 'Due diligence, contracting and ongoing supplier monitoring.', 3, 16, 'medium', 'continuous'),
  (11, 'PRC-11', 'Payroll Run', 'Salary calculation, approval and disbursement.', 6, 10, 'high', 'monthly'),
  (12, 'PRC-12', 'Transaction Monitoring (AML)', 'Screening, alert triage and suspicious activity reporting.', 7, 7, 'critical', 'daily'),
  (13, 'PRC-13', 'Interest & Fee Calculation', 'Rate maintenance, accrual and customer statement production.', 5, 6, 'high', 'monthly');

-- -------------------------------------------------------------------------
-- Risk taxonomy
-- -------------------------------------------------------------------------

INSERT INTO risk_categories (id, code, name, parent_id, basel_level) VALUES
  (1, 'RC-01', 'Internal Fraud', NULL, 1),
  (2, 'RC-02', 'External Fraud', NULL, 1),
  (3, 'RC-03', 'Employment Practices & Workplace Safety', NULL, 1),
  (4, 'RC-04', 'Clients, Products & Business Practices', NULL, 1),
  (5, 'RC-05', 'Damage to Physical Assets', NULL, 1),
  (6, 'RC-06', 'Business Disruption & System Failures', NULL, 1),
  (7, 'RC-07', 'Execution, Delivery & Process Management', NULL, 1),
  (8, 'RC-02a', 'Payment & Card Fraud', 2, 2),
  (9, 'RC-04a', 'Data Privacy Breach', 4, 2),
  (10, 'RC-04b', 'Regulatory Breach', 4, 2),
  (11, 'RC-06a', 'Systems Outage', 6, 2),
  (12, 'RC-06b', 'Change & Release Failure', 6, 2),
  (13, 'RC-07a', 'Data Entry & Processing Error', 7, 2),
  (14, 'RC-07b', 'Third-Party & Vendor Failure', 7, 2);

-- -------------------------------------------------------------------------
-- Controls
-- -------------------------------------------------------------------------

INSERT INTO controls (id, code, name, description, control_type, automation, frequency, owner_user_id, department_id, system_id, effectiveness, design_rating, last_tested_date, next_test_date, status) VALUES
  (1, 'CTL-01', 'Dual authorisation of payment files', 'Every outbound payment file requires release by a second authorised operator before submission to clearing.', 'preventive', 'semi_automated', 'per_transaction', 2, 2, 2, 'partially_effective', 'adequate', '2026-06-30', '2026-12-31', 'active'),
  (2, 'CTL-02', 'Duplicate payment file detection', 'Gateway rejects files whose hash and value date match a file submitted in the last 5 days.', 'detective', 'automated', 'per_transaction', 12, 2, 2, 'ineffective', 'deficient', '2026-03-31', '2026-09-30', 'active'),
  (3, 'CTL-03', 'Sanctions screening of wire instructions', 'Real-time screening of all outbound wires against consolidated sanctions lists before release.', 'preventive', 'automated', 'per_transaction', 7, 7, 8, 'partially_effective', 'adequate', '2026-05-15', '2026-11-15', 'active'),
  (4, 'CTL-04', 'Quarterly user access recertification', 'Department heads attest to the access held by their staff each quarter; unattested access is revoked.', 'detective', 'semi_automated', 'quarterly', 3, 4, 5, 'partially_effective', 'adequate', '2026-06-30', '2026-09-30', 'active'),
  (5, 'CTL-05', 'Automated leaver access revocation', 'HR termination record triggers same-day deprovisioning of all federated application access.', 'preventive', 'automated', 'per_event', 3, 4, 5, 'effective', 'strong', '2026-07-31', '2027-01-31', 'active'),
  (6, 'CTL-06', 'Mandatory MFA on all remote access', 'Phishing-resistant multi-factor authentication enforced for all externally reachable applications.', 'preventive', 'automated', 'continuous', 14, 4, 5, 'partially_effective', 'adequate', '2026-04-30', '2026-10-31', 'active'),
  (7, 'CTL-07', 'Change advisory board approval', 'All production changes require documented CAB approval, rollback plan and test evidence.', 'preventive', 'manual', 'per_event', 4, 3, NULL, 'partially_effective', 'adequate', '2026-02-28', '2026-08-31', 'active'),
  (8, 'CTL-08', 'Pre-release regression test suite', 'Automated regression pack must pass at 100% before a release is promoted to production.', 'preventive', 'automated', 'per_event', 8, 3, 9, 'partially_effective', 'deficient', '2026-07-15', '2027-01-15', 'active'),
  (9, 'CTL-09', 'Daily core banking batch reconciliation', 'Overnight batch output reconciled to control totals with breaks escalated before opening.', 'detective', 'semi_automated', 'daily', 6, 5, 1, 'effective', 'strong', '2026-06-30', '2026-12-31', 'active'),
  (10, 'CTL-10', 'Interest rate change independent review', 'Product rate changes are recalculated independently on a sample before release to production.', 'preventive', 'manual', 'per_event', 6, 5, 1, 'ineffective', 'deficient', '2026-01-31', '2026-09-30', 'active'),
  (11, 'CTL-11', 'Manual journal review threshold', 'Journals above GBP 250,000 require review and approval by the Financial Controller.', 'preventive', 'manual', 'per_transaction', 6, 5, 12, 'effective', 'adequate', '2026-06-30', '2026-12-31', 'active'),
  (12, 'CTL-12', 'Complaint SLA monitoring', 'Daily exception report of complaints approaching the 8-week regulatory deadline.', 'detective', 'automated', 'daily', 9, 8, 3, 'partially_effective', 'adequate', '2026-05-31', '2026-11-30', 'active'),
  (13, 'CTL-13', 'Records retention schedule enforcement', 'Automated deletion of customer documentation once the statutory retention period expires.', 'preventive', 'automated', 'monthly', 15, 1, 6, 'ineffective', 'deficient', '2026-03-31', '2026-09-30', 'active'),
  (14, 'CTL-14', 'Credit policy version control', 'Decision engine policy versions are signed off and pinned; deployment requires policy owner approval.', 'preventive', 'semi_automated', 'per_event', 5, 1, 7, 'effective', 'strong', '2026-06-15', '2026-12-15', 'active'),
  (15, 'CTL-15', 'Third-party resilience assessment', 'Annual assessment of critical vendors covering continuity, exit planning and concentration risk.', 'detective', 'manual', 'annual', 16, 3, NULL, 'partially_effective', 'adequate', '2026-02-28', '2027-02-28', 'active'),
  (16, 'CTL-16', 'DDoS protection and rate limiting', 'Edge protection with automatic mitigation and rate limiting on public banking channels.', 'preventive', 'automated', 'continuous', 8, 3, 10, 'effective', 'strong', '2026-08-31', '2027-02-28', 'active'),
  (17, 'CTL-17', 'Payroll pre-payment verification', 'Variance report comparing the current payroll run to the prior month, reviewed before disbursement.', 'detective', 'semi_automated', 'monthly', 10, 6, 11, 'partially_effective', 'adequate', '2026-06-30', '2026-12-31', 'active'),
  (18, 'CTL-18', 'Security awareness and phishing simulation', 'Mandatory annual training with quarterly simulated phishing campaigns and targeted follow-up.', 'preventive', 'semi_automated', 'quarterly', 14, 4, NULL, 'partially_effective', 'adequate', '2026-07-31', '2026-10-31', 'active'),
  (19, 'CTL-19', 'Statement production completeness check', 'Account count on the statement run reconciled to the eligible account population before dispatch.', 'detective', 'automated', 'monthly', 15, 1, 1, 'effective', 'adequate', '2026-05-31', '2026-11-30', 'active'),
  (20, 'CTL-20', 'Outbound correspondence address validation', 'Address matched to the customer record of truth at print time; mismatches are quarantined.', 'preventive', 'automated', 'per_transaction', 9, 8, 3, 'effective', 'adequate', '2026-04-30', '2026-10-31', 'active');

INSERT INTO control_processes (control_id, process_id) VALUES
  (1, 1), (1, 2), (2, 1), (3, 2), (3, 12), (4, 8), (5, 8), (6, 8),
  (7, 9), (8, 9), (9, 7), (9, 13), (10, 13), (11, 7), (12, 6), (13, 3),
  (13, 4), (14, 5), (15, 10), (16, 9), (17, 11), (18, 8), (19, 13), (20, 6);

-- -------------------------------------------------------------------------
-- Incidents
-- -------------------------------------------------------------------------

INSERT INTO incidents (id, reference, title, description, category_id, department_id, process_id, primary_system_id, status, severity, likelihood, impact, occurred_date, discovered_date, closed_date, reported_by_user_id, owner_user_id, gross_loss, recovery_amount, net_loss, currency, regulatory_reportable, customers_affected, root_cause, root_cause_category) VALUES
  (1, 'INC-2025-044', 'Statement run omitted 6,200 accounts', 'The October statement cycle excluded accounts whose product code had been migrated the previous week, so 6,200 customers received no statement. Detected by a customer complaint spike rather than by the production control.', 13, 1, 13, 1, 'closed', 'medium', 3, 2, '2025-10-09', '2025-10-14', '2025-12-05', 9, 15, 18500, 0, 18500, 'GBP', 0, 6200, 'Product code migration was not reflected in the statement eligibility query.', 'process_design'),
  (2, 'INC-2025-045', 'Branch flood damaged physical customer records', 'A burst pipe above the Leeds branch records room damaged approximately 40 archive boxes of pre-digitisation customer documentation. No customer-facing service was interrupted.', 5, 1, 4, 6, 'closed', 'low', 2, 2, '2025-10-27', '2025-10-27', '2025-11-28', 5, 15, 24000, 21000, 3000, 'GBP', 0, 0, 'Ageing building plumbing; records room located beneath a wet riser.', 'external_event'),
  (3, 'INC-2025-046', 'Third-party KYC provider outage halted onboarding', 'The identity verification provider suffered a 6-hour regional outage. New account applications could not be completed and 310 applications were abandoned.', 14, 1, 3, 3, 'closed', 'medium', 3, 3, '2025-11-14', '2025-11-14', '2026-01-23', 15, 16, 42000, 0, 42000, 'GBP', 0, 310, 'No secondary verification provider configured; single point of dependency.', 'third_party'),
  (4, 'INC-2025-047', 'Suspected internal expense fraud', 'Routine analytics identified a pattern of duplicated and inflated expense claims by a contractor over 14 months. Referred to HR and Internal Audit; contractor engagement terminated.', 1, 5, 7, 12, 'closed', 'high', 2, 4, '2025-12-03', '2025-12-03', '2026-03-18', 13, 6, 96400, 38000, 58400, 'GBP', 1, 0, 'Expense approval limits were not enforced for contractor cost codes.', 'control_failure'),
  (5, 'INC-2026-001', 'Failed change caused CRM downtime', 'A CRM integration release deployed without the agreed rollback plan. Case management was unavailable for 4 hours 20 minutes across the contact centre.', 12, 3, 9, 3, 'closed', 'medium', 3, 3, '2026-01-16', '2026-01-16', '2026-03-06', 9, 4, 31000, 0, 31000, 'GBP', 0, 0, 'CAB approved the change on the basis of incomplete test evidence.', 'control_failure'),
  (6, 'INC-2026-002', 'Manual journal error overstated provisions', 'A manual provision journal was posted with the value in the wrong currency column, overstating provisions by GBP 1.2m in the draft management accounts. Corrected before external reporting.', 13, 5, 7, 12, 'closed', 'medium', 3, 3, '2026-01-29', '2026-02-02', '2026-03-27', 6, 6, 0, 0, 0, 'GBP', 0, 0, 'Journal template lacked currency validation; reviewer checked total only.', 'human_error'),
  (7, 'INC-2026-003', 'Misdirected customer correspondence', 'Forty-one annual summary letters were despatched to superseded addresses following a bulk address update that did not propagate to the print queue.', 9, 8, 6, 3, 'closed', 'low', 2, 2, '2026-02-11', '2026-02-13', '2026-03-20', 9, 9, 4200, 0, 4200, 'GBP', 1, 41, 'Print queue consumed a cached address extract taken before the update.', 'system_failure'),
  (8, 'INC-2026-004', 'Internet banking degraded by volumetric attack', 'A sustained volumetric attack against the public banking portal degraded response times for 95 minutes. Edge mitigation engaged automatically; no data was exposed.', 11, 3, 9, 10, 'closed', 'high', 4, 3, '2026-03-05', '2026-03-05', '2026-04-17', 8, 3, 12000, 0, 12000, 'GBP', 1, 21000, 'Attack volume exceeded the previously configured rate-limit thresholds.', 'external_event'),
  (9, 'INC-2026-005', 'Loan decision engine applied stale credit policy', 'For nine days the decision engine served a superseded affordability policy, resulting in 68 applications being assessed against outdated thresholds. All affected cases were re-decisioned.', 10, 1, 5, 7, 'closed', 'high', 2, 4, '2026-03-24', '2026-04-02', '2026-06-12', 5, 5, 147000, 0, 147000, 'GBP', 1, 68, 'Policy deployment rolled back automatically but the pinned version was not re-applied.', 'system_failure'),
  (10, 'INC-2026-006', 'Data warehouse load failure corrupted regulatory report', 'A partial overnight load left duplicate rows in the exposures table. The draft regulatory return was produced from the corrupted dataset and required resubmission.', 7, 5, 7, 4, 'closed', 'medium', 3, 3, '2026-04-08', '2026-04-10', '2026-06-05', 6, 6, 26000, 0, 26000, 'GBP', 1, 0, 'Load job had no idempotency key and no completeness assertion before publish.', 'process_design'),
  (11, 'INC-2026-007', 'Wire to sanctioned counterparty not blocked at first pass', 'A USD wire matched a sanctions list entry only at the second screening pass, 40 minutes after instruction capture. The payment was stopped before settlement and reported.', 10, 7, 2, 8, 'closed', 'high', 2, 5, '2026-04-21', '2026-04-21', '2026-07-10', 7, 1, 0, 0, 0, 'GBP', 1, 1, 'Screening list refresh lagged 36 hours behind the published update.', 'control_failure'),
  (12, 'INC-2026-008', 'Complaint backlog breached regulatory deadline', 'Nineteen complaints exceeded the eight-week final response deadline during a period of elevated volumes and staff absence. Affected customers were contacted and compensated.', 10, 8, 6, 3, 'pending_action', 'medium', 4, 3, '2026-05-19', '2026-05-26', NULL, 9, 9, 38000, 0, 38000, 'GBP', 1, 19, 'SLA exception report was produced but not worked during the absence period.', 'capacity'),
  (13, 'INC-2026-009', 'Unauthorised system access retained by leaver', 'A leaver retained active access to the treasury system for 23 days after their termination date. Access logs confirm no use of the account after departure.', 7, 4, 8, 5, 'closed', 'high', 3, 4, '2026-05-30', '2026-06-22', '2026-08-14', 13, 3, 0, 0, 0, 'GBP', 0, 0, 'Treasury system is not federated to the IAM platform, so automated revocation did not apply.', 'control_failure'),
  (14, 'INC-2026-010', 'Payroll overpayment to 12 employees', 'A shift-allowance table was uploaded twice, doubling the allowance for 12 employees in the June run. Overpayments were recovered in the following cycle.', 13, 6, 11, 11, 'closed', 'medium', 3, 2, '2026-06-12', '2026-06-16', '2026-07-31', 10, 10, 21400, 19800, 1600, 'GBP', 0, 0, 'Variance report threshold was set above the value of the duplicated allowance.', 'control_failure'),
  (15, 'INC-2026-011', 'Vendor data centre power failure', 'A supplier data centre lost utility power and failed over to generator with a 12-minute gap, interrupting reporting extracts. No customer-facing systems were affected.', 14, 3, 10, 4, 'closed', 'medium', 2, 3, '2026-06-25', '2026-06-25', '2026-08-07', 8, 16, 9500, 9500, 0, 'GBP', 0, 0, 'Supplier generator transfer switch failed its automatic start sequence.', 'third_party'),
  (16, 'INC-2026-012', 'Card-not-present fraud spike', 'An enumeration attack drove a three-day spike in card-not-present fraud attempts. 214 transactions were authorised before velocity rules were retuned.', 8, 2, 12, 2, 'closed', 'high', 4, 4, '2026-07-02', '2026-07-03', '2026-09-01', 12, 2, 186000, 121000, 65000, 'GBP', 1, 189, 'Velocity rules did not account for low-value enumeration patterns.', 'control_failure'),
  (17, 'INC-2026-013', 'Incorrect interest applied to 1,840 savings accounts', 'A rate change was keyed against the wrong product tier, under-paying interest on 1,840 accounts for two months. Redress and interest adjustment are in progress.', 10, 5, 13, 1, 'pending_action', 'high', 3, 4, '2026-07-09', '2026-08-20', NULL, 6, 6, 212000, 0, 212000, 'GBP', 1, 1840, 'Independent recalculation was not performed; the reviewer approved on sight of the change ticket.', 'control_failure'),
  (18, 'INC-2026-014', 'Mobile app login failures after release', 'Release 8.4.0 introduced a token refresh defect causing intermittent login failures for approximately 11% of mobile sessions over 18 hours before rollback.', 12, 3, 9, 9, 'closed', 'medium', 4, 3, '2026-07-22', '2026-07-22', '2026-09-08', 8, 4, 16000, 0, 16000, 'GBP', 0, 34000, 'Regression pack had no coverage for expired-token refresh paths.', 'control_failure'),
  (19, 'INC-2026-015', 'KYC documents retained beyond policy period', 'An audit sample found identity documentation for closed accounts retained up to 3 years beyond the retention schedule because the deletion job silently failed.', 9, 1, 3, 6, 'under_investigation', 'medium', 3, 3, '2026-08-03', '2026-08-03', NULL, 13, 15, 0, 0, 0, 'GBP', 1, 4700, 'Retention job failure was logged but produced no alert or exception report.', 'control_failure'),
  (20, 'INC-2026-016', 'Phishing campaign harvested staff credentials', 'A targeted campaign impersonating the IT service desk captured credentials for 7 staff accounts. MFA blocked access on 6; one legacy account without MFA was accessed for 11 minutes.', 2, 4, 8, 5, 'under_investigation', 'high', 4, 4, '2026-08-14', '2026-08-15', NULL, 14, 3, 0, 0, 0, 'GBP', 0, 0, 'A legacy service account was exempted from MFA enforcement and never reviewed.', 'control_failure'),
  (21, 'INC-2026-017', 'Core banking outage during month-end close', 'A storage array firmware fault took the core banking platform offline for 3 hours 10 minutes on the second day of month-end close, delaying the close by a full day.', 11, 3, 7, 1, 'pending_action', 'critical', 3, 5, '2026-08-28', '2026-08-28', NULL, 8, 4, 340000, 0, 340000, 'GBP', 1, 118000, 'Firmware level was outside the vendor support matrix; the patch window had been deferred three times.', 'control_failure'),
  (22, 'INC-2026-018', 'Duplicate payment file submitted to clearing', 'A domestic payment file was submitted twice after an operator retried a timed-out upload. Duplicate detection did not fire because the retry produced a new file hash.', 13, 2, 1, 2, 'open', 'high', 3, 4, '2026-09-04', '2026-09-05', NULL, 12, 2, 412000, 380000, 32000, 'GBP', 1, 2140, 'Duplicate detection keys on file hash only; a re-generated file defeats the check.', 'control_failure');

INSERT INTO incident_controls (incident_id, control_id, failure_mode) VALUES
  (22, 2, 'failed'), (22, 1, 'partially_effective'), (21, 7, 'failed'), (20, 6, 'partially_effective'),
  (20, 18, 'partially_effective'), (19, 13, 'failed'), (17, 10, 'failed'), (18, 8, 'failed'),
  (16, 3, 'partially_effective'), (15, 15, 'not_applicable'), (14, 17, 'failed'), (13, 5, 'not_applicable'),
  (13, 4, 'failed'), (12, 12, 'failed'), (11, 3, 'partially_effective'), (10, 9, 'not_applicable'),
  (9, 14, 'failed'), (8, 16, 'effective'), (7, 20, 'failed'), (6, 11, 'partially_effective'),
  (5, 7, 'failed'), (4, 11, 'failed'), (3, 15, 'failed'), (1, 19, 'not_applicable');

INSERT INTO incident_systems (incident_id, system_id, impact_type) VALUES
  (22, 2, 'source'), (22, 1, 'affected'), (21, 1, 'source'), (21, 10, 'affected'),
  (21, 9, 'affected'), (21, 12, 'affected'), (20, 5, 'source'), (20, 8, 'affected'),
  (19, 6, 'source'), (18, 9, 'source'), (18, 5, 'affected'), (17, 1, 'source'),
  (16, 2, 'source'), (15, 4, 'source'), (14, 11, 'source'), (13, 5, 'source'),
  (13, 8, 'affected'), (12, 3, 'source'), (11, 8, 'source'), (10, 4, 'source'),
  (10, 12, 'affected'), (9, 7, 'source'), (8, 10, 'source'), (8, 9, 'affected'),
  (7, 3, 'source');

INSERT INTO incident_systems (incident_id, system_id, impact_type) VALUES
  (6, 12, 'source'), (5, 3, 'source'), (4, 12, 'source'), (3, 3, 'affected'),
  (2, 6, 'affected'), (1, 1, 'source');

-- -------------------------------------------------------------------------
-- Actions
-- -------------------------------------------------------------------------

INSERT INTO actions (id, reference, title, description, incident_id, control_id, action_type, priority, status, owner_user_id, department_id, created_date, due_date, completed_date, progress_pct) VALUES
  (1, 'ACT-001', 'Re-key duplicate detection on value date and control totals', 'Change the gateway duplicate check to key on originator, value date and file control totals rather than file hash alone.', 22, 2, 'enhance_control', 'critical', 'in_progress', 12, 2, '2026-09-05', '2026-10-17', NULL, 40),
  (2, 'ACT-002', 'Add idempotent upload tokens to the payments portal', 'Issue a single-use submission token so an operator retry cannot create a second logical submission.', 22, 1, 'new_control', 'high', 'not_started', 12, 2, '2026-09-05', '2026-11-28', NULL, 0),
  (3, 'ACT-003', 'Recall and reconcile duplicated payments', 'Work the clearing recall file and reconcile recovered value against the duplicated batch.', 22, NULL, 'remediate', 'critical', 'in_progress', 2, 2, '2026-09-05', '2026-09-19', NULL, 75),
  (4, 'ACT-004', 'Bring storage array firmware into the vendor support matrix', 'Apply the vendor-supported firmware level across both arrays and re-baseline the patch calendar.', 21, 7, 'remediate', 'critical', 'in_progress', 8, 3, '2026-08-29', '2026-09-30', NULL, 60),
  (5, 'ACT-005', 'Introduce a deferral limit for critical patch windows', 'No more than one deferral of a critical infrastructure patch window without CIO sign-off.', 21, 7, 'new_control', 'high', 'not_started', 4, 3, '2026-08-29', '2026-10-31', NULL, 0),
  (6, 'ACT-006', 'Freeze infrastructure change during month-end close', 'Add a standing change freeze covering the first three working days of each month for core banking.', 21, 7, 'enhance_control', 'medium', 'blocked', 4, 3, '2026-08-29', '2026-09-12', NULL, 20),
  (7, 'ACT-007', 'Remove all MFA enforcement exemptions', 'Enumerate every account exempted from MFA, migrate service accounts to certificate authentication and remove the exemption group.', 20, 6, 'remediate', 'critical', 'in_progress', 14, 4, '2026-08-16', '2026-09-26', NULL, 55),
  (8, 'ACT-008', 'Quarterly review of authentication exemptions', 'Add an exemption register reviewed each quarter alongside access recertification.', 20, 4, 'new_control', 'high', 'not_started', 3, 4, '2026-08-16', '2026-11-14', NULL, 0),
  (9, 'ACT-009', 'Run a targeted service-desk impersonation simulation', 'Deliver a phishing simulation modelled on the observed campaign with follow-up training for those who interact.', 20, 18, 'enhance_control', 'medium', 'in_progress', 14, 4, '2026-08-16', '2026-10-09', NULL, 30),
  (10, 'ACT-010', 'Add alerting to the records retention deletion job', 'Emit a failure alert and a monthly exception report when the retention job does not complete cleanly.', 19, 13, 'enhance_control', 'high', 'in_progress', 15, 1, '2026-08-05', '2026-09-04', NULL, 50),
  (11, 'ACT-011', 'Purge documentation held beyond the retention schedule', 'Identify and securely delete the over-retained population, with evidence retained for the regulator.', 19, 13, 'remediate', 'high', 'in_progress', 15, 1, '2026-08-05', '2026-10-30', NULL, 25),
  (12, 'ACT-012', 'Complete customer redress for savings interest shortfall', 'Recalculate and pay interest owed to the 1,840 affected accounts, including compensatory interest.', 17, NULL, 'remediate', 'critical', 'in_progress', 6, 5, '2026-08-21', '2026-10-16', NULL, 45),
  (13, 'ACT-013', 'Mandate independent recalculation of rate changes', 'Require a second preparer to recalculate a sample of accounts on a test environment before any rate change is released.', 17, 10, 'enhance_control', 'critical', 'in_progress', 6, 5, '2026-08-21', '2026-09-30', NULL, 65),
  (14, 'ACT-014', 'Add post-implementation interest verification report', 'Produce an automated first-accrual comparison after every rate change, reviewed by Finance.', 17, 10, 'new_control', 'high', 'not_started', 6, 5, '2026-08-21', '2026-12-11', NULL, 0),
  (15, 'ACT-015', 'Recruit two additional complaint handlers', 'Increase permanent handler capacity to absorb seasonal volume and absence.', 12, NULL, 'remediate', 'medium', 'in_progress', 9, 8, '2026-05-27', '2026-08-14', NULL, 70),
  (16, 'ACT-016', 'Escalate the complaint SLA exception report to a named deputy', 'Name a deputy reviewer so the daily exception report is always worked during absence.', 12, 12, 'enhance_control', 'high', 'completed', 9, 8, '2026-05-27', '2026-07-04', '2026-06-27', 100),
  (17, 'ACT-017', 'Federate the treasury system to the IAM platform', 'Bring the treasury system into single sign-on so automated leaver revocation applies.', 13, 5, 'enhance_control', 'high', 'in_progress', 3, 4, '2026-06-23', '2026-07-31', NULL, 80),
  (18, 'ACT-018', 'Reconcile non-federated applications to the leaver feed monthly', 'Interim control: monthly reconciliation of remaining non-federated application accounts to HR leavers.', 13, 4, 'new_control', 'medium', 'completed', 14, 4, '2026-06-23', '2026-08-07', '2026-08-04', 100),
  (19, 'ACT-019', 'Retune card velocity rules for low-value enumeration', 'Add velocity and decline-rate rules covering low-value probing patterns across merchant categories.', 16, 3, 'enhance_control', 'high', 'completed', 12, 2, '2026-07-04', '2026-08-15', '2026-08-12', 100),
  (20, 'ACT-020', 'Pursue scheme chargeback recoveries', 'Lodge chargebacks for eligible authorised fraudulent transactions and track recovery.', 16, NULL, 'remediate', 'medium', 'completed', 2, 2, '2026-07-04', '2026-08-29', '2026-08-27', 100),
  (21, 'ACT-021', 'Extend the regression pack to token refresh paths', 'Add automated coverage for expired, rotated and revoked token refresh scenarios on mobile.', 18, 8, 'enhance_control', 'high', 'completed', 8, 3, '2026-07-23', '2026-09-04', '2026-09-02', 100),
  (22, 'ACT-022', 'Add a canary release stage for the mobile channel', 'Route 2% of sessions to a new release for 60 minutes before full rollout.', 18, 8, 'new_control', 'medium', 'in_progress', 8, 3, '2026-07-23', '2026-10-23', NULL, 35),
  (23, 'ACT-023', 'Increase sanctions list refresh frequency to hourly', 'Move the screening list refresh from daily to hourly with a staleness alert.', 11, 3, 'enhance_control', 'critical', 'completed', 7, 7, '2026-04-22', '2026-06-05', '2026-06-03', 100),
  (24, 'ACT-024', 'Add completeness assertion to warehouse publish step', 'Block publication of the exposures dataset unless row counts and checksums match the source extract.', 10, 9, 'new_control', 'high', 'completed', 6, 5, '2026-04-11', '2026-05-29', '2026-05-22', 100),
  (25, 'ACT-025', 'Make warehouse load jobs idempotent', 'Introduce load keys so a partial re-run replaces rather than appends.', 10, NULL, 'remediate', 'medium', 'completed', 8, 3, '2026-04-11', '2026-06-05', '2026-05-30', 100);

INSERT INTO actions (id, reference, title, description, incident_id, control_id, action_type, priority, status, owner_user_id, department_id, created_date, due_date, completed_date, progress_pct) VALUES
  (26, 'ACT-026', 'Re-pin credit policy version after automated rollback', 'Ensure the decision engine re-applies the approved policy version on any automated rollback.', 9, 14, 'enhance_control', 'critical', 'completed', 5, 1, '2026-04-03', '2026-05-15', '2026-05-09', 100),
  (27, 'ACT-027', 'Re-decision affected loan applications', 'Re-assess the 68 affected applications against the correct policy and contact customers.', 9, NULL, 'remediate', 'high', 'completed', 5, 1, '2026-04-03', '2026-05-29', '2026-05-26', 100),
  (28, 'ACT-028', 'Raise edge rate-limit thresholds and add attack playbook', 'Retune mitigation thresholds for the public portal and document the response playbook.', 8, 16, 'enhance_control', 'high', 'completed', 8, 3, '2026-03-06', '2026-04-17', '2026-04-14', 100),
  (29, 'ACT-029', 'Source a secondary identity verification provider', 'Contract a fallback KYC provider and implement automatic failover.', 3, 15, 'new_control', 'high', 'completed', 16, 3, '2025-11-17', '2026-01-23', '2026-01-20', 100),
  (30, 'ACT-030', 'Enforce approval limits on contractor cost codes', 'Apply the standard expense approval hierarchy to all contractor cost codes.', 4, 11, 'enhance_control', 'high', 'completed', 6, 5, '2025-12-05', '2026-02-27', '2026-02-20', 100),
  (31, 'ACT-031', 'Require test evidence attachment before CAB approval', 'CAB tooling blocks approval unless test evidence and a rollback plan are attached.', 5, 7, 'enhance_control', 'high', 'completed', 4, 3, '2026-01-19', '2026-03-06', '2026-03-04', 100),
  (32, 'ACT-032', 'Add currency validation to the journal template', 'Reject journal uploads where the value column does not match the declared currency.', 6, 11, 'enhance_control', 'medium', 'completed', 6, 5, '2026-02-03', '2026-03-27', '2026-03-25', 100),
  (33, 'ACT-033', 'Source addresses for print at despatch time', 'Replace the cached address extract with a live lookup at print time.', 7, 20, 'enhance_control', 'medium', 'completed', 9, 8, '2026-02-14', '2026-03-20', '2026-03-17', 100),
  (34, 'ACT-034', 'Lower the payroll variance report threshold', 'Reduce the variance alert threshold so duplicated allowances are surfaced before disbursement.', 14, 17, 'enhance_control', 'medium', 'completed', 10, 6, '2026-06-17', '2026-07-31', '2026-07-29', 100),
  (35, 'ACT-035', 'Add statement run completeness reconciliation', 'Reconcile the statement population to eligible accounts before despatch each cycle.', 1, 19, 'new_control', 'high', 'completed', 15, 1, '2025-10-15', '2025-12-05', '2025-12-02', 100),
  (36, 'ACT-036', 'Relocate the Leeds branch records store', 'Move archived documentation out of the room beneath the wet riser and accelerate digitisation.', 2, NULL, 'remediate', 'low', 'completed', 15, 1, '2025-10-28', '2025-11-28', '2025-11-21', 100),
  (37, 'ACT-037', 'Add supplier generator transfer testing to the resilience assessment', 'Require evidence of successful transfer-switch testing in the annual vendor resilience assessment.', 15, 15, 'enhance_control', 'medium', 'completed', 16, 3, '2026-06-26', '2026-08-07', '2026-08-05', 100);

-- -------------------------------------------------------------------------
-- Incident timeline
-- -------------------------------------------------------------------------

INSERT INTO incident_updates (id, incident_id, user_id, created_at, note, status_from, status_to) VALUES
  (1, 22, 12, '2026-09-05T08:40:00Z', 'Duplicate submission confirmed from clearing acknowledgements. Recall file lodged for 2,140 items.', NULL, 'open'),
  (2, 22, 2, '2026-09-08T14:05:00Z', 'GBP 380k recovered to date. Root cause confirmed as hash-only duplicate keying.', 'open', 'open'),
  (3, 22, 1, '2026-09-11T09:15:00Z', 'Reportable under operational incident rules; notification drafted with Compliance.', 'open', 'open'),
  (4, 21, 8, '2026-08-28T06:20:00Z', 'Array failed over to the secondary controller. Core banking restored at 09:10.', NULL, 'open'),
  (5, 21, 4, '2026-09-02T11:00:00Z', 'Vendor confirms the firmware defect. Investigation closed; remediation actions raised.', 'under_investigation', 'pending_action'),
  (6, 20, 14, '2026-08-15T16:45:00Z', 'Seven accounts confirmed compromised. Six blocked by MFA; one legacy account accessed for 11 minutes.', 'open', 'under_investigation'),
  (7, 20, 3, '2026-09-09T10:30:00Z', 'Forensics found no data exfiltration. Exemption removal is 55% complete.', 'under_investigation', 'under_investigation'),
  (8, 19, 13, '2026-08-03T13:00:00Z', 'Raised from audit sample AUD-2026-11. Retention job last succeeded 2023-09.', NULL, 'open'),
  (9, 19, 15, '2026-08-27T15:20:00Z', 'Over-retained population sized at approximately 4,700 customers. Purge plan agreed with Legal.', 'open', 'under_investigation'),
  (10, 17, 6, '2026-08-20T09:05:00Z', 'Identified during the August accrual review. Two months of under-payment confirmed.', NULL, 'open'),
  (11, 17, 1, '2026-09-01T12:40:00Z', 'Redress methodology agreed. Provision of GBP 212k booked.', 'under_investigation', 'pending_action'),
  (12, 12, 9, '2026-05-26T10:10:00Z', 'Nineteen breaches confirmed. All customers contacted with a final response and goodwill payment.', 'open', 'under_investigation'),
  (13, 12, 9, '2026-07-06T09:45:00Z', 'Deputy reviewer control implemented. Awaiting recruitment completion before closure.', 'under_investigation', 'pending_action'),
  (14, 16, 12, '2026-07-03T18:30:00Z', 'Velocity rules retuned in production; attack volume collapsed within the hour.', 'open', 'under_investigation'),
  (15, 16, 2, '2026-09-01T11:15:00Z', 'Chargeback recoveries complete at GBP 121k. Incident closed.', 'pending_action', 'closed'),
  (16, 13, 3, '2026-08-14T16:00:00Z', 'Access removed and log review complete. No activity after the termination date.', 'pending_action', 'closed'),
  (17, 9, 5, '2026-06-12T14:25:00Z', 'All 68 applications re-decisioned; 4 outcomes changed and customers compensated.', 'pending_action', 'closed'),
  (18, 11, 7, '2026-07-10T10:00:00Z', 'Hourly list refresh live since June. Regulator notified within deadline. Closed.', 'pending_action', 'closed');

-- -------------------------------------------------------------------------
-- Back-fill self-referencing columns
-- -------------------------------------------------------------------------

UPDATE departments SET head_user_id = 5 WHERE id = 1;
UPDATE departments SET head_user_id = 2 WHERE id = 2;
UPDATE departments SET head_user_id = 4 WHERE id = 3;
UPDATE departments SET head_user_id = 3 WHERE id = 4;
UPDATE departments SET head_user_id = 6 WHERE id = 5;
UPDATE departments SET head_user_id = 10 WHERE id = 6;
UPDATE departments SET head_user_id = 1 WHERE id = 7;
UPDATE departments SET head_user_id = 9 WHERE id = 8;
UPDATE departments SET head_user_id = 13 WHERE id = 9;

UPDATE users SET manager_id = 5 WHERE id = 2;
UPDATE users SET manager_id = 4 WHERE id = 3;
UPDATE users SET manager_id = 1 WHERE id = 7;
UPDATE users SET manager_id = 4 WHERE id = 8;
UPDATE users SET manager_id = 5 WHERE id = 9;
UPDATE users SET manager_id = 1 WHERE id = 11;
UPDATE users SET manager_id = 2 WHERE id = 12;
UPDATE users SET manager_id = 3 WHERE id = 14;
UPDATE users SET manager_id = 5 WHERE id = 15;
UPDATE users SET manager_id = 4 WHERE id = 16;
