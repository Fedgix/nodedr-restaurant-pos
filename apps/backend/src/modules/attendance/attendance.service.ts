import { BadRequestException, Injectable } from '@nestjs/common';
import { zonedRange } from '../../common/time';
import { BranchTimeService } from '../../common/services/branch-time.service';
import { PrismaService } from '../../prisma/prisma.service';

const WITH_USER = {
  user: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly time: BranchTimeService,
  ) {}

  /** The user's currently open shift, if any (any branch). */
  current(userId: string) {
    return this.prisma.attendance.findFirst({
      where: { userId, clockOutAt: null },
      include: WITH_USER,
      orderBy: { clockInAt: 'desc' },
    });
  }

  async clockIn(userId: string, branchId: string, note?: string) {
    if (await this.current(userId))
      throw new BadRequestException('Already clocked in');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      if (
        await tx.attendance.findFirst({ where: { userId, clockOutAt: null } })
      )
        throw new BadRequestException('Already clocked in');
      return tx.attendance.create({
        data: { userId, branchId, note },
        include: WITH_USER,
      });
    });
  }

  async clockOut(userId: string, note?: string) {
    const open = await this.current(userId);
    if (!open) throw new BadRequestException('Not clocked in');
    const changed = await this.prisma.attendance.updateMany({
      where: { id: open.id, clockOutAt: null },
      data: { clockOutAt: new Date(), ...(note ? { note } : {}) },
    });
    if (!changed.count) throw new BadRequestException('Not clocked in');
    return this.prisma.attendance.findUniqueOrThrow({
      where: { id: open.id },
      include: WITH_USER,
    });
  }

  /** Records for a branch, optionally one local day (YYYY-MM-DD) or one user. */
  async list(branchId: string, date?: string, userId?: string) {
    let range: { gte: Date; lt: Date } | undefined;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
        throw new BadRequestException('date must be YYYY-MM-DD');
      range = zonedRange(date, date, await this.time.tzForBranch(branchId));
    }
    return this.prisma.attendance.findMany({
      where: {
        branchId,
        ...(userId ? { userId } : {}),
        ...(range ? { clockInAt: range } : {}),
      },
      include: WITH_USER,
      orderBy: { clockInAt: 'desc' },
      take: 500,
    });
  }
}
