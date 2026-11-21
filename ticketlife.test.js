const assert = require("assert"); const L = require("./ticketlife.js"); const H = L.H;
const t = { id: 1, status: "open", awaiting: false };
assert.equal(L.due(t, 0).action, "none");            // no admin reply yet
L.adminReplied(t, 0);
assert.equal(L.due(t, 2 * H - 1).action, "none");     // just before 2h
let d = L.due(t, 2 * H); assert.deepEqual(d, { action: "remind", n: 1 }); L.markReminded(t, 1);
assert.equal(L.due(t, 3 * H).action, "none");         // no repeat
assert.equal(L.due(t, 4 * H).n, 2); L.markReminded(t, 2);
assert.equal(L.due(t, 6 * H).n, 3); L.markReminded(t, 3);
assert.equal(L.due(t, 7 * H - 1).action, "none");     // 1ms before close
assert.equal(L.due(t, 7 * H).action, "close");        // boundary
// restart after long downtime: skips reminders, closes directly
const r = JSON.parse(JSON.stringify({ id: 2, status: "open", awaiting: true, adminAt: 0, reminders: 0 }));
assert.equal(L.due(r, 20 * H).action, "close");
// downtime mid-window: only the latest reminder, once
const r2 = { id: 3, status: "open", awaiting: true, adminAt: 0, reminders: 0 };
assert.deepEqual(L.due(r2, 5 * H), { action: "remind", n: 2 }); L.markReminded(r2, 2); assert.equal(L.due(r2, 5 * H).action, "none");
// new admin reply resets the window
L.adminReplied(t, 5 * H); assert.equal(t.reminders, 0); assert.equal(L.due(t, 11 * H).action, "remind"); assert.equal(L.due(t, 12 * H).action, "close");
// user replies: stops everything until admin replies again
L.userReplied(t, 6 * H); assert.equal(L.due(t, 100 * H).action, "none");
L.adminReplied(t, 100 * H); assert.equal(L.due(t, 107 * H).action, "close");
// closed stays closed; user follow-up reopens; admin reply to a closed ticket reopens
L.markClosed(t, 107 * H); assert.equal(L.due(t, 200 * H).action, "none");
assert.equal(L.userReplied(t, 201 * H), true); assert.equal(t.status, "open"); assert.equal(L.due(t, 300 * H).action, "none");
L.markClosed(t, 1); L.adminReplied(t, 2); assert.equal(t.status, "open");
// legacy tickets (no fields) are never touched
assert.equal(L.due({ id: 9, user: "1", at: 1 }, 999 * H).action, "none");
// persistence: JSON round trip keeps the deadline
const p = JSON.parse(JSON.stringify(L.adminReplied({ id: 4 }, 1000))); assert.equal(L.due(p, 1000 + 7 * H).action, "close");
console.log("ticketlife tests ok");
