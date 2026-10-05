


function _getLawyerToken() {
    try {
        if (typeof getAuthToken === 'function') return getAuthToken();
        return localStorage.getItem('jwtToken') ||
            sessionStorage.getItem('jwtToken') || null;
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
                <div onclick="lcdjpOpenNotification(${JSON.stringify(notif).replace(/"/g, '&quot;')})" 
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
                                ${notif.message}
                            </div>
                            ${notif.caseId ? `<div style="font-size:12px; color:#1a4080; font-weight:bold;">Case: ${notif.caseId}</div>` : ''}
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
        showToast(` ${count} notifications marked as read`);
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
        console.log(' User not logged in - notification polling not started');
        return;
    }

    const token = _getLawyerToken();
    if (!token || !username) {
        console.log(' User not logged in - notification polling not started');
        return;
    }
    
    console.log(' Starting notification polling for user:', username);
    window._lcdjpUnreadForbidden = 0;

    
    
    
    
    
    const MAX_CONSECUTIVE_FAILURES = 3;
    let consecutiveFailures = 0;

    const pausePollingUntilOnline = () => {
        clearInterval(window.chatInterval);
        window.chatInterval = null;
        console.warn(' Notification server unreachable - polling paused. Will resume when connection is restored.');

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
                console.log(' User logged out - stopping notification polling');
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
                console.warn(' Notifications are forbidden for this account - polling stopped until next login.');
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
    console.log(" closeNotifications called - UserLevel:", userLevel);
    
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
    
    console.log(' Dynamic view opened');
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
    
    console.log(' Dynamic view cleared');
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
                    <img src="${sessionStorage.getItem('lcdjp_avatar_' + username) || defaultAvatar}" class="js-profile-avatar-img"
                         style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:4px solid #1a4080;">
                    <div>
                        <h3 style="margin:0; color:#333;">${user.firstName} ${user.lastName}</h3>
                        <p style="margin:5px 0; color:#666;">@${user.username}</p>
                        <span style="background:#1a4080; color:white; padding:3px 12px; border-radius:12px; font-size:12px;">
                            LC Official${user.lcPosition ? ' • ' + user.lcPosition : ''}
                        </span>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                    <div><strong> Phone:</strong> ${user.phoneNumber || 'N/A'}</div>
                    <div><strong> Email:</strong> ${user.email || 'N/A'}</div>
                    <div><strong> National ID:</strong> ${user.nationalId || 'N/A'}</div>
                    <div><strong> Location:</strong> ${user.village || user.district || 'N/A'}</div>
                    <div><strong> Position:</strong> ${user.lcPosition || 'N/A'}</div>
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
        <p style="margin: 10px 0;"><strong>User Identity Name:</strong> ${profileName}</p>
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
                <div class="search-result-item" onclick="sendLawyerRequest('${spec}')">
                    <div class="search-result-icon">&#9878;&#65039;</div>
                    <div class="search-result-text">
                        <strong>${spec}</strong>
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
        alert(` Request sent to ${count} lawyer(s) in ${specialization}`);
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
                        <button onclick="viewAvailableCase('${ref}')" 
                                style="padding:6px 14px; background:#1a4080; color:white; border:none; border-radius:5px; cursor:pointer; font-size:12px;">
                            View Details
                        </button>
                        <button onclick="acceptAvailableCase('${ref}')" 
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
            districtSelect.innerHTML += `<option value="${district}">${district}</option>`;
        });
    } else {
        const fallbackDistricts = [
            "Kampala", "Wakiso", "Mukono", "Gulu", "Jinja", "Mbarara", 
            "Masaka", "Mbale", "Lira", "Soroti", "Arua", "Kabale"
        ];
        fallbackDistricts.sort().forEach(district => {
            districtSelect.innerHTML += `<option value="${district}">${district}</option>`;
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
        
        if (typeof ugandaSubCounties !== 'undefined' && ugandaSubCounties[county] && ugandaSubCounties[county].length > 0) {
            subCountySelect.style.display = "block";
            subCountySelect.innerHTML = '<option value="">-- Select Sub-county --</option>';
            ugandaSubCounties[county].forEach(subCounty => {
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
        
        if (typeof ugandaParishes !== 'undefined' && ugandaParishes[subCounty] && ugandaParishes[subCounty].length > 0) {
            parishSelect.style.display = "block";
            parishSelect.innerHTML = '<option value="">-- Select Parish --</option>';
            ugandaParishes[subCounty].forEach(parish => {
                parishSelect.innerHTML += `<option value="${parish}">${parish}</option>`;
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

function onCaseParishChange() {
    const parish = getCaseLocationValue('caseParish');
    const villageContainer = document.getElementById("caseVillageContainer");
    const villageWrapper = document.getElementById("caseVillageWrapper");
    
    removeCaseManualInput('caseVillage');
    
    if (parish) {
        villageContainer.style.display = "block";
        
        if (typeof ugandaVillages !== 'undefined' && ugandaVillages[parish] && ugandaVillages[parish].length > 0) {
            villageWrapper.innerHTML = `
                <select id="caseVillage" class="input-select" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;">
                    <option value="">-- Select Village --</option>
                    ${ugandaVillages[parish].map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
            `;
            showCaseManualEntryOption('caseVillage');
        } else {
            villageWrapper.innerHTML = `
                <div id="caseVillage_manual_container">
                    <input type="text" id="caseVillage_manual" class="input-box" 
                           placeholder="Type village name..." 
                           style="width:100%; padding:12px; border:2px solid #1a4080; border-radius:8px; font-size:16px; margin-top:5px; background: #f0f5ff;">
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                         Manual entry mode - Type your village name
                    </div>
                </div>
            `;
        }
    } else {
        villageContainer.style.display = "none";
    }
}

function getCaseLocationValue(fieldId) {
    const selectElement = document.getElementById(fieldId);
    const manualInput = document.getElementById(`${fieldId}_manual`);
    
    if (manualInput && manualInput.style.display !== 'none' && manualInput.value.trim() !== '') {
        return manualInput.value.trim();
    }
    
    if (selectElement && selectElement.style.display !== 'none') {
        return selectElement.value;
    }
    
    return '';
}
function showCaseManualEntryOption(fieldId) {
    const containerId = getCaseContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const existingOption = document.getElementById(`${fieldId}_manual_option`);
    if (existingOption) existingOption.remove();
    
    const label = getCaseFieldLabel(fieldId);
    const optionHtml = `
        <div id="${fieldId}_manual_option" style="margin-top: 5px; font-size: 12px;">
            <span style="color: #999;">Can't find your ${label.toLowerCase()}?</span>
            <span onclick="enableCaseManualInput('${fieldId}')" style="color: #1a4080; cursor: pointer; font-weight: bold;"> Type it manually →</span>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', optionHtml);
}

function enableCaseManualInput(fieldId) {
    const option = document.getElementById(`${fieldId}_manual_option`);
    if (option) option.remove();
    
    const selectElement = document.getElementById(fieldId);
    if (!selectElement) return;
    
    selectElement.style.display = "none";
    
    let manualInput = document.getElementById(`${fieldId}_manual`);
    if (manualInput) {
        manualInput.style.display = "block";
        manualInput.value = '';
        manualInput.focus();
        return;
    }
    
    const label = getCaseFieldLabel(fieldId);
    const containerId = getCaseContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const inputHtml = `
        <div id="${fieldId}_manual_container" style="margin-top: 8px;">
            <input type="text" id="${fieldId}_manual" class="input-box" 
                   placeholder="Type ${label} name..." 
                   style="width:100%; padding:12px; border:2px solid #1a4080; border-radius:8px; font-size:16px; margin-top:5px; background: #f0f5ff;"
                   onchange="handleCaseManualInputChange('${fieldId}')"
                   onkeyup="if(event.key==='Enter') handleCaseManualInputChange('${fieldId}')">
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                 Manual entry mode
                <span onclick="switchCaseToSelect('${fieldId}')" style="color: #1a4080; cursor: pointer; margin-left: 10px;">← Switch back to dropdown</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', inputHtml);
    setTimeout(() => {
        const input = document.getElementById(`${fieldId}_manual`);
        if (input) input.focus();
    }, 100);
}

function showCaseManualInput(fieldId, label, parentValue) {
    const containerId = getCaseContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (document.getElementById(`${fieldId}_manual`)) {
        document.getElementById(`${fieldId}_manual`).style.display = "block";
        document.getElementById(`${fieldId}_manual`).focus();
        return;
    }
    
    const existingOption = document.getElementById(`${fieldId}_manual_option`);
    if (existingOption) existingOption.remove();
    
    const inputHtml = `
        <div id="${fieldId}_manual_container" style="margin-top: 8px;">
            <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #ffc107;">
                <strong> No ${label.toLowerCase()} data available for "${parentValue}"</strong>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #555;">Please type your ${label.toLowerCase()} name manually below.</p>
            </div>
            <input type="text" id="${fieldId}_manual" class="input-box" 
                   placeholder="Type ${label} name..." 
                   style="width:100%; padding:12px; border:2px solid #1a4080; border-radius:8px; font-size:16px; margin-top:5px; background: #f0f5ff;"
                   onchange="handleCaseManualInputChange('${fieldId}')"
                   onkeyup="if(event.key==='Enter') handleCaseManualInputChange('${fieldId}')">
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                 Manual entry mode - Press Enter or click away to confirm
                <span onclick="switchCaseToSelect('${fieldId}')" style="color: #1a4080; cursor: pointer; margin-left: 10px;">← Switch to dropdown</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', inputHtml);
    setTimeout(() => {
        const input = document.getElementById(`${fieldId}_manual`);
        if (input) input.focus();
    }, 100);
}

function handleCaseManualInputChange(fieldId) {
    var manualInput = document.getElementById(fieldId + '_manual');
    if (!manualInput) return;

    var value = manualInput.value.trim();
    if (!value) {
        manualInput.style.borderColor = '#ff6b6b';
        manualInput.style.background  = '#fff5f5';
        return;
    }
    manualInput.style.borderColor = '#1a4080';
    manualInput.style.background  = '#f0f5ff';

    var fieldMap = {
        'caseCounty':    { selectId:'caseCounty',    nextFunc:'onCaseCountyChange',    downstream:['caseSubCounty','caseParish','caseVillage'] },
        'caseSubCounty': { selectId:'caseSubCounty',  nextFunc:'onCaseSubCountyChange', downstream:['caseParish','caseVillage'] },
        'caseParish':    { selectId:'caseParish',     nextFunc:'onCaseParishChange',    downstream:['caseVillage'] },
        'caseVillage':   { selectId:'caseVillage',    nextFunc:null,                    downstream:[] }
    };
    var fieldInfo = fieldMap[fieldId];
    if (!fieldInfo) return;

    var saved = {};
    (fieldInfo.downstream || []).forEach(function(fid) {
        var v = (typeof getCaseLocationValue === 'function') ? getCaseLocationValue(fid) : '';
        if (v) saved[fid] = v;
    });

    var sel = document.getElementById(fieldInfo.selectId);
    if (sel) {
        var exists = false;
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === value) { exists = true; break; }
        }
        if (!exists) {
            var opt = document.createElement('option');
            opt.value = value; opt.text = value;
            sel.appendChild(opt);
        }
        sel.value = value;
    }

    if (fieldInfo.nextFunc && typeof window[fieldInfo.nextFunc] === 'function') {
        window[fieldInfo.nextFunc]();
    }

    if (Object.keys(saved).length > 0) {
        setTimeout(function() {
            var containerMap = { caseSubCounty:'caseSubCountyContainer', caseParish:'caseParishContainer', caseVillage:'caseVillageContainer' };
            Object.keys(saved).forEach(function(fid) {
                var v = saved[fid];
                var cid = containerMap[fid];
                if (cid) { var c = document.getElementById(cid); if (c) c.style.display = 'block'; }
                var mi = document.getElementById(fid + '_manual');
                if (mi) { mi.style.display = 'block'; mi.value = v; return; }
                var s = document.getElementById(fid);
                if (s) {
                    var found = false;
                    for (var j = 0; j < s.options.length; j++) {
                        if (s.options[j].value.toLowerCase() === v.toLowerCase()) { s.value = s.options[j].value; found = true; break; }
                    }
                    if (!found) { var o = document.createElement('option'); o.value = v; o.text = v; o.selected = true; s.appendChild(o); s.value = v; }
                }
            });
        }, 420);
    }
}
function switchCaseToSelect(fieldId) {
    removeCaseManualInput(fieldId);
    
    const selectElement = document.getElementById(fieldId);
    if (selectElement) {
        selectElement.style.display = "block";
        selectElement.value = "";
    }
    
    showCaseManualEntryOption(fieldId);
}

function removeCaseManualInput(fieldId) {
    const manualContainer = document.getElementById(`${fieldId}_manual_container`);
    if (manualContainer) manualContainer.remove();
    
    const manualOption = document.getElementById(`${fieldId}_manual_option`);
    if (manualOption) manualOption.remove();
}

function getCaseContainerId(fieldId) {
    const containerMap = {
        'caseCounty': 'caseCountyContainer',
        'caseSubCounty': 'caseSubCountyContainer',
        'caseParish': 'caseParishContainer',
        'caseVillage': 'caseVillageContainer',
        'caseDistrict': 'caseDistrictContainer'
    };
    return containerMap[fieldId] || `${fieldId}Container`;
}

function getCaseFieldLabel(fieldId) {
    const labels = {
        'caseCounty': 'County',
        'caseSubCounty': 'Sub-county',
        'caseParish': 'Parish',
        'caseVillage': 'Village'
    };
    return labels[fieldId] || fieldId.replace('case', '');
}


function validatePhoneInput(input, statusDiv) {
    const phone = input.value.trim();
    
    if (phone.length === 0) {
        if (statusDiv) statusDiv.innerHTML = '';
        input.style.borderColor = '#ccc';
        input.style.background = '#eef4f3';
        return;
    }
    
    const isValid = /^07\d{8}$/.test(phone) || /^\+256\d{9}$/.test(phone);
    
    if (isValid) {
        if (statusDiv) statusDiv.innerHTML = `<span style="color:#28a745;"> Valid phone number</span>`;
        input.style.borderColor = '#28a745';
        input.style.background = '#f0fff4';
    } else {
        let errorMsg = ' Invalid format. ';
        if (phone.startsWith('07')) {
            errorMsg += 'Use 07XXXXXXXX (10 digits)';
        } else if (phone.startsWith('+256')) {
            errorMsg += 'Use +256XXXXXXXXX (13 characters)';
        } else {
            errorMsg += 'Use 07XXXXXXXX or +256XXXXXXXXX';
        }
        if (statusDiv) statusDiv.innerHTML = `<span style="color:#dc3545;">${errorMsg}</span>`;
        input.style.borderColor = '#dc3545';
        input.style.background = '#fff5f5';
    }
}


async function showAdminNotificationsPanel() {
    const notifications = await getNotificationsForUser('admin');
    const notifList   = Array.isArray(notifications) ? notifications : [];
    const unreadCount = await getUnreadCount('admin');
    const urgentArr   = await getUrgentNotifications('admin');
    const urgentCount = Array.isArray(urgentArr) ? urgentArr.length : 0;
    
    let html = `
        <div id="adminNotificationsPanel" style="background:white; border-radius:12px; padding:20px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #1a4080; padding-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <h3 style="color:#1a4080; margin:0;"> Admin Notifications</h3>
                    ${unreadCount > 0 ? `<span style="background:#dc3545; color:white; padding:2px 12px; border-radius:12px; font-size:12px; font-weight:bold; animation:pulse 1.5s infinite;">${unreadCount} New</span>` : ''}
                    ${urgentCount > 0 ? `<span style="background:#dc3545; color:white; padding:2px 12px; border-radius:12px; font-size:12px; font-weight:bold; animation:pulse 1.5s infinite; background:#dc3545 !important;"> ${urgentCount} Urgent</span>` : ''}
                </div>
                <div style="display:flex; gap:10px;">
                    ${unreadCount > 0 ? `<button onclick="markAllAdminNotificationsAsRead()" style="padding:6px 15px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">Mark All Read</button>` : ''}
                </div>
            </div>
            
            <div id="adminNotificationsList" style="max-height:500px; overflow-y:auto;">
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
                <div onclick="lcdjpOpenNotification(${JSON.stringify(notif).replace(/"/g, '&quot;')})" 
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
                                ${notif.message}
                            </div>
                            ${notif.caseId ? `<div style="font-size:12px; color:#1a4080; font-weight:bold;">Case: ${notif.caseId}</div>` : ''}
                            ${notif.link ? `<div style="font-size:12px; color:#007bff; cursor:pointer; text-decoration:underline;" onclick="event.stopPropagation(); window.location.href='${notif.link}';">View Details →</div>` : ''}
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
    
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        const existingPanel = document.getElementById('adminNotificationsPanel');
        if (existingPanel) existingPanel.remove();
        
        const header = adminDashboard.querySelector('.admin-header');
        if (header) {
            header.insertAdjacentHTML('afterend', html);
        } else {
            adminDashboard.insertAdjacentHTML('afterbegin', html);
        }
    }
}

async function markAllAdminNotificationsAsRead() {
    const count = await markAllNotificationsAsRead('admin');
    if (count > 0) {
        showToast(` ${count} notifications marked as read`);
        refreshAdminNotifications();
        renderNavbarNotifBadge();
    }
}

function refreshAdminNotifications() {
    showAdminNotificationsPanel();
    renderNavbarNotifBadge();
}


function notifyEscalatedLCOfficials(officials, caseData, level, locationType) {
    if (officials.length === 0) return;
    officials.forEach(lc => {
        _lcdjpCreateNotification(lc.username,
            ` Escalated case: ${caseData.caseType} from ${caseData.village}, ${caseData.parish} (No LC1 in parish)`,
            'new_case', caseData.caseId);
    });
}








function findCaseById(caseId) {
    var caseRef = String(caseId == null ? '' : caseId).trim();
    if (!caseRef || /^(n\/a|null|undefined|none)$/i.test(caseRef)) return null;

    let found = cases.find(c => String(getCaseReference(c) || '') === caseRef);
    if (found) return found;

    return fetchCaseFromAPI(caseRef);
}
async function fetchCaseFromAPI(caseRef) {
    try {
        if (!caseRef || /^(n\/a|null|undefined|none)$/i.test(String(caseRef))) return null;
        const response = await fetch(API_ENDPOINTS.case(encodeURIComponent(caseRef)), {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.success && data.case) {
            const fetchedCase = data.case;
            cases.push(fetchedCase);
            _lcdjpStore.cases = cases;
            return fetchedCase;
        }
        return null;
    } catch (error) {
        console.warn('Failed to fetch case from API:', error);
        return null;
    }
}













function viewCase(caseId) {
    return viewCitizenCase(caseId);
}
window.viewCase = viewCase;









function lawyerSendMessage(caseId) {
    return openCitizenMessaging(caseId);
}
window.lawyerSendMessage = lawyerSendMessage;








async function openLegalAdvice(caseId) {
    var caseRef = String(caseId == null ? '' : caseId).trim();
    if (!caseRef || /^(n\/a|null|undefined|none)$/i.test(caseRef)) {
        alert('No case reference available.');
        return;
    }

    var foundCase = typeof findCaseById === 'function' ? findCaseById(caseRef) : null;
    if (foundCase instanceof Promise) foundCase = await foundCase;
    var existingAdvice = foundCase ? (foundCase.legal_advice || foundCase.legalAdvice || '') : '';

    var html = `
    <div class="form-card" style="max-width:700px; margin:0 auto;">
        <h2 style="color:#1a4080; text-align:center;">Legal Advice</h2>
        <p style="text-align:center; color:#666; margin-bottom:20px;">Case: <strong>${_cmEsc(caseRef)}</strong></p>
        <label style="font-weight:600; display:block; margin-bottom:6px;">Legal Advice</label>
        <textarea id="legalAdviceInput" rows="8" class="input-box"
            placeholder="Write the legal advice for this case..."
            style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:15px; resize:vertical; box-sizing:border-box;">${_cmEsc(existingAdvice)}</textarea>
        <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="saveLegalAdvice('${caseRef}')" class="btn login-btn"
                style="flex:1; padding:14px; background:#1a237e; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px; font-weight:bold;">
                Save Advice
            </button>
            <button onclick="closeDynamicView(); if (typeof viewCase === 'function') viewCase('${caseRef}');" class="btn back-btn"
                style="padding:14px 20px; background:#999; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px;">
                ← Back to Case
            </button>
        </div>
    </div>`;

    openDynamicView(html);
}
window.openLegalAdvice = openLegalAdvice;

async function saveLegalAdvice(caseId) {
    var caseRef = String(caseId == null ? '' : caseId).trim();
    var textarea = document.getElementById('legalAdviceInput');
    var adviceText = textarea ? textarea.value.trim() : '';
    if (!adviceText) {
        alert('Please write the legal advice before saving.');
        return;
    }
    var uname = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    try {
        var resp = await fetch(API_ENDPOINTS.advice(caseRef), {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                legalAdvice: adviceText,
                legalAdviceDate: new Date().toISOString(),
                legalAdviceProvidedBy: uname,
                legal_advice_provided_by: uname
            })
        });
        if (!resp.ok) throw new Error('Failed to save advice');
        if (typeof showToast === 'function') showToast('Legal advice saved.');
        else alert('Legal advice saved.');
        closeDynamicView();
        if (typeof viewCase === 'function') viewCase(caseRef);
    } catch (error) {
        console.error('saveLegalAdvice error:', error);
        alert('Could not save legal advice. Please try again.');
    }
}
window.saveLegalAdvice = saveLegalAdvice;

async function showAppendDetailsForm(caseId) {
    console.log('showAppendDetailsForm called with caseId:', caseId);
    
    let foundCase = findCaseById(caseId);
    if (foundCase instanceof Promise) foundCase = await foundCase;
    if (!foundCase) {
        alert("Case not found. Please refresh and try again.");
        return;
    }

    let html = `
    <div class="form-card" style="max-width:800px; margin:0 auto;">
        <h2 style="color:#1a4080; text-align:center;"> Add Additional Information</h2>
        <p style="text-align:center; color:#666; margin-bottom:20px;">Case: <strong>${getCaseReference(foundCase) || 'N/A'}</strong> - ${foundCase.caseType}</p>
        
        <div style="background:#f0f5ff; padding:15px; border-radius:8px; margin-bottom:20px; border-left:4px solid #1a4080;">
            <p style="margin:0;"><strong>Original Description:</strong></p>
            <p style="margin:5px 0 0 0; color:#555; font-style:italic;">${foundCase.description}</p>
            ${foundCase.extraNotes ? `<p style="margin:10px 0 0 0; background:#fff3cd; padding:10px; border-left:3px solid #ffc107; border-radius:4px;"><strong>Previously Added:</strong> ${foundCase.extraNotes}</p>` : ''}
        </div>
        
        <div style="background:#fff3cd; padding:10px 15px; border-radius:8px; margin-bottom:15px; border-left:4px solid #ff9800;">
            <p style="margin:0; font-size:13px; color:#856404;">
                 <strong>Tip:</strong> You can add notes OR upload files OR record a voice message. 
                At least one of these is required.
            </p>
        </div>
        
        <label style="font-weight:600; display:block; margin-top:10px;"> Additional Notes</label>
        
        <div style="position:relative;">
            <textarea id="supplementaryNotesInput" rows="4" class="input-box" placeholder="Type any forgotten facts, additional evidence, or new information here..." style="width:100%; padding:12px 12px 46px 12px; border:1px solid #ccc; border-radius:8px; font-size:16px; resize:vertical; box-sizing:border-box;"></textarea>
            <button type="button" id="appendVoiceRecordBtn" onclick="toggleAppendVoiceRecording('${caseId}')"
                    title="Record a voice note"
                    style="position:absolute; bottom:10px; left:10px; display:flex; align-items:center; gap:6px; padding:5px 12px 5px 8px; background:#e0e0e0; color:#444; border:none; border-radius:20px; cursor:pointer; font-size:13px; font-weight:500; transition:background 0.2s;" onmouseover="this.style.background='#d0d0d0'" onmouseout="this.style.background='#e0e0e0'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                Voice note
            </button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px; min-height:18px;">
            <span id="appendVoiceStatus" style="font-size:11px; color:#aaa; flex:1;"></span>
        </div>
        <div id="appendVoiceTimer" style="display:none; padding:8px 12px; background:#fff3cd; border-radius:6px; text-align:center; font-size:13px; color:#856404; margin-top:6px;">
            &#128308; Recording… <span id="appendVoiceTimerDisplay">0:00</span>
            <button onclick="stopAppendVoiceRecording()" style="margin-left:10px; padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">Stop</button>
        </div>
        <div id="appendVoicePreview" style="display:none; margin-top:8px; padding:10px; background:#e8f5e9; border-radius:8px; border-left:4px solid #28a745;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <audio id="appendVoiceAudio" controls style="flex:1; max-width:280px; height:36px;"></audio>
                <button onclick="clearAppendVoiceRecording()" style="padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px; flex-shrink:0;">Remove</button>
            </div>
        </div>
        <input type="hidden" id="appendVoiceData" value="">
        <input type="hidden" id="appendVoiceDuration" value="0">

        <div style="background:#f8f9fa; border-radius:8px; padding:15px; margin:15px 0; border:1px solid #ddd;">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                <span style="font-size:14px; font-weight:bold; color:#555;"> Attach a File</span>
                <span style="font-size:11px; color:#888;">Max 5MB, one file only</span>
            </div>
            <input type="file" id="appendFileInput" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp3,.mp4,.wav,.txt" 
                   style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;" 
                   onchange="prependFilesPreview(this)">
            <div id="appendFilesPreview" style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
            <div style="font-size:12px; color:#666; margin-top:5px;">
                 Supported: PDF, Word, Images, Audio, Video, Text (Max 5MB). Attaching a new file replaces any file already on this case.
            </div>
        </div>
        
        <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="saveExtraCaseDetails('${caseId}')" class="btn login-btn" 
                    style="flex:1; padding:14px; background:#1a4080; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px; font-weight:bold;">
                 Save & Add to Case
            </button>
            <button onclick="closeDynamicView(); showMyCases();" class="btn back-btn" 
                    style="padding:14px 20px; background:#999; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px;">
                ← Back to My Cases
            </button>
        </div>
    </div>`;
    
    openDynamicView(html);
}

function toggleAppendVoiceRecording(caseId) {
    appendCurrentCaseId = caseId;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast(' Voice recording is not supported in this browser.');
        return;
    }
    
    if (!window.MediaRecorder) {
        showToast(' MediaRecorder API not supported. Please use Chrome or Firefox.');
        return;
    }
    
    if (appendIsRecording) {
        stopAppendVoiceRecording();
    } else {
        startAppendVoiceRecording();
    }
}

function startAppendVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            appendMediaRecorder = new MediaRecorder(stream);
            appendAudioChunks = [];
            
            appendMediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    appendAudioChunks.push(event.data);
                }
            };
            
            appendMediaRecorder.onstop = () => {
                if (appendAudioChunks.length === 0) {
                    showToast(' No audio recorded. Please try again.');
                    return;
                }
                
                const audioBlob = new Blob(appendAudioChunks, { type: 'audio/webm' });
                appendRecordedBlob = audioBlob;
                showAppendVoicePreview(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            appendMediaRecorder.start(100);
            appendIsRecording = true;
            appendRecordingStartTime = Date.now();
            
            const recordBtn = document.getElementById('appendVoiceRecordBtn');
            if (recordBtn) {
                recordBtn.textContent = ' Stop';
                recordBtn.style.background = '#dc3545';
            }
            
            const status = document.getElementById('appendVoiceStatus');
            if (status) {
                status.textContent = ' Recording...';
                status.style.color = '#dc3545';
            }
            
            const timer = document.getElementById('appendVoiceTimer');
            if (timer) {
                timer.style.display = 'block';
            }
            
            let seconds = 0;
            if (appendRecordingTimer) clearInterval(appendRecordingTimer);
            appendRecordingTimer = setInterval(() => {
                seconds++;
                const display = document.getElementById('appendVoiceTimerDisplay');
                if (display) {
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            }, 1000);
            
            setTimeout(() => {
                if (appendIsRecording) {
                    stopAppendVoiceRecording();
                    showToast(' Recording stopped (60 second limit)');
                }
            }, 60000);
            
            showToast(' Recording started... Speak your additional information!');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                showToast(' Please allow microphone access to record.');
            } else if (error.name === 'NotFoundError') {
                showToast(' No microphone found. Please connect a microphone.');
            } else {
                showToast(' Could not access microphone: ' + error.message);
            }
        });
}

function stopAppendVoiceRecording() {
    if (!appendIsRecording || !appendMediaRecorder) return;
    
    appendIsRecording = false;
    
    try {
        appendMediaRecorder.stop();
    } catch (e) {
        console.error('Error stopping recorder:', e);
    }
    
    if (appendRecordingTimer) {
        clearInterval(appendRecordingTimer);
        appendRecordingTimer = null;
    }
    
    const recordBtn = document.getElementById('appendVoiceRecordBtn');
    if (recordBtn) {
        recordBtn.textContent = ' Record';
        recordBtn.style.background = '#dc3545';
    }
    
    const status = document.getElementById('appendVoiceStatus');
    if (status) {
        status.textContent = ' Stopped';
        status.style.color = '#888';
    }
    
    const timer = document.getElementById('appendVoiceTimer');
    if (timer) {
        timer.style.display = 'none';
    }
}

function showAppendVoicePreview(audioBlob) {
    const preview = document.getElementById('appendVoicePreview');
    const audio = document.getElementById('appendVoiceAudio');
    const dataInput = document.getElementById('appendVoiceData');
    const durationInput = document.getElementById('appendVoiceDuration');
    
    if (!preview || !audio) return;
    
    const duration = appendRecordingStartTime ? Math.floor((Date.now() - appendRecordingStartTime) / 1000) : 0;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const audioData = e.target.result;
        if (dataInput) dataInput.value = audioData;
        if (durationInput) durationInput.value = duration;
        
        audio.src = URL.createObjectURL(audioBlob);
        preview.style.display = 'block';
        
        const status = document.getElementById('appendVoiceStatus');
        if (status) {
            status.textContent = ` Ready (${duration}s)`;
            status.style.color = '#28a745';
        }
        
        showToast(' Recording ready! Click Save to add it to your case.');
    };
    reader.readAsDataURL(audioBlob);
}

function clearAppendVoiceRecording() {
    const preview = document.getElementById('appendVoicePreview');
    const audio = document.getElementById('appendVoiceAudio');
    const dataInput = document.getElementById('appendVoiceData');
    const durationInput = document.getElementById('appendVoiceDuration');
    const status = document.getElementById('appendVoiceStatus');
    
    if (preview) preview.style.display = 'none';
    if (audio) audio.src = '';
    if (dataInput) dataInput.value = '';
    if (durationInput) durationInput.value = '0';
    if (status) {
        status.textContent = 'Click to record';
        status.style.color = '#888';
    }
    
    appendRecordedBlob = null;
    showToast(' Recording cleared');
}

async function saveExtraCaseDetails(caseId) {
    console.log('saveExtraCaseDetails called with caseId:', caseId);
    
    let foundCase = findCaseById(caseId);
    if (foundCase instanceof Promise) foundCase = await foundCase;
    if (!foundCase) {
        alert("Case not found. Please refresh and try again.");
        return;
    }

    const extraNotes = document.getElementById("supplementaryNotesInput")?.value.trim() || '';
    const voiceData = document.getElementById('appendVoiceData')?.value || '';
    const voiceDuration = parseInt(document.getElementById('appendVoiceDuration')?.value) || 0;
    
    const fileInput = document.getElementById('appendFileInput');
    
    
    
    const file = fileInput?.files?.[0] || null;
    
    if (!extraNotes && !file && !voiceData) {
        alert("Please enter some information, attach a file, or record a voice note before saving.");
        return;
    }

    if (!_isLawyerAuthenticated()) {
        if (typeof showToast === 'function') showToast('Please login first.');
        return;
    }

    const actor = sessionStorage.getItem("lcdjp_fullname") || "Citizen";
    const headers = _getLawyerAuthHeaders();

    let fileData = null;
    if (file) {
        try {
            fileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } catch (e) {
            alert('Error reading the attached file. Please try again.');
            return;
        }
    }

    try {
        
        
        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) {
            alert('Failed to load the latest case details. Please try again.');
            return;
        }
        const caseData = await caseResp.json();
        const serverCase = caseData.case || caseData;

        let timeline = serverCase.timeline
            ? (typeof serverCase.timeline === 'string' ? JSON.parse(serverCase.timeline) : serverCase.timeline)
            : [];

        let updateDetails = [];
        if (extraNotes) updateDetails.push(' Added notes');
        if (voiceData) updateDetails.push(' Voice recording');
        if (fileData) updateDetails.push(' File attached');

        timeline.push({
            action: "Additional Information Added",
            actor: actor,
            details: updateDetails.join(' • ') + (extraNotes ? `\n ${extraNotes}` : ''),
            timestamp: new Date().toLocaleString()
        });

        if (fileData) {
            timeline.push({
                action: "File Attached",
                actor: actor,
                details: ` ${fileData.name} (${formatFileSize(fileData.size)})`,
                timestamp: new Date().toLocaleString()
            });
        }

        if (voiceData) {
            timeline.push({
                action: "Voice Note Added",
                actor: actor,
                details: ` Voice recording (${voiceDuration} seconds)`,
                timestamp: new Date().toLocaleString()
            });
        }

        const updateData = {
            extraNotes: extraNotes || serverCase.extra_notes || serverCase.extraNotes || '',
            timeline: JSON.stringify(timeline)
        };
        if (fileData) {
            updateData.attachedMedia = fileData.name;
            updateData.attachedFileData = fileData.data;
            updateData.attachedFileSize = fileData.size;
            updateData.attachedFileType = fileData.type;
        }
        if (voiceData) {
            updateData.voiceNoteData = voiceData;
            updateData.voiceNoteDuration = voiceDuration;
        }

        const updateResp = await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(updateData)
        });

        if (!updateResp.ok) {
            if (updateResp.status === 401 || updateResp.status === 403) {
                alert('Authentication error. Please login again.');
                return;
            }
            throw new Error('Failed to save additional information');
        }

        const updatedCase = await updateResp.json();
        Object.assign(foundCase, updatedCase.case || updatedCase);
        _lcdjpStore.cases = cases;

        const handler = foundCase.currentHandler || foundCase.current_handler;
        if (handler) {
            createEnhancedNotification(
                handler,
                ` ${actor} added information to case ${caseId}`,
                'case_updated',
                caseId
            );
        }
        
        let successMsg = " Additional information saved to the case!\n\n";
        if (extraNotes) successMsg += ` Notes: ${extraNotes.substring(0, 100)}${extraNotes.length > 100 ? '...' : ''}\n`;
        if (voiceData) successMsg += ` Voice recording (${voiceDuration}s) saved\n`;
        if (fileData) successMsg += ` File attached: ${fileData.name}\n`;
        
        alert(successMsg);
        closeDynamicView();
        viewCitizenCase(caseId);
        renderNavbarNotifBadge();
    } catch (error) {
        console.error('Error saving additional case details:', error);
        alert('Failed to save additional information: ' + error.message);
    }
}


function showAuditLogsPage() {
    
    hideAllDashboardViews();
    
    const adminDashEl = document.getElementById('adminDashboard');
    if (adminDashEl) adminDashEl.style.display = 'block';
    setAdminActiveMenu('auditlogs');
    
    hideAdminContainers();
    
    
    const container = document.getElementById('auditLogsContainer');
    if (container) {
        container.style.display = 'block';
        loadAuditLogs();
    }
}

function hideAdminContainers() {
    const containers = [
        'adminHomeContainer',
        'approvalContainer',
        'userManagementContainer',
        'lawyerManagementContainer',
        'lawyerPerformanceContainer',
        'statisticsContainer',
        'pdfExportContainer',
        'searchResultsContainer',
        'auditLogsContainer'
    ];
    
    containers.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    });
}

function loadAuditLogs() {
    const container = document.getElementById('auditLogsList');
    if (!container) {
        console.error('auditLogsList not found');
        return;
    }
    
    
    if (!_isLawyerAuthenticated()) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#dc3545;">Please login to view audit logs.</div>';
        return;
    }
    
    const token = _getLawyerToken();
    if (!token) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#dc3545;">Please login to view audit logs.</div>';
        return;
    }
    
    const search = document.getElementById('auditLogSearch')?.value || '';
    const actionFilter = document.getElementById('auditLogActionFilter')?.value || '';
    
    let url = `${API_BASE_URL}/api/auth/audit-logs`;
    const params = new URLSearchParams();
    if (search) params.append('username', search);
    if (actionFilter) params.append('action', actionFilter);
    if (params.toString()) url += '?' + params.toString();
    
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Loading audit logs...</div>';
    
    const headers = _getLawyerAuthHeaders();
    fetch(url, {
        headers: headers
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication error. Please login again.');
            }
            if (response.status === 404) {
                throw new Error('Audit logs endpoint not found. Please check backend configuration.');
            }
            throw new Error('Failed to fetch audit logs');
        }
        return response.json();
    })
    .then(data => {
        const logs = data.logs || [];
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#999;">
                    <div style="font-size:36px; margin-bottom:10px;"></div>
                    <p>No audit logs found.</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div style="overflow:auto; max-height:60vh; padding:10px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#1a237e; color:white;">
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">User</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Role</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Action</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Entity</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Details</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        logs.forEach(log => {
            const actionColor = getActionColor(log.action);
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px 12px; font-weight:500;">${log.username || 'N/A'}</td>
                    <td style="padding:10px 12px;">${log.user_role || 'N/A'}</td>
                    <td style="padding:10px 12px;">
                        <span style="background:${actionColor}; color:white; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600;">
                            ${log.action || 'N/A'}
                        </span>
                    </td>
                    <td style="padding:10px 12px;">${log.entity_type || 'N/A'} ${log.entity_id ? '#' + log.entity_id : ''}</td>
                    <td style="padding:10px 12px; max-width:300px; word-wrap:break-word;">${log.details || 'N/A'}</td>
                    <td style="padding:10px 12px; font-size:12px; color:#888;">${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            <div style="padding:12px; background:#f8f9fa; border-top:1px solid #ddd; text-align:center; font-size:12px; color:#888;">
                Showing ${logs.length} entries
            </div>
        `;
        
        container.innerHTML = html;
    })
    .catch(error => {
        console.error('Error loading audit logs:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#dc3545;">
                <div style="font-size:36px; margin-bottom:10px;"></div>
                <p style="font-weight:bold;">${error.message}</p>
                <p style="font-size:12px; color:#888; margin-top:10px;">Make sure the backend is running and audit logs are configured.</p>
                <button onclick="loadAuditLogs()" style="margin-top:15px; padding:8px 20px; background:#1a237e; color:white; border:none; border-radius:6px; cursor:pointer;">
                    Retry
                </button>
            </div>
        `;
    });
}


function getActionColor(action) {
    const colors = {
        'LOGIN': '#28a745',
        'LOGIN_FAILED': '#dc3545',
        'REGISTER': '#17a2b8',
        'CASE_CREATED': '#6f157d',
        'CASE_ACCEPTED': '#28a745',
        'CASE_FORWARDED': '#ff9800',
        'CASE_RESOLVED': '#28a745',
        'CASE_DELETED': '#dc3545',
        'LEGAL_ADVICE_ADDED': '#007bff',
        'MESSAGE_ADDED': '#17a2b8',
        'USER_APPROVED': '#28a745',
        'USER_REJECTED': '#dc3545',
        'USER_DELETED': '#dc3545',
        'USER_DEACTIVATED': '#e8730a',
        'USER_AUTO_DELETED': '#dc3545',
        'USER_UPDATED': '#007bff'
    };
    return colors[action] || '#6c757d';
}

function refreshAuditLogs() {
    document.getElementById('auditLogSearch').value = '';
    document.getElementById('auditLogActionFilter').value = '';
    loadAuditLogs();
}

function loadAuditLogsByDate() {
    const fromDate = document.getElementById('auditLogDateFrom')?.value;
    const toDate = document.getElementById('auditLogDateTo')?.value;
    
    if (!fromDate || !toDate) {
        alert('Please select both date fields.');
        return;
    }
    
    const token = getAuthToken();
    if (!token) {
        alert('Please login first.');
        return;
    }
    
    const container = document.getElementById('auditLogsList');
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Loading...</div>';
    
    fetch(`${API_BASE_URL}/api/auth/audit-logs?startDate=${fromDate}&endDate=${toDate}`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        const logs = data.logs || [];
        displayAuditLogs(logs);
    })
    .catch(error => {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#dc3545;">Error: ${error.message}</div>`;
    });
}

function displayAuditLogs(logs) {
    const container = document.getElementById('auditLogsList');
    if (!container) return;
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999;">
                <div style="font-size:36px; margin-bottom:10px;"></div>
                <p>No audit logs found.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x:auto; padding:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="background:#1a237e; color:white;">
                        <th style="padding:10px 12px; text-align:left;">User</th>
                        <th style="padding:10px 12px; text-align:left;">Role</th>
                        <th style="padding:10px 12px; text-align:left;">Action</th>
                        <th style="padding:10px 12px; text-align:left;">Entity</th>
                        <th style="padding:10px 12px; text-align:left;">Details</th>
                        <th style="padding:10px 12px; text-align:left;">Time</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    logs.forEach(log => {
        const actionColor = getActionColor(log.action);
        html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px 12px; font-weight:500;">${log.username || 'N/A'}</td>
                <td style="padding:10px 12px;">${log.user_role || 'N/A'}</td>
                <td style="padding:10px 12px;">
                    <span style="background:${actionColor}; color:white; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600;">
                        ${log.action || 'N/A'}
                    </span>
                </td>
                <td style="padding:10px 12px;">${log.entity_type || 'N/A'} ${log.entity_id ? '#' + log.entity_id : ''}</td>
                <td style="padding:10px 12px; max-width:300px; word-wrap:break-word;">${log.details || 'N/A'}</td>
                <td style="padding:10px 12px; font-size:12px; color:#888;">${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="padding:12px; background:#f8f9fa; border-top:1px solid #ddd; text-align:center; font-size:12px; color:#888;">
            Showing ${logs.length} entries
        </div>
    `;
    
    container.innerHTML = html;
}
function debugAdditionalInfo(caseId) {
    const foundCase = cases.find(c => c.caseId === caseId);
    if (!foundCase) {
        console.log('Case not found');
        return;
    }
    
    console.log('=== ADDITIONAL INFO DEBUG ===');
    console.log('Case ID:', caseId);
    console.log('Has additionalInfo:', !!foundCase.additionalInfo);
    console.log('Additional Info count:', foundCase.additionalInfo ? foundCase.additionalInfo.length : 0);
    
    if (foundCase.additionalInfo) {
        foundCase.additionalInfo.forEach((info, index) => {
            console.log(`Entry ${index + 1}:`);
            console.log('  - Timestamp:', info.timestamp);
            console.log('  - Has notes:', !!info.extraNotes);
            console.log('  - Has voice:', !!info.voiceData);
            console.log('  - Files count:', info.files ? info.files.length : 0);
            if (info.files) {
                info.files.forEach((file, fIdx) => {
                    console.log(`    File ${fIdx + 1}:`, file.name, formatFileSize(file.size || 0));
                    console.log('    Has data:', !!file.data);
                });
            }
        });
    }
    console.log('===============================');
    
    const html = renderAdditionalInfoDocuments(foundCase);
    if (html) {
        console.log('HTML generated successfully, length:', html.length);
        console.log('Preview:', html.substring(0, 500) + '...');
    } else {
        console.log('No HTML generated');
    }
    
    return foundCase;
}

window.debugAdditionalInfo = debugAdditionalInfo;

function prependFilesPreview(input) {
    const previewContainer = document.getElementById('appendFilesPreview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    
    const file = input.files[0];
    
    if (!file) {
        previewContainer.innerHTML = `<span style="font-size:12px; color:#999;">No file selected</span>`;
        return;
    }
    
    const fileIcon = getFileIcon(file.name);
    const isImage = file.type.startsWith('image/');
    
    const fileCard = document.createElement('div');
    fileCard.style.cssText = `
        background: white;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #ddd;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
    `;
    
    let previewHtml = `
        <span style="font-size:20px;">${fileIcon}</span>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;">${file.name}</span>
        <span style="color:#888; font-size:10px;">${formatFileSize(file.size)}</span>
    `;
    
    if (isImage) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = 'width:30px; height:30px; object-fit:cover; border-radius:4px;';
            const textSpan = fileCard.querySelector('span:nth-child(2)');
            if (textSpan) {
                fileCard.insertBefore(img, textSpan);
            }
        };
        reader.readAsDataURL(file);
    }
    
    fileCard.innerHTML = previewHtml;
    previewContainer.appendChild(fileCard);
}

async function processInlineTableUpload(inputElement, caseId) {
    const file = inputElement.files[0];
    if (!file) return;

    
    if (!_isLawyerAuthenticated()) {
        if (typeof showToast === 'function') showToast('Please login first.');
        return;
    }

    const username = sessionStorage.getItem('lcdjp_username');
    const token = _getLawyerToken();
    if (!username || !token) {
        if (typeof showToast === 'function') showToast('Authentication error. Please login again.');
        return;
    }

    try {
        const headers = _getLawyerAuthHeaders();
        const fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const response = await fetch(API_ENDPOINTS.uploadDocument, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                file_data: fileData,
                owner: username,
                case_id: caseId,
                category: 'case_attachment',
                description: 'Inline case attachment'
            })
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                if (typeof showToast === 'function') showToast('Authentication error. Please login again.');
                return;
            }
            throw new Error('Upload failed');
        }
        if (typeof showToast === 'function') showToast(` Media attached: ${file.name}`);
    } catch (err) {
        console.error('processInlineTableUpload error:', err);
        if (typeof showToast === 'function') showToast(' Failed to upload media file.');
    }
    updateMyCases();
}











function updateLawyerDashboardCasesDebounced() {
    clearTimeout(_lawyerSearchDebounceTimer);
    _lawyerSearchDebounceTimer = setTimeout(function () {
        updateLawyerDashboardCases();
    }, 250);
}

async function updateLawyerDashboardCases() {
    let table = document.getElementById("lawyerCasesTable");
    if (!table) return;
    table.innerHTML = "";
    const _mCards = document.getElementById('lawyerMobileCards');
    if (_mCards) _mCards.innerHTML = '';

    
    
    
    
    
    
    
    
    
    
    
    
    
    const _lawyerUsernameForFetch = sessionStorage.getItem('lcdjp_username');

    
    
    
    
    
    
    
    
    
    
    
    const _cachedProfile = (window._lcdjpProfileCache &&
        window._lcdjpProfileCache.username === _lawyerUsernameForFetch &&
        (Date.now() - window._lcdjpProfileCache.ts) < 5000)
        ? window._lcdjpProfileCache.data
        : null;
    if (_cachedProfile) window._lcdjpProfileCache = null;

    const _offersRequest = _lawyerFetchAiOffers();
    const _userRequest = _cachedProfile
        ? Promise.resolve({ ok: true, json: function () { return Promise.resolve(_cachedProfile); } })
        : (_lawyerUsernameForFetch
            ? fetch(API_ENDPOINTS.user(_lawyerUsernameForFetch), { headers: getAuthHeaders() })
            : null);
    const _casesRequest = _lawyerUsernameForFetch
        ? fetch(API_ENDPOINTS.availableLawyerCases(_lawyerUsernameForFetch), { headers: getAuthHeaders() })
        : null;

    const _allMatchedOffers = await _offersRequest;
    const _offerSearchText = (document.getElementById('lawyerCaseSearch')?.value || document.getElementById('lmCaseSearch')?.value || '').toLowerCase();
    const _matchedOffers = _offerSearchText ? _allMatchedOffers.filter(function (c) {
        const _offerSearchable = [c.caseId, c.citizenName, c.village, c.parish || c.district, c.caseType]
            .filter(Boolean).join(' ').toLowerCase();
        return _offerSearchable.includes(_offerSearchText);
    }) : _allMatchedOffers;
    let offersRowsHtml = '';
    let offersCardsHtml = '';
    _matchedOffers.forEach(function (c) {
        const citizen = c.citizenName || 'Unknown';
        const loc = [c.village, c.parish || c.district].filter(Boolean).join(', ') || 'N/A';
        offersRowsHtml += `
                <tr style="background: #fff8e1; border-left: 4px solid #ff9800;">
                    <td><strong>${c.caseId || ''}</strong> <span class="badge badge-warning">New</span></td>
                    <td>${c.caseType || 'N/A'}</td>
                    <td><strong>${citizen}</strong></td>
                    <td>${loc}</td>
                    <td><span class="badge badge-warning">Awaiting Acceptance</span></td>
                    <td>
                        <button onclick="aiOfferAccept('${c.caseId || ''}')" class="btn btn-sm btn-success" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Accept</button>
                        <button onclick="aiOfferDecline('${c.caseId || ''}')" class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Decline</button>
                    </td>
                </tr>`;
        if (_mCards) {
            offersCardsHtml += `<div class="lm-case">
  <div class="lm-case-head"><div><div class="lm-eyebrow">Case ID</div><div class="lm-case-id">${c.caseId || ''}</div></div>
  <span class="lm-badge lm-badge-orange">Awaiting Acceptance</span></div>
  <div class="lm-case-type">${c.caseType || 'N/A'}</div>
  <div class="lm-details">
    <div><label>Citizen</label><strong>${citizen}</strong></div>
    <div><label>Location</label><strong>${loc}</strong></div>
  </div><div class="lm-case-actions">
    <button class="lm-btn lm-btn-success" onclick="aiOfferAccept('${c.caseId || ''}')">&#10003; Accept</button>
    <button class="lm-btn lm-btn-danger" onclick="aiOfferDecline('${c.caseId || ''}')">&#10007; Decline</button>
  </div></div>`;
        }
    });
    table.innerHTML = offersRowsHtml;
    if (_mCards) _mCards.innerHTML = offersCardsHtml;

    let searchText = (document.getElementById('lawyerCaseSearch')?.value || document.getElementById('lmCaseSearch')?.value || '').toLowerCase();

    let totalCases = _matchedOffers.length;
    let activeCases = _matchedOffers.length;
    let resolvedCases = 0;

    try {
        const currentUsername = sessionStorage.getItem('lcdjp_username');
        if (!currentUsername) {
            showAlert('Please login first', 'error');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            showAlert('Authentication token not found', 'error');
            return;
        }

        
        
        
        const userResponse = await _userRequest;

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user details');
        }

        const userResult = await userResponse.json();
        const currentUser = userResult.user || {};
        const currentLawyerSpecialization = currentUser.specialization || '';
        
        const lawyerLocation = {
            district: currentUser.district || '',
            county: currentUser.county || '',
            subCounty: currentUser.subCounty || '',
            parish: currentUser.parish || '',
            village: currentUser.village || ''
        };

        
        
        const casesResponse = await _casesRequest;

        if (!casesResponse.ok) {
            throw new Error('Failed to fetch lawyer cases');
        }

        const data = await casesResponse.json();
        
        let cases = [];
        if (data.success === true && Array.isArray(data.cases)) {
            cases = data.cases;
        } else if (Array.isArray(data)) {
            cases = data;
        } else if (data.data && Array.isArray(data.data)) {
            cases = data.data;
        } else {
            console.warn('Unexpected cases response format:', data);
            cases = [];
        }

        
        
        
        
        
        
        
        
        
        
        
        let _rowsHtml = '';
        let _cardsHtml = '';
        cases.forEach(function(c) {

            
            
            
            
            
            
            const caseRef = getCaseReference(c) || c.caseId || '';

            
            
            
            
            const _cVillage  = c.village    || c.villageRaw    || c.villageDisplay    || '';
            const _cParish   = c.parish     || c.parishRaw     || c.parishDisplay     || '';
            const _cSubCounty = c.subCounty || c.subCountyRaw  || c.subCountyDisplay  || '';
            const _cDistrict = c.district   || c.districtRaw   || c.districtDisplay   || '';

            let searchableText = [
                caseRef, c.case_type, c.citizen_name, c.citizen_id,
                _cVillage, _cParish, _cSubCounty, _cDistrict, c.status
            ].filter(Boolean).join(' ').toLowerCase();
            if (searchText && !searchableText.includes(searchText)) {
                return;
            }

           
            const isAssignedToThisLawyer = c.assigned_lawyer === currentUsername;
            const isSelectedForCase = c.selected_lawyer === currentUsername && c.selected_lawyer_status === 'Pending';
            const isAtLawyerLevel = c.current_level === "Lawyer Panel Desk" || c.assigned_level === "Lawyer Panel Desk";
            
            const caseLocation = {
                district: _cDistrict,
                subCounty: _cSubCounty,
                parish: _cParish
            };
            
            const sameDistrict = lawyerLocation.district && caseLocation.district && 
                                 lawyerLocation.district.toLowerCase() === caseLocation.district.toLowerCase();
            
            
            if (!isAssignedToThisLawyer && !isSelectedForCase && !sameDistrict) {
                return;
            }

            totalCases++;
            
            let isResolved = (c.status === "Resolved" || c.status === "Closed");
            let isAccepted = (c.status === "Accepted by Lawyer");
            let isPendingAcceptance = isSelectedForCase && c.selected_lawyer_status === 'Pending';
            
            
            const locationBadge = `
                <span style="font-size:10px; background:${sameDistrict ? '#d4edda' : '#fff3cd'}; padding:2px 8px; border-radius:10px; color:#666; display:inline-block;">
                     ${sameDistrict ? 'Local' : 'Other District'}
                </span>
            `;
            
            if (isResolved) {
                resolvedCases++;
                _rowsHtml += `
                <tr>
                    <td><strong>${caseRef}</strong></td>
                    <td>${c.case_type || 'N/A'}</td>
                    <td>${c.citizen_name || c.citizen_id || 'Unknown'}</td>
                    <td>${_cVillage || 'N/A'}, ${_cParish || 'N/A'} ${locationBadge}</td>
                    <td><span class="badge badge-resolved">Resolved</span></td>
                    <td>
                        <button onclick="viewCase('${caseRef}')" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>
                    </td>
                </tr>`;
                
            } else if (isAccepted) {
                activeCases++;
                _rowsHtml += `
                <tr>
                    <td><strong>${caseRef}</strong></td>
                    <td>${c.case_type || 'N/A'}</td>
                    <td>${c.citizen_name || c.citizen_id || 'Unknown'}</td>
                    <td>${_cVillage || 'N/A'}, ${_cParish || 'N/A'} ${locationBadge}</td>
                    <td><span class="badge badge-success">Accepted</span></td>
                    <td>
                        <button onclick="viewCase('${caseRef}')" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>
                        <button onclick="openLegalAdvice('${caseRef}')" class="btn btn-sm" style="background:#1a237e;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;" title="You are the current handler for this case">Advice</button>
                        <button onclick="resolveCase('${caseRef}')" class="btn btn-sm" style="background:#1a237e;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Resolve</button>
                        <button onclick="lawyerSendMessage('${caseRef}')" class="btn btn-sm" style="background:#1a237e;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Message</button>
                        <button onclick="showLawyerForwardForm('${caseRef}')" class="btn btn-sm" style="background:#fff;color:#1565c0;border:1px solid #1565c0;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Forward</button>
                    </td>
                </tr>`;
                
            } else if (isPendingAcceptance) {
                activeCases++;
                _rowsHtml += `
                <tr style="background: #fff8e1; border-left: 4px solid #ff9800;">
                    <td><strong>${caseRef}</strong> <span class="badge badge-warning">New</span></td>
                    <td>${c.case_type || 'N/A'}</td>
                    <td><strong>${c.citizen_name || c.citizen_id || 'Unknown'}</strong> <small style="color:#888;">Selected you</small></td>
                    <td>${_cVillage || 'N/A'}, ${_cParish || 'N/A'} ${locationBadge}</td>
                    <td><span class="badge badge-warning">Awaiting Acceptance</span></td>
                    <td>
                        <button onclick="viewCase('${caseRef}')" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;" title="View case, Accept/Decline inside">View</button>
                         <button onclick="acceptSelectedCase('${caseRef}')" class="btn btn-sm btn-success" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Accept</button>
                         <button onclick="declineSelectedCase('${caseRef}')" class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Decline</button>
                    </td>
                </tr>`;
                
            } else {
                activeCases++;
                
               
                const canAccept = !isAssignedToThisLawyer && !isSelectedForCase && 
                                  (isAtLawyerLevel || sameDistrict) && 
                                  c.status !== 'Resolved' && c.status !== 'Closed';
                
                _rowsHtml += `
                <tr>
                    <td><strong>${caseRef}</strong></td>
                    <td>${c.case_type || 'N/A'}</td>
                    <td>${c.citizen_name || c.citizen_id || 'Unknown'}</td>
                    <td>${_cVillage || 'N/A'}, ${_cParish || 'N/A'} ${locationBadge}</td>
                    <td><span class="badge badge-info">${c.status || 'Pending'}</span></td>
                    <td>
                        <button onclick="viewCase('${caseRef}')" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>
                        ${canAccept ? `
                            <button onclick="acceptAvailableCase('${caseRef}')" class="btn btn-sm btn-success">Accept</button>
                        ` : ''}
                    </td>
                </tr>`;
            }
            
            if (_mCards) {
                const _mRef  = caseRef;
                const _mStat = c.status || 'Pending';
                const _mBadgeColor = isResolved          ? '#28a745'
                                    : isPendingAcceptance ? '#ff9800'
                                    : '#1a4080';
                const _mCitizen = c.citizen_name || c.citizen_id || 'Unknown';
                const _mLoc = [_cVillage, _cParish].filter(Boolean).join(', ') || 'N/A';
                const _mOther = lawyerLocation.district && _cDistrict &&
                                lawyerLocation.district.toLowerCase() !== _cDistrict.toLowerCase();
                const _canAccM = !isAssignedToThisLawyer && !isSelectedForCase &&
                                 (isAtLawyerLevel || sameDistrict) &&
                                 c.status !== 'Resolved' && c.status !== 'Closed';

                
                
                
                const _lmPill = function (label, color, onclick, solid) {
                    return '<button type="button" onclick="' + onclick + '" ' +
                        'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;border-radius:8px;cursor:pointer;' +
                        (solid
                            ? 'background:' + color + ';color:#fff;border:1px solid ' + color + ';'
                            : 'background:#fff;color:' + color + ';border:1px solid ' + color + ';') +
                        '">' + label + '</button>';
                };

                let _mActs = '';
                if (isPendingAcceptance) {
                    _mActs = _lmPill('Accept', '#28a745', "acceptSelectedCase('" + _mRef + "')", true) +
                             _lmPill('Decline', '#dc3545', "declineSelectedCase('" + _mRef + "')", true) +
                             _lmPill('View', '#16305c', "viewCase('" + _mRef + "')", false);
                } else if (isAccepted) {
                    _mActs = _lmPill('View', '#16305c', "viewCase('" + _mRef + "')", false) +
                             _lmPill('Advise', '#23508f', "openLegalAdvice('" + _mRef + "')", false) +
                             _lmPill('Message', '#2c5fa3', "lawyerSendMessage('" + _mRef + "')", false) +
                             _lmPill('Resolve', '#3a6bc7', "resolveCase('" + _mRef + "')", false) +
                             _lmPill('Forward', '#1565c0', "showLawyerForwardForm('" + _mRef + "')", false);
                } else if (isResolved) {
                    _mActs = _lmPill('View', '#16305c', "viewCase('" + _mRef + "')", false);
                } else {
                    _mActs = _lmPill('View', '#16305c', "viewCase('" + _mRef + "')", false) +
                             (_canAccM ? _lmPill('Accept', '#28a745', "acceptAvailableCase('" + _mRef + "')", true) : '');
                }

                const _mOtherChip = _mOther
                    ? '<span style="display:inline-flex;align-items:center;margin-left:6px;padding:2px 8px;' +
                      'background:#fff3cd;color:#af7100;border-radius:10px;font-size:10px;font-weight:700;">Other District</span>'
                    : '';

                _cardsHtml += '<article class="lm-case" style="background:#fff;border:none;border-radius:12px;' +
                    'box-shadow:0 1px 6px rgba(0,0,0,.08);padding:14px 16px;margin-top:12px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
                        '<div>' +
                            '<strong style="font-size:14px;color:#1a237e;">' + _mRef + '</strong>' +
                            '<div style="font-size:12px;color:#555;margin-top:2px;">' + (c.case_type || 'N/A') + '</div>' +
                        '</div>' +
                        '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:12px;' +
                              'background:' + _mBadgeColor + ';color:#fff;white-space:nowrap;">' + _mStat + '</span>' +
                    '</div>' +
                    '<div style="font-size:12px;color:#555;margin-top:10px;">' +
                        '<strong style="color:#142047;">' + _mCitizen + '</strong> &middot; ' + _mLoc + _mOtherChip +
                    '</div>' +
                    '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">' + _mActs + '</div>' +
                '</article>';
            }
        });

        
        
        table.innerHTML += _rowsHtml;
        if (_mCards) _mCards.innerHTML += _cardsHtml;

        
        document.getElementById("lawyerTotalCases").innerHTML = totalCases;
        document.getElementById("lawyerActiveCases").innerHTML = activeCases;
        document.getElementById("lawyerResolvedCases").innerHTML = resolvedCases;
        const _lmT = document.getElementById('lmTotalCases');
        const _lmA = document.getElementById('lmActiveCases');
        const _lmR = document.getElementById('lmResolvedCases');
        if (_lmT) _lmT.textContent = totalCases;
        if (_lmA) _lmA.textContent = activeCases;
        if (_lmR) _lmR.textContent = resolvedCases;
        if (_mCards && !_mCards.innerHTML.trim()) {
            _mCards.innerHTML = searchText
                ? '<p style="text-align:center;color:#667085;padding:24px 0;">No cases match your search.</p>'
                : '<p style="text-align:center;color:#667085;padding:24px 0;">No assigned referrals found.</p>';
        }
        if (table && !table.innerHTML.trim()) {
            table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">
                ${searchText ? 'No cases match your search.' : 'No assigned referrals found.'}
            </td></tr>`;
        }

        
        
        
        
        
        
        
        
        if (_mCards) {
            const _inCasesOverlay = !!_mCards.closest('#mobileFullPage');
            if (_inCasesOverlay) {
                _mCards.classList.remove('lmc-collapsed');
            } else {
                _mCards.classList.add('lmc-collapsed');
            }
            const _moreLink = document.getElementById('lawyerMobileCardsMore');
            if (_moreLink) {
                const _totalCardCount = _mCards.querySelectorAll('.lm-case').length;
                _moreLink.style.display = (!_inCasesOverlay && _totalCardCount > 1) ? 'block' : 'none';
            }
        }

    } catch (error) {
        console.error('Error updating lawyer dashboard:', error);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#dc3545;">
            Error loading cases. Please try again.
        </td></tr>`;
    }
}


function closeDynamicView() {
    console.log(' Closing dynamic view...');
    
    clearDynamicView();
    
    const overlays = document.querySelectorAll('.modal-overlay, .dynamic-overlay, #dynamicViewOverlay, .dynamic-view-container');
    overlays.forEach(function(overlay) {
        overlay.remove();
    });
    
    const containers = document.querySelectorAll('.form-card, #dynamicViewContainer');
    containers.forEach(function(container) {
        if (container.parentNode) {
            container.remove();
        }
    });
    
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    
    const dynPage = document.getElementById('dynamicFormPage');
    if (dynPage) {
        dynPage.innerHTML = '';
        dynPage.style.display = 'none';
    }
    
    const currentUserLevel = sessionStorage.getItem('lcdjp_userlevel');
    if (isAdmin(currentUserLevel)) {
        if (typeof showAdminHome === 'function') {
            showAdminHome();
        }
    } else if (currentUserLevel === 'Lawyer') {
        if (typeof showLawyerDashboard === 'function') {
            showLawyerDashboard();
        }
    } else if (currentUserLevel === 'LC') {
        if (typeof showLcDashboard === 'function') {
            showLcDashboard();
        }
    } else {
        
        
        if (typeof showHome === 'function') {
            showHome();
        }
    }
    
    console.log(' Dynamic view closed');
}






async function loadContactRequestsForUser() {
    const username = sessionStorage.getItem('lcdjp_username');
    const role = sessionStorage.getItem('lcdjp_userlevel');
    if (!username || role !== 'Lawyer') return;
    
    try {
        const token = getAuthToken();
        const resp = await fetch(API_ENDPOINTS.contactRequestIncoming(username), {
            
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!resp.ok) {
            if (resp.status === 404) {
                console.log(' Contact requests endpoint not found');
            }
            return;
        }
        
        const requests = await resp.json();
        
        if (!requests || !Array.isArray(requests) || requests.length === 0) return;
        
        const dash = document.getElementById('lawyerDashboard');
        if (!dash) return;
        
        let panel = document.getElementById('contactRequestsPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'contactRequestsPanel';
            panel.style.cssText = 'margin:20px 0; padding:20px; background:white; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.08); border-left:4px solid #dc3545;';
            const firstSection = dash.querySelector('div[style]');
            if (firstSection) firstSection.insertAdjacentElement('afterend', panel);
            else dash.insertAdjacentElement('afterbegin', panel);
        }
        
        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; color:#dc3545;"> Contact Requests (${requests.length})</h3>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; font-size:20px; cursor:pointer; color:#999;">×</button>
        </div>`;
        
        requests.forEach(r => {
            const fromUser = r.from_username || r.sender || r.fromUsername || 'Unknown';
            const messageText = r.message || '';
            const createdAt = r.created_at || r.createdAt || new Date().toISOString();
            
            html += `<div style="padding:14px; border:1px solid #f0d0d0; border-radius:10px; margin-bottom:10px; background:#fff9f9;">
                <div style="font-weight:600; color:#333; margin-bottom:6px;"> From: ${fromUser}</div>
                ${messageText ? `<p style="margin:0 0 10px; color:#555; font-size:14px;">"${messageText}"</p>` : ''}
                <div style="font-size:12px; color:#999; margin-bottom:10px;">${new Date(createdAt).toLocaleString()}</div>
                <div style="display:flex; gap:10px;">
                    <button onclick="acceptContactRequest(${r.id}, '${fromUser}')"
                        style="padding:8px 18px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                         Accept</button>
                    <button onclick="denyContactRequest(${r.id})"
                        style="padding:8px 18px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                         Decline</button>
                </div>
            </div>`;
        });
        
        panel.innerHTML = html;
    } catch (err) {
        console.error('loadContactRequestsForUser error:', err);
    }
}


async function acceptContactRequest(requestId, fromUsername) {
    try {
        const token = getAuthToken();
        const resp = await fetch(API_ENDPOINTS.acceptContactRequest(requestId), {
            
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (resp.ok) {
            showToast(' Request accepted! You can now message ' + fromUsername);
            const panel = document.getElementById('contactRequestsPanel');
            if (panel) panel.remove();
            loadContactRequestsForUser();
            if (typeof startChatWithUser === 'function') {
                startChatWithUser(fromUsername);
            }
        } else {
            showToast(' Failed to accept request');
        }
    } catch (err) {
        showToast(' Network error');
    }
}


async function denyContactRequest(requestId) {
    if (!confirm('Decline this contact request?')) return;
    try {
        const token = getAuthToken();
        const resp = await fetch(API_ENDPOINTS.denyContactRequest(requestId), {
            
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (resp.ok) {
            showToast('Request declined.');
            loadContactRequestsForUser();
        } else {
            showToast(' Failed to decline request');
        }
    } catch (err) {
        showToast(' Network error');
    }
}









































function _lawyerResEsc(v) {
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _lawyerResPlaceholder(title) {
    return '<div class="form-card">' +
        '<h2>' + _lawyerResEsc(title) + '</h2>' +
        '<p style="color:#667085;">This resource is still being put together and isn&#39;t available yet. Check back soon.</p>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>';
}

function _lawyerRenderFormFields(title, subtitle, fields) {
    var html = '<div class="form-card"><h2>' + _lawyerResEsc(title) + '</h2>';
    if (subtitle) html += '<p style="color:#667085;font-size:13px;margin-top:-8px;">' + _lawyerResEsc(subtitle) + '</p>';
    fields.forEach(function (f, i) {
        var id = 'lcf_' + i;
        html += '<label for="' + id + '">' + _lawyerResEsc(f.label) + '</label>';
        html += (f.type === 'textarea')
            ? '<textarea id="' + id + '" rows="4" placeholder="' + _lawyerResEsc(f.placeholder || '') + '"></textarea>'
            : '<input type="text" id="' + id + '" placeholder="' + _lawyerResEsc(f.placeholder || '') + '">';
    });
    html += '<div class="form-card-btn-row">' +
        '<button type="button" onclick="window.print()">Print / Save as PDF</button>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>';
    html += '</div>';
    return html;
}

window._lawyerCopyDraftText = function () {
    var t = document.getElementById('lawyerDraftText');
    if (!t) return;
    var done = function () {
        if (typeof showToast === 'function') showToast('Copied to clipboard');
        else alert('Copied to clipboard');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t.value).then(done).catch(function () {
            t.select(); document.execCommand('copy'); done();
        });
    } else {
        t.select(); document.execCommand('copy'); done();
    }
};

function _lawyerRenderDraftTemplate(title, template) {
    return '<div class="form-card"><h2>' + _lawyerResEsc(title) + '</h2>' +
        '<p style="color:#667085;font-size:13px;margin-top:-8px;">Starting template -- edit the bracketed placeholders and review against your case facts before use.</p>' +
        '<label for="lawyerDraftText">Draft</label>' +
        '<textarea id="lawyerDraftText" rows="16" style="font-family:inherit;white-space:pre-wrap;">' + _lawyerResEsc(template) + '</textarea>' +
        '<div class="form-card-btn-row">' +
        '<button type="button" onclick="_lawyerCopyDraftText()">Copy to Clipboard</button>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>' +
        '</div>';
}


window._LAWYER_COURT_FORMS = {
    caseIntake: { title: 'Case Intake Form', fields: [
        { label: 'Client Full Name' }, { label: 'Case Reference / File No.' },
        { label: 'Nature of Matter', type: 'textarea' }, { label: 'Date Opened' },
        { label: 'Referring Party / Source' }, { label: 'Initial Notes', type: 'textarea' }
    ]},
    clientInfo: { title: 'Client Information Form', fields: [
        { label: 'Full Name' }, { label: 'Date of Birth' }, { label: 'National ID / Passport No.' },
        { label: 'Phone Number' }, { label: 'Physical Address' }, { label: 'District' },
        { label: 'Occupation' }, { label: 'Next of Kin / Emergency Contact' }
    ]},
    witnessStatement: { title: 'Witness Statement Form', fields: [
        { label: 'Witness Full Name' }, { label: 'Relationship to Case' }, { label: 'Date of Statement' },
        { label: 'Statement', type: 'textarea' }, { label: 'Signature (type full name to sign)' }
    ]},
    affidavit: { title: 'Affidavit Template', fields: [
        { label: 'Deponent Full Name' }, { label: 'Deponent Address' }, { label: 'Case Reference' },
        { label: 'Sworn Statement', type: 'textarea' }, { label: 'Date Sworn' }, { label: 'Commissioner for Oaths' }
    ]},
    landComplaint: { title: 'Land Dispute Complaint Form', fields: [
        { label: 'Complainant Name' }, { label: 'Respondent Name' }, { label: 'Land Location / Plot Description' },
        { label: 'Nature of Dispute', type: 'textarea' }, { label: 'Supporting Documents Held' }, { label: 'Date of Incident' }
    ]},
    familyComplaint: { title: 'Family Dispute Complaint Form', fields: [
        { label: 'Complainant Name' }, { label: 'Respondent Name' }, { label: 'Relationship Between Parties' },
        { label: 'Nature of Dispute', type: 'textarea' }, { label: 'Children Involved (if any)' }, { label: 'Date of Incident' }
    ]},
    debtRecovery: { title: 'Debt Recovery Claim Form', fields: [
        { label: 'Creditor Name' }, { label: 'Debtor Name' }, { label: 'Amount Owed' },
        { label: 'Date Debt Incurred' }, { label: 'Basis of Debt', type: 'textarea' }, { label: 'Prior Recovery Attempts' }
    ]},
    mediationRequest: { title: 'Community Mediation Request Form', fields: [
        { label: 'Requesting Party' }, { label: 'Other Party' }, { label: 'Nature of Dispute', type: 'textarea' },
        { label: 'Preferred Mediation Date' }, { label: 'Venue Preference' }
    ]},
    noticeOfHearing: { title: 'Notice of Hearing Form', fields: [
        { label: 'Case Reference' }, { label: 'Parties' }, { label: 'Hearing Date' }, { label: 'Hearing Time' },
        { label: 'Venue' }, { label: 'Presiding Officer' }
    ]},
    settlementAgreement: { title: 'Settlement Agreement Form', fields: [
        { label: 'Party A' }, { label: 'Party B' }, { label: 'Terms of Settlement', type: 'textarea' },
        { label: 'Date of Agreement' }, { label: 'Witness(es)' }
    ]},
    consentAgreement: { title: 'Consent Agreement Form', fields: [
        { label: 'Party A' }, { label: 'Party B' }, { label: 'Matter Consented To', type: 'textarea' },
        { label: 'Date' }, { label: 'Witness(es)' }
    ]},
    appealRequest: { title: 'Appeal Request Form', fields: [
        { label: 'Appellant Name' }, { label: 'Case Reference Being Appealed' }, { label: 'Original Decision Date' },
        { label: 'Grounds for Appeal', type: 'textarea' }, { label: 'Relief Sought', type: 'textarea' }
    ]}
};
window.showCourtForm = function (key) {
    var def = window._LAWYER_COURT_FORMS[key];
    if (typeof openDynamicView !== 'function') return;
    if (!def) { openDynamicView(_lawyerResPlaceholder('Court Form')); return; }
    openDynamicView(_lawyerRenderFormFields(def.title,
        'Standard field layout -- fill in, then print or save as PDF.', def.fields));
};


window._LC_FORMS = {
    complaintRegistration: { title: 'Complaint Registration Form (LC)', fields: [
        { label: 'Complainant Name' }, { label: 'Complainant Village / Parish' }, { label: 'Respondent Name' },
        { label: 'Nature of Complaint', type: 'textarea' }, { label: 'Date Received' }, { label: 'Received By (LC Official)' }
    ]},
    lcSummons: { title: 'LC Court Summons Form', fields: [
        { label: 'Case Reference' }, { label: 'Party Being Summoned' }, { label: 'Hearing Date' },
        { label: 'Hearing Time' }, { label: 'Venue' }, { label: 'Issued By' }
    ]},
    mediationSessionRecord: { title: 'Mediation Session Record Form', fields: [
        { label: 'Case Reference' }, { label: 'Parties Present', type: 'textarea' }, { label: 'Date of Session' },
        { label: 'Summary of Discussion', type: 'textarea' }, { label: 'Outcome', type: 'textarea' }, { label: 'Next Steps' }
    ]},
    minuteBookEntry: { title: 'LC Minute Book Entry Form', fields: [
        { label: 'Meeting / Session Date' }, { label: 'Members Present', type: 'textarea' },
        { label: 'Matters Discussed', type: 'textarea' }, { label: 'Decisions Made', type: 'textarea' }, { label: 'Recorded By' }
    ]},
    witnessStatementLc: { title: 'Witness Statement Form (LC)', fields: [
        { label: 'Case Reference' }, { label: 'Witness Name' }, { label: 'Witness Village' },
        { label: 'Statement', type: 'textarea' }, { label: 'Date Taken' }, { label: 'Taken By' }
    ]},
    referralToPolice: { title: 'Referral to Police Form', fields: [
        { label: 'Case Reference' }, { label: 'Parties Involved' }, { label: 'Reason for Referral', type: 'textarea' },
        { label: 'Police Station Referred To' }, { label: 'Date Referred' }, { label: 'Referred By' }
    ]},
    referralToCourt: { title: "Referral to Magistrate's Court Form", fields: [
        { label: 'Case Reference' }, { label: 'Parties Involved' }, { label: 'Reason for Referral', type: 'textarea' },
        { label: 'Court Referred To' }, { label: 'Date Referred' }, { label: 'Referred By' }
    ]},
    lcJudgmentOrder: { title: 'LC Court Judgment / Order Form', fields: [
        { label: 'Case Reference' }, { label: 'Parties' }, { label: 'Findings', type: 'textarea' },
        { label: 'Order / Judgment', type: 'textarea' }, { label: 'Date' }, { label: 'Presiding LC Official' }
    ]},
    communityServiceOrder: { title: 'Community Service Order Form', fields: [
        { label: 'Case Reference' }, { label: 'Party Subject to Order' }, { label: 'Nature of Service', type: 'textarea' },
        { label: 'Duration' }, { label: 'Supervising Official' }, { label: 'Date Issued' }
    ]},
    settlementAgreementLc: { title: 'Settlement Agreement Form (LC)', fields: [
        { label: 'Party A' }, { label: 'Party B' }, { label: 'Terms of Settlement', type: 'textarea' },
        { label: 'Date of Agreement' }, { label: 'Witness(es)' }
    ]},
    noticeOfHearingLc: { title: 'Notice of Hearing Form (LC)', fields: [
        { label: 'Case Reference' }, { label: 'Parties' }, { label: 'Hearing Date' }, { label: 'Hearing Time' },
        { label: 'Venue' }, { label: 'Presiding LC Official' }
    ]}
};
window.showLCForm = function (key) {
    var def = window._LC_FORMS[key];
    if (typeof openDynamicView !== 'function') return;
    if (!def) { openDynamicView(_lawyerResPlaceholder('LC Form')); return; }
    openDynamicView(_lawyerRenderFormFields(def.title,
        'Standard LC field layout -- fill in, then print or save as PDF.', def.fields));
};


window._LAWYER_CASE_DRAFTS = {
    demandLetter: { title: 'Demand Letter', template:
"Date: [Date]\n\nTo: [Recipient Name]\n[Recipient Address]\n\nRE: DEMAND FOR [PAYMENT / ACTION]\n\nDear [Recipient Name],\n\nWe act on behalf of [Client Name] in the above matter. Our client instructs us that [state facts / basis of claim].\n\nYou are hereby required to [state demand -- e.g. pay the sum of ______ / vacate the premises / cease the conduct] within [X] days of the date of this letter, failing which our client shall take further action without further notice to you.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    noticeToVacate: { title: 'Notice To Vacate Property', template:
"Date: [Date]\n\nTo: [Tenant Name]\n[Property Address]\n\nRE: NOTICE TO VACATE\n\nDear [Tenant Name],\n\nYou are hereby given notice to vacate the premises at [Property Address] on or before [Vacate Date], on the following grounds: [state grounds].\n\nPlease ensure the property is left in good condition and all keys are returned to [Landlord/Agent Name] by the above date.\n\nYours faithfully,\n\n[Lawyer Name] on behalf of [Landlord Name]" },
    landComplaintDraft: { title: 'Land Ownership Complaint', template:
"IN THE MATTER OF A LAND DISPUTE BETWEEN\n[Complainant Name] AND [Respondent Name]\n\nCOMPLAINT\n\n1. The Complainant is [description -- e.g. registered owner / occupant] of land located at [Location / Plot Description].\n2. The Respondent has [state alleged conduct -- e.g. trespassed on / encroached on] the said land since on or about [Date].\n3. The Complainant seeks [relief sought -- e.g. an order restraining the Respondent from further encroachment, and/or a determination of boundaries].\n\nDated this [Date].\n\n[Complainant Name / Signature]" },
    debtRecoveryDraft: { title: 'Debt Recovery Demand', template:
"Date: [Date]\n\nTo: [Debtor Name]\n[Debtor Address]\n\nRE: DEMAND FOR PAYMENT OF OUTSTANDING DEBT\n\nDear [Debtor Name],\n\nOur client, [Creditor Name], instructs us that you are indebted to them in the sum of [Amount], arising from [basis of debt -- e.g. a loan advanced on / goods supplied on] [Date].\n\nDespite [prior demand(s) made on Date(s), if any], the amount remains unpaid. You are required to settle this debt in full within [X] days, failing which our client will pursue further recovery action, which may include the costs of such action.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    breachAgreement: { title: 'Breach Of Agreement Letter', template:
"Date: [Date]\n\nTo: [Other Party Name]\n[Address]\n\nRE: NOTICE OF BREACH OF AGREEMENT DATED [Agreement Date]\n\nDear [Other Party Name],\n\nWe act on behalf of [Client Name]. Under the agreement between you and our client dated [Agreement Date], you were obligated to [state obligation breached].\n\nYou have failed to [state the specific breach], and our client has suffered [state effect/loss, if applicable] as a result.\n\nYou are required to remedy this breach by [state remedy sought] within [X] days, failing which our client reserves the right to pursue all available remedies.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    childCustody: { title: 'Child Custody Application', template:
"IN THE MATTER OF THE CHILD(REN): [Child Name(s), Date(s) of Birth]\nAND IN THE MATTER OF AN APPLICATION FOR CUSTODY BY [Applicant Name]\n\nAPPLICATION\n\n1. The Applicant is the [relationship -- e.g. mother / father / guardian] of the above-named child(ren).\n2. The present custody arrangement is [describe current arrangement].\n3. The Applicant seeks [relief sought -- e.g. sole custody / joint custody / defined access] on the grounds that [state grounds, focused on the best interests of the child].\n4. Proposed arrangements for the child(ren)'s welfare, education, and maintenance: [describe].\n\nDated this [Date].\n\n[Applicant Name / Signature]" },
    maintenanceRequest: { title: 'Maintenance & Support Request', template:
"Date: [Date]\n\nTo: [Respondent Name]\n[Address]\n\nRE: REQUEST FOR MAINTENANCE AND SUPPORT\n\nDear [Respondent Name],\n\nWe act on behalf of [Client Name] regarding the maintenance of [Child Name(s) / dependent(s)].\n\nOur client requests that you contribute [Amount / description of support] per [period] towards the maintenance of [Child Name(s)], with effect from [Date].\n\nPlease confirm your position within [X] days, failing which our client will pursue this matter through the appropriate forum.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    inheritanceDispute: { title: 'Inheritance Dispute Draft', template:
"IN THE MATTER OF THE ESTATE OF [Deceased's Name] (DECEASED)\nAND IN THE MATTER OF A DISPUTE BETWEEN [Party A] AND [Party B]\n\nCOMPLAINT / NOTICE OF DISPUTE\n\n1. The deceased, [Deceased's Name], passed away on [Date of Death], leaving [estate description, if known].\n2. The dispute concerns [state nature of dispute -- e.g. distribution of the estate / validity of a will / appointment of an administrator].\n3. The Complainant's position is that [state position and grounds].\n4. Relief sought: [state relief sought].\n\nDated this [Date].\n\n[Complainant Name / Signature]" },
    boundaryDispute: { title: 'Boundary Dispute Draft', template:
"IN THE MATTER OF A BOUNDARY DISPUTE BETWEEN\n[Party A] AND [Party B]\n\nCOMPLAINT\n\n1. The Complainant is the owner/occupant of land at [Location], adjoining land occupied by the Respondent at [Location].\n2. A dispute has arisen concerning the boundary between the two parcels, specifically [describe -- e.g. location of a fence, encroachment].\n3. The Complainant requests [relief sought -- e.g. a joint survey, a determination of the correct boundary].\n\nDated this [Date].\n\n[Complainant Name / Signature]" },
    employmentComplaint: { title: 'Employment Complaint Draft', template:
"Date: [Date]\n\nTo: [Employer Name]\n[Employer Address]\n\nRE: EMPLOYMENT COMPLAINT -- [Employee Name]\n\nDear Sir/Madam,\n\nWe act on behalf of [Employee Name], employed by you as [Position] since [Start Date].\n\nOur client raises the following complaint(s): [state complaint -- e.g. unpaid wages, wrongful termination, unsafe working conditions], which occurred on or around [Date].\n\nOur client seeks [relief sought -- e.g. payment of [Amount], reinstatement, a written explanation] within [X] days.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    mediationAgreement: { title: 'Mediation Agreement Draft', template:
"MEDIATION AGREEMENT\n\nBETWEEN: [Party A]\nAND: [Party B]\n\n1. The parties agree to resolve the dispute concerning [describe dispute] through mediation facilitated by [Mediator Name].\n2. The parties agree to participate in good faith and to keep the proceedings confidential.\n3. Any agreement reached will be reduced to writing and signed by both parties.\n\nDated this [Date].\n\n[Party A Signature]                              [Party B Signature]\n\n[Mediator Signature]" },
    finalSettlement: { title: 'Final Settlement Draft', template:
"FINAL SETTLEMENT AGREEMENT\n\nBETWEEN: [Party A]\nAND: [Party B]\n\nWHEREAS a dispute arose between the parties concerning [describe dispute];\n\nAND WHEREAS the parties, through mediation/negotiation, have reached a full and final settlement on the following terms:\n\n1. [Term 1]\n2. [Term 2]\n3. [Term 3]\n\nThe parties agree that this settlement is in full and final resolution of the above dispute, and neither party shall bring further claims arising from it.\n\nDated this [Date].\n\n[Party A Signature]                              [Party B Signature]\n\nWitnessed by: [Witness Name / Signature]" }
};
window.showCaseDraft = function (key) {
    var def = window._LAWYER_CASE_DRAFTS[key];
    if (typeof openDynamicView !== 'function') return;
    if (!def) { openDynamicView(_lawyerResPlaceholder('Case Draft')); return; }
    openDynamicView(_lawyerRenderDraftTemplate(def.title, def.template));
};


window._LC_CASE_DRAFTS = {
    complaintDraft: { title: 'Complaint Draft (LC)', template:
"TO THE LOCAL COUNCIL [I / II / III] COURT OF [Village/Parish/Sub-county]\n\nCOMPLAINT\n\nComplainant: [Complainant Name], of [Village]\nRespondent: [Respondent Name], of [Village]\n\n1. The Complainant states that on or about [Date], the Respondent [describe conduct complained of].\n2. The Complainant requests that the LC Court [state relief sought -- e.g. summon the Respondent, mediate the dispute, make an order].\n\nDated this [Date].\n\n[Complainant Name / Signature]" },
    noticeOfHearingDraft: { title: 'Notice of Hearing Draft (LC)', template:
"LOCAL COUNCIL [I / II / III] COURT\n[Village/Parish/Sub-county]\n\nNOTICE OF HEARING\n\nTo: [Party Name]\n\nYou are hereby notified to appear before this LC Court on [Date] at [Time], at [Venue], in the matter of [Case Reference / brief description], to [state purpose -- e.g. respond to a complaint / attend mediation].\n\nFailure to appear may result in [state consequence per local procedure].\n\nIssued by: [LC Official Name/Title]\nDate: [Date]" },
    mediationOutcomeDraft: { title: 'Mediation Outcome Record Draft', template:
"MEDIATION OUTCOME RECORD\n\nCase Reference: [Reference]\nParties: [Party A] and [Party B]\nDate of Mediation: [Date]\nMediator(s): [Name(s)]\n\n1. Summary of dispute: [describe].\n2. Points discussed: [summarize].\n3. Outcome/Agreement reached: [describe terms, or state 'No agreement reached'].\n4. Next steps: [e.g. referred to Magistrate's Court / referred to Police / case closed].\n\nSigned:\n[Party A]                              [Party B]\n\n[Mediator Signature]" },
    referralToPoliceDraft: { title: 'Referral Letter to Police (Draft)', template:
"Date: [Date]\n\nTo: The Officer in Charge\n[Police Station Name]\n\nRE: REFERRAL OF CASE -- [Case Reference / Parties]\n\nDear Sir/Madam,\n\nThis Local Council [I / II / III] refers the above matter to your office, as it falls outside the jurisdiction of the LC Court / involves a criminal element requiring police attention.\n\nSummary of the matter: [describe facts].\n\nWe request that you take appropriate action and keep this office informed of progress.\n\nYours faithfully,\n\n[LC Official Name/Title]\n[Village/Parish/Sub-county]" },
    referralToCourtDraft: { title: "Referral Letter to Magistrate's Court (Draft)", template:
"Date: [Date]\n\nTo: The Magistrate\n[Court Name]\n\nRE: REFERRAL OF CASE -- [Case Reference / Parties]\n\nDear Sir/Madam,\n\nThis Local Council [I / II / III] refers the above matter to your Court, as [state reason -- e.g. mediation was unsuccessful / the matter exceeds LC Court jurisdiction].\n\nSummary of the matter and steps taken at LC level: [describe].\n\nYours faithfully,\n\n[LC Official Name/Title]\n[Village/Parish/Sub-county]" },
    lcJudgmentDraft: { title: 'LC Court Judgment Draft', template:
"LOCAL COUNCIL [I / II / III] COURT\n[Village/Parish/Sub-county]\n\nJUDGMENT / ORDER\n\nCase Reference: [Reference]\nParties: [Party A] and [Party B]\nDate of Hearing: [Date]\n\n1. Findings of fact: [summarize].\n2. Decision: [state the order or judgment].\n3. Any party dissatisfied with this decision may appeal to [next level, e.g. LC II / Magistrate's Court] within the time allowed by law.\n\nDated this [Date].\n\n[Presiding LC Official Name/Title/Signature]" },
    warningLetterDraft: { title: 'Warning / Caution Letter Draft', template:
"Date: [Date]\n\nTo: [Party Name]\n[Village]\n\nRE: WARNING -- [Brief Description of Conduct]\n\nDear [Party Name],\n\nIt has come to the attention of this Local Council that [describe conduct], reported on/around [Date].\n\nYou are hereby cautioned to desist from this conduct with immediate effect. Failure to do so may result in [state consequence -- e.g. referral to the Magistrate's Court or Police].\n\nYours faithfully,\n\n[LC Official Name/Title]" },
    boundaryDisputeDraftLc: { title: 'Village Land Boundary Dispute Draft', template:
"IN THE MATTER OF A LAND BOUNDARY DISPUTE BEFORE THE LOCAL COUNCIL [I / II / III] COURT OF [Village]\n\nBETWEEN [Party A] AND [Party B]\n\n1. The parties occupy adjoining parcels of land at [Location].\n2. The dispute concerns [describe -- e.g. the position of a boundary marker/fence].\n3. A site visit/joint inspection was conducted on [Date] with [names of LC members present].\n4. Findings and proposed resolution: [describe].\n\nDated this [Date].\n\n[LC Official Name/Title/Signature]" },
    familyDisputeMediationDraft: { title: 'Domestic / Family Dispute Mediation Draft', template:
"FAMILY DISPUTE MEDIATION RECORD\n\nCase Reference: [Reference]\nParties: [Party A] and [Party B]\nDate: [Date]\n\n1. Nature of dispute: [describe -- e.g. maintenance, custody, domestic conflict].\n2. Note: matters involving suspected violence or abuse must be referred to Police / the Probation and Social Welfare Officer without delay -- do not mediate such matters at LC level.\n3. Points discussed: [summarize].\n4. Outcome/Agreement: [describe, or state referral made].\n\nSigned:\n[Party A]                              [Party B]\n\n[LC Official Signature]" },
    debtDisputeSettlementDraftLc: { title: 'Debt Dispute Settlement Draft (LC)', template:
"DEBT DISPUTE SETTLEMENT AGREEMENT\n\nBETWEEN: [Creditor Name]\nAND: [Debtor Name]\n\nBefore the Local Council [I / II / III] of [Village], the parties agree as follows:\n\n1. The Debtor acknowledges owing the Creditor the sum of [Amount], arising from [basis of debt].\n2. The Debtor agrees to repay this amount as follows: [repayment terms/schedule].\n3. Both parties agree this settles the matter in full upon completion of payment.\n\nDated this [Date].\n\n[Creditor Signature]                              [Debtor Signature]\n\nWitnessed by: [LC Official Name/Signature]" },
    finalSettlementDraftLc: { title: 'Final Settlement Draft (LC)', template:
"FINAL SETTLEMENT AGREEMENT (LOCAL COUNCIL LEVEL)\n\nBETWEEN: [Party A]\nAND: [Party B]\n\nWHEREAS a dispute arose between the parties concerning [describe dispute], brought before the Local Council [I / II / III] of [Village];\n\nAND WHEREAS the parties, through LC mediation, have reached a full and final settlement on the following terms:\n\n1. [Term 1]\n2. [Term 2]\n3. [Term 3]\n\nThe parties agree that this settlement is in full and final resolution of the above dispute at Local Council level.\n\nDated this [Date].\n\n[Party A Signature]                              [Party B Signature]\n\nWitnessed by: [LC Official Name/Signature]" }
};
window.showLCCaseDraft = function (key) {
    var def = window._LC_CASE_DRAFTS[key];
    if (typeof openDynamicView !== 'function') return;
    if (!def) { openDynamicView(_lawyerResPlaceholder('LC Case Draft')); return; }
    openDynamicView(_lawyerRenderDraftTemplate(def.title, def.template));
};


window._lawyerCalcInterest = function () {
    var p = parseFloat(document.getElementById('lcPrincipal').value) || 0;
    var r = parseFloat(document.getElementById('lcRate').value) || 0;
    var t = parseFloat(document.getElementById('lcTime').value) || 0;
    var interest = p * (r / 100) * t;
    var total = p + interest;
    var out = document.getElementById('lcResult');
    if (out) out.innerHTML = '<strong>Interest:</strong> ' + interest.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
        '<br><strong>Total (Principal + Interest):</strong> ' + total.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
function _lawyerRenderCaseCalculator() {
    return '<div class="form-card"><h2>Case Calculator</h2>' +
        '<p style="color:#667085;font-size:13px;margin-top:-8px;">Simple interest calculator for claim amounts. Enter your own principal and applicable rate -- this tool does not set or verify legal interest rates for any case.</p>' +
        '<label for="lcPrincipal">Principal Amount</label><input type="number" id="lcPrincipal" placeholder="e.g. 2000000">' +
        '<label for="lcRate">Interest Rate (% per period)</label><input type="number" id="lcRate" placeholder="e.g. 5">' +
        '<label for="lcTime">Number of Periods</label><input type="number" id="lcTime" placeholder="e.g. 12">' +
        '<button type="button" onclick="_lawyerCalcInterest()">Calculate</button>' +
        '<div id="lcResult" style="margin-top:14px;font-size:14px;color:#1a3270;"></div>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>';
}
window._LAWYER_EVIDENCE_CHECKLIST_ITEMS = [
    'Signed witness statements collected',
    'Photographic evidence labelled and dated',
    'Original documents secured (contracts, receipts, correspondence)',
    'Copies made of all originals',
    'Chain of custody noted for physical evidence',
    'Relevant dates and timeline documented',
    'Expert or professional opinions obtained (if applicable)',
    'Evidence cross-checked against case facts',
    'All evidence organised and indexed for the case file'
];
window.showEvidenceChecklist = function () {
    if (typeof openDynamicView !== 'function') return;
    var rows = window._LAWYER_EVIDENCE_CHECKLIST_ITEMS.map(function (item, i) {
        var id = 'lec_' + i;
        return '<li style="list-style:none;padding:10px 4px;border-bottom:1px solid #eef1f8;display:flex;align-items:center;gap:10px;">' +
            '<input type="checkbox" id="' + id + '" style="width:18px;height:18px;flex-shrink:0;">' +
            '<label for="' + id + '" style="margin:0;font-weight:400;flex:1;">' + _lawyerResEsc(item) + '</label></li>';
    }).join('');
    openDynamicView('<div class="form-card"><h2>Evidence Checklist</h2>' +
        '<p style="color:#667085;font-size:13px;margin-top:-8px;">General checklist -- add or skip items as relevant to your case.</p>' +
        '<ul style="padding:0;margin:0;">' + rows + '</ul>' +
        '<button type="button" onclick="closeDynamicView()" style="margin-top:16px;background:#eee;color:#333;">Back</button>' +
        '</div>');
};
window._LAWYER_TOOLKIT_TITLES = {
    legalFeesGuide: 'Legal Fees Guide', courtFeeGuide: 'Court Fee Guide',
    timelineTracker: 'Case Timeline Tracker', clientMeetingNotes: 'Client Meeting Notes',
    appointmentScheduler: 'Appointment Scheduler', documentVault: 'Document Vault'
};
window.showToolkit = function (key) {
    if (typeof openDynamicView !== 'function') return;
    if (key === 'caseCalculator') { openDynamicView(_lawyerRenderCaseCalculator()); return; }
    if (key === 'evidenceChecklist') { window.showEvidenceChecklist(); return; }
    openDynamicView(_lawyerResPlaceholder(window._LAWYER_TOOLKIT_TITLES[key] || 'Toolkit'));
};









window._LAWYER_LEGAL_RESEARCH_TITLES = {
    constitution: 'Constitution of Uganda', landAct: 'Land Act', successionAct: 'Succession Act',
    marriageAct: 'Marriage Act', childrenAct: 'Children Act'
};
window.showLegalResearch = function (key) {
    var label = window._LAWYER_LEGAL_RESEARCH_TITLES[key];
    _lawyerOpenKnowledgePanel({
        panelTitle: 'Legal Research',
        subtitle: 'Search verified statutes and legal provisions, or start with a topic:',
        category: 'Legal Research',
        suggestions: Object.keys(window._LAWYER_LEGAL_RESEARCH_TITLES).map(function (k) {
            var t = window._LAWYER_LEGAL_RESEARCH_TITLES[k];
            return { q: 'Explain the ' + t + ' and its key provisions relevant to a lawyer\'s practice in Uganda.', label: t };
        }),
        prefillQuery: label ? ('Explain the ' + label + ' and its key provisions relevant to a lawyer\'s practice in Uganda.') : null
    });
};

window._LAWYER_MEDIATION_GUIDELINE_TITLES = {
    principles: 'Principles of Mediation', roleOfMediator: 'Role of the Mediator',
    preparing: 'Preparing for Mediation', conducting: 'Conducting a Mediation Session',
    familyDisputes: 'Managing Family Disputes', landDisputes: 'Managing Land Disputes',
    communityConflicts: 'Managing Community Conflicts', debtDisputes: 'Managing Debt Disputes',
    sensitiveCases: 'Handling Sensitive Cases', recordingOutcomes: 'Recording Mediation Outcomes',
    settlementAgreements: 'Writing Settlement Agreements', referToCourt: 'When to Refer Cases to Court',
    referToPolice: 'When to Refer Cases to Police'
};
window.showMediationGuideline = function (key) {
    var label = window._LAWYER_MEDIATION_GUIDELINE_TITLES[key];
    _lawyerOpenKnowledgePanel({
        panelTitle: 'Mediation Guidelines',
        subtitle: "Search Uganda's community mediation guidance, or start with a topic:",
        category: 'Mediation Guidelines',
        suggestions: Object.keys(window._LAWYER_MEDIATION_GUIDELINE_TITLES).map(function (k) {
            var t = window._LAWYER_MEDIATION_GUIDELINE_TITLES[k];
            return { q: 'Explain best practice for ' + t + ' for a community mediator in Uganda.', label: t };
        }),
        prefillQuery: label ? ('Explain best practice for ' + label + ' for a community mediator in Uganda.') : null
    });
};

window._LC_MEDIATION_GUIDELINE_TITLES = {
    jurisdiction: 'Jurisdiction of LC Courts', principles: 'Principles of Mediation at LC Level',
    roleOfMediator: 'Role of the LC Chairperson as Mediator', preparing: 'Preparing for a Mediation Session',
    conducting: 'Conducting a Mediation Session', familyDisputes: 'Managing Family & Domestic Disputes',
    landDisputes: 'Managing Land & Boundary Disputes', debtDisputes: 'Managing Debt & Property Disputes',
    communityConflicts: 'Managing Community & Neighbour Conflicts', sensitiveCases: 'Handling Sensitive Cases (GBV & Minors)',
    recordingOutcomes: 'Recording Mediation Outcomes & LC Minutes', settlementAgreements: 'Writing Settlement Agreements',
    referToCourt: "When to Refer Cases to the Magistrate's Court", referToPolice: 'When to Refer Cases to Police'
};
window.showLCMediationGuideline = function (key) {
    var label = window._LC_MEDIATION_GUIDELINE_TITLES[key];
    _lawyerOpenKnowledgePanel({
        panelTitle: 'Mediation Guidelines (LC Level)',
        subtitle: "Search Local Council mediation guidance from the Law Library, or start with a topic:",
        category: 'LC Mediation Guidelines',
        role: 'Local Council officials',
        suggestions: Object.keys(window._LC_MEDIATION_GUIDELINE_TITLES).map(function (k) {
            var t = window._LC_MEDIATION_GUIDELINE_TITLES[k];
            return { q: 'Explain best practice for ' + t + ' for a Local Council (LC) official in Uganda.', label: t };
        }),
        prefillQuery: label ? ('Explain best practice for ' + label + ' for a Local Council (LC) official in Uganda.') : null
    });
};







window._LAWYER_LAW_LIBRARY_TITLES = {
    constitution: 'Constitution', landLaws: 'Land Laws', familyLaws: 'Family Laws',
    marriageDivorce: 'Marriage & Divorce', successionInheritance: 'Succession & Inheritance',
    childrenRights: "Children's Rights", employmentLaws: 'Employment Laws', criminalLaw: 'Criminal Law Basics',
    humanRights: 'Human Rights', localCouncilLaws: 'Local Council Laws', courtProcedures: 'Court Procedures',
    legalForms: 'Legal Forms'
};




window._LAW_LIBRARY_SUGGESTIONS = [
    'What are the legal requirements for a valid marriage in Uganda?',
    'What does the law say about child custody after separation?',
    'What is the procedure for registering land under the Land Act?',
    'What are the grounds for divorce under Ugandan law?',
    "What are an employee's rights if dismissed without notice?",
    'How is an estate distributed when someone dies without a will?'
];




window.showLawLibrarySearch = function (prefillQuery) {
    _lawyerOpenKnowledgePanel({
        panelTitle: 'Law Library',
        subtitle: 'Search the Legal Knowledge library, or start with a common question:',
        category: 'Law Library',
        suggestions: window._LAW_LIBRARY_SUGGESTIONS.map(function (q) { return { q: q, label: q }; }),
        prefillQuery: prefillQuery || null
    });
};





window.showLawLibrary = function (key) {
    var label = window._LAWYER_LAW_LIBRARY_TITLES[key];
    window.showLawLibrarySearch(label ? ('Tell me about ' + label + ' under Ugandan law.') : null);
};










var _lawyerKnowledgeCategory = 'Law Library';
var _lawyerKnowledgeRole = 'lawyers';
function _lawyerOpenKnowledgePanel(opts) {
    if (typeof openDynamicView !== 'function') return;
    _lawyerKnowledgeCategory = opts.category || 'Law Library';
    _lawyerKnowledgeRole = opts.role || 'lawyers';
    var chips = (opts.suggestions || []).map(function (s) {
        return '<li class="lr-item" onclick="_lawLibraryAsk(\'' + s.q.replace(/'/g, "\\'") + '\')">'
            + _lawyerResEsc(s.label) + '</li>';
    }).join('');
    var html = '<div class="form-card" id="lawLibraryPanel">' +
        '<h2>' + _lawyerResEsc(opts.panelTitle) + '</h2>' +
        '<p style="color:#667085;font-size:13px;margin-top:-8px;">' + _lawyerResEsc(opts.subtitle) + '</p>' +
        '<label for="lawLibraryQuery" style="margin-top:12px;">Ask a legal question</label>' +
        '<input type="text" id="lawLibraryQuery" placeholder="e.g. What is the process for a land title transfer?" onkeypress="if(event.key===\'Enter\'){event.preventDefault();_lawLibrarySubmit();}">' +
        '<div class="form-card-btn-row">' +
        '<button type="button" id="lawLibrarySearchBtn" onclick="_lawLibrarySubmit()">Search</button>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>' +
        '<div id="lawLibrarySuggestionsWrap" style="margin-top:16px;">' +
        '<p style="color:#667085;font-size:12px;margin:0 0 6px;">Or start with a common question:</p>' +
        '<ul id="lawLibrarySuggestions">' + chips + '</ul>' +
        '</div>' +
        '<div id="lawLibraryResult" style="margin-top:18px;"></div>' +
        '</div>';
    openDynamicView(html);
    if (opts.prefillQuery) {
        setTimeout(function () {
            var field = document.getElementById('lawLibraryQuery');
            if (field) field.value = opts.prefillQuery;
            window._lawLibrarySubmit();
        }, 0);
    }
}

window._lawLibraryAsk = function (question) {
    var field = document.getElementById('lawLibraryQuery');
    if (field) field.value = question;
    window._lawLibrarySubmit();
};

window._lawLibrarySubmit = function () {
    var field = document.getElementById('lawLibraryQuery');
    var q = field ? field.value.trim() : '';
    var out = document.getElementById('lawLibraryResult');
    if (!q) {
        if (out) out.innerHTML = '<p style="color:#c0392b;font-size:13px;">Type a question or tap a suggestion above.</p>';
        return;
    }
    var btn = document.getElementById('lawLibrarySearchBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Searching…'; }
    if (out) out.innerHTML = '<p style="color:#667085;font-size:13px;">Searching the Legal Knowledge library…</p>';
    
    
    var suggWrap = document.getElementById('lawLibrarySuggestionsWrap');
    if (suggWrap) suggWrap.style.display = 'none';

    _lawLibraryQuery(q, _lawyerKnowledgeCategory, _lawyerKnowledgeRole).then(function (res) {
        if (btn) { btn.disabled = false; btn.textContent = 'Search'; }
        if (!out) return;
        if (!res || !res.reply) {
            out.innerHTML = '<p style="color:#c0392b;font-size:13px;">The Legal Knowledge library is unavailable right now. Please try again shortly.</p>';
            return;
        }
        var sourcesHtml = '';
        if (Array.isArray(res.sources) && res.sources.length) {
            sourcesHtml = '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #eef1f8;font-size:12px;color:#667085;">' +
                '<strong>Sources:</strong><ul style="margin:6px 0 0;padding-left:18px;">' +
                res.sources.map(function (s) {
                    var lbl = [s.documentTitle, s.legalSection].filter(Boolean).join(', ');
                    return '<li>' + _lawyerResEsc(lbl || 'Legal Knowledge library') + '</li>';
                }).join('') + '</ul></div>';
        }
        out.innerHTML = '<div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">' +
            _lawyerResEsc(res.reply) + '</div>' + sourcesHtml;
    });
};










function _lawLibraryQuery(question, category, role) {
    var cat = category || 'Law Library';
    var aud = role || 'lawyers';
    var sysCtx = 'You are the ' + cat + ', a Legal Knowledge lookup feature inside JusticeLink (LCDJP), used by '
        + 'verified ' + aud + ' to search the platform\'s verified legal knowledge base. Answer the question directly '
        + 'and precisely, citing the relevant law, section, or procedure where the material supports it. Never '
        + 'refer to yourself as an AI, assistant, chatbot, model, or automated system, and never mention that a '
        + 'model or automated system produced this answer -- respond simply as the ' + cat + ' / Legal Knowledge '
        + 'library itself.';
    var payload = {
        message: question,
        context: sysCtx,
        category: cat,
        sessionId: sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || 'lawyer'
    };
    return fetch(API_BASE_URL + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
          if (!data || data.fallback) return null;
          return { reply: data.reply, sources: data.sources || [] };
      })
      .catch(function () { return null; });
}