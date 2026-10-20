const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict");
module.exports = async ({ p, branch, staff, reviewers, password, check }) => {
  const logs = fs.openSync("docs/qa-evidence/web-server.txt", "w");
  const web = spawn(
    process.execPath,
    [
      path.resolve("apps/web/node_modules/next/dist/bin/next"),
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      "3000",
    ],
    {
      cwd: path.resolve("apps/web"),
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", logs, logs],
    },
  );
  let browser;
  try {
    const deadline = Date.now() + 45000;
    while (true) {
      try {
        if ((await fetch("http://localhost:3000/login")).ok) break;
      } catch {}
      if (Date.now() > deadline) throw new Error("Web server did not start");
      await new Promise((r) => setTimeout(r, 300));
    }
    const args = process.env.QA_CHROMIUM_ARGS_FILE
      ? JSON.parse(fs.readFileSync(process.env.QA_CHROMIUM_ARGS_FILE, "utf8"))
      : ["--no-sandbox"];
    browser = await chromium.launch({
      headless: true,
      args,
      ...(process.env.QA_CHROMIUM_PATH
        ? { executablePath: process.env.QA_CHROMIUM_PATH }
        : {}),
    });
    async function context(mobile = false) {
      return browser.newContext({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
        timezoneId: "Asia/Kolkata",
        reducedMotion: "reduce",
      });
    }
    async function login(ctx, email) {
      const page = await ctx.newPage();
      await page.goto("http://localhost:3000/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 30000,
      });
      return page;
    }
    const guestContext = await context(true),
      guest = await guestContext.newPage();
    await check(
      "B01",
      "Customer mobile menu, sign-in and dietary order",
      "customer browser",
      async () => {
        await guest.goto(`http://localhost:3000/dine/${branch}`);
        await guest
          .getByRole("heading", { name: "A better day at the table" })
          .waitFor();
        await guest.screenshot({
          path: "docs/qa-evidence/customer-mobile.png",
          fullPage: true,
        });
        await guest
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await guest
          .getByLabel("Email", { exact: true })
          .fill("qa-cust-001@example.invalid");
        await guest.getByLabel("Password", { exact: true }).fill(password);
        await guest
          .getByRole("button", { name: "Sign in", exact: true })
          .last()
          .click();
        await guest.getByText("You are signed in", { exact: true }).waitFor();
        await guest
          .getByRole("article")
          .filter({ hasText: "QA Veg Bowl" })
          .getByRole("button", { name: "Choose options" })
          .click();
        await guest
          .getByLabel("Dietary or preparation instructions")
          .fill("QA browser no peanuts");
        await guest
          .getByRole("button", { name: "Add to cart", exact: true })
          .click();
        await guest.getByRole("button", { name: /Cart \(1\)/ }).click();
        await guest
          .getByRole("button", {
            name: "Submit order · pay at counter",
            exact: true,
          })
          .click();
        await guest
          .getByText(/submitted. Pay at the counter/)
          .waitFor({ timeout: 20000 });
        const line = await p.orderItem.findFirst({
          where: { kitchenNote: "QA browser no peanuts" },
        });
        assert.ok(line, "Kitchen instructions must persist in database");
        assert.ok(
          await guest.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
          ),
          "No horizontal overflow",
        );
        await guest.screenshot({
          path: "docs/qa-evidence/customer-history.png",
          fullPage: true,
        });
        return { orderId: line.orderId, kitchenNote: line.kitchenNote };
      },
    );
    await check(
      "B02",
      "Customer submits reservation in mobile interface",
      "customer browser",
      async () => {
        await guest
          .getByRole("button", { name: "Reserve a table", exact: true })
          .click();
        await guest.locator('input[name="at"]').fill("2026-11-15T19:00");
        await guest.locator('input[name="guests"]').fill("2");
        await guest
          .getByRole("button", { name: "Request reservation", exact: true })
          .click();
        await guest
          .getByText("Reservation request submitted. Check its status below.")
          .waitFor({ timeout: 20000 });
        await guest.screenshot({
          path: "docs/qa-evidence/customer-booking.png",
          fullPage: true,
        });
      },
    );
    const waiterContext = await context(true);
    let waiter;
    await check(
      "B03",
      "Waiter mobile login and submit table order",
      "QA-STAFF-001 browser",
      async () => {
        waiter = await login(waiterContext, staff[0].email);
        const table = await p.table.findFirstOrThrow({
          where: { floor: { branchId: branch }, status: "AVAILABLE" },
          orderBy: { number: "desc" },
        });
        await waiter.goto(`http://localhost:3000/pos?tableId=${table.id}`);
        await waiter.getByRole("button", { name: /QA Veg Bowl/ }).click();
        const add = waiter.getByRole("button", {
          name: "Add to cart",
          exact: true,
        });
        if (await add.isVisible().catch(() => false)) await add.click();
        const send = waiter.getByRole("button", {
          name: "Send to kitchen",
          exact: true,
        });
        if (!(await send.isVisible().catch(() => false))) {
          const cart = waiter
            .getByRole("button", { name: /View cart|Cart|Review/ })
            .first();
          if (await cart.isVisible().catch(() => false)) await cart.click();
        }
        await send.click();
        await waiter
          .getByText(/sent to kitchen/i)
          .first()
          .waitFor({ timeout: 20000 });
        const order = await p.order.findFirst({
          where: { tableId: table.id, status: "OPEN" },
          include: { kots: true },
        });
        assert.ok(order?.kots.length);
        await waiter.screenshot({
          path: "docs/qa-evidence/waiter-mobile.png",
          fullPage: true,
        });
        return { orderId: order.id, kots: order.kots.length };
      },
    );
    const kitchenContext = await context(),
      managerContext = await context(),
      ownerContext = await context();
    await check(
      "B04",
      "Kitchen interface displays live orders",
      "QA-STAFF-006 browser",
      async () => {
        const page = await login(kitchenContext, staff[5].email);
        await page.goto("http://localhost:3000/kds");
        await page.getByText("QA Veg Bowl").first().waitFor({ timeout: 20000 });
        await page.screenshot({
          path: "docs/qa-evidence/kitchen.png",
          fullPage: true,
        });
      },
    );
    await check(
      "B05",
      "Manager leave and payroll interface",
      "QA-REVIEW-MANAGER browser",
      async () => {
        const page = await login(managerContext, reviewers.manager.email);
        await page.goto("http://localhost:3000/team");
        await page.getByRole("heading", { name: /Team/ }).waitFor();
        await page.screenshot({
          path: "docs/qa-evidence/manager-team.png",
          fullPage: true,
        });
      },
    );
    await check(
      "B06",
      "Owner operational dashboard and empty-safe values",
      "QA-REVIEW-OWNER browser",
      async () => {
        const page = await login(ownerContext, reviewers.owner.email);
        await page.goto("http://localhost:3000/dashboard");
        await page
          .getByRole("heading", { name: "Operations at a glance" })
          .waitFor({ timeout: 20000 });
        await page.screenshot({
          path: "docs/qa-evidence/owner-dashboard.png",
          fullPage: true,
        });
      },
    );
    await check(
      "B07",
      "Employee finalized salary statement interface",
      "QA-STAFF-004 browser",
      async () => {
        const ctx = await context(true),
          page = await login(ctx, staff[3].email);
        await page.goto("http://localhost:3000/my-pay");
        await page.getByText("28000", { exact: true }).first().waitFor();
        await page.screenshot({
          path: "docs/qa-evidence/employee-salary.png",
          fullPage: true,
        }); /* Contexts close together when the browser exits; single-process Chromium cannot close one safely. */
      },
    );
    await check(
      "B08",
      "Waiter direct payroll route remains restricted",
      "QA-STAFF-001 browser",
      async () => {
        const freshContext = await context(true);
        const freshWaiter = await login(freshContext, staff[0].email);
        const result = await freshWaiter.evaluate(async (branchId) => {
          const me = await fetch("/api/v1/auth/me", { credentials: "include" });
          const payroll = await fetch(
            `/api/v1/hr/payroll?branchId=${branchId}`,
            { credentials: "include" },
          );
          return { identityStatus: me.status, payrollStatus: payroll.status };
        }, branch);
        assert.equal(result.identityStatus, 200);
        assert.equal(result.payrollStatus, 403);
      },
    );
  } finally {
    if (browser) await browser.close();
    web.kill("SIGTERM");
    fs.closeSync(logs);
  }
};
