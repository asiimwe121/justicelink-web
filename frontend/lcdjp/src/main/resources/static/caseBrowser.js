(function (global) {
    'use strict';

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function pick(obj) {
        for (var i = 1; i < arguments.length; i++) {
            var v = obj[arguments[i]];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
                return String(v).trim();
            }
        }
        return '';
    }

    function caseRef(c) {
        return pick(c, 'caseReference', 'case_reference', 'caseNumber', 'case_number', 'caseId', 'id');
    }

    function caseTitle(c) {
        var t = pick(c, 'title', 'caseTitle', 'case_title');
        if (t) return t;
        var ref = caseRef(c);
        return ref ? 'Case ' + ref : 'Untitled case';
    }

    function caseCitizen(c) {
        return pick(c, 'citizenName', 'citizen_name', 'username', 'citizenUsername',
                       'citizen_username', 'citizenId', 'citizen_id') || 'Unknown';
    }

    function caseType(c) {
        return pick(c, 'caseType', 'case_type', 'type') || 'General';
    }

    function caseDistrict(c) {
        return pick(c, 'district', 'caseDistrict', 'case_district') || 'Unknown';
    }

    function caseStatus(c) {
        return pick(c, 'status', 'caseStatus', 'case_status') || 'Unknown';
    }

    function caseDate(c) {
        var raw = pick(c, 'createdAt', 'created_at', 'dateFiled', 'date_filed', 'submittedAt', 'submitted_at');
        if (!raw) return '';
        var d = new Date(raw);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function statusPillClass(status) {
        var s = String(status || '').toLowerCase();
        if (/resolved|completed/.test(s))          return 'case-status-resolved';
        if (/closed|rejected|withdrawn/.test(s))   return 'case-status-closed';
        if (/lawyer|organization|org\b/.test(s))   return 'case-status-lawyer';
        if (/progress|review|accepted|forwarded/.test(s)) return 'case-status-progress';
        return 'case-status-pending';
    }

    function unwrapCases(raw) {
        if (Array.isArray(raw)) return raw;
        if (raw && Array.isArray(raw.cases)) return raw.cases;
        if (raw && Array.isArray(raw.data)) return raw.data;
        return [];
    }

    function renderList(containerId, countId, cases, emptyMessage) {
        var container = document.getElementById(containerId);
        if (!container) return;

        var countEl = document.getElementById(countId);
        if (countEl) {
            countEl.textContent = cases.length === 0
                ? ''
                : cases.length + (cases.length === 1 ? ' case' : ' cases');
        }

        if (cases.length === 0) {
            container.innerHTML = '<p class="case-list-empty">' + esc(emptyMessage) + '</p>';
            return;
        }

        container.innerHTML = cases.map(function (c) {
            var ref = caseRef(c);
            var status = caseStatus(c);
            var date = caseDate(c);
            var meta = [
                '<span>' + esc(caseCitizen(c)) + '</span>',
                '<span>' + esc(caseType(c)) + '</span>',
                '<span>' + esc(caseDistrict(c)) + '</span>'
            ];
            if (date) meta.push('<span>' + esc(date) + '</span>');

            return '<div class="case-item" role="button" tabindex="0"'
                 + ' data-case-ref="' + esc(ref) + '"'
                 + ' title="View case details">'
                 +   '<div class="case-item-main">'
                 +     '<div class="case-item-title">' + esc(caseTitle(c)) + '</div>'
                 +     (ref ? '<div class="case-item-ref">' + esc(ref) + '</div>' : '')
                 +     '<div class="case-item-meta">' + meta.join('') + '</div>'
                 +   '</div>'
                 +   '<div class="case-item-side">'
                 +     '<span class="case-status-pill ' + statusPillClass(status) + '">' + esc(status) + '</span>'
                 +     '<span class="case-item-chevron" aria-hidden="true">&rsaquo;</span>'
                 +   '</div>'
                 + '</div>';
        }).join('');

        Array.prototype.forEach.call(container.querySelectorAll('.case-item'), function (el) {
            var ref = el.getAttribute('data-case-ref');
            function open() { CaseBrowser.openDetail(ref); }
            el.addEventListener('click', open);
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
            });
        });
    }

    function fillOptions(selectId, values, allLabel) {
        var sel = document.getElementById(selectId);
        if (!sel) return;
        var previous = sel.value;
        var unique = Object.keys(values.reduce(function (acc, v) {
            if (v) acc[v] = true;
            return acc;
        }, {})).sort(function (a, b) { return a.localeCompare(b); });

        sel.innerHTML = '<option value="">' + esc(allLabel) + '</option>'
            + unique.map(function (v) {
                return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
            }).join('');

        if (previous && unique.indexOf(previous) !== -1) sel.value = previous;
    }

    function fillOptionsFromValues(selectId, values, allLabel) {
        var sel = document.getElementById(selectId);
        if (!sel) return;
        var previous = sel.value;
        var sorted = (values || []).slice().sort(function (a, b) { return a.localeCompare(b); });

        sel.innerHTML = '<option value="">' + esc(allLabel) + '</option>'
            + sorted.map(function (v) {
                return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
            }).join('');

        if (previous && sorted.indexOf(previous) !== -1) sel.value = previous;
    }

    function fillOptionsFromCounts(selectId, items, allLabel) {
        var sel = document.getElementById(selectId);
        if (!sel) return;
        var previous = sel.value;
        var sorted = (items || []).slice().sort(function (a, b) {
            return String(a.label).localeCompare(String(b.label));
        });

        sel.innerHTML = '<option value="">' + esc(allLabel) + '</option>'
            + sorted.map(function (it) {
                return '<option value="' + esc(it.label) + '">' + esc(it.label) + ' (' + it.count + ')</option>';
            }).join('');

        if (previous && sorted.some(function (it) { return it.label === previous; })) sel.value = previous;
    }

    function renderPagination(containerId, page, pageSize, totalCount, onChange) {
        var container = document.getElementById(containerId);
        if (!container) return;

        var totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '<div class="case-pagination">'
            + '<button class="case-pagination-btn" id="' + containerId + '_prev"' + (page <= 1 ? ' disabled' : '') + '>&lsaquo; Prev</button>'
            + '<span class="case-pagination-info">Page ' + page + ' of ' + totalPages + ' &bull; ' + totalCount + ' cases</span>'
            + '<button class="case-pagination-btn" id="' + containerId + '_next"' + (page >= totalPages ? ' disabled' : '') + '>Next &rsaquo;</button>'
            + '</div>';

        var prevBtn = document.getElementById(containerId + '_prev');
        var nextBtn = document.getElementById(containerId + '_next');
        if (prevBtn) prevBtn.addEventListener('click', function () { if (page > 1) onChange(page - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { if (page < totalPages) onChange(page + 1); });
    }

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(null, args); }, wait);
        };
    }

    function matches(c, filters) {
        if (filters.district && caseDistrict(c).toLowerCase() !== filters.district.toLowerCase()) return false;
        if (filters.status && caseStatus(c).toLowerCase() !== filters.status.toLowerCase()) return false;
        if (filters.type && caseType(c).toLowerCase() !== filters.type.toLowerCase()) return false;
        if (filters.search) {
            var needle = filters.search.toLowerCase();
            var haystack = [caseRef(c), caseTitle(c), caseCitizen(c), caseType(c), caseDistrict(c)]
                .join(' ').toLowerCase();
            if (haystack.indexOf(needle) === -1) return false;
        }
        return true;
    }

    function closeDetail() {
        var el = document.getElementById('caseReadOnlyModal');
        if (el) el.remove();
        if (typeof global.unlockScroll === 'function') global.unlockScroll();
        document.removeEventListener('keydown', escHandler);
    }

    function escHandler(e) {
        if (e.key === 'Escape') closeDetail();
    }

    function detailRow(label, value) {
        if (!value) return '';
        return '<div class="case-detail-row">'
             +   '<div class="case-detail-label">' + esc(label) + '</div>'
             +   '<div class="case-detail-value">' + esc(value) + '</div>'
             + '</div>';
    }

    function openDetail(ref) {
        ref = String(ref == null ? '' : ref).trim();
        if (!ref) {
            if (typeof global.showToast === 'function') global.showToast('This case has no reference to open.');
            return;
        }

        closeDetail();

        var backdrop = document.createElement('div');
        backdrop.id = 'caseReadOnlyModal';
        backdrop.className = 'case-detail-backdrop';
        backdrop.innerHTML =
            '<div class="case-detail-panel" role="dialog" aria-modal="true" aria-label="Case details">'
          +   '<div class="case-detail-head">'
          +     '<h3>Case Details</h3>'
          +     '<button class="case-detail-close" aria-label="Close">&times;</button>'
          +   '</div>'
          +   '<div class="case-detail-body" id="caseReadOnlyBody">'
          +     '<p class="case-list-empty">Loading case details…</p>'
          +   '</div>'
          + '</div>';

        document.body.appendChild(backdrop);
        if (typeof global.lockScroll === 'function') global.lockScroll();
        document.addEventListener('keydown', escHandler);

        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) closeDetail();
        });
        backdrop.querySelector('.case-detail-close').addEventListener('click', closeDetail);

        var fetcher = (typeof global.authFetch === 'function')
            ? global.authFetch(global.API_ENDPOINTS.case(encodeURIComponent(ref)), { method: 'GET' })
            : fetch(global.API_ENDPOINTS.case(encodeURIComponent(ref)), {
                  method: 'GET',
                  headers: (typeof global.getAuthHeaders === 'function') ? global.getAuthHeaders() : {}
              });

        fetcher.then(function (resp) {
            if (!resp.ok) throw new Error(resp.status === 404 ? 'Case not found' : 'HTTP ' + resp.status);
            return resp.json();
        }).then(function (data) {
            var c = data.case || data;
            var body = document.getElementById('caseReadOnlyBody');
            if (!body) return;

            var handler = pick(c, 'currentHandler', 'current_handler', 'assignedLawyer', 'assigned_lawyer',
                                  'assignedLc', 'assigned_lc', 'assignedOrg', 'assigned_org');
            var description = pick(c, 'description', 'caseDescription', 'case_description', 'details');

            body.innerHTML =
                  detailRow('Case reference', caseRef(c))
                + detailRow('Title', caseTitle(c))
                + detailRow('Status', caseStatus(c))
                + detailRow('Type', caseType(c))
                + detailRow('Citizen', caseCitizen(c))
                + detailRow('Phone', pick(c, 'citizenPhone', 'citizen_phone', 'phone'))
                + detailRow('District', caseDistrict(c))
                + detailRow('Sub-county', pick(c, 'subCounty', 'sub_county'))
                + detailRow('Parish', pick(c, 'parish'))
                + detailRow('Village', pick(c, 'village'))
                + detailRow('Current handler', handler)
                + detailRow('Filed on', caseDate(c))
                + detailRow('Description', description)
                + '<p class="case-detail-note">This is a read-only view. Cases are handled by LC officials, '
                + 'lawyers and legal organizations — administrators can observe but not act on them.</p>';
        }).catch(function (err) {
            var body = document.getElementById('caseReadOnlyBody');
            if (body) {
                body.innerHTML = '<p class="case-list-error">Could not load this case: '
                    + esc(err.message) + '</p>';
            }
        });
    }

    var CaseBrowser = {
        esc: esc,
        pick: pick,
        caseRef: caseRef,
        caseTitle: caseTitle,
        caseCitizen: caseCitizen,
        caseType: caseType,
        caseDistrict: caseDistrict,
        caseStatus: caseStatus,
        unwrapCases: unwrapCases,
        renderList: renderList,
        fillOptions: fillOptions,
        fillOptionsFromValues: fillOptionsFromValues,
        fillOptionsFromCounts: fillOptionsFromCounts,
        renderPagination: renderPagination,
        debounce: debounce,
        matches: matches,
        openDetail: openDetail,
        closeDetail: closeDetail
    };

    global.CaseBrowser = CaseBrowser;
    global.closeCaseReadOnlyModal = closeDetail;
})(window);
