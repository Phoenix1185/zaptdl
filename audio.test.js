const assert = require("assert");
const { isAudioHost, isAudioUrl, wantsAudio, audioCaptionLine, audioYtdlpArgs } = require("./audio");

// audio hosts
assert.strictEqual(isAudioHost("https://music.youtube.com/watch?v=abc"), true);
assert.strictEqual(isAudioHost("https://m.youtube.com/watch?v=abc"), false); // regular youtube is video
assert.strictEqual(isAudioHost("https://soundcloud.com/artist/track"), true);
assert.strictEqual(isAudioHost("https://artist.bandcamp.com/album/x"), true);
assert.strictEqual(isAudioHost("https://www.youtube.com/watch?v=abc"), false);
assert.strictEqual(isAudioHost("https://www.tiktok.com/@x/video/1"), false);

// wantsAudio only for dl:audio callback
assert.strictEqual(wantsAudio("audio"), true);
assert.strictEqual(wantsAudio("hd"), false);
assert.strictEqual(wantsAudio("sd"), false);

// caption
assert.strictEqual(audioCaptionLine(1024, (n) => n + "B"), "🎵 Audio only · 1024B");

// ytdlp args contain bestaudio and mp3 extraction
const args = audioYtdlpArgs({ url: "https://music.youtube.com/watch?v=x" }, "/tmp/zapt_1", "/tmp/cookies.txt");
assert.ok(args.includes("bestaudio/best"));
assert.ok(args.includes("--audio-format") && args.includes("mp3"));
assert.ok(args.join(" ").includes("/tmp/zapt_1.%(ext)s"));

console.log("audio.test.js: ALL TESTS PASSED");
