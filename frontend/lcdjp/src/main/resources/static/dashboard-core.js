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

// isAuthenticated() is defined in config.js.
function isMobile() {
    return window.innerWidth < 768;
}
function _getDashboardToken() {
    try {
        var token = (typeof getAuthToken === 'function' ? getAuthToken() : null);
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
    console.log('Running as installed app');
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
        fromName: fullname,
        fromRole: userLevel,
        message: text,
        type: 'text',
        sentTo: key,
        timestamp: timestamp,
        isRead: false,
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