# Initial development completion gate

Date: 2026-10-20. Branch: fedgix/development (local).

## Implemented in this extension

- Disabled-by-default customer website with branch menu, restaurant logo/color/font/headline/cover settings, separate customer accounts and expiring hashed sessions, own order history/status, booking requests/cancellation and takeaway/scheduled collection orders.
- Owner operations overview from database records; restaurant-local dashboard day boundaries.
- Finalized employee salary statements, own access and manager access checks; print/save PDF interface.
- Reservation overlap locking, terminal-state checks and occupied-table preservation.
- Serialized duplicate clock-in protection, atomic clock-out, overlapping-leave prevention and atomic leave decision.
- Calendar-month payroll proration, exact unpaid date deduplication and nonnegative deductions.
- Fedgix product touchpoints and source/license links; upstream license retained.

## Gate evidence

Production build: PASSED (docs/qa-evidence/build.txt).
Type checking: PASSED (typecheck.txt).
Existing unit tests plus early regression tests: PASSED; rerun final suite after QA changes.
Migration SQL: all baseline migrations and new portal migration execute against isolated PGlite; see migrations.json. Native PostgreSQL/Prisma migrate deploy not verified.
Existing opt-in integration tests: attempted. Initial attempts failed during setup against the PGlite TCP bridge; a later run encountered hook/driver timeouts. These results are BLOCKED environment validation, not feature passes. Native Postgres and Docker are unavailable as runnable services here. Direct NestJS initialization and a direct Prisma read/write smoke test PASSED with the isolated harness.
Critical UI routes: compiled by the production build; browser execution remains pending.
GitHub publication: BLOCKED by integration HTTP 403; git HTTPS push has no credential helper.
Main database: no primary DATABASE_URL or .env was configured or seeded. All seed execution to date was inside qa-with-db.mjs, which creates a disposable database and replaces DATABASE_URL explicitly.

## External dependencies

No live payment gateway, bank confirmation, SMTP, WhatsApp/SMS provider, public domain, TLS endpoint, thermal printer or production hosting credential is supplied. Live delivery/payment/hardware verification is blocked.

## Gate decision

Initial implementation and build gate reached with explicit environment exceptions. Proceed with isolated formal simulation and remediation to collect further evidence; do not declare the demo production-ready or the full acceptance gate passed. Customer preorders are independent scheduled collection orders, not a reservation-linked package. Party-size editing, dedicated statutory salary slips/allowances/deductions/payment ledgers, live gateways and a complete payroll compliance policy remain outside completed scope.

## Subsequent verification update

The final harness resolved the initial setup blockers for isolated testing: all 73 existing integration tests passed. Final source build uses explicit Webpack after a Turbopack cache failure. Selected browser cases passed. Native PostgreSQL, production Docker, physical hardware and live integrations remain unverified. See FINAL_QA_REPORT.md for final counts and limits.
