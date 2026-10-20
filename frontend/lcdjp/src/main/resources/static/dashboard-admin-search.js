


















(function() {
    var _lastShown = null;
    setInterval(function() {
        var wrap = document.getElementById('adminGlobalSearchWrap');
        if (!wrap) return;
        var show = document.body.classList.contains('admin-dashboard-mode');
        if (show === _lastShown) return;
        _lastShown = show;
        wrap.style.display = show ? 'flex' : 'none';
        if (!show) {
            var res = document.getElementById('adminGlobalSearchResults');
            if (res) res.style.display = 'none';
        }
    }, 500);

    document.addEventListener('click', function(e) {
        var wrap = document.getElementById('adminGlobalSearchWrap');
        var results = document.getElementById('adminGlobalSearchResults');
        if (!wrap || !results || results.style.display === 'none') return;
        if (!wrap.contains(e.target)) results.style.display = 'none';
    });
})();

window.adminGlobalSearchOpen = function() {
    var results = document.getElementById('adminGlobalSearchResults');
    var input = document.getElementById('adminGlobalSearchInput');
    if (!results || !input) return;
    if (input.value.trim()) return;
    results.style.display = 'block';
    results.innerHTML = '<div class="am-search-prompt">What are you looking for?</div>';
};
























var _amSearchCategoryStyle = {
    'users':                 { color: 'var(--info)',      icon: 'user'   },
    'cases':                 { color: 'var(--secondary)',  icon: 'file'  },
    'lc offices':            { color: 'var(--success)',    icon: 'office'},
    'legal organizations':   { color: 'var(--warning)',    icon: 'scale' },
    'legal organisations':   { color: 'var(--warning)',    icon: 'scale' },
    'districts':             { color: 'var(--primary)',    icon: 'pin'   }
};

function _amSearchIconSvg(kind) {
    var paths = {
        user:   '<circle cx="12" cy="8" r="3.2"></circle><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"></path>',
        file:   '<path d="M7 3h7l4 4v14H7z"></path><path d="M14 3v4h4"></path><path d="M9.5 12h5M9.5 15.5h5"></path>',
        office: '<path d="M4 21V7l8-4 8 4v14"></path><path d="M9 21v-5h6v5"></path><path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01"></path>',
        shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"></path>',
        scale:  '<path d="M12 3v18M7 7l-4 6h8l-4-6zM17 7l-4 6h8l-4-6zM5 13a2 2 0 0 0 4 0M15 13a2 2 0 0 0 4 0M8 20h8"></path>',
        pin:    '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"></path><circle cx="12" cy="10" r="2.4"></circle>'
    };
    return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" '
        + 'stroke-linecap="round" stroke-linejoin="round">' + (paths[kind] || paths.file) + '</svg>';
}

function _amSearchInlineBold(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}







function _amSearchRenderRecordLine(line) {
    var text = line.replace(/^-\s*/, '');
    var m = text.match(/^(.*?)[:\(]\s*([a-zA-Z][\w ]*=.*)$/);
    if (!m) {
        return '<div class="am-search-record"><div class="am-search-record-title">' + _amSearchInlineBold(text) + '</div></div>';
    }
    var title = m[1].replace(/[:\(]\s*$/, '').trim();
    var fieldsRaw = m[2].replace(/\)\s*$/, '');
    var fields = fieldsRaw.split(/\s*[|,]\s*/).filter(function(f) { return f.indexOf('=') !== -1; });
    var fieldsHtml = fields.map(function(f) {
        var parts = f.split('=');
        var k = parts.shift().trim();
        var v = parts.join('=').trim();
        return '<span class="am-search-field"><span class="am-search-field-key">' + k + '</span>'
             + '<span class="am-search-field-value">' + (v || '\u2014') + '</span></span>';
    }).join('');
    return '<div class="am-search-record">'
         + '<div class="am-search-record-title">' + _amSearchInlineBold(title) + '</div>'
         + (fieldsHtml ? '<div class="am-search-field-row">' + fieldsHtml + '</div>' : '')
         + '</div>';
}

function _amFormatSearchAnswer(escapedText) {
    var lines = String(escapedText).split(/\r?\n/);
    var html = '';
    var sectionOpen = false;
    var recordListOpen = false;

    function closeRecordList() { if (recordListOpen) { html += '</div>'; recordListOpen = false; } }
    function closeSection() { closeRecordList(); if (sectionOpen) { html += '</div>'; sectionOpen = false; } }

    lines.forEach(function(raw) {
        var line = raw.trim();
        if (!line) return;

        var headerMatch = line.match(/^\*\*(.+?)\*\*:?$/);
        if (headerMatch) {
            closeSection();
            var label = headerMatch[1].trim();
            var style = _amSearchCategoryStyle[label.toLowerCase()] || { color: 'var(--primary)', icon: 'file' };
            html += '<div class="am-search-section" style="--am-cat-color:' + style.color + '">'
                 + '<div class="am-search-section-header">'
                 + '<span class="am-search-section-icon">' + _amSearchIconSvg(style.icon) + '</span>'
                 + '<span>' + label + '</span></div>';
            sectionOpen = true;
            return;
        }

        if (/^-\s+/.test(line)) {
            if (!recordListOpen) { html += '<div class="am-search-record-list">'; recordListOpen = true; }
            html += _amSearchRenderRecordLine(line);
            return;
        }

        closeRecordList();
        html += '<div class="am-search-note">' + _amSearchInlineBold(line) + '</div>';
    });
    closeSection();
    return html || '<div class="am-search-note">' + _amSearchInlineBold(String(escapedText)) + '</div>';
}





window.openAdminMobileSearch = function() {
    var overlay = document.getElementById('adminMobileSearchOverlay');
    var input = document.getElementById('adminMobileSearchInput');
    var results = document.getElementById('adminMobileSearchResults');
    if (!overlay) return;
    overlay.style.display = 'block';
    if (results) results.innerHTML = '';
    if (input) { input.value = ''; setTimeout(function() { input.focus(); }, 50); }
};

window.closeAdminMobileSearch = function() {
    var overlay = document.getElementById('adminMobileSearchOverlay');
    if (overlay) overlay.style.display = 'none';
};

window.adminMobileSearchSubmit = async function() {
    var input = document.getElementById('adminMobileSearchInput');
    var results = document.getElementById('adminMobileSearchResults');
    if (!input || !results) return;
    var query = input.value.trim();
    if (!query) return;

    results.innerHTML = '<div class="am-search-loading">Searching…</div>';

    try {
        var response = await fetch(API_ENDPOINTS.adminSearch, {
            method: 'POST',
            headers: _getDashboardAuthHeaders(),
            body: JSON.stringify({ query: query })
        });

        if (response.status === 401 || response.status === 403) {
            results.innerHTML = '<div class="am-search-empty">Your session doesn\'t have access to admin search. Please log in again.</div>';
            return;
        }

        var data = response.ok ? await response.json() : null;
        var answer = data ? data.reply : null;

        if (!answer) {
            results.innerHTML = '<div class="am-search-empty">No results right now, please try again in a moment.</div>';
            return;
        }
        var esc = String(answer).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var countNote = (typeof data.resultCount === 'number' && data.resultCount > 0)
            ? '<div class="am-search-count">' + data.resultCount + ' matching record(s) found</div>'
            : '';
        
        
        
        
        results.innerHTML = countNote + _amFormatSearchAnswer(esc);
    } catch (e) {
        results.innerHTML = '<div class="am-search-empty">No results right now, please try again in a moment.</div>';
    }
};





window._amNavSetActive = function(el) {
    document.querySelectorAll('#amBottomNav .am-nav').forEach(function(n) { n.classList.remove('active'); });
    if (el) el.classList.add('active');
};
window.amGoHome = function() {
    var level = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('lcdjp_userlevel'))
        || (typeof localStorage !== 'undefined' && localStorage.getItem('lcdjp_userlevel'))
        || '';
    if (level === 'DISTRICT_ADMIN') {
        if (typeof showDistrictAdminDashboard === 'function') showDistrictAdminDashboard();
    } else if (typeof navigateToAdminFeature === 'function' && typeof showAdminHome === 'function') {
        navigateToAdminFeature(showAdminHome);
    }
};

window.adminGlobalSearchSubmit = async function() {
    var input = document.getElementById('adminGlobalSearchInput');
    var results = document.getElementById('adminGlobalSearchResults');
    if (!input || !results) return;
    var query = input.value.trim();
    if (!query) { window.adminGlobalSearchOpen(); return; }

    results.style.display = 'block';
    
    
    
    
    
    
    
    results.innerHTML = '<div class="am-search-loading">Searching…</div>';

    try {
        var response = await fetch(API_ENDPOINTS.adminSearch, {
            method: 'POST',
            headers: _getDashboardAuthHeaders(),
            body: JSON.stringify({ query: query })
        });

        if (response.status === 401 || response.status === 403) {
            results.innerHTML = '<div class="am-search-empty">Your session doesn\'t have access to admin search. Please log in again.</div>';
            return;
        }

        var data = response.ok ? await response.json() : null;
        var answer = data ? data.reply : null;

        if (!answer) {
            results.innerHTML = '<div class="am-search-empty">No results right now, please try again in a moment.</div>';
            return;
        }
        var esc = String(answer).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var countNote = (typeof data.resultCount === 'number' && data.resultCount > 0)
            ? '<div class="am-search-count">' + data.resultCount + ' matching record(s) found</div>'
            : '';
        results.innerHTML = countNote + _amFormatSearchAnswer(esc);
    } catch (e) {
        results.innerHTML = '<div class="am-search-empty">No results right now, please try again in a moment.</div>';
    }
};



(function () {
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderSourcesHtml(sources) {
        if (!Array.isArray(sources) || !sources.length) return '';
        return '<div style="margin-top:10px;padding:10px 16px 12px;border-top:1px solid #eef1f8;font-size:12px;color:#667085;">'
            + '<strong>From the Legal Knowledge library:</strong><ul style="margin:6px 0 0;padding-left:18px;">'
            + sources.map(function (s) {
                var lbl = [s.documentTitle, s.legalSection].filter(Boolean).join(' \u2014 ');
                return '<li>' + esc(lbl || 'Legal Knowledge library') + '</li>';
            }).join('')
            + '</ul></div>';
    }

    function wireTopbarSearch(opts) {
        var wrapId = opts.wrapId, inputId = opts.inputId, resultsId = opts.resultsId;

        document.addEventListener('click', function (e) {
            var wrap = document.getElementById(wrapId);
            var results = document.getElementById(resultsId);
            if (!wrap || !results || results.style.display === 'none') return;
            if (!wrap.contains(e.target)) results.style.display = 'none';
        });

        window[opts.openFnName] = function () {
            var results = document.getElementById(resultsId);
            var input = document.getElementById(inputId);
            if (!results || !input) return;
            if (input.value.trim()) return;
            results.style.display = 'block';
            results.innerHTML = '<div class="am-search-prompt">' + esc(opts.prompt) + '</div>';
        };

        window[opts.submitFnName] = async function () {
            var input = document.getElementById(inputId);
            var results = document.getElementById(resultsId);
            if (!input || !results) return;
            var query = input.value.trim();
            if (!query) { window[opts.openFnName](); return; }

            results.style.display = 'block';
            results.innerHTML = '<div class="am-search-loading">' + esc(opts.loadingText) + '</div>';

            try {
                var res = await opts.query(query);
                if (!res || !res.reply) {
                    results.innerHTML = '<div class="am-search-empty">' + esc(opts.unavailableText) + '</div>';
                    return;
                }
                results.innerHTML = '<div style="padding:16px 16px 4px;font-size:13px;line-height:1.6;white-space:pre-wrap;">'
                    + esc(res.reply) + '</div>' + renderSourcesHtml(res.sources);
            } catch (e) {
                results.innerHTML = '<div class="am-search-empty">' + esc(opts.unavailableText) + '</div>';
            }
        };
    }

    function askAi(question, category, contextInstruction) {
        var payload = {
            message: question,
            context: contextInstruction,
            category: category,
            sessionId: sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || 'guest'
        };
        return fetch(API_BASE_URL + '/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
              if (!data || data.fallback) return null;
              return { reply: data.reply, sources: data.sources || [] };
          });
    }

    wireTopbarSearch({
        wrapId: 'citizenTopbarSearchWrap',
        inputId: 'citizenTopbarSearchInput',
        resultsId: 'citizenTopbarSearchResults',
        openFnName: 'citizenTopbarSearchOpen',
        submitFnName: 'citizenTopbarSearchSubmit',
        prompt: 'Ask about your case, a nearby office, or any legal question.',
        loadingText: 'Searching…',
        unavailableText: 'No results right now, please try again in a moment.',
        query: function (query) {
            return askAi(query, 'Citizen Search',
                'You are JusticeLink\'s search assistant, answering a query a citizen typed into the top search '
                + 'bar. If it is a legal question, answer it using the verified Legal Knowledge library and cite '
                + 'it. If it is about using JusticeLink itself (finding a case, nearby police/LC offices, legal '
                + 'aid, etc.), give a short, direct answer pointing them to the right part of the app. Keep the '
                + 'answer brief, a few sentences.');
        }
    });

    wireTopbarSearch({
        wrapId: 'lawyerTopbarSearchWrap',
        inputId: 'lawyerTopbarSearchInput',
        resultsId: 'lawyerTopbarSearchResults',
        openFnName: 'lawyerTopbarSearchOpen',
        submitFnName: 'lawyerTopbarSearchSubmit',
        prompt: 'Search the Law Library, or ask any legal question.',
        loadingText: 'Searching the Legal Knowledge library…',
        unavailableText: 'The Legal Knowledge library is unavailable right now. Please try again shortly.',
        query: function (query) {
            if (typeof _lawLibraryQuery === 'function') return _lawLibraryQuery(query, 'Law Library');
            return askAi(query, 'Law Library',
                'You are the Law Library, a Legal Knowledge lookup feature inside JusticeLink, used by verified '
                + 'lawyers. Answer directly and precisely, citing the relevant law, section, or procedure where '
                + 'the material supports it.');
        }
    });
})();