# JusticeLink Uganda — static/ notes

All comments were stripped from the files in `static/` (JS, CSS, HTML) to
reduce page weight. Most of what was removed was routine — but a handful of
comments existed specifically to stop someone from re-introducing a bug that
had already been found and fixed once. Those are preserved here so that
context isn't lost.

If you're about to touch any of the code below, read the matching note
first.

---

## `lawyer.js` — most of the file is deliberately gone, and two lines must stay

This file used to hold ~77 lawyer-dashboard functions. `messaging.js`
(loaded right after it) defines newer copies of 76 of them, and since both
are plain global `<script>` tags, `messaging.js`'s versions silently
overwrite these at load time — so those 76 were dead code: parsed on every
page load, never actually executed. They were removed.

Two things in this trimmed file are **not** dead and must not be deleted:

1. **`updateLawyerStatistics()`** — `messaging.js` and `analytics.js` both
   call this, but neither defines it. It's intentionally a no-op. Without
   it, calling it throws `"updateLawyerStatistics is not defined"` on
   login. (The actual stats work — total/active/resolved case counts — is
   done by `messaging.js`'s `updateLawyerDashboardCases()`, which every
   caller of `updateLawyerStatistics()` already calls alongside it.)
2. **`let _lawyerSearchDebounceTimer = null;`** — `messaging.js`'s
   `updateLawyerDashboardCasesDebounced()` uses this but doesn't redeclare
   it. Top-level `let` is shared across `<script>` tags on one page;
   redeclaring it there previously threw `"Identifier has already been
   declared"` and broke that script's parse entirely. It's declared here
   because `lawyer.js` loads first.

## `utils.js` — `_lcdjpSensitiveCaseAccessAllowed()` must live in the first module

Kept in the first global module deliberately: the generated desktop
dashboard and map modules execute in separate wrappers and must not rely on
a private helper defined inside either one of them.

## `dashboard.js` — notifications-panel close must trigger the panel's own close button

`mobileLawyerNotifications()` / `mobileAdminNotifications()` (in
`reports.js` / `systemAdmin.js`) don't build their own notifications
markup — they *move* the real `#lawyerNotificationsPage` /
`#adminNotificationsPage` node into a wrapper panel, remembering its
original spot so their own close button can put it back.

Opening a case from inside that panel and closing it from the case view
used to skip that restore step: `showLawyerDashboard()` / `showAdminHome()`
call `hideAllDashboardViews()`, which finds the moved page (it still
matches `.dashboard-view` wherever it lives) and sets its `display` to
`none` — but the wrapper panel itself, and the emptied page still nested
inside it, were never removed or restored, leaving a blank "Notifications"
shell behind in `#contentArea`.

Fix: trigger the panel's own close button (instead of just removing the
panel), so its existing restore-to-original-parent logic runs and the
notifications page is available again next time, rather than being deleted
along with the wrapper.

## `dashboard.js` — desktop page header close button: do not assign `close` directly

```js
if (headerCloseBtn) headerCloseBtn.onclick = function () { close(); };
```

This wrapper is required. `headerCloseBtn.onclick = close` (assigning the
function directly) makes the browser invoke it as `close(clickEvent)`, and
the `MouseEvent` then gets read as the `skipShowHome` argument. Since any
object is truthy, `closePage()`'s `if (skipShowHome) return;` fired on
every click of this button, silently skipping the
`showAdminHome()`/`showHome()` call and leaving the admin dashboard (or
citizen home) hidden behind a blank page.

## `verification.js` — submit request needs its abort timeout

```js
var _idvSubmitController = new AbortController();
var _idvSubmitTimeout = setTimeout(function() { _idvSubmitController.abort(); }, 30000);
```

A slow/dropped mobile connection must not hang forever with no feedback —
this gives the verification submit request a 30s ceiling and aborts
cleanly past it. Don't remove the controller/timeout when touching this
function.

## `verification.js` — rejected submissions must not be left showing "Pending"

A rejected submission (e.g. duplicate National ID, or missing required
documents) must not be silently left showing PENDING status client-side —
the person needs to see it was rejected and be able to correct it. Any
change to this error path needs to keep restoring/clearing
`lcdjp_verif_status` / `verificationStatus` correctly on failure.

## `auth.js` — District Admins must not get the Legal Alerts feature

`#adminNavExtras` is the System-Admin-only "Legal Alerts" link. It appears
in **two** places in `auth.js` (fresh login, and re-entering the dashboard
from a stored session) and must stay at its default `display:none` in
**both** for a District Admin — it's only shown in the System Admin
branch. If you're editing either DISTRICT_ADMIN branch, double check this
element isn't accidentally revealed.

## `auth.js` — mobile logout cleanup must not touch storage

```js
function _mobileCleanupOnLogout() {
    // Clean up DOM elements only - DO NOT touch stored auth/session keys
```

This function only removes DOM nodes. Auth/session storage keys are
cleared elsewhere in the logout flow — don't fold that logic in here.

## `registration.js` — district list must come from the local canonical array

`regGetDistricts()` intentionally always returns the local
`LCDJP_UGANDA_DISTRICTS` array, not a list sourced from another script.
Other app scripts may expose a partial district list for map or case
features, which must not be allowed to make the required registration
dropdown incomplete.

---

## New: LC account creation, LC location choice, and case referral flow

Four related additions were made across `config.js`, `districtAdmin.js`,
`systemAdmin.js`, `citizen.js`, and `dashboard.js`. None of these have a
backend in this bundle, so they're built to the same conventions already
used elsewhere (`authFetch`/`API_ENDPOINTS`, PUT-the-case-then-POST-a-
notification for state changes) and will need matching backend routes:

1. **LC account creation is District-Admin-first, System-Admin-fallback.**
   `districtAdmin.js` adds `showCreateLCForm()` (a "+ Create LC Account"
   button on the District Admin's Users page), which locks the district to
   the admin's own and posts to the new `API_ENDPOINTS.createLC`
   (`POST /api/lc/create`). `systemAdmin.js` adds
   `showCreateLCFallbackForm()` on User Management, which first calls
   `_saFindActiveDistrictAdmin(district)` — if an active District Admin
   already exists for that district, System Admin is blocked with a
   message naming that admin; only when none exists does it open the same
   creation form (tagged `createdBy: 'SYSTEM_ADMIN_FALLBACK'`). The backend
   must still enforce this server-side — the frontend gating is not a
   substitute for real authorization.

2. **Case filing now asks which LC location to use.** In `dashboard.js`,
   picking "Local Council (LC)" in the report-case assistant no longer
   files immediately. `_aiPromptLCLocationChoice()` asks the citizen to
   pick "current location" (reverse-resolved from GPS via the existing
   `findNearestDistrict()`, no network dependency) or "registered /
   verification address" (the district/village/parish/subCounty already
   cached in `sessionStorage` at login). The choice is stored in
   `_aiState.lcLocationOverride`/`lcLocationChoice` and
   `_aiBuildCasePayload()` prefers the override when present, falling back
   to the previous behaviour otherwise. Both new fields
   (`lcLocationChoice`, `lcLocationSource`) are also sent on the payload
   for the backend to log/use if useful.

3. **LC referral (notes + Refer button) is now implemented.**
   `showForwardRouterForm(caseId)` was previously called from the case
   detail view's "Forward Case" button but was never defined anywhere —
   it's now implemented in `citizen.js`. It requires a note before
   allowing referral, then `_lcSubmitReferral(caseId, target)` PUTs the
   case (`status: 'Awaiting Lawyer Selection'` for lawyer referrals so the
   existing lawyer-selection flow can be reused, or `'Referred to Police'`
   for police), locks messaging, appends to `previousHandlers`/`timeline`,
   and notifies the citizen (`type: 'case_referred'`) via
   `createEnhancedNotification()`. The citizen's notifications panel shows
   a "Choose New Handler" action for this type (wired into
   `loadCitizenNotifications()`, `getNotificationTypeLabel()`, and
   `dashboard.js`'s `_alertTitle` map) that opens
   `reopenReferredCase(caseId)` → `_reopenCaseWithChoice(caseId, choice)`,
   which resets the case and either reuses
   `showLawyerSelectionForDeclinedCase()` (for lawyer) or resets status to
   `'Pending'` with a new `routingChoice` (for LC/Police). Note: this app
   has no in-app Police role/dashboard anywhere — "refer to Police" can
   only notify the citizen and mark the case; it cannot hand the case to
   an in-app Police account because none exists.

4. If you add a real Police role/dashboard later, `_reopenCaseWithChoice`'s
   `'police'` branch and `_aiContactPlaceQueries['police']` are the two
   places that currently treat Police as "external contact only" and
   would need to change.

*Everything above was previously written directly in the source as code
comments. This file exists so that context survives the comment-stripping
pass — please keep it updated if you fix another non-obvious bug in these
files.*
