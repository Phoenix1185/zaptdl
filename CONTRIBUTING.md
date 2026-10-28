# Contributing to Zapt ⚡

Thanks for your interest in improving Zapt! Every PR gets reviewed by the maintainer before merge.

## How to contribute
1. **Fork** the repo and clone your fork
2. **Create a branch** for your change: `git checkout -b fix/yt-queue-crash` or `feat/spotify-support`
3. **Make your change** — keep it focused, one feature or fix per PR
4. **Test it** — run the bot locally with your own token and confirm the affected flow works
5. **Commit** with a clear message: `fix: queue crash when link has emoji`
6. **Open a Pull Request** — describe what changed and why

## Branch naming
- `feat/...` — new feature
- `fix/...` — bug fix
- `docs/...` — documentation only
- `refactor/...` — no behavior change

## PR checklist
- [ ] Tested locally with a real Telegram bot token
- [ ] No tokens, cookies, or secrets in the diff
- [ ] Works on Node 18+
- [ ] Does not break the 18-language localization (if touching user-facing strings)
- [ ] Follows the existing code style (plain JS, no build step)

## What gets merged fast
- Bug fixes with reproduction steps
- New platform support that yt-dlp already handles
- Perf improvements (queue, upload speed)
- Docs for the setup you struggled with

## What gets closed
- Features that need paid APIs or new credentials from users
- Changes that reduce privacy (more data retention)
- Unrelated refactors inside a bug-fix PR

## Reporting bugs
Open an issue with: what you did, what you expected, the actual log line (`pm2 logs zaptdl`), and your OS. Security issues: see [SECURITY.md](SECURITY.md) — do not open a public issue.
