import { z } from "zod";
import { cartItemSchema } from "./orders";
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());
export const guestRegisterSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email,
  password: z.string().min(12).max(72),
});
export const guestLoginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});
export const guestReservationSchema = z.object({
  reservedAt: z.string().datetime(),
  guestCount: z.number().int().min(1).max(40),
  specialRequests: z.string().max(500).optional(),
});
export const guestOrderSchema = z.object({
  requestId: z.string().uuid(),
  items: z.array(cartItemSchema).min(1).max(100),
  notes: z.string().max(500).optional(),
  scheduledFor: z.string().datetime().optional(),
});
export type GuestRegisterDto = z.infer<typeof guestRegisterSchema>;
export type GuestLoginDto = z.infer<typeof guestLoginSchema>;
export type GuestReservationDto = z.infer<typeof guestReservationSchema>;
export type GuestOrderDto = z.infer<typeof guestOrderSchema>;
