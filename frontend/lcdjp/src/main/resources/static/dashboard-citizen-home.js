


(function() {
    document.addEventListener('touchend', function(e) {
        var ov = document.getElementById('mapPickerOverlay');
        if (ov && ov.style.display === 'flex' && e.target === ov) {
            if (typeof closeMapPicker === 'function') closeMapPicker();
        }
    }, { passive: true });
})();


(function() {
    function _syncFindHelpNav() {
        var el = document.getElementById('citizenNavExtras');
        if (!el) return;
        if (el.style.display && el.style.display !== 'none') {
            
            if (window.innerWidth < 768) el.style.display = 'none';
        }
    }
    window.addEventListener('resize', _syncFindHelpNav);
    
    setTimeout(_syncFindHelpNav, 500);
    setTimeout(_syncFindHelpNav, 1500);
})();


function saveLocation(lat, lng) {
    sessionStorage.setItem('lcdjp_selected_lat', lat);
    sessionStorage.setItem('lcdjp_selected_lng', lng);

    var latInput = document.getElementById('latitude');
    var lngInput = document.getElementById('longitude');

    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;

    if (typeof showToast === 'function') {
        showToast('Location saved successfully!');
    }
    removeLocationMarker();
}

function init() {
    var hamburger = document.getElementById('lcdjpHamburger');
    var closeBtn  = document.getElementById('lcdjpSidebarClose');
    var overlay   = document.getElementById('lcdjpSidebarOverlay');
    var sidebar   = document.getElementById('mainSidebar');

    if (!hamburger || !closeBtn || !overlay || !sidebar) {
        setTimeout(init, 200);
        return;
    }

    if (sidebar.dataset.mobileInited === '1') return;
    sidebar.dataset.mobileInited = '1';

    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isMobile()) openSidebar();
    });

    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeSidebar();
    });

    overlay.addEventListener('click', function() {
        closeSidebar();
    });

    sidebar.addEventListener('click', function(e) {
        if (!isMobile()) return;
        var node = e.target;
        while (node && node !== sidebar) {
            if (node.tagName === 'A' || node.tagName === 'BUTTON' || node.onclick) {
                setTimeout(closeSidebar, 300);
                break;
            }
            node = node.parentNode;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


function _cmSetGreeting() {
    const fn  = sessionStorage.getItem('lcdjp_fullname') || sessionStorage.getItem('lcdjp_username') || '';
    const first = fn.split(' ')[0] || 'there';
    const h = new Date().getHours();
    const g = h < 12 ? 'Hello' : h < 17 ? 'Good afternoon' : 'Good evening';
    const elG = document.getElementById('cmGreeting');
    if (elG) elG.textContent = g + ', ' + first;
    const elA = document.getElementById('cmAvatar');
    if (elA) {
        const pts = fn.split(' ');
        elA.textContent = ((pts[0]||'')[0] + (pts[1]||'')[0]).toUpperCase() || '?';
    }
}

function _cmBuildCaseCard(cas) {
    const el = document.getElementById('cmActiveCaseCard');
    if (!el) return;
    const ref = getCaseIdentifier(cas) || 'N/A';
    const st  = cas.status || 'Pending';

    const lvl  = (cas.current_level || cas.level || '').toLowerCase();
    const done1 = true;
    const done2 = lvl.includes('lc') || lvl.includes('lawyer') || st === 'Resolved';
    const done3 = (lvl.includes('lawyer') || st === 'Accepted by Lawyer' || st === 'Forwarded to Lawyer');
    const done4 = st === 'Resolved';

    const stageName = done4 ? 'Resolved'
                    : done3 ? 'With lawyer'
                    : done2 ? 'At LC office'
                    : 'Submitted';

    let badgeCls = 'cm-badge-pending';
    let badgeTxt = 'Pending';
    if (st === 'Resolved') { badgeCls = 'cm-badge-resolved'; badgeTxt = 'Resolved'; }
    else if (st === 'Accepted by Lawyer' || st === 'Awaiting Lawyer Selection') { badgeCls = 'cm-badge-inprog'; badgeTxt = 'In progress'; }
    else if (st && st.startsWith('Forwarded')) { badgeCls = 'cm-badge-inprog'; badgeTxt = 'In progress'; }

    el.innerHTML = `
      <div class="cm-case-top">
        <div><p>My active case</p><strong>${escapeHtml(ref)}</strong></div>
        <span class="cm-status-badge ${badgeCls}">${badgeTxt}</span>
      </div>
      <div class="cm-progress">
        <span class="${done1 ? 'done' : ''}"></span>
        <span class="${done2 ? 'done' : ''}"></span>
        <span class="${done3 ? 'done' : ''}"></span>
        <span class="${done4 ? 'done' : ''}"></span>
      </div>
      <div class="cm-stage">
        <span>Submitted</span><strong>${stageName}</strong><span>Resolved</span>
      </div>`;
}








function _lcdjpRefreshCitizenCaseData(uname, headersOverride) {
    const activeUname = uname || (typeof getLcdjpActiveUsername === 'function'
        ? getLcdjpActiveUsername()
        : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username')));
    if (!activeUname) return Promise.resolve();
    if (typeof window._lcdjpProtectedDataAccessAllowed === 'function' &&
        !window._lcdjpProtectedDataAccessAllowed()) return Promise.resolve();

    const headers = headersOverride || _getDashboardAuthHeaders();
    return fetch(API_ENDPOINTS.citizenCases(activeUname), {
        suppressAuthRedirect: true,
        headers: headers
    })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (!data) return;
            const cases = (data.success && data.cases) ? data.cases : (Array.isArray(data) ? data : []);
            if (!cases.length) return;
            cases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const active = cases.find(c => c.status !== 'Resolved') || cases[0];
            _cmBuildCaseCard(active);

            const actEl = document.getElementById('cmActivity');
            if (actEl && cases.length) {
                actEl.innerHTML = cases.slice(0, 3).map(cas => {
                    const ref = cas.caseReference || cas.caseNumber || (cas.id ? String(cas.id) : '') || '';
                    const escapedRef = ref ? escapeHtml(JSON.stringify(String(ref))) : '';
                    const activityAttrs = ref
                        ? `style="cursor:pointer;" onclick="viewCitizenCase(${escapedRef})" `
                        : 'style="cursor:default;"';
                    return `<div class="cm-activity-row" ${activityAttrs}>
                      <div><strong>${escapeHtml(cas.case_type || 'Case')}, ${escapeHtml(cas.status || 'Pending')}</strong>
                      <p>${escapeHtml(ref || 'N/A')} &bull; ${escapeHtml(cas.village || cas.parish || '')}</p></div>
                    </div>`;
                }).join('');
            }

            const caseStat = document.getElementById('cmStatCases');
            if (caseStat) {
                caseStat.textContent = String(cases.filter(c => c.status !== 'Resolved').length);
            }
        })
        .catch(() => {});
}
window._lcdjpRefreshCitizenCaseData = _lcdjpRefreshCitizenCaseData;

function _cmActivate() {
    if (window.LCDJP_AUTH_READY !== true ||
        window.LCDJP_AUTH_VALIDATED !== true) return;
    const role = sessionStorage.getItem('lcdjp_userlevel') || '';
    const roleLower = role.toLowerCase();
    if (!role || (!roleLower.includes('citizen') && roleLower !== 'lc')) return;
    const view = document.getElementById('citizenMobileView');
    if (!view) return;
    view.classList.add('cm-active');
    _cmSetGreeting();

    const uname = typeof getLcdjpActiveUsername === 'function'
        ? getLcdjpActiveUsername()
        : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    
    
    var cmToken = _getDashboardToken();
    if (!uname || !cmToken) return;
    if (typeof window._lcdjpProtectedDataAccessAllowed === 'function' &&
        !window._lcdjpProtectedDataAccessAllowed()) return;
    
    const verificationStatus = String(
        sessionStorage.getItem('lcdjp_verif_status') ||
        localStorage.getItem('verificationStatus') || ''
    ).trim().toUpperCase();
    const normalizedRole = String(
        sessionStorage.getItem('lcdjp_userlevel') ||
        localStorage.getItem('userRole') || ''
    ).trim().toUpperCase();
    const canViewCases = normalizedRole === 'ADMIN' ||
        normalizedRole === 'SYSTEM_ADMIN' ||
        normalizedRole === 'SYSTEM_ADMINISTRATOR' ||
        normalizedRole === 'DISTRICT_ADMIN' ||
        verificationStatus === 'APPROVED' ||
        verificationStatus === 'VERIFIED';
    if (!canViewCases) return;

    _lcdjpRefreshCitizenCaseData(uname, _getDashboardAuthHeaders());
}


(function() {
    
    
    
    
    
    
    
    
    
    
    var _cmTimer = setInterval(function() {
        if (window.LCDJP_AUTH_READY !== true ||
            window.LCDJP_AUTH_VALIDATED !== true) return;
        var role = sessionStorage.getItem('lcdjp_userlevel') || '';
        var roleLower = role.toLowerCase();
        if (roleLower.includes('citizen') || roleLower === 'lc') {
            _cmActivate();
            clearInterval(_cmTimer);
        }
    }, 600);
})();