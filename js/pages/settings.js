/* settings.html - company settings + change password */

(function () {
  const user = requireRole("admin");
  if (!user) return;
  initShell(user, "settings.html", "Settings");

  const form = document.getElementById("settings-form");
  const company = getCompany();

  // fill the form with the saved values
  form.elements.name.value = company.name;
  form.elements.startTime.value = company.startTime;
  form.elements.graceMinutes.value = company.graceMinutes;
  form.elements.leaveQuota.value = company.leaveQuota;

  const daysBox = document.getElementById("days-box");
  daysBox.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
    const checked = company.workingDays.includes(d) ? " checked" : "";
    return '<label><input type="checkbox" value="' + d + '"' + checked + "> " + DAY_NAMES[d].slice(0, 3) + "</label>";
  }).join("");

  function validateSettings(v, days) {
    const errors = {};
    if (!v.name.trim()) errors.name = "Company name is required.";
    if (!v.startTime) errors.startTime = "Office start time is required.";
    const grace = Number(v.graceMinutes);
    if (v.graceMinutes === "" || isNaN(grace) || grace < 0 || grace > 180) errors.graceMinutes = "Enter minutes between 0 and 180.";
    const quota = Number(v.leaveQuota);
    if (v.leaveQuota === "" || isNaN(quota) || quota < 0 || quota > 365) errors.leaveQuota = "Enter days between 0 and 365.";
    return errors;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const v = formValues(form);
    const days = Array.prototype.map.call(daysBox.querySelectorAll("input:checked"), function (c) { return Number(c.value); });
    const errors = validateSettings(v, days);
    const daysError = document.getElementById("days-error");
    daysError.innerHTML = "";

    if (!days.length) {
      daysError.innerHTML = '<div class="field-error">Choose at least one working day.</div>';
    }
    if (Object.keys(errors).length) showErrors(form, errors);
    if (Object.keys(errors).length || !days.length) return;

    clearErrors(form);
    saveCompany({
      name: v.name.trim(),
      startTime: v.startTime,
      graceMinutes: Number(v.graceMinutes),
      leaveQuota: Number(v.leaveQuota),
      workingDays: days,
    });
    toast("Settings saved.");
  });

  bindPasswordForm("password-form", user);
})();
