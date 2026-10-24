# HCM Lite

A small HR web app for **Admin** and **Employees**, built with only **HTML, CSS and JavaScript**.
No framework, no backend. All data is saved in the browser with `localStorage`.
The app starts empty - there is no dummy data.

Made for the Saylani Hackathon (Beginner Track), 24 October 2026.

## How to run

1. Open `index.html` in a browser (double click, or use Live Server in VS Code).
2. **First time:** create the company and the Admin account.
3. Log in as Admin, open **Employees** and add an employee. This creates that employee's login (email + password).
4. Log out, log in as the employee, and check in.

To host it free: push the folder to GitHub and turn on GitHub Pages, or drag the folder into Netlify / Vercel.

## Pages

| File | Who | What it does |
|------|-----|--------------|
| `index.html` | Everyone | Login + first-run setup |
| `pages/admin.html` | Admin | Totals, last 7 days, attendance records (filter + CSV), announcements, smart helper |
| `pages/employees.html` | Admin | Add (creates login), edit, delete, search, department filter |
| `pages/leaves.html` | Admin | Approve / reject leave with a comment |
| `pages/settings.html` | Admin | Office start time, grace minutes, yearly leave quota, working days, change password |
| `pages/employee.html` | Employee | Check in / out, my attendance, apply leave, announcements, smart helper, change password |
| `pages/payslip.html` | Both | Monthly payslip, print or save as PDF (Admin picks any employee, Employee sees own) |

Every page checks who is logged in. An Employee who opens an Admin page is sent back to their own dashboard.

## Business rules (the Admin decides them in Settings)

- **Late:** check-in after office start + grace minutes (e.g. 09:00 + 15 = after 09:15).
- **One check-in per day.** Check-out only after check-in.
- **Half day:** worked under 5 hours (check-out - check-in).
- **Absent:** no record on a working day (days on approved leave are not absent; today is never absent until the day ends).
- **Leave:** From must be on or before To; only working days are counted (weekends skipped); cannot overlap another leave; cannot go over the yearly quota (pending requests count while applying). Rejecting needs a comment.
- **Payslip:** per day = salary / working days in the month; deduction = per day x (absent days + 0.5 x half days); net = salary - deduction. Approved leave is paid.
- **Forms:** required fields, valid email, email not already used, salary greater than 0. Errors show next to the field.

## Smart helper

A chat box on both dashboards. It matches keywords in the question and answers with real numbers from the app's data.

- Admin: "How many employees do we have?", "Who is on leave today?", "Who was late today?", "How many leave requests are pending?", also present/absent today, departments, total salary.
- Employee (own data only): "How many leaves do I have left?", "Was I late today?", "How many hours did I work this week?", "Is my leave approved?".

An Employee who asks about the company or other people gets a polite refusal.

## Files

```
index.html
pages/        admin, employees, leaves, settings, employee, payslip (.html)
css/style.css
js/storage.js        localStorage helpers + date utilities
js/auth.js           setup, login, logout, change password, role guards
js/employees.js      employee CRUD + validation + search
js/attendance.js     check in / out, status rules, monthly summary
js/leave.js          apply, approve / reject, balance, rules
js/payroll.js        payslip calculation
js/announcements.js  Admin posts, Employee reads
js/helper.js         smart helper (keyword matching)
js/ui.js             sidebar, toasts, form errors, chat widget
js/pages/            one small script per page
```

## localStorage keys

`hcm_company`, `hcm_users`, `hcm_attendance`, `hcm_leaves`, `hcm_session`, `hcm_announcements`
.

## Bonus features included

- Export attendance to CSV, printable payslip, announcements, last-7-days bar chart (plain CSS).

## Notes

- Data lives in one browser only. Real apps use a server and a database.
- Passwords are stored as plain text because this is a learning project. Never do this in a real app.
- If an employee forgets to check out, that day is counted as present (hours unknown).
- To reset everything, clear this site's data in the browser (or run `localStorage.clear()` in the console).
