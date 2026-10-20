import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateReservationDto,
  ReservationStatusDto,
} from '@nodedr-restaurant/types';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { WebhooksService } from '../webhooks/webhooks.service';

export interface CreateReservationOptions {
  // True only for the public "website" booking path (integrations.service's
  // createReservation, called with an `reservations:write` API key). Staff
  // creating a reservation from the dashboard are never capped — they can
  // always merge tables or make a judgment call the online flow can't.
  fromWebsite?: boolean;
  customerId?: string;
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
  ) {}

  list(branchId: string, date?: string) {
    const where: Record<string, unknown> = { branchId };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.reservedAt = { gte: start, lt: end };
    }
    return this.prisma.reservation.findMany({
      where,
      include: { table: { select: { id: true, number: true, name: true } } },
      orderBy: { reservedAt: 'asc' },
    });
  }

  async create(
    branchId: string,
    dto: CreateReservationDto,
    options: CreateReservationOptions = {},
  ) {
    // A client-supplied tableId from another branch/restaurant must never
    // be trusted directly — without this check, this write would flip a
    // foreign tenant's real table to RESERVED on their own live floor view.
    if (dto.tableId) {
      const table = await this.prisma.table.findFirst({
        where: { id: dto.tableId, floor: { branchId } },
        select: { id: true },
      });
      if (!table) {
        throw new BadRequestException('Table is invalid for this branch');
      }
    }

    if (options.fromWebsite) {
      await this.assertWithinOnlineBookingCapacity(branchId, dto.guestCount);
    }

    // Website bookings are "online"; with auto-confirm on they skip the
    // manual Accept step and go straight to CONFIRMED.
    const autoConfirm = options.fromWebsite
      ? (
          await this.prisma.branch.findUnique({
            where: { id: branchId },
            select: { autoConfirmReservations: true },
          })
        )?.autoConfirmReservations
      : false;

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.tableId) {
        await tx.$queryRaw`SELECT id FROM tables WHERE id = ${dto.tableId} FOR UPDATE`;
        const endsAt = new Date(
          new Date(dto.reservedAt).getTime() + dto.durationMinutes * 60_000,
        );
        const candidates = await tx.reservation.findMany({
          where: {
            tableId: dto.tableId,
            status: { in: ['RESERVED', 'CONFIRMED', 'ARRIVED'] },
            reservedAt: { lt: endsAt },
          },
        });
        if (
          candidates.some(
            (r) =>
              r.reservedAt.getTime() + r.durationMinutes * 60_000 >
              new Date(dto.reservedAt).getTime(),
          )
        )
          throw new ConflictException(
            'This table is already reserved during that time',
          );
      }
      const reservation = await tx.reservation.create({
        data: {
          ...dto,
          branchId,
          customerId: options.customerId,
          ...(options.fromWebsite ? { channel: 'ONLINE' as const } : {}),
          ...(autoConfirm ? { status: 'CONFIRMED' as const } : {}),
        },
      });
      // Holding a table for a reservation marks it RESERVED on the floor
      // view immediately, not just when the guest physically arrives.
      if (reservation.tableId) {
        await tx.table.updateMany({
          where: { id: reservation.tableId, status: 'AVAILABLE' },
          data: { status: 'RESERVED', statusSince: new Date() },
        });
      }
      return reservation;
    });

    this.realtime.emitToBranch(branchId, 'reservation.created', {
      id: created.id,
    });
    if (created.tableId) {
      this.realtime.emitToBranch(branchId, 'table.updated', {
        id: created.tableId,
      });
    }

    // Best-effort, same pattern as OrdersService.checkout()'s "order.new"
    // notify: the reservation has already committed by this point, so a
    // notification failure must never surface as a failed booking. Targeted
    // by permission (reservations.manage), not a hardcoded role, so any
    // custom front-of-house role holding it gets the alert.
    try {
      await this.notifications.notifyByPermission(
        branchId,
        'reservations.manage',
        {
          type: 'reservation.new',
          title: options.fromWebsite
            ? 'New online reservation'
            : 'New reservation',
          body: `${created.customerName} — party of ${created.guestCount}, ${new Date(
            created.reservedAt,
          ).toLocaleString()}`,
          entity: 'Reservation',
          entityId: created.id,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to send reservation.new notification for reservation ${created.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    void this.webhooks.emitForBranch(branchId, 'reservation.created', {
      reservationId: created.id,
      customerName: created.customerName,
      phone: created.phone,
      guestCount: created.guestCount,
      reservedAt: created.reservedAt,
      channel: created.channel,
    });

    return created;
  }

  // Online (website/API) bookings are capped at what roughly 2 tables can
  // seat — a large party still gets in touch with the restaurant directly
  // rather than the site silently accepting a booking no single pair of
  // tables can actually hold. Computed from the branch's own configured
  // table capacities (largest two), not a hardcoded guest count, since
  // table sizes vary per restaurant. If the branch has no tables configured
  // yet, there's nothing to compare against — fail open rather than block
  // every online booking because the floor plan isn't set up.
  private async assertWithinOnlineBookingCapacity(
    branchId: string,
    guestCount: number,
  ) {
    const tables = await this.prisma.table.findMany({
      where: { floor: { branchId } },
      select: { capacity: true },
      orderBy: { capacity: 'desc' },
      take: 2,
    });
    if (tables.length === 0) return;

    const maxOnlineGuests = tables.reduce((sum, t) => sum + t.capacity, 0);
    if (guestCount > maxOnlineGuests) {
      throw new BadRequestException(
        `Online booking is limited to ${maxOnlineGuests} guests (about 2 tables). For a larger party, please call the restaurant directly to reserve.`,
      );
    }
  }

  async updateStatus(
    branchId: string,
    id: string,
    status: ReservationStatusDto,
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, branchId },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${id} FOR UPDATE`;
      const current = await tx.reservation.findUniqueOrThrow({ where: { id } });
      const next: Record<string, string[]> = {
        RESERVED: ['CONFIRMED', 'ARRIVED', 'CANCELLED', 'NO_SHOW'],
        CONFIRMED: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
        ARRIVED: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
        NO_SHOW: [],
      };
      if (current.status === status) return current;
      if (!next[current.status].includes(status))
        throw new ConflictException('Reservation cannot move to that status');
      if (current.tableId)
        await tx.$queryRaw`SELECT id FROM tables WHERE id = ${current.tableId} FOR UPDATE`;
      const result = await tx.reservation.update({
        where: { id },
        data: { status },
      });

      // Arriving a reservation with an assigned table occupies it; completing
      // or cancelling releases it back to available. Mirrors the same
      // table-status side effect checkout() already applies for dine-in
      // orders, kept consistent rather than leaving reservations silently
      // out of sync with the floor view.
      if (result.tableId) {
        if (status === 'ARRIVED') {
          await tx.table.update({
            where: { id: result.tableId },
            data: { status: 'OCCUPIED', statusSince: new Date() },
          });
        } else if (
          status === 'COMPLETED' ||
          status === 'CANCELLED' ||
          status === 'NO_SHOW'
        ) {
          const openOrder = await tx.order.count({
            where: {
              tableId: result.tableId,
              status: { in: ['OPEN', 'BILLED'] },
            },
          });
          const otherBooking = await tx.reservation.count({
            where: {
              tableId: result.tableId,
              id: { not: id },
              status: { in: ['RESERVED', 'CONFIRMED', 'ARRIVED'] },
            },
          });
          await tx.table.updateMany({
            where: {
              id: result.tableId,
              status: { notIn: ['CLEANING', 'OUT_OF_SERVICE'] },
            },
            data: {
              status: openOrder
                ? 'OCCUPIED'
                : otherBooking
                  ? 'RESERVED'
                  : 'AVAILABLE',
              statusSince: new Date(),
            },
          });
        }
      }

      return result;
    });

    this.realtime.emitToBranch(branchId, 'reservation.updated', {
      id: updated.id,
      status,
    });
    if (updated.tableId) {
      this.realtime.emitToBranch(branchId, 'table.updated', {
        id: updated.tableId,
      });
    }
    return updated;
  }
}
