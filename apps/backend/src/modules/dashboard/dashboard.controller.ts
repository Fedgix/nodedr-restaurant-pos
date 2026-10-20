import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@nodedr-restaurant/types';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('v1/dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  @Auth('dashboard.sales.view')
  @Get('summary')
  async getSummary(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.dashboardService.getSummary(branchId);
  }

  @Auth('dashboard.sales.view')
  @Get('trends')
  async getTrends(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.dashboardService.getTrends(branchId);
  }
  @Auth('staff.manage')
  @Get('operations')
  async operations(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.dashboardService.getOperations(branchId);
  }
}
