# Security review

Scope: source inspection, existing permission/security unit tests, isolated API integration tests and selected browser checks. This is not an external penetration test or security certification.

## Implemented controls and evidence

- Staff bcrypt credentials, httpOnly JWT cookie, database active-user lookup, optional TOTP and server permission guards are preserved.
- Customer identities use separate tables and cookie, random 256-bit session secrets, SHA-256 token digests, 12-hour expiry and branch binding. Customer tokens cannot authorize staff routes. N01, N09 and B08 exercise isolation/expiry/denial.
- Self-registration always creates a new CRM profile. An unverified email cannot attach to a pre-existing customer’s order history.
- Customer portal defaults disabled; owner enables it per branch. Public menu excludes hidden categories. Server order pricing is authoritative. Public order idempotency keys are scoped by customer identity.
- Server Zod validation is used; guest price overrides are subject to existing online-order rules. Staff payroll and statements are guarded; an employee can read their own finalized statement, not a colleague’s.
- Reservation/order/employee row locks and conditional updates improve state integrity. Native multi-connection behavior remains to be tested.
- Strict SameSite customer cookies and opt-in Secure cookies are configured. Internet deployment requires HTTPS. Functional simulation bypasses IP throttling for volume, so it is not a production brute-force test.
- Fedgix compose omits the upstream updater, Docker socket and USB device grants, reducing privileged infrastructure exposure. This configuration was parsed, not run in Docker.

## Open security and privacy work

1. BranchAccessService enforces restaurant tenancy but not employee branch assignments. Do not accept multi-branch staff isolation until this is implemented and tested (FGX-012).
2. Existing permission groups such as staff.manage and accounting.manage are broad. HR/finance reviewer roles may hold related write powers; they are not certified read-only reviewer roles. Split read/write payroll and finance permissions if required by the client.
3. Customer email verification, password recovery, password/session lifecycle controls and a self-service privacy/retention workflow are not implemented. No claim of verified email ownership is made.
4. Define closed-day payment/refund handling and audit-controlled corrections (FGX-011). Financial integrity acceptance remains open.
5. Restrict owner signup/bootstrap at a deployed instance as appropriate. Review all exposed endpoints and rate limits on the final HTTPS deployment.
6. Review the generated third-party license inventory, including Unknown entries and non-MIT components, before release. No blanket dependency-vulnerability or legal-clearance claim is made.
7. Verify backups/restores, retention, audit access, secret rotation, domain/TLS settings, source availability and production logs on the target host. Never deploy QA fixtures, test passwords or manual test payment records.

## License

AGPL-3.0-only is retained. Modifications and date are described in FINAL_IMPLEMENTATION_REPORT.md. Remote users must have an appropriate opportunity to obtain the exact deployed Corresponding Source. Publish the Fedgix source branch/release before public deployment; a link to unchanged upstream source is insufficient for this customized application.
