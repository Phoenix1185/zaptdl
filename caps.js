// Upload/download size caps for Zapt.
//
// Telegram's own Bot API can only send 50 MB. A self-hosted local Bot API
// server (--local) raises that to 2000 MB per file, so delivery can never
// exceed 2000 MiB even though the premium *download* cap is 5 GiB.
// (core.telegram.org/bots/api, "Using a Local Bot API Server")

const FREE_CAP = 1900 * 1024 * 1024;              // free users: 1900 MiB
const PREMIUM_CAP = 5 * 1024 ** 3;                // premium users: 5 GiB (5*1024^3)
const UPLOAD_CEILING = 2000 * 1024 * 1024;        // local Bot API upload max per file

function effectiveCap(premium) {
  return premium ? Math.min(PREMIUM_CAP, UPLOAD_CEILING) : FREE_CAP;
}

function overCap(size, premium) {
  return size > effectiveCap(premium);
}

function needsUpgrade(size, premium) {
  return !premium && size > FREE_CAP;
}

module.exports = { FREE_CAP, PREMIUM_CAP, UPLOAD_CEILING, effectiveCap, overCap, needsUpgrade };
