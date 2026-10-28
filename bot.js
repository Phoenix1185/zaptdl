const TelegramBot = require("node-telegram-bot-api");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const t = require("./i18n");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("[zapt] BOT_TOKEN missing");
  process.exit(1);
}
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
const ANIM = path.join(__dirname, "brand", "zapt_animation.mp4");
const STORE = path.join(__dirname, "data.json");
const MAX_FREE_CONC = 3;
const MAX_PREMIUM_CONC = 10;
const TIMEOUT_MS = 15 * 60 * 1000;
const TIMEOUT_PREMIUM_MS = 60 * 60 * 1000;
const MAX_UPLOAD = 1900 * 1024 * 1024;
const LANGS = t.languages;
const URL_RE = /https?:\/\/[^\s<>"']+/i;

const bot = new TelegramBot(TOKEN, { polling: true, baseApiUrl: process.env.TELEGRAM_API_BASE || undefined });
bot.on("polling_error", (e) => console.error("[zapt] polling error:", e.code || "", e.message));

// ---------- storage ----------
let db = {};
try { db = JSON.parse(fs.readFileSync(STORE, "utf8")); } catch (e) { db = {}; }
db.users = db.users || {};
db.stats = db.stats || { downloads: 0, bytes: 0 };
db.tickets = db.tickets || [];
db.ticketCount = db.ticketCount || 0;
const save = () => {
  try { fs.writeFileSync(STORE, JSON.stringify(db)); } catch (e) { console.error("[zapt] save failed:", e.message); }
};
function user(id) {
  const k = String(id);
  if (!db.users[k]) db.users[k] = { joined: Date.now(), downloads: 0, premium: false, lang: null };
  return db.users[k];
}
const langOf = (id) => (db.users[String(id)] && db.users[String(id)].lang) || "en";
const T = (id, key, vars) => t(langOf(id), key, vars);
const isAdmin = (id) => ADMIN_IDS.includes(String(id));
function isPremium(id) {
  if (isAdmin(id)) return true;
  const u = user(id);
  if (u.premium_until && Date.now() > u.premium_until) { u.premium = false; u.premium_until = null; save(); return false; }
  return !!u.premium;
}
const PREMIUM_PLANS = { w: { stars: 150, ms: 7 * 86400000, label: "1 Week Premium" }, m: { stars: 300, ms: 30 * 86400000, label: "1 Month Premium" }, m3: { stars: 750, ms: 90 * 86400000, label: "3 Months Premium" } };

// ---------- helpers ----------
const fmtSize = (b) => (b >= 1e9 ? (b / 1e9).toFixed(2) + " GB" : b >= 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB");
const btn = (text, data, style) => { const b = { text, callback_data: data }; if (style) b.style = style; return b; };
function stripStyle(markup) {
  if (!markup || !markup.inline_keyboard) return markup;
  return { inline_keyboard: markup.inline_keyboard.map((r) => r.map((b) => { const { style, ...rest } = b; return rest; })) };
}
// Call a bot API method; if Telegram rejects the keyboard (e.g. the optional button style), retry without styles.
async function api(method, ...args) {
  try {
    return await bot[method](...args);
  } catch (e) {
    if (!/markup|keyboard|style|button/i.test(e.message || "")) throw e;
    const fixed = args.map((a) => (a && a.reply_markup ? { ...a, reply_markup: stripStyle(a.reply_markup) } : a));
    return bot[method](...fixed);
  }
}
const quiet = (p) => p.catch(() => {});

function langKeyboard() {
  const rows = [];
  for (let i = 0; i < LANGS.length; i += 3) rows.push(LANGS.slice(i, i + 3).map((l) => btn(l.flag + " " + l.name, "lang:" + l.code)));
  return { inline_keyboard: rows };
}
const PLAT_ICON = {
  "YouTube": '<tg-emoji emoji-id="5456489236393895850">😉</tg-emoji>',
  "Instagram": '<tg-emoji emoji-id="5454384461900689212">😅</tg-emoji>',
  "TikTok": '<tg-emoji emoji-id="5456282961999570188">😛</tg-emoji>',
  "TikTok Live": '<tg-emoji emoji-id="5456282961999570188">😛</tg-emoji>',
  "Twitch": '<tg-emoji emoji-id="5458456507509123565">🙂</tg-emoji>',
  "Facebook": '<tg-emoji emoji-id="5456624751202019469">😇</tg-emoji>',
  "X/Twitter": '<tg-emoji emoji-id="5379733618149046926">🤖</tg-emoji>',
  "Snapchat": '<tg-emoji emoji-id="5458534890662274618">😊</tg-emoji>',
  "SoundCloud": "🎵", "Vimeo": "🎬", "Reddit": "😅", "Dailymotion": "🌟",
};

function welcomeText(id) {
  return [
    "<b>" + T(id, "hi") + "</b>",
    "",
    "<b>" + T(id, "intro") + "</b>",
    "",
    ...t.PLATFORMS.map((p) => { const k = Object.keys(PLAT_ICON).find((k) => p.startsWith(k)); return "• " + (k ? PLAT_ICON[k] + " " : "") + "<b>" + esc(p) + "</b>"; }),
    "",
    "👇 " + T(id, "foot"),
  ].join("\n");
}
async function sendWelcome(chatId, id) {
  return api("sendMessage", chatId, welcomeText(id), { parse_mode: "HTML" });
}
const HELP_TEXT = [
  "📖 How it works",
  "",
  "Just send a link from a supported platform. That's it. The bot automatically downloads the media for you. Works in private chats and groups.",
  "",
  "🌍 Supported platforms",
  ...t.PLATFORMS.map((p) => "• " + p),
  "",
  "📁 Group features",
  "• Works in groups too: paste a link in the chat and the bot answers in that same chat.",
  "",
  "⚙️ Personal settings",
  "• /language change the language for your account",
  "",
  "⚡ Performance",
  "• HD downloads are free",
  "• Free: up to 2 downloads at once. Premium: up to 6.",
  "",
  "📊 Queue & help",
  "• /q live queue and server status",
  "• /support contact the developer",
  "",
  "💡 Drop a link and forget about it. The bot handles the rest.",
].join("\n");

// ---------- queue ----------
const jobs = new Map(); // jobId -> job
function persistJobs() {
  try {
    const live = [...jobs.values()].filter((j) => !j.cancelled && !j.done).map((j) => ({ id: j.id, chatId: j.chatId, userId: j.userId, url: j.url, quality: j.quality, premium: j.premium }));
    db.pending_jobs = live; save();
  } catch (e) {}
}
setInterval(persistJobs, 5000).unref();
async function resumePendingJobs() {
  const list = (db.pending_jobs || []).splice(0);
  db.pending_jobs = []; save();
  for (const p of list) {
    try {
      const job = { id: p.id, chatId: p.chatId, userId: p.userId, url: p.url, quality: p.quality, premium: p.premium, entry: null, holding: false, anim: null, cancelled: false, proc: null };
      jobs.set(job.id, job);
      await quiet(api("sendMessage", job.chatId, "🔄 server restart bin interrupt ur download — e don resume automatically ⚡"));
      runJob(job);
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) { console.error("[zapt] resume failed:", e.message); }
  }
  if (list.length) console.log("[zapt] resumed", list.length, "interrupted jobs");
}
const waitQ = []; // queued entries
let running = 0;
const limitFor = (premium) => (premium ? MAX_PREMIUM_CONC : MAX_FREE_CONC);

function acquire(job) {
  return new Promise((resolve) => {
    if (running < limitFor(job.premium)) {
      running++;
      job.holding = true;
      resolve(true);
    } else {
      const entry = { job, premium: job.premium, resolve };
      job.entry = entry;
      waitQ.push(entry);
    }
  });
}
function pump() {
  let moved = true;
  while (moved) {
    moved = false;
    let idx = waitQ.findIndex((e) => e.premium && running < MAX_PREMIUM_CONC);
    if (idx < 0) idx = waitQ.findIndex((e) => !e.premium && running < MAX_FREE_CONC);
    if (idx >= 0) {
      const [e] = waitQ.splice(idx, 1);
      e.job.entry = null;
      running++;
      e.job.holding = true;
      e.resolve(true);
      moved = true;
    }
  }
}
function releaseSlot(job) {
  if (!job.holding) return;
  job.holding = false;
  running--;
  pump();
}
function markDone(job) { job.done = true; }
const _origRelease = releaseSlot;
releaseSlot = function (job) { markDone(job); return _origRelease(job); };
function dropQueued(job) {
  if (!job.entry) return;
  const i = waitQ.indexOf(job.entry);
  if (i >= 0) waitQ.splice(i, 1);
  const e = job.entry;
  job.entry = null;
  e.resolve(false);
}

// ---------- queue card ----------
function serif(t) { return "<b>" + t + "</b>"; }
function _unusedSerif(t) {
  const B = "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙", b = "𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳", D = "𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗";
  return String(t).split("").map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return B[c - 65];
    if (c >= 97 && c <= 122) return b[c - 97];
    if (c >= 48 && c <= 57) return D[c - 48];
    return ch;
  }).join("");
}
function esc(t) { return String(t == null ? "" : t).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;"); }
let _netPrev = null;
function netSpeed() {
  try {
    const lines = fs.readFileSync("/proc/net/dev", "utf8").split("\n");
    let rx = 0, tx = 0;
    for (const l of lines) {
      if (!l.includes(":")) continue;
      const p = l.split(":")[1].trim().split(/\s+/);
      rx += parseInt(p[0], 10) || 0; tx += parseInt(p[8], 10) || 0;
    }
    const now = { rx: rx * 1024, tx: tx * 1024, t: Date.now() };
    if (!_netPrev) { _netPrev = now; return null; }
    const dt = (now.t - _netPrev.t) / 1000;
    if (dt < 1) return null;
    const sp = { down: (now.rx - _netPrev.rx) / dt, up: (now.tx - _netPrev.tx) / dt };
    _netPrev = now;
    return sp;
  } catch (e) { return null; }
}

function uptimeText(sec) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return (d ? d + "d " : "") + (h ? h + "h " : "") + m + "m";
}
function netIO() {
  try {
    const lines = fs.readFileSync("/proc/net/dev", "utf8").split("\n");
    let rx = 0, tx = 0;
    for (const l of lines) {
      if (!l.includes(":")) continue;
      const p = l.split(":")[1].trim().split(/\s+/);
      rx += parseInt(p[0], 10) || 0; tx += parseInt(p[8], 10) || 0;
    }
    return { rx: rx * 1024, tx: tx * 1024 };
  } catch (e) { return { rx: 0, tx: 0 }; }
}

function queueCard(id) {
  const sp = netSpeed();
  const mbps = (v) => (v >= 1e6 ? (v / 1e6).toFixed(0) + " Mbit/s" : Math.max(0, v / 1e3).toFixed(0) + " Kbit/s");
  const active = [...jobs.values()];
  const users = new Set(active.map((j) => j.userId)).size;
  const mine = active.filter((j) => j.userId === String(id)).length;
  const total = os.totalmem(), used = total - os.freemem();
  const load = os.loadavg()[0].toFixed(2);
  return [
    "<b>" + T(id, "q_title") + "</b>",
    "",
    T(id, "q_running", { r: running, m: MAX_PREMIUM_CONC }),
    T(id, "q_users", { u: users }),
    "",
    T(id, "q_you", { n: mine }),
    "",
    "🖥️ <b>Server status</b>",
    "<i>Main Zapt server</i>",
    "⚙️ CPU " + Math.min(100, Math.round((load / Math.max(1, os.cpus().length)) * 100)) + "%",
    "🧠 RAM " + Math.round((used / total) * 100) + "% (" + fmtSize(used) + " / " + fmtSize(total) + ")",
    "🌐 Network: " + (sp ? "\u2193 " + mbps(sp.down) + " · \u2191 " + mbps(sp.up) : "measuring..."),
    "⏱️ Uptime: " + uptimeText(os.uptime()),
    "",
    "👥 " + Object.keys(db.users).length.toLocaleString() + " monthly users",
  ].join("\n");
}
const queueKb = (id) => ({ inline_keyboard: [[btn(T(id, "refresh"), "qst:refresh"), btn(T(id, "close"), "qst:close")]] });

function premiumText(id) {
  return [
    T(id, "prem_title"),
    "",
    "• Priority processing",
    "• Skip the queue",
    "• Priority HD",
    "• Support development",
    "",
    T(id, "prem_select"),
    T(id, "prem_once"),
  ].join("\n");
}
const premiumKb = (id) => ({
  inline_keyboard: [
    [btn(T(id, "prem_w"), "prem:w")],
    [btn(T(id, "prem_m"), "prem:m")],
    [btn(T(id, "prem_3"), "prem:3")],
    [btn(T(id, "cancel"), "prem:close", "danger")],
  ],
});

// ---------- support ----------
const pausedAll = { v: false };
const pausedPlatforms = new Set();
function isPausedFor(url) { return pausedAll.v || pausedPlatforms.has(platformOf(url)); }
const bcPending = new Map();
const supportPending = new Set(); // "chatId:userId"
const pendingLinks = new Map(); // key -> { url, userId, chatId }
const newKey = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

// ---------- commands ----------
async function broadcastAll(msg, bc) {
  const targets = Object.keys(db.users);
  let anim = null;
  try { anim = await api("sendAnimation", bc.chatId, ANIM, { caption: "📡 Broadcasting to " + targets.length + " users...", reply_markup: { inline_keyboard: [] } }); } catch (e) {}
  let okN = 0, blocked = 0, failed = 0;
  const up = async (n) => { if (anim && n % 25 === 0) { try { await api("editMessageCaption", "📡 Broadcasting...\n\n✅ " + okN + " delivered · 🚫 " + blocked + " blocked", { chat_id: bc.chatId, message_id: anim.message_id, parse_mode: "HTML" }); } catch (e) {} } };
  for (const uid of targets) {
    try {
      const sent = await bot.copyMessage(uid, msg.chat.id, msg.message_id);
      okN++;
      if (bc.pin && sent && sent.message_id) { try { await api("pinChatMessage", uid, sent.message_id); } catch (e) {} }
    } catch (e) {
      const d = String(e.message || "");
      if (/blocked|kicked|deactivated|not found/i.test(d)) blocked++; else failed++;
    }
    if (okN % 5 === 0) await new Promise((r) => setTimeout(r, 300)); // gentle rate limit
    await up(okN);
  }
  await dropAnim({ anim });
  await api("sendMessage", bc.chatId, "📡 <b>Broadcast complete</b>\n\n✅ Delivered: " + okN + "\n🚫 Blocked: " + blocked + (failed ? "\n❌ Failed: " + failed : ""), { parse_mode: "HTML" });
}

const CMD_DELETE = new Set(["start", "help", "about", "language", "lang", "q", "stats", "premium", "support", "privacy", "cancel"]);
const delLater = (chatId, msgId, sec) => setTimeout(() => { quiet(bot.deleteMessage(chatId, msgId)); }, (sec || 15) * 1000).unref();
async function command(msg, cmd, arg) {
  if (CMD_DELETE.has(cmd)) {
    delLater(msg.chat.id, msg.message_id, 10); // delete the user's command msg
    const r = await commandInner(msg, cmd, arg);
    if (r && r.message_id) delLater(msg.chat.id, r.message_id, 25); // delete bot reply after 25s
    return r;
  }
  return commandInner(msg, cmd, arg);
}
async function commandInner(msg, cmd, arg) {
  const uid = msg.from.id, chatId = msg.chat.id, skey = chatId + ":" + uid;
  switch (cmd) {
    case "start": {
      const u = user(uid); save();
      if (!u.lang) return api("sendMessage", chatId, t("en", "pick"), { reply_markup: langKeyboard() });
      try { await api("sendAnimation", chatId, ANIM, { caption: aboutLong(uid), parse_mode: "HTML" }); } catch (e) {}
      return sendWelcome(chatId, uid);
    }
    case "language":
    case "lang":
      user(uid); save();
      return api("sendMessage", chatId, T(uid, "pick"), { reply_markup: langKeyboard() });
    case "privacy":
      return api("sendMessage", chatId, privacyText(uid), { parse_mode: "HTML" });
        case "pause": {
      if (!isAdmin(uid)) return api("sendMessage", chatId, "admin only 🚫");
      const plat = (arg || "").trim().toLowerCase();
      if (!plat || plat === "all") { pausedAll.v = true; return api("sendMessage", chatId, "⏸ ALL downloads paused. new links go dey rejected until /resume."); }
      pausedPlatforms.add(plat);
      return api("sendMessage", chatId, "⏸ downloads from " + plat.toUpperCase() + " paused. /resume " + plat + " to undo.");
    }
    case "resume": {
      if (!isAdmin(uid)) return api("sendMessage", chatId, "admin only 🚫");
      const plat = (arg || "").trim().toLowerCase();
      if (!plat || plat === "all") { pausedAll.v = false; pausedPlatforms.clear(); return api("sendMessage", chatId, "▶️ everything resumed."); }
      pausedPlatforms.delete(plat);
      return api("sendMessage", chatId, "▶️ " + plat.toUpperCase() + " resumed.");
    }
    case "broadcast":
    case "broadcastpin": {
      if (!isAdmin(uid)) return api("sendMessage", chatId, "admin only 🚫");
      bcPending.set(String(uid), { chatId, pin: cmd === "broadcastpin" });
      return api("sendMessage", chatId, "📡 send the message to broadcast now (text, photo, video or forward).\n" + (cmd === "broadcastpin" ? "📌 e go pin for every chat wey i fit pin." : "") + "\n\nsend /broadcastcancel to abort.");
    }
    case "broadcastcancel": {
      if (!isAdmin(uid)) return api("sendMessage", chatId, "admin only 🚫");
      bcPending.delete(String(uid));
      return api("sendMessage", chatId, "🚫 broadcast cancelled");
    }
    case "jobs": {
      if (!isAdmin(uid)) return api("sendMessage", chatId, "admin only 🚫");
      const live = [...jobs.values()].filter((j) => !j.done);
      const txt = live.length ? live.map((j, i) => (i + 1) + ". " + platformOf(j.url) + " · " + j.quality.toUpperCase() + " · " + (j.premium ? "👑" : "🆓") + " · " + (j.progress || 0) + "%").join("\n") : "no active jobs";
      return api("sendMessage", chatId, "🧾 <b>Active jobs (" + live.length + ")</b>\n\n" + txt, { parse_mode: "HTML" });
    }
    case "flush": {
      if (!isAdmin(uid)) return api("sendMessage", chatId, "admin only 🚫");
      const live = [...jobs.values()].filter((j) => !j.done);
      for (const j of live) cancelJob(j);
      return api("sendMessage", chatId, "🧹 flushed " + live.length + " active job(s)");
    }
    case "about":
      try {
        await api("sendAnimation", chatId, ANIM, { caption: aboutLong(uid), parse_mode: "HTML" });
      } catch (e) { return api("sendMessage", chatId, aboutLong(uid), { parse_mode: "HTML" }); }
      return;
    case "help":
      return api("sendMessage", chatId, HELP_TEXT, { reply_markup: { inline_keyboard: [[btn(T(uid, "close"), "help:close")]] } });
    case "q":
    case "stats": {
      const r = await api("sendMessage", chatId, queueCard(uid), { reply_markup: queueKb(uid), parse_mode: "HTML" });
      setTimeout(() => { quiet(bot.deleteMessage(chatId, r.message_id)); }, 10000);
      return r;
    }
    case "premium":
      return api("sendMessage", chatId, premiumText(uid), { reply_markup: premiumKb(uid) });
    case "support": {
      if (arg.toLowerCase() === "cancel") {
        supportPending.delete(skey);
        return api("sendMessage", chatId, T(uid, "sup_cancelled"));
      }
      supportPending.add(skey);
      return api("sendMessage", chatId, T(uid, "sup_prompt"), { reply_markup: { inline_keyboard: [[btn(T(uid, "cancel"), "sup:cancel", "danger")]] } });
    }
    case "cancel": {
      const mine = [...jobs.values()].filter((j) => j.userId === String(uid) && j.chatId === chatId);
      if (!mine.length) return api("sendMessage", chatId, T(uid, "nojob"));
      cancelJob(mine[mine.length - 1]);
      return;
    }
    default:
      return;
  }
}

function cancelJob(job) {
  job.cancelled = true;
  if (job.proc) { try { job.proc.kill("SIGKILL"); } catch (e) {} }
  dropQueued(job);
}

async function forwardTicket(msg) {
  const chatId = msg.chat.id, uid = msg.from.id, skey = chatId + ":" + uid;
  db.ticketCount++;
  const id = db.ticketCount;
  let delivered = 0;
  for (const admin of ADMIN_IDS) {
    try {
      await bot.forwardMessage(admin, chatId, msg.message_id);
      const who = msg.from.username ? "@" + msg.from.username : (msg.from.first_name || "user");
      await bot.sendMessage(admin, "🎫 Support ticket #" + id + "\nFrom: " + who + " (id " + uid + ")\n\nReply to THIS message (or the forwarded one) to answer the user.");
      delivered++;
    } catch (e) { console.error("[zapt] ticket forward failed:", e.message); }
  }
  if (!delivered) {
    db.ticketCount--; save();
    return api("sendMessage", chatId, T(uid, "sup_fail"));
  }
  supportPending.delete(skey);
  db.tickets.push({ id, user: String(uid), chat: String(chatId), at: Date.now() });
  save();
  return api("sendMessage", chatId, T(uid, "sup_sent", { id }));
}

function askQuality(msg, url) {
  const key = newKey();
  pendingLinks.set(key, { url, userId: String(msg.from.id), chatId: msg.chat.id });
  setTimeout(() => pendingLinks.delete(key), 30 * 60 * 1000).unref();
  return api("sendMessage", msg.chat.id, T(msg.from.id, "quality"), {
    
    reply_markup: isPremium(msg.from.id)
      ? { inline_keyboard: [[btn("SD · ⚡", "dl:sd:" + key), btn("HD · 🔥", "dl:hd:" + key), btn("4K · 👑", "dl:4k:" + key)]] }
      : { inline_keyboard: [[btn("SD · ⚡", "dl:sd:" + key), btn("HD · 🔥", "dl:hd:" + key)]] },
  });
}

// ---------- bot profile (About) ----------
const ABOUT_I18N = require("./i18n_about.js");
const ABOUT_SHORT_EN = "Download videos, music and more from 1000+ sites. Fast, free, HD.";
function aboutLong(uid) { const d = ABOUT_I18N[langOf(uid)] || ABOUT_I18N.en; return d.about_long; }
function aboutShort(uid) { const d = ABOUT_I18N[langOf(uid)] || ABOUT_I18N.en; return d.about_short; }
function privacyText(uid) { const d = ABOUT_I18N[langOf(uid)] || ABOUT_I18N.en; return d.privacy; }

async function setupProfile() {
  try { await quiet(api("setMyShortDescription", null, ABOUT_I18N.en.about_short)); } catch (e) {}
  try { await quiet(api("setMyDescription", null, ABOUT_I18N.en.about_long)); } catch (e) {}
}

bot.on("message", async (msg) => {
  try {
    const ce = (msg.entities || []).concat(msg.caption_entities || []).filter((e) => e.type === "custom_emoji");
    if (ce.length) {
      const txt = msg.text || msg.caption || "";
      const lines = ce.map((e) => JSON.stringify({ text: txt.slice(e.offset, e.offset + e.length), id: e.custom_emoji_id }));
      fs.appendFileSync(path.join(__dirname, "emoji_harvest.log"), lines.join("\n") + "\n", "utf8");
    }
    if (!msg.from) return;
    const text = msg.text || "";
    const m = text.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
    if (m) return command(msg, m[1].toLowerCase(), (m[2] || "").trim());
    // BROADCAST CAPTURE: admin in bcPending sends content -> ship to all users
    if (bcPending.has(String(msg.from.id))) {
      const bc = bcPending.get(String(msg.from.id)); bcPending.delete(String(msg.from.id));
      broadcastAll(msg, bc).catch((e) => console.error("[zapt] broadcast:", e.message));
      return;
    }
    // ADMIN REPLY: admin replies to the forwarded ticket in his own chat -> lands back to the user
    if (msg.reply_to_message && ADMIN_IDS.includes(String(msg.from.id)) && msg.reply_to_message.forward_from) {
      const targetUser = msg.reply_to_message.forward_from.id;
      try {
        await api("sendMessage", targetUser, "💬 <b>Support reply:</b>\n\n" + esc(String(text)).slice(0, 3000), { parse_mode: "HTML" });
        return quiet(api("sendMessage", chatId, "✅ delivered to the user"));
      } catch (e) {
        return quiet(api("sendMessage", chatId, "😭 couldn't reach that user: " + e.message));
      }
    }
    if (supportPending.has(msg.chat.id + ":" + msg.from.id)) return forwardTicket(msg);
    if (capPending.has(String(msg.from.id))) {
      const rec = capPending.get(String(msg.from.id)); capPending.delete(String(msg.from.id));
      try {
        await quiet(api("editMessageMedia", null, { chat_id: rec.chatId, message_id: rec.msgId, media: { type: "video", media: rec.fileId, caption: esc(String(text || "")).slice(0, 1024) }, parse_mode: "HTML" }));
        await quiet(api("sendMessage", rec.chatId, "✅ caption updated"));
      } catch (e) { await quiet(api("sendMessage", rec.chatId, "😭 couldn't update caption: " + e.message)); }
      return;
    }
    const u = text.match(URL_RE);
    if (u) {
      // vanish the user's previous delivered video in this chat (keep only latest)
      const key = msg.chat.id + ":" + msg.from.id;
      const old = sentVideos.get(key);
      if (old && old.chatId === msg.chat.id) { quiet(bot.deleteMessage(old.chatId, old.msgId)); sentVideos.delete(key); }
      // also clean the quality prompt of the previous link
      return askQuality(msg, u[0]);
    }
  } catch (e) {
    console.error("[zapt] message error:", e.message);
  }
});

// ---------- download pipeline ----------
const cancelKb = (job) => ({ inline_keyboard: [[btn(T(job.userId, "cancel"), "cx:" + job.id, "danger")]] });
const editCap = (job, text, markup) => quiet(api("editMessageCaption", text, {
  chat_id: job.chatId, message_id: job.anim.message_id, reply_markup: markup || { inline_keyboard: [] }, parse_mode: "HTML",
}));
async function dropAnim(job) {
  if (job.anim) { const id = job.anim.message_id; job.anim = null; await quiet(bot.deleteMessage(job.chatId, id)); }
}
function cleanupFiles(job) {
  try {
    const tmp = os.tmpdir();
    for (const f of fs.readdirSync(tmp)) if (f.startsWith("zapt_" + job.id)) fs.unlink(path.join(tmp, f), () => {});
  } catch (e) {}
}
function platformOf(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    const map = { "instagram.com":"instagram", "instagr.am":"instagram", "youtube.com":"youtube", "youtu.be":"youtube", "tiktok.com":"tiktok", "x.com":"x", "twitter.com":"x", "facebook.com":"facebook", "fb.watch":"facebook", "pinterest.com":"pinterest", "reddit.com":"reddit", "vimeo.com":"vimeo", "soundcloud.com":"soundcloud", "twitch.tv":"twitch" };
    return map[h] || h.split(".")[0];
  } catch (e) { return "media"; }
}

function dlStatus(uid, job) {
  const line = T(uid, "dl", { q: job.quality.toUpperCase() });
  if (langOf(uid) !== "en") return line + "\n\ud83c\udf10 " + platformOf(job.url);
  return line.replace("Downloading in", "Downloading " + platformOf(job.url) + " content in");
}

function readMeta(job) {
  const rd = (suffix) => { try { return fs.readFileSync(path.join(os.tmpdir(), "zapt_" + job.id + suffix), "utf8").trim(); } catch (e) { return ""; } };
  return { title: rd("_title.txt"), uploader: rd("_uploader.txt"), desc: rd("_desc.txt"), date: rd("_date.txt") };
}
function richCaption(job, meta, size) {
  const lines = [];
  if (meta.desc) {
    const d = meta.desc.length > 300 ? meta.desc.slice(0, 297) + "..." : meta.desc;
    lines.push(esc(d));
    lines.push("");
  }
  if (meta.uploader) { const pn = platformOf(job.url); lines.push("\ud83d\udcf1 " + pn.charAt(0).toUpperCase() + pn.slice(1) + " Profile: " + esc(meta.uploader)); }
  if (meta.date) lines.push("<i>" + meta.date + "</i>");
  lines.push(esc(job.url));
  const qline = job.deliveredQ === "4k" ? "⚡ 4K · " + fmtSize(size) : job.deliveredQ === "sd" ? "⚡ SD (480p) · " + fmtSize(size) : "⚡ HD · " + fmtSize(size);
  lines.push(qline);
  return lines.join("\n").slice(0, 1024);
}

const sentVideos = new Map();
const capPending = new Map(); // uid -> {chatId,msgId,fileId}
const editCapKb = (id) => ({ inline_keyboard: [[btn("✏️ Edit Caption", "cap:" + id, "ok")]] });

function runYtdlp(job) {
  const base = path.join(os.tmpdir(), "zapt_" + job.id);
  const fmt = job.quality === "4k"
    ? "bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best"
    : job.quality === "hd"
    ? "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    : "best[height<=480][ext=mp4]/best[height<=480]/worst[ext=mp4]/worst";
  const args = ["-f", fmt, "--merge-output-format", "mp4", "--no-playlist", "--newline", "--no-warnings", "--concurrent-fragments", "8", "--cookies", path.join(__dirname, "yt.cookies.txt"),
    "--print-to-file", "%(title)s", base + "_title.txt",
    "--print-to-file", "%(uploader)s", base + "_uploader.txt",
    "--print-to-file", "%(description)s", base + "_desc.txt",
    "--print-to-file", "%(upload_date>%Y.%m.%d)s", base + "_date.txt",
    "-o", base + ".%(ext)s", job.url];
  return new Promise((resolve) => {
    let stderr = "";
    let proc;
    const ytdlpBin = /youtube\.com|youtu\.be/.test(job.url) ? "yt-dlp-remote" : "yt-dlp";
    try { proc = spawn(ytdlpBin, args); } catch (e) { job.error = e.message; return resolve(); }
    job.proc = proc;
    const timer = setTimeout(() => { job.timedOut = true; try { proc.kill("SIGKILL"); } catch (e) {} }, job.premium ? TIMEOUT_PREMIUM_MS : TIMEOUT_MS);
    proc.stderr.on("data", (d) => {
      stderr = (stderr + d).slice(-2000);
      const mm = d.toString().match(/\[download\]\s+(\d{1,3}(?:\.\d)?)%/);
      if (mm) job.progress = Math.min(100, Math.round(parseFloat(mm[1])));
    });
    proc.on("error", (e) => { job.error = e.message; });
    proc.on("close", (code) => {
      clearTimeout(timer);
      job.proc = null;
      job.code = code;
      job.stderr = stderr;
      resolve();
    });
    proc.stdout.on("data", (d) => {
      const hm = d.toString().match(/(\d{3,4})x(\d{3,4})/);
      if (hm && !job.dlHeight) job.dlHeight = hm[2];
    });
  });
}

async function runJob(job) {
  const uid = job.userId, chatId = job.chatId;
  const ready = acquire(job); // sets job.entry synchronously when it has to wait
  const queuedNow = !!job.entry;
  const pos = queuedNow ? waitQ.indexOf(job.entry) + 1 : 0;
  try {
    // Brand animation is the status message; caption is edited in place. Cancel button kills yt-dlp.
    job.anim = await api("sendAnimation", chatId, ANIM, {
      caption: queuedNow ? T(uid, "queued", { p: pos }) : dlStatus(uid, job),
      reply_markup: cancelKb(job),
    });
    const got = await ready;
    if (!got || job.cancelled) {
      await dropAnim(job);
      await api("sendMessage", chatId, T(uid, "cancelled"));
      return;
    }
    if (queuedNow) await editCap(job, dlStatus(uid, job), cancelKb(job));

    job.progress = 0;
    let lastP = -1;
    const tick = setInterval(() => {
      if (job.cancelled || !job.anim || !job.anim.message_id) { clearInterval(tick); return; }
      const pr = job.progress || 0;
      if (pr !== lastP && pr > 0) {
        lastP = pr;
        const filled = Math.round(pr / 10);
        const bar = "\u25A9".repeat(filled) + "\u25AF".repeat(10 - filled);
        const cap = dlStatus(uid, job) + "\n\n" + bar + " " + pr + "%";
        quiet(api("editMessageCaption", cap, { chat_id: job.chatId, message_id: job.anim.message_id, reply_markup: cancelKb(job.id), parse_mode: "HTML" }));
      }
    }, 3000);
    job.progressTimer = tick;

    await runYtdlp(job);
    clearInterval(tick);

    if (job.cancelled) {
      await dropAnim(job);
      await api("sendMessage", chatId, T(uid, "cancelled"));
      return;
    }
    const base = "zapt_" + job.id;
    const tmp = os.tmpdir();
    const media = fs.readdirSync(tmp).filter((f) => f.startsWith(base + ".") && !/\.(part|ytdl|txt)$/.test(f));
    if (job.timedOut || job.error || job.code !== 0 || !media.length) {
      await dropAnim(job);
      const why = job.timedOut ? "timed out" : job.error || (job.stderr || "").trim().split("\n").slice(-1)[0] || "";
      await api("sendMessage", chatId, media.length || job.code === 0 ? T(uid, "nofile") : T(uid, "fail", { e: why.slice(-200) }));
      return;
    }
    let file = path.join(tmp, media[0]);
    let size = fs.statSync(file).size;
    if (job.quality === "hd") job.deliveredQ = "hd";
    // SD promise: if the source only had one format, yt-dlp ignores the height filter.
    // force it: any video over 480p gets re-encoded down when SD was picked.
    if (job.quality === "sd" && !job.timedOut && !job.error) {
      try {
        const probe = spawn("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height", "-of", "csv=p=0", file]);
        let h = "";
        probe.stdout.on("data", (d) => { h += d; });
        const height = await new Promise((res) => { probe.on("close", () => res(parseInt(h.trim(), 10) || 0)); setTimeout(() => res(0), 10000); });
        if (height > 480) {
          await editCap(job, "\u2699\uFE0F Optimizing to SD (480p)...", null);
          const out = file.replace(/\.\w+$/, "") + "_sd.mp4";
          await new Promise((res) => {
            const enc = spawn("ffmpeg", ["-y", "-i", file, "-vf", "scale=-2:min(480\,ih)", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-c:a", "copy", out]);
            enc.on("close", res); enc.on("error", () => res(1));
          });
          if (fs.existsSync(out)) { try { fs.unlinkSync(file); } catch (e) {} file = out; size = fs.statSync(file).size; job.deliveredQ = "sd"; console.log("[zapt] sd downscale done:", job.id); }
          else console.log("[zapt] sd downscale FAILED, keeping original:", job.id);
        }
      } catch (e) { console.error("[zapt] sd downscale:", e.message); }
    }
    await editCap(job, T(uid, "prep", { s: fmtSize(size) }), null);
    const capNow = job.premium ? 2000 * 1024 * 1024 : MAX_UPLOAD;
    if (size > capNow) {
      if (job.premium) await api("sendMessage", chatId, "📦 file too big even for premium (" + fmtSize(size) + "). 2GB na di Telegram ceiling.");
      await dropAnim(job);
      await api("sendMessage", chatId, T(uid, "big", { s: fmtSize(size) }));
      return;
    }
    try {
      const shortName = media[0].length > 28 ? media[0].slice(0, 25) + "..." : media[0];
      await editCap(job, "📤 Uploading " + shortName + " to Telegram...", null);
      const sent = await api("sendVideo", chatId, file, { caption: richCaption(job, readMeta(job), size), supports_streaming: true, reply_markup: stripStyle(editCapKb(job.id)), parse_mode: "HTML" });
      try { if (sent && sent.video && sent.video.file_id) {
        sentVideos.set(chatId + ":" + uid, { chatId, msgId: sent.message_id, fileId: sent.video.file_id });
        quiet(bot.deleteMessage(msg.chat.id, msg.message_id));
      } } catch (e) {}
      db.stats.downloads++; db.stats.bytes += size; user(uid).downloads++; save();
      await dropAnim(job);
    } catch (e) {
      await dropAnim(job);
      await api("sendMessage", chatId, T(uid, "upfail", { e: e.message }));
    }
  } catch (e) {
    console.error("[zapt] job error:", e.message);
    await dropAnim(job);
  } finally {
    dropQueued(job);
    releaseSlot(job);
    jobs.delete(job.id);
    cleanupFiles(job);
  }
}

// ---------- callbacks ----------
setupProfile();
setTimeout(resumePendingJobs, 3000);

bot.on("callback_query", async (cb) => {
  const data = cb.data || "";
  const msg = cb.message;
  const uid = String(cb.from.id);
  const answer = (text, alert) => quiet(bot.answerCallbackQuery(cb.id, { text, show_alert: !!alert }));
  try {
    if (data.startsWith("cap:")) {
        const rec = sentVideos.get(data.slice(4) + ":" + uid);
        if (!rec) return answer("no recent download found");
        capPending.set(uid, rec);
        await quiet(api("sendMessage", rec.chatId, "✏️ send the new caption now — your next message go replace am"));
        return answer();
      }
      if (data.startsWith("lang:")) {
      const code = data.slice(5);
      if (!t.isLang(code)) return answer();
      user(uid).lang = code; save();
      const l = LANGS.find((x) => x.code === code);
      await quiet(bot.editMessageText(t(code, "set", { flag: l.flag, name: l.name }), { chat_id: msg.chat.id, message_id: msg.message_id }));
      await answer();
      return sendWelcome(msg.chat.id, uid);
    }
    if (data === "help:close") { await answer(); return quiet(bot.deleteMessage(msg.chat.id, msg.message_id)); }
    if (data === "qst:refresh") {
      await quiet(bot.editMessageText(queueCard(uid), { chat_id: msg.chat.id, message_id: msg.message_id, reply_markup: queueKb(uid) , parse_mode: "HTML" }));
      return answer(T(uid, "refresh"));
    }
    if (data === "qst:close") { await answer(); return quiet(bot.deleteMessage(msg.chat.id, msg.message_id)); }
    if (data.startsWith("prem:")) {
      if (data === "prem:close") { await answer(); return quiet(bot.deleteMessage(msg.chat.id, msg.message_id)); }
      const plan = PREMIUM_PLANS[data.slice(5)];
      if (!plan) return answer(T(uid, "prem_soon"), true);
      await answer();
      return api("sendInvoice", msg.chat.id, {
        title: plan.label,
        description: "Skip the queue, priority downloads, faster limits.",
        payload: "prem:" + data.slice(5) + ":" + uid,
        currency: "XTR",
        prices: [{ label: plan.label, amount: plan.stars }],
        
      });
    }
    if (data === "sup:cancel") {
      supportPending.delete(msg.chat.id + ":" + uid);
      await answer(T(uid, "sup_cancelled"));
      return quiet(bot.deleteMessage(msg.chat.id, msg.message_id));
    }
    if (data.startsWith("dl:")) {
      const [, quality, key] = data.split(":");
      const link = pendingLinks.get(key);
      if (!link) return answer(T(uid, "expired"), true);
      if (link.userId !== uid) return answer();
      pendingLinks.delete(key);
      await answer();
      quiet(bot.deleteMessage(msg.chat.id, msg.message_id));
      if (!isPremium(uid)) {
        const mine = [...jobs.values()].filter((j) => j.userId === uid && !j.done && (j.holding || j.entry) && !j.cancelled);
        if (mine.length >= 2) {
          await quiet(bot.deleteMessage(link.chatId, msg.message_id).catch(() => {}));
          return answer("⛔ you already have 2 downloads running or in queue. wait for one to finish, then try again.", true);
        }
      }
      if (quality === "4k" && !isPremium(uid)) return answer("👑 4K downloads na Premium thing. tap /premium to unlock.", true);
      if (isPausedFor(link.url)) return answer("⏸ downloads dey paused by admin right now. try again small time.", true);
      const job = { id: newKey(), chatId: link.chatId, userId: uid, url: link.url, quality: quality, premium: isPremium(uid), entry: null, holding: false, anim: null, cancelled: false, proc: null };
      jobs.set(job.id, job);
      return runJob(job);
    }
    if (data.startsWith("cx:")) {
      const job = jobs.get(data.slice(3));
      if (!job) return answer(T(uid, "nojob"));
      if (job.userId !== uid && !isAdmin(uid)) return answer();
      cancelJob(job);
      return answer(T(uid, "cancelled"));
    }
    return answer();
  } catch (e) {
    console.error("[zapt] callback error:", e.message);
    return answer();
  }
});

bot.on("pre_checkout_query", (q) => bot.answerPreCheckoutQuery(q.id, true));

bot.on("successful_payment", async (sp) => {
  try {
    const uid = String(sp.from.id);
    const parts = String(sp.invoice_payload || "").split(":");
    if (parts[0] !== "prem") return;
    const plan = PREMIUM_PLANS[parts[1]];
    const u = user(uid);
    const base = u.premium_until && u.premium_until > Date.now() ? u.premium_until : Date.now();
    u.premium = true;
    u.premium_until = base + (plan ? plan.ms : 7 * 86400000);
    save();
    await quiet(api("sendMessage", sp.chat.id,
      "👑 <b>Payment received!</b> " + (plan ? plan.stars : sp.total_amount) + " ⭐\n\nPremium is active until <b>" + new Date(u.premium_until).toISOString().slice(0, 10) + "</b>.\n\nSkip the queue and enjoy ⚡",
      { parse_mode: "HTML" }));
  } catch (e) { console.error("[zapt] payment error:", e.message); }
});

// ---------- startup ----------
quiet(bot.setMyCommands([
  { command: "start", description: "⚡ Launch Zapt" },
  { command: "help", description: "📖 How it works" },
  { command: "about", description: "✨ About Zapt" },
  { command: "language", description: "🌍 Change language" },
  { command: "q", description: "📊 Queue status" },
  { command: "premium", description: "👑 Zapt Premium" },
  { command: "support", description: "🛠 Contact the developer" },
  { command: "privacy", description: "🔒 Privacy policy" },
  { command: "cancel", description: "🚫 Cancel your download" },
]));
for (const adminId of ADMIN_IDS) {
  quiet(bot.setMyCommands([
    { command: "jobs", description: "🧾 Active downloads" },
    { command: "flush", description: "🧹 Cancel all downloads" },
    { command: "broadcast", description: "📡 Broadcast to all users" },
    { command: "broadcastpin", description: "📌 Broadcast + pin" },
    { command: "pause", description: "⏸ Pause downloads (all or platform)" },
    { command: "resume", description: "▶️ Resume downloads" },
  ], { scope: { type: "chat", chat_id: Number(adminId) } }));
}
console.log("[zapt] bot up");
