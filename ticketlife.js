// Support ticket lifecycle: reminders + auto-close when the user does not answer an admin.
// Pure functions (no I/O) so they can be tested with a fake clock. State lives on the ticket
// object in db.tickets, which bot.js persists to disk, so it survives restarts.
const H = 3600000;
const REMIND_AFTER = [2 * H, 4 * H, 6 * H]; // reminders, measured from the admin's last reply
const CLOSE_AFTER = 7 * H;                  // auto-close, measured from the admin's last reply

// admin replied to the user: (re)start the window. Also reopens a closed ticket.
function adminReplied(t, now) {
  t.status = "open";
  t.awaiting = true;
  t.adminAt = now;
  t.reminders = 0;
  delete t.closedAt;
  return t;
}
// user answered: stop the pending close until the admin replies again. Returns true if it was closed (reopened).
function userReplied(t, now) {
  const wasClosed = t.status === "closed";
  t.status = "open";
  t.awaiting = false;
  t.userAt = now;
  t.reminders = 0;
  delete t.closedAt;
  return wasClosed;
}
// what should happen to this ticket right now? { action: "none" | "remind" | "close", n }
function due(t, now) {
  if (!t || t.status === "closed" || !t.awaiting || typeof t.adminAt !== "number") return { action: "none" };
  const el = now - t.adminAt;
  if (el >= CLOSE_AFTER) return { action: "close" };
  let passed = 0;
  for (const r of REMIND_AFTER) if (el >= r) passed++;
  if (passed > (t.reminders || 0)) return { action: "remind", n: passed }; // only the latest due reminder, never a burst
  return { action: "none" };
}
function markReminded(t, n) { t.reminders = n; return t; }
function markClosed(t, now) { t.status = "closed"; t.awaiting = false; t.closedAt = now; return t; }

module.exports = { H, REMIND_AFTER, CLOSE_AFTER, adminReplied, userReplied, due, markReminded, markClosed };
