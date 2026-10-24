/* employee.html - check in / out, my attendance, apply leave, helper */

(function () {
  const user = requireRole("employee");
  if (!user) return;
  initShell(user, "employee.html", "My dashboard");

  const inBtn = document.getElementById("in-btn");
  const outBtn = document.getElementById("out-btn");
  const monthInput = document.getElementById("att-month");
  const leaveForm = document.getElementById("leave-form");

  /* ---------- clock + today card ---------- */

  function tickClock() {
    const now = new Date();
    document.getElementById("clock").textContent = formatTime(pad2(now.getHours()) + ":" + pad2(now.getMinutes()));
    document.getElementById("today-date").textContent =
      DAY_NAMES[now.getDay()] + ", " + formatDate(todayStr());
  }

  function renderToday() {
    const company = getCompany();
    const record = getRecord(user.id, todayStr());
    const text = document.getElementById("today-text");

    inBtn.disabled = Boolean(record);
    outBtn.disabled = !record || Boolean(record.checkOut);

    if (!isWorkingDay(todayStr(), company)) {
      text.textContent = "Today is not a working day.";
      inBtn.disabled = true;
    } else if (isOnLeave(user.id, todayStr())) {
      text.textContent = "You are on approved leave today.";
      inBtn.disabled = true;
    } else if (!record) {
      text.textContent = "Office starts at " + formatTime(company.startTime) + " (grace " + company.graceMinutes + " min). You have not checked in yet.";
    } else if (!record.checkOut) {
      text.textContent = "Checked in at " + formatTime(record.checkIn) + (record.late ? " (late)." : ".") + " Do not forget to check out.";
    } else {
      text.textContent = "Checked in " + formatTime(record.checkIn) + ", out " + formatTime(record.checkOut) +
        " - " + formatHours(workedHours(record)) + " (" + STATUS_LABELS[record.status] + ").";
    }
  }

  inBtn.addEventListener("click", function () {
    const result = checkIn(user.id);
    if (!result.ok) return toast(result.error, "error");
    toast(result.record.late ? "Checked in - marked LATE." : "Checked in on time.");
    refreshAll();
  });

  outBtn.addEventListener("click", function () {
    const result = checkOut(user.id);
    if (!result.ok) return toast(result.error, "error");
    toast(result.record.status === "half" ? "Checked out - marked HALF DAY (under 5 hours)." : "Checked out. See you tomorrow!");
    refreshAll();
  });

  /* ---------- this month stats ---------- */

  function renderStats() {
    const now = new Date();
    const s = monthSummary(user.id, now.getFullYear(), now.getMonth() + 1);
    const bal = leaveBalance(user.id, now.getFullYear());
    const cards = [
      { num: s.present, label: "Present (month)", cls: "" },
      { num: s.late, label: "Late (month)", cls: "warn" },
      { num: s.half, label: "Half days", cls: "warn" },
      { num: s.absent, label: "Absent", cls: "danger" },
      { num: bal.left, label: "Leave days left", cls: "accent" },
      { num: formatHours(hoursThisWeek(user.id)), label: "Hours this week", cls: "" },
    ];
    document.getElementById("stats").innerHTML = cards.map(function (c) {
      return '<div class="stat ' + c.cls + '"><div class="stat-num">' + c.num +
        '</div><div class="stat-label">' + c.label + "</div></div>";
    }).join("");

    document.getElementById("balance-text").textContent =
      "Balance: " + bal.left + " of " + bal.quota + " days left" + (bal.pending ? " (" + bal.pending + " pending approval)" : "") + ".";
  }

  /* ---------- apply leave ---------- */

  document.getElementById("l-type").innerHTML = LEAVE_TYPES.map(function (t) {
    return '<option value="' + t + '">' + t + "</option>";
  }).join("");

  function previewDays() {
    const from = leaveForm.elements.from.value;
    const to = leaveForm.elements.to.value;
    const el = document.getElementById("days-preview");
    if (from && to && from <= to) {
      el.textContent = "Working days counted: " + countWorkingDays(from, to, getCompany()) + " (weekends are skipped).";
    } else {
      el.textContent = "";
    }
  }
  leaveForm.elements.from.addEventListener("change", previewDays);
  leaveForm.elements.to.addEventListener("change", previewDays);

  leaveForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const result = applyLeave(user.id, formValues(leaveForm));
    if (!result.ok) return showErrors(leaveForm, result.errors);
    clearErrors(leaveForm);
    leaveForm.reset();
    document.getElementById("days-preview").textContent = "";
    toast("Leave request sent to Admin.");
    refreshAll();
  });

  function renderMyLeaves() {
    const body = document.getElementById("my-leaves");
    const list = getLeaves().filter(function (l) { return l.userId === user.id; })
      .sort(function (a, b) { return b.from.localeCompare(a.from); });
    if (!list.length) {
      body.innerHTML = emptyRow(7, "You have not applied for any leave.");
      return;
    }
    body.innerHTML = list.map(function (l) {
      const cancel = l.status === "pending"
        ? '<button class="btn btn-ghost btn-sm" data-cancel="' + l.id + '">Cancel</button>' : "";
      return "<tr><td>" + escapeHtml(l.type) + "</td><td>" + formatDate(l.from) +
        (l.from !== l.to ? " - " + formatDate(l.to) : "") + "</td><td>" + l.days + "</td><td>" + escapeHtml(l.reason) +
        "</td><td>" + badge(l.status) + "</td><td>" + escapeHtml(l.comment || "-") + "</td><td>" + cancel + "</td></tr>";
    }).join("");
  }

  document.getElementById("my-leaves").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    if (cancelLeave(Number(btn.dataset.cancel), user.id)) {
      toast("Leave request cancelled.");
      refreshAll();
    }
  });

  /* ---------- my attendance table ---------- */

  function renderMyAttendance() {
    const body = document.getElementById("my-att");
    const parts = monthInput.value.split("-").map(Number);
    const year = parts[0];
    const month = parts[1];
    const rows = [];
    for (let d = daysInMonth(year, month); d >= 1; d--) {
      const dateStr = year + "-" + pad2(month) + "-" + pad2(d);
      const status = dayStatus(user.id, dateStr);
      if (status === "before" || status === "weekend") continue;
      if (status === "pending" && dateStr > todayStr()) continue; // hide future days
      const record = getRecord(user.id, dateStr);
      rows.push("<tr><td>" + formatDate(dateStr) + "</td><td>" + DAY_NAMES[parseDate(dateStr).getDay()].slice(0, 3) +
        "</td><td>" + formatTime(record && record.checkIn) + "</td><td>" + formatTime(record && record.checkOut) +
        "</td><td>" + (record && record.checkOut ? formatHours(workedHours(record)) : "-") + "</td><td>" +
        badge(status) + "</td></tr>");
    }
    body.innerHTML = rows.length ? rows.join("") : emptyRow(6, "No attendance for this month yet.");
  }
  monthInput.addEventListener("change", renderMyAttendance);

  /* ---------- refresh + start ---------- */

  function refreshAll() {
    renderToday();
    renderStats();
    renderMyLeaves();
    renderMyAttendance();
  }

  const now = new Date();
  monthInput.value = now.getFullYear() + "-" + pad2(now.getMonth() + 1);

  tickClock();
  setInterval(tickClock, 15000);
  refreshAll();
  renderAnnouncements("announce-list", false);
  initChat("chat", user);
  bindPasswordForm("password-form", user);
})();
