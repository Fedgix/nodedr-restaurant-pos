# QA regression report

- Production build: PASS, including Next.js Webpack build and NestJS compilation (qa-evidence/build.txt). Webpack is explicit because Turbopack persistence-cache loading failed in this workspace.
- Unit tests: 194 backend + 59 frontend = 253 passed. Backend: 25 suites. See unit-tests.txt.
- Existing integration tests: 73 passed, 0 failed across seven suites; run separately with prepared-statement reset between PGlite client lifecycles. See existing-final.txt and existing-*.json.
- Custom workflow catalog: 68 VERIFIED, 9 PARTIALLY VERIFIED, 1 NOT IMPLEMENTED, 0 FAILED. See simulation.json. All eight selected browser cases passed after harness corrections.
- Build/type checking, changed-source lint (0 errors) and git whitespace checks passed. Compose file parsed as YAML; Docker execution was unavailable.

Early failure evidence is retained in payroll-before.txt, reservations-before.txt, simulation-before-fixes.json, simulation-before-final-fixes.json and simulation-browser-first-attempt.json. Database connection/prepared-statement and browser shutdown failures were harness defects; the final recorded tests use a working isolated engine/browser configuration.

A passing single-connection PGlite test does not establish native PostgreSQL multi-connection race safety, printer hardware behavior, gateway settlement, external message delivery or legal compliance. FGX-011 and FGX-012 remain acceptance issues. Salary pay dates and statutory deductions are not implemented.
