// Optional acceptance rerun against a newly created, disposable native Postgres DB.
const { spawn } = require("child_process"),
  { randomBytes } = require("crypto"),
  path = require("path");
const req = require("module").createRequire(
  path.resolve("apps/backend/package.json"),
);
const raw = process.env.QA_DATABASE_URL;
if (!raw)
  throw new Error(
    "Set QA_DATABASE_URL to a NEW disposable database named fedgix_qa_*",
  );
const url = new URL(raw);
if (!url.pathname.slice(1).startsWith("fedgix_qa_"))
  throw new Error("Refusing any database not named fedgix_qa_*");
const env = {
  ...process.env,
  DATABASE_URL: raw,
  JWT_SECRET: randomBytes(32).toString("hex"),
  NODE_ENV: "test",
  COOKIE_SECURE: "false",
  QA_ISOLATED: "1",
  QA_DATABASE_ENGINE: "native PostgreSQL",
  SMTP_HOST: "",
  SMTP_USER: "",
  SMTP_PASS: "",
  WHATSAPP_TOKEN: "",
};
async function run(args) {
  const c = spawn(args[0], args.slice(1), { env, stdio: "inherit" });
  const code = await new Promise((ok) => c.on("exit", ok));
  if (code) throw new Error("QA command failed");
}
(async () => {
  await run([
    "pnpm",
    "--filter",
    "@nodedr-restaurant/backend",
    "prisma:deploy",
  ]);
  const p = new (req("@prisma/client").PrismaClient)({ datasourceUrl: raw });
  if (await p.restaurant.count())
    throw new Error("QA database must be empty; no fixture data written");
  await p.$disconnect();
  await run([process.execPath, "scripts/qa-simulate.cjs"]);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
