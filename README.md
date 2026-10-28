# Zapt ⚡

Fast Telegram media downloader bot — paste a link, get the video.

**Live bot:** [@zaptdl_bot](https://t.me/zaptdl_bot) on Telegram right now.

Supports YouTube, Instagram, TikTok, Facebook, X, Twitch, Reddit, SoundCloud, Vimeo and 1000+ more sites via yt-dlp.

## Features
- 🎬 SD / HD quality picker (premium unlocks 4K)
- 📊 Live queue with progress bar (1-100%) on an animated brand GIF
- 👑 Premium via Telegram Stars (skip queue, 10 slots, 2GB files, 60min window)
- 🌐 18 languages, fully localized (menu, about, privacy, status messages)
- 📡 Admin broadcast (+ pin variant) with delivery report
- ⏸ Admin pause/resume, global or per-platform
- 🔄 Auto-resume of interrupted downloads after restart
- 📦 Up to 2GB uploads through a local Telegram Bot API server
- 🔒 Minimal data retention (see /privacy)

## Quick start
See DEPLOY.md for the full setup (bot + local Bot API server).

git clone https://github.com/Phoenix1185/zaptdl.git
cd zaptdl && npm install
cp .env.example .env  # fill your values
pm2 start bot.js --name zaptdl

## Try it
Open [@zaptdl_bot](https://t.me/zaptdl_bot) and paste a link.

## License
MIT
