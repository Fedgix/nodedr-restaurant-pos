# Repository audit

Source: Raktim94/nodedr-restaurant-pos. Working fork: Fedgix/nodedr-restaurant-pos.
Baseline commit: `949f7526800947b22e030f18213a659b3a45fa0d`.
Development branch: `fedgix/development` (local; remote creation initially returned HTTP 403).

## Evidence and architecture

Inspected package manifests, Prisma schema and migration files, controllers/services in orders, tables, reservations, public, attendance, HR, dashboard, accounting, inventory and reports, auth strategy, frontend routes, existing tests, Docker Compose and install scripts. See INITIAL_FEATURE_MATRIX.md for code evidence. This is a substantial existing application; extension is practical and a rewrite is unnecessary.

The workspace contains Next.js 16 / React 19 web, NestJS 11 backend, shared Zod/TypeScript schemas, PostgreSQL via Prisma 6, Socket.IO and pnpm/Turborepo. Check the lockfile for exact resolved dependency versions; package ranges alone are not the installed versions. Existing unit and opt-in database tests cover core money, state transitions, permissions, inventory and kiosk. They must be executed before assigning VERIFIED status.

## Findings at inspection

- Staff JWT cookies resolve active database users and role permissions. Customer CRM profiles are not sign-in accounts.
- BranchAccessService checks restaurant tenancy, but explicitly does not enforce employee branch assignments. Treat this as an unresolved multi-branch security limitation until changed and tested.
- Reservations lack interval conflict enforcement and can release occupied tables on cancellation.
- Attendance duplicate checks are check-then-write without a database uniqueness constraint.
- Leave requests have no overlap check; payroll can therefore double-count approved unpaid dates.
- Payroll monthly proration uses only the first month's day count, incorrect across months of different lengths.
- Dashboard day boundaries use server timezone instead of the configured restaurant timezone.
- UPI QR is a payment instruction, not bank confirmation. Cashier-recorded payments are not gateway settlements.
- Notifications and printing have code paths, but delivery credentials and physical hardware are absent.
- No Docker binary was found. A local isolated database alternative will be evaluated without touching a restaurant database.

## License and dependencies

The checked-in LICENSE is GNU Affero General Public License version 3; package manifests specify AGPL-3.0-only. Preserve LICENSE, copyright and upstream attribution; identify modifications and their dates. Distribution of modified covered software requires the applicable AGPL source/license notices. Section 13 requires a prominent opportunity for remote users interacting with a modified version to obtain its Corresponding Source at no charge. Provide the exact deployed revision and necessary build/install source, including modifications, rather than only linking the unchanged upstream repository. Do not promise a proprietary closed-source edition on the strength of this license. Commercial installation/support pricing is distinct from these source obligations. Other packages/assets have their own licenses; a complete third-party legal review remains open. This audit records the license text; it is not a legal certification.

## Data handling

No primary app database is configured or seeded. Development fixtures and QA must use an explicitly isolated disposable database. Demo credentials and synthetic contacts must never be used in production or receive external communications.

## Final audit artifacts

The installed dependency-license inventory is retained in qa-evidence/third-party-licenses.json. It contains 20 license groups, including Unknown entries; it is an inventory, not full legal clearance. Primary license reference: https://www.gnu.org/licenses/agpl-3.0.html. Final test evidence and remaining scope supersede the initial implementation classifications in FEATURE_MATRIX.md and FINAL_QA_REPORT.md.
