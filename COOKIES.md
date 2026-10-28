# Cookies guide 🍪

Some sites (mostly YouTube) dey block datacenter IPs or ask for age verification. Cookies from a logged-in browser session fix both. This guide shows how to export cookies and wire dem into Zapt.

## When you need cookies
- YouTube dey return "Sign in to confirm you are not a bot"
- Age-restricted videos dey fail
- Downloads dey work from ur home IP but fail from di VPS

## Step 1 — export cookies from your browser

Install a cookie export extension:

- Chrome/Edge: [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclecbndpnednlipjcmnfckfepnfbfln)
- Firefox: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

Then:
1. Open the site (e.g. youtube.com) and log in — **use a throwaway/test account, not your main Google account** (small risk of the account getting flagged)
2. Click the extension icon while you dey on that site
3. Export as **Netscape format** (cookies.txt)
4. Rename the file to `cookies.txt`

## Step 2 — copy am to your server

From your own PC:
```bash
scp cookies.txt user@YOUR-SERVER:/home/user/zaptdl/
```

Or paste am: `nano /home/user/zaptdl/cookies.txt`, paste the file content, save (Ctrl+O, Enter, Ctrl+X).

## Step 3 — point Zapt to am

Zapt reads cookies from the path you give am. Default expected location:

```
/home/user/zaptdl/cookies.txt
```

(if your DEPLOY.md or .env shows a `COOKIES_PATH` / cookie flag, set it to that path; otherwise the bot auto-looks for `cookies.txt` inside the zaptdl folder)

Then restart:
```bash
pm2 restart zaptdl
```

## Step 4 — verify
1. Send the bot a YouTube link
2. If it downloads fine from the VPS — cookies dey work ✅
3. If you still see bot-check errors, re-export fresh cookies (they expire) or try a different account

## Cookie hygiene
- Cookies dey expire — refresh dem every few weeks or when errors come back
- NEVER commit cookies.txt to GitHub — e dey inside .gitignore already
- NEVER share your cookies.txt — e be like giving out your login
- If one account gets flagged, use a different throwaway account
