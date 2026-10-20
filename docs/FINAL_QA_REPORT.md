# Final QA report

**Overall acceptance: PARTIALLY VERIFIED. Production/demo-wide acceptance is not granted.** Selected application workflows are demonstrable; open scope, access and environment limits remain.

| Measure | Result |
|---|---:|
| Workflow scenarios planned | 78 |
| Workflow scenarios executed | 77 |
| VERIFIED | 68 |
| PARTIALLY VERIFIED | 9 |
| FAILED in final recorded assertions | 0 |
| NOT IMPLEMENTED | 1 |
| Unit tests passed | 253 |
| Existing integration tests passed | 73 |
| Selected browser scenarios passed | 8 |
| Defect / hardening records | 12 |
| Reproduced product defect records fixed and regression verified | 8 |
| Additional hardening / timezone records | 2 |
| Open product acceptance records | 2 |

Counts refer to the latest retained result for each named scenario, not cumulative retries. SIM-G is classified partially verified because stock/report checks passed but a prior cash-close snapshot does not automatically lock later financial postings. It is not a claim of complete end-of-day reconciliation.

## What ran

20 real synthetic customer sign-in accounts; 20 staff accounts with different role permissions and actual shift assignments; five separate reviewer accounts; one fixture bootstrap owner. API requests changed and read actual application records through NestJS and Prisma. Browser automation interacted with real Next.js pages at mobile and desktop sizes and checked a persisted dietary instruction, a table order with KOTs and denied waiter payroll access. Scripts simulated users; no claim of 20 people physically testing is made.

Screenshots: customer-mobile.png, customer-booking.png, customer-history.png, waiter-mobile.png, kitchen.png, manager-team.png, owner-dashboard.png and employee-salary.png in qa-evidence.

## Blocked acceptance checks (outside the 78-case workflow denominator)

| Acceptance check | Status | Reason |
|---|---|---|
| Native PostgreSQL multi-connection / Docker acceptance | BLOCKED | Docker unavailable; isolated engine was PGlite |
| Live card decline / payment gateway / UPI settlement | BLOCKED | No live provider integration or credentials |
| External SMTP / WhatsApp / SMS delivery | BLOCKED | No delivery credentials; no real recipients contacted |
| Physical printer and cash drawer | BLOCKED | TCP sink/browser logic only; no hardware |
| Production backup/restore, outage and load acceptance | BLOCKED | No target infrastructure supplied |
| GitHub branch publication | BLOCKED | Connector create-branch 403; CLI push lacks credentials |
| Production hosting / HTTPS release | BLOCKED | No target credentials/domain or acceptance approval |
| Complete third-party legal / tax / payroll validation | BLOCKED | Dependency inventory exists; certification not performed |

## Missing or partial scope

Party-size editing is not implemented. Pre-orders are independent scheduled collection orders; linkage to a reservation is not implemented. Split tender is tested; separate per-person invoices are not. Late arrivals can be handled manually; automatic grace/release rules are absent. Customer complaint tickets are absent; delayed tickets can be investigated by staff. Payroll handles monthly/hourly pay, unpaid leave and tips, with salary statements, but no statutory engine, configurable allowances/deductions or salary-payment ledger.

## Decision

Use only as a controlled, clearly labelled demonstration with synthetic data. Resolve OPEN_ISSUES.md, define cash-close and branch-access policy, rerun on native PostgreSQL and target hardware, publish the corresponding source, and complete deployment/live-provider checks before production acceptance.
