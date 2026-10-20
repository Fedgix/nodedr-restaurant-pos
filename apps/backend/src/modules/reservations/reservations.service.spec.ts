import { ReservationsService } from './reservations.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { RealtimeGateway } from '../../realtime/realtime.gateway';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { WebhooksService } from '../webhooks/webhooks.service';

describe('Fedgix reservation integrity regression', () => {
  let status: string;
  const row = {
    id: 'r1',
    branchId: 'b',
    tableId: 't',
    status: 'CONFIRMED',
    reservedAt: new Date('2026-12-01T12:00:00Z'),
    durationMinutes: 90,
    customerName: 'QA',
    guestCount: 2,
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    reservation: {
      create: jest.fn().mockResolvedValue(row),
      update: jest
        .fn()
        .mockImplementation(({ data }: { data: { status: string } }) =>
          Promise.resolve({ ...row, ...data }),
        ),
      findUniqueOrThrow: jest
        .fn()
        .mockImplementation(() => Promise.resolve(row)),
      findMany: jest.fn().mockResolvedValue([row]),
      count: jest.fn().mockResolvedValue(0),
    },
    order: { count: jest.fn().mockResolvedValue(1) },
    table: {
      update: jest
        .fn()
        .mockImplementation(({ data }: { data: { status: string } }) => {
          status = data.status;
          return Promise.resolve({});
        }),
      updateMany: jest
        .fn()
        .mockImplementation(({ data }: { data: { status: string } }) => {
          status = data.status;
          return Promise.resolve({ count: 1 });
        }),
    },
  };
  const prisma = {
    table: { findFirst: jest.fn().mockResolvedValue({ id: 't' }) },
    reservation: {
      findFirst: jest.fn().mockImplementation(() => Promise.resolve(row)),
    },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  };
  const service = new ReservationsService(
    prisma as unknown as PrismaService,
    { emitToBranch: jest.fn() } as unknown as RealtimeGateway,
    {
      notifyByPermission: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService,
    {
      emitForBranch: jest.fn().mockResolvedValue(undefined),
    } as unknown as WebhooksService,
  );
  beforeEach(() => {
    status = 'OCCUPIED';
    row.status = 'CONFIRMED';
  });
  it('does not release an occupied table when a booking is cancelled', async () => {
    await service.updateStatus('b', 'r1', 'CANCELLED');
    expect(status).toBe('OCCUPIED');
  });
  it('rejects an overlapping table interval', async () => {
    await expect(
      service.create('b', {
        customerName: 'QA2',
        guestCount: 2,
        tableId: 't',
        reservedAt: new Date('2026-12-01T12:30:00Z'),
        durationMinutes: 90,
      }),
    ).rejects.toThrow('already reserved');
  });
  it('cannot revive a completed reservation', async () => {
    row.status = 'COMPLETED';
    await expect(service.updateStatus('b', 'r1', 'ARRIVED')).rejects.toThrow(
      'cannot move',
    );
  });
});
