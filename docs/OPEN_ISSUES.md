# Open issues and acceptance blockers

| ID | Priority | Issue | Required next action |
|---|---|---|---|
| FGX-011 | High | Additional payments/refunds can follow a daily cash-close snapshot; no enforced close-lock/reopen policy | Agree business-day rules; implement atomic close/posting guard or controlled adjustments; test final cash reconciliation |
| FGX-012 | High | Employee branch assignments are not enforced by common branch access check | Implement branch scoping across relevant routes and verify cross-branch denial on native PostgreSQL |
| SCOPE-01 | Medium | Customer reservation party-size edit missing | Add audited change workflow and capacity checks |
| SCOPE-02 | Medium | Reservation-linked meal pre-order missing | Link reservation and scheduled kitchen release without orphan/duplicate orders |
| SCOPE-03 | Medium | Separate per-person invoices not implemented | Define split invoice/tax allocation; preserve tested split-tender behavior |
| SCOPE-04 | Medium | Payroll allowances, configurable deductions, payment status and statutory slips missing | Confirm business/legal rules before implementation; statements do not prove salary payment |
| SCOPE-05 | Medium | Email verification/password recovery and customer complaint workflow missing | Define supported identity and service-recovery flows |
| SCOPE-06 | Medium | Automatic late/no-show grace rules and stronger public time-slot capacity allocation absent | Define reservation operating policy; public requests currently await staff allocation |
| QA-01 | High | PGlite single connection is not native concurrency acceptance | Run qa-native.cjs and integration suites on disposable native PostgreSQL; test concurrent checkout/add/cancel/close |
| QA-02 | Medium | Limited UI/device/load/empty-state coverage | Broaden mobile and cross-browser tests, large menus/lists, date-boundary and empty-report cases |
| EXT-01 | Blocker | GitHub write access unavailable | Grant the connection access to the new fork, then publish local development commit |
| EXT-02 | Blocker | Live payment/messaging, physical hardware and hosting not supplied | Configure sandbox then target environment; verify each separately |
| LEGAL-01 | Blocker | Tax/payroll and complete dependency/AGPL release review pending | Retain source/attribution and obtain appropriate release/legal validation |

Production release is not approved. Original master and upstream repository remain unchanged by this work. Local changes and reports are in the development branch and downloadable Git bundle.
