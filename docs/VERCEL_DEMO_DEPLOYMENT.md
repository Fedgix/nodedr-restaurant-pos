# Vercel demo deployment status

The user requested a demo on Vercel without live online payment integration. No live gateway credentials are configured or verified.

## Verified build repair

The uploaded archive deployment failed because Prisma Client was not generated from apps/backend/prisma/schema.prisma before backend compilation. Both root and backend build scripts now generate it explicitly. The missing-client failure was reproduced locally; the updated full build completed all three tasks without cache hits. This does not certify Vercel runtime compatibility.

## Source

The complete initial implementation was published to GitHub branch fedgix/development with a tree matching the locally tested source. The Vercel screenshots show Vercel Drop as the deployment source, so that uploaded archive will not automatically receive later GitHub fixes. Import the GitHub development branch for subsequent deployments. Preserve the original branch.

## Remaining hosting setup

This is a Next.js frontend plus a NestJS API and PostgreSQL, not a single static site. A successful frontend build alone does not provide working logins, reservations or order records. Configure the API and a separate demo PostgreSQL database, then set the frontend BACKEND_URL to the API before building. Never point demo scenarios at a business database.

For a separate frontend project use apps/web as Root Directory, Next.js as framework, enable access to workspace files outside that directory, and build shared types before the web app: pnpm --filter @nodedr-restaurant/types build && pnpm --filter web build. Do not deploy the repository root as a static output or assume the compiled Nest backend is automatically served by the frontend project.

Vercel Functions need separate validation of the API bundle, native dependencies, migrations, cookie/proxy behavior, realtime transport and background jobs. Local filesystem uploads are not durable serverless storage. These limitations have not been resolved or verified by the build repair.

The Vercel connector currently returns HTTP 403 for the Fedgix Technologies workspace. No Vercel release or live functional demo has been verified. Manual dashboard configuration is being guided one step at a time.
