// Pure payroll maths, kept separate from the database code so it can be
// unit-tested. All money is in major units (e.g. rupees), rounded to 2 dp.

export const round2 = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export interface PayInput {
  userId: string;
  payType: 'MONTHLY' | 'HOURLY';
  rate: number;
  hoursWorked: number;
  /** Approved UNPAID leave days that fall inside the period. */
  unpaidLeaveDays: number;
  /** Exact dates support correct cross-month leave proration. */
  unpaidLeaveDates?: string[];
}

export interface PayLineResult {
  userId: string;
  hoursWorked: number;
  basePay: number;
  tipShare: number;
  unpaidLeaveDeduction: number;
  netPay: number;
}

/** Inclusive day count between two YYYY-MM-DD dates. */
export function daysInclusive(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

export function daysInMonthOf(date: string): number {
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * MONTHLY staff earn a fraction of the rate for each calendar day using
 * that day's month length. Exact unpaid dates use the same day basis. HOURLY staff earn
 * rate x clocked hours and have no leave deduction (unpaid by nature).
 *
 * The tip pool is split in proportion to hours worked; the last recipient
 * absorbs rounding so the shares always add up to the pool exactly.
 */
export function computePayroll(
  periodStart: string,
  periodEnd: string,
  tipPool: number,
  staff: PayInput[],
): PayLineResult[] {
  const start = Date.parse(`${periodStart}T00:00:00Z`);
  const end = Date.parse(`${periodEnd}T00:00:00Z`);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    daysInclusive(periodStart, periodEnd) > 366
  )
    throw new Error('Payroll period must contain 1 to 366 valid days');
  const dates: string[] = [];
  for (let t = start; t <= end; t += 86_400_000)
    dates.push(new Date(t).toISOString().slice(0, 10));
  const monthlyFraction = dates.reduce(
    (sum, d) => sum + 1 / daysInMonthOf(d),
    0,
  );
  const monthDays = daysInMonthOf(periodStart);
  const totalHours = staff.reduce((s, p) => s + p.hoursWorked, 0);

  const tipRecipients = staff.filter((p) => p.hoursWorked > 0);
  const tips = new Map<string, number>();
  if (tipPool > 0 && totalHours > 0) {
    let allocated = 0;
    tipRecipients.forEach((p, i) => {
      const share =
        i === tipRecipients.length - 1
          ? round2(tipPool - allocated)
          : round2((tipPool * p.hoursWorked) / totalHours);
      allocated = round2(allocated + share);
      tips.set(p.userId, share);
    });
  }

  return staff.map((p) => {
    const hours = round2(p.hoursWorked);
    let basePay: number;
    let deduction = 0;
    if (p.payType === 'HOURLY') {
      basePay = round2(p.rate * p.hoursWorked);
    } else {
      basePay = round2(p.rate * monthlyFraction);
      const unpaidFraction = p.unpaidLeaveDates
        ? [...new Set(p.unpaidLeaveDates)]
            .filter((d) => d >= periodStart && d <= periodEnd)
            .reduce((sum, d) => sum + 1 / daysInMonthOf(d), 0)
        : p.unpaidLeaveDays / monthDays;
      deduction = Math.min(basePay, round2(p.rate * unpaidFraction));
    }
    const tipShare = tips.get(p.userId) ?? 0;
    return {
      userId: p.userId,
      hoursWorked: hours,
      basePay,
      tipShare,
      unpaidLeaveDeduction: deduction,
      netPay: round2(basePay - deduction + tipShare),
    };
  });
}
