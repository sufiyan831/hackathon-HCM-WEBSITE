/* payslip.html - monthly salary slip. Admin: any employee. Employee: own only. */

(function () {
  const user = requireLogin();
  if (!user) return;
  initShell(user, "payslip.html", user.role === "admin" ? "Payslips" : "My payslip");

  const empPick = document.getElementById("emp-pick");
  const empSelect = document.getElementById("p-emp");
  const monthInput = document.getElementById("p-month");
  const slip = document.getElementById("slip");

  const now = new Date();
  monthInput.value = now.getFullYear() + "-" + pad2(now.getMonth() + 1);

  if (user.role === "admin") {
    empPick.classList.remove("hidden");
    empSelect.innerHTML = getEmployees().map(function (e) {
      return '<option value="' + e.id + '">' + escapeHtml(e.name) + "</option>";
    }).join("");
  }

  function row(label, value, cls) {
    return "<tr" + (cls ? ' class="' + cls + '"' : "") + "><td>" + label + '</td><td class="num">' + value + "</td></tr>";
  }

  function render() {
    // Employees can only ever see their own payslip.
    const userId = user.role === "admin" ? Number(empSelect.value) : user.id;
    if (!userId) {
      slip.innerHTML = '<p class="muted">No employees yet. Add an employee to see a payslip.</p>';
      return;
    }
    const parts = monthInput.value.split("-").map(Number);
    if (!parts[0] || !parts[1]) {
      slip.innerHTML = '<p class="muted">Choose a month.</p>';
      return;
    }

    const p = calcPayslip(userId, parts[0], parts[1]);
    const note = p.inProgress
      ? '<div class="note">This month is not finished yet. Numbers are calculated from the days that have passed.</div>' : "";

    slip.innerHTML =
      '<div class="payslip-head"><div><h2>' + escapeHtml(p.company.name) + "</h2><p class=\"muted\">Payslip for " +
      MONTH_NAMES[p.month - 1] + " " + p.year + '</p></div><div style="text-align:right"><strong>PAYSLIP</strong>' +
      '<p class="muted">Generated ' + formatDate(p.generatedOn) + "</p></div></div>" + note +
      "<dl><div><dt>Employee</dt><dd>" + escapeHtml(p.user.name) + "</dd></div>" +
      "<div><dt>Email</dt><dd>" + escapeHtml(p.user.email) + "</dd></div>" +
      "<div><dt>Department</dt><dd>" + escapeHtml(p.user.department) + "</dd></div>" +
      "<div><dt>Working days in month</dt><dd>" + p.workingDays + "</dd></div></dl>" +
      '<div class="table-wrap"><table><thead><tr><th>Attendance</th><th class="num">Days</th></tr></thead><tbody>' +
      row("Present (including late)", p.present) + row("Late arrivals", p.late) + row("Half days", p.half) +
      row("Approved leave (paid)", p.leave) + row("Absent", p.absent) + "</tbody></table></div>" +
      '<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Salary</th><th class="num">Amount</th></tr></thead><tbody>' +
      row("Monthly salary", formatMoney(p.salary)) +
      row("Salary per day (" + formatMoney(p.salary) + " / " + p.workingDays + ")", formatMoney(p.perDay)) +
      row("Absent deduction (" + p.absent + " day x per day)", "- " + formatMoney(p.absentDeduction)) +
      row("Half-day deduction (" + p.half + " x 0.5 x per day)", "- " + formatMoney(p.halfDeduction)) +
      row("Total deduction", "- " + formatMoney(p.deduction)) +
      row("Net salary", formatMoney(p.net), "net-row") + "</tbody></table></div>";
  }

  empSelect.addEventListener("change", render);
  monthInput.addEventListener("change", render);
  document.getElementById("print-btn").addEventListener("click", function () { window.print(); });

  render();
})();
