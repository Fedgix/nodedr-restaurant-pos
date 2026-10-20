import { addDaysToDate, localDate, zonedRange } from '../../common/time';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { restaurant: { select: { timezone: true } } },
    });
    const today = localDate(
      new Date(),
      branch?.restaurant.timezone ?? 'Asia/Kolkata',
    );
    const range = zonedRange(
      today,
      today,
      branch?.restaurant.timezone ?? 'Asia/Kolkata',
    );

    const [
      revenueAgg,
      ordersToday,
      orderTypeCounts,
      tableCounts,
      kitchenQueue,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { branchId, status: 'PAID', billedAt: range },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: { branchId, createdAt: range },
      }),
      this.prisma.order.groupBy({
        by: ['channel'],
        where: { branchId, createdAt: range },
        _count: true,
      }),
      this.prisma.table.groupBy({
        by: ['status'],
        where: { floor: { branchId } },
        _count: true,
      }),
      this.prisma.kot.groupBy({
        by: ['status'],
        where: {
          order: { branchId },
          status: { notIn: ['SERVED', 'CANCELLED'] },
        },
        _count: true,
      }),
      this.prisma.order.findMany({
        where: { branchId, status: 'PAID' },
        orderBy: { billedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          type: true,
          totalAmount: true,
          billedAt: true,
        },
      }),
    ]);

    const tableStatusMap = Object.fromEntries(
      tableCounts.map((row) => [row.status, row._count]),
    );
    const kitchenQueueMap = Object.fromEntries(
      kitchenQueue.map((row) => [row.status, row._count]),
    );
    // Online = placed by a guest through the website or QR (Order.channel),
    // everything else was rung up by staff.
    const channels = orderTypeCounts.reduce(
      (acc, row) => {
        if (row.channel === 'ONLINE') {
          acc.online += row._count;
        } else {
          acc.offline += row._count;
        }
        return acc;
      },
      { online: 0, offline: 0 },
    );

    return {
      todayRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      todayOrders: ordersToday,
      channels,
      tables: {
        available: tableStatusMap.AVAILABLE ?? 0,
        occupied: tableStatusMap.OCCUPIED ?? 0,
        reserved: tableStatusMap.RESERVED ?? 0,
        cleaning: tableStatusMap.CLEANING ?? 0,
        outOfService: tableStatusMap.OUT_OF_SERVICE ?? 0,
      },
      kitchenQueue: {
        new: kitchenQueueMap.NEW ?? 0,
        accepted: kitchenQueueMap.ACCEPTED ?? 0,
        preparing: kitchenQueueMap.PREPARING ?? 0,
        ready: kitchenQueueMap.READY ?? 0,
      },
      recentOrders,
    };
  }

  async getTrends(branchId: string, days = 14) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { restaurant: { select: { timezone: true } } },
    });
    const tz = branch?.restaurant.timezone ?? 'Asia/Kolkata';
    const today = localDate(new Date(), tz);
    const firstDay = addDaysToDate(today, -(days - 1));
    const since = zonedRange(firstDay, today, tz).gte;

    const [orders, wasteLogs] = await Promise.all([
      this.prisma.order.findMany({
        where: { branchId, status: 'PAID', billedAt: { gte: since } },
        select: { totalAmount: true, billedAt: true },
      }),
      this.prisma.wasteLog.findMany({
        where: { branchId, createdAt: { gte: since } },
        select: { quantity: true, unitCostAtWaste: true, createdAt: true },
      }),
    ]);

    const dateKey = (d: Date) => localDate(d, tz);
    const revenueByDay = new Map<string, number>();
    const wasteByDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const key = addDaysToDate(firstDay, i);
      revenueByDay.set(key, 0);
      wasteByDay.set(key, 0);
    }

    for (const order of orders) {
      if (!order.billedAt) continue;
      const key = dateKey(order.billedAt);
      if (revenueByDay.has(key)) {
        revenueByDay.set(
          key,
          revenueByDay.get(key)! + Number(order.totalAmount),
        );
      }
    }

    for (const log of wasteLogs) {
      const key = dateKey(log.createdAt);
      if (wasteByDay.has(key)) {
        const cost = Number(log.quantity) * Number(log.unitCostAtWaste);
        wasteByDay.set(key, wasteByDay.get(key)! + cost);
      }
    }

    return {
      revenue: [...revenueByDay.entries()].map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      })),
      waste: [...wasteByDay.entries()].map(([date, cost]) => ({
        date,
        cost: Math.round(cost * 100) / 100,
      })),
    };
  }
  async getOperations(branchId: string) {
    const b = await this.prisma.branch.findUniqueOrThrow({
      where: { id: branchId },
      include: { restaurant: true },
    });
    const today = localDate(new Date(), b.restaurant.timezone);
    const range = zonedRange(today, today, b.restaurant.timezone);
    const day = new Date(`${today}T00:00:00Z`);
    const [
      present,
      leave,
      bookings,
      openOrders,
      ingredients,
      expenses,
      payroll,
      delayed,
    ] = await Promise.all([
      this.prisma.attendance.count({ where: { branchId, clockOutAt: null } }),
      this.prisma.leaveRequest.count({
        where: {
          branchId,
          status: 'APPROVED',
          startDate: { lte: day },
          endDate: { gte: day },
        },
      }),
      this.prisma.reservation.count({
        where: {
          branchId,
          reservedAt: range,
          status: { in: ['RESERVED', 'CONFIRMED', 'ARRIVED'] },
        },
      }),
      this.prisma.order.count({
        where: { branchId, status: { in: ['OPEN', 'BILLED'] } },
      }),
      this.prisma.ingredient.findMany({
        where: { branchId, isActive: true },
        select: {
          id: true,
          name: true,
          currentStock: true,
          reorderLevel: true,
        },
      }),
      this.prisma.expense.aggregate({
        where: { branchId, spentOn: day },
        _sum: { amount: true },
      }),
      this.prisma.payrollRun.findFirst({
        where: { branchId },
        orderBy: { periodEnd: 'desc' },
        select: { id: true, status: true, periodEnd: true },
      }),
      this.prisma.kot.count({
        where: {
          order: { branchId },
          status: { in: ['NEW', 'ACCEPTED', 'PREPARING'] },
          createdAt: { lt: new Date(Date.now() - 20 * 60000) },
        },
      }),
    ]);
    return {
      date: today,
      timezone: b.restaurant.timezone,
      employeesPresent: present,
      employeesOnLeave: leave,
      reservationsToday: bookings,
      openOrders,
      delayedKitchenTickets: delayed,
      delayThresholdMinutes: 20,
      expensesToday: Number(expenses._sum.amount ?? 0),
      latestPayroll: payroll,
      lowStock: ingredients.filter(
        (i) => Number(i.currentStock) <= Number(i.reorderLevel),
      ),
    };
  }
}
