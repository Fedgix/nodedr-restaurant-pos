import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  guestLoginSchema,
  guestOrderSchema,
  guestRegisterSchema,
  guestReservationSchema,
  type GuestLoginDto,
  type GuestOrderDto,
  type GuestRegisterDto,
  type GuestReservationDto,
} from '@nodedr-restaurant/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GuestService } from './guest.service';
const COOKIE = 'fedgix_guest';
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/api/v1/guest',
});
const token = (req: Request): string | undefined =>
  (req.cookies as Record<string, string> | undefined)?.[COOKIE];
@Controller('v1/guest')
export class GuestController {
  constructor(private readonly guests: GuestService) {}
  @Get(':branchId/menu')
  menu(@Param('branchId') b: string) {
    return this.guests.storefront(b);
  }
  @Post(':branchId/register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(guestRegisterSchema))
  async register(
    @Param('branchId') b: string,
    @Body() dto: GuestRegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.guests.register(b, dto);
    res.cookie(COOKIE, result.token, {
      ...cookieOptions(),
      maxAge: 12 * 3600_000,
    });
    return { ok: true };
  }
  @Post(':branchId/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(guestLoginSchema))
  async login(
    @Param('branchId') b: string,
    @Body() dto: GuestLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.guests.login(b, dto);
    res.cookie(COOKIE, result.token, {
      ...cookieOptions(),
      maxAge: 12 * 3600_000,
    });
    return { ok: true };
  }
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.guests.logout(token(req));
    res.clearCookie(COOKIE, cookieOptions());
    return { ok: true };
  }
  @Get(':branchId/me')
  me(@Param('branchId') b: string, @Req() req: Request) {
    return this.guests.profile(b, token(req));
  }
  @Get(':branchId/orders')
  history(@Param('branchId') b: string, @Req() req: Request) {
    return this.guests.history(b, token(req));
  }
  @Post(':branchId/orders')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(guestOrderSchema))
  order(
    @Param('branchId') b: string,
    @Req() req: Request,
    @Body() dto: GuestOrderDto,
  ) {
    return this.guests.placeOrder(b, token(req), dto);
  }
  @Get(':branchId/reservations')
  bookings(@Param('branchId') b: string, @Req() req: Request) {
    return this.guests.bookings(b, token(req));
  }
  @Post(':branchId/reservations')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(guestReservationSchema))
  book(
    @Param('branchId') b: string,
    @Req() req: Request,
    @Body() dto: GuestReservationDto,
  ) {
    return this.guests.book(b, token(req), dto);
  }
  @Post(':branchId/reservations/:id/cancel')
  cancel(
    @Param('branchId') b: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.guests.cancelBooking(b, token(req), id);
  }
}
