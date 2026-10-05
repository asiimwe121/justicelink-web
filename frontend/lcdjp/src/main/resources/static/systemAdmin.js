




function showDistrictAdminManagement() {
    hideAllDashboardViews();
    var adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) adminDashboard.style.display = 'block';

    
    ['adminHomeContainer','approvalContainer','userManagementContainer',
     'lawyerManagementContainer','lawyerPerformanceContainer','statisticsContainer',
     'pdfExportContainer','searchResultsContainer','legalOrgsAdminContainer',
     'auditLogsContainer'
    ].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    var container = document.getElementById('districtAdminContainer');
    if (container) container.style.display = 'block';

    setAdminActiveMenu('adminMenu_districtAdmins');
    _populateDADistrictDropdown();
}

if (typeof lcdjpContactVerifyRegisterFields === 'function') {
    lcdjpContactVerifyRegisterFields('daContactVerify', 'DISTRICT_ADMIN', 'daEmail', 'daPhone');
}

function _populateDADistrictDropdown() {
    var sel = document.getElementById('daDistrict');
    if (!sel || sel.options.length > 1) return; 
    var districts = (typeof ugandaDistricts !== 'undefined') ? ugandaDistricts.slice().sort() : [];
    districts.forEach(function(d) {
        var opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        sel.appendChild(opt);
    });
}

async function createDistrictAdmin(event) {
    event.preventDefault();
    var msgEl  = document.getElementById('daFormMsg');
    var btn    = document.getElementById('daSubmitBtn');
    var fields = {
        username:  (document.getElementById('daUsername')  || {}).value || '',
        password:  (document.getElementById('daPassword')  || {}).value || '',
        firstName: (document.getElementById('daFirstName') || {}).value || '',
        lastName:  (document.getElementById('daLastName')  || {}).value || '',
        email:     (document.getElementById('daEmail')     || {}).value || '',
        phone:     (document.getElementById('daPhone')     || {}).value || '',
        district:  (document.getElementById('daDistrict')  || {}).value || ''
    };

    
    for (var key in fields) {
        if (!fields[key]) {
            _daShowMsg('error', 'All fields are required.'); return;
        }
    }
    if (fields.password.length < 8) {
        _daShowMsg('error', 'Password must be at least 8 characters.'); return;
    }
    if (!lcdjpContactVerifyIsDone('daContactVerify', fields.email, fields.phone)) {
        _daShowMsg('error', 'Please verify the email/phone above with the code sent to it before creating the account.');
        return;
    }

    btn.disabled = true; btn.textContent = 'Creating…';
    _daShowMsg('', '');

    try {
        var resp = await authFetch(API_BASE_URL + '/api/district-admin/create', {
            method: 'POST',
            body: JSON.stringify(fields)
        });
        var data = await resp.json();
        if (resp.ok && (data.success !== false)) {
             _daShowMsg('success', 'District admin "' + fields.username + '" created successfully. Find and manage it under User Management.');
            document.getElementById('createDistrictAdminForm').reset();
            lcdjpContactVerifyReset('daContactVerify');
        } else {
            _daShowMsg('error', data.error || data.message || 'Failed to create district admin.');
        }
    } catch(e) {
        _daShowMsg('error', 'Network error: ' + e.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Create District Admin';
    }
}

function _daShowMsg(type, text) {
    var el = document.getElementById('daFormMsg');
    if (!el) return;
    if (!text) { el.style.display = 'none'; el.textContent = ''; return; }
    el.style.display = 'block';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '7px';
    el.style.marginTop = '2px';
    if (type === 'success') {
        el.style.background = '#e8f5e9'; el.style.color = '#2e7d32'; el.style.border = '1px solid #a5d6a7';
    } else {
        el.style.background = '#ffebee'; el.style.color = '#c62828'; el.style.border = '1px solid #ef9a9a';
    }
    el.textContent = text;
}



async function _saFindActiveDistrictAdmin(district) {
    if (!district) return null;
    try {
        var resp = await authFetch(API_ENDPOINTS.users, { method: 'GET' });
        if (!resp.ok) return null;
        var raw = await resp.json();
        var all = Array.isArray(raw) ? raw : (raw.users || []);
        var match = all.find(function (u) {
            var role = String(u.role || u.userType || '').toUpperCase();
            var isDA = role === 'DISTRICT_ADMIN' || role === 'DISTRICT ADMIN' || role === 'DISTRICT ADMINISTRATOR';
            var sameDistrict = String(u.district || '').trim().toLowerCase() === district.trim().toLowerCase();
            var isDisabled = String(u.approvalStatus || u.approval_status || '').toLowerCase() === 'disabled';
            return isDA && sameDistrict && !isDisabled;
        });
        return match || null;
    } catch (e) {
        console.warn('[SystemAdmin] Could not verify district admin availability:', e.message);
        return null;
    }
}

async function showCreateLCFallbackForm() {
    var picker = document.createElement('div');
    picker.setAttribute('data-lcdjp-lc-district-picker', '1');
    picker.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    var districts = (typeof ugandaDistricts !== 'undefined') ? ugandaDistricts.slice().sort() : [];
    picker.innerHTML =
        '<div style="background:white;border-radius:16px;max-width:420px;width:100%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.25);">' +
            '<h3 style="color:#1a4080;margin:0 0 8px;">Create LC Account</h3>' +
            '<p style="font-size:12.5px;color:#666;margin:0 0 14px;">' +
                'LC accounts are normally created by the District Admin for that district. ' +
                'As System Admin, you may only create one directly if that district currently has ' +
                'no active District Admin.' +
            '</p>' +
            '<select id="lcFallbackDistrict" style="width:100%;padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;">' +
                '<option value="">Select district…</option>' +
                districts.map(function (d) { return '<option value="' + d + '">' + d + '</option>'; }).join('') +
            '</select>' +
            '<div id="lcFallbackMsg" style="display:none;margin-top:10px;padding:9px 12px;border-radius:7px;font-size:12.5px;"></div>' +
            '<div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">' +
                '<button data-lc-fb-cancel style="padding:9px 18px;background:#f0f0f0;color:#333;border:none;border-radius:7px;cursor:pointer;font-size:13px;">Cancel</button>' +
                '<button data-lc-fb-continue style="padding:9px 18px;background:#1a4080;color:white;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;">Continue</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(picker);
    picker.addEventListener('click', function (e) { if (e.target === picker) picker.remove(); });
    picker.querySelector('[data-lc-fb-cancel]').onclick = function () { picker.remove(); };
    picker.querySelector('[data-lc-fb-continue]').onclick = async function () {
        var district = document.getElementById('lcFallbackDistrict').value.trim();
        var msgEl = document.getElementById('lcFallbackMsg');
        function showMsg(text) {
            msgEl.style.display = 'block';
            msgEl.style.background = '#fff3cd'; msgEl.style.color = '#856404';
            msgEl.textContent = text;
        }
        if (!district) { showMsg('Please select a district.'); return; }

        var existingAdmin = await _saFindActiveDistrictAdmin(district);
        if (existingAdmin) {
            showMsg('District Admin "@' + existingAdmin.username + '" already manages ' + district +
                '. LC accounts for this district must be created by them.');
            return;
        }

        picker.remove();
        if (typeof _daBuildLCFormModal !== 'function') {
            alert('LC creation form is unavailable right now.');
            return;
        }
        _daBuildLCFormModal({
            district: district,
            lockDistrict: true,
            noticeHtml: '<p style="font-size:12.5px;color:#996a00;background:#fff8e1;border:1px solid #ffe082;border-radius:7px;padding:8px 12px;margin:0;">' +
                'No District Admin is currently assigned to <strong>' + district + '</strong>. ' +
                'This account will be created as a System Admin fallback and flagged for follow-up.' +
                '</p>',
            onSubmit: async function (fields, showFormMsg, modal) {
                showFormMsg('', '');
                fields.createdBy = 'SYSTEM_ADMIN_FALLBACK';
                fields.fallbackReason = 'no_district_admin';
                try {
                    var resp = await authFetch(API_ENDPOINTS.createLC, {
                        method: 'POST',
                        body: JSON.stringify(fields)
                    });
                    var data = await resp.json();
                    if (resp.ok && data.success !== false) {
                        showFormMsg('success', 'LC account "' + fields.username + '" created successfully for ' + district + '.');
                        setTimeout(function () { modal.remove(); }, 900);
                    } else {
                        showFormMsg('error', data.error || data.message || 'Failed to create LC account.');
                    }
                } catch (e) {
                    showFormMsg('error', 'Network error: ' + e.message);
                }
            }
        });
    };
}
window.showCreateLCFallbackForm = showCreateLCFallbackForm;

function showAdminHome() {
    if (typeof hideAppLoader === 'function') hideAppLoader();
    hideAllDashboardViews();
    
    
    
    
    
    document.body.classList.add('admin-map-active');
    var adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) adminDashboard.style.display = 'block';
    var adminHomeContainer = document.getElementById('adminHomeContainer');
    if (adminHomeContainer) adminHomeContainer.style.display = 'block';
    setAdminActiveMenu('adminMenu_home');
    if (typeof syncAdminMapHeight === 'function') syncAdminMapHeight();
    buildAdminMap();
}


function showHome() {
    
    
    
    
    
    
    
    
    const _now = Date.now();
    if (window._lcdjpLastShowHomeCall && (_now - window._lcdjpLastShowHomeCall) < 1500) {
        console.log("showHome() skipped - duplicate call within 1.5s");
        return;
    }
    window._lcdjpLastShowHomeCall = _now;

    if (typeof hideAppLoader === 'function') hideAppLoader();

    const footer = document.getElementById("mainFooter");
    
    console.log("showHome() called - currentUserLevel:", currentUserLevel);
     setTimeout(function() {
        typeWelcomeMessage();
    }, 300);
    
    
    
    
    
    if (currentUserLevel === "Lawyer") {
        document.body.classList.remove('citizen-dashboard-mode', 'admin-dashboard-mode');
        document.body.classList.add('lawyer-dashboard-mode');
        
        if (footer) {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
        
        console.log("Showing Lawyer Dashboard");
        showLawyerDashboard();
        return;
    }
    
    if (currentUserLevel === "LC" || currentUserLevel === "LC Official" ||
        currentUserLevel === "LC1" || currentUserLevel === "LC2" || currentUserLevel === "LC3") {
        if (typeof showLcDashboard === 'function') {
            showLcDashboard();
            return;
        }
    }

    if (currentUserLevel === "Admin" || currentUserLevel === "System Administrator" || currentUserLevel === "SYSTEM_ADMIN") {
        document.body.classList.remove('citizen-dashboard-mode', 'lawyer-dashboard-mode');
        document.body.classList.add('admin-dashboard-mode');
        
        if (footer) {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
        
        const pdfExport = document.getElementById('pdfExportContainer');
        if (pdfExport) pdfExport.style.display = 'none';
        
        const statsContainer = document.getElementById('statisticsContainer');
        if (statsContainer) statsContainer.style.display = 'none';
        
        const searchResults = document.getElementById('searchResultsContainer');
        if (searchResults) searchResults.style.display = 'none';
        
        const searchSuggestions = document.getElementById('searchSuggestions');
        if (searchSuggestions) searchSuggestions.style.display = 'none';
        
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) chatContainer.style.display = 'none';
        
        const adminMsgBtn = document.getElementById('adminMessagesBtn');
        if (adminMsgBtn) adminMsgBtn.style.display = 'block';
        
        updateAdminMessageBadge();
        startAdminPolling();
        
        console.log("Showing Admin Dashboard");
        showAdminHome();
        return;
    }

    
    if (currentUserLevel === 'DISTRICT_ADMIN') {
        document.body.classList.remove(
            'citizen-dashboard-mode', 'lawyer-dashboard-mode');
        document.body.classList.add('admin-dashboard-mode');
        if (footer) {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
        var _daAdminSBH = document.getElementById('adminSidebarMenu');
        if (_daAdminSBH) _daAdminSBH.style.display = 'none';
        var _daSBH = document.getElementById('daSidebarMenu');
        if (_daSBH) { _daSBH.style.display = 'block'; _daSBH.style.visibility = 'visible'; }
        var _cSBH = document.getElementById('citizenSidebarMenu');
        if (_cSBH) _cSBH.style.display = 'none';
        var _lSBH = document.getElementById('lawyerSidebarMenu');
        if (_lSBH) _lSBH.style.display = 'none';
        console.log("Showing District Admin Dashboard");
        if (typeof showDistrictAdminDashboard === 'function') showDistrictAdminDashboard();
        return;
    }
    

    document.body.classList.remove('lawyer-dashboard-mode', 'admin-dashboard-mode');
    document.body.classList.add('citizen-dashboard-mode');
    
    if (footer) {
        footer.style.display = "block";
        footer.style.visibility = "visible";
        footer.style.opacity = "1";
        footer.style.height = "auto";
        footer.style.padding = "30px 20px 20px";
        footer.style.margin = "0 15px 0 15px";
        footer.style.overflow = "visible";
        footer.style.border = "1px solid rgba(26, 64, 128, 0.1)";
    }
    
    document.getElementById("mainSidebar").style.display = "block";
    hideAllDashboardViews();
    
    const homePage = document.getElementById("homePage");
    if (homePage) homePage.style.display = "block";
    
    const dashboardLayout = document.querySelector(".dashboard-layout");
    if (dashboardLayout) {
        dashboardLayout.style.display = "flex";
        dashboardLayout.style.gap = "";
    }
    const contentArea = document.getElementById("contentArea");
    if (contentArea) {
        contentArea.style.width = "";
        contentArea.style.maxWidth = "";
        contentArea.style.padding = "";
        contentArea.style.margin = "";
    }
    
    console.log("Showing Citizen Homepage");
    buildCompactCitizenHomepage();

    
    setTimeout(function() {
        if (typeof window.initCitizenMobileMap === 'function') {
            window.initCitizenMobileMap(false);
        }
    }, 200);
}

function showMyCases() {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('This feature is not available at this time.');
        }
        return;
    }
    if (window.innerWidth >= 768 &&
        sessionStorage.getItem('lcdjp_userlevel') === 'Citizen' &&
        typeof window.openDesktopCitizenMyCases === 'function') {
        window.openDesktopCitizenMyCases();
        return;
    }
    hideAllDashboardViews();
    const page = document.getElementById("myCasesPage");
    if (page) {
        page.style.display = "block";
    }
    updateMyCases();
}

function showAdminApprovals() {
    
    const dynamicPage = document.getElementById('dynamicFormPage');
    if (dynamicPage) {
        dynamicPage.innerHTML = '';
        dynamicPage.style.display = 'none';
    }
    
   
    hideAllDashboardViews();
    document.getElementById("adminDashboard").style.display = "block";

    
    const containers = [
        'adminHomeContainer',
        'userManagementContainer',
        'lawyerManagementContainer',
        'lawyerPerformanceContainer',
        'pdfExportContainer',
        'statisticsContainer',
        'searchResultsContainer'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    
    const dynPage = document.getElementById('dynamicFormPage');
    if (dynPage) { 
        dynPage.innerHTML = ''; 
        dynPage.style.display = 'none'; 
    }

   
    const approvalContainer = document.getElementById("approvalContainer");
    if (approvalContainer) {
        approvalContainer.style.display = "block";
    }

    
    const searchSuggestions = document.getElementById("searchSuggestions");
    if (searchSuggestions) searchSuggestions.style.display = "none";

    setAdminActiveMenu('adminMenu_verifications');

    
    loadPendingApprovals();
    renderNavbarNotifBadge();
}


function showAdminNotificationsPage() {
    console.log(" showAdminNotificationsPage called");
    
    hideAllDashboardViews();
    
    const adminDashboard = document.getElementById("adminDashboard");
    if (adminDashboard) {
        adminDashboard.style.display = "block";
    }
    
    const containers = [
        'approvalContainer',
        'userManagementContainer',
        'lawyerManagementContainer',
        'lawyerPerformanceContainer',
        'pdfExportContainer',
        'statisticsContainer',
        'searchResultsContainer'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    let page = document.getElementById("adminNotificationsPage");
    if (!page) {
        console.warn("adminNotificationsPage element not found, creating it...");
        createAdminNotificationsPage();
        page = document.getElementById("adminNotificationsPage");
    }
    
    if (page) {
        page.style.display = 'block';
        page.style.visibility = 'visible';
        page.style.opacity = '1';
        renderAdminNotificationPage();
        renderNavbarNotifBadge();
        console.log(" Admin Notifications page shown");
    } else {
        console.error(" Failed to create adminNotificationsPage");
        alert("Error loading notifications. Please refresh the page.");
    }
}

function createAdminNotificationsPage() {
    const adminDashboard = document.getElementById("adminDashboard");
    if (!adminDashboard) return;
    
    let page = document.getElementById("adminNotificationsPage");
    if (page) return;
    
    page = document.createElement('div');
    page.id = 'adminNotificationsPage';
    page.className = 'dashboard-view';
    page.style.display = 'none';
    page.style.padding = '20px';
    
    page.innerHTML = `
        <div id="adminNotifPageCard" style="background:white; border-radius:12px; padding:25px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid #1a4080; padding-bottom:15px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <h2 style="color:#1a4080; margin:0;"> Admin Notifications</h2>
                    <span id="adminNotifPageBadge" style="background:#dc3545; color:white; padding:2px 12px; border-radius:12px; font-size:12px; font-weight:bold; display:none; animation:pulse 1.5s infinite;">0 New</span>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button id="adminNotifMarkAllBtn" onclick="markAllAdminNotificationsAsRead()" style="display:none; padding:8px 16px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;"> Mark All Read</button>
                    <button id="adminNotifPageCloseBtn" onclick="closeNotifications()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
                </div>
            </div>
            
            
            <div id="adminNotificationsPageList" style="max-height:500px; overflow-y:auto;">
                <div style="text-align:center; padding:60px 20px; color:#999;">
                    <div style="font-size:48px; margin-bottom:10px;"></div>
                    <p>No notifications yet</p>
                </div>
            </div>
        </div>
    `;
    
    const adminHeader = adminDashboard.querySelector('.admin-header');
    if (adminHeader) {
        adminHeader.insertAdjacentElement('afterend', page);
    } else {
        adminDashboard.insertAdjacentElement('afterbegin', page);
    }
    
    console.log(" Admin Notifications page created");
}













window.mobileAdminNotifications = function () {
    if (window.innerWidth > 767) {
        if (typeof toggleNotifications === 'function') toggleNotifications();
        return;
    }
    var content = document.getElementById('contentArea');
    if (!content) return;

    var srcPage = document.getElementById('adminNotificationsPage');
    if (!srcPage) {
        createAdminNotificationsPage();
        srcPage = document.getElementById('adminNotificationsPage');
    }
    if (!srcPage) return;

    
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();
    var oldPanel = document.getElementById('mobileAdminNotificationsPanel');
    if (oldPanel) oldPanel.remove();
    if (typeof _lcdjpCloseAdminNotifDropdown === 'function') _lcdjpCloseAdminNotifDropdown();

    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    
    
    if (!srcPage._lcdjpOrigParent) {
        srcPage._lcdjpOrigParent = srcPage.parentNode;
        srcPage._lcdjpOrigNext = srcPage.nextSibling;
    }

    var panel = document.createElement('section');
    panel.id = 'mobileAdminNotificationsPanel';
    panel.className = 'mobile-messages-panel';

    var head = document.createElement('div');
    head.className = 'mobile-role-panel-head';
    head.innerHTML = '<h2>Notifications</h2><button class="mobile-role-panel-close" aria-label="Close">&times;</button>';
    panel.appendChild(head);

    srcPage.style.display = 'block';
    srcPage.style.visibility = 'visible';
    srcPage.style.opacity = '1';
    panel.appendChild(srcPage);

    
    
    
    
    
    
    
    
    
    
    var innerCloseBtn = srcPage.querySelector('#adminNotifPageCloseBtn');
    if (innerCloseBtn) innerCloseBtn.style.display = 'none';

    head.querySelector('button').onclick = function () {
        panel.remove();
        if (innerCloseBtn) innerCloseBtn.style.display = '';
        if (srcPage._lcdjpOrigNext && srcPage._lcdjpOrigNext.parentNode === srcPage._lcdjpOrigParent) {
            srcPage._lcdjpOrigParent.insertBefore(srcPage, srcPage._lcdjpOrigNext);
        } else if (srcPage._lcdjpOrigParent) {
            srcPage._lcdjpOrigParent.appendChild(srcPage);
        }
        srcPage.style.display = 'none';
        
        
        
        
        
        
        
        if (typeof _lcdjpGoToOwnAdminHome === 'function') {
            _lcdjpGoToOwnAdminHome();
        } else if (typeof showAdminHome === 'function') {
            showAdminHome();
        }
    };

    content.appendChild(panel);
    renderAdminNotificationPage();
    if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();
};










function _lcdjpNotifEscHandler(event) {
    if (event.key === 'Escape') _lcdjpCloseAdminNotifDropdown();
}

function _lcdjpGetAdminNotifAnchor() {
    
    
    
    
    return document.getElementById('navNotifBtn')
        || document.querySelector('.cdt-icon-btn[title="Alerts & Notifications"]');
}

function _lcdjpCloseAdminNotifDropdown() {
    const page = document.getElementById('adminNotificationsPage');
    if (page) {
        page.classList.remove('lcdjp-notif-dropdown-open');
        page.style.display = 'none';
        page.style.top = '';
        page.style.right = '';
        page.style.left = '';
        page.style.width = '';
    }
    const backdrop = document.getElementById('lcdjpNotifBackdrop');
    if (backdrop) backdrop.remove();
    document.removeEventListener('keydown', _lcdjpNotifEscHandler);
}

function _lcdjpOpenAdminNotifDropdown() {
    const page = document.getElementById('adminNotificationsPage');
    if (!page) return;

    let backdrop = document.getElementById('lcdjpNotifBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'lcdjpNotifBackdrop';
        backdrop.className = 'lcdjp-notif-backdrop';
        backdrop.addEventListener('click', _lcdjpCloseAdminNotifDropdown);
        document.body.appendChild(backdrop);
    }

    page.classList.add('lcdjp-notif-dropdown-open');
    page.style.display = 'block';
    page.style.visibility = 'visible';
    page.style.opacity = '1';

    const margin = 8;
    const panelWidth = Math.min(360, window.innerWidth - (margin * 2));
    const anchor = _lcdjpGetAdminNotifAnchor();

    if (anchor) {
        const rect = anchor.getBoundingClientRect();
        const right = Math.max(margin, window.innerWidth - rect.right);
        const top = Math.max(margin, rect.bottom + margin);
        page.style.top = top + 'px';
        page.style.right = right + 'px';
    } else {
        
        
        page.style.top = '64px';
        page.style.right = margin + 'px';
    }
    page.style.left = 'auto';
    page.style.width = panelWidth + 'px';

    document.addEventListener('keydown', _lcdjpNotifEscHandler);
}

async function renderAdminNotificationPage() {
    console.log(" renderAdminNotificationPage called");
    
    const listContainer = document.getElementById('adminNotificationsPageList');
    if (!listContainer) {
        console.error(" adminNotificationsPageList not found!");
        return;
    }
    
    let notifications = await getNotificationsForUser('admin');
    if (!Array.isArray(notifications)) notifications = [];
    const unreadCount = await getUnreadCount('admin');
    const urgentArr   = await getUrgentNotifications('admin');
    const urgentCount = Array.isArray(urgentArr) ? urgentArr.length : 0;
    
    console.log(" Found", notifications.length, "notifications,", unreadCount, "unread");
    
    const totalEl = document.getElementById('adminNotifTotalCount');
    const unreadEl = document.getElementById('adminNotifUnreadCount');
    const urgentEl = document.getElementById('adminNotifUrgentCount');
    const badge = document.getElementById('adminNotifPageBadge');
    const markAllBtn = document.getElementById('adminNotifMarkAllBtn');
    
    if (totalEl) totalEl.textContent = notifications.length;
    if (unreadEl) unreadEl.textContent = unreadCount;
    if (urgentEl) urgentEl.textContent = urgentCount;
    
    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = unreadCount + ' New';
        } else {
            badge.style.display = 'none';
        }
    }
    
    if (markAllBtn) {
        markAllBtn.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
    
    let html = '';
    
    if (notifications.length === 0) {
        html = `
            <div style="text-align:center; padding:60px 20px; color:#999;">
                <div style="font-size:48px; margin-bottom:10px;"></div>
                <p>No notifications yet</p>
            </div>
        `;
    } else {
        const sortedNotifications = [...notifications].sort((a, b) => {
            const dateA = new Date(a.timestamp || a.date || 0);
            const dateB = new Date(b.timestamp || b.date || 0);
            return dateB - dateA;
        });
        
        sortedNotifications.forEach(notif => {
            const isUrgent = notif.priority <= 2;
            const bgColor = notif.read ? '#f8f9fa' : (isUrgent ? '#fff3cd' : '#f0f5ff');
            const borderColor = isUrgent ? '#dc3545' : (notif.read ? '#ccc' : '#1a4080');
            const icon = getNotificationIcon(notif.type);
            
            let typeLabel = '';
            if (notif.type === 'case_submitted') typeLabel = ' New Case';
            else if (notif.type === 'case_accepted') typeLabel = ' Case Accepted';
            else if (notif.type === 'case_resolved') typeLabel = ' Case Resolved';
            else if (notif.type === 'case_forwarded') typeLabel = ' Case Forwarded';
            else if (notif.type === 'new_message') typeLabel = ' New Message';
            else if (notif.type === 'urgent') typeLabel = ' URGENT';
            else if (notif.type === 'subscription') typeLabel = ' Subscription';
            else typeLabel = ' System';
            
            html += `
                <div id="notifRow_${notif.id}" onclick="lcdjpOpenNotification(${JSON.stringify(notif).replace(/"/g, '&quot;')})" 
                     style="background:${bgColor}; 
                            padding:15px; 
                            margin-bottom:10px; 
                            border-radius:8px; 
                            cursor:pointer;
                            transition: all 0.2s ease;
                            ${!notif.read ? 'box-shadow: 0 2px 8px rgba(26,64,128,0.1);' : ''}"
                     onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                     onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none';">
                    <div style="display:flex; align-items:flex-start; gap:12px;">
                        <div style="font-size:24px;">${icon}</div>
                        <div style="flex:1;">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                                <div style="font-weight:${notif.read ? 'normal' : 'bold'}; color:${notif.read ? '#555' : '#333'};">
                                    ${notif.message}
                                </div>
                                <span style="font-size:11px; background:#e9ecef; padding:2px 10px; border-radius:10px; color:#666;">${typeLabel}</span>
                            </div>
                            ${notif.caseId ? `<div style="font-size:12px; color:#1a4080; font-weight:bold; margin-top:4px;"> Case: ${notif.caseId}</div>` : ''}
                            <div style="font-size:11px; color:#999; margin-top:4px;">
                                 ${new Date(notif.timestamp || notif.date).toLocaleString()}
                                ${!notif.read ? ' • <span style="color:#dc3545; font-weight:bold;"> New</span>' : ''}
                                ${isUrgent ? ' • <span style="color:#dc3545; font-weight:bold;"> Urgent</span>' : ''}
                            </div>
                        </div>
                        ${!notif.read ? `<div style="width:10px; height:10px; background:#dc3545; border-radius:50%; flex-shrink:0; margin-top:5px;"></div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    listContainer.innerHTML = html;
    console.log(" Admin notifications rendered");
}
async function refreshAdminNotificationPage() {
    await renderAdminNotificationPage();
    renderNavbarNotifBadge();
}








async function goToNotificationFromSearch(notificationId) {
    if (window.innerWidth <= 767 && typeof mobileAdminNotifications === 'function') {
        mobileAdminNotifications();
    } else if (typeof showAdminNotificationsPage === 'function') {
        showAdminNotificationsPage();
    } else {
        return;
    }
    
    
    
    
    await renderAdminNotificationPage();

    const row = document.getElementById('notifRow_' + notificationId);
    if (!row) return;

    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const prevBoxShadow = row.style.boxShadow;
    row.style.transition = 'box-shadow 0.3s ease';
    row.style.boxShadow = '0 0 0 3px #1a4080';
    setTimeout(() => { row.style.boxShadow = prevBoxShadow; }, 1600);
}
window.goToNotificationFromSearch = goToNotificationFromSearch;

function showUserManagement() {
    hideAllDashboardViews();
    document.getElementById("adminDashboard").style.display = "block";

    ['adminHomeContainer','approvalContainer','lawyerManagementContainer',
     'lawyerPerformanceContainer','pdfExportContainer','statisticsContainer','searchResultsContainer'
    ].forEach(function(id){ const el=document.getElementById(id); if(el) el.style.display='none'; });

    setAdminActiveMenu('users');

    const userManagementContainer = document.getElementById('userManagementContainer');
    if (userManagementContainer) {
        userManagementContainer.style.display = 'block';
        if (!document.getElementById('saCreateLCToolbar')) {
            var toolbar = document.createElement('div');
            toolbar.id = 'saCreateLCToolbar';
            toolbar.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:12px;';
            toolbar.innerHTML = '<button onclick="showCreateLCFallbackForm()" style="padding:9px 18px;background:white;color:#1a4080;border:1px solid #1a4080;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;">+ Create LC Account (no District Admin only)</button>';
            var listContainer = document.getElementById('userListContainer');
            if (listContainer && listContainer.parentElement) {
                listContainer.parentElement.insertBefore(toolbar, listContainer);
            } else {
                userManagementContainer.insertBefore(toolbar, userManagementContainer.firstChild);
            }
        }
    }

    loadAllUsers();
}

async function loadAllUsers() {
    const container = document.getElementById('userListContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#999;">
            <div style="font-size:32px; margin-bottom:10px;"></div>
            <p>Loading users...</p>
        </div>
    `;
    
    try {
        const currentUser = sessionStorage.getItem('lcdjp_username');
        if (!currentUser) {
            logoutUser();
            return;
        }

        const response = await fetch(API_ENDPOINTS.users, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                const currentUser = sessionStorage.getItem('lcdjp_username');
                if (currentUser) {
                    const retryResponse = await fetch(API_ENDPOINTS.users, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        const users = data.users || data || [];
                        if (users.length === 0) {
                            container.innerHTML = `
                                <div style="text-align:center; padding:60px 20px; color:#999;">
                                    <div style="font-size:48px; margin-bottom:15px;"></div>
                                    <h3 style="color:#666;">No Users Registered</h3>
                                    <p style="font-size:14px;">There are no registered users in the system yet.</p>
                                </div>
                            `;
                            return;
                        }
                        const nonPending1 = users.filter(u => u.approvalStatus !== 'Pending');
                        container.dataset.users = JSON.stringify(nonPending1);
                        renderUserList(nonPending1);
                        return;
                    }
                }
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        const users = data.users || data || [];

        if (users.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:#999;">
                    <div style="font-size:48px; margin-bottom:15px;"></div>
                    <h3 style="color:#666;">No Users Registered</h3>
                    <p style="font-size:14px;">There are no registered users in the system yet.</p>
                </div>
            `;
            return;
        }

        const nonPending = users.filter(u => u.approvalStatus !== 'Pending');
        container.dataset.users = JSON.stringify(nonPending);
        renderUserList(nonPending);
        
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#dc3545;">
                <div style="font-size:32px; margin-bottom:10px;"></div>
                <p>Error loading users: ${error.message}</p>
                <button onclick="loadAllUsers()" style="margin-top:15px; padding:8px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
                     Retry
                </button>
            </div>
        `;
    }
}
function renderUserList(users) {
    const container = document.getElementById('userListContainer');
    if (!container) return;

    users = (users || []).filter(u => (u.approvalStatus || u.approval_status || '').toLowerCase() !== 'pending');

    if (!users || users.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999;">
                <p>No users found in the database.</p>
            </div>
        `;
        return;
    }

    container.dataset.users = JSON.stringify(users);
    
    let html = `<div style="display:grid; gap:15px;">`;
    
    users.forEach((user, index) => {
        const verifSt = (user.verificationStatus || user.verification_status || '').toUpperCase();
        const status = verifSt === 'PENDING' ? 'Pending Verification' :
                       (verifSt === 'APPROVED' || verifSt === 'VERIFIED') ? 'Verified' :
                       verifSt === 'REJECTED' ? 'Rejected' : 'Not Verified';
        const statusColor = verifSt === 'PENDING' ? '#e8730a' :
                            (verifSt === 'APPROVED' || verifSt === 'VERIFIED') ? '#28a745' :
                            verifSt === 'REJECTED' ? '#dc3545' : '#6c757d';
        
        const roleEmoji = user.role === 'Citizen' ? '' : 
                         user.role === 'Lawyer' ? '' : '';
        
        let profilePic = sessionStorage.getItem('lcdjp_avatar_' + user.username);
        if (!profilePic) {
            profilePic = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231a4080'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
        }
        
        html += `
            <div style="background:white; 
                        border-radius:10px; 
                        padding:18px; 
                        border:1px solid #e5e7eb;">
                <div style="display:flex; gap:15px; align-items:flex-start; flex-wrap:wrap;">
                    <div style="flex-shrink:0;">
                        <img src="${profilePic}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:3px solid ${statusColor};">
                    </div>
                    
                    <div style="flex:1; min-width:200px;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-size:20px;">${roleEmoji}</span>
                            <span style="font-weight:bold; font-size:17px; color:#333;">${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}</span>
                            <span style="background:${statusColor}; color:white; padding:2px 12px; border-radius:12px; font-size:11px; font-weight:bold;">
                                ${status}
                            </span>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:5px; margin-top:8px; font-size:13px; color:#666;">
                            <div><strong>Username:</strong> @${user.username}</div>
                            <div><strong>User ID:</strong> ${user.user_id || user.id || 'N/A'}</div>
                            <div><strong>Phone:</strong> ${user.phone || 'N/A'}</div>
                            <div><strong>Email:</strong> ${user.email || 'N/A'}</div>
                            <div><strong>Role:</strong> ${user.role || 'N/A'}</div>
                            <div><strong>District:</strong> ${user.district || 'N/A'}</div>
                            <div><strong>Registered:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top:6px;">
                        ${(user.verificationStatus||user.verification_status||'').toUpperCase()==='PENDING' ? `
                            <span style="background:#e8f0fe;color:#1a4080;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;border:1px solid #4a6fa5;">&#9203; Verification Pending</span>
                            ${(user.requestedRole||user.requested_role||user.verificationRole||user.verification_role) ? `<span style="margin-left:8px;font-size:12px;color:#555;">Wants: <strong>${_systemAdminVerificationRole(user)}</strong></span>` : ''}
                        ` : ''}
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px;">
                        ${(user.verificationStatus||user.verification_status||'').toUpperCase()==='PENDING' ? `
                            <button onclick="openVerifyModal('${user.username}')" 
                                    style="padding:8px 16px; background:white; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600;">
                                &#10004; Verify
                            </button>
                        ` : ''}
                        <button onclick="viewUserDetails('${user.username}')" 
                                style="padding:8px 16px; background:white; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-size:13px;">
                             View Details
                        </button>
                        ${_systemAdminIsLockedByDistrictAdmin(user) ? `
                            <span title="This account's district has an assigned District Admin, who has exclusive authority to edit or deactivate it." style="padding:8px 12px; background:#fff8e1; color:#795548; border:1px solid #ffe082; border-radius:6px; font-size:12px; font-weight:600;">
                                &#128274; District Admin controlled
                            </span>
                        ` : `
                            ${String(user.approvalStatus || user.approval_status || '').toLowerCase() === 'disabled' ? `
                            <button onclick="enableUserAccount('${user.username}')" 
                                    style="padding:8px 16px; background:white; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-size:13px;">
                                 Reactivate
                            </button>
                            ` : `
                            <button onclick="disableUserAccount('${user.username}')" 
                                    style="padding:8px 16px; background:white; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-size:13px;">
                                 Deactivate
                            </button>
                            `}
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

function filterUsers() {
    const container = document.getElementById('userListContainer');
    if (!container || !container.dataset.users) return;
    
    const users = JSON.parse(container.dataset.users);
    const typeFilter = document.getElementById('userTypeFilter').value;
    const statusFilter = document.getElementById('userStatusFilter').value;
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase().trim();
    
    const baseUsers = users.filter(u => u.approvalStatus !== 'Pending');
    let filtered = baseUsers.filter(user => {
        if (typeFilter !== 'all' && user.role !== typeFilter) return false;
        if (statusFilter === 'PendingVerification') {
            const vs = (user.verificationStatus || user.verification_status || '').toUpperCase();
            if (vs !== 'PENDING') return false;
        } else if (statusFilter !== 'all' && (user.approvalStatus || '') !== statusFilter) return false;
        if (searchTerm) {
            const searchable = [
                user.firstName, user.lastName, user.username,
                user.phone, user.email, user.nationalId, user.id, user.role
            ].join(' ').toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }
        return true;
    });
    
    renderUserList(filtered);
}


























async function _backfillDistrictAdminLockFlag(user) {
    if (!user) return user;

    function _applyFrom(source) {
        if (!source) return false;
        var found = false;
        if (source.districtAdminAssigned !== undefined) {
            user.districtAdminAssigned = source.districtAdminAssigned;
            found = true;
        }
        if (source.district_admin_assigned !== undefined) {
            user.district_admin_assigned = source.district_admin_assigned;
            found = true;
        }
        return found;
    }

    try {
        const container = document.getElementById('userListContainer');
        const cached = container && container.dataset.users ? JSON.parse(container.dataset.users) : [];
        const cachedUser = (cached || []).find(u => u.username === user.username);
        if (_applyFrom(cachedUser)) return user;
    } catch (_) {}

    
    
    
    try {
        const token = getAuthToken();
        const authHeaders = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        };
        const resp = await fetch(API_ENDPOINTS.users, { headers: authHeaders });
        if (resp.ok) {
            const data = await resp.json();
            const list = data.users || data || [];
            const freshUser = (list || []).find(u => u.username === user.username);
            _applyFrom(freshUser);
        }
    } catch (_) {}

    return user;
}

async function viewUserDetails(username) {
    sessionStorage.setItem('userModalOpen', 'true');
    sessionStorage.setItem('lastViewedUser', username);
    
    const modal = document.getElementById('userDetailModal');
    const content = document.getElementById('userDetailContent');
    const nameEl = document.getElementById('userDetailName');
    const roleEl = document.getElementById('userDetailRole');
    
    if (!modal || !content || !nameEl || !roleEl) {
        alert('Modal elements not found. Please refresh the page.');
        return;
    }
    
    content.innerHTML = `
        <div style="text-align:center; padding:40px; color:#999;">
            <div style="font-size:32px; margin-bottom:10px;"></div>
            <p>Loading user details...</p>
        </div>
    `;
    modal.style.display = 'flex';
    
    try {
        const currentUser = sessionStorage.getItem('lcdjp_username');
        if (!currentUser) {
            throw new Error('No user logged in. Please login first.');
        }
        const token = getAuthToken();
        const authHeaders = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        };
        
        console.log(' Fetching user:', username);
        console.log(' API URL:', API_ENDPOINTS.user(username));
        
        const response = await fetch(API_ENDPOINTS.user(username), {
            method: 'GET',
            headers: authHeaders
        });

        async function fetchAndMergeDocs(userObj) {
            try {
                const docsResp = await fetch(API_ENDPOINTS.user(username) + '/documents', {
                    headers: authHeaders
                });
                if (docsResp.ok) {
                    const docsData = await docsResp.json();
                    const docs = docsData.documents || docsData || {};
                    Object.assign(userObj, docs);
                }
            } catch (_) {}
            return userObj;
        }

        if (response.ok) {
            const data = await response.json();
            const user = data.user || data;
            await fetchAndMergeDocs(user);
            await _backfillDistrictAdminLockFlag(user);
            displayUserDetails(user, nameEl, roleEl, content);
            return;
        } else if (response.status === 404) {
            console.log('User not found individually, trying from users list...');
            const usersResponse = await fetch(API_ENDPOINTS.users, {
                headers: authHeaders
            });
            
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                const users = usersData.users || usersData || [];
                const userData = users.find(u => u.username === username);
                
                if (userData) {
                    await fetchAndMergeDocs(userData);
                    await _backfillDistrictAdminLockFlag(userData);
                    displayUserDetails(userData, nameEl, roleEl, content);
                    return;
                } else {
                    throw new Error(`User "${username}" not found`);
                }
            } else {
                throw new Error('Failed to fetch users list');
            }
        } else if (response.status === 401) {
            handleTokenExpired();
            throw new Error('Session expired. Please login again.');
        } else {
            throw new Error(`HTTP error ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error fetching user details:', error);
        content.innerHTML = `
            <div style="text-align:center; padding:40px; color:#dc3545;">
                <div style="font-size:32px; margin-bottom:10px;"></div>
                <p><strong>Error:</strong> ${error.message}</p>
                <p style="font-size:12px; color:#666; margin-top:10px;">
                    Session: ${sessionStorage.getItem('lcdjp_username') ? ' Active' : ' Not logged in'}
                </p>
                <p style="font-size:12px; color:#666;">
                    API URL: ${API_ENDPOINTS.user(username)}
                </p>
                <button onclick="viewUserDetails('${username}')" style="margin-top:15px; padding:8px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
                     Retry
                </button>
            </div>
        `;
    }
}
function displayUserDetails(user, nameEl, roleEl, content) {
    window._currentViewUser = user;
    const firstName = user.firstName || user.first_name || '';
    const lastName  = user.lastName  || user.last_name  || '';
    nameEl.textContent = (firstName + ' ' + lastName).trim() || user.username;
    roleEl.textContent = user.role || user.userType || 'User';

    const status = user.approvalStatus || user.approval_status || 'Pending';
    const reviewerContext = _verificationReviewerContext();
    const districtAdminOnlyVerification = _systemAdminVerificationRequiresDistrictAdmin(user)
        && _systemAdminHasAssignedDistrictAdmin(user)
        && reviewerContext.approverRole !== 'DISTRICT_ADMIN'
        && !_systemAdminVerificationOverdue(user);
    const statusColor = status === 'Approved' ? '#28a745' :
                        status === 'Pending'  ? '#ff9800' :
                        status === 'Disabled' ? '#dc3545' : '#6c757d';

    let profilePic = sessionStorage.getItem('lcdjp_avatar_' + user.username);
    if (!profilePic) {
        profilePic = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231a4080'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
    }

    content.innerHTML = `
        <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:20px;">
            <div style="text-align:center; flex-shrink:0;">
                <img src="${profilePic}" style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:4px solid ${statusColor};">
                <div style="margin-top:10px;">
                    <span style="background:${statusColor}; color:white; padding:4px 15px; border-radius:20px; font-size:13px; font-weight:bold;">${status}</span>
                </div>
            </div>
            <div style="flex:1; min-width:280px;">
                <h3 style="color:#1a4080; margin:0 0 4px 0;">${firstName} ${lastName}</h3>
                <p style="color:#666; margin:0 0 12px 0;">@${user.username} &bull; ${user.role || 'User'}</p>

                <div class="lcdjp-grid-2col" style="gap:8px; font-size:13px;">
                    <div><strong>Phone:</strong> ${user.phone || 'N/A'}</div>
                    <div><strong>Email:</strong> ${user.email || 'N/A'}</div>
                    <div><strong>National ID:</strong> ${user.nationalId || user.national_id || 'N/A'}</div>
                    <div><strong>Gender:</strong> ${user.gender || 'N/A'}</div>
                    <div><strong>Date of Birth:</strong> ${user.dateOfBirth || user.date_of_birth || 'N/A'}</div>
                    <div><strong>Registered:</strong> ${(user.createdAt||user.created_at) ? new Date(user.createdAt||user.created_at).toLocaleDateString() : 'N/A'}</div>
                </div>

                <div style="margin-top:10px; padding:10px; background:#f0f5ff; border-radius:8px; font-size:13px;">
                    <strong> Location:</strong>
                    ${[user.village, user.parish, user.subCounty||user.sub_county, user.county, user.district].filter(Boolean).join(' › ') || 'N/A'}
                </div>
            </div>
        </div>

        ${user.role === 'Lawyer' ? `
        <div style="margin-top:15px; padding:15px; background:#f0f8ff; border-radius:8px; border-left:4px solid #17a2b8;">
            <h4 style="color:#17a2b8; margin:0 0 10px 0;"> Lawyer Details</h4>
            <div class="lcdjp-grid-2col" style="gap:8px; font-size:13px;">
                <div><strong>Specialization:</strong> ${user.lawyerSpecialization || user.lawyer_specialization || 'N/A'}</div>
                <div><strong>Bar Number:</strong> ${user.barNumber || user.bar_number || 'N/A'}</div>
            </div>
        </div>
        ` : ''}

        <div id="loginLockNotice_${user.username}" style="margin-top:16px;"></div>

        <div style="margin-top:20px; padding-top:15px; border-top:2px solid #eee; display:flex; gap:10px; flex-wrap:wrap;">
            <button id="sendResetLinkBtn_${user.username}" onclick="sendResetPasswordLink('${user.username}')" style="padding:10px 22px; background:#1a237e; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">Send reset password link</button>
            ${status === 'Pending' ? (districtAdminOnlyVerification ? `
                <span style="display:inline-flex;align-items:center;gap:6px;background:#fff8e1;color:#795548;border:1px solid #ffe082;border-radius:6px;padding:10px 16px;font-size:12px;font-weight:600;">
                    &#128274; District Admin must approve
                </span>
            ` : `
                <button onclick="approveVerification('${user.username}')" style="padding:10px 22px; background:white; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-weight:bold;"> Approve</button>
                <button onclick="openVerifyModal('${user.username}')"  style="padding:10px 22px; background:white; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-weight:bold;"> Review & Reject</button>
            `) : status === 'Disabled' ?
                (_systemAdminIsLockedByDistrictAdmin(user) ? '' : `<button onclick="enableUserAccount('${user.username}')"  style="padding:10px 22px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;"> Reactivate</button>`) :
                (_systemAdminIsLockedByDistrictAdmin(user) ? '' : `<button onclick="disableUserAccount('${user.username}')" style="padding:10px 22px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;"> Deactivate</button>`)
            }
            ${_systemAdminIsLockedByDistrictAdmin(user) ? `
                <span title="This account's district has an assigned District Admin, who has exclusive authority to edit or deactivate it." style="display:inline-flex;align-items:center;gap:6px;background:#fff8e1;color:#795548;border:1px solid #ffe082;border-radius:6px;padding:10px 16px;font-size:12px;font-weight:600;">
                    &#128274; District Admin has exclusive control of this account
                </span>
            ` : `
                <button onclick="adminEditUser('${user.username}')" style="padding:10px 22px; background:white; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-weight:bold;"> Edit Details</button>
            `}
        </div>
        
        <div style="margin-top:25px; padding-top:20px; border-top:2px solid #eee;" id="docSection_${user.username}">
            <h4 style="color:#1a4080; margin:0 0 15px 0;"> Submitted Documents</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:12px;" id="docGrid_${user.username}">
            </div>
        </div>
    `;

    if (typeof loadLoginLockNotice === 'function') loadLoginLockNotice(user.username);

    var _verifRole = _systemAdminVerificationRole(user);
    var _isLawyer  = /^lawyer$/i.test(_verifRole) || user.role === 'Lawyer';
    var _isLegalOrg= /^legal\s*org/i.test(_verifRole);

    window._currentViewDocs = {
        
        idFront:              user.idFront              || user.id_front               || null,
        idBack:               user.idBack               || user.id_back                || null,
        lawyerWorkId:         user.lawyerWorkId         || user.lawyer_work_id         || null,
        lawyerCertificate:    user.lawyerCertificate    || user.lawyer_certificate     || null,
        
        selfie:               user.selfie               || null,
        nationalId:           user.nationalId           || user.national_id            || null,
        roleDoc_barNo:        user.roleDoc_barNo        || user.role_doc_bar_no        || null,
        roleDoc_lawSpec:      user.roleDoc_lawSpec      || user.role_doc_law_spec      || null,
        roleDoc_lawCert:      user.roleDoc_lawCert      || user.role_doc_law_cert      || null,
        roleDoc_orgName:      user.roleDoc_orgName      || user.role_doc_org_name      || null,
        roleDoc_orgRegNo:     user.roleDoc_orgRegNo     || user.role_doc_org_reg_no    || null,
        roleDoc_orgRegCert:   user.roleDoc_orgRegCert   || user.role_doc_org_reg_cert  || null,
    };
    const _docSlots = [
        
        { key: 'selfie',              label: 'Verification Selfie',      show: true },
        
        
        
        
        
        
        
        
        
        { key: 'roleDoc_lawCert',     label: 'Practicing Certificate',    show: _isLawyer || !!user.roleDoc_lawCert },
        
        { key: 'roleDoc_orgName',     label: 'Organisation Name',         show: _isLegalOrg || !!user.roleDoc_orgName },
        { key: 'roleDoc_orgRegNo',    label: 'Org. Registration No.',     show: _isLegalOrg || !!user.roleDoc_orgRegNo },
        { key: 'roleDoc_orgRegCert',  label: 'Org. Certificate',          show: _isLegalOrg || !!user.roleDoc_orgRegCert },
        
        { key: 'idFront',             label: 'National ID (Front)',        show: !!user.idFront || !!user.id_front },
        { key: 'idBack',              label: 'National ID (Back)',         show: !!user.idBack  || !!user.id_back },
        { key: 'lawyerWorkId',        label: 'Work ID',                   show: _isLawyer && (!!user.lawyerWorkId || !!user.lawyer_work_id) },
        { key: 'lawyerCertificate',   label: 'Certificate',               show: _isLawyer && (!!user.lawyerCertificate || !!user.lawyer_certificate) },
    ];
    const _grid = document.getElementById('docGrid_' + user.username);
    if (_grid) {
        _docSlots.filter(s => s.show).forEach(slot => {
            const data = window._currentViewDocs[slot.key];
            const cell = document.createElement('div');
            cell.style.cssText = 'background:white;border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center;';
            const lbl = document.createElement('div');
            lbl.style.cssText = 'font-size:11px;font-weight:700;color:#555;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;';
            lbl.textContent = slot.label;
            cell.appendChild(lbl);
            if (data) {
                const mime = data.startsWith('data:') ? data.split(';')[0].slice(5) : '';
                const isPdf = mime === 'application/pdf';
                const isImage = mime.startsWith('image/');
                if (!isImage) {
                    const icon = document.createElement('div');
                    icon.style.cssText = 'font-size:28px;margin:6px 0;';
                    icon.textContent = isPdf ? '' : '';
                    const btn = document.createElement('button');
                    btn.style.cssText = 'padding:6px 14px;background:#17a2b8;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px;';
                    btn.textContent = ' View Document';
                    btn.onclick = () => viewDocFile(slot.key);
                    cell.appendChild(icon);
                    cell.appendChild(btn);
                } else {
                    const img = document.createElement('img');
                    img.src = data;
                    img.style.cssText = 'width:100%;max-height:110px;object-fit:cover;border-radius:6px;cursor:pointer;margin-bottom:6px;';
                    img.title = 'Click to view full size';
                    img.onclick = () => viewDocFile(slot.key);
                    const btn = document.createElement('button');
                    btn.style.cssText = 'padding:4px 12px;background:#1a4080;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px;';
                    btn.textContent = ' View Full';
                    btn.onclick = () => viewDocFile(slot.key);
                    cell.appendChild(img);
                    cell.appendChild(btn);
                }
            } else {
                const icon = document.createElement('div');
                icon.style.cssText = 'font-size:28px;margin:6px 0;';
                icon.textContent = '';
                const msg = document.createElement('span');
                msg.style.cssText = 'font-size:11px;color:#aaa;';
                msg.textContent = 'Not uploaded';
                cell.appendChild(icon);
                cell.appendChild(msg);
            }
            _grid.appendChild(cell);
        });
    }
}

function closeUserDetailModal() {
    const modal = document.getElementById('userDetailModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    document.body.style.overflow = '';
    
    sessionStorage.removeItem('userModalOpen');
    sessionStorage.removeItem('lastViewedUser');
}

function adminEditUser(username) {
    const user = window._currentViewUser;
    if (!user) return;
    const role = user.role || user.userType || '';

    let overlay = document.getElementById('adminEditOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'adminEditOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:20000;display:flex;align-items:center;justify-content:center;overflow-y:auto;';
        document.body.appendChild(overlay);
    }

    const genderOpts = ['Male','Female','Other'].map(g => `<option value="${g}" ${(user.gender||'')=== g ? 'selected' : ''}>${g}</option>`).join('');

    overlay.innerHTML = `
    <div style="background:white;border-radius:14px;padding:30px;max-width:600px;width:95%;margin:20px auto;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
        <h3 style="margin:0 0 20px;color:#1a4080;border-bottom:2px solid #1a4080;padding-bottom:10px;"> Edit Details, @${username}</h3>
        <div class="lcdjp-grid-2col" style="gap:14px;">
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">First Name</label>
                <input id="ae_firstName" value="${user.firstName||user.first_name||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Last Name</label>
                <input id="ae_lastName" value="${user.lastName||user.last_name||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Email</label>
                <input id="ae_email" value="${user.email||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Phone</label>
                <input id="ae_phone" value="${user.phone||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Gender</label>
                <select id="ae_gender" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;">
                    <option value="">-- Select --</option>${genderOpts}
                </select>
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Date of Birth</label>
                <input id="ae_dob" type="date" value="${user.dateOfBirth||user.date_of_birth||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">National ID</label>
                <input id="ae_nationalId" value="${user.nationalId||user.national_id||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>
            ${role === 'Lawyer' ? `
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Specialization</label>
                <input id="ae_spec" value="${user.lawyerSpecialization||user.lawyer_specialization||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Law Firm</label>
                <input id="ae_firm" value="${user.lawFirmName||user.law_firm_name||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Bar Number</label>
                <input id="ae_bar" value="${user.barNumber||user.bar_number||''}" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;" />
            </div>` : ''}
        </div>

        <div style="margin-top:20px;">
            <h4 style="color:#1a4080;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.5px;"> Replace Documents (optional)</h4>
            <div class="lcdjp-grid-2col" style="gap:12px;">
                <div>
                    <label style="font-size:12px;font-weight:700;color:#555;">National ID Front ${(user.idFront||user.id_front) ? '' : ' Missing'}</label>
                    <input id="ae_idFront" type="file" accept="image/*,.pdf" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:12px;box-sizing:border-box;" />
                </div>
                <div>
                    <label style="font-size:12px;font-weight:700;color:#555;">National ID Back ${(user.idBack||user.id_back) ? '' : ' Missing'}</label>
                    <input id="ae_idBack" type="file" accept="image/*,.pdf" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:12px;box-sizing:border-box;" />
                </div>
                ${role === 'Lawyer' ? `
                <div>
                    <label style="font-size:12px;font-weight:700;color:#555;">Work ID ${(user.lawyerWorkId||user.lawyer_work_id) ? '' : ' Missing'}</label>
                    <input id="ae_workId" type="file" accept="image/*,.pdf" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:12px;box-sizing:border-box;" />
                </div>
                <div>
                    <label style="font-size:12px;font-weight:700;color:#555;">Certificate ${(user.lawyerCertificate||user.lawyer_certificate) ? '' : ' Missing'}</label>
                    <input id="ae_cert" type="file" accept="image/*,.pdf" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:12px;box-sizing:border-box;" />
                </div>` : ''}
            </div>
        </div>

        <div style="margin-top:22px;display:flex;gap:10px;justify-content:flex-end;">
            <button onclick="document.getElementById('adminEditOverlay').style.display='none'" style="padding:10px 22px;background:#6c757d;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Cancel</button>
            <button onclick="adminSaveUser('${username}')" id="ae_saveBtn" style="padding:10px 28px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;"> Save Changes</button>
        </div>
    </div>`;
    overlay.style.display = 'flex';
}

async function adminSaveUser(username) {
    const saveBtn = document.getElementById('ae_saveBtn');
    if (saveBtn) { saveBtn.textContent = ' Saving...'; saveBtn.disabled = true; }

    const token = getAuthToken();
    if (!token) { alert('Not authenticated.'); return; }

    const fileToB64 = (file) => new Promise((res, rej) => {
        if (!file) { res(null); return; }
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });

    const user = window._currentViewUser || {};
    const role = _systemAdminVerificationRole(user) || user.role || user.userType || '';

    const updates = {};

    const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
    const getOriginal = (key) => {
        const original = user[key] || user[key.replace(/([A-Z])/g, '_$1').toLowerCase()] || '';
        return original;
    };

    const firstName = g('ae_firstName');
    if (firstName !== null && firstName !== '' && firstName !== getOriginal('firstName')) {
        updates.firstName = firstName;
    }

    const lastName = g('ae_lastName');
    if (lastName !== null && lastName !== '' && lastName !== getOriginal('lastName')) {
        updates.lastName = lastName;
    }

    const email = g('ae_email');
    if (email !== null && email !== '' && email !== getOriginal('email')) {
        updates.email = email;
    }

    const phone = g('ae_phone');
    if (phone !== null && phone !== '' && phone !== getOriginal('phone')) {
        updates.phone = phone;
    }

    const gender = g('ae_gender');
    if (gender !== null && gender !== '' && gender !== getOriginal('gender')) {
        updates.gender = gender;
    }

    const dob = g('ae_dob');
    if (dob !== null && dob !== '' && dob !== getOriginal('dateOfBirth')) {
        updates.dateOfBirth = dob;
    }

    const nationalId = g('ae_nationalId');
    if (nationalId !== null && nationalId !== '' && nationalId !== getOriginal('nationalId')) {
        updates.nationalId = nationalId;
    }

    if (role === 'Lawyer') {
        const spec = g('ae_spec');
        if (spec !== null && spec !== '' && spec !== getOriginal('lawyerSpecialization')) {
            updates.lawyerSpecialization = spec;
        }
        const firm = g('ae_firm');
        if (firm !== null && firm !== '' && firm !== getOriginal('lawFirmName')) {
            updates.lawFirmName = firm;
        }
        const bar = g('ae_bar');
        if (bar !== null && bar !== '' && bar !== getOriginal('barNumber')) {
            updates.barNumber = bar;
        }
    }

    const docFields = [
        { id: 'ae_idFront',      key: 'idFront' },
        { id: 'ae_idBack',       key: 'idBack' },
        { id: 'ae_workId',       key: 'lawyerWorkId' },
        { id: 'ae_cert',         key: 'lawyerCertificate' },
    ];
    for (const { id, key } of docFields) {
        const el = document.getElementById(id);
        if (el && el.files && el.files[0]) {
            updates[key] = await fileToB64(el.files[0]);
        }
    }

    if (Object.keys(updates).length === 0) {
        alert('No changes to save.');
        if (saveBtn) { saveBtn.textContent = ' Save Changes'; saveBtn.disabled = false; }
        return;
    }

    try {
        const resp = await fetch(API_ENDPOINTS.user(username), {
            
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }
        document.getElementById('adminEditOverlay').style.display = 'none';
        alert(`Details updated for @${username}`);
        
        try {
            const fResp = await fetch(API_ENDPOINTS.user(username), {
                
                headers: { 'Content-Type': 'application/json' }
            });
            if (fResp.ok) {
                const fData = await fResp.json();
                const freshUser = fData.user || fData;
                await _backfillDistrictAdminLockFlag(freshUser);
                window._currentViewUser = freshUser;
                const nameEl  = document.getElementById('userDetailName');
                const roleEl  = document.getElementById('userDetailRole');
                const content = document.getElementById('userDetailContent');
                if (content) displayUserDetails(freshUser, nameEl, roleEl, content);
            }
        } catch(_) {}
        loadAllUsers();
        if (typeof daLoadUsers === 'function' && _verificationReviewerContext().approverRole === 'DISTRICT_ADMIN') daLoadUsers();
    } catch (err) {
        alert(`Failed to save: ${err.message}`);
        if (saveBtn) { saveBtn.textContent = ' Save Changes'; saveBtn.disabled = false; }
    }
}

function _adminAuthHeaders() {
    const token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
    return Object.assign({ 'Content-Type': 'application/json' },
        token ? { 'Authorization': 'Bearer ' + token } : {});
}

function _escapeHtmlText(value) {
    const d = document.createElement('div');
    d.textContent = value == null ? '' : String(value);
    return d.innerHTML;
}

async function sendResetPasswordLink(username) {
    if (!confirm('Send a password reset link to @' + username + '?\n\n' +
                 'The link goes to their email and phone (SMS), works once, and expires after a short time.')) {
        return;
    }
    const btn = document.getElementById('sendResetLinkBtn_' + username);
    const originalLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    try {
        const response = await fetch('/api/auth/users/' + encodeURIComponent(username) + '/send-reset-link', {
            method: 'POST',
            headers: _adminAuthHeaders()
        });
        let data = {};
        try { data = await response.json(); } catch (_) {}

        if (response.status === 401) {
            if (typeof handleTokenExpired === 'function') handleTokenExpired();
            throw new Error('Session expired. Please login again.');
        }
        if (!response.ok) {
            throw new Error(data.error || data.message || ('Request failed (' + response.status + ')'));
        }

        let note = data.message || 'Reset link sent.';
        if (data.expiresInMinutes) note += '\n\nThe link expires in ' + data.expiresInMinutes + ' minutes.';
        alert(note);
    } catch (error) {
        console.error('Error sending reset link:', error);
        alert('Could not send the reset link: ' + error.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
    }
}

async function loadLoginLockNotice(username) {
    const box = document.getElementById('loginLockNotice_' + username);
    if (!box) return;
    try {
        const response = await fetch('/api/auth/users/' + encodeURIComponent(username) + '/login-lock', {
            headers: _adminAuthHeaders()
        });
        if (!response.ok) { box.innerHTML = ''; return; }
        const data = await response.json();
        const current = document.getElementById('loginLockNotice_' + username);
        if (!current) return;
        if (!data.locked) { current.innerHTML = ''; return; }

        const until = data.lockedUntilEpochMs ? new Date(data.lockedUntilEpochMs) : null;
        const untilText = until && !isNaN(until.getTime()) ? until.toLocaleString() : 'later';
        current.innerHTML =
            '<div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#fdecea; color:#8a1c14; ' +
            'border:1px solid #f5c2be; border-radius:8px; padding:12px 14px; font-size:13px;">' +
              '<div style="flex:1; min-width:200px;"><strong>&#128274; Login blocked.</strong> ' +
              'Too many wrong passwords. This account is blocked until ' + _escapeHtmlText(untilText) + '.</div>' +
              '<button onclick="unlockUserLogin(\'' + username.replace(/'/g, "\\'") + '\')" ' +
              'style="padding:8px 18px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">Unlock</button>' +
            '</div>';
    } catch (error) {
        console.error('Error checking login block:', error);
    }
}

async function unlockUserLogin(username) {
    if (!confirm('Let @' + username + ' try logging in again now?')) return;
    try {
        const response = await fetch('/api/auth/users/' + encodeURIComponent(username) + '/unlock-login', {
            method: 'POST',
            headers: _adminAuthHeaders()
        });
        let data = {};
        try { data = await response.json(); } catch (_) {}
        if (response.status === 401) {
            if (typeof handleTokenExpired === 'function') handleTokenExpired();
            throw new Error('Session expired. Please login again.');
        }
        if (!response.ok) {
            throw new Error(data.error || data.message || ('Request failed (' + response.status + ')'));
        }
        const box = document.getElementById('loginLockNotice_' + username);
        if (box) box.innerHTML = '';
        alert(data.message || ('@' + username + ' can log in again.'));
    } catch (error) {
        console.error('Error unlocking login:', error);
        alert('Could not unlock the account: ' + error.message);
    }
}

async function enableUserAccount(username) {
    if (!confirm(`Are you sure you want to REACTIVATE the account for @${username}?\n\nThe user will be able to login again.`)) {
        return;
    }
    
    try {
        const token = getAuthToken();
        

        const updateData = { approvalStatus: 'Approved' };
        
        const response = await fetch(API_ENDPOINTS.user(username), {
            
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error('Failed to reactivate user');
        }

        await createEnhancedNotification(
            username,
            ` Your account has been reactivated by the administrator. You can now login.`,
            'system'
        );

        alert(` Account for @${username} has been REACTIVATED.`);
        
        closeUserDetailModal();
        loadAllUsers();
        if (typeof daLoadUsers === 'function' && _verificationReviewerContext().approverRole === 'DISTRICT_ADMIN') daLoadUsers();
    } catch (error) {
        console.error('Error enabling user:', error);
        alert(` Failed to reactivate ${username}: ${error.message}`);
    }
}

async function disableUserAccount(username) {
    if (!confirm(`Are you sure you want to DEACTIVATE the account for @${username}?\n\nThe user will not be able to login until an administrator reactivates it.\n\nAccounts are not deleted by administrators. A deactivated account is removed automatically by the system if it stays deactivated for 6 months.`)) {
        return;
    }

    try {
        const token = getAuthToken();
        

        const updateData = { approvalStatus: 'Disabled' };

        const response = await fetch(API_ENDPOINTS.user(username), {

            method: 'PUT',
            headers: {
                'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error('Failed to deactivate user');
        }

        await createEnhancedNotification(
            username,
            ` Your account has been deactivated by the administrator. Contact support if you believe this is a mistake.`,
            'system'
        );

        alert(` Account for @${username} has been DEACTIVATED.`);

        closeUserDetailModal();
        loadAllUsers();
        if (typeof daLoadUsers === 'function' && _verificationReviewerContext().approverRole === 'DISTRICT_ADMIN') daLoadUsers();
    } catch (error) {
        console.error('Error disabling user:', error);
        alert(` Failed to deactivate ${username}: ${error.message}`);
    }
}

var _approvalsFilter = 'pending';

function _systemAdminVerificationRole(user) {
    var role = user.verificationRole || user.verification_role ||
               user.requestedRole || user.requested_role || user.role || 'Unknown';
    return String(role).trim();
}

function _systemAdminVerificationRequiresDistrictAdmin(user) {
    var role = String(_systemAdminVerificationRole(user) || '').trim().toLowerCase();
    return role === 'lawyer'
        || role === 'citizen';
}

function _systemAdminHasAssignedDistrictAdmin(user) {
    return user && (
        user.districtAdminAssigned === true ||
        user.district_admin_assigned === true ||
        String(user.districtAdminAssigned || user.district_admin_assigned || '').toLowerCase() === 'true'
    );
}











function _systemAdminIsLockedByDistrictAdmin(user) {
    if (!user) return false;
    var role = String(user.role || '').trim().toLowerCase();
    var isAdminAccount = role === 'district_admin' || role === 'district admin' ||
        role === 'district administrator' || role === 'system_admin' ||
        role === 'admin' || role === 'system administrator';
    if (isAdminAccount) return false;
    return _systemAdminHasAssignedDistrictAdmin(user) && !_systemAdminVerificationOverdue(user);
}





function _systemAdminVerificationOverdue(user) {
    if (!user) return false;
    var raw = user.verificationSubmittedAt || user.verification_submitted_at ||
              user.submittedAt || user.submitted_at;
    if (!raw) return false;
    var submitted = new Date(raw);
    if (isNaN(submitted.getTime())) return false;
    var hoursElapsed = (Date.now() - submitted.getTime()) / (1000 * 60 * 60);
    return hoursElapsed > 24;
}

function _verificationReviewerContext() {
    var role = String(
        localStorage.getItem('userRole') ||
        sessionStorage.getItem('userRole') ||
        window.currentUserLevel ||
        ''
    ).trim();
    var district = String(
        localStorage.getItem('userDistrict') ||
        sessionStorage.getItem('userDistrict') ||
        ''
    ).trim();
    var username = String(
        localStorage.getItem('username') ||
        sessionStorage.getItem('lcdjp_username') ||
        ''
    ).trim();
    var isDistrictAdmin = /^(DISTRICT_ADMIN|DISTRICT ADMIN|District Admin)$/i.test(role);
    return {
        approverRole:     isDistrictAdmin ? 'DISTRICT_ADMIN' : 'SYSTEM_ADMIN',
        approverDistrict: isDistrictAdmin ? district : '',
        approverUsername: username
    };
}

function _verificationDistrictForUser(user) {
    return String(
        user.verificationDistrict ||
        user.verification_district ||
        user.district ||
        user.submittedDistrict ||
        user.submitted_district ||
        ''
    ).trim();
}

function _verificationMatchesReviewerDistrict(user, reviewer) {
    if (!user || reviewer.approverRole !== 'DISTRICT_ADMIN') return true;
    var requestedDistrict = _verificationDistrictForUser(user).toLowerCase();
    return !!reviewer.approverDistrict
        && requestedDistrict === reviewer.approverDistrict.toLowerCase();
}

async function loadPendingApprovals() {
    const container = document.getElementById("approvalContainer");
    if (!container) { console.warn('approvalContainer not found'); return; }

    container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;"><p>Loading verifications…</p></div>';

    try {
        
        const resp = await authFetch(API_ENDPOINTS.pending, { method: 'GET' });
        if (!resp.ok) throw new Error('Server error ' + resp.status);
        const raw = await resp.json();
        const allUsers = Array.isArray(raw) ? raw : (raw.users || []);
        window._verificationUsersByUsername = {};
        allUsers.forEach(function(user) {
            if (user && user.username) {
                window._verificationUsersByUsername[user.username] = user;
            }
        });

        
        const pending  = allUsers.filter(u => { const s = (u.verificationStatus || u.verification_status || '').toUpperCase(); return s === 'PENDING'; });
        const approved = allUsers.filter(u => { const s = (u.verificationStatus || u.verification_status || '').toUpperCase(); return s === 'APPROVED' || s === 'VERIFIED'; });
        const rejected = allUsers.filter(u => { const s = (u.verificationStatus || u.verification_status || '').toUpperCase(); return s === 'REJECTED'; });

        
        const statsHtml = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:15px;margin-bottom:22px;">
                <div style="background:white;color:#1a4080;padding:18px 20px;border-radius:10px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.08);cursor:pointer;"
                     onclick="_approvalsFilter='pending';loadPendingApprovals()">
                    <div style="font-size:32px;font-weight:700;">${pending.length}</div>
                    <div style="font-size:13px;font-weight:500;opacity:0.9;"> Pending</div>
                </div>
                <div style="background:white;color:#1a4080;padding:18px 20px;border-radius:10px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.08);cursor:pointer;"
                     onclick="_approvalsFilter='approved';loadPendingApprovals()">
                    <div style="font-size:32px;font-weight:700;">${approved.length}</div>
                    <div style="font-size:13px;font-weight:500;opacity:0.9;"> Approved</div>
                </div>
                <div style="background:white;color:#1a4080;padding:18px 20px;border-radius:10px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.08);cursor:pointer;"
                     onclick="_approvalsFilter='rejected';loadPendingApprovals()">
                    <div style="font-size:32px;font-weight:700;">${rejected.length}</div>
                    <div style="font-size:13px;font-weight:500;opacity:0.9;"> Rejected</div>
                </div>
                <div style="background:white;color:#1a4080;padding:18px 20px;border-radius:10px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.08);cursor:pointer;"
                     onclick="_approvalsFilter='all';loadPendingApprovals()">
                    <div style="font-size:32px;font-weight:700;">${pending.length + approved.length + rejected.length}</div>
                    <div style="font-size:13px;font-weight:500;opacity:0.9;"> All Submissions</div>
                </div>
            </div>`;

        
        const activeTab  = 'padding:9px 22px;border:1px solid #ccc;border-radius:20px;cursor:pointer;font-weight:700;font-size:13px;background:white;color:#333;';
        const inactiveTab = 'padding:9px 22px;border:1px solid #ccc;border-radius:20px;cursor:pointer;font-weight:500;font-size:13px;background:white;color:#555;';
        const tabsHtml = `
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
                <button style="${_approvalsFilter==='pending'  ? activeTab : inactiveTab}" onclick="_approvalsFilter='pending';loadPendingApprovals()"> Pending (${pending.length})</button>
                <button style="${_approvalsFilter==='approved' ? activeTab : inactiveTab}" onclick="_approvalsFilter='approved';loadPendingApprovals()"> Approved (${approved.length})</button>
                <button style="${_approvalsFilter==='rejected' ? activeTab : inactiveTab}" onclick="_approvalsFilter='rejected';loadPendingApprovals()"> Rejected (${rejected.length})</button>
                <button style="${_approvalsFilter==='all'      ? activeTab : inactiveTab}" onclick="_approvalsFilter='all';loadPendingApprovals()"> All (${pending.length + approved.length + rejected.length})</button>
                <button style="padding:9px 16px;border:1px solid #ccc;border-radius:20px;cursor:pointer;font-size:13px;background:white;color:#333;"
                        onclick="loadPendingApprovals()">↻ Refresh</button>
            </div>`;

        
        let subset;
        if      (_approvalsFilter === 'approved') subset = approved;
        else if (_approvalsFilter === 'rejected') subset = rejected;
        else if (_approvalsFilter === 'all')      subset = [...pending, ...approved, ...rejected];
        else                                      subset = pending;

        const borderFor  = u => { const s=(u.verificationStatus||u.verification_status||'').toUpperCase(); return s==='APPROVED'||s==='VERIFIED'?'#28a745':s==='REJECTED'?'#dc3545':'#e8730a'; };
        const badgeFor   = u => { const s=(u.verificationStatus||u.verification_status||'').toUpperCase();
            if (s==='APPROVED'||s==='VERIFIED') return '<span style="background:#d4edda;color:#155724;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;"> Approved</span>';
            if (s==='REJECTED')                 return '<span style="background:#f8d7da;color:#721c24;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;"> Rejected</span>';
            return '<span style="background:#fff3cd;color:#856404;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;"> Pending</span>';
        };
        const isPending  = u => (u.verificationStatus||u.verification_status||'').toUpperCase() === 'PENDING';

        let listHtml = '';
        if (subset.length === 0) {
            listHtml = `
                <div style="background:white;border-radius:12px;padding:40px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <div style="font-size:48px;margin-bottom:10px;"></div>
                    <h3 style="color:#1a4080;margin:0;">Nothing here</h3>
                    <p style="color:#999;margin:5px 0 0 0;">No ${_approvalsFilter} verification requests.</p>
                </div>`;
        } else {
            const rows = subset.map(user => {
                const fullName = ((user.firstName||user.first_name||'')+' '+(user.lastName||user.last_name||'')).trim() || user.username;
                const roleName = _systemAdminVerificationRole(user);
                const avatar   = sessionStorage.getItem('lcdjp_avatar_'+user.username)
                    || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231a4080'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
                
                
                
                const districtAdminOnly = _systemAdminVerificationRequiresDistrictAdmin(user)
                    && _systemAdminHasAssignedDistrictAdmin(user)
                    && !_systemAdminVerificationOverdue(user);
                const actionBtns = isPending(user)
                    ? (districtAdminOnly
                        ? `<span style="display:inline-flex;align-items:center;gap:6px;background:#fff8e1;color:#795548;border:1px solid #ffe082;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:600;">
                               &#128274; District Admin must approve
                           </span>`
                        : `<button onclick="approveVerification('${user.username}')" style="padding:8px 20px;background:white;color:#333;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;"> Approve</button>
                           <button onclick="openVerifyModal('${user.username}')"    style="padding:8px 20px;background:white;color:#333;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">✖ Review &amp; Reject</button>`)
                    : '';
                return `
                    <div id="verif-row-${user.username}" style="background:#f8f9fa;border-radius:10px;padding:15px 20px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-left:4px solid ${borderFor(user)};transition:all 0.2s ease;"
                         onmouseover="this.style.background='#e5eeff';" onmouseout="this.style.background='#f8f9fa';">
                        <div style="display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
                            <img src="${avatar}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid #2a5298;">
                            <div>
                                <div style="font-weight:600;color:#333;font-size:15px;">${fullName} ${badgeFor(user)}</div>
                                <div style="font-size:13px;color:#888;">@${user.username} &bull; ${roleName} &bull; ${user.phone||user.phoneNumber||'N/A'}</div>
                                ${user.district ? '<div style="font-size:12px;color:#888;">'+user.district+'</div>' : ''}
                                ${(user.submittedAt||user.submitted_at) ? '<div style="font-size:11px;color:#aaa;">Submitted: '+new Date(user.submittedAt||user.submitted_at).toLocaleString()+'</div>' : ''}
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                            ${actionBtns}
                            <button onclick="viewUserDetails('${user.username}')" style="padding:8px 15px;background:white;color:#333;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;"> View</button>
                        </div>
                    </div>`;
            }).join('');

            listHtml = `
                <div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <div style="font-size:14px;font-weight:600;color:#1a4080;padding-bottom:12px;border-bottom:2px solid #cfe0ff;margin-bottom:15px;">
                        Showing ${subset.length} ${_approvalsFilter === 'all' ? 'total' : _approvalsFilter} verification${subset.length !== 1 ? 's' : ''}
                    </div>
                    ${rows}
                </div>`;
        }

        const approvalsHeaderHtml = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 style="color:#1a4080;margin:0;font-size:20px;">Verification Requests</h2>
                <button onclick="showAdminHome()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
            </div>`;
        container.innerHTML = approvalsHeaderHtml + statsHtml + tabsHtml + listHtml;

    } catch (error) {
        console.error('Error loading verification requests:', error);
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#dc3545;">
                <div style="font-size:32px;margin-bottom:10px;"></div>
                <p style="font-weight:600;">Error loading verification requests</p>
                <p style="font-size:13px;color:#666;margin:5px 0 15px;">${error.message}</p>
                <button onclick="loadPendingApprovals()" style="margin-top:10px;padding:8px 20px;background:white;color:#333;border:1px solid #ccc;border-radius:6px;cursor:pointer;">↻ Retry</button>
            </div>`;
    }
}


function openDocumentViewer(dataUrl, fileName) {
    var _old = document.getElementById('docViewerModal');
    if (_old) _old.parentNode.removeChild(_old);

    var isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName || '');
    var isPDF   = /\.pdf$/i.test(fileName || '');
    var displayData = dataUrl || '';

    var contentHtml;
    if (isImage) {
        contentHtml = '<img src="' + displayData + '" style="max-width:100%;max-height:60vh;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);" alt="' + (fileName || 'image') + '">';
    } else if (isPDF) {
        contentHtml = '<iframe src="' + displayData + '" style="width:100%;height:60vh;border:none;border-radius:8px;" title="' + (fileName || 'PDF') + '"></iframe>';
    } else {
        contentHtml = '<div style="padding:40px;text-align:center;"><div style="font-size:60px;margin-bottom:15px;"></div><p style="color:#666;">Preview not available for this file type.</p><p style="color:#999;font-size:12px;">' + (fileName || '') + '</p></div>';
    }

    window._lcdjpDocViewer = { url: displayData, name: fileName || 'Document' };

    var modal = document.createElement('div');
    modal.id = 'docViewerModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;';

    var inner = document.createElement('div');
    inner.style.cssText = 'background:white;border-radius:15px;max-width:900px;width:95%;max-height:95%;overflow:hidden;box-shadow:0 10px 50px rgba(0,0,0,0.5);display:flex;flex-direction:column;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:15px 20px;background:#1a4080;color:white;flex-shrink:0;';

    var titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'display:flex;align-items:center;gap:10px;overflow:hidden;';

    var iconEl = document.createElement('span');
    iconEl.style.fontSize = '20px';
    iconEl.textContent = isImage ? '\u{1F5BC}' : (isPDF ? '\u{1F4C4}' : '\u{1F4CE}');

    var titleEl = document.createElement('h3');
    titleEl.style.cssText = 'margin:0;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    titleEl.textContent = fileName || 'Document';

    titleWrap.appendChild(iconEl);
    titleWrap.appendChild(titleEl);

    var hdrClose = document.createElement('button');
    hdrClose.textContent = '\u00D7';
    hdrClose.style.cssText = 'background:none;border:none;color:white;font-size:28px;cursor:pointer;padding:0 10px;line-height:1;';
    hdrClose.onclick = function() { closeDocumentViewer(); };

    hdr.appendChild(titleWrap);
    hdr.appendChild(hdrClose);

    var dvBody = document.createElement('div');
    dvBody.style.cssText = 'padding:20px;background:#f8f9fa;max-height:75vh;overflow:auto;flex:1;text-align:center;';
    dvBody.innerHTML = contentHtml;

    var ftr = document.createElement('div');
    ftr.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;padding:15px 20px;border-top:1px solid #eee;background:white;flex-shrink:0;flex-wrap:wrap;';

    var dlBtn = document.createElement('button');
    dlBtn.textContent = ' Download';
    dlBtn.style.cssText = 'padding:10px 20px;background:#17a2b8;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;';
    dlBtn.onclick = function() { 
        var d = window._lcdjpDocViewer; 
        if (d) {
            var link = document.createElement('a');
            link.download = d.name || 'document';
            link.href = d.url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (typeof showToast === 'function') {
                showToast(' Download started: ' + d.name);
            }
        }
    };

    ftr.appendChild(dlBtn);

    inner.appendChild(hdr);
    inner.appendChild(dvBody);
    inner.appendChild(ftr);
    modal.appendChild(inner);

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}


function viewUserDocument(username, documentType, documentLabel) {
    console.log(' viewUserDocument called');
    console.log('  - Username:', username);
    console.log('  - Document type:', documentType);
    console.log('  - Document label:', documentLabel);
    
    sessionStorage.setItem('lastViewedUser', username);
    
    const userKey = 'user_' + username;
    const userData = JSON.stringify(_lcdjp_user_index[userKey] || null);
    
    if (!userData) {
        alert('User not found. Username: ' + username);
        return;
    }
    
    let user;
    try {
        user = JSON.parse(userData);
    } catch (e) {
        alert('Error loading user data.');
        return;
    }
    
    const docMap = {
        'idFront': { key: 'idFront', label: 'National ID - Front', icon: '' },
        'idBack': { key: 'idBack', label: 'National ID - Back', icon: '' },
        'lawyerWorkId': { key: 'lawyerWorkId', label: 'Work ID', icon: '' },
        'lawyerCertificate': { key: 'lawyerCertificate', label: 'Practicing Certificate', icon: '' },
        'cvData': { key: 'cvData', label: 'CV/Resume', icon: '' }
    };
    
    const docInfo = docMap[documentType];
    if (!docInfo) {
        alert('Unknown document type: ' + documentType);
        return;
    }
    
    const documentData = user[docInfo.key];
    const documentName = docInfo.label + ' - ' + (user.first_name || user.firstName || '') + ' ' + (user.last_name || user.lastName || '');
    
    console.log(' Document data found:', {
        hasData: !!documentData,
        dataType: typeof documentData,
        dataLength: documentData ? documentData.length : 0,
        isDataURL: documentData ? documentData.startsWith('data:') : false
    });
    
    if (!documentData) {
        alert('No document uploaded for: ' + docInfo.label + '\n\n' + 
              'This user has not uploaded this document yet.');
        return;
    }
    
    openDocumentViewer(documentData, documentName);
}


document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDocumentViewer();
    }
});

document.addEventListener('click', function(e) {
    const modal = document.getElementById('docViewerModal');
    if (modal && e.target === modal) {
        closeDocumentViewer();
    }
});

function checkAndRepairChatData() {
    console.log(' Checking chat data...');
    
    let conversations = sessionStorage.getItem('lcdjp_chat_conversations');
    let messages = sessionStorage.getItem('lcdjp_chat_messages');
    
    if (!conversations) {
        console.log(' No conversations found, creating empty object');
        sessionStorage.setItem('lcdjp_chat_conversations', JSON.stringify({}));
        chatConversations = {};
    } else {
        try {
            chatConversations = JSON.parse(conversations);
            console.log(' Loaded conversations:', Object.keys(chatConversations).length);
        } catch (e) {
            console.error(' Failed to parse conversations, resetting');
            sessionStorage.setItem('lcdjp_chat_conversations', JSON.stringify({}));
            chatConversations = {};
        }
    }
    
    if (!messages) {
        console.log(' No messages found, creating empty array');
        sessionStorage.setItem('lcdjp_chat_messages', JSON.stringify([]));
        chatMessages = [];
    } else {
        try {
            chatMessages = JSON.parse(messages);
            console.log(' Loaded messages:', chatMessages.length);
        } catch (e) {
            console.error(' Failed to parse messages, resetting');
            sessionStorage.setItem('lcdjp_chat_messages', JSON.stringify([]));
            chatMessages = [];
        }
    }
    
    if (Object.keys(chatConversations).length === 0) {
        const backup = sessionStorage.getItem('lcdjp_chat_backup');
        if (backup) {
            try {
                const backupData = JSON.parse(backup);
                if (Object.keys(backupData).length > 0) {
                    console.log(' Restoring from backup...');
                    chatConversations = backupData;
                    sessionStorage.setItem('lcdjp_chat_conversations', JSON.stringify(backupData));
                    console.log(' Restored conversations from backup');
                }
            } catch (e) {
                console.warn('Failed to restore from backup');
            }
        }
    }
    
    sessionStorage.setItem('lcdjp_chat_backup', JSON.stringify(chatConversations));
    
    console.log(' Current chat state:');
    console.log('  - Conversations:', Object.keys(chatConversations).length);
    console.log('  - Messages:', chatMessages.length);
    
    return { conversations: chatConversations, messages: chatMessages };
}

document.addEventListener('DOMContentLoaded', function() {
    checkAndRepairChatData();
});


async function openVerifyModal(username) {
    var modal = document.getElementById('verifRequestModal');
    var body  = document.getElementById('verifModalBody');
    if (!modal || !body) { alert('Verify modal not found'); return; }
    body.innerHTML = '<div style="text-align:center;padding:40px;color:#999;"><p>Loading...</p></div>';
    modal.style.display = 'flex';
    lockScroll();
    try {
        var resp = await fetch(API_ENDPOINTS.user(username), { headers: { 'Content-Type': 'application/json' } });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var raw  = await resp.json();
        var user = raw.user || raw;
        window._currentViewUser = user;
        var modalReviewer = _verificationReviewerContext();
        var districtAdminOnlyForModal = _systemAdminVerificationRequiresDistrictAdmin(user)
            && _systemAdminHasAssignedDistrictAdmin(user)
            && modalReviewer.approverRole !== 'DISTRICT_ADMIN'
            && !_systemAdminVerificationOverdue(user);
        try {
            var docsR = await fetch(API_ENDPOINTS.user(username) + '/documents', {  });
            if (docsR.ok) { var dd = await docsR.json(); Object.assign(user, dd.documents || dd); }
        } catch(_) {}
        var fn      = (user.firstName||user.first_name||'')+' '+(user.lastName||user.last_name||'');
        var reqRole = _systemAdminVerificationRole(user) || '&mdash;';
        var reviewDistrict = user.verificationDistrict || user.verification_district || user.district || 'Not specified';
        var vs      = (user.verificationStatus || user.verification_status || '').toUpperCase();
        var vsBg    = vs==='PENDING'?'#e8f0fe':vs==='APPROVED'?'#dce8ff':'#d0d8f0';
        var vsCol   = vs==='PENDING'?'#1a4080':vs==='APPROVED'?'#0d2547':'#0d2547';
        var docSlots = [
            { key: 'idFront',          label: 'National ID (Front)' },
            { key: 'idBack',           label: 'National ID (Back)'  },
            { key: 'lawyerWorkId',     label: 'Work ID'             },
            { key: 'lawyerCertificate',label: 'Certificate'         }
        ];
        
        
        
        
        
        
        
        
        
        
        
        
        
        docSlots = docSlots.concat([
            { key: 'selfie',              label: 'Verification Selfie' },
            { key: 'roleDoc_lawCert',     label: 'Practicing Certificate' }
        ]);
        
        
        
        window._currentViewDocs = window._currentViewDocs || {};
        var docHtml = '';
        docSlots.forEach(function(slot) {
            var snakeKey = slot.key.replace(/([A-Z])/g, function(_,c){ return '_'+c.toLowerCase(); });
            var val = user[slot.key] || user[snakeKey] || null;
            var preview;
            if (val) {
                window._currentViewDocs[slot.key] = val;
                var mime = val.startsWith('data:') ? val.split(';')[0].slice(5) : '';
                if (mime.startsWith('image/')) {
                    preview = '<img src="'+val+'" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;cursor:pointer;" title="Click to view full size" onclick="viewDocFile(\''+slot.key+'\')">';
                } else {
                    preview = '<div style="font-size:28px;margin:6px 0;">&#128196;</div><button onclick="viewDocFile(\''+slot.key+'\')" style="padding:6px 14px;background:#fff;color:#17a2b8;border:1px solid #17a2b8;border-radius:5px;cursor:pointer;font-size:12px;">View Document</button>';
                }
            } else {
                preview = '<div style="font-size:28px;color:#ccc;margin:8px 0;">&#10006;</div><span style="font-size:11px;color:#aaa;">Not uploaded</span>';
            }
            docHtml += '<div style="background:#f8f9fa;border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center;">'
                      +'<div style="font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">'+slot.label+'</div>'
                      +preview+'</div>';
        });
        body.innerHTML =
            '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">'
           +'  <div style="flex:1;min-width:260px;">'
           +'    <table style="width:100%;font-size:14px;border-collapse:collapse;">'
           +'      <tr><td style="padding:5px 8px;color:#555;white-space:nowrap;"><strong>Username</strong></td><td style="padding:5px 8px;">@'+user.username+'</td></tr>'
           +'      <tr><td style="padding:5px 8px;color:#555;"><strong>Full Name</strong></td><td style="padding:5px 8px;">'+fn.trim()+'</td></tr>'
           +'      <tr><td style="padding:5px 8px;color:#555;"><strong>Email</strong></td><td style="padding:5px 8px;">'+( user.email||'N/A')+'</td></tr>'
           +'      <tr><td style="padding:5px 8px;color:#555;"><strong>Phone</strong></td><td style="padding:5px 8px;">'+( user.phone||'N/A')+'</td></tr>'
           +'      <tr><td style="padding:5px 8px;color:#555;"><strong>Current Role</strong></td><td style="padding:5px 8px;">'+( user.role||'N/A')+'</td></tr>'
           +'      <tr><td style="padding:5px 8px;color:#555;"><strong>Requested Role</strong></td><td style="padding:5px 8px;"><span style="background:#e8f0fe;color:#1a4080;padding:3px 10px;border-radius:8px;font-weight:700;">'+reqRole+'</span></td></tr>'
            +'      <tr><td style="padding:5px 8px;color:#555;"><strong>Review Routing</strong></td><td style="padding:5px 8px;">'+(
                _systemAdminVerificationRequiresDistrictAdmin(user)
                    ? (_systemAdminHasAssignedDistrictAdmin(user)
                        ? (_systemAdminVerificationOverdue(user)
                            ? 'District Admin + System Admin (overdue &gt; 24h)'
                            : 'District Admin')
                        : 'System Admin fallback, no District Admin assigned')
                    : 'System Admin + District Admin'
            )+' ('+reviewDistrict+')</td></tr>'
           +'      <tr><td style="padding:5px 8px;color:#555;"><strong>Verif. Status</strong></td><td style="padding:5px 8px;"><span style="background:'+vsBg+';color:'+vsCol+';padding:3px 10px;border-radius:8px;font-weight:700;">'+vs+'</span></td></tr>'
           +'    </table>'
           +'  </div>'
           +'</div>'
           +'<h4 style="color:#1a4080;margin:0 0 12px 0;">&#128196; Submitted Documents</h4>'
           +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:24px;">'+docHtml+'</div>'
           +'<div id="verifRejectSection" style="display:none;margin-bottom:16px;">'
           +'  <label style="font-weight:600;font-size:13px;color:#1a4080;">Rejection Reason <span style="color:#0d2547;">*</span></label>'
           +'  <textarea id="verifRejectReason" rows="3" placeholder="State the reason for rejection..." style="width:100%;margin-top:6px;padding:10px;border:1px solid #1a4080;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>'
           +'</div>'
            +'<div style="display:flex;gap:10px;flex-wrap:wrap;border-top:2px solid #eee;padding-top:16px;">'
            +(districtAdminOnlyForModal
                ? '  <span style="display:inline-flex;align-items:center;gap:6px;background:#fff8e1;color:#795548;border:1px solid #ffe082;border-radius:8px;padding:10px 16px;font-size:12px;font-weight:700;">&#128274; District Admin must approve</span>'
                : '  <button onclick="approveVerification(\''+ username +'\')" style="padding:10px 26px;background:white;color:#333;border:1px solid #ccc;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;">&#10004; Approve</button>'
                +'  <button id="verifRejectToggleBtn" onclick="toggleVerifRejectSection()" style="padding:10px 26px;background:white;color:#333;border:1px solid #ccc;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;">&#10006; Reject</button>'
                +'  <button id="verifRejectSubmitBtn" onclick="rejectVerification(\''+ username +'\')" style="display:none;padding:10px 26px;background:white;color:#333;border:1px solid #ccc;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;">&#10006; Confirm Rejection</button>'
            )
           +'</div>';
    } catch(err) {
        body.innerHTML = '<div style="text-align:center;padding:40px;color:#0d2547;"><p>Error loading user: '+err.message+'</p></div>';
    }
}

function closeVerifyModal() {
    var modal = document.getElementById('verifRequestModal');
    if (modal) modal.style.display = 'none';
    unlockScroll();
}

function toggleVerifRejectSection() {
    var sec  = document.getElementById('verifRejectSection');
    var btn  = document.getElementById('verifRejectToggleBtn');
    var sbtn = document.getElementById('verifRejectSubmitBtn');
    if (!sec) return;
    var shown = sec.style.display !== 'none';
    sec.style.display  = shown ? 'none' : 'block';
    if (sbtn) sbtn.style.display = shown ? 'none' : 'inline-block';
    if (btn)  btn.textContent    = shown ? '&#10006; Reject' : 'Cancel Reject';
}

async function approveVerification(username) {
    if (!confirm('Approve verification for ' + username + '? This will assign them the requested role.')) return;
    var reviewer = _verificationReviewerContext();
    var targetUser = window._currentViewUser && window._currentViewUser.username === username
        ? window._currentViewUser
        : (window._verificationUsersByUsername || {})[username] || null;
    if (targetUser && _systemAdminVerificationRequiresDistrictAdmin(targetUser)
        && _systemAdminHasAssignedDistrictAdmin(targetUser)
        && reviewer.approverRole !== 'DISTRICT_ADMIN'
        && !_systemAdminVerificationOverdue(targetUser)) {
        alert('This verification must be approved by the District Admin assigned to the applicant\'s district (the System Admin can also step in once 24 hours have passed).');
        return;
    }
    if (!_verificationMatchesReviewerDistrict(targetUser, reviewer)) {
        alert('You can only approve verification requests for your assigned district.');
        return;
    }
    if (reviewer.approverRole === 'DISTRICT_ADMIN' && !reviewer.approverDistrict) {
        alert('This District Admin account has no assigned district and cannot approve verification requests.');
        return;
    }
    try {
        var request = typeof authFetch === 'function' ? authFetch : fetch;
        var r = await request(API_ENDPOINTS.verifyApprove(username), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                approverRole:         reviewer.approverRole,
                reviewerRole:         reviewer.approverRole,
                approverUsername:     reviewer.approverUsername,
                approverDistrict:     reviewer.approverDistrict,
                verificationDistrict: reviewer.approverDistrict
            })
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var d = await r.json();
        if (d && d.success === false) throw new Error(d.error || d.message || 'Approval failed');
        closeVerifyModal();
        var _ar = document.getElementById('verif-row-' + username);
        if (_ar) _ar.remove();
        showToast('&#10004; ' + username + ' verification approved.');
        loadAllUsers();
        if (typeof loadPendingApprovals === 'function') loadPendingApprovals();
        if (typeof daLoadVerifications === 'function' && reviewer.approverRole === 'DISTRICT_ADMIN') daLoadVerifications();
    } catch(err) {
        alert('Failed to approve verification: ' + err.message);
    }
}

async function rejectVerification(username) {
    var el = document.getElementById('verifRejectReason');
    var reason = el ? el.value.trim() : '';
    if (!reason) { alert('Please enter a rejection reason.'); return; }
    if (!confirm('Reject verification for ' + username + '?')) return;
    var reviewer = _verificationReviewerContext();
    var targetUser = window._currentViewUser && window._currentViewUser.username === username
        ? window._currentViewUser
        : (window._verificationUsersByUsername || {})[username] || null;
    if (targetUser && _systemAdminVerificationRequiresDistrictAdmin(targetUser)
        && _systemAdminHasAssignedDistrictAdmin(targetUser)
        && reviewer.approverRole !== 'DISTRICT_ADMIN'
        && !_systemAdminVerificationOverdue(targetUser)) {
        alert('This verification must be reviewed by the District Admin assigned to the applicant\'s district (the System Admin can also step in once 24 hours have passed).');
        return;
    }
    if (!_verificationMatchesReviewerDistrict(targetUser, reviewer)) {
        alert('You can only review verification requests for your assigned district.');
        return;
    }
    if (reviewer.approverRole === 'DISTRICT_ADMIN' && !reviewer.approverDistrict) {
        alert('This District Admin account has no assigned district and cannot reject verification requests.');
        return;
    }
    try {
        var request = typeof authFetch === 'function' ? authFetch : fetch;
        var r = await request(API_ENDPOINTS.verifyReject(username), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reason:               reason,
                approverRole:         reviewer.approverRole,
                reviewerRole:         reviewer.approverRole,
                approverUsername:     reviewer.approverUsername,
                approverDistrict:     reviewer.approverDistrict,
                verificationDistrict: reviewer.approverDistrict
            })
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var d = await r.json();
        if (d && d.success === false) throw new Error(d.error || d.message || 'Rejection failed');
        closeVerifyModal();
        var _rr = document.getElementById('verif-row-' + username);
        if (_rr) _rr.remove();
        showToast('&#10006; ' + username + ' verification rejected.');
        loadAllUsers();
        if (typeof loadPendingApprovals === 'function') loadPendingApprovals();
        if (typeof daLoadVerifications === 'function' && reviewer.approverRole === 'DISTRICT_ADMIN') daLoadVerifications();
    } catch(err) {
        alert('Failed to reject verification: ' + err.message);
    }
}





function viewDocFile(key) {
    const docs = window._currentViewDocs || {};
    const src = docs[key];
    if (!src) { alert('No document available.'); return; }

    const mime = src.startsWith('data:') ? src.split(';')[0].slice(5) : 'application/octet-stream';
    const isImage = mime.startsWith('image/');

    function dataURLtoBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const byteStr = atob(parts[1]);
        const ab = new ArrayBuffer(byteStr.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
        return new Blob([ab], { type: mime });
    }

    if (isImage) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:999999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
        overlay.title = 'Click anywhere to close';
        overlay.onclick = () => overlay.remove();
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'max-width:92vw;max-height:92vh;border-radius:10px;box-shadow:0 0 40px rgba(0,0,0,0.5);';
        overlay.appendChild(img);
        document.body.appendChild(overlay);
    } else {
        try {
            const blob = dataURLtoBlob(src);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (e) {
            window.open(src, '_blank');
        }
    }
}


async function viewLawyerCV(username) {
    const user = await getUserByUsername(username);
    if (!user || !user.cvData) {
        alert('No CV uploaded for this lawyer.');
        return;
    }
    
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>CV - ${user.firstName} ${user.lastName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { color: #1a4080; border-bottom: 3px solid #1a4080; padding-bottom: 10px; }
                .info { background: #f0f5ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .info p { margin: 8px 0; }
                .cv-container { margin-top: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
                .embed-container { width: 100%; height: 600px; }
            <\/style>
        <\/head>
        <body>
            <h1> Curriculum Vitae</h1>
            <div class="info">
                <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
                <p><strong>Specialization:</strong> ${user.lawyerSpecialization || 'N/A'}</p>
                <p><strong>Law School:</strong> ${user.lawSchool || 'Not specified'}</p>
                <p><strong>Years Experience:</strong> ${user.yearsExperience || 'Not specified'}</p>
                <p><strong>Law Firm:</strong> ${user.lawFirmName || 'N/A'}</p>
                <p><strong>Phone:</strong> ${user.phoneNumber || 'N/A'}</p>
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
            </div>
            <div class="cv-container">
                <h3> CV Document</h3>
                ${user.cvFileType && user.cvFileType.startsWith('image/') ? 
                    `<img src="${user.cvData}" style="max-width:100%; border:1px solid #ddd; border-radius:4px;">` :
                    user.cvFileType === 'application/pdf' ?
                    `<iframe src="${user.cvData}" class="embed-container"></iframe>` :
                    `<div style="text-align:center; padding:40px;">
                        <div style="font-size:48px;"></div>
                        <p>CV uploaded: ${user.cvFileName || 'Document'}</p>
                        <a href="${user.cvData}" download="${user.cvFileName || 'cv'}" style="color:#1a4080; text-decoration:underline;">Download CV</a>
                    </div>`
                }
            </div>
            <div style="text-align:center; margin-top:30px;">
                <button onclick="window.close()" style="padding:10px 30px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">Close</button>
            </div>
        <\/body>
        <\/html>
    `);
    win.document.close();
}


function closeDocumentViewer() {
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio.src = '';
            currentAudio.load();
        } catch (e) {
            console.warn('Could not stop audio:', e);
        }
        currentAudio = null;
        currentPlayBtn = null;
    }
    
    const modal = document.getElementById('docViewerModal');
    if (modal) {
        modal.remove();
    }
    
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => overlay.remove());
    
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    
    
    
    window._lcdjpScrollLockCount = 0;
    
    const userModal = document.getElementById('userDetailModal');
    if (userModal && userModal.style.display === 'flex') {
        userModal.style.display = 'flex';
        return;
    }
    
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard && adminDashboard.style.display === 'block') {
        const currentView = document.querySelector('.dashboard-view[style*="display: block"]');
        if (currentView && currentView.id === 'adminDashboard') {
            const approvalContainer = document.getElementById('approvalContainer');
            if (approvalContainer && approvalContainer.style.display !== 'none') {
                loadPendingApprovals();
            }
        }
        return;
    }
    
    const dynamicView = document.getElementById('dynamicFormPage');
    if (dynamicView && dynamicView.style.display === 'block') {
        const currentUser = sessionStorage.getItem('lastViewedUser');
        if (currentUser) {
            viewUserDetails(currentUser);
        }
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDocumentViewer();
    }
});

document.addEventListener('click', function(e) {
    const modal = document.getElementById('docViewerModal');
    if (modal && modal.classList.contains('active') && e.target === modal) {
        closeDocumentViewer();
    }
});


async function showLegalOrgsAdmin() {
    hideAllDashboardViews();
    document.getElementById('adminDashboard').style.display = 'block';
    setAdminActiveMenu('orgs');
    
    ['adminHomeContainer','approvalContainer','userManagementContainer','lawyerManagementContainer',
     'lawyerPerformanceContainer','statisticsContainer','pdfExportContainer','searchResultsContainer',
     'adminNotificationsPage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    let container = document.getElementById('legalOrgsAdminContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'legalOrgsAdminContainer';
        document.getElementById('adminDashboard').appendChild(container);
    }
    container.style.display = 'block';
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;"> Loading organizations...</div>';
    
    try {
        const token = getAuthToken();
        console.log(' Token:', token);
        
        const resp = await fetch(API_ENDPOINTS.legalOrgsAll, {
            
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(' Response status:', resp.status);
        
        if (!resp.ok) {
            throw new Error('Failed to load organizations: ' + resp.status);
        }
        
        const orgs = await resp.json();
        console.log(' Organizations received:', orgs);
        console.log(' Count:', orgs.length);
        
        let orgList = Array.isArray(orgs) ? orgs : (orgs.data || orgs.organizations || []);
        console.log(' Org list:', orgList);
        
        let orgRows = orgList.map(o => `
            <tr>
                <td style="padding:10px;">${o.orgName || o.name || 'N/A'}</td>
                <td style="padding:10px;">${o.orgType || '-'}</td>
                <td style="padding:10px;">${o.district || '-'}</td>
                <td style="padding:10px;">${o.phone || '-'}</td>
                <td style="padding:10px;">
                    <button onclick="deleteLegalOrg(${o.id}, this)"
                        style="padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:5px; cursor:pointer; font-size:12px;">
                         Delete
                    </button>
                </td>
            </tr>`).join('');
        
        container.innerHTML = `
            <div style="padding:20px 30px; max-width:1100px; margin:0 auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; gap:10px; flex-wrap:wrap;">
                    <h2 style="margin:0; color:#1a4080;"> Legal Organizations</h2>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button onclick="showAddLegalOrgForm()" 
                            style="padding:10px 22px; background:#1a4080; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">
                             Add Organization
                        </button>
                        <button onclick="showAdminHome()" aria-label="Close" style="background:none; border:none; font-size:26px; line-height:1; color:#666; cursor:pointer; padding:0 6px;">&times;</button>
                    </div>
                </div>
                
                <div id="addLegalOrgFormContainer" style="display:none; background:white; border-radius:12px; padding:24px; margin-bottom:24px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="color:#1a4080; margin-bottom:18px;"> Add Legal Organization</h3>
                    <div class="lcdjp-grid-2col" style="gap:16px;">
                        <div>
                            <label style="font-size:13px; font-weight:600; color:#555;">Organization Name *</label>
                             <input id="lo_orgName" placeholder="Organization name" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                        </div>
                        <div>
                            <label style="font-size:13px; font-weight:600; color:#555;">Organization Type</label>
                            <select id="lo_orgType" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                                <option value="ngo">NGO / Non-Profit</option>
                                <option value="company">Law Firm / Company</option>
                                <option value="clinic">Legal Aid Clinic</option>
                                <option value="government">Government Agency</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:13px; font-weight:600; color:#555;">District</label>
                             <input id="lo_district" placeholder="Enter district" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                        </div>
                        <div>
                            <label style="font-size:13px; font-weight:600; color:#555;">Phone</label>
                            <input id="lo_phone" placeholder="+256 xxx xxx xxx" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                        </div>
                        <div>
                            <label style="font-size:13px; font-weight:600; color:#555;">Email</label>
                             <input id="lo_email" placeholder="Enter email address" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                        </div>
                        <div>
                            <label style="font-size:13px; font-weight:600; color:#555;">Specialization</label>
                             <input id="lo_specialization" placeholder="Enter specialization" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                        </div>
                        <div>
                            <label style="font-size:13px; font-weight:600; color:#555;">Latitude</label>
                             <input id="lo_latitude" type="number" step="any" placeholder="e.g. 0.3136" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                        </div>
                        <div>
                            <label style="font-size:13px; font-weight:600; color:#555;">Longitude</label>
                             <input id="lo_longitude" type="number" step="any" placeholder="e.g. 32.5811" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                        </div>
                        <div style="grid-column:1/-1;">
                            <label style="font-size:13px; font-weight:600; color:#555;">Address</label>
                            <input id="lo_address" placeholder="Physical address" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px;">
                        </div>
                        <div style="grid-column:1/-1;">
                            <label style="font-size:13px; font-weight:600; color:#555;">Description</label>
                            <textarea id="lo_description" rows="3" placeholder="Brief description of services offered..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; box-sizing:border-box; margin-top:4px; font-size:14px; resize:vertical;"></textarea>
                        </div>
                    </div>
                    <div style="margin-top:20px; display:flex; gap:12px;">
                        <button onclick="createLegalOrg()"
                            style="padding:12px 28px; background:#1a4080; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600;">
                             Add Organization
                        </button>
                        <button onclick="document.getElementById('addLegalOrgFormContainer').style.display='none'"
                            style="padding:12px 24px; background:#6c757d; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">
                            Cancel
                        </button>
                    </div>
                </div>
                
                <div style="background:white; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.08); overflow:hidden;">
                    <div style="padding:16px 20px; border-bottom:1px solid #f0e8f8; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; color:#1a4080;">Registered Organizations (${orgList.length})</h3>
                    </div>
                    ${orgList.length === 0 ? 
                        '<div style="padding:40px; text-align:center; color:#999;"><div style="font-size:48px; margin-bottom:12px;"></div><p>No organizations registered yet.</p></div>' :
                        `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse;">
                            <thead><tr style="background:#f0f5ff;">
                                <th style="padding:12px 10px; text-align:left; color:#1a4080; font-size:13px;">Organization</th>
                                <th style="padding:12px 10px; text-align:left; color:#1a4080; font-size:13px;">Type</th>
                                <th style="padding:12px 10px; text-align:left; color:#1a4080; font-size:13px;">District</th>
                                <th style="padding:12px 10px; text-align:left; color:#1a4080; font-size:13px;">Phone</th>
                                <th style="padding:12px 10px; text-align:left; color:#1a4080; font-size:13px;">Actions</th>
                            </tr></thead>
                            <tbody>${orgRows}</tbody>
                        </table></div>`
                    }
                </div>
            </div>`;
            
    } catch (err) {
        console.error(' Error:', err);
        container.innerHTML = '<div style="padding:20px; color:#dc3545;"> Failed to load organizations: ' + err.message + '</div>';
    }
}


function showAddLegalOrgForm() {
    const form = document.getElementById('addLegalOrgFormContainer');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function createLegalOrg() {
    const orgName = document.getElementById('lo_orgName').value.trim();
    if (!orgName) {
        alert('Organization name is required.');
        return;
    }
    const payload = {
        orgName: orgName,
        orgType: document.getElementById('lo_orgType').value,
        district: document.getElementById('lo_district').value.trim(),
        phone: document.getElementById('lo_phone').value.trim(),
        email: document.getElementById('lo_email').value.trim(),
        specialization: document.getElementById('lo_specialization').value.trim(),
        address: document.getElementById('lo_address').value.trim(),
        description: document.getElementById('lo_description').value.trim(),
        latitude: parseFloat(document.getElementById('lo_latitude').value) || null,
        longitude: parseFloat(document.getElementById('lo_longitude').value) || null
    };

    try {
        const response = await fetch(API_ENDPOINTS.legalOrgs, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to create organization (' + response.status + ')');
        alert('Organization added successfully!');
        if (typeof showLegalOrgsAdmin === 'function') showLegalOrgsAdmin();
    } catch (error) {
        console.error('Error creating organization:', error);
        alert('Failed to add organization. Please try again.');
    }
}

async function deleteLegalOrg(id, button) {
    if (!id) {
        alert('Unable to identify organization to delete. Please refresh and try again.');
        return;
    }
    if (!confirm('Are you sure you want to delete this organization?')) return;

    try {
        const response = await fetch(API_ENDPOINTS.legalOrgDelete(id), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            if (button) {
                const row = button.closest('tr');
                if (row) row.remove();
            }
        } else {
            alert('Failed to delete organization: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting organization:', error);
        alert('Failed to delete organization. Please try again.');
    }
}



window._adminCaseState = { page: 1, pageSize: 25, search: '', district: '', status: '', type: '' };

function showAdminCases() {
    hideAllDashboardViews();

    var dash = document.getElementById('adminDashboard');
    if (dash) dash.style.display = 'block';

    ['adminHomeContainer', 'approvalContainer', 'userManagementContainer',
     'lawyerManagementContainer', 'lawyerPerformanceContainer', 'pdfExportContainer',
     'statisticsContainer', 'searchResultsContainer'
    ].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    var dynPage = document.getElementById('dynamicFormPage');
    if (dynPage) { dynPage.innerHTML = ''; dynPage.style.display = 'none'; }

    var container = document.getElementById('adminCasesContainer');
    if (container) container.style.display = 'block';

    if (typeof setAdminActiveMenu === 'function') setAdminActiveMenu('adminMenu_cases');

    adminLoadCaseFilterOptions();
    adminLoadCases();
}

async function adminLoadCaseFilterOptions() {
    try {
        var resp = await authFetch(API_ENDPOINTS.caseAnalytics, { method: 'GET' });
        if (!resp.ok) return;
        var data = await resp.json();

        CaseBrowser.fillOptionsFromValues('adminCaseStatus', Object.keys(data.byStatus || {}), 'All statuses');
        CaseBrowser.fillOptionsFromValues('adminCaseType', data.typeOptions || [], 'All types');
        CaseBrowser.fillOptionsFromCounts('adminCaseDistrict', data.districtOptions || [], 'All districts');
    } catch (err) {
        console.warn('Could not load case filter options:', err.message);
    }
}

async function adminLoadCases() {
    var container = document.getElementById('adminCasesContent');
    if (!container) return;

    container.innerHTML = '<p class="case-list-empty">Loading cases\u2026</p>';

    var s = window._adminCaseState;
    var params = new URLSearchParams();
    params.set('page', s.page);
    params.set('pageSize', s.pageSize);
    if (s.search) params.set('search', s.search);
    if (s.district) params.set('district', s.district);
    if (s.status) params.set('status', s.status);
    if (s.type) params.set('type', s.type);

    try {
        var resp = await authFetch(API_ENDPOINTS.cases + '?' + params.toString(), { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        var cases = CaseBrowser.unwrapCases(data);

        var empty = (s.search || s.district || s.status || s.type)
            ? 'No cases match these filters.'
            : 'No cases have been filed yet.';
        CaseBrowser.renderList('adminCasesContent', 'adminCasesCount', cases, empty);

        CaseBrowser.renderPagination('adminCasesPagination', data.page || s.page,
            data.pageSize || s.pageSize, data.totalCount || cases.length,
            function (newPage) {
                window._adminCaseState.page = newPage;
                adminLoadCases();
            });
    } catch (err) {
        container.innerHTML = '<p class="case-list-error">Could not load cases: '
            + CaseBrowser.esc(err.message) + '</p>';
        var countEl = document.getElementById('adminCasesCount');
        if (countEl) countEl.textContent = '';
        var pagEl = document.getElementById('adminCasesPagination');
        if (pagEl) pagEl.innerHTML = '';
    }
}

var _adminApplyCaseFiltersDebounced = CaseBrowser.debounce(function () {
    adminReadCaseFiltersIntoState();
    window._adminCaseState.page = 1;
    adminLoadCases();
}, 350);

function adminReadCaseFiltersIntoState() {
    var searchEl   = document.getElementById('adminCaseSearch');
    var districtEl = document.getElementById('adminCaseDistrict');
    var statusEl   = document.getElementById('adminCaseStatus');
    var typeEl     = document.getElementById('adminCaseType');

    window._adminCaseState.search   = searchEl ? searchEl.value.trim() : '';
    window._adminCaseState.district = districtEl ? districtEl.value : '';
    window._adminCaseState.status   = statusEl ? statusEl.value : '';
    window._adminCaseState.type     = typeEl ? typeEl.value : '';
}

function adminApplyCaseFilters() {
    _adminApplyCaseFiltersDebounced();
}

function adminClearCaseFilters() {
    ['adminCaseSearch', 'adminCaseDistrict', 'adminCaseStatus', 'adminCaseType']
        .forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
    window._adminCaseState.search = '';
    window._adminCaseState.district = '';
    window._adminCaseState.status = '';
    window._adminCaseState.type = '';
    window._adminCaseState.page = 1;
    adminLoadCases();
}

window.showAdminCases = showAdminCases;
window.adminLoadCases = adminLoadCases;
window.adminApplyCaseFilters = adminApplyCaseFilters;
window.adminClearCaseFilters = adminClearCaseFilters;
