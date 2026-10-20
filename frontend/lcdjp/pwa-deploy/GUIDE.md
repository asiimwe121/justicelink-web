# JusticeLink: PWA + Android APK + /download page

Everything below uses your real domain (`justicelinkug.org`), package name (`com.justicelinkug.app`) and paths.

## What is in this package

All paths mirror your project, so you can upload `src/` straight over the server copy.

| File | What changed |
|---|---|
| `src/main/resources/static/manifest.json` | Rewritten: adds **maskable** icons, `display_override`, `categories`, navy splash colour |
| `src/main/resources/static/service-worker.js` | Rewritten: offline page, timeouts, safe API caching, auto cleanup of old caches |
| `src/main/resources/static/pwa.js` | Rewritten: install banner, Android native prompt, iOS "Add to Home Screen" guide, hides when installed |
| `src/main/resources/static/offline.html` | **New** offline fallback page |
| `src/main/resources/static/download.html` | **New** install landing page (served at `/download` and `/get-app`) |
| `src/main/resources/static/images/justicelink-icon-maskable-192.png`, `-512.png` | **New** full-bleed icons for Android adaptive icons |
| `src/main/resources/static/images/justicelink-apple-touch-180.png` | **New** opaque iOS icon (your 180px icon has transparent corners, which iOS paints black) |
| 10 other `.html` files + `sitemap.xml` | `pwa.js?v=` token bumped, apple-touch-icon swapped, "Get the App" footer link on the home page, sitemap entry |
| `nginx/justicelink-app.conf` | Nginx additions (APK MIME type, `/download`, assetlinks) |

No Java, `SecurityConfig` or `docker-compose.yml` changes are needed: your security rules already allow `*.html`, `*.js`, `manifest.json` and `/images/**`, and the APK and `assetlinks.json` are served by Nginx directly.

### Things I decided differently from your brief (and why)

1. **API caching is limited to public data.** You asked for network-first API caching. JusticeLink handles cases, messages and ID documents, and phones are often shared. So the service worker only caches the two public, unauthenticated reads (`/api/legal-orgs/**`, `/api/legal-alerts/**`) and never touches any other `/api/` call. To add another public endpoint, add a pattern to `PUBLIC_API_PATTERNS` in `service-worker.js`.
2. **Your existing PWA was already mostly working**, so I kept its structure, the `CACHE_VERSION` line format, the `?v=` convention and the `installPwaApp()` / `window.JusticeLinkPWA` names that `index.html` already uses.
3. **`orientation` stays `portrait-primary`** (your existing value). The APK will lock to portrait too. If tablets or landscape matter, change it to `"any"` in `manifest.json` *before* generating the APK.

> **Cache-busting reminder.** The service worker serves `?v=` files cache-first, so a changed script must get a new `?v=` token or phones keep the old copy. I already changed `pwa.js?v=` to `6b3f0c91e5` in every page and set `CACHE_VERSION` to `justicelink-a1c94e07d2`. If you have a hash-bump step in your deploy, running it is fine; it will just overwrite these values.

---

## Step 1: Deploy the PWA (do this first)

### 1a. Upload from Windows PowerShell

Unzip the package to `C:\Users\asiim\Downloads\justicelink-pwa`, then:

```powershell
$KEY    = "C:\Users\asiim\OneDrive\Desktop\lcdjp-project\ssh-key-2026-10-08.key"
$SERVER = "ubuntu@79.76.111.194"
$DEST   = "~/app/lcdjp-project/frontend/lcdjp"

cd C:\Users\asiim\Downloads\justicelink-pwa

# Static files (merges into the existing src/ folder on the server)
scp -i $KEY -r .\src "${SERVER}:${DEST}/"

# Nginx snippet (staged in your home folder; applied in step 1c)
scp -i $KEY .\nginx\justicelink-app.conf "${SERVER}:~/justicelink-app.conf"
```

### 1b. Rebuild on the Oracle server

```bash
ssh -i "C:\Users\asiim\OneDrive\Desktop\lcdjp-project\ssh-key-2026-10-08.key" ubuntu@79.76.111.194

cd ~/app/lcdjp-project/frontend/lcdjp
docker compose down
docker compose up -d --build
docker compose ps          # lcdjp-backend should become "healthy" (allow ~2 minutes)
```

Static files are packed into the Spring Boot jar at build time, so the `--build` is required. No Docker Compose changes are needed.

### 1c. Nginx (one-time)

```bash
# 1. Folder for APK + assetlinks.json (outside Docker, so new APKs need no rebuild)
sudo mkdir -p /var/www/justicelink-downloads
sudo chown ubuntu:ubuntu /var/www/justicelink-downloads

# 2. Find and back up the Nginx file that serves justicelinkug.org
NGINX_CONF=$(sudo grep -rl "justicelinkug.org" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -1)
echo "$NGINX_CONF"
sudo cp "$NGINX_CONF" "$NGINX_CONF.bak-$(date +%F)"

# 3. Edit it: paste the contents of ~/justicelink-app.conf INSIDE the `server { ... }` block
#    that has `listen 443 ssl`, ABOVE the existing `location / { ... }`
sudo nano "$NGINX_CONF"
cat ~/justicelink-app.conf        # copy from here

# 4. Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

If your `server` block also covers `justicelinkug.com`, the same additions serve both domains. If you have a separate block for `.com` or `www`, repeat the paste there.

If Cloudflare caches `/service-worker.js` or `/manifest.json`, add a **Cache Rule** (Cloudflare dashboard → Caching → Cache Rules → Create rule): *URI Path equals `/service-worker.js`* (and another for `/manifest.json`) → **Bypass cache**. Without it, phones can receive a stale service worker for hours.

### 1d. Verify

Run from PowerShell (`curl.exe`, not the `curl` alias):

```powershell
curl.exe -sI https://justicelinkug.org/manifest.json        | Select-String "HTTP|content-type"
curl.exe -sI https://justicelinkug.org/service-worker.js    | Select-String "HTTP|content-type|cache-control"
curl.exe -sI https://justicelinkug.org/offline.html         | Select-String "HTTP"
curl.exe -sI https://justicelinkug.org/download             | Select-String "HTTP|content-type"
curl.exe -sI https://justicelinkug.org/images/justicelink-icon-maskable-512.png | Select-String "HTTP|content-type"
```

Every one should say `HTTP/2 200`. `/download` should return `text/html`.

---

## Step 2: Build the Android APK (PWABuilder, free, runs in your browser)

**Why PWABuilder:** it is Microsoft's free tool, needs nothing installed (so nothing ARM-related to worry about), and builds a *Trusted Web Activity*: your real website running full screen inside Chrome's engine. That gives you, for free, the things you asked for: JavaScript, DOM storage, file uploads, camera, location prompts, back-button navigation, and external links opening in the browser. A hand-made WebView wrapper would need all of those re-implemented and kept secure.

> **I could not build the APK for you.** My sandbox has no Android SDK and cannot reach the Android build servers, so the file has to be generated by PWABuilder on your side. The click-by-click below takes about 5 minutes. If PWABuilder is ever unavailable, tell me and I will write a GitHub Actions workflow that builds the APK on GitHub's free runners instead.

Do this **after Step 1 is live**, because PWABuilder reads your live manifest and icons.

### Click-by-click

Button labels can shift slightly as PWABuilder updates, but the flow is stable.

1. On your PC, open **https://www.pwabuilder.com**.
2. Paste `https://justicelinkug.org` into the box and click **Start**.
3. Wait for the report. The *Manifest* section should be green. Warnings about screenshots are fine.
4. Click **Package For Stores**.
5. On the **Android** card, click **Generate Package** (or *Store Package*).
6. In the options dialog, set:
   - **Package ID:** `com.justicelinkug.app`
   - **App name:** `JusticeLink Uganda`
   - **Launcher name:** `JusticeLink`
   - **App version:** `1.0.0`, **version code:** `1` (increase both for every future release)
   - **Signing key:** **New** (do not choose *None*; the APK must be signed to install)
   - Open **All Settings** and check that **Host** is `justicelinkug.org` and **Start URL** is `/?source=pwa`.
   - If you see **Enable location delegation**, switch it **on** (Android shows its own location permission prompt for the map).
   - Leave **fallback behavior** on the default (Custom Tabs).
7. Click **Download Package** and wait for the zip.
8. Unzip it. You need four things from it:

| Item | What to do |
|---|---|
| the signed `.apk` file | rename it to **`JusticeLink.apk`** |
| `assetlinks.json` | goes on your server (Step 3) |
| `signing.keystore` | **back it up** (see warning) |
| `signing-key-info.txt` | **back it up** (contains the key password and the SHA-256 fingerprint) |

> **Back up the keystore and password somewhere safe (not only on this PC).** Android only accepts an update over an installed app if it is signed with the *same* key. If you lose it, every user must uninstall and reinstall to update, and assetlinks.json must be regenerated.

---

## Step 3: Publish the APK and `assetlinks.json`

`assetlinks.json` is what makes the app open **full screen** instead of showing a browser address bar. If it is missing or wrong, the app still works but shows an address bar.

If the PWABuilder zip did **not** include `assetlinks.json`, create it from the SHA-256 fingerprint listed in `signing-key-info.txt`:

```powershell
$fp = "PASTE-THE-SHA256-FINGERPRINT-FROM-signing-key-info.txt"   # looks like AB:CD:12:...:EF
@"
[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.justicelinkug.app","sha256_cert_fingerprints":["$fp"]}}]
"@ | Set-Content -Path assetlinks.json -Encoding ascii
```

Upload both files (adjust the local paths to where you unzipped):

```powershell
$KEY    = "C:\Users\asiim\OneDrive\Desktop\lcdjp-project\ssh-key-2026-10-08.key"
$SERVER = "ubuntu@79.76.111.194"

scp -i $KEY "C:\Users\asiim\Downloads\JusticeLink.apk"   "${SERVER}:/var/www/justicelink-downloads/JusticeLink.apk"
scp -i $KEY "C:\Users\asiim\Downloads\assetlinks.json"   "${SERVER}:/var/www/justicelink-downloads/assetlinks.json"
```

On the server:

```bash
chmod 644 /var/www/justicelink-downloads/*
ls -la /var/www/justicelink-downloads/
```

Verify (PowerShell):

```powershell
curl.exe -sI https://justicelinkug.org/downloads/JusticeLink.apk | Select-String "HTTP|content-type|content-length"
#   expect: HTTP/2 200 and content-type: application/vnd.android.package-archive

curl.exe -s https://justicelinkug.org/.well-known/assetlinks.json
#   expect your JSON, with package_name com.justicelinkug.app

# Google's own validator (should list your package and fingerprint):
curl.exe -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://justicelinkug.org&relation=delegate_permission/common.handle_all_urls"
```

The **Download for Android** button on `/download` now works (it checks that the file exists and shows its size).

> **Updating the APK later:** build a new package with a higher version code, upload with the same file name, and if Cloudflare ever serves the old file, purge that one URL (Cloudflare → Caching → Configuration → Purge Cache → Custom Purge).

### Instructions for your users (also built into /download)

1. Open **justicelinkug.org/download** in Chrome on the phone and tap **Download for Android**.
2. Open the downloaded **JusticeLink.apk** (notification or the *Files* / *Downloads* app).
3. If Android says it is blocked, tap **Settings**, switch on **Allow from this source** for your browser, and go back.
4. Tap **Install**. If Play Protect warns that the app isn't from the Play Store, tap **More details**, then **Install anyway**. Then tap **Open**.

---

## Step 4: How the PWA install works (what you built)

**Android Chrome / Edge / Samsung Internet:** after a few seconds on the home page a banner appears, with an **Install** button that opens the native install dialog. The same action is in *My Account → Install App*. If the browser has not offered a prompt (for example Firefox), the button shows manual steps (⋮ menu → Install app).

**iPhone / iPad:** the banner's **How to** button (and *My Account → Install App*) opens a modal with the Safari steps: Share → Add to Home Screen → Add. If the user is in a non-Safari or in-app browser (Facebook, Instagram, WhatsApp-style viewers), the modal tells them to open the link in Safari and offers a **Copy link** button.

**Already installed:** nothing is shown when the page runs standalone (`display-mode: standalone`, iOS `navigator.standalone`, or launched from the APK). Dismissing the banner hides it for 14 days.

**Edge cases handled:** HTTPS-only (everything is on your HTTPS domain), the one-time use of Chrome's `beforeinstallprompt` event, blocked `localStorage` in private mode, iPadOS reporting itself as a Mac, in-app browsers, an APK that is not uploaded yet (the button turns off with an explanation), and cached old scripts (version token bump).

---

## Step 5: Testing checklist

### Installability (Chrome desktop, 2 minutes)
- [ ] Open `https://justicelinkug.org`, press **F12 → Application → Manifest**. There should be no errors, 4 icons (including 2 maskable), and the **Installability** section should show no problems. (Lighthouse no longer has a PWA category; this panel replaces it.)
- [ ] **Application → Service workers:** status is **activated and running** for `/service-worker.js`.

### Service worker and caching
- [ ] **Application → Cache Storage:** a cache named `justicelink-a1c94e07d2` holds your CSS/JS/images and `offline.html`.
- [ ] **Network tab → throttling → Offline**, reload: the home page still loads from cache. While still offline, open `https://justicelinkug.org/download.html` (the install page is deliberately not cached): the **offline page** should appear. `/` and app routes keep showing the cached app shell.
- [ ] While offline, confirm that private data is *not* kept: in Cache Storage there must be **no** `/api/cases`, `/api/auth` or messaging entries. Only `justicelink-api-v1` with `legal-orgs` / `legal-alerts` may exist.
- [ ] Deploy a change with a new `CACHE_VERSION`, reload twice, and confirm the old `justicelink-…` cache disappears.

### Android Chrome
- [ ] Open the site in Chrome on a real phone (HTTPS). Within ~3 seconds the **Install JusticeLink** banner appears. Tap **Install** and confirm the native dialog.
- [ ] The icon on the home screen is the full-bleed navy scales icon (maskable). Open it: no browser bar.
- [ ] Reopen the site in Chrome: no banner, and *My Account* no longer offers **Install App**.
- [ ] To retest after dismissing: Chrome → Site settings → **Clear & reset**, or run `localStorage.clear()` in remote DevTools.

### iPhone Safari
- [ ] Open the site in **Safari** (iOS 16.4 or later is best). After ~5 seconds the banner appears. Tap **How to** and confirm the steps modal.
- [ ] Follow the steps (Share → Add to Home Screen → Add). The Home Screen icon has no black corners.
- [ ] Open from the Home Screen: no Safari toolbar; no banner, no **Install App** menu item.
- [ ] Open the link from inside Instagram or Facebook: the modal tells you to use Safari.
- [ ] Note: the installed iOS app has separate storage from Safari, so users sign in again once.

### APK
- [ ] On a phone, open `/download`: the Android card is highlighted with its instructions open, and the button shows the file size.
- [ ] Download, enable *Install unknown apps* for the browser, install, and open. The app appears as **JusticeLink**, with the right icon, and opens **full screen with no address bar** (if a bar shows, `assetlinks.json` is wrong or not yet cached by Android: see below).
- [ ] Test: login, a file upload (photo/PDF), the map's location prompt, camera if used, the Back button (goes back in the app, exits at the home page), and an external link (opens in the browser, not inside the app).
- [ ] Open `/download` on an iPhone: the iPhone card is first and highlighted. Open it on a desktop: both cards show, neither is highlighted.

**If the APK shows an address bar:** (1) `curl.exe -s https://justicelinkug.org/.well-known/assetlinks.json` must return the JSON; (2) the fingerprint inside must match `signing-key-info.txt` exactly; (3) uninstall the app, clear Chrome's data for the site, reinstall (Android caches the link verification).

---

## Known limits (so there are no surprises)

- **iOS cannot install APKs or any app from a website.** "Add to Home Screen" is the only route outside the App Store.
- **The APK needs Chrome installed** on the phone (almost all Android phones have it).
- **Play Protect warnings** are normal for apps installed outside the Play Store, and the instructions already tell users how to proceed.
- I could not open these pages in a real browser here, so please run the checklist above on one Android and one iPhone before announcing the app.
