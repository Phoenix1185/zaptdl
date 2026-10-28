# Zapt ⚡

![license](https://img.shields.io/badge/license-MIT-green) ![node](https://img.shields.io/badge/node-18%2B-blue) ![platform](https://img.shields.io/badge/platform-Telegram-blue) ![release](https://img.shields.io/github/v/release/Phoenix1185/zaptdl) ![stars](https://img.shields.io/github/stars/Phoenix1185/zaptdl?style=social)

<p align="center"><img src="assets/zapt.gif" alt="Zapt" width="420"></p>

Fast Telegram media downloader bot — paste a link, get the video.

**Live bot:** [@zaptdl_bot](https://t.me/zaptdl_bot) · **Landing page:** [phoenix1185.github.io/zaptdl](https://phoenix1185.github.io/zaptdl/)

Supports YouTube, Instagram, TikTok, Facebook, X, Twitch, Reddit, SoundCloud, Vimeo and 1000+ more sites via [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Features
- 🎬 SD / HD quality picker (premium unlocks 4K)
- 📊 Live queue with progress bar (1-100%) on an animated brand GIF
- 👑 Premium via Telegram Stars (skip queue, 10 slots, 2GB files, 60min window)
- 🌐 18 languages, fully localized (menu, about, privacy, status messages)
- 📡 Admin broadcast (+ pin variant) with delivery report
- ⏸ Admin pause/resume, global or per-platform
- 🔄 Auto-resume of interrupted downloads after restart
- 📦 Up to 2GB uploads through a local Telegram Bot API server
- 🔒 Minimal data retention (see `/privacy` in the bot)

## Requirements
- Node.js 18+ and npm
- A VPS or box (Ubuntu 22.04+ works; ~2GB RAM minimum, more is better for big downloads)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- pm2 (`npm install -g pm2`)
- Optional but recommended for 2GB uploads: a second box running [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) (the local Bot API server)

## Quick start
```bash
git clone https://github.com/Phoenix1185/zaptdl.git
cd zaptdl && npm install
cp .env.example .env   # fill in your values (see Configuration below)
pm2 start bot.js --name zaptdl
pm2 save && pm2 startup   # survive reboots
```
The bot comes online immediately. For 2GB uploads, first set up the local Bot API server — full steps in [DEPLOY.md](DEPLOY.md).

## Configuration (.env)
| Variable | Required | What it is |
|---|---|---|
| `BOT_TOKEN` | yes | token from @BotFather |
| `ADMIN_IDS` | yes | comma-separated Telegram user IDs with admin commands |
| `TELEGRAM_API_BASE` | optional | local Bot API server URL (e.g. `http://YOUR-BOTAPI-BOX:8081`) — enables 2GB uploads; without it downloads cap at 50MB |

## Admin commands
- `/broadcast` — send a message to all users (with `/pin` variant)
- pause/resume — stop or restart downloads globally or per-platform
- premium management — grant slots, check status

## Docs
- [DEPLOY.md](DEPLOY.md) — full setup: bot + Telegram Bot API server (2GB uploads), cookies, bot commands
- [COOKIES.md](COOKIES.md) — how to export browser cookies and add them (fixes YouTube bot-check + age-restricted)
- [HOSTING.md](HOSTING.md) — self-host guide: requirements, clone/install, required credits
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to fork, branch and open PRs
- [Discussions](https://github.com/Phoenix1185/zaptdl/discussions) — questions, ideas, show-off your deploy
- [SECURITY.md](SECURITY.md) — vulnerability reporting
- [LICENSE](LICENSE) — MIT

## Troubleshooting
- **Bot offline after reboot** — run `pm2 save && pm2 startup` once, then `pm2 ressurect` works automatically
- **Downloads cap at 50MB** — `TELEGRAM_API_BASE` is not set or the Bot API server is down; check it with `curl http://YOUR-BOTAPI-BOX:8081`
- **YouTube age-restricted errors** — add cookies to the box, steps in [DEPLOY.md](DEPLOY.md)
- **409 conflict on start** — another instance of the same token is running; kill it with `pm2 delete <old-name>`

## Try it
Open [@zaptdl_bot](https://t.me/zaptdl_bot) and paste a link.

## Contributing
PRs are welcome — fork, branch, commit, open a pull request. For bugs, open an issue with the log line and steps to reproduce.


## Support the project ☕

Zapt is free and open source. If it saves you time, buy the dev a cup of tea 🙏

**EVM wallet (ETH, BNB, USDT, USDC and any EVM chain):**

```
0x58A07f2Ef69a4d7a0C20c0C6B079f059fdE2F669
```

Every donation goes straight into server + Bot API hosting costs. Thank you 🤝

## License
MIT
