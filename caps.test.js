const a = require("assert");
const { FREE_CAP, PREMIUM_CAP, UPLOAD_CEILING, effectiveCap, overCap, needsUpgrade } = require("./caps.js");

const MiB = 1024 * 1024;

// thresholds
a.equal(FREE_CAP, 1900 * MiB);
a.equal(PREMIUM_CAP, 2000 * MiB);
a.equal(UPLOAD_CEILING, 2000 * MiB);

// free: capped at 1900 MiB, anything above is an upgrade prompt
a.equal(effectiveCap(false), 1900 * MiB);
a.equal(overCap(1900 * MiB, false), false);
a.equal(overCap(1900 * MiB + 1, false), true);
a.equal(overCap(2500 * MiB, false), true);
a.equal(needsUpgrade(2500 * MiB, false), true);
a.equal(needsUpgrade(100 * MiB, false), false);

// premium: Telegram-only cap is 2000 MiB (local Bot API ceiling)
a.equal(effectiveCap(true), 2000 * MiB); // Telegram-only premium cap
a.equal(overCap(1900 * MiB, true), false);
a.equal(overCap(1999 * MiB, true), false);
a.equal(overCap(2000 * MiB, true), false);
a.equal(overCap(2000 * MiB + 1, true), true);
a.equal(overCap(5 * 1024 ** 3, true), true); // 5 GiB exceeds the 2000 MiB Telegram ceiling, rejected before upload
a.equal(overCap(2000 * MiB + 1, true), true); // just over 2000 MiB rejected before upload
a.equal(needsUpgrade(2000 * MiB + 1, true), false); // premium over-cap never gets the upgrade CTA
a.equal(needsUpgrade(3000 * MiB, true), false); // premium never gets the upgrade CTA

// upgrade CTA reuses the existing premium flow buttons (prem:w / prem:m / prem:m3)
const bot = require("fs").readFileSync("./bot.js", "utf8");
a(/needsUpgrade\(size, job\.premium\)/.test(bot), "too-large branch uses needsUpgrade");
a(/upgradeKb/.test(bot) || /premiumKb\(uid\)/.test(bot), "free oversize branch sends the premium upgrade keyboard");
a(/prem:w"\)|btn\(T\(id, "prem_w"\), "prem:w"\)/.test(bot), "upgrade CTA reuses prem:w callback");
a(/prem:m"\)|btn\(T\(id, "prem_m"\), "prem:m"\)/.test(bot), "upgrade CTA reuses prem:m callback");
a(/prem:m3"\)|btn\(T\(id, "prem_3"\), "prem:m3"\)/.test(bot), "upgrade CTA reuses prem:m3 callback");
a(!/can send up to 5GB|5GB downloads|premium.*5 ?GB.*download|5 ?GB file/.test(bot), "bot must not claim 5GB files can be delivered");
a(/FREE_CAP|1900 \* 1024 \* 1024/.test(bot), "free cap 1900 MiB present in bot.js");

console.log("caps ok");
