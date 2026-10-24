/* =========================================================
   auth.js
   First-run setup, login, logout, change password,
   and the role guard used at the top of every page.
   ========================================================= */

/* ---------- first-run setup ---------- */

function isSetupDone() {
  const company = getCompany();
  const hasAdmin = getUsers().some(function (u) { return u.role === "admin"; });
  return Boolean(company && hasAdmin);
}

function validateSetup(data) {
  const errors = {};
  if (!data.companyName.trim()) errors.companyName = "Company name is required.";
  if (!data.adminName.trim()) errors.adminName = "Your name is required.";
  if (!data.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(data.email.trim())) errors.email = "Enter a valid email address.";
  if (!data.password) errors.password = "Password is required.";
  else if (data.password.length < 6) errors.password = "Use at least 6 characters.";
  if (data.confirm !== data.password) errors.confirm = "Passwords do not match.";
  return errors;
}

function setupCompany(data) {
  if (isSetupDone()) return { ok: false, errors: { companyName: "Setup is already done. Please log in." } };
  const errors = validateSetup(data);
  if (Object.keys(errors).length) return { ok: false, errors: errors };

  saveCompany(Object.assign({ name: data.companyName.trim() }, DEFAULT_SETTINGS));
  const admin = {
    id: newId(),
    name: data.adminName.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    role: "admin",
    department: "Management",
    salary: 0,
    createdAt: todayStr(),
  };
  saveUsers([admin]);
  writeData(HCM_KEYS.session, { userId: admin.id });
  return { ok: true, user: admin };
}

/* ---------- session ---------- */

function getSession() {
  return readData(HCM_KEYS.session, null);
}

function currentUser() {
  const session = getSession();
  if (!session) return null;
  return getUsers().find(function (u) { return u.id === session.userId; }) || null;
}

function login(email, password) {
  const errors = {};
  if (!email.trim()) errors.email = "Email is required.";
  if (!password) errors.password = "Password is required.";
  if (Object.keys(errors).length) return { ok: false, errors: errors };

  const user = getUsers().find(function (u) {
    return u.email === email.trim().toLowerCase();
  });
  if (!user) return { ok: false, errors: { email: "No account found with this email." } };
  if (user.password !== password) return { ok: false, errors: { password: "Wrong password." } };

  writeData(HCM_KEYS.session, { userId: user.id });
  return { ok: true, user: user };
}

function logout() {
  localStorage.removeItem(HCM_KEYS.session);
}

function changePassword(userId, oldPassword, newPassword, confirm) {
  const errors = {};
  const users = getUsers();
  const user = users.find(function (u) { return u.id === userId; });
  if (!user) return { ok: false, errors: { oldPassword: "User not found." } };
  if (!oldPassword) errors.oldPassword = "Enter your current password.";
  else if (user.password !== oldPassword) errors.oldPassword = "Current password is wrong.";
  if (!newPassword) errors.newPassword = "Enter a new password.";
  else if (newPassword.length < 6) errors.newPassword = "Use at least 6 characters.";
  if (confirm !== newPassword) errors.confirm = "Passwords do not match.";
  if (Object.keys(errors).length) return { ok: false, errors: errors };

  user.password = newPassword;
  saveUsers(users);
  return { ok: true };
}

/* ---------- guards (call at the top of each page) ---------- */

/* Where each role lands. `fromRoot` is true on index.html (which is not inside /pages/). */
function homeFor(user, fromRoot) {
  const file = user.role === "admin" ? "admin.html" : "employee.html";
  return (fromRoot ? "pages/" : "") + file;
}

function requireRole(role) {
  const user = currentUser();
  if (!user) {
    window.location.replace("../index.html");
    return null;
  }
  if (user.role !== role) {
    window.location.replace(homeFor(user, false)); // wrong role -> own dashboard
    return null;
  }
  return user;
}

/* For pages that both roles may open (payslip) */
function requireLogin() {
  const user = currentUser();
  if (!user) {
    window.location.replace("../index.html");
    return null;
  }
  return user;
}
