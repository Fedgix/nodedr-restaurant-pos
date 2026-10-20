import { computePayroll } from './payroll.calc';

describe('Fedgix payroll regression', () => {
  it('pays two complete months at two monthly salaries', () => {
    const [line] = computePayroll('2026-02-01', '2026-03-31', 0, [
      {
        userId: 'a',
        payType: 'MONTHLY',
        rate: 31000,
        hoursWorked: 0,
        unpaidLeaveDays: 0,
      },
    ]);
    expect(line.basePay).toBe(62000);
  });
  it('never produces negative salary for excessive unpaid leave', () => {
    const [line] = computePayroll('2026-02-01', '2026-02-02', 0, [
      {
        userId: 'a',
        payType: 'MONTHLY',
        rate: 28000,
        hoursWorked: 0,
        unpaidLeaveDays: 4,
      },
    ]);
    expect(line.netPay).toBeGreaterThanOrEqual(0);
  });
});
