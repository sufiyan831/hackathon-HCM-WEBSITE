/* =========================================================
   helper.js  -  Smart helper (rule based)
   Matches keywords in the question and answers with real
   numbers from localStorage.
   Admin sees company data. Employee sees ONLY own data.
   ========================================================= */

const HELPER_SUGGESTIONS = {
  admin: [
    "How many employees do we have?",
    "Who is on leave today?",
    "Who was late today?",
    "How many leave requests are pending?",
  ],
  employee: [
    "How many leaves do I have left?",
    "Was I late today?",
    "How many hours did I work this week?",
    "Is my leave approved?",
  ],
};

function nameList(names) {
  return names.join(", ");
}

function has(text, words) {
  return words.some(function (w) { return text.includes(w); });
}

/* Main entry: returns the answer as plain text. */
function askHelper(question, user) {
  const text = (question || "").toLowerCase().trim();
  if (!text) return "Please type a question.";
  if (user.role === "admin") return adminAnswer(text);
  return employeeAnswer(text, user);
}

/* ---------------- Admin ---------------- */

function adminAnswer(text) {
  const today = todayStr();
  const employees = getEmployees();

  if (has(text, ["hello", "hi ", "help", "what can you"]) || text === "hi") {
    return "I can answer questions like:\n- " + HELPER_SUGGESTIONS.admin.join("\n- ");
  }

  if (has(text, ["late"])) {
    const late = employees.filter(function (e) {
      const r = getRecord(e.id, today);
      return r && r.late;
    });
    if (!late.length) return "Nobody was late today.";
    return late.length + " employee(s) were late today: " + nameList(late.map(function (e) {
      return e.name + " (" + formatTime(getRecord(e.id, today).checkIn) + ")";
    })) + ".";
  }

  if (has(text, ["leave"]) && has(text, ["pending", "waiting", "request"])) {
    const n = pendingLeaves().length;
    return n === 0 ? "There are no pending leave requests." : n + " leave request(s) are waiting for your decision.";
  }

  if (has(text, ["leave", "vacation", "off today"])) {
    const list = leavesOnDate(today);
    if (!list.length) return "Nobody is on leave today.";
    const casual = list.filter(function (l) { return l.type === "Casual"; }).length;
    const sick = list.filter(function (l) { return l.type === "Sick"; }).length;
    const other = list.length - casual - sick;
    let breakdown = casual + " casual, " + sick + " sick";
    if (other) breakdown += ", " + other + " other";
    const names = list.map(function (l) {
      const u = getUserById(l.userId);
      return u ? u.name : "Unknown";
    });
    return list.length + " employee(s) on leave today: " + breakdown + ". (" + nameList(names) + ")";
  }

  if (has(text, ["absent", "not checked", "missing"])) {
    const o = todayOverview();
    return o.absent + " employee(s) are absent and " + o.notYet + " have not checked in yet today.";
  }

  if (has(text, ["present", "check in", "checked in", "attendance", "came"])) {
    const o = todayOverview();
    return o.present + " of " + o.total + " employees have checked in today (" + o.late + " late, " + o.half + " half day).";
  }

  if (has(text, ["department"])) {
    if (!employees.length) return "There are no employees yet.";
    const counts = {};
    employees.forEach(function (e) { counts[e.department] = (counts[e.department] || 0) + 1; });
    return Object.keys(counts).map(function (d) { return d + ": " + counts[d]; }).join(", ") + ".";
  }

  if (has(text, ["salary", "payroll", "budget"])) {
    const total = employees.reduce(function (s, e) { return s + e.salary; }, 0);
    return "Total monthly salary of all employees: " + formatMoney(total) + ".";
  }

  if (has(text, ["employee", "staff", "headcount", "people", "team"])) {
    return "We have " + employees.length + " employee(s) (" + getDepartments().length + " department(s)).";
  }

  return "Sorry, I did not understand. Try one of these:\n- " + HELPER_SUGGESTIONS.admin.join("\n- ");
}

/* ---------------- Employee (own data only) ---------------- */

function employeeAnswer(text, user) {
  const today = todayStr();
  const year = new Date().getFullYear();

  if (has(text, ["hello", "help", "what can you"]) || text === "hi") {
    return "I can answer questions about your own data:\n- " + HELPER_SUGGESTIONS.employee.join("\n- ");
  }

  // Employees must never see other people's data.
  if (has(text, ["employees", "everyone", "colleague", "team", "salary of", "who is", "who was", "who has"])) {
    if (has(text, ["on leave"]) || has(text, ["late"])) {
      // fall through: answer only for the user themselves below
    } else {
      return "I can only share your own data. Ask me about your own attendance, leaves or hours.";
    }
  }

  if (has(text, ["hour", "worked", "work "]) ) {
    const h = hoursThisWeek(user.id);
    return "You worked " + formatHours(h) + " this week (finished days only).";
  }

  if (has(text, ["late"])) {
    const r = getRecord(user.id, today);
    if (!r) return "You have not checked in today yet.";
    if (r.late) return "Yes, you were late today. You checked in at " + formatTime(r.checkIn) + ".";
    return "No, you were on time today (checked in at " + formatTime(r.checkIn) + ").";
  }

  if (has(text, ["left", "balance", "remaining", "quota", "how many leave", "leaves do i"])) {
    const b = leaveBalance(user.id, year);
    let msg = "You have " + b.left + " leave day(s) left out of " + b.quota + " (" + b.used + " used";
    msg += b.pending ? ", " + b.pending + " pending approval)." : ").";
    return msg;
  }

  if (has(text, ["approved", "rejected", "pending", "status", "my leave", "on leave"])) {
    if (has(text, ["on leave", "today"])) {
      return isOnLeave(user.id, today) ? "Yes, you are on approved leave today." : "No, you are not on leave today.";
    }
    const mine = getLeaves().filter(function (l) { return l.userId === user.id; });
    if (!mine.length) return "You have not applied for any leave.";
    const last = mine[mine.length - 1];
    let msg = "Your latest leave request (" + formatDate(last.from) + " to " + formatDate(last.to) + ") is " + last.status + ".";
    if (last.comment) msg += " Admin comment: " + last.comment;
    return msg;
  }

  if (has(text, ["absent"])) {
    const now = new Date();
    const s = monthSummary(user.id, now.getFullYear(), now.getMonth() + 1);
    return "You have " + s.absent + " absent day(s) this month.";
  }

  if (has(text, ["half"])) {
    const now = new Date();
    const s = monthSummary(user.id, now.getFullYear(), now.getMonth() + 1);
    return "You have " + s.half + " half day(s) this month.";
  }

  if (has(text, ["present", "check in", "checked in", "attendance", "today"])) {
    const r = getRecord(user.id, today);
    if (!r) return "You have not checked in today.";
    let msg = "You checked in at " + formatTime(r.checkIn);
    msg += r.checkOut ? " and checked out at " + formatTime(r.checkOut) + "." : " and have not checked out yet.";
    return msg;
  }

  if (has(text, ["payslip", "net", "pay"])) {
    const now = new Date();
    const p = calcPayslip(user.id, now.getFullYear(), now.getMonth() + 1);
    return "Your net salary for " + MONTH_NAMES[now.getMonth()] + " is " + formatMoney(p.net) + " so far (deduction " + formatMoney(p.deduction) + ").";
  }

  return "Sorry, I did not understand. Try one of these:\n- " + HELPER_SUGGESTIONS.employee.join("\n- ");
}
