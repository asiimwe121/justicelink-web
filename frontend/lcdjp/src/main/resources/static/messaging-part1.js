


function _getLawyerToken() {
    try {
        if (typeof getAuthToken === 'function') return getAuthToken();
        return (typeof getAuthToken === 'function' ? getAuthToken() : null) || null;
    } catch (e) {
        return null;
    }
}

function _isLawyerAuthenticated() {
    var token = _getLawyerToken();
    if (!token) return false;
    if (typeof isTokenValid === 'function') return isTokenValid();
    
    try {
        var parts = token.split('.');
        if (parts.length !== 3) return false;
        var encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (encoded.length % 4) encoded += '=';
        var payload = JSON.parse(atob(encoded));
        if (payload.exp) {
            var now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        }
        return true;
    } catch (e) {
        return false;
    }
}

function _getLawyerAuthHeaders() {
    var token = _isLawyerAuthenticated() ? _getLawyerToken() : null;
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}







async function _lawyerFetchAiOffers() {
    var username = sessionStorage.getItem('lcdjp_username') || '';
    if (!username) return [];
    try {
        var res = await fetch(API_ENDPOINTS.lawyerCaseOffers(username), { headers: _getLawyerAuthHeaders() });
        if (!res.ok) return [];
        var data = await res.json();
        return data.offers || [];
    } catch (err) {
        console.warn('[Lawyer] Could not load AI-matched case offers:', err.message);
        return [];
    }
}

async function aiOfferAccept(caseId) {
    try {
        var res = await fetch(API_ENDPOINTS.lawyerOfferAccept(caseId), {
            method: 'PUT', headers: _getLawyerAuthHeaders()
        });
        if (!res.ok) {
            var err = await res.json().catch(function () { return {}; });
            if (typeof showToast === 'function') showToast(err.error || 'Could not accept case ' + caseId + '.');
            return;
        }
    } catch (err) {
        console.warn('[Lawyer] Accept failed:', err.message);
        if (typeof showToast === 'function') showToast('Could not reach the server. Please try again.');
        return;
    }
    if (typeof showToast === 'function') showToast('Case ' + caseId + ' accepted.');
    if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases();
}
window.aiOfferAccept = aiOfferAccept;

async function aiOfferDecline(caseId) {
    try {
        var res = await fetch(API_ENDPOINTS.lawyerOfferDecline(caseId), {
            method: 'PUT', headers: _getLawyerAuthHeaders()
        });
        if (!res.ok) {
            var err = await res.json().catch(function () { return {}; });
            if (typeof showToast === 'function') showToast(err.error || 'Could not decline case ' + caseId + '.');
            return;
        }
        
        
        
    } catch (err) {
        console.warn('[Lawyer] Decline failed:', err.message);
        if (typeof showToast === 'function') showToast('Could not reach the server. Please try again.');
        return;
    }
    if (typeof showToast === 'function') showToast('Case ' + caseId + ' declined, the citizen has been notified to choose another lawyer.');
    if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases();
}
window.aiOfferDecline = aiOfferDecline;


   
function showLawyerDashboard() {
    if (typeof hideAppLoader === 'function') hideAppLoader();
    var _mfEl = document.getElementById("mainFooter");
    if (_mfEl) _mfEl.style.display = "none";
    hideAllDashboardViews();
    document.getElementById("lawyerDashboard").style.display = "block";

    const footer = document.getElementById("mainFooter");
    if (footer) {
        footer.style.display = "none";
    }
    const notifBtn = document.getElementById("navNotifBtn");
    if (notifBtn) {
        notifBtn.style.display = "inline-block";
        notifBtn.innerHTML = 'Notifications <span id="notifCount" style="display:none; background:#dc3545; color:white; border-radius:50%; padding:2px 8px; font-size:11px; font-weight:bold; margin-left:5px; min-width:18px; text-align:center;"></span>';
    }
    
    updateLawyerDashboardCases();
    updateLawyerStatistics();
    (function() {
        const _fn = sessionStorage.getItem('lcdjp_fullname') || sessionStorage.getItem('lcdjp_username') || 'Lawyer';
        const _first = _fn.split(' ')[0] || _fn;
        const _h = new Date().getHours();
        const _g = _h < 12 ? 'Good morning' : _h < 17 ? 'Good afternoon' : 'Good evening';
        const _elG = document.getElementById('lmGreeting');
        if (_elG) _elG.textContent = _g + ', ' + _first;
        const _elA = document.getElementById('lmAvatar');
        if (_elA) {
            const pts = _fn.split(' ');
            _elA.textContent = ((pts[0]||'')[0] + (pts[1]||'')[0]).toUpperCase() || 'LA';
        }
    })();
    updateLawyerSubscriptionStatus();
    
    renderNavbarNotifBadge();
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    loadContactRequestsForUser();
}

async function showLawyerNotificationsPanel() {
    
    if (!_isLawyerAuthenticated()) {
        console.warn('Not authenticated - skipping notifications');
        return;
    }

    const username = sessionStorage.getItem('lcdjp_username');
    if (!username) return;
    
    const notifications = await getNotificationsForUser(username);
    const notifArray  = Array.isArray(notifications) ? notifications : [];
    const unreadCount = await getUnreadCount(username);
    
    let panel = document.getElementById('lawyerNotificationsPanel');
    const lawyerDashboard = document.getElementById('lawyerDashboard');
    
    if (!lawyerDashboard) {
        console.warn('Lawyer dashboard not found');
        return;
    }
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'lawyerNotificationsPanel';
        panel.style.cssText = 'margin: 20px 0;';

        const header = lawyerDashboard.querySelector('h2');
        if (header) {
            header.insertAdjacentElement('afterend', panel);
        } else {
            lawyerDashboard.insertAdjacentElement('afterbegin', panel);
        }
    }
    
    let html = `
        <div style="background:white; border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #1a4080; padding-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <h3 style="color:#1a4080; margin:0;"> Notifications</h3>
                    ${unreadCount > 0 ? `<span style="background:#dc3545; color:white; padding:2px 12px; border-radius:12px; font-size:12px; font-weight:bold; animation:pulse 1.5s infinite;">${unreadCount} New</span>` : ''}
                </div>
                <div style="display:flex; gap:10px;">
                    ${unreadCount > 0 ? `<button onclick="markAllLawyerNotificationsAsRead()" style="padding:6px 15px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;"> Mark All Read</button>` : ''}
                    <button onclick="refreshLawyerNotifications()" style="padding:6px 15px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;"> Refresh</button>
                </div>
            </div>
            <div id="lawyerNotificationsList" style="max-height:400px; overflow-y:auto;">
    `;
    
    if (notifications.length === 0) {
        html += `
            <div style="text-align:center; padding:40px; color:#999;">
                <div style="font-size:48px; margin-bottom:10px;"></div>
                <p>No notifications yet</p>
            </div>
        `;
    } else {
        notifications.forEach(notif => {
            const isUrgent = notif.priority <= 2;
            const bgColor = notif.read ? '#f8f9fa' : (isUrgent ? '#fff3cd' : '#f0f5ff');
            const borderColor = isUrgent ? '#dc3545' : (notif.read ? '#ccc' : '#1a4080');
            const icon = getNotificationIcon(notif.type);
            
            html += `
                <div onclick="lcdjpOpenNotification(${escapeHtml(JSON.stringify(notif))})" 
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
                            <div style="font-weight:${notif.read ? 'normal' : 'bold'}; color:${notif.read ? '#555' : '#333'};">
                                ${escapeHtml(notif.message)}
                            </div>
                            ${notif.caseId ? `<div style="font-size:12px; color:#1a4080; font-weight:bold;">Case: ${escapeHtml(notif.caseId)}</div>` : ''}
                            <div style="font-size:11px; color:#999; margin-top:4px;">
                                ${new Date(notif.timestamp).toLocaleString()}
                                ${!notif.read ? ' • <span style="color:#dc3545; font-weight:bold;">New</span>' : ''}
                                ${isUrgent ? ' • <span style="color:#dc3545; font-weight:bold;"> Urgent</span>' : ''}
                            </div>
                        </div>
                        ${!notif.read ? `<div style="width:10px; height:10px; background:#dc3545; border-radius:50%; flex-shrink:0; margin-top:5px;"></div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    panel.innerHTML = html;
}
async function markAllLawyerNotificationsAsRead() {
    
    if (!_isLawyerAuthenticated()) {
        if (typeof showToast === 'function') showToast('Please login first.');
        return;
    }

    const username = sessionStorage.getItem('lcdjp_username');
    if (!username) return;
    
    const count = await markAllNotificationsAsRead(username);
    if (count > 0) {
        showToast(`${count} notifications marked as read`);
        await showLawyerNotificationsPanel();
        renderNavbarNotifBadge();
    } else {
        showToast('No unread notifications to mark');
    }
}

function refreshLawyerNotifications() {
    showLawyerNotificationsPanel();
    renderNavbarNotifBadge();
    updateLawyerDashboardCases();
}


function startNotificationPolling() {
    if (window.chatInterval) {
        clearInterval(window.chatInterval);
        window.chatInterval = null;
    }
    
    const username = sessionStorage.getItem('lcdjp_username') ||
        localStorage.getItem('lcdjp_username');
    
    
    if (!_isLawyerAuthenticated()) {
        console.log('User not logged in - notification polling not started');
        return;
    }

    const token = _getLawyerToken();
    if (!token || !username) {
        console.log('User not logged in - notification polling not started');
        return;
    }
    
    console.log('Starting notification polling for user:', username);
    window._lcdjpUnreadForbidden = 0;

    
    
    
    
    
    const MAX_CONSECUTIVE_FAILURES = 3;
    let consecutiveFailures = 0;

    const pausePollingUntilOnline = () => {
        clearInterval(window.chatInterval);
        window.chatInterval = null;
        console.warn('Notification server unreachable - polling paused. Will resume when connection is restored.');

        const resume = () => {
            window.removeEventListener('online', resume);
            if (_isLawyerAuthenticated()) {
                startNotificationPolling();
            }
        };
        window.addEventListener('online', resume);
    };

    window.chatInterval = setInterval(async () => {
        try {
            if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
                if (typeof window.stopLcdjpAuthPolling === 'function') {
                    window.stopLcdjpAuthPolling();
                }
                return;
            }
            const username = sessionStorage.getItem('lcdjp_username') ||
                localStorage.getItem('lcdjp_username');
            
            if (!username || !token) {
                console.log('User logged out - stopping notification polling');
                clearInterval(window.chatInterval);
                window.chatInterval = null;
                return;
            }
            
            
            
            
            
            
            
            const notifPollUsername = (typeof _lcdjpIsAdministrator === 'function' && _lcdjpIsAdministrator())
                ? 'admin'
                : username;
            const count = await getUnreadCount(notifPollUsername);
            consecutiveFailures = 0;

            if ((window._lcdjpUnreadForbidden || 0) >= 3) {
                console.warn('Notifications are forbidden for this account - polling stopped until next login.');
                clearInterval(window.chatInterval);
                window.chatInterval = null;
                return;
            }
            
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.style.display = 'inline-block';
                    badge.style.background = '#dc3545';
                    badge.style.color = 'white';
                    badge.style.borderRadius = '50%';
                    badge.style.padding = '2px 6px';
                    badge.style.fontSize = '11px';
                    badge.style.fontWeight = 'bold';
                } else {
                    badge.style.display = 'none';
                }
            }

            const lmBell = document.getElementById('lmBellDot');
            if (lmBell) {
                if (count > 0) {
                    lmBell.textContent = count > 99 ? '99+' : count;
                    lmBell.style.display = 'flex';
                } else {
                    lmBell.style.display = 'none';
                    lmBell.textContent = '';
                }
            }

            const lmMsgBadge = document.getElementById('lmMsgBadge');
            if (lmMsgBadge && typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.chatUserMessages) {
                try {
                    const msgResp = await fetch(API_ENDPOINTS.chatUserMessages(username), {
                        headers: getAuthHeaders(),
                        suppressAuthRedirect: true
                    });
                    if (msgResp.ok) {
                        const msgData = await msgResp.json();
                        const msgs = Array.isArray(msgData.messages) ? msgData.messages
                            : Array.isArray(msgData) ? msgData : [];
                        const unreadMsgCount = msgs.filter(function (m) {
                            const sender = m.senderUsername || m.sender_username || m.from_user;
                            return !m.read && sender !== username;
                        }).length;
                        if (unreadMsgCount > 0) {
                            lmMsgBadge.textContent = unreadMsgCount > 99 ? '99+' : unreadMsgCount;
                            lmMsgBadge.style.display = 'flex';
                        } else {
                            lmMsgBadge.style.display = 'none';
                            lmMsgBadge.textContent = '';
                        }
                    }
                } catch (msgErr) {
                    console.debug('Lawyer message badge fetch error:', msgErr.message);
                }
            }

            if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();
            if (typeof updateLCNotificationBadge === 'function') updateLCNotificationBadge();
        } catch (error) {
            console.debug('Notification polling error:', error.message);
            if (error && error.isNetworkError) {
                consecutiveFailures++;
                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    pausePollingUntilOnline();
                }
            }
        }
    }, 15000); 
}

function closeNotifications() {
    const userLevel = sessionStorage.getItem('lcdjp_userlevel');
    console.log("closeNotifications called - UserLevel:", userLevel);
    
    if (isAdmin(userLevel)) {
        
        
        
        
        const overlay = document.querySelector('.lcdjp-desktop-page-overlay[data-page="adminNotificationsPage"]');
        if (overlay && typeof overlay._lcdjpClose === 'function') {
            overlay._lcdjpClose();
            return;
        }
        const page = document.getElementById("adminNotificationsPage");
        if (page) {
            
            
            
            
            if (typeof _lcdjpCloseAdminNotifDropdown === 'function') {
                _lcdjpCloseAdminNotifDropdown();
            } else {
                page.style.display = 'none';
            }
            showAdminHome();
        }
        return;
    }
    
    if (userLevel === 'Lawyer') {
        const page = document.getElementById("lawyerNotificationsPage");
        if (page) {
            page.style.display = 'none';
            showLawyerDashboard();
        }
        return;
    }

    if (userLevel === 'LC') {
        const page = document.getElementById("lcNotificationsPage");
        if (page) {
            page.style.display = 'none';
            showLcDashboard();
        }
        return;
    }
    
    if (userLevel === 'Citizen') {
        
        
        
        
        const overlay = document.querySelector('.lcdjp-desktop-page-overlay[data-page="citizenNotificationsPage"]');
        if (overlay && typeof overlay._lcdjpClose === 'function') {
            overlay._lcdjpClose();
            return;
        }
        const page = document.getElementById("citizenNotificationsPage");
        if (page) {
            page.style.display = 'none';
            showHome();
        }
        return;
    }
    
    console.warn("Unknown user level in closeNotifications:", userLevel);
}

function showTrackCaseTab() {
    hideAllDashboardViews();
    document.getElementById("trackingResultContainer").innerHTML = "";
    document.getElementById("trackSearchInput").value = "";
    document.getElementById("trackCasePage").style.display = "block";
}

function openDynamicView(htmlContent) {
    clearDynamicView();
    hideAllDashboardViews();

    
    
    
    
    
    
    
    
    
    
    
    const contentAreaForRescue = document.getElementById('contentArea');
    ['mobileFullPage'].forEach(function(id) {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        if (contentAreaForRescue) {
            overlay.querySelectorAll('.dashboard-view').forEach(function(view) {
                contentAreaForRescue.appendChild(view);
            });
        }
        document.body.style.overflow = overlay._fpPrevBodyOverflow || '';
        document.documentElement.style.overflow = overlay._fpPrevHtmlOverflow || '';
        overlay.remove();
        if (typeof window._lcdjpRestoreFloatingChatForOverlay === 'function') {
            window._lcdjpRestoreFloatingChatForOverlay();
        }
    });
    const desktopPageOverlay = document.querySelector('.lcdjp-desktop-page-overlay');
    if (desktopPageOverlay) {
        if (contentAreaForRescue) {
            desktopPageOverlay.querySelectorAll('.dashboard-view').forEach(function(view) {
                contentAreaForRescue.appendChild(view);
            });
        }
        desktopPageOverlay.remove();
        unlockScroll();
        if (typeof window._lcdjpRestoreFloatingChatForOverlay === 'function') {
            window._lcdjpRestoreFloatingChatForOverlay();
        }
    }

    
    
    
    
    
    
    
    
    
    document.querySelectorAll('.mobile-messages-panel, .mobile-role-panel').forEach(function(panel) {
        panel.remove();
    });

    let entryNode = document.getElementById("dynamicFormPage");
    
    if (!entryNode) {
        console.warn('dynamicFormPage not found! Creating fallback...');
        entryNode = document.createElement('div');
        entryNode.id = 'dynamicFormPage';
        entryNode.className = 'dashboard-view';
        const contentArea = document.getElementById('contentArea');
        if (contentArea) contentArea.appendChild(entryNode);
    }
    
    entryNode.innerHTML = '';
    entryNode.style.display = 'block';
    entryNode.style.visibility = 'visible';
    entryNode.style.opacity = '1';
    entryNode.style.height = 'auto';
    entryNode.style.overflow = 'visible';
    
    entryNode.innerHTML = htmlContent;
    
    const dashboards = document.querySelectorAll('.dashboard-view');
    dashboards.forEach(function(dashboard) {
        if (dashboard.id !== 'dynamicFormPage') {
            dashboard.style.display = 'none';
        }
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('Dynamic view opened');
}

function clearDynamicView() {
    const dynPage = document.getElementById('dynamicFormPage');
    if (dynPage) {
        dynPage.innerHTML = '';
        dynPage.style.display = 'none';
    }
    
    document.body.style.overflow = '';
    document.body.style.position = '';
    
    
    
    
    
    
    
    
    document.documentElement.style.overflow = '';
    
    
    
    window._lcdjpScrollLockCount = 0;
    
    console.log('Dynamic view cleared');
}

function navigateToAdminFeature(feature) {
    console.log('Navigating to admin feature:', feature);

    var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || localStorage.getItem('username');

    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || localStorage.getItem('lcdjp_userlevel') || localStorage.getItem('userRole');
    var _navIsAdmin = isAdmin(userLevel);
    
    
    let token = _getLawyerToken();
    if (!token && _navIsAdmin && username) {
        token = btoa(username + ':' + Date.now());
    }
    if (!token || !username) {
        showToast('Please login first to access this feature.');
        setTimeout(function() { logoutUser(); }, 1500);
        return;
    }

    if (!_navIsAdmin) {
        showToast('You do not have permission to access this feature.');
        return;
    }

    if (typeof feature === 'function') {
        feature();
    } else if (typeof feature === 'string') {
        var routes = {
            'statistics': showStatistics, 'users': showUserManagement,
            'approvals': showAdminApprovals, 'lawyers': showLawyerManagement,
            'districtAdmins': showDistrictAdminManagement,
            'performance': showLawyerPerformance
        };
        if (routes[feature]) { routes[feature](); } else { showAdminHome(); }
    } else {
        showAdminHome();
    }
}


async function showMyProfile() {
    const isLCUser = (currentUserLevel === "LC" || currentUserLevel === "LC Official" || currentUserLevel === "LC1" || currentUserLevel === "LC2" || currentUserLevel === "LC3");

    if (isLCUser) {
        const username = sessionStorage.getItem("lcdjp_username");
        const user = await getUserByUsername(username);

        if (!user) {
            alert("User not found.");
            return;
        }

        let html = `
            <div style="background:white; border-radius:12px; padding:25px; box-shadow:0 2px 10px rgba(0,0,0,0.08); max-width:700px; margin:0 auto;">
                <h2 style="color:#1a4080; margin-bottom:20px;"> My Profile</h2>

                <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; flex-wrap:wrap;">
                    <img src="${escapeHtml(sessionStorage.getItem('lcdjp_avatar_' + username) || defaultAvatar)}" class="js-profile-avatar-img"
                         style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:4px solid #1a4080;">
                    <div>
                        <h3 style="margin:0; color:#333;">${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</h3>
                        <p style="margin:5px 0; color:#666;">@${escapeHtml(user.username)}</p>
                        <span style="background:#1a4080; color:white; padding:3px 12px; border-radius:12px; font-size:12px;">
                            LC Official${user.lcPosition ? ' • ' + user.lcPosition : ''}
                        </span>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                    <div><strong> Phone:</strong> ${escapeHtml(user.phoneNumber || 'N/A')}</div>
                    <div><strong> Email:</strong> ${escapeHtml(user.email || 'N/A')}</div>
                    <div><strong> National ID:</strong> ${escapeHtml(user.nationalId || 'N/A')}</div>
                    <div><strong> Location:</strong> ${escapeHtml(user.village || user.district || 'N/A')}</div>
                    <div><strong> Position:</strong> ${escapeHtml(user.lcPosition || 'N/A')}</div>
                    <div><strong> Joined:</strong> ${new Date(user.registrationDate).toLocaleDateString()}</div>
                </div>

                <div style="margin-top:20px; padding-top:20px; border-top:2px solid #eee;">
                    <button onclick="showHome()" style="padding:10px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        `;

        openDynamicView(html);
        return;
    }

    let profileName = (currentUserLevel === "Citizen") ? sessionStorage.getItem("lcdjp_fullname") : (currentUserLevel === "Lawyer" ? "Advocate Desk" : currentUserLevel + " Official");

    if (currentUserLevel === "Citizen") {
        
        
        const username = sessionStorage.getItem("lcdjp_username");
        const avatarSrc = sessionStorage.getItem('lcdjp_avatar_' + username) || (typeof defaultAvatar !== 'undefined' ? defaultAvatar : '');
        let html = `
        <div class="form-card" style="max-width:600px; margin:0 auto;">
            <h2>My Profile</h2>
            <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; flex-wrap:wrap;">
                <img src="${avatarSrc}" class="js-profile-avatar-img" style="width:90px; height:90px; border-radius:50%; object-fit:cover; border:4px solid #1a4080;">
                <div>
                    <h3 style="margin:0; color:#333;">${profileName || 'Citizen'}</h3>
                    <span style="background:#1a4080; color:white; padding:3px 12px; border-radius:12px; font-size:12px;">Citizen</span>
                </div>
            </div>
            <div style="margin-top:10px; padding-top:20px; border-top:1px solid #eee;">
                <label>Update Profile Photo</label>
                <p style="font-size:13px; color:#888; margin-bottom:12px;">Supported formats: JPG, PNG, GIF (Max 5MB)</p>
                <input type="file" id="avatarImageFileInput" accept="image/*" onchange="processProfileAvatarChange(this)" style="padding:10px; border:1px solid #ddd; border-radius:6px; width:100%;">
            </div>
            <br>
            <button onclick="showHome()" style="padding:10px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
                ← Back to Dashboard
            </button>
        </div>`;
        openDynamicView(html);
        return;
    }

    let html = `
    <div class="form-card">
        <h2>My User Profile</h2>
        <p style="margin: 10px 0;"><strong>User Identity Name:</strong> ${escapeHtml(profileName)}</p>
        <p style="margin: 10px 0;"><strong>Active Platform Role:</strong> ${currentUserLevel} Panel Registry Access</p>
    </div>`;
    openDynamicView(html);
}

function filterSpecializations() {
    const searchTerm = (document.getElementById("lawyerSpecializationSearch") || {}).value || "";
    const container = document.getElementById("specializationList");
    if (!container) return;

    const specializations = [
        "Family Lawyer", "Land & Property Lawyer", "Criminal Defence Lawyer",
        "Civil Litigation Lawyer", "Human Rights Lawyer", "Labour & Employment Lawyer",
        "Corporate & Commercial Lawyer", "Legal Aid Advocate", "General Legal Practitioner"
    ];

    let html = "";
    specializations.forEach(spec => {
        if (!searchTerm || spec.toLowerCase().includes(searchTerm.toLowerCase())) {
            html += `
                <div class="search-result-item" onclick="sendLawyerRequest(${escapeHtml(JSON.stringify(String(spec)))})">
                    <div class="search-result-icon">&#9878;&#65039;</div>
                    <div class="search-result-text">
                        <strong>${escapeHtml(spec)}</strong>
                        <p>Tap to request a lawyer</p>
                    </div>
                    <svg class="search-result-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>`;
        }
    });

    container.innerHTML = html || `
        <div class="search-result-empty">
            <div class="search-result-empty-icon">&#128269;</div>
            <p>No matching specializations found.</p>
        </div>`;
}

async function sendLawyerRequest(specialization) {
    
    if (!_isLawyerAuthenticated()) {
        alert('Please login first.');
        return;
    }

    if (!confirm(`Send request to all ${specialization} lawyers?`)) return;

    const citizenName = sessionStorage.getItem("lcdjp_fullname") || "A Citizen";
    let count = 0;

    try {
        const headers = _getLawyerAuthHeaders();
        const resp = await fetch(API_ENDPOINTS.users, {
            headers: headers
        });
        const data = resp.ok ? await resp.json() : { users: [] };
        const allUsers = Array.isArray(data) ? data : (data.users || []);

        allUsers.forEach(user => {
            if ((user.userType || user.user_type) === 'Lawyer') {
                const lawyerSpec = (user.lawyerSpecialization || user.lawyer_specialization || '').toLowerCase();
                const requested  = specialization.toLowerCase();
                if (lawyerSpec === requested || lawyerSpec.includes(requested)) {
                    _lcdjpCreateNotification(
                        user.username,
                        `${citizenName} is requesting a ${specialization} lawyer.`,
                        'lawyer_request',
                        null
                    );
                    count++;
                }
            }
        });
    } catch (err) {
        console.error('sendLawyerRequest error:', err);
    }

    if (count > 0) {
        alert(`Request sent to ${count} lawyer(s) in ${specialization}`);
    } else {
        alert(`No lawyers currently registered in ${specialization}.`);
    }
    closeModal();
}






function viewAvailableCase(caseId) {
    if (typeof viewCase === 'function') {
        viewCase(caseId);
    } else {
        alert('Case details are unavailable right now.');
    }
}


async function loadAvailableCasesForLawyer() {
    
    if (!_isLawyerAuthenticated()) {
        console.warn('Not authenticated - skipping available cases');
        return;
    }

    const username = sessionStorage.getItem('lcdjp_username');
    const token = _getLawyerToken();

    if (!username || !token) return;

    try {
        const headers = _getLawyerAuthHeaders();
        const response = await fetch(API_ENDPOINTS.availableLawyerCases(username), {
            headers: headers
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.warn('Authentication error loading available cases');
                return;
            }
            throw new Error('Failed to fetch available cases');
        }

        const data = await response.json();
        const cases = data.cases || [];

        const container = document.getElementById('availableCasesContainer');
        if (!container) return;

        if (cases.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; color:#999;">
                    <div style="font-size:30px;"></div>
                    <p>No available cases in your area.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = cases.map(c => {
            const ref = escapeHtml(c.caseReference);
            const caseType = escapeHtml(c.case_type || 'General');
            const village = escapeHtml(c.village || '');
            const parish = c.parish ? ', ' + escapeHtml(c.parish) : '';
            const district = c.district ? ', ' + escapeHtml(c.district) : '';
            const citizenId = escapeHtml(c.citizen_id);
            return `
            <div class="available-case-card" style="background:white; padding:15px; border-radius:10px; margin-bottom:10px; border-left:4px solid #ff9800; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                    <div>
                        <div style="font-weight:bold; color:#1a4080;">${ref}</div>
                        <div style="font-size:13px; color:#555;">${caseType}</div>
                        <div style="font-size:12px; color:#888; margin-top:4px;">
                             ${village}${parish}${district}
                        </div>
                        <div style="font-size:12px; color:#888;"> ${citizenId}</div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button onclick="viewAvailableCase(${escapeHtml(JSON.stringify(String(ref)))})" 
                                style="padding:6px 14px; background:#1a4080; color:white; border:none; border-radius:5px; cursor:pointer; font-size:12px;">
                            View Details
                        </button>
                        <button onclick="acceptAvailableCase(${escapeHtml(JSON.stringify(String(ref)))})" 
                                style="padding:6px 14px; background:#28a745; color:white; border:none; border-radius:5px; cursor:pointer; font-size:12px; font-weight:bold;">
                             Accept
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

    } catch (error) {
        console.error('Error loading available cases:', error);
    }
}


async function acceptAvailableCase(caseId) {
    
    if (!_isLawyerAuthenticated()) {
        alert('Please login first.');
        return;
    }

    const username = sessionStorage.getItem('lcdjp_username');
    const token = _getLawyerToken();
    
    if (!confirm('Accept this case? You will be assigned as the handling lawyer.')) {
        return;
    }

    try {
        showLoading('Accepting case...');
        
        const headers = _getLawyerAuthHeaders();
        
        
        const lawyerResponse = await fetch(API_ENDPOINTS.user(username), {
            headers: headers
        });

        if (!lawyerResponse.ok) {
            if (lawyerResponse.status === 401 || lawyerResponse.status === 403) {
                alert('Authentication error. Please login again.');
                hideLoading();
                return;
            }
            hideLoading();
            alert('Failed to get lawyer details.');
            return;
        }

        const lawyerData = await lawyerResponse.json();
        const lawyer = lawyerData.user || lawyerData;
        const lawyerName = `${lawyer.first_name || lawyer.firstName || ''} ${lawyer.last_name || lawyer.lastName || ''}`.trim() || 'Lawyer';
        
        
        const caseResp = await fetch(API_ENDPOINTS.case(caseId), {
            headers: headers
        });
        if (!caseResp.ok) {
            hideLoading();
            alert('Failed to get case details.');
            return;
        }
        const caseData = await caseResp.json();
        const foundCase = caseData.case || caseData;
        
        
        const updateData = {
            status: "Accepted by Lawyer",
            current_level: "Lawyer Panel Desk",
            assigned_lawyer: username,
            assigned_specialization: lawyer.lawyer_specialization || lawyer.lawyerSpecialization || 'N/A',
            current_handler: lawyerName,
            handler_role: "Lawyer",
            selected_lawyer: username,
            selected_lawyer_status: "Accepted",
            selected_lawyer_name: lawyerName,
            selected_lawyer_specialization: lawyer.lawyer_specialization || lawyer.lawyerSpecialization || 'N/A',
            messaging_enabled: 1,
            messaging_locked: 0,
            accepted_date: new Date().toISOString(),
            routing_status: "accepted_by_lawyer"
        };

        const updateResp = await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(updateData)
        });

        if (!updateResp.ok) {
            if (updateResp.status === 401 || updateResp.status === 403) {
                alert('Authentication error. Please login again.');
                hideLoading();
                return;
            }
            hideLoading();
            throw new Error('Failed to accept case');
        }

        
        await fetch(API_ENDPOINTS.notifications, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                username: foundCase.citizen_id || foundCase.citizen,
                message: `Lawyer ${lawyerName} has ACCEPTED your case ${caseId}! You can now communicate with them directly.`,
                type: 'case_accepted',
                caseId: caseId,
                timestamp: new Date().toISOString(),
                is_read: false
            })
        });

        hideLoading();
        alert('Case accepted successfully!');
        
        updateLawyerDashboardCases();
        renderNavbarNotifBadge();

    } catch (error) {
        hideLoading();
        console.error('Error accepting case:', error);
        alert('Failed to accept case: ' + error.message);
    }
}











async function acceptSelectedCase(caseId) {
    if (!_isLawyerAuthenticated()) {
        alert('Please login first.');
        return;
    }

    const username = sessionStorage.getItem('lcdjp_username');

    if (!confirm('Accept this case? You will be assigned as the handling lawyer.')) {
        return;
    }

    try {
        showLoading('Accepting case...');

        const headers = _getLawyerAuthHeaders();

        const lawyerResponse = await fetch(API_ENDPOINTS.user(username), { headers: headers });
        if (!lawyerResponse.ok) {
            if (lawyerResponse.status === 401 || lawyerResponse.status === 403) {
                alert('Authentication error. Please login again.');
                hideLoading();
                return;
            }
            hideLoading();
            alert('Failed to get lawyer details.');
            return;
        }
        const lawyerData = await lawyerResponse.json();
        const lawyer = lawyerData.user || lawyerData;
        const lawyerName = `${lawyer.first_name || lawyer.firstName || ''} ${lawyer.last_name || lawyer.lastName || ''}`.trim() || 'Lawyer';

        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) {
            hideLoading();
            alert('Failed to get case details.');
            return;
        }
        const caseData = await caseResp.json();
        const foundCase = caseData.case || caseData;

        const updateData = {
            status: "Accepted by Lawyer",
            current_level: "Lawyer Panel Desk",
            assigned_lawyer: username,
            assigned_specialization: lawyer.lawyer_specialization || lawyer.lawyerSpecialization || 'N/A',
            current_handler: lawyerName,
            handler_role: "Lawyer",
            selected_lawyer: username,
            selected_lawyer_status: "Accepted",
            selected_lawyer_name: lawyerName,
            selected_lawyer_specialization: lawyer.lawyer_specialization || lawyer.lawyerSpecialization || 'N/A',
            messaging_enabled: 1,
            messaging_locked: 0,
            accepted_date: new Date().toISOString(),
            routing_status: "accepted_by_lawyer"
        };

        const updateResp = await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(updateData)
        });

        if (!updateResp.ok) {
            if (updateResp.status === 401 || updateResp.status === 403) {
                alert('Authentication error. Please login again.');
                hideLoading();
                return;
            }
            hideLoading();
            throw new Error('Failed to accept case');
        }

        await fetch(API_ENDPOINTS.notifications, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                username: foundCase.citizen_id || foundCase.citizen,
                message: `Lawyer ${lawyerName} has ACCEPTED your case ${caseId}! You can now communicate with them directly.`,
                type: 'case_accepted',
                caseId: caseId,
                timestamp: new Date().toISOString(),
                is_read: false
            })
        });

        hideLoading();
        alert('Case accepted successfully!');

        if (typeof closeCaseDetails === 'function') closeCaseDetails();
        if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases();
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();

    } catch (error) {
        hideLoading();
        console.error('Error accepting selected case:', error);
        alert('Failed to accept case: ' + error.message);
    }
}
window.acceptSelectedCase = acceptSelectedCase;

async function declineSelectedCase(caseId) {
    if (!_isLawyerAuthenticated()) {
        alert('Please login first.');
        return;
    }

    const username = sessionStorage.getItem('lcdjp_username');
    const fullname = sessionStorage.getItem('lcdjp_fullname') || username;

    if (!confirm('Decline this case? The citizen will be notified to choose another lawyer.')) {
        return;
    }

    try {
        showLoading('Declining case...');

        const headers = _getLawyerAuthHeaders();

        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) {
            hideLoading();
            alert('Failed to get case details.');
            return;
        }
        const caseData = await caseResp.json();
        const foundCase = caseData.case || caseData;

        const priorDeclines = String(foundCase.declined_lawyers || '')
            .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!priorDeclines.includes(username)) priorDeclines.push(username);

        const updateData = {
            status: "Awaiting Lawyer Selection",
            selected_lawyer: null,
            selected_lawyer_status: "Declined",
            declined_lawyers: priorDeclines.join(',')
        };

        const updateResp = await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(updateData)
        });

        if (!updateResp.ok) {
            if (updateResp.status === 401 || updateResp.status === 403) {
                alert('Authentication error. Please login again.');
                hideLoading();
                return;
            }
            hideLoading();
            throw new Error('Failed to decline case');
        }

        await fetch(API_ENDPOINTS.notifications, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                username: foundCase.citizen_id || foundCase.citizen,
                message: `Lawyer ${fullname} has declined your case ${caseId}. Please choose another lawyer.`,
                type: 'case_declined',
                caseId: caseId,
                timestamp: new Date().toISOString(),
                is_read: false
            })
        });

        hideLoading();
        alert('Case declined. The citizen has been notified to choose another lawyer.');

        if (typeof closeCaseDetails === 'function') closeCaseDetails();
        if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases();
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();

    } catch (error) {
        hideLoading();
        console.error('Error declining selected case:', error);
        alert('Failed to decline case: ' + error.message);
    }
}
window.declineSelectedCase = declineSelectedCase;

function translateCaseForm(lang) {
    if (window._lcdjpCaseTranslationInProgress) return;
    window._lcdjpCaseTranslationInProgress = true;
    const t = translations[lang] || translations.en;
    try {
        document.querySelectorAll('#dynamicFormPage [data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            if (t[key] && el.dataset.lcdjpTranslatedLang !== lang) {
                const isPlaceholder = el.hasAttribute('data-translate-placeholder');
                if (isPlaceholder) {
                    const placeholderKey = el.getAttribute('data-translate-placeholder');
                    if (t[placeholderKey]) {
                        el.placeholder = t[placeholderKey];
                    }
                } else if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
                    el.textContent = t[key];
                }
                el.dataset.lcdjpTranslatedLang = lang;
            }
        });

        document.querySelectorAll('#dynamicFormPage [data-translate-placeholder]').forEach(el => {
            const key = el.getAttribute('data-translate-placeholder');
            if (t[key] && el.dataset.lcdjpTranslatedLang !== lang) {
                el.placeholder = t[key];
                el.dataset.lcdjpTranslatedLang = lang;
            }
        });

        document.querySelectorAll('#dynamicFormPage select option[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            if (t[key] && el.dataset.lcdjpTranslatedLang !== lang) {
                el.textContent = t[key];
                el.dataset.lcdjpTranslatedLang = lang;
            }
        });

    } finally {
        window._lcdjpCaseTranslationInProgress = false;
    }
}

function populateCaseDistricts() {
    const districtSelect = document.getElementById("caseDistrict");
    if (!districtSelect) return;
    
    districtSelect.innerHTML = '<option value="">-- Select District --</option>';
    if (typeof ugandaDistricts !== 'undefined') {
        ugandaDistricts.sort().forEach(district => {
            districtSelect.innerHTML += `<option value="${escapeHtml(district)}">${escapeHtml(district)}</option>`;
        });
    } else {
        const fallbackDistricts = [
            "Kampala", "Wakiso", "Mukono", "Gulu", "Jinja", "Mbarara", 
            "Masaka", "Mbale", "Lira", "Soroti", "Arua", "Kabale"
        ];
        fallbackDistricts.sort().forEach(district => {
            districtSelect.innerHTML += `<option value="${escapeHtml(district)}">${escapeHtml(district)}</option>`;
        });
    }
}

function onCaseDistrictChange() {
    const district = document.getElementById("caseDistrict").value;
    const countyContainer = document.getElementById("caseCountyContainer");
    const countySelect = document.getElementById("caseCounty");
    
    document.getElementById("caseSubCountyContainer").style.display = "none";
    document.getElementById("caseParishContainer").style.display = "none";
    document.getElementById("caseVillageContainer").style.display = "none";
    
    removeCaseManualInput('caseCounty');
    removeCaseManualInput('caseSubCounty');
    removeCaseManualInput('caseParish');
    removeCaseManualInput('caseVillage');
    
    if (district) {
        countyContainer.style.display = "block";
        
        if (typeof ugandaCounties !== 'undefined' && ugandaCounties[district] && ugandaCounties[district].length > 0) {
            countySelect.style.display = "block";
            countySelect.innerHTML = '<option value="">-- Select County --</option>';
            ugandaCounties[district].forEach(county => {
                countySelect.innerHTML += `<option value="${county}">${county}</option>`;
            });
            countySelect.disabled = false;
            showCaseManualEntryOption('caseCounty');
        } else {
            countySelect.style.display = "none";
            showCaseManualInput('caseCounty', 'County', district);
        }
    } else {
        countyContainer.style.display = "none";
        countySelect.innerHTML = '<option value="">-- Select County --</option>';
    }
}

function onCaseCountyChange() {
    const county = getCaseLocationValue('caseCounty');
    const subCountyContainer = document.getElementById("caseSubCountyContainer");
    const subCountySelect = document.getElementById("caseSubCounty");
    
    document.getElementById("caseParishContainer").style.display = "none";
    document.getElementById("caseVillageContainer").style.display = "none";
    
    removeCaseManualInput('caseSubCounty');
    removeCaseManualInput('caseParish');
    removeCaseManualInput('caseVillage');
    
    if (county) {
        subCountyContainer.style.display = "block";
        
        const caseSubCountyList = (typeof ugandaGeo !== 'undefined') ? ugandaGeo.subCounties(document.getElementById("caseDistrict").value, county) : [];
        if (caseSubCountyList.length > 0) {
            subCountySelect.style.display = "block";
            subCountySelect.innerHTML = '<option value="">-- Select Sub-county --</option>';
            caseSubCountyList.forEach(subCounty => {
                subCountySelect.innerHTML += `<option value="${subCounty}">${subCounty}</option>`;
            });
            subCountySelect.disabled = false;
            showCaseManualEntryOption('caseSubCounty');
        } else {
            subCountySelect.style.display = "none";
            showCaseManualInput('caseSubCounty', 'Sub-county', county);
        }
    } else {
        subCountyContainer.style.display = "none";
        subCountySelect.innerHTML = '<option value="">-- Select Sub-county --</option>';
    }
}

function onCaseSubCountyChange() {
    const subCounty = getCaseLocationValue('caseSubCounty');
    const parishContainer = document.getElementById("caseParishContainer");
    const parishSelect = document.getElementById("caseParish");
    
    document.getElementById("caseVillageContainer").style.display = "none";
    
    removeCaseManualInput('caseParish');
    removeCaseManualInput('caseVillage');
    
    if (subCounty) {
        parishContainer.style.display = "block";
        
        const caseParishList = (typeof ugandaGeo !== 'undefined')
            ? ugandaGeo.parishes(document.getElementById("caseDistrict").value, getCaseLocationValue('caseCounty'), subCounty) : [];
        if (caseParishList.length > 0) {
            parishSelect.style.display = "block";
            parishSelect.innerHTML = '<option value="">-- Select Parish --</option>';
            caseParishList.forEach(parish => {
                parishSelect.innerHTML += `<option value="${escapeHtml(parish)}">${escapeHtml(parish)}</option>`;
            });
            parishSelect.disabled = false;
            showCaseManualEntryOption('caseParish');
        } else {
            parishSelect.style.display = "none";
            showCaseManualInput('caseParish', 'Parish', subCounty);
        }
    } else {
        parishContainer.style.display = "none";
        parishSelect.innerHTML = '<option value="">-- Select Parish --</option>';
    }
}
