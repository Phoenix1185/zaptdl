// Turns raw yt-dlp output into a short, user-safe message. Never exposes cookies/flags/URLs.
const RULES = [
  [/IP address is blocked|your ip.{0,30}blocked|is blocked from accessing|accessdenied/i, "🚫 TikTok is blocking my server IP right now, so I can't read this post. Try a different link, or I can try again later if TikTok still refuses."],
  [/log in for access|login required|sign in to confirm|--cookies|cookies-from-browser|authentication|private (video|account)|this video is private|members[- ]only|age[- ]restricted|not comfortable for some audiences|confirm your age|requires? (a )?login/i, "🔒 That one needs a login to view (private, age-restricted or sensitive content), so I can't grab it."],
  [/unsupported url|not a valid url|no suitable extractor/i, "🔗 That link isn't one I can download from. Send a direct link to a public video or post."],
  [/video unavailable|removed|deleted|no longer available|does not exist|not found|404|has been terminated|account.*suspended/i, "🗑️ That post looks removed or unavailable."],
  [/geo|not available in your country|blocked in your/i, "🌍 That one is blocked in the region my server is in."],
  [/429|too many requests|rate.?limit|try again later/i, "⏳ The platform is rate limiting me right now. Try again in a few minutes."],
  [/no video|no media|there is no video|does not contain any video/i, "🖼️ I couldn't find a video in that link."],
  [/live (event|stream)|premieres? in|is upcoming/i, "📡 That's a live or upcoming stream. Try again once it's finished."],
  [/unable to extract|please report this issue|yt-dlp -u|extractor|unable to download|http error 5|timed out|timeout/i, "⚠️ I couldn't read that link right now. The platform may have changed something. Try again later."],
];
function friendlyError(raw) {
  const s = String(raw || "");
  for (const [re, msg] of RULES) if (re.test(s)) return msg;
  return "⚠️ Couldn't download that link. Make sure it's public and try again.";
}
module.exports = { friendlyError };
