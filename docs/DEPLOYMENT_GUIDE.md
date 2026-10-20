# Fedgix Restaurant OS deployment guide

Status: source build verified; production deployment BLOCKED pending hosting, GitHub source publication, native PostgreSQL/Docker acceptance and remaining scope decisions. These instructions have not been executed on a client server.

## 1. Prepare a separate server

Use a server or restaurant LAN computer with Docker Engine/Desktop and Docker Compose v2. Obtain the Fedgix development branch after it has been published. Do not run QA against a business database. Keep test and production credentials, volumes and hostnames separate.

```bash
git clone https://github.com/Fedgix/nodedr-restaurant-pos.git
cd nodedr-restaurant-pos
git switch fedgix/development
```

Until publishing access is resolved, the local Git bundle contains the development branch and history. After downloading it, use `git clone Fedgix_Restaurant_OS.bundle nodedr-restaurant-pos`, enter that folder, and switch to `fedgix/development`.

## 2. Configure secrets and network

Copy `.env.example` to `.env`. Generate separate long random hex strings for POSTGRES_PASSWORD and JWT_SECRET (for example, `openssl rand -hex 32`). Do not commit `.env`. Configure FRONTEND_ORIGIN for the real origin. HOST_PORT defaults to 1995.

`docker-compose.fedgix.yml` defaults to 127.0.0.1 binding. For devices on the restaurant LAN, set BIND_ADDRESS to the restaurant server's LAN IP (or 0.0.0.0 with the appropriate firewall). For internet access, use a configured HTTPS reverse proxy, then set COOKIE_SECURE=true. Keep database and API ports private. COOKIE_SECURE=true on a plain HTTP site prevents session cookies from working.

The Fedgix compose file builds local customized source images. It omits the upstream auto-update sidecar, Docker socket mount and USB device permissions. Do not use upstream image auto-updates for this fork; they can replace customizations. USB printing requires a separately reviewed host-specific configuration. Network/browser printing is the default deployment path here.

## 3. Build and migrate

```bash
docker compose -p fedgix_prod -f docker-compose.fedgix.yml up -d --build
docker compose -p fedgix_prod -f docker-compose.fedgix.yml ps
docker compose -p fedgix_prod -f docker-compose.fedgix.yml logs --tail=100 backend web
```

The existing backend container startup runs Prisma migrate deploy. Verify it completes before setup. For a manually managed Node deployment: Node >=22, pnpm as pinned in package.json, `pnpm install --frozen-lockfile`, build shared types, generate Prisma Client, run Prisma migrate deploy with the production URL, then build backend and web. Build the frontend with BACKEND_URL pointing to its reachable API. Native migration deployment is still an acceptance check; PGlite SQL execution does not substitute for it.

## 4. Create real configuration without demo transactions

Open the configured origin and use the owner signup screen. Set restaurant name/logo, currency/timezone, branch address, applicable tax configuration, real staff roles, menu, floors/tables, suppliers and recipes. Use Settings → Customer website to configure brand color, typography, headline and cover photo, enable the portal and open `/dine/<branchId>`. Portal enablement defaults to off.

Never run `prisma:seed`, `install.sh --demo`, qa-with-db.mjs or qa-native.cjs against production. The QA script identities and manual payment records are fictional. No real card/UPI settlement has been integrated or verified.

## 5. Acceptance and recovery

- Rerun isolated QA on native PostgreSQL using a new database whose name starts with fedgix_qa_. Set QA_DATABASE_URL explicitly and run `node scripts/qa-native.cjs`. Use QA_BROWSER=1 and an installed Playwright browser for interface checks.
- Verify printer hardware, backups and an actual restore on a separate machine; test power loss and network loss for the chosen hosting arrangement.
- Configure SMTP/messaging only after consent, recipient and opt-out settings are reviewed. Confirm provider delivery separately from local notification records.
- Create database and uploads backups before updates; retain the exact deployed source revision. Test rollback with a restored copy; do not downgrade schema blindly.
- Apply SECURITY_REVIEW.md and OPEN_ISSUES.md. GST and payroll must receive appropriate business/legal validation before statutory reliance.

## 6. Source and license

Preserve LICENSE and upstream notices. Make the exact deployed Corresponding Source and build/install material available to remote users under AGPL-3.0. The UI points to the Fedgix branch; publish it and retain a release source archive before deployment. Source publication is currently blocked by GitHub integration permissions.
