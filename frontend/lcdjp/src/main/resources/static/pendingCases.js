/*
 * PendingCases: the "Pending Cases" panel shown above the case browser for
 * system admins (#adminPendingCasesHost) and district admins (#daPendingCasesHost).
 *
 * Usage (already wired in systemAdmin.js and districtAdmin.js):
 *   window.PendingCases.mount('adminPendingCasesHost', { allowDistrictFilter: true });
 *   window.PendingCases.mount('daPendingCasesHost', {});
 *
 * Reads GET /api/cases?status=Pending (the same endpoint the case browser uses; the server
 * already limits district admins to their own district) and renders rows with CaseBrowser,
 * so clicking a case opens the usual read-only detail view.
 */
(function (global) {
    'use strict';

    var FETCH_SIZE = 100;     // one request, filtered in the browser
    var SHOW_LIMIT = 10;      // rows shown in the panel

    var panels = {};          // hostId -> { cases, total, district, allowDistrictFilter }

    function esc(v) {
        return global.CaseBrowser ? global.CaseBrowser.esc(v) : String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function ids(hostId) {
        return {
            list: hostId + 'List',
            count: hostId + 'Count',
            note: hostId + 'Note',
            district: hostId + 'District'
        };
    }

    function shell(host, hostId, allowDistrictFilter) {
        var i = ids(hostId);
        host.innerHTML =
            '<div class="case-browser" style="margin-bottom:16px;">' +
              '<div class="case-browser-head">' +
                '<div>' +
                  '<h2 class="case-browser-title">Pending Cases</h2>' +
                  '<p class="case-browser-sub">Cases still waiting to be taken on. <span id="' + i.count + '"></span></p>' +
                '</div>' +
                '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
                  (allowDistrictFilter
                    ? '<select id="' + i.district + '" class="case-filter-select" aria-label="Filter pending cases by district">' +
                      '<option value="">All districts</option></select>'
                    : '') +
                  '<button type="button" class="case-filter-select" data-pending-refresh style="cursor:pointer;">&#8635; Refresh</button>' +
                '</div>' +
              '</div>' +
              '<div id="' + i.list + '"><p class="case-list-empty">Loading pending cases\u2026</p></div>' +
              '<p id="' + i.note + '" class="case-browser-sub" style="margin-top:8px;"></p>' +
            '</div>';

        var refresh = host.querySelector('[data-pending-refresh]');
        if (refresh) refresh.addEventListener('click', function () { load(hostId); });

        var sel = document.getElementById(i.district);
        if (sel) sel.addEventListener('change', function () {
            var p = panels[hostId];
            if (!p) return;
            p.district = sel.value;
            render(hostId);
        });
    }

    function fillDistricts(hostId) {
        var p = panels[hostId];
        var sel = document.getElementById(ids(hostId).district);
        if (!p || !sel) return;
        var seen = {};
        p.cases.forEach(function (c) {
            var d = global.CaseBrowser.caseDistrict(c);
            if (d && d !== '-' && d !== 'N/A' && d !== 'Unknown') seen[d] = true;
        });
        var names = Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); });
        var keep = p.district;
        sel.innerHTML = '<option value="">All districts</option>' + names.map(function (n) {
            return '<option value="' + esc(n) + '">' + esc(n) + '</option>';
        }).join('');
        sel.value = names.indexOf(keep) >= 0 ? keep : '';
        p.district = sel.value;
    }

    function render(hostId) {
        var p = panels[hostId];
        if (!p || !global.CaseBrowser) return;
        var i = ids(hostId);
        var rows = p.cases;
        if (p.district) {
            rows = rows.filter(function (c) { return global.CaseBrowser.caseDistrict(c) === p.district; });
        }
        var shown = rows.slice(0, SHOW_LIMIT);

        global.CaseBrowser.renderList(i.list, i.count, shown,
            p.district ? 'No pending cases in ' + p.district + '.' : 'No pending cases right now.');

        var note = document.getElementById(i.note);
        if (note) {
            var total = p.district ? rows.length : Math.max(p.total, rows.length);
            note.textContent = total > shown.length
                ? 'Showing ' + shown.length + ' of ' + total + ' pending cases. Use the case list below to browse them all.'
                : '';
        }
    }

    async function load(hostId) {
        var p = panels[hostId];
        var i = ids(hostId);
        var list = document.getElementById(i.list);
        if (!p || !list) return;

        list.innerHTML = '<p class="case-list-empty">Loading pending cases\u2026</p>';
        try {
            var params = new URLSearchParams();
            params.set('status', 'Pending');
            params.set('page', 1);
            params.set('pageSize', FETCH_SIZE);
            var resp = await authFetch(API_ENDPOINTS.cases + '?' + params.toString(), { method: 'GET' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            var data = await resp.json();
            p.cases = global.CaseBrowser.unwrapCases(data);
            p.total = Number(data && data.totalCount) || p.cases.length;
            if (p.allowDistrictFilter) fillDistricts(hostId);
            render(hostId);
        } catch (err) {
            list.innerHTML = '<p class="case-list-error">Could not load pending cases: ' + esc(err.message || err) + '</p>';
        }
    }

    function mount(hostId, options) {
        var host = document.getElementById(hostId);
        if (!host) return;
        // API_ENDPOINTS is a top-level const (not a window property), so test it with typeof
        if (!global.CaseBrowser || typeof global.authFetch !== 'function' || typeof API_ENDPOINTS === 'undefined') return;
        var allow = !!(options && options.allowDistrictFilter);
        panels[hostId] = { cases: [], total: 0, district: '', allowDistrictFilter: allow };
        shell(host, hostId, allow);
        load(hostId);
    }

    global.PendingCases = { mount: mount, refresh: load };
})(window);
