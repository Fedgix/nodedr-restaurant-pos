import { spawn } from "node:child_process";
if (process.env.QA_ISOLATED !== "1") throw new Error("Use qa-with-db.mjs");
async function run(args, extra = {}) {
  const c = spawn("pnpm", args, {
    stdio: "inherit",
    env: { ...process.env, ...extra },
  });
  return await new Promise((ok) => c.on("exit", ok));
}
await run(["--filter", "@nodedr-restaurant/backend", "prisma:seed"]);
const suites = [
  "app",
  "permissions",
  "branches",
  "inventory-stock",
  "kiosk",
  "order-flow",
  "orders-lifecycle",
];
let failed = 0;
for (const suite of suites) {
  await new Promise((ok) => {
    process.once("message", ok);
    process.send({ resetPrepared: true });
  });
  const result = await run(
    [
      "--filter",
      "@nodedr-restaurant/backend",
      "test:e2e",
      "--runInBand",
      "--testTimeout=120000",
      "--runTestsByPath",
      `test/${suite}.e2e-spec.ts`,
      "--json",
      `--outputFile=../../docs/qa-evidence/existing-${suite}.json`,
    ],
    {
      PERMISSIONS_E2E: "1",
      KIOSK_E2E: "1",
      LIFECYCLE_E2E: "1",
      BRANCHES_E2E: "1",
      ORDER_FLOW_E2E: "1",
      INVENTORY_E2E: "1",
    },
  );
  if (result) failed++;
}
process.exit(failed ? 1 : 0);
