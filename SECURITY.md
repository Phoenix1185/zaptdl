# Security Policy

## Supported
Only the latest commit on main is supported.

## Reporting a vulnerability
Private disclosure: use /support inside @zaptdl_bot, or contact the repo owner via GitHub.
Do NOT open a public issue for security problems. You should get a response within 48 hours.

## Scope
- The bot code in this repository
- The deployment setup described in DEPLOY.md

## What is out of scope
- Telegram itself, yt-dlp upstream issues
- Compromised host credentials

## Handling
Secrets (.env, cookies, data.json) are never committed — see .gitignore. If you believe a secret leaked, rotate the bot token via @BotFather immediately.
