/* =========================================================
   attendance.js
   Check-in / check-out and the attendance rules:
   - late      : check-in after office start + grace minutes
   - half day  : worked under 5 hours
   - absent    : no record on a working day (and not on approved leave)
   ========================================================= */

const HALF_DAY_HOURS = 5;

function getAttendance() {
  return readData(HCM_KEYS.attendance, []);
}

function saveAttendance(records) {
  writeData(HCM_KEYS.attendance, records);
}

function getRecord(userId, dateStr) {
  return getAttendance().find(function (r) {
    return r.userId === userId && r.date === dateStr;
  }) || null;
}

/* hours between check-in and check-out (0 if not checked out yet) */
function workedHours(record) {
  if (!record || !record.checkIn || !record.checkOut) return 0;
  return Math.max(toMinutes(record.checkOut) - toMinutes(record.checkIn), 0) / 60;
}

/* dateStr and time are optional so the rules can be tested. */
function checkIn(userId, dateStr, time) {
  dateStr = dateStr || todayStr();
  time = time || nowTime();
  const company = getCompany();

  if (!isWorkingDay(dateStr, company)) {
    return { ok: false, error: "Today is not a working day." };
  }
  if (isOnLeave(userId, dateStr)) {
    return { ok: false, error: "You are on approved leave today." };
  }
  if (getRecord(userId, dateStr)) {
    return { ok: false, error: "You have already checked in today." };
  }

  const limit = toMinutes(company.startTime) + Number(company.graceMinutes);
  const late = toMinutes(time) > limit;
  const record = {
    id: newId(),
    userId: userId,
    date: dateStr,
    checkIn: time,
    checkOut: "",
    late: late,
    status: late ? "late" : "present",
  };
  const records = getAttendance();
  records.push(record);
  saveAttendance(records);
  return { ok: true, record: record };
}

function checkOut(userId, dateStr, time) {
  dateStr = dateStr || todayStr();
  time = time || nowTime();

  const records = getAttendance();
  const record = records.find(function (r) { return r.userId === userId && r.date === dateStr; });
  if (!record) return { ok: false, error: "Check in first, then check out." };
  if (record.checkOut) return { ok: false, error: "You have already checked out today." };
  if (toMinutes(time) < toMinutes(record.checkIn)) {
    return { ok: false, error: "Check-out time cannot be before check-in." };
  }

  record.checkOut = time;
  if (workedHours(record) < HALF_DAY_HOURS) record.status = "half"; // under 5 hours
  saveAttendance(records);
  return { ok: true, record: record };
}

/* Status of one employee on one date:
   present | late | half | leave | absent | pending | weekend | before */
function dayStatus(userId, dateStr) {
  const user = getUserById(userId);
  const company = getCompany();
  if (user && user.createdAt && dateStr < user.createdAt) return "before";

  const record = getRecord(userId, dateStr);
  if (record) return record.status;

  if (!isWorkingDay(dateStr, company)) return "weekend";
  if (isOnLeave(userId, dateStr)) return "leave";
  if (dateStr >= todayStr()) return "pending"; // today not checked in yet, or future
  return "absent";
}

/* Totals for one employee in one month (month is 1-12). */
function monthSummary(userId, year, month) {
  const company = getCompany();
  const summary = {
    workingDays: workingDaysInMonth(year, month, company),
    present: 0, // present + late (both count as attended)
    late: 0,
    half: 0,
    absent: 0,
    leave: 0,
    hours: 0,
  };
  const total = daysInMonth(year, month);
  for (let day = 1; day <= total; day++) {
    const dateStr = year + "-" + pad2(month) + "-" + pad2(day);
    const status = dayStatus(userId, dateStr);
    const record = getRecord(userId, dateStr);

    if (status === "present" || status === "late") summary.present++;
    if (status === "half") summary.half++;
    if (status === "absent") summary.absent++;
    if (status === "leave") summary.leave++;
    if (record && (record.late || status === "late")) summary.late++;
    if (record) summary.hours += workedHours(record);
  }
  return summary;
}

/* Hours worked from Monday of this week up to today (finished days only). */
function hoursThisWeek(userId) {
  const start = startOfWeek(todayStr());
  const end = todayStr();
  return getAttendance()
    .filter(function (r) { return r.userId === userId && r.date >= start && r.date <= end; })
    .reduce(function (sum, r) { return sum + workedHours(r); }, 0);
}

/* Today's numbers for the Admin dashboard. */
function todayOverview() {
  const today = todayStr();
  const employees = getEmployees();
  const out = { total: employees.length, present: 0, late: 0, half: 0, leave: 0, notYet: 0, absent: 0 };
  employees.forEach(function (e) {
    const status = dayStatus(e.id, today);
    const record = getRecord(e.id, today);
    if (status === "present" || status === "late" || status === "half") out.present++;
    if (record && record.late) out.late++;
    if (status === "half") out.half++;
    if (status === "leave") out.leave++;
    if (status === "pending") out.notYet++;
    if (status === "absent") out.absent++;
  });
  return out;
}

/* Rows for the Admin attendance table: every employee x every date in the range. */
function attendanceRows(from, to, userId) {
  const rows = [];
  const employees = userId ? [getUserById(userId)].filter(Boolean) : getEmployees();
  for (let d = to; d >= from; d = addDays(d, -1)) {
    employees.forEach(function (e) {
      const status = dayStatus(e.id, d);
      if (status === "before" || status === "weekend") return;
      const record = getRecord(e.id, d);
      rows.push({
        date: d,
        employee: e,
        status: status,
        checkIn: record ? record.checkIn : "",
        checkOut: record ? record.checkOut : "",
        hours: record ? workedHours(record) : 0,
      });
    });
  }
  return rows;
}

function attendanceToCsv(rows) {
  const lines = [["Date", "Employee", "Department", "Check in", "Check out", "Hours", "Status"].join(",")];
  rows.forEach(function (r) {
    lines.push([
      r.date,
      '"' + r.employee.name.replace(/"/g, '""') + '"',
      '"' + r.employee.department.replace(/"/g, '""') + '"',
      r.checkIn, r.checkOut, r.hours.toFixed(2), r.status,
    ].join(","));
  });
  return lines.join("\n");
}
