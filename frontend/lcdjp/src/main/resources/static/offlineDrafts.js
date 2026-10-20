/*
 * JusticeLink offline case drafting.
 *
 * Lets a citizen write a case with no connection (or a bad one), attach one photo or
 * document, and have it sent automatically once the connection returns.
 *
 *  - Drafts live in IndexedDB on this device, scoped to the signed-in username.
 *  - Photos are compressed on the device before they are stored or uploaded.
 *  - Every draft has a client-generated id sent as `clientDraftId`; the server returns the
 *    already-created case for a repeated id, so a retried sync can never create duplicates.
 *  - Drafts survive an expired login. They are only deleted when sent, deleted by the user,
 *    after 14 days, or when the user confirms a logout that would discard them.
 *
 * Public API: window.JusticeLinkDrafts
 */
(function () {
  'use strict';

  var DB_NAME = 'justicelink-drafts';
  var STORE = 'drafts';
  var MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var MAX_IMAGE_EDGE = 1280;
  var IMAGE_QUALITY = 0.7;
  var SUMMARY_MAX = 250;          // cases.description is VARCHAR(255)
  var DETAILS_MAX = 20000;        // matches CaseUpdateRequest.extraNotes
  var REQUEST_TIMEOUT_MS = 90000;

  var CASE_TYPES = [
    'Crime Report', 'Family Dispute', 'Land Matter', 'Boundary Dispute', 'Inheritance Dispute',
    'Marriage Dispute', 'Child Custody', 'Debt Recovery', 'Business Matter',
    'Community Disputes', 'Other Legal Matter'
  ];

  var state = {
    pendingCount: 0,          // drafts not yet delivered for the current user
    syncing: false,
    needsLogin: false,
    retryTimer: null,
    retryDelay: 30000,
    open: false,
    view: 'list',             // 'list' | 'form'
    editingId: null
  };

  /* ---------- small helpers ---------- */

  function currentUser() {
    try {
      return sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    } catch (e) { return ''; }
  }

  function store(key) {
    try { return sessionStorage.getItem(key) || localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
  }

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (kid) {
      if (kid == null) return;
      node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* ---------- IndexedDB ---------- */

  var dbPromise = null;
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('owner', 'owner', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { dbPromise = null; reject(req.error); };
    });
    return dbPromise;
  }

  function run(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var os = tx.objectStore(STORE);
        var result;
        try { result = fn(os); } catch (e) { reject(e); return; }
        tx.oncomplete = function () {
          resolve(result && 'result' in result ? result.result : undefined);
        };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error('Transaction aborted')); };
      });
    });
  }

  function putDraft(draft) {
    draft.updatedAt = Date.now();
    return run('readwrite', function (os) { return os.put(draft); }).then(function () {
      return refreshCount().then(function () { return draft; });
    });
  }

  function getDraft(id) {
    return run('readonly', function (os) { return os.get(id); });
  }

  function deleteDraft(id) {
    return run('readwrite', function (os) { return os.delete(id); }).then(refreshCount);
  }

  function listDrafts() {
    var owner = currentUser();
    if (!owner) return Promise.resolve([]);
    return run('readonly', function (os) { return os.index('owner').getAll(owner); })
      .then(function (rows) {
        return (rows || []).sort(function (a, b) { return b.updatedAt - a.updatedAt; });
      });
  }

  function purgeExpired() {
    return run('readonly', function (os) { return os.getAll(); }).then(function (rows) {
      var cutoff = Date.now() - MAX_AGE_MS;
      var stale = (rows || []).filter(function (r) { return (r.updatedAt || 0) < cutoff; });
      if (!stale.length) return null;
      return run('readwrite', function (os) { stale.forEach(function (r) { os.delete(r.id); }); });
    }).catch(function () {});
  }

  function purgeOwner(owner) {
    return run('readonly', function (os) { return os.index('owner').getAllKeys(owner); })
      .then(function (keys) {
        return run('readwrite', function (os) { (keys || []).forEach(function (k) { os.delete(k); }); });
      }).then(refreshCount).catch(function () {});
  }

  function refreshCount() {
    return listDrafts().then(function (rows) {
      state.pendingCount = rows.length;
      renderChrome();
      return rows;
    }).catch(function () { return []; });
  }

  /* ---------- image compression ---------- */

  function compressImage(file) {
    return new Promise(function (resolve) {
      if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) { resolve(file); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(w, h));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            if (!blob || blob.size >= file.size) { resolve(file); return; }
            var name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], name, { type: 'image/jpeg' }));
          }, 'image/jpeg', IMAGE_QUALITY);
        } catch (e) { URL.revokeObjectURL(url); resolve(file); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  /* ---------- building the request ---------- */

  function buildPayload(draft) {
    var base;
    if (draft.payload) {
      base = Object.assign({}, draft.payload);
    } else {
      var f = draft.fields || {};
      var loc = [f.village, f.parish, f.subCounty, f.district].filter(function (p) { return p && p.trim(); }).join(', ');
      base = {
        caseType: f.caseType || 'Other Legal Matter',
        citizenId: draft.owner,
        description: (f.summary || '').slice(0, SUMMARY_MAX),
        extraNotes: f.details || '',
        district: f.district || '',
        subCounty: f.subCounty || '',
        parish: f.parish || '',
        village: f.village || '',
        fullLocation: loc,
        citizenPhone: store('lcdjp_phone'),
        citizenEmail: store('lcdjp_email'),
        kinName: f.kinName || '',
        kinPhone: f.kinPhone || '',
        kinEmail: '',
        kinRelationship: f.kinRelationship || '',
        routingChoice: ''
      };
    }
    base.citizenId = draft.owner;
    base.clientDraftId = draft.id;
    if (!draft.file || !draft.file.blob) return Promise.resolve(base);
    return blobToDataUrl(draft.file.blob).then(function (dataUrl) {
      base.attachedMedia = draft.file.name;
      base.attachedFileData = dataUrl;
      base.attachedFileSize = draft.file.size;
      base.attachedFileType = draft.file.type;
      return base;
    });
  }

  /* ---------- sync ---------- */

  function endpoint() {
    return (window.API_ENDPOINTS && window.API_ENDPOINTS.aiCaseSubmit) ||
      ((window.API_BASE_URL || '') + '/api/cases');
  }

  function authHeaders() {
    if (typeof window.getAuthHeaders === 'function') return window.getAuthHeaders();
    return { 'Content-Type': 'application/json' };
  }

  function hasToken() {
    return typeof window.getAuthToken === 'function' ? !!window.getAuthToken() : true;
  }

  function sendOne(draft) {
    return buildPayload(draft).then(function (payload) {
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, REQUEST_TIMEOUT_MS) : null;
      return fetch(endpoint(), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
        suppressAuthRedirect: true,
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { status: res.status, ok: res.ok, body: body };
        });
      }, function (err) {
        if (timer) clearTimeout(timer);
        return { status: 0, ok: false, network: true, error: err };
      });
    });
  }

  function scheduleRetry() {
    if (state.retryTimer) return;
    state.retryTimer = setTimeout(function () {
      state.retryTimer = null;
      syncAll();
    }, state.retryDelay);
    state.retryDelay = Math.min(state.retryDelay * 2, 5 * 60 * 1000);
  }

  function syncAll() {
    if (state.syncing) return Promise.resolve();
    var owner = currentUser();
    if (!owner || !navigator.onLine) return Promise.resolve();
    if (!hasToken()) { state.needsLogin = true; renderChrome(); return Promise.resolve(); }

    state.syncing = true;
    renderChrome();
    var delivered = 0, retryLater = false;

    return listDrafts().then(function (rows) {
      var queue = rows.filter(function (d) { return d.status === 'queued'; });
      return queue.reduce(function (chain, draft) {
        return chain.then(function () {
          if (state.needsLogin) return null;
          return sendOne(draft).then(function (r) {
            if (r.ok && r.body && r.body.success) {
              delivered++;
              return deleteDraft(draft.id).then(function () {
                if (state.open) renderPanel();
              });
            }
            if (r.status === 401) { state.needsLogin = true; return null; }
            if (r.network || r.status === 0 || r.status === 408 || r.status === 429 || r.status >= 500) {
              retryLater = true;
              draft.attempts = (draft.attempts || 0) + 1;
              return putDraft(draft);
            }
            draft.status = 'failed';
            draft.error = (r.body && (r.body.error || r.body.message)) || ('The server rejected this case (' + r.status + ').');
            return putDraft(draft);
          });
        });
      }, Promise.resolve());
    }).catch(function () { retryLater = true; }).then(function () {
      state.syncing = false;
      if (delivered > 0) {
        state.needsLogin = false;
        state.retryDelay = 30000;
        toast(delivered === 1
          ? 'Your offline case was sent. Open My Cases to choose where it goes next.'
          : delivered + ' offline cases were sent. Open My Cases to choose where each one goes next.');
        if (typeof window._lcdjpRefreshCitizenCaseData === 'function') {
          try { window._lcdjpRefreshCitizenCaseData(); } catch (e) {}
        }
      }
      if (retryLater) scheduleRetry();
      return refreshCount().then(function () {
        if (state.open) renderPanel();
      });
    });
  }

  /* ---------- public save helpers ---------- */

  function saveFromPayload(payload) {
    var owner = currentUser();
    if (!owner) return Promise.reject(new Error('Not signed in'));
    var draft = {
      id: newId(), owner: owner, status: 'queued', payload: payload, file: null,
      createdAt: Date.now(), attempts: 0
    };
    // The AI intake keeps its attachment as a data URL inside the payload; the server takes it as is.
    return putDraft(draft).then(function (d) { scheduleRetry(); return d; });
  }

  /* ---------- styles ---------- */

  function injectStyles() {
    if (document.getElementById('jlOdStyles')) return;
    var css = [
      '.jl-od-fab{position:fixed;left:14px;bottom:14px;z-index:2500;display:none;align-items:center;gap:8px;',
      'padding:10px 14px;border:0;border-radius:999px;background:#1a237e;color:#fff;font:600 14px/1.2 system-ui,sans-serif;',
      'box-shadow:0 4px 14px rgba(0,0,0,.28);cursor:pointer}',
      '.jl-od-fab .jl-od-badge{background:#ffb300;color:#1a1a2e;border-radius:999px;min-width:20px;padding:1px 6px;font-size:12px;text-align:center}',
      '.jl-od-banner{position:fixed;left:0;right:0;top:0;z-index:2600;display:none;padding:8px 14px;background:#37474f;color:#fff;',
      'font:500 13px/1.35 system-ui,sans-serif;text-align:center}',
      '.jl-od-overlay{position:fixed;inset:0;z-index:2700;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}',
      '.jl-od-sheet{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:#fff;color:#1a1a2e;border-radius:18px 18px 0 0;',
      'padding:18px 18px 24px;font:15px/1.45 system-ui,sans-serif}',
      '@media(min-width:700px){.jl-od-overlay{align-items:center}.jl-od-sheet{border-radius:18px}}',
      'html[data-theme="dark"] .jl-od-sheet{background:#1e2233;color:#eef0f7}',
      '.jl-od-sheet h2{margin:0 0 4px;font-size:18px}',
      '.jl-od-sub{margin:0 0 12px;font-size:13px;opacity:.8}',
      '.jl-od-sos{background:#fdecea;color:#7f1d1d;border-radius:10px;padding:8px 10px;font-size:13px;margin:0 0 12px}',
      'html[data-theme="dark"] .jl-od-sos{background:#3b1d1d;color:#ffd7d7}',
      '.jl-od-row{margin:0 0 10px}.jl-od-row label{display:block;font-weight:600;font-size:13px;margin-bottom:3px}',
      '.jl-od-row input,.jl-od-row select,.jl-od-row textarea{width:100%;box-sizing:border-box;padding:9px 10px;border:1.5px solid #b8bfd6;',
      'border-radius:10px;font:inherit;background:#fff;color:#1a1a2e}',
      'html[data-theme="dark"] .jl-od-row input,html[data-theme="dark"] .jl-od-row select,html[data-theme="dark"] .jl-od-row textarea{background:#2a3047;color:#eef0f7;border-color:#4a5275}',
      '.jl-od-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.jl-od-count{font-size:12px;opacity:.7;text-align:right}',
      '.jl-od-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}',
      '.jl-od-btn{padding:10px 14px;border-radius:10px;border:1.5px solid #1a237e;background:#fff;color:#1a237e;font:600 14px system-ui,sans-serif;cursor:pointer}',
      '.jl-od-btn.primary{background:#1a237e;color:#fff}.jl-od-btn.danger{border-color:#c62828;color:#c62828}',
      '.jl-od-btn[disabled]{opacity:.55;cursor:default}',
      '.jl-od-card{border:1.5px solid #d3d8ea;border-radius:12px;padding:10px 12px;margin:0 0 10px}',
      'html[data-theme="dark"] .jl-od-card{border-color:#3b4366}',
      '.jl-od-card h3{margin:0 0 2px;font-size:15px}',
      '.jl-od-meta{font-size:12px;opacity:.75;margin:0 0 6px}',
      '.jl-od-err{color:#c62828;font-size:13px;margin:6px 0 0}',
      '.jl-od-pill{display:inline-block;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:700;margin-left:6px}',
      '.jl-od-pill.draft{background:#e0e0e0;color:#333}.jl-od-pill.queued{background:#fff3cd;color:#7a5b00}.jl-od-pill.failed{background:#fdecea;color:#b71c1c}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'jlOdStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- chrome: floating button + offline banner ---------- */

  function isCitizenView() {
    return document.body.classList.contains('citizen-dashboard-mode') && !!currentUser();
  }

  function renderChrome() {
    if (!document.body) return;
    injectStyles();
    var fab = document.getElementById('jlOdFab');
    var banner = document.getElementById('jlOdBanner');
    if (!fab) {
      fab = el('button', { id: 'jlOdFab', class: 'jl-od-fab', type: 'button', 'aria-label': 'Offline case drafts', onclick: openPanel });
      document.body.appendChild(fab);
    }
    if (!banner) {
      banner = el('div', { id: 'jlOdBanner', class: 'jl-od-banner', role: 'status' });
      document.body.appendChild(banner);
    }
    var show = isCitizenView();
    // The floating button is no longer shown on the main page: drafts open from the Menu ("Case drafts").
    fab.style.display = 'none';
    var menuBadge = document.getElementById('jlOdMenuBadge');
    if (menuBadge) {
        menuBadge.textContent = state.pendingCount > 0 ? String(state.pendingCount) : '';
        menuBadge.style.display = state.pendingCount > 0 ? 'inline-block' : 'none';
    }

    var msg = '';
    if (show && !navigator.onLine) {
      msg = state.pendingCount > 0
        ? 'You are offline. ' + state.pendingCount + ' draft(s) will be sent when the connection returns.'
        : 'You are offline. You can still write a case under "Case drafts"; it will be sent when you are back online.';
    } else if (show && state.needsLogin && state.pendingCount > 0) {
      msg = 'Please log in again to send your saved case drafts.';
    } else if (show && state.syncing) {
      msg = 'Sending your saved cases…';
    }
    banner.textContent = msg;
    banner.style.display = msg ? 'block' : 'none';
  }

  /* ---------- panel (list + form) ---------- */

  function closePanel() {
    var o = document.getElementById('jlOdOverlay');
    if (o) o.remove();
    state.open = false;
    state.view = 'list';
    state.editingId = null;
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) { if (e.key === 'Escape') closePanel(); }

  function openPanel() {
    if (state.open) return;
    state.open = true;
    state.view = 'list';
    injectStyles();
    var overlay = el('div', { id: 'jlOdOverlay', class: 'jl-od-overlay', onclick: function (e) { if (e.target === overlay) closePanel(); } });
    overlay.appendChild(el('div', { id: 'jlOdSheet', class: 'jl-od-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Offline case drafts' }));
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey);
    renderPanel();
    syncAll();
  }

  function sosNote() {
    return el('p', { class: 'jl-od-sos', text: 'In danger right now? Do not wait to write a case. Call the police on 999 or 112. For a child in danger, call the Sauti 116 helpline.' });
  }

  function renderPanel() {
    var sheet = document.getElementById('jlOdSheet');
    if (!sheet) return;
    sheet.textContent = '';
    if (state.view === 'form') { renderForm(sheet); return; }

    sheet.appendChild(el('h2', { text: 'Case drafts' }));
    sheet.appendChild(el('p', { class: 'jl-od-sub', text: 'Write a case with no signal. It is kept on this phone and sent automatically when you are back online.' }));
    sheet.appendChild(sosNote());

    listDrafts().then(function (rows) {
      if (!rows.length) {
        sheet.appendChild(el('p', { text: 'No saved drafts.' }));
      }
      rows.forEach(function (d) {
        var title = (d.fields && d.fields.summary) || (d.payload && d.payload.description) || 'Untitled draft';
        var type = (d.fields && d.fields.caseType) || (d.payload && d.payload.caseType) || '';
        var label = d.status === 'queued' ? (navigator.onLine ? 'Sending' : 'Waiting for connection') : d.status === 'failed' ? 'Needs attention' : 'Draft';
        var card = el('div', { class: 'jl-od-card' }, [
          el('h3', null, [title.length > 80 ? title.slice(0, 80) + '…' : title,
            el('span', { class: 'jl-od-pill ' + d.status, text: label })]),
          el('p', { class: 'jl-od-meta', text: [type, new Date(d.updatedAt).toLocaleString()].filter(Boolean).join(' · ') })
        ]);
        if (d.status === 'failed' && d.error) card.appendChild(el('p', { class: 'jl-od-err', text: d.error }));
        var actions = el('div', { class: 'jl-od-actions' });
        if (d.fields) {
          actions.appendChild(el('button', { class: 'jl-od-btn', type: 'button', text: d.status === 'queued' ? 'View' : 'Edit',
            onclick: function () { state.view = 'form'; state.editingId = d.id; renderPanel(); } }));
        }
        if (d.status === 'failed' && d.payload) {
          actions.appendChild(el('button', { class: 'jl-od-btn', type: 'button', text: 'Try again',
            onclick: function () { d.status = 'queued'; d.error = ''; putDraft(d).then(function () { renderPanel(); syncAll(); }); } }));
        }
        actions.appendChild(el('button', { class: 'jl-od-btn danger', type: 'button', text: 'Delete',
          onclick: function () {
            if (window.confirm('Delete this draft from your phone? This cannot be undone.')) {
              deleteDraft(d.id).then(renderPanel);
            }
          } }));
        card.appendChild(actions);
        sheet.appendChild(card);
      });
      var bottom = el('div', { class: 'jl-od-actions' }, [
        el('button', { class: 'jl-od-btn primary', type: 'button', text: 'New draft',
          onclick: function () { state.view = 'form'; state.editingId = null; renderPanel(); } }),
        el('button', { class: 'jl-od-btn', type: 'button', text: 'Close', onclick: closePanel })
      ]);
      sheet.appendChild(bottom);
    });
  }

  function field(id, label, control, hint) {
    var row = el('div', { class: 'jl-od-row' }, [el('label', { for: id, text: label }), control]);
    if (hint) row.appendChild(hint);
    return row;
  }

  function renderForm(sheet) {
    var editing = null;
    var draftRef = { id: state.editingId, file: null, status: 'draft', createdAt: Date.now() };
    var saveTimer = null;

    function renderWith(d) {
      var f = (d && d.fields) || {
        caseType: '', summary: '', details: '',
        district: store('lcdjp_district'), subCounty: store('lcdjp_subCounty'),
        parish: store('lcdjp_parish'), village: store('lcdjp_village'),
        kinName: '', kinPhone: '', kinRelationship: ''
      };
      var locked = d && d.status === 'queued';
      draftRef.file = d ? d.file : null;
      draftRef.status = d ? d.status : 'draft';
      draftRef.createdAt = d ? d.createdAt : Date.now();

      sheet.textContent = '';
      sheet.appendChild(el('h2', { text: locked ? 'Draft waiting to send' : (d ? 'Edit draft' : 'New case draft') }));
      sheet.appendChild(el('p', { class: 'jl-od-sub', text: locked
        ? 'This draft is queued and will be sent automatically. You cannot edit it now.'
        : 'Saved on this phone as you type. Nothing is sent until you choose to.' }));
      sheet.appendChild(sosNote());

      var typeSel = el('select', { id: 'jlOdType', disabled: locked }, [el('option', { value: '', text: 'Choose a type' })]
        .concat(CASE_TYPES.map(function (t) { return el('option', { value: t, text: t, selected: f.caseType === t }); })));
      var summary = el('input', { id: 'jlOdSummary', type: 'text', maxlength: String(SUMMARY_MAX), value: f.summary, disabled: locked,
        placeholder: 'One or two sentences: what happened?' });
      var details = el('textarea', { id: 'jlOdDetails', rows: '6', maxlength: String(DETAILS_MAX), disabled: locked,
        placeholder: 'Who, what, when and where. Names of people and witnesses. Anything else that matters.' });
      details.value = f.details || '';
      var district = el('input', { id: 'jlOdDistrict', type: 'text', value: f.district, disabled: locked });
      var subCounty = el('input', { id: 'jlOdSub', type: 'text', value: f.subCounty, disabled: locked });
      var parish = el('input', { id: 'jlOdParish', type: 'text', value: f.parish, disabled: locked });
      var village = el('input', { id: 'jlOdVillage', type: 'text', value: f.village, disabled: locked });
      var kinName = el('input', { id: 'jlOdKinName', type: 'text', value: f.kinName, disabled: locked });
      var kinPhone = el('input', { id: 'jlOdKinPhone', type: 'tel', value: f.kinPhone, disabled: locked });
      var kinRel = el('input', { id: 'jlOdKinRel', type: 'text', value: f.kinRelationship, disabled: locked });
      var fileInput = el('input', { id: 'jlOdFile', type: 'file', accept: 'image/*,application/pdf', disabled: locked });
      var fileInfo = el('div', { class: 'jl-od-meta', id: 'jlOdFileInfo',
        text: draftRef.file ? draftRef.file.name + ' (' + formatSize(draftRef.file.size) + ')' : 'Optional. One photo or PDF, up to 5 MB. Photos are shrunk on your phone first.' });
      var error = el('p', { class: 'jl-od-err', id: 'jlOdFormErr', role: 'alert' });
      var counter = el('div', { class: 'jl-od-count', text: (f.summary || '').length + '/' + SUMMARY_MAX });

      sheet.appendChild(field('jlOdType', 'Type of case', typeSel));
      sheet.appendChild(field('jlOdSummary', 'Short summary', summary, counter));
      sheet.appendChild(field('jlOdDetails', 'Full account', details));
      sheet.appendChild(el('div', { class: 'jl-od-grid' }, [
        field('jlOdDistrict', 'District', district), field('jlOdSub', 'Sub-county', subCounty),
        field('jlOdParish', 'Parish', parish), field('jlOdVillage', 'Village', village)
      ]));
      sheet.appendChild(el('h2', { text: 'Next of kin (optional)', style: 'font-size:15px;margin-top:6px' }));
      sheet.appendChild(el('div', { class: 'jl-od-grid' }, [
        field('jlOdKinName', 'Name', kinName), field('jlOdKinPhone', 'Phone', kinPhone)
      ]));
      sheet.appendChild(field('jlOdKinRel', 'Relationship', kinRel));
      sheet.appendChild(field('jlOdFile', 'Photo or document', fileInput, fileInfo));
      sheet.appendChild(error);

      function collect() {
        return {
          caseType: typeSel.value, summary: summary.value.trim(), details: details.value.trim(),
          district: district.value.trim(), subCounty: subCounty.value.trim(), parish: parish.value.trim(),
          village: village.value.trim(), kinName: kinName.value.trim(), kinPhone: kinPhone.value.trim(),
          kinRelationship: kinRel.value.trim()
        };
      }

      function persist(status) {
        var fields = collect();
        var owner = currentUser();
        if (!owner) { error.textContent = 'Please log in to save a draft.'; return Promise.reject(new Error('no user')); }
        var rec = {
          id: draftRef.id || newId(), owner: owner, fields: fields, file: draftRef.file || null,
          status: status || draftRef.status || 'draft', createdAt: draftRef.createdAt, attempts: 0, error: ''
        };
        draftRef.id = rec.id;
        return putDraft(rec);
      }

      function hasContent() {
        var c = collect();
        return !!(c.summary || c.details || draftRef.file);
      }

      function scheduleSave() {
        if (locked) return;
        counter.textContent = summary.value.length + '/' + SUMMARY_MAX;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () { if (hasContent()) persist().catch(function () {}); }, 600);
      }

      [typeSel, summary, details, district, subCounty, parish, village, kinName, kinPhone, kinRel].forEach(function (c) {
        c.addEventListener('input', scheduleSave);
        c.addEventListener('change', scheduleSave);
      });

      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        error.textContent = '';
        fileInfo.textContent = 'Preparing file…';
        compressImage(file).then(function (out) {
          if (out.size > MAX_FILE_BYTES) {
            fileInput.value = '';
            fileInfo.textContent = 'That file is over 5 MB. Choose a smaller one.';
            return;
          }
          draftRef.file = { name: out.name, type: out.type, size: out.size, blob: out };
          fileInfo.textContent = out.name + ' (' + formatSize(out.size) + ')';
          persist().catch(function () {});
        });
      });

      var actions = el('div', { class: 'jl-od-actions' });
      if (!locked) {
        actions.appendChild(el('button', { class: 'jl-od-btn primary', type: 'button',
          text: navigator.onLine ? 'Send now' : 'Send when online',
          onclick: function () {
            var c = collect();
            if (!c.caseType) { error.textContent = 'Choose the type of case.'; return; }
            if (c.summary.length < 10) { error.textContent = 'Write a short summary (at least 10 characters).'; return; }
            if (!c.district) { error.textContent = 'Enter the district.'; return; }
            clearTimeout(saveTimer);
            persist('queued').then(function () {
              toast(navigator.onLine ? 'Sending your case…' : 'Saved. It will be sent when you are back online.');
              state.view = 'list'; state.editingId = null; renderPanel();
              scheduleRetry();
              syncAll();
            }).catch(function () { error.textContent = 'Could not save on this device. Free some storage and try again.'; });
          } }));
        actions.appendChild(el('button', { class: 'jl-od-btn', type: 'button', text: 'Save draft',
          onclick: function () {
            clearTimeout(saveTimer);
            if (!hasContent()) { error.textContent = 'Write something first.'; return; }
            persist().then(function () { toast('Draft saved on this phone.'); state.view = 'list'; state.editingId = null; renderPanel(); })
              .catch(function () { error.textContent = 'Could not save on this device. Free some storage and try again.'; });
          } }));
      }
      actions.appendChild(el('button', { class: 'jl-od-btn', type: 'button', text: 'Back',
        onclick: function () { clearTimeout(saveTimer); if (!locked && hasContent()) persist().catch(function () {}); state.view = 'list'; state.editingId = null; renderPanel(); } }));
      sheet.appendChild(actions);
    }

    if (state.editingId) {
      getDraft(state.editingId).then(function (d) { editing = d; renderWith(editing); }).catch(function () { renderWith(null); });
    } else {
      renderWith(null);
    }
  }

  /* ---------- logout guard ---------- */

  function confirmLogout() {
    var owner = currentUser();
    if (!owner || state.pendingCount === 0) return true;
    var ok = window.confirm(
      'You have ' + state.pendingCount + ' case draft(s) that have not been sent. ' +
      'Logging out deletes them from this phone so the next person cannot read them. ' +
      'Log out and delete them?');
    if (ok) purgeOwner(owner);
    return ok;
  }

  /* ---------- wiring ---------- */

  function init() {
    injectStyles();
    purgeExpired().then(refreshCount).then(function () { if (state.pendingCount) syncAll(); });

    window.addEventListener('online', function () { state.retryDelay = 30000; renderChrome(); syncAll(); });
    window.addEventListener('offline', renderChrome);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') { refreshCount(); syncAll(); }
    });
    // Show/hide the button as the user logs in and out, and send drafts after a fresh login.
    new MutationObserver(function () {
      var was = state.needsLogin;
      renderChrome();
      if (isCitizenView()) {
        refreshCount().then(function () { if (was && state.pendingCount) { state.needsLogin = false; syncAll(); } });
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    renderChrome();
  }

  window.JusticeLinkDrafts = {
    open: openPanel,
    syncNow: syncAll,
    saveFromPayload: saveFromPayload,
    confirmLogout: confirmLogout,
    compressImage: compressImage,
    pendingCount: function () { return state.pendingCount; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
