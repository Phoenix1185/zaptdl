// Upload/download size caps for Zapt.
//
// Telegram-only delivery: a self-hosted local Bot API server (--local)
// can send up to 2000 MB per file. Premium files are capped at that same
// ceiling, so anything over 2000 MiB is rejected before upload.
// (core.telegram.org/bots/api, "Using a Local Bot API Server")

const FREE_CAP = 1900 * 1024 * 1024;              // free users: 1900 MiB
const PREMIUM_CAP = 2000 * 1024 * 1024;           // premium users: 2000 MiB (Telegram local Bot API ceiling)
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
