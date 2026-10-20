



const _regState = {
    fullName: '', username: '', phone: '', email: '', password: '', userType: 'Citizen',
    otpCode: '', otpExpiry: null
};
let _regOtpTimer = null;







const LCDJP_UGANDA_DISTRICTS = [
    'Abim', 'Adjumani', 'Agago', 'Alebtong', 'Amolatar', 'Amudat', 'Amuria',
    'Amuru', 'Apac', 'Arua', 'Budaka', 'Bududa', 'Bugiri', 'Bugweri',
    'Buhweju', 'Buikwe', 'Bukedea', 'Bukomansimbi', 'Bukwo', 'Bulambuli',
    'Buliisa', 'Bundibugyo', 'Bunyangabu', 'Bushenyi', 'Busia', 'Butaleja',
    'Butambala', 'Butebo', 'Buvuma', 'Buyende', 'Dokolo', 'Gomba', 'Gulu',
    'Hoima', 'Ibanda', 'Iganga', 'Isingiro', 'Jinja', 'Kaabong', 'Kabale',
    'Kabarole', 'Kaberamaido', 'Kagadi', 'Kakumiro', 'Kalaki', 'Kalangala',
    'Kaliro', 'Kalungu', 'Kampala', 'Kamuli', 'Kamwenge', 'Kanungu',
    'Kapchorwa', 'Kapelebyong', 'Karenga', 'Kasese', 'Kassanda', 'Katakwi',
    'Kayunga', 'Kazo', 'Kibaale', 'Kiboga', 'Kibuku', 'Kikuube',
    'Kiruhura', 'Kiryandongo', 'Kisoro', 'Kitagwenda', 'Kitgum', 'Koboko',
    'Kole', 'Kotido', 'Kumi', 'Kwania', 'Kween', 'Kyankwanzi', 'Kyegegwa',
    'Kyenjojo', 'Kyotera', 'Lamwo', 'Lira', 'Luuka', 'Luwero', 'Lwengo',
    'Lyantonde', 'Madi Okollo', 'Manafwa', 'Maracha', 'Masaka', 'Masindi',
    'Mayuge', 'Mbale', 'Mbarara', 'Mitooma', 'Mityana', 'Moroto', 'Moyo',
    'Mpigi', 'Mubende', 'Mukono', 'Nabilatuk', 'Nakapiripirit', 'Nakaseke',
    'Nakasongola', 'Namayingo', 'Namisindwa', 'Namutumba', 'Napak', 'Nebbi',
    'Ngora', 'Ntoroko', 'Ntungamo', 'Nwoya', 'Obongi', 'Omoro', 'Otuke',
    'Oyam', 'Pader', 'Pakwach', 'Pallisa', 'Rakai', 'Rubanda', 'Rubirizi',
    'Rukiga', 'Rukungiri', 'Rwampara', 'Serere', 'Sheema', 'Sironko',
    'Soroti', 'Ssembabule', 'Terego', 'Tororo', 'Wakiso', 'Yumbe', 'Zombo'
];

function regGetDistricts() {
    
    
    
    return Array.from(new Set(LCDJP_UGANDA_DISTRICTS)).sort(function(a, b) {
        return a.localeCompare(b);
    });
}

function regFindDistrict(value) {
    if (!value) return '';
    var wanted = String(value).toLowerCase().trim()
        .replace(/\s+district$/i, '')
        .replace(/\s+city$/i, '');
    return regGetDistricts().find(function(district) {
        return district.toLowerCase() === wanted;
    }) || '';
}

function regShowToast(msg, type) {
    let t = document.getElementById('lcdjp-reg-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'lcdjp-reg-toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast-show toast-' + (type || 'info');
    clearTimeout(t._to);
    t._to = setTimeout(() => t.classList.remove('toast-show'), 3400);
}

function regUpdateProgress(step) {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById('rdot-' + i);
        if (!dot) continue;
        dot.classList.remove('active', 'completed');
        if (i < step)  dot.classList.add('completed');
        if (i === step) dot.classList.add('active');
    }
    for (let i = 1; i <= 3; i++) {
        const conn = document.getElementById('rconn-' + i);
        if (conn) conn.classList.toggle('filled', i < step);
    }
}

function regGoStep(step) {
    document.querySelectorAll('#registerPage .reg-step-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById('regStep' + step);
    if (panel) panel.classList.remove('hidden');
    regUpdateProgress(step);
    window.scrollTo(0, 0);
}


const PW_EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const PW_EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.4 20.4 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function togglePwVisibility(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const isText = inp.type === 'text';
    inp.type = isText ? 'password' : 'text';
    if (btn) {
        btn.innerHTML = isText ? PW_EYE_OPEN : PW_EYE_CLOSED;
        btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
        btn.setAttribute('title', isText ? 'Show password' : 'Hide password');
    }
}

function regUpdateStrength(pw) {
    let score = 0;
    if (pw.length >= 6)  score++;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const colors = ['', '#c62828','#ef6c00','#f9a825','#2e7d32','#1b5e20'];
    const labels = ['', 'Too short','Weak','Fair','Strong','Very strong'];
    for (let i = 1; i <= 5; i++) {
        const seg = document.getElementById('pws' + i);
        if (seg) seg.style.background = i <= score ? colors[score] : '#e8e8ed';
    }
    const lbl = document.getElementById('pws_label');
    if (lbl) { lbl.textContent = pw.length > 0 ? labels[score] : ''; lbl.style.color = colors[score] || '#4a4a6a'; }
}

function regSetErr(inputId, errId, msg) {
    const inp = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (inp) inp.classList.add('input-error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
}

function regClearErr(inputId, errId) {
    const inp = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (inp) inp.classList.remove('input-error');
    if (err) err.classList.remove('show');
}

function regGoStep2() {
    const name     = (document.getElementById('reg_fullName')  || {}).value?.trim() || '';
    const username = (document.getElementById('reg_username')  || {}).value?.trim() || '';
    const dob      = (document.getElementById('reg_dob')       || {}).value?.trim() || '';
    const gender   = (document.getElementById('reg_gender')    || {}).value || '';
    const phoneNum = (document.getElementById('reg_phone')     || {}).value?.trim() || '';
    const phoneCode= (document.getElementById('reg_phone_code')|| {}).value || '+256';
    const termsEl  = document.getElementById('reg_terms');
    const terms    = termsEl ? termsEl.checked : false;
    let ok = true;

    if (name.length < 3 || !name.includes(' ')) {
        regSetErr('reg_fullName', 'err_fullName', 'Please enter your first and last name.');
        ok = false;
    } else { regClearErr('reg_fullName', 'err_fullName'); }

    if (!/^[A-Za-z0-9_.]{8,40}$/.test(username)) {
        regSetErr('reg_username', 'err_username', 'Username must be 8–40 characters: letters, numbers, underscores or dots only.');
        ok = false;
    } else { regClearErr('reg_username', 'err_username'); }

    if (!dob) {
        regSetErr('reg_dob', 'err_dob', 'Please select your date of birth.');
        ok = false;
    } else {
        const dobDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear() -
            (today < new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate()) ? 1 : 0);
        if (isNaN(dobDate.getTime()) || age < 5 || age > 120) {
            regSetErr('reg_dob', 'err_dob', 'Please enter a valid date of birth.');
            ok = false;
        } else { regClearErr('reg_dob', 'err_dob'); }
    }

    if (!gender) {
        regSetErr('reg_gender', 'err_gender', 'Please select your gender.');
        ok = false;
    } else { regClearErr('reg_gender', 'err_gender'); }

    const phoneClean = phoneNum.replace(/[\s\-\(\)]/g, '');
    if (!phoneClean || phoneClean.length < 6) {
        regSetErr('reg_phone', 'err_phone', 'Please enter a valid phone number.');
        ok = false;
    } else { regClearErr('reg_phone', 'err_phone'); }

    const email = (document.getElementById('reg_email') || {}).value?.trim() || '';
    if (!email) {
        regSetErr('reg_email', 'err_email', 'Email is required to receive your verification code.');
        ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        regSetErr('reg_email', 'err_email', 'Please enter a valid email address.');
        ok = false;
    } else { regClearErr('reg_email', 'err_email'); }

    if (!terms) {
        regSetErr('reg_terms', 'err_terms', 'You must accept the Terms and Conditions to continue.');
        ok = false;
    } else { regClearErr('reg_terms', 'err_terms'); }

    if (!ok) return;
    _regState.fullName    = name;
    _regState.username    = username;
    _regState.phone       = phoneCode + phoneClean;
    _regState.dateOfBirth = dob;
    _regState.gender      = gender;
    _regState.email       = email;
    regGoStep(2);
}

async function regGoStep3() {
    const pw  = (document.getElementById('reg_password')   || {}).value || '';
    const cpw = (document.getElementById('reg_confirmPw')  || {}).value || '';
    let ok = true;

    if (pw.length < 8) {
        regSetErr('reg_password', 'err_password', 'Password must be at least 8 characters.');
        ok = false;
    } else { regClearErr('reg_password', 'err_password'); }

    if (pw !== cpw) {
        regSetErr('reg_confirmPw', 'err_confirmPw', 'Passwords do not match.');
        ok = false;
    } else if (pw.length >= 8) { regClearErr('reg_confirmPw', 'err_confirmPw'); }

    if (!ok) return;
    _regState.password = pw;

    
    
    const sendBtn = document.querySelector('#regStep2 .login-btn');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending code…'; }

    const nameParts = (_regState.fullName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';

    try {
        const res = await fetch(_regApiBase + '/auth/register-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName:   firstName,
                lastName:    lastName,
                username:    _regState.username,
                password:    _regState.password,
                phoneNumber: _regState.phone,
                email:       _regState.email || '',
                dateOfBirth: _regState.dateOfBirth || '',
                gender:      _regState.gender || '',
                userType:    'Citizen',
                role:        'Citizen'
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
            regShowToast(data.message || data.error || 'Registration failed. Please try again.', 'error');
            if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send OTP'; }
            return;
        }
    } catch (err) {
        console.error('[Register error]', err);
        regShowToast('Could not reach the server. Check your connection and try again.', 'error');
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send OTP'; }
        return;
    }

    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send OTP'; }
    regGoStep(3);
    await _regSendOTP();
}

async function _regSendOTP(isResend) {
    
    const display         = document.getElementById('reg_phoneDisplay');
    const emailDisplay    = document.getElementById('reg_emailDisplay');
    const emailDisplayVal = document.getElementById('reg_emailDisplayVal');
    const subtext         = document.getElementById('reg_otpSubtext');
    const channelNote     = document.getElementById('reg_otpChannelNote');
    const hasEmail        = !!_regState.email;

    if (display) display.textContent = _regState.phone;

    if (hasEmail) {
        if (emailDisplay)    emailDisplay.style.display = 'block';
        if (emailDisplayVal) emailDisplayVal.textContent = _regState.email;
        if (subtext) subtext.textContent = 'Enter the 6-digit code sent to your email';
        if (channelNote) channelNote.innerHTML = 'The code expires in 5 minutes. Check your email inbox for the verification code, if you don\'t see it, please also check your spam/junk folder.';
    } else {
        if (emailDisplay) emailDisplay.style.display = 'none';
        if (subtext) subtext.textContent = 'Enter the 6-digit code sent to your email';
        if (channelNote) channelNote.innerHTML = 'The code expires in 5 minutes. Check your email inbox for the verification code, if you don\'t see it, please also check your spam/junk folder.';
    }

    if (isResend) regClearOTPInputs();
    _regStartTimer();

    
    
    const sendBtn = document.getElementById('reg_resendBtn');
    try {
        const res  = await fetch(_regApiBase + '/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: _regState.username })
        });
        const data = await res.json();
        if (data.success) {
            regShowToast(
                (isResend ? 'New code sent! ' : '') +
                (data.message || 'OTP sent to your email.') +
                ' If you don\'t see it shortly, check your spam/junk folder.',
                'success'
            );
        } else {
            regShowToast(data.message || 'Failed to send OTP. Please try again.', 'error');
        }
    } catch (err) {
        console.error('[OTP send error]', err);
        regShowToast('Could not reach the server. Check your connection and try again.', 'error');
    }
}

function regResendOTP() { _regSendOTP(true); }

function _regStartTimer() {
    clearInterval(_regOtpTimer);
    const btn  = document.getElementById('reg_resendBtn');
    const span = document.getElementById('reg_otpTimer');
    let secs = 60;
    if (btn) btn.disabled = true;
    if (span) span.textContent = 'Resend in ' + secs + 's';
    _regOtpTimer = setInterval(() => {
        secs--;
        if (secs <= 0) {
            clearInterval(_regOtpTimer);
            if (btn) btn.disabled = false;
            if (span) span.textContent = '';
        } else {
            if (span) span.textContent = 'Resend in ' + secs + 's';
        }
    }, 1000);
}

function _regGetEnteredOTP() {
    return [...document.querySelectorAll('#regStep3 .otp-digit')].map(i => i.value).join('');
}

function regClearOTPInputs() {
    document.querySelectorAll('#regStep3 .otp-digit').forEach(i => { i.value = ''; i.classList.remove('filled'); });
    const first = document.querySelector('#regStep3 .otp-digit');
    if (first) first.focus();
}

async function regVerifyOTP() {
    const entered  = _regGetEnteredOTP();
    const verifyBtn = document.getElementById('reg_verifyOtpBtn');

    if (entered.length < 6) {
        regShowToast('Please enter the complete 6-digit code.', 'error');
        return;
    }

    
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying…'; }

    
    try {
        const res  = await fetch(_regApiBase + '/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: _regState.username, otp: entered })
        });
        const data = await res.json();

        if (data.success) {
            
            const citizenSuccess = document.getElementById('regSuccess_citizen');
            if (citizenSuccess) citizenSuccess.style.display = 'block';
            const sn = document.getElementById('reg_successName');
            if (sn) sn.textContent = _regState.fullName;
            clearInterval(_regOtpTimer);
            if (_regState.email) {
                try { sessionStorage.setItem('lcdjp_user_email', _regState.email); } catch(e) {}
            }
            regGoStep(4);
        } else {
            
            regShowToast(data.message || 'Incorrect code. Please try again.', 'error');
            regClearOTPInputs();
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Verify and Create Account'; }
        }
    } catch (err) {
        console.error('[OTP verify error]', err);
        regShowToast('Could not reach the server. Check your connection and try again.', 'error');
        if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Verify and Create Account'; }
    }
}


function _regInitOTPInputs() {
    const inputs = [...document.querySelectorAll('#regStep3 .otp-digit')];
    const refresh = () => {
        const verifyBtn = document.getElementById('reg_verifyOtpBtn');
        if (verifyBtn) verifyBtn.disabled = _regGetEnteredOTP().length < 6;
    };
    // Spread a whole code (pasted, or autofilled from an SMS/email) across the boxes, starting at `from`.
    const fill = (digits, from) => {
        const chars = [...digits.replace(/\D/g, '')].slice(0, inputs.length - from);
        chars.forEach((ch, i) => { inputs[from + i].value = ch; inputs[from + i].classList.add('filled'); });
        if (from === 0) {
            inputs.slice(chars.length).forEach(i => { i.value = ''; i.classList.remove('filled'); });
        }
        inputs[Math.min(from + chars.length, inputs.length - 1)].focus();
        refresh();
    };
    inputs.forEach((inp, idx) => {
        if (inp.dataset.otpBound === 'true') return;
        inp.dataset.otpBound = 'true';
        inp.removeAttribute('maxlength');           // a 1-char limit cuts off pasted/autofilled codes
        if (idx === 0) inp.setAttribute('autocomplete', 'one-time-code');
        inp.addEventListener('input', e => {
            const v = e.target.value.replace(/\D/g, '');
            if (v.length > 1) { fill(v, idx); return; }   // autofill / multi-digit insert
            e.target.value = v ? v[0] : '';
            if (v && idx < inputs.length - 1) inputs[idx + 1].focus();
            inp.classList.toggle('filled', !!e.target.value);
            refresh();
        });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !inp.value && idx > 0) {
                inputs[idx - 1].focus();
                inputs[idx - 1].classList.remove('filled');
            }
        });
        inp.addEventListener('paste', e => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text') || '';
            // A full pasted code always starts from the first box, wherever the cursor was.
            const digits = text.replace(/\D/g, '');
            if (digits) fill(digits, digits.length >= inputs.length ? 0 : idx);
        });
    });
}


document.addEventListener('DOMContentLoaded', _regInitOTPInputs);
document.addEventListener('DOMContentLoaded', function() {
    var dobInput = document.getElementById('reg_dob');
    if (dobInput) {
        var today = new Date();
        var yyyy = today.getFullYear();
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var dd = String(today.getDate()).padStart(2, '0');
        dobInput.max = yyyy + '-' + mm + '-' + dd;
    }
});
document.addEventListener('DOMContentLoaded', function() {
    var dobInput = document.getElementById('reg_dob');
    if (dobInput) {
        var today = new Date();
        var yyyy = today.getFullYear();
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var dd = String(today.getDate()).padStart(2, '0');
        dobInput.max = yyyy + '-' + mm + '-' + dd;
    }
});



function backToAccountStatus() {
    
    var modal = document.getElementById('idVerifyPage');
    if (modal && modal.style.display !== 'none') {
        closeIdVerifyModal();
        return;
    }
    showAccountStatusPage();
}

function hideAllAuthPages() {
    ['loginPage','loginOtpPage','registerPage','forgotPage','verifySuccessPage','accountStatusPage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    if (typeof closeIdVerifyModal === 'function') closeIdVerifyModal();
}


function regPopulateDistrictSelect(selectId, placeholder) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var previous = sel.value;
    var districts = regGetDistricts();
    sel.innerHTML = '';
    var first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    sel.appendChild(first);
    districts.forEach(function(district) {
        var opt = document.createElement('option');
        opt.value = district;
        opt.textContent = district;
        sel.appendChild(opt);
    });
    if (previous && districts.indexOf(previous) !== -1) sel.value = previous;
    sel.dataset.districtCount = String(districts.length);
}





function regInitializeDistricts() {
    
    
    
    regPopulateDistrictSelect('idvDistrictSelect', 'Select your district');

    return !!document.getElementById('idvDistrictSelect');
}

document.addEventListener('DOMContentLoaded', regInitializeDistricts);



function clearRegistrationForm() {
    ['reg_fullName','reg_phone','reg_dob','reg_password','reg_confirmPw'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.querySelectorAll('.user-type-card').forEach(c => c.classList.remove('selected'));
    const firstCard = document.querySelector('.user-type-card[data-type="Citizen"]');
    if (firstCard) firstCard.classList.add('selected');
    _regState.fullName = '';
    _regState.username = '';
    _regState.phone    = '';
    _regState.password = '';
    _regState.userType = 'Citizen';
    _regState.otpCode  = '';
    _regState.otpExpiry = null;
    pendingVerificationCode = '';
    regClearOTPInputs();
    
    for (let i = 1; i <= 5; i++) { const s = document.getElementById('pws' + i); if (s) s.style.background = '#e8e8ed'; }
    const lbl = document.getElementById('pws_label'); if (lbl) lbl.textContent = '';
    
    document.querySelectorAll('#registerPage .field-err').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('#registerPage .input-error').forEach(e => e.classList.remove('input-error'));
    
    regGoStep(1);
}


function validateNationalId(nationalId) {
    nationalId = nationalId.toUpperCase().trim();
    
    const ninRegex = /^(CM|CF)[A-Za-z0-9]{6,14}$/;
    
    if (!ninRegex.test(nationalId)) {
        return {
            valid: false,
            message: " Invalid format. Use CMXXXXXXXXXXXX (Male) or CFXXXXXXXXXXXX (Female)",
            gender: null
        };
    }
    
    const prefix = nationalId.substring(0, 2);
    const gender = prefix === 'CM' ? 'Male' : 'Female';
    
    return {
        valid: true,
        gender: gender,
        message: ` Valid ${gender} National ID`
    };
}

document.addEventListener('DOMContentLoaded', function() {
    const ninInput = document.getElementById('nationalId');
    const genderSelect = document.getElementById('gender');
    const validationDiv = document.getElementById('ninValidationMessage');
    
    if (ninInput) {
        ninInput.addEventListener('input', function() {
            const value = this.value;
            const result = validateNationalId(value);
            
            if (value.length > 0) {
                if (result.valid) {
                    validationDiv.innerHTML = `<span style="color: #28a745; background: #d4edda; padding: 5px 10px; border-radius: 4px; display: inline-block;">${escapeHtml(result.message)}</span>`;
                    
                    if (genderSelect && result.gender) {
                        genderSelect.value = result.gender;
                    }
                    
                    this.style.borderColor = '#28a745';
                    this.style.background = '#f0fff4';
                } else {
                    validationDiv.innerHTML = `<span style="color: #dc3545; background: #f8d7da; padding: 5px 10px; border-radius: 4px; display: inline-block;">${escapeHtml(result.message)}</span>`;
                    this.style.borderColor = '#dc3545';
                    this.style.background = '#fff5f5';
                }
            } else {
                validationDiv.innerHTML = '';
                this.style.borderColor = '#ccc';
                this.style.background = '#eef4f3';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            const phone = this.value.trim();
            const isValid = /^07\d{8}$/.test(phone) || /^\+256\d{9}$/.test(phone);
            
            if (phone.length > 0) {
                if (isValid) {
                    this.style.borderColor = '#28a745';
                    this.style.background = '#f0fff4';
                } else {
                    this.style.borderColor = '#dc3545';
                    this.style.background = '#fff5f5';
                }
            } else {
                this.style.borderColor = '#ccc';
                this.style.background = '#eef4f3';
            }
        });
    }
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeUserDetailModal();
    }
});

document.addEventListener('click', function(e) {
    const modal = document.getElementById('userDetailModal');
    if (modal && modal.style.display === 'flex' && e.target === modal) {
        closeUserDetailModal();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('confirmPassword');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = getPasswordStrength(password);
            
            if (password.length >= 6) {
                this.style.borderColor = '#28a745';
                this.style.background = '#f0fff4';
            } else if (password.length > 0) {
                this.style.borderColor = '#ff9800';
                this.style.background = '#fff8e1';
            } else {
                this.style.borderColor = '#ccc';
                this.style.background = '#eef4f3';
            }
            
            if (confirmInput && confirmInput.value.length > 0) {
                checkPasswordMatch();
            }
        });
    }
    
    if (confirmInput) {
        confirmInput.addEventListener('input', checkPasswordMatch);
    }
});

function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
}

function checkPasswordMatch() {
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (confirm.length > 0) {
        if (password === confirm) {
            confirmInput.style.borderColor = '#28a745';
            confirmInput.style.background = '#f0fff4';
        } else {
            confirmInput.style.borderColor = '#dc3545';
            confirmInput.style.background = '#fff5f5';
        }
    } else {
        confirmInput.style.borderColor = '#ccc';
        confirmInput.style.background = '#eef4f3';
    }
}

function getFieldLabel(fieldId) {
    const labels = {
        'county': 'County',
        'subCounty': 'Sub-county',
        'parishLocation': 'Parish',
        'villageLocation': 'Village'
    };
    return labels[fieldId] || fieldId;
}

function getLocationValue(fieldId) {
    const selectElement = document.getElementById(fieldId);
    const manualInput = document.getElementById(`${fieldId}_manual`);
    
    if (manualInput && manualInput.style.display !== 'none' && manualInput.value.trim() !== '') {
        return manualInput.value.trim();
    }
    
    if (selectElement && selectElement.style.display !== 'none') {
        const value = selectElement.value;
        if (value && value !== '-- Select County --' && value !== '-- Select Sub-county --' && 
            value !== '-- Select Parish --' && value !== '-- Select Village --' && 
            value !== 'Select County' && value !== 'Select Sub-county' && 
            value !== 'Select Parish' && value !== 'Select Village') {
            return value;
        }
    }
    
    return '';
}


function clearRegistrationDistrict() {
    const searchInput = document.getElementById('districtSearch');
    const hiddenInput = document.getElementById('district');
    const selectedDisplay = document.getElementById('districtSelectedDisplay');
    if (searchInput) { searchInput.value = ''; }
    if (hiddenInput) { hiddenInput.value = ''; }
    if (selectedDisplay) { selectedDisplay.style.display = 'none'; }
    onDistrictChange();
}


let _caseLocationIndex = null;


// Map picker (openMapPicker, closeMapPicker, reverseGeocodeLocation and the picker state) lives in maps.js.


function fillCaseFormFromLocation(loc) {
    function setLocationField(fieldId, value) {
        if (!value) return;

        var mi = document.getElementById(fieldId + '_manual');
        if (mi) {
            mi.style.display = 'block';
            mi.value = value;
            mi.dispatchEvent(new Event('input'));
            mi.dispatchEvent(new Event('change'));
            var sel2 = document.getElementById(fieldId);
            if (sel2) {
                var already = false;
                for (var k = 0; k < sel2.options.length; k++) {
                    if (sel2.options[k].value.toLowerCase() === value.toLowerCase()) { already = true; break; }
                }
                if (!already) { var o2 = document.createElement('option'); o2.value = value; o2.text = value; sel2.appendChild(o2); }
                sel2.value = value;
            }
            if (typeof handleCaseManualInputChange === 'function') handleCaseManualInputChange(fieldId);
            return;
        }

        var sel = document.getElementById(fieldId);
        if (!sel) return;
        var lv = value.toLowerCase();
        var found = false;
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value.toLowerCase() === lv || sel.options[i].text.toLowerCase() === lv) {
                sel.value = sel.options[i].value; found = true; break;
            }
        }
        if (!found) {
            var opt = document.createElement('option');
            opt.value = value; opt.text = value; opt.selected = true;
            sel.appendChild(opt); sel.value = value;
        }
        sel.dispatchEvent(new Event('change'));
    }

    if (typeof populateCaseDistricts === 'function') populateCaseDistricts();

    setTimeout(function() {
        setLocationField('caseDistrict', loc.district);
        setTimeout(function() {

            var cc = document.getElementById('caseCountyContainer');
            if (cc && loc.county) cc.style.display = 'block';
            if (loc.county) setLocationField('caseCounty', loc.county);

            setTimeout(function() {

                var sc = document.getElementById('caseSubCountyContainer');
                if (sc && loc.subCounty) sc.style.display = 'block';
                if (loc.subCounty) setLocationField('caseSubCounty', loc.subCounty);

                setTimeout(function() {

                    var pc = document.getElementById('caseParishContainer');
                    if (pc && loc.parish) pc.style.display = 'block';
                    if (loc.parish) setLocationField('caseParish', loc.parish);

                    setTimeout(function() {

                        var vc = document.getElementById('caseVillageContainer');
                        if (vc && loc.village) vc.style.display = 'block';
                        if (loc.village) setLocationField('caseVillage', loc.village);

                        var banner = document.getElementById('mapPickerResult');
                        if (banner) {
                            var pts = [loc.district, loc.county, loc.subCounty, loc.parish, loc.village].filter(Boolean);
                            banner.innerHTML = ' <strong>Location filled:</strong> ' +
                                escapeHtml(pts.join(' \u203a ') || 'Location set') +
                                ' <span style="font-size:11px;color:#888;">(' + loc.lat.toFixed(4) + ', ' + loc.lng.toFixed(4) + ')</span>';
                            banner.style.display = 'block';
                        }
                        showLocationBanner(loc);

                    }, 380);
                }, 380);
            }, 380);
        }, 380);
    }, 150);

    setTimeout(function() {
        var latEl = document.getElementById('userLatitude');
        var lngEl = document.getElementById('userLongitude');
        if (latEl) latEl.value = loc.lat.toFixed(6);
        if (lngEl) lngEl.value = loc.lng.toFixed(6);
    }, 200);
}
function showLocationBanner(loc) {
    var existing = document.getElementById('locationBanner');
    if (existing) existing.remove();

    var parts = [loc.district, loc.county, loc.subCounty, loc.parish, loc.village].filter(Boolean);
    var locationText = parts.join(' \u203a ');

    var banner = document.createElement('div');
    banner.id = 'locationBanner';
    banner.style.cssText = 'background:#e8f5e9;padding:12px 18px;border-radius:10px;margin:15px 0;border-left:4px solid #28a745;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;';
    banner.innerHTML =
        '<div>' +
            '<strong style="color:#28a745;"> Location filled from map</strong>' +
            '<div style="font-size:13px;color:#555;margin-top:3px;">' +
                escapeHtml(locationText || 'Location selected') +
                '<span style="font-size:11px;color:#888;margin-left:8px;">(' + loc.lat.toFixed(4) + ', ' + loc.lng.toFixed(4) + ')</span>' +
            '</div>' +
        '</div>' +
        '<button onclick="this.parentElement.remove()" style="padding:4px 12px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;"> Dismiss</button>';

    var form = document.querySelector('#dynamicFormPage .form-card') || document.getElementById('dynamicFormPage');
    if (form) form.insertBefore(banner, form.firstChild);
}

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        var ov = document.getElementById('mapPickerOverlay');
        if (ov && ov.style.display === 'flex') { closeMapPicker(); } else { openMapPicker(); }
    }
    if (e.key === 'Escape') {
        var ov = document.getElementById('mapPickerOverlay');
        if (ov && ov.style.display === 'flex') closeMapPicker();
    }
});

document.addEventListener('click', function(e) {
    var ov = document.getElementById('mapPickerOverlay');
    if (ov && ov.style.display === 'flex' && e.target === ov) closeMapPicker();
});

function populateDistricts() {
    const districtSelect = document.getElementById("district");
    if (!districtSelect) {
        console.warn('District select not found');
        return;
    }
    
    districtSelect.innerHTML = '<option value="">-- Select District --</option>';
    if (typeof ugandaDistricts !== 'undefined' && ugandaDistricts.length > 0) {
        ugandaDistricts.sort().forEach(district => {
            districtSelect.innerHTML += `<option value="${escapeHtml(district)}">${escapeHtml(district)}</option>`;
        });
        console.log(`Populated ${ugandaDistricts.length} districts`);
    } else {
        const fallbackDistricts = [
            "Kampala", "Wakiso", "Mukono", "Gulu", "Jinja", "Mbarara", 
            "Masaka", "Mbale", "Lira", "Soroti", "Arua", "Kabale",
            "Fort Portal", "Entebbe", "Jinja", "Tororo", "Busia"
        ];
        fallbackDistricts.sort().forEach(district => {
            districtSelect.innerHTML += `<option value="${escapeHtml(district)}">${escapeHtml(district)}</option>`;
        });
        console.warn('Using fallback districts list');
    }
}

// The district chosen above the county / sub-county / parish / village lists. Those lists are looked up by
// their full path (district > county > sub-county > parish), never by a bare name.
function regDistrictValue() {
    const el = document.getElementById("district");
    return el ? el.value : '';
}

function onDistrictChange() {
    const districtEl = document.getElementById("district");
    const district = districtEl ? districtEl.value : '';
    const countyContainer = document.getElementById("countyContainer");
    const countySelect = document.getElementById("county");
    
    document.getElementById("subCountyContainer").style.display = "none";
    document.getElementById("parishContainer").style.display = "none";
    document.getElementById("villageContainer").style.display = "none";
    
    removeManualInput('county');
    removeManualInput('subCounty');
    removeManualInput('parishLocation');
    removeManualInput('villageLocation');
    
    if (district) {
        countyContainer.style.display = "block";
        
        if (ugandaCounties[district] && ugandaCounties[district].length > 0) {
            countySelect.style.display = "block";
            countySelect.innerHTML = '<option value="">Select County</option>';
            ugandaCounties[district].forEach(county => {
                countySelect.innerHTML += `<option value="${escapeHtml(county)}">${escapeHtml(county)}</option>`;
            });
            countySelect.disabled = false;
            removeManualInput('county');
            showManualEntryOption('county');
        } else {
            countySelect.style.display = "none";
            showManualInput('county', 'County', district);
        }
    } else {
        countyContainer.style.display = "none";
        countySelect.innerHTML = '<option value="">Select County</option>';
    }
}

function onCountyChange() {
    const county = getLocationValue('county');
    const subCountyContainer = document.getElementById("subCountyContainer");
    const subCountySelect = document.getElementById("subCounty");
    
    document.getElementById("parishContainer").style.display = "none";
    document.getElementById("villageContainer").style.display = "none";
    
    removeManualInput('subCounty');
    removeManualInput('parishLocation');
    removeManualInput('villageLocation');
    
    if (county) {
        subCountyContainer.style.display = "block";
        
        const subCountyList = ugandaGeo.subCounties(regDistrictValue(), county);
        if (subCountyList.length > 0) {
            subCountySelect.style.display = "block";
            subCountySelect.innerHTML = '<option value="">Select Sub-county</option>';
            subCountyList.forEach(subCounty => {
                subCountySelect.innerHTML += `<option value="${escapeHtml(subCounty)}">${escapeHtml(subCounty)}</option>`;
            });
            subCountySelect.disabled = false;
            showManualEntryOption('subCounty');
        } else {
            subCountySelect.style.display = "none";
            showManualInput('subCounty', 'Sub-county', county);
        }
    } else {
        subCountyContainer.style.display = "none";
        subCountySelect.innerHTML = '<option value="">Select Sub-county</option>';
    }
}

function onSubCountyChange() {
    const subCounty = getLocationValue('subCounty');
    const parishContainer = document.getElementById("parishContainer");
    const parishSelect = document.getElementById("parishLocation");
    
    document.getElementById("villageContainer").style.display = "none";
    
    removeManualInput('parishLocation');
    removeManualInput('villageLocation');
    
    if (subCounty) {
        parishContainer.style.display = "block";
        
        const parishList = ugandaGeo.parishes(regDistrictValue(), getLocationValue('county'), subCounty);
        if (parishList.length > 0) {
            parishSelect.style.display = "block";
            parishSelect.innerHTML = '<option value="">Select Parish</option>';
            parishList.forEach(parish => {
                parishSelect.innerHTML += `<option value="${escapeHtml(parish)}">${escapeHtml(parish)}</option>`;
            });
            parishSelect.disabled = false;
            showManualEntryOption('parishLocation');
        } else {
            parishSelect.style.display = "none";
            showManualInput('parishLocation', 'Parish', subCounty);
        }
    } else {
        parishContainer.style.display = "none";
        parishSelect.innerHTML = '<option value="">Select Parish</option>';
    }
}

function onParishChange() {
    const parish = getLocationValue('parishLocation');
    const villageContainer = document.getElementById("villageContainer");
    const villageSelect = document.getElementById("villageLocation");
    
    removeManualInput('villageLocation');
    
    if (parish) {
        villageContainer.style.display = "block";
        
        const villageList = ugandaGeo.villages(regDistrictValue(), getLocationValue('county'), getLocationValue('subCounty'), parish);
        if (villageList.length > 0) {
            villageSelect.style.display = "block";
            villageSelect.innerHTML = '<option value="">Select Village</option>';
            villageList.forEach(village => {
                villageSelect.innerHTML += `<option value="${escapeHtml(village)}">${escapeHtml(village)}</option>`;
            });
            villageSelect.disabled = false;
            showManualEntryOption('villageLocation');
        } else {
            villageSelect.style.display = "none";
            showManualInput('villageLocation', 'Village', parish);
        }
    } else {
        villageContainer.style.display = "none";
        villageSelect.innerHTML = '<option value="">Select Village</option>';
    }
}

function getContainerId(fieldId) {
    const containerMap = {
        'county': 'countyContainer',
        'subCounty': 'subCountyContainer',
        'parishLocation': 'parishContainer',
        'villageLocation': 'villageContainer',
        'district': 'districtContainer'
    };
    return containerMap[fieldId] || `${fieldId}Container`;
}

function showManualEntryOption(fieldId) {
    const containerId = getContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container not found for ${fieldId} (${containerId})`);
        return;
    }
    
    const existingOption = document.getElementById(`${fieldId}_manual_option`);
    if (existingOption) existingOption.remove();
    
    const label = getFieldLabel(fieldId);
    const optionHtml = `
        <div id="${fieldId}_manual_option" style="margin-top: 5px; font-size: 12px;">
            <span style="color: #999;">Can't find your ${label.toLowerCase()}?</span>
            <span onclick="enableManualInput(${escapeHtml(JSON.stringify(String(fieldId)))})" style="color: #1a4080; cursor: pointer; font-weight: bold;"> Type it manually →</span>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', optionHtml);
}


let currentUserLevel = sessionStorage.getItem("lcdjp_userlevel") || "";
let currentLawyerSpecialization = sessionStorage.getItem("lcdjp_lawyer_specialization") || "";


function isAdmin(roleArg) {
    var role = (roleArg !== undefined && roleArg !== null)
        ? String(roleArg)
        : (sessionStorage.getItem("lcdjp_userlevel") || sessionStorage.getItem("role") || "");
    return (
        role === "Admin" ||
        role === "SYSTEM_ADMIN" ||
        role === "System Administrator" ||
        role === "DISTRICT_ADMIN"
    );
}

var defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231a4080'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";





function findNearestDistrict(lat, lng) {
    if (typeof ugandaCoordinates === 'undefined') return '';
    let nearest = null, minDist = Infinity;
    Object.entries(ugandaCoordinates.districts).forEach(([d, c]) => {
        const dist = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lng - c.lng, 2));
        if (dist < minDist) { minDist = dist; nearest = d; }
    });
    return nearest;
}


