





function _getVerificationToken() {
    try {
        return localStorage.getItem('jwtToken') || 
               sessionStorage.getItem('jwtToken') || 
               null;
    } catch (e) {
        return null;
    }
}

function _isVerificationAuthenticated() {
    var token = _getVerificationToken();
    if (!token) return false;
    
    try {
        var parts = token.split('.');
        if (parts.length !== 3) return false;
        var payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
            var now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        }
        return true;
    } catch (e) {
        return false;
    }
}






const _idvState = { selfie: null, location: null, nationalIdNumber: null, idFront: null, idBack: null, requestedRole: null, roleExtraDocs: {}, district: '' };

const _idvRoleRequirements = {
    'Citizen':            { extraDocs: [] },
    'Lawyer':             { extraDocs: ['barNo','lawSpec','lawCert'] },
};





function _idvNormalizeVerificationRole(role) {
    var value = String(role || '').trim();
    return value;
}

function _idvRequiresDistrictAdminVerification(role) {
    var value = _idvNormalizeVerificationRole(role).toLowerCase();
    return value === 'citizen'
        || value === 'lawyer';
}

function _idvBuildReviewRouting(role, district) {
    var canonicalRole = _idvNormalizeVerificationRole(role);
    var districtAdminOnly = _idvRequiresDistrictAdminVerification(canonicalRole);
    return {
        systemAdmin: !districtAdminOnly,
        districtAdmin: true,
        district: district,
        requestedRole: canonicalRole,
        decisionRule: districtAdminOnly ? 'DISTRICT_ADMIN_ONLY' : 'DISTRICT_ADMIN_OR_SYSTEM_ADMIN'
    };
}

function _idvReadFileAsDataUrl(file) {
    return new Promise(function(resolve, reject) {
        if (!file) return resolve('');
        var reader = new FileReader();
        reader.onload = function() { resolve(String(reader.result || '')); };
        reader.onerror = function() { reject(reader.error || new Error('Could not read uploaded document.')); };
        reader.readAsDataURL(file);
    });
}













function _idvCompressImageFile(file, maxDim, quality) {
    maxDim = maxDim || 1600;
    quality = quality || 0.82;
    return new Promise(function(resolve) {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) {
            resolve(file); 
            return;
        }
        if (file.size < 400 * 1024) {
            resolve(file); 
            return;
        }
        var objectUrl = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function() {
            try {
                var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                var w = Math.max(1, Math.round(img.width * scale));
                var h = Math.max(1, Math.round(img.height * scale));
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(function(blob) {
                    URL.revokeObjectURL(objectUrl);
                    if (!blob || blob.size >= file.size) {
                        resolve(file); 
                        return;
                    }
                    resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', quality);
            } catch (e) {
                URL.revokeObjectURL(objectUrl);
                resolve(file); 
            }
        };
        img.onerror = function() {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };
        img.src = objectUrl;
    });
}



_idvState._pendingCompressions = 0;
function _idvTrackCompression(promise) {
    _idvState._pendingCompressions++;
    return promise.then(function(result) {
        _idvState._pendingCompressions--;
        return result;
    }, function(err) {
        _idvState._pendingCompressions--;
        throw err;
    });
}
function _idvWaitForPendingCompressions() {
    return new Promise(function(resolve) {
        if (_idvState._pendingCompressions <= 0) return resolve();
        var waited = 0;
        var iv = setInterval(function() {
            waited += 100;
            if (_idvState._pendingCompressions <= 0 || waited >= 8000) {
                clearInterval(iv);
                resolve();
            }
        }, 100);
    });
}















function _idvLockScroll() {
    if (document.body.style.position === 'fixed') return; 
    if (typeof window.lockScroll === 'function') window.lockScroll();
    var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.dataset.idvScrollY = String(scrollY);
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + scrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
}
function _idvUnlockScroll() {
    if (typeof window.unlockScroll === 'function') window.unlockScroll();
    
    
    
    if (window._lcdjpScrollLockCount > 0) return;
    var scrollY = parseInt(document.body.dataset.idvScrollY || '0', 10);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    delete document.body.dataset.idvScrollY;
    window.scrollTo(0, scrollY);
}

function _lcdjpNormalizeVerifStatus(raw) {
    if (!raw) return 'not-verified';
    var s = String(raw).toUpperCase().trim();
    if (s === 'VERIFIED' || s === 'APPROVED') return 'verified';
    if (s === 'PENDING'  || s === 'UNDER_REVIEW') return 'pending';
    if (s === 'REJECTED' || s === 'DENIED') return 'rejected';
    return 'not-verified';
}





function idvSelectRole(card) {
    document.querySelectorAll('#idvRoleGrid .user-type-card').forEach(function(c) { c.classList.remove('selected'); });
    card.classList.add('selected');
    _idvState.requestedRole = card.dataset.role;
    const errEl  = document.getElementById('err_idvRole');
    if (errEl) errEl.classList.remove('show');
}

function idvUpdateProgress(step) {
    for (let i = 0; i <= 3; i++) {
        const dot = document.getElementById('vdot-' + i);
        if (!dot) continue;
        dot.classList.remove('active', 'completed');
        if (i < step)  dot.classList.add('completed');
        if (i === step) dot.classList.add('active');
    }
    for (let i = 0; i <= 2; i++) {
        const conn = document.getElementById('vconn-' + i);
        if (conn) conn.classList.toggle('filled', i < step);
    }
}

function _idvBuildRoleDocs() {
    const container  = document.getElementById('idvRoleDocs');
    const subtitleEl = document.getElementById('idvDocsSubtitle');
    if (!container) return;
    container.innerHTML = '';
    const role = _idvNormalizeVerificationRole(_idvState.requestedRole || 'Citizen');
    const info = _idvRoleRequirements[role] || _idvRoleRequirements['Citizen'];
    if (subtitleEl) subtitleEl.textContent = 'Enter your ID number and upload both sides' + (info.extraDocs.length ? ', plus the documents required for ' + role : '');
    const T = {
        barNo:     '<label style="font-weight:600;display:block;margin-top:14px;">Bar Council Membership Number <span style="color:red;">*</span></label><input id="idv_barNo" class="input-box" type="text" placeholder="Bar council number" maxlength="40" oninput="_idvState.roleExtraDocs.barNo=this.value">',
        lawSpec:   '<label style="font-weight:600;display:block;margin-top:14px;">Specialization <span style="color:red;">*</span></label><select id="idv_lawSpec" class="input-box" style="padding:10px;" onchange="_idvState.roleExtraDocs.lawSpec=this.value"><option value="">Select…</option><option>Land &amp; Property Law</option><option>Family Law</option><option>Civil Litigation</option><option>Criminal Law</option><option>Corporate &amp; Commercial Law</option><option>General Practice</option></select>',
        lawCert:   '<label style="font-weight:600;display:block;margin-top:14px;">Practicing Certificate <span style="color:red;">*</span></label><div class="upload-drop" style="cursor:default;"><input type="file" id="idv_lawCert" accept=".pdf,.jpg,.jpeg,.png" style="display:none;" onchange="_idvHandleExtraDoc(this,\'lawCert\')"><div class="upload-btn-row"><button type="button" class="upload-btn upload-btn-camera" onclick="document.getElementById(\'idv_lawCert\').click();">&#128247; Add Photo</button></div><small>Max 5 MB</small></div><div id="idv_lawCert_name" style="font-size:12px;color:#4a4a6a;margin-top:4px;"></div>',
    };
    info.extraDocs.forEach(function(key) {
        if (T[key]) container.insertAdjacentHTML('beforeend', T[key]);
    });
}

async function _idvHandleExtraDoc(input, key) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
        if (typeof regShowToast === 'function') regShowToast('File must be under 5 MB.', 'error'); 
        return; 
    }
    _idvState.roleExtraDocs = _idvState.roleExtraDocs || {};
    _idvState.roleExtraDocs[key] = file;
    const lbl = document.getElementById('idv_' + key + '_name');
    if (lbl) lbl.textContent = ' ' + file.name;
    if (typeof regShowToast === 'function') regShowToast('Document uploaded.', 'success');

    const optimized = await _idvTrackCompression(_idvCompressImageFile(file, 1600, 0.82));
    if (_idvState.roleExtraDocs[key] === file) _idvState.roleExtraDocs[key] = optimized;
}

function idvGoStep(step) {
    if (step === 1 && !_idvState.requestedRole) {
        const errEl = document.getElementById('err_idvRole');
        if (errEl) errEl.classList.add('show');
        if (typeof regShowToast === 'function') regShowToast('Please select a role to continue.', 'error');
        return;
    }
    if (step === 2 && !_idvState.selfie) { 
        if (typeof regShowToast === 'function') regShowToast('Please upload a selfie to continue.', 'error'); 
        return; 
    }
    if (step === 3) {
        var distSel = document.getElementById('idvDistrictSelect');
        var chosenDist = distSel ? distSel.value.trim() : (_idvState.district || '');
        if (!chosenDist) {
            var errEl2 = document.getElementById('err_idvDistrict');
            if (errEl2) errEl2.classList.add('show');
            if (typeof regShowToast === 'function') regShowToast('Please select your district to continue.', 'error');
            return;
        }
        var errEl2 = document.getElementById('err_idvDistrict');
        if (errEl2) errEl2.classList.remove('show');
        _idvState.district = chosenDist;
        if (!_idvState.location) {
            _idvState.location = { lat: null, lng: null, label: chosenDist };
            _idvShowLocationConfirmed(chosenDist);
        } else {
            _idvState.location.district = chosenDist;
        }
    }
    if (step === 3 && !_idvState.location) { 
        if (typeof regShowToast === 'function') regShowToast('Please confirm your location to continue.', 'error'); 
        return; 
    }
    if (step === 3) _idvBuildRoleDocs();
    document.querySelectorAll('#idVerifyPage .reg-step-panel').forEach(function(p) { p.classList.add('hidden'); });
    const panel = document.getElementById('idvStep' + step);
    if (panel) panel.classList.remove('hidden');
    idvUpdateProgress(step);
    window.scrollTo(0, 0);
}

async function handleSelfieUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { 
        if (typeof regShowToast === 'function') regShowToast('Please upload an image file.', 'error'); 
        return; 
    }
    if (file.size > 8 * 1024 * 1024) { 
        if (typeof regShowToast === 'function') regShowToast('Image must be under 8 MB.', 'error'); 
        return; 
    }
    _idvState.selfie = file;
    const img = document.getElementById('selfieImg');
    const preview = document.getElementById('selfiePreview');
    const area = document.getElementById('selfieUploadArea');
    const lbl = document.getElementById('selfieUploadLabel');
    
    
    if (img) img.src = URL.createObjectURL(file);
    if (preview) preview.style.display = 'block';
    if (area) area.classList.add('has-file');
    if (lbl) lbl.textContent = 'Photo selected: ' + file.name;
    if (typeof regShowToast === 'function') regShowToast('Selfie uploaded.', 'success');

    const optimized = await _idvTrackCompression(_idvCompressImageFile(file, 1600, 0.82));
    if (_idvState.selfie === file) _idvState.selfie = optimized; 
}

function retakeSelfiePic() {
    _idvState.selfie = null;
    const input = document.getElementById('selfieInput');
    const preview = document.getElementById('selfiePreview');
    const area = document.getElementById('selfieUploadArea');
    const lbl = document.getElementById('selfieUploadLabel');
    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
    if (area) area.classList.remove('has-file');
    if (lbl) lbl.textContent = 'Click to take a selfie or upload a photo';
}

function requestUserLocation() {
    const btn = document.getElementById('btnGetLocation');
    const status = document.getElementById('locationStatusMsg');
    if (!navigator.geolocation) { 
        if (typeof regShowToast === 'function') regShowToast('Location access is not supported by your browser.', 'error'); 
        return; 
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Detecting location...'; }
    if (status) status.textContent = 'Requesting location access...';
    navigator.geolocation.getCurrentPosition(function(pos) {
        const loc = { lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6),
                      label: 'GPS: ' + pos.coords.latitude.toFixed(4) + '°, ' + pos.coords.longitude.toFixed(4) + '°' };
        _idvState.location = loc;
        if (_idvState.district) loc.label += ', ' + _idvState.district;
        _idvShowLocationConfirmed(loc.label);
        if (status) status.textContent = 'GPS acquired, confirm your district in the dropdown below.';
        if (btn) { btn.disabled = false; btn.textContent = 'Re-detect Location'; }
    }, function(err) {
        var msgs = { 1: 'Location denied, please select your district below.', 2: 'Location unavailable, select district manually.', 3: 'Request timed out, select district manually.' };
        if (typeof regShowToast === 'function') regShowToast(msgs[err.code] || 'Could not get location.', 'error');
        if (status) status.textContent = msgs[err.code] || '';
        if (btn) { btn.disabled = false; btn.textContent = 'Detect My Current Location'; }
    }, { timeout: 10000, maximumAge: 60000 });
}

function _idvShowLocationConfirmed(label) {
    const box = document.getElementById('locationConfirmedBox');
    const detail = document.getElementById('locationDetailText');
    const status = document.getElementById('locationStatusMsg');
    if (box) box.style.display = 'flex';
    if (detail) detail.textContent = label;
    if (status) status.textContent = 'Location confirmed.';
}

function useManualLocationEntry() {
    var sel = document.getElementById('idvDistrictSelect');
    var val = sel ? sel.value.trim() : '';
    if (!val) { 
        if (typeof regShowToast === 'function') regShowToast('Please select a district.', 'error'); 
        return; 
    }
    var hidden = document.getElementById('manualLocationInput');
    if (hidden) hidden.value = val;
    _idvState.location = { lat: _idvState.location ? _idvState.location.lat : null,
                           lng: _idvState.location ? _idvState.location.lng : null,
                           label: val };
    _idvState.district = val;
    _idvShowLocationConfirmed(val);
    if (typeof regShowToast === 'function') regShowToast('District saved: ' + val, 'success');
}

async function handleNatIdFrontUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
        if (typeof regShowToast === 'function') regShowToast('File must be under 5 MB.', 'error'); 
        return; 
    }
    _idvState.idFront = file;
    const lbl = document.getElementById('natIdFrontFilename');
    if (lbl) lbl.textContent = 'File selected: ' + file.name;
    const errEl = document.getElementById('err_idvNatIdFront');
    if (errEl) errEl.classList.remove('show');
    if (typeof regShowToast === 'function') regShowToast('National ID front uploaded.', 'success');

    const optimized = await _idvTrackCompression(_idvCompressImageFile(file, 1600, 0.82));
    if (_idvState.idFront === file) _idvState.idFront = optimized;
}

async function handleNatIdBackUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
        if (typeof regShowToast === 'function') regShowToast('File must be under 5 MB.', 'error'); 
        return; 
    }
    _idvState.idBack = file;
    const lbl = document.getElementById('natIdBackFilename');
    if (lbl) lbl.textContent = 'File selected: ' + file.name;
    const errEl = document.getElementById('err_idvNatIdBack');
    if (errEl) errEl.classList.remove('show');
    if (typeof regShowToast === 'function') regShowToast('National ID back uploaded.', 'success');

    const optimized = await _idvTrackCompression(_idvCompressImageFile(file, 1600, 0.82));
    if (_idvState.idBack === file) _idvState.idBack = optimized;
}











const _idvNinRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{6}[A-Z0-9]{4}$/;

function _idvValidateNinFormat(value) {
    const v = String(value || '').toUpperCase().trim();
    if (!v) return { valid: false, empty: true, message: '' };
    if (v.length !== 14) {
        return { valid: false, message: `National ID must be exactly 14 characters (currently ${v.length}).` };
    }
    if (!_idvNinRegex.test(v)) {
        return { valid: false, message: 'Invalid format. Expected 2 letters, then a 2-digit birth year, then a 6-character security code, then a 4-character suffix (e.g. CM95AB12CD34EF).' };
    }
    const prefix = v.substring(0, 2);
    const gender = prefix === 'CM' ? 'Male' : (prefix === 'CF' ? 'Female' : null);
    return {
        valid: true,
        value: v,
        gender: gender,
        message: gender ? `Valid ${gender} National ID.` : 'Valid National ID format.'
    };
}

function _idvHandleNatIdNumberInput(input) {
    const upper = input.value.toUpperCase();
    if (upper !== input.value) input.value = upper;
    _idvState.nationalIdNumber = upper.trim();

    const errEl = document.getElementById('err_idvNatIdNumber');
    const fbEl  = document.getElementById('natIdNumberFeedback');
    const result = _idvValidateNinFormat(upper);

    if (errEl) errEl.classList.remove('show');

    if (!upper) {
        if (fbEl) fbEl.textContent = '';
        input.style.borderColor = '';
        return;
    }
    if (result.valid) {
        if (fbEl) { fbEl.textContent = result.message; fbEl.style.color = '#28a745'; }
        input.style.borderColor = '#28a745';
    } else {
        if (fbEl) { fbEl.textContent = result.message; fbEl.style.color = '#dc3545'; }
        input.style.borderColor = '#dc3545';
    }
}

function _idvValidateNationalIdFields() {
    var ok = true;
    var numInput = document.getElementById('natIdNumberInput');
    var numVal = (numInput ? numInput.value : _idvState.nationalIdNumber || '').trim().toUpperCase();
    _idvState.nationalIdNumber = numVal;

    var errNum = document.getElementById('err_idvNatIdNumber');
    if (!numVal) {
        if (errNum) { errNum.textContent = 'Your National ID number is required.'; errNum.classList.add('show'); }
        ok = false;
    } else {
        var ninCheck = _idvValidateNinFormat(numVal);
        if (!ninCheck.valid) {
            if (errNum) { errNum.textContent = ninCheck.message; errNum.classList.add('show'); }
            ok = false;
        } else if (errNum) {
            errNum.classList.remove('show');
        }
    }

    var errFront = document.getElementById('err_idvNatIdFront');
    if (!_idvState.idFront) { if (errFront) errFront.classList.add('show'); ok = false; }
    else if (errFront) errFront.classList.remove('show');

    var errBack = document.getElementById('err_idvNatIdBack');
    if (!_idvState.idBack) { if (errBack) errBack.classList.add('show'); ok = false; }
    else if (errBack) errBack.classList.remove('show');

    if (!ok && typeof regShowToast === 'function') {
        regShowToast('Please fix the highlighted National ID / document fields before continuing.', 'error');
    }
    return ok;
}





async function submitIdVerification() {
    
    
    if (!_idvValidateNationalIdFields()) {
        return;
    }

    
    if (!_isVerificationAuthenticated()) {
        if (typeof regShowToast === 'function') {
            regShowToast('Please login first.', 'error');
        } else {
            alert('Please login first.');
        }
        return;
    }

    var username = localStorage.getItem('username') || sessionStorage.getItem('lcdjp_username');
    if (!username) { 
        if (typeof regShowToast === 'function') regShowToast('Please log in first.', 'error'); 
        return; 
    }

    
    var token = _getVerificationToken();
    if (!token) {
        if (typeof regShowToast === 'function') {
            regShowToast('Authentication token not found. Please login again.', 'error');
        }
        return;
    }

    
    var _vsGuard = localStorage.getItem('verificationStatus') || sessionStorage.getItem('lcdjp_verif_status') || '';
    var _vsUpper = _vsGuard.toUpperCase();
    if (_vsUpper === 'PENDING') {
        alert('Your verification has already been submitted. Please wait for admin review.');
        return;
    }
    if (_vsUpper === 'APPROVED' || _vsUpper === 'VERIFIED' || _vsGuard === 'verified') {
        alert('Your account is already verified.');
        return;
    }

    
    
    var _priorSessionStatus = sessionStorage.getItem('lcdjp_verif_status') || '';
    var _priorLocalStatus = localStorage.getItem('verificationStatus') || '';

    
    
    
    await _idvWaitForPendingCompressions();

    
    sessionStorage.setItem('lcdjp_verif_status', 'pending');
    localStorage.setItem('verificationStatus', 'PENDING');
    document.querySelectorAll('#idVerifyPage .reg-step-panel').forEach(function(p){ p.classList.add('hidden'); });
    var succ = document.getElementById('idvStep4');
    if (succ) succ.classList.remove('hidden');
    if (typeof _lcdjpUpdateVerifBanner === 'function') _lcdjpUpdateVerifBanner();

    
    
    
    
    
    
    
    
    _idvState.reopenAccountStatusOnClose = false;
    if (typeof regShowToast === 'function') {
        regShowToast('Verification submitted, pending review.', 'success');
    }
    if (typeof closeIdVerifyModal === 'function') closeIdVerifyModal();

    try {
        var submittedRole = _idvNormalizeVerificationRole(_idvState.requestedRole);
        var submittedDistrict = String(
            _idvState.district ||
            (_idvState.location && (_idvState.location.district || _idvState.location.label)) ||
            ''
        ).trim();
        if (!submittedDistrict) {
            throw new Error('Please select the district responsible for this verification.');
        }

        var payload = {
            username: username,
            requestedRole: submittedRole,
            verificationRole: submittedRole,
            originalRequestedRole: _idvState.requestedRole || submittedRole,
            district: submittedDistrict,
            verificationDistrict: submittedDistrict,
            districtAdminDistrict: submittedDistrict,
            reviewRecipients: _idvRequiresDistrictAdminVerification(submittedRole)
                ? ['DISTRICT_ADMIN']
                : ['SYSTEM_ADMIN', 'DISTRICT_ADMIN'],
            reviewRouting: _idvBuildReviewRouting(submittedRole, submittedDistrict),
            systemAdminReviewRequired: !_idvRequiresDistrictAdminVerification(submittedRole),
            districtAdminReviewRequired: true
        };

        if (_idvState.selfie) payload.selfie = await _idvReadFileAsDataUrl(_idvState.selfie);
        payload.nationalId = _idvState.nationalIdNumber || '';
        if (_idvState.idFront) payload.idFront = await _idvReadFileAsDataUrl(_idvState.idFront);
        if (_idvState.idBack) payload.idBack = await _idvReadFileAsDataUrl(_idvState.idBack);
        
        if (_idvState.location) {
            payload.latitude = _idvState.location.lat || '';
            payload.longitude = _idvState.location.lng || '';
            payload.locationLabel = _idvState.location.label || '';
        }

        
        
        
        
        
        var roleDocKeys = Object.keys(_idvState.roleExtraDocs || {});
        for (var roleDocIndex = 0; roleDocIndex < roleDocKeys.length; roleDocIndex++) {
            var roleDocKey = roleDocKeys[roleDocIndex];
            var roleDocValue = _idvState.roleExtraDocs[roleDocKey];
            if (roleDocValue && typeof roleDocValue !== 'string') {
                payload['roleDoc_' + roleDocKey] = await _idvReadFileAsDataUrl(roleDocValue);
            } else if (typeof roleDocValue === 'string' && roleDocValue.trim() !== '') {
                payload['roleDoc_' + roleDocKey] = roleDocValue.trim();
            }
        }

        var endpoint = (typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.submitVerification)
            ? API_ENDPOINTS.submitVerification
            : `${API_BASE_URL}/api/auth/verification/submit`;
        
        
        var headers = { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        };

        
        
        var _idvSubmitController = new AbortController();
        var _idvSubmitTimeout = setTimeout(function() { _idvSubmitController.abort(); }, 30000);

        var res;
        try {
            res = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: _idvSubmitController.signal
            });
        } finally {
            clearTimeout(_idvSubmitTimeout);
        }

        if (res.ok) {
            var data = {};
            try { data = await res.json(); } catch(e) {}
            var backendStatus = data.verificationStatus || data.status || 'pending';
            var _normalizedStatus = _lcdjpNormalizeVerifStatus(backendStatus);
            sessionStorage.setItem('lcdjp_verif_status', _normalizedStatus);
            localStorage.setItem('verificationStatus', backendStatus.toUpperCase());
            sessionStorage.setItem('lcdjp_verification_route', JSON.stringify(
                data.reviewRouting || payload.reviewRouting
            ));
            
            console.log("✅ Verification submitted successfully:", data);
            if (typeof updateVerificationUI === 'function') updateVerificationUI();
        } else {
            
            if (res.status === 401 || res.status === 403) {
                console.warn('Authentication error during verification submission');
                if (typeof regShowToast === 'function') {
                    regShowToast('Authentication error. Please login again.', 'error');
                }
                localStorage.removeItem('jwtToken');
                sessionStorage.removeItem('jwtToken');
                if (typeof _authRedirect === 'function') {
                    _authRedirect();
                }
                return;
            }

            
            
            
            var errMsg = 'Verification could not be submitted. Please try again.';
            try {
                var errData = await res.json();
                if (errData && errData.error) errMsg = errData.error;
            } catch (parseErr) {  }

            if (_priorSessionStatus) sessionStorage.setItem('lcdjp_verif_status', _priorSessionStatus);
            else sessionStorage.removeItem('lcdjp_verif_status');
            if (_priorLocalStatus) localStorage.setItem('verificationStatus', _priorLocalStatus);
            else localStorage.removeItem('verificationStatus');
            if (typeof _lcdjpUpdateVerifBanner === 'function') _lcdjpUpdateVerifBanner();
            if (typeof updateVerificationUI === 'function') updateVerificationUI();

            console.warn('Verification submission returned HTTP', res.status, ':', errMsg);
            if (typeof regShowToast === 'function') {
                regShowToast(errMsg, 'error');
            } else {
                alert(errMsg);
            }
        }
    } catch (e) {
        
        
        
        
        console.warn('Verification POST failed, reverting optimistic status:', e);
        if (_priorSessionStatus) sessionStorage.setItem('lcdjp_verif_status', _priorSessionStatus);
        else sessionStorage.removeItem('lcdjp_verif_status');
        if (_priorLocalStatus) localStorage.setItem('verificationStatus', _priorLocalStatus);
        else localStorage.removeItem('verificationStatus');
        if (typeof _lcdjpUpdateVerifBanner === 'function') _lcdjpUpdateVerifBanner();
        if (typeof updateVerificationUI === 'function') updateVerificationUI();

        var isTimeout = e && e.name === 'AbortError';
        var netMsg = isTimeout
            ? 'Upload timed out, check your connection and try again.'
            : 'Error submitting verification: ' + (e && e.message ? e.message : 'network error');
        if (typeof regShowToast === 'function') {
            regShowToast(netMsg, 'error');
        } else {
            alert(netMsg);
        }
    }
}





function showIdVerifyPage() {
    if (typeof _lcdjpVerificationDisabled === 'function' && _lcdjpVerificationDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('Verification is not available at this time. Please check back later.');
        }
        return;
    }

    var statusPage = document.getElementById('accountStatusPage');
    _idvState.reopenAccountStatusOnClose = !!(statusPage && statusPage.style.display !== 'none');
    document.querySelectorAll('.idv-modal-overlay').forEach(function(el) {
        if (el.id !== 'idVerifyPage') { el.style.display = 'none'; }
    });

    const page = document.getElementById('idVerifyPage');
    if (page) { page.style.display = 'flex'; }
    _idvState.requestedRole = null;
    _idvState.roleExtraDocs = {};
    document.querySelectorAll('#idvRoleGrid .user-type-card').forEach(function(c) { c.classList.remove('selected'); });
    idvGoStep(0);
    _idvLockScroll();
}

function closeIdVerifyModal() {
    const page = document.getElementById('idVerifyPage');
    if (page) { page.style.display = 'none'; }
    _idvUnlockScroll();

    
    
    if (_idvState.reopenAccountStatusOnClose) {
        _idvState.reopenAccountStatusOnClose = false;
        if (typeof showAccountStatusPage === 'function') {
            showAccountStatusPage();
        }
    }
}





function updateVerificationUI() {
    var raw = localStorage.getItem('verificationStatus')
           || sessionStorage.getItem('lcdjp_verif_status') || '';
    var status = raw.toUpperCase();
    var btn    = document.getElementById('btnStartVerification');
    var msgBox = document.getElementById('statusMessageBox');
    var badge  = document.getElementById('statusBadge');

    if (status === 'PENDING') {
        if (btn)    _idvSetVerifButtonState(btn, 'pending');
        if (msgBox) msgBox.innerHTML = '<div class="step-alert step-alert-warning"> Documents pending admin review.</div>';
        if (badge)  { badge.className = 'verif-badge pending'; badge.textContent = ' Verification Pending'; }
    } else if (status === 'APPROVED' || status === 'VERIFIED') {
        if (btn)    btn.style.display = 'none';
        if (msgBox) msgBox.innerHTML = '<div class="step-alert step-alert-info"> Account Verified.</div>';
        if (badge)  { badge.className = 'verif-badge verified'; badge.textContent = ' Verified'; }
    } else if (status === 'REJECTED') {
        if (btn)    _idvSetVerifButtonState(btn, 'rejected');
        if (msgBox) msgBox.innerHTML = '<div class="step-alert step-alert-error"> Verification rejected, please re-submit.</div>';
        if (badge)  { badge.className = 'verif-badge rejected'; badge.textContent = ' Rejected'; }
    } else if (typeof _lcdjpVerificationDisabled === 'function' && _lcdjpVerificationDisabled()) {
        if (btn)    _idvSetVerifButtonState(btn, 'not-verified');
        if (msgBox) msgBox.innerHTML = '<div class="step-alert step-alert-info"> Verification is not available at this time.</div>';
        if (badge)  { badge.className = 'verif-badge not-verified'; badge.textContent = 'Not Verified'; }
    } else {
        if (btn)    _idvSetVerifButtonState(btn, 'not-verified');
        if (msgBox) msgBox.innerHTML = '<div class="step-alert step-alert-info"> Verify your identity.</div>';
        if (badge)  { badge.className = 'verif-badge not-verified'; badge.textContent = 'Not Verified'; }
    }
}










function _idvSetVerifButtonState(btn, state) {
    if (!btn) return;
    if (!btn.dataset.idvOriginalLabel) {
        btn.dataset.idvOriginalLabel = btn.textContent.trim() || 'Complete Identity Verification';
    }
    btn.style.display = 'block';
    if (state === 'pending') {
        btn.disabled = true;
        btn.textContent = '⏳ Pending Verification';
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    } else if (state === 'rejected') {
        btn.disabled = false;
        btn.textContent = '✖ Resubmit Verification';
        btn.style.opacity = '';
        btn.style.cursor = '';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.idvOriginalLabel;
        btn.style.opacity = '';
        btn.style.cursor = '';
    }
}





function showAccountStatusPage() {
    hideAllAuthPages();

    document.querySelectorAll(
        '.modal-overlay, .dynamic-overlay, #dynamicViewOverlay, ' +
        '.dynamic-view-container, #idVerifyPage'
    ).forEach(function(el) {
        el.style.display = 'none';
    });

    
    
    
    const page = document.getElementById('accountStatusPage');
    if (page) page.style.display = 'flex';
    _idvLockScroll();

    _lcdjpFetchAndRenderAccountStatus();
    window.scrollTo(0, 0);
}

function closeAccountStatusPage() {
    const page = document.getElementById('accountStatusPage');
    if (page) page.style.display = 'none';
    _idvUnlockScroll();

    
    
    
    var hasSession = !!(sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!hasSession && typeof backToLogin === 'function') {
        backToLogin();
    }
}

function _lcdjpRenderAccountStatus(name, type, verifStatus, rejectionReason) {
    var nameEl  = document.getElementById('statusUserName');
    var typeEl  = document.getElementById('statusUserType');
    var badge   = document.getElementById('statusBadge');
    var msgBox  = document.getElementById('statusMessageBox');
    var verBtn  = document.getElementById('btnStartVerification');

    if (nameEl) nameEl.textContent = name;
    if (typeEl) typeEl.textContent = type;

    var badgeMap = {
        'not-verified': ['not-verified', 'Not Verified'],
        'pending':      ['pending',      ' Verification Pending'],
        'verified':     ['verified',     ' Verified'],
        'rejected':     ['rejected',     ' Rejected'],
    };
    var pair = badgeMap[verifStatus] || badgeMap['not-verified'];
    if (badge) { badge.className = 'verif-badge ' + pair[0]; badge.textContent = pair[1]; }

    if (msgBox) {
        if (verifStatus === 'verified') {
            msgBox.innerHTML = '<div class="step-alert step-alert-info"> Your account is verified. You can now access all available services.</div>';
        } else if (verifStatus === 'pending') {
            msgBox.innerHTML = '<div class="step-alert step-alert-warning"> Your verification is under review. You will be notified within 24–48 hours once it is complete.</div>';
        } else if (verifStatus === 'rejected') {
            var reasonHtml = rejectionReason
                ? '<p style="margin-top:8px;font-size:13px;color:#721c24;"><strong>Reason:</strong> ' + rejectionReason + '</p>'
                : '';
            msgBox.innerHTML = '<div class="step-alert step-alert-error"> Your verification was rejected. Please re-submit with the correct documents.' + reasonHtml + '</div>';
        } else if (typeof _lcdjpVerificationDisabled === 'function' && _lcdjpVerificationDisabled()) {
            msgBox.innerHTML = '<div class="step-alert step-alert-info">Verification is not available at this time. Please check back later.</div>';
        } else {
            msgBox.innerHTML = '<div class="step-alert step-alert-info">Complete identity verification to unlock sensitive services such as filing official cases, uploading evidence, and direct communication with LC representatives.</div>';
        }
    }

    if (verBtn) {
        if (verifStatus === 'verified') {
            verBtn.style.display = 'none';
        } else if (verifStatus === 'pending') {
            _idvSetVerifButtonState(verBtn, 'pending');
        } else if (verifStatus === 'rejected') {
            _idvSetVerifButtonState(verBtn, 'rejected');
        } else {
            _idvSetVerifButtonState(verBtn, 'not-verified');
        }
    }
    if (typeof _lcdjpUpdateVerifBanner === 'function') _lcdjpUpdateVerifBanner();
}

async function _lcdjpFetchAndRenderAccountStatus() {
    var name        = sessionStorage.getItem('lcdjp_fullname') || 'User';
    var type        = sessionStorage.getItem('lcdjp_userlevel') || 'Citizen';
    var username    = sessionStorage.getItem('lcdjp_username') || '';
    var verifStatus = sessionStorage.getItem('lcdjp_verif_status') || 'not-verified';
    var rejectionReason = sessionStorage.getItem('lcdjp_verif_reject_reason') || '';

    
    
    
    _lcdjpRenderAccountStatus(name, type, verifStatus, rejectionReason);

    
    if (username && typeof API_ENDPOINTS !== 'undefined' && _isVerificationAuthenticated()) {
        try {
            var token = _getVerificationToken();
            if (!token) {
                console.warn('No token available for status fetch');
            } else {
                var headers = { 
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                };
                
                var statusEp = (API_ENDPOINTS.verificationStatus)
                    ? API_ENDPOINTS.verificationStatus(username)
                    : API_ENDPOINTS.user(username);
                var res  = await fetch(statusEp, { headers: headers });
                if (res.ok) {
                    var data = await res.json();
                    var user = data.user || data;
                    var rawStatus = user.verificationStatus || user.verification_status
                                 || user.identityStatus    || user.identity_status || '';
                    if (rawStatus) {
                        verifStatus = typeof _lcdjpNormalizeVerifStatus === 'function'
                            ? _lcdjpNormalizeVerifStatus(rawStatus)
                            : verifStatus;
                        sessionStorage.setItem('lcdjp_verif_status', verifStatus);
                    }
                    rejectionReason = user.rejectionReason || user.rejection_reason
                                   || user.verificationNote || user.verification_note || '';
                    if (rejectionReason) sessionStorage.setItem('lcdjp_verif_reject_reason', rejectionReason);
                    else rejectionReason = sessionStorage.getItem('lcdjp_verif_reject_reason') || '';
                } else if (res.status === 401 || res.status === 403) {
                    console.warn('Authentication error fetching verification status');
                    
                }
            }
        } catch (e) {
            console.warn('Could not fetch verification status from backend:', e);
            rejectionReason = sessionStorage.getItem('lcdjp_verif_reject_reason') || '';
        }
    } else {
        console.log('Skipping verification status fetch - not authenticated');
        rejectionReason = sessionStorage.getItem('lcdjp_verif_reject_reason') || '';
    }

    _lcdjpRenderAccountStatus(name, type, verifStatus, rejectionReason);
}





document.addEventListener('DOMContentLoaded', function() {
    if (typeof updateVerificationUI === 'function') updateVerificationUI();
});