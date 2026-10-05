







function _daGetDistrict() {
    return localStorage.getItem('userDistrict') || '';
}

function _daVerificationDistrict(user) {
    return String(
        user.verificationDistrict ||
        user.verification_district ||
        user.district ||
        user.submittedDistrict ||
        user.submitted_district ||
        ''
    ).trim();
}

function _daVerificationRole(user) {
    var role = user.verificationRole || user.verification_role ||
               user.requestedRole || user.requested_role || user.role || 'Unknown';
    return String(role).trim();
}

function _daRequiresDistrictAdminVerification(user) {
    var role = String(_daVerificationRole(user) || '').trim().toLowerCase();
    return role === 'lawyer'
        || role === 'citizen';
}

function _daIsVerificationForDistrict(user, district) {
    return !!district &&
        _daVerificationDistrict(user).toLowerCase() === String(district).trim().toLowerCase();
}

function _daSetActiveMenu(id) {
    document.querySelectorAll('#daSidebarMenu .admin-menu-item').forEach(function(el) {
        el.classList.remove('active');
    });
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
}


function _syncDANavExtras(isActive) {
    var extras = document.getElementById('daNavExtras');
    if (!extras) return;
    var onDesktop = window.innerWidth >= 768;
    extras.style.display = (isActive && onDesktop) ? 'inline-flex' : 'none';
}


(function() {
    var _daNavActive = false;
    var _origShowDA = window.showDistrictAdminDashboard;

    
    window._setDANavActive = function(active) {
        _daNavActive = active;
        _syncDANavExtras(active);
    };

    window.addEventListener('resize', function() {
        if (_daNavActive) _syncDANavExtras(true);
    });
})();

if (typeof lcdjpContactVerifyRegisterFields === 'function') {
    lcdjpContactVerifyRegisterFields('lcNewContactVerify', 'LC', 'lcNewEmail', 'lcNewPhone');
}

function _daBuildLCFormModal(opts) {
    opts = opts || {};
    var district = opts.district || '';
    var lockDistrict = !!opts.lockDistrict;
    var onSubmit = opts.onSubmit;
    var noticeHtml = opts.noticeHtml || '';

    var modal = document.createElement('div');
    modal.setAttribute('data-lcdjp-lc-form-modal', '1');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    modal.innerHTML =
        '<div style="background:white;border-radius:16px;max-width:480px;width:100%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;">' +
            '<h3 style="color:#1a4080;margin:0 0 8px;">Create LC Account</h3>' +
            noticeHtml +
            '<div style="display:grid;gap:10px;margin-top:10px;">' +
                '<input id="lcNewUsername" placeholder="Username" style="padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;">' +
                '<input id="lcNewPassword" type="password" placeholder="Temporary Password (min 8 chars)" style="padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;">' +
                '<input id="lcNewFirstName" placeholder="First Name" style="padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;">' +
                '<input id="lcNewLastName" placeholder="Last Name" style="padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;">' +
                '<input id="lcNewEmail" placeholder="Email" style="padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;">' +
                '<input id="lcNewPhone" placeholder="Phone" style="padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;">' +
                '<input id="lcNewDistrict" value="' + district.replace(/"/g, '&quot;') + '" ' + (lockDistrict ? 'readonly' : '') +
                    ' placeholder="District" style="padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;' + (lockDistrict ? 'background:#f0f0f0;color:#666;' : '') + '">' +
                '<input id="lcNewVillage" placeholder="Village / Parish / Sub-county (which LC this account represents)" style="padding:9px 12px;border:1px solid #cfd8ea;border-radius:7px;font-size:13px;">' +
            '</div>' +
            (typeof lcdjpContactVerifyWidgetHtml === 'function' ? lcdjpContactVerifyWidgetHtml('lcNewContactVerify') : '') +
            '<div id="lcNewFormMsg" style="display:none;margin-top:10px;padding:9px 12px;border-radius:7px;font-size:12.5px;"></div>' +
            '<div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">' +
                '<button data-lc-cancel style="padding:9px 18px;background:#f0f0f0;color:#333;border:none;border-radius:7px;cursor:pointer;font-size:13px;">Cancel</button>' +
                '<button data-lc-submit style="padding:9px 18px;background:#1a4080;color:white;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;">Create Account</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(modal);
    if (typeof lcdjpContactVerifyReset === 'function') lcdjpContactVerifyReset('lcNewContactVerify');
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    modal.querySelector('[data-lc-cancel]').onclick = function () { modal.remove(); };
    modal.querySelector('[data-lc-submit]').onclick = function () {
        var fields = {
            username:  document.getElementById('lcNewUsername').value.trim(),
            password:  document.getElementById('lcNewPassword').value,
            firstName: document.getElementById('lcNewFirstName').value.trim(),
            lastName:  document.getElementById('lcNewLastName').value.trim(),
            email:     document.getElementById('lcNewEmail').value.trim(),
            phone:     document.getElementById('lcNewPhone').value.trim(),
            district:  document.getElementById('lcNewDistrict').value.trim(),
            village:   document.getElementById('lcNewVillage').value.trim(),
            role:      'LC'
        };
        var msgEl = document.getElementById('lcNewFormMsg');
        function showMsg(type, text) {
            if (!msgEl) return;
            msgEl.style.display = 'block';
            msgEl.style.background = type === 'success' ? '#e8f5e9' : '#ffebee';
            msgEl.style.color = type === 'success' ? '#2e7d32' : '#c62828';
            msgEl.textContent = text;
        }
        for (var key in fields) {
            if ((key === 'village') && !fields[key]) continue; 
            if (!fields[key]) { showMsg('error', 'All fields are required.'); return; }
        }
        if (fields.password.length < 8) { showMsg('error', 'Password must be at least 8 characters.'); return; }
        if (!lcdjpContactVerifyIsDone('lcNewContactVerify', fields.email, fields.phone)) {
            showMsg('error', 'Please verify the email/phone above with the code sent to it before creating the account.');
            return;
        }
        if (typeof onSubmit === 'function') onSubmit(fields, showMsg, modal);
    };
    return modal;
}

async function showCreateLCForm() {
    var district = _daGetDistrict();
    if (!district) {
        alert('Your district could not be determined. Please re-login and try again.');
        return;
    }
    _daBuildLCFormModal({
        district: district,
        lockDistrict: true,
        noticeHtml: '<p style="font-size:12.5px;color:#666;margin:0;">' +
            'This LC account will be created for <strong>' + district + '</strong>. ' +
            'Only District Admins (or, if none is available, a System Admin) may create LC accounts.' +
            '</p>',
        onSubmit: async function (fields, showMsg, modal) {
            showMsg('', '');
            try {
                var resp = await authFetch(API_ENDPOINTS.createLC, {
                    method: 'POST',
                    body: JSON.stringify(fields)
                });
                var data = await resp.json();
                if (resp.ok && data.success !== false) {
                    showMsg('success', 'LC account "' + fields.username + '" created successfully.');
                    setTimeout(function () { modal.remove(); daLoadUsers(); }, 900);
                } else {
                    showMsg('error', data.error || data.message || 'Failed to create LC account.');
                }
            } catch (e) {
                showMsg('error', 'Network error: ' + e.message);
            }
        }
    });
}
window.showCreateLCForm = showCreateLCForm;

function _daShowOnly(containerId) {
    var ids = ['daHomeContainer','daUsersContainer','daVerifContainer',
               'daCasesContainer','daStatsContainer','daNotifContainer','daMsgsContainer'];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = (id === containerId) ? 'block' : 'none';
    });
    var dash = document.getElementById('daDashboard');
    if (dash) dash.style.display = 'block';
}

function showDistrictAdminDashboard() {
    if (typeof hideAppLoader === 'function') hideAppLoader();
    hideAllDashboardViews();
    var dash = document.getElementById('daDashboard');
    if (dash) dash.style.display = 'block';
    _daShowOnly('daHomeContainer');
    _daSetActiveMenu('daMenu_home');

    
    
    
    var mapContainer = document.getElementById('daMapContainer');
    if (mapContainer) mapContainer.style.display = 'block';
    buildDAMap();
    
    
    
    if (typeof syncDAMapHeight === 'function') syncDAMapHeight();

    
    if (typeof _setDANavActive === 'function') _setDANavActive(true);

    daRefreshAll();
}

function showDAUsers()         { _daShowOnly('daUsersContainer'); _daSetActiveMenu('daMenu_users'); if (typeof _setDANavActive === 'function') _setDANavActive(true); daLoadUsers(); }
function showDAVerifications() { _daShowOnly('daVerifContainer'); _daSetActiveMenu('daMenu_verif'); if (typeof _setDANavActive === 'function') _setDANavActive(true); daLoadVerifications(); }
function showDACases()         { _daShowOnly('daCasesContainer'); _daSetActiveMenu('daMenu_cases'); if (typeof _setDANavActive === 'function') _setDANavActive(true); daLoadCaseFilterOptions(); daLoadCases(); }
function showDAStatistics()    { _daShowOnly('daStatsContainer'); _daSetActiveMenu('daMenu_stats'); if (typeof _setDANavActive === 'function') _setDANavActive(true); daLoadStatistics(); }
function showDANotifications() { _daShowOnly('daNotifContainer'); _daSetActiveMenu('daMenu_notifs'); if (typeof _setDANavActive === 'function') _setDANavActive(true); daLoadNotifications(); }
function showDAMessages()      { _daShowOnly('daMsgsContainer');  _daSetActiveMenu('daMenu_msgs');  if (typeof _setDANavActive === 'function') _setDANavActive(true); daLoadMessages(); }








window._daConversations = {};

async function daLoadMessages() {
    var container = document.getElementById('daMsgsContent');
    if (!container) return;
    container.innerHTML = '<p style="color:#999; text-align:center; padding:30px;">Loading messages…</p>';
    try {
        
        
        
        
        
        
        
        
        var username = (typeof getLcdjpActiveUsername === 'function')
            ? getLcdjpActiveUsername()
            : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
        var endpoint = (typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.chatUserMessages && username)
            ? API_ENDPOINTS.chatUserMessages(username) : null;
        if (!endpoint) {
            container.innerHTML = '<p style="color:#999; text-align:center; padding:30px;">No messages yet.</p>';
            return;
        }
        var resp = await authFetch(endpoint, { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var raw = await resp.json();
        var msgs = Array.isArray(raw) ? raw : (raw.messages || []);
        if (msgs.length === 0) {
            container.innerHTML = '<p style="color:#999; text-align:center; padding:30px;">No messages yet.</p>';
            return;
        }
        msgs.sort(function(a, b) { return new Date(a.timestamp || 0) - new Date(b.timestamp || 0); });

        var conversations = {};
        msgs.forEach(function(m) {
            
            
            
            
            
            var fromUser = m.from_user || m.fromUser || m.from || 'Unknown';
            var fromName = m.from_name || m.fromName || fromUser;
            var fromRole = m.from_role || m.fromRole || '';
            var sentTo   = m.sent_to || m.sentTo || '';
            var body     = m.message || m.body || m.content || '';
            var ts       = m.timestamp || m.created_at || m.createdAt || '';
            var isMine   = fromUser === username;
            var key      = isMine ? (sentTo || 'unknown') : fromUser;

            if (!conversations[key]) {
                conversations[key] = { key: key, name: key, role: '', messages: [] };
            }
            if (!isMine) {
                conversations[key].name = fromName;
                conversations[key].role = fromRole;
            }
            conversations[key].messages.push({ isMine: isMine, text: body, ts: ts });
        });

        window._daConversations = conversations;

        var convoList = Object.keys(conversations).map(function(k) { return conversations[k]; });
        convoList.sort(function(a, b) {
            var aTs = a.messages[a.messages.length - 1].ts;
            var bTs = b.messages[b.messages.length - 1].ts;
            return new Date(bTs || 0) - new Date(aTs || 0);
        });

        var html = '<div style="display:grid; gap:10px;">';
        convoList.forEach(function(c) {
            var last = c.messages[c.messages.length - 1];
            var tsLabel = last.ts ? new Date(last.ts).toLocaleString() : '';
            var preview = last.text.length > 90 ? last.text.slice(0, 90) + '…' : last.text;
            html += '<div onclick="daOpenConversationThread(\'' + String(c.key).replace(/'/g, "\\'") + '\')" ' +
                'style="background:#f5f8ff; border-radius:10px; padding:14px 16px; border-left:4px solid #1a4080; cursor:pointer;">'
                  +   '<div style="font-weight:600; color:#1a2e55; font-size:14px; margin-bottom:4px;">' + _cmEsc(c.name) + (c.role ? ' <span style="font-weight:400;color:#888;">(' + _cmEsc(c.role) + ')</span>' : '') + (tsLabel ? '<span style="float:right;font-size:11px;color:#888;font-weight:400;">' + _cmEsc(tsLabel) + '</span>' : '') + '</div>'
                  +   '<div style="font-size:13px; color:#444;">' + _cmEsc(preview) + '</div>'
                  + '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    } catch(err) {
        container.innerHTML = '<p style="color:#dc3545; text-align:center; padding:20px;">Could not load messages: ' + _cmEsc(err.message) + '</p>';
    }
}

function daOpenConversationThread(key) {
    var convo = window._daConversations && window._daConversations[key];
    var container = document.getElementById('daMsgsContent');
    if (!convo || !container) return;

    var header = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #eee;">' +
        '<button onclick="daLoadMessages()" aria-label="Back to conversations" ' +
            'style="background:none;border:none;font-size:18px;cursor:pointer;color:#1a4080;padding:0 4px;">&larr;</button>' +
        '<div><div style="font-weight:600;color:#1a2e55;font-size:14px;">' + _cmEsc(convo.name) + '</div>' +
        (convo.role ? '<div style="font-size:11px;color:#888;">' + _cmEsc(convo.role) + '</div>' : '') +
        '</div></div>';

    var bubbles = convo.messages.map(function(m) {
        var tsLabel = m.ts ? new Date(m.ts).toLocaleString() : '';
        return '<div style="display:flex;justify-content:' + (m.isMine ? 'flex-end' : 'flex-start') + ';margin-bottom:10px;">' +
            '<div style="max-width:80%;padding:8px 12px;border-radius:' + (m.isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px') +
                ';background:' + (m.isMine ? '#1a4080' : '#fff') + ';color:' + (m.isMine ? '#fff' : '#333') +
                ';box-shadow:0 1px 3px rgba(0,0,0,0.1);font-size:13px;">' +
                '<div>' + _cmEsc(m.text) + '</div>' +
                (tsLabel ? '<div style="font-size:9px;opacity:0.7;margin-top:4px;">' + _cmEsc(tsLabel) + '</div>' : '') +
            '</div>' +
        '</div>';
    }).join('');

    
    
    
    
    var escKey = String(key).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    var replyBar = '<div style="display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #eee;">' +
        '<input type="text" id="daReplyInput" placeholder="Type a reply…" ' +
            'style="flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:20px;font-size:13px;outline:none;" ' +
            'onkeypress="if(event.key===\'Enter\'){event.preventDefault();daSendReply(\'' + escKey + '\');}">' +
        '<button id="daReplySendBtn" onclick="daSendReply(\'' + escKey + '\')" ' +
            'style="padding:10px 20px;background:#1a4080;color:white;border:none;border-radius:20px;cursor:pointer;font-size:13px;font-weight:600;">Send</button>' +
    '</div>';

    container.innerHTML = header + bubbles + replyBar;

    var input = document.getElementById('daReplyInput');
    if (input) input.focus();
}







async function daSendReply(key) {
    var input = document.getElementById('daReplyInput');
    var button = document.getElementById('daReplySendBtn');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var username = (typeof getLcdjpActiveUsername === 'function')
        ? getLcdjpActiveUsername()
        : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!username) {
        if (typeof showToast === 'function') showToast('Please sign in to send a reply.');
        return;
    }
    var fullname = sessionStorage.getItem('lcdjp_fullname') || username;
    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || 'District Admin';

    input.disabled = true;
    if (button) button.disabled = true;

    var timestamp = new Date().toISOString();
    var payload = {
        from: username,
        fromName: fullname,
        fromRole: userLevel,
        message: text,
        type: 'text',
        sentTo: key,
        timestamp: timestamp,
        read: false,
        delivered: false,
        reply: null,
        replyTimestamp: null
    };

    try {
        var resp = await authFetch(API_ENDPOINTS.chatMessages, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);

        var convo = window._daConversations && window._daConversations[key];
        if (convo) {
            convo.messages.push({ isMine: true, text: text, ts: timestamp });
        }
        input.value = '';
        daOpenConversationThread(key);

        
        
        
        
        
        
        if (key && key !== 'unknown' && typeof createEnhancedNotification === 'function') {
            createEnhancedNotification(
                key,
                fullname + ' (Support) replied to your message',
                'new_message'
            ).catch(function (e) { console.warn('Could not notify recipient of reply:', e); });
        }
    } catch (err) {
        console.error('daSendReply error:', err);
        if (typeof showToast === 'function') showToast('Could not send reply. Please try again.');
        input.disabled = false;
        if (button) button.disabled = false;
    }
}

function daRefreshAll() {
    daLoadDashboardStats();
}


async function daLoadDashboardStats() {
    var district = _daGetDistrict();
    var homeContent = document.getElementById('daHomeContent');
    try {
        var resp = await authFetch(API_ENDPOINTS.users, { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var raw = await resp.json();
        var all = Array.isArray(raw) ? raw : (raw.users || []);
        var distUsers = district
            ? all.filter(function(u) {
                var role = (u.role || '').toUpperCase();
                return _daVerificationDistrict(u).toLowerCase() === district.toLowerCase()
                    && role !== 'DISTRICT_ADMIN';
              })
            : [];

        var pending  = distUsers.filter(function(u) { return (u.verificationStatus || u.verification_status || '').toUpperCase() === 'PENDING'; });

        
        
        var pendingDistrictReviews = pending.filter(function(u) {
            return _daRequiresDistrictAdminVerification(u);
        });

        if (homeContent) {
            var uHtml = '';

            
            
            
            
            
            if (pendingDistrictReviews.length > 0) {
                uHtml += '<div style="background:#fff8e1;border:1.5px solid #ffe082;border-radius:12px;padding:16px 18px;margin-bottom:18px;">'
                    + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
                    + '<h3 style="color:#7c5000;margin:0;font-size:15px;">&#128274; Pending District Verifications (' + pendingDistrictReviews.length + ')</h3>'
                    + '<button onclick="showDAVerifications()" style="padding:6px 14px;background:#1a4080;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Review All</button>'
                    + '</div>';
                pendingDistrictReviews.forEach(function(u) {
                    var name = ((u.firstName||u.first_name||'')+' '+(u.lastName||u.last_name||'')).trim() || u.username;
                    var reviewRole = _daVerificationRole(u);
                    uHtml += '<div style="background:white;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-left:4px solid #f59e0b;">'
                        + '<div>'
                        +   '<div style="font-weight:600;color:#1a2e55;font-size:14px;">' + name
                        +     ' <span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:700;">' + reviewRole + ', Pending</span></div>'
                        +   '<div style="font-size:12px;color:#607080;margin-top:2px;">@' + u.username + ' &bull; ' + (u.district || district || 'N/A') + '</div>'
                        + '</div>'
                        + '<div style="display:flex;gap:6px;">'
                        +   '<button onclick="approveVerification(\'' + u.username + '\').then(function(){ daRefreshAll(); })" style="padding:6px 14px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Approve</button>'
                        +   '<button onclick="openVerifyModal(\'' + u.username + '\')" style="padding:6px 12px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Reject</button>'
                        + '</div></div>';
                });
                uHtml += '</div>';
            }

            homeContent.innerHTML = uHtml;
            
            
            homeContent.style.display = uHtml ? 'block' : 'none';
            
            
            if (typeof syncDAMapHeight === 'function') syncDAMapHeight();
        }
    } catch(err) {
        if (homeContent) {
            homeContent.innerHTML = '<p style="color:#dc3545;text-align:center;padding:20px;">Could not load district data: ' + err.message + '</p>';
            homeContent.style.display = 'block';
            if (typeof syncDAMapHeight === 'function') syncDAMapHeight();
        }
    }
}

async function daLoadUsers() {
    var district = _daGetDistrict();
    var container = document.getElementById('daUsersContent');
    if (!container) return;
    container.innerHTML = '<p style="color:#999;text-align:center;padding:30px;">Loading users…</p>';
    try {
        var resp = await authFetch(API_ENDPOINTS.users, { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var raw = await resp.json();
        var all = Array.isArray(raw) ? raw : (raw.users || []);
        
        
        
        var myUsername = (typeof getLcdjpActiveUsername === 'function')
            ? getLcdjpActiveUsername()
            : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
        var users = district
            ? all.filter(function(u) {
                var role = (u.role || '').toUpperCase();
                return _daVerificationDistrict(u).toLowerCase() === district.toLowerCase()
                    && (!myUsername || u.username !== myUsername)
                    && role !== 'DISTRICT_ADMIN' && role !== 'SYSTEM_ADMIN' && role !== 'ADMIN';
              })
            : [];

        var toolbarHtml = '<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">' +
            '<button onclick="showCreateLCForm()" style="padding:9px 18px;background:#1a4080;color:white;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;">+ Create LC Account</button>' +
            '</div>';

        if (users.length === 0) {
            container.innerHTML = toolbarHtml + '<p style="color:#999;text-align:center;padding:30px;">No users found in ' + (district || 'your district') + '.</p>';
            return;
        }
        
        
        
        
        
        
        var html = toolbarHtml + '<div style="display:grid;gap:12px;">';
        users.forEach(function(u) {
            var vStatus = (u.verificationStatus || u.verification_status || 'NOT_SUBMITTED').toUpperCase();
            var acctStatus = u.approvalStatus || u.approval_status || '';
            var badge = vStatus === 'PENDING'  ? '<span style="background:#dbeafe;color:#1e40af;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">Pending</span>'
                      : (vStatus === 'APPROVED' || vStatus === 'VERIFIED') ? '<span style="background:#e0eaff;color:#1a3a7c;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">Verified</span>'
                      : vStatus === 'REJECTED' ? '<span style="background:#dde3f0;color:#374e80;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">Rejected</span>'
                      : '<span style="background:#eef1f8;color:#4b5e8a;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">Not Submitted</span>';
            var disabledBadge = String(acctStatus).toLowerCase() === 'disabled'
                ? '<span style="background:#fdecea;color:#b71c1c;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">&#9940; Disabled</span>' : '';
            var accentLeft = vStatus === 'PENDING' ? '#2a52be' : vStatus === 'REJECTED' ? '#4b6cb7' : '#1a4080';
            html += '<div style="background:#f5f8ff;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-left:4px solid ' + accentLeft + ';">'
                  + '<div><div style="font-weight:600;color:#333;">' + ((u.firstName||u.first_name||'')+' '+(u.lastName||u.last_name||'')).trim() + ' ' + badge + ' ' + disabledBadge + '</div>'
                  + '<div style="font-size:12px;color:#888;margin-top:3px;">@' + u.username + ' &bull; ' + _daVerificationRole(u) + ' &bull; ' + _daVerificationDistrict(u)
                  + (u.phone_number || u.phoneNumber || u.phone ? ' &bull; ' + (u.phone_number || u.phoneNumber || u.phone) : '') + '</div></div>'
                  + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
                  + (vStatus === 'PENDING' ? '<button onclick="approveVerification(\'' + u.username + '\')" style="padding:7px 14px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Approve</button>'
                      + '<button onclick="openVerifyModal(\'' + u.username + '\')" style="padding:7px 14px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Reject</button>' : '')
                  + '<button onclick="viewUserDetails(\'' + u.username + '\')" style="padding:7px 14px;background:white;color:#333;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">View Details</button>'
                  + (String(acctStatus).toLowerCase() === 'disabled' ? '<button onclick="enableUserAccount(\'' + u.username + '\')" style="padding:7px 14px;background:white;color:#333;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Reactivate</button>' : '<button onclick="disableUserAccount(\'' + u.username + '\')" style="padding:7px 14px;background:white;color:#333;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Deactivate</button>')
                  + '</div>'
                  + '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    } catch(err) {
        container.innerHTML = '<p style="color:#dc3545;text-align:center;padding:30px;">Error: ' + err.message + '</p>';
    }
}

async function daLoadVerifications() {
    var district = _daGetDistrict();
    var container = document.getElementById('daVerifContent');
    if (!container) return;
    if (!district) {
        container.innerHTML = '<p style="color:#9a6700;text-align:center;padding:30px;">Your District Admin account has no assigned district. Ask the System Admin to assign one before reviewing verification documents.</p>';
        return;
    }
    container.innerHTML = '<p style="color:#999;text-align:center;padding:30px;">Loading verifications…</p>';
    try {
        var resp = await authFetch(API_ENDPOINTS.pending, { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var raw = await resp.json();
        var all = Array.isArray(raw) ? raw : (raw.users || []);
        var pending = all.filter(function(u) {
            var status = (u.verificationStatus || u.verification_status || '').toUpperCase();
            return status === 'PENDING' && _daIsVerificationForDistrict(u, district);
        });

        if (pending.length === 0) {
            container.innerHTML = '<p style="color:#999;text-align:center;padding:30px;">No pending verifications in ' + (district || 'your district') + '.</p>';
            return;
        }
        var html = '<div style="display:grid;gap:12px;">';
        pending.forEach(function(u) {
            var name = ((u.firstName||u.first_name||'')+' '+(u.lastName||u.last_name||'')).trim() || u.username;
            html += '<div style="background:#f5f8ff;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-left:4px solid #2a52be;">'
                  + '<div><div style="font-weight:600;color:#1a2e55;">' + name
                  + ' <span style="background:#dbeafe;color:#1e40af;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">Pending</span></div>'
                  + '<div style="font-size:12px;color:#888;margin-top:3px;">@' + u.username + ' &bull; Wants: ' + _daVerificationRole(u) + ' &bull; District: ' + _daVerificationDistrict(u) + '</div>'
                  + '<div style="font-size:11px;color:#607080;margin-top:4px;">Also sent to System Admin &bull; You may review this district request</div></div>'
                  + '<div style="display:flex;gap:6px;">'
                  + '<button onclick="approveVerification(\'' + u.username + '\').then(function(){ daLoadVerifications(); })" style="padding:7px 14px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Approve</button>'
                  + '<button onclick="openVerifyModal(\'' + u.username + '\')" style="padding:7px 14px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Reject</button>'
                  + '<button onclick="viewUserDetails(\'' + u.username + '\')" style="padding:7px 12px;background:#fff;color:#1a4080;border:1px solid #1a4080;border-radius:6px;cursor:pointer;font-size:12px;">View</button>'
                  + '</div></div>';
        });
        html += '</div>';
        container.innerHTML = html;
    } catch(err) {
        container.innerHTML = '<p style="color:#dc3545;text-align:center;padding:30px;">Error: ' + err.message + '</p>';
    }
}

window._daCaseState = { page: 1, pageSize: 25, search: '', status: '', type: '' };

async function daLoadCaseFilterOptions() {
    try {
        var resp = await authFetch(API_ENDPOINTS.caseAnalytics, { method: 'GET' });
        if (!resp.ok) return;
        var data = await resp.json();
        CaseBrowser.fillOptionsFromValues('daCaseStatus', Object.keys(data.byStatus || {}), 'All statuses');
        CaseBrowser.fillOptionsFromValues('daCaseType', data.typeOptions || [], 'All types');
    } catch (err) {
        console.warn('Could not load case filter options:', err.message);
    }
}

async function daLoadCases() {
    var district = _daGetDistrict();
    var container = document.getElementById('daCasesContent');
    if (!container) return;

    var subtitle = document.getElementById('daCasesSubtitle');
    if (subtitle) {
        subtitle.textContent = district
            ? 'Cases filed in ' + district + '. View only.'
            : 'Cases filed in your district. View only.';
    }

    container.innerHTML = '<p class="case-list-empty">Loading cases\u2026</p>';

    var s = window._daCaseState;
    var params = new URLSearchParams();
    params.set('page', s.page);
    params.set('pageSize', s.pageSize);
    if (s.search) params.set('search', s.search);
    if (s.status) params.set('status', s.status);
    if (s.type) params.set('type', s.type);

    try {
        var resp = await authFetch(API_ENDPOINTS.cases + '?' + params.toString(), { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        var cases = CaseBrowser.unwrapCases(data);

        var empty = (s.search || s.status || s.type)
            ? 'No cases match these filters.'
            : 'No cases have been filed in ' + (district || 'your district') + ' yet.';
        CaseBrowser.renderList('daCasesContent', 'daCasesCount', cases, empty);

        CaseBrowser.renderPagination('daCasesPagination', data.page || s.page,
            data.pageSize || s.pageSize, data.totalCount || cases.length,
            function (newPage) {
                window._daCaseState.page = newPage;
                daLoadCases();
            });
    } catch (err) {
        container.innerHTML = '<p class="case-list-error">Could not load cases: '
            + CaseBrowser.esc(err.message) + '</p>';
        var countEl = document.getElementById('daCasesCount');
        if (countEl) countEl.textContent = '';
        var pagEl = document.getElementById('daCasesPagination');
        if (pagEl) pagEl.innerHTML = '';
    }
}

var _daApplyCaseFiltersDebounced = CaseBrowser.debounce(function () {
    var searchEl = document.getElementById('daCaseSearch');
    var statusEl = document.getElementById('daCaseStatus');
    var typeEl   = document.getElementById('daCaseType');

    window._daCaseState.search = searchEl ? searchEl.value.trim() : '';
    window._daCaseState.status = statusEl ? statusEl.value : '';
    window._daCaseState.type   = typeEl ? typeEl.value : '';
    window._daCaseState.page = 1;
    daLoadCases();
}, 350);

function daApplyCaseFilters() {
    _daApplyCaseFiltersDebounced();
}

window.daLoadCases = daLoadCases;
window.daLoadCaseFilterOptions = daLoadCaseFilterOptions;
window.daApplyCaseFilters = daApplyCaseFilters;

async function daLoadStatistics() {
    var district = _daGetDistrict();
    var container = document.getElementById('daStatsContent');
    if (!container) return;
    container.innerHTML = '<p style="color:#999;text-align:center;padding:30px;">Computing statistics…</p>';
    try {
        var resp = await authFetch(API_ENDPOINTS.users, { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var raw = await resp.json();
        var all = Array.isArray(raw) ? raw : (raw.users || []);
        var users = district ? all.filter(function(u) { return _daVerificationDistrict(u).toLowerCase() === district.toLowerCase(); }) : [];

        var roleCounts = {};
        users.forEach(function(u) { var r = u.role || 'Unknown'; roleCounts[r] = (roleCounts[r]||0)+1; });
        var verifApproved = users.filter(function(u) { var s=(u.verificationStatus||u.verification_status||'').toUpperCase(); return s==='APPROVED'||s==='VERIFIED'; }).length;
        var verifPending  = users.filter(function(u) { return (u.verificationStatus||u.verification_status||'').toUpperCase()==='PENDING'; }).length;
        var verifRejected = users.filter(function(u) { return (u.verificationStatus||u.verification_status||'').toUpperCase()==='REJECTED'; }).length;

        var roleRows = Object.entries(roleCounts).map(function(e) {
            return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;"><span style="color:#555;font-size:13px;">' + e[0] + '</span><strong style="color:#1a4080;">' + e[1] + '</strong></div>';
        }).join('');

        container.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">'
            + '<div style="background:#f5f8ff;border-radius:10px;padding:18px;"><h4 style="color:#1a4080;margin:0 0 12px;">Users by Role</h4>' + (roleRows || '<p style="color:#999;font-size:13px;">No data</p>') + '</div>'
            + '<div style="background:#f5f8ff;border-radius:10px;padding:18px;"><h4 style="color:#1a4080;margin:0 0 12px;">Verification Status</h4>'
            + '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e8edf8;"><span style="color:#555;font-size:13px;">Verified</span><strong style="color:#1a4080;">' + verifApproved + '</strong></div>'
            + '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e8edf8;"><span style="color:#555;font-size:13px;">Pending</span><strong style="color:#2a52be;">' + verifPending + '</strong></div>'
            + '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="color:#555;font-size:13px;">Rejected</span><strong style="color:#4b6cb7;">' + verifRejected + '</strong></div>'
            + '</div></div>';
    } catch(err) {
        container.innerHTML = '<p style="color:#dc3545;text-align:center;padding:30px;">Error: ' + err.message + '</p>';
    }
}

async function daLoadNotifications() {
    var container = document.getElementById('daNotifContent');
    if (!container) return;
    var username = localStorage.getItem('username') || sessionStorage.getItem('lcdjp_username') || '';
    if (!username) { container.innerHTML = '<p style="color:#999;text-align:center;padding:30px;">Not logged in.</p>'; return; }
    container.innerHTML = '<p style="color:#999;text-align:center;padding:30px;">Loading notifications…</p>';
    try {
        var resp = await authFetch(API_ENDPOINTS.userNotifications(username), { method: 'GET' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var raw = await resp.json();
        var notifs = Array.isArray(raw) ? raw : (raw.notifications || []);
        if (notifs.length === 0) {
            container.innerHTML = '<p style="color:#999;text-align:center;padding:30px;">No notifications.</p>';
            return;
        }
        var html = '<div style="display:grid;gap:10px;">';
        notifs.slice(0,30).forEach(function(n) {
            var isRead = n.read || n.isRead;
            
            
            
            html += '<div style="background:' + (isRead?'#f5f8ff':'#e8f0fe') + ';border-radius:8px;padding:12px 16px;cursor:pointer;" onclick="lcdjpOpenNotification(' + JSON.stringify(n).replace(/"/g, '&quot;') + ')">'
                  + '<div style="font-size:13px;font-weight:' + (isRead?'400':'600') + ';color:#333;">' + (n.message||n.title||'Notification') + '</div>'
                  + '<div style="font-size:11px;color:#888;margin-top:4px;">' + (n.createdAt ? new Date(n.createdAt).toLocaleString() : '') + '</div>'
                  + '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    } catch(err) {
        container.innerHTML = '<p style="color:#dc3545;text-align:center;padding:30px;">Error: ' + err.message + '</p>';
    }
}





var _daGMap = null;
var _daInfoWindow = null;
window._daMapUsers = {};

function showDAMap() {
    
    showDistrictAdminDashboard();
}

function buildDAMap() {
    var container = document.getElementById('daMapView');
    if (!container) return;
    
    if (_daGMap) {
        _daFetchAndRenderUsers();
        if (typeof syncDAMapHeight === 'function') syncDAMapHeight();
        if (google && google.maps) google.maps.event.trigger(_daGMap, 'resize');
        return;
    }
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#1a4080;font-size:14px;gap:8px;">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a4080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>'
        + ' Loading district map\u2026</div>';
    loadGoogleMapsSDK().then(function() {
        _buildDAMapInner(container);
    }).catch(function(err) {
        console.error('DA Maps SDK failed:', err);
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;color:#c62828;">'
            + '<span style="font-size:28px;">\u26a0\ufe0f</span>'
            + '<span style="font-size:14px;font-weight:600;">Map unavailable</span>'
            + '<span style="font-size:12px;color:#888;">Check the Google Maps API key in server settings</span></div>';
    });
}











function syncDAMapHeight() {
    var mapView = document.getElementById('daMapView');
    var mapContainer = document.getElementById('daMapContainer');
    if (!mapView || !mapContainer || mapContainer.style.display === 'none') return;

    var top = mapContainer.getBoundingClientRect().top;
    
    
    
    
    
    
    
    
    var homeContent = document.getElementById('daHomeContent');
    var contentH = (homeContent && homeContent.style.display !== 'none')
        ? Math.round(homeContent.getBoundingClientRect().height) : 0;
    var bottomReserve = contentH > 0 ? contentH : 24;

    var available = Math.round(window.innerHeight - top - bottomReserve);
    
    
    
    available = Math.max(360, Math.min(available, 820));

    mapView.style.height = available + 'px';
    mapView.style.minHeight = available + 'px';
    mapContainer.style.minHeight = available + 'px';

    if (window.google && google.maps && google.maps.event && _daGMap) {
        var center = _daGMap.getCenter();
        requestAnimationFrame(function() {
            google.maps.event.trigger(_daGMap, 'resize');
            if (center) _daGMap.setCenter(center);
        });
    }
}
window.syncDAMapHeight = syncDAMapHeight;

window.addEventListener('resize', function() {
    var mapContainer = document.getElementById('daMapContainer');
    if (mapContainer && mapContainer.style.display !== 'none') syncDAMapHeight();
});



window.addEventListener('orientationchange', function() {
    setTimeout(syncDAMapHeight, 200);
});

function _buildDAMapInner(container) {
    var district = _daGetDistrict();
    var center = { lat: 1.3733, lng: 32.2903 }; 
    if (district && typeof ugandaCoordinates !== 'undefined' && ugandaCoordinates.districts) {
        var d = ugandaCoordinates.districts;
        var lower = district.toLowerCase();
        for (var k in d) {
            if (k.toLowerCase() === lower) { center = d[k]; break; }
        }
    }
    container.innerHTML = '';
    _daGMap = new google.maps.Map(container, {
        center: center,
        zoom: district ? 10 : 7,
        mapTypeId: 'hybrid',
        styles: (typeof MAP_STYLES !== 'undefined') ? MAP_STYLES : [],
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        clickableIcons: false,
        gestureHandling: 'cooperative'
    });
    _daInfoWindow = new google.maps.InfoWindow();
    _daGMap.addListener('click', function() { _daInfoWindow.close(); });
    if (typeof syncDAMapHeight === 'function') syncDAMapHeight();
    [400, 900].forEach(function(ms) {
        setTimeout(function() {
            if (typeof syncDAMapHeight === 'function') syncDAMapHeight();
            if (_daGMap) google.maps.event.trigger(_daGMap, 'resize');
        }, ms);
    });
    _daFetchAndRenderUsers();
}

function _daFetchAndRenderUsers() {
    if (!_daGMap) return;
    var district = _daGetDistrict();
    authFetch(API_ENDPOINTS.users, { method: 'GET' })
        .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function(raw) {
            var all = Array.isArray(raw) ? raw : (raw.users || []);
            
            
            
            
            
            var myUsername = (typeof getLcdjpActiveUsername === 'function')
                ? getLcdjpActiveUsername()
                : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
            var users = district
                ? all.filter(function(u) {
                    var role = (u.role || '').toUpperCase();
                    return _daVerificationDistrict(u).toLowerCase() === district.toLowerCase()
                        && (!myUsername || u.username !== myUsername)
                        && role !== 'DISTRICT_ADMIN' && role !== 'SYSTEM_ADMIN' && role !== 'ADMIN';
                  })
                : all.filter(function(u) {
                    var role = (u.role || '').toUpperCase();
                    return (!myUsername || u.username !== myUsername)
                        && role !== 'DISTRICT_ADMIN' && role !== 'SYSTEM_ADMIN' && role !== 'ADMIN';
                  });
            _renderDAMapUsers(users, district);
        })
        .catch(function(err) { console.error('DA map user fetch failed:', err); });
}

function _renderDAMapUsers(users, district) {
    if (!_daGMap) return;
    window._daMapUsers = {};
    
    _daGMap.controls[google.maps.ControlPosition.TOP_LEFT].clear();
    var citizens = users.filter(function(u) { return u.role === 'Citizen'; }).length;
    var lawyers  = users.filter(function(u) { return u.role === 'Lawyer'; }).length;
    var summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = 'background:white;padding:10px 14px;border-radius:8px;'
        + 'box-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:13px;border-left:4px solid #1a4080;margin:10px 0 0 10px;'
        + 'max-width:calc(100vw - 40px);box-sizing:border-box;overflow-wrap:break-word;';
    summaryDiv.innerHTML = '<strong style="color:#1a4080;">\ud83d\udc65 ' + (district || 'District') + ', ' + users.length + ' registered user' + (users.length !== 1 ? 's' : '') + '</strong>'
        + '<div class="lcdjp-map-summary-row">'
        + '<span>\ud83d\udfe2 Citizens: ' + citizens + '</span>'
        + '<span>\u2696\ufe0f Lawyers: ' + lawyers + '</span>'
        + '</div>';
    _daGMap.controls[google.maps.ControlPosition.TOP_LEFT].push(summaryDiv);
    
    function _daCoords(dn) {
        if (!dn || typeof ugandaCoordinates === 'undefined') return null;
        var d = ugandaCoordinates.districts;
        if (d[dn]) return d[dn];
        var lo = dn.toLowerCase();
        for (var k in d) { if (k.toLowerCase() === lo) return d[k]; }
        for (var k in d) { if (k.toLowerCase().includes(lo) || lo.includes(k.toLowerCase())) return d[k]; }
        return { lat: 1.3733, lng: 32.2903 };
    }
    var typeConfig = {
        'Citizen':     { color: '#28a745', border: '#1a6b2e', size: 18 },
        'Lawyer':      { color: '#1565C0', border: '#0d47a1', size: 22 }
    };
    var pendingConfig = { color: '#dc3545', border: '#b71c1c', size: 18 };
    var districtCount = {};
    var bounds = new google.maps.LatLngBounds();
    var plotted = 0;
    users.forEach(function(user) {
        var ud = user.district || district || '';
        var coords = _daCoords(ud);
        if (!coords) return;
        
        var key = ud.toLowerCase();
        districtCount[key] = (districtCount[key] || 0) + 1;
        var n = districtCount[key];
        var lat = coords.lat + 0.012 * Math.sqrt(n) * Math.sin(n * 2.4);
        var lng = coords.lng + 0.012 * Math.sqrt(n) * Math.cos(n * 2.4);
        var vs = (user.verificationStatus || user.verification_status || '').toUpperCase();
        var isPending = vs === 'PENDING' || user.approval_status === 'Pending' || user.approval_status === null;
        var cfg = isPending ? pendingConfig : (typeConfig[user.role] || typeConfig['Citizen']);
        var marker = new google.maps.Marker({
            position: { lat: lat, lng: lng },
            map: _daGMap,
            icon: {
                url: _adminMarkerSVG(cfg.color, cfg.border, cfg.size),
                scaledSize: new google.maps.Size(cfg.size, cfg.size),
                anchor: new google.maps.Point(cfg.size / 2, cfg.size / 2)
            },
            title: ((user.first_name || user.firstName || '') + ' ' + (user.last_name || user.lastName || '')).trim() || user.username || '',
            zIndex: isPending ? 200 : 100
        });
        bounds.extend({ lat: lat, lng: lng });
        plotted++;
        
        var nu = {
            name:     ((user.first_name || user.firstName || '') + ' ' + (user.last_name || user.lastName || '')).trim() || user.username || '',
            username: user.username || '',
            role:     user.role || '',
            district: user.district || '',
            subCounty:user.sub_county || user.subCounty || '',
            phone:    user.phone_number || user.phoneNumber || '',
            verifStatus: (user.verificationStatus || user.verification_status || 'Not Submitted').replace(/_/g,' '),
            regDate:  user.registration_date || user.registrationDate || ''
        };
        window._daMapUsers[nu.username] = nu;
        var roleIcon = nu.role === 'Lawyer' ? '\u2696\ufe0f' : '\ud83d\udc64';
        var vsu = nu.verifStatus.toUpperCase();
        var badge = (vsu === 'PENDING')
            ? '<span style="background:#ff9800;color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">\u23f3 Pending</span>'
            : (vsu === 'APPROVED' || vsu === 'VERIFIED')
            ? '<span style="background:#28a745;color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">\u2713 Verified</span>'
            : '<span style="background:#6c757d;color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">' + _cmEsc(nu.verifStatus) + '</span>';
        var info = '<div style="font-family:inherit;padding:4px 2px;min-width:200px;">'
            + '<div style="font-weight:700;font-size:14px;color:#1a237e;margin-bottom:3px;">' + roleIcon + ' ' + _cmEsc(nu.name) + '</div>'
            + '<div style="font-size:12px;color:#555;margin-bottom:3px;">' + _cmEsc(nu.role || '') + '</div>'
            + '<div style="font-size:12px;color:#555;margin-bottom:4px;">\ud83d\udccd ' + _cmEsc(nu.district || 'Unknown') + (nu.subCounty ? ', ' + _cmEsc(nu.subCounty) : '') + '</div>'
            + (nu.phone ? '<div style="font-size:12px;color:#555;margin-bottom:4px;">\ud83d\udcde ' + _cmEsc(nu.phone) + '</div>' : '')
            + (nu.regDate ? '<div style="font-size:11px;color:#888;margin-bottom:6px;">Registered: ' + new Date(nu.regDate).toLocaleDateString() + '</div>' : '')
            + '<div>' + badge + '</div>'
            + '</div>';
        (function(m, c) {
            m.addListener('click', function() {
                _daInfoWindow.setContent(c);
                _daInfoWindow.open(_daGMap, m);
            });
        })(marker, info);
    });
    
    if (plotted > 0) {
        _daGMap.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
        google.maps.event.addListenerOnce(_daGMap, 'idle', function() {
            if (_daGMap.getZoom() > 13) _daGMap.setZoom(13);
        });
    }
}



(function() {
    var _origEnsure = typeof ensureSidebarVisibility === 'function' ? ensureSidebarVisibility : null;
    if (_origEnsure) {
        var _overrideEnsure = function(userType) {
            var daSB = document.getElementById('daSidebarMenu');
            if (daSB && userType !== 'DISTRICT_ADMIN') daSB.style.display = 'none';
            _origEnsure(userType);
        };
        ensureSidebarVisibility = _overrideEnsure;
    }
})();