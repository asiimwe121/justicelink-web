




function _lcdjpHideVerifBanner() {
    var d = document.getElementById('desktopVerifBanner');
    var m = document.getElementById('mobileVerifBanner');
    if (d) d.style.display = 'none';
    if (m) m.style.display = 'none';
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
            var bannerContent = '<div style="background:#eef3ff;border:1px solid #c9d8f5;border-radius:8px;padding:12px 16px;margin:10px 0;color:#274680;font-size:14px;">'
                + '&#8505;&#65039; Your earlier verification submission is still on file and pending review.'
                + '</div>';
            if (desktopBanner) { desktopBanner.innerHTML = bannerContent; desktopBanner.style.display = 'block'; desktopBanner.style.visibility = 'visible'; }
            if (mobileBanner)  { mobileBanner.innerHTML = bannerContent; mobileBanner.style.display = 'block'; mobileBanner.style.visibility = 'visible'; }
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
        var reason = sessionStorage.getItem('lcdjp_verif_reject_reason') || localStorage.getItem('lcdjp_verif_reject_reason') || 'No reason provided';
        message = '❌ Your verification was rejected. Reason: ' + reason;
        buttonText = 'Resubmit';
    } else if (status === 'not-verified' || status === 'NOT_VERIFIED') {
        message = '⚠️ Please verify your account to access all features.';
        buttonText = 'Verify Now';
    } else {
        message = '⚠️ Please verify your account to access all features.';
        buttonText = 'Verify Now';
    }
    
    var isPending = (status === 'pending' || status === 'PENDING');
    var btnStyle = isPending
        ? 'background:#e9ecef;color:#6c757d;border:1px solid #ced4da;border-radius:6px;padding:6px 16px;font-weight:600;white-space:nowrap;cursor:default;'
        : 'background:#1a4080;color:white;border:none;border-radius:6px;padding:6px 16px;cursor:pointer;font-weight:600;white-space:nowrap;';

    var bannerContent = '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 16px;margin:10px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">'
        + '<span style="color:#856404;font-size:14px;">' + escapeHtml(message) + '</span>'
        + (showButton ? '<button onclick="' + (isPending ? 'return false;' : '_lcdjpStartVerification()') + '" style="' + btnStyle + '">' + escapeHtml(buttonText) + '</button>' : '')
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
    
    var token = (typeof getAuthToken === 'function' ? getAuthToken() : null) || '';
    
    
    if (!token || token === 'null' || token === 'undefined' || token === '') {
        _lcdjpHideVerifBanner();
        return;
    }
    
    var role = localStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('lcdjp_userlevel') || '';
    var username = localStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_username') || '';
    
    
    if (!username || username === 'null' || username === 'undefined' || username === '') {
        _lcdjpHideVerifBanner(); 
        return;
    }
    
    
    if (!role || !role.toLowerCase().includes('citizen')) {
        _lcdjpHideVerifBanner(); 
        return;
    }

    
    var storedStatus = sessionStorage.getItem('lcdjp_verif_status') || localStorage.getItem('lcdjp_verif_status') || 'not-verified';
    _lcdjpRenderVerifBanner(storedStatus);

    
    var endpoint = (typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.verificationStatus)
        ? API_ENDPOINTS.verificationStatus(username)
        : API_BASE_URL + '/api/auth/users/' + encodeURIComponent(username) + '/verification-status';
    
    
    fetch(endpoint, {
        headers: { 
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        suppressAuthRedirect: true  
    })
    .then(function(r) { 
        if (!r.ok) {
            
            if (r.status === 401) {
                console.log('[LCDJP] Verification status skipped - auth required');
                return null;
            }
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
        
        
        
        
        if (storedStatus === 'pending' && normalized === 'not-verified') {
            return;
        }
        sessionStorage.setItem('lcdjp_verif_status', normalized);
        localStorage.setItem('lcdjp_verif_status', normalized);
        var reason = data.rejectionReason || data.rejection_reason || '';
        if (reason) {
            sessionStorage.setItem('lcdjp_verif_reject_reason', reason);
            localStorage.setItem('lcdjp_verif_reject_reason', reason);
        }
        _lcdjpRenderVerifBanner(normalized);
    })
    .catch(function(err) {
        
        console.log('[LCDJP] Verification status check failed:', err.message);
        
        _lcdjpRenderVerifBanner(storedStatus);
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
        var token = (typeof getAuthToken === 'function' ? getAuthToken() : null) || '';
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
      +     '<div class="nc-title">' + escapeHtml(name) + '</div>'
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

/* ---- Support chat voice messages (mic button + Stop button in #chatWindow) ---- */
(function () {
  var rec = null, chunks = [], stream = null, timerId = null, limitId = null, startedAt = 0, cancelled = false;
  var say = function (m) { if (typeof showToast === 'function') showToast(m); else alert(m); };

  function setUi(on) {
    var btn = document.getElementById('voiceRecordBtn');
    var bar = document.getElementById('voiceRecordingStatus');
    var timer = document.getElementById('voiceTimer');
    if (btn) { btn.style.background = on ? '#dc3545' : 'transparent'; btn.style.color = on ? '#fff' : '#999'; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    if (bar) bar.style.display = on ? 'block' : 'none';
    if (timer && !on) timer.textContent = ' Recording... 0s';
  }

  function cleanup() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (limitId) { clearTimeout(limitId); limitId = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    rec = null;
    setUi(false);
  }

  function sendVoice(blob, seconds) {
    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!username) { say('Please sign in to send a message.'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var payload = {
        fromName: sessionStorage.getItem('lcdjp_fullname') || username,
        fromRole: sessionStorage.getItem('lcdjp_userlevel') || 'Citizen',
        message: 'Voice message',
        type: 'voice',
        audioData: reader.result,
        duration: Math.min(seconds, 10000),
        sentTo: 'admin',
        timestamp: new Date().toISOString(),
        isRead: false,
        delivered: false
      };
      fetch(API_ENDPOINTS.chatMessages, {
        method: 'POST',
        headers: (typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      }).then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        if (typeof window._loadSupportChatHistory === 'function') window._loadSupportChatHistory();
      }).catch(function (err) {
        console.error('Error sending voice message:', err);
        say('Voice message could not be sent. Please try again.');
      });
    };
    reader.readAsDataURL(blob);
  }

  window.stopVoiceRecording = function () {
    if (rec && rec.state !== 'inactive') rec.stop(); else cleanup();
  };

  window.toggleVoiceRecording = function () {
    if (rec && rec.state === 'recording') { window.stopVoiceRecording(); return; }
    if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      say('Voice messages are not supported in this browser.');
      return;
    }
    if (!window.isSecureContext) { say('Voice recording needs a secure (https) connection.'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      stream = s; chunks = []; cancelled = false;
      rec = new MediaRecorder(s);
      rec.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = function () {
        var seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        var type = (rec && rec.mimeType) || 'audio/webm';
        var blob = new Blob(chunks, { type: type });
        var empty = chunks.length === 0;
        cleanup();
        if (empty) { say('No audio recorded. Please try again.'); return; }
        sendVoice(blob, seconds);
      };
      startedAt = Date.now();
      rec.start(250);
      setUi(true);
      timerId = setInterval(function () {
        var t = document.getElementById('voiceTimer');
        if (t) t.textContent = ' Recording... ' + Math.round((Date.now() - startedAt) / 1000) + 's';
      }, 1000);
      limitId = setTimeout(function () { window.stopVoiceRecording(); say('Recording stopped (60 second limit).'); }, 60000);
    }).catch(function (err) {
      cleanup();
      if (err && err.name === 'NotAllowedError') say('Please allow microphone access to record a voice message.');
      else if (err && err.name === 'NotFoundError') say('No microphone found.');
      else say('Could not access the microphone.');
    });
  };

  // Closing the chat window while recording discards the take.
  var _origToggle = window.toggleChat;
  if (typeof _origToggle === 'function') {
    window.toggleChat = function () {
      if (rec && rec.state === 'recording') { cancelled = true; chunks = []; rec.onstop = function () { cleanup(); }; rec.stop(); }
      return _origToggle.apply(this, arguments);
    };
  }
})();

/* Close button (×) on the admin conversation modal. */
window.closeAdminConversation = function () {
  var modal = document.getElementById('adminConversationModal');
  if (modal) modal.style.display = 'none';
  window._adminActiveConversationKey = null;
};
