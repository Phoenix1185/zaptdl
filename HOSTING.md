# Hosting your own Zapt ⚡

Anyone can run their own Zapt instance. Everything is open source (MIT).

## What you need
- A VPS (2 vCPU / 4GB+ RAM recommended — Ubuntu 22.04 or Debian 12)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- (optional, for 2GB uploads) 4GB+ RAM for the Telegram Bot API server
- (for YouTube) a cookies.txt exported from a logged-in YouTube browser session

## Install (bot)
git clone https://github.com/Phoenix1185/zaptdl.git
cd zaptdl && npm install
cp .env.example .env   # fill BOT_TOKEN, ADMIN_IDS, TELEGRAM_API_BASE
pm2 start bot.js --name zaptdl && pm2 save

## Install (Bot API server for 2GB uploads)
See DEPLOY.md — build telegram-bot-api from tdlib source, run with --local --http-port=8081, point TELEGRAM_API_BASE at it.

## Credits (required)
If you host your own instance or fork this project, you MUST keep attribution:
- Original project: https://github.com/Phoenix1185/zaptdl by Phoenix1185 (Damien)
- Powered by yt-dlp
- Built on node-telegram-bot-api and the tdlib telegram-bot-api server
Keep the Zapt branding and this credit block in your README and in the bot /about command.
