// LC sign-up by invite link.
// Two halves live here:
//   1. The public side: the "citizen or LC?" question and the "request a link" form.
//   2. The admin side: the list of link requests with Send / Decline buttons.
// The sign-up form that the emailed link opens is a separate page, lc-register.html.

// ---------------------------------------------------------------- public side

function _lcdjpEl(id) {
    return document.getElementById(id);
}

function _lcdjpShowOnly(pageId) {
    ['loginPage', 'registerPage', 'accountTypePage', 'lcRequestPage', 'forgotPage'].forEach(function (id) {
        var page = _lcdjpEl(id);
        if (page) page.style.display = (id === pageId) ? 'block' : 'none';
    });
    window.scrollTo(0, 0);
}

// Step one of "Create an account": ask who is signing up.
function lcdjpShowAccountTypeChooser() {
    if (typeof _lcdjpHideLoginOtpPage === 'function') _lcdjpHideLoginOtpPage();
    _lcdjpShowOnly('accountTypePage');
}

function lcdjpChooseCitizen() {
    showCitizenRegister();
}

function lcdjpChooseLc() {
    _lcdjpFillDistrictOptions();
    _lcdjpResetRequestForm();
    _lcdjpShowOnly('lcRequestPage');
}

function lcdjpBackToLoginFromSignup() {
    ['accountTypePage', 'lcRequestPage'].forEach(function (id) {
        var page = _lcdjpEl(id);
        if (page) page.style.display = 'none';
    });
    backToLogin();
}

function _lcdjpFillDistrictOptions() {
    var select = _lcdjpEl('lcReqDistrict');
    if (!select || select.options.length > 1) return;
    var districts = (typeof regGetDistricts === 'function') ? regGetDistricts() : [];
    select.innerHTML = '<option value="">Select your district</option>' +
        districts.map(function (d) { return '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + '</option>'; }).join('');
}

function _lcdjpResetRequestForm() {
    _lcdjpEl('lcReqFormBox').style.display = 'block';
    _lcdjpEl('lcReqDoneBox').style.display = 'none';
    _lcdjpEl('lcReqEmail').value = '';
    _lcdjpEl('lcReqDistrict').value = '';
    _lcdjpShowRequestMessage('', '');
    var btn = _lcdjpEl('lcReqBtn');
    btn.disabled = false;
    btn.textContent = 'Request link';
}

function _lcdjpShowRequestMessage(type, text) {
    var box = _lcdjpEl('lcReqMsg');
    if (!text) {
        box.style.display = 'none';
        return;
    }
    box.style.display = 'block';
    box.style.background = type === 'error' ? '#fdecea' : '#e7f5ec';
    box.style.color = type === 'error' ? '#b3261e' : '#1b7f3b';
    box.textContent = text;
}

async function lcdjpSubmitLinkRequest() {
    var email = _lcdjpEl('lcReqEmail').value.trim();
    var district = _lcdjpEl('lcReqDistrict').value;

    if (!district) {
        _lcdjpShowRequestMessage('error', 'Please choose the district you serve in.');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        _lcdjpShowRequestMessage('error', 'Please enter a valid email address.');
        return;
    }

    var btn = _lcdjpEl('lcReqBtn');
    btn.disabled = true;
    btn.textContent = 'Sending\u2026';
    _lcdjpShowRequestMessage('', '');

    try {
        var resp = await fetch(API_ENDPOINTS.lcInviteRequest, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, district: district })
        });
        var data = await resp.json().catch(function () { return {}; });
        if (resp.ok && data.success) {
            _lcdjpEl('lcReqFormBox').style.display = 'none';
            _lcdjpEl('lcReqDoneText').textContent = data.message;
            _lcdjpEl('lcReqDoneBox').style.display = 'block';
            return;
        }
        _lcdjpShowRequestMessage('error', data.error || data.message || 'Could not send your request. Please try again.');
    } catch (e) {
        _lcdjpShowRequestMessage('error', 'Could not reach the server. Please check your connection and try again.');
    }
    btn.disabled = false;
    btn.textContent = 'Request link';
}

// ---------------------------------------------------------------- admin side

var _LCI_BUTTON_STYLE = 'padding:9px 18px;background:white;color:#1a4080;border:1px solid #1a4080;border-radius:7px;' +
    'cursor:pointer;font-size:13px;font-weight:600;margin-right:8px;';

// The toolbar button for the Users page. The count is filled in a moment later, once the button is on screen.
function lcdjpInviteButtonHtml() {
    setTimeout(lcdjpRefreshInviteCount, 50);
    return '<button id="lcInviteBtn" onclick="showLcInviteRequests()" style="' + _LCI_BUTTON_STYLE + '">LC Link Requests</button>';
}

async function _lcdjpLoadInvites() {
    var resp = await authFetch(API_ENDPOINTS.lcInvites);
    var data = await resp.json().catch(function () { return {}; });
    if (!resp.ok) throw new Error(data.error || 'Could not load the requests.');
    return data.requests || [];
}

async function lcdjpRefreshInviteCount() {
    var btn = _lcdjpEl('lcInviteBtn');
    if (!btn) return;
    try {
        var waiting = (await _lcdjpLoadInvites()).filter(function (r) { return r.status === 'PENDING'; }).length;
        btn.textContent = waiting > 0 ? 'LC Link Requests (' + waiting + ')' : 'LC Link Requests';
    } catch (e) {
        // The count is a nicety; the button still works without it.
    }
}

function _lcdjpFormatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function _lcdjpRequestRowHtml(r) {
    var sent = r.status === 'SENT';
    var statusText = sent
        ? 'Link sent' + (r.expiresAt ? ' \u00b7 expires ' + _lcdjpFormatDate(r.expiresAt) : '')
        : 'Waiting for your decision';
    var statusColor = sent ? '#1e40af' : '#92400e';
    var statusBg = sent ? '#dbeafe' : '#fef3c7';
    var btn = 'padding:7px 14px;border:none;border-radius:6px;cursor:pointer;font-size:12.5px;font-weight:600;';

    return '<div style="border:1px solid #dde4f3;border-radius:10px;padding:12px 14px;display:grid;gap:6px;">' +
        '<div style="font-weight:700;color:#1a4080;word-break:break-all;">' + escapeHtml(r.email) + '</div>' +
        '<div style="font-size:12.5px;color:#555;">' + escapeHtml(r.district) + ' \u00b7 asked ' + escapeHtml(_lcdjpFormatDate(r.requestedAt)) + '</div>' +
        '<div><span style="background:' + statusBg + ';color:' + statusColor + ';padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">' +
            escapeHtml(statusText) + '</span></div>' +
        '<div style="display:flex;gap:8px;margin-top:4px;">' +
            '<button data-lci-send="' + r.id + '" style="' + btn + 'background:#1a4080;color:white;">' + (sent ? 'Send a new link' : 'Send link') + '</button>' +
            '<button data-lci-decline="' + r.id + '" style="' + btn + 'background:#f0f0f0;color:#333;">Decline</button>' +
        '</div>' +
    '</div>';
}

function _lcdjpRenderInviteList(listEl, requests) {
    if (requests.length === 0) {
        listEl.innerHTML = '<p style="color:#999;text-align:center;padding:24px 0;">No link requests right now.</p>';
        return;
    }
    listEl.innerHTML = requests.map(_lcdjpRequestRowHtml).join('');
}

async function showLcInviteRequests() {
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;' +
        'display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    modal.innerHTML =
        '<div style="background:white;border-radius:16px;max-width:520px;width:100%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;">' +
            '<h3 style="color:#1a4080;margin:0 0 6px;">LC Link Requests</h3>' +
            '<p style="font-size:12.5px;color:#666;margin:0 0 12px;">People who say they are LC leaders asked for a sign-up link. ' +
                'Send one only if you have confirmed who they are. Each link works once.</p>' +
            '<div id="lcInviteMsg" style="display:none;margin-bottom:10px;padding:9px 12px;border-radius:7px;font-size:12.5px;"></div>' +
            '<div id="lcInviteList" style="display:grid;gap:10px;"><p style="color:#999;text-align:center;">Loading\u2026</p></div>' +
            '<div style="margin-top:16px;text-align:right;">' +
                '<button data-lci-close style="padding:9px 18px;background:#f0f0f0;color:#333;border:none;border-radius:7px;cursor:pointer;font-size:13px;">Close</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);

    var listEl = modal.querySelector('#lcInviteList');
    var msgEl = modal.querySelector('#lcInviteMsg');

    function showMsg(type, text) {
        msgEl.style.display = 'block';
        msgEl.style.background = type === 'success' ? '#e8f5e9' : '#ffebee';
        msgEl.style.color = type === 'success' ? '#2e7d32' : '#c62828';
        msgEl.textContent = text;
    }

    async function reload() {
        try {
            _lcdjpRenderInviteList(listEl, await _lcdjpLoadInvites());
        } catch (e) {
            listEl.innerHTML = '';
            showMsg('error', e.message);
        }
        lcdjpRefreshInviteCount();
    }

    // Send or decline, then show what the server said and refresh the list.
    async function act(id, action, confirmText, doneText) {
        if (!window.confirm(confirmText)) return;
        try {
            var resp = await authFetch(API_ENDPOINTS.lcInvites + '/' + id + '/' + action, { method: 'POST' });
            var data = await resp.json().catch(function () { return {}; });
            if (resp.ok) showMsg('success', doneText);
            else showMsg('error', data.error || 'That did not work. Please try again.');
        } catch (e) {
            showMsg('error', 'Network error: ' + e.message);
        }
        reload();
    }

    modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.hasAttribute('data-lci-close')) { modal.remove(); return; }
        var sendId = e.target.getAttribute('data-lci-send');
        var declineId = e.target.getAttribute('data-lci-decline');
        if (sendId) act(sendId, 'send', 'Email a sign-up link to this person?', 'Sign-up link sent.');
        if (declineId) act(declineId, 'decline', 'Decline this request? They will not be sent a link.', 'Request declined.');
    });

    reload();
}

window.showLcInviteRequests = showLcInviteRequests;
window.lcdjpInviteButtonHtml = lcdjpInviteButtonHtml;
