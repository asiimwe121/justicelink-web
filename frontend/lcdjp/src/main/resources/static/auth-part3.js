
function _execProtectedAction(actionKey) {
    
    
    
    
    var actions = {
        'reportCase':          function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant(); else if (typeof openAIAssistant === 'function') openAIAssistant(undefined, 'report'); },
        'trackCase':           function() { showTrackCaseTab(); },
        'myCases':             function() { showMyCases(); },
        'documents':           function() { showDocumentManagementPage(); },
        'uploadDoc':           function() { showDocumentUploadPage(); },
        'docCategories':       function() { showDocumentCategoriesPage(); },
        'sharedDocs':          function() { showSharedDocumentsPage(); },
        'myProfile':           function() {
            
            
            
            
            
            
            
            
            if (typeof isAdmin === 'function' && isAdmin() && typeof showAdminAccountSettings === 'function') {
                showAdminAccountSettings();
            } else {
                showMyProfile();
            }
        },
        'editProfile':         function() { showEditAccount(); },
        'notifications':       function() { toggleNotifications(); },
        'disputeFamily':       function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Family Dispute'); else if (typeof openAIAssistant === 'function') openAIAssistant('Family Dispute', 'report'); },
        'disputeLand':         function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Land Matter'); else if (typeof openAIAssistant === 'function') openAIAssistant('Land Matter', 'report'); },
        'disputeBusiness':     function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Business Matter'); else if (typeof openAIAssistant === 'function') openAIAssistant('Business Matter', 'report'); },
        'disputeCommunity':    function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Community Disputes'); else if (typeof openAIAssistant === 'function') openAIAssistant('Community Disputes', 'report'); },
        'disputeInheritance':  function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Inheritance Dispute'); else if (typeof openAIAssistant === 'function') openAIAssistant('Inheritance Dispute', 'report'); },
        'disputeBoundary':     function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Boundary Dispute'); else if (typeof openAIAssistant === 'function') openAIAssistant('Boundary Dispute', 'report'); },
        'disputeMarriage':     function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Marriage Dispute'); else if (typeof openAIAssistant === 'function') openAIAssistant('Marriage Dispute', 'report'); },
        'disputeChildCustody': function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Child Custody'); else if (typeof openAIAssistant === 'function') openAIAssistant('Child Custody', 'report'); },
        'disputeDebt':         function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Debt Recovery'); else if (typeof openAIAssistant === 'function') openAIAssistant('Debt Recovery', 'report'); },
        'disputeOthers':       function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Other Legal Matter'); else if (typeof openAIAssistant === 'function') openAIAssistant('Other Legal Matter', 'report'); }
    };
    if (actions[actionKey]) actions[actionKey]();
}

function _mobileCleanupOnLogout() {
    
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();

    var sb = document.getElementById('mainSidebar');
    if (sb) sb.classList.remove('mobile-sidebar-open');
    var ov = document.getElementById('lcdjpSidebarOverlay');
    if (ov) {
        ov.classList.remove('active');
        ov.style.display = 'none';
    }

    
    ['cmAccountMenu', 'lcmAccountMenu', 'lmAccountMenu'].forEach(function(id) {
        var m = document.getElementById(id);
        if (m) m.style.display = 'none';
    });

    var accountDrop = document.getElementById('accountMenuDropdown');
    if (accountDrop) accountDrop.style.display = 'none';

    var notifDropdown = document.getElementById('notifDropdown') || document.getElementById('notificationsPanel');
    if (notifDropdown) notifDropdown.style.display = 'none';

    
    ['mobileMenuPanel', 'mobileRolePanel',
     'notifSettingsPanel'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    });

    document.querySelectorAll('.doc-viewer-modal').forEach(function(m) {
        m.remove();
    });

    var _caseModal = document.getElementById('caseDetailsModal');
    if (_caseModal) {
        _caseModal.style.display = 'none';
        _caseModal.innerHTML = '';
    }
    var _docViewer = document.getElementById('docViewerModal');
    if (_docViewer) _docViewer.remove();

    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    
    window._lcdjpScrollLockCount = 0;

    var trackContainer = document.getElementById('trackingResultContainer');
    if (trackContainer) trackContainer.innerHTML = '';
    var trackInput = document.getElementById('trackSearchInput');
    if (trackInput) trackInput.value = '';
    var msgCont = document.getElementById('messagingContainer');
    if (msgCont) msgCont.style.display = 'none';

    
    document.querySelectorAll('.notif-count, .notif-badge, #navNotifCount, #cmNotifBadge, #lcmNotifBadge, #lmNotifBadge').forEach(function(b) {
        b.textContent = '';
        b.style.display = 'none';
    });
    
   
}

function logoutUser() {
    // Unsent offline case drafts are deleted on logout so the next person on a shared phone cannot read them.
    if (window.JusticeLinkDrafts && !window.JusticeLinkDrafts.confirmLogout()) return;

    if (window.chatInterval) {
        clearInterval(window.chatInterval);
        window.chatInterval = null;
    }
    if (window.notifInterval) {
        clearInterval(window.notifInterval);
        window.notifInterval = null;
    }
    
    _lcdjpClearAccountState();
    
    
    _mobileCleanupOnLogout();

    
    var dashPage = document.getElementById('dashboardPage');
    var loginPage = document.getElementById('loginPage');
    if (dashPage) dashPage.style.display = 'none';
    if (loginPage) loginPage.style.display = 'flex';
    window.scrollTo(0, 0);

    
    document.body.classList.remove(
        'citizen-dashboard-mode', 'lawyer-dashboard-mode',
        'admin-dashboard-mode', 'admin-map-active'
    );
    currentUserLevel = '';

    if (typeof showLoginScreen === 'function') {
        showLoginScreen();
    }

    
    // The HttpOnly cookie identifies the session to end; the fetch wrapper adds the CSRF header.
    fetch(API_BASE_URL + '/api/auth/logout', {
        method: 'POST',
        suppressAuthRedirect: true
    }).then(function(response) {
        
        if (!response.ok) {
            console.warn('Logout API call failed:', response.status);
        }
    }).catch(function() {
        
        console.log('Logout API call failed, continuing with client-side logout');
    });
}


function showEditAccount() {
    let html = `
    <div class="form-card">
        <h2>Update Profile Picture</h2>
        <p style="margin-bottom:12px;">Choose a local image file to replace your system profile avatar photo dynamically.</p>
        <p style="font-size:13px; color:#888; margin-bottom:12px;">
             Supported formats: JPG, PNG, GIF (Max 5MB)
        </p>
        <label>Upload Profile Photo File</label>
        <input type="file" id="avatarImageFileInput" accept="image/*" onchange="processProfileAvatarChange(this)" style="padding:10px; border:1px solid #ddd; border-radius:6px; width:100%;">

        ${typeof lcdjpRenderThemeToggle === 'function' ? lcdjpRenderThemeToggle() : ''}

        <br><br>
        <button onclick="showHome()" style="padding:10px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
            Finish & Return
        </button>
    </div>`;
    openDynamicView(html);
}







async function _lcdjpSyncAvatarFromBackend(username) {
    if (!username) return;
    try {
        let user = (typeof getUserByUsername === 'function') ? await getUserByUsername(username) : null;
        let avatarData = user && (user.avatarData || user.avatar_data);
        if (avatarData && avatarData !== 'undefined' && avatarData !== 'null') {
            localStorage.setItem("lcdjp_avatar_" + username, avatarData);
            sessionStorage.setItem("lcdjp_avatar_" + username, avatarData);
            let profilePic = document.getElementById("profilePicture");
            if (profilePic) profilePic.src = avatarData;
            if (typeof window.lcdjpApplyAvatarEverywhere === 'function') {
                window.lcdjpApplyAvatarEverywhere();
            }
        }
    } catch (err) {
        console.warn('[LCDJP] Could not sync profile picture from backend:', err);
    }
}

function processProfileAvatarChange(inputElement) {
    const file = inputElement.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("That image is too large. Please choose a photo under 2MB.");
            inputElement.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = async function(e) {
            let currentAvatarImage = e.target.result;
            let username = localStorage.getItem("lcdjp_username");
            
            if (!username) {
                alert("Please login first.");
                return;
            }
            
            
            
            
            document.querySelectorAll('#profilePicture, .js-profile-avatar-img').forEach(function(img) {
                img.src = currentAvatarImage;
            });

            
            
            
            
            
            try {
                const token = (typeof getAuthToken === 'function') ? getAuthToken() :
                    ((typeof getAuthToken === 'function' ? getAuthToken() : null));

                const response = await fetch(API_ENDPOINTS.profile, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ avatarData: currentAvatarImage })
                });

                let data = null;
                try { data = await response.json(); } catch (parseErr) { }

                if (!response.ok || !data || data.success !== true) {
                    throw new Error((data && data.error) || ('Server responded with ' + response.status));
                }

                
                localStorage.setItem("lcdjp_avatar_" + username, currentAvatarImage);
                sessionStorage.setItem("lcdjp_avatar_" + username, currentAvatarImage);
                if (window._lcdjpUserCache && window._lcdjpUserCache[username]) {
                    window._lcdjpUserCache[username].avatarData = currentAvatarImage;
                }

                if (typeof window.lcdjpApplyAvatarEverywhere === 'function') {
                    window.lcdjpApplyAvatarEverywhere();
                }

                alert("Profile Picture successfully updated!");
            } catch (err) {
                console.warn('[LCDJP] Failed to persist profile picture to backend:', err);
                
                document.querySelectorAll('#profilePicture, .js-profile-avatar-img').forEach(function(img) {
                    let saved = sessionStorage.getItem("lcdjp_avatar_" + username) || localStorage.getItem("lcdjp_avatar_" + username) || '';
                    img.src = saved;
                });
                alert("Could not save your profile picture: " + err.message + "\n\nPlease try again.");
            }
        };
        reader.readAsDataURL(file);
    }
}

function toggleAccountMenu() {
    let menu = document.getElementById("accountMenu");
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}


function toggleCdtProfileMenu(e) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('cdtProfileMenu');
    if (!menu) return;
    
    var username = localStorage.getItem('lcdjp_username');
    var fullName = localStorage.getItem('lcdjp_fullname') || username || '';
    var initials = fullName.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2) || 'U';
    var avatar = document.getElementById('cdtAvatar');
    var nameEl = document.getElementById('cdtUserName');
    var roleEl = document.getElementById('cdtUserRole');
    var userLevel = localStorage.getItem('lcdjp_userlevel') || 'Citizen';
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = fullName || 'My Account';
    if (roleEl) roleEl.textContent = userLevel;
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
document.addEventListener('click', function(e) {
    var wrap = document.querySelector('.cdt-user-wrap');
    var menu = document.getElementById('cdtProfileMenu');
    if (menu && menu.style.display === 'block' && (!wrap || !wrap.contains(e.target))) {
        menu.style.display = 'none';
    }
});




function toggleLwtProfileMenu(e) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('lwtProfileMenu');
    if (!menu) return;

    var username = localStorage.getItem('lcdjp_username');
    var fullName = localStorage.getItem('lcdjp_fullname') || username || '';
    var initials = fullName.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2) || 'L';
    var avatar = document.getElementById('lwtAvatar');
    var nameEl = document.getElementById('lwtUserName');
    var roleEl = document.getElementById('lwtUserRole');
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = fullName || 'My Account';
    if (roleEl) roleEl.textContent = (typeof currentUserLevel !== 'undefined' && currentUserLevel === 'LC') ? 'LC Official' : 'Lawyer';
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
document.addEventListener('click', function(e) {
    var wrap = document.querySelector('#lawyerDesktopTopbarInner .cdt-user-wrap');
    var menu = document.getElementById('lwtProfileMenu');
    if (menu && menu.style.display === 'block' && (!wrap || !wrap.contains(e.target))) {
        menu.style.display = 'none';
    }
});




function toggleAdtProfileMenu(e) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('adtProfileMenu');
    if (!menu) return;

    var username = localStorage.getItem('lcdjp_username');
    var fullName = localStorage.getItem('lcdjp_fullname') || username || '';
    var initials = fullName.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2) || 'A';
    var avatar = document.getElementById('adtAvatar');
    var nameEl = document.getElementById('adtUserName');
    var roleEl = document.getElementById('adtUserRole');
    var userLevel = localStorage.getItem('lcdjp_userlevel') || '';
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = fullName || 'My Account';
    if (roleEl) roleEl.textContent = (userLevel === 'DISTRICT_ADMIN') ? 'District Admin' : 'System Admin';
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
document.addEventListener('click', function(e) {
    var wrap = document.querySelector('#adminDesktopTopbarInner .cdt-user-wrap');
    var menu = document.getElementById('adtProfileMenu');
    if (menu && menu.style.display === 'block' && (!wrap || !wrap.contains(e.target))) {
        menu.style.display = 'none';
    }
});


function syncCdtUserInfo() {
    var username = localStorage.getItem('lcdjp_username');
    var fullName = localStorage.getItem('lcdjp_fullname') || username || '';
    var userLevel = localStorage.getItem('lcdjp_userlevel') || 'Citizen';
    var initials = fullName.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2) || 'U';
    var avatar = document.getElementById('cdtAvatar');
    var nameEl = document.getElementById('cdtUserName');
    var roleEl = document.getElementById('cdtUserRole');
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = fullName || 'My Account';
    if (roleEl) roleEl.textContent = userLevel;
}

window.addEventListener('click', function(e) {
    if (document.querySelector('.profile-container') && !document.querySelector('.profile-container').contains(e.target)) {
        document.getElementById("accountMenu").style.display = "none";
    }
});

window.addEventListener('click', function(e) {
    var chm = document.getElementById('citizenFindHelpMenu');
    if (chm && chm.style.display === 'block' && !chm.parentElement.contains(e.target)) {
        chm.style.display = 'none';
    }
});

function toggleMenu(menuId) {
    let menu = document.getElementById(menuId);
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}













function _lcdjpEnforceAdminNavRestrictions() {
    var adminOnly = typeof isAdmin === 'function' && isAdmin();
    
    
    
    
    
    
    var _currentUserLevel = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('lcdjp_userlevel'))
        || (typeof localStorage !== 'undefined' && localStorage.getItem('lcdjp_userlevel'))
        || '';
    var isDistrictAdminUser = _currentUserLevel === 'DISTRICT_ADMIN';
    var legalAlertsBtn = document.getElementById('adtLegalAlertsBtn');
    if (legalAlertsBtn) {
        legalAlertsBtn.style.setProperty('display', isDistrictAdminUser ? 'none' : '', 'important');
        if (!isDistrictAdminUser) legalAlertsBtn.style.removeProperty('display');
    }
    var contactLink = document.getElementById('navContactLink');
    var languageSelect = document.getElementById('languageSelect');
    var homeLink = document.getElementById('navHomeLink');
    var brandLogo = document.getElementById('lcdjpBrandLogo');

    
    
    [contactLink, homeLink].forEach(function(el) {
        if (!el) return;
        if (adminOnly) {
            el.style.setProperty('display', 'none', 'important');
        } else {
            el.style.removeProperty('display');
        }
    });

    
    
    if (languageSelect) {
        var _isCitizen = typeof _lcdjpIsCitizenRole === 'function' && _lcdjpIsCitizenRole();
        if (_isCitizen) {
            languageSelect.style.removeProperty('display');
        } else {
            languageSelect.style.setProperty('display', 'none', 'important');
        }
    }

    
    
    
    
    
    

    if (brandLogo) {
        if (adminOnly) {
            brandLogo.style.cursor = 'pointer';
            brandLogo.title = 'Admin Map';
        } else {
            brandLogo.style.cursor = 'pointer';
            brandLogo.title = 'Go to Home';
        }
    }

    
    
    
    var amAdminSlots = document.querySelectorAll('#amBottomNav .am-role-admin');
    var amDaSlots = document.querySelectorAll('#amBottomNav .am-role-da');
    var showAdminSlots = adminOnly && !isDistrictAdminUser;
    var showDaSlots = adminOnly && isDistrictAdminUser;
    amAdminSlots.forEach(function(el) {
        if (showAdminSlots) el.style.removeProperty('display');
        else el.style.setProperty('display', 'none', 'important');
    });
    amDaSlots.forEach(function(el) {
        if (showDaSlots) el.style.removeProperty('display');
        else el.style.setProperty('display', 'none', 'important');
    });
}
window._lcdjpEnforceAdminNavRestrictions = _lcdjpEnforceAdminNavRestrictions;


window.addEventListener('resize', _lcdjpEnforceAdminNavRestrictions);








function _lcdjpGoToOwnAdminHome() {
    if (sessionStorage.getItem('lcdjp_userlevel') === 'DISTRICT_ADMIN'
        && typeof showDistrictAdminDashboard === 'function') {
        showDistrictAdminDashboard();
    } else if (typeof showAdminHome === 'function') {
        showAdminHome();
    }
}
window._lcdjpGoToOwnAdminHome = _lcdjpGoToOwnAdminHome;

function hideAllDashboardViews() {
    
    
    
    
    document.body.classList.remove('admin-map-active');

    var _staleMapView = document.getElementById('adminMapView');
    if (_staleMapView) { _staleMapView.style.height = ''; _staleMapView.style.minHeight = ''; }
    var _staleHomeContainer = document.getElementById('adminHomeContainer');
    if (_staleHomeContainer) { _staleHomeContainer.style.height = ''; }

    
    
    
    
    
    
    
    
    
    
    
    
    
    var _lcdjpOpenOverlay = document.querySelector('.lcdjp-desktop-page-overlay');
    if (_lcdjpOpenOverlay && typeof _lcdjpOpenOverlay._lcdjpClose === 'function') {
        
        
        
        _lcdjpOpenOverlay._lcdjpClose(true);
    }

    _lcdjpEnforceAdminNavRestrictions();

    var _adminContainers = [
        'adminHomeContainer', 'approvalContainer', 'userManagementContainer',
        'adminCasesContainer',
        'lawyerManagementContainer', 'lawyerPerformanceContainer', 'statisticsContainer',
        'pdfExportContainer', 'searchResultsContainer', 'adminNotificationsPage',
        'legalOrgsAdminContainer', 'caseDetailsModal', 'adminMessagesPanel',
        'adminMessagesOverlay', 'adminUserPanel', 'adminConversationModal',
        'auditLogsContainer', 'districtAdminContainer', 'verificationRequestsContainer',
        'daDashboard', 'daHomeContainer', 'daUsersContainer', 'daVerifContainer',
        'daCasesContainer', 'daStatsContainer', 'daNotifContainer', 'daMapContainer'
    ];
    _adminContainers.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.style.visibility = ''; }
    });

    document.querySelectorAll('.dashboard-view').forEach(function(el) {
        el.style.display = 'none';
    });

    var dynamicForm = document.getElementById('dynamicFormPage');
    if (dynamicForm) { dynamicForm.style.display = 'none'; dynamicForm.innerHTML = ''; }
}

var adminMapInstance = null;   
var _adminGMap = null;
var _adminInfoWindow = null;
window._adminMapUsers = {};    







function syncAdminMapHeight() {
    if (!document.body.classList.contains('admin-dashboard-mode')) return;
    if (!document.body.classList.contains('admin-map-active')) return;

    var mapView = document.getElementById('adminMapView');
    if (!mapView) return;

    if (window.innerWidth <= 768) {
        
        
        
        
        
        
        
        
        
        
        if (window.google && google.maps && google.maps.event && _adminGMap) {
            var center = _adminGMap.getCenter();
            requestAnimationFrame(function() {
                google.maps.event.trigger(_adminGMap, 'resize');
                if (center) _adminGMap.setCenter(center);
            });
        }
        return;
    }

    var homeContainer = document.getElementById('adminHomeContainer');
    var footerNote = document.getElementById('adminMapFooterNote');

    var topbar = document.querySelector('.topbar');
    var topbarH = topbar ? Math.round(topbar.getBoundingClientRect().height) : 0;
    var footerH = footerNote ? Math.round(footerNote.getBoundingClientRect().height) : 0;

    var available = Math.round(window.innerHeight - topbarH - footerH);
    if (available < 300) return; 

    mapView.style.height = available + 'px';
    mapView.style.minHeight = available + 'px';
    if (homeContainer) homeContainer.style.height = (available + footerH) + 'px';

    if (window.google && google.maps && google.maps.event && _adminGMap) {
        google.maps.event.trigger(_adminGMap, 'resize');
    }
}
window.addEventListener('resize', syncAdminMapHeight);


function _adminMarkerSVG(color, border, size) {
    var half = size / 2;
    var r    = half - 1.5;
    var svg  = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
             + '<circle cx="' + half + '" cy="' + half + '" r="' + r + '" fill="' + color + '" stroke="' + border + '" stroke-width="2" opacity="0.92"/>'
             + '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function buildAdminMap() {
    console.log('\uD83D\uDDFA buildAdminMap (Google Maps) called');
    var container = document.getElementById('adminMapView');
    if (!container) { console.error('adminMapView container not found'); return; }

    syncAdminMapHeight();

    
    if (_adminGMap) {
        var adminUsersToken = _requireAuth('Please log in to view user locations.');
        if (!adminUsersToken) return;
        fetch(API_ENDPOINTS.users, {
            method: 'GET',
            headers: _authHeaders(adminUsersToken)
        })
            .then(function(r) {
                if (_handleAuthResponse(r, 'Please log in again to view users.')) {
                    return Promise.reject('Authentication required');
                }
                return r.ok ? r.json() : Promise.reject(r.status);
            })
            .then(function(data) { if (data.success && data.users) renderMapUsers(data.users); })
            .catch(function(err) { console.warn('Admin map user refresh failed:', err); });
        google.maps && _adminGMap && google.maps.event.trigger(_adminGMap, 'resize');
        return;
    }

    
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#1a4080;font-size:14px;gap:8px;">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a4080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>'
        + ' Loading map\u2026</div>';

    
    loadGoogleMapsSDK().then(function() {
        _buildAdminMapInner(container);
    }).catch(function(err) {
        console.error('Google Maps SDK failed to load:', err);
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;color:#c62828;">'
            + '<span style="font-size:28px;">\u26a0\ufe0f</span>'
            + '<span style="font-size:14px;font-weight:600;">Map unavailable</span>'
            + '<span style="font-size:12px;color:#888;">Check the Google Maps API key in server settings</span></div>';
    });
}

function _buildAdminMapInner(container) {

    function _doInitAdminMap(center, isLiveLocation) {
        _adminGMap = lcdjpCreateMap(container, {
            center: center,
            zoom: isLiveLocation ? 15 : 7,
            mapTypeId: 'hybrid',
            styles: (typeof MAP_STYLES !== 'undefined') ? MAP_STYLES : [],
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
            clickableIcons: false,
            gestureHandling: 'cooperative'
        });

        _adminInfoWindow = new google.maps.InfoWindow();
        _adminGMap.addListener('click', function() { _adminInfoWindow.close(); });
        syncAdminMapHeight();

        
        if (isLiveLocation) {
            new google.maps.Circle({
                map: _adminGMap,
                center: center,
                radius: 500,
                strokeColor: '#1a4080',
                strokeOpacity: 0.45,
                strokeWeight: 2,
                fillColor: '#1a4080',
                fillOpacity: 0.07
            });
            lcdjpCreateMarker({
                position: center,
                map: _adminGMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#1a4080',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3
                },
                title: 'Your Location (Admin)',
                zIndex: 1000
            });
        }

        
        var mapUsersToken = _requireAuth('Please log in to view user locations.');
        if (!mapUsersToken) return;
        fetch(API_ENDPOINTS.users, {
            method: 'GET',
            headers: _authHeaders(mapUsersToken)
        })
        .then(function(response) {
            if (_handleAuthResponse(response, 'Please log in again to view users.')) {
                throw new Error('Authentication required');
            }
            if (!response.ok) throw new Error('Failed to fetch users: ' + response.status);
            return response.json();
        })
        .then(function(data) {
            if (data.success && data.users) {
                console.log('\u2713 Admin map: ' + data.users.length + ' users loaded');
                renderMapUsers(data.users);
            } else {
                console.warn('Admin map: no users data returned');
            }
        })
        .catch(function(err) {
            console.error('Error fetching users for admin map:', err);
        });

        
        [400, 900].forEach(function(ms) {
            setTimeout(function() { if (_adminGMap) google.maps.event.trigger(_adminGMap, 'resize'); }, ms);
        });

        if (typeof applySavedLanguage === 'function') applySavedLanguage();
    }

    
    container.innerHTML = '';
    _doInitAdminMap({ lat: 1.3733, lng: 32.2903 }, false);

    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
            if (!_adminGMap) return;
            var loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            lcdjpCreateMarker({
                position: loc, map: _adminGMap,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8,
                    fillColor: '#ffffff', fillOpacity: 1,
                    strokeColor: '#1a4080', strokeWeight: 3 },
                title: 'Admin (You)', zIndex: 500
            });
        }, null, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
    }
}

function renderMapUsers(allUsers) {
    if (!_adminGMap) return;

    var citizens = allUsers.filter(function(u) { return (u.role || u.userType) === 'Citizen'; }).length;
    var lawyers  = allUsers.filter(function(u) { return (u.role || u.userType) === 'Lawyer'; }).length;

    
    _adminGMap.controls[google.maps.ControlPosition.TOP_LEFT].clear();
    var summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = 'background:white;padding:10px 14px;border-radius:8px;'
        + 'box-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:13px;border-left:4px solid #1a4080;margin:10px 0 0 10px;'
        + 'max-width:calc(100vw - 40px);box-sizing:border-box;overflow-wrap:break-word;';
    summaryDiv.innerHTML = '<strong style="color:#1a4080;">\uD83D\uDC65 Total Users: ' + allUsers.length + '</strong>'
        + '<div class="lcdjp-map-summary-row">'
        + '<span>\uD83D\uDFE2 Citizens: ' + citizens + '</span>'
        + '<span>\u2696\uFE0F Lawyers: ' + lawyers + '</span>'
        + '</div>';
    _adminGMap.controls[google.maps.ControlPosition.TOP_LEFT].push(summaryDiv);

    
    function _adminGetCoords(districtName) {
        if (!districtName || typeof ugandaCoordinates === 'undefined') return null;
        var d = ugandaCoordinates.districts;
        if (d[districtName]) return d[districtName];
        var lower = districtName.toLowerCase();
        for (var k in d) { if (k.toLowerCase() === lower) return d[k]; }
        for (var k in d) { if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) return d[k]; }
        return { lat: 1.3733, lng: 32.2903 };
    }

    
    var typeConfig = {
        'Citizen':     { color: '#28a745', border: '#1a6b2e', size: 18 },
        'Lawyer':      { color: '#1565C0', border: '#0d47a1', size: 22 }
    };
    var pendingConfig = { color: '#dc3545', border: '#b71c1c', size: 18 };

    var districtCount = {};

    allUsers.forEach(function(user) {
        var coords = _adminGetCoords(user.district);
        if (!coords) return;

        
        var key = user.district || 'unknown';
        districtCount[key] = (districtCount[key] || 0) + 1;
        var n      = districtCount[key];
        var angle  = n * 2.4;
        var r_off  = 0.02 * Math.sqrt(n);
        var lat    = coords.lat + r_off * Math.sin(angle);
        var lng    = coords.lng + r_off * Math.cos(angle);

        var isPending = (user.approval_status === 'Pending' || user.approval_status === null);
        var cfg       = isPending ? pendingConfig : (typeConfig[user.role] || typeConfig[user.userType] || typeConfig['Citizen']);

        var marker = lcdjpCreateMarker({
            position: { lat: lat, lng: lng },
            map: _adminGMap,
            icon: {
                url: _adminMarkerSVG(cfg.color, cfg.border, cfg.size),
                scaledSize: new google.maps.Size(cfg.size, cfg.size),
                anchor: new google.maps.Point(cfg.size / 2, cfg.size / 2)
            },
            title: ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.username || '',
            zIndex: isPending ? 200 : 100
        });

        
        var nu = {
            firstName:            user.first_name          || user.firstName            || '',
            lastName:             user.last_name           || user.lastName             || '',
            username:             user.username            || '',
            userType:             user.role                || user.userType             || '',
            approvalStatus:       user.approval_status     || user.approvalStatus       || '',
            phoneNumber:          user.phone_number        || user.phoneNumber          || '',
            district:             user.district            || '',
            subCounty:            user.sub_county          || user.subCounty            || '',
            registrationDate:     user.registration_date   || user.registrationDate     || '',
            lawyerSpecialization: user.specialization      || user.lawyerSpecialization || '',
            lawyerRegNumber:      user.reg_number          || user.lawyerRegNumber      || '',
            userLevel:            user.lc_level            || user.userLevel            || ''
        };
        window._adminMapUsers[nu.username] = nu;

        var displayName = (nu.firstName + ' ' + nu.lastName).trim() || nu.username;
        var roleIcon    = nu.userType === 'Lawyer' ? '\u2696\uFE0F' : '\uD83D\uDC64';
        var statusBadge = isPending
            ? '<span style="background:#ff9800;color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">\u23F3 Pending</span>'
            : '<span style="background:#28a745;color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">\u2713 ' + escapeHtml(nu.approvalStatus || 'Active') + '</span>';

        var infoContent = '<div style="font-family:inherit;padding:4px 2px;min-width:190px;">'
            + '<div style="font-weight:700;font-size:14px;color:#1a237e;margin-bottom:3px;">' + roleIcon + ' ' + escapeHtml(displayName) + '</div>'
            + '<div style="font-size:12px;color:#555;margin-bottom:3px;">' + escapeHtml(nu.userType || '') + '</div>'
            + '<div style="font-size:12px;color:#555;margin-bottom:4px;">\uD83D\uDCCD ' + escapeHtml(nu.district || 'Unknown District')
                + (nu.subCounty ? ', ' + escapeHtml(nu.subCounty) : '') + '</div>'
            + '<div style="margin-bottom:8px;">' + statusBadge + '</div>'
            + (isPending
                ? '<button onclick="adminQuickApprove(' + escapeHtml(JSON.stringify(String(nu.username))) + ')" '
                  + 'style="background:#28a745;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;width:100%;margin-bottom:5px;">'
                  + '\u2714 Approve User</button><br>'
                : '')
            + '<button onclick="showAdminUserPanel(window._adminMapUsers[' + escapeHtml(JSON.stringify(String(nu.username))) + ']);if(window._adminInfoWindow)window._adminInfoWindow.close();" '
            + 'style="background:#fff;color:#1a4080;border:1px solid #1a4080;border-radius:6px;font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;width:100%;">'
            + '\uD83D\uDC64 View Full Profile</button>'
            + '</div>';

        (function(m, content, normalised) {
            m.addListener('click', function() {
                _adminInfoWindow.setContent(content);
                _adminInfoWindow.open(_adminGMap, m);
            });
        })(marker, infoContent, nu);
    });

    
    
    
    
    
    
    function _strictGetCoordsForBounds(districtName) {
        if (!districtName || typeof ugandaCoordinates === 'undefined') return null;
        var d = ugandaCoordinates.districts;
        if (d[districtName]) return d[districtName];
        var lower = districtName.toLowerCase();
        for (var k in d) { if (k.toLowerCase() === lower) return d[k]; }
        for (var k in d) {
            if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) return d[k];
        }
        return null; 
    }

    var bounds = new google.maps.LatLngBounds();
    var plotted = 0;
    allUsers.forEach(function(user) {
        var coords = _strictGetCoordsForBounds(user.district);
        if (coords) { bounds.extend(coords); plotted++; }
    });
    if (plotted > 0) {
        _adminGMap.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
        google.maps.event.addListenerOnce(_adminGMap, 'idle', function() {
            if (_adminGMap.getZoom() > 13) _adminGMap.setZoom(13);
        });
    }

    
    window._adminInfoWindow = _adminInfoWindow;
}

function showAdminUserPanel(user) {
    var panel = document.getElementById('adminUserPanel');
    if (!panel) return;
    var name = ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || user.username;
    var statusColor = user.approvalStatus === 'Approved' ? '#28a745' : user.approvalStatus === 'Pending' ? '#ff9800' : '#dc3545';
    var typeIcon = user.userType === 'Lawyer' ? '' : '';
    var regDate = user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A';
    var uname = user.username || '';
    
    var html = '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">';
    html += '<div>';
    html += '<div style="font-size:44px;margin-bottom:6px;">' + typeIcon + '</div>';
    html += '<h3 style="color:#1a4080;margin:0 0 6px 0;">' + escapeHtml(name) + '</h3>';
    html += '<span style="background:' + statusColor + ';color:white;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:bold;">' + escapeHtml(user.approvalStatus || 'N/A') + '</span>';
    html += '</div>';
    html += '<button onclick="document.getElementById(&quot;adminUserPanel&quot;).style.display=&quot;none&quot;" style="background:none;border:none;font-size:28px;cursor:pointer;color:#6b7280;line-height:1;min-width:44px;min-height:44px;" aria-label="Close">&times;</button>';
    html += '</div>';
    html += '<div style="border-top:2px solid #e5eeff;padding-top:15px;font-size:14px;line-height:2;">';
    html += '<div><strong> Type:</strong> ' + escapeHtml(user.userType || 'N/A') + '</div>';
    html += '<div><strong> Username:</strong> ' + escapeHtml(uname) + '</div>';
    html += '<div><strong> Phone:</strong> ' + escapeHtml(user.phoneNumber || 'N/A') + '</div>';
    html += '<div><strong> District:</strong> ' + escapeHtml(user.district || 'N/A') + '</div>';
    html += '<div><strong> Sub-County:</strong> ' + escapeHtml(user.subCounty || 'N/A') + '</div>';
    html += '<div><strong> Registered:</strong> ' + regDate + '</div>';
    if (user.userType === 'Lawyer') {
        html += '<div><strong> Specialization:</strong> ' + escapeHtml(user.lawyerSpecialization || 'N/A') + '</div>';
        html += '<div><strong> Reg No:</strong> ' + escapeHtml(user.lawyerRegNumber || 'N/A') + '</div>';
    }
    html += '</div>';
    html += '<div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">';
    if (user.approvalStatus === 'Pending') {
        html += '<button onclick="adminQuickApprove(' + escapeHtml(JSON.stringify(uname)) + ')" style="padding:11px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;"> Approve User</button>';
    }
    html += '<button onclick="viewUserFromMap(' + escapeHtml(JSON.stringify(uname)) + ')" style="padding:11px;background:#fff;color:#1a4080;border:1px solid #1a4080;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;"> View Full Profile</button>';
    html += '</div>';
    
    panel.innerHTML = html;
    panel.style.display = 'block';
}

function viewUserFromMap(username) {
    document.getElementById('adminUserPanel').style.display = 'none';
    showUserManagement();
    setTimeout(function() {
        var searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.value = username;
            if (typeof filterUsers === 'function') filterUsers();
        }
    }, 400);
}

function adminQuickApprove(username) {
    var userKey = 'user_' + username;
    var user = JSON.parse(JSON.stringify(_lcdjp_user_index[userKey] || null));
    if (!user) { alert('User not found.'); return; }
    user.approvalStatus = 'Approved';
    _lcdjp_saveUserToAPI(user);
    alert('' + (user.firstName || username) + ' has been approved!');
    showAdminUserPanel(user);
    buildAdminMap();
}


function setAdminActiveMenu(menuId) {
    document.querySelectorAll('.admin-menu-item').forEach(function(el) {
        el.classList.remove('admin-active');
    });
    var active = document.getElementById(menuId);
    if (active) active.classList.add('admin-active');
}

(function () {
    var AVATAR_SELECTOR = '#cdtAvatar, #lwtAvatar, #adtAvatar, #cmAvatar, #lmAvatar';
    var IMG_CLASS = 'lcdjp-avatar-img';
    var HAS_CLASS = 'lcdjp-has-avatar';
    var observed = (typeof WeakSet === 'function') ? new WeakSet() : null;

    function currentUsername() {
        return localStorage.getItem('lcdjp_username') ||
               sessionStorage.getItem('lcdjp_username') || '';
    }

    function savedAvatar() {
        var username = currentUsername();
        if (!username) return '';
        var data = sessionStorage.getItem('lcdjp_avatar_' + username) ||
                   localStorage.getItem('lcdjp_avatar_' + username) || '';
        if (!data || data === 'undefined' || data === 'null') return '';
        return data;
    }

    function watch(el) {
        if (!observed || observed.has(el) || typeof MutationObserver !== 'function') return;
        observed.add(el);
        new MutationObserver(function () {
            var src = savedAvatar();
            if (src && !el.querySelector('.' + IMG_CLASS)) paint(el, src);
        }).observe(el, { childList: true });
    }

    function paint(el, src) {
        var img = el.querySelector('.' + IMG_CLASS);
        if (!img) {
            img = document.createElement('img');
            img.className = IMG_CLASS;
            img.alt = '';
            el.appendChild(img);
        }
        if (img.getAttribute('src') !== src) img.src = src;
        el.classList.add(HAS_CLASS);
        watch(el);
    }

    function clear(el) {
        var img = el.querySelector('.' + IMG_CLASS);
        if (img) img.remove();
        el.classList.remove(HAS_CLASS);
    }

    function applyAvatarEverywhere() {
        var src = savedAvatar();

        if (src) {
            Array.prototype.forEach.call(
                document.querySelectorAll('#profilePicture, .js-profile-avatar-img'),
                function (img) {
                    if (img.getAttribute('src') !== src) img.src = src;
                }
            );
        }

        Array.prototype.forEach.call(
            document.querySelectorAll(AVATAR_SELECTOR),
            function (el) { src ? paint(el, src) : clear(el); }
        );
    }

    window.lcdjpApplyAvatarEverywhere = applyAvatarEverywhere;
    window.lcdjpGetSavedAvatarData = savedAvatar;

    function start() {
        applyAvatarEverywhere();
        setInterval(applyAvatarEverywhere, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    window.addEventListener('storage', function (e) {
        if (e && e.key && e.key.indexOf('lcdjp_avatar_') === 0) applyAvatarEverywhere();
    });
})();


(function () {
    var NAME_SPANS = '#bannerUserName, #cmBannerUserName, #cdgUserName';

    function firstName() {
        if (typeof window._lcdjpDisplayFirstName === 'function') {
            var viaDashboard = window._lcdjpDisplayFirstName();
            if (viaDashboard && viaDashboard !== 'there') return viaDashboard;
        }
        var full = sessionStorage.getItem('lcdjp_fullname') || localStorage.getItem('lcdjp_fullname') ||
                   sessionStorage.getItem('fullName') || localStorage.getItem('fullName') || '';
        full = String(full || '').trim();
        if (full) return full.split(' ')[0];
        return sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    }

    function timeGreeting() {
        var h = new Date().getHours();
        return h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
    }

    function refreshGreetingNames() {
        var name = firstName();

        if (!name) {
            Array.prototype.forEach.call(
                document.querySelectorAll(NAME_SPANS),
                function (el) {
                    if (el.textContent.trim() !== 'there') el.textContent = 'there';
                }
            );
            return;
        }

        Array.prototype.forEach.call(
            document.querySelectorAll(NAME_SPANS),
            function (el) {
                if (el.textContent.trim() !== name) el.textContent = name;
            }
        );

        var greet = timeGreeting();
        Array.prototype.forEach.call(
            document.querySelectorAll('#cdgTimeGreet'),
            function (el) {
                if (el.textContent.trim() !== greet) el.textContent = greet;
            }
        );
    }

    window.lcdjpRefreshGreetingNames = refreshGreetingNames;

    function start() {
        refreshGreetingNames();
        setInterval(refreshGreetingNames, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
