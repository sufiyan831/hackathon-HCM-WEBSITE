/* leaves.html - approve or reject leave requests with a comment */

(function () {
  const user = requireRole("admin");
  if (!user) return;
  initShell(user, "leaves.html", "Leave requests");

  const body = document.getElementById("leave-body");
  const dialog = document.getElementById("decide-dialog");
  const form = document.getElementById("decide-form");
  let filter = "pending";
  let deciding = null;

  function render() {
    let list = getLeaves();
    if (filter) list = list.filter(function (l) { return l.status === filter; });
    list = list.slice().sort(function (a, b) { return b.from.localeCompare(a.from); });

    if (!list.length) {
      body.innerHTML = emptyRow(8, filter === "pending" ? "No pending requests." : "No leave requests here.");
      return;
    }
    body.innerHTML = list.map(function (l) {
      const emp = getUserById(l.userId);
      const action = l.status === "pending"
        ? '<button class="btn btn-primary btn-sm" data-decide="' + l.id + '">Review</button>' : "";
      return "<tr><td><strong>" + escapeHtml(emp ? emp.name : "Deleted user") + "</strong></td><td>" + escapeHtml(l.type) +
        "</td><td>" + formatDate(l.from) + (l.from !== l.to ? " - " + formatDate(l.to) : "") + "</td><td>" + l.days +
        "</td><td>" + escapeHtml(l.reason) + "</td><td>" + badge(l.status) + "</td><td>" + escapeHtml(l.comment || "-") +
        "</td><td>" + action + "</td></tr>";
    }).join("");
  }

  document.getElementById("tabs").addEventListener("click", function (e) {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
    tab.classList.add("active");
    filter = tab.dataset.status;
    render();
  });

  body.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-decide]");
    if (!btn) return;
    deciding = getLeaves().find(function (l) { return l.id === Number(btn.dataset.decide); });
    if (!deciding) return;
    const emp = getUserById(deciding.userId);
    const bal = leaveBalance(deciding.userId, leaveYear(deciding));
    document.getElementById("decide-title").textContent = "Leave request";
    document.getElementById("decide-info").textContent =
      (emp ? emp.name : "Employee") + " - " + deciding.type + ", " + deciding.days + " working day(s). Balance left: " + bal.left + ".";
    clearErrors(form);
    form.reset();
    dialog.showModal();
  });

  function decide(status) {
    const comment = form.elements.comment.value;
    const result = decideLeave(deciding.id, status, comment);
    if (!result.ok) return showErrors(form, { comment: result.error });
    dialog.close();
    toast("Leave " + status + ".");
    render();
  }

  document.getElementById("approve-btn").addEventListener("click", function () { decide("approved"); });
  document.getElementById("reject-btn").addEventListener("click", function () { decide("rejected"); });
  document.getElementById("decide-cancel").addEventListener("click", function () { dialog.close(); });

  render();
})();
