"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
type Slip = {
  id: string;
  basePay: string;
  tipShare: string;
  unpaidLeaveDeduction: string;
  netPay: string;
  hoursWorked: string;
  run: { periodStart: string; periodEnd: string; status: string };
};
export default function MyPay() {
  const q = useQuery({
    queryKey: ["my-payslips"],
    queryFn: () => api.get<Slip[]>("/hr/payslips/mine"),
  });
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">My salary statements</h1>
        <button
          className="min-h-11 rounded-xl border px-4 print:hidden"
          onClick={() => window.print()}
        >
          Print / Save PDF
        </button>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Finalized payroll calculations. A statement does not confirm salary
        payment or statutory compliance.
      </p>
      {q.isPending && <p>Loading statements…</p>}
      {q.error && <p role="alert">Unable to load salary statements.</p>}
      {q.data?.length === 0 && (
        <p className="rounded-xl border p-6">
          No finalized salary statements yet.
        </p>
      )}
      {q.data?.map((s) => (
        <article
          key={s.id}
          className="mb-6 break-inside-avoid rounded-2xl border bg-card p-6"
        >
          <h2 className="mb-4 text-lg font-semibold">
            {s.run.periodStart.slice(0, 10)} to {s.run.periodEnd.slice(0, 10)}
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Hours worked", s.hoursWorked],
              ["Base pay", s.basePay],
              ["Tip share", s.tipShare],
              ["Unpaid leave deduction", s.unpaidLeaveDeduction],
              ["Net pay", s.netPay],
              ["Status", s.run.status],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}
