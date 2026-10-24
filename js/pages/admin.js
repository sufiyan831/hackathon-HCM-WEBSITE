/* admin.html - dashboard, attendance records, announcements */

(function () {
  const user = requireRole("admin");
  if (!user) return;
  initShell(user, "admin.html", "Admin dashboard");

  /* ---------- stats ---------- */

  function renderStats() {
    const o = todayOverview();
    const pending = pendingLeaves().length;
    const cards = [
      { num: o.total, label: "Employees", cls: "" },
      { num: o.present, label: "Checked in today", cls: "" },
      { num: o.late, label: "Late today", cls: "warn" },
      { num: o.leave, label: "On leave today", cls: "accent" },
      { num: o.notYet + o.absent, label: "Not checked in", cls: "danger" },
      { num: pending, label: "Pending leaves", cls: "warn" },
    ];
    document.getElementById("stats").innerHTML = cards.map(function (c) {
      return '<div class="stat ' + c.cls + '"><div class="stat-num">' + c.num +
        '</div><div class="stat-label">' + c.label + "</div></div>";
    }).join("");
  }

  /* ---------- last 7 days bars (plain CSS, no library) ---------- */

  function renderBars() {
    const employees = getEmployees();
    const today = todayStr();
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));

    const counts = days.map(function (d) {
      return employees.filter(function (e) { return Boolean(getRecord(e.id, d)); }).length;
    });
    const max = Math.max.apply(null, counts.concat([1]));

    document.getElementById("bars").innerHTML = days.map(function (d, i) {
      const height = Math.round((counts[i] / max) * 100);
      const label = DAY_NAMES[parseDate(d).getDay()].slice(0, 3);
      return '<div class="bar-col"><span class="bar-val">' + counts[i] + '</span>' +
        '<div class="bar" style="height:' + height + '%"></div>' +
        '<span class="bar-label">' + label + "</span></div>";
    }).join("");
  }

  /* ---------- attendance records ---------- */

  const fFrom = document.getElementById("f-from");
  const fTo = document.getElementById("f-to");
  const fEmp = document.getElementById("f-emp");
  const fStatus = document.getElementById("f-status");
  let currentRows = [];

  fFrom.value = todayStr();
  fTo.value = todayStr();

  function fillEmployeeSelect() {
    const keep = fEmp.value;
    fEmp.innerHTML = '<option value="">All employees</option>' + getEmployees().map(function (e) {
      return '<option value="' + e.id + '">' + escapeHtml(e.name) + "</option>";
    }).join("");
    fEmp.value = keep;
  }

  function renderRecords() {
    const body = document.getElementById("att-body");
    let from = fFrom.value || todayStr();
    let to = fTo.value || todayStr();
    if (from > to) { const t = from; from = to; to = t; }
    if (addDays(from, 92) < to) from = addDays(to, -92); // keep the table small (max ~3 months)

    let rows = attendanceRows(from, to, fEmp.value ? Number(fEmp.value) : null);
    if (fStatus.value) rows = rows.filter(function (r) { return r.status === fStatus.value; });
    currentRows = rows;

    if (!getEmployees().length) {
      body.innerHTML = emptyRow(7, "No employees yet. Add employees first.");
      return;
    }
    if (!rows.length) {
      body.innerHTML = emptyRow(7, "No records for this filter.");
      return;
    }
    body.innerHTML = rows.slice(0, 400).map(function (r) {
      return "<tr><td>" + formatDate(r.date) + "</td><td>" + escapeHtml(r.employee.name) + "</td><td>" +
        escapeHtml(r.employee.department) + "</td><td>" + formatTime(r.checkIn) + "</td><td>" +
        formatTime(r.checkOut) + "</td><td>" + (r.checkOut ? formatHours(r.hours) : "-") + "</td><td>" +
        badge(r.status) + "</td></tr>";
    }).join("");
  }

  [fFrom, fTo, fEmp, fStatus].forEach(function (el) { el.addEventListener("change", renderRecords); });

  document.getElementById("csv-btn").addEventListener("click", function () {
    if (!currentRows.length) return toast("Nothing to export.", "error");
    const blob = new Blob([attendanceToCsv(currentRows)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "attendance_" + fFrom.value + "_to_" + fTo.value + ".csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  /* ---------- announcements ---------- */

  function renderAnnounce() {
    renderAnnouncements("announce-list", true, renderAnnounce);
  }

  document.getElementById("announce-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const form = e.target;
    const v = formValues(form);
    const result = postAnnouncement(v.title, v.message);
    if (!result.ok) return showErrors(form, result.errors);
    clearErrors(form);
    form.reset();
    renderAnnounce();
    toast("Announcement posted.");
  });

  /* ---------- go ---------- */

  renderStats();
  renderBars();
  fillEmployeeSelect();
  renderRecords();
  renderAnnounce();
  initChat("chat", user);
})();
