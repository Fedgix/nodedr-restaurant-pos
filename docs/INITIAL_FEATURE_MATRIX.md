# Initial feature matrix

Baseline: `949f7526800947b22e030f18213a659b3a45fa0d`. Inspection date: 2026-10-20. “Implemented” means code exists; it does not mean tested here.

| Feature | Initial classification | Code evidence and limits |
|---|---|---|
| Staff authentication and RBAC | IMPLEMENTED | src/auth; src/common/guards; per-route Auth decorators; cookies, bcrypt, TOTP |
| POS, billing, refunds | IMPLEMENTED | modules/orders; server pricing and settlement; no live gateway verification |
| Tables and reservations | PARTIALLY IMPLEMENTED | modules/tables and reservations; overlap and table-release risks found during inspection |
| Customer QR ordering and kiosk | IMPLEMENTED | modules/public; /order/[qrToken] and /kiosk/[token] |
| Customer account and personal history | MISSING | Customer is a CRM profile without credentials or session model |
| Customer website reservations and scheduled preorder | PARTIALLY IMPLEMENTED | integration API and scheduled orders exist; no customer account website |
| Waiter responsive POS | IMPLEMENTED | web POS, tables and mobile navigation; needs browser verification |
| Kitchen display and state machine | IMPLEMENTED | modules/kds; KotStatus transitions and realtime events |
| Inventory and suppliers | IMPLEMENTED | modules/inventory; recipes, purchase orders, receipts, waste and stock-plan tests |
| Attendance, shifts, leave | PARTIALLY IMPLEMENTED | attendance and hr; duplicate clock-in race and overlapping leave risk |
| Payroll calculations and finalization | PARTIALLY IMPLEMENTED | hr/payroll.calc; monthly/hourly, unpaid leave, tips; no statutory engine or payment ledger |
| Salary slips and employee self-service | MISSING | payroll lines exist, no dedicated employee payslip endpoint |
| Accounting and reports | IMPLEMENTED | accounting, ledger, reports; reconciliation/export logic; not independently certified |
| Owner dashboard | PARTIALLY IMPLEMENTED | dashboard summary/trends; missing consolidated operations cards; host timezone used |
| Notifications and scheduled jobs | IMPLEMENTED | notifications, report schedules, scheduled orders, reminders, SMTP; no credentials supplied |
| Printing | PARTIALLY IMPLEMENTED | receipt/KOT HTML, ESC/POS USB/network; hardware unavailable |
| Production deployment | BLOCKED | Docker compose supplied; no Docker executable in this workspace |
| GitHub publishing | BLOCKED | fork readable and push permission metadata true, but create_branch returned integration 403 |
