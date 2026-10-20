// Resume only a known disposable QA restaurant; never uses production setup.
const fs = require("fs"),
  path = require("path");
const req = require("module").createRequire(
  path.resolve("apps/backend/package.json"),
);
const { NestFactory } = req("@nestjs/core"),
  { ThrottlerStorage } = req("@nestjs/throttler");
const { AppModule } = require("../apps/backend/dist/src/app.module"),
  { PrismaService } = require("../apps/backend/dist/src/prisma/prisma.service");
if (process.env.QA_ISOLATED !== "1") throw new Error("QA isolation required");
(async () => {
  const app = await NestFactory.create(AppModule, { logger: ["error"] });
  app.use(req("cookie-parser")());
  app.setGlobalPrefix("api");
  app.get(ThrottlerStorage).increment = async () => ({
    totalHits: 1,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  });
  await app.listen(4001, "127.0.0.1");
  const p = app.get(PrismaService),
    state = JSON.parse(fs.readFileSync("docs/qa-evidence/persona-ids.json"));
  const b = await p.branch.findUniqueOrThrow({
    where: { id: state.branch },
    include: { restaurant: true },
  });
  if (b.restaurant.name !== "Fedgix QA Restaurant")
    throw new Error("This is not the isolated QA fixture");
  const result = JSON.parse(
    fs.readFileSync("docs/qa-evidence/simulation.json"),
  );
  const only = process.env.QA_BROWSER_ONLY;
  result.results = result.results.filter((x) =>
    only ? x.id !== only : !x.id.startsWith("B"),
  );
  const check = async (id, title, role, fn) => {
    if (only && id !== only) return;
    const start = Date.now();
    try {
      const actual = await fn();
      result.results.push({
        id,
        title,
        role,
        status: "VERIFIED",
        actual: actual ?? "Assertions passed",
        durationMs: Date.now() - start,
      });
      console.log("PASS", id);
    } catch (e) {
      result.results.push({
        id,
        title,
        role,
        status: "FAILED",
        actual: e.message,
        durationMs: Date.now() - start,
      });
      console.log("FAIL", id, e.message);
    }
    fs.writeFileSync(
      "docs/qa-evidence/simulation.json",
      JSON.stringify(result, null, 2),
    );
  };
  const reviewers = Object.fromEntries(
    state.reviewers.map((x) => [
      x.id.replace("QA-REVIEW-", "").toLowerCase(),
      x,
    ]),
  );
  try {
    await require("./qa-browser.cjs")({
      app,
      p,
      branch: state.branch,
      staff: state.staff,
      reviewers,
      password: "Synthetic-QA-Only-2026!",
      check,
    });
  } finally {
    await app.close();
  }
  result.summary = result.results.reduce(
    (a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a),
    {},
  );
  result.browserRerunAt = new Date().toISOString();
  fs.writeFileSync(
    "docs/qa-evidence/simulation.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result.summary);
  process.exit(result.results.some((x) => x.status === "FAILED") ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
