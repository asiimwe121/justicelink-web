function openBlog() {
    var modal = document.getElementById('blogModal');
    var content = document.getElementById('blogContent');
    if (!modal || !content) return;
    content.innerHTML = '<h2 style="color:#1a4080; margin-top:0;">Blog</h2><p style="color:#666;">Blog posts coming soon.</p>';
    modal.style.display = 'block';
}
function closeBlog() {
    var modal = document.getElementById('blogModal');
    if (modal) modal.style.display = 'none';
}
window.openBlog = openBlog;
window.closeBlog = closeBlog;





function _getDashboardAuthHeaders() {
    var token = _getDashboardToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}
function _getDashboardAuthHeaders() {
    var token = _getDashboardToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

function isAuthenticated() {
    return typeof window.isTokenValid === 'function'
        ? window.isTokenValid()
        : !!_getDashboardToken();
}
function isMobile() {
    return window.innerWidth < 768;
}
function _getDashboardToken() {
    try {
        var token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
        if (!token || token === 'null' || token === 'undefined' || token === '') {
            return null;
        }
        return token;
    } catch (e) {
        return null;
    }
}


async function checkAPIConnection() {
    return true;
}

async function updateAPIStatusIndicator() {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;
    
    try {
        const isConnected = await checkAPIConnection();
        
        if (isConnected) {
            statusEl.innerHTML = ' Database Connected';
            statusEl.style.background = '#d4edda';
            statusEl.style.color = '#155724';
            statusEl.style.borderColor = '#c3e6cb';
            statusEl.title = 'Connected to MySQL database';
        } else {
            statusEl.innerHTML = ' Offline Mode (Local)';
            statusEl.style.background = '#fff3cd';
            statusEl.style.color = '#856404';
            statusEl.style.borderColor = '#ffeeba';
            statusEl.title = 'Using local storage only - Database not reachable';
        }
    } catch (error) {
        statusEl.innerHTML = ' Disconnected';
        statusEl.style.background = '#f8d7da';
        statusEl.style.color = '#721c24';
        statusEl.style.borderColor = '#f5c6cb';
        statusEl.title = 'Could not connect to database';
    }
}

function addAPIStatusIndicator() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) {
        console.warn('Topbar not found, cannot add API status indicator');
        return;
    }
    
    if (document.getElementById('apiStatus')) return;
    
    const statusDiv = document.createElement('div');
    statusDiv.id = 'apiStatus';
    statusDiv.style.cssText = `
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 500;
        margin-left: 10px;
        background: #f0f0f0;
        color: #666;
        display: inline-block;
        border: 1px solid #ddd;
        cursor: default;
        transition: all 0.3s ease;
    `;
    statusDiv.textContent = ' Checking...';
    statusDiv.title = 'Checking database connection...';
    
    const navLeft = topbar.querySelector('.nav-left');
    if (navLeft) {
        navLeft.appendChild(statusDiv);
    } else {
        topbar.insertBefore(statusDiv, topbar.firstChild);
    }
    
    updateAPIStatusIndicator();
    
    setInterval(updateAPIStatusIndicator, 30000);
}


if (window.matchMedia('(display-mode: standalone)').matches) {
    document.body.classList.add('standalone');
    console.log(' Running as installed app');
}
const chatStyles = document.createElement('style');
chatStyles.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    #chatWindow {
        animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    #chatMessages::-webkit-scrollbar {
        width: 4px;
    }
    #chatMessages::-webkit-scrollbar-track {
        background: #f1f1f1;
    }
    #chatMessages::-webkit-scrollbar-thumb {
        background: #1a4080;
        border-radius: 10px;
    }
`;
document.head.appendChild(chatStyles);


function _isMobile() { return window.innerWidth < 768; }

function openSidebar() {
    var sb  = document.getElementById('mainSidebar');
    var ov  = document.getElementById('lcdjpSidebarOverlay');
    if (!sb || !ov) return;
    sb.classList.add('mobile-sidebar-open');
    ov.style.display = 'block';
    void ov.offsetWidth;
    ov.classList.add('active');
    lockScroll();
}

function closeSidebar() {
    var sb = document.getElementById('mainSidebar');
    var ov = document.getElementById('lcdjpSidebarOverlay');
    if (!sb || !ov) return;
    sb.classList.remove('mobile-sidebar-open');
    ov.classList.remove('active');
    unlockScroll();
    setTimeout(function() {
        if (!ov.classList.contains('active')) {
            ov.style.display = 'none';
        }
    }, 320);
}





function _adminMobileMenuId() {
    var level = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('lcdjp_userlevel'))
        || (typeof localStorage !== 'undefined' && localStorage.getItem('lcdjp_userlevel'))
        || '';
    return level === 'DISTRICT_ADMIN' ? 'daMobileMenu' : 'adminMobileMenu';
}
function toggleAdminMobileMenu(e) {
    if (e) e.stopPropagation();
    var activeId = _adminMobileMenuId();
    var otherId = activeId === 'daMobileMenu' ? 'adminMobileMenu' : 'daMobileMenu';
    var other = document.getElementById(otherId);
    if (other) other.style.display = 'none';
    var m = document.getElementById(activeId);
    if (!m) return;
    m.style.display = (m.style.display === 'block') ? 'none' : 'block';
}
function closeAdminMobileMenu() {
    var m = document.getElementById(_adminMobileMenuId());
    if (m) m.style.display = 'none';
    var other = document.getElementById(_adminMobileMenuId() === 'daMobileMenu' ? 'adminMobileMenu' : 'daMobileMenu');
    if (other) other.style.display = 'none';
}
document.addEventListener('click', function(e) {
    
    
    var wrap = document.getElementById('amNavMenu');
    if (wrap && !wrap.contains(e.target)) closeAdminMobileMenu();
});





window.toggleAdminMessagesPanel = function() {
    var panel = document.getElementById('adminMessagesPanel');
    if (!panel) return;
    if (panel.style.display === 'flex') {
        closeAdminMessagesPanel();
    } else {
        panel.style.display = 'flex';
        var overlay = document.getElementById('adminMessagesOverlay');
        if (overlay) overlay.style.display = 'block';
        
        
        
        
        
        if (typeof loadAdminMessagesPanel === 'function') loadAdminMessagesPanel();
    }
};
window.closeAdminMessagesPanel = function() {
    var panel = document.getElementById('adminMessagesPanel');
    var overlay = document.getElementById('adminMessagesOverlay');
    if (panel) panel.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
};













window._adminConversations = {};
window._adminActiveConversationKey = null;

window.loadAdminMessagesPanel = async function() {
    var list = document.getElementById('adminMessagesListPanel');
    if (!list) return;
    window._adminActiveConversationKey = null;
    
    
    var replyBar = document.getElementById('adminReplyBar');
    if (replyBar) replyBar.style.display = 'none';
    var footer = document.getElementById('adminMessagesFooter');
    if (footer) footer.style.display = '';
    list.innerHTML = '<p style="text-align:center;color:#999;padding:30px 0;">Loading messages&hellip;</p>';
    try {
        var username = typeof getLcdjpActiveUsername === 'function'
            ? getLcdjpActiveUsername()
            : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
        
        
        
        var userLevel = (sessionStorage.getItem('lcdjp_userlevel') || '').toUpperCase();
        var isSystemAdmin = userLevel.indexOf('SYSTEM') !== -1 || userLevel === 'ADMIN';
        var endpoint = isSystemAdmin ? API_ENDPOINTS.chatMessages + '/admin'
            : API_ENDPOINTS.chatUserMessages(username);

        var resp = await fetch(endpoint, { method: 'GET', headers: getAuthHeaders() });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var raw = await resp.json();
        var msgs = Array.isArray(raw) ? raw : (raw.messages || []);

        if (!msgs.length) {
            list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#999;">' +
                '<h3 style="color:#666;">No Messages Yet</h3>' +
                '<p style="font-size:14px;">Waiting for customer inquiries&hellip;</p></div>';
            return;
        }

        msgs.sort(function (a, b) { return new Date(a.timestamp || 0) - new Date(b.timestamp || 0); });

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        function isAdminRole(role) {
            return (role || '').toUpperCase().indexOf('ADMIN') !== -1;
        }
        var conversations = {};
        msgs.forEach(function (m) {
            
            
            
            var fromUser = m.from_user || m.fromUser || 'Unknown';
            var fromName = m.from_name || m.fromName || fromUser;
            var fromRole = m.from_role || m.fromRole || '';
            var sentTo = m.sent_to || m.sentTo || 'unknown';
            var isMine = fromUser === username;

            var key;
            if (isMine) {
                key = sentTo;                       
            } else if (sentTo === username) {
                key = fromUser;                      
            } else {
                
                
                key = isAdminRole(fromRole) ? sentTo : fromUser;
            }

            if (!conversations[key]) {
                conversations[key] = { key: key, name: key, role: '', messages: [] };
            }
            
            
            
            
            
            if (fromUser === key) {
                conversations[key].name = fromName;
                conversations[key].role = fromRole;
            }
            conversations[key].messages.push({
                isMine: isMine, fromName: fromName, fromRole: fromRole,
                text: m.message || '', ts: m.timestamp || ''
            });
        });

        window._adminConversations = conversations;

        var convoList = Object.keys(conversations).map(function (k) { return conversations[k]; });
        convoList.sort(function (a, b) {
            var aTs = a.messages[a.messages.length - 1].ts;
            var bTs = b.messages[b.messages.length - 1].ts;
            return new Date(bTs || 0) - new Date(aTs || 0);
        });

        list.innerHTML = convoList.map(function (c) {
            var last = c.messages[c.messages.length - 1];
            var tsLabel = last.ts ? new Date(last.ts).toLocaleString() : '';
            var preview = last.text.length > 80 ? last.text.slice(0, 80) + '…' : last.text;
            return '<div onclick="openAdminConversationThread(\'' + _cmEsc(c.key).replace(/'/g, "\\'") + '\')" ' +
                'style="background:#fff;border-radius:10px;padding:12px 14px;margin-bottom:10px;cursor:pointer;' +
                'box-shadow:0 1px 3px rgba(0,0,0,0.1);">' +
                '<div style="font-weight:600;font-size:14px;color:#1a2e55;">' + _cmEsc(c.name) +
                    (c.role ? ' <span style="font-weight:400;color:#888;">(' + _cmEsc(c.role) + ')</span>' : '') + '</div>' +
                '<div style="font-size:13px;color:#1a4080;margin:4px 0;">' + _cmEsc(preview) + '</div>' +
                (tsLabel ? '<div style="font-size:11px;color:#999;">' + _cmEsc(tsLabel) + '</div>' : '') +
            '</div>';
        }).join('');
    } catch (error) {
        console.error('Error loading admin messages:', error);
        list.innerHTML = '<p style="text-align:center;color:#dc3545;padding:20px 0;">Could not load messages.<br>' +
            '<button onclick="loadAdminMessagesPanel()" style="padding:5px 12px;background:#1a4080;color:white;border:none;border-radius:6px;cursor:pointer;margin-top:8px;">Retry</button></p>';
    }
};

window.openAdminConversationThread = function (key) {
    var convo = window._adminConversations && window._adminConversations[key];
    var list = document.getElementById('adminMessagesListPanel');
    if (!convo || !list) return;
    window._adminActiveConversationKey = key;

    var header = '<div style="display:flex;align-items:center;gap:10px;margin:-15px -15px 12px;padding:12px 15px;' +
        'background:#fff;border-bottom:1px solid #eee;position:sticky;top:-15px;z-index:2;">' +
        '<button onclick="loadAdminMessagesPanel()" aria-label="Back to conversations" ' +
            'style="background:none;border:none;font-size:18px;cursor:pointer;color:#1a4080;padding:0 4px;">&larr;</button>' +
        '<div><div style="font-weight:600;color:#1a2e55;font-size:14px;">' + _cmEsc(convo.name) + '</div>' +
        (convo.role ? '<div style="font-size:11px;color:#888;">' + _cmEsc(convo.role) + '</div>' : '') +
        '</div></div>';

    var bubbles = convo.messages.map(function (m) {
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

    list.innerHTML = header + bubbles;
    list.scrollTop = list.scrollHeight;

    
    
    var footer = document.getElementById('adminMessagesFooter');
    if (footer) footer.style.display = 'none';
    var replyBar = document.getElementById('adminReplyBar');
    if (replyBar) {
        replyBar.style.display = 'flex';
        var input = document.getElementById('adminReplyInput');
        if (input) input.focus();
    }
};







window.sendAdminReply = async function() {
    var key = window._adminActiveConversationKey;
    var input = document.getElementById('adminReplyInput');
    var button = document.getElementById('adminReplySendBtn');
    if (!key || !input) return;
    var text = input.value.trim();
    if (!text) return;

    var username = typeof getLcdjpActiveUsername === 'function'
        ? getLcdjpActiveUsername()
        : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!username) {
        if (typeof showToast === 'function') showToast('Please sign in to send a reply.');
        return;
    }
    var fullname = sessionStorage.getItem('lcdjp_fullname') || username;
    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || 'Admin';

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
        var resp = await fetch(API_ENDPOINTS.chatMessages, {
            method: 'POST',
            headers: (typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);

        var convo = window._adminConversations && window._adminConversations[key];
        if (convo) {
            convo.messages.push({ isMine: true, fromName: fullname, fromRole: userLevel, text: text, ts: timestamp });
        }
        input.value = '';
        openAdminConversationThread(key);

        
        
        
        
        
        if (key && key !== 'unknown' && typeof createEnhancedNotification === 'function') {
            createEnhancedNotification(
                key,
                fullname + ' (Support) replied to your message',
                'new_message'
            ).catch(function (e) { console.warn('Could not notify recipient of reply:', e); });
        }
    } catch (err) {
        console.error('sendAdminReply error:', err);
        if (typeof showToast === 'function') showToast('Could not send reply. Please try again.');
        input.disabled = false;
        if (button) button.disabled = false;
    }
};

function handleResize() {
    if (!_isMobile()) {
        closeSidebar();
        closeAdminMobileMenu();
    }
}
window.addEventListener('resize', handleResize);


var _MOBILE_PANELS = {
    'reportMenu': {
        title: 'Report a Case',
        items: [
            {icon:'', label:'Family Dispute',       desc:'Domestic and family-related disputes',        action:"requireAuth('disputeFamily')"},
            {icon:'', label:'Land Matter',          desc:'Land ownership and boundary issues',          action:"requireAuth('disputeLand')"},
            {icon:'', label:'Business Matter',      desc:'Business and commercial disputes',            action:"requireAuth('disputeBusiness')"},
            {icon:'', label:'Community Disputes',   desc:'Disputes affecting the community',            action:"requireAuth('disputeCommunity')"},
            {icon:'', label:'Inheritance Dispute',  desc:'Inheritance and estate issues',               action:"requireAuth('disputeInheritance')"},
            {icon:'', label:'Boundary Dispute',     desc:'Property boundary issues',                   action:"requireAuth('disputeBoundary')"},
            {icon:'', label:'Marriage Dispute',     desc:'Marriage and relationship disputes',          action:"requireAuth('disputeMarriage')"},
            {icon:'', label:'Child Custody',        desc:'Child custody and welfare matters',           action:"requireAuth('disputeChildCustody')"},
            {icon:'', label:'Debt Recovery',        desc:'Debt and financial disputes',                 action:"requireAuth('disputeDebt')"},
            {icon:'', label:'Others',               desc:'Other legal matters',                        action:"requireAuth('disputeOthers')"}
        ]
    },
    'legalMenu': {
        title: 'Legal Advice',
        items: [
            {icon:'', label:'Know Your Rights',       desc:'Citizens are protected under the 1995 Constitution.', action:"openSection('rights')"},
            {icon:'', label:'Common Legal Questions', desc:'Land disputes, domestic violence, employment.',        action:"openSection('questions')"},
            {icon:'', label:'AI Legal Guidance',      desc:'Preliminary AI-powered legal guidance.',              action:"openSection('aiLegal')"},
            {icon:'', label:'Legal Templates',        desc:'Tenancy agreements, affidavit forms, letters.',        action:"openSection('templates')"}
        ]
    },
    'sidebarFindHelpMenu': {
        title: 'Find Help',
        items: [
            {icon:'', label:'Courts & Tribunals',               desc:'Find the appropriate court or tribunal.',                 action:"typeof openFindHelpHub==='function' && openFindHelpHub()"},
            {icon:'', label:'Local Council Services',           desc:'Find the relevant local council office or service.',      action:"typeof openFindHelpHub==='function' && openFindHelpHub()"},
            {icon:'', label:'Government Services',              desc:'Find the government office responsible for a service.',   action:"typeof openFindHelpHub==='function' && openFindHelpHub()"},
            {icon:'', label:'Mediation & Dispute Resolution',   desc:'Find mediation or dispute-resolution services.',           action:"typeof openFindHelpHub==='function' && openFindHelpHub()"},
            {icon:'', label:'Community & Support Organizations', desc:'Find community organizations and support services.',     action:"typeof openFindHelpHub==='function' && openFindHelpHub()"},
            {icon:'', label:'Not Sure Where to Go?',            desc:'Describe your situation and get pointed in the right direction.', action:"typeof openFindHelpHub==='function' && openFindHelpHub()"}
        ]
    },
    'educationMenu': {
        title: 'Legal Education',
        items: [
            {icon:'', label:'Land & Property Law',          desc:'Rights regarding land and property ownership.',             action:"openSection('landLaw')"},
            {icon:'', label:'Family & Marriage Law',        desc:'Legal framework for family matters, marriage and divorce.', action:"openSection('familyLaw')"},
            {icon:'', label:'Business & Employment Law',    desc:'Rights for employees and business owners.',                 action:"openSection('employmentLaw')"},
            {icon:'', label:'Community Disputes (LC)',      desc:'How the Local Council system resolves disputes.',           action:"openSection('communityLaw')"}
        ]
    }
};

function showMobileMenuPanel(menuId) {
    var p = _MOBILE_PANELS[menuId];
    if (!p) return;
    var html = '<div id="mobileServicePanel" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:9998;overflow-y:auto;-webkit-overflow-scrolling:touch;">';
    html += '<div style="background:#1a4080;color:white;padding:calc(14px + env(safe-area-inset-top)) 16px 14px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:2;">';
    html += '<button onclick="closeMobileMenuPanel()" style="background:rgba(255,255,255,0.2);border:none;color:white;font-size:22px;cursor:pointer;padding:4px 12px;border-radius:8px;line-height:1;">&larr;</button>';
    html += '<div style="font-size:17px;font-weight:700;">' + p.title + '</div>';
    html += '</div><div style="padding:16px;">';
    p.items.forEach(function(item) {
        html += '<div onclick="' + item.action + '; closeMobileMenuPanel();" ';
        html += 'style="display:block;padding:14px 16px;border-radius:12px;border:1px solid #dce8f5;margin-bottom:10px;cursor:pointer;background:#f4f8ff;">';
        html += '<div><strong style="color:#1a4080;display:block;font-size:15px;margin-bottom:3px;">' + item.label + '</strong>';
        html += '<span style="color:#666;font-size:13px;line-height:1.4;">' + item.desc + '</span></div>';
        html += '</div>';
    });
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    lockScroll();
}
function closeMobileMenuPanel() {
    var p = document.getElementById('mobileServicePanel');
    if (p) { p.remove(); }
    unlockScroll();
    
    if (typeof closeAIAssistant === 'function') closeAIAssistant();
    var homeNav = document.getElementById('cmNavHome');
    if (homeNav && window.innerWidth <= 767) {
        document.querySelectorAll('.cm-nav').forEach(function(n){n.classList.remove('active');});
        homeNav.classList.add('active');
        var body = document.querySelector('#citizenMobileView .cm-body');
        if (body) body.scrollTop = 0;
    }
}


var ALL_ROLE_MENU_IDS = ['lcmAccountMenu','lmAccountMenu','cmAccountMenu','cmQuickMenu','lmQuickMenu','lcQuickMenu'];
function toggleRoleMenu(menuId, e) {
    if (e) e.stopPropagation();
    var m = document.getElementById(menuId);
    if (!m) return;
    ALL_ROLE_MENU_IDS.forEach(function(id) {
        if (id !== menuId) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
    });
    m.style.display = (m.style.display === 'block') ? 'none' : 'block';
}
function closeRoleMenu(menuId) {
    var m = document.getElementById(menuId);
    if (m) m.style.display = 'none';
}
document.addEventListener('click', function(e) {
    ['lcmAccountMenu','lmAccountMenu'].forEach(function(id) {
        var m = document.getElementById(id);
        if (!m) return;
        var wrap = m.closest ? m.closest('.cm-avatar-wrap') : null;
        if (wrap && !wrap.contains(e.target)) m.style.display = 'none';
    });
});
function toggleCmAccountMenu(e) {
    if (e) e.stopPropagation();
    var m = document.getElementById('cmAccountMenu');
    if (!m) return;
    ALL_ROLE_MENU_IDS.forEach(function(id) {
        if (id !== 'cmAccountMenu') { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
    });
    m.style.display = (m.style.display === 'block') ? 'none' : 'block';
}
function closeCmAccountMenu() {
    var m = document.getElementById('cmAccountMenu');
    if (m) m.style.display = 'none';
}

document.addEventListener('click', function(e) {
    var wrap = document.querySelector('.cm-avatar-wrap');
    if (wrap && !wrap.contains(e.target)) closeCmAccountMenu();
});






function positionQuickMenuAboveNav(panel, navEl) {
    if (!panel || !navEl) return;
    var navH = navEl.offsetHeight || 70;
    panel.style.bottom = (navH + 8) + 'px';
}
function toggleCmQuickMenu(e) {
    if (e) e.stopPropagation();
    var m = document.getElementById('cmQuickMenu');
    if (!m) return;
    ALL_ROLE_MENU_IDS.forEach(function(id) {
        if (id !== 'cmQuickMenu') { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
    });
    var opening = m.style.display !== 'block';
    if (opening) {
        var nav = document.querySelector('#citizenMobileView .cm-bottom-nav');
        positionQuickMenuAboveNav(m, nav);
    }
    m.style.display = opening ? 'block' : 'none';
}
function closeCmQuickMenu() {
    var m = document.getElementById('cmQuickMenu');
    if (m) m.style.display = 'none';
}
function toggleLmQuickMenu(e) {
    if (e) e.stopPropagation();
    var m = document.getElementById('lmQuickMenu');
    if (!m) return;
    ALL_ROLE_MENU_IDS.forEach(function(id) {
        if (id !== 'lmQuickMenu') { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
    });
    var opening = m.style.display !== 'block';
    if (opening) {
        var nav = document.querySelector('.lm-bottom-nav');
        positionQuickMenuAboveNav(m, nav);
    }
    m.style.display = opening ? 'block' : 'none';
}
function closeLmQuickMenu() {
    var m = document.getElementById('lmQuickMenu');
    if (m) m.style.display = 'none';
}
function toggleLcQuickMenu(e) {
    if (e) e.stopPropagation();
    var m = document.getElementById('lcQuickMenu');
    if (!m) return;
    ALL_ROLE_MENU_IDS.forEach(function(id) {
        if (id !== 'lcQuickMenu') { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
    });
    var opening = m.style.display !== 'block';
    if (opening) {
        var nav = document.querySelector('#lcDashboard .lm-bottom-nav');
        positionQuickMenuAboveNav(m, nav);
    }
    m.style.display = opening ? 'block' : 'none';
}
function closeLcQuickMenu() {
    var m = document.getElementById('lcQuickMenu');
    if (m) m.style.display = 'none';
}
document.addEventListener('click', function(e) {
    ['cmQuickMenu','lmQuickMenu','lcQuickMenu'].forEach(function(id) {
        var m = document.getElementById(id);
        if (!m || m.style.display !== 'block') return;
        var navBtnId = id === 'cmQuickMenu' ? 'cmNavMenu' : (id === 'lcQuickMenu' ? 'lcNavMenu' : 'lmNavMenu');
        var navBtn = document.getElementById(navBtnId);
        if (!m.contains(e.target) && (!navBtn || !navBtn.contains(e.target))) m.style.display = 'none';
    });
});
window.addEventListener('resize', function() {
    var cm = document.getElementById('cmQuickMenu');
    if (cm && cm.style.display === 'block') {
        positionQuickMenuAboveNav(cm, document.querySelector('#citizenMobileView .cm-bottom-nav'));
    }
    var lm = document.getElementById('lmQuickMenu');
    if (lm && lm.style.display === 'block') {
        positionQuickMenuAboveNav(lm, document.querySelector('.lm-bottom-nav'));
    }
    var lc = document.getElementById('lcQuickMenu');
    if (lc && lc.style.display === 'block') {
        positionQuickMenuAboveNav(lc, document.querySelector('#lcDashboard .lm-bottom-nav'));
    }
});
function openUserSettings() {
    var r = sessionStorage.getItem('lcdjp_userlevel') || '';
    var rl = r.toLowerCase();
    if (rl.includes('lawyer')) { if (typeof showEditAccount === 'function') showEditAccount(); }
    else if (typeof showEditAccount === 'function') showEditAccount();
    
    var menu = document.getElementById('accountMenu');
    if (menu) menu.style.display = 'none';
}








async function showAdminAccountSettings() {
    var username = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username');
    var user = (typeof getUserByUsername === 'function') ? await getUserByUsername(username) : null;
    var avatarSrc = sessionStorage.getItem('lcdjp_avatar_' + username) || (typeof defaultAvatar !== 'undefined' ? defaultAvatar : '');

    var profileBlock = '';
    if (user) {
        profileBlock = '' +
            '<div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; flex-wrap:wrap;">' +
                '<img src="' + avatarSrc + '" class="js-profile-avatar-img" style="width:90px; height:90px; border-radius:50%; object-fit:cover; border:4px solid #1a4080;">' +
                '<div>' +
                    '<h3 style="margin:0; color:#333;">' + (user.firstName || '') + ' ' + (user.lastName || '') + '</h3>' +
                    '<p style="margin:5px 0; color:#666;">@' + (user.username || username || '') + '</p>' +
                    '<span style="background:#1a4080; color:white; padding:3px 12px; border-radius:12px; font-size:12px;">' + (user.userType || sessionStorage.getItem('lcdjp_userlevel') || 'Admin') + '</span>' +
                '</div>' +
            '</div>' +
            '<div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:10px;">' +
                '<div><strong>Phone:</strong> ' + (user.phoneNumber || 'N/A') + '</div>' +
                '<div><strong>Email:</strong> ' + (user.email || 'N/A') + '</div>' +
                '<div><strong>District:</strong> ' + (user.district || 'N/A') + '</div>' +
                '<div><strong>Joined:</strong> ' + (user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A') + '</div>' +
            '</div>';
    }

    var html = '' +
    '<div class="form-card" style="max-width:700px; margin:0 auto;">' +
        '<h2>Settings</h2>' +
        profileBlock +
        '<div style="margin-top:20px; padding-top:20px; border-top:1px solid #eee;">' +
            '<label>Update Profile Photo</label>' +
            '<p style="font-size:13px; color:#888; margin-bottom:12px;">Supported formats: JPG, PNG, GIF (Max 5MB)</p>' +
            '<input type="file" id="avatarImageFileInput" accept="image/*" onchange="processProfileAvatarChange(this)" style="padding:10px; border:1px solid #ddd; border-radius:6px; width:100%;">' +
        '</div>' +
        '<br><br>' +
        '<button onclick="showHome()" style="padding:10px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">Finish &amp; Return</button>' +
    '</div>';

    openDynamicView(html);

    var menu = document.getElementById('accountMenu');
    if (menu) menu.style.display = 'none';
}
function svcRequireAuth(action) {
    if (typeof _lcdjpActionNeedsVerification === 'function' && _lcdjpActionNeedsVerification(action) &&
        typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('This feature is not available at this time.');
        }
        return;
    }
    if (window.innerWidth < 768 && action === 'reportCase') {
        
        if (typeof _lcdjpHasApprovedVerification === 'function' && !_lcdjpHasApprovedVerification()) {
            requireAuth(action);
        } else if (typeof window.openReportCaseAssistant === 'function') {
            window.openReportCaseAssistant();
        } else if (typeof window.openAIAssistant === 'function') {
            window.openAIAssistant(undefined, 'report');
        } else {
            showMobileMenuPanel('reportMenu');
        }
    } else {
        requireAuth(action);
    }
}











var _cmSearchIndex = [
    { label: 'Report a Case / Crime Report', hint: 'File a new case with the AI assistant',
      keywords: 'report file case crime theft robbery robbed stolen assault attacked incident accident complaint new',
      run: function () { svcRequireAuth('reportCase'); } },
    { label: 'Track My Case', hint: 'Check the status of a case you filed',
      keywords: 'track status case id follow up progress update',
      run: function () { requireAuth('trackCase'); } },
    { label: 'My Cases', hint: 'See every case you have filed',
      keywords: 'my cases history list filed', run: function () {
        
        document.querySelectorAll('.cm-nav').forEach(function (n) { n.classList.remove('active'); });
        var navBtn = document.getElementById('cmNavCases');
        if (navBtn) navBtn.classList.add('active');
        if (window.innerWidth <= 767 && typeof mobileCitizenCases === 'function') {
            mobileCitizenCases();
        } else if (typeof openMobileSection === 'function') {
            openMobileSection('citizen', 'My Cases', function () { requireAuth('myCases'); });
        } else {
            requireAuth('myCases');
        }
      } },
    { label: 'Find a Lawyer', hint: 'Search lawyers by specialization',
      keywords: 'lawyer advocate attorney legal representation counsel',
      run: function () { if (typeof openSection === 'function') openSection('lawyer'); } },
    { label: 'Legal Aid', hint: 'Free/subsidized legal assistance near you',
      keywords: 'legal aid free lawyer ngo assistance organization organisation',
      run: function () { if (typeof openLegalAidHub === 'function') openLegalAidHub(); else if (typeof openSection === 'function') openSection('legalAid'); } },
    { label: 'Find Nearby Police / LC Office', hint: 'Police stations & LC offices near you',
      keywords: 'police station lc office nearby near me help emergency location map',
      run: function () { if (typeof openFindHelpHub === 'function') openFindHelpHub(); } },
    { label: 'Emergency', hint: 'Fire, medical & urgent situations',
      keywords: 'emergency fire ambulance medical urgent accident danger breakdown garage mechanic tow towing car repair',
      run: function () { if (typeof openSection === 'function') openSection('emergency'); } },
    { label: 'Know Your Rights', hint: 'Your rights under Ugandan law',
      keywords: 'rights constitution fair hearing arrest detention',
      run: function () { if (typeof openSection === 'function') openSection('rights'); } },
    { label: 'Common Legal Questions', hint: 'Frequently asked legal questions',
      keywords: 'faq questions common legal help guide',
      run: function () { if (typeof openSection === 'function') openSection('questions'); } },
    { label: 'Land Dispute', hint: 'Boundary & land ownership disputes',
      keywords: 'land boundary property dispute ownership title',
      run: function () { svcRequireAuth('disputeLand'); } },
    { label: 'Family Dispute', hint: 'Marriage, custody & domestic matters',
      keywords: 'family marriage divorce custody domestic violence dispute',
      run: function () { svcRequireAuth('disputeFamily'); } },
    { label: 'Employment Issue', hint: 'Wages, wrongful termination & workplace disputes',
      keywords: 'employment job work wages salary termination fired workplace',
      run: function () { svcRequireAuth('disputeOthers'); } },
    { label: 'Community Dispute', hint: 'Neighbor & local community disputes',
      keywords: 'community neighbor neighbour local council dispute',
      run: function () { svcRequireAuth('disputeCommunity'); } },
    { label: 'Debt Recovery', hint: 'Recovering money owed to you',
      keywords: 'debt money owed recovery loan repayment',
      run: function () { svcRequireAuth('disputeDebt'); } },
    { label: 'Inheritance Dispute', hint: 'Estate & inheritance matters',
      keywords: 'inheritance estate will succession property',
      run: function () { svcRequireAuth('disputeInheritance'); } },
    { label: 'My Documents', hint: 'View & upload your case documents',
      keywords: 'documents files upload evidence attachment',
      run: function () { requireAuth('documents'); } },
    { label: 'My Profile', hint: 'View & edit your account details',
      keywords: 'profile account my info settings',
      run: function () { requireAuth('myProfile'); } },
    { label: 'Notifications', hint: 'Alerts and updates on your cases',
      keywords: 'notifications alerts messages updates inbox',
      run: function () { if (typeof toggleNotifications === 'function') toggleNotifications(); } },
    { label: 'Local Council Offices', hint: 'LC1/LC2/LC3 office information',
      keywords: 'local council lc1 lc2 lc3 village office',
      run: function () { if (typeof openSection === 'function') openSection('localCouncils'); } },
    { label: 'Contact Support', hint: 'Chat with JusticeLink support',
      keywords: 'support contact chat help assistance',
      run: function () { if (typeof openEmbeddedSupportChat === 'function') openEmbeddedSupportChat(); } }
];

function _cmSearchOnInput(rawValue) {
    var value = String(rawValue || '').trim().toLowerCase();
    var box = document.getElementById('cmSearchSuggest');
    var clearBtn = document.getElementById('cmSearchClear');
    if (clearBtn) clearBtn.style.display = value ? 'flex' : 'none';
    if (!box) return;

    if (!value) {
        
        
        _cmSearchRenderResults(_cmSearchIndex.slice(0, 6), box, false);
        return;
    }

    var terms = value.split(/\s+/).filter(Boolean);
    var matches = _cmSearchIndex.filter(function (item) {
        var haystack = (item.label + ' ' + item.keywords).toLowerCase();
        return terms.every(function (t) { return haystack.indexOf(t) !== -1; });
    });
    _cmSearchRenderResults(matches, box, true);
}

function _cmSearchRenderResults(matches, box, isQuery) {
    if (!matches.length) {
        var q = (document.getElementById('cmSearchInput') || {}).value || '';
        var qEsc = String(q.trim()).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        box.innerHTML = '<div class="cm-search-suggest-empty">No matching feature found.</div>'
            + (isQuery && q.trim()
                ? '<div class="cm-search-suggest-item" onmousedown="event.preventDefault();_cmSearchAskAi(' + JSON.stringify(q) + ')">'
                    + '<div class="cm-search-suggest-label"> Ask the Assistant</div>'
                    + '<div class="cm-search-suggest-hint">Search the Legal Knowledge library for &ldquo;' + qEsc + '&rdquo;</div></div>'
                : '');
        box.style.display = 'block';
        return;
    }
    var html = '';
    matches.slice(0, 8).forEach(function (item, i) {
        html += '<div class="cm-search-suggest-item" onmousedown="event.preventDefault();_cmSearchSelect(' + i + ')" data-cm-idx="' + i + '">'
            + '<div class="cm-search-suggest-label">' + item.label + '</div>'
            + '<div class="cm-search-suggest-hint">' + item.hint + '</div>'
            + '</div>';
    });
    box.innerHTML = html;
    box.style.display = 'block';
    box._cmMatches = matches; 
}

function _cmSearchSelect(i) {
    var box = document.getElementById('cmSearchSuggest');
    var matches = box && box._cmMatches;
    if (!matches || !matches[i]) return;
    _cmSearchClear();
    try { matches[i].run(); } catch (e) {  }
}

function _cmSearchClear() {
    var input = document.getElementById('cmSearchInput');
    var box = document.getElementById('cmSearchSuggest');
    var clearBtn = document.getElementById('cmSearchClear');
    if (input) { input.value = ''; input.blur(); }
    if (box) { box.style.display = 'none'; box.innerHTML = ''; }
    if (clearBtn) clearBtn.style.display = 'none';
}

function _cmSearchAskAi(rawQuery) {
    var query = String(rawQuery || '').trim();
    var box = document.getElementById('cmSearchSuggest');
    if (!query || !box) return;

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    box.style.display = 'block';
    box.innerHTML = '<div class="cm-search-suggest-empty">Searching…</div>';

    var payload = {
        message: query,
        context: 'You are JusticeLink\'s search assistant, answering a query a citizen typed into the search bar. '
            + 'If it is a legal question, answer it using the verified Legal Knowledge library and cite it. If it '
            + 'is about using JusticeLink itself (finding a case, nearby police/LC offices, legal aid, etc.), give '
            + 'a short, direct answer pointing them to the right part of the app. Keep the answer brief.',
        category: 'Citizen Search',
        sessionId: sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || 'guest'
    };

    fetch(API_BASE_URL + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
          if (!data || data.fallback || !data.reply) {
              box.innerHTML = '<div class="cm-search-suggest-empty">No results right now, please try again in a moment.</div>';
              return;
          }
          var sourcesHtml = '';
          if (Array.isArray(data.sources) && data.sources.length) {
              sourcesHtml = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eef1f8;font-size:11px;color:#777;">'
                  + '<strong>From the Legal Knowledge library:</strong><ul style="margin:4px 0 0;padding-left:16px;">'
                  + data.sources.map(function (s) {
                      var lbl = [s.documentTitle, s.legalSection].filter(Boolean).join(' \u2014 ');
                      return '<li>' + esc(lbl || 'Legal Knowledge library') + '</li>';
                  }).join('') + '</ul></div>';
          }
          box.innerHTML = '<div style="padding:14px 16px;font-size:13px;line-height:1.55;white-space:pre-wrap;color:#2a2d3a;">'
              + esc(data.reply) + '</div>' + sourcesHtml;
      })
      .catch(function () {
          box.innerHTML = '<div class="cm-search-suggest-empty">No results right now, please try again in a moment.</div>';
      });
}

document.addEventListener('click', function (e) {
    var wrap = document.getElementById('cmSearchWrap');
    var box = document.getElementById('cmSearchSuggest');
    if (!wrap || !box || box.style.display === 'none') return;
    if (!wrap.contains(e.target) && !box.contains(e.target)) box.style.display = 'none';
});


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
        showToast(' Location saved successfully!');
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
        <div><p>My active case</p><strong>${ref}</strong></div>
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
                    const escapedRef = ref ? String(ref).replace(/'/g, "\\'") : '';
                    const activityAttrs = ref
                        ? `style="cursor:pointer;" onclick="viewCitizenCase('${escapedRef}')" `
                        : 'style="cursor:default;"';
                    return `<div class="cm-activity-row" ${activityAttrs}>
                      <div><strong>${cas.case_type || 'Case'}, ${cas.status || 'Pending'}</strong>
                      <p>${ref || 'N/A'} &bull; ${cas.village || cas.parish || ''}</p></div>
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
    'police stations':       { color: 'var(--danger)',     icon: 'shield'},
    'police officers':       { color: 'var(--danger)',     icon: 'user'  },
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










var _lcdjpChatHiddenForOverlay = false;
var _lcdjpChatPrevDisplay = null;

function _lcdjpHideFloatingChatForOverlay() {
    if (_lcdjpChatHiddenForOverlay) return;
    var chat = document.getElementById('chatContainer');
    if (!chat) return;
    _lcdjpChatPrevDisplay = chat.style.display;
    chat.style.display = 'none';
    _lcdjpChatHiddenForOverlay = true;
}

function _lcdjpRestoreFloatingChatForOverlay() {
    if (!_lcdjpChatHiddenForOverlay) return;
    var chat = document.getElementById('chatContainer');
    if (chat) chat.style.display = _lcdjpChatPrevDisplay || '';
    _lcdjpChatHiddenForOverlay = false;
    _lcdjpChatPrevDisplay = null;
}
window._lcdjpHideFloatingChatForOverlay = _lcdjpHideFloatingChatForOverlay;
window._lcdjpRestoreFloatingChatForOverlay = _lcdjpRestoreFloatingChatForOverlay;














(function () {
    function _lcdjpSyncContactSupportVisibility() {
        var chat = document.getElementById('chatContainer');
        if (!chat) return;
        
        
        
        
        if (_lcdjpChatHiddenForOverlay) return;

        var role = sessionStorage.getItem('lcdjp_userlevel') || '';
        var isAdminRole = (typeof isAdmin === 'function') && isAdmin(role);
        
        
        
        
        var isLawyerRole = role === 'Lawyer';

        var homePage = document.getElementById('homePage');
        var onHomePage = !!homePage && homePage.style.display === 'block';

        
        
        
        
        
        
        
        var caseModal = document.getElementById('caseDetailsModal');
        var caseModalOpen = !!caseModal && caseModal.style.display === 'block';

        
        
        
        
        
        
        
        
        
        var chatWindow = document.getElementById('chatWindow');
        var chatWindowOpen = !!chatWindow && chatWindow.style.display === 'flex';

        chat.style.display = ((!isAdminRole && !isLawyerRole && onHomePage && !caseModalOpen) || chatWindowOpen) ? 'block' : 'none';
    }

    var _homePageEl = document.getElementById('homePage');
    if (_homePageEl && window.MutationObserver) {
        new MutationObserver(_lcdjpSyncContactSupportVisibility)
            .observe(_homePageEl, { attributes: true, attributeFilter: ['style'] });
    }

    var _caseModalEl = document.getElementById('caseDetailsModal');
    if (_caseModalEl && window.MutationObserver) {
        new MutationObserver(_lcdjpSyncContactSupportVisibility)
            .observe(_caseModalEl, { attributes: true, attributeFilter: ['style'] });
    }

    
    
    setInterval(_lcdjpSyncContactSupportVisibility, 800);

    window._lcdjpSyncContactSupportVisibility = _lcdjpSyncContactSupportVisibility;
})();


(function () {
  var menuHomes = {};

  function restoreMobileMenu(role) {
    var saved = menuHomes[role];
    if (!saved || !saved.menu) return;
    if (saved.next && saved.next.parentNode === saved.parent) saved.parent.insertBefore(saved.menu, saved.next);
    else saved.parent.appendChild(saved.menu);
    saved.menu.style.display = saved.display;
    delete menuHomes[role];
  }

  window.mobileCloseMore = function (role) {
    var panel = document.getElementById('mobileRolePanel');
    if (panel) {
      var p = panel.parentNode;
      panel.remove();
      if (p) p.style.position = '';
    } else if (typeof window._lcdjpCloseMobileFullPage === 'function') {
      window._lcdjpCloseMobileFullPage();
    }
    restoreMobileMenu(role);
    _lcdjpRestoreFloatingChatForOverlay();
    
    var dashBtn = document.getElementById(role === 'citizen' ? 'cmNavHome' : 'lmNavDash');
    if (dashBtn) { dashBtn.closest('nav').querySelectorAll('[class*="-nav"]').forEach(function(n){n.classList.remove('active');}); dashBtn.classList.add('active'); }
  };

  
  function _mobileFullPage(role, title, buildFn) {
    var wrapper = role === 'citizen'
      ? document.getElementById('citizenMobileView')
      : document.querySelector('#lawyerDashboard .lm-wrap');
    if (!wrapper) { if (typeof buildFn === 'function') buildFn(null); return; }

    
    var old = document.getElementById('mobileFullPage');
    if (old) {
      old.remove();
      wrapper.style.position = '';
      document.body.style.overflow = old._fpPrevBodyOverflow || '';
      document.documentElement.style.overflow = old._fpPrevHtmlOverflow || '';
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    ['mobileLawyerNotificationsPanel', 'mobileAdminNotificationsPanel'].forEach(function (id) {
      var panel = document.getElementById(id);
      if (!panel) return;
      var closeBtn = panel.querySelector('.mobile-role-panel-close');
      if (closeBtn) closeBtn.click();
      else panel.remove();
    });

    
    var hdr = wrapper.querySelector('.cm-header, .lm-header');
    var hdrVisible = !!hdr && window.getComputedStyle(hdr).display !== 'none' && hdr.offsetHeight > 0;
    var hdrH = hdrVisible ? hdr.offsetHeight : 0;
    
    
    var barTopPad = hdrVisible ? '13px' : 'calc(13px + env(safe-area-inset-top))';

    wrapper.style.position = 'relative';
    var fp = document.createElement('div');
    fp.id = 'mobileFullPage';

    
    
    
    
    
    
    
    
    
    fp.style.cssText = 'position:fixed;top:' + hdrH + 'px;left:0;right:0;bottom:0;height:calc(100vh - ' + hdrH + 'px);height:calc(100dvh - ' + hdrH + 'px);background:#f5f7fb;z-index:1200;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;';

    
    
    fp._fpPrevBodyOverflow = document.body.style.overflow;
    fp._fpPrevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    _lcdjpHideFloatingChatForOverlay();

    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:' + barTopPad + ' 16px 13px;background:#202a85;color:#fff;flex-shrink:0;position:sticky;top:0;z-index:2;';
    bar.innerHTML = '<span style="font-size:16px;font-weight:700;">' + title + '</span>';
    var xBtn = document.createElement('button');
    xBtn.setAttribute('aria-label','Close');
    xBtn.style.cssText = 'background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    xBtn.innerHTML = '&times;';
    xBtn.onclick = function() {
      restoreMobileMenu(role);
      fp.remove();
      wrapper.style.position = '';
      document.body.style.overflow = fp._fpPrevBodyOverflow || '';
      document.documentElement.style.overflow = fp._fpPrevHtmlOverflow || '';
      _lcdjpRestoreFloatingChatForOverlay();
      
      if (typeof closeAIAssistant === 'function') closeAIAssistant();
      var homeNav = document.getElementById('cmNavHome');
      if (homeNav && window.innerWidth <= 767) {
        document.querySelectorAll('.cm-nav').forEach(function(n){n.classList.remove('active');});
        homeNav.classList.add('active');
        var bd = wrapper.querySelector('.cm-body');
        if (bd) bd.scrollTop = 0;
      }
    };
    bar.appendChild(xBtn);
    fp.appendChild(bar);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;padding:14px 14px 40px;';
    fp.appendChild(body);
    wrapper.appendChild(fp);

    if (typeof buildFn === 'function') buildFn(body);
  }

  window.openMobileSection = function(role, title, fn) {
    if (window.innerWidth > 767) { if (typeof fn === 'function') fn(); return; }
    _mobileFullPage(role, title, function(body) {
      if (!body || typeof fn !== 'function') return;
      
      fn(body);
      if (role === 'lawyer') return; 
      setTimeout(function() {
        var ca = document.getElementById('contentArea');
        if (!ca) return;
        ca.querySelectorAll('.dashboard-view').forEach(function(v) {
          if (v.style.display === 'block' && v.id !== 'lawyerDashboard' && v.id !== 'homePage') {
            body.appendChild(v);
          }
        });
      }, 250);
    });
  };

  window.mobileShowMore = function (role) {
    if (window.innerWidth > 767) return;
    var menuId = { citizen: 'citizenSidebarMenu', lawyer: 'lawyerSidebarMenu' }[role];
    var menu = document.getElementById(menuId);
    if (!menu) return;
    Object.keys(menuHomes).forEach(restoreMobileMenu);
    menuHomes[role] = { menu: menu, parent: menu.parentNode, next: menu.nextSibling, display: menu.style.display };
    _mobileFullPage(role, 'More services', function(body) {
      menu.style.display = 'block';
      body.appendChild(menu);
    });
  };

  
  
  
  
  
  
  
  window._LAWYER_RESOURCE_CATEGORIES = {
    
    
    
    
    
    
    
    lawLibrary: { title: 'Uganda Law Library' },
    courtForms: { title: 'Court Forms', fn: 'showCourtForm', items: [
      ['caseIntake', 'Case Intake Form'], ['clientInfo', 'Client Information Form'],
      ['witnessStatement', 'Witness Statement Form'], ['affidavit', 'Affidavit Template'],
      ['landComplaint', 'Land Dispute Complaint Form'], ['familyComplaint', 'Family Dispute Complaint Form'],
      ['debtRecovery', 'Debt Recovery Claim Form'], ['mediationRequest', 'Community Mediation Request Form'],
      ['noticeOfHearing', 'Notice of Hearing Form'], ['settlementAgreement', 'Settlement Agreement Form'],
      ['consentAgreement', 'Consent Agreement Form'], ['appealRequest', 'Appeal Request Form']
    ]},
    caseDrafts: { title: 'Case Drafts', fn: 'showCaseDraft', items: [
      ['demandLetter', 'Demand Letter'], ['noticeToVacate', 'Notice To Vacate Property'],
      ['landComplaintDraft', 'Land Ownership Complaint'], ['debtRecoveryDraft', 'Debt Recovery Demand'],
      ['breachAgreement', 'Breach Of Agreement Letter'], ['childCustody', 'Child Custody Application'],
      ['maintenanceRequest', 'Maintenance & Support Request'], ['inheritanceDispute', 'Inheritance Dispute Draft'],
      ['boundaryDispute', 'Boundary Dispute Draft'], ['employmentComplaint', 'Employment Complaint Draft'],
      ['mediationAgreement', 'Mediation Agreement Draft'], ['finalSettlement', 'Final Settlement Draft']
    ]},
    legalResearch: { title: 'Legal Research', fn: 'showLegalResearch', items: [
      ['constitution', 'Constitution of Uganda'], ['landAct', 'Land Act'], ['successionAct', 'Succession Act'],
      ['marriageAct', 'Marriage Act'], ['childrenAct', 'Children Act']
    ]},
    mediationGuidelines: { title: 'Mediation Guidelines', fn: 'showMediationGuideline', items: [
      ['principles', 'Principles of Mediation'], ['roleOfMediator', 'Role of the Mediator'],
      ['preparing', 'Preparing for Mediation'], ['conducting', 'Conducting a Mediation Session'],
      ['familyDisputes', 'Managing Family Disputes'], ['landDisputes', 'Managing Land Disputes'],
      ['communityConflicts', 'Managing Community Conflicts'], ['debtDisputes', 'Managing Debt Disputes'],
      ['sensitiveCases', 'Handling Sensitive Cases'], ['recordingOutcomes', 'Recording Mediation Outcomes'],
      ['settlementAgreements', 'Writing Settlement Agreements'], ['referToCourt', 'When to Refer Cases to Court'],
      ['referToPolice', 'When to Refer Cases to Police']
    ]},
    lawyerToolkit: { title: 'Lawyer Toolkit', fn: 'showToolkit', items: [
      ['caseCalculator', 'Case Calculator'], ['legalFeesGuide', 'Legal Fees Guide'],
      ['courtFeeGuide', 'Court Fee Guide'], ['timelineTracker', 'Case Timeline Tracker'],
      ['evidenceChecklist', 'Evidence Checklist'], ['clientMeetingNotes', 'Client Meeting Notes'],
      ['appointmentScheduler', 'Appointment Scheduler'], ['documentVault', 'Document Vault']
    ]}
  };

  window.lawyerOpenResourceCategory = function (key) {
    
    
    
    if (key === 'lawLibrary') {
      if (typeof window.showLawLibrarySearch === 'function') window.showLawLibrarySearch();
      return;
    }
    var cat = window._LAWYER_RESOURCE_CATEGORIES[key];
    if (!cat || typeof openDynamicView !== 'function') return;
    var rows = cat.items.map(function (it) {
      return '<li class="lr-item" onclick="' + cat.fn + '(\'' + it[0] + '\')">'
        + it[1].replace(/</g, '&lt;') + '</li>';
    }).join('');
    openDynamicView('<div class="form-card"><h2>' + cat.title + '</h2><ul>' + rows + '</ul></div>');
  };

  
  
  
  window._LC_RESOURCE_CATEGORIES = {
    lawLibrary: { title: 'Uganda Law Library' },
    lcForms: { title: 'LC Forms', fn: 'showLCForm', items: [
      ['complaintRegistration', 'Complaint Registration Form'], ['lcSummons', 'LC Court Summons Form'],
      ['mediationSessionRecord', 'Mediation Session Record Form'], ['minuteBookEntry', 'LC Minute Book Entry Form'],
      ['witnessStatementLc', 'Witness Statement Form'], ['referralToPolice', 'Referral to Police Form'],
      ['referralToCourt', "Referral to Magistrate's Court Form"], ['lcJudgmentOrder', 'LC Court Judgment / Order Form'],
      ['communityServiceOrder', 'Community Service Order Form'], ['settlementAgreementLc', 'Settlement Agreement Form'],
      ['noticeOfHearingLc', 'Notice of Hearing Form']
    ]},
    lcCaseDrafts: { title: 'LC Case Drafts', fn: 'showLCCaseDraft', items: [
      ['complaintDraft', 'Complaint Draft'], ['noticeOfHearingDraft', 'Notice of Hearing Draft'],
      ['mediationOutcomeDraft', 'Mediation Outcome Record Draft'], ['referralToPoliceDraft', 'Referral Letter to Police'],
      ['referralToCourtDraft', "Referral Letter to Magistrate's Court"], ['lcJudgmentDraft', 'LC Court Judgment Draft'],
      ['warningLetterDraft', 'Warning / Caution Letter Draft'], ['boundaryDisputeDraftLc', 'Village Land Boundary Dispute Draft'],
      ['familyDisputeMediationDraft', 'Domestic / Family Dispute Mediation Draft'],
      ['debtDisputeSettlementDraftLc', 'Debt Dispute Settlement Draft'], ['finalSettlementDraftLc', 'Final Settlement Draft']
    ]},
    mediationGuidelines: { title: 'Mediation Guidelines (LC Level)', fn: 'showLCMediationGuideline', items: [
      ['jurisdiction', 'Jurisdiction of LC Courts'], ['principles', 'Principles of Mediation at LC Level'],
      ['roleOfMediator', 'Role of the LC Chairperson as Mediator'], ['preparing', 'Preparing for a Mediation Session'],
      ['conducting', 'Conducting a Mediation Session'], ['familyDisputes', 'Managing Family & Domestic Disputes'],
      ['landDisputes', 'Managing Land & Boundary Disputes'], ['debtDisputes', 'Managing Debt & Property Disputes'],
      ['communityConflicts', 'Managing Community & Neighbour Conflicts'], ['sensitiveCases', 'Handling Sensitive Cases (GBV & Minors)'],
      ['recordingOutcomes', 'Recording Mediation Outcomes & LC Minutes'], ['settlementAgreements', 'Writing Settlement Agreements'],
      ['referToCourt', "When to Refer Cases to the Magistrate's Court"], ['referToPolice', 'When to Refer Cases to Police']
    ]}
  };

  window.lcOpenResourceCategory = function (key) {
    if (key === 'lawLibrary') {
      if (typeof window.showLawLibrarySearch === 'function') window.showLawLibrarySearch();
      return;
    }
    var cat = window._LC_RESOURCE_CATEGORIES[key];
    if (!cat || typeof openDynamicView !== 'function') return;
    var rows = cat.items.map(function (it) {
      return '<li class="lr-item" onclick="' + cat.fn + '(\'' + it[0] + '\')">'
        + it[1].replace(/</g, '&lt;') + '</li>';
    }).join('');
    openDynamicView('<div class="form-card"><h2>' + cat.title + '</h2><ul>' + rows + '</ul></div>');
  };

  
  
  
  
  window.mobileShowLawyerCases = function (body) {
    
    
    
    
    var lawyerDashEl = document.getElementById('lawyerDashboard');
    if (lawyerDashEl && typeof showLawyerDashboard === 'function') {
        showLawyerDashboard();
    }

    var cardsHost = document.getElementById('lawyerMobileCards');
    var searchLabel = document.querySelector('#lawyerDashboard .lm-search');
    var moreLink = document.getElementById('lawyerMobileCardsMore');

    
    
    
    if (body && cardsHost) {
        if (moreLink) moreLink.style.display = 'none';

        var cardsHomeParent = cardsHost.parentNode;
        var cardsHomeNext = cardsHost.nextSibling;
        var searchHomeParent = searchLabel ? searchLabel.parentNode : null;
        var searchHomeNext = searchLabel ? searchLabel.nextSibling : null;

        
        
        var wasCollapsed = cardsHost.classList.contains('lmc-collapsed');
        cardsHost.classList.remove('lmc-collapsed');

        if (searchLabel) body.appendChild(searchLabel);
        body.appendChild(cardsHost);

        var overlay = document.getElementById('mobileFullPage');
        var closeBtn = overlay ? overlay.querySelector('button[aria-label="Close"]') : null;
        if (closeBtn) {
            closeBtn.addEventListener('click', function restoreCases() {
                if (searchLabel && searchHomeParent) searchHomeParent.insertBefore(searchLabel, searchHomeNext);
                if (cardsHomeParent) cardsHomeParent.insertBefore(cardsHost, cardsHomeNext);
                if (wasCollapsed) cardsHost.classList.add('lmc-collapsed');
                
                
                if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases();
                closeBtn.removeEventListener('click', restoreCases);
            });
        }
    }

    
    
    
    if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases();

    if (!body) {
        setTimeout(function () {
          document.getElementById('lawyerMobileCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
    }
  };

  
  
  window.lawyerOpenCasesOverlay = function () {
    document.querySelectorAll('.lm-nav-item').forEach(function (n) { n.classList.remove('active'); });
    var navCases = document.getElementById('lmNavCases');
    if (navCases) navCases.classList.add('active');
    if (typeof openMobileSection === 'function') {
        openMobileSection('lawyer', 'My Cases', mobileShowLawyerCases);
    }
  };

  window.mobileCitizenMessages = function () {
    if (window.innerWidth > 767) return;
    var content = document.getElementById('contentArea');
    if (!content) return;
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    var panel = document.createElement('section');
    panel.id = 'mobileCitizenMessagesPanel';
    panel.className = 'mobile-messages-panel';
    panel.innerHTML = '<div class="mobile-role-panel-head"><h2>Messages</h2><button class="mobile-role-panel-close" aria-label="Back">&times;</button></div><p style="margin:0;color:#667085;font-size:12px;">Open a case conversation to read and send messages.</p><div id="mobileCitizenMessageList" style="margin-top:14px;">Loading conversations...</div>';
    panel.querySelector('button').onclick = function () { panel.remove(); if (typeof showHome === 'function') showHome(); };
    content.appendChild(panel);

    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    var _apiOk = (typeof API_ENDPOINTS !== 'undefined') && (typeof API_ENDPOINTS.citizenCases === 'function');
    var verificationStatus = String(
      sessionStorage.getItem('lcdjp_verif_status') ||
      localStorage.getItem('verificationStatus') || ''
    ).trim().toUpperCase();
    var normalizedRole = String(
      sessionStorage.getItem('lcdjp_userlevel') ||
      localStorage.getItem('userRole') || ''
    ).trim().toUpperCase();
    var canViewCases = normalizedRole === 'ADMIN' ||
      normalizedRole === 'SYSTEM_ADMIN' ||
      normalizedRole === 'SYSTEM_ADMINISTRATOR' ||
      normalizedRole === 'DISTRICT_ADMIN' ||
      verificationStatus === 'APPROVED' ||
      verificationStatus === 'VERIFIED';
    if (!username || !_apiOk || !canViewCases) {
      document.getElementById('mobileCitizenMessageList').textContent =
        !username ? 'Please sign in to view messages.'
          : !canViewCases ? 'Identity verification is required to view case conversations.'
          : 'Service unavailable, please refresh the page.';
      return;
    }
      fetch(API_ENDPOINTS.citizenCases(username), {
        suppressAuthRedirect: true,
        headers: getAuthHeaders()
      })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        var cases = data && data.success && Array.isArray(data.cases) ? data.cases : (Array.isArray(data) ? data : []);
        var list = document.getElementById('mobileCitizenMessageList');
        if (!list) return;
        if (!cases.length) { list.textContent = 'No case conversations yet.'; return; }
        list.innerHTML = cases.map(function (item) {
          
          
          
          
          
          
          
          
          var ref = item.case_reference || item.caseReference || item.case_number || item.caseNumber || (item.id ? String(item.id) : '') || '';
          var title = item.case_type || item.caseType || 'Case conversation';
          return '<article class="mobile-message-card"><strong>' + title + '</strong><p>' + ref + '</p><button type="button" data-case-id="' + String(ref).replace(/"/g, '&quot;') + '">Open conversation</button></article>';
        }).join('');
        list.querySelectorAll('button[data-case-id]').forEach(function (button) {
          button.onclick = function () { if (typeof openCitizenMessaging === 'function') openCitizenMessaging(button.dataset.caseId); };
        });
      })
      .catch(function () {
        var list = document.getElementById('mobileCitizenMessageList');
        if (list) list.textContent = 'Messages could not be loaded. Please try again.';
      });
  };

  window.mobileLawyerMessages = function () {
    if (window.innerWidth > 767) return;
    var content = document.getElementById('contentArea');
    if (!content) return;
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    var panel = document.createElement('section');
    panel.id = 'mobileLawyerMessagesPanel';
    panel.className = 'mobile-messages-panel';
    panel.innerHTML = '<div class="mobile-role-panel-head"><h2>Messages</h2><button class="mobile-role-panel-close" aria-label="Back">&times;</button></div><p style="margin:0;color:#667085;font-size:12px;">Open a case conversation to read and send messages.</p><div id="mobileLawyerMessageList" style="margin-top:14px;">Loading conversations...</div>';
    panel.querySelector('button').onclick = function () { panel.remove(); if (typeof showLawyerDashboard === 'function') showLawyerDashboard(); };
    content.appendChild(panel);

    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    var _apiOk = (typeof API_ENDPOINTS !== 'undefined') && (typeof API_ENDPOINTS.lawyerCases === 'function');
    if (!username || !_apiOk) {
      document.getElementById('mobileLawyerMessageList').textContent =
        !username ? 'Please sign in to view messages.' : 'Service unavailable, please refresh the page.';
      return;
    }
      fetch(API_ENDPOINTS.lawyerCases(username), {
        suppressAuthRedirect: true,
        headers: getAuthHeaders()
      })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        var cases = data && data.success && Array.isArray(data.cases) ? data.cases : (Array.isArray(data) ? data : []);
        var list = document.getElementById('mobileLawyerMessageList');
        if (!list) return;
        if (!cases.length) { list.textContent = 'No case conversations yet.'; return; }
        list.innerHTML = cases.map(function (item) {
          var ref = item.case_reference || item.caseReference || item.case_number || item.caseNumber || (item.id ? String(item.id) : '') || '';
          var title = item.case_type || item.caseType || 'Case conversation';
          var citizen = item.citizenName || item.citizen_name || '';
          return '<article class="mobile-message-card"><strong>' + title + '</strong><p>' + (citizen ? citizen + ' &middot; ' : '') + ref + '</p><button type="button" data-case-id="' + String(ref).replace(/"/g, '&quot;') + '">Open conversation</button></article>';
        }).join('');
        list.querySelectorAll('button[data-case-id]').forEach(function (button) {
          button.onclick = function () { if (typeof viewCase === 'function') viewCase(button.dataset.caseId); };
        });
      })
      .catch(function () {
        var list = document.getElementById('mobileLawyerMessageList');
        if (list) list.textContent = 'Messages could not be loaded. Please try again.';
      });
  };


  window.addEventListener('resize', function () {
    if (window.innerWidth > 767) Object.keys(menuHomes).forEach(restoreMobileMenu);
  });
}());











function _lcdjpIsCitizenRole() {
  var role = localStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('role') || '';
  return role === 'Citizen';
}
window._lcdjpIsCitizenRole = _lcdjpIsCitizenRole;

window.changeMobileLang = function (val) {
  if (!_lcdjpIsCitizenRole()) return;

  ['languageSelect','lcLanguageSelect','cmLanguageSelect','lmLanguageSelect','lcmLanguageSelect'].forEach(function (id) {
    var s = document.getElementById(id);
    if (s) s.value = val;
  });
  
  sessionStorage.setItem('lcdjp_language', val);
  if (typeof window.currentLang !== 'undefined') window.currentLang = val;
  
  if (typeof translatePage === 'function') {
    translatePage(val);
  }
  if (typeof showToast === 'function') showToast('Language changed to ' + val.toUpperCase());
};








window.changeLawyerLang = function (val) {
  sessionStorage.setItem('lcdjp_language', val);
  if (typeof window.currentLang !== 'undefined') window.currentLang = val;
  if (typeof translatePage === 'function') translatePage(val);
  if (typeof showToast === 'function') showToast('Language changed to ' + val.toUpperCase());
};


(function () {
  
  
  
  
  
  window.closeCaseDetails = function () {

    if (typeof currentAudio !== 'undefined' && currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.src = '';
        currentAudio.load();
      } catch (_e) {}
      currentAudio = null;
      if (typeof currentPlayBtn !== 'undefined') currentPlayBtn = null;
    }

    var modal = document.getElementById('caseDetailsModal');
    
    
    
    
    if (modal && modal.style.display === 'block' && typeof window.unlockScroll === 'function') window.unlockScroll();
    if (modal) modal.style.display = 'none';
    var content = document.getElementById('caseDetailsContent');
    if (content) content.innerHTML = '';

    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();

    var mp = document.getElementById('mobileCitizenMessagesPanel');
    if (mp) mp.remove();

    var cp = document.getElementById('mobileCitizenCasesPanel');
    if (cp) cp.remove();

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    ['mobileLawyerNotificationsPanel', 'mobileAdminNotificationsPanel'].forEach(function (id) {
      var panel = document.getElementById(id);
      if (!panel) return;
      var closeBtn = panel.querySelector('.mobile-role-panel-close');
      if (closeBtn) closeBtn.click();
      else panel.remove();
    });

    var userLevel = sessionStorage.getItem('lcdjp_userlevel');

    if (userLevel === 'LC' || userLevel === 'LC Official' || userLevel === 'LC1' || userLevel === 'LC2' || userLevel === 'LC3') {
      
      if (typeof showLcDashboard === 'function') {
        showLcDashboard();
      } else if (typeof showHome === 'function') showHome();
    } else if (userLevel === 'Citizen') {
      
      
      
      if (typeof showHome === 'function') showHome();
    } else if (userLevel === 'Lawyer') {
      if (typeof showLawyerDashboard === 'function') showLawyerDashboard();
      setTimeout(function () { if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases(); }, 300);
    } else if (isAdmin(userLevel)) {
      if (typeof showAdminApprovals === 'function') showAdminApprovals();
    } else {
      if (typeof showHome === 'function') showHome();
    }
  };
}());


(function () {
  
  if (typeof showHome === 'function') {
    var _origSH = showHome;
    window.showHome = function () {
      _origSH.apply(this, arguments);
      if (window.innerWidth <= 767 && sessionStorage.getItem('lcdjp_userlevel') === 'Citizen') {
        document.body.classList.add('mobile-home-active');
      } else {
        document.body.classList.remove('mobile-home-active');
      }
    };
  }
  
  var _origOpenMob = window.openMobileSection;
  window.openMobileSection = function (role, title, fn) {
    document.body.classList.remove('mobile-home-active');
    if (typeof _origOpenMob === 'function') _origOpenMob.call(this, role, title, fn);
    else if (typeof fn === 'function') fn();
  };
  var _origMobMsg = window.mobileCitizenMessages;
  window.mobileCitizenMessages = function () {
    document.body.classList.remove('mobile-home-active');
    if (typeof _origMobMsg === 'function') _origMobMsg.call(this);
  };
}());


window.mobileCitizenCases = function () {
  if (window.innerWidth > 767) {
    if (typeof showMyCases === 'function') showMyCases();
    return;
  }
  document.body.classList.remove('mobile-home-active');

  var content = document.getElementById('contentArea');
  if (!content) return;
  if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

  
  var old = document.getElementById('mobileCitizenCasesPanel');
  if (old) old.remove();

  var panel = document.createElement('section');
  panel.id = 'mobileCitizenCasesPanel';
  panel.className = 'mobile-messages-panel';
  panel.innerHTML =
    '<div class="mobile-role-panel-head">' +
      '<h2>My Cases</h2>' +
      '<button class="mobile-role-panel-close" aria-label="Back">&times;</button>' +
    '</div>' +
    '<div id="mobileCitizenCasesList" style="margin-top:14px;">Loading cases…</div>';

  panel.querySelector('button').onclick = function () {
    panel.remove();
    if (typeof showHome === 'function') showHome();
  };
  content.appendChild(panel);

  var username = typeof getLcdjpActiveUsername === 'function'
    ? getLcdjpActiveUsername()
    : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
  if (!username) {
    document.getElementById('mobileCitizenCasesList').textContent = 'Please sign in to view cases.';
    return;
  }

  var apiOk = (typeof API_ENDPOINTS !== 'undefined') && typeof API_ENDPOINTS.citizenCases === 'function';
  if (!apiOk) {
    document.getElementById('mobileCitizenCasesList').textContent = 'Service unavailable, please refresh.';
    return;
  }
    if (typeof window._lcdjpProtectedDataAccessAllowed === 'function' &&
        !window._lcdjpProtectedDataAccessAllowed()) {
        document.getElementById('mobileCitizenCasesList').innerHTML =
          '<div class="mobile-role-panel-empty">' +
            '<div class="mobile-role-panel-empty-icon">&#128274;</div>' +
            '<p>Identity verification is required to view your cases.</p>' +
            '<button type="button" onclick="typeof _lcdjpStartVerification===\'function\' ? _lcdjpStartVerification() : null">Verify Now</button>' +
          '</div>';
        return;
    }

  
  
  
  var token = typeof getLcdjpActiveToken === 'function'
    ? getLcdjpActiveToken()
    : (localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken'));
  
    fetch(API_ENDPOINTS.citizenCases(username), {
    suppressAuthRedirect: true,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      
      var cases = (data && data.success && Array.isArray(data.cases))
        ? data.cases
        : (Array.isArray(data) ? data : []);

      var list = document.getElementById('mobileCitizenCasesList');
      if (!list) return;

      if (!cases.length) {
        list.innerHTML =
          '<p style="text-align:center;color:#667085;padding:24px 0;">You haven\'t filed any cases yet.</p>';
        return;
      }

      list.innerHTML = cases.map(function (c) {
        var ref   = c.caseReference || c.caseNumber || (c.id ? String(c.id) : '') || '';
        var type  = c.case_type  || c.caseType  || 'Case';
        var status = c.status || 'Pending';
        var statusColor = status === 'Resolved' ? '#28a745'
                        : status.startsWith('Forwarded') ? '#ff9800'
                        : '#1a4080';
        var escapedRef = ref ? String(ref).replace(/'/g, '\\\'') : '';
        var actionMarkup = ref
          ? '<button type="button" ' +
              'onclick="viewCitizenCase(\'' + escapedRef + '\')" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#16305c;' +
                     'border:1px solid #16305c;border-radius:8px;cursor:pointer;">View</button>' +
            '<button type="button" ' +
              
              
              
              
              
              
              'onclick="openCitizenMessaging(\'' + escapedRef + '\')" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#1a4080;' +
                     'border:1px solid #1a4080;border-radius:8px;cursor:pointer;">Message</button>' +
            '<button type="button" ' +
              'onclick="typeof showDocumentManager===\'function\' ? showDocumentManager(\'' + escapedRef + '\') : null" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#23508f;' +
                     'border:1px solid #23508f;border-radius:8px;cursor:pointer;">Docs</button>' +
            '<button type="button" ' +
              'onclick="typeof showAppendDetailsForm===\'function\' ? showAppendDetailsForm(\'' + escapedRef + '\') : null" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#2c5fa3;' +
                     'border:1px solid #2c5fa3;border-radius:8px;cursor:pointer;">Add Info</button>' +
            '<button type="button" ' +
              'onclick="typeof printCaseDetails===\'function\' ? printCaseDetails(\'' + escapedRef + '\') : null" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#3a6bc7;' +
                     'border:1px solid #3a6bc7;border-radius:8px;cursor:pointer;">Print</button>'
          : '<span style="color:#888;font-size:12px;padding:7px 0;">N/A</span>';
        return (
          '<article style="background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.08);' +
                          'padding:14px 16px;margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
              '<div>' +
                '<strong style="font-size:14px;color:#1a237e;">' + (ref || 'N/A') + '</strong>' +
                '<div style="font-size:12px;color:#555;margin-top:2px;">' + type + '</div>' +
              '</div>' +
              '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:12px;' +
                           'background:' + statusColor + ';color:#fff;white-space:nowrap;">' + status + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">' +
              actionMarkup +
            '</div>' +
          '</article>'
        );
      }).join('');
    })
    .catch(function (error) {
      console.error('Error loading cases:', error);
      var list = document.getElementById('mobileCitizenCasesList');
      if (list) list.innerHTML =
        '<p style="color:#dc3545;text-align:center;">Could not load cases. <button onclick="mobileCitizenCases()" ' +
        'style="margin-top:8px;padding:6px 14px;background:#1a4080;color:#fff;border:none;border-radius:6px;cursor:pointer;">Retry</button></p>';
    });
};


document.addEventListener('click', function (e) {
  var nav = e.target.closest('.cm-nav');
  if (!nav) return;
  var span = nav.querySelector('span');
  if (!span) return;
  
  if (span.textContent.trim().toLowerCase() === 'my cases' && window.innerWidth <= 767) {
    e.stopImmediatePropagation();
    document.querySelectorAll('.cm-nav').forEach(function (n) { n.classList.remove('active'); });
    nav.classList.add('active');
    mobileCitizenCases();
  }
}, true);


(function () {
  if (typeof updateMyCases !== 'function') return;
  var _orig = updateMyCases;
  window.updateMyCases = function () {
    
    var _origFetch = window.fetch;
    window.fetch = function (url, opts) {
      return _origFetch.call(this, url, opts).then(function (resp) {
        if (typeof url === 'string' && url.indexOf('/api/cases/citizen/') !== -1) {
          
          var _origJson = resp.json.bind(resp);
          resp.json = function () {
            return _origJson().then(function (data) {
              if (Array.isArray(data)) {
                return { success: true, cases: data };
              }
              return data;
            });
          };
        }
        return resp;
      });
    };
    try { _orig.apply(this, arguments); } finally { window.fetch = _origFetch; }
  };
}());





document.addEventListener('click', function(e) {
  if (window.innerWidth > 767) return;
  var nav = e.target.closest('.cm-nav');
  if (!nav) return;
  var span = nav.querySelector('span');
  if (!span) return;
  var label = span.textContent.trim().toLowerCase();

  if (label === 'messages') {
    e.stopImmediatePropagation();
    
    document.querySelectorAll('.cm-nav').forEach(function(n) { n.classList.remove('active'); });
    nav.classList.add('active');
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();
    
    document.body.classList.remove('mobile-home-active');
    
    if (typeof mobileCitizenMessages === 'function') mobileCitizenMessages();
  }
}, true);


(function() {
  var _orig = window.mobileCitizenMessages;
  window.mobileCitizenMessages = function() {
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();
    
    var old = document.getElementById('mobileCitizenMessagesPanel');
    if (old) old.remove();
    document.body.classList.remove('mobile-home-active');
    if (typeof _orig === 'function') _orig.apply(this, arguments);
  };
}());







































document.addEventListener('click', function(e) {
  if (window.innerWidth > 767) return;
  var nav = e.target.closest('.lm-nav-item');
  if (!nav) return;
  var span = nav.querySelector('span');
  if (!span) return;
  var label = span.textContent.trim().toLowerCase();

  if (label === 'messages' || label === 'library') {
    e.stopImmediatePropagation();

    document.querySelectorAll('.lm-nav-item').forEach(function(n) { n.classList.remove('active'); });
    nav.classList.add('active');

    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();

    if (label === 'messages') {
      if (typeof mobileLawyerMessages === 'function') mobileLawyerMessages();
    } else {
      if (typeof lawyerOpenResourceCategory === 'function') lawyerOpenResourceCategory('lawLibrary');
    }
  }
}, true);


(function() {
  var _origLawyerMsg = window.mobileLawyerMessages;
  window.mobileLawyerMessages = function() {
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();
    
    var old = document.getElementById('mobileLawyerMessagesPanel');
    if (old) old.remove();
    if (typeof _origLawyerMsg === 'function') _origLawyerMsg.apply(this, arguments);
  };
}());


(function() {
  var mobileStrings = {
    en: {
      portal_citizen:    'CITIZEN PORTAL',
      portal_lc:         'LC OFFICIAL PORTAL',
      portal_lawyer:     'LAWYER PORTAL',
      nav_home:          'Home',
      nav_dashboard:     'Dashboard',
      nav_my_cases:      'My cases',
      nav_messages:      'Messages',
      nav_cases:         'Cases',
      nav_reports:       'Reports',
      nav_more:          'More',
      quick_services:    'Quick services',
      recent_activity:   'Recent activity',
      report_case_short: 'Report case',
      track_case_short:  'Track case',
      find_help_short:   'Find help',
      start_case_btn:    '+ Start a new case',
      no_active_cases:   'No active cases yet.',
      welcome_activity:  'Welcome to JusticeLink',
      use_services:      'Use the services above to report a case or find legal help.',
      messages_hint:     'Open a case conversation to read and send messages.',
      loading_cases:     'Loading cases\u2026',
      no_cases_yet:      "You haven't filed any cases yet.",
      my_cases_title:    'My Cases',
      messages_title:    'Messages',
    },
    lug: {
      portal_citizen:    'OLWEYO LW\'OMUBAKA',
      portal_lc:         'OLWEYO LW\'OMUKULU W\'ESSAZA',
      portal_lawyer:     'OLWEYO LW\'OMUVUUZI',
      nav_home:          'Amatuuze',
      nav_dashboard:     'Ssandaaki',
      nav_my_cases:      'Ebibuuzo byange',
      nav_messages:      'Obubaka',
      nav_cases:         'Ebibuuzo',
      nav_reports:       'Emirimu',
      nav_more:          'Ebirala',
      quick_services:    'Obuweereza obwangu',
      recent_activity:   'Ebikolebwa bino',
      report_case_short: 'Teekateeka omusango',
      track_case_short:  'Kulakulana n\'omusango',
      find_help_short:   'Nonya obuyambi',
      start_case_btn:    '+ Tandika omusango omupya',
      no_active_cases:   'Tewali misango erimu.',
      welcome_activity:  'Tukusanyukidde ku JusticeLink',
      use_services:      'Kozesa obuweereza okuteekateeka omusango oba kunonya obuyambi.',
      messages_hint:     'Ggula okuganana kw\'omusango okusoma n\'okutuma obubaka.',
      loading_cases:     'Ebibuuzo biri ku kulondebwa\u2026',
      no_cases_yet:      'Towandise musango naali.',
      my_cases_title:    'Ebibuuzo byange',
      messages_title:    'Obubaka',
    },
    ach: {
      portal_citizen:    'WANGOO ME JO',
      portal_lc:         'WANGOO ME JAMI ME LC',
      portal_lawyer:     'WANGOO ME LAWER',
      nav_home:          'Ot',
      nav_dashboard:     'Got',
      nav_my_cases:      'Lok an',
      nav_messages:      'Lok buca',
      nav_cases:         'Lok',
      nav_reports:       'Pingo',
      nav_more:          'Mukene',
      quick_services:    'Tic ma oyot',
      recent_activity:   'Gin ma timme nino ni',
      report_case_short: 'Nyer lok',
      track_case_short:  'Nyil lok',
      find_help_short:   'Yeny kony',
      start_case_btn:    '+ Cak lok manyen',
      no_active_cases:   'Lok mo peke.',
      welcome_activity:  'Bin JusticeLink',
      use_services:      'Tic kede tic mewa me nyer lok onyo yeny kony.',
      messages_hint:     'Yab lok me lok buca me willo ki tero lok.',
      loading_cases:     'Tye ka nongo lok\u2026',
      no_cases_yet:      'Pe iketo lok mo pud.',
      my_cases_title:    'Lok an',
      messages_title:    'Lok buca',
    },
    teo: {
      portal_citizen:    'PORTAL YA MUNTU',
      portal_lc:         'PORTAL YA AKITUR LC',
      portal_lawyer:     'PORTAL YA ERIAT',
      nav_home:          'Awi',
      nav_dashboard:     'Edebe',
      nav_my_cases:      'Ebia gwange',
      nav_messages:      'Emwang\'a',
      nav_cases:         'Ebia',
      nav_reports:       'Etamani',
      nav_more:          'Aike',
      quick_services:    'Eimoria kwoton',
      recent_activity:   'Eitim ejore',
      report_case_short: 'Loosa ebia',
      track_case_short:  'Kuata ebia',
      find_help_short:   'Naa aisak',
      start_case_btn:    '+ Dorop ebia emam',
      no_active_cases:   'Ebia peke.',
      welcome_activity:  'Atabo JusticeLink',
      use_services:      'Tur eimoria loosa ebia bo naa aisak.',
      messages_hint:     'Agwal emwanga ya ebia kadio nuk bo tos emwanga.',
      loading_cases:     'Tye ka nongo ebia\u2026',
      no_cases_yet:      'Iyat loosa ebia mo peke.',
      my_cases_title:    'Ebia gwange',
      messages_title:    'Emwang\'a',
    },
    lgg: {
      portal_citizen:    'PORTAL YA MZEE WA JAMII',
      portal_lc:         'PORTAL YA AFISA WA LC',
      portal_lawyer:     'PORTAL YA WAKILI',
      nav_home:          'Nyumba',
      nav_dashboard:     'Dashibodi',
      nav_my_cases:      'Kesi zangu',
      nav_messages:      'Ujumbe',
      nav_cases:         'Kesi',
      nav_reports:       'Ripoti',
      nav_more:          'Zaidi',
      quick_services:    'Huduma za haraka',
      recent_activity:   'Shughuli za hivi karibuni',
      report_case_short: 'Ripoti kesi',
      track_case_short:  'Fuatilia kesi',
      find_help_short:   'Tafuta msaada',
      start_case_btn:    '+ Anza kesi mpya',
      no_active_cases:   'Hakuna kesi zinazoendelea.',
      welcome_activity:  'Karibu JusticeLink',
      use_services:      'Tumia huduma hii kuripoti kesi au kutafuta msaada wa kisheria.',
      messages_hint:     'Fungua mazungumzo ya kesi kusoma na kutuma ujumbe.',
      loading_cases:     'Inasomea kesi\u2026',
      no_cases_yet:      'Bado haujafungua kesi yoyote.',
      my_cases_title:    'Kesi zangu',
      messages_title:    'Ujumbe',
    },
    nyn: {
      portal_citizen:    'PORTAL Y\'OMUNTU',
      portal_lc:         'PORTAL Y\'OMUKURU W\'ESSAZA',
      portal_lawyer:     'PORTAL Y\'OMUVUUZI',
      nav_home:          'Akaaro',
      nav_dashboard:     'Dashibodi',
      nav_my_cases:      'Amabuzo gangu',
      nav_messages:      'Ebirukwa',
      nav_cases:         'Amabuzo',
      nav_reports:       'Ripoti',
      nav_more:          'Ebirala',
      quick_services:    'Obushaho obuteebwa',
      recent_activity:   'Ibyakozwe buno',
      report_case_short: 'Bwira omubuzo',
      track_case_short:  'Kurikirana omubuzo',
      find_help_short:   'Ronda obuyambi',
      start_case_btn:    '+ Tandika omubuzo omushya',
      no_active_cases:   'Nta mubuzo uri gukorwa.',
      welcome_activity:  'Turakwakira kuri JusticeLink',
      use_services:      'Kozesa obushaho kubwira omubuzo oba kuronda obuyambi.',
      messages_hint:     'Gura okukweganaiza kw\'omubuzo okusoma no kutuma ebirukwa.',
      loading_cases:     'Amabuzo ari gushakishwa\u2026',
      no_cases_yet:      'Ntawe wabuza omubuzo nawe.',
      my_cases_title:    'Amabuzo gangu',
      messages_title:    'Ebirukwa',
    },
  };

  function translateEl(sel, key, t) {
    var els = document.querySelectorAll(sel);
    els.forEach(function(el) {
      if (t[key] !== undefined) el.textContent = t[key];
    });
  }
  

  window.translateMobileUI = function(lang) {
    var t = mobileStrings[lang] || mobileStrings.en;

    
    translateEl('.cm-greeting p',                               'portal_citizen',    t);
    translateEl('#cmGreeting',                                  'nav_home',          t);
    
    var cmNavs = document.querySelectorAll('.cm-bottom-nav .cm-nav span');
    var cmLabels = ['nav_home', 'nav_my_cases', 'nav_messages', 'nav_more'];
    cmNavs.forEach(function(span, i) { if (cmLabels[i] && t[cmLabels[i]]) span.textContent = t[cmLabels[i]]; });
    
    var cmHeads = document.querySelectorAll('.cm-section-head h2');
    if (cmHeads[0]) cmHeads[0].textContent = t.quick_services    || cmHeads[0].textContent;
    if (cmHeads[1]) cmHeads[1].textContent = t.recent_activity   || cmHeads[1].textContent;
    
    var cmShortcuts = document.querySelectorAll('.cm-shortcut span');
    var shortcutKeys = ['report_case_short','track_case_short','find_help_short'];
    cmShortcuts.forEach(function(span, i) { if (shortcutKeys[i] && t[shortcutKeys[i]]) span.textContent = t[shortcutKeys[i]]; });
    
    var cmNewBtn = document.querySelector('.cm-new-btn');
    if (cmNewBtn) cmNewBtn.textContent = t.start_case_btn || cmNewBtn.textContent;
    
    var cmNoCase = document.querySelector('.cm-no-case');
    if (cmNoCase) cmNoCase.textContent = t.no_active_cases || cmNoCase.textContent;
    var cmActivityStrong = document.querySelector('.cm-activity .cm-activity-row strong');
    if (cmActivityStrong) cmActivityStrong.textContent = t.welcome_activity || cmActivityStrong.textContent;
    var cmActivityP = document.querySelector('.cm-activity .cm-activity-row p');
    if (cmActivityP) cmActivityP.textContent = t.use_services || cmActivityP.textContent;

    
    

    var msgTitle = document.querySelector('#mobileCitizenMessagesPanel .mobile-role-panel-head h2');
    if (msgTitle) msgTitle.textContent = t.messages_title || msgTitle.textContent;
    var msgHint = document.querySelector('#mobileCitizenMessagesPanel > p');
    if (msgHint) msgHint.textContent = t.messages_hint || msgHint.textContent;
    var caseTitle = document.querySelector('#mobileCitizenCasesPanel .mobile-role-panel-head h2');
    if (caseTitle) caseTitle.textContent = t.my_cases_title || caseTitle.textContent;
  };

  
  if (typeof translatePage === 'function') {
    var _origTP = translatePage;
    window.translatePage = function(lang) {
      _origTP.call(this, lang);
      window.translateMobileUI(lang);
    };
  }

  
  var _prevMobileLang = window.changeMobileLang;
  window.changeMobileLang = function(val) {
    if (typeof _prevMobileLang === 'function') _prevMobileLang(val);
    window.translateMobileUI(val);
  };

  
  var _savedLang = sessionStorage.getItem('lcdjp_language');
  if (_savedLang && _savedLang !== 'en') {
    window.translateMobileUI(_savedLang);
  }
}());





(function () {
  var _origODV = typeof openDynamicView === 'function' ? openDynamicView : null;
  if (!_origODV) return;
  window.openDynamicView = function (htmlContent) {
    _origODV.call(this, htmlContent);
    if (window.innerWidth <= 767 && sessionStorage.getItem('lcdjp_userlevel') === 'Citizen') {
      document.body.classList.add('mobile-form-active');
      
      var cmBody = document.querySelector('.cm-body');
      if (cmBody) {
        var dynPage = document.getElementById('dynamicFormPage');
        if (dynPage) { cmBody.appendChild(dynPage); }
      }
    }
  };
  
  var _origCDV = typeof clearDynamicView === 'function' ? clearDynamicView : null;
  if (_origCDV) {
    window.clearDynamicView = function () {
      _origCDV.call(this);
      document.body.classList.remove('mobile-form-active');
    };
  }
  if (typeof showHome === 'function') {
    var _origSH2 = showHome;
    window.showHome = function () {
      document.body.classList.remove('mobile-form-active');
      _origSH2.apply(this, arguments);
    };
  }
}());


(function () {
  var _origPrint = typeof printCaseDetails === 'function' ? printCaseDetails : null;
  if (!_origPrint) return;
  window.printCaseDetails = async function (caseId) {
    
    if (window.innerWidth > 767) { return _origPrint.call(this, caseId); }
    
    await _origPrint.call(this, caseId);
    
  };

  
  var _origWindowOpen = window.open;
  window.open = function (url, target, features) {
    
    
    
    
    
    
    
    
    
    
    
    
    if (typeof features === 'string' && features.indexOf('width=900') !== -1 && window.innerWidth <= 767) {
      features = '';
    }
    return _origWindowOpen.call(this, url, target, features);
  };

  
  var _origWrite = null;
  var _origWindowOpen2 = window.open;
  window.open = function (url, target, features) {
    var win = _origWindowOpen2.call(this, url, target, features);
    if (win && !url && window.innerWidth <= 767) {
      
      var _origWinWrite = win.document.write.bind(win.document);
      win.document.write = function (html) {
        if (typeof html === 'string' && html.indexOf('<html>') !== -1) {
          html = html.replace('<html>', '<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head>');
          html = html.replace(/body\s*\{([^}]*)padding:\s*40px;([^}]*max-width:[^}]*)}/,
            'body {$1padding: 10px;$2}');
        }
        _origWinWrite(html);
      };
    }
    return win;
  };
}());


(function () {
  var _origMobileShowMore = typeof mobileShowMore === 'function' ? mobileShowMore : null;
  if (!_origMobileShowMore) return;
  window.mobileShowMore = function (role) {
    _origMobileShowMore.call(this, role);
    
    setTimeout(function () {
      var lang = sessionStorage.getItem('lcdjp_language') || 'en';
      if (lang !== 'en') {
        if (typeof translatePage  === 'function') translatePage(lang);
        if (typeof translateMobileUI === 'function') translateMobileUI(lang);
      }
    }, 80);
  };
}());





(function () {
  
  function hideFooter () { document.body.classList.remove('mobile-home-active'); }

  

  
  var _prevMore = window.mobileShowMore;
  window.mobileShowMore = function (role) {
    hideFooter();
    if (typeof _prevMore === 'function') _prevMore.call(this, role);

    
    setTimeout(function () {
      var lang = sessionStorage.getItem('lcdjp_language') || 'en';
      if (lang === 'en') return;

      
      var panel = document.getElementById('mobileFullPage');
      if (panel) {
        var tMap = (typeof translations !== 'undefined')
                   ? (translations[lang] || translations['en'])
                   : null;
        if (tMap) {
          panel.querySelectorAll('[data-translate]').forEach(function (el) {
            var key = el.getAttribute('data-translate');
            if (tMap[key] !== undefined) {
              
              if (!el.children.length || el.tagName === 'OPTION') {
                el.textContent = tMap[key];
              }
            }
          });
        }
      }

      
      if (typeof translatePage  === 'function') translatePage(lang);
      if (typeof translateMobileUI === 'function') translateMobileUI(lang);
    }, 300);
  };

  
  var _prevODV = window.openDynamicView;
  window.openDynamicView = function (html) {
    hideFooter();
    if (typeof _prevODV === 'function') _prevODV.call(this, html);
  };

  
  var _prevSMMP = window.showMobileMenuPanel;
  if (typeof _prevSMMP === 'function') {
    window.showMobileMenuPanel = function (menuId) {
      if (window.innerWidth <= 767) hideFooter();
      _prevSMMP.call(this, menuId);
    };
  }

  
  var _prevSvc = window.svcRequireAuth;
  if (typeof _prevSvc === 'function') {
    window.svcRequireAuth = function (action) {
      if (window.innerWidth <= 767) hideFooter();
      _prevSvc.call(this, action);
    };
  }

  
  var _prevVCC = window.viewCitizenCase;
  if (typeof _prevVCC === 'function') {
    window.viewCitizenCase = function (caseId) {
      if (window.innerWidth <= 767) hideFooter();
      return _prevVCC.apply(this, arguments);
    };
  }

  
  var _prevOS = window.openSection;
  if (typeof _prevOS === 'function') {
    window.openSection = function (section) {
      if (window.innerWidth <= 767) hideFooter();
      _prevOS.apply(this, arguments);
    };
  }

  

}());





(function () {

  
  

  function _buildStepper (progressPercentage, statusText) {
    
    var steps = [
      { label: 'Submitted',     threshold: 25  },
      { label: 'Under\nReview', threshold: 40  },
      { label: 'With\nLawyer',  threshold: 60  },
      { label: 'Resolved',      threshold: 100 },
    ];
    var totalSteps = steps.length - 1; 
    
    var activeIdx = 0;
    steps.forEach(function (s, i) { if (progressPercentage >= s.threshold) activeIdx = i; });
    var linePct = (activeIdx / totalSteps) * 100;

    var dots = steps.map(function (s, i) {
      var cls = 'mtp-step';
      if (progressPercentage > s.threshold) cls += ' done';
      else if (progressPercentage === s.threshold || i === activeIdx) cls += ' active';
      var icon = (progressPercentage >= s.threshold) ? '&#10003;' : (i + 1);
      var labelHtml = s.label.split('\n').join('<br>');
      return '<div class="' + cls + '"><div class="mtp-step-dot">' + icon + '</div><div class="mtp-step-label">' + labelHtml + '</div></div>';
    }).join('');

    return '<div class="mtp-stepper">' +
      '<div class="mtp-stepper-track">' +
        '<div class="mtp-stepper-line-fill" style="width:calc(' + linePct + '% - 28px + ' + (linePct > 0 ? '14' : '0') + 'px)"></div>' +
        dots +
      '</div>' +
      '<div class="mtp-status-label">&#9679;&nbsp;' + statusText + '</div>' +
    '</div>';
  }

  function _badgeHtml (status) {
    var cls = 'mtp-badge-pending';
    if (status === 'Resolved') cls = 'mtp-badge-resolved';
    else if (status === 'Accepted by Lawyer' || status === 'Forwarded to Lawyer') cls = 'mtp-badge-lawyer';
    else if (status === 'Forwarded to LC2' || status === 'Awaiting Lawyer Selection') cls = 'mtp-badge-review';
    return '<span class="mtp-rc-badge ' + cls + '">' + (status || 'Pending') + '</span>';
  }

  function _renderMobileResult (container, foundCase) {
    var prog = 25, statusText = 'Pending Review';
    if (foundCase.status === 'Forwarded to LC2' || foundCase.status === 'Awaiting Lawyer Selection') { prog = 40; statusText = 'Under Review'; }
    else if (foundCase.status === 'Accepted by Lawyer' || foundCase.status === 'Forwarded to Lawyer')  { prog = 60; statusText = 'With Lawyer'; }
    else if (foundCase.status === 'Resolved') { prog = 100; statusText = 'Resolved '; }

    var extraNotes = foundCase.extraNotes
      ? '<div class="mtp-info-section"><div class="mtp-section-title">Supplemental Notes</div><div class="mtp-statement">' + foundCase.extraNotes + '</div></div>'
      : '';

    var legalAdvice = foundCase.legalAdvice
      ? '<div class="mtp-feedback-row mtp-feedback-adv"><span class="mtp-feedback-label"> Legal Advice From Lawyer</span>' + foundCase.legalAdvice + '</div>'
      : '';

    var subDate = foundCase.submissionDate
      ? '<div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:6px;">Submitted: ' + new Date(foundCase.submissionDate).toLocaleDateString() + '</div>'
      : '';

    container.innerHTML =
      '<div class="mtp-result-card">' +
        
        '<div class="mtp-rc-head">' +
          '<div class="mtp-rc-lookup">File Lookup Successful</div>' +
          '<div class="mtp-rc-caseid"> ' + (foundCase.caseId || '') + '</div>' +
          _badgeHtml(foundCase.status) +
          subDate +
        '</div>' +
        
        _buildStepper(prog, statusText) +
        
        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Case Details</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">' +
            '<div class="mtp-info-row"><span class="mtp-info-label">Category</span><span class="mtp-info-value">' + (foundCase.caseType || 'N/A') + '</span></div>' +
            '<div class="mtp-info-row"><span class="mtp-info-label">Complainant</span><span class="mtp-info-value">' + (foundCase.citizen || 'N/A') + '</span></div>' +
            '<div class="mtp-info-row"><span class="mtp-info-label">Assigned Level</span><span class="mtp-info-value">' + (foundCase.level || 'N/A') + '</span></div>' +
            '<div class="mtp-info-row"><span class="mtp-info-label">Location</span><span class="mtp-info-value">' + ((foundCase.village || '') + (foundCase.parish ? ', ' + foundCase.parish : '') || 'N/A') + '</span></div>' +
          '</div>' +
        '</div>' +
        
        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Claim Statement</div>' +
          '<div class="mtp-statement">&ldquo;' + (foundCase.description || '') + '&rdquo;</div>' +
          (foundCase.attachedMedia ? '<div style="font-size:12px;color:#8899bb;margin-top:8px;"> Media: <strong>' + foundCase.attachedMedia + '</strong></div>' : '') +
        '</div>' +
        
        extraNotes +
        
        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Jurisdictional Feedback</div>' +
          '<div class="mtp-feedback-row mtp-feedback-lc"><span class="mtp-feedback-label"> Local Council Comments</span>' + (foundCase.lcComments || '<span style="color:#aab;font-style:italic;">No comments yet.</span>') + '</div>' +
          '<div class="mtp-feedback-row mtp-feedback-wit"><span class="mtp-feedback-label"> Witness Statements</span>' + (foundCase.lcStatements || '<span style="color:#aab;font-style:italic;">No statements yet.</span>') + '</div>' +
          '<div class="mtp-feedback-row mtp-feedback-ev"><span class="mtp-feedback-label"> Evidence Files</span>' + (foundCase.lcEvidenceFile || 'None uploaded') + '</div>' +
          legalAdvice +
        '</div>' +
        
        '<button class="mtp-print-btn" onclick="printCaseDetails(\'' + foundCase.caseId + '\')"> Print Case File</button>' +
      '</div>';
  }

  
  var _origShowTrack = typeof showTrackCaseTab === 'function' ? showTrackCaseTab : null;

  window.showTrackCaseTab = function () {
    
    if (window.innerWidth >= 768) {
      if (typeof _origShowTrack === 'function') _origShowTrack.call(this);
      return;
    }

    
    document.body.classList.remove('mobile-home-active');

    
    var old = document.getElementById('mobileTrackPanel');
    if (old) old.remove();

    var panel = document.createElement('div');
    panel.id = 'mobileTrackPanel';
    panel.innerHTML =
      
      '<div class="mtp-header">' +
        '<span class="mtp-title"> Track Case</span>' +
        '<button class="mtp-close" aria-label="Close" onclick="(function(){var p=document.getElementById(\'mobileTrackPanel\');if(p)p.remove();document.body.classList.remove(\'mobile-home-active\');if(typeof showHome===\'function\')showHome();})()">&#x2715;</button>' +
      '</div>' +
      
      '<div class="mtp-body">' +
        '<div class="mtp-search-card">' +
          '<div class="mtp-sc-label">Enter Case ID</div>' +
          '<div class="mtp-sc-desc">Type your unique case reference number to look up its current status and history.</div>' +
          '<input id="mobileTrackInput" type="text" placeholder="e.g. CASE001" autocomplete="off" autocapitalize="characters">' +
          '<button class="mtp-search-btn" onclick="_mobileTrackSearch()">Search</button>' +
        '</div>' +
        '<div id="mobileTrackResult"></div>' +
      '</div>';

    document.body.appendChild(panel);

    
    setTimeout(function () {
      var inp = document.getElementById('mobileTrackInput');
      if (inp) inp.focus();
    }, 120);
  };

  
  window._mobileTrackSearch = async function () {
    var inp = document.getElementById('mobileTrackInput');
    var container = document.getElementById('mobileTrackResult');
    if (!inp || !container) return;
    var idValue = inp.value.trim().toUpperCase();
    if (!idValue) {
      container.innerHTML = '<div class="mtp-error"><strong>Please enter a Case ID</strong> (e.g. CASE001) to continue.</div>';
      return;
    }

    
    container.innerHTML = '<div class="mtp-empty"><div style="font-size:32px;margin-bottom:10px;"></div>Looking up case&hellip;</div>';

    try {
      var token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
      if (!token) {
        container.innerHTML = '<div class="mtp-error"><strong>Authentication Error.</strong> Please log in again.</div>';
        return;
      }
      var response = await fetch(API_ENDPOINTS.case(idValue), {  });
      if (!response.ok) {
        if (response.status === 404) {
          container.innerHTML = '<div class="mtp-error"> <strong>No record found</strong> for "<em>' + idValue + '</em>".<br>Please verify the Case ID and try again.</div>';
        } else {
          throw new Error('HTTP ' + response.status);
        }
        return;
      }
      var foundCase = await response.json();
      _renderMobileResult(container, foundCase);
    } catch (e) {
      container.innerHTML = '<div class="mtp-error"> <strong>Connection error.</strong> Could not fetch case details.<br>' + (e.message || '') + '</div>';
    }
  };

  
  document.addEventListener('keydown', function (e) {
    var inp = document.getElementById('mobileTrackInput');
    if (inp && document.activeElement === inp && (e.key === 'Enter' || e.keyCode === 13)) {
      window._mobileTrackSearch();
    }
  });

}());





(function () {
  'use strict';

  
  window._renderMobileResult = function (container, foundCase) {
    var prog = 25, statusText = 'Pending Review';
    if (foundCase.status === 'Forwarded to LC2' || foundCase.status === 'Awaiting Lawyer Selection') {
      prog = 40; statusText = 'Under Review';
    } else if (foundCase.status === 'Accepted by Lawyer' || foundCase.status === 'Forwarded to Lawyer') {
      prog = 60; statusText = 'With Lawyer';
    } else if (foundCase.status === 'Resolved') {
      prog = 100; statusText = 'Resolved';
    }
    function _badge(status) {
      var cls = 'mtp-badge-pending';
      if (status === 'Resolved') cls = 'mtp-badge-resolved';
      else if (status === 'Accepted by Lawyer' || status === 'Forwarded to Lawyer') cls = 'mtp-badge-lawyer';
      else if (status === 'Forwarded to LC2' || status === 'Awaiting Lawyer Selection') cls = 'mtp-badge-review';
      return '<span class="mtp-rc-badge ' + cls + '">' + (status || 'Pending') + '</span>';
    }
    var stepperHtml = (typeof window.__mtp_buildStepper === 'function') ? window.__mtp_buildStepper(prog, statusText) : '';
    var subDate = foundCase.submissionDate
      ? '<div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:6px;">Submitted: ' +
        new Date(foundCase.submissionDate).toLocaleDateString() + '</div>' : '';
    function infoRow(label, val) {
      if (!val || String(val) === 'N/A' || String(val) === 'null' || String(val) === 'undefined') val = 'N/A';
      return '<div class="mtp-info-row"><span class="mtp-info-label">' + label +
             '</span><span class="mtp-info-value">' + val + '</span></div>';
    }
    var grid =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">' +
        infoRow('Case ID',        foundCase.caseReference || foundCase.caseNumber || 'N/A') +
        infoRow('Category',       foundCase.caseType || 'N/A') +
        infoRow('Complainant',    foundCase.citizen || foundCase.complainant || 'N/A') +
        infoRow('Assigned Level', foundCase.level || 'N/A') +
        infoRow('Status',         foundCase.status || 'N/A') +
        infoRow('Village',        foundCase.village || 'N/A') +
        infoRow('Parish',         foundCase.parish || 'N/A') +
        infoRow('Sub-county',     foundCase.subCounty || foundCase.sub_county || 'N/A') +
        infoRow('District',       foundCase.district || 'N/A') +
        infoRow('Respondent',     foundCase.respondent || foundCase.defendant || 'N/A') +
        infoRow('NIN',            foundCase.nin || 'N/A') +
        infoRow('Phone',          foundCase.phone || foundCase.citizenPhone || 'N/A') +
      '</div>';
    var mediaHtml = foundCase.attachedMedia
      ? '<div style="font-size:12px;color:#5a6a8a;margin-top:8px;">Media: <strong>' + foundCase.attachedMedia + '</strong></div>' : '';
    var extraNotes = foundCase.extraNotes
      ? '<div class="mtp-info-section"><div class="mtp-section-title">Supplemental Notes</div><div class="mtp-statement">' + foundCase.extraNotes + '</div></div>' : '';
    var legalAdvice = foundCase.legalAdvice
      ? '<div class="mtp-feedback-row mtp-feedback-adv"><span class="mtp-feedback-label">Legal Advice From Lawyer</span>' + foundCase.legalAdvice + '</div>' : '';
    container.innerHTML =
      '<div class="mtp-result-card">' +
        '<div class="mtp-rc-head"><div class="mtp-rc-lookup">File Lookup Successful</div>' +
          '<div class="mtp-rc-caseid">' + (foundCase.caseReference || foundCase.caseNumber || '') + '</div>' +
          _badge(foundCase.status) + subDate + '</div>' +
        stepperHtml +
        '<div class="mtp-info-section"><div class="mtp-section-title">Case Details</div>' + grid + '</div>' +
        '<div class="mtp-info-section"><div class="mtp-section-title">Claim Statement</div>' +
          '<div class="mtp-statement">&ldquo;' + (foundCase.description || '') + '&rdquo;</div>' + mediaHtml + '</div>' +
        extraNotes +
        '<div class="mtp-info-section"><div class="mtp-section-title">Jurisdictional Feedback</div>' +
          '<div class="mtp-feedback-row mtp-feedback-lc"><span class="mtp-feedback-label">Local Council Comments</span>' +
            (foundCase.lcComments || '<span style="color:#8899bb;font-style:italic;">No comments yet.</span>') + '</div>' +
          '<div class="mtp-feedback-row mtp-feedback-wit"><span class="mtp-feedback-label">Witness Statements</span>' +
            (foundCase.lcStatements || '<span style="color:#8899bb;font-style:italic;">No statements yet.</span>') + '</div>' +
          '<div class="mtp-feedback-row mtp-feedback-ev"><span class="mtp-feedback-label">Evidence Files</span>' +
            (foundCase.lcEvidenceFile || 'None uploaded') + '</div>' +
          legalAdvice + '</div>' +
        '<button class="mtp-print-btn" onclick="printCaseDetails(\'' + (foundCase.caseReference || foundCase.caseNumber || '') + '\')">Print Case File</button>' +
      '</div>';
  };

  
  window.__mtp_buildStepper = function (pct, statusText) {
    var steps = [{label:'Submitted',threshold:25},{label:'Under Review',threshold:40},{label:'With Lawyer',threshold:60},{label:'Resolved',threshold:100}];
    var activeIdx = 0;
    steps.forEach(function(s,i){if(pct>=s.threshold)activeIdx=i;});
    var linePct = (activeIdx/(steps.length-1))*100;
    var dots = steps.map(function(s,i){
      var cls='mtp-step'; if(pct>s.threshold)cls+=' done'; else if(i===activeIdx)cls+=' active';
      var icon=(pct>=s.threshold)?'&#10003;':(i+1);
      return '<div class="'+cls+'"><div class="mtp-step-dot">'+icon+'</div><div class="mtp-step-label">'+s.label+'</div></div>';
    }).join('');
    return '<div class="mtp-stepper"><div class="mtp-stepper-track"><div class="mtp-stepper-line-fill" style="width:calc('+linePct+'% - 28px + '+(linePct>0?'14':'0')+'px)"></div>'+dots+'</div><div class="mtp-status-label">&#9679;&nbsp;'+statusText+'</div></div>';
  };

  
  var _origST7 = window.showTrackCaseTab;
  window.showTrackCaseTab = function() {
    if(window.innerWidth>=768){if(typeof _origST7==='function')_origST7.call(this);return;}
    document.body.classList.remove('mobile-home-active');
    var old=document.getElementById('mobileTrackPanel');if(old)old.remove();
    var lang=sessionStorage.getItem('lcdjp_language')||'en';
    var tMap=(typeof translations!=='undefined')?(translations[lang]||translations['en']):{};
    var panelTitle=tMap['track_menu']||'Track Case';
    var panel=document.createElement('div');
    panel.id='mobileTrackPanel';
    panel.innerHTML='<div class="mtp-header"><span class="mtp-title">'+panelTitle+'</span>'+
      '<button class="mtp-close" aria-label="Close" onclick="(function(){var p=document.getElementById(\'mobileTrackPanel\');if(p)p.remove();document.body.classList.remove(\'mobile-home-active\');if(typeof showHome===\'function\')showHome();})()">&#x2715;</button></div>'+
      '<div class="mtp-body"><div class="mtp-search-card">'+
        '<div class="mtp-sc-label">Enter Case ID</div>'+
        '<div class="mtp-sc-desc">Type your unique case reference number to look up its current status and history.</div>'+
        '<input id="mobileTrackInput" type="text" placeholder="e.g. CASE001" autocomplete="off" autocapitalize="characters">'+
        '<button class="mtp-search-btn" onclick="_mobileTrackSearch()">Search</button>'+
      '</div><div id="mobileTrackResult"></div></div>';
    document.body.appendChild(panel);
    setTimeout(function(){var inp=document.getElementById('mobileTrackInput');if(inp)inp.focus();},120);
  };

  
  window._mobileTrackSearch = async function() {
    var inp=document.getElementById('mobileTrackInput'),container=document.getElementById('mobileTrackResult');
    if(!inp||!container)return;
    var idValue=inp.value.trim().toUpperCase();
    if(!idValue){container.innerHTML='<div class="mtp-error"><strong>Please enter a Case ID</strong> (e.g. CASE001) to continue.</div>';return;}
    container.innerHTML='<div class="mtp-empty"><div style="font-size:26px;margin-bottom:10px;color:#8899bb;">&#8987;</div>Looking up case&hellip;</div>';
    try{
      var token=(typeof getAuthToken==='function')?getAuthToken():null;
      if(!token){container.innerHTML='<div class="mtp-error"><strong>Authentication Error.</strong> Please log in again.</div>';return;}
      var response=await fetch(API_ENDPOINTS.case(idValue),{});
      if(!response.ok){
        if(response.status===404)container.innerHTML='<div class="mtp-error"><strong>No record found</strong> for &ldquo;<em>'+idValue+'</em>&rdquo;.<br>Please verify the Case ID and try again.</div>';
        else throw new Error('HTTP '+response.status);
        return;
      }
      var foundCase=await response.json();
      window._renderMobileResult(container,foundCase);
    }catch(e){container.innerHTML='<div class="mtp-error"><strong>Connection error.</strong> Could not fetch case details.<br>'+(e.message||'')+'</div>';}
  };

  
  var _origODV7 = window.openDynamicView;
  window.openDynamicView = function(html) {
    if(typeof _origODV7==='function')_origODV7.call(this,html);
    if(window.innerWidth>=768)return;
    var ul=(sessionStorage.getItem('lcdjp_userlevel')||'').toLowerCase();
    
    
    
    
    
    
    if(ul!=='citizen'&&ul!=='lawyer')return;
    var old=document.getElementById('mobileDynamicOverlay');
    var _hadExisting = !!old;
    if(old)old.remove();
    var overlay=document.createElement('div');overlay.id='mobileDynamicOverlay';
    var lang=sessionStorage.getItem('lcdjp_language')||'en';
    var tMap=(typeof translations!=='undefined')?(translations[lang]||translations['en']):{};
    
    
    
    var title=tMap['new_submission_title']||'Case Submission';
    var _tmp=document.createElement('div');_tmp.innerHTML=html;
    var _heading=_tmp.querySelector('h2,h3');
    if(ul==='lawyer'&&_heading&&_heading.textContent.trim())title=_heading.textContent.trim();
    var hdr=document.createElement('div');hdr.className='mdo-header';
    var te=document.createElement('span');te.className='mdo-title';te.textContent=title;
    var xb=document.createElement('button');xb.className='mdo-close';xb.setAttribute('aria-label','Close');xb.innerHTML='&times;';
    xb.onclick=function(){
      overlay.remove();
      if (typeof window.unlockScroll === 'function') { window.unlockScroll(); }
      else { document.body.style.overflow=''; document.documentElement.style.overflow=''; }
      document.body.classList.remove('mobile-home-active');
      if(ul==='lawyer'&&typeof showLawyerDashboard==='function')showLawyerDashboard();
      else if(typeof showHome==='function')showHome();
    };
    hdr.appendChild(te);hdr.appendChild(xb);overlay.appendChild(hdr);
    var body=document.createElement('div');body.className='mdo-body';body.innerHTML=html;overlay.appendChild(body);
    
    
    
    
    
    
    
    
    
    document.body.insertBefore(overlay, document.body.firstChild);
    
    
    
    
    if (!_hadExisting) lockScroll();
    (function(){
      var t=(typeof translations!=='undefined')?(translations[lang]||translations['en']):{};
      overlay.querySelectorAll('[data-translate]').forEach(function(el){var k=el.getAttribute('data-translate');if(t[k]!==undefined&&!el.children.length)el.textContent=t[k];});
      overlay.querySelectorAll('[data-translate-placeholder]').forEach(function(el){var k=el.getAttribute('data-translate-placeholder');if(t[k])el.placeholder=t[k];});
      overlay.querySelectorAll('select option[data-translate]').forEach(function(el){var k=el.getAttribute('data-translate');if(t[k])el.textContent=t[k];});
      var ds=overlay.querySelector('[id="caseDistrict"]');
      if(ds&&typeof ugandaDistricts!=='undefined'){ds.innerHTML='<option value="">-- Select District --</option>';[].concat(ugandaDistricts).sort().forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;ds.appendChild(o);});}
    })();
  };

  
  var _origSMMP7 = window.showMobileMenuPanel;
  window.showMobileMenuPanel = function(menuId) {
    if(typeof _MOBILE_PANELS!=='undefined'&&_MOBILE_PANELS[menuId]){
      var lang=sessionStorage.getItem('lcdjp_language')||'en';
      if(lang!=='en'&&typeof translations!=='undefined'){
        var t=translations[lang]||translations['en'];
        var lk={'Family Dispute':'family_dispute','Land Matter':'land_matter','Business Matter':'business_matter','Community Disputes':'community_disputes','Inheritance Dispute':'inheritance_dispute','Boundary Dispute':'boundary_dispute','Marriage Dispute':'marriage_dispute','Child Custody':'child_custody','Debt Recovery':'debt_recovery','Others':'others','Know Your Rights':'know_your_rights','Common Legal Questions':'common_questions','AI Legal Guidance':'ai_guidance','Legal Templates':'legal_templates','Find A Lawyer':'find_lawyer','Legal Aid Providers':'legal_aid','Local Council Offices':'local_councils','Emergency Support':'emergency_support','Land & Property Law':'land_law','Family & Marriage Law':'family_law','Business & Employment Law':'employment_law','Community Disputes (LC)':'community_law'};
        var tk={'reportMenu':'report_menu','legalMenu':'legal_menu','sidebarFindHelpMenu':'help_menu','educationMenu':'education_menu'};
        var p=_MOBILE_PANELS[menuId];
        var tr={title:(tk[menuId]&&t[tk[menuId]])?t[tk[menuId]]:p.title,items:p.items.map(function(item){var k=lk[item.label];return{icon:item.icon,label:(k&&t[k])?t[k]:item.label,desc:item.desc,action:item.action};})};
        var orig=_MOBILE_PANELS[menuId];_MOBILE_PANELS[menuId]=tr;
        if(typeof _origSMMP7==='function')_origSMMP7.call(this,menuId);
        _MOBILE_PANELS[menuId]=orig;return;
      }
    }
    if(typeof _origSMMP7==='function')_origSMMP7.call(this,menuId);
  };

  
  var _origTCF7 = window.translateCaseForm;
  window.translateCaseForm = function(lang) {
    if(typeof _origTCF7==='function')_origTCF7.call(this,lang);
    var ov=document.getElementById('mobileDynamicOverlay');if(!ov||typeof translations==='undefined')return;
    var t=translations[lang]||translations['en'];
    ov.querySelectorAll('[data-translate]').forEach(function(el){var k=el.getAttribute('data-translate');if(t[k]!==undefined&&!el.children.length)el.textContent=t[k];});
    ov.querySelectorAll('[data-translate-placeholder]').forEach(function(el){var k=el.getAttribute('data-translate-placeholder');if(t[k])el.placeholder=t[k];});
    ov.querySelectorAll('select option[data-translate]').forEach(function(el){var k=el.getAttribute('data-translate');if(t[k])el.textContent=t[k];});
    var te=ov.querySelector('.mdo-title');if(te&&t['new_submission_title'])te.textContent=t['new_submission_title'];
  };

}());





(function () {
  'use strict';

  
  function _f(obj) {
    return {
      caseId:          obj.caseReference   || obj.caseNumber    || '',
      caseType:        obj.case_type        || obj.caseType       || '',
      citizen:         obj.citizen          || obj.citizen_name   || obj.citizenId    || obj.citizen_id || obj.citizenUsername || '',
      citizenUsername: obj.citizen_id       || obj.citizenUsername|| '',
      citizenPhone:    obj.citizen_phone    || obj.citizenPhone   || '',
      citizenEmail:    obj.citizen_email    || obj.citizenEmail   || '',
      level:           obj.current_level    || obj.level          || '',
      status:          obj.status           || '',
      village:         obj.village          || '',
      parish:          obj.parish           || '',
      subCounty:       obj.sub_county       || obj.subCounty      || '',
      county:          obj.county           || '',
      district:        obj.district         || '',
      fullLocation:    obj.full_location    || obj.fullLocation   || '',
      kinName:         obj.kin_name         || obj.kinName        || '',
      kinPhone:        obj.kin_phone        || obj.kinPhone       || '',
      kinEmail:        obj.kin_email        || obj.kinEmail       || '',
      kinRelationship: obj.kin_relationship || obj.kinRelationship|| '',
      description:     obj.description      || '',
      extraNotes:      obj.extra_notes      || obj.extraNotes     || '',
      lcComments:      obj.lc_comments      || obj.lcComments     || '',
      lcStatements:    obj.lc_statements    || obj.lcStatements   || '',
      lcEvidenceFile:  obj.lc_evidence_file || obj.lcEvidenceFile || '',
      legalAdvice:     obj.legal_advice     || obj.legalAdvice    || '',
      attachedMedia:   obj.attached_media   || obj.attachedMedia  || '',
      submissionDate:  obj.submission_date  || obj.submissionDate || '',
      assignedLawyer:  obj.assigned_lawyer_name || obj.assignedLawyerName || obj.assigned_lawyer || obj.assignedLawyer || '',
      respondent:      obj.respondent       || obj.defendant      || '',
      nin:             obj.nin              || ''
    };
  }

  
  function _mtpSearchCardEl() {
    return document.querySelector('#mobileTrackPanel .mtp-search-card');
  }
  function _mtpHideSearchCard() {
    var el = _mtpSearchCardEl();
    if (el) el.style.display = 'none';
  }
  function _mtpShowSearchCard() {
    var el = _mtpSearchCardEl();
    if (el) el.style.display = '';
  }
  
  window._mobileTrackNewSearch = function () {
    _mtpShowSearchCard();
    var container = document.getElementById('mobileTrackResult');
    if (container) container.innerHTML = '';
    var inp = document.getElementById('mobileTrackInput');
    if (inp) { inp.value = ''; inp.focus(); }
  };

  
  window._mobileTrackSearch = async function () {
    var inp = document.getElementById('mobileTrackInput');
    var container = document.getElementById('mobileTrackResult');
    if (!inp || !container) return;
    var idValue = inp.value.trim().toUpperCase();
    if (!idValue) {
      container.innerHTML = '<div class="mtp-error"><strong>Please enter a Case ID</strong> (e.g. CASE001) to continue.</div>';
      return;
    }
    
    _mtpHideSearchCard();
    container.innerHTML = '<div class="mtp-empty"><div style="font-size:26px;margin-bottom:10px;color:#8899bb;">&#8987;</div>Looking up case&hellip;</div>';
    try {
      var token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
      if (!token) {
        container.innerHTML = '<div class="mtp-error"><strong>Authentication Error.</strong> Please log in and try again.</div>';
        _mtpShowSearchCard();
        return;
      }
      var response = await fetch(API_ENDPOINTS.case(idValue), {  });
      if (!response.ok) {
        if (response.status === 404) {
          container.innerHTML = '<div class="mtp-error"><strong>No record found</strong> for &ldquo;<em>' + idValue + '</em>&rdquo;.<br>Please verify the Case ID and try again.</div>';
        } else {
          throw new Error('HTTP ' + response.status);
        }
        _mtpShowSearchCard();
        return;
      }
      var data = await response.json();
      
      var rawCase = (data && data.case) ? data.case : data;
      window._renderMobileResult(container, rawCase);
    } catch (e) {
      container.innerHTML = '<div class="mtp-error"><strong>Connection error.</strong> Could not fetch case details.<br>' + (e.message || '') + '</div>';
      _mtpShowSearchCard();
    }
  };

  
  window._renderMobileResult = function (container, rawCase) {
    var c = _f(rawCase);

    
    var prog = 25, statusText = 'Pending Review';
    if (c.status === 'Forwarded to LC2' || c.status === 'Awaiting Lawyer Selection') {
      prog = 40; statusText = 'Under Review';
    } else if (c.status === 'Accepted by Lawyer' || c.status === 'Forwarded to Lawyer') {
      prog = 60; statusText = 'With Lawyer';
    } else if (c.status === 'Resolved') {
      prog = 100; statusText = 'Resolved';
    }

    var stepperHtml = (typeof window.__mtp_buildStepper === 'function')
      ? window.__mtp_buildStepper(prog, statusText) : '';

    
    function badge(status) {
      var cls = 'mtp-badge-pending';
      if (status === 'Resolved') cls = 'mtp-badge-resolved';
      else if (status === 'Accepted by Lawyer' || status === 'Forwarded to Lawyer') cls = 'mtp-badge-lawyer';
      else if (status === 'Forwarded to LC2' || status === 'Awaiting Lawyer Selection') cls = 'mtp-badge-review';
      return '<span class="mtp-rc-badge ' + cls + '">' + (status || 'Pending') + '</span>';
    }

    
    function row(label, val) {
      var v = (val && String(val).trim() && String(val) !== 'null' && String(val) !== 'undefined') ? val : '';
      if (!v) return '';   
      return '<div class="mtp-info-row"><span class="mtp-info-label">' + label +
             '</span><span class="mtp-info-value">' + v + '</span></div>';
    }

    
    var subDate = '';
    if (c.submissionDate) {
      try { subDate = '<div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:6px;">Submitted: ' + new Date(c.submissionDate).toLocaleDateString() + '</div>'; }
      catch(e) {}
    }

    
    var locationVal = c.fullLocation;
    if (!locationVal) {
      locationVal = [c.village, c.parish, c.subCounty, c.county, c.district].filter(Boolean).join(', ');
    }

    
    var grid =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">' +
        row('Case ID',        c.caseId) +
        row('Category',       c.caseType) +
        row('Complainant',    c.citizen) +
        row('Username',       c.citizenUsername) +
        row('Assigned Level', c.level) +
        row('Status',         c.status) +
        row('Village',        c.village) +
        row('Parish',         c.parish) +
        row('Sub-county',     c.subCounty) +
        row('County',         c.county) +
        row('District',       c.district) +
        row('Phone',          c.citizenPhone) +
        row('Email',          c.citizenEmail) +
        row('NIN',            c.nin) +
        row('Respondent',     c.respondent) +
      '</div>';

    
    var kinSection = '';
    if (c.kinName) {
      kinSection =
        '<div class="mtp-info-section"><div class="mtp-section-title">Next of Kin</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">' +
            row('Name',         c.kinName) +
            row('Phone',        c.kinPhone) +
            row('Email',        c.kinEmail) +
            row('Relationship', c.kinRelationship) +
          '</div></div>';
    }

    
    var mediaHtml = (c.attachedMedia && c.attachedMedia !== 'None Uploaded' && c.attachedMedia !== 'None')
      ? '<div style="font-size:12px;color:#5a6a8a;margin-top:8px;">Attached: <strong>' + c.attachedMedia + '</strong></div>'
      : '';

    
    var extraSection = c.extraNotes
      ? '<div class="mtp-info-section"><div class="mtp-section-title">Supplemental Notes</div>' +
        '<div class="mtp-statement">' + c.extraNotes + '</div></div>'
      : '';

    
    var lcBlock = (c.lcComments || c.lcStatements || c.lcEvidenceFile || c.legalAdvice)
      ? '<div class="mtp-info-section"><div class="mtp-section-title">Jurisdictional Feedback</div>' +
          (c.lcComments
            ? '<div class="mtp-feedback-row mtp-feedback-lc"><span class="mtp-feedback-label">LC Comments</span>' + c.lcComments + '</div>'
            : '') +
          (c.lcStatements
            ? '<div class="mtp-feedback-row mtp-feedback-wit"><span class="mtp-feedback-label">Witness Statements</span>' + c.lcStatements + '</div>'
            : '') +
          (c.lcEvidenceFile && c.lcEvidenceFile !== 'None Uploaded'
            ? '<div class="mtp-feedback-row mtp-feedback-ev"><span class="mtp-feedback-label">Evidence Files</span>' + c.lcEvidenceFile + '</div>'
            : '') +
          (c.legalAdvice
            ? '<div class="mtp-feedback-row mtp-feedback-adv"><span class="mtp-feedback-label">Legal Advice' + (c.assignedLawyer ? ' (' + c.assignedLawyer + ')' : '') + '</span>' + c.legalAdvice + '</div>'
            : '') +
        '</div>'
      : '';

    container.innerHTML =
      '<div class="mtp-result-card">' +
        '<div class="mtp-rc-head">' +
          '<button type="button" class="mtp-new-search-btn" onclick="_mobileTrackNewSearch()">&larr; New Search</button>' +
          '<div class="mtp-rc-lookup">File Lookup Successful</div>' +
          '<div class="mtp-rc-caseid">' + c.caseId + '</div>' +
          badge(c.status) + subDate +
        '</div>' +
        stepperHtml +

        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Case Details</div>' +
          (locationVal ? '<div style="font-size:12px;color:#5a6a8a;margin-bottom:8px;">Location: ' + locationVal + '</div>' : '') +
          grid +
        '</div>' +

        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Claim Statement</div>' +
          '<div class="mtp-statement">' + (c.description ? '&ldquo;' + c.description + '&rdquo;' : '<span style="color:#8899bb;font-style:italic;">No statement on record.</span>') + '</div>' +
          mediaHtml +
        '</div>' +

        kinSection +
        extraSection +
        lcBlock +

        '<button class="mtp-print-btn" onclick="printCaseDetails(\'' + c.caseId + '\')">Print Case File</button>' +
      '</div>';
  };

}());





(function() {
  'use strict';

  var _aiState = {
    step: 0,
    category: null,
    qIndex: 0,
    answers: {},
    contactType: null,
    chatMode: false,
    assistantMode: 'incident',
    userLat: null,
    userLng: null,
    lcResults: [],
    policeResults: [],
    placeResults: [],
    kin: { name: '', phone: '', email: '', relationship: '' },
    attachment: null
  };
  var _aiHideTimer = null; 

  
  
  
  
  
  
  var _AI_OUTSIDE_UGANDA_TOKEN = '[[LCDJP_OUTSIDE_UGANDA]]';

  // Short-term memory for the current assistant conversation. It is sent with each free-text message so the
  // assistant can follow up on what was already said, and it is reset whenever a new conversation starts
  // (the code that starts one replaces _aiState, or clears history explicitly).
  function _aiRememberTurn(userText, botText) {
    if (!_aiState.history) _aiState.history = [];
    _aiState.history.push({ role: 'user', content: String(userText || '') });
    if (botText) _aiState.history.push({ role: 'assistant', content: String(botText) });
    if (_aiState.history.length > 12) _aiState.history = _aiState.history.slice(-12);
  }

  async function _callHuggingFaceBackend(userMessage, systemContext, useHistory) {
    try {
      var augmentedContext = (systemContext || '')
        + ' IMPORTANT: If -- and only if -- something the user has actually said (just now or earlier '
        + 'in this conversation) makes it reasonably clear they are currently physically located outside '
        + 'Uganda, append the exact text ' + _AI_OUTSIDE_UGANDA_TOKEN + ' on its own new line at the very '
        + 'end of your reply, after your normal answer. Never mention this marker to the user, never ask '
        + 'them where they are just to check, and do not include it on a mere guess.';
      var payload = {
        message: userMessage,
        context: augmentedContext,
        category: _aiState.category || '',
        answers: _aiState.answers || {},
        history: useHistory ? (_aiState.history || []) : [],
        sessionId: sessionStorage.getItem('lcdjp_username') || 'guest'
      };
      var response = await fetch(API_BASE_URL + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Backend returned ' + response.status);
      var data = await response.json();
      
      
      
      
      
      if (data && data.fallback) return null;
      var reply = data.reply || data.message || data.response || null;
      if (reply && reply.indexOf(_AI_OUTSIDE_UGANDA_TOKEN) !== -1) {
        reply = reply.split(_AI_OUTSIDE_UGANDA_TOKEN).join('').replace(/\s+$/, '');
        _aiMarkOutsideUganda();
      }
      if (useHistory && reply) _aiRememberTurn(userMessage, reply);
      return reply;
    } catch (err) {
      console.warn('[AI] HuggingFace backend unavailable, using local fallback:', err.message);
      return null;
    }
  }

  var _aiQuestions = [
    { key: 'what', text: 'What happened? Please describe the incident briefly.' },
    { key: 'where', text: 'Where did this happen? (e.g., street name, area, landmark)' },
    { key: 'when', text: 'When did this happen? (e.g., today at 3pm, this morning)' },
    { key: 'immediate', text: 'Do you or anyone else need immediate physical assistance right now?', choices: ['Yes, immediately!', 'No, I need to report it'] }
  ];

  
  
  
  
  
  
  var _aiEmergencyQuestions = [
    { key: 'what', text: 'What happened? Please describe briefly, I\'ll take it from here.' }
  ];

  
  
  
  
  
  function _aiCurrentQuestions() {
    return _aiState.emergencyMode ? _aiEmergencyQuestions : _aiQuestions;
  }

  var _aiCategories = [
    { icon: '', label: 'Crime Report' },
    { icon: '', label: 'Accident' },
    { icon: '', label: 'Fire Emergency' },
    { icon: '', label: 'Medical Emergency' },
    { icon: '', label: 'Missing Person' },
    { icon: '', label: 'Road Incident' },
    { icon: '', label: 'Vehicle Breakdown' },
    { icon: '', label: 'Other Emergency' },
    { icon: '', label: 'Family Dispute' },
    { icon: '', label: 'Land Matter' },
    { icon: '', label: 'Business Matter' },
    { icon: '', label: 'Community Disputes' },
    { icon: '', label: 'Inheritance Dispute' },
    { icon: '', label: 'Boundary Dispute' },
    { icon: '', label: 'Marriage Dispute' },
    { icon: '', label: 'Child Custody' },
    { icon: '', label: 'Debt Recovery' },
    { icon: '', label: 'Other Legal Matter' }
  ];

  
  
  
  var _aiLegalCaseLabels = [
    'Family Dispute', 'Land Matter', 'Business Matter', 'Community Disputes',
    'Inheritance Dispute', 'Boundary Dispute', 'Marriage Dispute',
    'Child Custody', 'Debt Recovery', 'Other Legal Matter'
  ];

  
  
  
  
  
  
  
  var _aiCrimeReportLabel = 'Crime Report';

  
  
  
  var _aiEmergencyOnlyLabels = _aiCategories
    .map(function(c) { return c.label; })
    .filter(function(l) { return _aiLegalCaseLabels.indexOf(l) === -1 && l !== _aiCrimeReportLabel; });

  
  
  
  var _aiReportCaseLabels = [_aiCrimeReportLabel].concat(_aiLegalCaseLabels);

  function _getChatArea() { return document.getElementById('aiChatArea'); }

  function _scrollBottom() {
    setTimeout(function() {
      var c = _getChatArea();
      if (c) c.scrollTop = c.scrollHeight;
    }, 60);
  }

  function _setStep(n) {
    _aiState.step = n;
    for (var i = 0; i < 5; i++) {
      var dot = document.getElementById('aiDot' + i);
      if (dot) dot.classList.toggle('active', i <= n);
    }
  }

  function _addBotBubble(html, delay) {
    var area = _getChatArea();
    if (!area) return;
    delay = delay || 0;
    var typing = document.createElement('div');
    typing.className = 'ai-bubble-wrap';
    typing.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    area.appendChild(typing);
    _scrollBottom();
    setTimeout(function() {
      if (!area.contains(typing)) return;
      area.removeChild(typing);
      var wrap = document.createElement('div');
      wrap.className = 'ai-bubble-wrap';
      wrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-bubble">' + html + '</div>';
      area.appendChild(wrap);
      _scrollBottom();
    }, delay + 700);
  }

  function _addUserBubble(text) {
    var area = _getChatArea();
    if (!area) return;
    var wrap = document.createElement('div');
    wrap.className = 'ai-bubble-wrap user';
    wrap.innerHTML = '<div class="ai-bubble user">' + _esc(text) + '</div><div class="ai-avatar" style="background:#1a237e;"></div>';
    area.appendChild(wrap);
    _scrollBottom();
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  










  function _aiIsCitizenVerified() {
    var status = (sessionStorage.getItem('lcdjp_verif_status') || '').toLowerCase();
    return status === 'verified' || status === 'approved';
  }

  
  
  
  
  
  
  async function _aiFetchFreshVerifStatus() {
    try {
      var username = (typeof getLcdjpActiveUsername === 'function')
        ? getLcdjpActiveUsername()
        : (sessionStorage.getItem('lcdjp_username') || '');
      if (!username || typeof API_ENDPOINTS === 'undefined' || !API_ENDPOINTS.verificationStatus) {
        return _aiIsCitizenVerified(); 
      }
      var token = (typeof _getVerificationToken === 'function')
        ? _getVerificationToken()
        : (localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken') || '');
      if (!token) return _aiIsCitizenVerified();

      var res = await fetch(API_ENDPOINTS.verificationStatus(username), {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return _aiIsCitizenVerified(); 

      var data = await res.json();
      var raw = data.verificationStatus || data.verification_status || 'not-verified';
      var normalized = typeof _lcdjpNormalizeVerifStatus === 'function'
        ? _lcdjpNormalizeVerifStatus(raw)
        : (raw ? String(raw).toLowerCase() : 'not-verified');
      sessionStorage.setItem('lcdjp_verif_status', normalized);
      localStorage.setItem('lcdjp_verif_status', normalized);
      return normalized === 'verified' || normalized === 'approved';
    } catch (e) {
      console.warn('[LCDJP] Live verification re-check failed, falling back to cached value:', e);
      return _aiIsCitizenVerified();
    }
  }

  function _addWidget(html, delay) {
    var area = _getChatArea();
    if (!area) return;
    delay = delay || 0;
    setTimeout(function() {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'animation:ai-msg-in 0.25s ease; padding-left:44px;';
      wrap.innerHTML = html;
      area.appendChild(wrap);
      _scrollBottom();
    }, delay + 800);
  }

  function _showCategories(mode) {
    _setStep(1);
    var prompt = mode === 'emergency' ? 'What type of emergency are you facing? Please select a category:'
               : mode === 'report'    ? 'What would you like to report? Please select a category:'
               : 'What type of incident would you like to report? Please select a category:';
    _addBotBubble(prompt, 0);
    var cats = mode === 'emergency' ? _aiCategories.filter(function(c) { return _aiEmergencyOnlyLabels.indexOf(c.label) !== -1; })
             : mode === 'report'    ? _aiCategories.filter(function(c) { return _aiReportCaseLabels.indexOf(c.label) !== -1; })
             
             : mode === true        ? _aiCategories.filter(function(c) { return _aiEmergencyOnlyLabels.indexOf(c.label) !== -1; })
             : _aiCategories;
    var html = '<div id="aiCategoryGrid">';
    cats.forEach(function(c) {
      html += '<button class="ai-cat-btn" onclick="window._aiSelectCat(\'' + c.label.replace(/'/g,"\'") + '\')">'
            + '<span class="ai-cat-icon">' + c.icon + '</span>'
            + _esc(c.label)
            + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  






  function _aiPromptVerificationRequired(label) {
    if (label) _addUserBubble(label);
    var what = label ? ('a <strong>' + _esc(label) + '</strong> case') : 'a case';
    _addBotBubble(
      '<div style="background:#fff3e0;border:1.5px solid #f57c00;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:13px;font-weight:700;color:#e65100;margin-bottom:6px;"> Account verification required</div>'
      + '<div style="font-size:13px;color:#333;">To report ' + what + ' and be connected with a legal aid provider or the police, '
      + 'your account needs to be verified first. You can verify now, or continue using this assistant for emergency services only.</div>'
      + '</div>', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#fff3e0; border-color:#f57c00; color:#e65100;" onclick="window._aiGoVerify()"> Verify My Account</button>'
      + '<button class="ai-choice-btn" style="background:#e3f2fd; border-color:#1565c0; color:#1565c0;" onclick="window._aiEmergencyOnly()"> Emergency Services Only</button>'
      + '</div>';
    _addWidget(html, 300);
  }

  window._aiGoVerify = function() {
    _addUserBubble('Verify My Account');
    if (typeof closeAIAssistant === 'function') closeAIAssistant();
    if (typeof showIdVerifyPage === 'function') showIdVerifyPage();
  };

  window._aiEmergencyOnly = function() {
    _addUserBubble('Emergency Services Only');
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addBotBubble('No problem, here are the emergency categories I can help with right now:', 200);
    setTimeout(function() { _showCategories('emergency'); }, 900);
  };

  window._aiSelectCat = function(label) {
    
    
    
    
    
    if ((_aiLegalCaseLabels.indexOf(label) !== -1 || label === _aiCrimeReportLabel) && _aiIsKnownOutsideUganda()) {
      _aiBlockReportCaseOutsideUganda(label);
      return;
    }
    if ((_aiLegalCaseLabels.indexOf(label) !== -1 || label === _aiCrimeReportLabel) && !_aiIsCitizenVerified()) {
      _aiPromptVerificationRequired(label);
      return;
    }
    _aiState.category = label;
    _aiState.qIndex = 0;
    _aiState.answers = {};
    _aiState.history = [];
    
    
    
    
    
    
    _aiState.emergencyMode = _aiLegalCaseLabels.indexOf(label) === -1
      && label !== _aiCrimeReportLabel;
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    _addUserBubble(label);
    _setStep(2);
    if (_aiState.emergencyMode) {
      _addBotBubble(
        '<strong>' + _esc(label) + '</strong> reported. I\'ll locate the nearest help for you now, '
        + 'just tell me what happened and I\'ll take it from there.',
        0
      );
    } else if (label === _aiCrimeReportLabel) {
      _addBotBubble(
        '<strong>' + _esc(label) + '</strong>, got it. I\'ll ask a few quick questions, and if you tell me anyone '
        + 'is in immediate danger I\'ll find the nearest Police or LC office right away.',
        0
      );
    } else {
      _addBotBubble('Understood, <strong>' + _esc(label) + '</strong>. I\'ll help you report this. I just need to ask a few quick questions.', 0);
    }
    setTimeout(function() { _askNextQuestion(); }, 1600);
  };

  function _askNextQuestion() {
    var qs = _aiCurrentQuestions();
    if (_aiState.qIndex >= qs.length) {
      if (_aiState.emergencyMode) { _aiEmergencyAutoLocate(); }
      else if (_aiState.category === _aiCrimeReportLabel) { _aiCrimeReportChoice(); }
      else { _aiCollectCaseDetails(); }
      return;
    }
    var q = qs[_aiState.qIndex];
    if (q.choices) {
      _addBotBubble(q.text, 0);
      var html = '<div class="ai-choices-row">';
      q.choices.forEach(function(ch) {
        html += '<button class="ai-choice-btn" onclick="window._aiAnswerQ(\'' + ch.replace(/'/g,"\'") + '\')">' + _esc(ch) + '</button>';
      });
      html += '</div>';
      _addWidget(html, 0);
    } else {
      _addBotBubble(q.text, 0);
      var input = document.getElementById('aiTextInput');
      if (input) { input.placeholder = 'Type your answer...'; input.focus(); }
    }
  }

  window._aiAnswerQ = function(answer) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble(answer);
    var q = _aiCurrentQuestions()[_aiState.qIndex];
    _aiState.answers[q.key] = answer;
    _aiState.qIndex++;

    
    if (q.key === 'immediate' && answer === 'Yes, immediately!') {
      _addBotBubble(
        '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:12px 16px;">'
        + '<div style="font-size:13.5px;font-weight:700;color:#c62828;"> Got it, looking for the nearest help right now...</div>'
        + '</div>',
        0
      );
      _aiImmediateHelpNearby();
      setTimeout(function() { _askNextQuestion(); }, 1500);
      return;
    }

    setTimeout(function() { _askNextQuestion(); }, 600);
  };

  var _AI_INTAKE_YES = 'Yes, immediately!';
  var _AI_INTAKE_NO = 'No, I need to report it';

  function _aiTypingStart() {
    var area = _getChatArea();
    if (!area) return null;
    var id = 'ai-typing-' + Date.now();
    var wrap = document.createElement('div');
    wrap.id = id;
    wrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
    wrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    area.appendChild(wrap);
    _scrollBottom();
    return id;
  }

  function _aiTypingStop(id) {
    var el = id ? document.getElementById(id) : null;
    if (el) el.remove();
  }

  // Old behaviour, used when the intake service is unavailable: the text answers the question just asked.
  function _aiIntakeFallback(text) {
    var q = _aiCurrentQuestions()[_aiState.qIndex];
    if (!q) return;
    _aiState.answers[q.key] = text;
    _aiState.qIndex++;
    setTimeout(function () { _askNextQuestion(); }, 600);
  }

  // Free text during the report flow. The server reads the message in context and tells us whether it is report
  // details (possibly several fields at once), a question, a correction or an emergency, so we no longer treat
  // every message as the literal answer to whatever the script asked last.
  async function _aiIntakeTurn(text) {
    var stateRef = _aiState;
    var qs = _aiCurrentQuestions();
    var pending = [];
    qs.forEach(function (q) { if (!_aiState.answers[q.key]) pending.push(q.key); });

    var typingId = _aiTypingStart();
    _aiState.intakeBusy = true;
    var data = null;
    try {
      var resp = await fetch(API_BASE_URL + '/api/ai/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          category: _aiState.category || '',
          answers: _aiState.answers || {},
          pendingKeys: pending,
          history: _aiState.history || [],
          sessionId: sessionStorage.getItem('lcdjp_username') || 'guest'
        })
      });
      if (resp.ok) data = await resp.json();
    } catch (e) { data = null; }

    stateRef.intakeBusy = false;
    _aiTypingStop(typingId);
    if (_aiState !== stateRef) return; // the assistant was closed or restarted while we waited

    if (!data || data.fallback) { _aiIntakeFallback(text); return; }

    var ex = data.extracted || {};
    var wasEmergency = _aiState.answers.immediate === _AI_INTAKE_YES;
    var gotField = false;
    qs.forEach(function (q) {
      var v = ex[q.key];
      if (typeof v !== 'string' || !v) return;
      if (q.key === 'immediate') v = (v === 'yes') ? _AI_INTAKE_YES : _AI_INTAKE_NO;
      _aiState.answers[q.key] = v;
      gotField = true;
    });

    var replyText = (typeof data.reply === 'string') ? data.reply.trim() : '';
    _aiRememberTurn(text, replyText);

    // The model called it ANSWER but nothing usable came out: keep the old behaviour rather than looping.
    if (data.intent === 'ANSWER' && !gotField) { _aiIntakeFallback(text); return; }

    var urgent = !_aiState.emergencyMode && !wasEmergency
      && (data.intent === 'EMERGENCY' || _aiState.answers.immediate === _AI_INTAKE_YES);
    if (urgent) _aiState.answers.immediate = _AI_INTAKE_YES;

    if (urgent) {
      _addBotBubble(
        '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:12px 16px;">'
        + '<div style="font-size:13.5px;font-weight:700;color:#c62828;"> Got it, looking for the nearest help right now...</div>'
        + '</div>',
        0
      );
      _aiImmediateHelpNearby();
    } else if (replyText) {
      var html = _esc(replyText).replace(/\n/g, '<br>');
      if (Array.isArray(data.sources) && data.sources.length) {
        html += '<div style="margin-top:8px;font-size:11.5px;color:#667085;"><strong>Sources:</strong> '
          + data.sources.map(function (s) {
              return _esc([s.documentTitle, s.legalSection].filter(Boolean).join(', ') || 'Legal Knowledge library');
            }).join('; ') + '</div>';
      }
      _addBotBubble(html, 0);
    }

    // Ask only for what is still missing.
    var firstOpen = -1;
    for (var i = 0; i < qs.length; i++) {
      if (!_aiState.answers[qs[i].key]) { firstOpen = i; break; }
    }
    _aiState.qIndex = firstOpen === -1 ? qs.length : firstOpen;
    setTimeout(function () { _askNextQuestion(); }, (replyText || urgent) ? 1500 : 600);
  }

  function aiSendMessage() {
    
    
    
    if (_aiState && (_aiState.assistantMode || '').indexOf('lawyer_') === 0) {
      return _lawyerAiSendMessage();
    }
    if (_aiState && (_aiState.assistantMode || '').indexOf('lc_') === 0) {
      return _lcAiSendMessage();
    }

    var input = document.getElementById('aiTextInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';

    var _isLegalAidMode = (_aiState.assistantMode || '').indexOf('legal_aid') === 0;
    var _isFindHelpMode = (_aiState.assistantMode || '').indexOf('find_help') === 0;

    
    
    if (_aiState.assistantMode === 'legal_aid_document_paste') {
      _addUserBubble(text.length > 120 ? text.slice(0, 120) + '…' : text);
      _aiState.assistantMode = 'legal_aid_document';
      _legalAidExplainDocumentCommon(text);
      return;
    }

    
    
    if (!_aiState.chatMode && _aiState.assistantMode === 'legal_aid_complaint') {
      window._legalAidAnswerComplaintQ(text);
      return;
    }

    if (_isLegalAidMode && _legalAidCheckEmergency(text)) {
      _addUserBubble(text);
      _legalAidShowEmergencyRedirect();
      return;
    }

    if (_isFindHelpMode && _legalAidCheckEmergency(text)) {
      _addUserBubble(text);
      _findHelpShowEmergencyRedirect();
      return;
    }

    
    
    
    
    
    
    
    
    
    if (_isLegalAidMode && !_aiState.chatMode) {
      _aiState.chatMode = true;
      var _leftoverGrid = _getChatArea();
      var _grid = _leftoverGrid ? _leftoverGrid.querySelector('#aiCategoryGrid') : null;
      if (_grid && _grid.parentElement) _grid.parentElement.remove();
    }

    if (_aiState.chatMode) {
      _addUserBubble(text);
      var area = _getChatArea();
      var typingId = 'ai-typing-' + Date.now();
      var typingWrap = document.createElement('div');
      typingWrap.id = typingId;
      typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
      typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
      if (area) { area.appendChild(typingWrap); _scrollBottom(); }

      var sysCtx;
      if (_isLegalAidMode) {
        if (_aiState.assistantMode === 'legal_aid_mycase_chat') {
          sysCtx = 'You are the "Understand My Case" tool inside Legal Aid, for LCDJP. Continue helping the citizen understand their own case. '
            + 'Do not invent any case status, date, decision, document, official, or outcome beyond what has already been shared in this conversation. '
            + _legalAidResponseStyle;
        } else if (_aiState.assistantMode === 'legal_aid_terms') {
          sysCtx = 'You are the "Legal Terms" glossary tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
            + 'Explain the legal term(s) the citizen asks about using simple language and a short example. Keep it concise. '
            + _legalAidResponseStyle;
        } else if (_aiState.assistantMode === 'legal_aid_rights') {
          sysCtx = 'You are the "Know Your Rights" tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
            + 'Continue answering the citizen\'s follow-up question about their rights, procedures, and next steps. ' + _legalAidResponseStyle;
        } else if (_aiState.assistantMode === 'legal_aid_findhelp') {
          sysCtx = 'You are the "Find Legal Help" tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
            + 'The citizen is looking for legal help/organisations near them and may also ask a general legal question while they wait to be '
            + 'connected. Answer the legal question itself first, then, where relevant, mention they can view nearby legal organisations on the '
            + 'map or ask to be connected with a lawyer. ' + _legalAidResponseStyle;
        } else {
          
          sysCtx = 'You are the "Ask for Legal Guidance" assistant inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
            + 'Understand the citizen\'s issue, identify the general legal topic, explain it in simple language, explain relevant rights where '
            + 'appropriate, explain possible procedures, suggest practical next steps, and identify what type of authority or professional may be '
            + 'appropriate. Recommend professional legal assistance where necessary. ' + _legalAidResponseStyle;
        }
      } else if (_isFindHelpMode) {
        sysCtx = _aiState.assistantMode === 'find_help_government' ? _findHelpGovernmentSysCtx()
          : _aiState.assistantMode === 'find_help_mediation' ? _findHelpMediationSysCtx()
          : _findHelpNavigatorSysCtx();
      } else if (_aiState.assistantMode === 'legal_help') {
        
        
        
        
        
        sysCtx = 'You are a legal information assistant for LCDJP, a Ugandan digital justice platform. '
          + 'You ONLY answer general legal information questions for citizens: explaining laws, legal rights, '
          + 'legal processes and procedures, how to access legal aid, what documents are needed for legal matters, '
          + 'and similar informational topics. '
          + 'You must NOT ask the user to describe a crime, incident, or emergency, and you must NOT collect '
          + 'details such as what happened, where, when, or information about a victim or suspect. '
          + 'If the user tries to report a crime or emergency, or describes being a victim of or witness to an '
          + 'incident, do not engage with those details, briefly explain that this assistant is for legal '
          + 'information only, and tell them to use the "Report Case" option (or call 999 / 112 if in Uganda -- or their local '
          + 'emergency number if outside Uganda -- for a life-threatening emergency) instead. Then, if relevant, offer to answer any general legal question they might have. '
          + 'Keep responses concise (2-4 sentences) and in plain, easy-to-understand language.';
      } else {
        sysCtx = 'You are an emergency response assistant for LCDJP in Uganda. '
          + 'The user has reported a ' + (_aiState.category || 'general') + ' incident. '
          + 'Incident details: ' + JSON.stringify(_aiState.answers) + '. '
          + 'Provide calm, professional, empathetic assistance. Keep responses concise (2-4 sentences). '
          + 'If the situation is life-threatening remind them to call 999 or 112 immediately if they are in Uganda, or their local emergency number if they are not.';
      }

      _callHuggingFaceBackend(text, sysCtx, true).then(function(reply) {
        var el = document.getElementById(typingId);
        if (el) el.remove();
        if (reply && _isLegalAidMode) {
          _addBotBubble(_legalAidFormatReply(reply), 0);
          _legalAidShowFollowupActions();
        } else if (_isLegalAidMode) {
          _addBotBubble('I\'m having trouble reaching the legal information service right now. Please try again shortly, or contact a local legal aid provider directly.', 0);
        } else if (reply && _isFindHelpMode) {
          _addBotBubble(_findHelpFormatReply(reply), 0);
          if (_aiState.assistantMode === 'find_help_government') { _findHelpShowGovernmentActions(); }
          else if (_aiState.assistantMode === 'find_help_mediation') { _findHelpShowMediationActions(); }
          else { _findHelpShowRouterActions(); }
        } else if (_isFindHelpMode) {
          _addBotBubble('I\'m having trouble reaching the service right now. Please try again shortly, or choose a category below.', 0);
          setTimeout(function () { _showFindHelpMenu(); }, 600);
        } else if (reply) {
          _addBotBubble(reply, 0);
        } else if (_aiState.assistantMode === 'legal_help') {
          _addBotBubble('I\'m having trouble reaching the legal information service right now, so I can\'t give you a considered answer to that. '
            + 'Please try again shortly, or contact a local legal aid provider directly. For crime reports or emergencies, please use the '
            + '<strong>Report Case</strong> option, or call ' + _aiEmergencyInlineHtml() + ' if it\'s life-threatening.', 0);
        } else {
          var _cat = (_aiState.category || '').toLowerCase();
          var _fb = 'I\'m having trouble reaching the assistant right now, so I can\'t review the details you gave me, but here\'s general guidance while you wait: ';
          if (_cat.includes('fire'))    _fb += 'Please evacuate if safe to do so and keep everyone away from the building. ';
          if (_cat.includes('medical')) _fb += 'Keep the patient still and warm, do not give food or water. ';
          if (_cat.includes('crime'))   _fb += 'Do not approach any suspect, your safety is the priority. ';
          if (_cat.includes('missing')) _fb += 'Avoid disturbing the last known location of the missing person. ';
          _fb += 'If life-threatening, call ' + _aiEmergencyInlineHtml() + ' immediately.';
          _addBotBubble(_fb, 0);
        }
      });
      return;
    }

    
    
    
    
    if (_isFindHelpMode) {
      _addUserBubble(text);
      _findHelpRouteFreeText(text);
      return;
    }

    if (_aiState.step === 1) {
      _addUserBubble(text);
      _aiClassifyFreeText(text);
      return;
    }
    if (_aiState.step !== 2) return;
    if (_aiState.qIndex >= _aiCurrentQuestions().length) return;
    if (_aiState.intakeBusy) { input.value = text; return; }
    _addUserBubble(text);
    _aiIntakeTurn(text);
  }
  window.aiSendMessage = aiSendMessage;

  
  
  var _aiLcRecommendedLabels = ['Community Disputes', 'Boundary Dispute', 'Marriage Dispute'];
  
  var _aiPoliceRecommendedLabels = ['Crime Report', 'Accident', 'Road Incident'];

  function _aiRecommendServiceType() {
    var cat = _aiState.category;
    if (!cat) return null;
    if (_aiLcRecommendedLabels.indexOf(cat) !== -1) return 'lc';
    if (_aiPoliceRecommendedLabels.indexOf(cat) !== -1) return 'police';
    if (_aiLegalCaseLabels.indexOf(cat) !== -1) return 'legal_aid';
    return null;
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  var _aiLegalLibrary = {
    'Crime Report':        { lawArea: 'Penal Code Act (Cap 128)', body: 'the Uganda Police Force', recommend: 'police',
      note: 'Criminal matters like theft, assault or burglary are reported directly to the Police, not an LC court.' },
    'Accident':             { lawArea: 'Traffic and Road Safety Act', body: 'Uganda Police (Traffic Department)', recommend: 'police',
      note: 'Road traffic accidents are handled by Police traffic officers, who file the report needed for any insurance or legal follow-up.' },
    'Road Incident':        { lawArea: 'Traffic and Road Safety Act', body: 'Uganda Police (Traffic Department)', recommend: 'police',
      note: 'Road-related incidents fall under Police traffic jurisdiction.' },
    'Family Dispute':       { lawArea: 'Domestic Relations law & the Children Act (Cap 59)', body: 'your Local Council (LC1/LC2)', recommend: 'lc',
      note: 'Domestic and family matters are usually mediated at LC level first, before escalating to the Family Court.' },
    'Land Matter':          { lawArea: 'Land Act (Cap 227) & the Registration of Titles Act', body: 'your Local Council (LC1/LC2)', recommend: 'lc',
      note: 'Most land disputes start with LC mediation; unresolved title or boundary disputes go to the Land Division of the Magistrates/High Court.' },
    'Business Matter':      { lawArea: 'the Contracts Act & Companies Act', body: 'a lawyer, or the Commercial Court', recommend: 'legal_aid',
      note: 'Contract and business disputes are civil matters best guided by a lawyer, with the Commercial Court as the formal venue if needed.' },
    'Community Disputes':   { lawArea: 'the Local Council Courts Act', body: 'your Local Council (LC1)', recommend: 'lc',
      note: 'Neighbour and community disputes fall under LC Court jurisdiction for mediation.' },
    'Inheritance Dispute':  { lawArea: 'the Succession Act (Cap 162)', body: 'a lawyer, or the Administrator General', recommend: 'legal_aid',
      note: 'Inheritance and estate matters are governed by the Succession Act and usually need a lawyer\'s guidance on letters of administration.' },
    'Boundary Dispute':     { lawArea: 'the Land Act (Cap 227)', body: 'your Local Council (LC1/LC2)', recommend: 'lc',
      note: 'Boundary disagreements are typically resolved through LC-level mediation before any surveying or court action.' },
    'Marriage Dispute':     { lawArea: 'the Marriage Act & Divorce Act', body: 'your Local Council (LC1/LC2) or a family lawyer', recommend: 'lc',
      note: 'Marital disputes are usually taken to the LC for mediation first.' },
    'Child Custody':        { lawArea: 'the Children Act (Cap 59)', body: 'a family lawyer, or the Family and Children Court', recommend: 'legal_aid',
      note: 'Custody is decided in the child\'s best interest under the Children Act, and generally needs a lawyer\'s help.' },
    'Debt Recovery':        { lawArea: 'the Contracts Act & Civil Procedure Act', body: 'a lawyer', recommend: 'legal_aid',
      note: 'Recovering money owed is a civil claim -- a lawyer can advise on the Small Claims Procedure for smaller amounts.' },
    'Other Legal Matter':   { lawArea: 'general civil/criminal law', body: 'a lawyer', recommend: 'legal_aid',
      note: 'This doesn\'t fit a specific category above -- a lawyer can advise on the right next step.' }
  };

  function _aiLocalLegalLookup(category) {
    var entry = _aiLegalLibrary[category];
    if (entry) return entry;
    var rec = _aiRecommendServiceType();
    return rec ? { lawArea: null, body: null, recommend: rec, note: null } : null;
  }

  
  
  
  
  
  
  async function _aiSearchLegalLibrary(category, description) {
    var local = _aiLocalLegalLookup(category);
    if (!description) return local;

    var libraryText = Object.keys(_aiLegalLibrary).map(function (k) {
      var e = _aiLegalLibrary[k];
      return k + ': ' + e.lawArea + ' -> handled by ' + e.body + ' (recommend: ' + e.recommend + ')';
    }).join('\n');
    var sysCtx = 'You are consulting LCDJP\'s legal library for a Ugandan justice-and-emergency platform, to work out '
      + 'where a citizen\'s case falls and who it should be reported to. Legal library (case type: relevant law -> handling body '
      + '(recommended channel)):\n' + libraryText + '\n\n'
      + 'The citizen\'s case category is "' + category + '" and they described what happened as: "' + description + '". '
      + 'Using the legal library above as your primary reference, reply in EXACTLY this format and nothing else:\n'
      + 'LAW: <short law/act name>\nBODY: <who typically handles it>\nRECOMMEND: <one of: police, lc, legal_aid>\nNOTE: <one short sentence for the citizen>';

    var reply = null;
    try { reply = await _callHuggingFaceBackend(description, sysCtx); } catch (e) { reply = null; }
    if (!reply) return local ? Object.assign({}, local, { usedFallback: true }) : local;

    var law = (reply.match(/LAW:\s*(.+)/i) || [])[1];
    var body = (reply.match(/BODY:\s*(.+)/i) || [])[1];
    var rec = (reply.match(/RECOMMEND:\s*(police|lc|legal_aid)/i) || [])[1];
    var note = (reply.match(/NOTE:\s*(.+)/i) || [])[1];
    if (!rec) return local ? Object.assign({}, local, { usedFallback: true }) : local;

    return {
      lawArea: law ? law.trim() : (local && local.lawArea),
      body: body ? body.trim() : (local && local.body),
      recommend: rec.toLowerCase(),
      note: note ? note.trim() : (local && local.note)
    };
  }

  
  
  
  
  
  
  
  
  
  
  
  
  var _aiCategoryLabels = _aiCategories.map(function(c) { return c.label; });

  var _aiCategoryKeywords = {
    'Crime Report': ['theft', 'stolen', 'robbed', 'robbery', 'burglary', 'assault', 'attacked', 'crime'],
    'Accident': ['accident', 'crash', 'collision'],
    'Fire Emergency': ['fire', 'burning', 'smoke'],
    'Medical Emergency': ['medical', 'injured', 'injury', 'sick', 'collapsed', 'bleeding', 'unconscious'],
    'Missing Person': ['missing', 'disappeared', "can't find", 'cannot find', 'lost person'],
    'Road Incident': ['road', 'traffic', 'pothole', 'highway'],
    'Vehicle Breakdown': ['breakdown', 'broke down', 'broken down', 'car trouble', 'flat tyre', 'flat tire', 'tow', 'towing', 'engine failure', "won't start", 'wont start', 'stuck on the road', 'stalled', 'garage', 'mechanic'],
    'Family Dispute': ['family', 'husband', 'wife', 'spouse', 'domestic'],
    'Land Matter': ['land', 'plot', 'title deed', 'encroach', 'grabbed my land'],
    'Business Matter': ['business', 'contract', 'supplier', 'partner', 'company'],
    'Community Disputes': ['neighbor', 'neighbour', 'community', 'noise'],
    'Inheritance Dispute': ['inheritance', 'will', 'estate', 'deceased'],
    'Boundary Dispute': ['boundary', 'fence', 'border dispute'],
    'Marriage Dispute': ['marriage', 'divorce', 'separation'],
    'Child Custody': ['custody', 'child support'],
    'Debt Recovery': ['debt', 'owes me', 'loan', 'unpaid', 'money owed']
  };

  function _aiLocalClassify(text) {
    var lower = text.toLowerCase();
    for (var label in _aiCategoryKeywords) {
      var kws = _aiCategoryKeywords[label];
      for (var i = 0; i < kws.length; i++) {
        if (lower.indexOf(kws[i]) !== -1) return label;
      }
    }
    return null;
  }

  async function _aiClassifyFreeText(text) {
    var sysCtx = 'You are triaging an incident report for a Ugandan justice-and-emergency '
      + 'platform. The user just described their situation in free text. Reply with EXACTLY ONE '
      + 'of the following category labels, verbatim and nothing else: '
      + _aiCategoryLabels.join(' | ') + '. '
      + 'If genuinely none of these fit, reply with exactly: NONE';
    var reply = null;
    try { reply = await _callHuggingFaceBackend(text, sysCtx); } catch (e) { reply = null; }
    var matched = null;
    if (reply) {
      var cleaned = reply.trim();
      matched = _aiCategoryLabels.filter(function(l) {
        return l.toLowerCase() === cleaned.toLowerCase();
      })[0] || null;
    }
    if (!matched) matched = _aiLocalClassify(text);

    if (matched) {
      _addBotBubble('That sounds like a <strong>' + _esc(matched) + '</strong> to me. Let\'s go with that.', 200);
      setTimeout(function() { window._aiSelectCat(matched); }, 1400);
    } else {
      _addBotBubble('I\'m not fully sure which category best fits that yet, could you pick one from the list above, or tell me a little more?', 200);
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  function _aiCrimeReportChoice() {
    _setStep(3);
    _addBotBubble(
      'Thanks for the details. Would you like me to <strong>file this as a case</strong> so it can be recorded and followed up, '
      + 'or would you rather just get directions to the nearest <strong>Police</strong> or <strong>LC</strong> station right now?',
      0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#e3f2fd;border-color:#1565c0;color:#1565c0;" onclick="window._aiCrimeReportFileCase()"> File as a Case</button>'
      + '<button class="ai-choice-btn" style="background:#fce4ec;border-color:#c62828;color:#c62828;" onclick="window._aiCrimeReportQuickNearby()"> Just Show Nearby Help</button>'
      + '</div>';
    _addWidget(html, 300);
  }

  window._aiCrimeReportFileCase = function() {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble('File as a Case');
    _aiCollectCaseDetails();
  };

  window._aiCrimeReportQuickNearby = function() {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble('Just Show Nearby Help');
    _setStep(4);
    _addBotBubble('Would you like the nearest Police station or LC office?', 200);
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#fce4ec;border-color:#c62828;color:#c62828;" onclick="window._aiCrimeReportQuickPick(\'police\')"> Police</button>'
      + '<button class="ai-choice-btn" style="background:#e3f2fd;border-color:#1565c0;color:#1565c0;" onclick="window._aiCrimeReportQuickPick(\'lc\')"> Local Council (LC)</button>'
      + '</div>';
    _addWidget(html, 300);
  };

  window._aiCrimeReportQuickPick = function(type) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble(type === 'lc' ? 'Local Council (LC)' : 'Police');
    
    
    
    _addBotBubble('One moment, finding the nearest ' + (type === 'lc' ? 'LC offices' : 'police stations') + ' near you...', 100);
    _aiFetchNearbyServiceProviders(type);
  };

  function _aiCollectCaseDetails() {
    _setStep(3);
    var storedVillage = sessionStorage.getItem('lcdjp_village') || '';
    var storedDistrict = sessionStorage.getItem('lcdjp_district') || '';
    var storedEmail = sessionStorage.getItem('lcdjp_email') || '';
    _addBotBubble('A couple more details so the right office can reach you.', 0);
    var html = ''
      + '<div class="ai-location-form" style="background:#f8f9fa;border:1px solid #ddd;border-radius:10px;padding:14px;margin-left:44px;max-width:420px;">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#555;margin-bottom:4px;">Village</label>'
      + '<input id="aiCaseVillage" type="text" value="' + _esc(storedVillage) + '" placeholder="Village" style="width:100%;padding:8px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#555;margin-bottom:4px;">District</label>'
      + '<input id="aiCaseDistrict" type="text" list="aiCaseDistrictList" value="' + _esc(storedDistrict) + '" placeholder="Start typing your district" autocomplete="off" style="width:100%;padding:8px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<datalist id="aiCaseDistrictList">' + ((typeof regGetDistricts === 'function') ? regGetDistricts() : []).map(function (d) { return '<option value="' + _esc(d) + '">'; }).join('') + '</datalist>'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#555;margin-bottom:4px;">Email' + (storedEmail ? ' <span style="font-weight:400;color:#888;">(from your account &mdash; update if needed)</span>' : '') + '</label>'
      + '<input id="aiCaseEmail" type="email" value="' + _esc(storedEmail) + '" placeholder="you@example.com" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<div id="aiCaseDetailsError" style="display:none;color:#c62828;font-size:11px;margin-bottom:8px;"></div>'
      + '<button class="ai-choice-btn" style="background:#1a4080;color:white;border-color:#1a4080;" onclick="window._aiSubmitCaseDetails()">Continue</button>'
      + '</div>';
    _addWidget(html, 300);
  }

  window._aiSubmitCaseDetails = function () {
    var area = _getChatArea();
    var form = area ? area.querySelector('.ai-location-form') : null;
    var villageEl = document.getElementById('aiCaseVillage');
    var districtEl = document.getElementById('aiCaseDistrict');
    var emailEl = document.getElementById('aiCaseEmail');
    var errEl = document.getElementById('aiCaseDetailsError');

    var village = villageEl ? villageEl.value.trim() : '';
    var districtRaw = districtEl ? districtEl.value.trim() : '';
    var email = emailEl ? emailEl.value.trim() : '';

    if (!village || !districtRaw) {
      if (errEl) { errEl.textContent = 'Please fill in both village and district.'; errEl.style.display = 'block'; }
      return;
    }
    
    
    
    
    
    
    var district = (typeof regFindDistrict === 'function') ? regFindDistrict(districtRaw) : districtRaw;
    if (!district) {
      if (errEl) { errEl.textContent = 'Please pick your district from the list (start typing to see suggestions).'; errEl.style.display = 'block'; }
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (errEl) { errEl.textContent = 'That email address doesn\'t look right -- please check it.'; errEl.style.display = 'block'; }
      return;
    }

    _aiState.answers.village = village;
    _aiState.answers.district = district;
    _aiState.answers.email = email;

    if (form && form.parentElement) form.parentElement.remove();
    _addUserBubble(village + ', ' + district + (email ? ' &mdash; ' + email : ''));
    _aiAskKinAndAttachment();
  };

  
  
  
  
  
  
  
  
  
  function _aiAskKinAndAttachment() {
    _setStep(3);
    _addBotBubble('One last thing before I connect you, it helps to have a next of kin on file for emergencies, and you can attach a supporting photo, video, or document if you have one. Both are optional.', 0);
    var relOptions = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Other'];
    var relHtml = '<option value="">Select Relationship</option>' + relOptions.map(function (r) {
      return '<option value="' + r + '">' + r + '</option>';
    }).join('');
    var html = ''
      + '<div class="ai-kin-form" style="background:#f8f9fa;border:1px solid #ddd;border-radius:10px;padding:14px;margin-left:44px;max-width:420px;">'
      + '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:8px;"> Next of Kin (optional)</div>'
      + '<input id="aiKinName" type="text" placeholder="Full name" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<input id="aiKinPhone" type="tel" placeholder="Phone number" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<input id="aiKinEmail" type="email" placeholder="Email" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<select id="aiKinRelationship" style="width:100%;padding:8px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">' + relHtml + '</select>'
      + '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px;"> Attach a file (optional, max 5MB, one file only)</div>'
      + '<label for="aiAttachFile" id="aiAttachFileLabel" style="display:flex;align-items:center;justify-content:center;min-height:44px;padding:12px;border:2px dashed #ccc;border-radius:8px;text-align:center;cursor:pointer;color:#666;font-size:13px;margin-bottom:10px;box-sizing:border-box;">Choose File</label>'
      + '<input id="aiAttachFile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.wav" style="display:none;" onchange="window._aiOnAttachFileChosen(this)">'
      + '<div style="display:flex;gap:8px;">'
      + '<button class="ai-choice-btn" style="background:#1a4080;color:white;border-color:#1a4080;" onclick="window._aiSubmitKinAndAttachment()">Continue</button>'
      + '<button class="ai-choice-btn" style="background:#f5f5f5;color:#555;border-color:#ccc;" onclick="window._aiSkipKinAndAttachment()">Skip</button>'
      + '</div>'
      + '</div>';
    _addWidget(html, 300);
  }

  
  
  
  window._aiOnAttachFileChosen = function (inputEl) {
    var labelEl = document.getElementById('aiAttachFileLabel');
    if (!labelEl) return;
    var file = inputEl && inputEl.files && inputEl.files[0];
    labelEl.textContent = file ? file.name : 'Choose File';
  };

  window._aiSubmitKinAndAttachment = function () {
    var area = _getChatArea();
    var form = area ? area.querySelector('.ai-kin-form') : null;

    var nameEl = document.getElementById('aiKinName');
    var phoneEl = document.getElementById('aiKinPhone');
    var emailEl = document.getElementById('aiKinEmail');
    var relEl = document.getElementById('aiKinRelationship');
    var fileEl = document.getElementById('aiAttachFile');

    _aiState.kin = {
      name: nameEl ? nameEl.value.trim() : '',
      phone: phoneEl ? phoneEl.value.trim() : '',
      email: emailEl ? emailEl.value.trim() : '',
      relationship: relEl ? relEl.value : ''
    };

    
    
    var file = (fileEl && fileEl.files && fileEl.files[0]) ? fileEl.files[0] : null;

    if (form && form.parentElement) form.parentElement.remove();
    _addUserBubble((_aiState.kin.name || file) ? 'Details provided' : 'Continue');

    if (!file) { _showContactChoice(); return; }

    if (file.size > 5 * 1024 * 1024) {
      _addBotBubble('That file is over the 5MB limit, so I couldn\'t attach it, continuing without it.', 200);
      _showContactChoice();
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      _aiState.attachment = { name: file.name, size: file.size, type: file.type, data: e.target.result };
      _showContactChoice();
    };
    reader.onerror = function () {
      _addBotBubble('I couldn\'t read that file, so I\'m continuing without it.', 200);
      _showContactChoice();
    };
    reader.readAsDataURL(file);
  };

  window._aiSkipKinAndAttachment = function () {
    var area = _getChatArea();
    var form = area ? area.querySelector('.ai-kin-form') : null;
    if (form && form.parentElement) form.parentElement.remove();
    _addUserBubble('Skip');
    _showContactChoice();
  };

  async function _showContactChoice() {
    _setStep(3);
    
    
    
    
    
    
    
    _aiState.chatMode = true;

    
    
    
    
    _addBotBubble('Thank you for providing the details. One moment, checking the legal library to see where this falls...', 200);
    var finding = await _aiSearchLegalLibrary(_aiState.category, _aiState.answers && _aiState.answers.what);
    var recommended = finding ? finding.recommend : null;

    if (finding && (finding.lawArea || finding.note)) {
      var findingHtml = '<div style="background:#f3f6fb;border:1px solid #dbe3f0;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#333;">'
        + (finding.usedFallback ? '<div style="color:#996a00;font-size:11px;margin-bottom:4px;">General guidance for this case type (the assistant couldn\'t analyze your specific details right now):</div>' : '')
        + (finding.lawArea ? '<strong> ' + _esc(finding.lawArea) + '</strong>' + (finding.body ? ', usually handled by ' + _esc(finding.body) : '') + '<br>' : '')
        + (finding.note ? '<span style="color:#555;">' + _esc(finding.note) + '</span>' : '')
        + '</div>';
      _addBotBubble(findingHtml, 0);
    }

    var recLabel = recommended === 'lc' ? 'a Local Council (LC) office'
      : recommended === 'police' ? 'the Police'
      : recommended === 'legal_aid' ? 'a Lawyer' : null;
    var introMsg = recLabel
      ? 'Based on that, this looks like something ' + recLabel + ' would be best placed to help with. Who would you like to reach out to?'
      : 'Who would you like to reach out to for help?';
    _addBotBubble(introMsg, 900);
    function btn(type, bg, border, color, label) {
      var isRec = recommended === type;
      var recBadge = isRec ? ' <span style="background:' + color + ';color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;vertical-align:middle;margin-left:4px;">RECOMMENDED</span>' : '';
      var extraStyle = isRec ? 'box-shadow:0 0 0 2px ' + color + ';' : '';
      return '<button class="ai-choice-btn" style="background:' + bg + '; border-color:' + border + '; color:' + color + ';' + extraStyle + '" onclick="window._aiShowContacts(\'' + type + '\')">' + label + recBadge + '</button>';
    }
    var html = '<div class="ai-choices-row">'
             + btn('legal_aid', '#e8f5e9', '#2e7d32', '#2e7d32', ' Talk to a Lawyer')
             + btn('legal_org', '#fff3e0', '#f57c00', '#e65100', ' Legal Organisation')
             + btn('lc', '#e3f2fd', '#1565c0', '#1565c0', ' Local Council (LC)')
             + btn('police', '#fce4ec', '#c62828', '#c62828', ' Police')
             + '</div>';
    _addWidget(html, 900);
    _addBotBubble('You can also just type any question below, and I\'ll do my best to help, no need to only use the buttons.', 1900);
  }

  window._aiShowContacts = function(type) {
    _aiState.contactType = type;
    _setStep(4);
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    if (type === 'legal_aid') {
      
      
      _addUserBubble('Talk to a Lawyer');
      _aiStartLegalAidMatching();
      return;
    }
    
    
    
    
    
    
    
    
    
    
    
    
    if (type === 'legal_org') {
      _addUserBubble('Legal Organisation');
      
      
      
      
      _aiSubmitCaseForRouting('legal_aid').then(function (filed) {
        if (filed) _addBotBubble('One moment, finding legal organisations that can help...', 100);
      });
      _aiFetchNearbyServiceProviders(type);
      return;
    }
    if (type === 'lc') {
      _addUserBubble('Local Council (LC)');
      _aiPromptLCLocationChoice();
      return;
    }
    _addUserBubble('Police');
    _aiSubmitCaseForRouting(type).then(function (filed) {
      if (filed) _addBotBubble('One moment, finding the nearest police stations near you...', 100);
    });
    _aiFetchNearbyServiceProviders(type);
  };

  function _aiPromptLCLocationChoice() {
    _addBotBubble('Which Local Council should this go to, the one for your current location, or the one for your registered / verification address?', 400);
    var html = '<div class="ai-choices-row" data-ai-lc-location-row="1">'
      + '<button class="ai-choice-btn" style="background:#e3f2fd;border-color:#1565c0;color:#1565c0;" onclick="window._aiChooseLCLocation(\'current\')"> Use My Current Location</button>'
      + '<button class="ai-choice-btn" style="background:#e8f0fe;border-color:#1a4080;color:#1a4080;" onclick="window._aiChooseLCLocation(\'verification\')"> Use My Registered Address</button>'
      + '</div>';
    _addWidget(html, 500);
  }

  window._aiChooseLCLocation = function (choice) {
    var area = _getChatArea();
    var row = area ? area.querySelector('[data-ai-lc-location-row]') : null;
    if (row && row.parentElement) row.parentElement.remove();

    _aiState.lcLocationChoice = choice;

    function proceed() {
      _addUserBubble(choice === 'current' ? 'Use my current location' : 'Use my registered address');
      var location = _aiState.lcLocationOverride || {
        district: sessionStorage.getItem('lcdjp_district') || '',
        subCounty: sessionStorage.getItem('lcdjp_subCounty') || '',
        parish: sessionStorage.getItem('lcdjp_parish') || '',
        village: sessionStorage.getItem('lcdjp_village') || ''
      };
      _aiRouteLCByVillage(location);
    }

    if (choice !== 'current') {
      
      _aiState.lcLocationOverride = null;
      proceed();
      return;
    }

    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I don\'t have access to your current location, so I\'ll use your registered address instead.', 200);
      _aiState.lcLocationOverride = null;
      proceed();
      return;
    }

    _aiGetCurrentPosition(
      function (position) {
        var lat = position.coords.latitude, lng = position.coords.longitude;
        _aiSetUserPosition(lat, lng);
        _aiReverseGeocodeVillage(lat, lng).then(function (loc) {
          if (loc && (loc.village || loc.district)) {
            _aiState.lcLocationOverride = {
              district: loc.district, subCounty: loc.subCounty, parish: loc.parish,
              village: loc.village, source: 'current_gps'
            };
          } else {
            var nearestDistrict = (typeof findNearestDistrict === 'function') ? findNearestDistrict(lat, lng) : '';
            _aiState.lcLocationOverride = nearestDistrict
              ? { district: nearestDistrict, village: '', parish: '', subCounty: '', source: 'current_gps' }
              : null;
          }
          proceed();
        });
      },
      function () {
        _addBotBubble('I couldn\'t access your current location, so I\'ll use your registered address instead.', 300);
        _aiState.lcLocationOverride = null;
        proceed();
      }
    );
  };

  function _aiReverseGeocodeVillage(lat, lng) {
    try {
      return fetch(API_BASE_URL + '/api/map/reverse-geocode?lat=' + lat + '&lng=' + lng)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || data.status !== 'OK') return null;
          return {
            district: data.district || '',
            subCounty: data.sub_county || data.subCounty || '',
            parish: data.parish || '',
            village: data.village || ''
          };
        })
        .catch(function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  function _aiRouteLCByVillage(location) {
    var villageLabel = location && location.village;
    _addBotBubble(
      villageLabel
        ? 'One moment, checking for a registered LC office for <strong>' + _esc(villageLabel) + '</strong>...'
        : 'One moment, checking for a registered LC office for your area...',
      200
    );

    var lookup = (typeof aiFindRegisteredLCForVillage === 'function')
      ? aiFindRegisteredLCForVillage(location)
      : Promise.resolve([]);

    Promise.resolve(lookup).then(function (matches) {
      if (matches && matches.length) {
        _aiOfferMatchedLC(matches, location);
      } else {
        _aiOfferLCFallback(location);
      }
    }).catch(function () {
      _aiOfferLCFallback(location);
    });
  }

  function _aiOfferMatchedLC(matches, location) {
    _aiState.lcCandidates = matches;
    _aiSubmitCaseForRouting('lc').then(function (filed) {
      if (!filed) return;
      var villageLabel = (location && location.village) || 'your village';
      _addBotBubble(
        'Good news, ' + (matches.length === 1 ? 'there is a registered LC office' : 'there are registered LC offices')
        + ' for <strong>' + _esc(villageLabel) + '</strong>. Choose one to forward your case to:',
        200
      );
      var html = '<div class="ai-service-cards" style="padding-left:44px;">';
      matches.forEach(function (lc, idx) {
        var name = ((lc.first_name || lc.firstName || '') + ' ' + (lc.last_name || lc.lastName || '')).trim() || lc.username;
        var locLabel = [lc.village, lc.parish].filter(Boolean).join(', ');
        html += '<div class="ai-contact-card">'
          + '<div class="ai-contact-icon" style="background:#e3f2fd;"></div>'
          + '<div style="flex:1; min-width:0;">'
          + '<div style="font-weight:700; font-size:14px; color:#1a1a2e;">' + _esc(name) + '</div>'
          + '<div style="font-size:12px; color:#666;"> LC Official' + (locLabel ? ' &middot; ' + _esc(locLabel) : '') + '</div>'
          + '</div>'
          + '<button onclick="window._aiSelectLC(' + idx + ')" style="background:#1565c0; color:white; border:none; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;">Select</button>'
          + '</div>';
      });
      html += '</div>';
      _addWidget(html, 300);
    });
  }

  window._aiSelectLC = async function (idx) {
    var lc = _aiState.lcCandidates && _aiState.lcCandidates[idx];
    if (!lc || !_aiState.caseReference) return;
    var area = _getChatArea();
    var cards = area ? area.querySelector('.ai-service-cards') : null;
    if (cards && cards.parentElement) cards.parentElement.remove();
    var name = ((lc.first_name || lc.firstName || '') + ' ' + (lc.last_name || lc.lastName || '')).trim() || lc.username;
    _addUserBubble('Selected ' + name);

    try {
      var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(API_ENDPOINTS.assignHandler(_aiState.caseReference), {
        method: 'PUT', headers: headers, body: JSON.stringify({ handlerType: 'lc', username: lc.username })
      });
      var data = await res.json();
      if (res.ok && data.success) {
        _addBotBubble(
          '<div style="background:#e8f5e9;border:1.5px solid #2e7d32;border-radius:12px;padding:14px 16px;">'
          + '<div style="font-size:13px;font-weight:700;color:#1b5e20;margin-bottom:6px;"> Case sent to your LC</div>'
          + '<div style="font-size:13px;color:#333;">Your case (<strong>' + _esc(_aiState.caseReference) + '</strong>) has been sent to <strong>' + _esc(name) + '</strong>. '
          + 'You\'ll be notified here as soon as they respond.</div>'
          + '</div>', 200
        );
      } else {
        _addBotBubble('That LC office is no longer available (' + _esc(data.error || 'unknown error') + '). Please choose another, or try again.', 200);
      }
    } catch (e) {
      _addBotBubble('Something went wrong sending your case. Please try again.', 200);
    }
  };

  function _aiOfferLCFallback(location) {
    var villageLabel = location && location.village;
    var district = (location && location.district) || '';
    _addBotBubble(
      (villageLabel
        ? 'There is no registered LC for <strong>' + _esc(villageLabel) + '</strong> yet. '
        : 'I couldn\'t find a registered LC for your village. ')
      + 'Local Councils only handle cases from their own village, so I can connect you with the Police nearby instead, or a Lawyer covering your district. Which would you prefer?',
      300
    );
    var html = '<div class="ai-choices-row" data-ai-lc-fallback-row="1">'
      + '<button class="ai-choice-btn" style="background:#fce4ec;border-color:#c62828;color:#c62828;" onclick="window._aiFallbackToPolice()"> Police Near Me</button>'
      + '<button class="ai-choice-btn" style="background:#e8f5e9;border-color:#2e7d32;color:#2e7d32;" onclick="window._aiFallbackToLawyer(\'' + _esc(district) + '\')"> Lawyer' + (district ? ' in ' + _esc(district) : '') + '</button>'
      + '</div>';
    _addWidget(html, 400);
  }

  window._aiFallbackToPolice = function () {
    var area = _getChatArea();
    var row = area ? area.querySelector('[data-ai-lc-fallback-row]') : null;
    if (row && row.parentElement) row.parentElement.remove();
    _addUserBubble('Police Near Me');
    _aiState.contactType = 'police';
    _aiSubmitCaseForRouting('police').then(function (filed) {
      if (filed) _addBotBubble('One moment, finding the nearest police stations in your area...', 100);
    });
    _aiFetchNearbyServiceProviders('police');
  };

  window._aiFallbackToLawyer = function (district) {
    var area = _getChatArea();
    var row = area ? area.querySelector('[data-ai-lc-fallback-row]') : null;
    if (row && row.parentElement) row.parentElement.remove();
    _addUserBubble('Lawyer' + (district ? ' in ' + district : ''));
    _aiState.contactType = 'legal_aid';
    _aiSubmitCaseForRouting('legal_aid').then(function (filed) {
      if (!filed) return;
      _addBotBubble('Searching for lawyers covering ' + (district ? district : 'your district') + '...', 100);
      _aiShowLawyerList(district, _aiState.caseReference, []);
    });
  };

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  async function _aiSubmitCaseForRouting(type) {
    if (_aiState.caseReference) return true;
    var result = null;
    try {
      var payload = _aiBuildCasePayload();
      if (type) payload.routingChoice = type;
      var headers = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(API_ENDPOINTS.aiCaseSubmit, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
      if (res.ok) result = await res.json();
    } catch (e) {  }

    if (!result || !result.success) {
      _addBotBubble('We couldn\'t file your case just now, the connection to JusticeLink may be offline. Please check your connection and try again; nothing has been submitted yet.', 200);
      var retryHtml = '<button class="ai-choice-btn" onclick="window._aiShowContacts(\'' + _esc(type || '') + '\')"> Try Again</button>';
      _addWidget(retryHtml, 300);
      return false;
    }

    _aiState.caseReference = result.caseReference;
    if (typeof window._lcdjpRefreshCitizenCaseData === 'function') {
      window._lcdjpRefreshCitizenCaseData();
    }
    return true;
  }

  
  
  
  
  
  
  
  
  
  
  
  var _aiContactPlaceQueries = {
    'lc':          [{ type: 'local_government_office', label: 'LC Office' }],
    'police':      [{ type: 'police', label: 'Police' }],
    'legal_org':   [{ type: 'lawyer', keyword: 'legal aid organization', label: 'Legal Organisation' }],
    
    
    
    
    'court':       [{ type: 'courthouse', label: 'Court / Tribunal' }],
    'mediation':   [{ keyword: 'mediation center', label: 'Mediation Service' }],
    'community':   [{ keyword: 'community organization', label: 'Community Organization' }]
  };

  function _aiContactTypeLabel(type) {
    return type === 'lc' ? 'LC offices' : type === 'police' ? 'police stations'
      : type === 'court' ? 'courts / tribunals' : type === 'mediation' ? 'mediation services'
      : type === 'community' ? 'community organizations' : 'legal organisations';
  }

  
  
  
  
  
  
  
  
  
  
  
  
  function _aiGetCurrentPosition(onSuccess, onError) {
    if (window._lcdjpUserPosition &&
        isFinite(window._lcdjpUserPosition.lat) && isFinite(window._lcdjpUserPosition.lng)) {
      onSuccess({ coords: { latitude: window._lcdjpUserPosition.lat, longitude: window._lcdjpUserPosition.lng } });
      return;
    }
    if (!navigator.geolocation) { onError(); return; }
    navigator.geolocation.getCurrentPosition(
      onSuccess, onError,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }

  function _aiFetchNearbyServiceProviders(type) {
    var label = _aiContactTypeLabel(type);
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I need location access to find nearby ' + label + '. Please enable location access and try again.', 300);
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        var placeQueries = _aiContactPlaceQueries[type] || [{ type: type, label: label }];

        _aiEmergencyFetchLiveMap(placeQueries, 25000).then(function (places) {
          var results = places.map(function (p) { return _aiPlaceToDirectoryEntity(p, type); }).sort(_aiDistanceSort);
          if (type === 'lc') { _aiState.lcResults = results; }
          else if (type === 'police') { _aiState.policeResults = results; }
          else { _aiState.placeResults = results; }
          if (!results.length) {
            _addBotBubble('I couldn\'t find a nearby ' + label.replace(/s$/, '') + ' yet. You can still reach the national line below.', 200);
            _addBotBubble(
              '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:14px 16px;">'
              + _aiEmergencyButtonHtml999()
              + '</div>', 300
            );
            return;
          }
          _addBotBubble('Here ' + (results.length === 1 ? 'is the nearest' : 'are the nearest') + ' ' + label + '. Would you like directions, or their contact details?', 200);
          _aiEmergencyRenderMerged(results);
        }).catch(function () {
          _addBotBubble('I ran into a problem looking up nearby ' + label + '. Please try again.', 200);
        });
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please enable location access and try again.', 300);
      }
    );
  }

  function _aiDistanceLabel(lat, lng) {
    if (_aiState.userLat == null || _aiState.userLng == null) return '';
    if (typeof cmCalculateDistance !== 'function' || typeof cmFormatDistance !== 'function') return '';
    var km = cmCalculateDistance(_aiState.userLat, _aiState.userLng, Number(lat), Number(lng));
    return cmFormatDistance(km);
  }

  




































  
  
  
  
  var _aiEmergencyPlaceQueries = {
    'Fire Emergency':    [{ type: 'fire_station', label: 'Fire Station' }],
    'Medical Emergency': [{ type: 'hospital', label: 'Hospital' }],
    'Crime Report':      [{ type: 'police', label: 'Police' }],
    'Accident':          [{ type: 'police', label: 'Police' }, { type: 'hospital', label: 'Hospital' }],
    'Road Incident':     [{ type: 'police', label: 'Police' }, { type: 'hospital', label: 'Hospital' }],
    'Missing Person':    [{ type: 'police', label: 'Police' }],
    'Vehicle Breakdown': [{ type: 'car_repair', label: 'Motor Garage' }]
    
    
    
    
  };

  function _aiEmergencyPlaceQueriesFor(category) {
    return _aiEmergencyPlaceQueries[category] || [{ type: 'police', label: 'Police' }, { type: 'local_government_office', label: 'Local Council' }];
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  function _aiCoordInUganda(lat, lng) {
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return true;
    return lat >= -1.6 && lat <= 4.3 && lng >= 29.4 && lng <= 35.1;
  }
  function _aiUserInUganda() {
    var lat = (_aiState && _aiState.userLat != null) ? _aiState.userLat
      : (window._lcdjpUserPosition && window._lcdjpUserPosition.lat);
    var lng = (_aiState && _aiState.userLng != null) ? _aiState.userLng
      : (window._lcdjpUserPosition && window._lcdjpUserPosition.lng);
    return _aiCoordInUganda(lat, lng);
  }

  
  
  
  
  
  
  
  
  
  
  
  
  window._lcdjpOutsideUganda = window._lcdjpOutsideUganda || false;

  function _aiSetUserPosition(lat, lng) {
    if (_aiState) { _aiState.userLat = lat; _aiState.userLng = lng; }
    if (!_aiCoordInUganda(lat, lng)) _aiMarkOutsideUganda();
  }

  function _aiIsKnownOutsideUganda() {
    if (window._lcdjpOutsideUganda) return true;
    if (_aiState && _aiState.locationOutsideUganda) return true;
    return false;
  }

  function _aiMarkOutsideUganda() {
    var alreadyKnown = _aiIsKnownOutsideUganda();
    window._lcdjpOutsideUganda = true;
    if (_aiState) _aiState.locationOutsideUganda = true;
    
    
    
    if (!alreadyKnown && _aiState && _aiState.mode === 'report'
        && typeof _aiBlockReportCaseOutsideUganda === 'function') {
      _aiBlockReportCaseOutsideUganda();
    }
  }

  






  function _aiBlockReportCaseOutsideUganda(label) {
    if (label) _addUserBubble(label);
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _setStep(1);
    _addBotBubble(
      '<div style="background:#fce4ec;border:1.5px solid #c62828;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:13px;font-weight:700;color:#c62828;margin-bottom:6px;"> Report Case isn\'t available outside Uganda</div>'
      + '<div style="font-size:13px;color:#333;">It looks like you\'re currently outside Uganda. LCDJP files cases to Ugandan LC offices, '
      + 'police, and lawyers only, so I can\'t take a case report from here -- please contact your local police or legal services directly. '
      + 'If this is a life-threatening emergency, use Emergency Help below instead.</div>'
      + '</div>', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#e3f2fd; border-color:#1565c0; color:#1565c0;" onclick="window._aiEmergencyOnly()"> Emergency Services Only</button>'
      + '</div>';
    _addWidget(html, 300);
  }
  
  function _aiEmergencyButtonsHtml(size) {
    if (!_aiUserInUganda()) {
      return '<div style="background:#fff3e0;border:1.5px solid #ffb74d;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#7a4a00;max-width:320px;">'
        + 'You appear to be outside Uganda, 999/112 are Uganda\'s emergency numbers and may not work here. Please contact your local emergency services directly.</div>';
    }
    var pad = size === 'small' ? '9px 18px' : '10px 22px';
    var radius = size === 'small' ? '20px' : '24px';
    var font = size === 'small' ? '13px' : '15px';
    return '<a href="tel:999" style="background:#c62828;color:white;text-decoration:none;padding:' + pad + ';border-radius:' + radius + ';font-weight:700;font-size:' + font + ';display:inline-block;"> Call 999</a>'
         + '<a href="tel:112" style="background:#1a237e;color:white;text-decoration:none;padding:' + pad + ';border-radius:' + radius + ';font-weight:700;font-size:' + font + ';display:inline-block;"> Call 112</a>';
  }
  
  function _aiEmergencyButtonHtml999() {
    if (!_aiUserInUganda()) {
      return '<span style="font-size:12.5px;color:#7a4a00;">Outside Uganda, please contact your local emergency services.</span>';
    }
    return '<a href="tel:999" style="background:#c62828;color:white;text-decoration:none;padding:9px 18px;border-radius:20px;font-weight:700;font-size:13px;display:inline-block;"> Call 999</a>';
  }
  
  function _aiEmergencyInlineHtml() {
    if (!_aiUserInUganda()) {
      return 'your local emergency number (999/112 are Uganda-only)';
    }
    return '<a href="tel:999" style="color:#c62828;font-weight:700;">999</a> or <a href="tel:112" style="color:#1a237e;font-weight:700;">112</a>';
  }
  function _aiEmergencyInlinePlain() {
    if (!_aiUserInUganda()) {
      return 'your local emergency number (999/112 are Uganda-only)';
    }
    return '<strong>999</strong> or <strong>112</strong>';
  }

  function _aiEmergencyRoutingChoice(contactType) {
    return (contactType === 'lc' || contactType === 'police' || contactType === 'legal_aid')
      ? contactType
      : 'police';
  }

  
  
  
  
  
  
  
  
  
  
  function _aiImmediateHelpNearby() {
    var placeQueries = [{ type: 'police', label: 'Police' }, { type: 'local_government_office', label: 'Local Council' }];
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _aiShowNationalFallback();
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        _aiEmergencyFetchNearby(placeQueries, 20000, 0);
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please use the number below right away.', 300);
        _aiShowNationalFallback();
      }
    );
  }

  function _aiEmergencyAutoLocate() {
    _setStep(3);
    _aiState.chatMode = true;
    var placeQueries = _aiEmergencyPlaceQueriesFor(_aiState.category);
    _aiState.contactType = (placeQueries[0] && placeQueries[0].type) || 'police';
    
    
    
    

    _addBotBubble('Got it, locating you now to find the nearest help...', 200);

    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I can\'t access location on this device. Please use the number below right away.', 500);
      _aiShowNationalFallback();
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        _aiEmergencyFetchNearby(placeQueries, 20000, 0);
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please enable location access, or use the number below right away.', 500);
        _aiShowNationalFallback();
      }
    );
  }

  
  
  
  
  
  
  
  
  
  var _aiIrrelevantGovOfficeNamePattern = new RegExp(
    '\\b(nssf|social security|surveyors?|surveying|insurance|sacco|' +
    'microfinance|\\bbank\\b|co-?operative|\\blimited\\b|\\bltd\\b|\\bco\\.|' +
    '\\bcompany\\b|enterprises?|ventures?|investments?|properties|' +
    'real estate|solutions|technologies|logistics|\\bmotors\\b|garage|' +
    'hardware|electronics|supermarket|\\bhotel\\b|restaurant|pharmacy|' +
    '\\bclinic\\b|chambers|advocates|law firm|forex|consult(ing|ants)?)\\b',
    'i'
  );

  function _aiIsRelevantGovOfficeName(name) {
    return !_aiIrrelevantGovOfficeNamePattern.test(String(name || ''));
  }

  
  
  
  
  
  function _aiEmergencyFetchLiveMap(placeQueries, placeRadius) {
    if (!placeQueries.length || _aiState.userLat == null) return Promise.resolve([]);
    return loadGoogleMapsSDK().then(function () {
      if (!window.google || !google.maps.places || !google.maps.places.PlacesService) return [];
      var center = { lat: _aiState.userLat, lng: _aiState.userLng };
      var service = _aiGetPlacesService();
      if (!service) return [];
      var pending = placeQueries.map(function (q) {
        return new Promise(function (resolve) {
          var request = { location: center, radius: Math.min(placeRadius, 50000) };
          if (q.type) request.type = q.type;
          if (q.keyword) request.keyword = q.keyword;
          service.nearbySearch(request, function (items, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !items) { resolve([]); return; }
            resolve(items.slice(0, 8).map(function (place) {
              var loc = place.geometry && place.geometry.location;
              return {
                _aiType: 'place',
                _aiPlaceLabel: q.label || 'Nearby Service',
                name: place.name || 'Nearby service',
                address: place.vicinity || '',
                latitude: loc ? loc.lat() : null,
                longitude: loc ? loc.lng() : null,
                place_id: place.place_id || '',
                phone: ''
              };
            }).filter(function (p) {
              if (p.latitude == null || p.longitude == null) return false;
              
              
              
              if (q.type === 'local_government_office' && !_aiIsRelevantGovOfficeName(p.name)) return false;
              return true;
            }));
          });
        });
      });
      return Promise.all(pending).then(function (lists) { return [].concat.apply([], lists); });
    }).catch(function () { return []; });
  }

  function _aiGetPlacesService() {
    if (!window.google || !google.maps.places) return null;
    if (!window._aiPlacesServiceNode) window._aiPlacesServiceNode = document.createElement('div');
    if (!window._aiPlacesService) window._aiPlacesService = new google.maps.places.PlacesService(window._aiPlacesServiceNode);
    return window._aiPlacesService;
  }

  
  
  
  
  
  
  
  function _aiPlaceToDirectoryEntity(place, type) {
    var entity = {
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      place_id: place.place_id,
      phone: '',
      _aiType: type,
      _aiPlaceLabel: place._aiPlaceLabel || (type === 'lc' ? 'LC Office' : type === 'police' ? 'Police' : 'Legal Organisation'),
      _aiSource: 'place'
    };
    if (type === 'lc') { entity.officeName = place.name; } else if (type === 'police') { entity.stationName = place.name; }
    return entity;
  }

  
  
  
  
  
  
  
  
  
  function _aiEmergencyBroadenedQueries(category) {
    var already = _aiEmergencyPlaceQueriesFor(category).map(function (q) { return q.type; });
    var candidates = [{ type: 'police', label: 'Police' }, { type: 'local_government_office', label: 'Local Council' }];
    var next = candidates.filter(function (c) { return already.indexOf(c.type) === -1; });
    return next.length ? next : [{ type: 'police', label: 'Police' }];
  }

  function _aiEmergencyFetchNearby(placeQueries, placeRadius, tier) {
    tier = tier || 0;
    _aiEmergencyFetchLiveMap(placeQueries, placeRadius).then(function (merged) {
      if (merged.length) {
        _aiState.placeResults = merged;
        _aiState.lcResults = [];
        _aiState.policeResults = [];
        _addBotBubble(
          (tier > 0 ? 'Found ' : 'Here ') + (merged.length === 1 ? 'is the nearest help' : 'are the nearest services') + ' I could find. Tap Contact to call, or Directions to get there:',
          200
        );
        _aiEmergencyRenderMerged(merged);
        return;
      }
      if (tier === 0) {
        
        
        
        
        
        _addBotBubble('Nothing nearby yet, widening the search across the district...', 200);
        _aiEmergencyFetchNearby(placeQueries, 50000, 1);
        return;
      }
      if (tier === 1) {
        
        
        
        
        
        
        var broadened = _aiEmergencyBroadenedQueries(_aiState.category);
        _addBotBubble('Nothing specific to that nearby, checking the closest Police post and Local Council office instead...', 200);
        _aiEmergencyFetchNearby(broadened, 50000, 2);
        return;
      }
      
      
      _aiShowNationalFallback();
    });
  }

  function _aiDistanceSort(a, b) {
    if (_aiState.userLat == null || typeof cmCalculateDistance !== 'function') return 0;
    var da = cmCalculateDistance(_aiState.userLat, _aiState.userLng, Number(a.latitude), Number(a.longitude));
    var db = cmCalculateDistance(_aiState.userLat, _aiState.userLng, Number(b.latitude), Number(b.longitude));
    return da - db;
  }

  function _aiEmergencyRenderMerged(merged) {
    merged = merged.slice().sort(_aiDistanceSort);
    setTimeout(function () {
      var area = _getChatArea();
      if (!area) return;
      var wrap = document.createElement('div');
      wrap.className = 'ai-service-cards';
      wrap.style.cssText = 'animation:ai-msg-in 0.3s ease; padding-left:44px;';
      merged.slice(0, 6).forEach(function (entity) {
        var type = entity._aiType;
        var srcList = type === 'lc' ? _aiState.lcResults : (type === 'police' ? _aiState.policeResults : _aiState.placeResults);
        var idx = srcList.indexOf(entity);
        if (idx === -1) return;
        var name = type === 'lc' ? (entity.officeName || 'LC Office')
          : type === 'police' ? (entity.stationName || 'Police Station')
          : (entity.name || 'Nearby Service');
        var address = entity.address || entity.jurisdiction || entity.jurisdictionArea || '';
        var distLabel = _aiDistanceLabel(entity.latitude, entity.longitude);
        var typeLabel = type === 'lc' ? 'LC Office' : type === 'police' ? 'Police' : (entity._aiPlaceLabel || 'Nearby');
        var iconBg = type === 'lc' ? '#e3f2fd' : type === 'police' ? '#fce4ec' : '#e8f5e9';
        var contactBg = type === 'lc' ? '#5c6bc0' : type === 'police' ? '#e53935' : '#2e7d32';
        var dirColor = type === 'lc' ? '#1a237e' : type === 'police' ? '#c62828' : '#1b5e20';
        var dirBorder = type === 'lc' ? '#c5cae9' : type === 'police' ? '#ffcdd2' : '#c8e6c9';
        var card = document.createElement('div');
        card.className = 'ai-contact-card';
        card.innerHTML =
          '<div class="ai-contact-icon" style="background:' + iconBg + ';"></div>'
          + '<div style="flex:1; min-width:0;">'
          + '<div style="font-weight:700; font-size:14px; color:#1a1a2e; margin-bottom:2px;">' + _esc(name)
          + ' <span style="font-size:10px;font-weight:700;color:#888;">&middot; ' + typeLabel + '</span></div>'
          + '<div style="font-size:12px; color:#666;"> ' + _esc(address) + (distLabel ? ' &middot; ' + _esc(distLabel) : '') + '</div>'
          + '</div>'
          + '<div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">'
          + '<button onclick="window._aiContactDirect(\'' + type + '\',' + idx + ')" style="background:' + contactBg + '; color:white; border:none; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;"> Contact</button>'
          + '<button onclick="window._aiViewDirections(\'' + type + '\',' + idx + ')" style="background:white; color:' + dirColor + '; border:1.5px solid ' + dirBorder + '; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;"> Directions</button>'
          + '</div>';
        wrap.appendChild(card);
      });
      area.appendChild(wrap);
      _scrollBottom();
      _addBotBubble(
        '<div style="padding-left:44px;font-size:12px;color:#888;">Still in danger? '
        + _aiEmergencyInlineHtml() + ' is always available too.</div>',
        200
      );
      _addBotBubble('You can also just type any more details below, and I\'ll keep helping, no need to wait.', 1400);
    }, 900);
  }

  
  
  
  
  function _aiShowNationalFallback() {
    _addBotBubble(
      '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:14px 16px;">'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
      + _aiEmergencyButtonsHtml('large')
      + '</div>'
      + '</div>', 400
    );
  }

  function _aiEntityFor(type, idx) {
    if (type === 'lc') return _aiState.lcResults[idx];
    if (type === 'police') return _aiState.policeResults[idx];
    return _aiState.placeResults[idx];
  }

  function _aiRenderContactCard(name, address, phone, noPhoneNote, placeId) {
    var phonePlain = (phone || '').replace(/\s/g, '');
    var contactButton = phone
      ? '<a href="tel:' + phonePlain + '" style="background:#1a237e;color:white;text-decoration:none;padding:9px 18px;border-radius:20px;font-weight:700;font-size:13px;display:inline-block;"> ' + _esc(phone) + '</a>'
      : (placeId
        ? '<a href="https://www.google.com/maps/place/?q=place_id:' + encodeURIComponent(placeId) + '" target="_blank" rel="noopener" style="background:#eef0f8;color:#1a237e;text-decoration:none;padding:9px 18px;border-radius:20px;font-weight:700;font-size:13px;display:inline-block;"> Open in Maps</a>'
        : '<span style="font-size:13px;color:#888;">' + noPhoneNote + '</span>');
    _addBotBubble(
      '<div style="background:#f5f7ff;border:1.5px solid #1a4080;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">' + _esc(name) + '</div>'
      + '<div style="font-size:13px;color:#555;margin-bottom:12px;"> ' + _esc(address) + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + contactButton
      + _aiEmergencyButtonHtml999()
      + '</div>'
      + '<div style="margin-top:10px;font-size:12px;color:#888;">For urgent life-threatening emergencies, ' + (_aiUserInUganda() ? 'always call <strong>999</strong> or <strong>112</strong>.' : 'contact your local emergency services.') + '</div>'
      + '</div>',
      0
    );
  }

  window._aiContactDirect = function(type, idx) {
    var entity = _aiEntityFor(type, idx);
    if (!entity) return;

    
    
    
    
    
    
    
    
    
    
    

    var name = type === 'lc' ? (entity.officeName || 'LC Office')
      : type === 'police' ? (entity.stationName || 'Police Station')
      : (entity.name || 'Nearby service');
    var address = entity.address || entity.jurisdiction || entity.jurisdictionArea || '';
    var noPhoneNote = type === 'lc' ? 'No phone number on file for this office.'
      : type === 'police' ? 'No phone number on file for this station.'
      : 'No phone number on file for this service.';

    if (entity.phone) { _aiRenderContactCard(name, address, entity.phone, noPhoneNote, entity.place_id); return; }

    
    
    
    
    
    if (entity.place_id) {
      var service = _aiGetPlacesService();
      if (service) {
        service.getDetails(
          { placeId: entity.place_id, fields: ['formatted_phone_number', 'international_phone_number'] },
          function (details, status) {
            var phone = (status === google.maps.places.PlacesServiceStatus.OK && details)
              ? (details.formatted_phone_number || details.international_phone_number || '')
              : '';
            entity.phone = phone;
            _aiRenderContactCard(name, address, phone, noPhoneNote, entity.place_id);
          }
        );
        return;
      }
    }
    _aiRenderContactCard(name, address, '', noPhoneNote, entity.place_id);
  };

  window._aiViewDirections = function(type, idx) {
    var entity = _aiEntityFor(type, idx);
    if (!entity) return;
    var name = type === 'lc' ? (entity.officeName || 'LC Office')
      : type === 'police' ? (entity.stationName || 'Police Station')
      : (entity.name || 'Nearby Service');
    var address = entity.address || entity.jurisdiction || entity.jurisdictionArea || '';
    if (Number.isFinite(Number(entity.latitude)) && Number.isFinite(Number(entity.longitude))
        && typeof window._lcdjpGetDirectionsInApp === 'function') {
      window._lcdjpGetDirectionsInApp(
        Number(entity.latitude), Number(entity.longitude), name, 'WALKING'
      );
      _addBotBubble(
        '<div style="color:#1b5e20;font-weight:600;">Drawing an in-app route to '
        + _esc(name) + '.</div>', 0
      );
      return;
    }
    var distLabel = _aiDistanceLabel(entity.latitude, entity.longitude);
    _addBotBubble(
      '<div style="background:#e8f5e9;border:1.5px solid #43a047;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:4px;"> ' + _esc(name) + '</div>'
      + '<div style="font-size:13px;color:#555;margin-bottom:12px;"> ' + _esc(address) + (distLabel ? ' · ' + _esc(distLabel) + ' away' : '') + '</div>'
      + '<div style="font-size:12px;color:#777;">The in-app map is still loading. Please try Directions again shortly.</div>'
      + '</div>',
      0
    );
  };

  









  
  
  
  
  var _aiStructuredAnswerKeys = ['village', 'district', 'email'];

  function _aiBuildCasePayload() {
    var uname = sessionStorage.getItem('lcdjp_username') || '';
    var answers = _aiState.answers || {};
    var descriptionParts = [];
    Object.keys(answers).forEach(function (q) {
      if (answers[q] && _aiStructuredAnswerKeys.indexOf(q) === -1) descriptionParts.push(q + ': ' + answers[q]);
    });
    var kin = _aiState.kin || {};
    
    
    var attachment = _aiState.attachment || null;
    
    
    
    
    
    
    
    
    
    var _lcOverride = _aiState.lcLocationOverride || null;
    var _district = (_lcOverride && _lcOverride.district) || answers.district || sessionStorage.getItem('lcdjp_district') || '';
    var _subCounty = (_lcOverride && _lcOverride.subCounty) || sessionStorage.getItem('lcdjp_subCounty') || '';
    var _parish = (_lcOverride && _lcOverride.parish) || sessionStorage.getItem('lcdjp_parish') || '';
    var _village = (_lcOverride && _lcOverride.village) || answers.village || sessionStorage.getItem('lcdjp_village') || '';
    
    
    
    
    
    var _fullLocation = [_village, _parish, _subCounty, _district]
      .filter(function (part) { return part && part.trim(); })
      .join(', ');
    return {
      caseType: _aiState.category || 'General',
      citizenId: uname,
      description: descriptionParts.join(' | ') || (_aiState.category || 'General case reported via AI Assistant'),
      district: _district,
      subCounty: _subCounty,
      parish: _parish,
      village: _village,
      fullLocation: _fullLocation,
      citizenPhone: sessionStorage.getItem('lcdjp_phone') || '',
      
      
      
      
      citizenEmail: answers.email || sessionStorage.getItem('lcdjp_email') || '',
      kinName: kin.name || '',
      kinPhone: kin.phone || '',
      kinEmail: kin.email || '',
      kinRelationship: kin.relationship || '',
      attachedMedia: attachment ? attachment.name : '',
      attachedFileData: attachment ? attachment.data : '',
      
      
      
      
      
      
      
      
      
      
      
      attachedFileSize: attachment ? attachment.size : 0,
      attachedFileType: attachment ? attachment.type : '',
      
      
      
      
      routingChoice: _aiState.contactType || '',
      lcLocationChoice: _aiState.lcLocationChoice || '',
      lcLocationSource: _lcOverride ? _lcOverride.source : (_aiState.lcLocationChoice === 'verification' ? 'verification' : '')
    };
  }

  
  
  
  
  function _aiSuggestLegalOrg(caseRef) {
    var refLabel = caseRef ? ' (<strong>' + _esc(caseRef) + '</strong>)' : '';

    function runSearch() {
      var placeQueries = _aiContactPlaceQueries['legal_org'];
      _aiEmergencyFetchLiveMap(placeQueries, 25000).then(function (places) {
        var results = places.map(function (p) { return _aiPlaceToDirectoryEntity(p, 'legal_org'); }).sort(_aiDistanceSort);
        _aiState.placeResults = results;
        if (!results.length) {
          _addBotBubble(
            '<div style="background:#fff3e0;border:1.5px solid #f57c00;border-radius:12px;padding:14px 16px;">'
            + '<div style="font-size:13px;font-weight:700;color:#e65100;margin-bottom:6px;"> No legal organisation found nearby</div>'
            + '<div style="font-size:13px;color:#333;">We couldn\'t find a legal aid organisation near you' + refLabel + ' right now. '
            + 'Please try again later, or contact your nearest LC office or the Uganda Law Society for assistance.</div>'
            + '</div>', 200
          );
          return;
        }
        _addBotBubble(
          (caseRef ? 'None of the matched lawyers were able to take your case' + refLabel + ' right now. ' : '')
          + 'Here ' + (results.length === 1 ? 'is a nearby legal organisation' : 'are nearby legal organisations') + ' that may be able to help:',
          200
        );
        _aiEmergencyRenderMerged(results);
      }).catch(function () {
        _addBotBubble('I ran into a problem looking up legal organisations near you. Please try again.', 200);
      });
    }

    if (_aiState.userLat != null && _aiState.userLng != null) { runSearch(); return; }
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I need location access to find legal organisations near you. Please enable location access and try again.', 300);
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        runSearch();
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please enable location access and try again.', 300);
      }
    );
  }

  window._aiStartLegalAidMatching = async function () {
    
    
    
    
    
    
    
    if (!(await _aiFetchFreshVerifStatus())) {
      _aiPromptVerificationRequired(_aiState.category || 'this');
      return;
    }

    var username = (typeof getLcdjpActiveUsername === 'function') ? getLcdjpActiveUsername() : (sessionStorage.getItem('lcdjp_username') || '');

    
    
    
    
    
    
    if (username) {
      try {
        var statusHeaders = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
        var statusResp = await fetch(API_ENDPOINTS.citizenLegalAidStatus(username, _aiState.category), { headers: statusHeaders });
        if (statusResp.ok) {
          var statusData = await statusResp.json();
          if (statusData && statusData.hasActiveCase) {
            _aiState._pendingOldCase = statusData; 
            _addBotBubble(
              'You have an open request, case <strong>' + _esc(statusData.case_reference) + '</strong>, that hasn\'t been picked up yet. '
              + 'Is this new report about that same issue, or a separate matter?',
              0
            );
            var choiceHtml = '<div class="ai-choices-row">'
                 + '<button class="ai-choice-btn" onclick="window._aiResumeOrStartNew(true)">Continue that case</button>'
                 + '<button class="ai-choice-btn" onclick="window._aiResumeOrStartNew(false)">File a new, separate case</button>'
                 + '</div>';
            _addWidget(choiceHtml, 200);
            return;
          }
        }
      } catch (e) {  }
    }

    _addBotBubble('I can help connect you with a lawyer registered on the system. Would you like me to do that?', 0);
    var html = '<div class="ai-choices-row">'
             + '<button class="ai-choice-btn" style="background:#e8f5e9; border-color:#2e7d32; color:#2e7d32;" onclick="window._aiLegalAidConsent(true)">Yes, connect me</button>'
             + '<button class="ai-choice-btn" style="background:#f5f5f5; border-color:#999; color:#555;" onclick="window._aiLegalAidConsent(false)">No thanks</button>'
             + '</div>';
    _addWidget(html, 200);
  };

  
  
  
  
  
  
  
  
  
  window._aiResumeOrStartNew = async function(continueOld) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();

    var statusData = _aiState._pendingOldCase;
    delete _aiState._pendingOldCase;

    if (continueOld && statusData) {
      _addUserBubble('Continue that case');
      _aiState.caseReference = statusData.case_reference;
      _aiState.category = statusData.case_type || _aiState.category;
      var declinedSoFar = (statusData.declined_lawyers || '').split(',').map(function(s){return s.trim();}).filter(Boolean);

      var _priorAdvice = (typeof aiEvaluatePreviousAdvice === 'function') ? aiEvaluatePreviousAdvice(statusData) : null;
      if (_priorAdvice) {
        _addBotBubble(
          (_priorAdvice.advisorRole || 'The previous handler') +
          (_priorAdvice.advisorName ? ' (' + _esc(_priorAdvice.advisorName) + ')' : '') +
          ' forwarded this case back with this note: &ldquo;' + _esc(_priorAdvice.adviceText) + '&rdquo;',
          0
        );
        _addBotBubble(
          _priorAdvice.agreesWithAdvice
            ? 'That matches what this case usually needs, so I\'ll search with that in mind.'
            : _priorAdvice.reasoning,
          250
        );
      }

      _addBotBubble('Continuing with case <strong>' + _esc(statusData.case_reference) + '</strong>. Let\'s find you another lawyer for it.', _priorAdvice ? 500 : 0);
      _aiShowLawyerList(statusData.district, statusData.case_reference, declinedSoFar);
      return;
    }

    _addUserBubble('File a new, separate case');
    _aiState.caseReference = null;
    _addBotBubble('Understood, I\'ll file this as a new, separate case. Would you like me to connect you with a lawyer for it?', 0);
    var html = '<div class="ai-choices-row">'
             + '<button class="ai-choice-btn" style="background:#e8f5e9; border-color:#2e7d32; color:#2e7d32;" onclick="window._aiLegalAidConsent(true)">Yes, connect me</button>'
             + '<button class="ai-choice-btn" style="background:#f5f5f5; border-color:#999; color:#555;" onclick="window._aiLegalAidConsent(false)">No thanks</button>'
             + '</div>';
    _addWidget(html, 200);
  };

  window._aiLegalAidConsent = async function(accepted) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble(accepted ? 'Yes, connect me' : 'No thanks');

    if (!accepted) {
      await _aiSuggestLegalOrg(null);
      return;
    }

    var regDistrict = sessionStorage.getItem('lcdjp_district') || '';
    _addBotBubble(
      'Which district should I search for a lawyer, your current location, or '
      + (regDistrict ? 'your registration district (<strong>' + _esc(regDistrict) + '</strong>)' : 'your registration district') + '?',
      200
    );
    var html = '<div class="ai-choices-row">'
             + '<button class="ai-choice-btn" onclick="window._aiPickDistrict(\'current\')"> Current location</button>'
             + '<button class="ai-choice-btn" onclick="window._aiPickDistrict(\'registration\')"> Registration district</button>'
             + '</div>';
    _addWidget(html, 300);
  };

  window._aiPickDistrict = async function(choice) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble(choice === 'current' ? 'Current location' : 'Registration district');

    var district = '';
    if (choice === 'registration') {
      district = sessionStorage.getItem('lcdjp_district') || '';
      if (!district) {
        _addBotBubble('I don\'t have a registration district on file for you, using your current location instead.', 200);
        choice = 'current';
      }
    }
    if (choice === 'current') {
      _addBotBubble('Finding your current district…', 200);
      district = await _aiResolveCurrentDistrict();
      if (!district) {
        _addBotBubble('I couldn\'t determine your current district. Please enable location access and try again.', 300);
        return;
      }
    }
    _aiFindAndOfferLawyers(district);
  };

  function _aiResolveCurrentDistrict() {
    return new Promise(function(resolve) {
      if (!navigator.geolocation && !window._lcdjpUserPosition) { resolve(null); return; }
      _aiGetCurrentPosition(
        function (position) {
          fetch(API_BASE_URL + '/api/map/reverse-geocode?lat=' + position.coords.latitude + '&lng=' + position.coords.longitude)
            .then(function (r) { return r.json(); })
            .then(function (data) { resolve(data && data.district ? data.district : null); })
            .catch(function () { resolve(null); });
        },
        function () { resolve(null); }
      );
    });
  }

  async function _aiFindAndOfferLawyers(district) {
    _addBotBubble('Filing your case and searching for lawyers in <strong>' + _esc(district) + '</strong>…', 200);
    var payload = _aiBuildCasePayload();
    payload.district = district;
    var caseResult = null;
    try {
      var headers = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(API_ENDPOINTS.aiCaseSubmit, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
      if (res.ok) caseResult = await res.json();
    } catch (e) {  }

    if (!caseResult || !caseResult.success) {
      _addBotBubble('We couldn\'t reach the case system just now. Please try again shortly.', 300);
      return;
    }
    _aiState.caseReference = caseResult.caseReference;
    
    
    if (typeof window._lcdjpRefreshCitizenCaseData === 'function') {
      window._lcdjpRefreshCitizenCaseData();
    }
    _aiShowLawyerList(district, caseResult.caseReference, []);
  }

  
  
  
  
  
  
  
  
  
  var _aiLawyerSearchHadError = false;

  async function _aiFetchLawyersDb(district, specialization) {
    try {
      var url = API_ENDPOINTS.lawyersSearch(district, specialization);
      var res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        console.warn('[AI Lawyer Search] /api/map/lawyers returned ' + res.status + ' (district=' + district + ', specialization=' + specialization + ')');
        _aiLawyerSearchHadError = true;
        return [];
      }
      var data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[AI Lawyer Search] /api/map/lawyers request failed:', e && e.message);
      _aiLawyerSearchHadError = true;
      return [];
    }
  }

  
  
  
  
  function _aiSameDistrict(a, b) {
    return !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  
  
  
  
  
  function _aiListHasDistrict(list, district) {
    if (!district) return false;
    return list.some(function (d) { return _aiSameDistrict(d, district); });
  }

  
  
  
  
  
  function _aiExcludeLawyers(lawyers, excludeUsernames) {
    if (!excludeUsernames || !excludeUsernames.length) return lawyers;
    return lawyers.filter(function (l) { return excludeUsernames.indexOf(l.username) === -1; });
  }

  async function _aiSearchLawyersTiered(district, caseType, excludeUsernames) {
    excludeUsernames = excludeUsernames || [];
    _aiLawyerSearchHadError = false;

    
    
    
    
    
    
    var normalizedDistrict = (district && typeof regFindDistrict === 'function')
      ? (regFindDistrict(district) || district)
      : district;

    var specialization = (typeof determineLawyerSpecialization === 'function')
      ? determineLawyerSpecialization(caseType) : null;

    
    if (normalizedDistrict) {
      var districtMatch = specialization ? await _aiFetchLawyersDb(normalizedDistrict, specialization) : [];
      var districtMatchAvail = _aiExcludeLawyers(districtMatch, excludeUsernames);
      if (districtMatchAvail.length) return { lawyers: districtMatchAvail, tier: 'district', district: normalizedDistrict };
      var districtAny = await _aiFetchLawyersDb(normalizedDistrict, null);
      var districtAnyAvail = _aiExcludeLawyers(districtAny, excludeUsernames);
      if (districtAnyAvail.length) return { lawyers: districtAnyAvail, tier: 'district', district: normalizedDistrict };
    }

    
    
    
    if (normalizedDistrict && typeof UGANDA_REGION_MAP === 'object') {
      var region = null;
      for (var r in UGANDA_REGION_MAP) {
        if (_aiListHasDistrict(UGANDA_REGION_MAP[r], normalizedDistrict)) { region = r; break; }
      }
      if (region) {
        var regionDistricts = UGANDA_REGION_MAP[region];
        var poolSpec = specialization ? await _aiFetchLawyersDb(null, specialization) : [];
        var regionMatchSpec = poolSpec.filter(function (l) {
          return _aiListHasDistrict(regionDistricts, l.district) && !_aiSameDistrict(l.district, normalizedDistrict);
        });
        var regionMatchSpecAvail = _aiExcludeLawyers(regionMatchSpec, excludeUsernames);
        if (regionMatchSpecAvail.length) return { lawyers: regionMatchSpecAvail, tier: 'region', region: region };

        var poolAny = await _aiFetchLawyersDb(null, null);
        var regionMatchAny = poolAny.filter(function (l) {
          return _aiListHasDistrict(regionDistricts, l.district) && !_aiSameDistrict(l.district, normalizedDistrict);
        });
        var regionMatchAnyAvail = _aiExcludeLawyers(regionMatchAny, excludeUsernames);
        if (regionMatchAnyAvail.length) return { lawyers: regionMatchAnyAvail, tier: 'region', region: region };
      }
    }

    
    var nationalSpec = specialization ? await _aiFetchLawyersDb(null, specialization) : [];
    var nationalSpecAvail = _aiExcludeLawyers(nationalSpec, excludeUsernames);
    if (nationalSpecAvail.length) return { lawyers: nationalSpecAvail, tier: 'national' };
    var nationalAny = await _aiFetchLawyersDb(null, null);
    var nationalAnyAvail = _aiExcludeLawyers(nationalAny, excludeUsernames);
    if (nationalAnyAvail.length) return { lawyers: nationalAnyAvail, tier: 'national' };

    return { lawyers: [], tier: 'none', hadError: _aiLawyerSearchHadError };
  }

  function _aiShowLawyerList(district, caseReference, excludeUsernames) {
    var caseType = (_aiState.answers && (_aiState.answers.category || _aiState.category)) || _aiState.category;
    _aiSearchLawyersTiered(district, caseType, excludeUsernames).then(async function (result) {
        var lawyers = result.lawyers || [];
        if (!lawyers.length) {
          if (result.hadError) {
            _addBotBubble('I ran into a problem reaching the lawyer directory just now. Please try again in a moment.', 200);
            return;
          }
          
          
          
          
          
          
          
          
          
          
          
          
          
          try {
            var routeHeaders = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
            var routeRes = await fetch(API_ENDPOINTS.aiCaseRoute(caseReference), {
              method: 'POST', headers: routeHeaders, body: JSON.stringify({ choice: 'legal_aid' })
            });
            var routeData = routeRes.ok ? await routeRes.json() : null;
            if (routeData && routeData.matched) {
              _addBotBubble('Good news, a lawyer just became available and your case (<strong>' + _esc(caseReference) + '</strong>) has been sent to them. You\'ll be notified as soon as they respond.', 200);
              return;
            }
          } catch (e) {  }
          _addBotBubble('There\'s no available lawyer for this case right now, anywhere in the system.', 200);
          _aiSuggestLegalOrg(caseReference);
          return;
        }
        
        
        
        lawyers.sort(function (a, b) {
          return (Number(a.active_count) || 0) - (Number(b.active_count) || 0);
        });
        _aiState.lawyerCandidates = lawyers;
        var effectiveDistrict = result.district || district;
        var areaLabel = result.tier === 'district' ? effectiveDistrict
          : result.tier === 'region' ? ('the ' + result.region + ' region')
          : 'the country';
        _addBotBubble(
          'Here ' + (lawyers.length === 1 ? 'is a lawyer' : 'are lawyers') + ' ' + (result.tier === 'district' ? 'in' : 'from') + ' <strong>' + _esc(areaLabel) + '</strong>'
          + (result.tier !== 'district' && effectiveDistrict ? (', none were available in <strong>' + _esc(effectiveDistrict) + '</strong> itself') : '')
          + '. Choose one to forward your case to:',
          200
        );
        var html = '<div class="ai-service-cards" style="padding-left:44px;">';
        lawyers.forEach(function (l, idx) {
          var name = ((l.first_name || l.firstName || '') + ' ' + (l.last_name || l.lastName || '')).trim() || l.username;
          var spec = l.lawyer_specialization || l.lawyerSpecialization || 'General Practice';
          var locLabel = l.district || '';
          html += '<div class="ai-contact-card">'
            + '<div class="ai-contact-icon" style="background:#e3f2fd;"></div>'
            + '<div style="flex:1; min-width:0;">'
            + '<div style="font-weight:700; font-size:14px; color:#1a1a2e;">' + _esc(name) + '</div>'
            + '<div style="font-size:12px; color:#666;"> ' + _esc(spec) + (locLabel ? ' &middot; ' + _esc(locLabel) : '') + '</div>'
            + '</div>'
            + '<button onclick="window._aiSelectLawyer(' + idx + ')" style="background:#1a4080; color:white; border:none; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;">Select</button>'
            + '</div>';
        });
        html += '</div>';
        _addWidget(html, 300);
      })
      .catch(function () {
        _addBotBubble('I ran into a problem searching for lawyers. Please try again.', 200);
      });
  }

  window._aiSelectLawyer = async function (idx) {
    var lawyer = _aiState.lawyerCandidates && _aiState.lawyerCandidates[idx];
    if (!lawyer || !_aiState.caseReference) return;
    var area = _getChatArea();
    var cards = area ? area.querySelector('.ai-service-cards') : null;
    if (cards && cards.parentElement) cards.parentElement.remove();
    var name = ((lawyer.first_name || lawyer.firstName || '') + ' ' + (lawyer.last_name || lawyer.lastName || '')).trim() || lawyer.username;
    _addUserBubble('Selected ' + name);

    try {
      var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(API_ENDPOINTS.offerCaseToLawyer(_aiState.caseReference, lawyer.username), {
        method: 'PUT', headers: headers
      });
      var data = await res.json();
      if (res.ok && data.success) {
        _addBotBubble(
          '<div style="background:#e8f5e9;border:1.5px solid #2e7d32;border-radius:12px;padding:14px 16px;">'
          + '<div style="font-size:13px;font-weight:700;color:#1b5e20;margin-bottom:6px;"> Case forwarded</div>'
          + '<div style="font-size:13px;color:#333;">Your case (<strong>' + _esc(_aiState.caseReference) + '</strong>) has been sent to <strong>' + _esc(name) + '</strong>. '
          + 'You\'ll be notified here as soon as they respond. If they\'re unable to take it, just reopen the Assistant and I\'ll help you pick someone else for the same case.</div>'
          + '</div>', 200
        );
      } else {
        _addBotBubble('That lawyer is no longer available (' + _esc(data.error || 'unknown error') + '). Please choose another from the list, or reopen the Assistant.', 200);
      }
    } catch (e) {
      _addBotBubble('Something went wrong sending your case. Please try again.', 200);
    }
  };

  

  
  
  
  function openFindMoreAssistance(caseReference, caseType, district) {
    if (!caseReference) return;
    _aiLockBodyScroll();
    _aiState = { step: 4, category: caseType || null, qIndex: 0, answers: {}, contactType: null,
      chatMode: true, assistantMode: 'more_help', mode: 'report', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [],
      caseReference: caseReference, lawyerCandidates: [] };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(4);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) input.value = '';
    _addBotBubble(
      'Let\'s find more help for your case <strong>' + _esc(caseReference) + '</strong>. Searching for available options...',
      0
    );
    setTimeout(function () { _aiShowLawyerList(district || null, caseReference, []); }, 1200);
  }
  window.openFindMoreAssistance = openFindMoreAssistance;





























  var _aiScrollLockY = 0;
  var _aiScrollLocked = false;
  function _aiLockBodyScroll() {
    if (_aiScrollLocked) return; 
    _aiScrollLocked = true;
    if (typeof window.lockScroll === 'function') window.lockScroll();
    _aiScrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = (-_aiScrollLockY) + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function _aiUnlockBodyScroll() {
    if (!_aiScrollLocked) return; 
    _aiScrollLocked = false;
    if (typeof window.unlockScroll === 'function') window.unlockScroll();
    if (window._lcdjpScrollLockCount > 0) return; 
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, _aiScrollLockY);
  }

  function openAIAssistant(preCategory, mode) {
    
    
    
    
    
    
    
    mode = mode || 'all';
    if (mode === 'report' && typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
      if (typeof showFeatureUnavailableMessage === 'function') {
        showFeatureUnavailableMessage('Reporting a case is not available at this time.');
      }
      return;
    }
    _aiLockBodyScroll();
    _aiState = { step: 0, category: preCategory || null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'incident', mode: mode, userLat: null, userLng: null, lcResults: [], policeResults: [], placeResults: [],
      caseReference: null, lawyerCandidates: [] };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      
      
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth; 
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) input.value = '';
    _aiState.chatMode = false;  
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    var catLabel = preCategory ? ' with a <strong>' + _esc(preCategory) + '</strong>' : '';
    var introRole = mode === 'report' ? 'Report Case Assistant' : 'Emergency Assistant';
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '! <br>'
      + 'I\'m your ' + introRole + '. I\'m here to help you' + catLabel + '.<br><br>'
      + '<span style="font-size:13px; color:#666;">For life-threatening emergencies, please call ' + _aiEmergencyInlinePlain() + ' immediately.</span>',
      0
    );
    
    
    
    
    
    
    
    
    if (mode === 'report' && _aiIsKnownOutsideUganda()) {
      setTimeout(function() { _aiBlockReportCaseOutsideUganda(null); }, 1800);
      return;
    }
    if (mode === 'report' && !preCategory && !_aiIsCitizenVerified() && !_lawyerRoleAllowed()) {
      setTimeout(function() { _setStep(1); _aiPromptVerificationRequired(null); }, 1800);
      return;
    }
    if (preCategory) {
      
      setTimeout(function() { window._aiSelectCat(preCategory); }, 1800);
    } else {
      setTimeout(function() { _showCategories(mode); }, 1800);
    }
  }
  window.openAIAssistant = openAIAssistant;

  
  
  
  
  window.openEmergencyAssistant = function(preCategory) { openAIAssistant(preCategory, 'emergency'); };
  window.openReportCaseAssistant = function(preCategory) { openAIAssistant(preCategory, 'report'); };

  









  function openLegalHelpAssistant() {
    _aiLockBodyScroll();
    _aiState = { step: 4, category: 'Legal Help', qIndex: 0, answers: {}, contactType: null,
      chatMode: true, assistantMode: 'legal_help', userLat: null, userLng: null, lcResults: [], policeResults: [], placeResults: [],
      caseReference: null, lawyerCandidates: [] };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(4);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Ask a legal question...'; }
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '! <br>'
      + 'I\'m your Legal Help Assistant. Ask me any general legal question, your rights, legal processes, '
      + 'documents you need, or how to get legal aid.<br><br>'
      + '<span style="font-size:13px; color:#666;">I can\'t take crime reports or emergency details here, for those, '
      + 'please use <strong>Report Case</strong>, or call ' + _aiEmergencyInlinePlain() + ' for a life-threatening emergency.</span>',
      0
    );
  }
  window.openLegalHelpAssistant = openLegalHelpAssistant;

  



















  var LEGAL_AID_DISCLAIMER = 'Legal Aid provides general legal information and guidance. It does not replace advice or representation from a qualified lawyer or legal professional. For matters requiring professional legal assistance, you can use JusticeLink to find appropriate help.';

  var _legalAidRightsCategories = [
    'Police and Arrest', 'Criminal Matters', 'Land and Property', 'Employment',
    'Family and Marriage', 'Domestic Violence', 'Child Protection', 'Contracts',
    'Debt and Financial Disputes', 'Consumer Complaints', 'Human Rights', 'Local Council Matters'
  ];

  var _legalAidComplaintQuestions = [
    { key: 'what', text: 'What happened? Please describe the incident briefly.' },
    { key: 'when', text: 'When did it happen?' },
    { key: 'where', text: 'Where did it happen?' },
    { key: 'who', text: 'Who was involved?' },
    { key: 'affected', text: 'Who was affected?' },
    { key: 'witnesses', text: 'Were there any witnesses? If so, who? (or type "none")' },
    { key: 'evidence', text: 'Do you have any documents or evidence? Briefly describe them (or type "none").' },
    { key: 'reportedBefore', text: 'Have you already reported this matter to anyone (e.g. police, an LC office)?' },
    { key: 'outcome', text: 'What outcome are you seeking?' }
  ];

  
  
  
  
  var _legalAidEmergencyPatterns = [
    /attack(ing|ed)? me/i, /being attacked/i, /he'?s attacking/i, /she'?s attacking/i,
    /trying to kill/i, /has a (gun|knife|weapon)/i, /pointing a (gun|knife)/i,
    /immediate danger/i, /right now.*(help|danger|attack)/i, /(fire|burning) (in|at) my/i,
    /house is on fire/i, /not breathing/i, /unconscious/i, /heart attack/i,
    /bleeding (badly|heavily|a lot)/i, /overdose/i, /going to (kill|hurt) (myself|herself|himself)/i,
    /missing (child|kid|daughter|son)\b.*(now|today|hours? ago)/i, /kidnap/i
  ];

  function _legalAidCheckEmergency(text) {
    return _legalAidEmergencyPatterns.some(function (re) { return re.test(text); });
  }

  function _legalAidShowEmergencyRedirect() {
    _addBotBubble(
      '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:15px;font-weight:700;color:#c62828;margin-bottom:10px;"> This sounds urgent</div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
      + _aiEmergencyButtonsHtml('large')
      + '</div>'
      + '<div style="font-size:13px;color:#555;">Legal Aid is for general legal information, not emergencies. Please use <strong>Report Case</strong> now so this can be routed for immediate help.</div>'
      + '</div>', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#c62828;border-color:#c62828;color:white;" onclick="window._legalAidGoToReportCase()"> Report This Case Now</button>'
      + '</div>';
    _addWidget(html, 200);
  }

  window._legalAidGoToReportCase = function () {
    _addUserBubble('Report This Case Now');
    
    
    
    
    if (typeof openEmergencyAssistant === 'function') openEmergencyAssistant();
    else if (typeof openAIAssistant === 'function') openAIAssistant(undefined, 'emergency');
  };

  function _legalAidFormatReply(reply) {
    var text = _esc(reply || '');
    
    
    ['WHAT THIS MEANS', 'YOUR POSSIBLE OPTIONS', 'WHAT YOU MAY NEED', 'WHAT TO DO NEXT', 'WHEN TO SEEK PROFESSIONAL HELP'].forEach(function (h) {
      text = text.replace(new RegExp(h, 'g'), '<strong>' + h + '</strong>');
    });
    return text.replace(/\n/g, '<br>');
  }

  var _legalAidResponseStyle = 'Format your answer using these section headers where relevant (skip a header if it does not apply): '
    + 'WHAT THIS MEANS / YOUR POSSIBLE OPTIONS / WHAT YOU MAY NEED / WHAT TO DO NEXT / WHEN TO SEEK PROFESSIONAL HELP. '
    + 'Avoid unnecessary legal jargon. Keep it concise and in plain, easy-to-understand language. '
    + 'Never claim to be a lawyer and never state legal outcomes with false certainty. '
    + 'If the answer genuinely depends on facts you do not have, ask a brief follow-up question instead of guessing.';

  
  
  
  function _legalAidShowFollowupActions() {
    
    
    
    
    var hasOpenCase = !!_aiState.caseReference;
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + (hasOpenCase
          ? '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._aiLegalAidResumeFromHub()"> Find Me A Lawyer</button>'
          : '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._legalAidReportThisCase()"> Report This Case</button>')
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._legalAidFindHelp()"> Find Legal Help</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  
  
  
  
  
  async function _aiFetchLegalAidCaseStatus(username) {
    if (!username) return null;
    try {
      var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
      var resp = await fetch(API_ENDPOINTS.citizenLegalAidStatus(username), { headers: headers });
      if (!resp.ok) return null;
      var data = await resp.json();
      return (data && data.hasActiveCase) ? data : null;
    } catch (e) { return null; }
  }

  
  
  window._aiLegalAidResumeFromHub = function () {
    _addUserBubble('Find Me A Lawyer');
    _aiStartLegalAidMatching();
  };

  async function openLegalAidHub(startMode) {
    _aiLockBodyScroll();
    _aiState = {
      step: 0, category: null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'legal_aid_menu', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [], caseReference: null, lawyerCandidates: [],
      legalAid: { complaintIndex: 0 }
    };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Describe your legal problem...'; }
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '! I\'m <strong>Legal Aid</strong>.<br>'
      + '<span style="font-size:12px;color:#666;">' + LEGAL_AID_DISCLAIMER + '</span>',
      0
    );
    if (startMode === 'rights') {
      setTimeout(function () { window._legalAidSelect('rights'); }, 1400);
      return;
    }

    
    
    
    var existingCaseStatus = await _aiFetchLegalAidCaseStatus(uname);
    var menuDelay = 1400, hintDelay = 1900;
    if (existingCaseStatus) {
      _aiState.caseReference = existingCaseStatus.case_reference;
      menuDelay = 3600; hintDelay = 4100;
      setTimeout(function () {
        _addBotBubble(
          'You already have an open case, <strong>' + _esc(existingCaseStatus.case_reference) + '</strong>, that hasn\'t been picked up by a lawyer yet. '
          + 'Would you like me to look for one now?',
          1400
        );
        var html = '<div class="ai-choices-row">'
          + '<button class="ai-choice-btn" style="background:#e8f5e9; border-color:#2e7d32; color:#2e7d32;" onclick="window._aiLegalAidResumeFromHub()"> Find Me A Lawyer</button>'
          + '</div>';
        _addWidget(html, 1600);
      }, 1400);
    }
    setTimeout(function () { _showLegalAidMenu(); }, menuDelay);
    setTimeout(function () {
      _addBotBubble('Pick an option below, or just describe your legal problem in your own words below, for example, "My landlord has refused to return my deposit. What can I do?"', 0);
    }, hintDelay);
  }
  window.openLegalAidHub = openLegalAidHub;

  function _showLegalAidMenu() {
    var opts = [
      { label: 'Ask for Legal Guidance', key: 'guidance' },
      { label: 'Know Your Rights', key: 'rights' },
      { label: 'Explain a Legal Document', key: 'document' },
      { label: 'Prepare a Complaint', key: 'complaint' },
      { label: 'Find Legal Help', key: 'findHelp' },
      { label: 'Understand My Case', key: 'myCase' },
      { label: 'Legal Terms', key: 'terms' }
    ];
    var html = '<div id="aiCategoryGrid">';
    opts.forEach(function (o) {
      html += '<button class="ai-cat-btn" onclick="window._legalAidSelect(\'' + o.key + '\')">' + _esc(o.label) + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  window._legalAidSelect = function (key) {
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();

    if (key === 'guidance') return _legalAidStartGuidance();
    if (key === 'rights') return _legalAidShowRightsCategories();
    if (key === 'document') return _legalAidStartDocument();
    if (key === 'complaint') return _legalAidStartComplaint();
    if (key === 'findHelp') return window._legalAidFindHelp();
    if (key === 'myCase') return _legalAidStartMyCase();
    if (key === 'terms') return _legalAidStartTerms();
  };

  
  function _legalAidStartGuidance() {
    _addUserBubble('Ask for Legal Guidance');
    _aiState.assistantMode = 'legal_aid_guidance';
    _aiState.chatMode = true;
    _aiState.category = 'Legal Aid Guidance';
    _aiState.answers = {};
    _setStep(2);
    _addBotBubble('Go ahead and describe your legal problem, for example, "What are my rights if I am arrested?" or "My landlord is refusing to return my deposit."', 0);
    var input = document.getElementById('aiTextInput');
    if (input) input.focus();
  }

  
  
  
  
  window._legalAidReportThisCase = function () {
    _addUserBubble('Report This Case');
    var transcriptEl = _getChatArea();
    var userLines = [];
    if (transcriptEl) {
      transcriptEl.querySelectorAll('.ai-bubble-wrap.user .ai-bubble.user').forEach(function (b) {
        if (b.textContent) userLines.push(b.textContent.trim());
      });
    }
    _aiState.category = _aiState.category || 'Legal Aid';
    _aiState.answers = { issue: userLines[0] || '', details: userLines.join(' | ') };
    _addBotBubble('Thanks, I\'ll carry this into Report Case so you can review the details and submit when ready.', 200);
    setTimeout(function () { _aiCollectCaseDetails(); }, 1200);
  };

  
  function _legalAidShowRightsCategories() {
    _addUserBubble('Know Your Rights');
    _aiState.assistantMode = 'legal_aid_rights';
    _aiState.category = 'Know Your Rights';
    _setStep(2);
    _addBotBubble('Which area would you like to know about?', 0);
    var html = '<div id="aiCategoryGrid">';
    _legalAidRightsCategories.forEach(function (c) {
      html += '<button class="ai-cat-btn" onclick="window._legalAidSelectRightsCategory(\'' + c.replace(/'/g, "\\'") + '\')">' + _esc(c) + '</button>';
    });
    html += '</div>';
    _addWidget(html, 200);
  }

  window._legalAidSelectRightsCategory = function (category) {
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    _addUserBubble(category);
    _aiState.chatMode = true;
    _aiState.answers = { category: category };
    var typingId = 'ai-typing-' + Date.now();
    var area2 = _getChatArea();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area2) { area2.appendChild(typingWrap); _scrollBottom(); }

    var sysCtx = 'You are the "Know Your Rights" section of Legal Aid, a legal information assistant for LCDJP, a Ugandan digital justice platform. '
      + 'The citizen selected the category "' + category + '". Explain, for this category: basic rights, common procedures, possible next steps, '
      + 'documents or evidence that may be useful, which authority typically handles this (e.g. police, LC office, courts), and when professional legal '
      + 'assistance may be necessary. ' + _legalAidResponseStyle;

    _callHuggingFaceBackend('Tell me about my rights regarding: ' + category, sysCtx).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (reply) {
        _addBotBubble(_legalAidFormatReply(reply), 0);
      } else {
        _addBotBubble('I\'m having trouble reaching the legal information service right now. Please try again shortly, or contact a local legal aid provider directly.', 0);
      }
      _legalAidShowFollowupActions();
      _addBotBubble('You can ask a follow-up question about "' + _esc(category) + '" below, or pick another right/topic.', 600);
    });
  };

  
  function _legalAidStartDocument() {
    _addUserBubble('Explain a Legal Document');
    _aiState.assistantMode = 'legal_aid_document';
    _aiState.category = 'Explain a Legal Document';
    _setStep(2);
    _addBotBubble(
      'You can upload a plain text (.txt) file, or simply paste/type the text of the document below, and I\'ll help explain it. '
      + '<span style="font-size:12px;color:#666;">I only read the file to answer your question, it is not stored.</span>', 0
    );
    var html = '<div style="padding-left:44px;">'
      + '<input id="legalAidDocFile" type="file" accept=".txt,text/plain" style="font-size:13px;">'
      + '</div>';
    _addWidget(html, 300);
    setTimeout(function () {
      var fileEl = document.getElementById('legalAidDocFile');
      if (fileEl) {
        fileEl.onchange = function () {
          var file = fileEl.files && fileEl.files[0];
          if (!file) return;
          if (!/\.txt$|^text\/plain$/i.test(file.type) && !/\.txt$/i.test(file.name)) {
            _addBotBubble('I can only read plain .txt files directly right now. Please paste the document\'s text into the message box instead.', 0);
            return;
          }
          var reader = new FileReader();
          reader.onload = function (e) { _legalAidExplainDocumentText(e.target.result, file.name); };
          reader.onerror = function () { _addBotBubble('I couldn\'t read that file. Please try pasting the text instead.', 0); };
          reader.readAsText(file);
        };
      }
    }, 350);
    _aiState.chatMode = true;
    _aiState.assistantMode = 'legal_aid_document_paste';
  }

  function _legalAidExplainDocumentText(text, fileName) {
    _addUserBubble('Uploaded: ' + fileName);
    _legalAidExplainDocumentCommon(text);
  }

  function _legalAidExplainDocumentCommon(text) {
    var typingId = 'ai-typing-' + Date.now();
    var area = _getChatArea();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }

    var sysCtx = 'You are the "Explain a Legal Document" tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
      + 'The citizen has provided the text of a document below. Explain: what type of document it appears to be, its important sections, '
      + 'any important dates or deadlines, apparent obligations, important clauses, and things the citizen may need to clarify with a lawyer. '
      + 'This is general information only, not a legally binding interpretation, say so plainly. ' + _legalAidResponseStyle
      + '\n\nDOCUMENT TEXT:\n' + String(text).slice(0, 6000);

    _callHuggingFaceBackend('Please explain this document.', sysCtx).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (reply) {
        _addBotBubble(_legalAidFormatReply(reply) + '<br><br><span style="font-size:11px;color:#888;">' + LEGAL_AID_DISCLAIMER + '</span>', 0);
      } else {
        _addBotBubble('I\'m having trouble reaching the legal information service right now. Please try again shortly.', 0);
      }
      _legalAidShowFollowupActions();
    });
  }

  
  function _legalAidStartComplaint() {
    _addUserBubble('Prepare a Complaint');
    _aiState.assistantMode = 'legal_aid_complaint';
    _aiState.category = 'Legal Aid Complaint';
    _aiState.chatMode = false;
    _aiState.legalAid = { complaintIndex: 0, complaintAnswers: {} };
    _setStep(2);
    _addBotBubble('I\'ll ask a few questions to help you prepare a complaint. You\'ll be able to review and edit everything before anything is submitted.', 0);
    setTimeout(_legalAidAskComplaintQ, 1200);
  }

  function _legalAidAskComplaintQ() {
    var idx = _aiState.legalAid.complaintIndex;
    if (idx >= _legalAidComplaintQuestions.length) return _legalAidShowComplaintSummary();
    _addBotBubble(_legalAidComplaintQuestions[idx].text, 0);
    var input = document.getElementById('aiTextInput');
    if (input) { input.placeholder = 'Type your answer...'; input.focus(); }
  }

  window._legalAidAnswerComplaintQ = function (text) {
    var idx = _aiState.legalAid.complaintIndex;
    var q = _legalAidComplaintQuestions[idx];
    _addUserBubble(text);
    _aiState.legalAid.complaintAnswers[q.key] = text;
    _aiState.legalAid.complaintIndex++;
    setTimeout(_legalAidAskComplaintQ, 500);
  };

  function _legalAidShowComplaintSummary() {
    var a = _aiState.legalAid.complaintAnswers;
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    var today = new Date().toLocaleDateString();
    var draft = 'COMPLAINT SUMMARY\n\n'
      + 'Complainant: ' + (uname || '') + '\n'
      + 'Date: ' + today + '\n'
      + 'Location: ' + (a.where || '') + '\n'
      + 'Person/Organisation involved: ' + (a.who || '') + '\n'
      + 'Description of incident: ' + (a.what || '') + (a.when ? (' (When: ' + a.when + ')') : '') + '\n'
      + 'Affected: ' + (a.affected || '') + '\n'
      + 'Evidence available: ' + (a.evidence || '') + '\n'
      + 'Witnesses: ' + (a.witnesses || '') + '\n'
      + 'Previously reported: ' + (a.reportedBefore || '') + '\n'
      + 'Requested action: ' + (a.outcome || '');
    _addBotBubble('Here\'s a draft based on what you told me. Please review it below and edit anything that isn\'t right before continuing.', 0);
    var html = '<div style="padding-left:44px;max-width:460px;">'
      + '<textarea id="legalAidComplaintDraft" style="width:100%;min-height:220px;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:12.5px;font-family:monospace;box-sizing:border-box;">' + _esc(draft) + '</textarea>'
      + '<div style="display:flex;gap:8px;margin-top:8px;">'
      + '<button class="ai-choice-btn" style="background:#1a4080;color:white;border-color:#1a4080;" onclick="window._legalAidConfirmComplaint()"> Report This Case</button>'
      + '<button class="ai-choice-btn" onclick="window._legalAidFindHelp()"> Find Legal Help Instead</button>'
      + '</div></div>';
    _addWidget(html, 300);
  }

  window._legalAidConfirmComplaint = function () {
    var draftEl = document.getElementById('legalAidComplaintDraft');
    var edited = draftEl ? draftEl.value : '';
    var a = _aiState.legalAid.complaintAnswers || {};
    var area = _getChatArea();
    var box = area ? area.querySelector('#legalAidComplaintDraft') : null;
    if (box && box.closest('div') && box.parentElement.parentElement) box.parentElement.parentElement.remove();
    _addUserBubble('Report This Case');

    
    
    
    
    _aiState.category = 'Legal Aid Complaint';
    _aiState.answers = {
      what: a.what || '', where: a.where || '', when: a.when || '',
      who: a.who || '', affected: a.affected || '', witnesses: a.witnesses || '',
      evidence: a.evidence || '', reportedBefore: a.reportedBefore || '',
      outcome: a.outcome || '', complaintDraft: edited
    };
    _addBotBubble('Thanks, I\'ll carry these details into Report Case so you can finish reviewing and submit when ready.', 200);
    setTimeout(function () { _aiCollectCaseDetails(); }, 1200);
  };

  
  
  
  
  
  window._lcdjpShowLegalAidOnMap = function () {
    if (typeof closeAIAssistant === 'function') closeAIAssistant();
    var section = document.getElementById('cmMobileMapSection');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () {
      var chip = section.querySelector('.cm-map-chip[onclick*="legalAid"]');
      if (chip && typeof window.cmMapFilter === 'function') {
        window.cmMapFilter({ currentTarget: chip }, 'legalAid');
      }
    }, 350);
  };

  
  window._legalAidFindHelp = function () {
    _addUserBubble('Find Legal Help');
    _aiState.assistantMode = 'legal_aid_findhelp';
    _aiState.category = 'Find Legal Help';
    _aiState.chatMode = true;
    _addBotBubble('One moment, looking for legal organisations near you...', 0);
    
    
    _aiSuggestLegalOrg(null);
    setTimeout(function () {
      var html2 = '<div class="ai-choices-row">'
        + '<button class="ai-choice-btn" onclick="window._lcdjpShowLegalAidOnMap()"> View All On Map</button>'
        + '</div>';
      _addWidget(html2, 100);
    }, 1200);
    setTimeout(function () {
      _addBotBubble('While you wait, you can also type a legal question below and I\'ll answer it from our Legal Knowledge library.', 0);
      var input = document.getElementById('aiTextInput');
      if (input) { input.placeholder = 'Type your legal question...'; input.focus(); }
    }, 1700);
  };

  
  async function _legalAidStartMyCase() {
    _addUserBubble('Understand My Case');
    _aiState.assistantMode = 'legal_aid_mycase';
    _setStep(2);
    var username = (typeof getLcdjpActiveUsername === 'function') ? getLcdjpActiveUsername() : (sessionStorage.getItem('lcdjp_username') || '');
    if (!username || typeof API_ENDPOINTS === 'undefined' || typeof API_ENDPOINTS.citizenCases !== 'function') {
      _addBotBubble('Please sign in to view your case information.', 0);
      return;
    }
    _addBotBubble('One moment, pulling up your case information...', 0);
    try {
      var res = await fetch(API_ENDPOINTS.citizenCases(username), { headers: getAuthHeaders() });
      var data = res.ok ? await res.json() : null;
      var cases = data && data.success && Array.isArray(data.cases) ? data.cases : (Array.isArray(data) ? data : []);
      if (!cases.length) {
        _addBotBubble('You don\'t currently have any cases on file. If you\'d like, I can help you report one.', 400);
        _legalAidShowFollowupActions();
        return;
      }
      if (cases.length === 1) {
        _legalAidExplainCase(cases[0]);
        return;
      }
      var html = '<div style="padding-left:44px;display:flex;flex-direction:column;gap:6px;max-width:400px;">';
      cases.forEach(function (c, i) {
        var ref = c.caseReference || c.caseNumber || c.id || ('Case ' + (i + 1));
        var type = c.case_type || c.caseType || '';
        html += '<button class="ai-choice-btn" style="text-align:left;" onclick=\'window._legalAidPickCase(' + i + ')\'>' + _esc(String(ref)) + (type ? ', ' + _esc(type) : '') + '</button>';
      });
      html += '</div>';
      _aiState._legalAidCases = cases;
      _addBotBubble('You have a few cases on file. Which one would you like me to explain?', 300);
      _addWidget(html, 400);
    } catch (e) {
      _addBotBubble('I couldn\'t load your case information right now. Please try again shortly, or use My Cases to view it directly.', 400);
    }
  }

  window._legalAidPickCase = function (idx) {
    var c = (_aiState._legalAidCases || [])[idx];
    if (!c) return;
    var ref = c.caseReference || c.caseNumber || c.id || '';
    _addUserBubble(String(ref));
    _legalAidExplainCase(c);
  };

  async function _legalAidExplainCase(c) {
    var typingId = 'ai-typing-' + Date.now();
    var area = _getChatArea();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }

    
    
    
    var caseData = {
      reference: c.caseReference || c.caseNumber || c.id || '',
      type: c.case_type || c.caseType || '',
      status: c.status || c.caseStatus || '',
      stage: c.stage || c.currentStage || '',
      district: c.district || '', description: c.description || '',
      dateSubmitted: c.dateSubmitted || c.createdAt || c.date || '',
      pendingActions: c.pendingActions || c.requestedDocuments || '',
      legalAdvice: c.legal_advice || c.legalAdvice || ''
    };
    var sysCtx = 'You are the "Understand My Case" tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
      + 'Below is the ONLY information available about this citizen\'s case. Explain, in plain language: the current status, what the current '
      + 'stage means, any pending actions or documents needed, and what the citizen may need to do next. '
      + 'You must NOT invent or guess any case status, date, decision, document, official, or outcome that is not present below, if something '
      + 'is not present, say it is not currently on record instead of guessing. ' + _legalAidResponseStyle
      + '\n\nCASE DATA (JSON, authoritative and complete for this case):\n' + JSON.stringify(caseData);

    _callHuggingFaceBackend('Please explain my case.', sysCtx).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (reply) {
        _addBotBubble(_legalAidFormatReply(reply), 0);
      } else {
        _addBotBubble('Status: ' + _esc(caseData.status || 'not currently on record') + '. Stage: ' + _esc(caseData.stage || 'not currently on record') + '. For full details, please use My Cases.', 0);
      }
      _aiState.chatMode = true;
      _aiState.assistantMode = 'legal_aid_mycase_chat';
      _addBotBubble('You can ask me a follow-up question about this case below.', 500);
    });
  }

  
  function _legalAidStartTerms() {
    _addUserBubble('Legal Terms');
    _aiState.assistantMode = 'legal_aid_terms';
    _aiState.category = 'Legal Terms';
    _aiState.chatMode = true;
    _setStep(2);
    _addBotBubble('Ask me what any legal term means, for example "What does bail mean?" or "What is an affidavit?"', 0);
    var examples = ['Bail', 'Mediation', 'Summons', 'Affidavit', 'Statement'];
    var html = '<div class="ai-choices-row">' + examples.map(function (t) {
      return '<button class="ai-choice-btn" onclick="window._legalAidAskTerm(\'' + t + '\')">' + t + '</button>';
    }).join('') + '</div>';
    _addWidget(html, 300);
  }

  window._legalAidAskTerm = function (term) {
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = 'What does ' + term.toLowerCase() + ' mean?'; }
    aiSendMessage();
  };

  




















  var _findHelpCategories = [
    { key: 'courts',       label: 'Courts & Tribunals',                desc: 'Find the appropriate court or tribunal and learn where to access it.' },
    { key: 'localCouncil', label: 'Local Council Services',             desc: 'Find the relevant local council office or service.' },
    { key: 'government',   label: 'Government Services',                desc: 'Find the government office or department responsible for a service.' },
    { key: 'mediation',    label: 'Mediation & Dispute Resolution',     desc: 'Find appropriate mediation or dispute-resolution services.' },
    { key: 'community',    label: 'Community & Support Organizations',  desc: 'Find relevant community organizations and support services.' },
    { key: 'justicelink',  label: 'JusticeLink Services',               desc: 'Find a JusticeLink office, service point, or available JusticeLink service.' },
    { key: 'notSure',      label: 'Not Sure Where to Go?',              desc: 'Describe your situation and let JusticeLink help identify the right place to go.' }
  ];

  function openFindHelpHub() {
    _aiLockBodyScroll();
    _aiState = { step: 0, category: null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'find_help_menu', mode: 'find_help', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [], caseReference: null, lawyerCandidates: [] };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Describe what you need help with...'; }
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '. I\'m <strong>JusticeLink Find Help</strong>.',
      0
    );
    _addBotBubble(
      'I can help you identify the right service, office, institution, or organization to contact. Choose an option below, or describe what you need help with in your own words.',
      600
    );
    setTimeout(function () { _showFindHelpMenu(); }, 1800);
  }
  window.openFindHelpHub = openFindHelpHub;

  function _showFindHelpMenu() {
    _aiState.assistantMode = 'find_help_menu';
    _aiState.chatMode = false;
    var html = '<div id="aiCategoryGrid">';
    _findHelpCategories.forEach(function (c) {
      html += '<button class="ai-cat-btn" title="' + _esc(c.desc) + '" onclick="window._findHelpSelect(\'' + c.key + '\')">'
        + '<span class="ai-cat-icon">' + '</span>' + _esc(c.label) + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  window._findHelpSelect = function (key) {
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    var cat = _findHelpCategories.filter(function (c) { return c.key === key; })[0];
    if (!cat) return;
    _addUserBubble(cat.label);
    _aiState.category = cat.label;
    if (key === 'courts')       return _findHelpLocationLookup('court', 'Courts & Tribunals', 'court or tribunal');
    if (key === 'localCouncil') return _findHelpLocationLookup('lc', 'Local Council Services', 'local council office');
    if (key === 'community')    return _findHelpLocationLookup('community', 'Community & Support Organizations', 'community or support organization');
    if (key === 'mediation')    return _findHelpMediation();
    if (key === 'justicelink')  return _findHelpJusticeLinkServices();
    if (key === 'government')   return _findHelpStartGovernment();
    if (key === 'notSure')      return _findHelpStartNavigator();
  };

  
  
  
  
  
  
  
  
  function _findHelpLocationLookup(type, categoryLabel, serviceNoun) {
    _aiState.assistantMode = 'find_help_location';
    _aiState.chatMode = false;
    _setStep(2);
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _findHelpNoLocation(type, categoryLabel, serviceNoun);
      return;
    }
    _addBotBubble('One moment, looking for a nearby verified ' + serviceNoun + '...', 0);
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        _findHelpRunSearch(type, categoryLabel, serviceNoun);
      },
      function () { _findHelpNoLocation(type, categoryLabel, serviceNoun); }
    );
  }

  function _findHelpNoLocation(type, categoryLabel, serviceNoun) {
    _addBotBubble(
      'I need your location to find a nearby ' + serviceNoun + '. You can enable location access, or set your location on the map.',
      300
    );
    var esc = function (s) { return _esc(s).replace(/'/g, "\\'"); };
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" onclick="window._findHelpOpenMapPicker(\'' + type + '\',\'' + esc(categoryLabel) + '\',\'' + esc(serviceNoun) + '\')"> Set My Location</button>'
      + '<button class="ai-choice-btn" onclick="window._findHelpRetryLocation(\'' + type + '\',\'' + esc(categoryLabel) + '\',\'' + esc(serviceNoun) + '\')"> Try Again</button>'
      + '</div>';
    _addWidget(html, 400);
  }

  window._findHelpOpenMapPicker = function (type, categoryLabel, serviceNoun) {
    if (typeof openMapPicker === 'function') openMapPicker();
  };

  window._findHelpRetryLocation = function (type, categoryLabel, serviceNoun) {
    _addUserBubble('Try Again');
    _findHelpLocationLookup(type, categoryLabel, serviceNoun);
  };

  function _findHelpRunSearch(type, categoryLabel, serviceNoun) {
    var placeQueries = _aiContactPlaceQueries[type] || [];
    _aiEmergencyFetchLiveMap(placeQueries, 25000).then(function (places) {
      var results = places.map(function (p) { return _aiPlaceToDirectoryEntity(p, type); }).sort(_aiDistanceSort);
      if (type === 'lc') { _aiState.lcResults = results; } else { _aiState.placeResults = results; }
      if (!results.length) {
        _findHelpNoResults(serviceNoun);
        return;
      }
      _addBotBubble(
        'Here ' + (results.length === 1 ? 'is the nearest verified ' + serviceNoun : 'are the nearest verified ' + serviceNoun + 's')
        + ' I could find. Tap Contact or Directions below.', 200
      );
      _aiEmergencyRenderMerged(results);
      setTimeout(function () { _findHelpShowMoreActions(); }, 1700);
    }).catch(function () {
      _addBotBubble('I ran into a problem looking that up. Please try again shortly.', 200);
      _findHelpShowMoreActions();
    });
  }

  function _findHelpNoResults(serviceNoun) {
    _addBotBubble(
      'I could not find a verified ' + serviceNoun + ' matching your request in the available JusticeLink directory. '
      + 'You can try another location, or describe your situation so I can help identify the appropriate service category.',
      200
    );
    _findHelpShowMoreActions();
  }

  function _findHelpShowMoreActions() {
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpBackToMenu()"> Back to Find Help</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  window._findHelpBackToMenu = function () {
    _addUserBubble('Back to Find Help');
    _addBotBubble('Sure, what else can I help you find?', 0);
    setTimeout(function () { _showFindHelpMenu(); }, 900);
  };

  
  
  
  
  window._findHelpOpenFeature = function (which) {
    var labels = { legalAid: 'Open Legal Aid', report: 'Report a Case', emergency: 'Open Emergency Assistance' };
    _addUserBubble(labels[which] || which);
    if (which === 'legalAid' && typeof openLegalAidHub === 'function') { openLegalAidHub(); return; }
    if (which === 'report' && typeof openReportCaseAssistant === 'function') { openReportCaseAssistant(); return; }
    if (which === 'emergency' && typeof openEmergencyAssistant === 'function') { openEmergencyAssistant(); return; }
  };

  function _findHelpShowEmergencyRedirect() {
    _addBotBubble(
      '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:15px;font-weight:700;color:#c62828;margin-bottom:10px;"> This sounds urgent</div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
      + _aiEmergencyButtonsHtml('large')
      + '</div>'
      + '<div style="font-size:13px;color:#555;">Find Help is for locating the right service, not emergencies. Please use <strong>Emergency Assistance</strong> now.</div>'
      + '</div>', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#c62828;border-color:#c62828;color:white;" onclick="window._findHelpOpenFeature(\'emergency\')"> Open Emergency Assistance</button>'
      + '</div>';
    _addWidget(html, 200);
  }

  
  
  
  
  
  
  
  
  
  function _findHelpMediation() {
    _aiState.assistantMode = 'find_help_mediation';
    _aiState.chatMode = true;
    _aiState.category = 'Mediation & Dispute Resolution';
    _setStep(2);
    _addBotBubble(
      'Local Council (LC) offices commonly handle mediation for community, boundary, and family-related disputes, and independent mediation '
      + 'centers are also available. You can ask me how mediation works, or just pick which one you\'re looking for below.', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" onclick="window._findHelpMediationLC()"> Local Council (LC) Mediation</button>'
      + '<button class="ai-choice-btn" onclick="window._findHelpMediationCenter()"> Independent Mediation Center</button>'
      + '</div>';
    _addWidget(html, 300);
    var input = document.getElementById('aiTextInput');
    if (input) { input.placeholder = 'Or ask a question about mediation...'; input.focus(); }
  }

  function _findHelpMediationSysCtx() {
    return 'You are the "Mediation & Dispute Resolution" tool inside JusticeLink Find Help, for LCDJP, a Ugandan digital justice platform. '
      + 'Answer the citizen\'s question about mediation and dispute resolution -- how Local Council (LC) mediation or independent mediation works, '
      + 'what to expect, what it is typically used for, and what may be required -- using the verified legal materials supplied to you as the '
      + 'primary basis for your answer. Do not invent laws, procedures, fees, or requirements not supported by that material. This is general '
      + 'information only, not legal advice or a case determination -- say so where relevant. Keep responses concise (2-4 short sentences where '
      + 'possible), plain language, no jargon. If this is actually a broader legal question beyond mediation itself, tell them to use Legal Aid. '
      + 'If it is an incident to report, tell them to use Report a Case. If it is an emergency, tell them to use Emergency Assistance.';
  }

  function _findHelpShowMediationActions() {
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpMediationLC()"> Local Council (LC) Mediation</button>'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpMediationCenter()"> Independent Mediation Center</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  window._findHelpMediationLC = function () {
    _addUserBubble('Local Council (LC) Mediation');
    _aiState.category = 'Local Council Services';
    _findHelpLocationLookup('lc', 'Local Council Services', 'local council office');
  };

  window._findHelpMediationCenter = function () {
    _addUserBubble('Independent Mediation Center');
    _findHelpLocationLookup('mediation', 'Mediation & Dispute Resolution', 'mediation center');
  };

  
  
  
  
  
  function _findHelpJusticeLinkServices() {
    _aiState.assistantMode = 'find_help_justicelink';
    _setStep(2);
    _addBotBubble(
      'I could not find a verified JusticeLink service-point directory for your area yet. As JusticeLink service points are added, they will appear '
      + 'here. In the meantime, you can go directly to an existing JusticeLink service below, or describe your situation and I\'ll help you find the right one.',
      0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" onclick="window._findHelpOpenFeature(\'legalAid\')"> Open Legal Aid</button>'
      + '<button class="ai-choice-btn" onclick="window._findHelpOpenFeature(\'report\')"> Report a Case</button>'
      + '</div>';
    _addWidget(html, 400);
    setTimeout(function () { _findHelpShowMoreActions(); }, 1200);
  }

  
  function _findHelpStartGovernment() {
    _aiState.assistantMode = 'find_help_government';
    _aiState.chatMode = true;
    _aiState.category = 'Government Services';
    _setStep(2);
    _addBotBubble(
      'Tell me what you need, for example, "I need help replacing an official document", and I\'ll help you identify the responsible government office or department.',
      0
    );
    var input = document.getElementById('aiTextInput');
    if (input) input.focus();
  }

  function _findHelpGovernmentSysCtx() {
    return 'You are the "Government Services" tool inside JusticeLink Find Help, for LCDJP, a Ugandan digital justice platform. '
      + 'Find Help ONLY identifies the correct office to approach -- it must NOT collect an incident report, must NOT give legal advice or explain the law, '
      + 'and must NOT handle emergencies. The citizen has described what they need. Identify what TYPE of government office or department in Uganda is '
      + 'typically responsible, briefly explain why, and tell them what to do next. Keep responses to 2-4 short sentences, plain language, no jargon. '
      + 'Never invent a specific office name, address, phone number, or opening hours -- describe the TYPE of office responsible only. If this is actually '
      + 'a legal question, tell them to use Legal Aid instead. If it is an incident to report, tell them to use Report a Case. If it is an emergency, tell '
      + 'them to use Emergency Assistance.';
  }

  function _findHelpShowGovernmentActions() {
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpGovNearby()"> Find Nearby Government Office</button>'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpOpenFeature(\'legalAid\')"> Open Legal Aid</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  window._findHelpGovNearby = function () {
    _addUserBubble('Find Nearby Government Office');
    _findHelpLocationLookup('lc', 'Government Services', 'government or local council office');
  };

  
  function _findHelpStartNavigator() {
    _aiState.assistantMode = 'find_help_navigator';
    _aiState.chatMode = true;
    _aiState.category = 'Not Sure Where to Go?';
    _setStep(2);
    _addBotBubble(
      'Describe your situation in your own words, for example, "I have a dispute with my neighbor and I don\'t know where to go", and I\'ll help point you to the right service.',
      0
    );
    var input = document.getElementById('aiTextInput');
    if (input) input.focus();
  }

  function _findHelpNavigatorSysCtx() {
    return 'You are "JusticeLink Find Help", an intelligent service navigator for LCDJP, a Ugandan digital justice platform. '
      + 'Find Help ONLY identifies which service, office, institution, or organization a citizen should approach -- it must NOT collect an incident report '
      + '(what/where/when/who happened -- that belongs to Report a Case), must NOT give legal advice or explain the law (that belongs to Legal Aid), and '
      + 'must NOT handle emergencies (that belongs to Emergency Assistance). Read the citizen\'s situation, briefly explain which type of service fits best '
      + '-- choosing from: Courts & Tribunals, Local Council Services, Government Services, Mediation & Dispute Resolution, Community & Support '
      + 'Organizations, or JusticeLink Services -- and tell them what to do next. If their situation is actually a legal question, tell them to use Legal '
      + 'Aid. If they are describing an incident they want to report, tell them to use Report a Case. Keep responses to 2-4 short sentences, plain '
      + 'language, no legal jargon. Never invent a specific organization, office, court, address, phone number, opening hours, or service provider -- '
      + 'describe the TYPE of service only.';
  }

  function _findHelpShowRouterActions() {
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpBackToMenu()"> Show Categories</button>'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpOpenFeature(\'legalAid\')"> Open Legal Aid</button>'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpOpenFeature(\'report\')"> Report a Case</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  
  
  
  
  function _findHelpRouteFreeText(text) {
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    if (_legalAidCheckEmergency(text)) { _findHelpShowEmergencyRedirect(); return; }
    _aiState.chatMode = true;
    _aiState.assistantMode = 'find_help_navigator';
    _aiState.category = _aiState.category || 'Not Sure Where to Go?';
    _setStep(2);
    var typingId = 'ai-typing-' + Date.now();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }
    _callHuggingFaceBackend(text, _findHelpNavigatorSysCtx(), true).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (reply) {
        _addBotBubble(_findHelpFormatReply(reply), 0);
      } else {
        _addBotBubble('Based on what you\'ve described, pick a category below and I\'ll help you find the right service:', 0);
      }
      _findHelpShowRouterActions();
    });
  }

  function _findHelpFormatReply(reply) {
    return _esc(reply || '').replace(/\n/g, '<br>');
  }

  













  var LAWYER_AI_DISCLAIMER = 'AI-generated information is provided for legal support and should be verified against applicable law and professional judgment.';

  var _lawyerQuickActions = [
    { key: 'urgent',    label: 'Urgent Case',        desc: 'Assess and organize an urgent legal situation.' },
    { key: 'guidance',  label: 'Legal Guidance',      desc: 'Get immediate legal information and procedural guidance.' },
    { key: 'findCase',  label: 'Find Client / Case',  desc: 'Locate an authorized JusticeLink client or case.' },
    { key: 'nearby',    label: 'Find Nearby Support', desc: 'Locate nearby courts, police stations, legal-aid resources and other justice services.' },
    { key: 'research',  label: 'Research the Law',    desc: 'Find relevant laws, procedures, cases and legal resources.' },
    { key: 'note',      label: 'Create Case Note',    desc: 'Turn the emergency information into a structured case note.' },
    { key: 'escalate',  label: 'Escalate Matter',     desc: 'Send an urgent matter to an authorized JusticeLink support channel.' }
  ];

  
  
  
  var _lawyerLawLibraryTopics = [
    { key: 'constitution', words: ['constitution', 'fundamental right', 'human right', 'fair hearing'] },
    { key: 'landLaws', words: ['land', 'mailo', 'tenure', 'property dispute', 'boundary'] },
    { key: 'familyLaws', words: ['family', 'domestic'] },
    { key: 'marriageDivorce', words: ['marriage', 'divorce'] },
    { key: 'successionInheritance', words: ['succession', 'inheritance', 'will', 'estate'] },
    { key: 'childrenRights', words: ['child', 'children', 'custody', 'juvenile'] },
    { key: 'employmentLaws', words: ['employment', 'labour', 'labor', 'workplace'] },
    { key: 'criminalLaw', words: ['crime', 'criminal', 'arrest', 'detention', 'bail', 'charge'] },
    { key: 'humanRights', words: ['human rights', 'torture', 'abuse'] },
    { key: 'localCouncilLaws', words: ['local council', 'lc1', 'lc2', 'lc3'] },
    { key: 'courtProcedures', words: ['court procedure', 'filing', 'hearing', 'trial'] },
    { key: 'legalForms', words: ['form', 'affidavit', 'template'] }
  ];
  var _lawyerLegalResearchTopics = [
    { key: 'constitution', words: ['constitution', 'fundamental right'] },
    { key: 'landAct', words: ['land act', 'land', 'tenure'] },
    { key: 'successionAct', words: ['succession', 'inheritance', 'estate'] },
    { key: 'marriageAct', words: ['marriage', 'divorce'] },
    { key: 'childrenAct', words: ['child', 'children', 'custody'] }
  ];

  function _lawyerMatchTopics(list, text) {
    var t = (text || '').toLowerCase();
    var matched = [];
    list.forEach(function (topic) {
      if (topic.words.some(function (w) { return t.indexOf(w) !== -1; })) matched.push(topic.key);
    });
    return matched;
  }

  function _lawyerCurrentUsername() {
    return sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
  }

  function _lawyerSetHeader(title, subtitle) {
    var t = document.getElementById('aiHeaderTitle');
    var s = document.getElementById('aiHeaderSubtitle');
    if (t) t.textContent = title;
    if (s) s.textContent = subtitle;
  }

  function _lawyerResetHeader() {
    _lawyerSetHeader('Emergency Assistant', 'Online \u00B7 Ready to help');
  }

  
  
  
  function _lawyerRoleAllowed() {
    var role = sessionStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('lcdjp_role') || '';
    return role === 'Lawyer';
  }

  function openLawyerEmergencyAssistant() {
    if (!_lawyerRoleAllowed()) {
      if (typeof showToast === 'function') showToast('The Lawyer Emergency Assistant is only available to authorized lawyers.');
      return;
    }
    _aiLockBodyScroll();
    _aiState = {
      step: 0, category: null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'lawyer_menu', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [], caseReference: null, lawyerCandidates: [],
      lawyer: {
        transcript: [], category: null, urgency: null, urgencyReason: null,
        caseId: null, caseSummary: null
      }
    };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    _lawyerSetHeader('Lawyer Emergency Assistant', 'Rapid legal assistance, case support and emergency response');
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Type your message...'; }
    var uname = _lawyerCurrentUsername();
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '!<br>'
      + '<strong>How can I assist with this urgent legal matter?</strong>'
      + '<br><br><span style="font-size:11px;color:#777;">' + LAWYER_AI_DISCLAIMER + '</span>',
      0
    );
    setTimeout(_lawyerShowMenu, 1200);
  }
  window.openLawyerEmergencyAssistant = openLawyerEmergencyAssistant;

  function _lawyerShowMenu() {
    _aiState.assistantMode = 'lawyer_menu';
    _aiState.chatMode = false;
    var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    _lawyerQuickActions.forEach(function (a) {
      html += '<button class="ai-choice-btn" style="text-align:left;width:100%;" onclick="window._lawyerSelectAction(\'' + a.key + '\')">'
        + '<strong>' + _esc(a.label) + '</strong><br><span style="font-size:11px;color:#666;font-weight:400;">' + _esc(a.desc) + '</span>'
        + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  function _lawyerActionsBar() {
    return '<div class="ai-choices-row" style="margin-top:8px;">'
      + '<button class="ai-choice-btn" onclick="window._lawyerSelectAction(\'note\')">Create Case Note</button>'
      + '<button class="ai-choice-btn" onclick="window._lawyerSelectAction(\'escalate\')">Escalate Matter</button>'
      + '<button class="ai-choice-btn" onclick="window._lawyerSelectAction(\'research\')">Research the Law</button>'
      + '<button class="ai-choice-btn" onclick="_lawyerShowMenu()">Back to Menu</button>'
      + '</div>';
  }

  window._lawyerSelectAction = function (key) {
    _addUserBubble(_lawyerQuickActions.filter(function (a) { return a.key === key; }).map(function (a) { return a.label; })[0] || key);
    if (key === 'urgent') return _lawyerStartUrgentCase();
    if (key === 'guidance') return _lawyerStartGuidance();
    if (key === 'findCase') return _lawyerStartFindCase();
    if (key === 'nearby') return _lawyerFindNearby();
    if (key === 'research') return _lawyerStartResearch();
    if (key === 'note') return _lawyerCreateCaseNote();
    if (key === 'escalate') return _lawyerEscalate();
  };

  function _lawyerStartUrgentCase() {
    _aiState.assistantMode = 'lawyer_urgent_case';
    _aiState.chatMode = true;
    _aiState.lawyer.transcript = [];
    _addBotBubble(
      'Let\'s assess this urgent matter. Tell me what happened, who is involved, and who your client is, '
      + 'I\'ll ask follow-up questions as needed and let you know how urgent this looks.',
      0
    );
  }

  function _lawyerStartGuidance() {
    _aiState.assistantMode = 'lawyer_guidance';
    _aiState.chatMode = true;
    _addBotBubble('What legal question can I help with? For example: "My client has been arrested. What information should I establish first?"', 0);
  }

  function _lawyerStartResearch() {
    _aiState.assistantMode = 'lawyer_research';
    _aiState.chatMode = true;
    _addBotBubble('What would you like to research? Give me a topic, law, or question and I\'ll point you to relevant JusticeLink resources.', 0);
  }

  
  
  
  
  function _lawyerTranscriptText() {
    var t = _aiState.lawyer.transcript.slice(-8);
    if (!t.length) return '';
    return 'Conversation so far:\n' + t.map(function (turn) {
      return (turn.role === 'lawyer' ? 'Lawyer' : 'Assistant') + ': ' + turn.text;
    }).join('\n') + '\n\n';
  }

  var _lawyerSafetyRules =
    'You must not invent legal authorities, case law, sections, or procedures -- if you are not certain a legal source is correct, '
    + 'say so plainly and tell the lawyer to verify it. Distinguish clearly between established law and your own analysis. '
    + 'Never claim to be a court, government authority, or human lawyer, and never state that a matter has been escalated, filed, '
    + 'or sent anywhere -- you cannot take those actions yourself. Keep responses concise and professional.';

  function _lawyerUrgentCaseSysCtx() {
    return 'You are the Lawyer Emergency Assistant inside JusticeLink, helping a verified Uganda-based lawyer triage an urgent legal matter for their client. '
      + _lawyerTranscriptText()
      + 'Ask short, progressive follow-up questions (not all at once) to establish: what happened, who is involved, who the client is, where and when it '
      + 'occurred, whether anyone is in immediate danger, whether anyone is detained or arrested, which authority/institution is involved, what action has '
      + 'already been taken, what assistance the lawyer needs, and whether there is an existing JusticeLink case. Only ask what is still missing. '
      + 'Once you have enough information to judge urgency, begin your reply with exactly one line "URGENCY_LEVEL: Critical", "URGENCY_LEVEL: High", or '
      + '"URGENCY_LEVEL: Standard" (Critical = immediate danger to life/ongoing violence/urgent detention issue; High = serious matter needing prompt action '
      + 'but no immediate threat to life; Standard = important but not emergency-level), then on the next line a one-sentence reason, then a blank line, '
      + 'then a short "Immediate priorities" numbered list. Do not include the URGENCY_LEVEL line until you actually have enough information to assess it. '
      + _lawyerSafetyRules;
  }

  function _lawyerGuidanceSysCtx() {
    return 'You are the Lawyer Emergency Assistant inside JusticeLink, answering a Uganda-based lawyer\'s legal question during an urgent matter. '
      + _lawyerTranscriptText()
      + 'Structure your reply with these bolded section headers where relevant, using **Header** markdown-style bold: **Immediate priorities**, '
      + '**Relevant legal considerations**, **Information to document**, **Possible next steps**, **Relevant JusticeLink resources**. Keep it concise -- '
      + 'this is an emergency context, avoid unnecessarily long answers. ' + _lawyerSafetyRules;
  }

  
  
  
  
  

  function _lawyerFormatReply(text) {
    var esc = _esc(text || '');
    esc = esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    return esc;
  }

  var _lawyerUrgencyColors = { Critical: '#c62828', High: '#e65100', Standard: '#2e7d32' };

  function _lawyerRenderUrgentReply(reply) {
    var m = /^URGENCY_LEVEL:\s*(Critical|High|Standard)\s*\n?([^\n]*)\n*/i.exec(reply);
    var body = reply;
    var badge = '';
    if (m) {
      var level = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      var reason = (m[2] || '').trim();
      _aiState.lawyer.urgency = level;
      _aiState.lawyer.urgencyReason = reason;
      body = reply.slice(m[0].length);
      var color = _lawyerUrgencyColors[level] || '#555';
      badge = '<div style="background:#f5f5f5;border-left:4px solid ' + color + ';border-radius:6px;padding:8px 12px;margin-bottom:8px;">'
        + '<div style="font-weight:700;color:' + color + ';">Urgency: ' + _esc(level.toUpperCase()) + '</div>'
        + (reason ? '<div style="font-size:12px;color:#555;margin-top:2px;"><strong>Reason:</strong> ' + _esc(reason) + '</div>' : '')
        + '</div>';
    }
    return badge + _lawyerFormatReply(body);
  }

  function _lawyerAiUnavailableMessage() {
    return 'The assistant is temporarily unavailable. You can still access your cases, law library, court forms and other JusticeLink services.';
  }

  function _lawyerAiSendMessage() {
    var input = document.getElementById('aiTextInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    _addUserBubble(text);
    _aiState.lawyer.transcript.push({ role: 'lawyer', text: text });

    var area = _getChatArea();
    var typingId = 'ai-typing-' + Date.now();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }

    var mode = _aiState.assistantMode;

    
    
    
    
    
    
    
    
    
    if (mode === 'lawyer_research') {
      if (typeof _lawLibraryQuery !== 'function') {
        var elMissing = document.getElementById(typingId);
        if (elMissing) elMissing.remove();
        _addBotBubble(_lawyerAiUnavailableMessage(), 0);
        _addWidget(_lawyerActionsBar(), 200);
        return;
      }
      _lawLibraryQuery(text, 'Legal Research').then(function (res) {
        var el = document.getElementById(typingId);
        if (el) el.remove();
        if (!res || !res.reply) {
          _addBotBubble(_lawyerAiUnavailableMessage(), 0);
          _addWidget(_lawyerActionsBar(), 200);
          return;
        }
        _aiState.lawyer.transcript.push({ role: 'assistant', text: res.reply });
        var sourcesHtml = '';
        if (Array.isArray(res.sources) && res.sources.length) {
          sourcesHtml = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eef1f8;font-size:11px;color:#777;">'
            + '<strong>Sources:</strong> ' + res.sources.map(function (s) {
              return _esc([s.documentTitle, s.legalSection].filter(Boolean).join(' \u2014 ') || 'Legal Knowledge library');
            }).join('; ') + '</div>';
        }
        _addBotBubble(_lawyerFormatReply(res.reply) + sourcesHtml, 0);
        _addWidget(
          '<div class="ai-choices-row" style="margin-top:6px;">'
          + '<button class="ai-choice-btn" onclick="window._lawyerMoreDetail()">More detail</button>'
          + '</div>', 150
        );
        setTimeout(function () { _lawyerShowResearchResources(text + ' ' + res.reply); }, 250);
        _addWidget(_lawyerActionsBar(), 300);
      });
      return;
    }

    var sysCtx = mode === 'lawyer_urgent_case' ? _lawyerUrgentCaseSysCtx()
      : _lawyerGuidanceSysCtx();

    _callHuggingFaceBackend(text, sysCtx, true).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (!reply) {
        _addBotBubble(_lawyerAiUnavailableMessage(), 0);
        _addWidget(_lawyerActionsBar(), 200);
        return;
      }
      _aiState.lawyer.transcript.push({ role: 'assistant', text: reply });
      var html = mode === 'lawyer_urgent_case' ? _lawyerRenderUrgentReply(reply) : _lawyerFormatReply(reply);
      _addBotBubble(html, 0);
      if (mode === 'lawyer_guidance') {
        _addWidget(
          '<div class="ai-choices-row" style="margin-top:6px;">'
          + '<button class="ai-choice-btn" onclick="window._lawyerMoreDetail()">More detail</button>'
          + '<button class="ai-choice-btn" onclick="window._lawyerShowSources()">Show sources</button>'
          + '</div>', 150
        );
      }
      _addWidget(_lawyerActionsBar(), 300);
    });
  }

  window._lawyerMoreDetail = function () {
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = 'Please give more detail on that.'; }
    _lawyerAiSendMessage();
  };
  window._lawyerShowSources = function () {
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = 'What sources or JusticeLink resources support that?'; }
    _lawyerAiSendMessage();
  };

  
  
  
  function _lawyerShowResearchResources(text) {
    var libTopics = _lawyerMatchTopics(_lawyerLawLibraryTopics, text);
    var researchTopics = _lawyerMatchTopics(_lawyerLegalResearchTopics, text);
    if (!libTopics.length && !researchTopics.length) {
      _addBotBubble('<span style="font-size:12px;color:#777;">I couldn\'t confidently match this to a specific JusticeLink resource -- please verify the applicable law directly.</span>', 0);
      return;
    }
    var html = '<div style="font-size:12px;font-weight:700;color:#1a237e;margin-bottom:6px;">Relevant legal resources</div><div class="ai-choices-row">';
    libTopics.forEach(function (k) {
      html += '<button class="ai-choice-btn" onclick="closeAIAssistant();showLawLibrary(\'' + k + '\')">Open in Law Library</button>';
    });
    researchTopics.forEach(function (k) {
      html += '<button class="ai-choice-btn" onclick="closeAIAssistant();showLegalResearch(\'' + k + '\')">Open in Legal Research</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  
  function _lawyerStartFindCase() {
    _aiState.assistantMode = 'lawyer_find_case';
    _aiState.chatMode = false;
    var html = '<div style="display:flex;gap:6px;margin-top:4px;">'
      + '<input id="lawyerCaseSearchInput" type="text" placeholder="Client name or case ID..." style="flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;" onkeydown="if(event.key===\'Enter\')window._lawyerRunCaseSearch();">'
      + '<button class="ai-choice-btn" onclick="window._lawyerRunCaseSearch()">Search</button>'
      + '</div>';
    _addBotBubble('Who or which case are you looking for?', 0);
    _addWidget(html, 200);
  }

  window._lawyerRunCaseSearch = async function () {
    var input = document.getElementById('lawyerCaseSearchInput');
    var q = (input && input.value || '').trim().toLowerCase();
    if (!q) return;
    _addUserBubble(q);
    var uname = _lawyerCurrentUsername();
    if (!uname) { _addBotBubble(_lawyerAiUnavailableMessage(), 0); return; }
    try {
      var resp = await fetch(API_ENDPOINTS.lawyerCases(uname), { headers: getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to load cases');
      var data = await resp.json();
      var cases = Array.isArray(data) ? data : (data.cases || data.data || []);
      var matches = cases.filter(function (c) {
        var hay = ((c.caseReference || c.caseId || '') + ' ' + (c.citizen_name || c.citizen || '') + ' ' + (c.case_type || c.caseType || '')).toLowerCase();
        return hay.indexOf(q) !== -1;
      }).slice(0, 5);
      if (!matches.length) {
        _addBotBubble('No matching case found among your authorized cases for "' + _esc(q) + '".', 0);
        _addWidget(_lawyerActionsBar(), 150);
        return;
      }
      var html = matches.map(function (c) {
        var ref = c.caseReference || c.caseId || '';
        return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafbff;">'
          + '<div style="font-weight:700;color:#1a237e;">' + _esc(ref) + '</div>'
          + '<div style="font-size:12px;color:#444;">Client: ' + _esc(c.citizen_name || c.citizen || 'Unknown') + '</div>'
          + '<div style="font-size:12px;color:#444;">Type: ' + _esc(c.case_type || c.caseType || 'N/A') + '</div>'
          + '<div style="font-size:12px;color:#444;">Status: ' + _esc(c.status || 'N/A') + '</div>'
          + '<div style="font-size:12px;color:#444;">Assigned lawyer: ' + _esc(c.assigned_lawyer || uname) + '</div>'
          + '<div style="font-size:12px;color:#444;">Location: ' + _esc((c.village || '') + (c.parish ? ', ' + c.parish : '')) + '</div>'
          + '<div style="font-size:12px;color:#444;">Latest update: ' + _esc(c.updatedAt || c.updated_at || 'N/A') + '</div>'
          + '<div style="margin-top:6px;display:flex;gap:6px;">'
          + '<button class="ai-choice-btn" onclick="viewCase(\'' + _esc(ref).replace(/'/g, "\\'") + '\')">Open Case</button>'
          + '<button class="ai-choice-btn" onclick="window._lawyerLinkCase(\'' + _esc(ref).replace(/'/g, "\\'") + '\')">Link to This Matter</button>'
          + '</div></div>';
      }).join('');
      _addWidget(html, 0);
      _addWidget(_lawyerActionsBar(), 200);
    } catch (e) {
      _addBotBubble(_lawyerAiUnavailableMessage(), 0);
    }
  };

  window._lawyerLinkCase = function (caseRef) {
    _aiState.lawyer.caseId = caseRef;
    _addBotBubble('Linked this matter to case <strong>' + _esc(caseRef) + '</strong>. You can now create a case note against it.', 0);
    _addWidget(_lawyerActionsBar(), 150);
  };

  
  function _lawyerFindNearby() {
    _aiState.assistantMode = 'lawyer_nearby';
    _aiState.chatMode = false;
    _addBotBubble('Looking for nearby justice resources...', 0);
    if (!navigator.geolocation) {
      _addBotBubble('Location information cannot currently be determined on this device.', 400);
      _addWidget(_lawyerActionsBar(), 500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) { _lawyerRenderNearby(pos.coords.latitude, pos.coords.longitude); },
      function () {
        _addBotBubble('Location information cannot currently be determined -- please check location permissions.', 300);
        _addWidget(_lawyerActionsBar(), 400);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }

  async function _lawyerRenderNearby(lat, lng) {
    var results = [];
    
    
    _aiState.userLat = lat;
    _aiState.userLng = lng;
    try {
      
      
      
      
      
      var live = typeof _aiEmergencyFetchLiveMap === 'function'
        ? await _aiEmergencyFetchLiveMap(
            [
              { type: 'police', label: 'Police Station' },
              { type: 'local_government_office', label: 'Local Council Office' },
              { type: 'lawyer', keyword: 'legal aid organization', label: 'Legal Aid Organization' }
            ],
            25000
          )
        : [];
      results = (Array.isArray(live) ? live : []).map(function (p) {
        return { _type: p._aiPlaceLabel || 'Nearby Service', name: p.name, latitude: p.latitude, longitude: p.longitude, place_id: p.place_id };
      });
    } catch (e) { results = []; }

    if (!results.length) {
      _addBotBubble('No justice services found near your current location.', 0);
      _addWidget(_lawyerActionsBar(), 150);
      return;
    }
    var html = results.slice(0, 8).map(function (s) {
      var sLat = parseFloat(s.latitude || s.lat), sLng = parseFloat(s.longitude || s.lng);
      var dist = isFinite(sLat) && isFinite(sLng) ? distanceKm(lat, lng, sLat, sLng).toFixed(1) + ' km' : '';
      var name = s.name || s.officeName || s.orgName || s._type;
      var mapUrl = isFinite(sLat) && isFinite(sLng) ? 'https://www.google.com/maps/search/?api=1&query=' + sLat + ',' + sLng : null;
      var dirUrl = isFinite(sLat) && isFinite(sLng) ? 'https://www.google.com/maps/dir/?api=1&destination=' + sLat + ',' + sLng : null;
      return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafbff;">'
        + '<div style="font-weight:700;color:#1a237e;">' + _esc(name) + '</div>'
        + '<div style="font-size:11px;color:#888;">' + _esc(s._type) + (dist ? ' &middot; ' + dist : '') + '</div>'
        + '<div style="margin-top:6px;display:flex;gap:6px;">'
        + (mapUrl ? '<a class="ai-choice-btn" style="text-decoration:none;" href="' + mapUrl + '" target="_blank" rel="noopener">View on Map</a>' : '')
        + (dirUrl ? '<a class="ai-choice-btn" style="text-decoration:none;" href="' + dirUrl + '" target="_blank" rel="noopener">Get Directions</a>' : '')
        + '</div></div>';
    }).join('');
    _addWidget(html, 0);
    _addWidget(_lawyerActionsBar(), 150);
  }

  
  function _lawyerCreateCaseNote() {
    _aiState.assistantMode = 'lawyer_note';
    _aiState.chatMode = false;
    if (!_aiState.lawyer.transcript.length) {
      _addBotBubble('Let\'s gather a few details first -- tell me what happened, or use Urgent Case to walk through it.', 0);
      _addWidget(_lawyerActionsBar(), 150);
      return;
    }
    _addBotBubble('Drafting a structured case note from this conversation...', 0);
    var sysCtx = 'You are drafting an emergency case note for a Uganda-based lawyer inside JusticeLink, based on the conversation transcript below. '
      + _lawyerTranscriptText()
      + 'Write the note using exactly these section headers (plain text, one per line, blank line between sections): '
      + 'Incident Summary / People and Institutions Involved / Immediate Risk / Actions Already Taken / Legal Issue / Suggested Next Steps / Evidence and Documents. '
      + 'Only include information actually present in the conversation -- write "Not yet established" for anything missing. Do not invent facts. Keep it concise and factual.';
    _callHuggingFaceBackend('Draft the emergency case note now.', sysCtx).then(function (reply) {
      var noteText = reply || _lawyerFallbackNote();
      var caseInfoHeader = 'Case: ' + (_aiState.lawyer.caseId || 'Not yet linked to a JusticeLink case')
        + (_aiState.lawyer.urgency ? '\nUrgency: ' + _aiState.lawyer.urgency + (_aiState.lawyer.urgencyReason ? ' -- ' + _aiState.lawyer.urgencyReason : '') : '')
        + '\nDate: ' + new Date().toLocaleString();
      var fullDraft = caseInfoHeader + '\n\n' + noteText;
      var html = '<div style="font-size:11px;font-weight:700;color:#b42318;margin-bottom:4px;">Draft &mdash; Requires Lawyer Review</div>'
        + '<textarea id="lawyerCaseNoteDraft" style="width:100%;min-height:220px;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:12px;font-family:inherit;line-height:1.5;">' + _esc(fullDraft) + '</textarea>'
        + '<div style="margin-top:8px;display:flex;gap:6px;">'
        + '<button class="ai-choice-btn" style="background:#1a237e;color:#fff;border-color:#1a237e;" onclick="window._lawyerSaveCaseNote()">Save to Case</button>'
        + '<button class="ai-choice-btn" onclick="_lawyerShowMenu()">Cancel</button>'
        + (!_aiState.lawyer.caseId ? '<button class="ai-choice-btn" onclick="window._lawyerSelectAction(\'findCase\')">Find Case to Link</button>' : '')
        + '</div>';
      _addWidget(html, 0);
    });
  }

  function _lawyerFallbackNote() {
    return _aiState.lawyer.transcript.filter(function (t) { return t.role === 'lawyer'; })
      .map(function (t) { return '- ' + t.text; }).join('\n') || 'No details captured yet.';
  }

  
  
  
  window._lawyerSaveCaseNote = async function () {
    var caseId = _aiState.lawyer.caseId;
    if (!caseId) {
      _addBotBubble('Please link this matter to a case first using "Find Case to Link".', 0);
      return;
    }
    var textarea = document.getElementById('lawyerCaseNoteDraft');
    var noteText = textarea ? textarea.value : '';
    if (!noteText.trim()) { _addBotBubble('The case note is empty.', 0); return; }
    var uname = _lawyerCurrentUsername();
    try {
      var resp = await fetch(API_ENDPOINTS.advice(caseId), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          legalAdvice: '[Emergency Case Note]\n\n' + noteText,
          legalAdviceDate: new Date().toISOString(),
          legalAdviceProvidedBy: uname,
          legal_advice_provided_by: uname
        })
      });
      if (!resp.ok) throw new Error('Save failed');
      _addBotBubble('Case note saved to <strong>' + _esc(caseId) + '</strong>.', 0);
      _addWidget(_lawyerActionsBar(), 150);
    } catch (e) {
      _addBotBubble(_lawyerAiUnavailableMessage(), 0);
    }
  };

  
  function _lawyerEscalate() {
    _aiState.assistantMode = 'lawyer_escalate';
    _aiState.chatMode = false;
    var summary = _aiState.lawyer.transcript.filter(function (t) { return t.role === 'lawyer'; })
      .map(function (t) { return t.text; }).join(' ').slice(0, 400) || 'No details captured yet -- please describe the matter first.';
    var urgency = _aiState.lawyer.urgency || 'Not yet assessed';
    var html = '<div style="border:1.5px solid #b42318;border-radius:10px;padding:12px 14px;background:#fff5f5;">'
      + '<div style="font-weight:700;color:#b42318;margin-bottom:8px;">Escalate this matter?</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Matter:</strong> ' + _esc(summary) + '</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Urgency:</strong> ' + _esc(urgency) + '</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Recipient:</strong> JusticeLink Support (Admin)</div>'
      + (_aiState.lawyer.caseId ? '<div style="font-size:12px;margin-bottom:4px;"><strong>Linked case:</strong> ' + _esc(_aiState.lawyer.caseId) + '</div>' : '')
      + '<div style="margin-top:10px;display:flex;gap:6px;">'
      + '<button class="ai-choice-btn" style="background:#b42318;color:#fff;border-color:#b42318;" onclick="window._lawyerConfirmEscalate()">Confirm Escalation</button>'
      + '<button class="ai-choice-btn" onclick="_lawyerShowMenu()">Cancel</button>'
      + '</div></div>';
    _addBotBubble('Please review before this is sent.', 0);
    _addWidget(html, 200);
  }

  
  
  
  window._lawyerConfirmEscalate = async function () {
    var uname = _lawyerCurrentUsername();
    var fullname = sessionStorage.getItem('lcdjp_fullname') || uname;
    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || 'Lawyer';
    var summary = _aiState.lawyer.transcript.filter(function (t) { return t.role === 'lawyer'; })
      .map(function (t) { return t.text; }).join(' ').slice(0, 500);
    var urgency = _aiState.lawyer.urgency || 'Not yet assessed';
    var msgObj = {
      from: uname, fromName: fullname, fromRole: userLevel,
      message: '[URGENT - Lawyer Emergency Assistant] Urgency: ' + urgency
        + (_aiState.lawyer.caseId ? ' | Case: ' + _aiState.lawyer.caseId : '')
        + ' | Summary: ' + (summary || 'No details captured.'),
      type: 'text', sentTo: 'admin', timestamp: new Date().toISOString(),
      read: false, delivered: false, reply: null, replyTimestamp: null
    };
    try {
      var resp = await fetch(API_ENDPOINTS.chatMessages, _chatFetchOpts({ 'Content-Type': 'application/json' }, JSON.stringify(toChatServerPayload(msgObj)), 'POST'));
      if (!resp.ok) throw new Error('Escalation failed');
      
      
      
      
      
      
      
      if (typeof createEnhancedNotification === 'function') {
        resp.clone().json().then(function (row) {
          var recipient = (row && (row.recipient || row.sent_to || row.sentTo)) || '';
          if (!recipient) return;
          createEnhancedNotification(
            recipient,
            fullname + ' escalated an urgent matter' + (_aiState.lawyer.caseId ? ' (case ' + _aiState.lawyer.caseId + ')' : ''),
            'urgent',
            _aiState.lawyer.caseId || null
          ).catch(function (e) { console.warn('Could not notify recipient of escalation:', e); });
        }).catch(function (e) { console.warn('Could not read escalation recipient:', e); });
      }
      _addBotBubble('This matter has been escalated to JusticeLink Support. They will follow up as soon as possible.', 0);
      _addWidget(_lawyerActionsBar(), 150);
    } catch (e) {
      _addBotBubble('Escalation could not be sent right now -- please use Contact Support directly, or call emergency services if this is life-threatening.', 0);
      _addWidget(_lawyerActionsBar(), 150);
    }
  };

  
  
  
  var LC_AI_DISCLAIMER = 'AI-generated information is provided for guidance and should be verified against Local Council procedure and applicable law.';

  var _lcQuickActions = [
    { key: 'urgent',    label: 'Urgent Case',        desc: 'Assess and organize an urgent community matter.' },
    { key: 'guidance',  label: 'LC Guidance',         desc: 'Get immediate guidance on Local Council procedure and mediation.' },
    { key: 'findCase',  label: 'Find Case',           desc: 'Locate a case assigned to you or unclaimed in your area.' },
    { key: 'nearby',    label: 'Find Nearby Support', desc: 'Locate nearby police stations, LC offices and legal-aid resources.' },
    { key: 'research',  label: 'Research LC Law',     desc: 'Find relevant Local Council Courts Act provisions and procedures.' },
    { key: 'note',      label: 'Create Case Note',    desc: 'Turn this conversation into a structured case note.' },
    { key: 'escalate',  label: 'Escalate Matter',     desc: 'Send an urgent matter to an authorized JusticeLink support channel.' }
  ];

  function _lcCurrentUsername() {
    return sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
  }

  function _lcSetHeader(title, subtitle) {
    var t = document.getElementById('aiHeaderTitle');
    var s = document.getElementById('aiHeaderSubtitle');
    if (t) t.textContent = title;
    if (s) s.textContent = subtitle;
  }

  function _lcResetHeader() {
    _lcSetHeader('Emergency Assistant', 'Online \u00B7 Ready to help');
  }

  function _lcRoleAllowed() {
    var role = sessionStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('lcdjp_role') || '';
    return role === 'LC' || role === 'LC Official' || role === 'LC1' || role === 'LC2' || role === 'LC3';
  }

  function openLCEmergencyAssistant() {
    if (!_lcRoleAllowed()) {
      if (typeof showToast === 'function') showToast('The LC Emergency Assistant is only available to authorized Local Council officials.');
      return;
    }
    _aiLockBodyScroll();
    _aiState = {
      step: 0, category: null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'lc_menu', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [], caseReference: null, lawyerCandidates: [],
      lc: {
        transcript: [], category: null, urgency: null, urgencyReason: null,
        caseId: null, caseSummary: null
      }
    };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    _lcSetHeader('LC Emergency Assistant', 'Rapid assistance for urgent community matters');
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Type your message...'; }
    var uname = _lcCurrentUsername();
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '!<br>'
      + '<strong>How can I assist with this urgent community matter?</strong>'
      + '<br><br><span style="font-size:11px;color:#777;">' + LC_AI_DISCLAIMER + '</span>',
      0
    );
    setTimeout(_lcShowMenu, 1200);
  }
  window.openLCEmergencyAssistant = openLCEmergencyAssistant;

  function _lcShowMenu() {
    _aiState.assistantMode = 'lc_menu';
    _aiState.chatMode = false;
    var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    _lcQuickActions.forEach(function (a) {
      html += '<button class="ai-choice-btn" style="text-align:left;width:100%;" onclick="window._lcSelectAction(\'' + a.key + '\')">'
        + '<strong>' + _esc(a.label) + '</strong><br><span style="font-size:11px;color:#666;font-weight:400;">' + _esc(a.desc) + '</span>'
        + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  function _lcActionsBar() {
    return '<div class="ai-choices-row" style="margin-top:8px;">'
      + '<button class="ai-choice-btn" onclick="window._lcSelectAction(\'note\')">Create Case Note</button>'
      + '<button class="ai-choice-btn" onclick="window._lcSelectAction(\'escalate\')">Escalate Matter</button>'
      + '<button class="ai-choice-btn" onclick="window._lcSelectAction(\'research\')">Research LC Law</button>'
      + '<button class="ai-choice-btn" onclick="_lcShowMenu()">Back to Menu</button>'
      + '</div>';
  }

  window._lcSelectAction = function (key) {
    _addUserBubble(_lcQuickActions.filter(function (a) { return a.key === key; }).map(function (a) { return a.label; })[0] || key);
    if (key === 'urgent') return _lcStartUrgentCase();
    if (key === 'guidance') return _lcStartGuidance();
    if (key === 'findCase') return _lcStartFindCase();
    if (key === 'nearby') return _lcFindNearby();
    if (key === 'research') return _lcStartResearch();
    if (key === 'note') return _lcCreateCaseNote();
    if (key === 'escalate') return _lcEscalate();
  };

  function _lcStartUrgentCase() {
    _aiState.assistantMode = 'lc_urgent_case';
    _aiState.chatMode = true;
    _aiState.lc.transcript = [];
    _addBotBubble(
      'Let\'s assess this urgent matter. Tell me what happened, who is involved, and what village or parish it concerns, '
      + 'I\'ll ask follow-up questions as needed and let you know how urgent this looks.',
      0
    );
  }

  function _lcStartGuidance() {
    _aiState.assistantMode = 'lc_guidance';
    _aiState.chatMode = true;
    _addBotBubble('What LC procedure or mediation question can I help with? For example: "A family dispute was reported to me. What should I establish first?"', 0);
  }

  function _lcStartResearch() {
    _aiState.assistantMode = 'lc_research';
    _aiState.chatMode = true;
    _addBotBubble('What would you like to research? Give me a topic, law, or question and I\'ll point you to relevant JusticeLink resources.', 0);
  }

  function _lcTranscriptText() {
    var t = _aiState.lc.transcript.slice(-8);
    if (!t.length) return '';
    return 'Conversation so far:\n' + t.map(function (turn) {
      return (turn.role === 'lc' ? 'LC Official' : 'Assistant') + ': ' + turn.text;
    }).join('\n') + '\n\n';
  }

  var _lcSafetyRules =
    'You must not invent legal authorities, sections, or procedures -- if you are not certain a legal source is correct, '
    + 'say so plainly and tell the LC official to verify it. Distinguish clearly between established law/procedure and your own analysis. '
    + 'Remember that Local Council courts only have jurisdiction over specified civil, minor and mediation matters at village/parish/sub-county level -- '
    + 'criminal matters, serious violence, gender-based violence, matters involving minors at risk, and matters beyond LC jurisdiction must be referred to '
    + 'the Police or the Magistrate\'s Court, not handled or mediated at LC level. Never claim to be a court, government authority, or the Magistrate, and '
    + 'never state that a matter has been escalated, filed, or sent anywhere -- you cannot take those actions yourself. Keep responses concise and practical.';

  function _lcUrgentCaseSysCtx() {
    return 'You are the LC Emergency Assistant inside JusticeLink, helping a verified Local Council (LC) official in Uganda triage an urgent community matter. '
      + _lcTranscriptText()
      + 'Ask short, progressive follow-up questions (not all at once) to establish: what happened, who is involved, which village/parish/sub-county it '
      + 'concerns, where and when it occurred, whether anyone is in immediate danger, whether it involves a criminal matter that should go straight to '
      + 'Police, whether it is within LC Court jurisdiction or should be referred to the Magistrate\'s Court, what action has already been taken, and '
      + 'whether there is an existing JusticeLink case. Only ask what is still missing. Once you have enough information to judge urgency, begin your '
      + 'reply with exactly one line "URGENCY_LEVEL: Critical", "URGENCY_LEVEL: High", or "URGENCY_LEVEL: Standard" (Critical = immediate danger to '
      + 'life/ongoing violence/matter needing immediate Police involvement; High = serious matter needing prompt action but no immediate threat to life; '
      + 'Standard = an ordinary community matter suited to LC-level mediation), then on the next line a one-sentence reason, then a blank line, then a '
      + 'short "Immediate priorities" numbered list. Do not include the URGENCY_LEVEL line until you actually have enough information to assess it. '
      + _lcSafetyRules;
  }

  function _lcGuidanceSysCtx() {
    return 'You are the LC Emergency Assistant inside JusticeLink, answering a Local Council (LC) official\'s procedural or mediation question in Uganda during an urgent community matter. '
      + _lcTranscriptText()
      + 'Structure your reply with these bolded section headers where relevant, using **Header** markdown-style bold: **Immediate priorities**, '
      + '**Relevant LC procedure / mediation guidance**, **Information to document**, **Possible next steps**, **Relevant JusticeLink resources**. Keep it '
      + 'concise -- this is an emergency context, avoid unnecessarily long answers. ' + _lcSafetyRules;
  }

  function _lcRenderUrgentReply(reply) {
    var m = /^URGENCY_LEVEL:\s*(Critical|High|Standard)\s*\n?([^\n]*)\n*/i.exec(reply);
    var body = reply;
    var badge = '';
    if (m) {
      var level = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      var reason = (m[2] || '').trim();
      _aiState.lc.urgency = level;
      _aiState.lc.urgencyReason = reason;
      body = reply.slice(m[0].length);
      var color = _lawyerUrgencyColors[level] || '#555';
      badge = '<div style="background:#f5f5f5;border-left:4px solid ' + color + ';border-radius:6px;padding:8px 12px;margin-bottom:8px;">'
        + '<div style="font-weight:700;color:' + color + ';">Urgency: ' + _esc(level.toUpperCase()) + '</div>'
        + (reason ? '<div style="font-size:12px;color:#555;margin-top:2px;"><strong>Reason:</strong> ' + _esc(reason) + '</div>' : '')
        + '</div>';
    }
    return badge + _lawyerFormatReply(body);
  }

  function _lcAiUnavailableMessage() {
    return 'The assistant is temporarily unavailable. You can still access your cases, law library, LC forms and other JusticeLink services.';
  }

  function _lcAiSendMessage() {
    var input = document.getElementById('aiTextInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    _addUserBubble(text);
    _aiState.lc.transcript.push({ role: 'lc', text: text });

    var area = _getChatArea();
    var typingId = 'ai-typing-' + Date.now();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }

    var mode = _aiState.assistantMode;

    if (mode === 'lc_research') {
      if (typeof _lawLibraryQuery !== 'function') {
        var elMissing = document.getElementById(typingId);
        if (elMissing) elMissing.remove();
        _addBotBubble(_lcAiUnavailableMessage(), 0);
        _addWidget(_lcActionsBar(), 200);
        return;
      }
      _lawLibraryQuery(text, 'LC Legal Research', 'Local Council officials').then(function (res) {
        var el = document.getElementById(typingId);
        if (el) el.remove();
        if (!res || !res.reply) {
          _addBotBubble(_lcAiUnavailableMessage(), 0);
          _addWidget(_lcActionsBar(), 200);
          return;
        }
        _aiState.lc.transcript.push({ role: 'assistant', text: res.reply });
        var sourcesHtml = '';
        if (Array.isArray(res.sources) && res.sources.length) {
          sourcesHtml = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eef1f8;font-size:11px;color:#777;">'
            + '<strong>Sources:</strong> ' + res.sources.map(function (s) {
              return _esc([s.documentTitle, s.legalSection].filter(Boolean).join(' \u2014 ') || 'Legal Knowledge library');
            }).join('; ') + '</div>';
        }
        _addBotBubble(_lawyerFormatReply(res.reply) + sourcesHtml, 0);
        _addWidget(_lcActionsBar(), 300);
      });
      return;
    }

    var sysCtx = mode === 'lc_urgent_case' ? _lcUrgentCaseSysCtx()
      : _lcGuidanceSysCtx();

    _callHuggingFaceBackend(text, sysCtx, true).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (!reply) {
        _addBotBubble(_lcAiUnavailableMessage(), 0);
        _addWidget(_lcActionsBar(), 200);
        return;
      }
      _aiState.lc.transcript.push({ role: 'assistant', text: reply });
      var html = mode === 'lc_urgent_case' ? _lcRenderUrgentReply(reply) : _lawyerFormatReply(reply);
      _addBotBubble(html, 0);
      _addWidget(_lcActionsBar(), 300);
    });
  }

  function _lcStartFindCase() {
    _aiState.assistantMode = 'lc_find_case';
    _aiState.chatMode = false;
    var html = '<div style="display:flex;gap:6px;margin-top:4px;">'
      + '<input id="lcCaseSearchInputAi" type="text" placeholder="Citizen name or case ID..." style="flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;" onkeydown="if(event.key===\'Enter\')window._lcRunCaseSearch();">'
      + '<button class="ai-choice-btn" onclick="window._lcRunCaseSearch()">Search</button>'
      + '</div>';
    _addBotBubble('Who or which case are you looking for?', 0);
    _addWidget(html, 200);
  }

  window._lcRunCaseSearch = async function () {
    var input = document.getElementById('lcCaseSearchInputAi');
    var q = (input && input.value || '').trim().toLowerCase();
    if (!q) return;
    _addUserBubble(q);
    var uname = _lcCurrentUsername();
    if (!uname) { _addBotBubble(_lcAiUnavailableMessage(), 0); return; }
    try {
      var resp = await fetch(API_ENDPOINTS.lcCases(uname), { headers: getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to load cases');
      var data = await resp.json();
      var cases = Array.isArray(data) ? data : (data.cases || data.data || []);
      var matches = cases.filter(function (c) {
        var hay = ((c.case_reference || c.caseId || '') + ' ' + (c.citizen_name || c.citizen || '') + ' ' + (c.case_type || c.caseType || '')).toLowerCase();
        return hay.indexOf(q) !== -1;
      }).slice(0, 5);
      if (!matches.length) {
        _addBotBubble('No matching case found among your assigned or unclaimed cases for "' + _esc(q) + '".', 0);
        _addWidget(_lcActionsBar(), 150);
        return;
      }
      var html = matches.map(function (c) {
        var ref = c.case_reference || c.caseId || '';
        return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafbff;">'
          + '<div style="font-weight:700;color:#1a237e;">' + _esc(ref) + '</div>'
          + '<div style="font-size:12px;color:#444;">Citizen: ' + _esc(c.citizen_name || c.citizen || 'Unknown') + '</div>'
          + '<div style="font-size:12px;color:#444;">Type: ' + _esc(c.case_type || c.caseType || 'N/A') + '</div>'
          + '<div style="font-size:12px;color:#444;">Status: ' + _esc(c.status || 'N/A') + '</div>'
          + '<div style="font-size:12px;color:#444;">Assigned LC: ' + _esc(c.assigned_lc || uname) + '</div>'
          + '<div style="font-size:12px;color:#444;">Location: ' + _esc((c.village || '') + (c.parish ? ', ' + c.parish : '')) + '</div>'
          + '<div style="font-size:12px;color:#444;">Latest update: ' + _esc(c.updatedAt || c.updated_at || 'N/A') + '</div>'
          + '<div style="margin-top:6px;display:flex;gap:6px;">'
          + '<button class="ai-choice-btn" onclick="viewCase(\'' + _esc(ref).replace(/'/g, "\\'") + '\')">Open Case</button>'
          + '<button class="ai-choice-btn" onclick="window._lcLinkCase(\'' + _esc(ref).replace(/'/g, "\\'") + '\')">Link to This Matter</button>'
          + '</div></div>';
      }).join('');
      _addWidget(html, 0);
      _addWidget(_lcActionsBar(), 200);
    } catch (e) {
      _addBotBubble(_lcAiUnavailableMessage(), 0);
    }
  };

  window._lcLinkCase = function (caseRef) {
    _aiState.lc.caseId = caseRef;
    _addBotBubble('Linked this matter to case <strong>' + _esc(caseRef) + '</strong>. You can now create a case note against it.', 0);
    _addWidget(_lcActionsBar(), 150);
  };

  function _lcFindNearby() {
    _aiState.assistantMode = 'lc_nearby';
    _aiState.chatMode = false;
    _addBotBubble('Looking for nearby justice resources...', 0);
    if (!navigator.geolocation) {
      _addBotBubble('Location information cannot currently be determined on this device.', 400);
      _addWidget(_lcActionsBar(), 500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) { _lcRenderNearby(pos.coords.latitude, pos.coords.longitude); },
      function () {
        _addBotBubble('Location information cannot currently be determined -- please check location permissions.', 300);
        _addWidget(_lcActionsBar(), 400);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }

  async function _lcRenderNearby(lat, lng) {
    var results = [];
    _aiState.userLat = lat;
    _aiState.userLng = lng;
    try {
      var live = typeof _aiEmergencyFetchLiveMap === 'function'
        ? await _aiEmergencyFetchLiveMap(
            [
              { type: 'local_government_office', label: 'Local Council Office' },
              { type: 'police', label: 'Police Station' },
              { type: 'lawyer', keyword: 'legal aid organization', label: 'Legal Aid Organization' }
            ],
            25000
          )
        : [];
      results = (Array.isArray(live) ? live : []).map(function (p) {
        return { _type: p._aiPlaceLabel || 'Nearby Service', name: p.name, latitude: p.latitude, longitude: p.longitude, place_id: p.place_id };
      });
    } catch (e) { results = []; }

    if (!results.length) {
      _addBotBubble('No justice services found near your current location.', 0);
      _addWidget(_lcActionsBar(), 150);
      return;
    }
    var html = results.slice(0, 8).map(function (s) {
      var sLat = parseFloat(s.latitude || s.lat), sLng = parseFloat(s.longitude || s.lng);
      var dist = isFinite(sLat) && isFinite(sLng) ? distanceKm(lat, lng, sLat, sLng).toFixed(1) + ' km' : '';
      var name = s.name || s.officeName || s.orgName || s._type;
      var mapUrl = isFinite(sLat) && isFinite(sLng) ? 'https://www.google.com/maps/search/?api=1&query=' + sLat + ',' + sLng : null;
      var dirUrl = isFinite(sLat) && isFinite(sLng) ? 'https://www.google.com/maps/dir/?api=1&destination=' + sLat + ',' + sLng : null;
      return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafbff;">'
        + '<div style="font-weight:700;color:#1a237e;">' + _esc(name) + '</div>'
        + '<div style="font-size:11px;color:#888;">' + _esc(s._type) + (dist ? ' &middot; ' + dist : '') + '</div>'
        + '<div style="margin-top:6px;display:flex;gap:6px;">'
        + (mapUrl ? '<a class="ai-choice-btn" style="text-decoration:none;" href="' + mapUrl + '" target="_blank" rel="noopener">View on Map</a>' : '')
        + (dirUrl ? '<a class="ai-choice-btn" style="text-decoration:none;" href="' + dirUrl + '" target="_blank" rel="noopener">Get Directions</a>' : '')
        + '</div></div>';
    }).join('');
    _addWidget(html, 0);
    _addWidget(_lcActionsBar(), 150);
  }

  function _lcCreateCaseNote() {
    _aiState.assistantMode = 'lc_note';
    _aiState.chatMode = false;
    if (!_aiState.lc.transcript.length) {
      _addBotBubble('Let\'s gather a few details first -- tell me what happened, or use Urgent Case to walk through it.', 0);
      _addWidget(_lcActionsBar(), 150);
      return;
    }
    _addBotBubble('Drafting a structured case note from this conversation...', 0);
    var sysCtx = 'You are drafting an emergency case note for a Uganda-based Local Council official inside JusticeLink, based on the conversation transcript below. '
      + _lcTranscriptText()
      + 'Write the note using exactly these section headers (plain text, one per line, blank line between sections): '
      + 'Incident Summary / People and Villages Involved / Immediate Risk / Actions Already Taken / LC Jurisdiction Assessment / Suggested Next Steps / Evidence and Documents. '
      + 'Only include information actually present in the conversation -- write "Not yet established" for anything missing. Do not invent facts. Keep it concise and factual.';
    _callHuggingFaceBackend('Draft the emergency case note now.', sysCtx).then(function (reply) {
      var noteText = reply || _lcFallbackNote();
      var caseInfoHeader = 'Case: ' + (_aiState.lc.caseId || 'Not yet linked to a JusticeLink case')
        + (_aiState.lc.urgency ? '\nUrgency: ' + _aiState.lc.urgency + (_aiState.lc.urgencyReason ? ' -- ' + _aiState.lc.urgencyReason : '') : '')
        + '\nDate: ' + new Date().toLocaleString();
      var fullDraft = caseInfoHeader + '\n\n' + noteText;
      var html = '<div style="font-size:11px;font-weight:700;color:#b42318;margin-bottom:4px;">Draft &mdash; Requires LC Official Review</div>'
        + '<textarea id="lcCaseNoteDraft" style="width:100%;min-height:220px;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:12px;font-family:inherit;line-height:1.5;">' + _esc(fullDraft) + '</textarea>'
        + '<div style="margin-top:8px;display:flex;gap:6px;">'
        + '<button class="ai-choice-btn" style="background:#1a237e;color:#fff;border-color:#1a237e;" onclick="window._lcSaveCaseNote()">Save to Case</button>'
        + '<button class="ai-choice-btn" onclick="_lcShowMenu()">Cancel</button>'
        + (!_aiState.lc.caseId ? '<button class="ai-choice-btn" onclick="window._lcSelectAction(\'findCase\')">Find Case to Link</button>' : '')
        + '</div>';
      _addWidget(html, 0);
    });
  }

  function _lcFallbackNote() {
    return _aiState.lc.transcript.filter(function (t) { return t.role === 'lc'; })
      .map(function (t) { return '- ' + t.text; }).join('\n') || 'No details captured yet.';
  }

  window._lcSaveCaseNote = async function () {
    var caseId = _aiState.lc.caseId;
    if (!caseId) {
      _addBotBubble('Please link this matter to a case first using "Find Case to Link".', 0);
      return;
    }
    var textarea = document.getElementById('lcCaseNoteDraft');
    var noteText = textarea ? textarea.value : '';
    if (!noteText.trim()) { _addBotBubble('The case note is empty.', 0); return; }
    var uname = _lcCurrentUsername();
    try {
      var resp = await fetch(API_ENDPOINTS.advice(caseId), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          legalAdvice: '[Emergency Case Note]\n\n' + noteText,
          legalAdviceDate: new Date().toISOString(),
          legalAdviceProvidedBy: uname,
          legal_advice_provided_by: uname
        })
      });
      if (!resp.ok) throw new Error('Save failed');
      _addBotBubble('Case note saved to <strong>' + _esc(caseId) + '</strong>.', 0);
      _addWidget(_lcActionsBar(), 150);
    } catch (e) {
      _addBotBubble(_lcAiUnavailableMessage(), 0);
    }
  };

  function _lcEscalate() {
    _aiState.assistantMode = 'lc_escalate';
    _aiState.chatMode = false;
    var summary = _aiState.lc.transcript.filter(function (t) { return t.role === 'lc'; })
      .map(function (t) { return t.text; }).join(' ').slice(0, 400) || 'No details captured yet -- please describe the matter first.';
    var urgency = _aiState.lc.urgency || 'Not yet assessed';
    var html = '<div style="border:1.5px solid #b42318;border-radius:10px;padding:12px 14px;background:#fff5f5;">'
      + '<div style="font-weight:700;color:#b42318;margin-bottom:8px;">Escalate this matter?</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Matter:</strong> ' + _esc(summary) + '</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Urgency:</strong> ' + _esc(urgency) + '</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Recipient:</strong> JusticeLink Support (Admin)</div>'
      + (_aiState.lc.caseId ? '<div style="font-size:12px;margin-bottom:4px;"><strong>Linked case:</strong> ' + _esc(_aiState.lc.caseId) + '</div>' : '')
      + '<div style="margin-top:10px;display:flex;gap:6px;">'
      + '<button class="ai-choice-btn" style="background:#b42318;color:#fff;border-color:#b42318;" onclick="window._lcConfirmEscalate()">Confirm Escalation</button>'
      + '<button class="ai-choice-btn" onclick="_lcShowMenu()">Cancel</button>'
      + '</div></div>';
    _addBotBubble('Please review before this is sent.', 0);
    _addWidget(html, 200);
  }

  window._lcConfirmEscalate = async function () {
    var uname = _lcCurrentUsername();
    var fullname = sessionStorage.getItem('lcdjp_fullname') || uname;
    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || 'LC';
    var summary = _aiState.lc.transcript.filter(function (t) { return t.role === 'lc'; })
      .map(function (t) { return t.text; }).join(' ').slice(0, 500);
    var urgency = _aiState.lc.urgency || 'Not yet assessed';
    var msgObj = {
      from: uname, fromName: fullname, fromRole: userLevel,
      message: '[URGENT - LC Emergency Assistant] Urgency: ' + urgency
        + (_aiState.lc.caseId ? ' | Case: ' + _aiState.lc.caseId : '')
        + ' | Summary: ' + (summary || 'No details captured.'),
      type: 'text', sentTo: 'admin', timestamp: new Date().toISOString(),
      read: false, delivered: false, reply: null, replyTimestamp: null
    };
    try {
      var resp = await fetch(API_ENDPOINTS.chatMessages, _chatFetchOpts({ 'Content-Type': 'application/json' }, JSON.stringify(toChatServerPayload(msgObj)), 'POST'));
      if (!resp.ok) throw new Error('Escalation failed');
      if (typeof createEnhancedNotification === 'function') {
        resp.clone().json().then(function (row) {
          var recipient = (row && (row.recipient || row.sent_to || row.sentTo)) || '';
          if (!recipient) return;
          createEnhancedNotification(
            recipient,
            fullname + ' escalated an urgent matter' + (_aiState.lc.caseId ? ' (case ' + _aiState.lc.caseId + ')' : ''),
            'urgent',
            _aiState.lc.caseId || null
          ).catch(function (e) { console.warn('Could not notify recipient of escalation:', e); });
        }).catch(function (e) { console.warn('Could not read escalation recipient:', e); });
      }
      _addBotBubble('This matter has been escalated to JusticeLink Support. They will follow up as soon as possible.', 0);
      _addWidget(_lcActionsBar(), 150);
    } catch (e) {
      _addBotBubble('Escalation could not be sent right now -- please use Contact Support directly, or call emergency services if this is life-threatening.', 0);
      _addWidget(_lcActionsBar(), 150);
    }
  };

  function closeAIAssistant() {
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      modal.classList.remove('open');
      _aiHideTimer = setTimeout(function() {
        modal.style.display = 'none';
        _aiHideTimer = null;
      }, 300);
    }
    _aiUnlockBodyScroll();
    if (_aiState && _aiState.assistantMode && _aiState.assistantMode.indexOf('lawyer_') === 0) {
      _lawyerResetHeader();
    }
    if (_aiState && _aiState.assistantMode && _aiState.assistantMode.indexOf('lc_') === 0) {
      _lcResetHeader();
    }
  }
  window.closeAIAssistant = closeAIAssistant;

  document.addEventListener('click', function(e) {
    var modal = document.getElementById('aiAssistantModal');
    if (modal && e.target === modal) closeAIAssistant();
  });

  function _lcdjpDisplayFirstName() {
    var full = sessionStorage.getItem('lcdjp_fullname') || localStorage.getItem('lcdjp_fullname') ||
               sessionStorage.getItem('fullName') || localStorage.getItem('fullName') ||
               sessionStorage.getItem('lcdjp_name') || localStorage.getItem('lcdjp_name') || '';
    full = String(full || '').trim();
    if (full) return full.split(' ')[0];
    var uname = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    return uname || 'there';
  }
  window._lcdjpDisplayFirstName = _lcdjpDisplayFirstName;

  function _updateBannerName() {
    var name = _lcdjpDisplayFirstName();
    var el = document.getElementById('bannerUserName');
    if (el) el.textContent = name || 'there';
  }

  var _origLogin = window.loginUser;
  if (typeof _origLogin === 'function') {
    window.loginUser = function() {
      var r = _origLogin.apply(this, arguments);
      setTimeout(_updateBannerName, 500);
      return r;
    };
  }
  
  function _updateMobileBannerName() {
    var name = _lcdjpDisplayFirstName();
    var el = document.getElementById('cmBannerUserName');
    if (el) el.textContent = name || 'there';
  }
  document.addEventListener('DOMContentLoaded', function() {
    
    var _m = document.getElementById('aiAssistantModal');
    if (_m && _m.parentElement !== document.body) { document.body.appendChild(_m); }
    _updateBannerName();
    _updateMobileBannerName();
  });
  setTimeout(function() { _updateBannerName(); _updateMobileBannerName(); }, 1000);
  
  var _origLogin2 = window.loginUser;
  if (typeof _origLogin2 === 'function') {
    window.loginUser = function() {
      var r = _origLogin2.apply(this, arguments);
      setTimeout(_updateMobileBannerName, 500);
      return r;
    };
  }

})();






(function () {
  'use strict';

  function cdSync() {
    
    var h = new Date().getHours();
    var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    var tg = document.getElementById('cdgTimeGreet');
    if (tg) tg.textContent = greet;

    
    var src = document.getElementById('bannerUserName');
    var dst = document.getElementById('cdgUserName');
    if (src && dst && src.textContent && src.textContent.trim() !== 'there') {
      dst.textContent = src.textContent.trim();
    }

    
    var lbl = document.getElementById('accountMenuDropdownLabel');
    var cdtName = document.getElementById('cdtUserName');
    var cdtAv = document.getElementById('cdtAvatar');
    if (lbl && cdtName && lbl.textContent && lbl.textContent !== 'My Account') {
      var nm = lbl.textContent.trim();
      cdtName.textContent = nm.split(' ')[0] || nm;
      if (cdtAv) {
        var parts = nm.split(' ');
        cdtAv.textContent = (parts[0][0] || '') + (parts[1] ? parts[1][0] : '');
        cdtAv.textContent = cdtAv.textContent.toUpperCase() || 'U';
      }
    }

    
    function syncStat(srcId, dstId) {
      var s = document.getElementById(srcId);
      var d = document.getElementById(dstId);
      if (s && d) d.textContent = s.textContent;
    }
    syncStat('cmStatCases',  'cdgStatCases');
    syncStat('cmStatMsg',    'cdgStatMsg');
    syncStat('cmStatAlerts', 'cdgStatAlerts');
    syncStat('cmStatNearby', 'cdgStatNearby');

    
    var cmBadge = document.getElementById('cmMsgBadge');
    var cdnBadge = document.getElementById('cdnMsgBadge');
    var cdtMsgBadge = document.getElementById('cdtMsgBadge');
    if (cmBadge && cdnBadge) {
      var shown = cmBadge.style.display !== 'none' && cmBadge.textContent.trim() !== '0';
      cdnBadge.textContent = cmBadge.textContent;
      cdnBadge.style.display = shown ? 'inline-block' : 'none';
    }
    
    if (cmBadge && cdtMsgBadge) {
      var mShown = cmBadge.style.display !== 'none' && cmBadge.textContent.trim() !== '0';
      cdtMsgBadge.textContent = cmBadge.textContent;
      cdtMsgBadge.style.display = mShown ? 'inline-block' : 'none';
    }

    
    var notifEl = document.getElementById('notifCount');
    var cdtNotif = document.getElementById('cdtNotifBadge');
    if (notifEl && cdtNotif) {
      var nShown = notifEl.style.display !== 'none' && notifEl.textContent.trim() !== '0' && notifEl.textContent.trim() !== '';
      cdtNotif.textContent = notifEl.textContent;
      cdtNotif.style.display = nShown ? 'inline-block' : 'none';
    }

    
    var roleEl = document.getElementById('cdtUserRole');
    if (roleEl) {
      var storedRole = localStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('userRole') || sessionStorage.getItem('currentRole') || 'Citizen';
      if (typeof currentUserRole !== 'undefined' && currentUserRole) storedRole = currentUserRole;
      roleEl.textContent = storedRole.charAt(0).toUpperCase() + storedRole.slice(1);
    }

    
    
    
    
    var adtName = document.getElementById('adtUserName');
    var adtAv = document.getElementById('adtAvatar');
    if (lbl && adtName && lbl.textContent && lbl.textContent !== 'My Account') {
      var admNm = lbl.textContent.trim();
      adtName.textContent = admNm.split(' ')[0] || admNm;
      if (adtAv) {
        var admParts = admNm.split(' ');
        adtAv.textContent = ((admParts[0][0] || '') + (admParts[1] ? admParts[1][0] : '')).toUpperCase() || 'A';
      }
    }

    var adminMsgBadgeEl = document.getElementById('adminMsgBadge');
    var adtMsgBadge = document.getElementById('adtMsgBadge');
    var amMsgBadge = document.getElementById('amMsgBadge');
    if (adminMsgBadgeEl && adtMsgBadge) {
      var admMShown = adminMsgBadgeEl.style.display !== 'none' && adminMsgBadgeEl.textContent.trim() !== '0';
      adtMsgBadge.textContent = adminMsgBadgeEl.textContent;
      adtMsgBadge.style.display = admMShown ? 'inline-block' : 'none';
      if (amMsgBadge) {
        amMsgBadge.textContent = adminMsgBadgeEl.textContent;
        amMsgBadge.style.display = admMShown ? 'flex' : 'none';
      }
    }

    var adtNotif = document.getElementById('adtNotifBadge');
    if (notifEl && adtNotif) {
      var admNShown = notifEl.style.display !== 'none' && notifEl.textContent.trim() !== '0' && notifEl.textContent.trim() !== '';
      adtNotif.textContent = notifEl.textContent;
      adtNotif.style.display = admNShown ? 'inline-block' : 'none';
    }

    
    
    
    

    var adtRoleEl = document.getElementById('adtUserRole');
    if (adtRoleEl) {
      var admLevel = localStorage.getItem('lcdjp_userlevel') || '';
      adtRoleEl.textContent = (admLevel === 'DISTRICT_ADMIN') ? 'District Admin' : 'System Admin';
    }
  }

  
  cdSync();
  setInterval(cdSync, 1500);

  
  var targets = ['cmStatCases','cmStatMsg','cmStatAlerts','cmStatNearby','bannerUserName','accountMenuDropdownLabel','cmMsgBadge','notifCount','adminMsgBadge'];
  var obs = new MutationObserver(cdSync);
  var moOpts = { childList: true, characterData: true, subtree: true, attributes: true };
  function observeTarget(id) {
    var el = document.getElementById(id);
    if (el) obs.observe(el, moOpts);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { targets.forEach(observeTarget); cdSync(); });
  } else {
    targets.forEach(observeTarget);
    cdSync();
  }
})();





(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function serviceType(service) {
    var raw = String(service.type || service.serviceType || service.category || '').toLowerCase();
    if (raw.indexOf('police') !== -1) return 'Police';
    if (raw.indexOf('hospital') !== -1 || raw.indexOf('medical') !== -1) return 'Hospital';
    if (raw.indexOf('court') !== -1) return 'Court';
    if (raw.indexOf('legal') !== -1 || raw.indexOf('law') !== -1) return 'Legal Aid';
    if (raw.indexOf('council') !== -1 || raw.indexOf('lc') !== -1) return 'Local Council';
    return service.type || service.serviceType || 'Public Service';
  }

  var meta = {
    'Local Council': { icon: '', bg: '#e8f0fe' },
    'Police': { icon: '', bg: '#e8eaf6' },
    'Court': { icon: '', bg: '#fff3e0' },
    'Hospital': { icon: '', bg: '#fce4ec' },
    'Legal Aid': { icon: '', bg: '#f3e5f5' },
    'Public Service': { icon: '', bg: '#f4f6f8' }
  };

  function distanceKm(lat1, lng1, lat2, lng2) {
    var r = 6371, rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * rad) * Math.cos(lat2 * rad)
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function distanceLabel(km) {
    return km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km';
  }

  function mapIdFor(type, service) {
    if (service.mapId) return service.mapId;
    return {
      'Local Council': 'localCouncil',
      'Police': 'police',
      'Court': 'courts',
      'Hospital': 'hospitals',
      'Legal Aid': 'legalAid'
    }[type] || null;
  }

  function setMapCounts(services) {
    var counts = { localCouncil: 0, police: 0, courts: 0, hospitals: 0, legalAid: 0 };
    services.forEach(function (service) {
      var type = serviceType(service);
      var key = {
        'Local Council': 'localCouncil',
        'Police': 'police',
        'Court': 'courts',
        'Hospital': 'hospitals',
        'Legal Aid': 'legalAid'
      }[type];
      if (key) counts[key] += 1;
    });
    Object.keys(counts).forEach(function (key) {
      document.querySelectorAll('[data-map-count="' + key + '"]').forEach(function (el) {
        el.textContent = counts[key];
      });
    });
  }

  function renderLocationServices(lat, lng, source) {
    var services = (Array.isArray(source) ? source : []).map(function (service) {
      var serviceLat = parseFloat(service.latitude || service.lat);
      var serviceLng = parseFloat(service.longitude || service.lng || service.lon);
      if (!isFinite(serviceLat) || !isFinite(serviceLng)) return null;
      var copy = Object.assign({}, service);
      copy.lat = serviceLat;
      copy.lng = serviceLng;
      copy.type = serviceType(copy);
      copy._km = distanceKm(lat, lng, serviceLat, serviceLng);
      copy.mapId = mapIdFor(copy.type, copy);
      return copy;
    }).filter(Boolean).sort(function (a, b) { return a._km - b._km; });

    setMapCounts(services);
    window._lcdjpNearbySvcs = services.slice(0, 6);
    var mobileList = document.getElementById('cmNearbyServicesList');
    var desktopList = document.getElementById('cdDesktopNearbyList');
    var visible = services.slice(0, 6);
    if (!visible.length) {
      var empty = '<div class="desktop-nearby-loading">No services were found near your current location.</div>';
      if (mobileList) mobileList.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#888;font-size:11px;">No nearby services found.</div>';
      if (desktopList) desktopList.innerHTML = empty;
      var stat = document.getElementById('cmStatNearby');
      if (stat) stat.textContent = '0';
      return;
    }

    if (mobileList) {
      mobileList.innerHTML = visible.map(function (service, index) {
        var serviceMeta = meta[service.type] || meta['Public Service'];
        var label = service.label || service.name || service.orgName || 'Service';
        return '<div class="cm-nearby-item" style="cursor:pointer;" onclick="window._lcdjpNearbyClick(window._lcdjpNearbySvcs[' + index + '])">'
          + '<div class="cm-nearby-dot" style="background:' + serviceMeta.bg + ';font-size:14px;text-align:center;">' + serviceMeta.icon + '</div>'
          + '<div class="cm-nearby-info"><div class="cm-nearby-name">' + esc(label) + '</div>'
          + '<div class="cm-nearby-type">' + esc(service.type) + '</div></div>'
          + '<div class="cm-nearby-dist">' + distanceLabel(service._km) + '</div></div>';
      }).join('');
    }
    if (desktopList) {
      desktopList.innerHTML = visible.map(function (service, index) {
        var serviceMeta = meta[service.type] || meta['Public Service'];
        var label = service.label || service.name || service.orgName || 'Service';
        return '<div class="desktop-nearby-item" onclick="window._lcdjpNearbyClick(window._lcdjpNearbySvcs[' + index + '])">'
          + '<div class="desktop-nearby-icon" style="background:' + serviceMeta.bg + ';">' + serviceMeta.icon + '</div>'
          + '<div class="desktop-nearby-copy"><div class="desktop-nearby-name">' + esc(label) + '</div>'
          + '<div class="desktop-nearby-type">' + esc(service.type) + '</div></div>'
          + '<div class="desktop-nearby-distance">' + distanceLabel(service._km) + '</div>'
          + '<span style="color:#9ca3af;font-size:16px;">›</span></div>';
      }).join('');
    }
    var stat = document.getElementById('cmStatNearby');
    if (stat) stat.textContent = String(visible.length);
  }

  function loadingNearby() {
    var mobileList = document.getElementById('cmNearbyServicesList');
    var desktopList = document.getElementById('cdDesktopNearbyList');
    if (mobileList) mobileList.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#888;font-size:11px;">Detecting your location…</div>';
    if (desktopList) desktopList.innerHTML = '<div class="desktop-nearby-loading">Detecting your location…</div>';
  }

  
  function _showNoServices(msg) {
    var _ml = document.getElementById('cmNearbyServicesList');
    var _dl = document.getElementById('cdDesktopNearbyList');
    var txt = msg || 'No registered services found near this location.';
    if (_ml) _ml.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#64748b;font-size:11px;">' + txt + '</div>';
    if (_dl) _dl.innerHTML = '<div class="desktop-nearby-loading">' + txt + '</div>';
  }

  
  
  
  
  
  
  
  
  
  
  var _nearbyLiveMapQueries = [
    { type: 'local_government_office', label: 'Local Council' },
    { type: 'police',                  label: 'Police' },
    { type: 'lawyer',                  label: 'Legal Aid' },
    { type: 'courthouse',              label: 'Court' },
    { type: 'hospital',                label: 'Hospital' }
  ];

  function _nearbyGetPlacesService() {
    if (!window.google || !google.maps.places) return null;
    if (!window._nearbyPlacesServiceNode) window._nearbyPlacesServiceNode = document.createElement('div');
    if (!window._nearbyPlacesService) window._nearbyPlacesService = new google.maps.places.PlacesService(window._nearbyPlacesServiceNode);
    return window._nearbyPlacesService;
  }

  function _nearbyFetchLiveMap(lat, lng, radiusMeters) {
    return loadGoogleMapsSDK().then(function () {
      var service = _nearbyGetPlacesService();
      if (!service) return [];
      var pending = _nearbyLiveMapQueries.map(function (q) {
        return new Promise(function (resolve) {
          service.nearbySearch({ location: { lat: lat, lng: lng }, radius: Math.min(radiusMeters, 50000), type: q.type }, function (items, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !items) { resolve([]); return; }
            resolve(items.slice(0, 8).map(function (place) {
              var loc = place.geometry && place.geometry.location;
              if (!loc) return null;
              return {
                latitude: loc.lat(),
                longitude: loc.lng(),
                label: place.name || q.label,
                type: q.label,
                place_id: place.place_id || ''
              };
            }).filter(Boolean));
          });
        });
      });
      return Promise.all(pending).then(function (lists) { return [].concat.apply([], lists); });
    }).catch(function () { return []; });
  }

  function fetchNearbyAtLocation(lat, lng) {
    _nearbyFetchLiveMap(lat, lng, 20000).then(function (results) {
        if (results.length) { renderLocationServices(lat, lng, results); return; }
        
        
        
        
        _nearbyFetchLiveMap(lat, lng, 50000).then(function (wider) {
            if (wider.length) renderLocationServices(lat, lng, wider);
            else _showNoServices('No services found on the map near this location.');
        });
    }).catch(function () {
        _showNoServices('Could not load services. Check your connection.');
    });
}

  
  window._lcdjpFetchNearby   = fetchNearbyAtLocation;
  window._lcdjpRenderNearby  = renderLocationServices;
  window._lcdjpLoadingNearby = loadingNearby;

  window.initNearbyServices = function () {
    loadingNearby();

    
    
    
    
    
    
    
    if (window._lcdjpUserPosition &&
        isFinite(window._lcdjpUserPosition.lat) && isFinite(window._lcdjpUserPosition.lng)) {
      fetchNearbyAtLocation(window._lcdjpUserPosition.lat, window._lcdjpUserPosition.lng);
      return;
    }

    if (!navigator.geolocation) {
      var noGeo = '<div class="desktop-nearby-loading">Location access is required to show nearby services.</div>';
      var desktopList = document.getElementById('cdDesktopNearbyList');
      var mobileList = document.getElementById('cmNearbyServicesList');
      if (desktopList) desktopList.innerHTML = noGeo;
      if (mobileList) mobileList.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#888;font-size:11px;">Allow location access to find services.</div>';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (position) { fetchNearbyAtLocation(position.coords.latitude, position.coords.longitude); },
      function () {
        var desktopList = document.getElementById('cdDesktopNearbyList');
        var mobileList = document.getElementById('cmNearbyServicesList');
        if (desktopList) desktopList.innerHTML = '<div class="desktop-nearby-loading">Location unavailable. Allow access to find services near you.</div>';
        if (mobileList) mobileList.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#888;font-size:11px;">Location unavailable.</div>';
        var stat = document.getElementById('cmStatNearby');
        if (stat) stat.textContent = '0';
      },
      
      
      
      
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  };

  
  
  
  
  
  
  
  
  window.toggleChat = function () {
    var chatWindow = document.getElementById('chatWindow');
    var labels = document.getElementById('chatLabels');
    var container = document.getElementById('chatContainer');
    if (!chatWindow) return;
    var opening = chatWindow.style.display !== 'flex';
    chatWindow.style.display = opening ? 'flex' : 'none';
    if (labels) labels.style.display = opening ? 'none' : '';
    
    
    
    
    
    if (container) container.classList.toggle('lcdjp-chat-open', opening);

    
    
    
    
    
    if (opening) {
        if (typeof window._loadSupportChatHistory === 'function') window._loadSupportChatHistory();
        if (window._supportChatHistoryTimer) clearInterval(window._supportChatHistoryTimer);
        window._supportChatHistoryTimer = setInterval(function () {
            if (typeof window._loadSupportChatHistory === 'function') window._loadSupportChatHistory();
        }, 8000);
    } else if (window._supportChatHistoryTimer) {
        clearInterval(window._supportChatHistoryTimer);
        window._supportChatHistoryTimer = null;
    }
  };

  
  
  
  window._renderSupportChatMessages = function (msgs, username) {
    var messagesEl = document.getElementById('chatMessages');
    if (!messagesEl) return;
    if (!msgs.length) {
        messagesEl.innerHTML = '<div class="welcome-msg" style="text-align:center; color:#bbb; padding:15px 0; font-size:10px; display:flex; flex-direction:column; align-items:center; gap:3px;">' +
            '<div style="font-weight:500; color:#999; font-size:10px;">Welcome to JusticeLink Support</div>' +
            '<div style="font-size:9px; color:#ccc;">Send us a message</div>' +
        '</div>';
        return;
    }
    msgs.sort(function (a, b) { return new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0); });
    messagesEl.innerHTML = msgs.map(function (m) {
        
        
        var fromUser = m.from_user || m.fromUser || m.from || '';
        var isMine = fromUser === username;
        var text = m.message || m.text || m.message_text || '';
        var style = isMine
            ? 'margin:4px 0 4px auto;background:#1a4080;color:#fff;border-radius:12px 12px 2px 12px;'
            : 'margin:4px auto 4px 0;background:#eef1f6;color:#333;border-radius:12px 12px 12px 2px;';
        return '<div style="' + style + 'padding:6px 10px;max-width:80%;font-size:11px;word-wrap:break-word;">' +
            (typeof _cmEsc === 'function' ? _cmEsc(text) : text) +
        '</div>';
    }).join('');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  window._loadSupportChatHistory = async function () {
    var username = typeof getLcdjpActiveUsername === 'function'
        ? getLcdjpActiveUsername()
        : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!username) return;
    try {
        var resp = await fetch(API_ENDPOINTS.chatUserMessages(username), {
            method: 'GET',
            headers: (typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' })
        });
        if (!resp.ok) return;
        var raw = await resp.json();
        var msgs = Array.isArray(raw) ? raw : (raw.messages || []);
        window._renderSupportChatMessages(msgs, username);
    } catch (e) {
        console.error('Error loading support chat history:', e);
    }
  };

  window.openEmbeddedSupportChat = function () {
    var container = document.getElementById('chatContainer');
    var labels = document.getElementById('chatLabels');
    var chatWindow = document.getElementById('chatWindow');
    if (!container || !chatWindow) return;
    container.style.display = 'block';
    container.classList.add('lcdjp-chat-open');
    if (labels) labels.style.display = 'none';
    if (chatWindow.style.display !== 'flex') {
      if (typeof toggleChat === 'function') toggleChat();
      else chatWindow.style.display = 'flex';
    }
  };

  window.sendChatMessage = function () {
    var input = document.getElementById('chatInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!username) {
      if (typeof showToast === 'function') showToast('Please sign in to send a message.');
      else alert('Please sign in to send a message.');
      return;
    }

    var fullname = sessionStorage.getItem('lcdjp_fullname') || username;
    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || 'Citizen';

    var messagesEl = document.getElementById('chatMessages');
    if (messagesEl) {
      var welcome = messagesEl.querySelector('.welcome-msg');
      if (welcome) welcome.remove();
      var bubble = document.createElement('div');
      bubble.style.cssText = 'margin:4px 0 4px auto;padding:6px 10px;background:#1a4080;color:#fff;' +
        'border-radius:12px 12px 2px 12px;max-width:80%;font-size:11px;word-wrap:break-word;';
      bubble.textContent = text;
      messagesEl.appendChild(bubble);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    input.value = '';

    var payload = {
      from: username,
      fromName: fullname,
      fromRole: userLevel,
      message: text,
      type: 'text',
      sentTo: 'admin',
      timestamp: new Date().toISOString(),
      read: false,
      delivered: false,
      reply: null,
      replyTimestamp: null
    };

    fetch(API_ENDPOINTS.chatMessages, {
      method: 'POST',
      headers: (typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    }).then(function (resp) {
      
      
      
      
      if (resp.ok && typeof window._loadSupportChatHistory === 'function') {
        window._loadSupportChatHistory();
      }

    }).catch(function (err) {
      console.error('Error sending chat message:', err);
      if (messagesEl) {
        var errNote = document.createElement('div');
        errNote.style.cssText = 'text-align:center;font-size:9px;color:#dc3545;margin:4px 0;';
        errNote.textContent = 'Message could not be sent. Please check your connection and try again.';
        messagesEl.appendChild(errNote);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });
  };

  window.openCitizenDesktopMessages = function () {
    if (window.innerWidth < 768) {
      if (typeof openMobileSection === 'function') openMobileSection('citizen', 'Messages', mobileCitizenMessages);
      return;
    }
    var old = document.getElementById('desktopCitizenMessagesPanel');
    if (old) old.remove();
    var panel = document.createElement('div');
    panel.id = 'desktopCitizenMessagesPanel';
    panel.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(11,18,50,.42);display:flex;align-items:flex-start;justify-content:flex-end;padding:76px 24px 24px;';
    panel.innerHTML = '<section style="width:min(460px,calc(100vw - 48px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 55px rgba(0,0,0,.22);">'
      + '<header style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #edf0f6;"><div><h2 style="margin:0;color:#111827;font-size:18px;">Messages</h2><p style="margin:4px 0 0;color:#7b8292;font-size:12px;">Open a case conversation to read and send messages.</p></div><button type="button" aria-label="Close" style="border:0;background:#f3f4f6;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;">&times;</button></header>'
      + '<div id="desktopCitizenMessageList" style="padding:16px 20px;">Loading conversations…</div></section>';
    panel.querySelector('button').onclick = function () { panel.remove(); };
    panel.addEventListener('click', function (event) { if (event.target === panel) panel.remove(); });
    document.body.appendChild(panel);
    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    var list = panel.querySelector('#desktopCitizenMessageList');
    if (!username || typeof API_ENDPOINTS === 'undefined' || typeof API_ENDPOINTS.citizenCases !== 'function') {
      list.textContent = 'Please sign in to view messages.';
      return;
    }
    if (typeof window._lcdjpProtectedDataAccessAllowed === 'function' &&
        !window._lcdjpProtectedDataAccessAllowed()) {
      list.textContent = 'Identity verification is required to view case conversations.';
      return;
    }
      fetch(API_ENDPOINTS.citizenCases(username), {
        suppressAuthRedirect: true,
        headers: getAuthHeaders()
      })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        var cases = payload && payload.success && Array.isArray(payload.cases) ? payload.cases : (Array.isArray(payload) ? payload : []);
        if (!cases.length) { list.textContent = 'No case conversations yet.'; return; }
        list.innerHTML = cases.map(function (item) {
          var ref = item.case_reference || item.caseReference || item.case_number || item.caseNumber || (item.id ? String(item.id) : '') || '';
          var title = item.case_type || item.caseType || 'Case conversation';
          return '<article style="padding:13px 0;border-bottom:1px solid #edf0f6;"><strong style="display:block;color:#1a237e;font-size:13px;">' + esc(title) + '</strong><span style="display:block;margin:4px 0 9px;color:#7b8292;font-size:11px;">' + esc(ref) + '</span><button type="button" data-case-id="' + esc(ref) + '" style="border:0;border-radius:8px;background:#1a237e;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;">Open conversation</button></article>';
        }).join('');
        list.querySelectorAll('[data-case-id]').forEach(function (button) {
          button.onclick = function () {
            panel.remove();
            if (typeof openCitizenMessaging === 'function') openCitizenMessaging(button.getAttribute('data-case-id'));
          };
        });
      })
      .catch(function () { list.textContent = 'Messages could not be loaded. Please try again.'; });
  };

  
  
  
  
  window.openLawyerDesktopMessages = function () {
    if (window.innerWidth < 768) {
      if (typeof mobileLawyerMessages === 'function') mobileLawyerMessages();
      return;
    }
    var old = document.getElementById('desktopLawyerMessagesPanel');
    if (old) old.remove();
    var panel = document.createElement('div');
    panel.id = 'desktopLawyerMessagesPanel';
    panel.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(11,18,50,.42);display:flex;align-items:flex-start;justify-content:flex-end;padding:76px 24px 24px;';
    panel.innerHTML = '<section style="width:min(460px,calc(100vw - 48px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 55px rgba(0,0,0,.22);">'
      + '<header style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #edf0f6;"><div><h2 style="margin:0;color:#111827;font-size:18px;">Messages</h2><p style="margin:4px 0 0;color:#7b8292;font-size:12px;">Open a case conversation to read and send messages.</p></div><button type="button" aria-label="Close" style="border:0;background:#f3f4f6;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;">&times;</button></header>'
      + '<div id="desktopLawyerMessageList" style="padding:16px 20px;">Loading conversations…</div></section>';
    panel.querySelector('button').onclick = function () { panel.remove(); };
    panel.addEventListener('click', function (event) { if (event.target === panel) panel.remove(); });
    document.body.appendChild(panel);
    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    var list = panel.querySelector('#desktopLawyerMessageList');
    var _lvl = sessionStorage.getItem('lcdjp_userlevel') || '';
    var _isLcUser = _lvl === 'LC' || _lvl === 'LC Official' || _lvl === 'LC1' || _lvl === 'LC2' || _lvl === 'LC3';
    var _casesFn = (_isLcUser && typeof API_ENDPOINTS !== 'undefined' && typeof API_ENDPOINTS.lcCases === 'function')
      ? API_ENDPOINTS.lcCases
      : (typeof API_ENDPOINTS !== 'undefined' ? API_ENDPOINTS.lawyerCases : null);
    if (!username || typeof _casesFn !== 'function') {
      list.textContent = 'Please sign in to view messages.';
      return;
    }
    fetch(_casesFn(username), {
      suppressAuthRedirect: true,
      headers: getAuthHeaders()
    })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        var cases = payload && payload.success && Array.isArray(payload.cases) ? payload.cases : (Array.isArray(payload) ? payload : []);
        if (!cases.length) { list.textContent = 'No case conversations yet.'; return; }
        list.innerHTML = cases.map(function (item) {
          var ref = item.case_reference || item.caseReference || item.case_number || item.caseNumber || (item.id ? String(item.id) : '') || '';
          var title = item.case_type || item.caseType || 'Case conversation';
          var citizen = item.citizenName || item.citizen_name || '';
          return '<article style="padding:13px 0;border-bottom:1px solid #edf0f6;"><strong style="display:block;color:#1a237e;font-size:13px;">' + esc(title) + '</strong><span style="display:block;margin:4px 0 9px;color:#7b8292;font-size:11px;">' + (citizen ? esc(citizen) + ' &middot; ' : '') + esc(ref) + '</span><button type="button" data-case-id="' + esc(ref) + '" style="border:0;border-radius:8px;background:#1a237e;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;">Open conversation</button></article>';
        }).join('');
        list.querySelectorAll('[data-case-id]').forEach(function (button) {
          button.onclick = function () {
            panel.remove();
            if (typeof lawyerSendMessage === 'function') lawyerSendMessage(button.getAttribute('data-case-id'));
            else if (typeof openCitizenMessaging === 'function') openCitizenMessaging(button.getAttribute('data-case-id'));
          };
        });
      })
      .catch(function () { list.textContent = 'Messages could not be loaded. Please try again.'; });
  };

  window.openDesktopReportCase = function () {
    
    
    
    
    if (typeof _lcdjpHasApprovedVerification === 'function' && !_lcdjpHasApprovedVerification()) {
      if (typeof requireAuth === 'function') requireAuth('reportCase');
      return;
    }
    if (typeof window.openReportCaseAssistant === 'function') {
      window.openReportCaseAssistant();
    } else if (typeof window.openAIAssistant === 'function') {
      window.openAIAssistant(undefined, 'report');
    }
  };

  
  function startCitizenDesktopFeatures() {
    
    if (!isAuthenticated()) {
        console.log('[LCDJP] Not authenticated - skipping citizen desktop features');
        return false;
    }
    
    if (document.body.classList.contains('citizen-dashboard-mode')) {
        console.log('[LCDJP] Starting citizen desktop features');
        
        
        if (typeof window.initNearbyServices === 'function') {
            window.initNearbyServices();
        }
        
        
        if (typeof window.initCitizenMobileMap === 'function') {
            setTimeout(function () { 
                
                if (isAuthenticated()) {
                    window.initCitizenMobileMap(false); 
                }
            }, 250);
        }
        return true;
    }
    return false;
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { 
        setTimeout(function() {
            
            if (isAuthenticated()) {
                startCitizenDesktopFeatures();
            }
        }, 450); 
    });
} else {
    setTimeout(function() {
        if (isAuthenticated()) {
            startCitizenDesktopFeatures();
        }
    }, 450);
}


var bodyObserver = new MutationObserver(function () {
    if (isAuthenticated()) {
        if (startCitizenDesktopFeatures()) {
            bodyObserver.disconnect();
        }
    }
});
bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });


var originalMapFilter = window.cmMapFilter;
if (typeof originalMapFilter === 'function') {
    window.cmMapFilter = function (event, id) {
        
        if (!isAuthenticated()) {
            console.log('[LCDJP] Skipping map filter - not authenticated');
            return;
        }
        
        if (window._lcdjpMapGroups || id === 'all') {
            originalMapFilter(event, id);
            return;
        }
        
        
        if (typeof window.initCitizenMobileMap === 'function') {
            window.initCitizenMobileMap(false);
        }
        
        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            if (window._lcdjpMapGroups) {
                clearInterval(timer);
                originalMapFilter(event, id);
            } else if (tries > 30) {
                clearInterval(timer);
            }
        }, 200);
    };
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { 
        setTimeout(function() {
            
            if (isAuthenticated()) {
                startCitizenDesktopFeatures();
            }
        }, 450); 
    });
} else {
    setTimeout(function() {
        if (isAuthenticated()) {
            startCitizenDesktopFeatures();
        }
    }, 450);
}


var bodyObserver = new MutationObserver(function () {
    if (isAuthenticated()) {
        if (startCitizenDesktopFeatures()) {
            bodyObserver.disconnect();
        }
    }
});
bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });


var originalMapFilter = window.cmMapFilter;
if (typeof originalMapFilter === 'function') {
    window.cmMapFilter = function (event, id) {
        
        if (!isAuthenticated()) {
            console.log('[LCDJP] Skipping map filter - not authenticated');
            return;
        }
        
        if (window._lcdjpMapGroups || id === 'all') {
            originalMapFilter(event, id);
            return;
        }
        
        if (typeof window.initCitizenMobileMap === 'function') {
            window.initCitizenMobileMap(false);
        }
        
        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            if (window._lcdjpMapGroups) {
                clearInterval(timer);
                originalMapFilter(event, id);
            } else if (tries > 30) {
                clearInterval(timer);
            }
        }, 200);
    };
}
}());





(function () {
  'use strict';

  function desktopCitizen() {
    return window.innerWidth >= 768
      && document.body.classList.contains('citizen-dashboard-mode');
  }

  function desktopAdmin() {
    return window.innerWidth >= 768
      && document.body.classList.contains('admin-dashboard-mode');
  }

  function closePage(overlay, page, placeholder, skipShowHome) {
    if (page && placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(page, placeholder);
      page.style.display = 'none';
    }
    if (overlay) overlay.remove();
    if (placeholder) placeholder.remove();
    unlockScroll();
    _lcdjpRestoreFloatingChatForOverlay();
    
    
    
    
    
    
    
    if (skipShowHome) return;
    
    
    
    
    
    
    
    
    if (document.body.classList.contains('admin-dashboard-mode')) {
      if (sessionStorage.getItem('lcdjp_userlevel') === 'DISTRICT_ADMIN'
          && typeof showDistrictAdminDashboard === 'function') {
        showDistrictAdminDashboard();
      } else if (typeof showAdminHome === 'function') {
        showAdminHome();
      } else if (typeof showHome === 'function') {
        showHome();
      }
      return;
    }
    if (typeof showHome === 'function') showHome();
  }

  function openPage(pageId, title, subtitle, afterOpen) {
    var page = document.getElementById(pageId);
    if (!page) return;
    var old = document.querySelector('.lcdjp-desktop-page-overlay');
    if (old) old.remove();
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    var placeholder = document.createComment('lcdjp-' + pageId + '-placeholder');
    page.parentNode.insertBefore(placeholder, page);

    var overlay = document.createElement('div');
    overlay.className = 'lcdjp-desktop-page-overlay';
    overlay.setAttribute('data-page', pageId);
    var shell = document.createElement('section');
    shell.className = 'lcdjp-desktop-page-shell';
    var header = document.createElement('header');
    header.className = 'lcdjp-desktop-page-header';
    
    
    
    
    
    
    
    var includeHeaderClose = (pageId !== 'citizenNotificationsPage');
    header.innerHTML =
      '<div><h2>' + title + '</h2><p>' + subtitle + '</p></div>'
      + (includeHeaderClose ? '<button class="lcdjp-desktop-page-close" type="button" aria-label="Close">&times;</button>' : '');
    var body = document.createElement('div');
    body.className = 'lcdjp-desktop-page-body';
    shell.appendChild(header);
    shell.appendChild(body);
    overlay.appendChild(shell);
    document.body.appendChild(overlay);
    body.appendChild(page);
    page.style.display = 'block';
    lockScroll();
    _lcdjpHideFloatingChatForOverlay();

    var close = function (skipShowHome) { closePage(overlay, page, placeholder, skipShowHome); };
    
    
    
    overlay._lcdjpClose = close;
    var headerCloseBtn = header.querySelector('.lcdjp-desktop-page-close');
    
    
    
    
    
    
    
    
    if (headerCloseBtn) headerCloseBtn.onclick = function () { close(); };
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });
    if (typeof afterOpen === 'function') afterOpen(page, body, close);
  }

  function moveDashboardPieces() {
    if (!desktopCitizen()) return;
    var banner = document.getElementById('cmAiEmergencyBanner');
    var greeting = document.getElementById('cdDesktopGreeting');
    var stats = greeting && greeting.querySelector('.cdg-stats-row');
    if (banner && stats && stats.parentNode !== banner) banner.appendChild(stats);
    if (greeting) greeting.remove();

    var right = document.getElementById('cdDesktopRightPanel');
    var active = document.getElementById('cmActiveCaseCard');
    var nearby = right && right.querySelector('#cdDesktopNearbySection');
    if (right && active && nearby && active.parentNode !== right) {
      right.insertBefore(active, nearby.nextSibling);
    }
  }

  window.openDesktopCitizenMyCases = function () {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
      if (typeof showFeatureUnavailableMessage === 'function') {
        showFeatureUnavailableMessage('This feature is not available at this time.');
      }
      return;
    }
    if (!desktopCitizen()) {
      if (typeof showMyCases === 'function') showMyCases();
      return;
    }
    openPage('myCasesPage', 'My Cases', 'Review your case status, evidence, and next actions.', function () {
      if (typeof updateMyCases === 'function') updateMyCases();
    });
  };

  window.openDesktopCitizenTrackCase = function () {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
      if (typeof showFeatureUnavailableMessage === 'function') {
        showFeatureUnavailableMessage('This feature is not available at this time.');
      }
      return;
    }
    if (!desktopCitizen()) {
      if (typeof showTrackCaseTab === 'function') showTrackCaseTab();
      return;
    }
    openPage('trackCasePage', 'Track Case', 'Enter a case reference to view the latest progress.', function (page) {
      var input = page.querySelector('#trackSearchInput');
      if (input) setTimeout(function () { input.focus(); }, 80);
    });
  };

  
  
  

  var originalShowTrackCase = window.showTrackCaseTab;
  window.showTrackCaseTab = function () {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
      if (typeof showFeatureUnavailableMessage === 'function') {
        showFeatureUnavailableMessage('This feature is not available at this time.');
      }
      return;
    }
    if (desktopCitizen()) {
      window.openDesktopCitizenTrackCase();
      return;
    }
    if (typeof originalShowTrackCase === 'function') originalShowTrackCase.apply(this, arguments);
  };

  var originalToggleNotifications = window.toggleNotifications;
  window.toggleNotifications = function () {
    if (desktopCitizen()) {
      var existing = document.querySelector('.lcdjp-desktop-page-overlay[data-page="citizenNotificationsPage"]');
      if (existing) {
        var closeButton = existing.querySelector('.lcdjp-desktop-page-close');
        if (closeButton) closeButton.click();
        return;
      }
      openPage('citizenNotificationsPage', 'Notifications', 'Updates about your cases, messages, and legal support.', function (page) {
        if (typeof loadCitizenNotifications === 'function') loadCitizenNotifications().catch(console.error);
      });
      return;
    }
    if (desktopAdmin()) {
      
      
      
      
      
      var existingAdmin = document.querySelector('.lcdjp-desktop-page-overlay[data-page="adminNotificationsPage"]');
      if (existingAdmin) {
        if (typeof existingAdmin._lcdjpClose === 'function') existingAdmin._lcdjpClose();
        return;
      }
      var page = document.getElementById('adminNotificationsPage');
      if (!page && typeof createAdminNotificationsPage === 'function') {
        createAdminNotificationsPage();
        page = document.getElementById('adminNotificationsPage');
      }
      if (!page) {
        if (typeof originalToggleNotifications === 'function') originalToggleNotifications.apply(this, arguments);
        return;
      }
      openPage('adminNotificationsPage', 'Notifications', 'Alerts and updates for administrators.', function () {
        if (typeof renderAdminNotificationPage === 'function') renderAdminNotificationPage();
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();
      });
      return;
    }
    if (typeof originalToggleNotifications === 'function') {
      originalToggleNotifications.apply(this, arguments);
    }
  };

  
  function _desktopRefreshActiveCase() {
    var uname = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!uname) return;
    if (typeof window._lcdjpSensitiveCaseAccessAllowed === 'function' &&
        !window._lcdjpSensitiveCaseAccessAllowed()) return;
    if (typeof API_ENDPOINTS === 'undefined' || typeof API_ENDPOINTS.citizenCases !== 'function') return;
    fetch(API_ENDPOINTS.citizenCases(uname), {
      suppressAuthRedirect: true,
      headers: getAuthHeaders()
    })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return;
        var list = (data.success && data.cases) ? data.cases : (Array.isArray(data) ? data : []);
        if (!list.length) return;
        list.sort(function(a,b){ return new Date(b.created_at) - new Date(a.created_at); });
        var active = list.find(function(c){ return c.status !== 'Resolved'; }) || list[0];
        if (typeof _cmBuildCaseCard === 'function') _cmBuildCaseCard(active);
      }).catch(function(){});
  }

  
  function _desktopRefreshAlerts() {
    var uname = sessionStorage.getItem('lcdjp_username');
    if (typeof API_ENDPOINTS === 'undefined' || !API_ENDPOINTS.notifications) return;
    var el = document.getElementById('cdDesktopAlertsList');
    if (!el) return;
    
    var storeAll = (window._lcdjpStore && window._lcdjpStore.notifications) || [];
    var storeMine = uname ? storeAll.filter(function(n){ return n.username === uname; }) : storeAll;
    if (storeMine.length > 0 && typeof _renderDesktopAlerts === 'function') {
      _renderDesktopAlerts(storeMine);
    }
    
    fetch(API_ENDPOINTS.notifications, {
      headers: (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {}
    })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data) return;
        var all = Array.isArray(data) ? data : (data.notifications || []);
        var mine = uname ? all.filter(function(n){ return n.username === uname; }) : all;
        
        if (window._lcdjpStore) window._lcdjpStore.notifications = all;
        if (typeof _renderDesktopAlerts === 'function') _renderDesktopAlerts(mine);
      }).catch(function(){});
  }

  function install() {
    if (!desktopCitizen()) return;
    moveDashboardPieces();
    document.querySelectorAll('#citizenDesktopNav .cdn-nav-item').forEach(function (item) {
      var text = (item.textContent || '').trim().toLowerCase();
      if (text === 'my cases') item.onclick = window.openDesktopCitizenMyCases;
      if (text === 'track case') item.onclick = window.openDesktopCitizenTrackCase;
    });
    
    _desktopRefreshActiveCase();
    
    _desktopRefreshAlerts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(install, 250); });
  } else {
    setTimeout(install, 250);
  }
  new MutationObserver(install).observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  window.addEventListener('resize', install);
}());





(function () {
  'use strict';

  window.closeCaseSubmissionForm = function () {
    var mobileOverlay = document.getElementById('mobileDynamicOverlay');
    if (mobileOverlay) mobileOverlay.remove();
    if (typeof clearDynamicView === 'function') clearDynamicView();
    document.body.classList.remove('mobile-form-active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.position = '';
    window._lcdjpScrollLockCount = 0;
    if (typeof showHome === 'function') showHome();
  };

  
  var extras = {
    en: {
      close_button:'Close', draft_saved:'Draft saved', map_point_btn:'Point on Map, Tap Your Area & Fields Fill Automatically',
      map_point_hint:'Perfect if you cannot type, just tap your location on the map',
      quick_location_search:'Quick Location Search',
      quick_location_hint:'Type your village, parish, sub-county or district name and all fields will fill automatically',
      location_search_placeholder:'e.g. Namugongo, Kawempe, Kampala...',
      dashboard:'Dashboard', my_cases:'My Cases', alerts_notices:'Alerts & Notices', nearby_services:'Nearby Services',
      messages:'Messages', quick_links:'Quick Links', partners:'Partners', footer_home:'Home',
      footer_track_case:'Track Case', footer_find_help:'Find Help', footer_education:'Education',
      contact_information:'Contact Information'
    },
    lug: {
      close_button:'Ggalawo', draft_saved:'Ekiwandiiko kikuumiddwa', map_point_btn:'Kuba ku Maapu, Kuba ku Kifo Kyo',
      map_point_hint:'Bw\'otoyinza kuwandiika, kuba ku kifo kyo ku maapu',
      quick_location_search:'Noonya Ekifo Mangu',
      quick_location_hint:'Wandiika ekyalo, parish, sub-county oba disitulikiti okufuna ebifo byonna',
      location_search_placeholder:'okugeza Namugongo, Kawempe, Kampala...',
      dashboard:'Ssandaaki', my_cases:'Ebibuuzo Byange', alerts_notices:'Obubaka n\'Ebirabula', nearby_services:'Obuweereza Obuliraanye',
      messages:'Obubaka', quick_links:'Enkolagana Enzangu', partners:'Abakwanaganya', footer_home:'Waka',
      footer_track_case:'Kulagula Musango', footer_find_help:'Noonya Obuyambi', footer_education:'Okusomesebwa',
      contact_information:'Amakulu g\'Okuyungirira'
    },
    ach: {
      close_button:'Cik', draft_saved:'Lok ki gwoko', map_point_btn:'Ket i Map, Ket kabedo ni',
      map_point_hint:'Ka pe itwero keto, ket kabedo ni i map',
      quick_location_search:'Yeny Kabedo Oyot',
      quick_location_hint:'Ket nying kyalo, parishi, sab-kaanti onyo disitulikiti',
      location_search_placeholder:'lab: Namugongo, Kawempe, Kampala...',
      dashboard:'Got', my_cases:'Lok An', alerts_notices:'Lok ki Jami', nearby_services:'Tic ma Kongo Ningi',
      messages:'Lok Buca', quick_links:'Keto Oyot', partners:'Jok ma Tye Kede', footer_home:'Ot',
      footer_track_case:'Nyil Lok', footer_find_help:'Yeny Kony', footer_education:'Pwony',
      contact_information:'Ngec me Kwan'
    },
    teo: {
      close_button:'Ggalala', draft_saved:'Ekiwandiiko kikuumiddwa', map_point_btn:'Kuba ku Maapu, Kuba ku Kifo Kyo',
      map_point_hint:'Bw\'otayina kuwandiika, kuba ku kifo kyo ku maapu',
      quick_location_search:'Noonya Ekifo Mangu',
      quick_location_hint:'Wandiika ekyalo, parish, sub-county oba disitulikiti',
      location_search_placeholder:'okugeza Namugongo, Kawempe, Kampala...',
      dashboard:'Edebe', my_cases:'Ebia Gwange', alerts_notices:'Ebirukwa na Ebirabula', nearby_services:'Eimoria Ekongo',
      messages:'Emwang\'a', quick_links:'Enkolagana Enzangu', partners:'Abakwanaganya', footer_home:'Awi',
      footer_track_case:'Kuata Ebia', footer_find_help:'Naa Aisak', footer_education:'Pwony',
      contact_information:'Adumun me Yuak'
    },
    lgg: {
      close_button:'Funga', draft_saved:'Rasimu eikumiibwe', map_point_btn:'Kuba ku Maapu, Kuba ku Kifo Kyo',
      map_point_hint:'Bw\'otayina kuwandiika, kuba ku kifo kyo ku maapu',
      quick_location_search:'Noonya Ekifo Mangu',
      quick_location_hint:'Wandiika ekyalo, parish, sub-county oba disitulikiti',
      location_search_placeholder:'okugeza Namugongo, Kawempe, Kampala...',
      dashboard:'Dashibodi', my_cases:'Ebizibu Byange', alerts_notices:'Ebirabura', nearby_services:'Obuheereza Oburi Haihi',
      messages:'Obubaka', quick_links:'Enkolagana Enzangu', partners:'Abakwanaganya', footer_home:'Nyumba',
      footer_track_case:'Kurikirana Kesi', footer_find_help:'Ronda Obuyambi', footer_education:'Okwega',
      contact_information:'Amakuru g\'Okuyungirira'
    },
    nyn: {
      close_button:'Ggalawo', draft_saved:'Ekiwandiiko kikuumiddwa', map_point_btn:'Kuba ku Maapu, Kuba ku Kifo Kyo',
      map_point_hint:'Bw\'otayina kuwandiika, kuba ku kifo kyo ku maapu',
      quick_location_search:'Noonya Ekifo Mangu',
      quick_location_hint:'Wandiika ekyalo, parish, sub-county oba disitulikiti',
      location_search_placeholder:'okugeza Namugongo, Kawempe, Kampala...',
      dashboard:'Dashibodi', my_cases:'Amabuzo Gangu', alerts_notices:'Ebirabula', nearby_services:'Obushaho Oburi Haihi',
      messages:'Ebirukwa', quick_links:'Enkolagana Enzangu', partners:'Abakwanaganya', footer_home:'Akaaro',
      footer_track_case:'Kurikirana Omubuzo', footer_find_help:'Ronda Obuyambi', footer_education:'Okwega',
      contact_information:'Amakulu g\'Okuyungirira'
    }
  };
  Object.keys(extras).forEach(function (lang) {
    if (typeof translations !== 'undefined') {
      translations[lang] = Object.assign({}, translations[lang] || translations.en, extras[lang]);
    }
  });

  var sourceByNode = new WeakMap();
  var sourceByTextNode = new WeakMap();
  var translating = false;
  function normal(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function mapFor(lang) {
    var t = (typeof translations !== 'undefined' && translations[lang]) || {};
    var en = (typeof translations !== 'undefined' && translations.en) || {};
    var reverse = {};
    Object.keys(en).forEach(function (key) {
      var source = normal(en[key]);
      if (source && !reverse[source]) reverse[source] = key;
    });
    return { t: t, reverse: reverse };
  }
  function setDirectText(el, value) {
    if (!el || value == null) return;
    var textNodes = Array.prototype.filter.call(el.childNodes, function (node) {
      return node.nodeType === 3 && node.textContent.trim();
    });
    if (textNodes.length) {
      textNodes[0].textContent = value;
      textNodes.slice(1).forEach(function (node) { node.textContent = ''; });
    } else if (!el.children.length) {
      el.textContent = value;
    }
  }
  function applyLiveTranslations(lang) {
    if (translating) return;
    if (typeof _lcdjpIsCitizenRole === 'function' && !_lcdjpIsCitizenRole()) return;
    var maps = mapFor(lang);
    var t = maps.t;
    if (!t) return;
    translating = true;
    try {
      document.querySelectorAll('[data-translate]').forEach(function (el) {
        var key = el.getAttribute('data-translate');
        if (Object.prototype.hasOwnProperty.call(t, key)) setDirectText(el, t[key]);
      });
      document.querySelectorAll('[data-translate-placeholder]').forEach(function (el) {
        var key = el.getAttribute('data-translate-placeholder');
        if (Object.prototype.hasOwnProperty.call(t, key)) el.setAttribute('placeholder', t[key]);
      });
      document.querySelectorAll('[data-translate-title]').forEach(function (el) {
        var key = el.getAttribute('data-translate-title');
        if (Object.prototype.hasOwnProperty.call(t, key)) el.setAttribute('title', t[key]);
      });
      document.querySelectorAll('[data-translate-aria-label]').forEach(function (el) {
        var key = el.getAttribute('data-translate-aria-label');
        if (Object.prototype.hasOwnProperty.call(t, key)) el.setAttribute('aria-label', t[key]);
      });
      document.querySelectorAll('option[data-translate]').forEach(function (el) {
        var key = el.getAttribute('data-translate');
        if (Object.prototype.hasOwnProperty.call(t, key)) el.textContent = t[key];
      });

      
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      var textNode;
      while ((textNode = walker.nextNode())) {
        var parent = textNode.parentElement;
        if (!parent || parent.closest('script,style,textarea,select,option,[data-translate]')) continue;
        var currentText = textNode.textContent.trim();
        if (!currentText) continue;
        var originalText = sourceByTextNode.get(textNode);
        if (!originalText) {
          var textKey = maps.reverse[normal(currentText)];
          if (!textKey) continue;
          originalText = currentText;
          sourceByTextNode.set(textNode, originalText);
        }
        var keyForText = maps.reverse[normal(originalText)];
        if (keyForText && Object.prototype.hasOwnProperty.call(t, keyForText)) {
          var leading = textNode.textContent.match(/^\s*/)[0];
          var trailing = textNode.textContent.match(/\s*$/)[0];
          textNode.textContent = leading + t[keyForText] + trailing;
        }
      }
    } finally {
      translating = false;
    }
  }

  var oldTranslatePage = window.translatePage;
  window.translatePage = function (lang) {
    if (typeof oldTranslatePage === 'function') oldTranslatePage.call(this, lang);
    applyLiveTranslations(lang);
  };
  window.translateAllViews = applyLiveTranslations;

  var queued = false;
  var observer = new MutationObserver(function () {
    if (queued || translating) return;
    queued = true;
    setTimeout(function () {
      queued = false;
      var lang = sessionStorage.getItem('lcdjp_language') || 'en';
      if (lang !== 'en') applyLiveTranslations(lang);
    }, 30);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', function () {
    var lang = sessionStorage.getItem('lcdjp_language') || 'en';
    applyLiveTranslations(lang);
  });
}());





(function () {
  'use strict';

  
  function _alertTitle(type) {
    var map = {
      case_declined:      'Lawyer Declined',
      case_referred:      'Case Referred',
      case_accepted:      'Case Accepted',
      case_resolved:      'Case Resolved',
      new_message:        'New Message',
      lawyer_message:     'New Message',
      lc_message:         'New Message',
      citizen_message:    'New Message',
      chat_reply:         'Chat Reply',
      voice_message:      'Voice Message',
      appointment:        'Appointment',
      case_forwarded:     'Case Forwarded',
      lawyer_selected:    'Lawyer Selected',
      org_case_interest:  'Organisation Interest'
    };
    return map[type] || 'Notification';
  }

  function _shortBody(text) {
    if (!text) return '';
    var s = text.replace(/<[^>]*>/g, ' ').trim();
    return s.length > 90 ? s.slice(0, 87) + '…' : s;
  }

  
  window._renderDesktopAlerts = function _renderDesktopAlerts(notifications) {
    var el = document.getElementById('cdDesktopAlertsList');
    if (!el) return;
    if (!notifications || notifications.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:14px 0;color:#9ca3af;font-size:12px;">No notifications yet.</div>';
      return;
    }
    var sorted = notifications.slice().sort(function (a, b) {
      return new Date(b.timestamp || b.date || b.created_at || 0) -
             new Date(a.timestamp || a.date || a.created_at || 0);
    });
    var top2 = sorted.slice(0, 2);
    var dotColors = ['cdrp-dot-navy', 'cdrp-dot-navy2'];
    var bgColors  = ['cdrp-alert-navy', 'cdrp-alert-navy2'];
    el.innerHTML = top2.map(function (n, i) {
      var title = _alertTitle(n.type || '');
      var body  = _shortBody(n.message || n.body || n.summary || '');
      var isUnread = !n.is_read && n.is_read !== 1;
      var openJson = JSON.stringify(n).replace(/"/g, '&quot;');
      return '<div class="cdrp-alert-item ' + bgColors[i] + '"'
        + ' onclick="(function(){'
        +   'if(typeof lcdjpOpenNotification===&quot;function&quot;)lcdjpOpenNotification(' + openJson + ');'
        +   'else if(typeof toggleNotifications===&quot;function&quot;)toggleNotifications();'
        + '})()"'
        + ' style="' + (isUnread ? 'font-weight:600;' : '') + '">'
        + '<div class="cdrp-alert-dot ' + dotColors[i] + '"></div>'
        + '<div style="min-width:0;">'
        + '<div class="cdrp-alert-head">' + title + (isUnread ? ' <span style="background:#1a237e;color:white;font-size:9px;padding:1px 5px;border-radius:6px;margin-left:4px;vertical-align:middle;">NEW</span>' : '') + '</div>'
        + (body ? '<div class="cdrp-alert-body">' + body + '</div>' : '')
        + '</div></div>';
    }).join('');
  }

  
  function _patchLoader() {
    var _orig = window.loadCitizenNotifications;
    if (typeof _orig !== 'function') return false;
    window.loadCitizenNotifications = async function () {
      var result = await _orig.apply(this, arguments);
      
      var username = sessionStorage.getItem('lcdjp_username');
      var all = (window._lcdjpStore && window._lcdjpStore.notifications) || [];
      var mine = username
        ? all.filter(function (n) { return n.username === username; })
        : all;
      _renderDesktopAlerts(mine);
      return result;
    };
    return true;
  }

  
  window._lcdjpRefreshDesktopAlerts = function () {
    var username = sessionStorage.getItem('lcdjp_username');
    var all = (window._lcdjpStore && window._lcdjpStore.notifications) || [];
    var mine = username
      ? all.filter(function (n) { return n.username === username; })
      : all;
    _renderDesktopAlerts(mine);
  };

  
  if (!_patchLoader()) {
    var _attempts = 0;
    var _interval = setInterval(function () {
      _attempts++;
      if (_patchLoader() || _attempts > 60) clearInterval(_interval);
    }, 300);
  }

  
  function _tryInitialLoad() {
    var u = sessionStorage.getItem('lcdjp_username');
    var all = (window._lcdjpStore && window._lcdjpStore.notifications) || [];
    var mine = u ? all.filter(function(n){ return n.username === u; }) : all;
    if (mine.length > 0) _renderDesktopAlerts(mine);
  }
  setTimeout(_tryInitialLoad, 1500);
  setTimeout(_tryInitialLoad, 5000);

  
  var _origRefreshNotif = window._lcdjpRefreshNotifications;
  if (typeof _origRefreshNotif === 'function') {
    window._lcdjpRefreshNotifications = async function () {
      var res = await _origRefreshNotif.apply(this, arguments);
      window._lcdjpRefreshDesktopAlerts && window._lcdjpRefreshDesktopAlerts();
      return res;
    };
  }
})();




function _lcdjpHideVerifBanner() {
    var desktopBanner = document.getElementById('desktopVerifBanner');
    var mobileBanner = document.getElementById('mobileVerifBanner');
    
    if (desktopBanner) {
        desktopBanner.style.display = 'none';
        desktopBanner.style.visibility = 'hidden';
    }
    if (mobileBanner) {
        mobileBanner.style.display = 'none';
        mobileBanner.style.visibility = 'hidden';
    }
}

function _lcdjpRenderVerifBanner(status) {
    
    if (status === 'verified' || status === 'approved' || 
        status === 'VERIFIED' || status === 'APPROVED') {
        _lcdjpHideVerifBanner();
        return;
    }
    
    var desktopBanner = document.getElementById('desktopVerifBanner');
    var mobileBanner = document.getElementById('mobileVerifBanner');

    if (typeof _lcdjpVerificationDisabled === 'function' && _lcdjpVerificationDisabled()) {
        if (status === 'pending' || status === 'PENDING') {
            var infoContent = '<div style="background:#eef3ff;border:1px solid #c9d8f5;border-radius:8px;padding:12px 16px;margin:10px 0;color:#274680;font-size:14px;">'
                + '&#8505;&#65039; Your earlier verification submission is still on file and pending review.'
                + '</div>';
            if (desktopBanner) { desktopBanner.innerHTML = infoContent; desktopBanner.style.display = 'block'; desktopBanner.style.visibility = 'visible'; }
            if (mobileBanner)  { mobileBanner.innerHTML = infoContent; mobileBanner.style.display = 'block'; mobileBanner.style.visibility = 'visible'; }
        } else {
            _lcdjpHideVerifBanner();
        }
        return;
    }

    var message = '';
    var buttonText = 'Verify Now';
    var showButton = true;
    
    if (status === 'pending' || status === 'PENDING') {
        message = '⏳ Your verification is pending. Please wait for admin approval.';
        buttonText = 'Pending Verification';
    } else if (status === 'rejected' || status === 'REJECTED') {
        var reason = sessionStorage.getItem('lcdjp_verif_reject_reason') || 'No reason provided';
        message = '❌ Your verification was rejected. Reason: ' + reason;
        buttonText = 'Resubmit';
    } else if (status === 'not-verified' || status === 'NOT_VERIFIED') {
        message = '⚠️ Please verify your account to access all features.';
        buttonText = 'Verify Now';
    } else {
        message = '⚠️ Please verify your account to access all features.';
        buttonText = 'Verify Now';
    }
    
    var bannerContent = '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 16px;margin:10px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">'
        + '<span style="color:#856404;font-size:14px;">' + message + '</span>'
        + (showButton ? '<button onclick="_lcdjpStartVerification()" style="background:#1a4080;color:white;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:600;white-space:nowrap;">' + buttonText + '</button>' : '')
        + '</div>';
    
    if (desktopBanner) {
        desktopBanner.innerHTML = bannerContent;
        desktopBanner.style.display = 'block';
        desktopBanner.style.visibility = 'visible';
    }
    if (mobileBanner) {
        mobileBanner.innerHTML = bannerContent;
        mobileBanner.style.display = 'block';
        mobileBanner.style.visibility = 'visible';
    }
}
function _lcdjpStartVerification() {
    
    if (typeof window.showAccountStatusPage === 'function') {
        window.showAccountStatusPage();
        return;
    }
    if (typeof window.showIdVerifyPage === 'function') {
        window.showIdVerifyPage();
        return;
    }
    if (typeof window.showVerificationPage === 'function') {
        window.showVerificationPage();
        return;
    }
    
    window.location.href = '/verify-account';
}


function _lcdjpUpdateVerifBanner() {
    var role = sessionStorage.getItem('lcdjp_userlevel') || '';
    var username = sessionStorage.getItem('lcdjp_username') || '';
    
    
    if (!username || username === 'null' || username === 'undefined' || username === '') {
        _lcdjpHideVerifBanner(); 
        return;
    }
    
    if (!role || !role.toLowerCase().includes('citizen')) {
        _lcdjpHideVerifBanner(); 
        return;
    }

    
    var storedStatus = sessionStorage.getItem('lcdjp_verif_status') || 'not-verified';
    _lcdjpRenderVerifBanner(storedStatus);

    
    var endpoint = (typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.verificationStatus)
        ? API_ENDPOINTS.verificationStatus(username)
        : API_BASE_URL + '/api/auth/users/' + encodeURIComponent(username) + '/verification-status';
    
    var token = localStorage.getItem('jwtToken') || '';
    if (!token) {
        console.log('[LCDJP] No token, skipping verification status fetch');
        return;
    }
    
    fetch(endpoint, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { 
        if (!r.ok) {
            console.warn('[LCDJP] Verification status fetch failed:', r.status);
            return null;
        }
        return r.json(); 
    })
    .then(function(data) {
        if (!data) return;
        var raw = data.verificationStatus || data.verification_status || 'not-verified';
        var normalized = typeof _lcdjpNormalizeVerifStatus === 'function'
            ? _lcdjpNormalizeVerifStatus(raw)
            : (raw ? raw.toLowerCase() : 'not-verified');
        sessionStorage.setItem('lcdjp_verif_status', normalized);
        var reason = data.rejectionReason || data.rejection_reason || '';
        if (reason) sessionStorage.setItem('lcdjp_verif_reject_reason', reason);
        _lcdjpRenderVerifBanner(normalized);
    })
    .catch(function(err) {
        console.warn('[LCDJP] Verification status error:', err);
        _lcdjpRenderVerifBanner(sessionStorage.getItem('lcdjp_verif_status') || 'not-verified');
    });
}
document.addEventListener('DOMContentLoaded', function() {
    
    setTimeout(_lcdjpUpdateVerifBanner, 900);

    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            var m = document.getElementById('idVerifyPage');
            if (m && m.style.display !== 'none') { closeIdVerifyModal(); }
            var vm = document.getElementById('verifRequestModal');
            if (vm && vm.style.display !== 'none') { closeVerifyModal(); }
        }
    });

    
    var ovl = document.getElementById('idVerifyPage');
    if (ovl) ovl.addEventListener('click', function(e) {
        if (e.target === ovl) closeIdVerifyModal();
    });
});

function typeWelcomeMessage() {
    
    const welcomeEl = document.getElementById('welcomeUserHeading');
    if (welcomeEl) {
        const username = localStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_username') || 'there';
        welcomeEl.innerHTML = 'Welcome ' + username;
    }
}
(function() {
    
    var _authCheck = function() {
        var token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken') || '';
        return token && token !== 'null' && token !== 'undefined' && token !== '';
    };
    
    
    if (!_authCheck()) {
        console.log('[LCDJP] No token, skipping verification banner polling');
        return;
    }
    
    var _verifTimer = setInterval(function() {
        
        if (_authCheck()) {
            var role = sessionStorage.getItem('lcdjp_userlevel') || localStorage.getItem('lcdjp_userlevel') || '';
            if (role && role.toLowerCase().includes('citizen')) {
                _lcdjpUpdateVerifBanner();
            }
        }
    }, 4000);   
    
    var _verifStop = setInterval(function() {
        var s = sessionStorage.getItem('lcdjp_verif_status') || localStorage.getItem('verificationStatus') || '';
        if (s === 'verified' || s === 'VERIFIED' || s === 'APPROVED') {
            clearInterval(_verifTimer); 
            clearInterval(_verifStop);
            _lcdjpHideVerifBanner();
        }
    }, 3000);
    
    
    setTimeout(function() { 
        clearInterval(_verifTimer); 
        clearInterval(_verifStop); 
    }, 300000);
})();








(function () {
    var _orig = window.buildAdminMap;
    if (typeof _orig !== 'function') return;

    window.buildAdminMap = function () {
        if (window._adminGMap) {
            [150, 500].forEach(function (ms) {
                setTimeout(function () {
                    if (window._adminGMap &&
                            typeof google !== 'undefined' && google.maps) {
                        google.maps.event.trigger(window._adminGMap, 'resize');
                    }
                }, ms);
            });
            return;
        }
        _orig.apply(this, arguments);
    };
})();


(function () {
    var _lock = false;
    var _lockTimer = null;
    var _initialized = false;  

    function _releaseLock() {
        _lock = false;
        clearTimeout(_lockTimer);
    }

    function _isMapReady() {
        return !!(document.getElementById('cmRoutePanel') && typeof window.cmDrawRouteOnMap === 'function');
    }

    function _confirmInitOutcome() {
        if (window._googleMapsSDKPromise) {
            window._googleMapsSDKPromise.then(function () {
                var attempts = 0;
                var poll = setInterval(function () {
                    attempts++;
                    if (_isMapReady()) {
                        _initialized = true;
                        clearInterval(poll);
                    } else if (attempts >= 15) {
                        console.log('[LCDJP] Map init did not complete - will allow retry');
                        _initialized = false;
                        clearInterval(poll);
                        _releaseLock();
                    }
                }, 200);
            }, function (err) {
                console.log('[LCDJP] Map SDK failed to load code=' + ((err && err.code) || 'unknown') + ' - will allow retry');
                _initialized = false;
                _releaseLock();
            });
            return;
        }
        var attempts = 0;
        var poll = setInterval(function () {
            attempts++;
            if (_isMapReady()) {
                _initialized = true;
                clearInterval(poll);
            } else if (attempts >= 75) {
                console.log('[LCDJP] Map init did not complete - will allow retry');
                _initialized = false;
                clearInterval(poll);
                _releaseLock();
            }
        }, 200);
    }

    function _wrap() {
        if (typeof window.initCitizenMobileMap !== 'function') {
            setTimeout(_wrap, 200);
            return;
        }
        var _orig = window.initCitizenMobileMap;

        window.initCitizenMobileMap = function (locate) {
            
            if (_initialized && !locate) {
                console.log('[LCDJP] Map already initialized, skipping duplicate call');
                return;
            }
            
            if (locate) {
                _releaseLock();
                _orig.call(this, true);
                return;
            }
            
            if (_lock) { 
                console.log('[LCDJP] Map initialization already in progress, skipping');
                return; 
            }
            
            _lock = true;
            _lockTimer = setTimeout(_releaseLock, 16000);
            
            console.log('[LCDJP] Initializing citizen mobile map');
            _orig.call(this, false);
            
            _confirmInitOutcome();
            
            setTimeout(function () {
                _releaseLock();
            }, 16000);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _wrap);
    } else {
        setTimeout(_wrap, 0);
    }
})();





(function () {
  'use strict';

  var TYPE_META = {
    'Local Council': { icon: '', bg: '#e8f0fe', color: '#1a237e' },
    'Police':        { icon: '', bg: '#e8eaf6', color: '#283593' },
    'Legal Aid':     { icon: '',  bg: '#f3e5f5', color: '#6a1b9a' },
    'Hospital':      { icon: '', bg: '#fce4ec', color: '#c62828' },
    'Court':         { icon: '',  bg: '#fff3e0', color: '#e65100' },
    'Public Service':{ icon: '',  bg: '#e8f5e9', color: '#2e7d32' }
  };
  var TYPE_CATEGORY = {
    'Police':   'Crime Report',
    'Hospital': 'Medical Emergency'
  };
  var TYPE_MAP_ID = {
    'Local Council': 'lc1',
    'Police':        'police'
  };

  function removeCard() {
    ['_lcdjpNearbyCard','_lcdjpNearbyBd2'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.remove();
    });
  }

  window._lcdjpNearbyClick = function (svc) {
    removeCard();

    var m     = TYPE_META[svc.type] || { icon: '', bg: '#f5f5f5', color: '#333' };
    var name  = svc.label || svc.name || svc.orgName || 'Service';
    var cat   = TYPE_CATEGORY[svc.type] || null;
    var mapId = TYPE_MAP_ID[svc.type] || svc.mapId || null;
    var flyLat = parseFloat(svc.lat  || svc.latitude  || 0) || null;
    var flyLng = parseFloat(svc.lng  || svc.longitude || svc.lon || 0) || null;

    var dist = '';
    if (typeof svc._km === 'number' && svc._km < 9999) {
      dist = svc._km < 1
        ? Math.round(svc._km * 1000) + '\u202fm away'
        : svc._km.toFixed(1) + '\u202fkm away';
    }

    var extra = [svc.type, svc.district, svc.village, svc.parish]
      .filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).join(' \u00b7 ');

    
    var bd = document.createElement('div');
    bd.id = '_lcdjpNearbyBd2';
    bd.addEventListener('click', closeCard);
    document.body.appendChild(bd);

    
    var card = document.createElement('div');
    card.id = '_lcdjpNearbyCard';

    var html = ''
      + '<div class="nc-pill-wrap"><div class="nc-pill"></div></div>'
      + '<div class="nc-header">'
      +   '<span style="font-size:11px;font-weight:600;color:#9ba3c2;letter-spacing:.05em;text-transform:uppercase;">Nearby Service</span>'
      +   '<button class="nc-close-btn" id="_ncClose">&times;</button>'
      + '</div>'
      + '<div class="nc-identity">'
      +   '<div class="nc-icon" style="background:' + m.bg + '">' + m.icon + '</div>'
      +   '<div>'
      +     '<div class="nc-title">' + name + '</div>'
      +     '<div class="nc-meta">' + (extra || svc.type || '') + (dist ? ' \u00b7 ' + dist : '') + '</div>'
      +   '</div>'
      + '</div>'
      + '<div class="nc-actions">';

    
    if (flyLat && flyLng) {
      html += '<button class="nc-btn nc-btn-direction" id="_ncDirections">'
        + '<span style="font-size:16px;"></span> Get Directions'
        + '</button>';
    }

    
    html += '<button class="nc-btn nc-btn-primary" id="_ncAssist">'
      + (cat ? ' Report / Get Help' : ' Get Assistance')
      + '</button>';

    
    if (mapId || (flyLat && flyLng)) {
      html += '<button class="nc-btn nc-btn-secondary" id="_ncMap">'
        + ' View on Map'
        + '</button>';
    }

    
    if (svc.phone) {
      html += '<a href="tel:' + svc.phone + '" style="text-decoration:none;">'
        + '<button class="nc-btn nc-btn-ghost">'
        + ' ' + svc.phone
        + '</button></a>';
    }

    html += '</div>'; 
    card.innerHTML = html;
    document.body.appendChild(card);

    
    var closeBtn = card.querySelector('#_ncClose');
    if (closeBtn) closeBtn.addEventListener('click', closeCard);

    var dirBtn = card.querySelector('#_ncDirections');
    if (dirBtn && flyLat && flyLng) {
      dirBtn.addEventListener('click', function () {
        closeCard();
        getDirectionsTo(flyLat, flyLng, name);
      });
    }

    var assistBtn = card.querySelector('#_ncAssist');
    if (assistBtn) {
      assistBtn.addEventListener('click', function () {
        closeCard();
        if (window.openAIAssistant) openAIAssistant(cat || undefined);
      });
    }

    var mapBtn = card.querySelector('#_ncMap');
    if (mapBtn) {
      mapBtn.addEventListener('click', function () {
        closeCard();
        if (mapId && window.cmMapFlyToService) {
          window.cmMapFlyToService(mapId, flyLat, flyLng);
        } else if (flyLat && flyLng) {
          if (typeof focusServiceOnMap === 'function') {
            focusServiceOnMap(flyLat, flyLng, name);
          } else if (typeof showGISPage === 'function') {
            showGISPage();
          }
        }
      });
    }

    
    requestAnimationFrame(function () {
      bd.classList.add('nc-visible');
      card.classList.add('nc-visible');
    });
  };

  function closeCard() {
    var card = document.getElementById('_lcdjpNearbyCard');
    var bd   = document.getElementById('_lcdjpNearbyBd2');
    if (card) { card.classList.remove('nc-visible'); }
    if (bd)   { bd.classList.remove('nc-visible'); }
    setTimeout(removeCard, 280);
  }

  
  function cleanLegacySheet() {
    ['_lcdjpNearbySheet','_lcdjpNearbyBd'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.remove();
    });
  }
  window.addEventListener('click', function (e) {
    
    var card = document.getElementById('_lcdjpNearbyCard');
    if (card && !card.contains(e.target) && e.target.id !== '_lcdjpNearbyBd2') {
      cleanLegacySheet();
    }
  });

})();

(function () {
  
  
  
  
  function _cmFillMapHeight() {
    var section = document.getElementById('cmMobileMapSection');
    var mapEl = document.getElementById('cmMobileMap');
    if (!section || !mapEl) return;

    var nav = document.querySelector('#citizenMobileView .cm-bottom-nav');
    var viewportH = window.innerHeight;
    var top = section.getBoundingClientRect().top;

    
    var bottomReserved = 90;
    if (nav) {
      var navRect = nav.getBoundingClientRect();
      if (navRect.height) bottomReserved = (viewportH - navRect.top) + 12;
    }

    
    
    var available = Math.round(viewportH - top - bottomReserved);
    if (available < 220) available = 220; 

    mapEl.style.setProperty('height', available + 'px', 'important');

    
    if (typeof window.initCitizenMobileMap === 'function') {
      window.initCitizenMobileMap(false);
    }
  }

  window._cmFillMapHeight = _cmFillMapHeight;

  window.addEventListener('resize', function () { _cmFillMapHeight(); });
  window.addEventListener('orientationchange', function () { setTimeout(_cmFillMapHeight, 300); });
  document.addEventListener('DOMContentLoaded', function () {
    
    setTimeout(_cmFillMapHeight, 150);
    setTimeout(_cmFillMapHeight, 600);
    setTimeout(_cmFillMapHeight, 1400);
  });
})();