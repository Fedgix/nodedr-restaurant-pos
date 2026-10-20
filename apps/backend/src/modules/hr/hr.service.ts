import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  LeaveRequestDto,
  ShiftDto,
  StaffPayDto,
} from '@nodedr-restaurant/types';
import { localDate, zonedRange } from '../../common/time';
import { BranchTimeService } from '../../common/services/branch-time.service';
import { PrismaService } from '../../prisma/prisma.service';
import { computePayroll, round2 } from './payroll.calc';

const dayStart = (d: string) => new Date(`${d}T00:00:00.000Z`);
const USER = { select: { id: true, name: true } } as const;

@Injectable()
export class HrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly time: BranchTimeService,
  ) {}

  private async assertStaffInBranch(branchId: string, userId: string) {
    const link = await this.prisma.userBranch.findFirst({
      where: { branchId, userId, user: { isActive: true } },
    });
    if (!link)
      throw new BadRequestException('That staff member is not in this branch');
  }

  payslips(userId: string) {
    return this.prisma.payrollLine.findMany({
      where: { userId, run: { status: 'FINALIZED' } },
      include: {
        run: {
          select: {
            branchId: true,
            periodStart: true,
            periodEnd: true,
            status: true,
          },
        },
      },
      orderBy: { run: { periodEnd: 'desc' } },
      take: 50,
    });
  }
  async payslip(branchId: string, runId: string, userId: string) {
    const line = await this.prisma.payrollLine.findFirst({
      where: { runId, userId, run: { branchId, status: 'FINALIZED' } },
      include: {
        user: USER,
        run: { select: { periodStart: true, periodEnd: true, status: true } },
      },
    });
    if (!line)
      throw new NotFoundException('Finalized salary statement not found');
    return line;
  }

  // --- Shifts --------------------------------------------------------------

  async listShifts(
    branchId: string,
    from?: string,
    to?: string,
    userId?: string,
  ) {
    const tz = await this.time.tzForBranch(branchId);
    const r = zonedRange(from ?? to ?? '1970-01-01', to ?? '9999-12-30', tz);
    return this.prisma.shift.findMany({
      where: {
        branchId,
        ...(userId ? { userId } : {}),
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: r.gte } : {}),
                ...(to ? { lt: r.lt } : {}),
              },
            }
          : {}),
      },
      include: { user: USER },
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
  }

  async createShift(branchId: string, dto: ShiftDto) {
    await this.assertStaffInBranch(branchId, dto.userId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const clash = await this.prisma.shift.findFirst({
      where: {
        userId: dto.userId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (clash)
      throw new BadRequestException(
        'That person already has a shift at this time',
      );
    const tz = await this.time.tzForBranch(branchId);
    const onLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        userId: dto.userId,
        status: 'APPROVED',
        startDate: { lte: dayStart(localDate(endsAt, tz)) },
        endDate: { gte: dayStart(localDate(startsAt, tz)) },
      },
    });
    if (onLeave)
      throw new BadRequestException(
        'That person has approved leave on this day',
      );
    return this.prisma.shift.create({
      data: { branchId, userId: dto.userId, startsAt, endsAt, note: dto.note },
      include: { user: USER },
    });
  }

  async deleteShift(branchId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, branchId },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    await this.prisma.shift.delete({ where: { id } });
    return { ok: true };
  }

  // --- Leave ---------------------------------------------------------------

  async requestLeave(userId: string, dto: LeaveRequestDto) {
    await this.assertStaffInBranch(dto.branchId, userId);
    return this.prisma.$transaction(async (tx) => {
      // Serialize requests for the same employee, including cross-branch requests.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const overlap = await tx.leaveRequest.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'APPROVED'] },
          startDate: { lte: dayStart(dto.endDate) },
          endDate: { gte: dayStart(dto.startDate) },
        },
      });
      if (overlap)
        throw new BadRequestException(
          'An active leave request already covers these dates',
        );
      return tx.leaveRequest.create({
        data: {
          branchId: dto.branchId,
          userId,
          type: dto.type,
          startDate: dayStart(dto.startDate),
          endDate: dayStart(dto.endDate),
          reason: dto.reason,
        },
      });
    });
  }

  myLeave(userId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: 100,
    });
  }

  listLeave(branchId: string, status?: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        branchId,
        ...(status === 'PENDING' ||
        status === 'APPROVED' ||
        status === 'REJECTED'
          ? { status }
          : {}),
      },
      include: { user: USER },
      orderBy: { startDate: 'desc' },
      take: 200,
    });
  }

  async decideLeave(
    branchId: string,
    id: string,
    deciderId: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id, branchId },
    });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== 'PENDING')
      throw new BadRequestException('Already decided');
    const changed = await this.prisma.leaveRequest.updateMany({
      where: { id, branchId, status: 'PENDING' },
      data: { status, decidedById: deciderId, decidedAt: new Date() },
    });
    if (!changed.count) throw new BadRequestException('Already decided');
    return this.prisma.leaveRequest.findUniqueOrThrow({ where: { id } });
  }

  // --- Pay profiles --------------------------------------------------------

  async listPay(branchId: string) {
    const links = await this.prisma.userBranch.findMany({
      where: { branchId, user: { isActive: true } },
      include: { user: { select: { id: true, name: true, payProfile: true } } },
    });
    return links.map((l) => ({
      userId: l.user.id,
      name: l.user.name,
      payType: l.user.payProfile?.payType ?? null,
      rate: l.user.payProfile ? Number(l.user.payProfile.rate) : null,
    }));
  }

  async setPay(branchId: string, userId: string, dto: StaffPayDto) {
    await this.assertStaffInBranch(branchId, userId);
    return this.prisma.staffPay.upsert({
      where: { userId },
      create: { userId, payType: dto.payType, rate: dto.rate },
      update: { payType: dto.payType, rate: dto.rate },
    });
  }

  // --- Payroll -------------------------------------------------------------

  listRuns(branchId: string) {
    return this.prisma.payrollRun.findMany({
      where: { branchId },
      orderBy: { periodStart: 'desc' },
      take: 50,
    });
  }

  async getRun(branchId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, branchId },
      include: {
        lines: { include: { user: USER }, orderBy: { user: { name: 'asc' } } },
      },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  /** Builds a DRAFT run from clock-in/out hours, pay profiles, leave and tips. */
  async createRun(branchId: string, periodStart: string, periodEnd: string) {
    const overlap = await this.prisma.payrollRun.findFirst({
      where: {
        branchId,
        periodStart: { lte: dayStart(periodEnd) },
        periodEnd: { gte: dayStart(periodStart) },
      },
    });
    if (overlap)
      throw new BadRequestException(
        'A payroll run already covers part of this period',
      );

    const from = dayStart(periodStart); // date columns (leave, payroll period)
    const tz = await this.time.tzForBranch(branchId);
    const zoned = zonedRange(periodStart, periodEnd, tz);

    const links = await this.prisma.userBranch.findMany({
      where: {
        branchId,
        user: { isActive: true, payProfile: { isNot: null } },
      },
      include: { user: { select: { id: true, payProfile: true } } },
    });
    if (links.length === 0)
      throw new BadRequestException(
        'Set a pay rate for at least one staff member first',
      );

    const records = await this.prisma.attendance.findMany({
      where: {
        branchId,
        clockOutAt: { not: null, gt: zoned.gte },
        clockInAt: { lt: zoned.lt },
      },
    });
    const hours = new Map<string, number>();
    for (const r of records) {
      const start = Math.max(r.clockInAt.getTime(), zoned.gte.getTime());
      const end = Math.min(r.clockOutAt!.getTime(), zoned.lt.getTime());
      if (end > start)
        hours.set(
          r.userId,
          (hours.get(r.userId) ?? 0) + (end - start) / 3_600_000,
        );
    }

    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        branchId,
        status: 'APPROVED',
        type: 'UNPAID',
        startDate: { lte: dayStart(periodEnd) },
        endDate: { gte: from },
      },
    });
    const unpaidDates = new Map<string, Set<string>>();
    for (const l of leaves) {
      const s = Math.max(l.startDate.getTime(), from.getTime());
      const e = Math.min(l.endDate.getTime(), dayStart(periodEnd).getTime());
      const dates = unpaidDates.get(l.userId) ?? new Set<string>();
      for (let t = s; t <= e; t += 86_400_000)
        dates.add(new Date(t).toISOString().slice(0, 10));
      unpaidDates.set(l.userId, dates);
    }

    const tips = await this.prisma.order.aggregate({
      where: { branchId, status: 'PAID', billedAt: zoned },
      _sum: { tipAmount: true },
    });
    const tipPool = round2(Number(tips._sum.tipAmount ?? 0));

    const lines = computePayroll(
      periodStart,
      periodEnd,
      tipPool,
      links.map((l) => ({
        userId: l.user.id,
        payType: l.user.payProfile!.payType,
        rate: Number(l.user.payProfile!.rate),
        hoursWorked: hours.get(l.user.id) ?? 0,
        unpaidLeaveDays: unpaidDates.get(l.user.id)?.size ?? 0,
        unpaidLeaveDates: [...(unpaidDates.get(l.user.id) ?? [])],
      })),
    );

    return this.prisma.payrollRun.create({
      data: {
        branchId,
        periodStart: from,
        periodEnd: dayStart(periodEnd),
        tipPool,
        totalNet: round2(lines.reduce((s, l) => s + l.netPay, 0)),
        lines: { create: lines },
      },
      include: { lines: { include: { user: USER } } },
    });
  }

  async finalizeRun(branchId: string, id: string) {
    const run = await this.getRun(branchId, id);
    if (run.status !== 'DRAFT')
      throw new BadRequestException('Already finalized');
    return this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'FINALIZED', finalizedAt: new Date() },
    });
  }

  async deleteRun(branchId: string, id: string) {
    const run = await this.getRun(branchId, id);
    if (run.status !== 'DRAFT')
      throw new BadRequestException(
        'A finalized payroll run cannot be deleted',
      );
    await this.prisma.payrollRun.delete({ where: { id } });
    return { ok: true };
  }

  // --- Performance ---------------------------------------------------------

  async performance(branchId: string, from: string, to: string) {
    const range = zonedRange(from, to, await this.time.tzForBranch(branchId));
    const f = range.gte;
    const t = range.lt;
    const [orders, attendance, links] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['createdById'],
        where: { branchId, status: 'PAID', billedAt: range },
        _count: { _all: true },
        _sum: { totalAmount: true, tipAmount: true },
      }),
      this.prisma.attendance.findMany({
        where: {
          branchId,
          clockOutAt: { not: null, gt: f },
          clockInAt: { lt: t },
        },
      }),
      this.prisma.userBranch.findMany({
        where: { branchId },
        include: { user: USER },
      }),
    ]);
    const hours = new Map<string, number>();
    for (const r of attendance) {
      const s = Math.max(r.clockInAt.getTime(), f.getTime());
      const e = Math.min(r.clockOutAt!.getTime(), t.getTime());
      if (e > s)
        hours.set(r.userId, (hours.get(r.userId) ?? 0) + (e - s) / 3_600_000);
    }
    const byUser = new Map(orders.map((o) => [o.createdById, o]));
    return links
      .map((l) => {
        const o = byUser.get(l.user.id);
        const h = hours.get(l.user.id) ?? 0;
        const sales = Number(o?._sum.totalAmount ?? 0);
        return {
          userId: l.user.id,
          name: l.user.name,
          orders: o?._count._all ?? 0,
          sales: round2(sales),
          tips: round2(Number(o?._sum.tipAmount ?? 0)),
          hoursWorked: round2(h),
          salesPerHour: h > 0 ? round2(sales / h) : null,
        };
      })
      .sort((a, b) => b.sales - a.sales);
  }
}
