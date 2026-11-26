const AUDIO_HOSTS = [
  "music.youtube.com","music.apple.com","soundcloud.com","bandcamp.com",
  "audiomack.com","deezer.com","spotify.com","mixcloud.com"
];
function hostOf(url){
  try{ return new URL(url).hostname.replace(/^www\./,"").toLowerCase(); }
  catch(e){ return ""; }
}
function isAudioHost(url){
  const h = hostOf(url);
  if(!h) return false;
  return AUDIO_HOSTS.some(x => h === x || h.endsWith("." + x));
}
function isAudioUrl(url){ return isAudioHost(url); }
function wantsAudio(quality){ return quality === "audio"; }
function audioCaptionLine(size, fmtSize){
  return "🎵 Audio only · " + fmtSize(size);
}
function audioYtdlpArgs(job, base, cookiesPath){
  return ["-f","bestaudio/best","-x","--audio-format","mp3","--audio-quality","0",
    "--no-playlist","--newline","--no-warnings","--concurrent-fragments","8","--cookies",cookiesPath,
    "--print-to-file","%(title)s",base + "_title.txt",
    "--print-to-file","%(uploader)s",base + "_uploader.txt",
    "--print-to-file","%(description)s",base + "_desc.txt",
    "--print-to-file","%(upload_date>%Y.%m.%d)s",base + "_date.txt",
    "-o",base + ".%(ext)s",job.url];
}
module.exports = { AUDIO_HOSTS, hostOf, isAudioHost, isAudioUrl, wantsAudio, audioCaptionLine, audioYtdlpArgs };
