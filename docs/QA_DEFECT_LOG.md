# QA defect log

Fixed means the named regression was rerun; code changes alone are not counted. Inspection findings are distinguished from reproduced failures.

## FGX-001 — Payroll across months

- Scenario / role: HR/payroll.
- Severity: High.
- Reproduction: Run monthly pay 31000 for Feb 1–Mar 31, 2026.
- Expected: 62000.
- Actual: 65321.43.
- Root cause: First month length applied to all days.
- Correction / next action: Sum each month’s calendar-day fraction; exact unpaid dates and capped deductions.
- Evidence / regression: payroll-cross-month.spec.ts; payroll-before.txt and regression-after.txt.
- Final status: FIXED / VERIFIED.

## FGX-002 — Excess unpaid leave

- Scenario / role: HR/payroll.
- Severity: High.
- Reproduction: Two-day period with four unpaid dates.
- Expected: No negative salary.
- Actual: -2000 net salary.
- Root cause: Deduction uncapped.
- Correction / next action: Cap deduction at base pay; deduplicate exact leave dates.
- Evidence / regression: payroll-cross-month.spec.ts; payroll-before.txt.
- Final status: FIXED / VERIFIED.

## FGX-003 — Reservation cancellation releases occupied table

- Scenario / role: Manager.
- Severity: High.
- Reproduction: Create table booking and unpaid dine-in bill; cancel booking.
- Expected: Keep table occupied.
- Actual: Table became available.
- Root cause: Unconditional reservation side effect.
- Correction / next action: Check open orders and other bookings in locked transaction.
- Evidence / regression: reservations-before.txt; reservations.service.spec.ts; N07.
- Final status: FIXED / VERIFIED.

## FGX-004 — Overlapping or revived reservation

- Scenario / role: Manager.
- Severity: High.
- Reproduction: Create overlapping table intervals; revive completed booking.
- Expected: Reject conflicts and terminal-state reversal.
- Actual: Both accepted.
- Root cause: No interval check or lifecycle guard.
- Correction / next action: Table lock, interval comparison and transition map.
- Evidence / regression: reservations-before.txt; N06; regression-after.txt.
- Final status: FIXED / VERIFIED.

## FGX-005 — Concurrent additions undercount bill

- Scenario / role: Waiters.
- Severity: Critical.
- Reproduction: Submit additions of 60 and 120 to an existing 120 bill concurrently.
- Expected: 300 total.
- Actual: 240 total despite added item rows.
- Root cause: Pre-transaction item snapshot reused.
- Correction / next action: Lock order; reread current active items and payment state inside transaction.
- Evidence / regression: simulation-before-fixes.json N12 failure; final N12 and N13 passes.
- Final status: FIXED / VERIFIED in isolated engine.

## FGX-006 — Dietary note dropped by new customer UI

- Scenario / role: Customer.
- Severity: High.
- Reproduction: Enter dietary instructions and submit cart.
- Expected: Kitchen note persists.
- Actual: New UI sent notes instead of kitchenNote.
- Root cause: Frontend/API field mismatch.
- Correction / next action: Map item instructions to kitchenNote; check persisted order item in browser test.
- Evidence / regression: C18 early failure; final C18 and B01.
- Final status: FIXED / VERIFIED.

## FGX-007 — Concurrent new orders reuse number

- Scenario / role: Waiters.
- Severity: High.
- Reproduction: Create five orders concurrently.
- Expected: Five unique order numbers.
- Actual: 409 branchId/orderNumber conflict.
- Root cause: Sequence read outside insert transaction.
- Correction / next action: Lock branch and allocate numeric maximum inside transaction.
- Evidence / regression: simulation-before-final-fixes.json / prior simulation logs SIM-B; final SIM-B.
- Final status: FIXED / VERIFIED in isolated engine.

## FGX-008 — Network printer diagnostics fail without USB

- Scenario / role: Cashier.
- Severity: Medium.
- Reproduction: Configure TCP printer sink on a host without usable USB.
- Expected: Network diagnostics return reachable.
- Actual: 500 from unrelated USB probe.
- Root cause: USB enumeration happened before transport selection.
- Correction / next action: Probe only configured transport; tolerate inaccessible USB bus.
- Evidence / regression: existing-orders-lifecycle.json: earlier two failures, final 24/24 passes.
- Final status: FIXED / VERIFIED against TCP sink.

## FGX-009 — Duplicate clock/overlapping leave integrity

- Scenario / role: Staff.
- Severity: High.
- Reproduction: Repeat clock-in/out and submit overlapping leave.
- Expected: One open attendance row; active leave dates unique.
- Actual: Race/overlap risk found in code inspection.
- Root cause: Check then write, no serialized leave guard.
- Correction / next action: Employee row lock; atomic clock-out and leave decision; date overlap check.
- Evidence / regression: N04 and S12 pass; pre-change race was not executed.
- Final status: HARDENED / sequential checks VERIFIED; native race not verified.

## FGX-010 — Dashboard day boundaries

- Scenario / role: Owner.
- Severity: Medium.
- Reproduction: Host UTC with restaurant timezone Asia/Kolkata.
- Expected: Restaurant-local day boundaries.
- Actual: Code used host timezone.
- Root cause: setHours(0) and local host date keys.
- Correction / next action: Use configured restaurant timezone and shared zonedRange helpers.
- Evidence / regression: Code review plus existing time unit tests; exact midnight dashboard scenario not independently executed.
- Final status: PARTIALLY VERIFIED.

## FGX-011 — Post-closing payment drift

- Scenario / role: Finance.
- Severity: High.
- Reproduction: Record cash close, then post more payments in the same business day.
- Expected: Stable close or explicit adjustment/reopen workflow.
- Actual: Payments can change the live till after the snapshot.
- Root cause: No closed-day financial posting policy.
- Correction / next action: Not changed: choose and implement close-lock or controlled reopen/adjustment policy.
- Evidence / regression: S19 closes before later scenarios; SIM-G caveat; code review of checkout/closeDay.
- Final status: OPEN / acceptance blocker.

## FGX-012 — Employee branch assignment not enforced

- Scenario / role: Staff.
- Severity: High.
- Reproduction: Staff assigned to one branch supplies another branch in the same restaurant.
- Expected: Enforce agreed branch scope.
- Actual: Restaurant tenancy checked, employee assignment not enforced.
- Root cause: Documented BranchAccessService design limitation.
- Correction / next action: Not changed; needs global branch policy and regression coverage.
- Evidence / regression: src/common/services/branch-access.service.ts.
- Final status: OPEN / multi-branch acceptance blocker.

## FGX-013 — Fresh cloud build misses generated Prisma client

- Scenario / role: Demo deployment, developer.
- Severity: High (build blocker).
- Reproduction: Build the monorepo after a dependency installation whose Prisma postinstall cannot discover the backend schema. Reproduced locally by temporarily removing the generated client and invoking the previous backend build.
- Expected: Build generates the schema-specific client before compiling backend TypeScript.
- Actual: Missing Prisma exports and inferred empty model types cause compilation failures; the frontend build is canceled by Turbo.
- Root cause: Prisma's dependency postinstall searches default schema locations; the schema is under apps/backend/prisma. Neither the previous root build nor backend build explicitly generated it. Docker had a separate generate step, masking this gap.
- Fix: Root build explicitly invokes backend prisma:generate before Turbo. Direct backend builds invoke prisma generate before nest build. No migrations or seeds are run by these commands.
- Regression: Missing-client old build exits 1; updated full root build regenerates the client and completes all three build tasks with no cache hits.
- Evidence: qa-evidence/deployment-prisma-before.txt and qa-evidence/deployment-prisma-after.txt.
- Final status: VERIFIED locally. Vercel rebuild and runtime remain BLOCKED pending correct project configuration, authorized hosting access and a dedicated demo database.
