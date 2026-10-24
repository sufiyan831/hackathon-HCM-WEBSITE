/* =========================================================
   ui.js
   Shared interface pieces: sidebar + top bar, toast messages,
   form errors, the helper chat box, change-password form.
   ========================================================= */

/* ---------- sidebar + top bar ---------- */

const NAV_ITEMS = {
  admin: [
    { href: "admin.html", label: "Dashboard" },
    { href: "employees.html", label: "Employees" },
    { href: "leaves.html", label: "Leave requests" },
    { href: "payslip.html", label: "Payslips" },
    { href: "settings.html", label: "Settings" },
  ],
  employee: [
    { href: "employee.html", label: "My dashboard" },
    { href: "payslip.html", label: "My payslip" },
  ],
};

/* Call once on every logged-in page. */
function initShell(user, activeFile, title) {
  const company = getCompany();
  const sidebar = document.getElementById("sidebar");
  const topbar = document.getElementById("topbar");

  const links = NAV_ITEMS[user.role].map(function (item) {
    const active = item.href === activeFile ? " active" : "";
    return '<a class="nav-link' + active + '" href="' + item.href + '">' + item.label + "</a>";
  }).join("");

  sidebar.innerHTML =
    '<div class="brand"><div><strong>HCM Lite</strong>' +
    '<small>' + escapeHtml(company ? company.name : "") + "</small></div></div>" +
    '<nav class="nav">' + links + "</nav>" +
    '<div class="sidebar-foot"><span class="role-tag role-' + user.role + '">' + user.role + "</span></div>";

  topbar.innerHTML =
    '<button class="icon-btn menu-btn" id="menu-btn" aria-label="Open menu">☰</button>' +
    "<h1>" + escapeHtml(title) + "</h1>" +
    '<div class="topbar-right">' +
    '<span class="user-chip">' + escapeHtml(user.name) + "</span>" +
    '<button class="btn btn-outline btn-sm" id="logout-btn">Log out</button></div>';

  // overlay for the mobile menu
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  document.body.appendChild(overlay);

  function closeMenu() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }
  document.getElementById("menu-btn").addEventListener("click", function () {
    sidebar.classList.add("open");
    overlay.classList.add("show");
  });
  overlay.addEventListener("click", closeMenu);
  document.getElementById("logout-btn").addEventListener("click", function () {
    logout();
    window.location.href = "../index.html";
  });
}

/* ---------- toast ---------- */

function toast(message, type) {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = "toast toast-" + (type || "success");
  el.textContent = message;
  host.appendChild(el);
  setTimeout(function () { el.classList.add("hide"); }, 2600);
  setTimeout(function () { el.remove(); }, 3000);
}

/* ---------- form errors (shown next to the field) ---------- */

function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach(function (el) { el.remove(); });
  form.querySelectorAll(".has-error").forEach(function (el) { el.classList.remove("has-error"); });
}

function showErrors(form, errors) {
  clearErrors(form);
  let first = null;
  Object.keys(errors).forEach(function (name) {
    const input = form.elements[name];
    if (!input) return;
    input.classList.add("has-error");
    const msg = document.createElement("div");
    msg.className = "field-error";
    msg.textContent = errors[name];
    input.insertAdjacentElement("afterend", msg);
    if (!first) first = input;
  });
  if (first) first.focus();
}

/* Read all named fields of a form into a plain object. */
function formValues(form) {
  const out = {};
  Array.prototype.forEach.call(form.elements, function (el) {
    if (el.name && el.type !== "checkbox" && el.type !== "submit" && el.type !== "button") out[el.name] = el.value;
  });
  return out;
}

/* ---------- status badge ---------- */

const STATUS_LABELS = {
  present: "Present", late: "Late", half: "Half day", absent: "Absent", leave: "On leave",
  pending: "Not yet", approved: "Approved", rejected: "Rejected",
};

function badge(status) {
  return '<span class="badge badge-' + status + '">' + (STATUS_LABELS[status] || escapeHtml(status)) + "</span>";
}

function emptyRow(cols, message) {
  return '<tr><td colspan="' + cols + '" class="empty">' + escapeHtml(message) + "</td></tr>";
}

/* ---------- helper chat box ---------- */

function initChat(containerId, user) {
  const box = document.getElementById(containerId);
  const chips = HELPER_SUGGESTIONS[user.role].map(function (q) {
    return '<button type="button" class="chip">' + escapeHtml(q) + "</button>";
  }).join("");

  box.innerHTML =
    '<div class="chat-messages" id="' + containerId + '-msgs"></div>' +
    '<div class="chips">' + chips + "</div>" +
    '<form class="chat-form" autocomplete="off">' +
    '<input type="text" name="q" placeholder="Ask about your data..." aria-label="Ask the helper">' +
    '<button class="btn btn-primary" type="submit">Send</button></form>';

  const msgs = document.getElementById(containerId + "-msgs");
  const form = box.querySelector("form");

  function addMessage(text, who) {
    const el = document.createElement("div");
    el.className = "msg msg-" + who;
    el.textContent = text; // textContent: safe, no HTML injection
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function ask(question) {
    if (!question.trim()) return;
    addMessage(question, "user");
    addMessage(askHelper(question, currentUser() || user), "bot");
  }

  addMessage("Hi " + user.name.split(" ")[0] + "! Ask me a question about " +
    (user.role === "admin" ? "the company" : "your attendance and leaves") + ".", "bot");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(form.elements.q.value);
    form.elements.q.value = "";
  });
  box.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () { ask(chip.textContent); });
  });
}

/* ---------- change password form ---------- */

function bindPasswordForm(formId, user) {
  const form = document.getElementById(formId);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const v = formValues(form);
    const result = changePassword(user.id, v.oldPassword, v.newPassword, v.confirm);
    if (!result.ok) return showErrors(form, result.errors);
    clearErrors(form);
    form.reset();
    toast("Password changed.");
  });
}

/* ---------- announcements list (shared markup) ---------- */

function renderAnnouncements(containerId, canDelete, onDelete) {
  const box = document.getElementById(containerId);
  const list = getAnnouncements();
  if (!list.length) {
    box.innerHTML = '<p class="muted">No announcements yet.</p>';
    return;
  }
  box.innerHTML = list.map(function (a) {
    return '<div class="announce"><div class="announce-head"><strong>' + escapeHtml(a.title) + "</strong><small>" +
      formatDate(a.date) + "</small></div><p>" + escapeHtml(a.message) + "</p>" +
      (canDelete ? '<button class="btn btn-ghost btn-sm" data-del="' + a.id + '">Delete</button>' : "") + "</div>";
  }).join("");
  if (canDelete) {
    box.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteAnnouncement(Number(btn.dataset.del));
        onDelete();
      });
    });
  }
}
