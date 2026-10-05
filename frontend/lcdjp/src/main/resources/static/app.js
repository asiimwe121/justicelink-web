(function() {
    const _origFetch = window.fetch;
    window.LCDJP_AUTH_READY = false;
    window.LCDJP_AUTH_VALIDATED = false;

    
    const _PUBLIC_PATHS = [
        '/api/auth/login',
        '/api/auth/login/verify-otp',
        '/api/auth/login/resend-otp',
        '/api/auth/register',
        '/api/auth/register-pending',
        '/api/auth/send-otp',
        '/api/auth/verify-otp',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        
        
        
        
        
        
        '/api/auth/change-password',
        '/api/auth/change-password/verify-otp',
        '/api/auth/change-password/resend-otp',
        '/api/health',
        '/api/map/config',
        '/api/map/reverse-geocode',
        '/api/map/route',
        '/api/legal-orgs/all'  
    ];
    const _PUBLIC_PREFIXES = [
        '/api/legal-alerts/',
        '/api/ai/'
    ];

    
    window._lcdjpPollingIntervals = {
        notifications: null,
        refreshStats: null,
        chat: null,
        adminPolling: null,
        messagePolling: null
    };

    function _getRequestPath(url) {
        var raw = typeof url === 'string' ? url : (url && url.url ? url.url : '');
        try { return new URL(raw, window.location.href).pathname; } catch (e) { return raw; }
    }





async function authFetch(url, options) {
    options = options || {};
    delete options.credentials; 
    
    var headers = Object.assign({}, options.headers || {});
    
    
    if (typeof _checkAuthAndToken === 'function' && !_checkAuthAndToken()) {
        throw new Error('Authentication required');
    }
    
    var token = _activeAuthToken ? _activeAuthToken() : _getAuthToken();
    if (!token) throw new Error('Authentication required');
    
    headers['Authorization'] = 'Bearer ' + token;
    
    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    
    options = Object.assign({}, options, { headers: headers });
    
    var resp = await fetch(url, options);
    return resp;
}


window.authFetch = authFetch;

    function _isPublicPath(url) {
        var path = _getRequestPath(url);
        return _PUBLIC_PATHS.some(function(p) {
            return path === p || path.indexOf(p + '?') === 0;
        }) || _PUBLIC_PREFIXES.some(function(p) {
            return path.indexOf(p) === 0;
        });
    }

    function _isProtectedApiPath(url) {
        return _getRequestPath(url).indexOf('/api/') === 0 && !_isPublicPath(url);
    }

    function _isBackgroundApiPath(url) {
        var path = _getRequestPath(url);
        return path.indexOf('/api/auth/notifications') === 0 ||
            path.indexOf('/api/notifications') === 0 ||
            path.indexOf('/api/cases') === 0 ||
            path.indexOf('/api/users') === 0 ||
            path.indexOf('/api/auth/users/') === 0 ||
            path.indexOf('/api/messages') === 0 ||
            path.indexOf('/api/chat') === 0 ||
            path.indexOf('/api/admin/') === 0 ||
            path.indexOf('/api/legal-alerts') === 0 ||
            path.indexOf('/api/legal-orgs') === 0 ||
            path.indexOf('/api/ai/') === 0 ||
            path.indexOf('/verification-status') !== -1 ||
            path.indexOf('/api/district-admin/') === 0;
    }

    
    
    
    
    
    
    
    
    
    function _isOnLoginPage() {
        var lp = document.getElementById('loginPage');
        var dp = document.getElementById('dashboardPage');
        if (!lp && !dp) return false; 
        var lpHidden = lp ? (getComputedStyle(lp).display === 'none') : true;
        var dpHidden = dp ? (getComputedStyle(dp).display === 'none') : true;
        return !lpHidden && dpHidden;
    }

    function _usesRegistrationSession(url) {
        var u = typeof url === 'string' ? url : (url && url.url ? url.url : '');
        return u.includes('/api/auth/register-pending')
            || u.includes('/api/auth/send-otp')
            || u.includes('/api/auth/verify-otp');
    }

    function _authRedirect() {
        _stopAllPolling();
        if (typeof window._lcdjpClearAccountState === 'function') {
            window._lcdjpClearAccountState();
        } else {
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('lcdjp_username');
            localStorage.removeItem('lcdjp_userlevel');
            localStorage.removeItem('lcdjp_district');
            localStorage.removeItem('lcdjp_fullname');
            sessionStorage.removeItem('jwtToken');
            sessionStorage.removeItem('lcdjp_username');
            sessionStorage.removeItem('lcdjp_userlevel');
            sessionStorage.removeItem('lcdjp_district');
            sessionStorage.removeItem('lcdjp_fullname');
        }
        
        
        window.LCDJP_AUTH_READY = false;
        window.LCDJP_AUTH_VALIDATED = false;
        
        var lp = document.getElementById('loginPage');
        var dp = document.getElementById('dashboardPage');
        if (dp) dp.style.display = 'none';
        if (lp) lp.style.display = 'flex';
        document.body.className = '';
        window.scrollTo(0, 0);
    }

    function _stopAllPolling() {
        Object.keys(window._lcdjpPollingIntervals).forEach(function(key) {
            if (window._lcdjpPollingIntervals[key]) {
                clearInterval(window._lcdjpPollingIntervals[key]);
                window._lcdjpPollingIntervals[key] = null;
            }
        });
        [
            'refreshStatsInterval',
            'chatInterval',
            'notifInterval',
            'notificationInterval',
            'adminPollingInterval',
            'messagePollingInterval'
        ].forEach(function(name) {
            if (window[name]) {
                clearInterval(window[name]);
                window[name] = null;
            }
        });
        if (typeof window.cancelAnimationFrame === 'function' && window._lcdjpPollingFrames) {
            window._lcdjpPollingFrames.forEach(function(frame) {
                window.cancelAnimationFrame(frame);
            });
            window._lcdjpPollingFrames = [];
        }
        window.dispatchEvent(new CustomEvent('lcdjp:auth-expired'));
    }
    window.stopLcdjpAuthPolling = _stopAllPolling;
function _activeAuthToken() {
    try {
        var token = typeof getAuthToken === 'function'
            ? getAuthToken()
            : localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
        if (!token || token === 'null' || token === 'undefined') return null;
        return String(token).trim() || null;
    } catch (e) {
        return null;
    }
}
    window.getLcdjpActiveToken = _activeAuthToken;

    function _isTokenValid() {
    var token = _activeAuthToken();
    if (!token) return false;
    
    try {
        var payload = _decodeJwtPayload(token);
        if (!payload) return false;
        
        if (payload.exp) {
            var now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        }
        return true;
    } catch (e) {
        return false;
    }
}
function _refreshToken() {
    var oldToken = _activeAuthToken();
    if (!oldToken) return Promise.reject('No token');
    
    return fetch(API_BASE_URL + '/api/auth/refresh', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + oldToken,
            'Content-Type': 'application/json'
        },
        suppressAuthRedirect: true
    })
    .then(function(response) {
        if (!response.ok) throw new Error('Refresh failed');
        return response.json();
    })
    .then(function(data) {
        if (data.token) {
            localStorage.setItem('jwtToken', data.token);
            sessionStorage.setItem('jwtToken', data.token);
            return data.token;
        }
        throw new Error('No token in refresh response');
    });
}
    window.isTokenValid = _isTokenValid;

    function _decodeJwtPayload(token) {
        if (!token) return null;
        try {
            var parts = token.split('.');
            if (parts.length !== 3) return null;
            var encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (encoded.length % 4) encoded += '=';
            return JSON.parse(atob(encoded));
        } catch (e) {
            return null;
        }
    }

    window.getLcdjpActiveUsername = function() {
        var payload = _decodeJwtPayload(_activeAuthToken());
        if (payload && (payload.sub || payload.username)) {
            return payload.sub || payload.username;
        }
        return localStorage.getItem('lcdjp_username') || 
               localStorage.getItem('username') || '';
    };

    window.getAuthHeaders = function() {
        var token = _activeAuthToken();
        if (!token) return {};
        return {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        };
    };

    function _normalizeApiUrl(input) {
        var isRequest = typeof Request !== 'undefined' && input instanceof Request;
        var rawUrl;

        if (isRequest) {
            rawUrl = input.url;
        } else if (typeof input === 'string' || (typeof URL !== 'undefined' && input instanceof URL)) {
            rawUrl = String(input);
        } else {
            return input;
        }

        try {
            var parsed = new URL(rawUrl, window.location.href);
            var isApiPath = parsed.pathname === '/api'
                || parsed.pathname.indexOf('/api/') === 0;

            var isLocalHost = parsed.hostname === 'localhost' ||
                parsed.hostname === '127.0.0.1' ||
                parsed.hostname === '0.0.0.0';
            if (isApiPath && isLocalHost &&
                parsed.origin !== window.location.origin) {
                var currentOrigin = new URL(window.location.href);
                parsed.protocol = currentOrigin.protocol;
                parsed.host = currentOrigin.host;
            }

            if (isApiPath && isRequest) return new Request(parsed.toString(), input);
            if (isApiPath) return parsed.toString();
        } catch (e) {
            console.warn('Could not normalize API URL:', rawUrl, e);
        }

        return input;
    }

    
    
    window.fetch = function(url, options) {
        var originalUrl = url;
        
        options = Object.assign({}, options || {});
        var normalizedUrl = _normalizeApiUrl(originalUrl);
        
        
        
        
        
        var suppressAuthRedirect = options.suppressAuthRedirect === true ||
            _isBackgroundApiPath(normalizedUrl);
        delete options.suppressAuthRedirect;
        
        if (_usesRegistrationSession(normalizedUrl)) {
            options.credentials = 'include';
        } else {
            delete options.credentials;
        }

       if (_isProtectedApiPath(normalizedUrl)) {
    var token = _activeAuthToken();
    if (token && _isTokenValid()) {
        options.headers = Object.assign({}, options.headers || {}, {
            'Authorization': 'Bearer ' + token
        });
    } else {
        var _headers = Object.assign({}, options.headers || {});
        delete _headers['Authorization'];
        delete _headers['authorization'];
        options.headers = _headers;
    }
    
    if (options.body && typeof options.body === 'string') {
        options.headers = Object.assign({}, options.headers || {}, {
            'Content-Type': 'application/json'
        });
    }
}

      return _origFetch(normalizedUrl, options).then(function(response) {
    
    
    if (response.status === 401 && _isProtectedApiPath(normalizedUrl) && !suppressAuthRedirect) {
        _stopAllPolling();
        _authRedirect();
    } else if (response.status === 403 && _isProtectedApiPath(normalizedUrl) && !suppressAuthRedirect) {
        var forbiddenMessage = 'You do not have permission to access this resource.';
        try {
            response.clone().json().then(function(body) {
                if (body && body.error) forbiddenMessage = body.error;
                if (typeof window.showToast === 'function') {
                    window.showToast(forbiddenMessage);
                }
                window.dispatchEvent(new CustomEvent('lcdjp:forbidden', {
                    detail: { url: String(normalizedUrl), message: forbiddenMessage }
                }));
            }).catch(function() {
                if (typeof window.showToast === 'function') {
                    window.showToast(forbiddenMessage);
                }
            });
        } catch (e) {
            if (typeof window.showToast === 'function') {
                window.showToast(forbiddenMessage);
            }
        }
    }
    return response;
});
    };

})();