/*
 * JusticeLink quick exit.
 *
 * A fixed button on every page (and pressing Escape three times quickly) that immediately:
 *   1. blanks the screen,
 *   2. ends the session: asks the server to revoke the token and clears the login and profile
 *      data kept in this browser,
 *   3. replaces the current page with a neutral website.
 *
 * Unsent offline case drafts are NOT deleted, so a survivor does not lose what they wrote.
 * They stay on the device scoped to the account and can only be opened after logging in again.
 *
 * Limits: a browser cannot erase earlier entries of its own history. This button helps against
 * someone glancing at the screen. It does not hide that the site was visited.
 */
(function () {
  'use strict';

  var NEUTRAL_URL = 'https://www.google.com/';
  var KEEP_KEYS = { lcdjp_theme: true, lcdjp_lang: true };
  var ESC_PRESSES = 3;
  var ESC_WINDOW_MS = 1500;
  var exiting = false;
  var escTimes = [];
  // The floating red button is hidden. Set to true to show it again. Pressing Escape three times
  // quickly still triggers the exit either way.
  var SHOW_BUTTON = false;

  function clearStorage(storage) {
    try {
      var drop = [];
      for (var i = 0; i < storage.length; i++) {
        var k = storage.key(i);
        if (!k || KEEP_KEYS[k]) continue;
        if (/^lcdjp_/.test(k) || /^(jwtToken|userRole|username|userDistrict|fullName|userType|isOrganization|verificationStatus|approvalStatus|role)$/.test(k)) {
          drop.push(k);
        }
      }
      drop.forEach(function (k) { storage.removeItem(k); });
    } catch (e) { /* storage may be blocked */ }
  }

  function revokeSession() {
    // The login cookie is HttpOnly, so the page cannot tell whether one exists: always ask the server to
    // end the session (it blacklists the cookie's token and clears the cookie). Harmless when signed out.
    var base = (typeof window.API_BASE_URL === 'string') ? window.API_BASE_URL : '';
    try {
      // keepalive lets the request finish even though the page is about to be replaced
      fetch(base + '/api/auth/logout', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: base ? 'include' : 'same-origin',
        keepalive: true,
        suppressAuthRedirect: true
      }).catch(function () {});
    } catch (e) {}
  }

  function exit() {
    if (exiting) return;
    exiting = true;
    try { document.documentElement.style.visibility = 'hidden'; } catch (e) {}
    revokeSession();
    clearStorage(sessionStorage);
    clearStorage(localStorage);
    try { window.location.replace(NEUTRAL_URL); } catch (e) { window.location.href = NEUTRAL_URL; }
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    var now = Date.now();
    escTimes = escTimes.filter(function (t) { return now - t < ESC_WINDOW_MS; });
    escTimes.push(now);
    if (escTimes.length >= ESC_PRESSES) exit();
  }

  function mount() {
    if (!SHOW_BUTTON) return;
    if (document.getElementById('jlQuickExit')) return;
    var style = document.createElement('style');
    style.textContent =
      '#jlQuickExit{position:fixed;top:8px;right:8px;z-index:99999;padding:7px 12px;border:2px solid #fff;border-radius:999px;' +
      'background:#b71c1c;color:#fff;font:700 13px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35)}' +
      '#jlQuickExit:focus-visible{outline:3px solid #ffb300;outline-offset:2px}';
    document.head.appendChild(style);
    var btn = document.createElement('button');
    btn.id = 'jlQuickExit';
    btn.type = 'button';
    btn.textContent = 'Quick exit';
    btn.setAttribute('aria-label', 'Quick exit: leave this site immediately. You can also press Escape three times.');
    btn.addEventListener('click', exit);
    document.body.appendChild(btn);
  }

  document.addEventListener('keydown', onKey);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  window.JusticeLinkQuickExit = { exit: exit };
})();
