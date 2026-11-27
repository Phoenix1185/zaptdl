const assert = require("assert");
const L = require("./live");
const { friendlyError } = require("./friendly");
assert(L.isTikTokLiveUrl("https://www.tiktok.com/@user.name/live"));
assert(L.isTikTokLiveUrl("https://tiktok.com/@a/live/"));
assert(!L.isTikTokLiveUrl("https://www.tiktok.com/@a/video/123"));
assert(!L.isTikTokLiveUrl("https://evil.com/@a/live"));
assert(!L.isTikTokLiveUrl("garbage"));
assert.strictEqual(L.liveCapSeconds(false), 1200);
assert(L.liveArgs(true).join(" ").includes("-t 2400"));
assert(/isn't live/.test(friendlyError("ERROR: [tiktok:live] x: The channel is not currently live")));
console.log("live ok");

(async () => {
  const https = require("https");
  const fs = require("fs");
  const path = require("path");
  const http = require("http");
  const SHORT_LIVE = "https://vt.tiktok.com/ZS9Pp2BLJyTvt-wBmZe/";
  const server = http.createServer((req, res) => {
    if (req.url === "/live") { res.writeHead(302, { Location: "https://www.tiktok.com/@carterruddock/live" }); res.end(); }
    else if (req.url === "/clip") { res.writeHead(302, { Location: "https://www.tiktok.com/@carterruddock/video/7421901234567890123" }); res.end(); }
    else if (req.url === "/err") { res.writeHead(500); res.end(); }
    else if (req.url === "/evil") { res.writeHead(302, { Location: "https://evil.example/@x/live" }); res.end(); }
    else if (req.url === "/loop") { res.writeHead(302, { Location: "http://127.0.0.1/loop" }); res.end(); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const origRequest = https.request;
  const origGet = https.get;
  https.request = function (opts, cb) {
    return http.request({ method: opts.method || "GET", hostname: "127.0.0.1", port, path: opts.path, headers: opts.headers, timeout: opts.timeout }, cb);
  };
  https.get = function () { throw new Error("unused"); };
  try {
    // raw short tiktok link that redirects to a live room routes live
    const liveRes = await L.resolveTikTokUrl("https://vt.tiktok.com/live");
    assert.strictEqual(liveRes, "https://www.tiktok.com/@carterruddock/live");
    assert.strictEqual(L.isTikTokLiveUrl(liveRes), true);
    // ordinary short tiktok clip stays non-live
    const clipRes = await L.resolveTikTokUrl("https://vt.tiktok.com/clip");
    assert.strictEqual(clipRes, "https://www.tiktok.com/@carterruddock/video/7421901234567890123");
    assert.strictEqual(L.isTikTokLiveUrl(clipRes), false);
    // vm short links resolve the same way
    const vmRes = await L.resolveTikTokUrl("https://vm.tiktok.com/live");
    assert.strictEqual(L.isTikTokLiveUrl(vmRes), true);
    // resolution failures never become live: original short url comes back
    const errRes = await L.resolveTikTokUrl("https://vt.tiktok.com/err");
    assert.strictEqual(errRes, "https://vt.tiktok.com/err");
    assert.strictEqual(L.isTikTokLiveUrl(errRes), false);
    // non-tiktok redirect target rejected, original returned
    const evilRes = await L.resolveTikTokUrl("https://vt.tiktok.com/evil");
    assert.strictEqual(evilRes, "https://vt.tiktok.com/evil");
    // loop stops instead of spinning
    const loopRes = await L.resolveTikTokUrl("https://vt.tiktok.com/loop");
    assert.strictEqual(L.isTikTokLiveUrl(loopRes), false);
    // canonical urls pass through untouched (no request, no change)
    const direct = await L.resolveTikTokUrl("https://www.tiktok.com/@carterruddock/video/7421901234567890123");
    assert.strictEqual(direct, "https://www.tiktok.com/@carterruddock/video/7421901234567890123");
    assert.strictEqual(L.isTikTokLiveUrl(direct), false);
    // bot.js wires the resolved url into the live check, keeps original url for yt-dlp
    const bot = fs.readFileSync(path.join(__dirname, "bot.js"), "utf8");
    assert(/resolveTikTokUrl/.test(bot));
    assert(/const isLive = LIVE\.isTikTokLiveUrl\(dlUrl\)/.test(bot));
    assert(/if \(isLive\) args\.splice/.test(bot));
    assert(/job\.url\];/.test(bot));
    assert(!/if \(LIVE\.isTikTokLiveUrl\(job\.url\)\)/.test(bot));
    console.log("live resolve ok");
  } finally {
    https.request = origRequest;
    https.get = origGet;
    server.close();
  }
  console.log("all live tests ok");
})().catch((e) => { console.error(e); process.exit(1); });
