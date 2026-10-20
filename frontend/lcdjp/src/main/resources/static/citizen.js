






// Plays one voice recording at a time; clicking the same button again pauses/resumes.
// `src` is a /api/voice/{id} URL or a legacy base64 data URI.
var _lcdjpVoiceAudio = null;
var _lcdjpVoiceButton = null;
function _lcdjpVoiceLabel(btn, playing) {
    if (!btn) return;
    var isIcon = btn.textContent.trim() === '\u25B6' || btn.textContent.trim() === '\u23F8';
    btn.textContent = isIcon ? (playing ? '\u23F8' : '\u25B6') : (playing ? 'Pause' : 'Play');
}
function playVoiceMessage(src, btn) {
    try {
        if (!src) return;
        if (_lcdjpVoiceAudio && _lcdjpVoiceButton === btn) {
            if (_lcdjpVoiceAudio.paused) { _lcdjpVoiceAudio.play(); _lcdjpVoiceLabel(btn, true); }
            else { _lcdjpVoiceAudio.pause(); _lcdjpVoiceLabel(btn, false); }
            return;
        }
        if (_lcdjpVoiceAudio) { _lcdjpVoiceAudio.pause(); _lcdjpVoiceLabel(_lcdjpVoiceButton, false); }
        var audio = new Audio(src);
        _lcdjpVoiceAudio = audio;
        _lcdjpVoiceButton = btn;
        audio.addEventListener('ended', function () { _lcdjpVoiceLabel(btn, false); });
        audio.addEventListener('error', function () { _lcdjpVoiceLabel(btn, false); });
        _lcdjpVoiceLabel(btn, true);
        var started = audio.play();
        if (started && started.catch) started.catch(function () { _lcdjpVoiceLabel(btn, false); });
    } catch (e) {
        if (btn) _lcdjpVoiceLabel(btn, false);
    }
}
window.playVoiceMessage = playVoiceMessage;

function _getCitizenToken() {
    try {
        if (typeof getAuthToken === 'function') return getAuthToken();
        return (typeof getAuthToken === 'function' ? getAuthToken() : null) || null;
    } catch (e) {
        return null;
    }
}

function _isCitizenAuthenticated() {
    var token = _getCitizenToken();
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

function _getCitizenAuthHeaders() {
    var token = _isCitizenAuthenticated() ? _getCitizenToken() : null;
    
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}






function _lcdjpNormalizeLCLevel(value) {
    var role = String(value || '').trim().toLowerCase();
    if (role === 'lc' || role === 'lc official' ||
        role === 'lc1' || role.indexOf('lc1 ') === 0 ||
        role === 'lc2' || role.indexOf('lc2 ') === 0 ||
        role === 'lc3' || role.indexOf('lc3 ') === 0) {
        return 'LC';
    }
    return '';
}

function _lcdjpIsApprovedLCUser(user) {
    if (!user) return false;
    var role = _lcdjpNormalizeLCLevel(user.role || user.userType || user.requestedRole || user.requested_role);
    var status = String(user.approvalStatus || user.approval_status || '').trim().toLowerCase();
    var verificationStatus = String(user.verificationStatus || user.verification_status || '').trim().toLowerCase();
    return !!role && (status === 'approved' || verificationStatus === 'approved' || verificationStatus === 'verified');
}


function toggleNotifications() {
    let userLevel = sessionStorage.getItem("lcdjp_userlevel");
    let username = sessionStorage.getItem("lcdjp_username");
    
    console.log("toggleNotifications called - UserLevel:", userLevel);
    console.log("Username from session:", username);
    
    if (isAdmin(userLevel)) {
        console.log("Admin notifications toggled (bypassing username check)");

        if (window.innerWidth <= 767 && typeof mobileAdminNotifications === 'function') {
            var mobileAdminPanel = document.getElementById('mobileAdminNotificationsPanel');
            if (mobileAdminPanel) {
                var adminCloseBtn = mobileAdminPanel.querySelector('.mobile-role-panel-close');
                if (adminCloseBtn) adminCloseBtn.click(); else mobileAdminPanel.remove();
                console.log("Admin Notifications hidden (mobile)");
            } else {
                mobileAdminNotifications();
                console.log("Admin Notifications shown (mobile)");
            }
            return;
        }

        let page = document.getElementById("adminNotificationsPage");
        
        if (!page) {
            console.log("Creating admin notifications page...");
            createAdminNotificationsPage();
            page = document.getElementById("adminNotificationsPage");
        }
        
        if (!page) {
            console.error("Failed to create adminNotificationsPage");
            alert("Error loading notifications. Please refresh.");
            return;
        }
        
        const isVisible = page.style.display === 'block';
        console.log("Current page state - display:", page.style.display, "isVisible:", isVisible);
        
        if (isVisible) {
            
            
            if (typeof _lcdjpCloseAdminNotifDropdown === 'function') {
                _lcdjpCloseAdminNotifDropdown();
            } else {
                page.style.display = 'none';
                page.style.visibility = 'hidden';
            }
            showAdminHome();
            console.log("Admin Notifications hidden");
        } else {
            hideAllDashboardViews();
            const adminDashEl = document.getElementById('adminDashboard');
            if (adminDashEl) adminDashEl.style.display = 'block';
            
            
            
            
            if (typeof _lcdjpOpenAdminNotifDropdown === 'function') {
                _lcdjpOpenAdminNotifDropdown();
            } else {
                page.style.display = 'block';
                page.style.visibility = 'visible';
                page.style.opacity = '1';
            }
            
            renderAdminNotificationPage();
            
            if (typeof renderNavbarNotifBadge === 'function') {
                renderNavbarNotifBadge();
            }
            
            console.log("Admin Notifications shown");
        }
        return;
    }
    
    if (!username) {
        console.warn("No username found for non-admin user");
        if (typeof restoreSessionData === 'function') restoreSessionData();
        username = sessionStorage.getItem("lcdjp_username") || localStorage.getItem("lcdjp_username");
        if (!username) {
            alert("Please login again to view notifications.");
            return;
        }
    }
    
    if (userLevel === 'Lawyer') {
        console.log("Lawyer notifications toggled");
        if (window.innerWidth <= 767 && typeof mobileLawyerNotifications === 'function') {
            var mobilePanel = document.getElementById('mobileLawyerNotificationsPanel');
            if (mobilePanel) {
                var closeBtn = mobilePanel.querySelector('.mobile-role-panel-close');
                if (closeBtn) closeBtn.click(); else mobilePanel.remove();
                console.log('Lawyer Notifications hidden (mobile)');
            } else {
                mobileLawyerNotifications();
                console.log('Lawyer Notifications shown (mobile)');
            }
            return;
        }
        let page = document.getElementById("lawyerNotificationsPage");
        if (page && page.style.display === 'block') {
            page.style.display = 'none';
            showLawyerDashboard();
            console.log('Lawyer Notifications hidden');
        } else {
            showLawyerNotificationsPage();
            console.log('Lawyer Notifications shown');
        }
        return;
    }
    
    if (userLevel === 'LC') {
        console.log("LC notifications toggled");
        hideAllDashboardViews();
        let page = document.getElementById("lcNotificationsPage");
        if (page && page.style.display === 'block') {
            page.style.display = 'none';
            showLcDashboard();
            console.log('LC Notifications hidden');
        } else {
            if (!page) {
                const lcNotifPage = document.createElement('div');
                lcNotifPage.id = 'lcNotificationsPage';
                lcNotifPage.className = 'dashboard-view';
                lcNotifPage.style.display = 'block';
                lcNotifPage.innerHTML = `
                    <div style="background:white; border-radius:12px; padding:25px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h2 style="color:#1a4080; margin:0;">Notifications</h2>
                            <button onclick="closeNotifications()" aria-label="Close notifications" style="padding:8px 16px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">Close</button>
                        </div>
                        <div id="lcNotificationsContainer"></div>
                    </div>
                `;
                document.getElementById('contentArea').appendChild(lcNotifPage);
                page = lcNotifPage;
            } else {
                page.style.display = 'block';
            }
            if (typeof loadLcNotifications === 'function') loadLcNotifications().catch(console.error);
            console.log('LC Notifications shown');
        }
        return;
    }

    if (userLevel === 'Citizen') {
        console.log("Citizen notifications toggled");
        hideAllDashboardViews();
        let page = document.getElementById("citizenNotificationsPage");
        if (page && page.style.display === 'block') {
            page.style.display = 'none';
            showHome();
            console.log('Citizen Notifications hidden');
        } else {
            if (!page) {
                const citizenNotifPage = document.createElement('div');
                citizenNotifPage.id = 'citizenNotificationsPage';
                citizenNotifPage.className = 'dashboard-view';
                citizenNotifPage.style.display = 'block';
                citizenNotifPage.innerHTML = `
                    <div style="background:white; border-radius:12px; padding:25px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h2 style="color:#1a4080; margin:0;"> My Notifications</h2>
                            <button onclick="closeNotifications()" aria-label="Close notifications" style="padding:8px 16px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;"> Close</button>
                        </div>
                        <div id="notificationsContainer"></div>
                    </div>
                `;
                document.getElementById('contentArea').appendChild(citizenNotifPage);
                page = citizenNotifPage;
            } else {
                page.style.display = 'block';
            }
            loadCitizenNotifications().catch(console.error);
            console.log('Citizen Notifications shown');
        }
        return;
    }
    
    console.warn("Unknown user level:", userLevel);
}

function getNotificationTypeLabel(type) {
    const labels = {
        'case_submitted': 'New Case',
        'case_accepted': 'Case Accepted',
        'case_resolved': 'Case Resolved',
        'case_forwarded': 'Case Forwarded',
        'new_message': 'New Message',
        'lawyer_message': ' Lawyer Message',
        'chat_reply': ' Chat Reply',
        'voice_message': ' Voice Message',
        'urgent': 'URGENT',
        'subscription': 'Subscription',
        'document_shared': ' Document Shared',
        'appointment': ' Appointment',
        'system': 'System',
        'account_approved': ' Account Approved',
        'account_rejected': ' Account Rejected',
        'lawyer_selected': ' Lawyer Selected',
        'lawyer_selection': ' Lawyer Selection',
        'lawyer_pool': ' Lawyer Pool',
        'case_referred': ' Case Referred'
    };
    return labels[type] || ' Notification';
}






async function loadCitizenNotifications() {
    const username = sessionStorage.getItem("lcdjp_username");
    if (!username) return;

    
    const headers = _getCitizenAuthHeaders();
    
    let myNotifications = [];
    try {
       const resp = await fetch(API_ENDPOINTS.userNotifications(username), {
    headers: headers,
    suppressAuthRedirect: true  
});
        if (resp.ok) {
            const data = await resp.json();
            myNotifications = Array.isArray(data) ? data : (data.notifications || []);
            
            
           fetch(API_ENDPOINTS.markAllNotificationsRead(username), {
    method: 'PUT',
    headers: headers,
    suppressAuthRedirect: true
            }).catch(e => console.warn('mark-read failed:', e));
        } else {
            
            console.warn('loadCitizenNotifications API error, using local store');
            const notifications = _lcdjpStore.notifications;
            myNotifications = notifications.filter(n => n.username === username);
        }
    } catch (err) {
        console.warn('loadCitizenNotifications API error, using local store:', err);
        const notifications = _lcdjpStore.notifications;
        myNotifications = notifications.filter(n => n.username === username);
    }
    
    let html = "";
    let container = document.getElementById("notificationsContainer");
    if (!container) return;
    
    if (myNotifications.length === 0) {
        html = `
            <div style="text-align:center; padding:60px; color:#999;">
                <div style="font-size:48px; margin-bottom:15px;"></div>
                <p style="font-size:18px; font-weight:bold;">No Notifications</p>
                <p style="font-size:14px;">You have no notifications at this time.</p>
            </div>
        `;
    } else {
        const sorted = [...myNotifications].sort((a, b) =>
            new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
        const isMobileNotif = window.innerWidth < 768;
        sorted.forEach(notification => {
            const nType   = notification.type || '';
            
            
            
            
            
            
            const nCaseId = typeof getNotificationCaseReference === 'function'
                ? getNotificationCaseReference(notification)
                : getCaseIdentifier(notification);
            const isUnread = !notification.is_read && notification.is_read !== 1;

            let accent = '#1a4080', icon = '\u{1F514}', title = getNotificationTypeLabel(nType) || 'Notification';
            if (nType === 'case_declined')       { accent = '#dc3545'; icon = '\u26A0\uFE0F'; title = 'Lawyer Declined'; }
            else if (nType === 'case_accepted')  { accent = '#28a745'; icon = '\u2705';        title = 'Case Accepted'; }
            else if (nType === 'case_resolved')  { accent = '#6c757d'; icon = '\u{1F512}';     title = 'Case Resolved'; }
            else if (['new_message','lawyer_message','lc_message','citizen_message','chat_reply','voice_message'].includes(nType)) {
                accent = '#1565c0'; icon = '\u{1F4AC}'; title = 'New Message';
            }
            else if (nType === 'appointment')    { accent = '#ff9800'; icon = '\u{1F4C5}'; title = 'Appointment'; }
            else if (nType === 'case_forwarded') { accent = '#9c27b0'; icon = '\u27A1\uFE0F'; title = 'Case Forwarded'; }
            else if (nType === 'lawyer_selected'){ accent = '#00897b'; icon = '\u2696\uFE0F'; title = 'Lawyer Selected'; }
            else if (nType === 'org_case_interest'){ accent='#e65100'; icon='\u{1F3E2}';      title='Organisation Interest'; }
            else if (nType === 'case_referred')  { accent = '#f57c00'; icon = '\u27A1\uFE0F'; title = 'Case Referred'; }

            const isMessageType = ['new_message','lawyer_message','lc_message','citizen_message','chat_reply','voice_message'].includes(nType);

            let extraActions = '';
            if (nType === 'case_declined' && nCaseId) {
                extraActions = `
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                        <button onclick="event.stopPropagation(); showLawyerSelectionForDeclinedCase(${escapeHtml(JSON.stringify(String(nCaseId)))})" style="flex:1; padding:8px 14px; background:#1a4080; color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
                            \u2696\uFE0F Choose Another Lawyer
                        </button>
                        <button onclick="event.stopPropagation(); viewCitizenCase(${escapeHtml(JSON.stringify(String(nCaseId)))})" style="flex:1; padding:8px 14px; background:#6c757d; color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px;">
                            View Case Details
                        </button>
                    </div>`;
            } else if (nType === 'case_referred' && nCaseId) {
                extraActions = `
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                        <button onclick="event.stopPropagation(); reopenReferredCase(${escapeHtml(JSON.stringify(String(nCaseId)))})" style="flex:1; padding:8px 14px; background:#1a4080; color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
                            \u{1F504} Choose New Handler
                        </button>
                        <button onclick="event.stopPropagation(); viewCitizenCase(${escapeHtml(JSON.stringify(String(nCaseId)))})" style="flex:1; padding:8px 14px; background:#6c757d; color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px;">
                            View Case Details
                        </button>
                    </div>`;
            } else if (isMessageType && nCaseId) {
                extraActions = `
                    <div style="margin-top:8px;">
                        <button onclick="event.stopPropagation(); toggleNotifications(); setTimeout(()=>openCitizenMessaging(${escapeHtml(JSON.stringify(String(nCaseId)))}), 200);" style="padding:6px 16px; background:#1a4080; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">
                            \u{1F4AC} Open Chat
                        </button>
                    </div>`;
            }

            
            
            
            
            
            const openCall = `lcdjpOpenNotification(${JSON.stringify({ id: notification.id || notification._id, type: nType, caseId: nCaseId || '' }).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')})`;

            if (isMobileNotif) {
                
                
                
                
                const mobileClick = nCaseId ? openCall : 'lcdjpToggleNotifCard(this)';
                html += `
                    <div class="notification-card" style="display:block; background:${isUnread ? '#f0f5ff' : 'white'}; border-radius:12px; padding:14px 15px; margin-bottom:10px; box-shadow:0 2px 8px rgba(0,0,0,0.08); cursor:pointer;"
                         onclick="${mobileClick}">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-weight:700; color:${accent}; font-size:14px;">${title}</span>
                            ${isUnread ? '<span style="background:'+accent+';color:white;border-radius:8px;padding:1px 7px;font-size:10px;font-weight:700;">NEW</span>' : ''}
                            ${nCaseId ? '<span style="font-size:11px;color:#888;">Case: '+nCaseId+'</span>' : ''}
                            <span class="lcdjp-notif-chevron" style="margin-left:auto; font-size:11px; color:#999; transition:transform .2s;">&#9662;</span>
                        </div>
                        <div style="margin-top:3px; font-size:11px; color:#6b7280;">${escapeHtml(notification.date || notification.timestamp || '')}</div>
                        <div class="lcdjp-notif-body" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #eef0f6;">
                            <div style="color:#333; line-height:1.5; font-size:13px;">${escapeHtml(notification.message)}</div>
                            ${extraActions}
                        </div>
                    </div>
                `;
            } else {
                
                
                
                
                html += `
                    <div class="notification-card" style="display:flex; align-items:flex-start; background:${isUnread ? '#f0f5ff' : 'white'}; border-radius:12px; padding:15px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); transition:box-shadow 0.2s; cursor:pointer;"
                         onclick="${openCall}"
                         onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                                <span style="font-weight:700; color:${accent}; font-size:14px;">${title}</span>
                                ${isUnread ? '<span style="background:'+accent+';color:white;border-radius:8px;padding:1px 7px;font-size:10px;font-weight:700;">NEW</span>' : ''}
                                ${nCaseId ? '<span style="font-size:11px;color:#888;">Case: '+nCaseId+'</span>' : ''}
                            </div>
                            <div style="color:#333; line-height:1.5; font-size:13px;">${escapeHtml(notification.message)}</div>
                            <div style="margin-top:6px; font-size:11px; color:#6b7280;">${escapeHtml(notification.date || notification.timestamp || '')}</div>
                            ${extraActions}
                        </div>
                    </div>
                `;
            }
        });
    }
    
    container.innerHTML = html;
    renderNavbarNotifBadge();
}



window.lcdjpToggleNotifCard = function (card) {
    if (!card) return;
    var body = card.querySelector('.lcdjp-notif-body');
    var chevron = card.querySelector('.lcdjp-notif-chevron');
    if (!body) return;
    var isOpen = body.style.display === 'block';
    body.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
};





async function showLawyerSelectionForDeclinedCase(caseId) {
    if (typeof toggleNotifications === 'function') try { toggleNotifications(); } catch(e){}
    try {
        const headers = _getCitizenAuthHeaders();
        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) { 
            if (caseResp.status === 401 || caseResp.status === 403) {
                
                console.warn('Authentication required to view lawyer selection');
                return;
            }
            alert('Could not load case details.'); 
            return; 
        }
        const raw = await caseResp.json();
        const foundCase = raw.case || raw;

        let lawyerList = [];
        for (const key of ['available_lawyers','availableLawyers']) {
            if (foundCase[key]) { try { lawyerList = typeof foundCase[key]==='string' ? JSON.parse(foundCase[key]) : foundCase[key]; } catch(e){} break; }
        }

        let legalOrgs = [];
        try {
            const orgResp = await fetch(API_ENDPOINTS.legalOrgs, { headers: headers });
            if (orgResp.ok) legalOrgs = await orgResp.json();
        } catch(e) {}

        const modal = document.createElement('div');
        modal.setAttribute('data-lcdjp-decline-modal', '1');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

        let bodyHtml = '';
        if (lawyerList.length > 0) {
            bodyHtml = `<h3 style="color:#1a4080;margin:0 0 8px;">Choose Another Lawyer</h3>
                <p style="font-size:13px;color:#666;margin:0 0 16px;">Select a lawyer for case <strong>${escapeHtml(caseId)}</strong>.</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-height:50vh;overflow-y:auto;">
                    ${lawyerList.map(l => `<div onclick="viewLawyerProfile(${escapeHtml(JSON.stringify(String(l.username||'')))},${escapeHtml(JSON.stringify(String(caseId)))}); document.querySelector('[data-lcdjp-decline-modal]').remove();" style="background:#f0f5ff;padding:14px;border-radius:10px;border:1px solid #cfe0ff;cursor:pointer;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
                        <div style="font-weight:700;color:#1a4080;">${escapeHtml((l.firstName||l.first_name||''))} ${escapeHtml((l.lastName||l.last_name||''))}</div>
                        <div style="font-size:11px;color:#666;">${escapeHtml(l.lawyerSpecialization||l.lawyer_specialization||'General')}</div>
                        <div style="font-size:11px;color:#888;">${escapeHtml(l.lawFirmName||l.law_firm_name||'')}</div>
                        <div style="margin-top:6px;"><span style="background:#e3f2fd;padding:2px 8px;border-radius:10px;font-size:10px;color:#0d47a1;">Click to select</span></div>
                    </div>`).join('')}
                </div>`;
        } else {
            bodyHtml = `<h3 style="color:#dc3545;margin:0 0 8px;">No Lawyers Available Right Now</h3>
                <p style="font-size:13px;color:#666;margin:0 0 12px;">No lawyers are currently available for case <strong>${escapeHtml(caseId)}</strong>. You can find contact details for a nearby legal organisation below.</p>`;
        }

        if (legalOrgs.length > 0) {
            const sep = lawyerList.length ? 'margin-top:18px;border-top:1px solid #eee;padding-top:14px;' : '';
            bodyHtml += `<div style="${sep}">
                <h4 style="color:#1a4080;margin:0 0 10px;">Or Contact a Legal Organisation</h4>
                <p style="font-size:12px;color:#888;margin:0 0 10px;">These organisations aren't assigned through the app, reach out directly.</p>
                <div style="display:flex;flex-direction:column;gap:8px;max-height:38vh;overflow-y:auto;">
                    ${legalOrgs.map(o => {
                        return `<div style="display:flex;align-items:center;justify-content:space-between;background:#fff3e0;border-radius:8px;padding:10px 12px;gap:10px;flex-wrap:wrap;">
                            <div>
                                <div style="font-weight:600;color:#e65100;font-size:13px;">${escapeHtml(o.orgName||o.name||'Organisation')}</div>
                                <div style="font-size:11px;color:#888;">${escapeHtml(o.orgType||o.type||'NGO')} &bull; ${escapeHtml(o.district||'')}</div>
                            </div>
                            <span style="padding:6px 14px;background:#fff;border:1px solid #e65100;color:#e65100;border-radius:8px;font-size:12px;font-weight:600;flex-shrink:0;">${escapeHtml(o.phone||'No phone listed')}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }

        modal.innerHTML = `<div style="background:white;border-radius:16px;max-width:600px;width:100%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;">
            ${bodyHtml}
            <div style="margin-top:18px;text-align:right;">
                <button onclick="this.closest('[data-lcdjp-decline-modal]').remove();" style="padding:8px 20px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Close</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch(err) {
        console.error('showLawyerSelectionForDeclinedCase:', err);
        alert('Could not load lawyer/org selection. Viewing case instead.');
        viewCitizenCase(caseId);
    }
}






async function resolveCase(caseId) {
    if (!confirm("Are you sure you want to RESOLVE this case?\n\nThis action cannot be undone.")) {
        return;
    }

    try {
        const currentUsername = sessionStorage.getItem('lcdjp_username');
        if (!currentUsername) {
            alert('Please login first');
            return;
        }

        const headers = _getCitizenAuthHeaders();

        const caseResponse = await fetch(API_ENDPOINTS.case(caseId), {
            headers: headers
        });

        if (!caseResponse.ok) {
            if (caseResponse.status === 401 || caseResponse.status === 403) {
                alert('Authentication error. Please login again.');
                return;
            }
            throw new Error('Failed to fetch case details');
        }

        const foundCase = await caseResponse.json();

        if (foundCase.status === "Resolved") {
            alert('This case has already been resolved.');
            return;
        }

        const resolverRole    = sessionStorage.getItem('lcdjp_userlevel') || 'Unknown';
        const resolverName    = sessionStorage.getItem('lcdjp_fullname')  || currentUsername;
        const resolvingOfficer = resolverRole + " Official";

        let _resolveTimeline = [];
        try {
            const _tlResp = await fetch(API_ENDPOINTS.case(caseId), {
                headers: headers
            });
            if (_tlResp.ok) {
                const _tlData = await _tlResp.json();
                const _tlCase = _tlData.case || _tlData;
                _resolveTimeline = _tlCase.timeline
                    ? (typeof _tlCase.timeline === 'string' ? JSON.parse(_tlCase.timeline) : _tlCase.timeline)
                    : [];
            }
        } catch (_tlErr) { console.warn('timeline fetch failed:', _tlErr); }

        _resolveTimeline.push({
            action:    'Case Resolved',
            details:   `Case marked as Resolved by ${resolverName} (${resolverRole})`,
            actor:     currentUsername,
            timestamp: new Date().toLocaleString()
        });

        const resolutionData = {
            status:            "Resolved",
            resolvedBy:        currentUsername,
            resolvedByRole:    resolverRole,
            resolvedDate:      new Date().toISOString(),
            resolutionDetails: "Case was marked as resolved.",
            timeline:          JSON.stringify(_resolveTimeline)
        };

        const resolveResponse = await fetch(API_ENDPOINTS.resolve(caseId), {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(resolutionData)
        });

        if (!resolveResponse.ok) {
            if (resolveResponse.status === 401 || resolveResponse.status === 403) {
                alert('Authentication error. Please login again.');
                return;
            }
            const errorData = await resolveResponse.json();
            throw new Error(errorData.message || 'Failed to resolve case');
        }

        const resolvedCase = await resolveResponse.json();

        alert(`Case ${caseId} has been marked as Resolved!`);

        setTimeout(() => {
            const modal = document.getElementById('caseDetailsModal');
            if (modal && modal.style.display === 'block') {
                if (typeof showFeedbackForm === 'function') {
                    showFeedbackForm(caseId);
                }
            }
        }, 1000);

        const role = resolverRole;
        
        if (typeof updateLawyerDashboardCases === 'function') {
            await updateLawyerDashboardCases();
        }
        
        if (typeof updateLC1Cases === 'function') {
            await updateLC1Cases();
        }
        
        if (typeof updateMyCases === 'function') {
            await updateMyCases();
        }
        
        if (role === 'System Administrator' || role === 'Admin' || role === 'SYSTEM_ADMIN') {
            if (typeof updateAdminDashboard === 'function') {
                await updateAdminDashboard();
            }
        }

        if (typeof renderNavbarNotifBadge === 'function') {
            renderNavbarNotifBadge();
        }

        if (document.getElementById('caseDetailsModal')?.style?.display === 'block') {
            if (typeof viewCase === 'function') {
                await viewCase(caseId);
            }
        }

        try {
            if (typeof createEnhancedNotification === 'function') {
                createEnhancedNotification(
                    foundCase.citizenUsername || foundCase.citizen,
                    `Case ${caseId} has been resolved by ${resolvingOfficer}`,
                    'case_resolved',
                    caseId
                );
            } else if (typeof addNotification === 'function') {
                addNotification(
                    foundCase.citizenUsername || foundCase.citizen,
                    `Case ${caseId} has been resolved by ${resolvingOfficer}`,
                    'case_resolved',
                    caseId
                );
            }
        } catch (notifError) {
            console.warn('Could not send notification:', notifError);
        }

        return resolvedCase;

    } catch (error) {
        console.error('Error resolving case:', error);
        alert('Failed to resolve case: ' + error.message);
        throw error;
    }
}




async function showForwardRouterForm(caseId) {
    try {
        const headers = _getCitizenAuthHeaders();
        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) {
            if (caseResp.status === 401 || caseResp.status === 403) {
                alert('Authentication error. Please login again.');
                return;
            }
            alert('Could not load case details.');
            return;
        }

        const modal = document.createElement('div');
        modal.setAttribute('data-lcdjp-forward-modal', '1');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;max-width:520px;width:100%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;">
                <h3 style="color:#1a4080;margin:0 0 8px;">Refer Case</h3>
                <p style="font-size:13px;color:#666;margin:0 0 14px;">
                    Forward case <strong>${escapeHtml(caseId)}</strong> to the Police or a Lawyer. This does not assign
                    a new handler directly — add a short note on what you found and advise, the citizen will be notified
                    (email/SMS/in-app) and their AI Assistant will use your note to help them pick the next handler.
                </p>
                <textarea id="lcReferralNotes_${escapeHtml(caseId)}" placeholder="Notes for the next handler (required)…"
                    style="width:100%;min-height:100px;padding:10px;border:1px solid #cfd8ea;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>
                <div id="lcReferralErr_${escapeHtml(caseId)}" style="color:#dc3545;font-size:12px;margin-top:6px;display:none;"></div>
                <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
                    <button onclick="_lcSubmitReferral(${escapeHtml(JSON.stringify(String(caseId)))},'police')" style="flex:1;min-width:140px;padding:10px 16px;background:#fce4ec;color:#c62828;border:1px solid #c62828;border-radius:8px;cursor:pointer;font-weight:600;">
                        Refer to Police
                    </button>
                    <button onclick="_lcSubmitReferral(${escapeHtml(JSON.stringify(String(caseId)))},'lawyer')" style="flex:1;min-width:140px;padding:10px 16px;background:#e8f5e9;color:#2e7d32;border:1px solid #2e7d32;border-radius:8px;cursor:pointer;font-weight:600;">
                        Refer to Lawyer
                    </button>
                </div>
                <div style="margin-top:12px;text-align:right;">
                    <button onclick="this.closest('[data-lcdjp-forward-modal]').remove();" style="padding:8px 20px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:13px;">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch (err) {
        console.error('showForwardRouterForm:', err);
        alert('Could not open the referral form.');
    }
}
window.showForwardRouterForm = showForwardRouterForm;

async function _lcSubmitReferral(caseId, target) {
    const notesEl = document.getElementById('lcReferralNotes_' + caseId);
    const errEl = document.getElementById('lcReferralErr_' + caseId);
    const notes = ((notesEl && notesEl.value) || '').trim();
    if (!notes) {
        if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Please add a note explaining the referral before continuing.'; }
        return;
    }

    const targetLabel = target === 'police' ? 'the Police' : 'a Lawyer';
    if (!confirm(`Forward this case to ${targetLabel}? This will NOT assign a new handler directly — the citizen will be notified (email/SMS/in-app) and can reopen the AI Assistant, which will factor in your note when helping them choose a new handler.`)) return;

    try {
        const headers = _getCitizenAuthHeaders();
        const lcUsername = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
        const lcName = sessionStorage.getItem('lcdjp_fullname') || lcUsername;

        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) { alert('Failed to load case before referral.'); return; }
        const caseRaw = await caseResp.json();
        const foundCase = caseRaw.case || caseRaw;

        const priorHandlers = Array.isArray(foundCase.previousHandlers) ? foundCase.previousHandlers.slice() : [];
        priorHandlers.push({ username: lcUsername, name: lcName, role: 'LC Official', action: 'referred_to_' + target, notes: notes, at: new Date().toISOString() });

        let timeline = [];
        try {
            timeline = foundCase.timeline
                ? (typeof foundCase.timeline === 'string' ? JSON.parse(foundCase.timeline) : foundCase.timeline)
                : [];
        } catch (e) { timeline = []; }
        timeline.push({
            action: 'Case Referred',
            details: `${lcName} (LC Official) referred this case to ${targetLabel}. Note: ${notes}`,
            actor: lcUsername,
            timestamp: new Date().toLocaleString()
        });

        const combinedComments = (foundCase.lcComments ? foundCase.lcComments + '\n\n' : '') +
            `[Referred to ${targetLabel} by ${lcName}]: ${notes}`;

        const updateData = {
            status: target === 'lawyer' ? 'Awaiting Lawyer Selection' : 'Referred to Police',
            current_handler: null,
            handler_role: null,
            assigned_lc: null,
            lcComments: combinedComments,
            lc_referral_notes: notes,
            referred_by_role: 'LC Official',
            referred_to: target,
            referred_by: lcUsername,
            messaging_enabled: 0,
            messaging_locked: 1,
            previousHandlers: priorHandlers,
            timeline: JSON.stringify(timeline)
        };

        const updateResp = await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT', headers: headers, body: JSON.stringify(updateData)
        });
        if (!updateResp.ok) {
            if (updateResp.status === 401 || updateResp.status === 403) {
                alert('Authentication error. Please login again.');
                return;
            }
            throw new Error('Failed to refer case');
        }

        const citizenUsername = foundCase.citizen_id || foundCase.citizen || foundCase.citizenUsername || foundCase.citizenId;
        const notifMessage = `Your case ${caseId} has been forwarded to ${targetLabel} by ${lcName}. Note: ${notes}. Open your case and reopen the AI Assistant — it will show you this note and help you choose a new handler.`;
        if (citizenUsername) {
            if (typeof createEnhancedNotification === 'function') {
                await createEnhancedNotification(citizenUsername, notifMessage, 'case_referred', caseId);
            } else {
                await fetch(API_ENDPOINTS.notifications, {
                    method: 'POST', headers: headers,
                    body: JSON.stringify({
                        username: citizenUsername,
                        message: notifMessage,
                        type: 'case_referred',
                        caseId: caseId,
                        referredTo: target,
                        timestamp: new Date().toISOString(),
                        is_read: false
                    })
                });
            }
        }

        const openModal = document.querySelector('[data-lcdjp-forward-modal]');
        if (openModal) openModal.remove();
        alert(`Case forwarded to ${targetLabel}. The citizen has been notified and can reopen the AI Assistant to choose a new handler.`);

        if (typeof closeCaseDetails === 'function') closeCaseDetails();
        if (typeof daLoadCases === 'function') daLoadCases();
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();
    } catch (err) {
        console.error('_lcSubmitReferral:', err);
        alert('Failed to refer case: ' + err.message);
    }
}
window._lcSubmitReferral = _lcSubmitReferral;

async function reopenReferredCase(caseId) {
    if (typeof toggleNotifications === 'function') try { toggleNotifications(); } catch (e) {}
    try {
        const headers = _getCitizenAuthHeaders();
        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) {
            if (caseResp.status === 401 || caseResp.status === 403) {
                console.warn('Authentication required to reopen case');
                return;
            }
            alert('Could not load case details.');
            return;
        }
        const raw = await caseResp.json();
        const foundCase = raw.case || raw;

        const modal = document.createElement('div');
        modal.setAttribute('data-lcdjp-reopen-modal', '1');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;max-width:500px;width:100%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;">
                <h3 style="color:#1a4080;margin:0 0 8px;">Choose A New Handler</h3>
                <p style="font-size:13px;color:#666;margin:0 0 16px;">
                    Case <strong>${caseId}</strong> was referred${foundCase.lc_referral_notes ? ': "' + _cmEsc(foundCase.lc_referral_notes) + '"' : ''}.
                    Who would you like to send it to now?
                </p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button onclick="_reopenCaseWithChoice(${escapeHtml(JSON.stringify(String(caseId)))},'lc')" style="padding:12px 16px;background:#e3f2fd;color:#1565c0;border:1px solid #1565c0;border-radius:8px;cursor:pointer;font-weight:600;text-align:left;">
                        Local Council (LC)
                    </button>
                    <button onclick="_reopenCaseWithChoice(${escapeHtml(JSON.stringify(String(caseId)))},'lawyer')" style="padding:12px 16px;background:#e8f5e9;color:#2e7d32;border:1px solid #2e7d32;border-radius:8px;cursor:pointer;font-weight:600;text-align:left;">
                        Talk to a Lawyer
                    </button>
                    <button onclick="_reopenCaseWithChoice(${escapeHtml(JSON.stringify(String(caseId)))},'police')" style="padding:12px 16px;background:#fce4ec;color:#c62828;border:1px solid #c62828;border-radius:8px;cursor:pointer;font-weight:600;text-align:left;">
                        Police
                    </button>
                </div>
                <div style="margin-top:16px;text-align:right;">
                    <button onclick="this.closest('[data-lcdjp-reopen-modal]').remove();" style="padding:8px 20px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:13px;">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch (err) {
        console.error('reopenReferredCase:', err);
        alert('Could not reopen the case. Viewing case instead.');
        viewCitizenCase(caseId);
    }
}
window.reopenReferredCase = reopenReferredCase;

async function _reopenCaseWithChoice(caseId, choice) {
    try {
        const headers = _getCitizenAuthHeaders();
        const modal = document.querySelector('[data-lcdjp-reopen-modal]');

        const updateData = {
            status: choice === 'lawyer' ? 'Awaiting Lawyer Selection' : 'Pending',
            routingChoice: choice,
            routing_status: 'reopened_by_citizen',
            current_handler: null,
            handler_role: null,
            assigned_lc: null,
            messaging_enabled: 1,
            messaging_locked: 0
        };
        const updateResp = await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT', headers: headers, body: JSON.stringify(updateData)
        });
        if (!updateResp.ok) {
            if (updateResp.status === 401 || updateResp.status === 403) {
                alert('Authentication error. Please login again.');
                return;
            }
            throw new Error('Failed to reopen case');
        }

        if (modal) modal.remove();

        if (choice === 'lawyer') {
            showLawyerSelectionForDeclinedCase(caseId);
            return;
        }
        if (choice === 'police') {
            alert('Case reopened and marked for Police attention. You can find the nearest police station under "Local Council Services" from the home menu, or view the case for updates.');
        } else {
            alert('Case reopened and sent back to the Local Council queue for your area.');
        }
        if (typeof updateMyCases === 'function') updateMyCases();
        viewCitizenCase(caseId);
    } catch (err) {
        console.error('_reopenCaseWithChoice:', err);
        alert('Failed to reopen case: ' + err.message);
    }
}
window._reopenCaseWithChoice = _reopenCaseWithChoice;





function renderNavbarNotifBadge() {
    const countNode = document.getElementById("notifCount");
    if (!countNode) return;
    const currentUsername = sessionStorage.getItem("lcdjp_username") || localStorage.getItem("lcdjp_username");
    if (!currentUsername) { 
        countNode.style.display = "none"; 
        countNode.textContent = ""; 
        return; 
    }

    const headers = _getCitizenAuthHeaders();

    
    
    
    
    
    
    
    
    const notifLookupUsername = (typeof _lcdjpIsAdministrator === 'function' && _lcdjpIsAdministrator())
        ? 'admin'
        : currentUsername;

    
    fetch(API_ENDPOINTS.unreadNotifications(notifLookupUsername), {
        headers: headers,
        suppressAuthRedirect: true  
    })
    .then(function(r) { 
        if (!r.ok) {
            
            // 401, 500, anything: the badge is cosmetic, so a failed lookup just shows no count.
            console.log('[LCDJP] Notifications badge unavailable (HTTP ' + r.status + ')');
            return null;
        }
        return r.json(); 
    })
    .then(function(data) {
        let count = 0;
        if (data) {
            if (Array.isArray(data)) {
                count = data.length;
            } else if (data && typeof data.unreadCount === 'number') {
                count = data.unreadCount;
            } else if (data && typeof data.count === 'number') {
                count = data.count;
            } else if (data && Array.isArray(data.notifications)) {
                count = data.notifications.filter(function(n) { 
                    return !n.is_read && !n.read; 
                }).length;
            }
        } else {
            
            var notifications = _lcdjpStore && _lcdjpStore.notifications ? _lcdjpStore.notifications : [];
            var unread = notifications.filter(function(n) { 
                return n.username === currentUsername && (n.read === false || n.read === undefined); 
            });
            count = unread.length;
        }
        
        if (count > 0) {
            countNode.style.display = "inline-block";
            countNode.textContent = count;
            countNode.style.background = "#dc3545";
            countNode.style.color = "white";
            countNode.style.borderRadius = "50%";
            countNode.style.padding = "2px 8px";
            countNode.style.fontSize = "11px";
            countNode.style.fontWeight = "bold";
            countNode.style.marginLeft = "5px";
            countNode.style.minWidth = "18px";
            countNode.style.textAlign = "center";
        } else {
            countNode.style.display = "none";
            countNode.textContent = "";
        }

        var alertsBadge = document.getElementById("cmAlertsBadge");
        if (alertsBadge) {
            if (count > 0) {
                alertsBadge.textContent = count > 99 ? "99+" : count;
                alertsBadge.style.display = "flex";
            } else {
                alertsBadge.style.display = "none";
                alertsBadge.textContent = "";
            }
        }

        
        
        
        var amAlertsBadge = document.getElementById("amAlertsBadge");
        if (amAlertsBadge) {
            if (count > 0) {
                amAlertsBadge.textContent = count > 99 ? "99+" : count;
                amAlertsBadge.style.display = "flex";
            } else {
                amAlertsBadge.style.display = "none";
                amAlertsBadge.textContent = "";
            }
        }
    })
    .catch(function() {
        
        countNode.style.display = "none";
        countNode.textContent = "";
    });
}




function updateLCNotificationBadge() {
    const username = sessionStorage.getItem("lcdjp_username") || localStorage.getItem("lcdjp_username");
    if (!username) return;
    const badge = document.getElementById("lcNotificationBadge");
    if (!badge) return;
    
    const headers = _getCitizenAuthHeaders();

    
    
    const notifLookupUsername = (typeof _lcdjpIsAdministrator === 'function' && _lcdjpIsAdministrator())
        ? 'admin'
        : username;

    
    fetch(API_ENDPOINTS.unreadNotifications(notifLookupUsername), {
        headers: headers,
        suppressAuthRedirect: true  
    })
    .then(function(r) { 
        if (!r.ok) {
            if (r.status === 401) {
                console.log('[LCDJP] Not authenticated for LC notification badge');
                return null;
            }
            return r.json();
        }
        return r.json(); 
    })
    .then(function(data) {
        let count = 0;
        if (data) {
            if (Array.isArray(data)) count = data.length;
            else if (data && typeof data.count === 'number') count = data.count;
            else if (data && Array.isArray(data.notifications)) {
                count = data.notifications.filter(function(n) { 
                    return !n.is_read && !n.read; 
                }).length;
            }
        } else {
            
            var notifications = _lcdjpStore && _lcdjpStore.notifications ? _lcdjpStore.notifications : [];
            var unread = notifications.filter(function(n) { 
                return n.username === username && !n.read; 
            });
            count = unread.length;
        }
        
        if (count > 0) {
            badge.style.display = "inline-block";
            badge.textContent = count + " New";
        } else {
            badge.style.display = "none";
        }
    })
    .catch(function() {
        badge.style.display = "none";
    });
}

function checkAndShowTestButtons() {
}





async function trackCitizenCaseId() {
    let idValue = document.getElementById("trackSearchInput").value.trim();
    let container = document.getElementById("trackingResultContainer");
    let msgContainer = document.getElementById("messagingContainer");

    if (!idValue) {
        container.innerHTML = `<div style="color:red; font-weight:bold; padding:10px 0;">Please input a Case ID reference first.</div>`;
        if (msgContainer) msgContainer.style.display = "none";
        return;
    }

    try {
        const headers = _getCitizenAuthHeaders();

        const response = await fetch(API_ENDPOINTS.case(idValue), {
            headers: headers
        });

        if (!response.ok) {
            if (response.status === 404) {
                container.innerHTML = `<div style="background:#fce8e6; color:#a94442; padding:15px; border-radius:6px; border:1px solid #fbdbd8;"><strong>No active record found!</strong> Please verify the format entry (e.g. CASE001).</div>`;
            } else if (response.status === 401 || response.status === 403) {
                container.innerHTML = `<div style="background:#fce8e6; color:#a94442; padding:15px; border-radius:6px; border:1px solid #fbdbd8;"><strong>Authentication Error!</strong> Please login again.</div>`;
            } else {
                throw new Error('Failed to fetch case');
            }
            if (msgContainer) msgContainer.style.display = "none";
            return;
        }

        const _trackResp = await response.json();
        const foundCase = _trackResp.case || _trackResp;

        const _caseRef    = escapeHtml(foundCase.caseReference  || foundCase.caseId       || '');
        const _caseType   = escapeHtml(foundCase.case_type       || foundCase.caseType      || 'N/A');
        const _citizen    = escapeHtml(foundCase.citizen         || foundCase.citizen_name  || 'N/A');
        const _level      = escapeHtml(foundCase.level           || foundCase.current_level || 'N/A');
        const _status     = escapeHtml(foundCase.status          || 'Pending');
        const _village    = foundCase.village         || '';
        const _parish     = foundCase.parish          || '';
        const _subCounty  = foundCase.sub_county      || foundCase.subCounty     || '';
        const _district   = foundCase.district        || '';
        const _location   = escapeHtml(foundCase.full_location   || foundCase.fullLocation  ||
                            [_village, _parish, _subCounty, _district].filter(Boolean).join(', ') || 'N/A');
        const _description  = foundCase.description   || '';
        const _media        = foundCase.attached_media || foundCase.attachedMedia || 'None';
        const _extraNotes   = escapeHtml(foundCase.extra_notes   || foundCase.extraNotes    || '');
        const _lcComments   = escapeHtml(foundCase.lc_comments   || foundCase.lcComments    || '');
        const _lcStatements = escapeHtml(foundCase.lc_statements || foundCase.lcStatements  || '');
        const _lcEvidence   = escapeHtml(foundCase.lc_evidence_file || foundCase.lcEvidenceFile || '');
        const _legalAdvice  = escapeHtml(foundCase.legal_advice  || foundCase.legalAdvice   || '');
        const _subDate      = foundCase.submissionDate|| foundCase.created_at    || '';
        const _isUrgent     = foundCase.is_urgent     || foundCase.isUrgent      || false;

        let badgeNavyStyle = 'background:#e8eaf6; color:#1a237e; border:1px solid rgba(26,35,126,0.25);';
        if (_status === 'Resolved') badgeNavyStyle = 'background:#1a237e; color:#fff; border:none;';

        let progressPercentage = 0;
        let statusText = "Submitted";

        if (_status === "Pending") {
            progressPercentage = 25;
            statusText = "Pending Review";
        } else if (_status === "Forwarded to LC2" || _status === "Awaiting Lawyer Selection") {
            progressPercentage = 40;
            statusText = "Under Review";
        } else if (_status === "Accepted by Lawyer" || _status === "Forwarded to Lawyer") {
            progressPercentage = 60;
            statusText = "With Lawyer";
        } else if (_status === "Resolved") {
            progressPercentage = 100;
            statusText = "Resolved";
        } else {
            progressPercentage = 25;
            statusText = _status || "In Progress";
        }

        container.innerHTML = `
<div class="form-card" style="max-width:100%; margin-top:20px; border-left:6px solid #1a4080; background:#fafafa;">
    <div style="display:flex; align-items:center; margin-bottom:15px; border-bottom:2px solid #eee; padding-bottom:10px; flex-wrap:wrap; gap:10px;">
        <div><span style="font-size:13px; text-transform:uppercase; color:#777; font-weight:bold; display:block;">File Lookup Successful</span><h3 style="color:#1a4080; margin:0;">Case Dossier: ${_caseRef}</h3></div>
        <div style="margin-left:auto;"><span style="${badgeNavyStyle} font-size:14px; padding:6px 14px; border-radius:20px; font-weight:600;">Current Status: ${_status}</span></div>
    </div>

    <div style="background:white; border-radius:12px; padding:20px; margin-bottom:20px; border:1px solid #e0e0e0;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:11px; color:#888; font-weight:500;">
            <span style="color:${progressPercentage >= 25 ? '#1a4080' : '#ccc'};">Submitted</span>
            <span style="color:${progressPercentage >= 40 ? '#1a4080' : '#ccc'};">Under Review</span>
            <span style="color:${progressPercentage >= 60 ? '#1a4080' : '#ccc'};">With Lawyer</span>
            <span style="color:${progressPercentage >= 100 ? '#1a237e' : '#ccc'};">Resolved</span>
        </div>
        <div style="position:relative; height:8px; background:#e8eaf6; border-radius:4px; overflow:hidden;">
            <div style="height:100%; background:#1a237e; border-radius:4px; width:${progressPercentage}%; transition:width 0.8s ease;"></div>
        </div>
        <div style="text-align:center; margin-top:10px; font-size:14px; color:#1a4080; font-weight:600;">
            Status: ${statusText}${_isUrgent ? ', URGENT' : ''}
        </div>
        ${_subDate ? `<div style="text-align:center; font-size:11px; color:#888; margin-top:4px;">Submitted: ${new Date(_subDate).toLocaleDateString()}</div>` : ''}
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:15px; margin-bottom:20px; background:white; padding:12px; border-radius:6px; border:1px solid #e0e0e0;">
        <div><strong>Dispute Category:</strong> ${_caseType}</div>
        <div><strong>Complainant:</strong> ${_citizen}</div>
        <div><strong>Assigned Level:</strong> ${_level}</div>
        <div><strong>Location:</strong> ${_location}</div>
    </div>
    <div style="margin-bottom:15px;"><strong style="color:#1a4080; display:block; margin-bottom:4px;">Original Claim Statement:</strong><p style="background:white; padding:10px; border-radius:4px; border:1px solid #eee; font-style:italic; font-size:14px;">&ldquo;${escapeHtml(_description || 'No description provided.')}&rdquo;</p><span style="font-size:12px; color:#555; display:block; margin-top:4px;">Submitted Media: <strong>${escapeHtml(_media)}</strong></span></div>
    ${_extraNotes ? `<div style="margin-bottom:15px;"><strong style="color:#1a4080; display:block; margin-bottom:4px;">Supplemental Notes:</strong><p style="background:#f0f2ff; padding:10px; border-radius:4px; border:1px solid rgba(26,35,126,0.15); font-size:14px;">${_extraNotes}</p></div>` : ''}
    <div style="margin-top:20px; border-top:1px solid #ddd; padding-top:15px;">
        <h4 style="color:#1a4080; text-transform:uppercase; font-size:13px; margin-bottom:10px;">Jurisdictional Feedback Ledger</h4>
        <div style="margin-bottom:10px; padding-left:15px; border-left:3px solid #1a4080;"><strong>Local Council Comments:</strong><p style="color:#555; font-size:14px; margin-top:3px;">${_lcComments || '<span style="color:#999;font-style:italic;">No official comments yet.</span>'}</p></div>
        <div style="margin-bottom:10px; padding-left:15px; border-left:3px solid #283593;"><strong>Witness Statements:</strong><p style="color:#555; font-size:14px; margin-top:3px;">${_lcStatements || '<span style="color:#999;font-style:italic;">No statements recorded yet.</span>'}</p></div>
        <div style="padding-left:15px; border-left:3px solid #1a237e;"><strong>LC Evidence Files:</strong><p style="color:#555; font-size:14px; margin-top:3px;">${_lcEvidence || 'None Uploaded'}</p></div>
        ${_legalAdvice ? `<div style="margin-top:20px; background:#e8eaf6; padding:15px; border-radius:6px; border-left:5px solid #1a237e;"><strong>Legal Advice From Assigned Lawyer</strong><p style="margin-top:10px;">${_legalAdvice}</p></div>` : ''}
    </div>
    <div style="margin-top:20px; text-align:center;">
    <button onclick="printCaseDetails(${escapeHtml(JSON.stringify(String(_caseRef)))})"
            style="padding:10px 25px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
        Print Case
    </button>
</div>
</div>`;

        if (_level === "Lawyer Panel Desk" || _status === "Forwarded to Lawyer") {
            if (msgContainer) { msgContainer.dataset.caseId = idValue; msgContainer.style.display = "block"; if (typeof window.loadCitizenCaseThread === "function") window.loadCitizenCaseThread(idValue); }
        } else {
            if (msgContainer) msgContainer.style.display = "none";
        }

    } catch (error) {
        console.error('Error tracking case:', error);
        container.innerHTML = `<div style="background:#fce8e6; color:#a94442; padding:15px; border-radius:6px; border:1px solid #fbdbd8;"><strong>Error!</strong> Failed to fetch case details. Please try again.</div>`;
        if (msgContainer) msgContainer.style.display = "none";
    }
}

















async function printCaseDetails(caseId) {
    var caseRef = String(caseId == null ? '' : caseId).trim();
    if (!caseRef || /^(n\/a|null|undefined|none)$/i.test(caseRef)) {
        alert('No case reference available to print.');
        return;
    }

    var foundCase = typeof findCaseById === 'function' ? findCaseById(caseRef) : null;
    if (foundCase instanceof Promise) foundCase = await foundCase;

    if (!foundCase) {
        
        
        try {
            var resp = await fetch(API_ENDPOINTS.case(encodeURIComponent(caseRef)), {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (resp.ok) {
                var respData = await resp.json();
                foundCase = respData.case || respData;
            }
        } catch (e) {
            console.warn('printCaseDetails: failed to fetch case', e);
        }
    }

    if (!foundCase) {
        alert('Could not load this case for printing. Please try again.');
        return;
    }

    var ref        = (typeof getCaseReference === 'function' ? getCaseReference(foundCase) : null) || caseRef;
    var caseType   = foundCase.case_type || foundCase.caseType || 'N/A';
    var citizen    = foundCase.citizen || foundCase.citizen_name || 'N/A';
    var status     = foundCase.status || 'Pending';
    var level      = foundCase.level || foundCase.current_level || 'N/A';
    var village    = foundCase.village || '';
    var parish     = foundCase.parish || '';
    var subCounty  = foundCase.sub_county || foundCase.subCounty || '';
    var district   = foundCase.district || '';
    var location   = foundCase.full_location || foundCase.fullLocation ||
                      [village, parish, subCounty, district].filter(Boolean).join(', ') || 'N/A';
    var description = lcdjpReadableDescription(foundCase.description) || 'No description provided.';
    var extraNotes  = foundCase.extra_notes || foundCase.extraNotes || '';
    var subDate      = foundCase.submissionDate || foundCase.created_at || '';
    var subDateLabel = subDate ? new Date(subDate).toLocaleDateString() : 'N/A';

    var esc = function (s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    
    
    
    
    
    var html =
        '<html>' +
        '<title>Case ' + esc(ref) + '</title>' +
        '<style>' +
            'body{font-family:Arial,Helvetica,sans-serif;padding:40px;max-width:700px;margin:0 auto;color:#222;}' +
            'h1{color:#1a4080;font-size:20px;border-bottom:2px solid #1a4080;padding-bottom:10px;}' +
            '.row{margin-bottom:10px;}' +
            '.label{font-weight:bold;color:#1a4080;display:inline-block;min-width:140px;}' +
            '.desc{background:#f5f5f5;padding:12px;border-radius:6px;margin-top:6px;white-space:pre-wrap;}' +
            '@media print { .print-btn{display:none;} }' +
        '</style>' +
        '<body>' +
            '<h1>JusticeLink Case Record, ' + esc(ref) + '</h1>' +
            '<div class="row"><span class="label">Case Type:</span>' + esc(caseType) + '</div>' +
            '<div class="row"><span class="label">Complainant:</span>' + esc(citizen) + '</div>' +
            '<div class="row"><span class="label">Status:</span>' + esc(status) + '</div>' +
            '<div class="row"><span class="label">Handling Level:</span>' + esc(level) + '</div>' +
            '<div class="row"><span class="label">Location:</span>' + esc(location) + '</div>' +
            '<div class="row"><span class="label">Submitted:</span>' + esc(subDateLabel) + '</div>' +
            '<div class="row"><span class="label">Description:</span><div class="desc">' + esc(description) + '</div></div>' +
            (extraNotes ? '<div class="row"><span class="label">Additional Notes:</span><div class="desc">' + esc(extraNotes) + '</div></div>' : '') +
            '<button class="print-btn" onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#1a4080;color:white;border:none;border-radius:6px;cursor:pointer;">Print</button>' +
        '</body></html>';

    var printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (!printWindow) {
        alert('Please allow pop-ups to print this case.');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(function () {
        try { printWindow.print(); } catch (e) { console.warn('printCaseDetails: print() failed', e); }
    }, 300);
}
window.printCaseDetails = printCaseDetails;





function updateMyCases() {
    let table = document.getElementById("myCasesTable");
    if (!table) return;
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777; padding: 20px;">Loading your cases...</td></tr>`;
    
    let currentUsername = sessionStorage.getItem("lcdjp_username");
    let currentUser = sessionStorage.getItem("lcdjp_fullname");
    let viewerRole = sessionStorage.getItem("lcdjp_userlevel");
    
    if (!currentUsername) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777; padding: 20px;">Please login to view your cases.</td></tr>`;
        return;
    }
    if (typeof window._lcdjpProtectedDataAccessAllowed === 'function' &&
        !window._lcdjpProtectedDataAccessAllowed()) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777; padding: 20px;">Identity verification is required to view your cases.</td></tr>`;
        return;
    }

    const verificationStatus = String(
        sessionStorage.getItem("lcdjp_verif_status") ||
        localStorage.getItem("verificationStatus") || ""
    ).trim().toUpperCase();
    const normalizedRole = String(
        sessionStorage.getItem("lcdjp_userlevel") ||
        localStorage.getItem("userRole") || ""
    ).trim().toUpperCase();
    const canViewCases = normalizedRole === "ADMIN" ||
        normalizedRole === "SYSTEM_ADMIN" ||
        normalizedRole === "SYSTEM_ADMINISTRATOR" ||
        normalizedRole === "DISTRICT_ADMIN" ||
        normalizedRole === "LAWYER" ||
        verificationStatus === "APPROVED" ||
        verificationStatus === "VERIFIED";
    if (!canViewCases) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777; padding: 20px;">Identity verification is required to view your cases.</td></tr>`;
        return;
    }

    fetch(API_ENDPOINTS.citizenCases(currentUsername), {
        
        method: 'GET',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch cases');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.cases) {
            let userCases = data.cases;
            
            let localCases = _lcdjpStore.cases;
            
            if (userCases.length === 0) {
                table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777; padding: 20px;">You haven't filed any cases yet.</td></tr>`;
                return;
            }

            userCases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            table.innerHTML = ''; 

            userCases.forEach(function(c) {
                var ref = c.caseReference || c.caseNumber || (c.id ? String(c.id) : null);
                const displayCaseRef = ref || 'N/A';
                
                let localCase = localCases.find(lc => getCaseReference(lc) === ref);
                
                let displayStatusBadge = "";
                if (c.status === "Pending") {
                    var _lcLevelLabel = (c.level && /^lc/i.test(c.level)) ? 'LC' : (c.level || 'LC');
                    displayStatusBadge = `<span class="badge badge-pending">Pending at ${_lcLevelLabel}</span>`;
                } else if (c.status === "Resolved") {
                    displayStatusBadge = `<span class="badge badge-resolved">Resolved Desk</span>`;
                } else if (c.status === "Forwarded to Lawyer") {
                    displayStatusBadge = `<span class="badge badge-lawyer">Forwarded to Lawyer</span>`;
                } else if (c.status && c.status.startsWith("Forwarded to")) {
                    displayStatusBadge = `<span class="badge badge-higher">${escapeHtml(c.status)}</span>`;
                } else {
                    displayStatusBadge = `<span class="badge badge-pending">${escapeHtml(c.status || 'Pending')}</span>`;
                }

                const locationInfo = c.village && c.parish ? 
                    `<span style="font-size:10px; color:#888; display:block;"> ${escapeHtml(c.village)}, ${escapeHtml(c.parish)}</span>` : '';

                const showAppointmentBtn = viewerRole !== 'Citizen' && !isAdmin(viewerRole);
                
                const attachedMedia = localCase ? (localCase.attachedMedia || "None") : "None";
                const extraNotes = localCase ? (localCase.extraNotes || "None added yet") : "None added yet";

                table.innerHTML += `
                <tr>
                    <td data-label="Case ID">
                        <strong>${escapeHtml(displayCaseRef)}</strong>
                        ${locationInfo}
                    </td>
                    <td data-label="Case Type">${escapeHtml(c.case_type || c.caseType)}</td>
                    <td data-label="Status Desk">${displayStatusBadge}</td>
                    <td data-label="Extra Notes" title="${escapeHtml(extraNotes)}"><i style="color:#555;">${escapeHtml(extraNotes)}</i></td>
                    <td data-label="Media File">
                        <div style="font-size:10px; margin-bottom:3px; color:#444;">${escapeHtml(attachedMedia)}</div>
                        <input type="file" style="font-size:10px; width:100%; max-width:100%;" onchange="processInlineTableUpload(this, ${escapeHtml(JSON.stringify(String(ref || '')))})">
                    </td>
                    <td data-label="Actions">
                        <div class="cases-table-actions">
                        ${ref && ref !== 'N/A' && ref !== 'null'
                            ? `<button class="btn" style="background:#fff;color:#16305c;border:1px solid #16305c;" 
                                    onclick="viewCitizenCase(${escapeHtml(JSON.stringify(String(ref)))})">View</button>`
                            : '<span style="color:#888;font-size:10px;">No case reference</span>'}
                        <button class="btn" style="background:#1a4080;color:white;" 
                                onclick="openCitizenMessaging(${escapeHtml(JSON.stringify(String(ref || '')))})">Msg</button>
                        <button class="btn case-row-secondary-action" style="background:#23508f;color:white;" 
                                onclick="showDocumentManager(${escapeHtml(JSON.stringify(String(ref || '')))})">Docs</button>
                        <button class="btn case-row-secondary-action" style="background:#2c5fa3;color:white;" 
                                onclick="showAppendDetailsForm(${escapeHtml(JSON.stringify(String(ref || '')))})">Add Info</button>
                        <button class="case-row-secondary-action" onclick="printCaseDetails(${escapeHtml(JSON.stringify(String(ref || '')))})" 
                                style="background:#3a6bc7;color:white;border:none;cursor:pointer;">Print</button>
                        </div>
                    </td>
                </tr>`;
            });
        } else {
            throw new Error(data.error || 'Failed to load cases');
        }
    })
    .catch(error => {
        console.error('Error fetching cases:', error);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc3545; padding: 20px;">
             Error loading cases: ${escapeHtml(error.message)}
            <br><button onclick="updateMyCases()" style="margin-top:10px; padding:8px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;"> Retry</button>
        </td></tr>`;
    });
}

async function viewCitizenCase(caseRef) {
    caseRef = String(caseRef == null ? '' : caseRef).trim();
    if (!caseRef || /^(n\/a|null|undefined|none)$/i.test(caseRef)) {
        alert('Invalid case reference');
        return;
    }
    const caseId = caseRef;
   
    const contentDiv = document.getElementById("caseDetailsContent");
    const modalDiv = document.getElementById("caseDetailsModal");
    
    if (!contentDiv || !modalDiv) {
        console.warn("Case details modal elements missing, creating them...");
        let modal = document.getElementById("caseDetailsModal");
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'caseDetailsModal';
            modal.style.cssText = 'display:none; position:fixed; top:5%; left:10%; width:80%; height:85%; background:white; border:2px solid #1a4080; padding:0; overflow:auto; z-index:9999; border-radius:8px;';
            modal.innerHTML = '<button onclick="closeCaseDetails()" title="Close" style="position:absolute;top:10px;right:12px;z-index:10002;background:#dc3545;color:white;border:none;border-radius:50%;width:32px;height:32px;font-size:20px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;">&times;</button><div id=\'caseDetailsContent\'></div>';
            document.body.appendChild(modal);
        }
        const newContent = document.getElementById("caseDetailsContent");
        const newModal = document.getElementById("caseDetailsModal");
        if (!newContent || !newModal) {
            alert("Error: Could not load case details. Please refresh the page.");
            return;
        }
        var finalContent = newContent;
        var finalModal = newModal;
    } else {
        var finalContent = contentDiv;
        var finalModal = modalDiv;
    }

    const viewerUsername = sessionStorage.getItem('lcdjp_username');
    if (!viewerUsername) {
        finalContent.innerHTML = `
            <div style="text-align:center; padding:40px; color:#dc3545;">
                <p>Please login to view case details.</p>
                <button onclick="closeCaseDetails()" style="margin-top:15px; padding:8px 20px; background:#6c757d; color:white; border:none; border-radius:6px; cursor:pointer;">Close</button>
            </div>
        `;
        
        
        
        
        
        
        
        if (finalModal.style.display !== 'block' && typeof window.lockScroll === 'function') window.lockScroll();
        finalModal.style.display = "block";
        return;
    }

    finalContent.innerHTML = `
        <div style="text-align:center; padding:60px; color:#999;">
            <p>Loading case details...</p>
        </div>
    `;
    if (finalModal.style.display !== 'block' && typeof window.lockScroll === 'function') window.lockScroll();
    finalModal.style.display = "block";

    try {
        const response = await fetch(API_ENDPOINTS.case(encodeURIComponent(caseRef)), {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            if (response.status === 404) throw new Error('Case not found');
            throw new Error('Failed to fetch case');
        }
        const data = await response.json();

        const foundCase = data.case || data;
        
        if (!foundCase || (!foundCase.id && !getCaseReference(foundCase))) {
            throw new Error(data.error || 'Case not found');
        }

        const viewerRole = sessionStorage.getItem('lcdjp_userlevel');
        const viewerFullname = sessionStorage.getItem('lcdjp_fullname');

        
        if (!foundCase.currentHandler) {
            foundCase.currentHandler = foundCase.current_handler || null;
            foundCase.handlerRole    = foundCase.handler_role    || null;
        }
        if (!foundCase.currentHandler) {
            if (foundCase.assigned_lawyer) {
                foundCase.currentHandler = foundCase.assigned_lawyer;
                foundCase.handlerRole    = 'Lawyer';
            } else if (foundCase.assigned_lc) {
                foundCase.currentHandler = foundCase.assigned_lc;
                foundCase.handlerRole    = 'LC Official';
            } else if (foundCase.assigned_org) {
                foundCase.currentHandler = foundCase.assigned_org;
                foundCase.handlerRole    = 'Organization';
            }
        }
        
        if (foundCase.assigned_lawyer && foundCase.status === 'Accepted by Lawyer') {
            foundCase.currentHandler = foundCase.assigned_lawyer;
            foundCase.handlerRole    = 'Lawyer';
        }
        
        const isCitizen = foundCase.citizen_id === viewerUsername || 
                         foundCase.citizenUsername === viewerUsername ||
                         foundCase.citizen === viewerUsername ||
                         foundCase.citizenId === viewerUsername;
        
        const isAdmin = viewerRole === 'Admin' || viewerRole === 'System Administrator' || viewerRole === 'SYSTEM_ADMIN';
        const isDistrictAdmin = viewerRole === 'DISTRICT_ADMIN' || viewerRole === 'District Admin';
        const isLawyer = viewerRole === 'Lawyer';
        const isLCOfficial = viewerRole === 'LC' || viewerRole === 'LC1' || viewerRole === 'LC2' || viewerRole === 'LC3' || viewerRole === 'LC Official';
        const isAssignedHandler = foundCase.currentHandler === viewerUsername || foundCase.current_handler === viewerUsername;
        const isAssignedLawyer  = foundCase.assignedLawyer === viewerUsername || foundCase.assigned_lawyer === viewerUsername;
        const isForwarded = foundCase.status && 
                            (foundCase.status.toLowerCase().includes('forwarded') || 
                             foundCase.messagingLocked === true);

        const isReadOnly = (isForwarded && !isAssignedHandler && !isAdmin) || 
                           (foundCase.previousHandlers && foundCase.previousHandlers.some(h => h.username === viewerUsername) && !isAssignedHandler);

        const isMessagingEnabled = foundCase.messaging_enabled !== 0 && 
                                   foundCase.messagingEnabled !== false && 
                                   foundCase.messaging_enabled !== 'false' &&
                                   foundCase.messagingEnabled !== 0;

        const isMessagingLocked = foundCase.messaging_locked === true || 
                                  foundCase.messagingLocked === true || 
                                  foundCase.messaging_locked === 'true' ||
                                  foundCase.messagingLocked === 'true';

        let canMessage = false;
        let messagingStatus = '';

        if (isAdmin) {
            messagingStatus = 'Admin view - Read only.';
            canMessage = false;
        } else if (isDistrictAdmin) {
            messagingStatus = 'District Admin view - Read only.';
            canMessage = false;
        } else if (isReadOnly) {
            messagingStatus = 'Read-Only - Case forwarded to another handler';
            canMessage = false;
        } else if (isMessagingLocked || !isMessagingEnabled) {
            messagingStatus = 'Messaging is locked - Case has been forwarded';
            canMessage = false;
        } else if (foundCase.status === 'Resolved') {
            messagingStatus = 'Case resolved - Messaging closed';
            canMessage = false;
        } else if (foundCase.currentHandler) {
            canMessage = true;
            
            if (isCitizen) {
                messagingStatus = 'You can message your ' + (foundCase.handlerRole || 'Handler') +
                                  ' (' + foundCase.currentHandler + ')';
            } else {
                messagingStatus = 'You can message the Citizen';
            }
        } else {
            messagingStatus = 'No handler assigned yet';
            canMessage = false;
        }

        
        let canEdit = false;
        let canResolve = false;
        let canForward = false;
        let canSendToLawyer = false;
        let canAddAdvice = false;
        let canAddInfo = false;
        const canAcceptOrDecline = isLawyer &&
            foundCase.selected_lawyer === viewerUsername &&
            foundCase.selected_lawyer_status === 'Pending';

        if (isDistrictAdmin) {
            
        } else if (isAdmin) {
            canEdit = true;
            canResolve = true;
            canForward = true;
            canSendToLawyer = true;
            canAddAdvice = true;
            canAddInfo = true;
        } else if (isCitizen && foundCase.status !== 'Resolved' && foundCase.status !== 'Awaiting Lawyer Selection') {
            canAddInfo = true;
            if (foundCase.currentHandler) {
                canMessage = true;
            }
        } else if (isAssignedHandler || isAssignedLawyer) {
            canEdit = true;
            canResolve = true;
            canForward = isLCOfficial; 
            canAddInfo = true;
            if (isLawyer || isAssignedLawyer) {
                canAddAdvice = true;
                canForward = false;
            }
        } else if (isLCOfficial && foundCase.status !== 'Resolved' && !foundCase.assigned_lawyer &&
                   foundCase.status !== 'Awaiting Lawyer Acceptance' &&
                   foundCase.status !== 'Accepted by Lawyer') {
            canEdit = true;
            canForward = true;
            canSendToLawyer = true;
            canAddInfo = true;
            canMessage = (foundCase.currentHandler === viewerUsername || foundCase.current_handler === viewerUsername);
        }

        
        
        
        const _isViewerActiveHandler1 = isAdmin || isCitizen ||
            foundCase.currentHandler === viewerUsername ||
            foundCase.assigned_lawyer === viewerUsername;
        if (!_isViewerActiveHandler1 && (foundCase.currentHandler || foundCase.assigned_lawyer)) {
            canEdit             = false;
            canResolve          = false;
            canForward          = false;
            canSendToLawyer     = false;
            canAddAdvice        = false;
            canAddInfo          = false;
            canMessage          = false;
            messagingStatus     = 'This case is currently with another handler. You have view-only access.';
        }

        let timelineHtml = "";
        let hasEntries = false;
        
        if (foundCase.timeline && foundCase.timeline.length > 0) {
            const timeline = typeof foundCase.timeline === 'string' ? JSON.parse(foundCase.timeline) : foundCase.timeline;
            timeline.forEach(entry => {
                const messageKeywords = ["Message", "message", "Voice", "voice"];
                const isMessageEntry = messageKeywords.some(keyword => 
                    entry.action && entry.action.includes(keyword)
                );
                if (isMessageEntry) return;
                hasEntries = true;
                timelineHtml += `
                    <div style='border:1px solid #e2e5eb;padding:10px;margin:10px 0;background:#f8f9fa;border-radius:8px;'>
                        <b>${escapeHtml(entry.action)}</b>
                        <br><b>Details:</b> ${escapeHtml(entry.details || '')}
                        <br><b>Actor:</b> ${escapeHtml(entry.actor || 'Unknown')}
                        <br><small>${escapeHtml(entry.timestamp || '')}</small>
                    </div>
                `;
            });
        }
        if (!hasEntries) {
            timelineHtml = "<p>No timeline records available.</p>";
        }

       
        let documentsHtml = '';
        let allDocs = [];

        
        
        
        
        
        const _attachedExt = (foundCase.attached_media || '').split('.').pop().toLowerCase();
        const _attachedIsMedia = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'].includes(_attachedExt);

        if (foundCase.attached_file_data && foundCase.attached_media && foundCase.attached_media !== 'None Uploaded' && !_attachedIsMedia) {
            allDocs.push({
                id: 'attached_' + Date.now(),
                name: foundCase.attached_media,
                size: foundCase.attached_file_size || 0,
                data: foundCase.attached_file_data,
                type: foundCase.attached_file_type || '',
                label: 'Case Attachment'
            });
        }
        
        if (foundCase.documents && Array.isArray(foundCase.documents)) {
            foundCase.documents.forEach(function(doc) {
                allDocs.push({
                    id: doc.id || doc.doc_id || 'doc_' + Date.now(),
                    name: doc.file_name || doc.name || 'Untitled',
                    size: doc.file_size || doc.size || 0,
                    data: doc.file_data || doc.data || '',
                    type: doc.file_type || doc.type || '',
                    label: doc.category || 'Document',
                    uploadedBy: doc.owner || doc.uploadedBy || 'Unknown'
                });
            });
        }

        const seenNames = new Set();
        const uniqueDocs = allDocs.filter(function(d) {
            if (seenNames.has(d.name)) return false;
            seenNames.add(d.name);
            return true;
        });

        window._citizenCaseDocCache = window._citizenCaseDocCache || {};
        uniqueDocs.forEach(function (d) { window._citizenCaseDocCache[String(d.id)] = d; });

        if (uniqueDocs.length > 0) {
            documentsHtml = `
                <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                    <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Attached Documents (${escapeHtml(uniqueDocs.length)})</h3>
                    <div style="display:flex; flex-wrap:wrap; gap:10px;">
                        ${uniqueDocs.map(doc => `
                            <div style="background:#f8f9fa; padding:10px 15px; border-radius:8px; border:1px solid #e2e5eb; display:flex; align-items:center; gap:10px;">
                                <span style="font-size:24px;">${getFileIcon(doc.name)}</span>
                                <div>
                                    <div style="font-size:12px; color:#888; margin-bottom:2px;">${escapeHtml(doc.label || 'File')}</div>
                                    <div style="font-size:13px; font-weight:600;">${escapeHtml(doc.name)}</div>
                                    <div style="font-size:11px; color:#888;">${formatFileSize(doc.size)}</div>
                                </div>
                                <button onclick="viewCaseDocument(${escapeHtml(JSON.stringify(String(caseId)))}, ${escapeHtml(JSON.stringify(String(doc.id)))})" 
                                        style="padding:4px 10px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:4px; cursor:pointer; font-size:11px;">
                                    View
                                </button>
                                <button onclick="downloadCaseDocument(${escapeHtml(JSON.stringify(String(caseId)))}, ${escapeHtml(JSON.stringify(String(doc.id)))})" 
                                        style="padding:4px 10px; background:#17a2b8; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">
                                    Download
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        
        let voiceHtml = '';
        if (foundCase.has_voice_statement && foundCase.voice_statement) {
            voiceHtml = `
                <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                    <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Voice Statement</h3>
                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e5eb;">
                        <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                            <button onclick="playVoiceMessage(${escapeHtml(JSON.stringify(String(foundCase.voice_statement)))}, this)" 
                                    style="background:#1a4080; color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center;">
                                ▶
                            </button>
                            <div>
                                <span style="font-weight:bold;">Voice Statement</span>
                                <br>
                                <span style="font-size:12px; color:#666;">Duration: ${escapeHtml(foundCase.voice_duration || 0)} seconds</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        
        let videoHtml = '';
        if (foundCase.has_video_statement && foundCase.video_statement) {
            videoHtml = `
                <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                    <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Video Statement</h3>
                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e5eb;">
                        <video controls style="max-width:300px; max-height:200px; border-radius:6px; background:#000;">
                            <source src="${escapeHtml(foundCase.video_statement)}" type="video/webm">
                            Your browser does not support the video tag.
                        </video>
                        <div style="margin-top:8px;">
                            <span style="font-weight:bold;">Video Statement</span>
                            <br>
                            <span style="font-size:12px; color:#666;">Duration: ${escapeHtml(foundCase.video_duration || 0)} seconds</span>
                        </div>
                    </div>
                </div>
            `;
        }

      
        let mediaHtml = '';
        if (foundCase.attached_media && foundCase.attached_media !== 'None Uploaded' && foundCase.attached_media !== 'None') {
            const fileExt = foundCase.attached_media.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt);
            const isPDF = fileExt === 'pdf';
            
            if ((isImage || isPDF) && foundCase.attached_file_data) {
                mediaHtml = `
                    <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                        <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Attached Media</h3>
                        <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e5eb;">
                            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                                <span style="font-size:13px;"><strong>File:</strong> ${escapeHtml(foundCase.attached_media)}</span>
                                <button onclick="var p=this.parentElement.nextElementSibling; p.style.display=p.style.display==='none'?'block':'none'; this.textContent=p.style.display==='none'?'View Media':'Hide Media';"
                                        style="padding:6px 14px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer; font-size:12px;">View Media</button>
                                <button onclick="downloadFile(${escapeHtml(JSON.stringify(String(foundCase.attached_file_data)))}, ${escapeHtml(JSON.stringify(String(foundCase.attached_media)))})"
                                        style="padding:6px 14px; background:#17a2b8; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">Download</button>
                            </div>
                            <div style="display:none; margin-top:12px;">
                                ${isImage ? `<img src="${escapeHtml(foundCase.attached_file_data)}" style="max-width:100%; max-height:400px; border-radius:6px;">` : 
                                            `<embed src="${escapeHtml(foundCase.attached_file_data)}" type="application/pdf" style="width:100%; height:400px; border-radius:6px;">`}
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        
        let voiceNoteHtml = '';
        if (foundCase.voiceNoteData || foundCase.voice_note_data) {
            const vnData = foundCase.voiceNoteData || foundCase.voice_note_data;
            const vnDuration = foundCase.voiceNoteDuration || foundCase.voice_note_duration || 0;
            voiceNoteHtml = `
                <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                    <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Additional Voice Note</h3>
                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e5eb;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <button onclick="playVoiceMessage(${escapeHtml(JSON.stringify(String(vnData)))}, this)"
                                    style="padding:6px 14px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">Play</button>
                            <span style="font-size:12px; color:#666;">Duration: ${vnDuration} seconds</span>
                        </div>
                    </div>
                </div>
            `;
        }

        let kinHtml = `
            <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Next of Kin</h3>
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e5eb;">
                    <p><strong>Name:</strong> ${escapeHtml(foundCase.kin_name || foundCase.kinName || 'Not Provided')}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(foundCase.kin_phone || foundCase.kinPhone || 'Not Provided')}</p>
                    <p><strong>Email:</strong> ${escapeHtml(foundCase.kin_email || foundCase.kinEmail || 'Not Provided')}</p>
                    <p><strong>Relationship:</strong> ${escapeHtml(foundCase.kin_relationship || foundCase.kinRelationship || 'Not Specified')}</p>
                </div>
            </div>
        `;

        
        let citizenInfoHtml = `
            <div style="margin-top:15px;">
                <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Citizen Information</h3>
                <p><strong>Name:</strong> ${escapeHtml(foundCase.citizen || foundCase.citizen_name || 'N/A')}</p>
                <p><strong>Username:</strong> @${escapeHtml(foundCase.citizen_id || foundCase.citizenUsername || foundCase.citizenId || 'N/A')}</p>
                <p><strong>Phone:</strong> ${escapeHtml(foundCase.citizen_phone || foundCase.citizenPhone || 'Not Provided')}</p>
                <p><strong>Email:</strong> ${escapeHtml(foundCase.citizen_email || foundCase.citizenEmail || 'Not Provided')}</p>
                <p><strong>Location:</strong> ${escapeHtml(foundCase.full_location || foundCase.fullLocation || `${foundCase.village || 'N/A'}, ${foundCase.parish || 'N/A'}`)}</p>
            </div>
        `;

       
        let descriptionHtml = `
            <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Case Description</h3>
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e5eb;">
                    <p style="margin:0; line-height:1.6;">${escapeHtml(lcdjpReadableDescription(foundCase.description) || "No description provided")}</p>
                </div>
            </div>
        `;

        
        
        const _advHandler = (foundCase.status === 'Accepted by Lawyer' && foundCase.assigned_lawyer)
            ? foundCase.assigned_lawyer
            : (foundCase.current_handler || foundCase.currentHandler || foundCase.assigned_lc || 'Unknown');
        const _advRole = (foundCase.status === 'Accepted by Lawyer' && foundCase.assigned_lawyer)
            ? 'Lawyer'
            : (foundCase.handlerRole || foundCase.handler_role || 'Handler');
        const _advProvidedBy = foundCase.legal_advice_provided_by || foundCase.legalAdviceProvidedBy || null;

        
        
        
        
        let legalAdviceHtml = `
            <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Legal Advice &amp; Notes</h3>
                ${(foundCase.legal_advice || foundCase.legalAdvice) ? `
                <div style="background:#f8f9fa; padding:12px; border-radius:8px; border:1px solid #e2e5eb; margin-bottom:10px;">
                    <div style="font-weight:600; color:#1a4080; font-size:12px; margin-bottom:6px;">Official Legal Advice</div>
                    ${escapeHtml(foundCase.legal_advice || foundCase.legalAdvice)}
                    ${_advProvidedBy ? `<p style="margin:8px 0 0 0; font-size:12px; color:#555; border-top:1px solid #e2e5eb; padding-top:6px;"><strong>Provided by:</strong> ${_advProvidedBy} (${_advRole})</p>` : `<p style="margin:8px 0 0 0; font-size:12px; color:#777; border-top:1px solid #e2e5eb; padding-top:6px;"><strong>Handler:</strong> ${_advHandler} (${_advRole})</p>`}
                </div>` : '<div style="padding:12px; background:#f8f9fa; border-radius:8px; color:#999; font-style:italic; border:1px solid #e2e5eb;">No legal advice recorded yet.</div>'}
                ${(foundCase.lc_comments || foundCase.lcComments) ? `
                <div style="background:#f8f9fa; padding:12px; border-radius:8px; border:1px solid #e2e5eb; margin-top:10px;">
                    <div style="font-weight:600; color:#1a4080; font-size:12px; margin-bottom:6px;">LC Official Notes</div>
                    ${escapeHtml(foundCase.lc_comments || foundCase.lcComments)}
                </div>` : ''}
                ${(foundCase.lawyerNotes || foundCase.lawyer_notes) ? `
                <div style="background:#f8f9fa; padding:12px; border-radius:8px; border:1px solid #e2e5eb; margin-top:10px;">
                    <div style="font-weight:600; color:#1a4080; font-size:12px; margin-bottom:6px;">Lawyer Notes</div>
                    ${escapeHtml(foundCase.lawyerNotes || foundCase.lawyer_notes)}
                    ${foundCase.assignedLawyerName ? `<p style="margin:6px 0 0 0; font-size:11px; color:#555;">Lawyer: ${escapeHtml(foundCase.assignedLawyerName)}</p>` : ''}
                </div>` : ''}
                ${(foundCase.orgNotes || foundCase.org_notes || foundCase.organizationNotes) ? `
                <div style="background:#f8f9fa; padding:12px; border-radius:8px; border:1px solid #e2e5eb; margin-top:10px;">
                    <div style="font-weight:600; color:#1a4080; font-size:12px; margin-bottom:6px;">Organisation Notes</div>
                    ${escapeHtml(foundCase.orgNotes || foundCase.org_notes || foundCase.organizationNotes)}
                </div>` : ''}
            </div>
        `;

        
        let lcCommentsHtml = '';

        
        
        
        let lawyerSelectionHtml = '';
        if (foundCase.status === "Awaiting Lawyer Selection" && isCitizen) {
            let lawyerList = [];
            
            if (foundCase.available_lawyers) {
                try {
                    lawyerList = typeof foundCase.available_lawyers === 'string' 
                        ? JSON.parse(foundCase.available_lawyers) 
                        : foundCase.available_lawyers;
                } catch (e) {
                    lawyerList = [];
                }
            }
            
            if (foundCase.availableLawyers && lawyerList.length === 0) {
                try {
                    lawyerList = typeof foundCase.availableLawyers === 'string' 
                        ? JSON.parse(foundCase.availableLawyers) 
                        : foundCase.availableLawyers;
                } catch (e) {
                    lawyerList = [];
                }
            }
            
            if (lawyerList.length > 0) {
                lawyerSelectionHtml = `
                    <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                        <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Select a Lawyer for Your Case</h3>
                        <p style="color:#666; font-size:13px; margin-bottom:15px;">
                            Click on a lawyer to view their profile and select them to handle your case.
                        </p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                            ${lawyerList.map(l => {
                                const _cd = (foundCase.district || '').toLowerCase();
                                const _ld = (l.district || '').toLowerCase();
                                const _sm = _cd && _ld && _cd === _ld;
                                return `
                                <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e5eb; cursor:pointer; transition:all 0.3s;"
                                     onclick="viewLawyerProfile(${escapeHtml(JSON.stringify(String(l.username)))}, ${escapeHtml(JSON.stringify(String(caseId)))})"
                                     onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)';"
                                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                        <div style="font-weight:bold; color:#1a4080; font-size:15px;">${escapeHtml(l.firstName || l.first_name || '')} ${escapeHtml(l.lastName || l.last_name || '')}</div>
                                         ${_sm ? '<span style="color:#1a4080;font-size:10px;white-space:nowrap;">Same District</span>' : ''}
                                    </div>
                                    <div style="font-size:12px; color:#666;">${escapeHtml(l.lawyerSpecialization || l.lawyer_specialization || 'N/A')}</div>
                                    <div style="font-size:12px; color:#888;">${escapeHtml(l.lawFirmName || l.law_firm_name || 'N/A')}</div>
                                    <div style="font-size:11px; color:#999; margin-top:4px;">
                                        ${escapeHtml(l.district || 'N/A')} 
                                        ${l.yearsExperience || l.years_experience ? '• ' + (l.yearsExperience || l.years_experience) + ' years' : ''}
                                    </div>
                                    <div style="margin-top:8px;">
                                        <span style="color:#1a4080; font-size:10px;">Click to view profile</span>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                        <div style="margin-top:10px; padding:10px; background:#f8f9fa; border-radius:8px; border:1px solid #e2e5eb; font-size:12px; color:#555;">
                            <strong>Note:</strong> You can view each lawyer's profile before making your selection.
                        </div>
                    </div>
                `;
            } else {
                lawyerSelectionHtml = `
                    <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                        <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e5eb;">
                            <h4 style="color:#1a4080; margin:0 0 5px 0;">Awaiting Lawyer Assignment</h4>
                            <p style="margin:0; font-size:13px; color:#666;">
                                The system is finding available lawyers for your case. You will be notified when lawyers are available to choose from.
                            </p>
                        </div>
                    </div>
                `;
            }
        }

       
        let messagingHtml = '';
        if (canMessage && foundCase.status !== 'Resolved' && foundCase.status !== 'Awaiting Lawyer Selection') {
            messagingHtml = `
                <div style="margin:15px 0; padding:12px 15px; background:#f8f9fa; border-radius:8px; border:1px solid #e2e5eb;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <strong style="color:#28a745;">${messagingStatus}</strong>
                        </div>
                        <div>
                            <button onclick="openMessagingForCase(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:8px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                                Open Messaging
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (foundCase.status !== 'Resolved' && foundCase.currentHandler) {
            messagingHtml = `
                <div style="margin:15px 0; padding:12px 15px; background:#f8f9fa; border-radius:8px; border:1px solid #e2e5eb;">
                    <strong style="color:#666;">${messagingStatus}</strong>
                    <span style="font-size:12px; color:#666; margin-left:10px;">Current Handler: ${escapeHtml(foundCase.handlerRole || 'Unknown')}</span>
                </div>
            `;
        }

        
        let actionButtonsHtml = `
            <div style="margin-top:20px; border-top:1px solid #e2e5eb; padding-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
        `;

        if (canAcceptOrDecline) {
            actionButtonsHtml += `
                <button onclick="acceptSelectedCase(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                    &#10003; Accept Case
                </button>
                <button onclick="declineSelectedCase(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                    &#10007; Decline Case
                </button>
            `;
        }

        if (isCitizen && foundCase.status !== 'Resolved' && foundCase.status !== 'Awaiting Lawyer Selection') {
            actionButtonsHtml += `
                <button onclick="showAppendDetailsForm(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer;">
                    Add Info
                </button>
            `;
        }

        if (isCitizen && foundCase.status !== 'Resolved') {
            const _fmaCaseType = (foundCase.case_type || foundCase.caseType || '').replace(/'/g, "\\'");
            const _fmaDistrict = (foundCase.district || '').replace(/'/g, "\\'");
            actionButtonsHtml += `
                <button onclick="typeof openFindMoreAssistance==='function' && openFindMoreAssistance(${escapeHtml(JSON.stringify(String(caseId)))}, ${escapeHtml(JSON.stringify(String(_fmaCaseType)))}, ${escapeHtml(JSON.stringify(String(_fmaDistrict)))})" style="padding:10px 20px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer; font-weight:bold;">
                    Find More Assistance
                </button>
            `;
        }

        if (canAddInfo && !isCitizen && foundCase.status !== 'Resolved' && foundCase.status !== 'Awaiting Lawyer Selection') {
            actionButtonsHtml += `
                <button onclick="showAppendDetailsForm(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer;">
                    Add Info
                </button>
            `;
        }

        if (canResolve && foundCase.status !== 'Resolved') {
            actionButtonsHtml += `
                <button onclick="resolveCase(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
                    Resolve Case
                </button>
            `;
        }

        if (canForward && foundCase.status !== 'Resolved' && foundCase.status !== 'Awaiting Lawyer Selection') {
            actionButtonsHtml += `
                <button onclick="showForwardRouterForm(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer;">
                    Forward Case
                </button>
            `;
        }

        if (canAddAdvice) {
            const _adviceLawyerLabel = (foundCase.status === 'Accepted by Lawyer' && foundCase.assigned_lawyer)
                ? ', Handler: ' + (foundCase.assigned_lawyer_name || foundCase.assigned_lawyer)
                : '';
            actionButtonsHtml += `
                <button onclick="openLegalAdvice(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer;">
                    Legal Advice${_adviceLawyerLabel}
                </button>
            `;
        }

        if (canMessage && foundCase.status !== 'Resolved' && foundCase.status !== 'Awaiting Lawyer Selection') {
            actionButtonsHtml += `
                <button onclick="openMessagingForCase(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer; font-weight:bold;">
                    Messages
                </button>
            `;
        }

        actionButtonsHtml += `
                <button onclick="showDocumentManager(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer;">
                    Docs
                </button>
                <button onclick="printCaseDetails(${escapeHtml(JSON.stringify(String(caseId)))})" style="padding:10px 20px; background:#fff; color:#1a4080; border:1px solid #1a4080; border-radius:6px; cursor:pointer;">
                    Print
                </button>
                <button onclick="closeCaseDetails()" style="padding:10px 20px; background:#fff; color:#6c757d; border:1px solid #ccc; border-radius:6px; cursor:pointer;">
                    Close
                </button>
            </div>
        `;

        
        let statusBadge = '';
        if (foundCase.status === "Resolved") {
            statusBadge = '<span class="badge badge-resolved" style="font-size:14px; padding:6px 16px;">Resolved</span>';
        } else if (foundCase.status === "Pending") {
            statusBadge = '<span class="badge badge-pending" style="font-size:14px; padding:6px 16px;">Pending</span>';
        } else if (foundCase.status === "Accepted by Lawyer") {
            statusBadge = '<span class="badge badge-lawyer" style="font-size:14px; padding:6px 16px;">With Lawyer</span>';
        } else if (foundCase.status === "Awaiting Lawyer Selection" || foundCase.status === "Awaiting Lawyer Acceptance") {
            statusBadge = '<span class="badge badge-higher" style="font-size:14px; padding:6px 16px; background:#fff3cd; color:#856404;">Awaiting Lawyer</span>';
        } else if (foundCase.status === "Referred to Police") {
            statusBadge = '<span class="badge badge-higher" style="font-size:14px; padding:6px 16px; background:#fce4ec; color:#c62828;">Referred to Police</span>';
        } else {
            statusBadge = `<span class="badge badge-pending" style="font-size:14px; padding:6px 16px;">${escapeHtml(foundCase.status || 'Pending')}</span>`;
        }

        let readOnlyBanner = '';
        if (isReadOnly || !_isViewerActiveHandler1) {
            readOnlyBanner = `
                <div style="margin:15px 0; padding:15px; background:#fff3cd; border-radius:8px; border-left:4px solid #ff9800;">
                    <strong style="color:#856404;">View Only, Actions Disabled</strong>
                    <p style="margin:5px 0 0 0; color:#856404; font-size:13px;">
                        This case is currently being handled by another party. You can view the case details but cannot resolve, message, forward, add advice, or take any other action.
                        ${foundCase.currentHandler ? ' Current Handler: <strong>' + foundCase.currentHandler + '</strong>' + (foundCase.handlerRole ? ' (' + foundCase.handlerRole + ')' : '') : ''}
                    </p>
                </div>
            `;
        }

        
        const resolvedRef = getCaseReference(foundCase) || caseId;
        
        let fullHtml = `
            <div style="padding:10px; max-width:900px; margin:0 auto;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid #e2e5eb; padding-bottom:15px;">
                    <div>
                        <h2 style="color:#1a4080; margin:0;">Case File: ${resolvedRef}</h2>
                        <p style="color:#666; margin:5px 0 0 0;">${escapeHtml(foundCase.case_type || foundCase.caseType || 'General')}</p>
                    </div>
                    <div>
                        ${statusBadge}
                        ${isCitizen ? '<span style="background:#28a745; color:white; padding:4px 12px; border-radius:12px; font-size:12px; margin-left:8px;">You</span>' : ''}
                    </div>
                </div>
                
                ${readOnlyBanner}
                
                
                <div style="margin:15px 0; padding:12px 15px; background:#f8f9fa; border-radius:8px; border:1px solid #e2e5eb;">
                    <strong>Current Handler:</strong> ${escapeHtml(foundCase.currentHandler || 'Not Assigned Yet')} 
                    ${foundCase.handlerRole ? `(${foundCase.handlerRole})` : ''}
                    ${foundCase.messaging_enabled || foundCase.messagingEnabled ? '<span style="color:#28a745; margin-left:10px;">Messaging Active</span>' : '<span style="color:#dc3545; margin-left:10px;">Messaging Locked</span>'}
                </div>
                
                ${messagingHtml}
                ${citizenInfoHtml}
                ${kinHtml}
                ${voiceNoteHtml}
                ${descriptionHtml}
                ${lawyerSelectionHtml}
                ${mediaHtml}
                ${voiceHtml}
                ${videoHtml}
                ${documentsHtml}
                ${lcCommentsHtml}
                ${legalAdviceHtml}
                
                
                <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                    <h3 style="color:#1a4080; font-size:15px; margin:0 0 10px;">Case Progress Timeline</h3>
                    ${timelineHtml}
                </div>
                
                ${actionButtonsHtml}
                
                
                <div style="margin-top:15px; padding:12px; background:#f8f9fa; border-radius:8px; font-size:12px; color:#666; text-align:center;">
                    Case Status: <strong>${escapeHtml(foundCase.status || 'Pending')}</strong> • 
                    Submitted: ${foundCase.created_at ? new Date(foundCase.created_at).toLocaleDateString() : 'N/A'} • 
                    Last Updated: ${foundCase.updated_at ? new Date(foundCase.updated_at).toLocaleString() : 'N/A'}
                </div>
            </div>
        `;

        finalContent.innerHTML = fullHtml;
        finalModal.style.display = "block";

    } catch (error) {
        console.error('Error fetching case:', error);
        finalContent.innerHTML = `
            <div style="text-align:center; padding:40px; color:#dc3545;">
                <p>Error loading case: ${escapeHtml(error.message)}</p>
                <p style="font-size:12px; color:#888; margin-top:5px;">Case Reference: ${escapeHtml(caseId)}</p>
                <button onclick="viewCitizenCase(${escapeHtml(JSON.stringify(String(caseId)))})" style="margin-top:15px; padding:8px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">Retry</button>
                <button onclick="closeCaseDetails()" style="margin-top:15px; padding:8px 20px; background:#6c757d; color:white; border:none; border-radius:6px; cursor:pointer; margin-left:10px;">Close</button>
            </div>
        `;
    }
}


function _cmEsc(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function openCitizenMessaging(caseId) {
    caseId = String(caseId == null ? '' : caseId).trim();
    if (!caseId || /^(n\/a|null|undefined|none)$/i.test(caseId)) {
        alert('No case reference available for messaging.');
        return;
    }

    var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username');
    if (!username) {
        alert('Please login to send messages.');
        return;
    }

    var old = document.getElementById('citizenMessagingModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'citizenMessagingModal';
    modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.6);z-index:10005;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    modal.innerHTML =
        '<div style="background:white;border-radius:12px;max-width:520px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3);">' +
            '<div style="background:#1a4080;color:white;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
                '<div><strong>Messages</strong><div style="font-size:11px;opacity:0.85;">Case: ' + _cmEsc(caseId) + '</div></div>' +
                '<button onclick="document.getElementById(\'citizenMessagingModal\').remove();" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;line-height:1;">&times;</button>' +
            '</div>' +
            '<div id="citizenMessagingList" style="flex:1;overflow-y:auto;padding:14px 16px;background:#f8f9fa;min-height:200px;">' +
                '<p style="text-align:center;color:#999;padding:30px 0;">Loading conversation&hellip;</p>' +
            '</div>' +
            '<div id="cmVoiceRecordingBar" style="display:none;padding:8px 14px;background:#fff5f5;border-top:1px solid #ffdddd;align-items:center;gap:10px;flex-shrink:0;">' +
                '<span style="width:10px;height:10px;border-radius:50%;background:#dc3545;display:inline-block;animation:cmPulse 1s infinite;"></span>' +
                '<span style="font-size:12px;color:#dc3545;flex:1;">Recording&hellip; <span id="cmVoiceTimerDisplay">0:00</span></span>' +
                '<button onclick="cmCancelVoiceRecording()" style="padding:6px 12px;background:#999;color:white;border:none;border-radius:16px;font-size:12px;cursor:pointer;">Cancel</button>' +
                '<button onclick="cmStopVoiceRecording(\'' + _cmEsc(caseId) + '\')" style="padding:6px 14px;background:#1a4080;color:white;border:none;border-radius:16px;font-size:12px;cursor:pointer;font-weight:600;">Send</button>' +
            '</div>' +
            '<style>@keyframes cmPulse{0%,100%{opacity:1}50%{opacity:.3}}</style>' +
            '<div style="padding:10px 14px;border-top:1px solid #eee;display:flex;gap:8px;align-items:center;background:white;flex-shrink:0;">' +
                '<div style="position:relative;flex:1;min-width:0;">' +
                    '<button id="cmVoiceMicBtn" onclick="cmStartVoiceRecording(\'' + _cmEsc(caseId) + '\')" title="Record a voice message" ' +
                        'style="position:absolute;left:4px;top:50%;transform:translateY(-50%);width:28px;height:28px;flex-shrink:0;padding:0;background:#f0f5ff;color:#1a4080;border:1px solid #cfe0ff;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">&#127908;</button>' +
                    '<input type="text" id="citizenMessagingInput" placeholder="Type your message&hellip;" ' +
                        'style="width:100%;height:36px;padding:0 14px 0 40px;border:1px solid #ddd;border-radius:18px;font-size:13px;outline:none;box-sizing:border-box;" ' +
                        'onkeypress="if(event.key===\'Enter\') sendCitizenCaseMessage(\'' + _cmEsc(caseId) + '\')">' +
                '</div>' +
                '<button onclick="sendCitizenCaseMessage(\'' + _cmEsc(caseId) + '\')" ' +
                    'style="height:36px;flex-shrink:0;padding:0 16px;background:#1a4080;color:white;border:none;border-radius:18px;font-weight:600;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;white-space:nowrap;">Send</button>' +
            '</div>' +
        '</div>';

    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    await _cmRefreshMessages(caseId);
}
window.openCitizenMessaging = openCitizenMessaging;

window.openMessagingForCase = openCitizenMessaging;

async function _cmRefreshMessages(caseId) {
    var list = document.getElementById('citizenMessagingList');
    if (!list) return;
    try {
        var response = await fetch(API_ENDPOINTS.messages(caseId), {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to load messages');
        var data = await response.json();
        var msgs = Array.isArray(data) ? data : (data.messages || data.data || []);
        var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username');

        if (!msgs.length) {
            list.innerHTML = '<p style="text-align:center;color:#999;padding:30px 0;">No messages yet. Send the first one below.</p>';
            return;
        }

        msgs.sort(function (a, b) { return new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0); });

        list.innerHTML = msgs.map(function (m) {
            
            
            
            
            
            var isMine = (m.from_username || m.fromUsername || m.from_user || m.from) === username;
            var text = m.message_text || m.text || m.message || '';
            var audioData = m.audio_data || m.audioData || '';
            var audioDuration = m.audio_duration || m.audioDuration || 0;
            var ts = m.timestamp || m.created_at || '';
            var tsLabel = ts ? new Date(ts).toLocaleString() : '';
            var bodyHtml = audioData
                ? '<div style="display:flex;align-items:center;gap:8px;">' +
                      '<audio controls preload="none" src="' + audioData + '" style="height:32px;max-width:180px;"></audio>' +
                      (audioDuration ? '<span style="font-size:10px;opacity:0.7;">' + audioDuration + 's</span>' : '') +
                  '</div>'
                : '<div>' + _cmEsc(text) + '</div>';
            return '<div style="display:flex;justify-content:' + (isMine ? 'flex-end' : 'flex-start') + ';margin-bottom:8px;">' +
                '<div style="max-width:75%;padding:8px 12px;border-radius:' + (isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px') +
                    ';background:' + (isMine ? '#1a4080' : '#fff') + ';color:' + (isMine ? '#fff' : '#333') +
                    ';box-shadow:0 1px 3px rgba(0,0,0,0.1);font-size:13px;">' +
                    bodyHtml +
                    (tsLabel ? '<div style="font-size:9px;opacity:0.7;margin-top:4px;">' + _cmEsc(tsLabel) + '</div>' : '') +
                '</div>' +
            '</div>';
        }).join('');

        list.scrollTop = list.scrollHeight;
    } catch (error) {
        console.error('Error loading case messages:', error);
        list.innerHTML = '<p style="text-align:center;color:#dc3545;padding:20px 0;">Could not load messages.<br>' +
            '<button onclick="_cmRefreshMessages(\'' + _cmEsc(caseId) + '\')" style="padding:5px 12px;background:#1a4080;color:white;border:none;border-radius:6px;cursor:pointer;margin-top:8px;">Retry</button></p>';
    }
}















function _cmResolveCounterparty(foundCase, username) {
    var citizenUsername = foundCase.citizen_id || foundCase.citizenUsername ||
        foundCase.citizen || foundCase.citizenId || null;
    var isSenderCitizen = citizenUsername === username;
    var recipient = isSenderCitizen
        ? (foundCase.assigned_lawyer || foundCase.assigned_lc || foundCase.currentHandler || foundCase.current_handler || 'admin')
        : (citizenUsername || 'admin');
    return { isSenderCitizen: isSenderCitizen, recipient: recipient };
}

async function sendCitizenCaseMessage(caseId) {
    var input = document.getElementById('citizenMessagingInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username');
    var fullname = sessionStorage.getItem('lcdjp_fullname') || username || 'User';

    input.value = '';
    input.disabled = true;

    try {
        var caseResponse = await fetch(API_ENDPOINTS.case(encodeURIComponent(caseId)), {
            headers: getAuthHeaders()
        });
        var foundCase = caseResponse.ok ? await caseResponse.json() : {};
        foundCase = foundCase.case || foundCase;
        var counterparty = _cmResolveCounterparty(foundCase, username);
        var recipient = counterparty.recipient;

        var msgObj = {
            caseId: caseId,
            from: counterparty.isSenderCitizen ? 'Citizen' : 'Lawyer',
            fromName: fullname,
            fromUsername: username,
            text: text,
            timestamp: new Date().toISOString(),
            read: false,
            delivered: true,
            sentTo: recipient
        };

        var response = await fetch(API_ENDPOINTS.messages(caseId), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(msgObj)
        });

        if (!response.ok) throw new Error('Failed to send message');

        
        
        
        
        
        
        
        if (recipient && recipient !== username && typeof createEnhancedNotification === 'function') {
            createEnhancedNotification(
                recipient,
                fullname + ' sent a message about case ' + caseId,
                counterparty.isSenderCitizen ? 'citizen_message' : 'lawyer_message',
                caseId
            ).catch(function (e) { console.warn('Could not notify recipient of new message:', e); });
        }

        await _cmRefreshMessages(caseId);
    } catch (error) {
        console.error('Error sending case message:', error);
        if (typeof showToast === 'function') showToast('Failed to send message. Please try again.');
        else alert('Failed to send message. Please try again.');
    } finally {
        input.disabled = false;
        input.focus();
    }
}
window.sendCitizenCaseMessage = sendCitizenCaseMessage;






var _cmMediaRecorder = null;
var _cmAudioChunks = [];
var _cmIsRecording = false;
var _cmRecordingTimer = null;
var _cmRecordingStartTime = null;
var _cmDiscardRecording = false;

function cmStartVoiceRecording(caseId) {
    if (_cmIsRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (typeof showToast === 'function') showToast('Voice recording is not supported in this browser.');
        else alert('Voice recording is not supported in this browser.');
        return;
    }
    if (!window.MediaRecorder) {
        if (typeof showToast === 'function') showToast('MediaRecorder API not supported. Please use Chrome or Firefox.');
        else alert('MediaRecorder API not supported. Please use Chrome or Firefox.');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            _cmMediaRecorder = new MediaRecorder(stream);
            _cmAudioChunks = [];
            _cmDiscardRecording = false;

            _cmMediaRecorder.ondataavailable = function (event) {
                if (event.data.size > 0) _cmAudioChunks.push(event.data);
            };

            _cmMediaRecorder.onstop = function () {
                stream.getTracks().forEach(function (track) { track.stop(); });

                var bar = document.getElementById('cmVoiceRecordingBar');
                if (bar) bar.style.display = 'none';
                var micBtn = document.getElementById('cmVoiceMicBtn');
                if (micBtn) micBtn.style.display = 'flex';

                if (_cmDiscardRecording || _cmAudioChunks.length === 0) {
                    _cmDiscardRecording = false;
                    return;
                }

                var duration = _cmRecordingStartTime ? Math.round((Date.now() - _cmRecordingStartTime) / 1000) : 0;
                var audioBlob = new Blob(_cmAudioChunks, { type: 'audio/webm' });
                var reader = new FileReader();
                reader.onload = function (e) {
                    _cmSendVoiceMessage(caseId, e.target.result, duration);
                };
                reader.readAsDataURL(audioBlob);
            };

            _cmMediaRecorder.start(100);
            _cmIsRecording = true;
            _cmRecordingStartTime = Date.now();

            var micBtn = document.getElementById('cmVoiceMicBtn');
            if (micBtn) micBtn.style.display = 'none';
            var bar = document.getElementById('cmVoiceRecordingBar');
            if (bar) bar.style.display = 'flex';

            var seconds = 0;
            if (_cmRecordingTimer) clearInterval(_cmRecordingTimer);
            _cmRecordingTimer = setInterval(function () {
                seconds++;
                var display = document.getElementById('cmVoiceTimerDisplay');
                if (display) {
                    var mins = Math.floor(seconds / 60);
                    var secs = seconds % 60;
                    display.textContent = mins + ':' + secs.toString().padStart(2, '0');
                }
            }, 1000);

            
            setTimeout(function () {
                if (_cmIsRecording) {
                    cmStopVoiceRecording(caseId);
                    if (typeof showToast === 'function') showToast('Recording stopped (60 second limit)');
                }
            }, 60000);
        })
        .catch(function (error) {
            console.error('Error accessing microphone:', error);
            var msg = 'Could not access microphone: ' + error.message;
            if (error.name === 'NotAllowedError') msg = 'Please allow microphone access to record a voice message.';
            else if (error.name === 'NotFoundError') msg = 'No microphone found. Please connect a microphone.';
            if (typeof showToast === 'function') showToast(msg);
            else alert(msg);
        });
}

function _cmStopRecordingInternal() {
    if (!_cmIsRecording || !_cmMediaRecorder) return;
    _cmIsRecording = false;
    if (_cmRecordingTimer) { clearInterval(_cmRecordingTimer); _cmRecordingTimer = null; }
    try { _cmMediaRecorder.stop(); } catch (e) { console.error('Error stopping recorder:', e); }
}

function cmStopVoiceRecording(caseId) {
    
    
    _cmStopRecordingInternal();
}

function cmCancelVoiceRecording() {
    _cmDiscardRecording = true;
    _cmStopRecordingInternal();
}

async function _cmSendVoiceMessage(caseId, audioDataUrl, duration) {
    var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username');
    var fullname = sessionStorage.getItem('lcdjp_fullname') || username || 'User';

    try {
        var caseResponse = await fetch(API_ENDPOINTS.case(encodeURIComponent(caseId)), {
            headers: getAuthHeaders()
        });
        var foundCase = caseResponse.ok ? await caseResponse.json() : {};
        foundCase = foundCase.case || foundCase;
        var counterparty = _cmResolveCounterparty(foundCase, username);
        var recipient = counterparty.recipient;

        var msgObj = {
            caseId: caseId,
            from: counterparty.isSenderCitizen ? 'Citizen' : 'Lawyer',
            fromName: fullname,
            fromUsername: username,
            text: '[Voice message]',
            audioData: audioDataUrl,
            audioDuration: duration,
            timestamp: new Date().toISOString(),
            read: false,
            delivered: true,
            sentTo: recipient
        };

        var response = await fetch(API_ENDPOINTS.messages(caseId), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(msgObj)
        });

        if (!response.ok) throw new Error('Failed to send voice message');

        
        
        
        if (recipient && recipient !== username && typeof createEnhancedNotification === 'function') {
            createEnhancedNotification(
                recipient,
                fullname + ' sent a voice message about case ' + caseId,
                'voice_message',
                caseId
            ).catch(function (e) { console.warn('Could not notify recipient of new voice message:', e); });
        }

        await _cmRefreshMessages(caseId);
    } catch (error) {
        console.error('Error sending voice message:', error);
        if (typeof showToast === 'function') showToast('Failed to send voice message. Please try again.');
        else alert('Failed to send voice message. Please try again.');
    }
}
window.cmStartVoiceRecording = cmStartVoiceRecording;
window.cmStopVoiceRecording = cmStopVoiceRecording;
window.cmCancelVoiceRecording = cmCancelVoiceRecording;


async function showDocumentManager(caseId) {
    caseId = String(caseId == null ? '' : caseId).trim();
    if (!caseId || /^(n\/a|null|undefined|none)$/i.test(caseId)) {
        alert('No case reference available for documents.');
        return;
    }

    var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username');
    if (!username) {
        alert('Please login to manage documents.');
        return;
    }

    var old = document.getElementById('citizenDocManagerModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'citizenDocManagerModal';
    modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.6);z-index:10005;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    modal.innerHTML =
        '<div style="background:white;border-radius:12px;max-width:560px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3);">' +
            '<div style="background:#1a4080;color:white;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
                '<div><strong>Case Documents</strong><div style="font-size:11px;opacity:0.85;">Case: ' + _cmEsc(caseId) + '</div></div>' +
                '<button onclick="document.getElementById(\'citizenDocManagerModal\').remove();" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;line-height:1;">&times;</button>' +
            '</div>' +
            '<div style="padding:14px 18px;border-bottom:1px solid #eee;flex-shrink:0;">' +
                '<label for="citizenDocUploadInput" style="display:block;padding:14px;border:2px dashed #ccc;border-radius:8px;text-align:center;cursor:pointer;color:#666;font-size:13px;">' +
                    'Click to upload a document (max 5MB)' +
                '</label>' +
                '<input type="file" id="citizenDocUploadInput" style="display:none;" onchange="uploadCitizenCaseDocument(\'' + _cmEsc(caseId) + '\', this)">' +
                '<div id="citizenDocUploadStatus" style="font-size:12px;color:#888;margin-top:6px;"></div>' +
            '</div>' +
            '<div id="citizenDocManagerList" style="flex:1;overflow-y:auto;padding:14px 18px;background:#f8f9fa;min-height:150px;">' +
                '<p style="text-align:center;color:#999;padding:30px 0;">Loading documents&hellip;</p>' +
            '</div>' +
        '</div>';

    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    await _dmRefreshDocuments(caseId);
}
window.showDocumentManager = showDocumentManager;

async function _dmRefreshDocuments(caseId) {
    var list = document.getElementById('citizenDocManagerList');
    if (!list) return;
    try {
        var response = await fetch(API_ENDPOINTS.caseDocuments(caseId), {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to load documents');
        var data = await response.json();
        var docs = Array.isArray(data) ? data : (data.documents || data.data || []);

        if (!docs.length) {
            list.innerHTML = '<p style="text-align:center;color:#999;padding:30px 0;">No documents uploaded for this case yet.</p>';
            return;
        }

        docs.sort(function (a, b) { return new Date(b.created_at || b.uploaded_at || 0) - new Date(a.created_at || a.uploaded_at || 0); });

        list.innerHTML = docs.map(function (d) {
            var docId = d.id || d._id || '';
            var name = d.file_name || d.fileName || 'Document';
            var sizeKb = d.file_size ? Math.round(d.file_size / 1024) + ' KB' : '';
            var uploaded = d.created_at || d.uploaded_at || '';
            var uploadedLabel = uploaded ? new Date(uploaded).toLocaleDateString() : '';
            return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border-radius:8px;padding:10px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">' +
                '<div style="min-width:0;">' +
                    '<div style="font-size:13px;font-weight:600;color:#1a4080;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _cmEsc(name) + '</div>' +
                    '<div style="font-size:11px;color:#888;">' + [sizeKb, uploadedLabel].filter(Boolean).join(' &middot; ') + '</div>' +
                '</div>' +
                '<div style="display:flex;gap:6px;flex-shrink:0;">' +
                    '<button onclick="viewCitizenCaseDocument(\'' + _cmEsc(docId) + '\')" style="padding:6px 12px;background:#fff;color:#17a2b8;border:1px solid #17a2b8;border-radius:6px;cursor:pointer;font-size:12px;">View</button>' +
                    '<button onclick="deleteCitizenCaseDocument(\'' + _cmEsc(docId) + '\', \'' + _cmEsc(caseId) + '\')" style="padding:6px 12px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Delete</button>' +
                '</div>' +
            '</div>';
        }).join('');
    } catch (error) {
        console.error('Error loading case documents:', error);
        list.innerHTML = '<p style="text-align:center;color:#dc3545;padding:20px 0;">Could not load documents.<br>' +
            '<button onclick="_dmRefreshDocuments(\'' + _cmEsc(caseId) + '\')" style="padding:5px 12px;background:#1a4080;color:white;border:none;border-radius:6px;cursor:pointer;margin-top:8px;">Retry</button></p>';
    }
}

async function uploadCitizenCaseDocument(caseId, inputEl) {
    var file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    file = await window.lcdjpCompressImageFile(file);
    var status = document.getElementById('citizenDocUploadStatus');

    if (file.size > 5 * 1024 * 1024) {
        if (status) status.textContent = 'File is larger than 5MB, please choose a smaller file.';
        inputEl.value = '';
        return;
    }

    var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username');
    if (status) status.textContent = 'Uploading&hellip;';

    try {
        var fileData = await new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (e) { resolve(e.target.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        var response = await fetch(API_ENDPOINTS.uploadDocument, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                file_data: fileData,
                owner: username,
                case_id: caseId,
                category: 'case_attachment',
                description: 'Uploaded from case document manager'
            })
        });

        if (!response.ok) throw new Error('Upload failed');

        if (status) status.textContent = 'Uploaded successfully.';
        inputEl.value = '';
        await _dmRefreshDocuments(caseId);
    } catch (error) {
        console.error('Error uploading document:', error);
        if (status) status.textContent = 'Upload failed. Please try again.';
    }
}
window.uploadCitizenCaseDocument = uploadCitizenCaseDocument;

async function viewCitizenCaseDocument(docId) {
    if (!docId) return;
    try {
        var response = await fetch(API_ENDPOINTS.document(docId), {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to load document');
        var data = await response.json();
        var doc = data.document || data;
        var fileData = doc.file_data || doc.fileData;
        if (fileData && String(fileData).indexOf('/api/files/') === 0) fileData = API_BASE_URL + fileData;
        if (fileData) {
            var win = window.open();
            if (win) {
                win.document.write('<iframe src="' + fileData + '" style="width:100%;height:100%;border:none;"></iframe>');
            }
        } else if (doc.url) {
            window.open(doc.url, '_blank');
        } else {
            alert('This document cannot be previewed.');
        }
    } catch (error) {
        console.error('Error viewing document:', error);
        alert('Could not open this document. Please try again.');
    }
}
window.viewCitizenCaseDocument = viewCitizenCaseDocument;

async function deleteCitizenCaseDocument(docId, caseId) {
    if (!docId) return;
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
        var response = await fetch(API_ENDPOINTS.deleteDocument(docId), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete document');
        await _dmRefreshDocuments(caseId);
    } catch (error) {
        console.error('Error deleting document:', error);
        alert('Could not delete this document. Please try again.');
    }
}
window.deleteCitizenCaseDocument = deleteCitizenCaseDocument;








var _docPageSelectedFiles = [];

function _dmFormatSize(bytes) {
    if (!bytes) return '0 MB';
    var mb = bytes / (1024 * 1024);
    if (mb >= 0.1) return mb.toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
}

function _dmCurrentUsername() {
    return sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username');
}

async function _dmFetchAllDocuments() {
    var username = _dmCurrentUsername();
    if (!username) return [];
    var response = await fetch(API_ENDPOINTS.userDocuments(username), {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to load documents');
    var data = await response.json();
    return Array.isArray(data) ? data : (data.documents || data.data || []);
}

function showDocumentManagementPage() {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('This feature is not available at this time.');
        }
        return;
    }
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();
    var page = document.getElementById('documentManagementPage');
    if (page) page.style.display = 'block';
    _dmLoadManagementPage();
}
window.showDocumentManagementPage = showDocumentManagementPage;

async function _dmLoadManagementPage() {
    var listEl = document.getElementById('documentListPage');
    if (listEl) {
        listEl.innerHTML = '<div style="text-align:center; padding:60px; color:#999;"><p>Loading documents&hellip;</p></div>';
    }
    try {
        var docs = await _dmFetchAllDocuments();

        var totalCount = docs.length;
        var caseCount = docs.filter(function (d) { return !!(d.case_id || d.caseId); }).length;
        var sharedCount = docs.filter(function (d) {
            return (Array.isArray(d.shared_with) && d.shared_with.length > 0) || d.is_shared;
        }).length;
        var totalBytes = docs.reduce(function (sum, d) { return sum + (d.file_size || 0); }, 0);

        var elTotal = document.getElementById('docTotalCountPage');
        var elCase = document.getElementById('docCaseCountPage');
        var elShared = document.getElementById('docSharedCountPage');
        var elSize = document.getElementById('docSizeTotalPage');
        if (elTotal) elTotal.textContent = String(totalCount);
        if (elCase) elCase.textContent = String(caseCount);
        if (elShared) elShared.textContent = String(sharedCount);
        if (elSize) elSize.textContent = _dmFormatSize(totalBytes);

        if (!listEl) return;

        if (!docs.length) {
            listEl.innerHTML =
                '<div style="text-align:center; padding:60px; color:#999;">' +
                    '<p>No documents uploaded yet.</p>' +
                    '<p style="font-size:13px;">Click "Upload Document" to add your first document.</p>' +
                '</div>';
            return;
        }

        docs.sort(function (a, b) { return new Date(b.created_at || b.uploaded_at || 0) - new Date(a.created_at || a.uploaded_at || 0); });
        listEl.innerHTML = _dmRenderDocList(docs);
    } catch (error) {
        console.error('Error loading documents:', error);
        if (listEl) {
            listEl.innerHTML =
                '<div style="text-align:center; padding:40px; color:#dc3545;">' +
                    '<p>Could not load your documents.</p>' +
                    '<button onclick="_dmLoadManagementPage()" style="margin-top:10px; padding:8px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">Retry</button>' +
                '</div>';
        }
    }
}
window._dmLoadManagementPage = _dmLoadManagementPage;

function _dmRenderDocList(docs) {
    return '<div style="display:grid; gap:10px;">' + docs.map(function (d) {
        var docId = d.id || d._id || '';
        var name = d.file_name || d.fileName || 'Document';
        var category = d.category || 'general';
        var sizeLabel = _dmFormatSize(d.file_size || 0);
        var uploaded = d.created_at || d.uploaded_at || '';
        var uploadedLabel = uploaded ? new Date(uploaded).toLocaleDateString() : '';
        var caseId = d.case_id || d.caseId || '';
        return '<div style="display:flex; justify-content:space-between; align-items:center; gap:12px; background:#f8f9fa; border-radius:10px; padding:12px 16px;">' +
            '<div style="min-width:0;">' +
                '<div style="font-weight:600; color:#1a4080; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + _cmEsc(name) + '</div>' +
                '<div style="font-size:12px; color:#888; margin-top:2px;">' +
                    _cmEsc(category) + ' &middot; ' + sizeLabel + (uploadedLabel ? ' &middot; ' + uploadedLabel : '') +
                    (caseId ? ' &middot; Case ' + _cmEsc(caseId) : '') +
                '</div>' +
            '</div>' +
            '<div style="display:flex; gap:6px; flex-shrink:0;">' +
                '<button onclick="viewCitizenCaseDocument(\'' + _cmEsc(docId) + '\')" style="padding:6px 14px; background:#fff; color:#17a2b8; border:1px solid #17a2b8; border-radius:6px; cursor:pointer; font-size:12px;">View</button>' +
                '<button onclick="_dmDeleteFromManagementPage(\'' + _cmEsc(docId) + '\')" style="padding:6px 14px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">Delete</button>' +
            '</div>' +
        '</div>';
    }).join('') + '</div>';
}

async function _dmDeleteFromManagementPage(docId) {
    if (!docId) return;
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
        var response = await fetch(API_ENDPOINTS.deleteDocument(docId), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete document');
        await _dmLoadManagementPage();
    } catch (error) {
        console.error('Error deleting document:', error);
        alert('Could not delete this document. Please try again.');
    }
}
window._dmDeleteFromManagementPage = _dmDeleteFromManagementPage;

function showDocumentUploadPage() {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('This feature is not available at this time.');
        }
        return;
    }
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();
    var page = document.getElementById('uploadDocumentPage');
    if (page) page.style.display = 'block';

    _docPageSelectedFiles = [];
    var preview = document.getElementById('filePreviewListPage');
    if (preview) preview.innerHTML = '';
    var desc = document.getElementById('docDescriptionPage');
    if (desc) desc.value = '';
    var progress = document.getElementById('uploadProgressPage');
    if (progress) progress.style.display = 'none';

    _dmPopulateCaseSelect();
}
window.showDocumentUploadPage = showDocumentUploadPage;

async function _dmPopulateCaseSelect() {
    var select = document.getElementById('docCaseIdPage');
    if (!select) return;
    var username = _dmCurrentUsername();
    if (!username) return;
    try {
        var response = await fetch(API_ENDPOINTS.citizenCases(username), {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!response.ok) return;
        var data = await response.json();
        var cases = (data && data.success && Array.isArray(data.cases)) ? data.cases : (Array.isArray(data) ? data : []);
        var options = '<option value="">None</option>';
        cases.forEach(function (c) {
            var ref = c.caseReference || c.caseNumber || (c.id ? String(c.id) : '');
            if (!ref) return;
            options += '<option value="' + _cmEsc(ref) + '">' + _cmEsc(ref) + ', ' + _cmEsc(c.case_type || c.caseType || 'Case') + '</option>';
        });
        select.innerHTML = options;
    } catch (error) {
        console.error('Error loading cases for document upload:', error);
    }
}

function _dmRenderFilePreview() {
    var preview = document.getElementById('filePreviewListPage');
    if (!preview) return;
    preview.innerHTML = _docPageSelectedFiles.map(function (file, idx) {
        return '<div style="display:flex; justify-content:space-between; align-items:center; background:#f0f5ff; border-radius:8px; padding:8px 14px; margin-bottom:6px;">' +
            '<span style="font-size:13px; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">' + _cmEsc(file.name) + '</span>' +
            '<span style="font-size:12px; color:#888;">' + _dmFormatSize(file.size) + '</span>' +
            '<button onclick="_dmRemoveSelectedFile(' + idx + ')" style="background:none; border:none; color:#dc3545; cursor:pointer; font-size:16px; padding:0 4px;">&times;</button>' +
        '</div>';
    }).join('');
}

function _dmRemoveSelectedFile(idx) {
    _docPageSelectedFiles.splice(idx, 1);
    _dmRenderFilePreview();
}
window._dmRemoveSelectedFile = _dmRemoveSelectedFile;

function _dmAddFiles(fileList) {
    var status = document.getElementById('uploadStatusTextPage');
    Array.prototype.forEach.call(fileList, function (file) {
        if (file.size > 10 * 1024 * 1024) {
            if (status) status.textContent = '"' + file.name + '" is larger than 10MB and was skipped.';
            return;
        }
        _docPageSelectedFiles.push(file);
    });
    _dmRenderFilePreview();
}

function handleDragOverPage(event) {
    event.preventDefault();
    var zone = document.getElementById('dropZonePage');
    if (zone) { zone.style.borderColor = '#1a4080'; zone.style.background = '#f0f5ff'; }
}
window.handleDragOverPage = handleDragOverPage;

function handleDragLeavePage(event) {
    event.preventDefault();
    var zone = document.getElementById('dropZonePage');
    if (zone) { zone.style.borderColor = '#ddd'; zone.style.background = ''; }
}
window.handleDragLeavePage = handleDragLeavePage;

function handleDropPage(event) {
    event.preventDefault();
    handleDragLeavePage(event);
    if (event.dataTransfer && event.dataTransfer.files) {
        _dmAddFiles(event.dataTransfer.files);
    }
}
window.handleDropPage = handleDropPage;

function handleFileSelectPage(event) {
    if (event.target.files) _dmAddFiles(event.target.files);
    event.target.value = '';
}
window.handleFileSelectPage = handleFileSelectPage;

async function uploadDocumentsPage() {
    if (!_docPageSelectedFiles.length) {
        alert('Please select at least one file to upload.');
        return;
    }

    var username = _dmCurrentUsername();
    if (!username) {
        alert('Please login to upload documents.');
        return;
    }

    var category = (document.getElementById('docCategoryPage') || {}).value || 'general';
    var caseId = (document.getElementById('docCaseIdPage') || {}).value || null;
    var description = (document.getElementById('docDescriptionPage') || {}).value || '';

    var progress = document.getElementById('uploadProgressPage');
    var progressBar = document.getElementById('uploadProgressBarPage');
    var progressText = document.getElementById('uploadProgressTextPage');
    var statusText = document.getElementById('uploadStatusTextPage');
    if (progress) progress.style.display = 'block';

    var total = _docPageSelectedFiles.length;
    var uploaded = 0;
    var failed = 0;

    for (var i = 0; i < _docPageSelectedFiles.length; i++) {
        var file = await window.lcdjpCompressImageFile(_docPageSelectedFiles[i]);
        if (statusText) statusText.textContent = 'Uploading "' + file.name + '"…';
        try {
            var fileData = await new Promise(function (resolve, reject) {
                var reader = new FileReader();
                reader.onload = function (e) { resolve(e.target.result); };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            var response = await fetch(API_ENDPOINTS.uploadDocument, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    file_name: file.name,
                    file_type: file.type,
                    file_size: file.size,
                    file_data: fileData,
                    owner: username,
                    case_id: caseId || undefined,
                    category: category,
                    description: description
                })
            });
            if (!response.ok) throw new Error('Upload failed');
            uploaded++;
        } catch (error) {
            console.error('Error uploading "' + file.name + '":', error);
            failed++;
        }

        var pct = Math.round(((i + 1) / total) * 100);
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressText) progressText.textContent = pct + '%';
    }

    if (statusText) {
        statusText.textContent = failed
            ? uploaded + ' uploaded, ' + failed + ' failed.'
            : 'All files uploaded successfully.';
    }

    _docPageSelectedFiles = [];
    _dmRenderFilePreview();

    setTimeout(function () { showDocumentManagementPage(); }, failed ? 1500 : 600);
}
window.uploadDocumentsPage = uploadDocumentsPage;

function showDocumentCategoriesPage() {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('This feature is not available at this time.');
        }
        return;
    }
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();
    var page = document.getElementById('documentManagementPage');
    if (page) page.style.display = 'block';
    _dmLoadCategoriesPage();
}
window.showDocumentCategoriesPage = showDocumentCategoriesPage;

async function _dmLoadCategoriesPage() {
    var listEl = document.getElementById('documentListPage');
    if (listEl) listEl.innerHTML = '<div style="text-align:center; padding:60px; color:#999;"><p>Loading categories&hellip;</p></div>';
    try {
        var docs = await _dmFetchAllDocuments();
        if (!docs.length) {
            if (listEl) listEl.innerHTML = '<div style="text-align:center; padding:60px; color:#999;"><p>No documents uploaded yet.</p></div>';
            return;
        }
        var byCategory = {};
        docs.forEach(function (d) {
            var cat = d.category || 'general';
            byCategory[cat] = byCategory[cat] || [];
            byCategory[cat].push(d);
        });
        var categories = Object.keys(byCategory).sort();
        var html = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">' +
            categories.map(function (cat) {
                return '<div onclick="_dmShowCategoryDocs(\'' + _cmEsc(cat) + '\')" style="cursor:pointer; background:#f0f5ff; border-radius:10px; padding:16px; text-align:center; border-left:4px solid #1a4080;">' +
                    '<div style="font-size:24px; font-weight:bold; color:#1a4080;">' + byCategory[cat].length + '</div>' +
                    '<div style="font-size:13px; color:#666; text-transform:capitalize;">' + _cmEsc(cat) + '</div>' +
                '</div>';
            }).join('') +
        '</div><div id="documentCategoryFilteredList"></div>';
        if (listEl) listEl.innerHTML = html;
        window._dmDocsByCategory = byCategory;
    } catch (error) {
        console.error('Error loading document categories:', error);
        if (listEl) listEl.innerHTML = '<div style="text-align:center; padding:40px; color:#dc3545;"><p>Could not load categories.</p></div>';
    }
}

function _dmShowCategoryDocs(category) {
    var container = document.getElementById('documentCategoryFilteredList');
    if (!container || !window._dmDocsByCategory) return;
    var docs = window._dmDocsByCategory[category] || [];
    docs.sort(function (a, b) { return new Date(b.created_at || b.uploaded_at || 0) - new Date(a.created_at || a.uploaded_at || 0); });
    container.innerHTML = '<h3 style="color:#1a4080; text-transform:capitalize; border-top:2px solid #1a4080; padding-top:15px;">' +
        _cmEsc(category) + '</h3>' + _dmRenderDocList(docs);
}
window._dmShowCategoryDocs = _dmShowCategoryDocs;

function showSharedDocumentsPage() {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('This feature is not available at this time.');
        }
        return;
    }
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();
    var page = document.getElementById('documentManagementPage');
    if (page) page.style.display = 'block';
    _dmLoadSharedPage();
}
window.showSharedDocumentsPage = showSharedDocumentsPage;

async function _dmLoadSharedPage() {
    var listEl = document.getElementById('documentListPage');
    if (listEl) listEl.innerHTML = '<div style="text-align:center; padding:60px; color:#999;"><p>Loading shared documents&hellip;</p></div>';
    try {
        var docs = await _dmFetchAllDocuments();
        var username = _dmCurrentUsername();
        var shared = docs.filter(function (d) {
            return (Array.isArray(d.shared_with) && d.shared_with.indexOf(username) !== -1) || d.is_shared;
        });
        if (!listEl) return;
        if (!shared.length) {
            listEl.innerHTML = '<div style="text-align:center; padding:60px; color:#999;"><p>No documents have been shared with you yet.</p></div>';
            return;
        }
        shared.sort(function (a, b) { return new Date(b.created_at || b.uploaded_at || 0) - new Date(a.created_at || a.uploaded_at || 0); });
        listEl.innerHTML = _dmRenderDocList(shared);
    } catch (error) {
        console.error('Error loading shared documents:', error);
        if (listEl) listEl.innerHTML = '<div style="text-align:center; padding:40px; color:#dc3545;"><p>Could not load shared documents.</p></div>';
    }
}


function buildCompactCitizenHomepage() {
    var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    var firstName = (typeof window._lcdjpDisplayFirstName === 'function') ? window._lcdjpDisplayFirstName() : (username || 'there');

    
    
    
    
    var bannerNameEl = document.getElementById('bannerUserName');
    if (bannerNameEl) bannerNameEl.textContent = firstName;

    var greetingCard = document.getElementById('cdDesktopGreeting');
    if (greetingCard) greetingCard.style.display = 'block';

    var timeGreetEl = document.getElementById('cdgTimeGreet');
    if (timeGreetEl) {
        var hour = new Date().getHours();
        timeGreetEl.textContent = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');
    }

    var userNameEl = document.getElementById('cdgUserName');
    if (userNameEl) userNameEl.textContent = firstName;

    
    
    
    if (username) {
        fetch(API_ENDPOINTS.citizenCases(username), { headers: getAuthHeaders() })
            .then(function (res) { return res.ok ? res.json() : { cases: [] }; })
            .then(function (data) {
                var cases = data.cases || (Array.isArray(data) ? data : []);
                var statCases = document.getElementById('cdgStatCases');
                if (statCases) statCases.textContent = cases.length;
            })
            .catch(function (err) { console.warn('[Homepage] Could not load case count:', err.message); });

        var myNotifications = ((window._lcdjpStore && window._lcdjpStore.notifications) || [])
            .filter(function (n) { return n.username === username; });
        var statAlerts = document.getElementById('cdgStatAlerts');
        if (statAlerts) statAlerts.textContent = myNotifications.length;

        var unreadMessages = myNotifications.filter(function (n) {
            return n.type === 'message' && !n.read;
        }).length;
        var statMsg = document.getElementById('cdgStatMsg');
        if (statMsg) statMsg.textContent = unreadMessages;
    }
}


function viewLawyerProfile(username, caseId) {
    
    fetch(API_ENDPOINTS.user(username), {
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (!response.ok) throw new Error('Lawyer not found');
        return response.json();
    })
    .then(data => {
        const lawyer = data.user || data;
        
        let html = `
            <div style="max-width:500px; margin:0 auto; background:white; border-radius:12px; padding:25px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="color:#1a4080; margin:0;">Lawyer Profile</h3>
                    <button onclick="closeModal()" style="background:none; border:none; font-size:24px; cursor:pointer;">×</button>
                </div>
                
                <div style="display:grid; gap:10px;">
                    <div><strong>Name:</strong> ${escapeHtml(lawyer.first_name || lawyer.firstName || '')} ${escapeHtml(lawyer.last_name || lawyer.lastName || '')}</div>
                    <div><strong>Specialization:</strong> ${escapeHtml(lawyer.lawyer_specialization || lawyer.lawyerSpecialization || 'N/A')}</div>
                    <div><strong>Law Firm:</strong> ${escapeHtml(lawyer.law_firm_name || lawyer.lawFirmName || 'N/A')}</div>
                    <div><strong>Law School:</strong> ${escapeHtml(lawyer.law_school || lawyer.lawSchool || 'Not specified')}</div>
                    <div><strong>Years Experience:</strong> ${escapeHtml(lawyer.years_experience || lawyer.yearsExperience || '0')}</div>
                    <div><strong>District:</strong> ${escapeHtml(lawyer.district || 'N/A')}</div>
                    <div><strong>Phone:</strong> ${escapeHtml(lawyer.phone || lawyer.phoneNumber || 'N/A')}</div>
                    <div><strong>Email:</strong> ${escapeHtml(lawyer.email || 'N/A')}</div>
                    ${lawyer.cv_data || lawyer.cvData ? `<div><strong>CV:</strong> <button onclick="viewLawyerCV(${escapeHtml(JSON.stringify(String(username)))})" style="color:#1a4080; text-decoration:underline; background:none; border:none; cursor:pointer;">View CV</button></div>` : ''}
                </div>
                
                <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
                    <button onclick="selectLawyerForCase(${escapeHtml(JSON.stringify(String(caseId)))}, ${escapeHtml(JSON.stringify(String(username)))})" 
                            style="padding:12px 25px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                        Select This Lawyer
                    </button>
                    <button onclick="closeModal()" 
                            style="padding:12px 25px; background:#6c757d; color:white; border:none; border-radius:6px; cursor:pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        openDynamicView(html);
    })
    .catch(error => {
        console.error('Error fetching lawyer:', error);
        alert('Could not load lawyer profile.');
    });
}








async function selectLawyerForCase(caseId, username) {
    if (!confirm('Send this case to the selected lawyer? They will need to accept it before you can message them.')) {
        return;
    }

    try {
        const headers = _getCitizenAuthHeaders();

        const lawyerResp = await fetch(API_ENDPOINTS.user(username), { headers: headers });
        if (!lawyerResp.ok) {
            alert('Could not load lawyer details.');
            return;
        }
        const lawyerData = await lawyerResp.json();
        const lawyer = lawyerData.user || lawyerData;
        const lawyerName = `${lawyer.first_name || lawyer.firstName || ''} ${lawyer.last_name || lawyer.lastName || ''}`.trim() || 'Lawyer';

        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) {
            alert('Could not load case details.');
            return;
        }
        const caseData = await caseResp.json();
        const foundCase = caseData.case || caseData;

        const updateData = {
            status: "Awaiting Lawyer Acceptance",
            selected_lawyer: username,
            selected_lawyer_status: "Pending",
            selected_lawyer_name: lawyerName,
            selected_lawyer_specialization: lawyer.lawyer_specialization || lawyer.lawyerSpecialization || 'N/A'
        };

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
            throw new Error('Failed to select lawyer');
        }

        await fetch(API_ENDPOINTS.notifications, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                username: username,
                message: `You have been selected to handle case ${caseId}. Please review and accept it.`,
                type: 'case_selected',
                caseId: caseId,
                timestamp: new Date().toISOString(),
                is_read: false
            })
        });

        alert(`${lawyerName} has been notified and will confirm shortly.`);

        if (typeof closeModal === 'function') closeModal();
        if (typeof viewCitizenCase === 'function') {
            viewCitizenCase(caseId);
        } else if (typeof showMyCases === 'function') {
            showMyCases();
        }
    } catch (error) {
        console.error('Error selecting lawyer:', error);
        alert('Failed to select lawyer: ' + error.message);
    }
}

// Track Case page: send a direct message to the lawyer/handler of the case that was just looked up.
window.sendCitizenMessage = async function () {
    var box = document.getElementById('citizenMessageToLawyer');
    var container = document.getElementById('messagingContainer');
    if (!box || !container) return;
    var text = box.value.trim();
    var caseId = container.dataset.caseId || (document.getElementById('trackSearchInput') || {}).value || '';
    caseId = caseId.trim();
    var notify = function (m) { if (typeof showToast === 'function') showToast(m); else alert(m); };

    if (!caseId) { notify('Search for your case first, then send your message.'); return; }
    if (!text) { notify('Please type a message first.'); return; }
    if (text.length > 5000) { notify('Message is too long (5000 characters maximum).'); return; }

    var btn = container.querySelector('button');
    if (btn) btn.disabled = true;
    try {
        var resp = await fetch(API_ENDPOINTS.messages(caseId), {
            method: 'POST',
            headers: _getCitizenAuthHeaders(),
            body: JSON.stringify({ text: text, timestamp: new Date().toISOString(), read: false, preAcceptance: false })
        });
        if (resp.status === 401) { notify('Your session has expired. Please log in again.'); return; }
        if (resp.status === 403) {
            var err403 = await resp.json().catch(function () { return {}; });
            notify(err403.error || 'You cannot message on this case right now.');
            return;
        }
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        box.value = '';
        notify('Message sent.');
        if (typeof window.loadCitizenCaseThread === 'function') window.loadCitizenCaseThread(caseId);
    } catch (e) {
        console.error('sendCitizenMessage error:', e);
        notify('Message could not be sent. Please check your connection and try again.');
    } finally {
        if (btn) btn.disabled = false;
    }
};


// Track Case page: show the conversation on the case (messages from the citizen and from the lawyer/handler).
window.loadCitizenCaseThread = async function (caseId) {
    var el = document.getElementById('citizenMessageThread');
    if (!el || !caseId) return;
    var me = (typeof getLcdjpActiveUsername === 'function' ? getLcdjpActiveUsername() : '') ||
             sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    var esc = typeof _cmEsc === 'function' ? _cmEsc : function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) { return '&#' + ch.charCodeAt(0) + ';'; }); };
    try {
        var resp = await fetch(API_ENDPOINTS.messages(caseId), { headers: _getCitizenAuthHeaders(), credentials: 'include' });
        if (!resp.ok) { el.style.display = 'none'; return; }
        var rows = await resp.json();
        if (!Array.isArray(rows) || !rows.length) {
            el.style.display = 'block';
            el.innerHTML = '<div style="color:#6b7280;font-size:13px;text-align:center;padding:8px 0;">No messages yet. Write to your lawyer below.</div>';
            return;
        }
        rows.sort(function (a, b) { return new Date(a.timestamp || 0) - new Date(b.timestamp || 0); });
        el.innerHTML = rows.map(function (m) {
            var mine = (m.from_username || m.fromUsername || '') === me;
            var text = m.message_text || m.text || m.message || '';
            var ts = m.timestamp ? new Date(String(m.timestamp).replace(' ', 'T')).toLocaleString() : '';
            var who = mine ? 'You' : (m.from_name || m.fromName || m.from_user || 'Lawyer');
            return '<div style="display:flex;justify-content:' + (mine ? 'flex-end' : 'flex-start') + ';margin-bottom:8px;">' +
                '<div style="max-width:80%;padding:8px 12px;border-radius:' + (mine ? '12px 12px 2px 12px' : '12px 12px 12px 2px') +
                ';background:' + (mine ? '#1a4080' : '#fff') + ';color:' + (mine ? '#fff' : '#1f2937') +
                ';border:' + (mine ? 'none' : '1px solid #e3e7f0') + ';font-size:14px;word-wrap:break-word;">' +
                '<div style="font-size:11px;opacity:.75;margin-bottom:2px;">' + esc(who) + (ts ? ' &middot; ' + esc(ts) : '') + '</div>' +
                '<div>' + esc(text) + '</div></div></div>';
        }).join('');
        el.style.display = 'block';
        el.scrollTop = el.scrollHeight;
    } catch (e) {
        console.error('loadCitizenCaseThread error:', e);
        el.style.display = 'none';
    }
};


// ---- Case documents (Track Case): view / download -------------------------------------------------------------

function _docToBlob(data, mime) {
    var raw = String(data || '');
    var m = /^data:([^;,]+)?(;base64)?,/.exec(raw);
    var type = (m && m[1]) || mime || 'application/octet-stream';
    var b64 = m ? raw.slice(m[0].length) : raw;
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: type });
}

// Files kept in object storage arrive as short-lived /api/files/... URLs instead of inline data; fetch those.
async function _docToBlobAsync(data, mime) {
    var raw = String(data || '');
    if (raw.indexOf('/api/files/') === 0) {
        var resp = await fetch(API_BASE_URL + raw, { credentials: 'include' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var blob = await resp.blob();
        return (mime && !blob.type) ? new Blob([blob], { type: mime }) : blob;
    }
    return _docToBlob(raw, mime);
}

async function _resolveCaseDocument(docId) {
    var cached = (window._citizenCaseDocCache || {})[String(docId)];
    if (cached && cached.data) return { name: cached.name, data: cached.data, type: cached.type };
    var resp = await fetch(API_BASE_URL + '/api/auth/documents/' + encodeURIComponent(docId),
        { headers: _getCitizenAuthHeaders(), credentials: 'include' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var body = await resp.json();
    var d = body && body.document;
    if (!d || !d.file_data) throw new Error('empty document');
    return { name: d.file_name || (cached && cached.name) || 'document', data: d.file_data, type: d.file_type || '' };
}

window.viewCaseDocument = async function (caseId, docId) {
    var tab = window.open('', '_blank');   // open synchronously so popup blockers allow it
    try {
        var doc = await _resolveCaseDocument(docId);
        var url = URL.createObjectURL(await _docToBlobAsync(doc.data, doc.type));
        if (tab) tab.location.href = url; else window.location.href = url;
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    } catch (e) {
        if (tab) tab.close();
        console.error('viewCaseDocument error:', e);
        alert('This document could not be opened right now. Please try again.');
    }
};

window.downloadCaseDocument = async function (caseId, docId) {
    try {
        var doc = await _resolveCaseDocument(docId);
        var url = URL.createObjectURL(await _docToBlobAsync(doc.data, doc.type));
        var a = document.createElement('a');
        a.href = url; a.download = doc.name || 'document';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    } catch (e) {
        console.error('downloadCaseDocument error:', e);
        alert('This document could not be downloaded right now. Please try again.');
    }
};

// Used by the "Attached Media" Download button, which passes the file's data URI and name directly.
window.downloadFile = async function (dataUri, fileName) {
    try {
        var url = URL.createObjectURL(await _docToBlobAsync(dataUri));
        var a = document.createElement('a');
        a.href = url; a.download = fileName || 'download';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    } catch (e) {
        console.error('downloadFile error:', e);
        alert('This file could not be downloaded.');
    }
};
