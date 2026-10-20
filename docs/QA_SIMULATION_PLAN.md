# QA simulation plan

Method: automated synthetic personas, not 20 human customers or 20 human employees. Use the real NestJS application, permission guards, Prisma persistence and real Next.js browser interfaces. No production database is used.

## Isolation and safety

`scripts/qa-with-db.mjs` always creates a disposable PGlite database in a new temporary directory and supplies its own DATABASE_URL. It does not load a primary app .env. Contact details use example.invalid. No gateway credential or SMTP/WhatsApp/SMS credential is supplied. Payments are manual QA records, never live charges or bank-confirmed settlements. Functional-volume runs bypass IP throttling; production throttling is not thereby verified.

## Accounts

20 customers QA-CUST-001..020; 20 staff QA-STAFF-001..020; five separate reviewer identities (owner, general manager, finance, operations, QA), plus a bootstrap fixture owner. Staff use role-specific permissions; custom HR and reviewer roles do not receive every permission. Each staff member receives an actual synthetic shift assignment. Passwords are QA-only constants in the executable fixture script; do not deploy these accounts.

## Sequence

1. Inspect source and establish initial build/test/migration gate (DEVELOPMENT_COMPLETION_REPORT.md).
2. Create fixtures only in isolated environment.
3. Execute customer C01..C20, staff S01..S25, reviewer permission cases and negative N01..N13 cases.
4. Execute service simulations A..G, including concurrent HTTP requests.
5. Execute browser B01..B08 against built Next.js and the same running API.
6. Save assertions, record failures, fix defects and rerun affected scenarios. Final evidence must identify unresolved cases.

## Coverage limits

PGlite is a PostgreSQL WASM engine, not native multi-process PostgreSQL. Its single Prisma connection can reproduce stale reads between asynchronous requests, but passing concurrency cases cannot certify native multi-connection isolation. Rerun on native PostgreSQL and Docker before acceptance. A TCP printer sink can verify bytes and retry logic but cannot certify physical printing. Browser automation checks selected flows, not every modal or supported device. Live notifications, real card declines, UPI bank settlement, production backups/restores and legal tax/payroll certification require separate validation.
