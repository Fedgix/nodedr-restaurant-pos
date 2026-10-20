# QA execution log

Date: 2026-10-20. Evidence: qa-evidence/simulation.json and existing-*.json. Automated API, real browser and multi-role methods were used. No human test-panel claim is made.

Planned: 78; executed: 77; fully verified: 68; partially verified: 9; failed in final recorded assertions: 0; not implemented: 1. Separate external acceptance blockers are listed in FINAL_QA_REPORT.md.

The early runs reproduced payroll, reservation, stale order-total, instruction mapping, order-number and printer diagnostics defects. Early database bridge prepared-statement errors, Next build-cache errors and Chromium context/API-request harness issues are retained in qa-evidence. Later reruns supersede those harness failures; they do not establish native PostgreSQL or physical-device acceptance.

| ID | Scenario / role | Status | Actual evidence |
|---|---|---|---|
| C01 | Standard reservation / QA-CUST-001 | VERIFIED | {'reservationId': 'cmvg3iirp00bzs10j1rbaspth', 'status': 'RESERVED'} |
| C02 | Reservation plus scheduled collection preorder / QA-CUST-002 | PARTIALLY VERIFIED | Booking and scheduled collection order created independently; reservation-linked meal package is not implemented |
| C03 | Reservation without preorder / QA-CUST-003 | VERIFIED | Assertions passed |
| C04 | Walk-in table order / QA-CUST-004 | VERIFIED | {'orderId': 'cmvg3iivc00des10jc1tt9a17', 'stockAfter': '99.8'} |
| C05 | Customer arrives 30 minutes late / QA-CUST-005 | PARTIALLY VERIFIED | Manual late-arrival handling works; automatic grace-period policy is not implemented |
| C06 | Early arrival / QA-CUST-006 | VERIFIED | Assertions passed |
| C07 | Additional items after seating / QA-CUST-007 | VERIFIED | Assertions passed |
| C08 | Cancel one unprepared item / QA-CUST-008 | VERIFIED | Assertions passed |
| C09 | Cancel entire order / QA-CUST-009 | VERIFIED | Assertions passed |
| C10 | Customer cancels own reservation / QA-CUST-010 | VERIFIED | Assertions passed |
| C11 | Customer changes reservation party size / QA-CUST-011 | NOT IMPLEMENTED | No party-size update workflow; contact restaurant and cancel/rebook. Persona exists and can sign in. |
| C12 | Requested table transfer performed by waiter / QA-CUST-012 | VERIFIED | Assertions passed |
| C13 | Split-tender bill settlement / QA-CUST-013 | PARTIALLY VERIFIED | Split tender verified; separate per-person invoices not implemented |
| C14 | Partial payment then balance / QA-CUST-014 | VERIFIED | Assertions passed |
| C15 | Invalid payment and retry / QA-CUST-015 | PARTIALLY VERIFIED | Short payment rejected and manual retry recorded; live card decline is not integrated |
| C16 | Refund recorded by manager / QA-CUST-016 | VERIFIED | Assertions passed |
| C17 | Customer takeaway and private history / QA-CUST-017 | VERIFIED | Assertions passed |
| C18 | Dietary instructions persist / QA-CUST-018 | VERIFIED | Assertions passed |
| C19 | Repeat customer multiple orders / QA-CUST-019 | VERIFIED | Assertions passed |
| C20 | Missing/delayed item investigated / QA-CUST-020 | PARTIALLY VERIFIED | Manager delay alert verified; dedicated customer missing-item complaint flow not implemented |
| S01 | Waiter takes order / QA-STAFF-001 | VERIFIED | Assertions passed |
| S02 | Waiter modifies order / QA-STAFF-002 | VERIFIED | Assertions passed |
| S03 | Kitchen marks ready / QA-STAFF-006 | VERIFIED | Assertions passed |
| S04 | Kitchen inspects delayed queue / QA-STAFF-007 | VERIFIED | Assertions passed |
| S05 | Cashier bills and records test payment / QA-STAFF-009 | VERIFIED | Assertions passed |
| S06 | Manager applies authorized discount / QA-STAFF-012 | VERIFIED | Assertions passed |
| S07 | Manager refunds a bill / QA-STAFF-013 | VERIFIED | Assertions passed |
| S08 | Employee clocks in / QA-STAFF-003 | VERIFIED | Assertions passed |
| S09 | Employee clocks out / QA-STAFF-003 | VERIFIED | Assertions passed |
| S10 | Employee requests leave / QA-STAFF-004 | VERIFIED | Assertions passed |
| S11 | Manager approves leave / QA-STAFF-012 | VERIFIED | Assertions passed |
| S12 | Overlapping leave blocked / QA-STAFF-004 | VERIFIED | Assertions passed |
| S13 | Manager creates staff shift / QA-STAFF-012 | VERIFIED | Assertions passed |
| S14 | Unauthorized payroll access blocked / QA-STAFF-005 | VERIFIED | Assertions passed |
| S15 | Payroll administrator drafts and finalizes / QA-STAFF-016 | VERIFIED | Assertions passed |
| S16 | Manager retrieves salary statement / QA-STAFF-012 | VERIFIED | Assertions passed |
| S17 | Inventory receives supplier delivery / QA-STAFF-014 | VERIFIED | Assertions passed |
| S18 | Inventory records wastage / QA-STAFF-015 | VERIFIED | Assertions passed |
| S19 | Daily cash closing / QA-STAFF-018 | VERIFIED | {'businessDate': '2026-10-20', 'openingFloat': 0, 'cashSales': 938, 'cashExpenses': 0, 'expectedCash': 938} |
| S20 | Owner reviews live dashboard / QA-STAFF-020 | VERIFIED | {'todayRevenue': 1128, 'note': 'Gross paid-order metric; refunds reconciled separately'} |
| S21 | Second cashier records collection order payment / QA-STAFF-010 | VERIFIED | Assertions passed |
| S22 | Chef inspects live kitchen tickets / QA-STAFF-008 | VERIFIED | Assertions passed |
| S23 | Supervisor reviews floor and active service / QA-STAFF-011 | VERIFIED | Assertions passed |
| S24 | Second payroll administrator reviews final run / QA-STAFF-017 | VERIFIED | Assertions passed |
| S25 | Bartender receives preparation queue / QA-STAFF-019 | VERIFIED | Assertions passed |
| R-owner | owner reviewer permissions / QA-REVIEW-OWNER | VERIFIED | Assertions passed |
| R-manager | manager reviewer permissions / QA-REVIEW-MANAGER | VERIFIED | Assertions passed |
| R-finance | finance reviewer permissions / QA-REVIEW-FINANCE | VERIFIED | Assertions passed |
| R-operations | operations reviewer permissions / QA-REVIEW-OPERATIONS | VERIFIED | Assertions passed |
| R-qa | qa reviewer permissions / QA-REVIEW-QA | VERIFIED | Assertions passed |
| N01 | Customer cannot read another history / customer | VERIFIED | Assertions passed |
| N02 | Duplicate customer order idempotency / customer | VERIFIED | Assertions passed |
| N03 | Invalid quantities rejected / waiter | VERIFIED | Assertions passed |
| N04 | Duplicate clock-ins blocked / employee | VERIFIED | Assertions passed |
| N05 | Other employee salary statement blocked / waiter | VERIFIED | Assertions passed |
| N06 | Reservation overlap and terminal state blocked / manager | VERIFIED | Assertions passed |
| N07 | Cancelling reservation preserves unpaid order table / manager | VERIFIED | Assertions passed |
| N08 | Invalid calendar leave rejected / employee | VERIFIED | Assertions passed |
| N09 | Expired customer session rejected / customer | VERIFIED | Assertions passed |
| N10 | Retried partial payment is not duplicated / cashier | VERIFIED | Assertions passed |
| N11 | Invalid stock withdrawal rejected / inventory | VERIFIED | Assertions passed |
| N12 | Concurrent additional items persist / waiters | PARTIALLY VERIFIED | Concurrent HTTP requests serialized through one QA DB connection; native multi-connection race remains unverified |
| N13 | Cancelled items stay excluded when adding more / waiter | VERIFIED | Assertions passed |
| SIM-A | Normal service from seating through paid bill / multi-role | VERIFIED | Assertions passed |
| SIM-B | Busy dinner service concurrent new orders / multi-role | PARTIALLY VERIFIED | Five concurrent HTTP orders; single DB connection limits race coverage |
| SIM-C | Reservation disruption review / operations reviewer | PARTIALLY VERIFIED | Early, late and cancelled bookings visible; party-size editing remains unavailable |
| SIM-D | Prepared-item cancellation fails safely / waiter and kitchen | VERIFIED | Assertions passed |
| SIM-E | Payment exceptions retain outstanding balance / cashier | VERIFIED | Assertions passed |
| SIM-F | Approved leave prevents shift then manager reassigns / manager | VERIFIED | Assertions passed |
| SIM-G | End-of-day financial and inventory reconciliation / finance and inventory | PARTIALLY VERIFIED | {'payments': 1428, 'refunds': 130, 'stock': 106.8, 'reportRows': 1, 'note': 'Recorded manual payments only; not bank reconciliation', 'closingLimit': 'Stock ledger and report access verified. Daily close was recorded earlier; subsequent QA cash payments change the live till total. No closed-day payment lock/reopen policy implemented.'} |
| B01 | Customer mobile menu, sign-in and dietary order / customer browser | VERIFIED | {'orderId': 'cmvg3o2us0010s10i2syq03e6', 'kitchenNote': 'QA browser no peanuts'} |
| B02 | Customer submits reservation in mobile interface / customer browser | VERIFIED | Assertions passed |
| B03 | Waiter mobile login and submit table order / QA-STAFF-001 browser | VERIFIED | {'orderId': 'cmvg3q0dh001vs10isjn75p8i', 'kots': 1} |
| B04 | Kitchen interface displays live orders / QA-STAFF-006 browser | VERIFIED | Assertions passed |
| B05 | Manager leave and payroll interface / QA-REVIEW-MANAGER browser | VERIFIED | Assertions passed |
| B06 | Owner operational dashboard and empty-safe values / QA-REVIEW-OWNER browser | VERIFIED | Assertions passed |
| B07 | Employee finalized salary statement interface / QA-STAFF-004 browser | VERIFIED | Assertions passed |
| B08 | Waiter direct payroll route remains restricted / QA-STAFF-001 browser | VERIFIED | Assertions passed |
