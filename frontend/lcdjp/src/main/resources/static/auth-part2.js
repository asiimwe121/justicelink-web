
function _lcdjpStartForcedPasswordChange(data, username) {
        
        
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('lcdjp_session');
        localStorage.removeItem('lcdjp_username');
        localStorage.removeItem('lcdjp_userlevel');
        localStorage.removeItem('lcdjp_district');
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('lcdjp_session');
        sessionStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        sessionStorage.removeItem('username');
        localStorage.removeItem('role');
        sessionStorage.removeItem('role');
        
        localStorage.setItem('lcdjp_fpc_required', '1');
        sessionStorage.setItem('lcdjp_fpc_required', '1');
        localStorage.setItem('lcdjp_fpc_username', data.username || username);
        sessionStorage.setItem('lcdjp_fpc_username', data.username || username);
        localStorage.setItem('lcdjp_fpc_role',     data.role     || 'SYSTEM_ADMIN');
        sessionStorage.setItem('lcdjp_fpc_role',     data.role     || 'SYSTEM_ADMIN');
        window._lcdjpFpcPending = true;
        window._lcdjpFpcToken   = data.token || null; 
        showForcePasswordChangeModal(data);
        return;
}

function _lcdjpCompleteLogin(data, username) {
            console.log('Login successful:', data);

            _lcdjpClearAccountState();

            const userRole = data.role || data.userRole || data.user_role || 'Citizen';
            const fullName = data.fullName || data.full_name ||
                (((data.firstName || data.first_name || '') + ' ' + (data.lastName || data.last_name || '')).trim()) ||
                username;
            const userType = data.userType || data.user_type || 'individual';
            const isOrganization = userType === 'organization';

            // The token itself stays in the HttpOnly cookie; only its public claims are kept for the UI.
            LcdjpSession.save(data.token);
            localStorage.setItem('lcdjp_username',  data.username);
            localStorage.setItem('lcdjp_userlevel', data.role);
            localStorage.setItem('lcdjp_district',  data.district || '');
            localStorage.setItem('verificationStatus', (data.verificationStatus || data.verification_status || '').toUpperCase());
            localStorage.setItem('approvalStatus', (data.approvalStatus || data.approval_status || '').toUpperCase());
            
            localStorage.setItem('userRole',     data.role);
            localStorage.setItem('username',     data.username);
            localStorage.setItem('userDistrict', data.district || '');
            window.LCDJP_AUTH_VALIDATED = true;
            
            
            
            window.LCDJP_AUTH_READY = false;
            console.log("\u2705 Signed in (session cookie set)");
            
            localStorage.setItem('username',   data.username);
            sessionStorage.setItem('username',   data.username);
            localStorage.setItem('role',       data.role);
            sessionStorage.setItem('role',       data.role);
            localStorage.setItem('fullName',   data.fullName);
            sessionStorage.setItem('fullName',   data.fullName);
            
            console.log('User Type from backend:', userType);
            console.log('Is Organization?', isOrganization);
            
            
            window._lcdjpUser = {
                username: data.username,
                role: userRole,
                fullName: fullName,
                userType: userType,
                isOrganization: isOrganization,
                phone: data.phone || '',
                district: data.district || '',
                village: data.village || '',
                parish: data.parish || '',
                subCounty: data.subCounty || ''
            };
            
            
            localStorage.setItem("lcdjp_userlevel", userRole);
            sessionStorage.setItem("lcdjp_userlevel", userRole);
            localStorage.setItem("lcdjp_username", data.username);
            sessionStorage.setItem("lcdjp_username", data.username);
            localStorage.setItem("lcdjp_fullname", fullName);
            sessionStorage.setItem("lcdjp_fullname", fullName);
            localStorage.setItem("lcdjp_userType", userType);
            sessionStorage.setItem("lcdjp_userType", userType);
            localStorage.setItem("lcdjp_isOrganization", isOrganization ? 'true' : 'false');
            sessionStorage.setItem("lcdjp_isOrganization", isOrganization ? 'true' : 'false');
            localStorage.setItem("lcdjp_approval_status",
                String(data.approvalStatus || data.approval_status || '').toLowerCase());
            sessionStorage.setItem("lcdjp_approval_status",
                String(data.approvalStatus || data.approval_status || '').toLowerCase());
            
            
            var _verifiedFlag = data.accountVerified === true ||
                data.account_verified === true ||
                data.verified === true ||
                data.isVerified === true ||
                String(data.accountVerified || data.account_verified || data.verified || data.isVerified || '').toLowerCase() === 'true';
            var _rawVerif = data.verificationStatus || data.verif_status || data.verification_status
                         || (_verifiedFlag ? 'VERIFIED'
                            : data.verificationPending === true || data.verification_pending === true ? 'PENDING' : '');
            var _computedVerif = typeof _lcdjpNormalizeVerifStatus === 'function'
                ? _lcdjpNormalizeVerifStatus(_rawVerif)
                : (_rawVerif.toUpperCase() === 'VERIFIED' || _rawVerif.toUpperCase() === 'APPROVED' ? 'verified'
                  : _rawVerif.toUpperCase() === 'PENDING' ? 'pending'
                  : _rawVerif.toUpperCase() === 'REJECTED' ? 'rejected' : 'not-verified');
            
            
            
            
            
            
            
            
            
            
            localStorage.setItem('lcdjp_verif_status', _computedVerif);
            sessionStorage.setItem('lcdjp_verif_status', _computedVerif);
            localStorage.setItem('verificationStatus', _computedVerif.toUpperCase());
            sessionStorage.setItem('verificationStatus', _computedVerif.toUpperCase());
            if (typeof _lcdjpUpdateVerifBanner === 'function') setTimeout(_lcdjpUpdateVerifBanner, 400);
            
            if (isOrganization) {
                localStorage.setItem("lcdjp_orgName", data.organizationName || data.orgName || fullName);
                sessionStorage.setItem("lcdjp_orgName", data.organizationName || data.orgName || fullName);
                localStorage.setItem("lcdjp_orgType", data.organizationType || data.orgType || "Legal Organization");
                sessionStorage.setItem("lcdjp_orgType", data.organizationType || data.orgType || "Legal Organization");
                localStorage.setItem("lcdjp_orgId", String(data.organizationId || data.orgId || ""));
                sessionStorage.setItem("lcdjp_orgId", String(data.organizationId || data.orgId || ""));
                localStorage.setItem("lcdjp_orgSpec", data.specialization || data.orgSpec || "");
                sessionStorage.setItem("lcdjp_orgSpec", data.specialization || data.orgSpec || "");
            }
            
            localStorage.setItem("lcdjp_phone", data.phone || '');
            sessionStorage.setItem("lcdjp_phone", data.phone || '');
            
            
            
            
            
            
            
            localStorage.setItem("lcdjp_email", data.email || '');
            sessionStorage.setItem("lcdjp_email", data.email || '');
            localStorage.setItem("lcdjp_district", data.district || '');
            sessionStorage.setItem("lcdjp_district", data.district || '');
            localStorage.setItem("lcdjp_village", data.village || '');
            sessionStorage.setItem("lcdjp_village", data.village || '');
            localStorage.setItem("lcdjp_parish", data.parish || '');
            sessionStorage.setItem("lcdjp_parish", data.parish || '');
            localStorage.setItem("lcdjp_subCounty", data.subCounty || '');
            sessionStorage.setItem("lcdjp_subCounty", data.subCounty || '');
            
            localStorage.removeItem('lcdjp_return_to_login');
            sessionStorage.removeItem('lcdjp_return_to_login');
            
            var _gLO = document.getElementById("accountMenuLogoutItem"); 
            if (_gLO) { 
                _gLO.textContent = "Logout"; 
                _gLO.onclick = function(e) { 
                    e.stopPropagation(); 
                    logoutUser(); 
                }; 
            }
            currentUserLevel = userRole;

            document.getElementById("loginPage").style.display = "none";
            document.getElementById("dashboardPage").style.display = "block";
            document.getElementById("welcomeUserHeading").textContent = "Welcome " + fullName;
            document.getElementById("accountMenuDropdownLabel").textContent = fullName;
            
            
            let savedAvatar = localStorage.getItem("lcdjp_avatar_" + data.username);
            if (savedAvatar && savedAvatar !== "undefined" && savedAvatar !== "null") {
                document.getElementById("profilePicture").src = savedAvatar;
            } else {
                document.getElementById("profilePicture").src = defaultAvatar;
                
                
                
                _lcdjpSyncAvatarFromBackend(data.username);
            }

            const footer = document.getElementById("mainFooter");
            document.body.classList.remove('citizen-dashboard-mode', 'lawyer-dashboard-mode', 'admin-dashboard-mode', 'admin-map-active');
            
            if (userRole === "Citizen") {
                document.body.classList.add('citizen-dashboard-mode');
                if (footer) {
                    footer.style.display = "block";
                    footer.style.visibility = "visible";
                    footer.style.opacity = "1";
                    footer.style.height = "auto";
                    footer.style.padding = "30px 20px 20px";
                    footer.style.margin = "0 15px 0 15px";
                    footer.style.overflow = "visible";
                    footer.style.border = "1px solid rgba(26, 64, 128, 0.1)";
                }
            } else if (userRole === "Lawyer") {
                document.body.classList.add('lawyer-dashboard-mode');
                console.log('Individual Lawyer - showing Lawyer Dashboard');
                if (data.specialization) {
                    localStorage.setItem("lcdjp_lawyer_specialization", data.specialization);
                    sessionStorage.setItem("lcdjp_lawyer_specialization", data.specialization);
                    currentLawyerSpecialization = data.specialization;
                }
                if (footer) {
                    footer.style.display = "none";
                    footer.style.visibility = "hidden";
                    footer.style.opacity = "0";
                    footer.style.height = "0";
                    footer.style.padding = "0";
                    footer.style.margin = "0";
                    footer.style.overflow = "hidden";
                    footer.style.border = "none";
                }
            } else if (userRole === "LC") {
                document.body.classList.add('lawyer-dashboard-mode');
                console.log('LC Official - showing LC Dashboard');
                if (footer) {
                    footer.style.display = "none";
                    footer.style.visibility = "hidden";
                    footer.style.opacity = "0";
                    footer.style.height = "0";
                    footer.style.padding = "0";
                    footer.style.margin = "0";
                    footer.style.overflow = "hidden";
                    footer.style.border = "none";
                }
            } else if (userRole === "DISTRICT_ADMIN") {
                document.body.classList.add('admin-dashboard-mode');
                if (footer) { footer.style.display="none"; footer.style.visibility="hidden"; footer.style.opacity="0"; footer.style.height="0"; footer.style.padding="0"; footer.style.margin="0"; footer.style.overflow="hidden"; footer.style.border="none"; }
                var _daAdminSidebar = document.getElementById('adminSidebarMenu');
                if (_daAdminSidebar) _daAdminSidebar.style.display = 'none';
                var _daSidebarMenu = document.getElementById('daSidebarMenu');
                if (_daSidebarMenu) _daSidebarMenu.style.display = 'block';
                var citizenMenuDA = document.getElementById('citizenSidebarMenu');
                if (citizenMenuDA) citizenMenuDA.style.display = 'none';
                var lawyerMenuDA = document.getElementById('lawyerSidebarMenu');
                if (lawyerMenuDA) lawyerMenuDA.style.display = 'none';
                
                
                
                
                
                currentUserLevel = 'DISTRICT_ADMIN';
                localStorage.setItem('lcdjp_userlevel', 'DISTRICT_ADMIN');
                sessionStorage.setItem('lcdjp_userlevel', 'DISTRICT_ADMIN');
            } else if (userRole === "Admin" || userRole === "System Administrator" || userRole === "SYSTEM_ADMIN") {
                document.body.classList.add('admin-dashboard-mode');
                if (footer) {
                    footer.style.display = "none";
                    footer.style.visibility = "hidden";
                    footer.style.opacity = "0";
                    footer.style.height = "0";
                    footer.style.padding = "0";
                    footer.style.margin = "0";
                    footer.style.overflow = "hidden";
                    footer.style.border = "none";
                }
                var adminMenu2 = document.getElementById("adminSidebarMenu");
                if (adminMenu2) {
                    adminMenu2.style.display = "block";
                    adminMenu2.style.visibility = "visible";
                    adminMenu2.style.opacity = "1";
                }
                var _adminNavExtrasE = document.getElementById("adminNavExtras"); 
                if (_adminNavExtrasE) _adminNavExtrasE.style.display = "inline-flex";
                var citizenMenu2 = document.getElementById("citizenSidebarMenu");
                if (citizenMenu2) citizenMenu2.style.display = "none";
                var lawyerMenu2 = document.getElementById("lawyerSidebarMenu");
                if (lawyerMenu2) lawyerMenu2.style.display = "none";
                var _lcNavExtras2 = document.getElementById("lcNavExtras"); 
                if (_lcNavExtras2) _lcNavExtras2.style.display = "none";
            } else {
                document.body.classList.add('citizen-dashboard-mode');
                if (footer) {
                    footer.style.display = "block";
                    footer.style.visibility = "visible";
                    footer.style.opacity = "1";
                    footer.style.height = "auto";
                    footer.style.padding = "30px 20px 20px";
                    footer.style.margin = "0 15px 0 15px";
                    footer.style.overflow = "visible";
                    footer.style.border = "1px solid rgba(26, 64, 128, 0.1)";
                }
            }

            setTimeout(function() {
                if (!isAuthenticated()) {
                    if (typeof _stopAllPolling === 'function') _stopAllPolling();
                    return;
                }
                window.LCDJP_AUTH_READY = true;
                
                
                
                
                
                if (typeof _cmActivate === 'function') _cmActivate();
                setupDashboardMenuVisibility(currentUserLevel);
                renderNavbarNotifBadge();

                console.log('Current user level:', currentUserLevel);
                console.log('Is Organization:', isOrganization);

                if (currentUserLevel === "Admin" || currentUserLevel === "System Administrator" || currentUserLevel === "SYSTEM_ADMIN") {
                    showAdminHome();
                } else if (currentUserLevel === "Lawyer") {
                    console.log('Calling showLawyerDashboard()');
                    showLawyerDashboard();
                } else if (currentUserLevel === "LC") {
                    console.log('Calling showLcDashboard()');
                    showLcDashboard();
                } else if (currentUserLevel === "Citizen") {
                    showHome();
                } else if (currentUserLevel === "DISTRICT_ADMIN") {
                    if (typeof showDistrictAdminDashboard === 'function') showDistrictAdminDashboard();
                } else {
                    showHome();
                }

                ensureSidebarVisibility(currentUserLevel);
            }, 500);
}

var _lcdjpPendingOtpUsername = '';
var _lcdjpOtpResendTimer = null;

function _lcdjpShowLoginOtpPage(username, message) {
    _lcdjpPendingOtpUsername = String(username || '');

    var loginPage = document.getElementById('loginPage');
    if (loginPage) loginPage.style.display = 'none';
    var registerPage = document.getElementById('registerPage');
    if (registerPage) registerPage.style.display = 'none';
    var forgotPage = document.getElementById('forgotPage');
    if (forgotPage) forgotPage.style.display = 'none';

    var otpPage = document.getElementById('loginOtpPage');
    if (!otpPage) {
        console.error('[LCDJP] #loginOtpPage is missing from index.html');
        return;
    }

    var msgEl = document.getElementById('loginOtpMessage');
    if (msgEl) msgEl.textContent = message || 'Enter the 6-digit code we sent you to finish logging in.';
    var errEl = document.getElementById('loginOtpError');
    if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
    var otpInput = document.getElementById('loginOtpInput');
    if (otpInput) otpInput.value = '';
    var submitBtn = document.getElementById('loginOtpSubmitBtn');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Verify & Log In'; }

    otpPage.style.display = 'flex';
    window.scrollTo(0, 0);
    if (otpInput) otpInput.focus();
}

function _lcdjpHideLoginOtpPage() {
    var otpPage = document.getElementById('loginOtpPage');
    if (otpPage) otpPage.style.display = 'none';
    _lcdjpPendingOtpUsername = '';
    if (_lcdjpOtpResendTimer) { clearTimeout(_lcdjpOtpResendTimer); _lcdjpOtpResendTimer = null; }
}

function _lcdjpCancelLoginOtp() {
    _lcdjpHideLoginOtpPage();
    var loginPage = document.getElementById('loginPage');
    if (loginPage) loginPage.style.display = 'flex';
    var pw = document.getElementById('password');
    if (pw) pw.value = '';
    _lcdjpResetRecaptcha();
    window.scrollTo(0, 0);
}

function _lcdjpShowLoginOtpError(message) {
    var errEl = document.getElementById('loginOtpError');
    if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
}

function _lcdjpVerifyLoginOtp() {
    var username = _lcdjpPendingOtpUsername;
    var otpInput = document.getElementById('loginOtpInput');
    var errEl = document.getElementById('loginOtpError');
    var submitBtn = document.getElementById('loginOtpSubmitBtn');
    var otp = otpInput ? otpInput.value.trim() : '';

    if (errEl) errEl.style.display = 'none';
    if (!username) {
        _lcdjpCancelLoginOtp();
        return;
    }
    if (!/^\d{6}$/.test(otp)) {
        _lcdjpShowLoginOtpError('Enter the 6-digit code.');
        return;
    }

    var originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Verifying…'; }

    fetch(API_BASE_URL + '/api/auth/login/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, otp: otp })
    })
    .then(function(response) {
        return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Verification failed');
            return data;
        });
    })
    .then(function(data) {
        _lcdjpHideLoginOtpPage();
        if (data.requirePasswordChange) {
            _lcdjpClearAccountState();
            _lcdjpStartForcedPasswordChange(data, username);
            return;
        }
        _lcdjpCompleteLogin(data, username);
    })
    .catch(function(error) {
        console.error('Login OTP error:', error);
        _lcdjpShowLoginOtpError(error.message || 'Incorrect or expired code.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText || 'Verify & Log In'; }
    });
}

function _lcdjpResendLoginOtp() {
    var username = _lcdjpPendingOtpUsername;
    var resendBtn = document.getElementById('loginOtpResendBtn');
    var errEl = document.getElementById('loginOtpError');
    if (errEl) errEl.style.display = 'none';
    if (!username) {
        _lcdjpCancelLoginOtp();
        return;
    }
    var original = resendBtn ? resendBtn.textContent : '';
    if (resendBtn) { resendBtn.disabled = true; resendBtn.textContent = 'Resending…'; }

    fetch(API_BASE_URL + '/api/auth/login/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
    })
    .then(function(response) {
        return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Could not resend code');
            return data;
        });
    })
    .then(function(data) {
        var msgEl = document.getElementById('loginOtpMessage');
        if (msgEl) msgEl.textContent = data.message || 'A new code was sent.';
    })
    .catch(function(error) {
        _lcdjpShowLoginOtpError(error.message || 'Could not resend code.');
    })
    .finally(function() {
        if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = original || 'Resend code'; }
    });
}

function _lcdjpResetRecaptcha() {
    if (typeof window._lcdjpRecaptchaWidgetId !== 'undefined' && typeof grecaptcha !== 'undefined') {
        grecaptcha.reset(window._lcdjpRecaptchaWidgetId);
    }
}


function checkAuthStatus() {
    console.log('[LCDJP] Checking authentication status...');
    
    
    var token = _getAuthToken();
    var currentPath = window.location.pathname;

    
    if (!token || !isTokenValid()) {
        if (typeof _stopAllPolling === 'function') _stopAllPolling();
        console.log('[LCDJP] No JWT token found. Showing login screen.');
        if (typeof showLoginScreen === 'function') {
            showLoginScreen();
        }
        return;
    }

    
    fetch(API_ENDPOINTS.jwtValidate, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        suppressAuthRedirect: true
    })
    .then(function(response) {
        if (!response.ok) {
            var _authErr = new Error('Token validation failed: ' + response.status);
            _authErr.status = response.status;
            throw _authErr;
        }
        return response.json();
    })
    .then(function(data) {
        if (data.valid === true) {
            console.log('[LCDJP] JWT Token is valid. User:', data.username);
            
            var username = data.username ||
                (typeof getLcdjpActiveUsername === 'function' ? getLcdjpActiveUsername() : '') ||
                localStorage.getItem('username') || '';
            var role = localStorage.getItem('userRole') || 'Citizen';

            
            
            
            window.LCDJP_AUTH_VALIDATED = true;
            window.LCDJP_AUTH_READY = true;
            if (typeof _cmActivate === 'function') _cmActivate();

            
            var _refreshToken = _getAuthToken() || '';
            var _profileUrl = API_BASE_URL + '/api/auth/users/' + encodeURIComponent(username);
            
            fetch(_profileUrl, {
                method: 'GET',
                headers: _authHeaders(_refreshToken)
            })
            .then(function(pr) {
                if (_handleAuthResponse(pr, 'Please log in again to refresh your profile.')) return null;
                return pr.ok ? pr.json() : null;
            })
            .catch(function() { return null; })
            .then(function(profileData) {
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                if (profileData) {
                    window._lcdjpProfileCache = {
                        username: username,
                        data: profileData,
                        ts: Date.now()
                    };
                }
                if (profileData) {
                    var freshUser = profileData.user || profileData;
                    var freshRole = freshUser.role || freshUser.userRole || freshUser.user_role || role;
                    var freshApproval = freshUser.approvalStatus || freshUser.approval_status || '';
                    var freshVerif = freshUser.verificationStatus || freshUser.verification_status || '';
                    
                    localStorage.setItem('userRole', freshRole);
                    var freshFullName = freshUser.fullName || freshUser.full_name ||
                        (((freshUser.firstName || freshUser.first_name || '') + ' ' + (freshUser.lastName || freshUser.last_name || '')).trim());
                    if (freshFullName) {
                        localStorage.setItem('fullName', freshFullName);
                    }
                    localStorage.setItem('approvalStatus', freshApproval);
                    localStorage.setItem('verificationStatus', freshVerif);
                    localStorage.setItem('lcdjp_approval_status', freshApproval.toLowerCase());
                    sessionStorage.setItem('lcdjp_approval_status', freshApproval.toLowerCase());
                    localStorage.setItem('lcdjp_verif_status', freshVerif);
                    sessionStorage.setItem('lcdjp_verif_status', freshVerif);
                    role = freshRole;
                    console.log('[LCDJP] Role refreshed from backend:', freshRole, '| verif:', freshVerif);
                } else {
                    console.warn('[LCDJP] Could not refresh profile from backend; using cached role.');
                }

                
                localStorage.setItem('lcdjp_userlevel', role);
                sessionStorage.setItem('lcdjp_userlevel', role);
                localStorage.setItem('lcdjp_username', username);
                sessionStorage.setItem('lcdjp_username', username);
                localStorage.setItem('lcdjp_fullname', localStorage.getItem('fullName') || username);
                sessionStorage.setItem('lcdjp_fullname', localStorage.getItem('fullName') || username);
                localStorage.setItem('lcdjp_userType', localStorage.getItem('userType') || 'individual');
                sessionStorage.setItem('lcdjp_userType', localStorage.getItem('userType') || 'individual');
                localStorage.setItem('lcdjp_isOrganization', localStorage.getItem('isOrganization') === 'true' ? 'true' : 'false');
                sessionStorage.setItem('lcdjp_isOrganization', localStorage.getItem('isOrganization') === 'true' ? 'true' : 'false');

                
                if (localStorage.getItem('requirePasswordChange') === 'true') {
                    window._lcdjpFpcPending = true;
                    window._lcdjpFpcToken = token;
                    var _lpFpc = document.getElementById('loginPage');
                    var _dpFpc = document.getElementById('dashboardPage');
                    if (_lpFpc) _lpFpc.style.display = 'none';
                    if (_dpFpc) _dpFpc.style.display = 'none';
                    localStorage.setItem('lcdjp_fpc_required', '1');
                    sessionStorage.setItem('lcdjp_fpc_required', '1');
                    localStorage.setItem('lcdjp_fpc_username', username);
                    sessionStorage.setItem('lcdjp_fpc_username', username);
                    localStorage.setItem('lcdjp_fpc_role', role);
                    sessionStorage.setItem('lcdjp_fpc_role', role);
                    if (typeof showForcePasswordChangeModal === 'function') {
                        showForcePasswordChangeModal(username, role);
                    }
                    return;
                }

                
                var loginPage = document.getElementById('loginPage');
                var dashboardPage = document.getElementById('dashboardPage');
                if (loginPage) loginPage.style.display = 'none';
                if (dashboardPage) dashboardPage.style.display = 'block';
                
                var welcomeEl = document.getElementById('welcomeUserHeading');
                if (welcomeEl) {
                    welcomeEl.textContent = 'Welcome ' + (localStorage.getItem('fullName') || username);
                }
                
                var dropdownLabel = document.getElementById('accountMenuDropdownLabel');
                if (dropdownLabel) {
                    dropdownLabel.textContent = (localStorage.getItem('fullName') || username);
                }

                
                var savedAvatar = localStorage.getItem('lcdjp_avatar_' + username);
                var profilePic = document.getElementById('profilePicture');
                if (profilePic) {
                    if (savedAvatar && savedAvatar !== 'undefined' && savedAvatar !== 'null') {
                        profilePic.src = savedAvatar;
                    } else {
                        profilePic.src = defaultAvatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%231a4080"/%3E%3Ctext x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-family="Arial"%3E%3C/text%3E%3C/svg%3E';
                    }
                }
                
                
                var userLevel = role;
                var isOrganization = localStorage.getItem('isOrganization') === 'true';

                function isAdmin(level) {
                    return level === 'SYSTEM_ADMIN' || level === 'Admin' || level === 'DISTRICT_ADMIN';
                }

                if (userLevel === 'DISTRICT_ADMIN') {
                    var daDistrict = localStorage.getItem('userDistrict') || '';
                    if (!daDistrict && typeof freshUser !== 'undefined' && freshUser) {
                        daDistrict = freshUser.district || freshUser.assignedDistrict || freshUser.assigned_district || '';
                    }
                    if (daDistrict) localStorage.setItem('userDistrict', daDistrict);
                    document.body.classList.add('admin-dashboard-mode');
                    var _daAdminSidebar = document.getElementById('adminSidebarMenu');
                    if (_daAdminSidebar) { _daAdminSidebar.style.display = 'none'; }
                    var _daSidebar = document.getElementById('daSidebarMenu');
                    if (_daSidebar) { _daSidebar.style.display = 'block'; }
                    var _citizenSB = document.getElementById('citizenSidebarMenu');
                    if (_citizenSB) _citizenSB.style.display = 'none';
                    var _lawyerSB = document.getElementById('lawyerSidebarMenu');
                    if (_lawyerSB) _lawyerSB.style.display = 'none';
                    
                    
                    
                    if (typeof showDistrictAdminDashboard === 'function') showDistrictAdminDashboard();
                    
                } else if (userLevel === 'Organization') {
                    
                    showHome();
                    
                } else if (userLevel === 'Lawyer') {
                    document.body.classList.add('lawyer-dashboard-mode');
                    showLawyerDashboard();
                    
                } else if (userLevel === 'LC') {
                    document.body.classList.add('lawyer-dashboard-mode');
                    showLcDashboard();
                    
                } else if (isAdmin(userLevel)) {
                    document.body.classList.add('admin-dashboard-mode');
                    var _adminSidebarRestore = document.getElementById('adminSidebarMenu');
                    if (_adminSidebarRestore) {
                        _adminSidebarRestore.style.display = 'block';
                        _adminSidebarRestore.style.visibility = 'visible';
                        _adminSidebarRestore.style.opacity = '1';
                    }
                    var _citizenSidebarRestore = document.getElementById('citizenSidebarMenu');
                    if (_citizenSidebarRestore) _citizenSidebarRestore.style.display = 'none';
                    var _lawyerSidebarRestore = document.getElementById('lawyerSidebarMenu');
                    if (_lawyerSidebarRestore) _lawyerSidebarRestore.style.display = 'none';
                    var _adminNavExtrasRestore = document.getElementById('adminNavExtras');
                    if (_adminNavExtrasRestore) _adminNavExtrasRestore.style.display = 'inline-flex';
                    showAdminHome();
                    
                } else if (userLevel === 'Citizen') {
                    document.body.classList.add('citizen-dashboard-mode');
                    showHome();
                    
                } else {
                    document.body.classList.add('citizen-dashboard-mode');
                    showHome();
                }
                
                ensureSidebarVisibility(userLevel);
                renderNavbarNotifBadge();
                
                if (isAdmin(userLevel)) {
                    if (typeof startAdminPolling === 'function') {
                        startAdminPolling();
                    }
                    if (typeof loadAdminMessagesList === 'function') {
                        loadAdminMessagesList();
                    }
                }
                
                var _chatEl = document.getElementById('chatContainer');
                var _ambEl = document.getElementById('adminMessagesBtn');
                var _isAdmin = isAdmin(userLevel);
                if (_chatEl) _chatEl.style.display = _isAdmin ? 'none' : 'block';
                if (_ambEl) _ambEl.style.display = _isAdmin ? 'block' : 'none';

            }); 

        } else {
            
            console.log('[LCDJP] JWT invalid. Clearing data.');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('lcdjp_session');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            localStorage.removeItem('userDistrict');
            localStorage.removeItem('fullName');
            localStorage.removeItem('userType');
            localStorage.removeItem('isOrganization');
            localStorage.removeItem('requirePasswordChange');
            
            
            if (typeof showLoginScreen === 'function') {
                showLoginScreen();
            }
        }
    })
    .catch(function(error) {
        // A 401/403 means the token is expired or revoked: end the stale session instead of
        // treating it like a network error and leaving the user on a dashboard that cannot load data.
        if (error && (error.status === 401 || error.status === 403)) {
            console.log('[LCDJP] Session expired. Clearing stored session.');
            if (typeof _stopAllPolling === 'function') _stopAllPolling();
            if (typeof _lcdjpClearAccountState === 'function') _lcdjpClearAccountState();
            if (typeof showLoginScreen === 'function') showLoginScreen();
            return;
        }
        console.error('[LCDJP] JWT Validation error:', error);
        
        var username = localStorage.getItem('username');
        var role = localStorage.getItem('userRole');
        if (username && role) {
            console.log('[LCDJP] Network error, maintaining current session.');
        } else {
            
            if (typeof showLoginScreen === 'function') {
                showLoginScreen();
            }
        }
    });
}
function ensureSidebarVisibility(userType) {
    var sidebar = document.getElementById("mainSidebar");
    if (userType === "Organization") {
        if (sidebar) { sidebar.style.display="block"; sidebar.style.width="240px"; sidebar.style.minWidth="240px"; sidebar.style.padding="0"; sidebar.style.overflow="visible"; sidebar.style.border="none"; }
        var _ca=document.getElementById("contentArea"); if(_ca) _ca.style.padding="0";
        
        var _orgLangSel2 = document.getElementById("languageSelect");
        if (_orgLangSel2) _orgLangSel2.style.display = "none";
        return;
    }

    
    if (userType === "DISTRICT_ADMIN") {
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "240px";
            sidebar.style.minWidth = "240px";
            sidebar.style.padding = "20px 0";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
        var _daSBE = document.getElementById('daSidebarMenu');
        if (_daSBE) { _daSBE.style.display = 'block'; _daSBE.style.visibility = 'visible'; _daSBE.style.opacity = '1'; }
        var _adminSBE = document.getElementById('adminSidebarMenu');
        if (_adminSBE) _adminSBE.style.display = 'none';
        var _citizenSBE = document.getElementById('citizenSidebarMenu');
        if (_citizenSBE) _citizenSBE.style.display = 'none';
        var _lawyerSBE = document.getElementById('lawyerSidebarMenu');
        if (_lawyerSBE) _lawyerSBE.style.display = 'none';
        
        var _daLangSel = document.getElementById('languageSelect');
        if (_daLangSel) _daLangSel.style.display = 'none';
        return;
    }
    

    console.log("Ensuring sidebar visibility for:", userType);
    
    const citizenMenu = document.getElementById("citizenSidebarMenu");
    const lawyerMenu = document.getElementById("lawyerSidebarMenu");
    const lcMenu = document.getElementById("lcSidebarMenu");

    
    var _defaultLangSel = document.getElementById("languageSelect");
    if (_defaultLangSel) _defaultLangSel.style.display = (userType === "Citizen") ? "" : "none";

    if (userType === "Citizen" || userType === "Lawyer" || userType === "LC") {
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "280px";
            sidebar.style.minWidth = "280px";
            sidebar.style.padding = "20px";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
    }
    
    if (userType === "Citizen") {
        if (citizenMenu) {
            citizenMenu.style.display = "block";
        }
        if (lawyerMenu) {
            lawyerMenu.style.display = "none";
        }
        if (lcMenu) {
            lcMenu.style.display = "none";
        }
    }

    if (userType === "LC") {
        if (lcMenu) {
            lcMenu.style.display = "block";
        }
        if (citizenMenu) {
            citizenMenu.style.display = "none";
        }
        if (lawyerMenu) {
            lawyerMenu.style.display = "none";
        }
    }
    
    if (userType === "Lawyer") {
        if (lawyerMenu) {
            lawyerMenu.style.display = "block";
        }
        if (citizenMenu) {
            citizenMenu.style.display = "none";
        }
        if (lcMenu) {
            lcMenu.style.display = "none";
        }
    }
    
    console.log("Sidebar visibility ensured for:", userType);
}

function setupDashboardMenuVisibility(role) {
    if (typeof _lcdjpEnforceAdminNavRestrictions === 'function') _lcdjpEnforceAdminNavRestrictions();

    
    
    
    
    
    
    

    var _citizenNavExtras0 = document.getElementById("citizenNavExtras");
    if (_citizenNavExtras0) _citizenNavExtras0.style.display = (role === "Citizen" && window.innerWidth >= 768) ? "inline-flex" : "none";

    var _lawyerNavExtrasTop = document.getElementById("lawyerNavExtras");
    if (_lawyerNavExtrasTop) _lawyerNavExtrasTop.style.display = (role === "Lawyer") ? "inline-flex" : "none";

    
    
    
    var _adminNavExtrasTop = document.getElementById("adminNavExtras");
    if (_adminNavExtrasTop) _adminNavExtrasTop.style.display = (isAdmin(role) && role !== "DISTRICT_ADMIN") ? "inline-flex" : "none";

    console.log("Setting up dashboard menu for role:", role);

    const citizenMenu = document.getElementById("citizenSidebarMenu");
    const lawyerMenu = document.getElementById("lawyerSidebarMenu");
    const adminMenu = document.getElementById("adminSidebarMenu");
const citizenLinks = document.getElementById("citizenQuickLinks");
    const citizenGrid = document.getElementById("citizenQuickGrid");
    const notifBtn = document.getElementById("navNotifBtn");
    const sidebar = document.getElementById("mainSidebar");
    const footer = document.getElementById("mainFooter");
    const homeLink = document.getElementById("navHomeLink");
    const resourcesLink = document.getElementById("navResourcesLink");
    const contactLink = document.getElementById("navContactLink");
    const languageSelect = document.getElementById("languageSelect");
    const chatContainer = document.getElementById("chatContainer");
    const adminMsgBtn = document.getElementById('adminMessagesBtn');

    if (citizenMenu) citizenMenu.style.display = "none";
    if (lawyerMenu) lawyerMenu.style.display = "none";
    if (adminMenu) adminMenu.style.display = "none";
    var _adminNavExtrasD = document.getElementById("adminNavExtras"); if (_adminNavExtrasD) _adminNavExtrasD.style.display = "none";  
    if (citizenLinks) citizenLinks.style.display = "none";
    if (citizenGrid) citizenGrid.style.display = "none";
    if (notifBtn) notifBtn.style.display = "none";

    
    if (languageSelect) languageSelect.style.display = (role === "Citizen") ? "" : "none";

    if (footer) {
        if (role === "Citizen") {
            footer.style.display = "block";
            footer.style.visibility = "visible";
            footer.style.opacity = "1";
            footer.style.height = "auto";
            footer.style.padding = "30px 20px 20px";
            footer.style.margin = "0 15px 0 15px";
            footer.style.overflow = "visible";
            footer.style.border = "1px solid rgba(26, 64, 128, 0.1)";
        } else {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
    }

    var _isAdminRole = (role === "Admin" || role === "System Administrator" || role === "SYSTEM_ADMIN");
    
    
    
    if (chatContainer) {
        chatContainer.style.display = (_isAdminRole || role === "Lawyer") ? "none" : "block";
    }
    
    if (adminMsgBtn) {
        adminMsgBtn.style.display = _isAdminRole ? "block" : "none";
    }

    
    if (role === "Citizen") {
        if (citizenMenu) {
            citizenMenu.style.display = "block";
            citizenMenu.style.visibility = "visible";
            citizenMenu.style.opacity = "1";
        }
        if (citizenLinks) {
            citizenLinks.style.display = "block";
            citizenLinks.style.visibility = "visible";
            citizenLinks.style.opacity = "1";
        }
        if (citizenGrid) {
            citizenGrid.style.display = "grid";
            citizenGrid.style.visibility = "visible";
            citizenGrid.style.opacity = "1";
        }
        if (notifBtn) {
            notifBtn.style.display = "inline-block";
            notifBtn.style.visibility = "visible";
            notifBtn.style.opacity = "1";
            notifBtn.innerHTML = 'Notifications <span id="notifCount" style="display:none; background:#dc3545; color:white; border-radius:50%; padding:2px 8px; font-size:11px; font-weight:bold; margin-left:5px; min-width:18px; text-align:center;"></span>';
        }
        if (lawyerMenu) {
            lawyerMenu.style.display = "none";
        }
        if (adminMenu) {
            adminMenu.style.display = "none";
        }
        
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "280px";
            sidebar.style.minWidth = "280px";
            sidebar.style.padding = "20px";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
    }
    else if (role === "Lawyer") {
        if (lawyerMenu) {
            lawyerMenu.style.display = "block";
            lawyerMenu.style.visibility = "visible";
            lawyerMenu.style.opacity = "1";
        }
        if (citizenMenu) {
            citizenMenu.style.display = "none";
        }
        if (adminMenu) {
            adminMenu.style.display = "none";
        }
        if (resourcesLink) {
            resourcesLink.style.display = "none";
        }
        if (notifBtn) {
            notifBtn.style.display = "inline-block";
            notifBtn.style.visibility = "visible";
            notifBtn.style.opacity = "1";
            notifBtn.innerHTML = 'Notifications <span id="notifCount" style="display:none; background:#dc3545; color:white; border-radius:50%; padding:2px 8px; font-size:11px; font-weight:bold; margin-left:5px; min-width:18px; text-align:center;"></span>';
        }
        
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "280px";
            sidebar.style.minWidth = "280px";
            sidebar.style.padding = "20px";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
        
        if (footer) {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
    }
    else if (role === "Admin" || role === "System Administrator" || role === "SYSTEM_ADMIN") {
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "280px";
            sidebar.style.minWidth = "280px";
            sidebar.style.padding = "20px";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
        
        if (adminMenu) {
            adminMenu.style.display = "block";
            adminMenu.style.visibility = "visible";
            adminMenu.style.opacity = "1";
        }
        var _adminNavExtrasC = document.getElementById("adminNavExtras"); if (_adminNavExtrasC) _adminNavExtrasC.style.display = "inline-flex";
        
        if (citizenMenu) {
            citizenMenu.style.display = "none";
        }
        if (lawyerMenu) {
            lawyerMenu.style.display = "none";
        }
        
        if (homeLink) {
            homeLink.style.display = "none";
        }
        if (resourcesLink) {
            resourcesLink.style.display = "none";
        }
        if (contactLink) {
            contactLink.style.display = "none";
        }
        if (languageSelect) {
            languageSelect.style.display = "none";
        }
        if (adminMsgBtn) {
            adminMsgBtn.style.display = "block";
        }
        if (chatContainer) {
            chatContainer.style.display = "none";
        }
        if (footer) {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
        if (notifBtn) {
            notifBtn.style.display = "inline-block";
            notifBtn.style.visibility = "visible";
            notifBtn.style.opacity = "1";
            notifBtn.innerHTML = '<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="nav-text-label">Notifications</span><span id="notifCount" style="display:none; background:#dc3545; color:white; border-radius:50%; padding:2px 8px; font-size:11px; font-weight:bold; margin-left:5px; min-width:18px; text-align:center;"></span>';
        }
    }
    
    
    
    
    
    
    
    
    
    
    
    
    if (typeof _lcdjpEnforceAdminNavRestrictions === 'function') _lcdjpEnforceAdminNavRestrictions();

    console.log("Dashboard menu setup complete for role:", role);
}


function enableManualInput(fieldId) {
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
    
    const label = getFieldLabel(fieldId);
    const containerId = getContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container not found for ${fieldId} (${containerId})`);
        return;
    }
    
    const inputHtml = `
        <div id="${fieldId}_manual_container" style="margin-top: 8px;">
            <input type="text" id="${fieldId}_manual" class="input-box" 
                   placeholder="Type ${label} name..." 
                   style="width:100%; padding:12px; border:1px solid #1a4080; border-radius:8px; font-size:16px; margin-top:5px; background: #f0f5ff;"
                   onchange="handleManualInputChange(${escapeHtml(JSON.stringify(String(fieldId)))})"
                   onkeyup="handleManualInputKeyUp(event, ${escapeHtml(JSON.stringify(String(fieldId)))})">
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                 Manual entry mode
                <span onclick="switchToSelect(${escapeHtml(JSON.stringify(String(fieldId)))})" style="color: #1a4080; cursor: pointer; margin-left: 10px;">← Switch back to dropdown</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', inputHtml);
    const newInput = document.getElementById(`${fieldId}_manual`);
    if (newInput) {
        newInput.focus();
    }
}

function handleManualInputKeyUp(event, fieldId) {
    if (event.key === 'Enter') {
        handleManualInputChange(fieldId);
    }
}

function handleManualInputChange(fieldId) {
    const manualInput = document.getElementById(`${fieldId}_manual`);
    if (!manualInput) return;
    
    const value = manualInput.value.trim();
    if (!value) {
        manualInput.style.borderColor = '#ff6b6b';
        manualInput.style.background = '#fff5f5';
        return;
    }
    
    manualInput.style.borderColor = '#1a4080';
    manualInput.style.background = '#f0f5ff';
    
    switch(fieldId) {
        case 'county':
            const countySelect = document.getElementById('county');
            if (countySelect) {
                let optionExists = false;
                for (let i = 0; i < countySelect.options.length; i++) {
                    if (countySelect.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    countySelect.innerHTML += `<option value="${escapeHtml(value)}" selected>${escapeHtml(value)}</option>`;
                } else {
                    countySelect.value = value;
                }
            }
            onCountyChange();
            break;
            
        case 'subCounty':
            const subCountySelect = document.getElementById('subCounty');
            if (subCountySelect) {
                let optionExists = false;
                for (let i = 0; i < subCountySelect.options.length; i++) {
                    if (subCountySelect.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    subCountySelect.innerHTML += `<option value="${escapeHtml(value)}" selected>${escapeHtml(value)}</option>`;
                } else {
                    subCountySelect.value = value;
                }
            }
            onSubCountyChange();
            break;
            
        case 'parishLocation':
            const parishSelect = document.getElementById('parishLocation');
            if (parishSelect) {
                let optionExists = false;
                for (let i = 0; i < parishSelect.options.length; i++) {
                    if (parishSelect.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    parishSelect.innerHTML += `<option value="${escapeHtml(value)}" selected>${escapeHtml(value)}</option>`;
                } else {
                    parishSelect.value = value;
                }
                parishSelect.dispatchEvent(new Event('change'));
            }
            onParishChange();
            break;
            
        case 'villageLocation':
            const villageSelect = document.getElementById('villageLocation');
            if (villageSelect) {
                let optionExists = false;
                for (let i = 0; i < villageSelect.options.length; i++) {
                    if (villageSelect.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    villageSelect.innerHTML += `<option value="${escapeHtml(value)}" selected>${escapeHtml(value)}</option>`;
                } else {
                    villageSelect.value = value;
                }
            }
            break;
    }
}

function showManualInput(fieldId, label, parentValue) {
    const containerId = getContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container not found for ${fieldId} (${containerId})`);
        return;
    }
    
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
                   onchange="handleManualInputChange(${escapeHtml(JSON.stringify(String(fieldId)))})"
                   onkeyup="handleManualInputKeyUp(event, ${escapeHtml(JSON.stringify(String(fieldId)))})">
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                 Manual entry mode - Press Enter or click away to confirm
                <span onclick="switchToSelect(${escapeHtml(JSON.stringify(String(fieldId)))})" style="color: #1a4080; cursor: pointer; margin-left: 10px;">← Switch to dropdown</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', inputHtml);
    
    setTimeout(() => {
        const input = document.getElementById(`${fieldId}_manual`);
        if (input) input.focus();
    }, 100);
}

function switchToSelect(fieldId) {
    removeManualInput(fieldId);
    
    const selectElement = document.getElementById(fieldId);
    if (selectElement) {
        selectElement.style.display = "block";
        selectElement.value = "";
    }
    
    showManualEntryOption(fieldId);
}

function removeManualInput(fieldId) {
    const manualContainer = document.getElementById(`${fieldId}_manual_container`);
    if (manualContainer) manualContainer.remove();
    
    const manualOption = document.getElementById(`${fieldId}_manual_option`);
    if (manualOption) manualOption.remove();
}





function showLoginScreen() {
    
    
    console.log('[LCDJP] No active session, showing login page');

    currentUserLevel = null;

    if (typeof _stopAllPolling === 'function') _stopAllPolling();
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    var dashboardPage = document.getElementById('dashboardPage');
    if (dashboardPage) dashboardPage.style.display = 'none';

    var homePage = document.getElementById('homePage');
    if (homePage) homePage.style.display = 'none';

    document.body.classList.remove(
        'lawyer-dashboard-mode', 'admin-dashboard-mode',
        'citizen-dashboard-mode', 'admin-map-active'
    );

    var sidebar = document.getElementById('mainSidebar');
    if (sidebar) sidebar.style.display = 'none';

    var footer = document.getElementById('mainFooter');
    if (footer) footer.style.display = 'none';

    _lcdjpHideLoginOtpPage();

    var loginPage = document.getElementById('loginPage');
    if (loginPage) {
        loginPage.style.display = 'flex';
        loginPage.style.visibility = 'visible';
        loginPage.style.opacity = '1';
    }

    var registerPage = document.getElementById('registerPage');
    if (registerPage) registerPage.style.display = 'none';

    var appLoader = document.getElementById('appLoader');
    if (appLoader) {
        if (typeof hideAppLoader === 'function') {
            hideAppLoader();
        } else {
            appLoader.style.opacity = '0';
            setTimeout(function() {
                appLoader.style.display = 'none';
            }, 300);
        }
    }
}

function _lcdjpActionNeedsVerification(actionKey) {
    return [
        'reportCase', 'trackCase', 'myCases', 'documents', 'uploadDoc', 'docCategories',
        'sharedDocs', 'disputeFamily', 'disputeLand', 'disputeBusiness',
        'disputeCommunity', 'disputeInheritance', 'disputeBoundary',
        'disputeMarriage', 'disputeChildCustody', 'disputeDebt', 'disputeOthers'
    ].indexOf(actionKey) !== -1;
}

function _lcdjpHasApprovedVerification() {
    var values = [
        localStorage.getItem('lcdjp_verif_status'),
        sessionStorage.getItem('lcdjp_verif_status'),
        localStorage.getItem('verificationStatus'),
        sessionStorage.getItem('verificationStatus'),
        localStorage.getItem('approvalStatus'),
        sessionStorage.getItem('approvalStatus'),
        localStorage.getItem('lcdjp_approval_status'),
        sessionStorage.getItem('lcdjp_approval_status')
    ];
    return values.some(function(value) {
        var status = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
        return status === 'APPROVED' || status === 'VERIFIED' ||
            status === 'ACCOUNT_VERIFIED' || status === 'TRUE';
    });
}

function requireAuth(actionKey) {
    if (_lcdjpActionNeedsVerification(actionKey) && typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('This feature is not available at this time.');
        }
        return;
    }
    if (_lcdjpActionNeedsVerification(actionKey) && !_lcdjpHasApprovedVerification()) {
        if (typeof showAccountStatusPage === 'function') {
            showAccountStatusPage();
        } else if (typeof showIdVerifyPage === 'function') {
            showIdVerifyPage();
        }
        return;
    }
    _execProtectedAction(actionKey);
}
