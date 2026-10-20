// Isolated QA only. Never reads DATABASE_URL or production .env.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdtemp, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const resume = process.env.QA_RESUME_PATH;
if (
  resume &&
  (!resolve(resume).startsWith(resolve(tmpdir(), "fedgix-qa-")) ||
    !process.argv.includes("scripts/qa-browser-only.cjs"))
)
  throw new Error(
    "Resume is limited to temporary QA fixtures and browser-only reruns",
  );
const data = resume ?? (await mkdtemp(resolve(tmpdir(), "fedgix-qa-")));
const db = new PGlite(data);
await db.waitReady;
const migrations = resolve(root, "apps/backend/prisma/migrations");
const applied = [];
for (const name of (await readdir(migrations)).sort()) {
  if (name === "migration_lock.toml") continue;
  if (!resume)
    await db.exec(
      await readFile(resolve(migrations, name, "migration.sql"), "utf8"),
    );
  applied.push(name);
}
const server = new PGLiteSocketServer({ db, port: 55432, host: "127.0.0.1" });
await server.start();
await mkdir(resolve(root, "docs/qa-evidence"), { recursive: true });
await writeFile(
  resolve(root, "docs/qa-evidence/migrations.json"),
  JSON.stringify(
    {
      engine:
        "PGlite (PostgreSQL WASM), TCP bridge, single Prisma connection; not native PostgreSQL concurrency validation",
      applied,
      at: new Date().toISOString(),
    },
    null,
    2,
  ),
);
const env = {
  ...process.env,
  DATABASE_URL:
    "postgresql://postgres:qa@127.0.0.1:55432/postgres?connection_limit=1&sslmode=disable",
  JWT_SECRET: "fedgix-isolated-qa-secret-never-for-production-2026",
  NODE_ENV: "test",
  COOKIE_SECURE: "false",
  PORT: "4001",
  BACKEND_URL: "http://127.0.0.1:4001",
  QA_ISOLATED: "1",
  QA_DATA_PATH: data,
  ENABLE_SWAGGER: "false",
  SMTP_HOST: "",
  SMTP_USER: "",
  SMTP_PASS: "",
  WHATSAPP_TOKEN: "",
};
const args = process.argv.slice(2);
if (!args.length) throw new Error("Provide a QA command");
const child = spawn(args[0], args.slice(1), {
  cwd: root,
  env,
  stdio: ["inherit", "inherit", "inherit", "ipc"],
});
child.on("message", async (m) => {
  if (m?.resetPrepared) {
    await db.exec("ROLLBACK; DEALLOCATE ALL");
    child.send({ resetComplete: true });
  }
});
const code = await new Promise((ok) => child.on("exit", ok));
await server.stop();
await db.close();
process.exit(Number(code ?? 1));
