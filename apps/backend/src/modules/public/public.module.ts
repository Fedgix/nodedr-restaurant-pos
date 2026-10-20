import { GuestController } from './guest.controller';
import { GuestService } from './guest.service';
import { ReservationsModule } from '../reservations/reservations.module';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { PublicKioskController } from './public-kiosk.controller';
import { PublicKioskService } from './public-kiosk.service';
import { PublicMenuController } from './public-menu.controller';
import { PublicMenuService } from './public-menu.service';

@Module({
  imports: [OrdersModule, NotificationsModule, ReservationsModule],
  controllers: [PublicMenuController, PublicKioskController, GuestController],
  providers: [PublicMenuService, PublicKioskService, GuestService],
})
export class PublicModule {}
