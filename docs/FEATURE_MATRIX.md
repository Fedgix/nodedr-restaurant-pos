# Final feature matrix

Statuses reflect the tested portion, not every possible configuration or subfeature. Verification uses the isolated engine and selected real browser interfaces.

| Area | Status | Evidence and limits |
|---|---|---|
| Customer menu and branding | VERIFIED | Menu, branch portal toggle, logo/color/font/headline/cover configuration code; mobile menu and order browser checks |
| Customer accounts/history | VERIFIED | 20 accounts; isolated sessions; own history; expiry and ownership checks |
| Customer reservations | PARTIALLY VERIFIED | Request/list/cancel tested; staff allocation; no party-size edit or full slot capacity engine |
| Pre-orders | PARTIALLY VERIFIED | Scheduled collection order persisted; no reservation linkage |
| Waiter phone ordering | VERIFIED | Real mobile login, menu/table order, API additions/transfer and KOT persistence |
| Kitchen | VERIFIED | Real queue, status transitions and delayed-ticket investigation; no hardware certification |
| POS / tax calculations / discounts | VERIFIED | Server bill, authorized discounts, lifecycle and calculation tests; no GST certification |
| Payments / refunds | PARTIALLY VERIFIED | Manual cash/card/split/partial/refund records and idempotency tested; no provider settlement |
| Inventory / suppliers / waste | VERIFIED | Goods receipts, recipes, sale consumption, waste and stock ledger tests |
| Attendance / shifts / leave | VERIFIED | Actual assigned shifts, clock records, approval and overlap checks; no geofence/device validation |
| Payroll / salary statements | PARTIALLY VERIFIED | Monthly/hourly math, unpaid leave, tips, finalization and private statements; no statutory engine or salary payments |
| Owner dashboard | PARTIALLY VERIFIED | Real record-derived summary and operations browser page; exact local-midnight dashboard case not independently tested |
| Accounting / daily closing | PARTIALLY VERIFIED | Cash-close snapshot and stock/report checks; late posting/reopen policy remains open |
| Reports / export | PARTIALLY VERIFIED | Existing reports/export code and tests; not every report/export/browser path exercised |
| Notifications / automation | PARTIALLY VERIFIED | Local notifications and existing schedule tests; no external delivery acceptance |
| Printing | PARTIALLY VERIFIED | TCP sink, receipt/KOT code and diagnostics tests; no physical printer |
| Restaurant tenancy / role permissions | PARTIALLY VERIFIED | Permission and cross-restaurant tests pass; employee cross-branch isolation open |
| Deployment | BLOCKED | Build passes; Docker and production release not executed |
