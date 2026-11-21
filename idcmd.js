// Admin /id <telegram_user_id>: pure helpers (parsing, formatting). Only Telegram profile data via getChat plus non-sensitive stored usage stats.
const esc = (t) => String(t == null ? "" : t).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
function parseId(arg) {
  const s = String(arg == null ? "" : arg).trim();
  if (!/^\d{1,15}$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return String(n);
}
function format(id, chat, stored) {
  const L = ["🆔 <b>User " + esc(id) + "</b>"];
  if (chat) {
    const full = [chat.first_name, chat.last_name].filter(Boolean).join(" ");
    L.push("👤 Full name: " + (full ? esc(full) : "not set"));
    if (chat.first_name) L.push("   First: " + esc(chat.first_name));
    if (chat.last_name) L.push("   Last: " + esc(chat.last_name));
    const extra = (chat.active_usernames || []).filter((u) => u && u !== chat.username);
    L.push("🔗 Username: " + (chat.username ? "@" + esc(chat.username) : "not set") + (extra.length ? " (also " + extra.map((u) => "@" + esc(u)).join(", ") + ")" : ""));
    if (chat.bio) L.push("📝 Bio: " + esc(chat.bio));
    if (chat.is_premium) L.push("⭐ Telegram Premium: yes");
    if (chat.emoji_status_custom_emoji_id) L.push("😀 Has emoji status");
    if (chat.birthdate) L.push("🎂 Birthday: " + esc(chat.birthdate.day + "/" + chat.birthdate.month + (chat.birthdate.year ? "/" + chat.birthdate.year : "")));
    if (chat.business_intro && chat.business_intro.title) L.push("💼 Business intro: " + esc(chat.business_intro.title));
    if (chat.personal_chat && chat.personal_chat.username) L.push("📣 Personal channel: @" + esc(chat.personal_chat.username));
    L.push("🔗 Link: tg://user?id=" + esc(id));
  } else {
    L.push("⚠️ Telegram gave no profile for this ID (user never started the bot, blocked it, or ID is wrong).");
  }
  if (stored) {
    L.push("", "<b>In Zapt</b>");
    L.push("Joined: " + (stored.joined ? new Date(stored.joined).toISOString().slice(0, 10) : "unknown"));
    L.push("Downloads: " + (stored.downloads || 0) + " · " + (stored.premium ? "👑 premium" : "🆓 free") + " · lang " + esc(stored.lang || "not set"));
  } else {
    L.push("", "Not in Zapt's user list.");
  }
  L.push("", "ℹ️ Only public Telegram profile info the bot can see. Phone and email are never available to bots.");
  return L.join("\n");
}
module.exports = { parseId, format };
