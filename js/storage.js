/* =========================================================
   storage.js
   localStorage read/write helpers + date utilities.
   Reused on every page.
   ========================================================= */

const HCM_KEYS = {
  company: "hcm_company",
  users: "hcm_users",
  attendance: "hcm_attendance",
  leaves: "hcm_leaves",
  session: "hcm_session",
  announcements: "hcm_announcements",
};

/* ---------- read / write ---------- */

function readData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    return value === null || value === undefined ? fallback : value;
  } catch (err) {
    return fallback; // broken JSON -> act as if empty
  }
}

function writeData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function newId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

/* ---------- company settings ---------- */

const DEFAULT_SETTINGS = {
  startTime: "09:00",
  graceMinutes: 15,
  leaveQuota: 12,
  workingDays: [1, 2, 3, 4, 5], // 0 = Sunday ... 6 = Saturday
};

function getCompany() {
  return readData(HCM_KEYS.company, null);
}

function saveCompany(company) {
  writeData(HCM_KEYS.company, company);
}

/* ---------- date helpers (always LOCAL time, never UTC) ---------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function todayStr() {
  return toDateStr(new Date());
}

function nowTime() {
  const d = new Date();
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

function parseDate(str) {
  const parts = str.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function addDays(str, n) {
  const d = parseDate(str);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function toMinutes(time) {
  const parts = time.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month is 1-12
}

function isWorkingDay(dateStr, company) {
  const days = company && company.workingDays ? company.workingDays : DEFAULT_SETTINGS.workingDays;
  return days.includes(parseDate(dateStr).getDay());
}

function countWorkingDays(from, to, company) {
  let count = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (isWorkingDay(d, company)) count++;
  }
  return count;
}

function workingDaysInMonth(year, month, company) {
  return countWorkingDays(
    year + "-" + pad2(month) + "-01",
    year + "-" + pad2(month) + "-" + pad2(daysInMonth(year, month)),
    company
  );
}

/* Monday of the week that contains dateStr */
function startOfWeek(dateStr) {
  const day = parseDate(dateStr).getDay(); // 0 = Sunday
  const back = day === 0 ? 6 : day - 1;
  return addDays(dateStr, -back);
}

/* ---------- display helpers ---------- */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(str) {
  if (!str) return "-";
  const d = parseDate(str);
  return d.getDate() + " " + MONTH_NAMES[d.getMonth()].slice(0, 3) + " " + d.getFullYear();
}

function formatTime(time) {
  if (!time) return "-";
  const parts = time.split(":").map(Number);
  const suffix = parts[0] >= 12 ? "PM" : "AM";
  const hour = parts[0] % 12 === 0 ? 12 : parts[0] % 12;
  return hour + ":" + pad2(parts[1]) + " " + suffix;
}

function formatMoney(n) {
  return "Rs " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatHours(h) {
  return (Math.round(h * 100) / 100).toFixed(2) + " h";
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
