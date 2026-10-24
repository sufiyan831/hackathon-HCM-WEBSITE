/* index.html - first-run setup and login */

(function () {
  // Already logged in? Go straight to the right dashboard.
  const existing = currentUser();
  if (existing) {
    window.location.replace(homeFor(existing, true));
    return;
  }

  const setupCard = document.getElementById("setup-card");
  const loginCard = document.getElementById("login-card");

  if (isSetupDone()) {
    loginCard.classList.remove("hidden");
    document.getElementById("login-company").textContent = getCompany().name;
  } else {
    setupCard.classList.remove("hidden");
  }

  document.getElementById("setup-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const form = e.target;
    const result = setupCompany(formValues(form));
    if (!result.ok) return showErrors(form, result.errors);
    window.location.href = homeFor(result.user, true);
  });

  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const form = e.target;
    const v = formValues(form);
    const result = login(v.email, v.password);
    if (!result.ok) return showErrors(form, result.errors);
    window.location.href = homeFor(result.user, true);
  });
})();
