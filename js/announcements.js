/* =========================================================
   announcements.js
   Admin posts, everyone reads.
   ========================================================= */

function getAnnouncements() {
  return readData(HCM_KEYS.announcements, []);
}

function saveAnnouncements(list) {
  writeData(HCM_KEYS.announcements, list);
}

function postAnnouncement(title, message) {
  const errors = {};
  if (!title.trim()) errors.title = "Title is required.";
  if (!message.trim()) errors.message = "Message is required.";
  if (Object.keys(errors).length) return { ok: false, errors: errors };

  const list = getAnnouncements();
  list.unshift({ id: newId(), title: title.trim(), message: message.trim(), date: todayStr() });
  saveAnnouncements(list);
  return { ok: true };
}

function deleteAnnouncement(id) {
  saveAnnouncements(getAnnouncements().filter(function (a) { return a.id !== id; }));
}
