





function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;

function _lcdjpSensitiveCaseAccessAllowed() {
    var role = String(
        sessionStorage.getItem('lcdjp_userlevel') ||
        localStorage.getItem('userRole') ||
        ''
    ).trim().toUpperCase();
    var status = String(
        sessionStorage.getItem('lcdjp_verif_status') ||
        localStorage.getItem('verificationStatus') ||
        ''
    ).trim().toUpperCase();
    var isAdministrator = role === 'ADMIN' || role === 'SYSTEM_ADMIN' ||
        role === 'SYSTEM_ADMINISTRATOR' || role === 'DISTRICT_ADMIN';
    var isLawyer = role === 'LAWYER';
    return isAdministrator || isLawyer || status === 'APPROVED' || status === 'VERIFIED';
}

window._lcdjpSensitiveCaseAccessAllowed = _lcdjpSensitiveCaseAccessAllowed;

function _lcdjpHasUsableToken() {
    var token = (typeof getLcdjpActiveToken === 'function')
        ? getLcdjpActiveToken()
        : (localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken') || '');
    if (!token) return false;
    try {
        var parts = token.split('.');
        if (parts.length !== 3) return false;
        var encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (encoded.length % 4) encoded += '=';
        var payload = JSON.parse(atob(encoded));
        if (payload.exp && Number(payload.exp) * 1000 <= Date.now()) return false;
        return !!(payload.sub || payload.username);
    } catch (e) {
        return false;
    }
}

window._lcdjpHasUsableToken = _lcdjpHasUsableToken;






function _lcdjpProtectedDataAccessAllowed() {
    return _lcdjpHasUsableToken() &&
        typeof window._lcdjpSensitiveCaseAccessAllowed === 'function' &&
        window._lcdjpSensitiveCaseAccessAllowed() === true;
}

window._lcdjpProtectedDataAccessAllowed = _lcdjpProtectedDataAccessAllowed;

        
        
        
        

        function getCaseReference(caseData) {
            if (!caseData || typeof caseData !== 'object') return null;
            
            var ref = caseData.caseReference || caseData.case_reference || caseData.caseNumber || (caseData.id ? String(caseData.id) : null);
            if (ref == null) return null;
            ref = String(ref).trim();
            return ref && !/^(n\/a|null|undefined|none)$/i.test(ref) ? ref : null;
        }

        
        
        function getCaseIdentifier(caseData) {
            return getCaseReference(caseData);
        }

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        function getNotificationCaseReference(notif) {
            if (!notif || typeof notif !== 'object') return null;

            
            var structured = notif.caseId || notif.case_id ||
                notif.caseReference || notif.case_reference || null;
            if (structured) {
                var s = String(structured).trim();
                if (s && !/^(n\/a|null|undefined|none)$/i.test(s)) return s;
            }

            
            var text = notif.message || notif.message_text || '';
            var match = String(text).match(/\b(LCDJP-[0-9]{6,}-[0-9]{3,}-[0-9]{3,}|CASE-[A-Z0-9]{6,})\b/i);
            return match ? match[1] : null;
        }











function determineLawyerSpecialization(caseType) {
    const specMap = {
        'Land Matter': 'Land & Property Lawyer',
        'Boundary Dispute': 'Land & Property Lawyer',
        'Family Dispute': 'Family Lawyer',
        'Marriage Dispute': 'Family Lawyer',
        'Child Custody': 'Family Lawyer',
        'Inheritance Dispute': 'Family Lawyer',
        'Debt Recovery': 'Civil Litigation Lawyer',
        'Business Matter': 'Corporate & Commercial Lawyer',
        'Community Disputes': 'Legal Aid Advocate',
        'Others': 'General Legal Practitioner'
    };
    return specMap[caseType] || 'General Legal Practitioner';
}



    function getAuthToken() {
    return localStorage.getItem('jwtToken') ||
        sessionStorage.getItem('jwtToken');
}

    function handleTokenExpired() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('lcdjp_username');
        localStorage.removeItem('lcdjp_userlevel');
        localStorage.removeItem('lcdjp_district');
        sessionStorage.removeItem('jwtToken');
        sessionStorage.removeItem('lcdjp_username');
        sessionStorage.removeItem('lcdjp_userlevel');
    }

let appendMediaRecorder = null;
let appendAudioChunks = [];
let appendIsRecording = false;
let appendRecordingStartTime = null;
let appendRecordingTimer = null;
let appendRecordedBlob = null;
let appendCurrentCaseId = null;

let caseVideoRecorder = null;
let caseVideoChunks = [];
let caseIsVideoRecording = false;
let caseVideoRecordingStartTime = null;
let caseVideoRecordingTimer = null;
let caseRecordedVideoBlob = null;

let map = null;
let mapMarkers = [];
let mapLayers = {
    cases: true,
    offices: true,
    lawyers: true,
    boundaries: true
};
let userLocation = null;
let userMarker = null;
let currentMapView = 'all';

let audioContext = null;

let legalAlerts = _lcdjpStore.legalAlerts; 





function showLoading(message = 'Loading...') {
   
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p id="loadingMessage" style="margin-top: 10px;">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loadingMessage').textContent = message;
        overlay.style.display = 'flex';
    }
}


function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

















var LCDJP_LOADER_MIN_MS = 5000;
function hideAppLoader() {
    var appLoader = document.getElementById('appLoader');
    if (!appLoader || appLoader.style.display === 'none' || appLoader.dataset.hiding === '1') return;
    appLoader.dataset.hiding = '1';

    var start = window.__lcdjpLoaderStart || Date.now();
    var elapsed = Date.now() - start;
    var remaining = Math.max(0, LCDJP_LOADER_MIN_MS - elapsed);

    setTimeout(function() {
        appLoader.style.opacity = '0';
        setTimeout(function() {
            appLoader.style.display = 'none';
        }, 300);
    }, remaining);
}







setTimeout(function() {
    if (typeof hideAppLoader === 'function') hideAppLoader();
}, 8000);


function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '',
        'doc': '',
        'docx': '',
        'jpg': '',
        'jpeg': '',
        'png': '',
        'gif': '',
        'xls': '',
        'xlsx': '',
        'ppt': '',
        'pptx': '',
        'txt': '',
        'zip': '',
        'rar': '',
        'mp3': '',
        'mp4': '',
        'avi': ''
    };
    return icons[ext] || '';
}


function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}





















(function () {
    window._lcdjpScrollLockCount = window._lcdjpScrollLockCount || 0;

    window.lockScroll = function () {
        window._lcdjpScrollLockCount++;
        if (window._lcdjpScrollLockCount === 1) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        }
    };

    window.unlockScroll = function () {
        window._lcdjpScrollLockCount = Math.max(0, window._lcdjpScrollLockCount - 1);
        if (window._lcdjpScrollLockCount === 0) {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }
    };

    window._lcdjpCloseMobileFullPage = function () {
        var fp = document.getElementById('mobileFullPage');
        if (!fp) return null;
        document.body.style.overflow = fp._fpPrevBodyOverflow || '';
        document.documentElement.style.overflow = fp._fpPrevHtmlOverflow || '';
        var parent = fp.parentNode;
        fp.remove();
        if (parent) parent.style.position = '';
        return parent;
    };
})();























(function () {
    function _lcdjpScrollIsLocked() {
        return document.body.style.overflow === 'hidden'
            || document.documentElement.style.overflow === 'hidden'
            || document.body.style.position === 'fixed';
    }

    function _lcdjpVisibleBlockingOverlay() {
        
        
        
        var candidates = document.querySelectorAll(
            '.modal-overlay, .lcdjp-modal, [id$="Modal"], [id$="Overlay"]'
        );
        for (var i = 0; i < candidates.length; i++) {
            var el = candidates[i];
            var cs = window.getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden'
                || parseFloat(cs.opacity) === 0) continue;
            var rect = el.getBoundingClientRect();
            if (rect.width > 40 && rect.height > 40) return true;
        }
        return false;
    }

    function _lcdjpCheckStrayLock() {
        if (!_lcdjpScrollIsLocked()) return;
        
        
        setTimeout(function () {
            if (_lcdjpScrollIsLocked() && !_lcdjpVisibleBlockingOverlay()) {
                
                
                
                var pinnedTop = document.body.style.position === 'fixed'
                    ? document.body.style.top : '';
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.left = '';
                document.body.style.right = '';
                document.body.style.width = '';
                
                
                
                
                
                
                window._lcdjpScrollLockCount = 0;
                if (pinnedTop) {
                    var restoredY = -parseInt(pinnedTop, 10) || 0;
                    window.scrollTo(0, restoredY);
                }
            }
        }, 50);
    }

    
    
    
    
    
    
    
    
    
    window.addEventListener('wheel', _lcdjpCheckStrayLock, { passive: true });
    window.addEventListener('touchmove', _lcdjpCheckStrayLock, { passive: true });
    window.addEventListener('touchstart', _lcdjpCheckStrayLock, { passive: true });
    window.addEventListener('mousedown', _lcdjpCheckStrayLock, { passive: true });
})();


