const assert = require("assert");
const T = require("./translate.js");
const i18n = require("./i18n");
const orig = "🔥 Zapt update! Use /support or /start. Visit https://t.me/zaptdl_bot, ask @zaptadmin. YouTube 4K via yt-dlp.";
const fake = async (txt, lang) => { if (lang === "fr") throw new Error("boom"); if (lang === "de") return "kaputt ohne tokens"; return "[" + lang + "] " + txt; };
(async () => {
  // protection roundtrip
  const { text, spans } = T.protect(orig);
  for (const w of ["/support", "/start", "https://t.me/zaptdl_bot", "@zaptadmin", "Zapt", "yt-dlp", "YouTube", "4K", "🔥"]) assert(spans.includes(w), "protected " + w);
  assert.strictEqual(T.restore(text, spans), orig);
  assert.strictEqual(T.restore("missing", spans), null);
  // format
  const m = T.buildMessage("hi", "hola", "Spanish");
  assert.strictEqual(m, "hi\n\n━━━━━━━━━━━━━━━━━━\n\n🌐 Translation — Spanish\n\nhola");
  // cache once per language, concurrency, isolation
  let n = 0; const f = async (a, b) => { n++; return fake(a, b); };
  const tr = T.createTranslator(orig, (c) => c.toUpperCase(), f);
  const r = await Promise.all(["es", "es", "es", "ja", "en", "es", "ja"].map((l) => tr.get(l)));
  assert.strictEqual(n, 2); assert.strictEqual(tr.calls(), 2);
  assert(r[0].startsWith(orig + "\n\n━━━━━━━━━━━━━━━━━━\n\n🌐 Translation — ES\n\n"));
  assert(r[0].includes("/support") && r[0].includes("https://t.me/zaptdl_bot"));
  assert.strictEqual(r[4], null);
  // failures are isolated
  const t2 = T.createTranslator(orig, (c) => c, fake);
  const [fr, de, es] = await Promise.all([t2.get("fr"), t2.get("de"), t2.get("es")]);
  assert.strictEqual(fr, null); assert.strictEqual(de, null); assert(es && es.includes("Translation"));
  // i18n defaults / languages
  assert(i18n.languages.length === 18 && i18n.languages.some((l) => l.code === "en"));
  assert(i18n.isLang("es") && !i18n.isLang("xx"));
  console.log("ALL TESTS PASSED");
})().catch((e) => { console.error(e); process.exit(1); });
