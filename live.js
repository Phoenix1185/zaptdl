// TikTok LIVE helpers: detect /@user/live urls and cap recording length so a live never runs to the job timeout.
const LIVE_CAP_FREE_S = 20 * 60;
const LIVE_CAP_PREMIUM_S = 40 * 60;
function isTikTokLiveUrl(u) {
  try {
    const x = new URL(u);
    const h = x.hostname.replace(/^www\./, "").toLowerCase();
    if (!(h === "tiktok.com" || h.endsWith(".tiktok.com"))) return false;
    return /^\/@[^/]+\/live\/?$/i.test(x.pathname);
  } catch (e) { return false; }
}
function liveCapSeconds(premium) { return premium ? LIVE_CAP_PREMIUM_S : LIVE_CAP_FREE_S; }
// extra yt-dlp args: ffmpeg downloader with a hard duration cap, mpegts so a cut recording stays playable.
function liveArgs(premium) {
  return ["--downloader", "ffmpeg", "--downloader-args", "ffmpeg_o:-t " + liveCapSeconds(premium), "--hls-use-mpegts"];
}
module.exports = { isTikTokLiveUrl, liveCapSeconds, liveArgs, LIVE_CAP_FREE_S, LIVE_CAP_PREMIUM_S };
