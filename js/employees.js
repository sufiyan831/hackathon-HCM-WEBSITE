/* =========================================================
   employees.js
   Users + employee CRUD, validation, search and filter.
   ========================================================= */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getUsers() {
  return readData(HCM_KEYS.users, []);
}

function saveUsers(users) {
  writeData(HCM_KEYS.users, users);
}

function getUserById(id) {
  return getUsers().find(function (u) { return u.id === Number(id); }) || null;
}

function getEmployees() {
  return getUsers().filter(function (u) { return u.role === "employee"; });
}

function getDepartments() {
  const set = {};
  getEmployees().forEach(function (e) { set[e.department] = true; });
  return Object.keys(set).sort();
}

/* data = { name, email, department, salary, password }
   editingId = id of the employee being edited (null when adding) */
function validateEmployee(data, editingId) {
  const errors = {};
  const name = (data.name || "").trim();
  const email = (data.email || "").trim().toLowerCase();
  const department = (data.department || "").trim();
  const salary = Number(data.salary);

  if (!name) errors.name = "Name is required.";

  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  else {
    const used = getUsers().some(function (u) {
      return u.email === email && u.id !== editingId;
    });
    if (used) errors.email = "This email is already used.";
  }

  if (!department) errors.department = "Department is required.";

  if (data.salary === "" || data.salary === null || data.salary === undefined || isNaN(salary)) {
    errors.salary = "Salary is required.";
  } else if (salary <= 0) {
    errors.salary = "Salary must be greater than 0.";
  }

  // password is required when adding; optional when editing (blank = keep old one)
  if (!editingId) {
    if (!data.password) errors.password = "Password is required.";
    else if (data.password.length < 6) errors.password = "Use at least 6 characters.";
  } else if (data.password && data.password.length < 6) {
    errors.password = "Use at least 6 characters.";
  }

  return errors;
}

/* Adding an employee also creates their login (email + password). */
function addEmployee(data) {
  const errors = validateEmployee(data, null);
  if (Object.keys(errors).length) return { ok: false, errors: errors };

  const users = getUsers();
  const employee = {
    id: newId(),
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    role: "employee",
    department: data.department.trim(),
    salary: Number(data.salary),
    createdAt: todayStr(),
  };
  users.push(employee);
  saveUsers(users);
  return { ok: true, employee: employee };
}

function updateEmployee(id, data) {
  const errors = validateEmployee(data, id);
  if (Object.keys(errors).length) return { ok: false, errors: errors };

  const users = getUsers();
  const user = users.find(function (u) { return u.id === id && u.role === "employee"; });
  if (!user) return { ok: false, errors: { name: "Employee not found." } };

  user.name = data.name.trim();
  user.email = data.email.trim().toLowerCase();
  user.department = data.department.trim();
  user.salary = Number(data.salary);
  if (data.password) user.password = data.password;
  saveUsers(users);
  return { ok: true, employee: user };
}

/* Deleting an employee also removes their attendance and leave records. */
function deleteEmployee(id) {
  const users = getUsers();
  const user = users.find(function (u) { return u.id === id; });
  if (!user || user.role !== "employee") return false;

  saveUsers(users.filter(function (u) { return u.id !== id; }));
  saveAttendance(getAttendance().filter(function (r) { return r.userId !== id; }));
  saveLeaves(getLeaves().filter(function (l) { return l.userId !== id; }));
  return true;
}

/* search = text in name/email, department = "" for all */
function searchEmployees(search, department) {
  const text = (search || "").trim().toLowerCase();
  return getEmployees().filter(function (e) {
    const matchText = !text || e.name.toLowerCase().includes(text) || e.email.includes(text);
    const matchDept = !department || e.department === department;
    return matchText && matchDept;
  });
}
