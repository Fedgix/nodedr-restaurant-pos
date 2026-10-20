# Fedgix Restaurant OS
## Implementation proposal

Prepared by Fedgix Technologies LLP • 20 October 2026
Client: [Restaurant / company name]
Commercial version: [To be agreed]

### 1. Executive summary

Fedgix proposes a customized restaurant management platform connecting guest ordering, floor service, kitchen preparation, billing, stock and staff administration. An initial working customization has been developed and evaluated using isolated synthetic operations. This proposal distinguishes demonstrated capability from the remaining delivery scope; production acceptance has not yet been granted.

### 2. Business objectives

Provide a consistent order flow, clearer kitchen coordination, traceable bills and inventory, accessible staff administration and a concise owner view. Business-impact targets and measurement baselines will be agreed with the client; no savings or revenue improvement is guaranteed by this document.

### 3. Proposed solution

A self-hosted web platform based on the AGPL-3.0 Nodedr OrderRestro application, customized by Fedgix. Customer, waiter, kitchen, cashier and management interfaces share authoritative application records and role permissions. Hosting can be planned for an appropriate restaurant LAN or server environment after infrastructure assessment.

### 4. Customer-facing functionality

Branded mobile menu, customer sign-in, personal order history/status, booking requests, QR ordering and takeaway/scheduled collection orders. Restaurant-specific logo, colors, typography, headline and cover photography can be configured. Reservation party-size editing, complete time-slot capacity rules and a linked reservation/pre-order package remain planned work. Collection payments are taken at the counter.

### 5. Waiter and kitchen workflows

Mobile waiter login and table/menu order entry, additions, instructions, kitchen progress and permitted transfers are demonstrated. Kitchen tickets support item quantities, notes, timers and preparation states. Delayed tickets can be investigated by managers. Physical printer and full device acceptance are separate checks.

### 6. Owner and manager dashboards

Record-derived sales and operational views show active service, tables, reservations, staff presence/leave, stock attention, expenses and payroll status. Empty and live records are used rather than invented production metrics. Sales dashboards identify gross sales; refund reconciliation belongs in financial reports. Branch-access and financial-close policies require completion before broader release.

### 7. Inventory and billing

Ingredient/recipe tracking, supplier receipts, adjustments and wastage are included in the demonstrated scope. Billing supports server calculations, permitted discounts, manual payment entries, partial payments, split tender and refunds. Separate per-person invoices and live provider settlement are not included in the verified scope. Tax configuration support is not a claim of statutory GST certification.

### 8. Employees and payroll

Staff profiles/roles, attendance, shifts, leave requests/decisions, monthly/hourly calculation, unpaid leave and tip allocation are present. Finalized salary statements have access checks. Configurable allowances/deductions, statutory payroll rules, salary-payment status and legally validated payslips require separate completion and validation. A salary statement does not prove salary payment.

### 9. Analytics and automation

Existing reporting/export tools and owner operational views provide service visibility. Local notifications and scheduled-task code exist. Email, WhatsApp/SMS, reminder delivery and other external services require explicit setup and end-to-end provider acceptance. No expensive AI service is required for these deterministic workflows.

### 10. Custom branding

Configure the restaurant’s identity and customer website appearance while retaining appropriate Fedgix product credits, upstream attribution and AGPL source access. Photography, menu content, translations and final visual direction will be supplied or approved by the client.

### 11. Implementation stages

| Stage | Deliverable | Status |
|---|---|---|
| Audit | Existing-system assessment and architecture | Completed locally |
| Initial development | Portal, management extensions and integrity fixes | Implemented with the stated verification limits |
| Demonstration QA | Synthetic role/API/browser simulation and regression | Executed; results below |
| Remaining product scope | Close/branch policy, reservation and extended payroll work | Pending agreement and implementation |
| Integration and release | Target infrastructure, provider/hardware checks and acceptance | Pending |

### 12. Verified feature matrix

| Area | Current status |
|---|---|
| Customer menu/accounts/history | VERIFIED for tested workflows |
| Mobile waiter ordering and kitchen state flow | VERIFIED for tested workflows |
| Inventory receipts/consumption/waste | VERIFIED for tested workflows |
| Reservation and scheduled ordering scope | PARTIALLY VERIFIED |
| Manual billing/payment/refund workflows | PARTIALLY VERIFIED; no live settlement |
| Attendance/leave and basic payroll | Tested core; extended payroll pending |
| Owner/financial reporting and closing | PARTIALLY VERIFIED; final close policy pending |
| Native server/hardware/live integrations | BLOCKED pending target setup |

The detailed engineering feature matrix is available with the implementation handover.

### 13. Testing methodology and results

Automated scripts created 20 fictional customer accounts, 20 staff accounts and five separate reviewer identities in an isolated QA environment. These were simulated users, not a human testing panel. Testing used actual API requests, persisted records and selected real mobile/desktop browser flows.

| Result | Count |
|---|---:|
| Unit tests passed | 253 |
| Existing integration tests passed | 73 |
| Planned workflow scenarios | 78 |
| VERIFIED | 68 |
| PARTIALLY VERIFIED | 9 |
| NOT IMPLEMENTED | 1 |
| Final recorded assertion failures | 0 |
| Selected browser scenarios passed | 8 |

The isolated database engine was PGlite; native PostgreSQL concurrency and Docker acceptance remain outstanding. Earlier failures were recorded and corrected where covered by completed regressions. Financial close and branch-scope acceptance issues remain disclosed. Test payments and local notifications are not verified live integrations.

### 14. Security and data handling

Role permissions, distinct customer/staff sessions, protected salary statements and server validation are used. Release work includes branch scoping, appropriately narrow HR/finance permissions, account recovery/verification, HTTPS, backup/restore, retention and deployment review. Synthetic fixtures must never be placed in a live restaurant database.

### 15. Hosting and third-party dependencies

Hosting specification and fees: [To be agreed]. Domain/TLS, backup storage, printer hardware and optional payment/messaging providers are separate dependencies. This is an AGPL-3.0 customization: corresponding source, license notices and upstream attribution must remain available as applicable. The client should not assume proprietary closed-source licensing or provider certification.

### 16. Warranty and support

Warranty duration: [To be agreed]. Support hours, response targets, maintenance, hosting administration and update responsibilities: [To be agreed]. Warranty covers agreed reproducible defects within the accepted scope; new features, provider changes, unsupported hardware and infrastructure incidents require the agreed maintenance/change process. Final contractual terms remain subject to agreement.

### 17. Investment placeholders

| Item | Amount |
|---|---|
| Implementation and customization | [Amount + applicable tax] |
| Remaining modules/integrations | [To be scoped] |
| Hosting and backups | [Recurring amount] |
| Maintenance/support | [Recurring amount] |
| Third-party services and hardware | [Quoted separately] |

Payment milestones and final commercial terms: [To be agreed].

### 18. Assumptions and exclusions

Client supplies approved menu/branding, operating rules, staff access requirements, tax/payroll guidance and target infrastructure access. Full production launch, live gateways/messaging, third-party delivery/accounting connectors, statutory certification, hardware procurement and unsupported device guarantees are excluded from the currently verified deliverable. Remaining scope is described openly rather than assumed complete.

### 19. Timeline placeholders

Discovery and confirmation: [Dates]. Remaining development: [Dates]. Integration and target-environment QA: [Dates]. User acceptance/training: [Dates]. Deployment/handover: [Dates]. No final delivery duration is committed in this draft.

### 20. Next steps

Review the demonstrated workflows and remaining scope; agree financial-close, branch-access, reservation and payroll rules; confirm commercial/support terms; complete source publication and target infrastructure setup; then run native database, provider, printer and user acceptance before approving production release.
