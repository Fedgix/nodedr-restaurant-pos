# Fictional staff and reviewer personas

20 staff accounts, five separate reviewer accounts and a bootstrap fixture owner. Each staff persona was assigned a real QA shift (2026-11-20, 09:00–17:00 IST). No production attendance or payroll was populated. Narrow roles are used; only the owner personas receive all permissions. HR and finance permission groups are still coarse, as documented in SECURITY_REVIEW.md.

| Persona | Role | Permission count |
|---|---|---|
| QA-STAFF-001 | WAITER | 6 |
| QA-STAFF-002 | WAITER | 6 |
| QA-STAFF-003 | WAITER | 6 |
| QA-STAFF-004 | WAITER | 6 |
| QA-STAFF-005 | WAITER | 6 |
| QA-STAFF-006 | KITCHEN_STAFF | 2 |
| QA-STAFF-007 | KITCHEN_STAFF | 2 |
| QA-STAFF-008 | CHEF | 4 |
| QA-STAFF-009 | CASHIER | 10 |
| QA-STAFF-010 | CASHIER | 10 |
| QA-STAFF-011 | QA_SUPERVISOR | 7 |
| QA-STAFF-012 | RESTAURANT_MANAGER | 23 |
| QA-STAFF-013 | RESTAURANT_MANAGER | 23 |
| QA-STAFF-014 | INVENTORY_MANAGER | 2 |
| QA-STAFF-015 | INVENTORY_MANAGER | 2 |
| QA-STAFF-016 | QA_HR | 2 |
| QA-STAFF-017 | QA_HR | 2 |
| QA-STAFF-018 | ACCOUNTANT | 6 |
| QA-STAFF-019 | BARTENDER | 5 |
| QA-STAFF-020 | OWNER | 33 |
| QA-REVIEW-OWNER | OWNER | 33 |
| QA-REVIEW-MANAGER | RESTAURANT_MANAGER | 23 |
| QA-REVIEW-FINANCE | QA_FINANCE_REVIEW | 6 |
| QA-REVIEW-OPERATIONS | QA_OPERATIONS_REVIEW | 6 |
| QA-REVIEW-QA | QA_REVIEW | 4 |

The exact granted keys are in qa-evidence/simulation.json. Staff actions are recorded in S01–S25 and the service/negative scenarios; sign-in alone is not counted as a workflow pass.
