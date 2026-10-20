"use client";
/* eslint-disable @next/next/no-img-element -- Restaurant uploads use backend asset URLs directly; image optimization is not assumed. */

import { use, useState, type FormEvent, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Utensils,
  ShoppingBag,
  CalendarDays,
  Clock,
  LogOut,
  Plus,
  Minus,
} from "lucide-react";
import { api } from "@/lib/api";

type Modifier = { id: string; name: string; priceAdjustment: string };
type Group = {
  modifierGroup: {
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    isRequired: boolean;
    modifiers: Modifier[];
  };
};
type Item = {
  id: string;
  name: string;
  price: string;
  description: string | null;
  imageUrl: string | null;
  isVeg: boolean;
  allergens: string[];
  modifierGroups: Group[];
};
type Shop = {
  name: string;
  branchName: string;
  address: string | null;
  phone: string | null;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  brandColor: string;
  fontFamily: string;
  headline: string | null;
  heroImageUrl: string | null;
  categories: { id: string; name: string; items: Item[] }[];
};
type Profile = { name: string; email: string; loyaltyPoints: number };
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  acceptance: string;
  totalAmount: string;
  items: { nameSnapshot: string; quantity: number; status: string }[];
};
type Booking = {
  id: string;
  reservedAt: string;
  guestCount: number;
  status: string;
};
type Line = {
  key: string;
  item: Item;
  quantity: number;
  modifierIds: string[];
  notes: string;
};
const field =
  "w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900";
const action =
  "min-h-12 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50";
const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export default function RestaurantWebsite({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const base = `/guest/${encodeURIComponent(branchId)}`;
  const shop = useQuery({
    queryKey: ["guest-menu", branchId],
    queryFn: () => api.get<Shop>(`${base}/menu`),
    retry: false,
  });
  const me = useQuery({
    queryKey: ["guest-me", branchId],
    queryFn: () => api.get<Profile>(`${base}/me`),
    retry: false,
  });
  const history = useQuery({
    queryKey: ["guest-orders", branchId],
    queryFn: () => api.get<Order[]>(`${base}/orders`),
    enabled: !!me.data,
    refetchInterval: 10000,
  });
  const bookings = useQuery({
    queryKey: ["guest-bookings", branchId],
    queryFn: () => api.get<Booking[]>(`${base}/reservations`),
    enabled: !!me.data,
  });
  const [tab, setTab] = useState("menu");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: shop.data?.currency ?? "INR",
    }).format(n);
  async function perform(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again");
    } finally {
      setBusy(false);
    }
  }
  function form(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    return new FormData(e.currentTarget);
  }
  function add() {
    if (!selected) return;
    for (const { modifierGroup: g } of selected.modifierGroups) {
      const count = g.modifiers.filter((m) => modifiers.includes(m.id)).length;
      if (
        count < Math.max(g.minSelect, g.isRequired ? 1 : 0) ||
        count > g.maxSelect
      ) {
        setMessage(
          `Choose ${g.minSelect}–${g.maxSelect} options for ${g.name}`,
        );
        return;
      }
    }
    setCart((c) => [
      ...c,
      {
        key: crypto.randomUUID(),
        item: selected,
        quantity: 1,
        modifierIds: modifiers,
        notes: note,
      },
    ]);
    setRequestId(null);
    setSelected(null);
    setMessage("Added to your cart");
  }
  if (shop.isPending)
    return (
      <main className="p-12" aria-live="polite">
        Loading restaurant…
      </main>
    );
  if (shop.error || !shop.data)
    return (
      <main className="mx-auto max-w-xl p-12">
        <h1 className="text-2xl font-bold">Ordering is unavailable</h1>
        <p className="mt-3">
          {shop.error?.message ?? "Please contact the restaurant."}
        </p>
        <Link href="/">Return home</Link>
      </main>
    );
  const s = shop.data;
  const accent = { backgroundColor: s.brandColor };
  const style = {
    "--restaurant-accent": s.brandColor,
    fontFamily:
      s.fontFamily === "serif" ? "Georgia, serif" : "Arial, sans-serif",
  } as CSSProperties;
  const total = cart.reduce(
    (sum, l) =>
      sum +
      l.quantity *
        (Number(l.item.price) +
          l.item.modifierGroups
            .flatMap((g) => g.modifierGroup.modifiers)
            .filter((m) => l.modifierIds.includes(m.id))
            .reduce((n, m) => n + Number(m.priceAdjustment), 0)),
    0,
  );
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={style}>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {s.logoUrl ? (
              <img
                src={s.logoUrl}
                alt=""
                className="h-11 w-11 rounded-xl object-contain"
              />
            ) : (
              <Utensils className="h-9 w-9" />
            )}
            <div>
              <p className="font-bold">{s.name}</p>
              <p className="text-xs text-slate-500">{s.branchName}</p>
            </div>
          </div>
          {me.data ? (
            <button
              className="flex min-h-11 items-center gap-2 text-sm"
              onClick={() =>
                void perform(async () => {
                  await api.post("/guest/logout");
                  window.location.reload();
                })
              }
            >
              <LogOut size={16} />
              Sign out
            </button>
          ) : (
            <button className={action} onClick={() => setTab("account")}>
              Sign in
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-10 text-white sm:px-12 sm:py-16">
          {s.heroImageUrl && (
            <img
              src={s.heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-25"
            />
          )}
          <div className="relative max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">
              Freshly prepared. Thoughtfully served.
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {s.headline || `Welcome to ${s.name}`}
            </h1>
            <p className="mt-5 text-slate-200">
              Explore our menu, request a table, or order ahead for collection.
            </p>
            {s.address && (
              <p className="mt-3 text-sm text-slate-300">{s.address}</p>
            )}
          </div>
        </section>
        <nav
          className="my-6 flex gap-2 overflow-x-auto"
          aria-label="Restaurant navigation"
        >
          {[
            ["menu", "Menu"],
            ["cart", `Cart (${cart.reduce((n, l) => n + l.quantity, 0)})`],
            ["reserve", "Reserve a table"],
            ["history", "My orders"],
            ["account", me.data?.name || "Account"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`min-h-12 shrink-0 rounded-xl px-4 text-sm font-semibold ${tab === id ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
              onClick={() => {
                setTab(id);
                setMessage("");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        {message && (
          <p
            role="status"
            className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-900"
          >
            {message}
          </p>
        )}
        {tab === "menu" && (
          <>
            <label className="sr-only" htmlFor="menu-search">
              Search menu
            </label>
            <input
              id="menu-search"
              className={`${field} mb-6`}
              placeholder="Search dishes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {s.categories.length === 0 && (
              <p className={panel}>
                Our menu is being prepared. Please check back soon.
              </p>
            )}
            {s.categories.map((category) => (
              <section key={category.id} className="mb-8">
                <h2 className="mb-4 text-2xl font-bold">{category.name}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {category.items
                    .filter((i) =>
                      i.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((item) => (
                      <article
                        key={item.id}
                        className={`${panel} flex flex-col`}
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="mb-4 h-40 w-full rounded-xl object-cover"
                          />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-bold">{item.name}</h3>
                          <span className="text-sm font-semibold">
                            {money(Number(item.price))}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {item.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {item.isVeg ? "Vegetarian" : "Non-vegetarian"}
                          {item.allergens?.length
                            ? ` · Allergens: ${item.allergens.join(", ")}`
                            : ""}
                        </p>
                        <button
                          className={`${action} mt-5 w-full`}
                          style={accent}
                          onClick={() => {
                            setSelected(item);
                            setModifiers([]);
                            setNote("");
                          }}
                        >
                          Choose options
                        </button>
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </>
        )}
        {selected && tab === "menu" && (
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Customize ${selected.name}`}
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
          >
            <div
              className={`${panel} max-h-[85vh] w-full max-w-lg overflow-y-auto`}
            >
              <h2 className="mb-4 text-xl font-bold">{selected.name}</h2>
              {selected.modifierGroups.map(({ modifierGroup: g }) => (
                <fieldset key={g.id} className="mb-4">
                  <legend className="font-semibold">
                    {g.name} ({g.minSelect}–{g.maxSelect})
                  </legend>
                  {g.modifiers.map((m) => (
                    <label
                      key={m.id}
                      className="flex min-h-12 items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={modifiers.includes(m.id)}
                        onChange={(e) =>
                          setModifiers((a) =>
                            e.target.checked
                              ? [...a, m.id]
                              : a.filter((id) => id !== m.id),
                          )
                        }
                      />
                      {m.name}{" "}
                      {Number(m.priceAdjustment) > 0 &&
                        money(Number(m.priceAdjustment))}
                    </label>
                  ))}
                </fieldset>
              ))}
              <label htmlFor="item-note" className="text-sm">
                Dietary or preparation instructions
              </label>
              <textarea
                id="item-note"
                className={`${field} mt-2`}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="mt-4 flex gap-3">
                <button className={action} onClick={add}>
                  Add to cart
                </button>
                <button
                  className="min-h-12 px-4"
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}
        {tab === "cart" && (
          <section className={`${panel} mx-auto max-w-2xl`}>
            <h2 className="mb-5 text-2xl font-bold">
              <ShoppingBag className="mr-2 inline" />
              Your cart
            </h2>
            {!cart.length ? (
              <p>Your cart is empty. Choose a dish from the menu.</p>
            ) : (
              <>
                <div className="space-y-4">
                  {cart.map((l) => (
                    <div
                      key={l.key}
                      className="flex items-center justify-between gap-4 border-b pb-4"
                    >
                      <div>
                        <p className="font-semibold">{l.item.name}</p>
                        <p className="text-xs text-slate-500">{l.notes}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          aria-label={`Decrease ${l.item.name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border"
                          onClick={() => {
                            setCart((c) =>
                              c
                                .map((x) =>
                                  x.key === l.key
                                    ? { ...x, quantity: x.quantity - 1 }
                                    : x,
                                )
                                .filter((x) => x.quantity > 0),
                            );
                            setRequestId(null);
                          }}
                        >
                          <Minus size={16} />
                        </button>
                        <span>{l.quantity}</span>
                        <button
                          aria-label={`Increase ${l.item.name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border"
                          onClick={() => {
                            setCart((c) =>
                              c.map((x) =>
                                x.key === l.key
                                  ? {
                                      ...x,
                                      quantity: Math.min(99, x.quantity + 1),
                                    }
                                  : x,
                              ),
                            );
                            setRequestId(null);
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="my-4 text-xl font-bold">
                  Menu estimate {money(total)}
                </p>
                <p className="mb-5 text-sm text-slate-600">
                  The restaurant calculates final taxes and discounts. Payment
                  is collected at the counter.
                </p>
                <form
                  onSubmit={(e) => {
                    const f = form(e);
                    void perform(async () => {
                      if (!me.data) {
                        setTab("account");
                        throw new Error("Please sign in before ordering");
                      }
                      const id = requestId ?? crypto.randomUUID();
                      setRequestId(id);
                      const date = f.get("scheduledFor") as string;
                      const o = await api.post<{ orderNumber: string }>(
                        `${base}/orders`,
                        {
                          requestId: id,
                          items: cart.map((l) => ({
                            menuItemId: l.item.id,
                            quantity: l.quantity,
                            modifierIds: l.modifierIds,
                            kitchenNote: l.notes || undefined,
                          })),
                          ...(date
                            ? { scheduledFor: new Date(date).toISOString() }
                            : {}),
                          notes: f.get("notes") || undefined,
                        },
                      );
                      setCart([]);
                      setRequestId(null);
                      await history.refetch();
                      setTab("history");
                      setMessage(
                        `Order ${o.orderNumber} submitted. Pay at the counter.`,
                      );
                    });
                  }}
                >
                  <label className="block text-sm" htmlFor="collect-at">
                    Collection time (optional; at least 10 minutes ahead)
                  </label>
                  <input
                    id="collect-at"
                    type="datetime-local"
                    name="scheduledFor"
                    className={`${field} my-2`}
                  />
                  <label className="block text-sm" htmlFor="order-notes">
                    Order instructions
                  </label>
                  <textarea
                    id="order-notes"
                    name="notes"
                    maxLength={500}
                    className={`${field} my-2`}
                  />
                  <button
                    className={`${action} mt-3 w-full`}
                    style={accent}
                    disabled={busy}
                  >
                    {busy ? "Submitting…" : "Submit order · pay at counter"}
                  </button>
                </form>
              </>
            )}
          </section>
        )}
        {tab === "reserve" && (
          <section className={`${panel} mx-auto max-w-2xl`}>
            <h2 className="mb-3 text-2xl font-bold">
              <CalendarDays className="mr-2 inline" />
              Request a table
            </h2>
            <p className="mb-6 text-sm text-slate-600">
              The restaurant confirms your request and assigns a suitable table.
              Contact the restaurant for changes or late arrivals.
            </p>
            {!me.data ? (
              <button className={action} onClick={() => setTab("account")}>
                Sign in to reserve
              </button>
            ) : (
              <>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    const f = form(e);
                    void perform(async () => {
                      await api.post(`${base}/reservations`, {
                        reservedAt: new Date(String(f.get("at"))).toISOString(),
                        guestCount: Number(f.get("guests")),
                        specialRequests: f.get("requests") || undefined,
                      });
                      await bookings.refetch();
                      setMessage(
                        "Reservation request submitted. Check its status below.",
                      );
                    });
                  }}
                >
                  <label className="block">
                    Date and time ({s.timezone})
                    <input
                      className={field}
                      name="at"
                      type="datetime-local"
                      required
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Times are entered in your device timezone. Reservation
                    status below uses the restaurant timezone.
                  </p>
                  <label className="block">
                    Guests
                    <input
                      className={field}
                      type="number"
                      name="guests"
                      min={1}
                      max={40}
                      defaultValue={2}
                      required
                    />
                  </label>
                  <label className="block">
                    Special requests
                    <textarea
                      name="requests"
                      className={field}
                      maxLength={500}
                    />
                  </label>
                  <button className={action} style={accent} disabled={busy}>
                    Request reservation
                  </button>
                </form>
                <h3 className="mb-3 mt-8 font-bold">Your reservations</h3>
                {bookings.error && (
                  <p role="alert">Unable to load reservations. Please retry.</p>
                )}
                {bookings.data?.length === 0 && <p>No reservations yet.</p>}
                {bookings.data?.map((b) => (
                  <div key={b.id} className="mt-3 rounded-xl bg-slate-50 p-4">
                    <p>
                      {new Date(b.reservedAt).toLocaleString("en-IN", {
                        timeZone: s.timezone,
                      })}{" "}
                      · {b.guestCount} guests
                    </p>
                    <p className="mt-1 text-sm font-semibold">{b.status}</p>
                    {["RESERVED", "CONFIRMED"].includes(b.status) && (
                      <button
                        className="mt-2 min-h-11 text-sm underline"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            await api.post(
                              `${base}/reservations/${b.id}/cancel`,
                            );
                            await bookings.refetch();
                            setMessage("Reservation cancelled");
                          })
                        }
                      >
                        Cancel reservation
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </section>
        )}
        {tab === "history" && (
          <section className={`${panel} mx-auto max-w-2xl`}>
            <h2 className="mb-5 text-2xl font-bold">
              <Clock className="mr-2 inline" />
              Your orders
            </h2>
            {!me.data ? (
              <button className={action} onClick={() => setTab("account")}>
                Sign in to view orders
              </button>
            ) : (
              <>
                {history.isPending && <p>Loading orders…</p>}
                {history.error && (
                  <p role="alert">Unable to load orders. Please retry.</p>
                )}
                {history.data?.length === 0 && (
                  <p>No orders yet. Your first order will appear here.</p>
                )}
                {history.data?.map((o) => (
                  <article key={o.id} className="mb-4 rounded-xl border p-4">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-bold">{o.orderNumber}</h3>
                      <span>{money(Number(o.totalAmount))}</span>
                    </div>
                    <p className="my-2 text-sm">
                      {o.status} ·{" "}
                      {o.acceptance === "PENDING"
                        ? "Awaiting restaurant acceptance"
                        : o.acceptance}
                    </p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {o.items.map((i, n) => (
                        <li key={n}>
                          {i.quantity} × {i.nameSnapshot} · {i.status}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </>
            )}
          </section>
        )}
        {tab === "account" && (
          <section className={`${panel} mx-auto max-w-lg`}>
            {me.data ? (
              <>
                <h2 className="text-2xl font-bold">Hello, {me.data.name}</h2>
                <p className="my-3 text-slate-600">{me.data.email}</p>
                <p>Loyalty points: {me.data.loyaltyPoints}</p>
              </>
            ) : (
              <>
                <h2 className="mb-5 text-2xl font-bold">
                  {register ? "Create your account" : "Welcome back"}
                </h2>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    const f = form(e);
                    void perform(async () => {
                      await api.post(
                        `${base}/${register ? "register" : "login"}`,
                        {
                          email: f.get("email"),
                          password: f.get("password"),
                          ...(register ? { name: f.get("name") } : {}),
                        },
                      );
                      await me.refetch();
                      setTab("menu");
                      setMessage("You are signed in");
                    });
                  }}
                >
                  {register && (
                    <label className="block">
                      Name
                      <input
                        name="name"
                        className={field}
                        required
                        maxLength={60}
                      />
                    </label>
                  )}
                  <label className="block">
                    Email
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={field}
                      required
                    />
                  </label>
                  <label className="block">
                    Password
                    <input
                      name="password"
                      type="password"
                      autoComplete={
                        register ? "new-password" : "current-password"
                      }
                      className={field}
                      minLength={register ? 12 : 1}
                      maxLength={72}
                      required
                    />
                  </label>
                  {register && (
                    <p className="text-xs text-slate-500">
                      Use at least 12 characters. Contact the restaurant for
                      account assistance.
                    </p>
                  )}
                  <button
                    className={`${action} w-full`}
                    style={accent}
                    disabled={busy}
                  >
                    {busy
                      ? "Please wait…"
                      : register
                        ? "Create account"
                        : "Sign in"}
                  </button>
                </form>
                <button
                  className="mt-5 min-h-11 text-sm underline"
                  onClick={() => setRegister(!register)}
                >
                  {register
                    ? "Already registered? Sign in"
                    : "New here? Create an account"}
                </button>
              </>
            )}
          </section>
        )}
      </main>
      <footer className="mt-12 border-t px-4 py-6 text-center text-xs text-slate-500">
        Powered by Fedgix Restaurant OS ·{" "}
        <a
          href="https://github.com/Fedgix/nodedr-restaurant-pos/tree/fedgix/development"
          className="underline"
        >
          Source code
        </a>{" "}
        · Based on Nodedr OrderRestro · AGPL-3.0
      </footer>
    </div>
  );
}
