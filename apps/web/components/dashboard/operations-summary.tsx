"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
type Operations = {
  date: string;
  timezone: string;
  employeesPresent: number;
  employeesOnLeave: number;
  reservationsToday: number;
  openOrders: number;
  delayedKitchenTickets: number;
  expensesToday: number;
  latestPayroll: { status: string; periodEnd: string } | null;
  lowStock: { id: string; name: string }[];
};
export function OperationsSummary() {
  const { branchId } = useBranch();
  const me = useCurrentUser();
  const allowed = hasPermission(me.data?.user, "staff.manage");
  const q = useQuery({
    queryKey: ["operations-summary", branchId],
    queryFn: () =>
      api.get<Operations>(`/dashboard/operations?branchId=${branchId}`),
    enabled: !!branchId && allowed,
    refetchInterval: 15000,
  });
  if (!allowed) return null;
  if (q.isPending)
    return <p className="text-sm text-muted-foreground">Loading operations…</p>;
  if (q.error || !q.data)
    return (
      <p role="alert" className="text-sm text-destructive">
        Operational summary unavailable.{" "}
        <button onClick={() => void q.refetch()} className="underline">
          Retry
        </button>
      </p>
    );
  const d = q.data;
  return (
    <section
      aria-label="Operations at a glance"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <h2 className="font-semibold">Operations at a glance</h2>
        <span className="text-xs text-muted-foreground">
          {d.date} · {d.timezone}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Present", d.employeesPresent, "/attendance"],
          ["On leave", d.employeesOnLeave, "/team"],
          ["Reservations", d.reservationsToday, "/reservations"],
          ["Open orders", d.openOrders, "/orders"],
          ["Delayed tickets", d.delayedKitchenTickets, "/kds"],
          ["Low stock", d.lowStock.length, "/inventory"],
        ].map(([label, value, href]) => (
          <Link
            key={String(label)}
            href={String(href)}
            className="rounded-xl bg-secondary p-4"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Link>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Expenses today: {d.expensesToday.toFixed(2)}</span>
        <span>
          Latest payroll: {d.latestPayroll?.status ?? "No payroll yet"}
        </span>
        <span>Kitchen delay threshold: 20 minutes</span>
      </div>
      {d.lowStock.length > 0 && (
        <p className="mt-3 text-sm text-warning">
          Stock attention:{" "}
          {d.lowStock
            .slice(0, 5)
            .map((i) => i.name)
            .join(", ")}
        </p>
      )}
    </section>
  );
}
