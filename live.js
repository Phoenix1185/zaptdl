// TikTok LIVE helpers: detect /@user/live urls and cap recording length so a live never runs to the job timeout.
// Short links (vt.tiktok.com / vm.tiktok.com) hide the real route, so they must be
// resolved to the canonical tiktok.com URL before the live check runs. An
// unresolved short link is never treated as live: the download keeps going with
// the original URL and yt-dlp handles the redirect itself.
const https = require("https");
const LIVE_CAP_FREE_S = 20 * 60;
const LIVE_CAP_PREMIUM_S = 40 * 60;
const TIKTOK_HOSTS = ["tiktok.com", "vt.tiktok.com", "vm.tiktok.com", "m.tiktok.com"];
const SHORT_HOSTS = ["vt.tiktok.com", "vm.tiktok.com"];
function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch (e) { return ""; }
}
function isTikTokUrl(u) {
  const h = hostOf(u);
  return TIKTOK_HOSTS.indexOf(h) !== -1 || h.endsWith(".tiktok.com");
}
function isTikTokLiveUrl(u) {
  try {
    const x = new URL(u);
    const h = x.hostname.replace(/^www\./, "").toLowerCase();
    if (!(h === "tiktok.com" || h.endsWith(".tiktok.com"))) return false;
    return /^\/@[^/]+\/live\/?$/i.test(x.pathname);
  } catch (e) { return false; }
}
// Only vt/vm short links need resolving: they carry no usable route of their own.
// Canonical www/m URLs are already decided by isTikTokLiveUrl, no request needed.
function needsResolve(u) {
  return SHORT_HOSTS.indexOf(hostOf(u)) !== -1;
}
function liveCapSeconds(premium) { return premium ? LIVE_CAP_PREMIUM_S : LIVE_CAP_FREE_S; }
// extra yt-dlp args: ffmpeg downloader with a hard duration cap, mpegts so a cut recording stays playable.
function liveArgs(premium) {
  return ["--downloader", "ffmpeg", "--downloader-args", "ffmpeg_o:-t " + liveCapSeconds(premium), "--hls-use-mpegts"];
}
// Follow the short link's redirect chain (HEAD, no body) and return the final URL.
// Returns the input URL unchanged on any error, timeout, non-TikTok target, or
// redirect loop, so callers can safely fall back to the original URL.
function resolveTikTokUrl(input, opts, allowHost) {
  if (!needsResolve(input)) return Promise.resolve(input);
  const maxHops = (opts && opts.maxHops) || 5;
  const timeoutMs = (opts && opts.timeoutMs) || 8000;
  const grantHost = allowHost || ((h) => isTikTokUrl("https://" + h + "/"));
  const seen = new Set();
  return new Promise((resolve) => {
    let current = input;
    let hops = 0;
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    const step = () => {
      if (hops > maxHops || seen.has(current)) return finish(input);
      seen.add(current);
      let url;
      try { url = new URL(current); } catch (e) { return finish(input); }
      const req = https.request({
        method: "HEAD",
        hostname: url.hostname,
        path: url.pathname + url.search,
        timeout: timeoutMs,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Zapt/1.0)" },
      }, (res) => {
        const loc = res.headers.location;
        const status = res.statusCode || 0;
        res.resume();
        if (!loc || !(status >= 300 && status < 400)) return finish(current);
        let next;
        try { next = new URL(loc, current).toString(); } catch (e) { return finish(input); }
        hops++;
        if (!grantHost(hostOf(next))) return finish(input);
        current = next;
        // Keep following only while the target is still a short link; once we
        // land on a canonical route we can decide, no more requests needed.
        if (needsResolve(current) && hops <= maxHops) return step();
        return finish(current);
      });
      req.on("timeout", () => { req.destroy(); finish(current); });
      req.on("error", () => finish(hops ? current : input));
      req.end();
    };
    step();
  });
}
module.exports = { isTikTokUrl, isTikTokLiveUrl, needsResolve, liveCapSeconds, liveArgs, resolveTikTokUrl, LIVE_CAP_FREE_S, LIVE_CAP_PREMIUM_S };
