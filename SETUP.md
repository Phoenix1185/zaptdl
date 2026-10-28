# Zapt ⚡ — complete setup guide (zero experience needed)

Dis guide go carry U from empty server to working bot. No coding knowledge needed — just copy and paste each command in order.

---

## Choose your hosting (pick ONE)

| Option | Cost | Difficulty | 2GB uploads? | Best for |
|---|---|---|---|---|
| AWS EC2 | free tier 750h/month (12 months) | medium | yes (2 boxes) | long-term free hosting |
| Render.com | free plan (bot sleeps when idle) | easiest — no server | no (50MB cap) | testing / first-timers |
| Any VPS (Hetzner, Contabo, DigitalOcean...) | $4-6/month | medium | yes (2 boxes) | serious use |

---

## Part 1 — Get your bot token (all options need this)

1. Open Telegram, search **@BotFather**, send `/newbot`
2. Give am a name (e.g. `Zapt`) and a username wey must end in `bot` (e.g. `myzapt_bot`)
3. BotFather go send U a **token** wey look like `123456789:AAHfj...` — copy am, no share am
4. Get your admin ID: search **@userinfobot** on Telegram, send any message, e go reply with your **Id** number. Write am down

---

## Part 2A — Render.com deploy (easiest, 10 minutes)

> Render free plan dey sleep after 15min idle and uploads cap at 50MB (no local Bot API). Good for trying Zapt.

1. Fork di repo: click **Fork** on top-right of [github.com/Phoenix1185/zaptdl](https://github.com/Phoenix1185/zaptdl)
2. Go [render.com](https://render.com), sign up free, click **New +** → **Background Worker**
3. Connect your GitHub, pick your forked repo
4. Fill di form:
   - **Name:** `zaptdl`
   - **Environment:** `Node`
   - **Build command:** `npm install`
   - **Start command:** `node bot.js`
5. Open **Environment** tab, add:
   - `BOT_TOKEN` = di token from Part 1
   - `ADMIN_IDS` = your ID number from Part 1
6. Click **Create Worker**. Wait for deploy, then open di bot on Telegram and send a YouTube link. Done ✅

## Part 2B — AWS EC2 deploy (free tier, full power)

> 2GB uploads need TWO boxes: one for di bot, one for di Telegram Bot API server. AWS free tier fit cover both (750h/month total).

### Step 1 — create di bot box
1. Go [console.aws.amazon.com](https://console.aws.amazon.com) → EC2 → **Launch instance**
2. Name: `zaptdl-bot` · Image: **Ubuntu 24.04** · Type: **t4g.small** (or t3.small) · key pair: create one and download di `.pem` file — keep am safe, na ur key enter di server
3. Security group: allow **SSH (22)** from your IP
4. Launch, then connect from your PC:
   ```bash
   chmod 400 your-key.pem
   ssh -i your-key.pem ubuntu@THE-BOX-IP
   ```

### Step 2 — install everything (copy whole block, paste, Enter)
   ```bash
   sudo apt update && sudo apt -y upgrade
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt -y install nodejs
   sudo npm install -g pm2
   git clone https://github.com/Phoenix1185/zaptdl.git && cd zaptdl && npm install
   ```

### Step 3 — configure
   ```bash
   cp .env.example .env
   nano .env    # fill BOT_TOKEN and ADMIN_IDS from Part 1, save with Ctrl+O Enter Ctrl+X
   pm2 start bot.js --name zaptdl && pm2 save
   ```

Open Telegram, send ur bot a YouTube link. If e download — di bot dey WORK ✅ (50MB cap for now).

### Step 4 — di 2GB box (Bot API server)
1. Launch a SECOND EC2 di same way, name `zaptdl-botapi`
2. On di new box:
   ```bash
   sudo apt update && sudo apt -y install cmake g++ libssl-dev zlib1g-dev make git
   git clone --recursive https://github.com/tdlib/telegram-bot-api.git && cd telegram-bot-api
   rm -rf build && mkdir build && cd build
   cmake -DCMAKE_BUILD_TYPE=Release .. && cmake --build . -j 2
   sudo cp telegram-bot-api /usr/local/bin/
   ```
   (compile dey take 10-20 minutes, make U dey patient)
3. Get an **api_id and api_hash**: go [my.telegram.org](https://my.telegram.org) → API development tools, copy both
4. Run di server and keep am alive:
   ```bash
   pm2 start "telegram-bot-api --api-id=YOUR_API_ID --api-hash=YOUR_API_HASH --local --http-port=8081" --name tgbotapi && pm2 save
   ```
5. Security groups: on di Bot API box, allow inbound TCP **8081** ONLY from di bot box private IP. On di bot box: allow 8081 out to di Bot API box
6. Back on di bot box, point di bot to am:
   ```bash
   nano .env   # set TELEGRAM_API_BASE=http://BOTAPI-BOX-PRIVATE-IP:8081
   pm2 restart zaptdl
   ```

Send a big video link — di bot go upload up to 2GB 🔥

### Step 5 — survive reboot (both boxes)
   ```bash
   pm2 save && pm2 startup   # follow the one line it prints, paste, Enter
   ```

## Part 2C — Any other VPS (Hetzner, Contabo, DigitalOcean...)

Same as AWS Part 2B Steps 2-5, just say no di "launch instance" part — connect with `ssh root@SERVER-IP` and go straight to Step 2.

---

## Part 3 — After setup

- **Cookies for YouTube**: if you see "Sign in to confirm you are not a bot", follow [COOKIES.md](COOKIES.md)
- **Commands / broadcast / premium**: all dey inside di bot, send `/menu` to your bot
- **Something broke?**: `pm2 logs zaptdl` show di error, compare with di Troubleshooting section for [README](README.md)

## Cost summary

| Setup | Monthly cost |
|---|---|
| Render free | ₦0 (bot dey sleep when idle, 50MB cap) |
| AWS free tier year 1 | ₦0 (2 boxes, 750h/month) |
| AWS after free tier | ~$25-30/month for 2 small boxes |
| One VPS, no 2GB | ~$4-6/month |

Stuck anywhere? Open an [issue](https://github.com/Phoenix1185/zaptdl/issues) with di step number and di error — we go help U out.
