import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import type {
  GuestRegisterDto,
  GuestLoginDto,
  GuestOrderDto,
  GuestReservationDto,
} from '@nodedr-restaurant/types';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ReservationsService } from '../reservations/reservations.service';
import { PublicMenuService } from './public-menu.service';

const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
@Injectable()
export class GuestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly reservations: ReservationsService,
    private readonly menu: PublicMenuService,
  ) {}

  async branch(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, customerPortalEnabled: true },
      include: { restaurant: true },
    });
    if (!branch)
      throw new NotFoundException(
        'Customer ordering is not available for this branch',
      );
    return branch;
  }
  async storefront(branchId: string) {
    const b = await this.branch(branchId);
    return {
      branchId: b.id,
      name: b.restaurant.name,
      branchName: b.name,
      address: b.address,
      phone: b.phone,
      logoUrl: b.restaurant.logoUrl,
      brandColor: b.restaurant.brandColor,
      fontFamily: b.restaurant.fontFamily,
      headline: b.restaurant.websiteHeadline,
      heroImageUrl: b.restaurant.heroImageUrl,
      currency: b.restaurant.currency,
      timezone: b.restaurant.timezone,
      categories: await this.menu.menuCategoriesForBranch(b.id),
    };
  }
  async register(branchId: string, dto: GuestRegisterDto) {
    await this.branch(branchId);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      // Always creates a NEW profile. Never attach a self-registered email to an
      // existing CRM profile, which could expose another customer's history.
      const account = await this.prisma.customerAccount.create({
        data: {
          branchId,
          email: dto.email,
          passwordHash,
          customer: {
            create: {
              branchId,
              name: dto.name,
              email: dto.email,
              marketingOptOut: true,
            },
          },
        },
      });
      return this.newSession(account.id);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException('Unable to register; try signing in');
      throw e;
    }
  }
  async login(branchId: string, dto: GuestLoginDto) {
    await this.branch(branchId);
    const account = await this.prisma.customerAccount.findUnique({
      where: { branchId_email: { branchId, email: dto.email } },
    });
    // Run a bcrypt hash even for an unknown identity to reduce timing disclosure.
    const hash =
      account?.passwordHash ??
      (await bcrypt.hash('unavailable-customer-account', 12));
    if (!(await bcrypt.compare(dto.password, hash)) || !account)
      throw new UnauthorizedException('Email or password is incorrect');
    return this.newSession(account.id);
  }
  private async newSession(accountId: string) {
    const token = randomBytes(32).toString('hex');
    await this.prisma.customerSession.deleteMany({
      where: { accountId, expiresAt: { lte: new Date() } },
    });
    await this.prisma.customerSession.create({
      data: {
        accountId,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 12 * 3600_000),
      },
    });
    return { token };
  }
  async identity(branchId: string, token?: string) {
    await this.branch(branchId);
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new UnauthorizedException('Please sign in');
    const session = await this.prisma.customerSession.findUnique({
      where: { tokenHash: digest(token) },
      include: { account: { include: { customer: true } } },
    });
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.account.branchId !== branchId
    )
      throw new UnauthorizedException('Please sign in again');
    return session.account;
  }
  async logout(token?: string) {
    if (token)
      await this.prisma.customerSession.deleteMany({
        where: { tokenHash: digest(token) },
      });
    return { ok: true };
  }
  async profile(branchId: string, token?: string) {
    const a = await this.identity(branchId, token);
    return {
      name: a.customer.name,
      email: a.email,
      loyaltyPoints: a.customer.loyaltyPoints,
    };
  }
  async history(branchId: string, token?: string) {
    const a = await this.identity(branchId, token);
    return this.prisma.order.findMany({
      where: { branchId, customerId: a.customerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        acceptance: true,
        createdAt: true,
        scheduledFor: true,
        totalAmount: true,
        items: { select: { nameSnapshot: true, quantity: true, status: true } },
      },
    });
  }
  async placeOrder(
    branchId: string,
    token: string | undefined,
    dto: GuestOrderDto,
  ) {
    const a = await this.identity(branchId, token);
    const key = `guest:${a.id}:${dto.requestId}`;
    const existing = () =>
      this.prisma.order.findFirst({
        where: { branchId, customerId: a.customerId, clientRequestId: key },
        select: { id: true, orderNumber: true },
      });
    const previous = await existing();
    if (previous) return { ...previous, paymentStatus: 'PAY_AT_COUNTER' };
    const actor = await this.prisma.userBranch.findFirst({
      where: { branchId, user: { isActive: true } },
      orderBy: { userId: 'asc' },
    });
    if (!actor)
      throw new BadRequestException(
        'Restaurant is not ready to receive orders',
      );
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const o = await this.orders.createOrder(
          branchId,
          actor.userId,
          {
            type: 'TAKEAWAY',
            customerId: a.customerId,
            guestName: a.customer.name ?? 'Guest',
            items: dto.items,
            notes: dto.notes,
            scheduledFor: dto.scheduledFor,
          },
          { channel: 'ONLINE', requireAcceptance: true, clientRequestId: key },
        );
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          paymentStatus: 'PAY_AT_COUNTER',
        };
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          const replay = await existing();
          if (replay) return { ...replay, paymentStatus: 'PAY_AT_COUNTER' };
          if (attempt < 2) continue;
        }
        throw e;
      }
    }
  }
  async bookings(branchId: string, token?: string) {
    const a = await this.identity(branchId, token);
    return this.prisma.reservation.findMany({
      where: { branchId, customerId: a.customerId },
      orderBy: { reservedAt: 'desc' },
      take: 100,
    });
  }
  async book(
    branchId: string,
    token: string | undefined,
    dto: GuestReservationDto,
  ) {
    const a = await this.identity(branchId, token);
    const at = new Date(dto.reservedAt);
    if (at <= new Date() || at.getTime() > Date.now() + 180 * 86400_000)
      throw new BadRequestException('Choose a future time within 180 days');
    // Reservation remains unassigned until staff allocate capacity. No promise of
    // a specific table is made to the customer by this booking-request flow.
    const reservation = await this.reservations.create(
      branchId,
      {
        customerName: a.customer.name ?? 'Guest',
        email: a.email,
        guestCount: dto.guestCount,
        reservedAt: at,
        durationMinutes: 90,
        specialRequests: dto.specialRequests,
      },
      { fromWebsite: true, customerId: a.customerId },
    );
    return reservation;
  }
  async cancelBooking(branchId: string, token: string | undefined, id: string) {
    const a = await this.identity(branchId, token);
    const booking = await this.prisma.reservation.findFirst({
      where: { id, branchId, customerId: a.customerId },
    });
    if (!booking) throw new NotFoundException('Reservation not found');
    if (!['RESERVED', 'CONFIRMED'].includes(booking.status))
      throw new ConflictException(
        'Contact the restaurant to change this reservation',
      );
    return this.reservations.updateStatus(branchId, id, 'CANCELLED');
  }
}
