/*
 * JusticeLink PWA installer.
 *
 *  - registers /service-worker.js
 *  - Android / desktop Chrome & Edge: captures beforeinstallprompt and shows the native install dialog
 *  - iOS: shows a step-by-step "Add to Home Screen" guide (iOS has no programmatic install)
 *  - hides every install prompt once the app is installed / running standalone (also inside the Android APK)
 *  - keeps the old public API: window.JusticeLinkPWA and installPwaApp() (used by the "Install App" account-menu item)
 */
(function () {
  'use strict';

  var BANNER_PATHS = ['/', '/index.html'];          // pages that show the floating install banner
  var SNOOZE_DAYS = 14;                             // after "X" the banner stays away this long
  var KEY_SNOOZE = 'jl_pwa_snooze_until';
  var KEY_INSTALLED = 'jl_pwa_installed';

  var deferredPrompt = null;
  var bannerEl = null;
  var modalEl = null;
  var lastFocus = null;

  /* ---------- tiny safe storage (Safari private mode / blocked storage throws) ---------- */
  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* ignore */ }
    return null;
  }

  /* ---------- environment detection ---------- */
  var UA = window.navigator.userAgent || '';

  function isIos() {
    return /iphone|ipad|ipod/i.test(UA) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS reports as a Mac
  }

  function isAndroid() {
    return /android/i.test(UA);
  }

  // Facebook, Instagram, TikTok, LINE, Twitter, WeChat... their built-in browsers cannot install anything.
  function isInAppBrowser() {
    return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|Snapchat|MicroMessenger|TikTok|musical_ly|Pinterest|LinkedInApp/i.test(UA);
  }

  // On iOS only Safari is guaranteed to offer "Add to Home Screen".
  function isIosSafari() {
    return isIos() && !isInAppBrowser() && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(UA);
  }

  function isStandalone() {
    try {
      return window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.navigator.standalone === true ||
        (document.referrer || '').indexOf('android-app://') === 0;   // launched from the Android APK (TWA)
    } catch (e) {
      return window.navigator.standalone === true;
    }
  }

  function isInstalled() {
    return isStandalone() || store(KEY_INSTALLED) === '1';
  }

  function isMobile() {
    return isIos() || isAndroid();
  }

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then(function (reg) {
          // Look for a new version whenever the app comes back to the foreground (at most hourly).
          var last = Date.now();
          document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible' && Date.now() - last > 3600000) {
              last = Date.now();
              reg.update().catch(function () { /* offline */ });
            }
          });
        })
        .catch(function (err) {
          console.warn('[pwa] service worker registration failed:', err);
        });
    });
  }

  /* ---------- account-menu "Install App" item (exists in index.html) ---------- */
  function updateMenuItem() {
    var opt = document.getElementById('accountMenuInstallOpt');
    if (!opt) return;
    var show = !isInstalled() && (deferredPrompt !== null || isMobile());
    opt.style.display = show ? 'block' : 'none';
  }

  /* ---------- styles (injected so no CSS file has to change) ---------- */
  function injectStyles() {
    if (document.getElementById('jl-pwa-styles')) return;
    var css = '' +
      '.jl-pwa-banner{position:fixed;z-index:9000;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));' +
      'max-width:460px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:16px;' +
      'background:#0d2c5c;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35);font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;}' +
      '@media (min-width:768px){.jl-pwa-banner{left:auto;right:20px;bottom:20px;margin:0;width:400px}}' +
      '.jl-pwa-banner img{width:44px;height:44px;border-radius:10px;flex:none}' +
      '.jl-pwa-banner .jl-t{flex:1;min-width:0;line-height:1.25}' +
      '.jl-pwa-banner .jl-t b{display:block;font-size:15px}' +
      '.jl-pwa-banner .jl-t span{font-size:12.5px;color:#cfdcf2}' +
      '.jl-pwa-btn{background:linear-gradient(180deg,#ffe38a,#f0b93d);color:#0d2c5c;font-weight:800;font-size:14px;border:0;border-radius:999px;' +
      'padding:10px 16px;min-height:40px;cursor:pointer;flex:none;font-family:inherit}' +
      '.jl-pwa-x{background:transparent;border:0;color:#cfdcf2;font-size:22px;line-height:1;width:36px;height:36px;cursor:pointer;flex:none;border-radius:50%}' +
      '.jl-pwa-btn:focus-visible,.jl-pwa-x:focus-visible,.jl-pwa-close:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
      '.jl-pwa-overlay{position:fixed;inset:0;z-index:100001;background:rgba(7,16,38,.6);display:flex;align-items:flex-end;justify-content:center;' +
      'font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}' +
      '@media (min-width:600px){.jl-pwa-overlay{align-items:center}}' +
      '.jl-pwa-modal{background:#fff;color:#16213e;width:100%;max-width:440px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;' +
      'padding:22px 20px calc(22px + env(safe-area-inset-bottom,0px))}' +
      '@media (min-width:600px){.jl-pwa-modal{border-radius:20px}}' +
      'html[data-theme="dark"] .jl-pwa-modal{background:#1a1d2b;color:#e8eaf2}' +
      '.jl-pwa-modal h2{margin:0 0 6px;font-size:20px}' +
      '.jl-pwa-modal p{margin:0 0 14px;font-size:14.5px;line-height:1.5}' +
      '.jl-pwa-modal ol{list-style:none;margin:0 0 16px;padding:0}' +
      '.jl-pwa-modal li{display:flex;gap:12px;align-items:flex-start;padding:10px 0;font-size:15px;line-height:1.4}' +
      '.jl-pwa-modal li+li{border-top:1px solid rgba(120,130,160,.25)}' +
      '.jl-pwa-ico{flex:none;width:38px;height:38px;border-radius:10px;background:#eef3fb;color:#1d4d91;display:flex;align-items:center;justify-content:center}' +
      'html[data-theme="dark"] .jl-pwa-ico{background:#232636;color:#9fc0ff}' +
      '.jl-pwa-ico svg{width:22px;height:22px}' +
      '.jl-pwa-note{background:#fff7e0;color:#5b4300;border-radius:10px;padding:10px 12px;font-size:13.5px;margin:0 0 14px}' +
      'html[data-theme="dark"] .jl-pwa-note{background:#3a3220;color:#ffe9a8}' +
      '.jl-pwa-close{width:100%;background:#1d4d91;color:#fff;font-weight:700;font-size:15px;border:0;border-radius:12px;padding:12px;min-height:46px;cursor:pointer;font-family:inherit}' +
      '.jl-pwa-link{display:block;text-align:center;margin-top:12px;font-size:14px;color:#1d4d91}' +
      'html[data-theme="dark"] .jl-pwa-link{color:#9fc0ff}';
    var style = document.createElement('style');
    style.id = 'jl-pwa-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- inline icons (no image files needed) ---------- */
  var ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
  var ICON_ADD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
  var ICON_MENU = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
  var ICON_SAFARI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>';

  function step(icon, html) {
    return '<li><span class="jl-pwa-ico">' + icon + '</span><span>' + html + '</span></li>';
  }

  /* ---------- help modal ---------- */
  function closeModal() {
    if (!modalEl) return;
    document.removeEventListener('keydown', onModalKey, true);
    modalEl.parentNode && modalEl.parentNode.removeChild(modalEl);
    modalEl = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  }

  function onModalKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
  }

  function copyLink(btn) {
    var done = function () { btn.textContent = 'Link copied'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('https://justicelinkug.org/').then(done, function () { window.prompt('Copy this link:', 'https://justicelinkug.org/'); });
    } else {
      window.prompt('Copy this link:', 'https://justicelinkug.org/');
    }
  }

  function showInstallHelp() {
    injectStyles();
    closeModal();
    lastFocus = document.activeElement;

    var title = 'Install JusticeLink';
    var intro = '';
    var steps = '';
    var note = '';

    if (isIos()) {
      if (!isIosSafari()) {
        note = '<div class="jl-pwa-note">' + (isInAppBrowser()
          ? 'This in-app browser can\u2019t install apps. '
          : 'For the most reliable result, use Safari. ') +
          'Open <b>justicelinkug.org</b> in <b>Safari</b> first, then follow the steps below.</div>' +
          '<button type="button" class="jl-pwa-close" id="jlCopyLink" style="margin-bottom:14px;background:#eef3fb;color:#1d4d91">Copy link to open in Safari</button>';
      }
      intro = 'Add JusticeLink to your Home Screen to open it like an app.';
      steps =
        step(ICON_SHARE, 'Tap the <b>Share</b> button in Safari\u2019s toolbar (at the bottom on iPhone, top right on iPad).') +
        step(ICON_ADD, 'Scroll down and tap <b>Add to Home Screen</b>.') +
        step(ICON_CHECK, 'Tap <b>Add</b> in the top-right corner. JusticeLink now appears on your Home Screen.');
    } else {
      var inApp = isInAppBrowser();
      intro = 'Add JusticeLink to your home screen to open it like an app.';
      if (inApp) {
        note = '<div class="jl-pwa-note">This in-app browser can\u2019t install apps. Open <b>justicelinkug.org</b> in <b>Chrome</b> first.</div>';
      }
      steps =
        step(ICON_MENU, 'Open your browser menu (<b>\u22EE</b> in Chrome, top right).') +
        step(ICON_ADD, 'Tap <b>Install app</b> (or <b>Add to Home screen</b>).') +
        step(ICON_CHECK, 'Confirm with <b>Install</b>. JusticeLink now appears with your other apps.');
    }

    var html = '<div class="jl-pwa-overlay" id="jlPwaOverlay"><div class="jl-pwa-modal" role="dialog" aria-modal="true" aria-labelledby="jlPwaTitle">' +
      '<h2 id="jlPwaTitle">' + title + '</h2><p>' + intro + '</p>' + note + '<ol>' + steps + '</ol>' +
      '<button type="button" class="jl-pwa-close" id="jlPwaDone">Got it</button>' +
      (isAndroid() ? '<a class="jl-pwa-link" href="/download.html">Prefer an APK file? Get the Android app</a>' : '') +
      '</div></div>';

    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    modalEl = wrap.firstChild;
    document.body.appendChild(modalEl);

    modalEl.addEventListener('click', function (e) { if (e.target === modalEl) closeModal(); });
    document.getElementById('jlPwaDone').addEventListener('click', closeModal);
    var copyBtn = document.getElementById('jlCopyLink');
    if (copyBtn) copyBtn.addEventListener('click', function () { copyLink(copyBtn); });
    document.addEventListener('keydown', onModalKey, true);
    document.getElementById('jlPwaDone').focus();
  }

  /* ---------- install flow ---------- */
  function promptInstall() {
    if (!deferredPrompt) return Promise.resolve({ outcome: 'unavailable' });
    var evt = deferredPrompt;
    deferredPrompt = null;                        // a captured prompt can only be used once
    evt.prompt();
    return evt.userChoice.then(function (choice) {
      if (choice && choice.outcome === 'accepted') {
        store(KEY_INSTALLED, '1');
      } else {
        snooze();
      }
      removeBanner();
      updateMenuItem();
      return choice;
    });
  }

  // Single entry point for every "Install" button on the site.
  function installApp() {
    if (isStandalone()) return;                   // already running as an app
    if (isIos()) { showInstallHelp(); return; }
    if (deferredPrompt) { promptInstall(); return; }
    showInstallHelp();                            // Android without a captured prompt: manual steps
  }

  /* ---------- banner ---------- */
  function snooze() {
    store(KEY_SNOOZE, String(Date.now() + SNOOZE_DAYS * 86400000));
  }

  function isSnoozed() {
    var until = parseInt(store(KEY_SNOOZE) || '0', 10);
    return until && Date.now() < until;
  }

  function removeBanner() {
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    bannerEl = null;
  }

  function bannerAllowedHere() {
    var p = window.location.pathname;
    return BANNER_PATHS.indexOf(p) !== -1;
  }

  function showBanner() {
    if (bannerEl || isInstalled() || isSnoozed() || !bannerAllowedHere()) return;
    if (!isIos() && !deferredPrompt) return;      // nothing useful to offer yet
    if (isIos() && isInAppBrowser()) return;      // let people reach Safari on their own
    injectStyles();

    bannerEl = document.createElement('div');
    bannerEl.className = 'jl-pwa-banner';
    bannerEl.setAttribute('role', 'region');
    bannerEl.setAttribute('aria-label', 'Install JusticeLink');
    bannerEl.innerHTML =
      '<img src="/images/justicelink-icon-192.png" alt="" width="44" height="44">' +
      '<div class="jl-t"><b>Install JusticeLink</b><span>Open it from your home screen, like an app.</span></div>' +
      '<button type="button" class="jl-pwa-btn" id="jlBannerInstall">' + (isIos() ? 'How to' : 'Install') + '</button>' +
      '<button type="button" class="jl-pwa-x" id="jlBannerClose" aria-label="Dismiss">\u00D7</button>';
    document.body.appendChild(bannerEl);

    document.getElementById('jlBannerInstall').addEventListener('click', function () {
      installApp();
      if (isIos()) { snooze(); removeBanner(); }
    });
    document.getElementById('jlBannerClose').addEventListener('click', function () {
      snooze();
      removeBanner();
    });
  }

  /* ---------- events ---------- */
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();                       // we show our own UI; the event is replayed with prompt()
    deferredPrompt = event;
    updateMenuItem();
    window.setTimeout(showBanner, 2500);
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    store(KEY_INSTALLED, '1');
    removeBanner();
    closeModal();
    updateMenuItem();
  });

  try {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', function () {
      if (isStandalone()) { removeBanner(); updateMenuItem(); }
    });
  } catch (e) { /* older Safari */ }

  document.addEventListener('DOMContentLoaded', function () {
    updateMenuItem();
    if (isIos() && !isStandalone()) window.setTimeout(showBanner, 5000);
  });

  /* ---------- public API (kept compatible with the previous pwa.js) ---------- */
  window.JusticeLinkPWA = {
    isIos: isIos,
    isAndroid: isAndroid,
    isStandalone: isStandalone,
    isInstalled: isInstalled,
    canPromptInstall: function () { return deferredPrompt !== null; },
    promptInstall: promptInstall,
    showInstallHelp: showInstallHelp,
    install: installApp
  };

  window.installPwaApp = installApp;
})();
