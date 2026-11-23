const {friendlyError:f}=require("./friendly");const a=require("assert");
const raw="ERROR: [TikTok] 1: This post may not be comfortable for some audiences. Log in for access. Use --cookies-from-browser or --cookies for the authentication. See https://github.com/yt-dlp/yt-dlp/wiki/FAQ";
a(/needs a login/.test(f(raw)));a(!/cookies|yt-dlp/.test(f(raw)));
a(/couldn't read/.test(f("ERROR: Unable to extract x; please report this issue on https://github.com/yt-dlp/yt-dlp/issues?q= , filling out the appropriate issue template. Confirm you are on the latest version using yt-dlp -U")));
a(/isn't one/.test(f("ERROR: Unsupported URL: x")));a(/removed/.test(f("Video unavailable")));
a(!/yt-dlp/.test(f("zzz weird")));console.log("ok");
