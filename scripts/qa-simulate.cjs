/* Automated personas, not human testers. Run ONLY through qa-with-db.mjs. */
const path = require("path"),
  fs = require("fs"),
  assert = require("assert/strict"),
  { randomUUID } = require("crypto");
const req = require("module").createRequire(
  path.resolve("apps/backend/package.json"),
);
const { NestFactory } = req("@nestjs/core"),
  { ThrottlerStorage } = req("@nestjs/throttler");
const { AppModule } = require("../apps/backend/dist/src/app.module");
const {
  PrismaService,
} = require("../apps/backend/dist/src/prisma/prisma.service");
const request = req("supertest"),
  cookieParser = req("cookie-parser");
const results = [],
  personas = { customers: [], staff: [], reviewers: [] };
if (process.env.QA_ISOLATED !== "1")
  throw new Error("Isolated QA guard missing");
const PASSWORD = "Synthetic-QA-Only-2026!";
const engine = process.env.QA_DATABASE_ENGINE ?? "PGlite single connection";
let app,
  p,
  owner,
  branch,
  restaurant,
  item,
  second,
  ingredient,
  supplier,
  floor,
  tables = [],
  staff = [],
  customers = [],
  reviewers = {};
const expected = [];
function api(agent, method, url, body) {
  const call = agent[method]("/api/v1" + url);
  return body === undefined ? call : call.send(body);
}
async function ok(
  agent,
  method,
  url,
  body,
  status = method === "post" ? 201 : 200,
) {
  const res = await api(agent, method, url, body);
  assert.equal(
    res.status,
    status,
    `${method} ${url}: ${res.status} ${JSON.stringify(res.body)}`,
  );
  return res.body;
}
const q = () => `?branchId=${branch}`;
async function check(id, title, role, fn, classification = "VERIFIED") {
  if (id === "SIM-G") classification = "PARTIALLY VERIFIED";
  const start = Date.now();
  try {
    const evidence = await fn();
    results.push({
      id,
      title,
      role,
      status: classification,
      actual: evidence ?? "Assertions passed",
      durationMs: Date.now() - start,
    });
    console.log("PASS", id, title);
  } catch (e) {
    results.push({
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
    JSON.stringify(
      {
        method:
          "Automated API requests through real NestJS, Prisma and isolated PGlite; single database connection; functional throttling bypassed for fixture volume",
        personas,
        results,
      },
      null,
      2,
    ),
  );
}
function missing(id, title, role, reason) {
  results.push({
    id,
    title,
    role,
    status: "NOT IMPLEMENTED",
    actual: reason,
    durationMs: 0,
  });
}
async function createOrder(n, extra = {}) {
  return ok(staff[n].agent, "post", `/orders${q()}`, {
    type: "TAKEAWAY",
    items: [{ menuItemId: item, quantity: 1, modifierIds: [] }],
    ...extra,
  });
}
async function detail(id) {
  return ok(owner, "get", `/orders/${id}${q()}`);
}
async function pay(id, extra = {}) {
  const d = await detail(id);
  return ok(staff[8].agent, "post", `/orders/${id}/checkout${q()}`, {
    payments: [{ method: "CASH", amount: Number(d.totalAmount) }],
    ...extra,
  });
}
async function reserve(n, extra = {}) {
  return ok(owner, "post", `/reservations${q()}`, {
    customerName: `QA-CUST-${String(n + 1).padStart(3, "0")}`,
    guestCount: 2,
    reservedAt: new Date(Date.now() + 86400_000).toISOString(),
    durationMinutes: 90,
    ...extra,
  });
}
async function guestOrder(n, extra = {}) {
  return ok(customers[n].agent, "post", `/guest/${branch}/orders`, {
    requestId: randomUUID(),
    items: [{ menuItemId: item, quantity: 1, modifierIds: [] }],
    ...extra,
  });
}
async function accept(id) {
  return ok(staff[5].agent, "post", `/orders/${id}/accept${q()}`);
}
async function kitchen(id) {
  const d = await detail(id);
  for (const t of d.kots) {
    for (const status of ["ACCEPTED", "PREPARING", "READY"])
      await ok(staff[5].agent, "patch", `/kds/tickets/${t.id}/status${q()}`, {
        status,
      });
  }
  return detail(id);
}
async function fixtureRole(name, keys) {
  return p.role.create({
    data: {
      restaurantId: restaurant,
      name,
      label: name,
      permissions: {
        create: keys.map((key) => ({ permission: { connect: { key } } })),
      },
    },
  });
}
async function account(name, role) {
  const email = name.toLowerCase() + "@example.invalid";
  const u = await ok(owner, "post", "/users", {
    name,
    email,
    password: PASSWORD,
    roleId: role.id,
    branchIds: [branch],
  });
  const agent = request.agent(app.getHttpServer());
  await ok(agent, "post", "/auth/login", { email, password: PASSWORD });
  return { id: u.id, name, email, role: role.name, agent };
}
(async () => {
  app = await NestFactory.create(AppModule, { logger: ["error"] });
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  const throttle = app.get(ThrottlerStorage);
  throttle.increment = async () => ({
    totalHits: 1,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  });
  await app.listen(4001, "127.0.0.1");
  p = app.get(PrismaService);
  console.log("SETUP app initialized");
  owner = request.agent(app.getHttpServer());
  await ok(owner, "post", "/auth/register", {
    restaurantName: "Fedgix QA Restaurant",
    branchName: "Isolated QA Kitchen",
    ownerName: "QA Bootstrap",
    email: "qa-bootstrap@example.invalid",
    password: PASSWORD,
  });
  console.log("SETUP owner registered");
  const me = (await ok(owner, "get", "/auth/me")).user;
  restaurant = me.restaurantId;
  branch = (
    await p.branch.findFirstOrThrow({ where: { restaurantId: restaurant } })
  ).id;
  await ok(owner, "patch", `/settings/branch${q()}`, {
    customerPortalEnabled: true,
  });
  await ok(owner, "patch", "/settings/restaurant", {
    websiteHeadline: "A better day at the table",
    brandColor: "#0066CC",
    fontFamily: "serif",
  });
  const roles = await p.role.findMany({ where: { restaurantId: restaurant } });
  const byName = Object.fromEntries(roles.map((r) => [r.name, r]));
  byName.QA_HR = await fixtureRole("QA_HR", [
    "staff.manage",
    "attendance.manage",
  ]);
  byName.QA_SUPERVISOR = await fixtureRole("QA_SUPERVISOR", [
    "orders.create",
    "orders.edit",
    "orders.accept",
    "tables.view",
    "menu.view",
    "reservations.manage",
    "kds.manage",
  ]);
  const roleNames = [
    "WAITER",
    "WAITER",
    "WAITER",
    "WAITER",
    "WAITER",
    "KITCHEN_STAFF",
    "KITCHEN_STAFF",
    "CHEF",
    "CASHIER",
    "CASHIER",
    "QA_SUPERVISOR",
    "RESTAURANT_MANAGER",
    "RESTAURANT_MANAGER",
    "INVENTORY_MANAGER",
    "INVENTORY_MANAGER",
    "QA_HR",
    "QA_HR",
    "ACCOUNTANT",
    "BARTENDER",
    "OWNER",
  ];
  for (let i = 0; i < 20; i++) {
    console.log("SETUP staff", i + 1);
    const a = await account(
      `QA-STAFF-${String(i + 1).padStart(3, "0")}`,
      byName[roleNames[i]],
    );
    staff.push(a);
    personas.staff.push({
      id: a.name,
      email: a.email,
      role: a.role,
      shift: "09:00–17:00 Asia/Kolkata (QA fixture)",
      permissions: (await ok(a.agent, "get", "/auth/me")).user.permissions,
    });
  }
  for (const a of staff)
    await ok(owner, "post", `/hr/shifts${q()}`, {
      userId: a.id,
      startsAt: "2026-11-20T03:30:00Z",
      endsAt: "2026-11-20T11:30:00Z",
      note: "QA assigned service shift",
    });
  const reviewRoles = {
    owner: byName.OWNER,
    manager: byName.RESTAURANT_MANAGER,
    finance: await fixtureRole("QA_FINANCE_REVIEW", [
      "dashboard.sales.view",
      "sales.view",
      "reports.access",
      "reports.financial.view",
      "data.export",
      "accounting.manage",
    ]),
    operations: await fixtureRole("QA_OPERATIONS_REVIEW", [
      "tables.view",
      "reservations.manage",
      "kds.manage",
      "inventory.manage",
      "attendance.manage",
      "reports.access",
    ]),
    qa: await fixtureRole("QA_REVIEW", [
      "tables.view",
      "menu.view",
      "kds.manage",
      "reports.access",
    ]),
  };
  for (const [name, role] of Object.entries(reviewRoles)) {
    reviewers[name] = await account(`QA-REVIEW-${name.toUpperCase()}`, role);
    personas.reviewers.push({
      id: reviewers[name].name,
      role: role.name,
      email: reviewers[name].email,
      permissions: (await ok(reviewers[name].agent, "get", "/auth/me")).user
        .permissions,
    });
  }
  for (let i = 0; i < 20; i++) {
    const id = `QA-CUST-${String(i + 1).padStart(3, "0")}`,
      agent = request.agent(app.getHttpServer());
    await ok(agent, "post", `/guest/${branch}/register`, {
      name: id,
      email: id.toLowerCase() + "@example.invalid",
      password: PASSWORD,
    });
    const profile = await ok(agent, "get", `/guest/${branch}/me`);
    customers.push({ name: id, agent });
    personas.customers.push({
      id,
      email: profile.email,
      contact: "Synthetic .invalid email; no messages sent",
    });
  }
  floor = (
    await ok(owner, "post", `/tables/floors${q()}`, { name: "QA Main Floor" })
  ).id;
  for (let i = 0; i < 30; i++)
    tables.push(
      (
        await ok(owner, "post", `/tables${q()}`, {
          floorId: floor,
          number: String(i + 1),
          capacity: 4,
        })
      ).id,
    );
  const station = await p.kitchenStation.create({
    data: { branchId: branch, name: "QA Hot Kitchen" },
  });
  const category = await ok(owner, "post", `/menu/categories${q()}`, {
    name: "QA Menu",
  });
  item = (
    await ok(owner, "post", `/menu/items${q()}`, {
      categoryId: category.id,
      name: "QA Veg Bowl",
      price: 120,
      taxRatePercent: 5,
      isVeg: true,
      kitchenStationId: station.id,
    })
  ).id;
  second = (
    await ok(owner, "post", `/menu/items${q()}`, {
      categoryId: category.id,
      name: "QA Soup",
      price: 60,
      taxRatePercent: 5,
      isVeg: true,
      kitchenStationId: station.id,
    })
  ).id;
  ingredient = (
    await ok(staff[13].agent, "post", `/inventory/ingredients${q()}`, {
      name: "QA Rice",
      unit: "KG",
      reorderLevel: 2,
    })
  ).id;
  supplier = (
    await ok(staff[13].agent, "post", `/inventory/suppliers${q()}`, {
      name: "QA Synthetic Supplier",
    })
  ).id;
  await ok(staff[13].agent, "post", `/inventory/goods-receipts${q()}`, {
    supplierId: supplier,
    items: [{ ingredientId: ingredient, quantity: 100, unitCost: 50 }],
  });
  await ok(owner, "patch", `/inventory/menu-items/${item}/recipe${q()}`, {
    lines: [{ ingredientId: ingredient, quantity: 0.2 }],
  });
  // Completion gate checked before this isolated formal fixture creation.
  await check("C01", "Standard reservation", "QA-CUST-001", async () => {
    const r = await ok(
      customers[0].agent,
      "post",
      `/guest/${branch}/reservations`,
      {
        reservedAt: new Date(Date.now() + 86400_000).toISOString(),
        guestCount: 2,
      },
    );
    assert.equal(r.channel, "ONLINE");
    assert.equal(
      (await ok(customers[0].agent, "get", `/guest/${branch}/reservations`))
        .length,
      1,
    );
    return { reservationId: r.id, status: r.status };
  });
  await check(
    "C02",
    "Reservation plus scheduled collection preorder",
    "QA-CUST-002",
    async () => {
      await ok(customers[1].agent, "post", `/guest/${branch}/reservations`, {
        reservedAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
        guestCount: 2,
      });
      const o = await guestOrder(1, {
        scheduledFor: new Date(Date.now() + 2 * 86400_000).toISOString(),
      });
      assert.ok((await detail(o.id)).scheduledFor);
      return "Booking and scheduled collection order created independently; reservation-linked meal package is not implemented";
    },
    "PARTIALLY VERIFIED",
  );
  await check(
    "C03",
    "Reservation without preorder",
    "QA-CUST-003",
    async () => {
      await ok(customers[2].agent, "post", `/guest/${branch}/reservations`, {
        reservedAt: new Date(Date.now() + 86400_000).toISOString(),
        guestCount: 3,
      });
      assert.equal(
        (await ok(customers[2].agent, "get", `/guest/${branch}/orders`)).length,
        0,
      );
    },
  );
  await check("C04", "Walk-in table order", "QA-CUST-004", async () => {
    const o = await createOrder(0, {
      type: "DINE_IN",
      tableId: tables[0],
      guestName: customers[3].name,
    });
    assert.equal(
      (await p.table.findUniqueOrThrow({ where: { id: tables[0] } })).status,
      "OCCUPIED",
    );
    await kitchen(o.id);
    await pay(o.id);
    return {
      orderId: o.id,
      stockAfter: String(
        (await p.ingredient.findUniqueOrThrow({ where: { id: ingredient } }))
          .currentStock,
      ),
    };
  });
  await check(
    "C05",
    "Customer arrives 30 minutes late",
    "QA-CUST-005",
    async () => {
      const r = await reserve(4, {
        reservedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        tableId: tables[1],
      });
      await ok(owner, "patch", `/reservations/${r.id}/status${q()}`, {
        status: "ARRIVED",
      });
      assert.equal(
        (await p.table.findUniqueOrThrow({ where: { id: tables[1] } })).status,
        "OCCUPIED",
      );
      return "Manual late-arrival handling works; automatic grace-period policy is not implemented";
    },
    "PARTIALLY VERIFIED",
  );
  await check("C06", "Early arrival", "QA-CUST-006", async () => {
    const r = await reserve(5, { tableId: tables[2] });
    await ok(owner, "patch", `/reservations/${r.id}/status${q()}`, {
      status: "ARRIVED",
    });
    assert.equal(
      (await p.reservation.findUniqueOrThrow({ where: { id: r.id } })).status,
      "ARRIVED",
    );
  });
  await check(
    "C07",
    "Additional items after seating",
    "QA-CUST-007",
    async () => {
      const o = await createOrder(1, {
        type: "DINE_IN",
        tableId: tables[3],
        guestName: customers[6].name,
      });
      await ok(staff[1].agent, "post", `/orders/${o.id}/items${q()}`, {
        items: [{ menuItemId: second, quantity: 2, modifierIds: [] }],
      });
      const d = await detail(o.id);
      assert.equal(d.items.length, 2);
      assert.equal(Number(d.totalAmount), 240);
    },
  );
  await check("C08", "Cancel one unprepared item", "QA-CUST-008", async () => {
    const o = await createOrder(2, {
      items: [
        { menuItemId: item, quantity: 1, modifierIds: [] },
        { menuItemId: second, quantity: 1, modifierIds: [] },
      ],
    });
    const d = await detail(o.id);
    await ok(
      staff[2].agent,
      "post",
      `/orders/${o.id}/items/${d.items[1].id}/remove${q()}`,
      { reason: "QA customer changed mind" },
    );
    const next = await detail(o.id);
    assert.equal(next.items.filter((i) => i.status !== "CANCELLED").length, 1);
  });
  await check("C09", "Cancel entire order", "QA-CUST-009", async () => {
    const o = await createOrder(2, { guestName: customers[8].name });
    await ok(staff[11].agent, "post", `/orders/${o.id}/cancel${q()}`, {
      reason: "QA customer cancellation",
      source: "CUSTOMER",
    });
    assert.equal((await detail(o.id)).status, "CANCELLED");
  });
  await check(
    "C10",
    "Customer cancels own reservation",
    "QA-CUST-010",
    async () => {
      const b = await ok(
        customers[9].agent,
        "post",
        `/guest/${branch}/reservations`,
        {
          reservedAt: new Date(Date.now() + 86400_000).toISOString(),
          guestCount: 2,
        },
      );
      await ok(
        customers[9].agent,
        "post",
        `/guest/${branch}/reservations/${b.id}/cancel`,
      );
      assert.equal(
        (await p.reservation.findUniqueOrThrow({ where: { id: b.id } })).status,
        "CANCELLED",
      );
    },
  );
  missing(
    "C11",
    "Customer changes reservation party size",
    "QA-CUST-011",
    "No party-size update workflow; contact restaurant and cancel/rebook. Persona exists and can sign in.",
  );
  await check(
    "C12",
    "Requested table transfer performed by waiter",
    "QA-CUST-012",
    async () => {
      const o = await createOrder(0, {
        type: "DINE_IN",
        tableId: tables[4],
        guestName: customers[11].name,
      });
      await ok(staff[0].agent, "patch", `/orders/${o.id}${q()}`, {
        tableId: tables[5],
      });
      assert.equal((await detail(o.id)).tableId, tables[5]);
    },
  );
  await check(
    "C13",
    "Split-tender bill settlement",
    "QA-CUST-013",
    async () => {
      const o = await createOrder(3, { guestName: customers[12].name });
      await ok(staff[8].agent, "post", `/orders/${o.id}/checkout${q()}`, {
        payments: [
          { method: "CASH", amount: 60 },
          { method: "CARD", amount: 60 },
        ],
      });
      assert.equal((await detail(o.id)).payments.length, 2);
      return "Split tender verified; separate per-person invoices not implemented";
    },
    "PARTIALLY VERIFIED",
  );
  await check(
    "C14",
    "Partial payment then balance",
    "QA-CUST-014",
    async () => {
      const o = await createOrder(3, { guestName: customers[13].name });
      await ok(staff[8].agent, "post", `/orders/${o.id}/checkout${q()}`, {
        allowPartial: true,
        payments: [{ method: "CASH", amount: 40 }],
      });
      assert.equal((await detail(o.id)).status, "OPEN");
      await ok(staff[8].agent, "post", `/orders/${o.id}/checkout${q()}`, {
        payments: [{ method: "CASH", amount: 80 }],
      });
      assert.equal((await detail(o.id)).status, "PAID");
    },
  );
  await check(
    "C15",
    "Invalid payment and retry",
    "QA-CUST-015",
    async () => {
      const o = await createOrder(3, { guestName: customers[14].name });
      assert.equal(
        (
          await api(staff[8].agent, "post", `/orders/${o.id}/checkout${q()}`, {
            payments: [{ method: "CARD", amount: 1 }],
          })
        ).status,
        400,
      );
      assert.equal((await detail(o.id)).payments.length, 0);
      await pay(o.id);
      return "Short payment rejected and manual retry recorded; live card decline is not integrated";
    },
    "PARTIALLY VERIFIED",
  );
  await check("C16", "Refund recorded by manager", "QA-CUST-016", async () => {
    const o = await createOrder(0, { guestName: customers[15].name });
    await pay(o.id);
    await ok(staff[11].agent, "post", `/orders/${o.id}/refund${q()}`, {
      amount: 120,
      method: "CASH",
      reason: "QA full refund",
    });
    assert.equal(await p.refund.count({ where: { orderId: o.id } }), 1);
  });
  await check(
    "C17",
    "Customer takeaway and private history",
    "QA-CUST-017",
    async () => {
      const o = await guestOrder(16);
      await accept(o.id);
      await kitchen(o.id);
      await pay(o.id);
      const h = await ok(customers[16].agent, "get", `/guest/${branch}/orders`);
      assert.equal(h[0].id, o.id);
      assert.equal(h[0].status, "PAID");
    },
  );
  await check(
    "C18",
    "Dietary instructions persist",
    "QA-CUST-018",
    async () => {
      const o = await guestOrder(17, {
        items: [
          {
            menuItemId: item,
            quantity: 1,
            modifierIds: [],
            kitchenNote: "QA no peanuts; severe allergy",
          },
        ],
      });
      assert.equal(
        (await detail(o.id)).items[0].kitchenNote,
        "QA no peanuts; severe allergy",
      );
    },
  );
  await check(
    "C19",
    "Repeat customer multiple orders",
    "QA-CUST-019",
    async () => {
      await guestOrder(18);
      await guestOrder(18);
      assert.equal(
        (await ok(customers[18].agent, "get", `/guest/${branch}/orders`))
          .length,
        2,
      );
    },
  );
  await check(
    "C20",
    "Missing/delayed item investigated",
    "QA-CUST-020",
    async () => {
      const o = await guestOrder(19);
      await accept(o.id);
      await p.kot.updateMany({
        where: { orderId: o.id },
        data: { createdAt: new Date(Date.now() - 30 * 60000) },
      });
      const summary = await ok(owner, "get", `/dashboard/operations${q()}`);
      assert.ok(summary.delayedKitchenTickets >= 1);
      return "Manager delay alert verified; dedicated customer missing-item complaint flow not implemented";
    },
    "PARTIALLY VERIFIED",
  );
  // Staff workflows use different permitted identities.
  let staffOrder, leaveId, payrollId;
  await check("S01", "Waiter takes order", "QA-STAFF-001", async () => {
    staffOrder = await createOrder(0, { type: "DINE_IN", tableId: tables[6] });
    assert.equal(staffOrder.createdById, staff[0].id);
  });
  await check("S02", "Waiter modifies order", "QA-STAFF-002", async () => {
    await ok(staff[1].agent, "post", `/orders/${staffOrder.id}/items${q()}`, {
      items: [{ menuItemId: second, quantity: 1, modifierIds: [] }],
    });
    assert.equal((await detail(staffOrder.id)).items.length, 2);
  });
  await check("S03", "Kitchen marks ready", "QA-STAFF-006", async () => {
    const d = await kitchen(staffOrder.id);
    assert.ok(d.kots.every((k) => k.status === "READY"));
  });
  await check(
    "S04",
    "Kitchen inspects delayed queue",
    "QA-STAFF-007",
    async () => {
      const tickets = await ok(staff[6].agent, "get", `/kds/tickets${q()}`);
      assert.ok(
        tickets.some(
          (t) => new Date(t.createdAt).getTime() < Date.now() - 20 * 60000,
        ),
      );
    },
  );
  await check(
    "S05",
    "Cashier bills and records test payment",
    "QA-STAFF-009",
    async () => {
      const bill = await ok(
        staff[8].agent,
        "post",
        `/orders/${staffOrder.id}/bill-preview${q()}`,
        {},
      );
      assert.equal(bill.totalDue, 180);
      await pay(staffOrder.id);
      assert.equal((await detail(staffOrder.id)).status, "PAID");
    },
  );
  await check(
    "S06",
    "Manager applies authorized discount",
    "QA-STAFF-012",
    async () => {
      const o = await createOrder(0);
      await ok(staff[11].agent, "post", `/orders/${o.id}/checkout${q()}`, {
        discountPercent: 10,
        payments: [{ method: "CASH", amount: 108 }],
      });
      assert.equal(Number((await detail(o.id)).discountAmount), 12);
    },
  );
  await check("S07", "Manager refunds a bill", "QA-STAFF-013", async () => {
    const o = await createOrder(1);
    await pay(o.id);
    await ok(staff[12].agent, "post", `/orders/${o.id}/refund${q()}`, {
      amount: 10,
      method: "CASH",
      reason: "QA adjustment",
    });
    assert.equal(await p.refund.count({ where: { orderId: o.id } }), 1);
  });
  await check("S08", "Employee clocks in", "QA-STAFF-003", async () => {
    await ok(staff[2].agent, "post", "/attendance/clock-in", {
      branchId: branch,
    });
    assert.equal(
      await p.attendance.count({
        where: { userId: staff[2].id, clockOutAt: null },
      }),
      1,
    );
  });
  await check("S09", "Employee clocks out", "QA-STAFF-003", async () => {
    await ok(staff[2].agent, "post", "/attendance/clock-out", {});
    assert.equal(
      await p.attendance.count({
        where: { userId: staff[2].id, clockOutAt: null },
      }),
      0,
    );
  });
  await check("S10", "Employee requests leave", "QA-STAFF-004", async () => {
    leaveId = (
      await ok(staff[3].agent, "post", "/hr/leave", {
        branchId: branch,
        type: "UNPAID",
        startDate: "2026-11-01",
        endDate: "2026-11-02",
        reason: "QA absence",
      })
    ).id;
  });
  await check("S11", "Manager approves leave", "QA-STAFF-012", async () => {
    await ok(staff[11].agent, "patch", `/hr/leave/${leaveId}${q()}`, {
      status: "APPROVED",
    });
    assert.equal(
      (await p.leaveRequest.findUniqueOrThrow({ where: { id: leaveId } }))
        .status,
      "APPROVED",
    );
  });
  await check("S12", "Overlapping leave blocked", "QA-STAFF-004", async () => {
    assert.equal(
      (
        await api(staff[3].agent, "post", "/hr/leave", {
          branchId: branch,
          type: "UNPAID",
          startDate: "2026-11-02",
          endDate: "2026-11-04",
        })
      ).status,
      400,
    );
    assert.equal(
      await p.leaveRequest.count({ where: { userId: staff[3].id } }),
      1,
    );
  });
  await check(
    "S13",
    "Manager creates staff shift",
    "QA-STAFF-012",
    async () => {
      await ok(staff[11].agent, "post", `/hr/shifts${q()}`, {
        userId: staff[4].id,
        startsAt: "2026-11-10T03:30:00Z",
        endsAt: "2026-11-10T11:30:00Z",
      });
    },
  );
  await check(
    "S14",
    "Unauthorized payroll access blocked",
    "QA-STAFF-005",
    async () => {
      assert.equal(
        (await api(staff[4].agent, "get", `/hr/payroll${q()}`)).status,
        403,
      );
    },
  );
  await check(
    "S15",
    "Payroll administrator drafts and finalizes",
    "QA-STAFF-016",
    async () => {
      await ok(staff[15].agent, "put", `/hr/pay/${staff[3].id}${q()}`, {
        payType: "MONTHLY",
        rate: 30000,
      });
      const run = await ok(staff[15].agent, "post", `/hr/payroll${q()}`, {
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
      });
      payrollId = run.id;
      assert.equal(Number(run.lines[0].netPay), 28000);
      await ok(staff[15].agent, "post", `/hr/payroll/${run.id}/finalize${q()}`);
    },
  );
  await check(
    "S16",
    "Manager retrieves salary statement",
    "QA-STAFF-012",
    async () => {
      const slip = await ok(
        staff[11].agent,
        "get",
        `/hr/payroll/${payrollId}/payslip/${staff[3].id}${q()}`,
      );
      assert.equal(Number(slip.netPay), 28000);
      const mine = await ok(staff[3].agent, "get", "/hr/payslips/mine");
      assert.equal(mine.length, 1);
    },
  );
  await check(
    "S17",
    "Inventory receives supplier delivery",
    "QA-STAFF-014",
    async () => {
      const before = Number(
        (await p.ingredient.findUniqueOrThrow({ where: { id: ingredient } }))
          .currentStock,
      );
      await ok(staff[13].agent, "post", `/inventory/goods-receipts${q()}`, {
        supplierId: supplier,
        items: [{ ingredientId: ingredient, quantity: 10, unitCost: 50 }],
      });
      assert.equal(
        Number(
          (await p.ingredient.findUniqueOrThrow({ where: { id: ingredient } }))
            .currentStock,
        ),
        before + 10,
      );
    },
  );
  await check("S18", "Inventory records wastage", "QA-STAFF-015", async () => {
    const before = Number(
      (await p.ingredient.findUniqueOrThrow({ where: { id: ingredient } }))
        .currentStock,
    );
    await ok(staff[14].agent, "post", `/inventory/waste${q()}`, {
      ingredientId: ingredient,
      quantity: 1,
      reason: "SPOILED",
    });
    assert.equal(
      Number(
        (await p.ingredient.findUniqueOrThrow({ where: { id: ingredient } }))
          .currentStock,
      ),
      before - 1,
    );
  });
  await check("S19", "Daily cash closing", "QA-STAFF-018", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const preview = await ok(
      staff[17].agent,
      "get",
      `/accounting/closing/preview${q()}&date=${today}&openingFloat=0`,
    );
    await ok(staff[17].agent, "post", `/accounting/closing${q()}`, {
      businessDate: today,
      openingFloat: 0,
      countedCash: preview.expectedCash,
    });
    assert.equal(await p.cashClosing.count({ where: { branchId: branch } }), 1);
    return preview;
  });
  await check(
    "S20",
    "Owner reviews live dashboard",
    "QA-STAFF-020",
    async () => {
      const d = await ok(staff[19].agent, "get", `/dashboard/summary${q()}`);
      const records = await p.order.aggregate({
        where: { branchId: branch, status: "PAID" },
        _sum: { totalAmount: true },
      });
      assert.equal(d.todayRevenue, Number(records._sum.totalAmount));
      return {
        todayRevenue: d.todayRevenue,
        note: "Gross paid-order metric; refunds reconciled separately",
      };
    },
  );
  await check(
    "S21",
    "Second cashier records collection order payment",
    "QA-STAFF-010",
    async () => {
      const o = await createOrder(1);
      await ok(staff[9].agent, "post", `/orders/${o.id}/checkout${q()}`, {
        payments: [{ method: "CASH", amount: 120 }],
      });
      assert.equal((await detail(o.id)).status, "PAID");
    },
  );
  await check(
    "S22",
    "Chef inspects live kitchen tickets",
    "QA-STAFF-008",
    async () => {
      const rows = await ok(staff[7].agent, "get", `/kds/tickets${q()}`);
      assert.ok(rows.length);
    },
  );
  await check(
    "S23",
    "Supervisor reviews floor and active service",
    "QA-STAFF-011",
    async () => {
      await ok(staff[10].agent, "get", `/tables/floors${q()}`);
      await ok(staff[10].agent, "get", `/orders${q()}`);
      assert.equal(
        (await api(staff[10].agent, "get", `/hr/payroll${q()}`)).status,
        403,
      );
    },
  );
  await check(
    "S24",
    "Second payroll administrator reviews final run",
    "QA-STAFF-017",
    async () => {
      const run = await ok(
        staff[16].agent,
        "get",
        `/hr/payroll/${payrollId}${q()}`,
      );
      assert.equal(run.status, "FINALIZED");
    },
  );
  await check(
    "S25",
    "Bartender receives preparation queue",
    "QA-STAFF-019",
    async () => {
      const rows = await ok(staff[18].agent, "get", `/kds/tickets${q()}`);
      assert.ok(rows.length);
    },
  );
  // Review roles and server-side negative cases.
  for (const [name, a] of Object.entries(reviewers))
    await check(
      "R-" + name,
      `${name} reviewer permissions`,
      a.name,
      async () => {
        const me = (await ok(a.agent, "get", "/auth/me")).user;
        assert.ok(me.permissions.length);
        if (["finance", "operations", "qa"].includes(name))
          assert.equal(
            (await api(a.agent, "get", `/hr/payroll${q()}`)).status,
            403,
          );
        if (name === "finance")
          await ok(a.agent, "get", `/accounting/closing${q()}`);
        if (name === "operations")
          await ok(a.agent, "get", `/kds/tickets${q()}`);
      },
    );
  await check(
    "N01",
    "Customer cannot read another history",
    "customer",
    async () => {
      const h = await ok(customers[0].agent, "get", `/guest/${branch}/orders`);
      assert.equal(h.length, 0);
      assert.equal(
        (await api(customers[0].agent, "get", `/hr/payroll${q()}`)).status,
        401,
      );
    },
  );
  await check(
    "N02",
    "Duplicate customer order idempotency",
    "customer",
    async () => {
      const id = randomUUID();
      const a = await guestOrder(0, { requestId: id });
      const b = await guestOrder(0, { requestId: id });
      assert.equal(a.id, b.id);
      assert.equal(await p.order.count({ where: { id: a.id } }), 1);
    },
  );
  await check("N03", "Invalid quantities rejected", "waiter", async () => {
    assert.equal(
      (
        await api(staff[0].agent, "post", `/orders${q()}`, {
          items: [{ menuItemId: item, quantity: -1, modifierIds: [] }],
        })
      ).status,
      400,
    );
  });
  await check("N04", "Duplicate clock-ins blocked", "employee", async () => {
    await ok(staff[4].agent, "post", "/attendance/clock-in", {
      branchId: branch,
    });
    assert.equal(
      (
        await api(staff[4].agent, "post", "/attendance/clock-in", {
          branchId: branch,
        })
      ).status,
      400,
    );
    await ok(staff[4].agent, "post", "/attendance/clock-out", {});
    assert.equal(
      (await api(staff[4].agent, "post", "/attendance/clock-out", {})).status,
      400,
    );
  });
  await check(
    "N05",
    "Other employee salary statement blocked",
    "waiter",
    async () => {
      assert.equal(
        (
          await api(
            staff[0].agent,
            "get",
            `/hr/payroll/${payrollId}/payslip/${staff[3].id}${q()}`,
          )
        ).status,
        403,
      );
    },
  );
  await check(
    "N06",
    "Reservation overlap and terminal state blocked",
    "manager",
    async () => {
      const first = await reserve(0, { tableId: tables[10] });
      assert.equal(
        (
          await api(owner, "post", `/reservations${q()}`, {
            customerName: "QA Conflict",
            guestCount: 2,
            reservedAt: first.reservedAt,
            tableId: tables[10],
          })
        ).status,
        409,
      );
      await ok(owner, "patch", `/reservations/${first.id}/status${q()}`, {
        status: "CANCELLED",
      });
      assert.equal(
        (
          await api(owner, "patch", `/reservations/${first.id}/status${q()}`, {
            status: "ARRIVED",
          })
        ).status,
        409,
      );
    },
  );
  await check(
    "N07",
    "Cancelling reservation preserves unpaid order table",
    "manager",
    async () => {
      const r = await reserve(0, { tableId: tables[11] });
      await createOrder(0, { type: "DINE_IN", tableId: tables[11] });
      await ok(owner, "patch", `/reservations/${r.id}/status${q()}`, {
        status: "CANCELLED",
      });
      assert.equal(
        (await p.table.findUniqueOrThrow({ where: { id: tables[11] } })).status,
        "OCCUPIED",
      );
    },
  );
  await check(
    "N08",
    "Invalid calendar leave rejected",
    "employee",
    async () => {
      assert.equal(
        (
          await api(staff[4].agent, "post", "/hr/leave", {
            branchId: branch,
            startDate: "2026-02-31",
            endDate: "2026-03-05",
          })
        ).status,
        400,
      );
    },
  );
  await check(
    "N09",
    "Expired customer session rejected",
    "customer",
    async () => {
      const a = await p.customerAccount.findUniqueOrThrow({
        where: {
          branchId_email: {
            branchId: branch,
            email: "qa-cust-020@example.invalid",
          },
        },
      });
      await p.customerSession.updateMany({
        where: { accountId: a.id },
        data: { expiresAt: new Date(0) },
      });
      assert.equal(
        (await api(customers[19].agent, "get", `/guest/${branch}/me`)).status,
        401,
      );
    },
  );
  await check(
    "N10",
    "Retried partial payment is not duplicated",
    "cashier",
    async () => {
      const o = await createOrder(1);
      const id = randomUUID(),
        payload = {
          requestId: id,
          allowPartial: true,
          payments: [{ method: "CASH", amount: 40 }],
        };
      await ok(
        staff[8].agent,
        "post",
        `/orders/${o.id}/checkout${q()}`,
        payload,
      );
      await ok(
        staff[8].agent,
        "post",
        `/orders/${o.id}/checkout${q()}`,
        payload,
      );
      assert.equal((await detail(o.id)).payments.length, 1);
    },
  );
  await check(
    "N11",
    "Invalid stock withdrawal rejected",
    "inventory",
    async () => {
      assert.equal(
        (
          await api(
            staff[13].agent,
            "post",
            `/inventory/ingredients/${ingredient}/adjust${q()}`,
            { quantity: -100000, note: "QA invalid withdrawal" },
          )
        ).status,
        400,
      );
    },
  );
  await check(
    "N12",
    "Concurrent additional items persist",
    "waiters",
    async () => {
      const o = await createOrder(0);
      await Promise.all([
        ok(staff[0].agent, "post", `/orders/${o.id}/items${q()}`, {
          items: [{ menuItemId: second, quantity: 1, modifierIds: [] }],
        }),
        ok(staff[1].agent, "post", `/orders/${o.id}/items${q()}`, {
          items: [{ menuItemId: second, quantity: 2, modifierIds: [] }],
        }),
      ]);
      const d = await detail(o.id);
      assert.equal(Number(d.totalAmount), 300);
      return "Concurrent HTTP requests serialized through one QA DB connection; native multi-connection race remains unverified";
    },
    "PARTIALLY VERIFIED",
  );
  await check(
    "N13",
    "Cancelled items stay excluded when adding more",
    "waiter",
    async () => {
      const o = await createOrder(0, {
        items: [
          { menuItemId: item, quantity: 1, modifierIds: [] },
          { menuItemId: second, quantity: 1, modifierIds: [] },
        ],
      });
      const d = await detail(o.id);
      await ok(
        staff[0].agent,
        "post",
        `/orders/${o.id}/items/${d.items.find((i) => i.menuItemId === second).id}/remove${q()}`,
        { reason: "QA remove soup" },
      );
      await ok(staff[0].agent, "post", `/orders/${o.id}/items${q()}`, {
        items: [{ menuItemId: item, quantity: 1, modifierIds: [] }],
      });
      assert.equal(Number((await detail(o.id)).totalAmount), 240);
    },
  );
  await check(
    "SIM-A",
    "Normal service from seating through paid bill",
    "multi-role",
    async () => {
      const o = await createOrder(0, { type: "DINE_IN", tableId: tables[20] });
      await kitchen(o.id);
      await pay(o.id);
      assert.equal(
        (await p.table.findUniqueOrThrow({ where: { id: tables[20] } })).status,
        "AVAILABLE",
      );
    },
  );
  await check(
    "SIM-B",
    "Busy dinner service concurrent new orders",
    "multi-role",
    async () => {
      const orders = await Promise.all(
        [0, 1, 2, 3, 4].map((n) =>
          createOrder(n, { type: "DINE_IN", tableId: tables[21 + n] }),
        ),
      );
      assert.equal(new Set(orders.map((o) => o.orderNumber)).size, 5);
      for (const o of orders) await kitchen(o.id);
      return "Five concurrent HTTP orders; single DB connection limits race coverage";
    },
    "PARTIALLY VERIFIED",
  );
  await check(
    "SIM-C",
    "Reservation disruption review",
    "operations reviewer",
    async () => {
      const rows = await ok(
        reviewers.operations.agent,
        "get",
        `/reservations${q()}`,
      );
      assert.ok(rows.some((r) => r.status === "ARRIVED"));
      assert.ok(rows.some((r) => r.status === "CANCELLED"));
      return "Early, late and cancelled bookings visible; party-size editing remains unavailable";
    },
    "PARTIALLY VERIFIED",
  );
  await check(
    "SIM-D",
    "Prepared-item cancellation fails safely",
    "waiter and kitchen",
    async () => {
      const o = await createOrder(0);
      await kitchen(o.id);
      const d = await detail(o.id);
      assert.equal(
        (
          await api(
            staff[0].agent,
            "post",
            `/orders/${o.id}/items/${d.items[0].id}/remove${q()}`,
            { reason: "QA too late" },
          )
        ).status,
        400,
      );
    },
  );
  await check(
    "SIM-E",
    "Payment exceptions retain outstanding balance",
    "cashier",
    async () => {
      const o = await createOrder(1);
      const requestId = randomUUID();
      const payload = {
        allowPartial: true,
        requestId,
        payments: [{ method: "CASH", amount: 20 }],
      };
      await ok(
        staff[8].agent,
        "post",
        `/orders/${o.id}/checkout${q()}`,
        payload,
      );
      await ok(
        staff[8].agent,
        "post",
        `/orders/${o.id}/checkout${q()}`,
        payload,
      );
      const d = await detail(o.id);
      assert.equal(d.payments.length, 1);
      assert.equal(d.status, "OPEN");
    },
  );
  await check(
    "SIM-F",
    "Approved leave prevents shift then manager reassigns",
    "manager",
    async () => {
      const payload = {
        userId: staff[3].id,
        startsAt: "2026-11-01T03:30:00Z",
        endsAt: "2026-11-01T11:30:00Z",
      };
      assert.equal(
        (await api(staff[11].agent, "post", `/hr/shifts${q()}`, payload))
          .status,
        400,
      );
      await ok(staff[11].agent, "post", `/hr/shifts${q()}`, {
        ...payload,
        userId: staff[4].id,
      });
    },
  );
  await check(
    "SIM-G",
    "End-of-day financial and inventory reconciliation",
    "finance and inventory",
    async () => {
      const payments = await p.payment.aggregate({
        where: { order: { branchId: branch } },
        _sum: { amount: true },
      });
      const refunds = await p.refund.aggregate({
        where: { order: { branchId: branch } },
        _sum: { amount: true },
      });
      const moves = await p.stockMovement.aggregate({
        where: { ingredientId: ingredient },
        _sum: { quantity: true },
      });
      const stock = await p.ingredient.findUniqueOrThrow({
        where: { id: ingredient },
      });
      assert.equal(Number(stock.currentStock), Number(moves._sum.quantity));
      const report = await ok(
        reviewers.finance.agent,
        "get",
        `/reports/sales-daily${q()}&from=2026-01-01&to=2026-12-31`,
      );
      assert.ok(report.rows);
      return {
        payments: Number(payments._sum.amount),
        refunds: Number(refunds._sum.amount),
        stock: Number(stock.currentStock),
        reportRows: report.rows.length,
        note: "Recorded manual payments only; not bank reconciliation",
      };
    },
  );
  // Save full fixture identifiers but never credentials or session tokens.
  fs.writeFileSync(
    "docs/qa-evidence/persona-ids.json",
    JSON.stringify(
      {
        branch,
        staff: staff.map(({ agent, ...x }) => x),
        customers: personas.customers,
        reviewers: personas.reviewers,
      },
      null,
      2,
    ),
  );
  if (process.env.QA_BROWSER === "1")
    await require("./qa-browser.cjs")({
      app,
      p,
      branch,
      staff,
      customers,
      reviewers,
      password: PASSWORD,
      check,
    });
  await app.close();
  const summary = results.reduce(
    (a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a),
    {},
  );
  console.log("SUMMARY", JSON.stringify(summary));
  fs.writeFileSync(
    "docs/qa-evidence/simulation.json",
    JSON.stringify(
      {
        method: `Automated API and multi-role simulation; ${engine}; no real messages/payments; throttle disabled for functional volume`,
        personas,
        summary,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(results.some((r) => r.status === "FAILED") ? 1 : 0);
})().catch(async (e) => {
  fs.writeFileSync("docs/qa-evidence/simulation-setup-error.txt", e.stack);
  console.error(e);
  if (app) await app.close();
  process.exit(1);
});
