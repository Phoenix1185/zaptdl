// Zapt broadcast translation (free Google gtx endpoint: unofficial, rate-limited).
// Every failure resolves to null so the caller falls back to the original message.
const https = require("https");

const SEP = "━━━━━━━━━━━━━━━━━━";
const GCODE = { zh: "zh-CN", he: "iw" };
const TERMS = ["yt-dlp", "ffmpeg", "Zapt", "TikTok", "YouTube", "Instagram", "Telegram", "Twitter", "Facebook", "Snapchat", "SoundCloud", "Vimeo", "Reddit", "Twitch", "Dailymotion", "Premium", "MP4", "MP3", "HD", "SD", "4K", "MiB", "GiB", "MB", "GB", "URL", "API", "PM2"];

// Swap protected spans for tokens Google leaves alone; restore() puts them back.
function protect(text) {
  const spans = [];
  const stash = (m) => { spans.push(m); return "QX" + (spans.length - 1) + "XQ"; };
  let s = String(text);
  s = s.replace(/(?:https?:\/\/|\bt\.me\/|\bwww\.)[^\s<>]*[^\s<>.,;:!?)\]]/gi, stash);
  s = s.replace(/(^|[\s(])(\/[a-zA-Z_][a-zA-Z0-9_]*)/g, (m, a, b) => a + stash(b));
  s = s.replace(/(^|[^\w])(@[a-zA-Z0-9_]{3,})/g, (m, a, b) => a + stash(b));
  const termRe = new RegExp("(^|[^A-Za-z0-9])(" + TERMS.map((x) => x.replace(/[-.]/g, "\\$&")).join("|") + ")(?![A-Za-z0-9])", "g");
  s = s.replace(termRe, (m, a, b) => a + stash(b));
  s = s.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, stash);
  return { text: s, spans };
}
function restore(text, spans) {
  for (let i = 0; i < spans.length; i++) if (!new RegExp("QX\\s*" + i + "\\s*XQ", "i").test(text)) return null; // dropped token
  let ok = true;
  const out = String(text).replace(/QX\s*(\d+)\s*XQ/gi, (m, i) => (spans[+i] !== undefined ? spans[+i] : (ok = false, m)));
  return ok ? out : null;
}

function gtx(text, lang, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const body = "q=" + encodeURIComponent(text);
    const req = https.request({
      hostname: "translate.googleapis.com",
      path: "/translate_a/single?client=gtx&sl=en&tl=" + encodeURIComponent(GCODE[lang] || lang) + "&dt=t",
      method: "POST", timeout: timeoutMs,
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body), "User-Agent": "Mozilla/5.0" },
    }, (res) => {
      let d = ""; res.on("data", (c) => (d += c));
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error("gtx http " + res.statusCode));
        try { resolve(JSON.parse(d)[0].map((x) => x[0]).join("")); } catch (e) { reject(new Error("gtx bad response")); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("gtx timeout")));
    req.on("error", reject);
    req.end(body);
  });
}

// Translate one text, protecting spans. Returns string or null.
async function translateText(text, lang, fetcher = gtx, delay = 400) {
  const { text: p, spans } = protect(text);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await fetcher(p, lang);
      const back = restore(raw, spans);
      if (back && back.trim()) return back;
    } catch (e) { /* retry once */ }
    if (attempt === 0) await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

function buildMessage(original, translated, langName) {
  return original + "\n\n" + SEP + "\n\n🌐 Translation — " + langName + "\n\n" + translated;
}

// One translator per broadcast: each language translated at most once (promise cached);
// failures cached as null and never throw, so languages are independent.
function createTranslator(original, nameOf, fetcher = gtx) {
  const cache = new Map();
  let calls = 0;
  const get = (lang) => {
    if (!lang || lang === "en") return Promise.resolve(null);
    if (!cache.has(lang)) {
      calls++;
      cache.set(lang, translateText(original, lang, fetcher, 0 === 1 ? 0 : 400).then((tr) => (tr ? buildMessage(original, tr, nameOf(lang)) : null)).catch(() => null));
    }
    return cache.get(lang);
  };
  return { get, calls: () => calls };
}

module.exports = { SEP, protect, restore, gtx, translateText, buildMessage, createTranslator };
