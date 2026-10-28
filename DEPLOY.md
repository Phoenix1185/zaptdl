# Zapt ⚡ - Telegram Media Downloader

Downloads video/music from YouTube, Instagram, TikTok, Facebook, X and 1000+ sites.
Features: SD/HD/4K quality picker, Telegram Stars premium, broadcast, admin controls, 18 languages, queue resume after restart, 2GB uploads via local Bot API server.

## Architecture (how it runs)
Two pieces work together:
1. THIS BOT (zaptdl) - node-telegram-bot-api app, polls Telegram, spawns yt-dlp, uploads media. Runs on the bot box with pm2.
2. LOCAL BOT API SERVER (box3) - official telegram-bot-api binary, listens on :8081. The bot points TELEGRAM_API_BASE at it. This is what allows uploads up to 2GB (default Telegram cap is 50MB).

## 1. Bot box setup (ubuntu)
sudo apt update && sudo apt install -y nodejs npm ffmpeg git
sudo npm i -g pm2 yt-dlp 2>/dev/null || sudo pip3 install yt-dlp
git clone https://github.com/Phoenix1185/zaptdl.git && cd zaptdl
npm install
cp .env.example .env  # fill real values:
#   BOT_TOKEN=token from @BotFather
#   ADMIN_IDS=your-telegram-id
#   TELEGRAM_API_BASE=http://<botapi-box-ip>:8081
pm2 start bot.js --name zaptdl && pm2 save

### yt-dlp YouTube cookies (required for YouTube)
Export cookies.txt from a logged-in YouTube browser session (extension: "Get cookies.txt LOCALLY"),
upload it as yt.cookies.txt in the repo folder. Re-export when "Sign in to confirm" errors return.

## 2. Telegram Bot API server (box3, for 2GB uploads)
sudo apt update && sudo apt install -y git cmake g++ libssl-dev zlib1g-dev make
git clone --recursive https://github.com/tdlib/telegram-bot-api.git
cd telegram-bot-api && mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release .. && make -j2 && sudo make install
# run (api_id/api_hash from my.telegram.org):
telegram-bot-api --api-id=ID --api-hash=HASH --local --http-port=8081
pm2 start "telegram-bot-api --api-id=ID --api-hash=HASH --local --http-port=8081" --name tgbotapi
# open port: ufw allow 8081 (or AWS security group)

## Admin commands (only ADMIN_IDS see them)
/jobs, /flush, /broadcast, /broadcastpin, /pause [platform], /resume [platform]

## User commands
/start /help /about /language /q /premium /support /privacy /cancel
