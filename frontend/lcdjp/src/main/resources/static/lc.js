



function showLcDashboard() {
    if (typeof hideAppLoader === 'function') hideAppLoader();

    document.body.classList.remove('citizen-dashboard-mode', 'admin-dashboard-mode', 'mobile-home-active');
    document.body.classList.add('lawyer-dashboard-mode');
    if (typeof ensureSidebarVisibility === 'function') ensureSidebarVisibility('LC');
    var _mfEl = document.getElementById("mainFooter");
    if (_mfEl) _mfEl.style.display = "none";
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();
    document.getElementById("lcDashboard").style.display = "block";

    const notifBtn = document.getElementById("navNotifBtn");
    if (notifBtn) {
        notifBtn.style.display = "inline-block";
        notifBtn.innerHTML = 'Notifications <span id="notifCount" style="display:none; background:#dc3545; color:white; border-radius:50%; padding:2px 8px; font-size:11px; font-weight:bold; margin-left:5px; min-width:18px; text-align:center;"></span>';
    }

    updateLcDashboardCases();

    (function () {
        const _fn = sessionStorage.getItem('lcdjp_fullname') || sessionStorage.getItem('lcdjp_username') || 'LC Official';
        const _first = _fn.split(' ')[0] || _fn;
        const _h = new Date().getHours();
        const _g = _h < 12 ? 'Good morning' : _h < 17 ? 'Good afternoon' : 'Good evening';
        const _elG = document.getElementById('lcmGreeting');
        if (_elG) _elG.textContent = _g + ', ' + _first;
        const _elA = document.getElementById('lcmAvatar');
        if (_elA) {
            const pts = _fn.split(' ');
            _elA.textContent = ((pts[0] || '')[0] + (pts[1] || '')[0]).toUpperCase() || 'LC';
        }
        const _pp = _fn.split(' ');
        const _lwtA = document.getElementById('lwtAvatar');
        const _lwtN = document.getElementById('lwtUserName');
        const _lwtR = document.getElementById('lwtUserRole');
        if (_lwtA) _lwtA.textContent = ((_pp[0] || '')[0] + (_pp[1] || '')[0]).toUpperCase() || 'LC';
        if (_lwtN) _lwtN.textContent = _fn;
        if (_lwtR) _lwtR.textContent = 'LC Official';
    })();

    if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();
    if (typeof loadContactRequestsForUser === 'function') loadContactRequestsForUser();
}
window.showLcDashboard = showLcDashboard;

let _lcSearchDebounceTimer = null;
function updateLcDashboardCasesDebounced() {
    clearTimeout(_lcSearchDebounceTimer);
    _lcSearchDebounceTimer = setTimeout(function () {
        updateLcDashboardCases();
    }, 250);
}
window.updateLcDashboardCasesDebounced = updateLcDashboardCasesDebounced;

async function updateLcDashboardCases() {
    let table = document.getElementById("lcCasesTable");
    if (!table) return;
    table.innerHTML = "";
    const _mCards = document.getElementById('lcMobileCards');
    if (_mCards) _mCards.innerHTML = '';

    const currentUsername = sessionStorage.getItem('lcdjp_username');
    if (!currentUsername) {
        if (typeof showAlert === 'function') showAlert('Please login first', 'error');
        return;
    }

    let searchText = (document.getElementById('lcCaseSearch')?.value || document.getElementById('lcmCaseSearch')?.value || '').toLowerCase();

    let cases = [];
    try {
        const res = await fetch(API_ENDPOINTS.lcCases(currentUsername), { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to fetch LC cases');
        const data = await res.json();
        cases = (data && Array.isArray(data.cases)) ? data.cases : [];
    } catch (err) {
        console.warn('[LC] Could not load cases:', err.message);
        if (table) {
            table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">Could not load cases. Please try again.</td></tr>`;
        }
        if (_mCards) {
            _mCards.innerHTML = '<p style="text-align:center;color:#667085;padding:24px 0;">Could not load cases. Please try again.</p>';
        }
        return;
    }

    let totalCases = 0, activeCases = 0, resolvedCases = 0;
    let _rowsHtml = '', _cardsHtml = '';

    cases.forEach(function (c) {
        const caseRef = (typeof getCaseReference === 'function' ? getCaseReference(c) : null) || c.case_reference || c.caseId || '';
        const _cVillage = c.village || '';
        const _cParish = c.parish || '';
        const _cDistrict = c.district || '';

        const searchableText = [caseRef, c.case_type, c.citizen_name, c.citizen_id, _cVillage, _cParish, _cDistrict, c.status]
            .filter(Boolean).join(' ').toLowerCase();
        if (searchText && !searchableText.includes(searchText)) return;

        totalCases++;
        const isResolved = (c.status === 'Resolved' || c.status === 'Closed');
        const isMine = c.assigned_lc === currentUsername || c.current_handler === currentUsername;
        const isUnclaimed = !c.assigned_lc && !c.current_handler;

        const locBadge = `${escapeHtml(_cVillage || 'N/A')}, ${escapeHtml(_cParish || _cDistrict || 'N/A')}`;

        let actionsHtml, statusBadge;
        if (isResolved) {
            statusBadge = '<span class="badge badge-resolved">Resolved</span>';
            actionsHtml = `<button onclick="viewCase(${escapeHtml(JSON.stringify(caseRef))})" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>`;
        } else if (isMine) {
            activeCases++;
            statusBadge = `<span class="badge badge-success">${escapeHtml(c.status || 'Accepted by LC')}</span>`;
            actionsHtml = `
                <button onclick="viewCase(${escapeHtml(JSON.stringify(caseRef))})" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>
                <button onclick="resolveCase(${escapeHtml(JSON.stringify(caseRef))})" class="btn btn-sm" style="background:#1a237e;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Resolve</button>
                <button onclick="showForwardRouterForm(${escapeHtml(JSON.stringify(caseRef))})" class="btn btn-sm" style="background:#af7100;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Escalate</button>
                <button onclick="lawyerSendMessage(${escapeHtml(JSON.stringify(caseRef))})" class="btn btn-sm" style="background:#1a237e;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Message</button>`;
        } else if (isUnclaimed) {
            activeCases++;
            statusBadge = `<span class="badge badge-info">${escapeHtml(c.status || 'Pending')}</span>`;
            actionsHtml = `
                <button onclick="viewCase(${escapeHtml(JSON.stringify(caseRef))})" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>
                <button onclick="acceptLcCase(${escapeHtml(JSON.stringify(caseRef))})" class="btn btn-sm btn-success" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Accept</button>`;
        } else {
            activeCases++;
            statusBadge = `<span class="badge badge-info">${escapeHtml(c.status || 'Assigned')}</span>`;
            actionsHtml = `<button onclick="viewCase(${escapeHtml(JSON.stringify(caseRef))})" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>`;
        }

        _rowsHtml += `
            <tr>
                <td><strong>${escapeHtml(caseRef)}</strong></td>
                <td>${escapeHtml(c.case_type || 'N/A')}</td>
                <td>${escapeHtml(c.citizen_name || c.citizen_id || 'Unknown')}</td>
                <td>${locBadge}</td>
                <td>${statusBadge}</td>
                <td>${actionsHtml}</td>
            </tr>`;

        if (_mCards) {
            const _mBadgeColor = isResolved ? '#28a745' : (isMine ? '#1a4080' : '#af7100');
            const _lmPill = function (label, color, onclick, solid) {
                return '<button type="button" onclick="' + onclick + '" ' +
                    'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;border-radius:8px;cursor:pointer;' +
                    (solid
                        ? 'background:' + color + ';color:#fff;border:1px solid ' + color + ';'
                        : 'background:#fff;color:' + color + ';border:1px solid ' + color + ';') +
                    '">' + label + '</button>';
            };
            let _mActs;
            if (isResolved) {
                _mActs = _lmPill('View', '#16305c', "viewCase(" + escapeHtml(JSON.stringify(caseRef)) + ")", false);
            } else if (isMine) {
                _mActs = _lmPill('View', '#16305c', "viewCase(" + escapeHtml(JSON.stringify(caseRef)) + ")", false) +
                    _lmPill('Message', '#2c5fa3', "lawyerSendMessage(" + escapeHtml(JSON.stringify(caseRef)) + ")", false) +
                    _lmPill('Resolve', '#3a6bc7', "resolveCase(" + escapeHtml(JSON.stringify(caseRef)) + ")", false) +
                    _lmPill('Escalate', '#af7100', "showForwardRouterForm(" + escapeHtml(JSON.stringify(caseRef)) + ")", false);
            } else if (isUnclaimed) {
                _mActs = _lmPill('View', '#16305c', "viewCase(" + escapeHtml(JSON.stringify(caseRef)) + ")", false) +
                    _lmPill('Accept', '#28a745', "acceptLcCase(" + escapeHtml(JSON.stringify(caseRef)) + ")", true);
            } else {
                _mActs = _lmPill('View', '#16305c', "viewCase(" + escapeHtml(JSON.stringify(caseRef)) + ")", false);
            }
            _cardsHtml += '<article class="lm-case" style="background:#fff;border:none;border-radius:12px;' +
                'box-shadow:0 1px 6px rgba(0,0,0,.08);padding:14px 16px;margin-top:12px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
                    '<div>' +
                        '<strong style="font-size:14px;color:#1a237e;">' + escapeHtml(caseRef) + '</strong>' +
                        '<div style="font-size:12px;color:#555;margin-top:2px;">' + escapeHtml(c.case_type || 'N/A') + '</div>' +
                    '</div>' +
                    '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:12px;' +
                          'background:' + _mBadgeColor + ';color:#fff;white-space:nowrap;">' + escapeHtml(c.status || 'Pending') + '</span>' +
                '</div>' +
                '<div style="font-size:12px;color:#555;margin-top:10px;">' +
                    '<strong style="color:#142047;">' + escapeHtml(c.citizen_name || c.citizen_id || 'Unknown') + '</strong> &middot; ' + locBadge +
                '</div>' +
                '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">' + _mActs + '</div>' +
            '</article>';
        }

        if (isResolved) resolvedCases++;
    });

    table.innerHTML = _rowsHtml || `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">
        ${searchText ? 'No cases match your search.' : 'No district cases found.'}
    </td></tr>`;
    if (_mCards) {
        _mCards.innerHTML = _cardsHtml || (searchText
            ? '<p style="text-align:center;color:#667085;padding:24px 0;">No cases match your search.</p>'
            : '<p style="text-align:center;color:#667085;padding:24px 0;">No district cases found.</p>');
    }

    const _t = document.getElementById('lcTotalCases');
    const _a = document.getElementById('lcActiveCases');
    const _r = document.getElementById('lcResolvedCases');
    if (_t) _t.textContent = totalCases;
    if (_a) _a.textContent = activeCases;
    if (_r) _r.textContent = resolvedCases;
    const _mt = document.getElementById('lcmTotalCases');
    const _ma = document.getElementById('lcmActiveCases');
    const _mr = document.getElementById('lcmResolvedCases');
    if (_mt) _mt.textContent = totalCases;
    if (_ma) _ma.textContent = activeCases;
    if (_mr) _mr.textContent = resolvedCases;
}
window.updateLcDashboardCases = updateLcDashboardCases;

async function loadLcNotifications() {
    const username = sessionStorage.getItem("lcdjp_username");
    const container = document.getElementById("lcNotificationsContainer");
    if (!username || !container) return;

    const headers = getAuthHeaders();
    let notifications = [];
    try {
        const resp = await fetch(API_ENDPOINTS.userNotifications(username), { headers: headers });
        if (resp.ok) {
            const data = await resp.json();
            notifications = Array.isArray(data) ? data : (data.notifications || []);
            fetch(API_ENDPOINTS.markAllNotificationsRead(username), {
                method: 'PUT', headers: headers
            }).catch(function (e) { console.warn('mark-read failed:', e); });
        }
    } catch (err) {
        console.warn('loadLcNotifications error:', err);
    }

    if (notifications.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;padding:30px 0;">No notifications.</p>';
        return;
    }

    const sorted = notifications.slice().sort(function (a, b) {
        return new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0);
    });

    let html = '<div style="border-top:1px solid #e5e7eb;">';
    sorted.forEach(function (n) {
        const caseId = (typeof getNotificationCaseReference === 'function' ? getNotificationCaseReference(n) : null)
            || (typeof getCaseIdentifier === 'function' ? getCaseIdentifier(n) : null);
        const when = n.date || n.timestamp || '';
        const clickable = !!caseId;
        html += `
            <div style="padding:12px 4px;border-bottom:1px solid #e5e7eb;${clickable ? 'cursor:pointer;' : ''}"
                 ${clickable ? `onclick="viewCase(${escapeHtml(JSON.stringify(caseId))})"` : ''}>
                <div style="font-size:14px;color:#222;">${escapeHtml(n.message || '')}</div>
                <div style="font-size:12px;color:#888;margin-top:3px;">${escapeHtml(when)}${caseId ? ' &middot; Case: ' + escapeHtml(caseId) : ''}</div>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}
window.loadLcNotifications = loadLcNotifications;

async function acceptLcCase(caseId) {
    try {
        const res = await fetch(API_ENDPOINTS.lcAcceptCase(caseId), {
            method: 'PUT', headers: getAuthHeaders()
        });
        if (!res.ok) {
            const err = await res.json().catch(function () { return {}; });
            if (typeof showToast === 'function') showToast(err.error || 'Could not accept case ' + caseId + '.');
            else alert(err.error || 'Could not accept case ' + caseId + '.');
            return;
        }
    } catch (err) {
        console.warn('[LC] Accept failed:', err.message);
        if (typeof showToast === 'function') showToast('Could not reach the server. Please try again.');
        return;
    }
    if (typeof showToast === 'function') showToast('Case ' + caseId + ' accepted.');
    updateLcDashboardCases();
}
window.acceptLcCase = acceptLcCase;

function mobileShowLcCases(body) {
    const lcDashEl = document.getElementById('lcDashboard');
    if (lcDashEl && typeof showLcDashboard === 'function') showLcDashboard();

    const cardsHost = document.getElementById('lcMobileCards');
    const searchLabel = document.querySelector('#lcDashboard .lm-search');
    const moreLink = document.getElementById('lcMobileCardsMore');

    if (body && cardsHost) {
        if (moreLink) moreLink.style.display = 'none';
        const cardsHomeParent = cardsHost.parentNode;
        const cardsHomeNext = cardsHost.nextSibling;
        const searchHomeParent = searchLabel ? searchLabel.parentNode : null;
        const searchHomeNext = searchLabel ? searchLabel.nextSibling : null;
        const wasCollapsed = cardsHost.classList.contains('lmc-collapsed');
        cardsHost.classList.remove('lmc-collapsed');

        if (searchLabel) body.appendChild(searchLabel);
        body.appendChild(cardsHost);

        const overlay = document.getElementById('mobileFullPage');
        const closeBtn = overlay ? overlay.querySelector('button[aria-label="Close"]') : null;
        if (closeBtn) {
            closeBtn.addEventListener('click', function restoreCases() {
                if (searchLabel && searchHomeParent) searchHomeParent.insertBefore(searchLabel, searchHomeNext);
                if (cardsHomeParent) cardsHomeParent.insertBefore(cardsHost, cardsHomeNext);
                if (wasCollapsed) cardsHost.classList.add('lmc-collapsed');
                updateLcDashboardCases();
                closeBtn.removeEventListener('click', restoreCases);
            });
        }
    }

    updateLcDashboardCases();
    if (!body) {
        setTimeout(function () {
            document.getElementById('lcMobileCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
    }
}
window.mobileShowLcCases = mobileShowLcCases;

function lcOpenCasesOverlay() {
    document.querySelectorAll('.lm-nav-item').forEach(function (n) { n.classList.remove('active'); });
    const navCases = document.getElementById('lcNavCases');
    if (navCases) navCases.classList.add('active');
    if (typeof openMobileSection === 'function') {
        openMobileSection('lc', 'My Cases', mobileShowLcCases);
    }
}
window.lcOpenCasesOverlay = lcOpenCasesOverlay;
