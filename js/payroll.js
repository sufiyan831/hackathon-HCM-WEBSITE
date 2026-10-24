/* =========================================================
   payroll.js
   Monthly payslip calculation.
     per day   = monthly salary / working days in the month
     deduction = per day x (absent days + 0.5 x half days)
     net       = salary - deduction
   Approved leave days are paid (they are not "absent").
   ========================================================= */

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calcPayslip(userId, year, month) {
  const user = getUserById(userId);
  if (!user) return null;

  const summary = monthSummary(userId, year, month);
  const perDay = summary.workingDays > 0 ? user.salary / summary.workingDays : 0;
  const deduction = perDay * (summary.absent + 0.5 * summary.half);

  const monthEnd = year + "-" + pad2(month) + "-" + pad2(daysInMonth(year, month));
  const inProgress = todayStr() <= monthEnd; // month not finished yet

  return {
    user: user,
    year: year,
    month: month,
    company: getCompany(),
    salary: user.salary,
    workingDays: summary.workingDays,
    present: summary.present,
    late: summary.late,
    half: summary.half,
    absent: summary.absent,
    leave: summary.leave,
    perDay: round2(perDay),
    absentDeduction: round2(perDay * summary.absent),
    halfDeduction: round2(perDay * 0.5 * summary.half),
    deduction: round2(deduction),
    net: round2(user.salary - deduction),
    inProgress: inProgress,
    generatedOn: todayStr(),
  };
}
