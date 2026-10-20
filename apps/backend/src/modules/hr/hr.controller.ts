import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  permissionSatisfied,
  leaveDecisionSchema,
  leaveRequestSchema,
  payrollRunSchema,
  shiftSchema,
  staffPaySchema,
  type LeaveRequestDto,
  type PayrollRunDto,
  type SessionUser,
  type ShiftDto,
  type StaffPayDto,
} from '@nodedr-restaurant/types';
import { Auth } from '../../common/decorators/auth.decorator';
import { AuditAction } from '../../audit/audit-action';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { HrService } from './hr.service';

@ApiTags('hr')
@Controller('v1/hr')
export class HrController {
  constructor(
    private readonly hr: HrService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  private access(u: SessionUser, branchId: string) {
    return this.branchAccess.assertAccess(u.restaurantId, branchId);
  }

  @Auth()
  @Get('payslips/mine')
  myPayslips(@CurrentUser() u: SessionUser) {
    return this.hr.payslips(u.id);
  }

  @Auth()
  @Get('payroll/:id/payslip/:userId')
  async payslip(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.access(u, branchId);
    if (userId !== u.id && !permissionSatisfied(u.permissions, 'staff.manage'))
      throw new ForbiddenException(
        'You can only view your own salary statement',
      );
    return this.hr.payslip(branchId, id, userId);
  }

  // --- Shifts ---
  @Auth('staff.manage')
  @Get('shifts')
  async shifts(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.access(u, branchId);
    return this.hr.listShifts(branchId, from, to);
  }

  /** Any staff member's own upcoming shifts. */
  @Auth()
  @Get('shifts/mine')
  async myShifts(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.access(u, branchId);
    return this.hr.listShifts(
      branchId,
      new Date().toISOString().slice(0, 10),
      undefined,
      u.id,
    );
  }

  @Auth('staff.manage')
  @Post('shifts')
  @UsePipes(new ZodValidationPipe(shiftSchema))
  async createShift(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: ShiftDto,
  ) {
    await this.access(u, branchId);
    return this.hr.createShift(branchId, body);
  }

  @Auth('staff.manage')
  @Delete('shifts/:id')
  async deleteShift(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.access(u, branchId);
    return this.hr.deleteShift(branchId, id);
  }

  // --- Leave ---
  @Auth()
  @Post('leave')
  @UsePipes(new ZodValidationPipe(leaveRequestSchema))
  async requestLeave(
    @CurrentUser() u: SessionUser,
    @Body() body: LeaveRequestDto,
  ) {
    await this.access(u, body.branchId);
    return this.hr.requestLeave(u.id, body);
  }

  @Auth()
  @Get('leave/mine')
  myLeave(@CurrentUser() u: SessionUser) {
    return this.hr.myLeave(u.id);
  }

  @Auth('staff.manage')
  @Get('leave')
  async leave(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Query('status') status?: string,
  ) {
    await this.access(u, branchId);
    return this.hr.listLeave(branchId, status);
  }

  @Auth('staff.manage')
  @AuditAction('leave.decided', 'LeaveRequest')
  @Patch('leave/:id')
  @UsePipes(new ZodValidationPipe(leaveDecisionSchema))
  async decide(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' },
  ) {
    await this.access(u, branchId);
    return this.hr.decideLeave(branchId, id, u.id, body.status);
  }

  // --- Pay profiles ---
  @Auth('staff.manage')
  @Get('pay')
  async pay(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.access(u, branchId);
    return this.hr.listPay(branchId);
  }

  @Auth('staff.manage')
  @AuditAction('hr.pay_set', 'User')
  @Put('pay/:userId')
  @UsePipes(new ZodValidationPipe(staffPaySchema))
  async setPay(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Param('userId') userId: string,
    @Body() body: StaffPayDto,
  ) {
    await this.access(u, branchId);
    return this.hr.setPay(branchId, userId, body);
  }

  // --- Payroll ---
  @Auth('staff.manage')
  @Get('payroll')
  async runs(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.access(u, branchId);
    return this.hr.listRuns(branchId);
  }

  @Auth('staff.manage')
  @Get('payroll/:id')
  async run(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.access(u, branchId);
    return this.hr.getRun(branchId, id);
  }

  @Auth('staff.manage')
  @AuditAction('payroll.created', 'PayrollRun')
  @Post('payroll')
  @UsePipes(new ZodValidationPipe(payrollRunSchema))
  async createRun(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: PayrollRunDto,
  ) {
    await this.access(u, branchId);
    return this.hr.createRun(branchId, body.periodStart, body.periodEnd);
  }

  @Auth('staff.manage')
  @AuditAction('payroll.finalized', 'PayrollRun')
  @Post('payroll/:id/finalize')
  async finalize(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.access(u, branchId);
    return this.hr.finalizeRun(branchId, id);
  }

  @Auth('staff.manage')
  @AuditAction('payroll.deleted', 'PayrollRun')
  @Delete('payroll/:id')
  async deleteRun(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.access(u, branchId);
    return this.hr.deleteRun(branchId, id);
  }

  // --- Performance ---
  @Auth('staff.manage')
  @Get('performance')
  async performance(
    @CurrentUser() u: SessionUser,
    @Query('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    await this.access(u, branchId);
    return this.hr.performance(branchId, from, to);
  }
}
