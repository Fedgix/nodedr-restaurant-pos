# QA scenario catalog

Executable source: scripts/qa-simulate.cjs and scripts/qa-browser.cjs. Actual results: QA_EXECUTION_LOG.md and qa-evidence/simulation.json.

| IDs | Initial conditions | Actions and expected records |
|---|---|---|
| C01–C03 | Signed-in customer, configured floor/menu | Request booking; optionally submit independent scheduled collection order; verify reservation channel, personal history and persisted schedule |
| C04–C07 | Available tables and waiter roles | Seat walk-in, handle manual early/late arrival, add items; verify table, order, KOT and totals |
| C08–C10 | Unprepared orders or open customer booking | Void a line, cancel a bill, cancel own booking; verify terminal state and ownership |
| C11 | Customer booking exists | Party-size change is not implemented; report gap rather than claiming success |
| C12–C16 | Open/paid bills, cashier and manager roles | Transfer table, split tender, partial settle, reject short payment, record refund; verify payment rows and table states |
| C17–C20 | Separate customer sessions | Takeaway, dietary note, repeat orders and delayed-item investigation; verify private histories, kitchen note and delay counts |
| S01–S07 | Distinct waiter/kitchen/cashier/manager sessions | Submit/add/prepare/bill/discount/refund through authorized server endpoints |
| S08–S14 | Employees and assigned shifts | Clock in/out, request/decide/overlap leave, schedule, attempt unauthorized payroll access |
| S15–S20 | Pay profile and approved unpaid leave | Draft/finalize payroll, read own/manager statement, receive goods, waste stock, close cash and reconcile owner metrics |
| S21–S25 | Other staff identities with narrow roles | Second cashier settlement, chef queue, supervisor floor, payroll review and bartender queue |
| R-* | Separate owner/manager/finance/operations/QA identities | Exercise permitted reads and deny payroll to restricted reviewers |
| N01–N13 | Existing records and API sessions | Ownership, duplicate orders/payments/clocks, invalid quantity/date/stock, booking conflicts, expired session, concurrent additions and cancelled-line totals |
| SIM-A | Available table | Submit → kitchen ready → payment → table available |
| SIM-B | Five waiters and five free tables | Concurrent new orders with distinct numbers, kitchen updates; capture race failures |
| SIM-C | Early/late/cancelled reservations | Operations reviewer sees matching records; party-size editing remains a gap |
| SIM-D | Prepared kitchen item | Attempt removal; expect safe business-rule rejection and preserved bill |
| SIM-E | Partial payment | Retry same request; exactly one payment, order remains open |
| SIM-F | Approved employee leave | Reject conflicting shift; manager assigns another employee |
| SIM-G | Payments, refunds, stock ledger, finance role | Compare recorded values and stock movement sum; load financial report |
| B01–B02 | Real customer mobile page, built server | Sign in, order with dietary note, view personal status, submit booking, check mobile overflow |
| B03–B08 | Real staff role sessions | Phone POS submission, kitchen display, manager/owner pages, employee statement, denied payroll request |

Each execution row records the actor, status, elapsed time and assertion evidence. Tests marked PARTIALLY VERIFIED explicitly identify the unsupported portion. Fixture IDs are retained in persona-ids.json; raw session tokens and password hashes are not exported.
