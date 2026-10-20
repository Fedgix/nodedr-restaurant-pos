import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Use a valid calendar date",
  );

export const shiftSchema = z
  .object({
    userId: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    note: z.string().max(200).optional(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: "A shift must end after it starts",
    path: ["endsAt"],
  });
export type ShiftDto = z.infer<typeof shiftSchema>;

export const leaveTypeSchema = z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]);
export const leaveRequestSchema = z
  .object({
    branchId: z.string().min(1),
    type: leaveTypeSchema.default("ANNUAL"),
    startDate: isoDate,
    endDate: isoDate,
    reason: z.string().max(300).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date cannot be before start date",
    path: ["endDate"],
  });
export type LeaveRequestDto = z.infer<typeof leaveRequestSchema>;

export const leaveDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const staffPaySchema = z.object({
  payType: z.enum(["MONTHLY", "HOURLY"]),
  rate: z.coerce.number().min(0),
});
export type StaffPayDto = z.infer<typeof staffPaySchema>;

export const payrollRunSchema = z
  .object({ periodStart: isoDate, periodEnd: isoDate })
  .refine((v) => v.periodEnd >= v.periodStart, {
    message: "Period end cannot be before start",
    path: ["periodEnd"],
  });
export type PayrollRunDto = z.infer<typeof payrollRunSchema>;
