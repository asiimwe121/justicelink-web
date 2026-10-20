(function () {
  'use strict';

  if (window.lcdjpMachineTranslate) return;

  var SUPPORTED = { lug: 1, ach: 1, teo: 1, lgg: 1, nyn: 1 };
  var ROLES = { Citizen: 1, Lawyer: 1 };
  var STORE_PREFIX = 'lcdjp_mt_v1_';
  var STORE_MAX_TEXT = 120;
  var STORE_MAX_ENTRIES = 1500;
  var BATCH_MAX_TEXTS = 25;
  var BATCH_MAX_CHARS = 6000;
  var MAX_TEXT_CHARS = 1800;
  var DEBOUNCE_MS = 200;
  var MAX_CONCURRENT = 2;
  var AI_MIN_ALNUM = 12;
  var AI_MAX_REPLIES = 80;
  var FAIL_BACKOFF_MS = 5 * 60 * 1000;
  var ATTRS = ['placeholder', 'title', 'aria-label'];

  // Never translated: code, form fields, anything marked notranslate, the person's own chat
  // bubbles, and AI responses (marked data-ai-response once they are recognised).
  var SKIP_SELECTOR = [
    'script', 'style', 'noscript', 'textarea', 'code', 'pre', 'svg', 'canvas', 'iframe',
    'select', 'option', '[contenteditable=""]', '[contenteditable="true"]',
    '.notranslate', '[translate="no"]', '[data-ai-response]', '.ai-bubble.user',
    '[class*="user-name"],[class*="username"],[class*="full-name"],[class*="fullname"],[class*="display-name"],[class*="person-name"]',
    '[class*="user_name"],[class*="full_name"],[class*="display_name"],[id*="UserName"],[id*="Username"],[id*="FullName"],[id*="DisplayName"]'
  ].join(',');

  var nodeInfo = new WeakMap();
  var attrInfo = new WeakMap();
  var touchedText = new Set();
  var touchedAttrs = new Set();

  var memCache = {};
  var storeLoaded = {};
  var failed = {};
  var pending = new Map();
  var inflight = 0;
  var pausedUntil = 0;
  var unavailableUntil = 0;
  var scanTimer = null;
  var scanRoots = new Set();
  var storeTimer = null;

  var aiReplies = [];
  var aiPending = new Set();

  function now() { return Date.now(); }

  function currentLang() {
    return sessionStorage.getItem('lcdjp_language') || 'en';
  }

  function currentRole() {
    return localStorage.getItem('lcdjp_userlevel') ||
      sessionStorage.getItem('lcdjp_userlevel') ||
      sessionStorage.getItem('role') || '';
  }

  function canApply() {
    return !!SUPPORTED[currentLang()] && !!ROLES[currentRole()];
  }

  function canRequest() {
    return canApply() && now() >= pausedUntil && now() >= unavailableUntil;
  }

  function normal(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function alnum(value) {
    return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  }

  // ---------------------------------------------------------------- dictionary

  var dictState = { lang: null, source: null, data: null };

  function dictionaryFor(lang) {
    if (typeof translations === 'undefined' || !translations.en) return null;
    var table = translations[lang];
    if (!table) return null;
    if (dictState.lang === lang && dictState.source === table) return dictState.data;
    var en = translations.en;
    var reverse = {};
    var targets = {};
    Object.keys(en).forEach(function (key) {
      var source = normal(en[key]);
      if (source && !Object.prototype.hasOwnProperty.call(reverse, source)) reverse[source] = key;
      var target = normal(table[key]);
      if (target && target !== source) targets[target] = true;
    });
    dictState = { lang: lang, source: table, data: { t: table, reverse: reverse, targets: targets } };
    return dictState.data;
  }

  // --------------------------------------------------------------------- cache

  function loadStore(lang) {
    if (storeLoaded[lang]) return;
    storeLoaded[lang] = true;
    memCache[lang] = memCache[lang] || new Map();
    try {
      var raw = sessionStorage.getItem(STORE_PREFIX + lang);
      if (!raw) return;
      var obj = JSON.parse(raw);
      Object.keys(obj).forEach(function (k) { memCache[lang].set(k, obj[k]); });
    } catch (e) { /* ignore a corrupt store */ }
  }

  function cacheGet(lang, text) {
    loadStore(lang);
    return memCache[lang].get(text);
  }

  function cacheSet(lang, text, value) {
    loadStore(lang);
    memCache[lang].set(text, value);
    if (text.length <= STORE_MAX_TEXT) scheduleStoreSave(lang);
  }

  // Only short interface strings are kept in sessionStorage; longer text (which may be a person's
  // case details) stays in memory and disappears when the page reloads.
  function scheduleStoreSave(lang) {
    if (storeTimer) return;
    storeTimer = setTimeout(function () {
      storeTimer = null;
      try {
        var out = {};
        var keep = [];
        memCache[lang].forEach(function (v, k) { if (k.length <= STORE_MAX_TEXT) keep.push(k); });
        keep.slice(-STORE_MAX_ENTRIES).forEach(function (k) { out[k] = memCache[lang].get(k); });
        sessionStorage.setItem(STORE_PREFIX + lang, JSON.stringify(out));
      } catch (e) { /* storage full or unavailable */ }
    }, 1000);
  }

  function failKey(lang, text) { return lang + '|' + text; }
  function isFailed(lang, text) {
    var until = failed[failKey(lang, text)];
    return !!until && until > now();
  }
  function markFailed(lang, text) { failed[failKey(lang, text)] = now() + FAIL_BACKOFF_MS; }

  // ------------------------------------------------------------- what to translate

  function shouldTry(s) {
    if (s.length < 2 || s.length > MAX_TEXT_CHARS) return false;
    var letters = s.match(/[A-Za-z]/g);
    if (!letters || letters.length < 2) return false;
    var digits = s.match(/\d/g);
    if (digits && letters.length <= digits.length) return false;
    if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(s)) return false;
    if (/^(https?:\/\/|www\.)\S+$/i.test(s)) return false;
    if (/^@\w[\w.]*$/.test(s)) return false;
    if (/^[A-Z0-9][A-Z0-9_\-\/#.:]*$/.test(s) && /\d/.test(s)) return false;
    if (/^[A-Z]{1,6}$/.test(s)) return false;
    if (/^n\/a$/i.test(s)) return false;
    if (/\$\{|\{\{|\}\}/.test(s)) return false;
    return true;
  }

  // --------------------------------------------------------------- AI responses

  function collectStrings(value, out, depth) {
    if (depth > 6 || value == null) return;
    if (typeof value === 'string') {
      var a = alnum(value);
      if (a.length >= AI_MIN_ALNUM) out.push(a);
    } else if (Array.isArray(value)) {
      value.forEach(function (v) { collectStrings(v, out, depth + 1); });
    } else if (typeof value === 'object') {
      Object.keys(value).forEach(function (k) { collectStrings(value[k], out, depth + 1); });
    }
  }

  function registerAi(strings) {
    strings.forEach(function (s) {
      if (aiReplies.indexOf(s) === -1) aiReplies.push(s);
    });
    while (aiReplies.length > AI_MAX_REPLIES) aiReplies.shift();
  }

  function aiMatch(a) {
    for (var i = 0; i < aiReplies.length; i++) {
      var r = aiReplies[i];
      if (r.indexOf(a) !== -1) return r;
      if (r.length >= 20 && a.indexOf(r) !== -1) return r;
    }
    return null;
  }

  function markAiContainer(node, reply) {
    var el = node.parentElement;
    if (!el) return;
    var best = el;
    while (el.parentElement && el.parentElement !== document.body &&
           el.parentElement !== document.documentElement) {
      var parentText = alnum(el.parentElement.textContent);
      if (parentText && reply.indexOf(parentText) !== -1) {
        el = el.parentElement;
        best = el;
      } else {
        break;
      }
    }
    best.setAttribute('data-ai-response', '1');
  }

  function installFetchHook() {
    var original = window.fetch;
    if (typeof original !== 'function' || original.__lcdjpMt) return;
    var hooked = function (input) {
      var promise = original.apply(this, arguments);
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/\/api\/ai\//.test(url) && promise && typeof promise.then === 'function') {
          var tracker = promise.then(function (resp) {
            return resp.clone().json().then(function (data) {
              var found = [];
              collectStrings(data, found, 0);
              registerAi(found);
            });
          }).catch(function () { /* not JSON, nothing to register */ });
          aiPending.add(tracker);
          tracker.then(function () { aiPending.delete(tracker); });
        }
      } catch (e) { /* never break the app's own request */ }
      return promise;
    };
    hooked.__lcdjpMt = true;
    window.fetch = hooked;
  }

  function waitForAi() {
    return aiPending.size ? Promise.all(Array.from(aiPending)) : Promise.resolve();
  }

  // ------------------------------------------------------------------ applying

  function setText(node, core) {
    var value = node.nodeValue;
    var lead = value.match(/^\s*/)[0];
    var trail = value.match(/\s*$/)[0];
    var info = nodeInfo.get(node);
    if (!info || value !== info.applied) info = { orig: value };
    info.applied = lead + core + trail;
    nodeInfo.set(node, info);
    node.nodeValue = info.applied;
    touchedText.add(node);
  }

  function setAttr(el, attr, core) {
    var value = el.getAttribute(attr) || '';
    var lead = value.match(/^\s*/)[0];
    var trail = value.match(/\s*$/)[0];
    var map = attrInfo.get(el) || {};
    var info = map[attr];
    if (!info || value !== info.applied) info = { orig: value };
    info.applied = lead + core + trail;
    map[attr] = info;
    attrInfo.set(el, map);
    el.setAttribute(attr, info.applied);
    touchedAttrs.add(el);
  }

  function restoreAll() {
    touchedText.forEach(function (node) {
      var info = nodeInfo.get(node);
      if (info && node.nodeValue === info.applied) node.nodeValue = info.orig;
      nodeInfo.delete(node);
    });
    touchedText.clear();
    touchedAttrs.forEach(function (el) {
      var map = attrInfo.get(el) || {};
      Object.keys(map).forEach(function (attr) {
        if ((el.getAttribute(attr) || '') === map[attr].applied) el.setAttribute(attr, map[attr].orig);
      });
      attrInfo.delete(el);
    });
    touchedAttrs.clear();
    pending.clear();
  }

  function applyTarget(lang, core, translated, target) {
    if (currentLang() !== lang || !canApply()) return;
    if (target.kind === 'text') {
      var node = target.node;
      if (!node.isConnected || clean(node.nodeValue) !== core) return;
      if (node.parentElement && node.parentElement.closest('[data-ai-response]')) return;
      setText(node, translated);
    } else {
      var el = target.el;
      if (!el.isConnected || clean(el.getAttribute(target.attr)) !== core) return;
      if (el.closest('[data-ai-response]')) return;
      setAttr(el, target.attr, translated);
    }
  }

  // ------------------------------------------------------------------- scanning

  function enqueue(lang, core, target) {
    var key = lang + '|' + core;
    var entry = pending.get(key);
    if (!entry) {
      entry = { lang: lang, core: core, targets: [] };
      pending.set(key, entry);
    }
    entry.targets.push(target);
  }

  function handleValue(lang, dict, core, target) {
    if (!shouldTry(core)) return;
    var n = normal(core);
    if (dict && dict.targets[n]) return;
    var key = dict && dict.reverse[n];
    if (key && dict.t[key] && normal(dict.t[key]) !== n) {
      applyTarget(lang, core, dict.t[key], target);
      return;
    }
    var cached = cacheGet(lang, core);
    if (cached) {
      applyTarget(lang, core, cached, target);
      return;
    }
    if (isFailed(lang, core)) return;
    enqueue(lang, core, target);
  }

  function collectTargets(root, textNodes, attrTargets) {
    if (root.nodeType === 3) {
      textNodes.push(root);
      return;
    }
    if (root.nodeType !== 1) return;
    if (root.matches(SKIP_SELECTOR) || root.closest(SKIP_SELECTOR)) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) return n.matches(SKIP_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    function elementAttrs(el) {
      ATTRS.forEach(function (attr) {
        if (el.hasAttribute(attr)) attrTargets.push({ el: el, attr: attr });
      });
    }
    elementAttrs(root);
    var walkerNode;
    var seen = new Set();
    // The walker skips elements, so attributes are gathered with a separate element query.
    while ((walkerNode = walker.nextNode())) textNodes.push(walkerNode);
    root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(function (el) {
      if (seen.has(el) || el.closest(SKIP_SELECTOR)) return;
      seen.add(el);
      elementAttrs(el);
    });
  }

  function scan(root) {
    if (!canApply()) {
      if (touchedText.size || touchedAttrs.size) restoreAll();
      return;
    }
    var lang = currentLang();
    loadStore(lang);
    var dict = dictionaryFor(lang);
    var textNodes = [];
    var attrTargets = [];
    collectTargets(root, textNodes, attrTargets);

    // Pass 1: spot AI replies first, so even their short formatted fragments stay untouched.
    textNodes.forEach(function (node) {
      var a = alnum(node.nodeValue);
      if (a.length < AI_MIN_ALNUM) return;
      var reply = aiMatch(a);
      if (reply) markAiContainer(node, reply);
    });

    textNodes.forEach(function (node) {
      if (!node.parentElement || node.parentElement.closest(SKIP_SELECTOR)) return;
      var info = nodeInfo.get(node);
      if (info && node.nodeValue === info.applied) return;
      if (info) { nodeInfo.delete(node); touchedText.delete(node); }
      handleValue(lang, dict, clean(node.nodeValue), { kind: 'text', node: node });
    });

    attrTargets.forEach(function (t) {
      var map = attrInfo.get(t.el);
      var value = t.el.getAttribute(t.attr) || '';
      if (map && map[t.attr] && value === map[t.attr].applied) return;
      handleValue(lang, dict, clean(value), { kind: 'attr', el: t.el, attr: t.attr });
    });
  }

  // -------------------------------------------------------------------- network

  function endpoint() {
    if (typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.translate) return API_ENDPOINTS.translate;
    var base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
    return base + '/api/translate';
  }

  function makeBatches(entries) {
    var batches = [];
    var current = [];
    var chars = 0;
    entries.forEach(function (entry) {
      if (current.length && (current.length >= BATCH_MAX_TEXTS || chars + entry.core.length > BATCH_MAX_CHARS)) {
        batches.push(current);
        current = [];
        chars = 0;
      }
      current.push(entry);
      chars += entry.core.length;
    });
    if (current.length) batches.push(current);
    return batches;
  }

  var failStreak = 0;
  // Wait longer after each consecutive failure (15s, 30s, 60s ... up to 10 minutes).
  function backOff() {
    failStreak = Math.min(failStreak + 1, 6);
    pausedUntil = now() + Math.min(15000 * Math.pow(2, failStreak - 1), 10 * 60 * 1000);
  }

  function sendBatch(lang, entries) {
    var fetcher = window.authFetch || window.fetch;
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 25000) : null;
    return Promise.resolve().then(function () {
      return fetcher(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: entries.map(function (e) { return e.core; }), target: lang }),
        suppressAuthRedirect: true, // a failed translation must never sign the person out
        signal: ctrl ? ctrl.signal : undefined
      });
    }).then(function (resp) {
      if (timer) clearTimeout(timer);
      if (resp.status === 503) { unavailableUntil = now() + 10 * 60 * 1000; return null; }
      if (resp.status === 401 || resp.status === 403) { pausedUntil = now() + 60 * 1000; return null; }
      if (resp.status === 429) { pausedUntil = now() + 45 * 1000; return null; }
      if (!resp.ok) { backOff(); return null; }
      failStreak = 0;
      return resp.json();
    }).then(function (data) {
      if (!data) return;
      var list = data.translations || [];
      entries.forEach(function (entry, i) {
        var value = list[i];
        if (typeof value === 'string' && value.trim()) {
          value = value.trim();
          cacheSet(lang, entry.core, value);
          entry.targets.forEach(function (t) { applyTarget(lang, entry.core, value, t); });
        } else {
          markFailed(lang, entry.core);
        }
      });
    }).catch(function () {
      if (timer) clearTimeout(timer);
      backOff();
    });
  }

  function flush() {
    return waitForAi().then(function () {
      if (!pending.size) return;
      var lang = currentLang();
      var entries = [];
      pending.forEach(function (entry) { if (entry.lang === lang) entries.push(entry); });
      pending.clear();
      if (!entries.length) return;
      if (!canRequest()) {
        var delay = Math.max(pausedUntil, unavailableUntil) - now();
        if (canApply() && delay > 0) setTimeout(function () { schedule(document.body); }, delay + 50);
        return;
      }
      var queue = makeBatches(entries);
      function worker() {
        var batch = queue.shift();
        if (!batch) return Promise.resolve();
        inflight++;
        return sendBatch(lang, batch).then(function () { inflight--; return worker(); });
      }
      var workers = [];
      for (var i = 0; i < MAX_CONCURRENT; i++) workers.push(worker());
      return Promise.all(workers);
    });
  }

  function schedule(root) {
    if (root) scanRoots.add(root);
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      var roots = Array.from(scanRoots);
      scanRoots.clear();
      var body = document.body;
      if (!body) return;
      if (roots.length > 50 || roots.indexOf(body) !== -1) roots = [body];
      roots.forEach(function (r) { if (r.isConnected) scan(r); });
      flush();
    }, DEBOUNCE_MS);
  }

  function onLanguageChange() {
    restoreAll();
    failed = {};
    schedule(document.body);
  }

  function installObserver() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    var observer = new MutationObserver(function (records) {
      if (!canApply() && !touchedText.size && !touchedAttrs.size) return;
      records.forEach(function (rec) {
        if (rec.type === 'childList') {
          rec.addedNodes.forEach(function (n) { if (n.nodeType === 1 || n.nodeType === 3) schedule(n); });
        } else if (rec.type === 'characterData') {
          var info = nodeInfo.get(rec.target);
          if (!info || rec.target.nodeValue !== info.applied) schedule(rec.target);
        } else if (rec.type === 'attributes') {
          schedule(rec.target);
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS
    });
  }

  function hookTranslatePage() {
    var previous = window.translatePage;
    window.translatePage = function () {
      var result = typeof previous === 'function' ? previous.apply(this, arguments) : undefined;
      onLanguageChange();
      return result;
    };
  }

  function start() {
    installFetchHook();
    hookTranslatePage();
    installObserver();
    schedule(document.body);
  }

  window.lcdjpMachineTranslate = {
    rescan: function () { schedule(document.body); return flush(); },
    restore: restoreAll,
    registerAiText: function (text) { registerAi([alnum(text)]); },
    _flush: flush
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
