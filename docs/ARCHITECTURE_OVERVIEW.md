# Architecture overview

The browser reaches the Next.js web server; `/api` and Socket.IO requests proxy to NestJS. NestJS uses Prisma transactions against PostgreSQL. Shared schemas in packages/types validate requests. Staff auth uses an httpOnly session cookie, active-user lookup and permission decorators. Realtime branch rooms notify clients to refresh authoritative server records.

## Domain boundaries

- Orders owns pricing snapshots, KOT creation, settlement, cancellation, refunds and checkout stock deduction.
- Tables/reservations own the floor, booking lifecycle and seating.
- Public QR/kiosk endpoints expose only menu/order operations; they do not grant staff permissions.
- Inventory owns ingredients, recipes, stock, suppliers, purchases, goods receipts, waste and valuation.
- HR/attendance owns staff presence, shifts, leave and draft/final payroll. Accounting owns expenses, cash closing and ledger/reporting.
- Settings owns restaurant identity, branch tax mode, UPI details and operational configuration.
- Notifications, webhooks and email are best-effort external boundaries; success of a business transaction must not depend on their delivery.

## Extension approach

Preserve domain services. Add separate customer sessions and a customer portal without granting customer identities staff privileges. Improve reservation concurrency, attendance/leave integrity, payroll rounding/proration and owner operational visibility with regression tests. Preserve restaurant-specific names and logos, and add Fedgix product branding plus an explicit source/license link.

## Environments

Production uses Docker Compose with Postgres and persistent volumes, never the QA database. QA uses synthetic identities in an isolated database and records the database engine and limitations. Browser tests operate against actual Next.js and NestJS, not a static mock. Payment-provider, messaging-provider, hardware and legal acceptance are separate gates.
