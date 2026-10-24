/* employees.html - add (creates login), edit, delete, search, filter */

(function () {
  const user = requireRole("admin");
  if (!user) return;
  initShell(user, "employees.html", "Employees");

  const body = document.getElementById("emp-body");
  const search = document.getElementById("search");
  const deptFilter = document.getElementById("dept-filter");
  const dialog = document.getElementById("emp-dialog");
  const form = document.getElementById("emp-form");
  let editingId = null;

  function fillDepartments() {
    const keep = deptFilter.value;
    const depts = getDepartments();
    deptFilter.innerHTML = '<option value="">All departments</option>' + depts.map(function (d) {
      return '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + "</option>";
    }).join("");
    deptFilter.value = depts.includes(keep) ? keep : "";
    document.getElementById("dept-list").innerHTML = depts.map(function (d) {
      return '<option value="' + escapeHtml(d) + '">';
    }).join("");
  }

  function render() {
    const list = searchEmployees(search.value, deptFilter.value);
    if (!list.length) {
      body.innerHTML = emptyRow(6, getEmployees().length ? "No employee matches your search." : "No employees yet. Click \"Add employee\" to create the first one.");
      return;
    }
    body.innerHTML = list.map(function (e) {
      return "<tr><td><strong>" + escapeHtml(e.name) + "</strong></td><td>" + escapeHtml(e.email) + "</td><td>" +
        escapeHtml(e.department) + "</td><td>" + formatMoney(e.salary) + "</td><td>" + formatDate(e.createdAt) +
        '</td><td><div class="actions">' +
        '<button class="btn btn-outline btn-sm" data-edit="' + e.id + '">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-delete="' + e.id + '">Delete</button></div></td></tr>';
    }).join("");
  }

  function openDialog(employee) {
    clearErrors(form);
    form.reset();
    editingId = employee ? employee.id : null;
    document.getElementById("dialog-title").textContent = employee ? "Edit employee" : "Add employee";
    document.getElementById("pw-label").textContent = employee ? "New password (leave empty to keep the old one)" : "Login password";
    if (employee) {
      form.elements.name.value = employee.name;
      form.elements.email.value = employee.email;
      form.elements.department.value = employee.department;
      form.elements.salary.value = employee.salary;
    }
    dialog.showModal();
  }

  document.getElementById("add-btn").addEventListener("click", function () { openDialog(null); });
  document.getElementById("cancel-btn").addEventListener("click", function () { dialog.close(); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const data = formValues(form);
    const result = editingId ? updateEmployee(editingId, data) : addEmployee(data);
    if (!result.ok) return showErrors(form, result.errors);
    dialog.close();
    toast(editingId ? "Employee updated." : "Employee added. Their login is ready.");
    fillDepartments();
    render();
  });

  body.addEventListener("click", function (e) {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-delete]");
    if (editBtn) openDialog(getUserById(editBtn.dataset.edit));
    if (delBtn) {
      const emp = getUserById(delBtn.dataset.delete);
      if (emp && confirm("Delete " + emp.name + "? Their attendance and leave records will be deleted too.")) {
        deleteEmployee(emp.id);
        toast("Employee deleted.");
        fillDepartments();
        render();
      }
    }
  });

  search.addEventListener("input", render);
  deptFilter.addEventListener("change", render);

  fillDepartments();
  render();
})();
