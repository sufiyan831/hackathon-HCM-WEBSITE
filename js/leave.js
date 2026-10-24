/* =========================================================
   leave.js
   Apply, approve / reject, balance and leave rules.
   ========================================================= */

const LEAVE_TYPES = ["Casual", "Sick", "Other"];

function getLeaves() {
  return readData(HCM_KEYS.leaves, []);
}

function saveLeaves(leaves) {
  writeData(HCM_KEYS.leaves, leaves);
}

function leaveYear(leave) {
  return Number(leave.from.slice(0, 4));
}

function sumLeaveDays(userId, year, statuses) {
  return getLeaves()
    .filter(function (l) {
      return l.userId === userId && leaveYear(l) === year && statuses.includes(l.status);
    })
    .reduce(function (sum, l) { return sum + l.days; }, 0);
}

/* quota - approved days = what is left.  Pending days are shown separately. */
function leaveBalance(userId, year) {
  const company = getCompany();
  const quota = company ? Number(company.leaveQuota) : DEFAULT_SETTINGS.leaveQuota;
  const used = sumLeaveDays(userId, year, ["approved"]);
  const pending = sumLeaveDays(userId, year, ["pending"]);
  return { quota: quota, used: used, pending: pending, left: quota - used };
}

/* data = { type, from, to, reason } */
function validateLeave(userId, data) {
  const errors = {};
  const company = getCompany();

  if (!data.type) errors.type = "Choose a leave type.";
  if (!data.from) errors.from = "From date is required.";
  if (!data.to) errors.to = "To date is required.";
  if (!(data.reason || "").trim()) errors.reason = "Please write a reason.";

  if (data.from && data.to) {
    if (data.from > data.to) {
      errors.from = "From date must be on or before To date.";
    } else if (data.from.slice(0, 4) !== data.to.slice(0, 4)) {
      errors.to = "Please apply separately for each year.";
    } else {
      const days = countWorkingDays(data.from, data.to, company);
      if (days === 0) {
        errors.to = "These dates have no working days.";
      } else {
        // cannot overlap another pending / approved leave
        const overlap = getLeaves().some(function (l) {
          return l.userId === userId &&
            (l.status === "pending" || l.status === "approved") &&
            l.from <= data.to && l.to >= data.from;
        });
        if (overlap) {
          errors.from = "These dates overlap another leave request.";
        } else {
          // cannot go over the yearly quota (pending requests count too)
          const year = Number(data.from.slice(0, 4));
          const bal = leaveBalance(userId, year);
          const available = bal.quota - bal.used - bal.pending;
          if (days > available) {
            errors.to = "Not enough balance: you asked for " + days + " day(s) but only " +
              Math.max(available, 0) + " are available.";
          }
        }
      }
    }
  }
  return errors;
}

function applyLeave(userId, data) {
  const errors = validateLeave(userId, data);
  if (Object.keys(errors).length) return { ok: false, errors: errors };

  const leave = {
    id: newId(),
    userId: userId,
    type: data.type,
    from: data.from,
    to: data.to,
    days: countWorkingDays(data.from, data.to, getCompany()),
    reason: data.reason.trim(),
    status: "pending",
    comment: "",
    appliedOn: todayStr(),
  };
  const leaves = getLeaves();
  leaves.push(leave);
  saveLeaves(leaves);
  return { ok: true, leave: leave };
}

/* status = "approved" | "rejected". A comment is required to reject. */
function decideLeave(id, status, comment) {
  const leaves = getLeaves();
  const leave = leaves.find(function (l) { return l.id === id; });
  if (!leave) return { ok: false, error: "Leave request not found." };
  if (leave.status !== "pending") return { ok: false, error: "This request was already decided." };
  if (status === "rejected" && !(comment || "").trim()) {
    return { ok: false, error: "Please write a comment when rejecting." };
  }
  if (status === "approved") {
    const bal = leaveBalance(leave.userId, leaveYear(leave));
    if (leave.days > bal.left) {
      return { ok: false, error: "Employee only has " + bal.left + " day(s) left in the quota." };
    }
  }
  leave.status = status;
  leave.comment = (comment || "").trim();
  leave.decidedOn = todayStr();
  saveLeaves(leaves);
  return { ok: true, leave: leave };
}

/* Employee can withdraw a request that is still pending. */
function cancelLeave(id, userId) {
  const leaves = getLeaves();
  const leave = leaves.find(function (l) { return l.id === id && l.userId === userId; });
  if (!leave || leave.status !== "pending") return false;
  saveLeaves(leaves.filter(function (l) { return l.id !== id; }));
  return true;
}

function isOnLeave(userId, dateStr) {
  return getLeaves().some(function (l) {
    return l.userId === userId && l.status === "approved" && l.from <= dateStr && l.to >= dateStr;
  });
}

/* Approved leaves that cover a date (used by dashboard + helper). */
function leavesOnDate(dateStr) {
  return getLeaves().filter(function (l) {
    return l.status === "approved" && l.from <= dateStr && l.to >= dateStr;
  });
}

function pendingLeaves() {
  return getLeaves().filter(function (l) { return l.status === "pending"; });
}
