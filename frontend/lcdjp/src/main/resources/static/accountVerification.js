var _lcdjpContactVerifyState = {};

function lcdjpContactVerifyWidgetHtml(prefix) {
    return (
        '<div class="lcdjp-otp-box" style="background:#eef3ff;border:1px solid #ccd9f5;border-radius:8px;padding:12px;margin:10px 0 4px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">' +
                '<div style="font-size:12.5px;color:#334;flex:1;min-width:180px;">' +
                    '<strong>Verify contact details</strong><br>' +
                    '<span id="' + prefix + '_status" style="color:#666;">Send a code to confirm this email/phone before creating the account.</span>' +
                '</div>' +
                '<button type="button" id="' + prefix + '_sendBtn" ' +
                    'onclick="lcdjpContactVerifySendFromForm(\'' + prefix + '\')" ' +
                    'style="padding:7px 14px;background:#1a4080;color:#fff;border:none;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;">Send Code</button>' +
            '</div>' +
            '<div id="' + prefix + '_otpRow" style="display:none;margin-top:10px;gap:8px;">' +
                '<input id="' + prefix + '_otpInput" placeholder="6-digit code" maxlength="6" inputmode="numeric" ' +
                    'style="flex:1;padding:8px 10px;border:1px solid #cfd8ea;border-radius:6px;font-size:13px;letter-spacing:2px;box-sizing:border-box;">' +
                '<button type="button" id="' + prefix + '_verifyBtn" ' +
                    'onclick="lcdjpContactVerifyConfirmFromForm(\'' + prefix + '\')" ' +
                    'style="padding:7px 14px;background:#28a745;color:#fff;border:none;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;">Verify</button>' +
            '</div>' +
        '</div>'
    );
}

function lcdjpContactVerifyStatus(prefix, text, kind) {
    var el = document.getElementById(prefix + '_status');
    if (!el) return;
    el.textContent = text;
    el.style.color = kind === 'error' ? '#c62828' : (kind === 'success' ? '#2e7d32' : '#666');
}

function lcdjpContactVerifyReset(prefix) {
    _lcdjpContactVerifyState[prefix] = { verified: false, email: '', phone: '' };
    var otpRow = document.getElementById(prefix + '_otpRow');
    if (otpRow) otpRow.style.display = 'none';
    var otpInput = document.getElementById(prefix + '_otpInput');
    if (otpInput) otpInput.value = '';
    var sendBtn = document.getElementById(prefix + '_sendBtn');
    if (sendBtn) sendBtn.textContent = 'Send Code';
    lcdjpContactVerifyStatus(prefix, 'Send a code to confirm this email/phone before creating the account.', '');
}

function lcdjpContactVerifyIsDone(prefix, email, phone) {
    var s = _lcdjpContactVerifyState[prefix];
    return !!s && s.verified
        && s.email === (email || '').trim()
        && s.phone === (phone || '').trim();
}

async function lcdjpContactVerifySend(prefix, purpose, email, phone) {
    email = (email || '').trim();
    phone = (phone || '').trim();
    if (!email && !phone) {
        lcdjpContactVerifyStatus(prefix, 'Enter an email or phone number first.', 'error');
        return;
    }
    _lcdjpContactVerifyState[prefix] = { verified: false, email: '', phone: '' };

    var sendBtn = document.getElementById(prefix + '_sendBtn');
    var otpRow = document.getElementById(prefix + '_otpRow');
    var otpInput = document.getElementById(prefix + '_otpInput');
    var original = sendBtn ? sendBtn.textContent : '';
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; }

    try {
        var resp = await authFetch(API_BASE_URL + '/api/account-creation/send-otp', {
            method: 'POST',
            body: JSON.stringify({ purpose: purpose, email: email, phone: phone })
        });
        var data = await resp.json();
        if (resp.ok && data.success !== false) {
            if (otpRow) otpRow.style.display = 'flex';
            if (otpInput) { otpInput.value = ''; otpInput.focus(); }
            lcdjpContactVerifyStatus(prefix, data.message || 'Code sent.', 'success');
        } else {
            lcdjpContactVerifyStatus(prefix, data.error || 'Could not send code.', 'error');
        }
    } catch (e) {
        lcdjpContactVerifyStatus(prefix, 'Network error: ' + e.message, 'error');
    } finally {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = original || 'Send Code'; }
    }
}

async function lcdjpContactVerifyConfirm(prefix, purpose, email, phone) {
    email = (email || '').trim();
    phone = (phone || '').trim();
    var otpInput = document.getElementById(prefix + '_otpInput');
    var verifyBtn = document.getElementById(prefix + '_verifyBtn');
    var otp = otpInput ? (otpInput.value || '').trim() : '';

    if (!/^\d{6}$/.test(otp)) {
        lcdjpContactVerifyStatus(prefix, 'Enter the 6-digit code.', 'error');
        return false;
    }

    var original = verifyBtn ? verifyBtn.textContent : '';
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying…'; }

    try {
        var resp = await authFetch(API_BASE_URL + '/api/account-creation/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ purpose: purpose, email: email, phone: phone, otp: otp })
        });
        var data = await resp.json();
        if (resp.ok && data.success !== false) {
            _lcdjpContactVerifyState[prefix] = { verified: true, email: email, phone: phone };
            lcdjpContactVerifyStatus(prefix, '✓ Contact details verified.', 'success');
            var otpRow = document.getElementById(prefix + '_otpRow');
            if (otpRow) otpRow.style.display = 'none';
            var sendBtn = document.getElementById(prefix + '_sendBtn');
            if (sendBtn) sendBtn.textContent = 'Re-verify';
            return true;
        }
        lcdjpContactVerifyStatus(prefix, data.error || 'Incorrect or expired code.', 'error');
        return false;
    } catch (e) {
        lcdjpContactVerifyStatus(prefix, 'Network error: ' + e.message, 'error');
        return false;
    } finally {
        if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = original || 'Verify'; }
    }
}

function lcdjpContactVerifySendFromForm(prefix) {
    var cfg = _lcdjpContactVerifyFormFields[prefix];
    if (!cfg) return;
    var email = document.getElementById(cfg.emailId);
    var phone = document.getElementById(cfg.phoneId);
    lcdjpContactVerifySend(prefix, cfg.purpose, email ? email.value : '', phone ? phone.value : '');
}

function lcdjpContactVerifyConfirmFromForm(prefix) {
    var cfg = _lcdjpContactVerifyFormFields[prefix];
    if (!cfg) return;
    var email = document.getElementById(cfg.emailId);
    var phone = document.getElementById(cfg.phoneId);
    lcdjpContactVerifyConfirm(prefix, cfg.purpose, email ? email.value : '', phone ? phone.value : '');
}

var _lcdjpContactVerifyFormFields = {};
function lcdjpContactVerifyRegisterFields(prefix, purpose, emailId, phoneId) {
    _lcdjpContactVerifyFormFields[prefix] = { purpose: purpose, emailId: emailId, phoneId: phoneId };
}
