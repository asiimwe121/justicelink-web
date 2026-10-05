



function _lcdjpResolveApiBaseUrl() {
    var currentOrigin = window.location.origin;
    var configured = window.LCDJP_API_BASE_URL;
    if (!configured) return currentOrigin;
    try {
        var parsed = new URL(configured, currentOrigin);
        var isLocalHost = parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.hostname === '0.0.0.0';
        if (isLocalHost && parsed.origin !== currentOrigin) return currentOrigin;
        return parsed.origin;
    } catch (e) {
        return currentOrigin;
    }
}
const LCDJP_API_BASE_URL = _lcdjpResolveApiBaseUrl();

function getAuthToken() {
    try {
        
        
        var localToken = localStorage.getItem('jwtToken');
        var sessionToken = sessionStorage.getItem('jwtToken');
        var token = localToken || sessionToken;
        if (!token || token === 'null' || token === 'undefined') return null;
        return token.trim() || null;
    } catch (e) {
        return null;
    }
}
window.getAuthToken = getAuthToken;

function getAuthHeaders(additionalHeaders) {
    var headers = Object.assign({
        'Content-Type': 'application/json'
    }, additionalHeaders || {});
    var token = getAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
}
window.getAuthHeaders = getAuthHeaders;


window.LCDJP_FEATURES = window.LCDJP_FEATURES || {
    verificationEnabled: true,
    caseFeaturesEnabled: true
};

function _lcdjpVerificationDisabled() {
    return !!(window.LCDJP_FEATURES && window.LCDJP_FEATURES.verificationEnabled === false);
}
window._lcdjpVerificationDisabled = _lcdjpVerificationDisabled;

function _lcdjpCaseFeaturesDisabled() {
    return !!(window.LCDJP_FEATURES && window.LCDJP_FEATURES.caseFeaturesEnabled === false);
}
window._lcdjpCaseFeaturesDisabled = _lcdjpCaseFeaturesDisabled;

function showFeatureUnavailableMessage(message) {
    var text = message || 'This feature is not available at this time.';
    if (typeof window.showToast === 'function') {
        window.showToast(text);
    } else if (typeof window.alert === 'function') {
        window.alert(text);
    }
    return text;
}
window.showFeatureUnavailableMessage = showFeatureUnavailableMessage;

function showAuthFailureMessage(status, fallbackMessage) {
    var message = status === 401
        ? 'Your session has expired. Please log in again.'
        : status === 403
            ? 'You do not have permission to access this resource.'
            : (fallbackMessage || 'Authentication failed. Please log in again.');

    if (typeof window.showToast === 'function') {
        window.showToast(message);
    } else if (typeof window.alert === 'function') {
        window.alert(message);
    }
    return message;
}
window.showAuthFailureMessage = showAuthFailureMessage;

function handleAuthFailure(response, fallbackMessage) {
    if (!response || (response.status !== 401 && response.status !== 403)) {
        return false;
    }
    showAuthFailureMessage(response.status, fallbackMessage);
    return true;
}
window.handleAuthFailure = handleAuthFailure;

function isTokenValid() {
    var token = getAuthToken();
    if (!token) return false;
    
    try {
        var parts = token.split('.');
        if (parts.length !== 3) return false;
        var encodedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (encodedPayload.length % 4) encodedPayload += '=';
        var payload = JSON.parse(atob(encodedPayload));
        if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
            return false;
        }
        if (payload.exp) {
            var now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        }
        return true;
    } catch (e) {
        return false;
    }
}
window.isTokenValid = isTokenValid;
function isAuthenticated() {
    return isTokenValid();
}
window.isAuthenticated = isAuthenticated;

function _checkAuthAndToken(message) {
    if (isAuthenticated()) return true;
    showAuthFailureMessage(401, message || 'Please log in to continue.');
    return false;
}
window._checkAuthAndToken = _checkAuthAndToken;
window._lcdjpIsAuthenticated = function() {
    return isAuthenticated();
};

const _lcdjpStore = {
    cases: [],
    notifications: [],
    users: [],
    legalAlerts: []
};

let _lcdjp_user_index = {};

function _lcdjp_syncUserIndex() {
    _lcdjp_user_index = {};
    (_lcdjpStore.users || []).forEach(function(u) {
        var key = 'user_' + (u.username || u.user_id || '');
        _lcdjp_user_index[key] = u;
    });
}

function _lcdjpRefreshCases() {
    
    var username = localStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_username') || '';
    if (!username || username === 'null' || username === 'undefined' || username === '') {
        console.log('[LCDJP] No username - skipping cases refresh');
        return;
    }
    
    
    if (!_lcdjpIsAuthenticated()) {
        console.log('[LCDJP] Not authenticated - skipping cases refresh');
        return;
    }
    
    
    var token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken') || '';
    if (!token || token === 'null' || token === 'undefined' || token === '') {
        console.log('[LCDJP] No token - skipping cases refresh');
        return;
    }
    
    
    var endpoint = (typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.citizenCases)
        ? API_ENDPOINTS.citizenCases(username)
        : API_BASE_URL + '/api/cases/citizen/' + encodeURIComponent(username);
    
    
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
                console.log('[LCDJP] Not authenticated for cases refresh - skipping');
                return null;
            }
            if (r.status === 403) {
                console.log('[LCDJP] Forbidden for cases refresh - skipping');
                return null;
            }
            console.warn('[LCDJP] Cases refresh failed:', r.status);
            return null;
        }
        return r.json(); 
    })
    .then(function(data) {
        if (!data) return;
        
        
        var cases = [];
        if (Array.isArray(data)) {
            cases = data;
        } else if (data.cases && Array.isArray(data.cases)) {
            cases = data.cases;
        } else if (data.data && Array.isArray(data.data)) {
            cases = data.data;
        }
        
        
        if (window._lcdjpStore) {
            window._lcdjpStore.cases = cases;
        }
        
        
        if (typeof cases !== 'undefined') {
            window.cases = cases;
        }
        
        console.log('[LCDJP] Cases refreshed: ' + cases.length + ' cases found');
        
        
        if (typeof updateMyCases === 'function') {
            updateMyCases();
        }
        if (typeof renderNavbarNotifBadge === 'function') {
            renderNavbarNotifBadge();
        }
        
        return cases;
    })
    .catch(function(err) {
        
        console.log('[LCDJP] Cases refresh error:', err.message);
        return null;
    });
}
function _lcdjpIsAuthenticated() {
    return isAuthenticated();
}
async function _lcdjpRefreshNotifications(username) {
    
    if (!isAuthenticated()) {
        console.warn('[LCDJP] Not authenticated - skipping notifications refresh');
        return;
    }

    var token = getAuthToken();
    if (!token || !username) return;
    
    try {
        var r = await fetch(API_ENDPOINTS.userNotifications(username), {
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': 'Bearer ' + token 
            }
        });
        if (r.ok) {
            var d = await r.json();
            _lcdjpStore.notifications = Array.isArray(d) ? d : (d.notifications || []);
            notifications = _lcdjpStore.notifications;
        } else if (r.status === 401 || r.status === 403) {
            console.warn('⚠️ Authentication error loading notifications');
        }
    } catch(e) { 
        console.warn('[LCDJP] Could not refresh notifications:', e); 
    }
}


async function _lcdjpRefreshUsers() {
    
    if (!isAuthenticated()) {
        console.warn('[LCDJP] Not authenticated - skipping users refresh');
        return;
    }

    var token = getAuthToken();
    if (!token || !_lcdjpIsAdministrator()) return;
    
    try {
        var r = await fetch(API_ENDPOINTS.users, {
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': 'Bearer ' + token 
            }
        });
        if (r.ok) {
            var d = await r.json();
            _lcdjpStore.users = Array.isArray(d) ? d : (d.users || []);
            _lcdjp_syncUserIndex();
        } else if (r.status === 401 || r.status === 403) {
            console.warn('⚠️ Authentication error loading users');
        }
    } catch(e) { 
        console.warn('[LCDJP] Could not refresh users:', e); 
    }
}


async function _lcdjpRefreshLegalAlerts() {
    try {
        var r = await fetch(API_ENDPOINTS.legalAlertsAPI, {
            headers: { 'Content-Type': 'application/json' },
            suppressAuthRedirect: true  
        });
        if (r.ok) {
            var d = await r.json();
            _lcdjpStore.legalAlerts = Array.isArray(d) ? d : (d.alerts || []);
            legalAlerts = _lcdjpStore.legalAlerts;
        }
    } catch(e) { 
        console.warn('[LCDJP] Could not refresh legal alerts:', e); 
    }
}

function _lcdjpIsAdministrator() {
    var role = String(
        sessionStorage.getItem('lcdjp_userlevel') ||
        localStorage.getItem('userRole') ||
        ''
    ).trim().toUpperCase();
    return role === 'ADMIN' || role === 'SYSTEM_ADMIN' ||
        role === 'SYSTEM_ADMINISTRATOR' || role === 'DISTRICT_ADMIN';
}

function _lcdjpCanAccessProtectedCitizenData() {
    if (_lcdjpIsAdministrator()) return true;
    var status = String(
        sessionStorage.getItem('lcdjp_verif_status') ||
        localStorage.getItem('verificationStatus') ||
        ''
    ).trim().toUpperCase();
    return status === 'APPROVED' || status === 'VERIFIED';
}

function _lcdjp_saveUserToAPI(user) {
    var token = getAuthToken();
    if (!token || !user || !user.username) return;
    
    _lcdjp_user_index['user_' + user.username] = user;
    var idx = _lcdjpStore.users.findIndex(function(u) { return u.username === user.username; });
    if (idx >= 0) _lcdjpStore.users[idx] = user; else _lcdjpStore.users.push(user);
    
    fetch(API_ENDPOINTS.user(user.username), {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(user)
    }).catch(function(e) { console.warn('[LCDJP] Could not save user:', e); });
}

function _lcdjpCreateNotification(username, message, type, caseId) {
    var token = getAuthToken();
    var currentUser = sessionStorage.getItem('lcdjp_username');
    var notif = {
        id: Date.now(),
        username: username,
        message: message,
        type: type || 'system',
        caseId: caseId || null,
        timestamp: new Date().toISOString(),
        isRead: false,
        is_read: false
    };
    
    
    if (token && isAuthenticated()) {
        fetch(API_ENDPOINTS.notifications, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                username: username, 
                message: message, 
                type: type || 'system', 
                caseId: caseId || '' 
            })
        }).catch(function(e) { console.warn('[LCDJP] Notification API error:', e); });
    }
    
    
    if (username === currentUser) {
        _lcdjpStore.notifications.unshift(notif);
        notifications = _lcdjpStore.notifications;
    }
}

async function _lcdjpLoadAllData() {
    
    if (!isAuthenticated()) {
        console.log('[LCDJP] Not authenticated, skipping data load');
        return;
    }
    
    
    var token = getAuthToken();
    if (!token) {
        console.log('[LCDJP] No token, skipping data load');
        return;
    }
    
    var username = null;
    try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        username = payload.sub || payload.username || null;
    } catch (e) {
        console.warn('[LCDJP] Could not extract username from token:', e);
        return;
    }
    
    if (!username) {
        console.log('[LCDJP] No username in token, skipping data load');
        return;
    }
    
    sessionStorage.setItem('lcdjp_username', username);
    
    
    await _lcdjpRefreshLegalAlerts();
    
    
    if (!_lcdjpCanAccessProtectedCitizenData() && !_lcdjpIsAdministrator()) {
        console.log('[LCDJP] User not verified, skipping case and notification data');
        return;
    }
    
    console.log('[LCDJP] Loading all data for user:', username);
    await Promise.all([
        _lcdjpRefreshCases(),
        _lcdjpRefreshNotifications(username),
        _lcdjpRefreshUsers()
    ]);
    console.log('[LCDJP] All data loaded successfully');
}

window._lcdjpLoadAllData = _lcdjpLoadAllData;
window._lcdjpRefreshCases = _lcdjpRefreshCases;
window._lcdjpRefreshNotifications = _lcdjpRefreshNotifications;
window._lcdjpRefreshUsers = _lcdjpRefreshUsers;
window._lcdjpRefreshLegalAlerts = _lcdjpRefreshLegalAlerts;
window._lcdjpIsAdministrator = _lcdjpIsAdministrator;
window._lcdjpCanAccessProtectedCitizenData = _lcdjpCanAccessProtectedCitizenData;
window._lcdjpCreateNotification = _lcdjpCreateNotification;
window._lcdjp_saveUserToAPI = _lcdjp_saveUserToAPI;
window._lcdjp_syncUserIndex = _lcdjp_syncUserIndex;

document.addEventListener('DOMContentLoaded', function() {
    var token = getAuthToken();
    if (token && isAuthenticated()) {
        
        try {
            var payload = JSON.parse(atob(token.split('.')[1]));
            var username = payload.sub || payload.username;
            if (username) {
                
                sessionStorage.setItem('lcdjp_username', username);
                _lcdjpLoadAllData().catch(function(e) {
                    console.warn('[LCDJP] Auto-load failed:', e);
                });
            }
        } catch (e) {
            console.warn('[LCDJP] Could not parse token:', e);
        }
    }
    
    
    if (typeof updateVerificationUI === 'function') updateVerificationUI();
});

let cases = _lcdjpStore.cases;

cases.forEach(function(c){
    if (!c.assignedSpecialization) {
        c.assignedSpecialization = determineLawyerSpecialization ? 
            determineLawyerSpecialization(c.caseType) : 'General';
    }
});

_lcdjpStore.cases = cases; 
cases = _lcdjpStore.cases;
let caseCounter = 1; 
let notifications = _lcdjpStore.notifications;
let pendingVerificationCode = "";
let chatMessages = [];
let chatConversations = {};
let chatInterval = null;
let currentConversationUser = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimer = null;
let recordedAudioBlob = null;
let voiceStream = null;
let currentAudio = null;
let currentPlayBtn = null;
let caseMediaRecorder = null;
let caseAudioChunks = [];
let caseIsRecording = false;
let caseRecordingStartTime = null;
let caseRecordingTimer = null;
let caseRecordedBlob = null;
let caseRecordedObjectUrl = null;
let lawyerMediaRecorder = null;
let lawyerAudioChunks = [];
let lawyerIsRecording = false;
let lawyerRecordingStartTime = null;
let lawyerRecordingTimer = null;
let lawyerRecordedBlob = null;
let lawyerCurrentCaseId = null;
let citizenMediaRecorder = null;
let citizenAudioChunks = [];
let citizenIsRecording = false;
let citizenRecordingStartTime = null;
let citizenRecordingTimer = null;
let citizenRecordedBlob = null;
let citizenCurrentCaseId = null;

let currentLang = sessionStorage.getItem('lcdjp_language') || 'en';
const translations = {
    en: {
        welcome: 'Welcome',
        login: 'LOGIN',
        register: 'REGISTER',
        home: 'Home',
        notifications: 'Notifications',
        contact: 'Contact',
        myAccount: 'My Account',
        logout: 'Logout',
        'welcome_desc_1': 'The JusticeLink Digital Justice Platform connects citizens to community justice services, legal information and support.',
        'welcome_desc_2': 'Report disputes, seek legal guidance, track your cases and connect with community leaders and justice partners.',
        'explore_services': 'Explore our services ',
        'how_we_can_help': 'How We Can Help You',
        'report_case': 'Report Case',
        'report_case_desc': 'Submit disputes and complaints for local review.',
        'track_case': 'Track Case',
        'track_case_desc': 'Follow the updates and status of your case.',
        'legal_advice': 'Legal Advice',
        'legal_advice_desc': 'Access structured legal guidance and community support.',
        'find_help': 'Find Help',
        'find_help_desc': 'Find the right service, office, institution, or organization for your situation.',
        'legal_education': 'Legal Education',
        'legal_education_desc': 'Learn your rights, responsibilities, and local laws.',
        'document_management': 'Document Management',
        'document_management_desc': 'Upload, organize, and manage your legal documents securely.',
        'gis_services': 'GIS Services',
        'gis_services_desc': 'Find LC offices, lawyers, and legal aid near you on an interactive map.',
        'secure_confidential': 'Secure & Confidential',
        'secure_confidential_desc': 'Your information is protected',
        'community_focused': 'Community Focused',
        'community_focused_desc': 'Built for communities',
        'easy_to_use': 'Easy to Use',
        'easy_to_use_desc': 'Simple & accessible',
        'always_available': 'Always Available',
        'always_available_desc': 'Access anytime, anywhere',
        'report_menu': 'Report Case',
        'track_menu': 'Track Case',
        'legal_menu': 'Legal Advice',
        'contact_support': 'Contact Support',
        'help_menu': 'Find Help',
        'education_menu': 'Legal Education',
        'document_menu': 'Document Management',
        'gis_menu': 'GIS Services',
        'family_dispute': 'Family Dispute',
        'land_matter': 'Land Matter',
        'business_matter': 'Business Matter',
        'community_disputes': 'Community Disputes',
        'inheritance_dispute': 'Inheritance Dispute',
        'boundary_dispute': 'Boundary Dispute',
        'marriage_dispute': 'Marriage Dispute',
        'child_custody': 'Child Custody',
        'debt_recovery': 'Debt Recovery',
        'others': 'Others',
        'know_your_rights': 'Know Your Rights',
        'know_your_rights_desc': 'Every citizen in Uganda is protected by the 1995 Constitution.',
        'common_questions': 'Common Legal Questions',
        'common_questions_desc': 'Common issues include land disputes, domestic violence, employment termination.',
        'ai_guidance': 'AI Legal Guidance',
        'ai_guidance_desc': 'This system provides preliminary legal guidance only. It is not a substitute for a lawyer.',
        'legal_templates': 'Legal Templates',
        'legal_templates_desc': 'Standard documents include tenancy agreements, affidavit forms, complaint letters.',
        'find_lawyer': 'Find a Lawyer',
        'find_lawyer_desc': 'Connect with registered lawyers accredited by the Uganda Law Society.',
        'legal_aid': 'Legal Aid Providers',
        'legal_aid_desc': 'Free or low-cost legal aid available through legal aid clinics and NGOs.',
        'local_councils': 'Local Council Offices',
        'local_councils_desc': 'LC1 and LC2 offices handle neighbour disputes and small debt collection.',
        'emergency_support': 'Emergency Support',
        'emergency_support_desc': 'Contact Uganda Police or legal emergency lines immediately.',
        'land_law': 'Land & Property Law',
        'family_law': 'Family & Marriage Law',
        'employment_law': 'Business & Employment Law',
        'community_law': 'Community Disputes (LC System)',
        'my_documents': 'My Documents',
        'my_documents_desc': 'View and manage all your uploaded documents',
        'upload_document': 'Upload Document',
        'upload_document_desc': 'Upload new documents to your library',
        'categories': 'Categories',
        'categories_desc': 'Browse documents by category',
        'shared_with_me': 'Shared With Me',
        'shared_with_me_desc': 'View documents shared with you',
        'view_map': '\ufe0f View Map',
        'view_map_desc': 'Interactive map showing cases, offices, and services',
        'find_lc_office': '\ufe0f Find LC Office',
        'find_lc_office_desc': 'Locate the nearest Local Council office',
        'find_lawyer_gis': '\ufe0f Find Lawyer',
        'find_lawyer_gis_desc': 'Locate lawyers near your location',
        'find_legal_aid': 'Find Legal Aid',
        'find_legal_aid_desc': 'Find legal aid offices near you',
        'new_submission_title': 'New  Submission',
        'submission_instructions': 'Please provide all required information below',
        'jurisdiction_location': 'Jurisdiction & Location',
        'location_instructions': 'Select your location - if not available, you can enter it manually',
        'district_label': 'District',
        'county_label': 'County',
        'subcounty_label': 'Sub-county',
        'parish_label': 'Parish',
        'village_label': 'Village',
        'select_district': '-- Select District --',
        'select_county': '-- Select County --',
        'select_subcounty': '-- Select Sub-county --',
        'select_parish': '-- Select Parish --',
        'select_village': '-- Select Village --',
        'contact_info_title': 'Your Contact Information',
        'phone_format_hint': 'Format: 07XXXXXXXX (10 digits) or +256XXXXXXXXX (13 chars)',
        'your_phone_label': 'Your Phone Number',
        'your_email_label': 'Your Email Address',
        'phone_placeholder': '07XXXXXXXX or +256XXXXXXXXX',
        'email_placeholder': 'Email address',
        'next_of_kin_title': '\u200d\u200d Next of Kin Information',
        'next_of_kin_instructions': 'Provide your next of kin contact for emergencies',
        'kin_name_label': 'Full Name of Next of Kin',
        'kin_phone_label': 'Next of Kin Phone Number',
        'kin_email_label': 'Next of Kin Email',
        'kin_name_placeholder': 'Full legal name of next of kin',
        'relationship_label': 'Relationship to You',
        'select_relationship': 'Select Relationship',
        'relationship_spouse': 'Spouse',
        'relationship_parent': 'Parent',
        'relationship_child': 'Child',
        'relationship_sibling': 'Sibling',
        'relationship_relative': 'Relative',
        'relationship_friend': 'Friend',
        'relationship_other': 'Other',
        'case_details_title': '\ufe0f Case Details',
        'statement_label': 'Statement / Description',
        'statement_placeholder': 'Describe your case in detail. Include dates, names, and any relevant information...',
        'voice_record_label': '\ufe0f Record Voice Statement',
        'voice_record_btn': '\ufe0f Record',
        'voice_status_idle': 'Click to start recording',
        'voice_recording': '\u23fa\ufe0f Recording...',
        'voice_stop_btn': 'Stop',
        'voice_ready': 'Recording ready',
        'voice_remove_btn': 'Remove',
        'video_record_label': 'Record Video Statement',
        'video_record_btn': 'Record',
        'video_status_idle': 'Click to start video recording',
        'video_recording': '\u23fa\ufe0f Recording video...',
        'video_stop_btn': 'Stop',
        'video_ready': 'Video ready',
        'video_remove_btn': 'Remove',
        'attach_document_label': 'Attach Documents / Media',
        'attach_document_hint': 'Upload photos, videos, or PDF documents (Max 5MB per file)',
        'file_upload_hint': 'Upload photos, videos, or PDF documents (Max 5MB per file)',
        'terms_confirmation': 'I confirm that the information I have provided is true and accurate.',
        'submit_case_btn': 'SUBMIT CASE'
    },

    lug: {
        welcome: 'Tukusanyukidde',
        login: 'YINGIRA',
        register: 'YIWANDIKISE',
        home: 'Waka',
        notifications: 'Obubaka',
        contact: 'Tukubile',
        myAccount: 'Akawunti Yange',
        logout: 'Vaayo',
        'welcome_desc_1': 'Platforma ya JusticeLink Digital Justice Platform eyambula abantu okufuna obuyambi mu by\'amateeka mu kitundu kyabwe.',
        'welcome_desc_2': 'Wandika obusango, funa amagezi ag\'amateeka, kola obulambulukusi ku musango wo era weegatte n\'abakulembeze ba kitundu.',
        'explore_services': 'Tunnye ku mbeera zaffe ',
        'how_we_can_help': 'Bwe Tusobola Okukuyamba',
        'report_case': 'Okuwandiisa Omusango',
        'report_case_desc': 'Wandika obusango n\'okwemulugunya okukebera mu kitundu.',
        'track_case': 'Okukola Obulambulukusi ku Musango',
        'track_case_desc': 'Goberera enkyukakyuka n\'embeera y\'omusango wo.',
        'legal_advice': 'Amagezi Ag\'amateeka',
        'legal_advice_desc': 'Funa amagezi ag\'amateeka n\'obuyambi okuva mu kitundu.',
        'find_help': 'Okunoonya Obuyambi',
        'find_help_desc': 'Weegatte n\'abawa obuyambi mu by\'amateeka n\'abaweesa.',
        'legal_education': 'Okusomesebwa ku Mateeka',
        'legal_education_desc': 'Manyira eddembe lyo, obuvunaanyizibwa n\'amateeka ga kitundu.',
        'document_management': 'Ebiwandiiko',
        'document_management_desc': 'Paka, teeka mu nkola, era funa ebiwandiiko byo mu nsonga z\'amateeka.',
        'gis_services': 'Okulaba Enkula y\'Ensi',
        'gis_services_desc': 'Noonya ofiisi za Lukiiko, abannamateeka, n\'obuyambi mu by\'amateeka okumpi naawe ku maapu.',
        'secure_confidential': 'Mu Kkubo Ly\'ekyama',
        'secure_confidential_desc': 'Ebyo byo bikuumibwa',
        'community_focused': 'Ebikwata ku Kitundu',
        'community_focused_desc': 'Tukolebwera abantu',
        'easy_to_use': 'Kyangu Okukozesa',
        'easy_to_use_desc': 'Kyangu era kisobola okufuna',
        'always_available': 'Buli Kiseera',
        'always_available_desc': 'Funa buli kiseera, buli w\'oli',
        'report_menu': 'Okuwandiisa Omusango',
        'track_menu': 'Okukola Obulambulukusi ku Musango',
        'legal_menu': 'Amagezi Ag\'amateeka',
        'contact_support': 'Buulira Obuyambi',
        'help_menu': 'Okunoonya Obuyambi',
        'education_menu': 'Okusomesebwa ku Mateeka',
        'document_menu': 'Ebiwandiiko',
        'gis_menu': 'Okulaba Enkula y\'Ensi',
        'family_dispute': 'Obusango bw\'Amaka',
        'land_matter': 'Obusango bw\'Ettaka',
        'business_matter': 'Obusango bw\'Amaguzi',
        'community_disputes': 'Obusango bw\'Abantu',
        'inheritance_dispute': 'Obusango bw\'Obusika',
        'boundary_dispute': 'Obusango bw\'Ensalo',
        'marriage_dispute': 'Obusango bw\'Obufumbo',
        'child_custody': 'Okulabirira Omwana',
        'debt_recovery': 'Okununula Ebisimbo',
        'others': 'Ebirala',
        'know_your_rights': 'Manyira Eddembe Lyo',
        'know_your_rights_desc': 'Buli muntu mu Uganda alina eddembe erikuumibwa mu Ssemateeka wa 1995.',
        'common_questions': 'Ebibuuzo Ebikwata ku Mateeka',
        'common_questions_desc': 'Ebizibu ebisinga mulimu eby\'ettaka, okutulugunyizibwa mu maka, n\'okugobwa ku mulimu.',
        'ai_guidance': 'Obuyambi bw\'amateeka okuva mu System',
        'ai_guidance_desc': 'Sistema eno eyamba mu by\'amateeka naye si mumateeka.',
        'legal_templates': 'Ebipimo by\'Ebiwandiiko',
        'legal_templates_desc': 'Ebiwandiiko ebisinga mulimu endagaano z\'enjuba, ebiwandiiko by\'okulayira, n\'ebiwandiiko by\'okwemulugunya.',
        'find_lawyer': 'Noonya Omunnamateeka',
        'find_lawyer_desc': 'Weegatte n\'abannamateeka abawandiisibwa mu Uganda Law Society.',
        'legal_aid': 'Abawa Obuyambi mu By\'amateeka',
        'legal_aid_desc': 'Obuyambi mu by\'amateeka obwa bulijjo obutagula busobola okufuna okuva mu biwawaatiro by\'amateeka ne NGOs.',
        'local_councils': 'Ofiisi za Lukiiko',
        'local_councils_desc': 'Ofiisi za Lukiiko 1 ne 2 zifaa ku busango bw\'abakiraana n\'okusasula ebisimbo ebitono.',
        'emergency_support': 'Obuyambi Obw\'Amangu',
        'emergency_support_desc': 'Kubira Poliisi ya Uganda oba essimu z\'obuyambi mu by\'amateeka amangu.',
        'land_law': 'Amateeka g\'Ettaka n\'Obumini',
        'family_law': 'Amateeka g\'Amaka n\'Obufumbo',
        'employment_law': 'Amateeka g\'Amaguzi n\'Emirimu',
        'community_law': 'Obusango bw\'Abantu (LC System)',
        'my_documents': 'Ebiwandiiko Byange',
        'my_documents_desc': 'Laba era funa ebiwandiiko byo byonna',
        'upload_document': 'Paka Ebiwandiiko',
        'upload_document_desc': 'Paka ebiwandiiko bipya mu kitabo kyo',
        'categories': 'Ebika by\'Ebiwandiiko',
        'categories_desc': 'Noonya ebiwandiiko okusinziira ku bika',
        'shared_with_me': 'Ebiwandiiko Ebibadde Bikwatibwa Nange',
        'shared_with_me_desc': 'Laba ebiwandiiko ebibadde bikwatibwa naawe',
        'view_map': '\ufe0f Laba Maapu',
        'view_map_desc': 'Maapu eyolesa obusango, ofiisi, n\'obuyambi',
        'find_lc_office': '\ufe0f Noonya Ofiisi ya Lukiiko',
        'find_lc_office_desc': 'Noonya Ofiisi ya Lukiiko enkuluma',
        'find_lawyer_gis': '\ufe0f Noonya Omunnamateeka',
        'find_lawyer_gis_desc': 'Noonya abannamateeka okumpi naawe',
        'find_legal_aid': 'Noonya Obuyambi mu By\'amateeka',
        'find_legal_aid_desc': 'Noonya ofiisi z\'obuyambi mu by\'amateeka okumpi naawe',
        'new_submission_title': 'Okuwandiisa Omusango ',
        'submission_instructions': 'Tuwe ebisoboka byonna ebisabiddwa wansi',
        'jurisdiction_location': 'Obuyinza n\'Ekifo',
        'location_instructions': 'Salawo ekifo kyo - bw\'otaba naye osobola okukiwandiika',
        'district_label': 'Disitulikiti',
        'county_label': 'Kaaunti',
        'subcounty_label': 'Sab-kaaunti',
        'parish_label': 'Parishi',
        'village_label': 'Kyalo',
        'select_district': '-- Salawo Disitulikiti --',
        'select_county': '-- Salawo Kaaunti --',
        'select_subcounty': '-- Salawo Sab-kaaunti --',
        'select_parish': '-- Salawo Parishi --',
        'select_village': '-- Salawo Kyalo --',
        'contact_info_title': 'Amakulu g\'Okuyungirira',
        'phone_format_hint': 'Ebyokulabirako: 07XXXXXXXX (number 10) oba +256XXXXXXXXX (number 13)',
        'your_phone_label': 'Ensimu Yo',
        'your_email_label': 'Eriyansi Yo',
        'phone_placeholder': '07XXXXXXXX oba +256XXXXXXXXX',
        'email_placeholder': 'Eriyansi',
        'next_of_kin_title': '\u200d\u200d Amakulu g\'Owa Maka',
        'next_of_kin_instructions': 'Tuwa amakulu g\'owa maka yo ku bikwata ku ngenze',
        'kin_name_label': 'Erinnya lya Maka Yo',
        'kin_phone_label': 'Ensimu ya Maka Yo',
        'kin_email_label': 'Eriyansi ya Maka Yo',
        'kin_name_placeholder': 'Erinnya lya maka yo lya kkono',
        'relationship_label': 'Enkolagana naawe',
        'select_relationship': 'Salawo Enkolagana',
        'relationship_spouse': 'Mukyala / Mwami',
        'relationship_parent': 'Mukadde',
        'relationship_child': 'Mwana',
        'relationship_sibling': 'Mwannyina',
        'relationship_relative': 'Ekiruubirwa',
        'relationship_friend': 'Mukwano',
        'relationship_other': 'Kirala',
        'case_details_title': '\ufe0f Ebikwata ku Musango',
        'statement_label': 'Okunnyonnyola / Obutabo',
        'statement_placeholder': 'Nnyonnyola musango wo mu bujjuvu. Teka ennaku, amannya n\'ebirala ebikwata...',
        'voice_record_label': '\ufe0f Okuteeka Eddoboozi',
        'voice_record_btn': '\ufe0f Teeka Eddoboozi',
        'voice_status_idle': 'Kuba okutandika okuteeka eddoboozi',
        'voice_recording': '\u23fa\ufe0f Okuteeka eddoboozi...',
        'voice_stop_btn': 'Koma',
        'voice_ready': 'Eddoboozi liwandiikiddwa',
        'voice_remove_btn': 'Ggyawo',
        'video_record_label': 'Okuteeka Vidiyo',
        'video_record_btn': 'Teeka Vidiyo',
        'video_status_idle': 'Kuba okutandika okuteeka vidiyo',
        'video_recording': '\u23fa\ufe0f Okuteeka vidiyo...',
        'video_stop_btn': 'Koma',
        'video_ready': 'Vidiyo eteeseddwa',
        'video_remove_btn': 'Ggyawo',
        'attach_document_label': 'Teka Ebiwandiiko/Ebifaananyi',
        'attach_document_hint': 'Teka ebifaananyi, vidiyo, oba ebiwandiiko bya PDF (Max 5MB ku fayiro emu)',
        'file_upload_hint': 'Teka ebifaananyi, vidiyo, oba ebiwandiiko bya PDF (Max 5MB ku fayiro emu)',
        'terms_confirmation': 'Nakakasa nti amakulu gampadde ye ga mazima era geesigwa.',
        'submit_case_btn': 'OKUWANDIISA OMUSANGO'
    },

    ach: {
        welcome: 'Yin ka oyot',
        login: 'DON',
        register: 'KWAN ICING',
        home: 'Ot',
        notifications: 'Lok',
        contact: 'Wan lok',
        myAccount: 'Akawunti An',
        logout: 'Kat woko',
        'welcome_desc_1': 'JusticeLink Digital Justice Platform konyo jo i kom cik ki lobo megi.',
        'welcome_desc_2': 'Nyer lok, yeny kony i kom cik, nyil lok onyo i kom cik ni, ki yot ki lok ki jotelo me lobo.',
        'explore_services': 'Nem tic mewa ',
        'how_we_can_help': 'Kit ma watwero konyi',
        'report_case': 'Nyer Cik',
        'report_case_desc': 'Ket lok me cik ki kwero i kom lobo.',
        'track_case': 'Nyil Cik',
        'track_case_desc': 'Lubere kipoto ki kit ma cik tye.',
        'legal_advice': 'Tam i Kom Cik',
        'legal_advice_desc': 'Yom nongo tam i kom cik ki kony me lobo.',
        'find_help': 'Yeny Kony',
        'find_help_desc': 'Yot ki lok ki jo ma miyo kony i kom cik ki jo ma keto cik.',
        'legal_education': 'Pwony i Kom Cik',
        'legal_education_desc': 'Pwony kong cik me lobo, gin ma itye ka twero, ki cik me lobo.',
        'document_management': 'Nyang Gik me Cik',
        'document_management_desc': 'Ket, yub, ki nyang gik me cik i kom kwo.',
        'gis_services': 'Tic me GIS',
        'gis_services_desc': 'Yeny ofisi me LC, lawer, ki kony i kom cik ma kongo nyingi i map.',
        'secure_confidential': 'Ki Kano ki Mung',
        'secure_confidential_desc': 'Lok me ngat tye ka cung',
        'community_focused': 'Tekwaro',
        'community_focused_desc': 'Ked me jo',
        'easy_to_use': 'Yot Tic Kode',
        'easy_to_use_desc': 'Yot ki nyutte',
        'always_available': 'Tye Kare Ducu',
        'always_available_desc': 'Yom nongo kare ducu, kabedo ducu',
        'report_menu': 'Nyer Cik',
        'track_menu': 'Nyil Cik',
        'legal_menu': 'Tam i Kom Cik',
        'contact_support': 'Lwoky Kony',
        'help_menu': 'Yeny Kony',
        'education_menu': 'Pwony i Kom Cik',
        'document_menu': 'Nyang Gik me Cik',
        'gis_menu': 'Tic me GIS',
        'family_dispute': 'Lok me Kek',
        'land_matter': 'Lok me Lobo',
        'business_matter': 'Lok me Biacara',
        'community_disputes': 'Lok me Jo me Lobo',
        'inheritance_dispute': 'Lok me Gwok Jami',
        'boundary_dispute': 'Lok me Wacel me Lobo',
        'marriage_dispute': 'Lok me Kendo',
        'child_custody': 'Gwoko Lutino',
        'debt_recovery': 'Nyang Cente ma Kireto',
        'others': 'Lok mukene',
        'know_your_rights': 'Ngec Kong Cik me Ngat',
        'know_your_rights_desc': 'Ngat ducu i Uganda tye ka cung i kom Cik me 1995.',
        'common_questions': 'Penjo Mabele i Kom Cik',
        'common_questions_desc': 'Lok mabele tye ka keto i kom lobo, cung i kom kek, ki kato i kom tic.',
        'ai_guidance': 'Kony i Kom Cik me AI',
        'ai_guidance_desc': 'Ked me kony i kom cik ngo. Pe tye ka keto cik me lawer.',
        'legal_templates': 'Gik me Cik',
        'legal_templates_desc': 'Gik me cik ma mabele tye ka endagaano me ot, gik me lim, ki waraga me kwero.',
        'find_lawyer': 'Yeny Lawer',
        'find_lawyer_desc': 'Yot ki lok ki lawer ma tye ka nying i Uganda Law Society.',
        'legal_aid': 'Jo ma Mijo Kony i Kom Cik',
        'legal_aid_desc': 'Kony i kom cik ma pe tye ka cung ki NGO.',
        'local_councils': 'Ofisi me LC',
        'local_councils_desc': 'Ofisi me LC1 ki LC2 tye ka keto i kom cik me lobo.',
        'emergency_support': 'Kony me Cung',
        'emergency_support_desc': 'Yot ki lok ki Polis me Uganda ki cik me cung.',
        'land_law': 'Cik me Lobo ki Nying',
        'family_law': 'Cik me Kek ki Kendo',
        'employment_law': 'Cik me Biacara ki Tic',
        'community_law': 'Lok me Jo me Lobo (LC System)',
        'my_documents': 'Gik me Cik An',
        'my_documents_desc': 'Nem ki nyang gik me cik ducu',
        'upload_document': 'Ket Gik me Cik',
        'upload_document_desc': 'Ket gik me cik manyen i library',
        'categories': 'Kategori',
        'categories_desc': 'Nem gik me cik ki kategori',
        'shared_with_me': 'Gik me Cik ma Keto Kodi',
        'shared_with_me_desc': 'Nem gik me cik ma keto kodi',
        'view_map': '\ufe0f Nem Map',
        'view_map_desc': 'Map ma nyuto cik, ofisi, ki tic',
        'find_lc_office': '\ufe0f Yeny Ofisi me LC',
        'find_lc_office_desc': 'Yeny ofisi me LC ma kongo nyingi',
        'find_lawyer_gis': '\ufe0f Yeny Lawer',
        'find_lawyer_gis_desc': 'Yeny lawer ma kongo nyingi',
        'find_legal_aid': 'Yeny Kony i Kom Cik',
        'find_legal_aid_desc': 'Yeny ofisi me kony i kom cik ma kongo nyingi',
        'new_submission_title': 'Ket Cik ',
        'submission_instructions': 'Yom ite i kom gin ducu ma kiceto',
        'jurisdiction_location': 'Kabedo ki Lok',
        'location_instructions': 'Yer kabedo ni - ka pe tye, itwero keto',
        'district_label': 'Disitulikiti',
        'county_label': 'Kaanti',
        'subcounty_label': 'Sab-kaanti',
        'parish_label': 'Parishi',
        'village_label': 'Kyalo',
        'select_district': '-- Yer Disitulikiti --',
        'select_county': '-- Yer Kaanti --',
        'select_subcounty': '-- Yer Sab-kaanti --',
        'select_parish': '-- Yer Parishi --',
        'select_village': '-- Yer Kyalo --',
        'contact_info_title': 'Ngec me Kwan',
        'phone_format_hint': 'Kit ma kite: 07XXXXXXXX (number 10) onyo +256XXXXXXXXX (number 13)',
        'your_phone_label': 'Namba me Simu',
        'your_email_label': 'Eriyansi',
        'phone_placeholder': '07XXXXXXXX onyo +256XXXXXXXXX',
        'email_placeholder': 'Eriyansi',
        'next_of_kin_title': '\u200d\u200d Ngec me Wat',
        'next_of_kin_instructions': 'Ket ngec me wat me kony i cung',
        'kin_name_label': 'Nying me Wat ducu',
        'kin_phone_label': 'Namba me Simu me Wat',
        'kin_email_label': 'Eriyansi me Wat',
        'kin_name_placeholder': 'Nying ducu me wat',
        'relationship_label': 'Lok me Wat',
        'select_relationship': 'Yer Lok me Wat',
        'relationship_spouse': 'Tiyo / Minne',
        'relationship_parent': 'Won / Min',
        'relationship_child': 'Ladit',
        'relationship_sibling': 'Omwony',
        'relationship_relative': 'Wat',
        'relationship_friend': 'Lajok',
        'relationship_other': 'Lok mukene',
        'case_details_title': '\ufe0f Lok me Cik',
        'statement_label': 'Lok / Ngec',
        'statement_placeholder': 'Nyer cik ni ducu. Ket nino, nying, ki ngec ducu ma tye...',
        'voice_record_label': '\ufe0f Ket Dwo',
        'voice_record_btn': '\ufe0f Ket Dwo',
        'voice_status_idle': 'Dony i kom me ket dwo',
        'voice_recording': '\u23fa\ufe0f Tyeko ket dwo...',
        'voice_stop_btn': 'Geng',
        'voice_ready': 'Dwo tye',
        'voice_remove_btn': 'Golo',
        'video_record_label': 'Ket Video',
        'video_record_btn': 'Ket Video',
        'video_status_idle': 'Dony i kom me ket video',
        'video_recording': '\u23fa\ufe0f Tyeko ket video...',
        'video_stop_btn': 'Geng',
        'video_ready': 'Video tye',
        'video_remove_btn': 'Golo',
        'attach_document_label': 'Ket Gik / Video',
        'attach_document_hint': 'Ket cal, video, onyo PDF (Max 5MB i file acel)',
        'file_upload_hint': 'Ket cal, video, onyo PDF (Max 5MB i file acel)',
        'terms_confirmation': 'An acungo ni ngec ma aketo tye adier.',
        'submit_case_btn': 'KET CIK'
    },

    teo: {
        welcome: 'Ejok noi',
        login: 'INGIRA',
        register: 'ITOLOMUNIT',
        home: 'Ere',
        notifications: 'Isamunitos',
        contact: 'Yuak Noi',
        myAccount: 'Akaunti An',
        logout: 'Ilok Woko',
        'welcome_desc_1': 'JusticeLink Digital Justice Platform eyangaunot itunga kanu alosenen isiol amateeka na akon me itotokitai.',
        'welcome_desc_2': 'Nyer lok, yeny kony i kom cik, nyil lok, ki yot ki lok ki jotelo me lobo.',
        'explore_services': 'Nem tic mewa ',
        'how_we_can_help': 'Erai Ebo Itunga Eteba Konye',
        'report_case': 'Nyer Erai Lok',
        'report_case_desc': 'Ket lok loka ebizibu kanu aingarenikin me losio.',
        'track_case': 'Nyil Erai Lok',
        'track_case_desc': 'Lubere kipoto na embeera loka lok lo.',
        'legal_advice': 'Tam i Kom Amateeka',
        'legal_advice_desc': 'Yom nongo tam i kom amateeka na kony me losio.',
        'find_help': 'Yeny Kony',
        'find_help_desc': 'Yot na jo ma miyo kony i kom amateeka na jo ma keto amateeka.',
        'legal_education': 'Pwony i Kom Amateeka',
        'legal_education_desc': 'Pwony kong amateeka, gin ma itye ka twero, ki amateeka me akwap.',
        'document_management': 'Nyang Gik me Amateeka',
        'document_management_desc': 'Ket, yub, ki nyang gik me amateeka i kom kwo.',
        'gis_services': 'Tic me GIS',
        'gis_services_desc': 'Yeny ofisi me LC, lawer, na kony i kom amateeka ma kongo nyingi i map.',
        'secure_confidential': 'Aibunakinit na Aikanukinit',
        'secure_confidential_desc': 'Adumun loke aibunakinit',
        'community_focused': 'Erai me Losio',
        'community_focused_desc': 'Ikolunitos kotoma itunga',
        'easy_to_use': 'Ejok Aiswamakinit',
        'easy_to_use_desc': 'Ejok na yom',
        'always_available': 'Tye Kare Kere',
        'always_available_desc': 'Yom nongo kare kere, kabedo kere',
        'report_menu': 'Nyer Erai Lok',
        'track_menu': 'Nyil Erai Lok',
        'legal_menu': 'Tam i Kom Amateeka',
        'contact_support': 'Bul Ekony',
        'help_menu': 'Yeny Kony',
        'education_menu': 'Pwony i Kom Amateeka',
        'document_menu': 'Nyang Gik me Amateeka',
        'gis_menu': 'Tic me GIS',
        'family_dispute': 'Lok me Ikalia',
        'land_matter': 'Lok me Alupok',
        'business_matter': 'Lok me Ebuni',
        'community_disputes': 'Lok me Losio',
        'inheritance_dispute': 'Lok me Gwok Jami',
        'boundary_dispute': 'Lok me Wacel me Alupok',
        'marriage_dispute': 'Lok me Alosit',
        'child_custody': 'Gwoko Auriak',
        'debt_recovery': 'Nyang Ikapun ma Kireto',
        'others': 'Lok mukene',
        'know_your_rights': 'Ngec Kong Amateeka me Ngat',
        'know_your_rights_desc': 'Itunga kere i Uganda tye ka cung i kom Amateeka me 1995.',
        'common_questions': 'Penjo Mabele i Kom Amateeka',
        'common_questions_desc': 'Lok mabele tye ka keto i kom alupok, cung i kom ikalia, ki kato i kom tic.',
        'ai_guidance': 'Kony i Kom Amateeka me AI',
        'ai_guidance_desc': 'Sisitemu eno miyo kony me amateeka ngo. Pe tye ka keto amateeka me lawer.',
        'legal_templates': 'Gik me Amateeka',
        'legal_templates_desc': 'Gik me amateeka ma mabele tye ka endagaano me ot, gik me lim, ki waraga me kwero.',
        'find_lawyer': 'Yeny Lawer',
        'find_lawyer_desc': 'Yot na lawer ma tye ka nying i Uganda Law Society.',
        'legal_aid': 'Jo ma Mijo Kony i Kom Amateeka',
        'legal_aid_desc': 'Kony i kom amateeka ma pe tye ka cung ki NGO.',
        'local_councils': 'Ofisi me LC',
        'local_councils_desc': 'Ofisi me LC1 na LC2 tye ka keto i kom lok me losio.',
        'emergency_support': 'Kony me Cung',
        'emergency_support_desc': 'Yot na Ipolisin me Uganda ki amateeka me cung.',
        'land_law': 'Amateeka me Alupok na Nying',
        'family_law': 'Amateeka me Ikalia na Alosit',
        'employment_law': 'Amateeka me Ebuni na Tic',
        'community_law': 'Lok me Losio (LC System)',
        'my_documents': 'Gik me Amateeka An',
        'my_documents_desc': 'Nem na nyang gik me amateeka kere',
        'upload_document': 'Ket Gik me Amateeka',
        'upload_document_desc': 'Ket gik me amateeka manyen i library',
        'categories': 'Kategori',
        'categories_desc': 'Nem gik me amateeka ki kategori',
        'shared_with_me': 'Gik me Amateeka ma Keto Noi',
        'shared_with_me_desc': 'Nem gik me amateeka ma keto noi',
        'view_map': '\ufe0f Nem Map',
        'view_map_desc': 'Map ma nyuto lok, ofisi, na tic',
        'find_lc_office': '\ufe0f Yeny Ofisi me LC',
        'find_lc_office_desc': 'Yeny ofisi me LC ma kongo nyingi',
        'find_lawyer_gis': '\ufe0f Yeny Lawer',
        'find_lawyer_gis_desc': 'Yeny lawer ma kongo nyingi',
        'find_legal_aid': 'Yeny Kony i Kom Amateeka',
        'find_legal_aid_desc': 'Yeny ofisi me kony i kom amateeka ma kongo nyingi',
        'new_submission_title': 'Ket Lok ',
        'submission_instructions': 'Jaun adumun kere ma ibusakinit nuka wansi',
        'jurisdiction_location': 'Kabedo na Amateeka',
        'location_instructions': 'Yer kabedo - ka pe tye, itwero keto',
        'district_label': 'Edistirikt',
        'county_label': 'Ekaanti',
        'subcounty_label': 'Sab-ekaanti',
        'parish_label': 'Iparishi',
        'village_label': 'Ekyalo',
        'select_district': '-- Yer Edistirikt --',
        'select_county': '-- Yer Ekaanti --',
        'select_subcounty': '-- Yer Sab-ekaanti --',
        'select_parish': '-- Yer Iparishi --',
        'select_village': '-- Yer Ekyalo --',
        'contact_info_title': 'Adumun me Yuak',
        'phone_format_hint': 'Kit ma kite: 07XXXXXXXX (namba 10) onyo +256XXXXXXXXX (namba 13)',
        'your_phone_label': 'Namba me Simu An',
        'your_email_label': 'Eriyansi An',
        'phone_placeholder': '07XXXXXXXX onyo +256XXXXXXXXX',
        'email_placeholder': 'Eriyansi',
        'next_of_kin_title': '\u200d\u200d Adumun me Wat An',
        'next_of_kin_instructions': 'Ket adumun me wat me kony i cung',
        'kin_name_label': 'Nying me Wat ducu',
        'kin_phone_label': 'Namba me Simu me Wat',
        'kin_email_label': 'Eriyansi me Wat',
        'kin_name_placeholder': 'Nying ducu me wat',
        'relationship_label': 'Lok me Wat',
        'select_relationship': 'Yer Lok me Wat',
        'relationship_spouse': 'Apedesi / Alosit',
        'relationship_parent': 'Baba / Mama',
        'relationship_child': 'Aurit',
        'relationship_sibling': 'Omwony',
        'relationship_relative': 'Wat',
        'relationship_friend': 'Lajok',
        'relationship_other': 'Lok mukene',
        'case_details_title': '\ufe0f Adumun me Lok',
        'statement_label': 'Lok / Adumun',
        'statement_placeholder': 'Nyer lok ni ducu. Ket nino, nying, na adumun kere ma tye...',
        'voice_record_label': '\ufe0f Ket Dwo me Lok',
        'voice_record_btn': '\ufe0f Ket Dwo',
        'voice_status_idle': 'Dony i kom me ket dwo',
        'voice_recording': '\u23fa\ufe0f Tyeko ket dwo...',
        'voice_stop_btn': 'Geng',
        'voice_ready': 'Dwo tye',
        'voice_remove_btn': 'Golo',
        'video_record_label': 'Ket Video me Lok',
        'video_record_btn': 'Ket Video',
        'video_status_idle': 'Dony i kom me ket video',
        'video_recording': '\u23fa\ufe0f Tyeko ket video...',
        'video_stop_btn': 'Geng',
        'video_ready': 'Video tye',
        'video_remove_btn': 'Golo',
        'attach_document_label': 'Ket Gik / Video',
        'attach_document_hint': 'Ket cal, video, onyo PDF (Max 5MB i file acel)',
        'file_upload_hint': 'Ket cal, video, onyo PDF (Max 5MB i file acel)',
        'terms_confirmation': 'An acungo ni adumun ma aketo tye adier.',
        'submit_case_btn': 'KET LOK'
    },

    lgg: {
        welcome: 'Avita ngazu',
        login: 'INGIRA',
        register: 'WANDIKA',
        home: 'Ere',
        notifications: 'Obubaka',
        contact: 'Tukubile',
        myAccount: 'Akaunti Ma',
        logout: 'Kat Woko',
        'welcome_desc_1': 'JusticeLink Digital Justice Platform eyi owi eyi ombata \'ba ivile \'diyini ofu azakoma fele ni azita ma azi adi.',
        'welcome_desc_2': 'Wandika ebizibu, shaka amagezi g\'amateeka, kola obulambu omu musango kandi weegatte n\'abakulembeze.',
        'explore_services': 'Reba azakoma fele \'diyini ',
        'how_we_can_help': 'Oku \'Diyi Owi Dri Ombata Ofu',
        'report_case': 'Wandika Lok',
        'report_case_desc': 'Ket ebizibu fele ni okporurisi omu losio.',
        'track_case': 'Nyil Lok',
        'track_case_desc': 'Lubere kipoto na embeera loka lok lo.',
        'legal_advice': 'Tam i Kom Azita',
        'legal_advice_desc': 'Yom nongo tam i kom azita na kony me losio.',
        'find_help': 'Shaka Kony',
        'find_help_desc': 'Yot na \'ba owi eyi azakoma fele ni azita na \'ba owi azu azo azita.',
        'legal_education': 'Pwony i Kom Azita',
        'legal_education_desc': 'Pwony edembe \'diyi ma ovu, obuvunaanyizibwa, na azita me akwap.',
        'document_management': 'Ebiwandiiko',
        'document_management_desc': 'Paka, teeka, na ofe ebiwandiiko \'diyi omu nsonga z\'azita.',
        'gis_services': 'Tic me GIS',
        'gis_services_desc': 'Shaka ofisi me LC, lawer, na kony i kom azita ma kongo nyingi i map.',
        'secure_confidential': 'Aibunakinit na Ekyama',
        'secure_confidential_desc': 'Adumun \'diyi aibunakinit',
        'community_focused': 'Erai me Ongulumu',
        'community_focused_desc': 'Ikolunitos kotoma \'ba',
        'easy_to_use': 'Ejok Azakoma',
        'easy_to_use_desc': 'Ejok na yom',
        'always_available': 'Tye Sawa Dria',
        'always_available_desc': 'Yom nongo sawa dria, kabedo dria',
        'report_menu': 'Wandika Lok',
        'track_menu': 'Nyil Lok',
        'legal_menu': 'Tam i Kom Azita',
        'contact_support': 'Dria Kony',
        'help_menu': 'Shaka Kony',
        'education_menu': 'Pwony i Kom Azita',
        'document_menu': 'Ebiwandiiko',
        'gis_menu': 'Tic me GIS',
        'family_dispute': 'Lok me Familia',
        'land_matter': 'Lok me Nyaku',
        'business_matter': 'Lok me Tujara',
        'community_disputes': 'Lok me Ongulumu',
        'inheritance_dispute': 'Lok me Gwok Jami',
        'boundary_dispute': 'Lok me Wacel me Nyaku',
        'marriage_dispute': 'Lok me Ozoo',
        'child_custody': 'Gwoko Anzi',
        'debt_recovery': 'Nyang Sende ma Kireto',
        'others': 'Lok mukene',
        'know_your_rights': 'Ngec Edembe \'Diyi Ma Ovu',
        'know_your_rights_desc': 'Ba dria i Uganda tye ka cung i kom Azita me 1995.',
        'common_questions': 'Penjo Mabele i Kom Azita',
        'common_questions_desc': 'Lok mabele tye ka keto i kom nyaku, ikalia, ki kato i kom tic.',
        'ai_guidance': 'Kony i Kom Azita me AI',
        'ai_guidance_desc': 'Sisitemu eno miyo kony me azita ngo. Pe tye ka keto azita me lawer.',
        'legal_templates': 'Gik me Azita',
        'legal_templates_desc': 'Gik me azita ma mabele tye ka endagaano me ot, gik me lim, ki waraga me kwero.',
        'find_lawyer': 'Shaka Lawer',
        'find_lawyer_desc': 'Yot na lawer ma tye ka nying i Uganda Law Society.',
        'legal_aid': 'Ba Owi Eyi Azakoma Kony i Kom Azita',
        'legal_aid_desc': 'Kony i kom azita ma pe tye ka cung ki NGO.',
        'local_councils': 'Ofisi me LC',
        'local_councils_desc': 'Ofisi me LC1 na LC2 tye ka keto i kom lok me ongulumu.',
        'emergency_support': 'Kony me Cung',
        'emergency_support_desc': 'Yot na Polisi me Uganda ki azita me cung.',
        'land_law': 'Azita me Nyaku na Nying',
        'family_law': 'Azita me Familia na Ozoo',
        'employment_law': 'Azita me Tujara na Tic',
        'community_law': 'Lok me Ongulumu (LC System)',
        'my_documents': 'Ebiwandiiko \'Diyi Ma',
        'my_documents_desc': 'Reba na ofe ebiwandiiko \'diyi ma dria',
        'upload_document': 'Paka Ebiwandiiko',
        'upload_document_desc': 'Paka ebiwandiiko bipya i library',
        'categories': 'Kategori',
        'categories_desc': 'Shaka ebiwandiiko ki kategori',
        'shared_with_me': 'Ebiwandiiko Ebiketo Noi',
        'shared_with_me_desc': 'Reba ebiwandiiko ebiketo noi',
        'view_map': '\ufe0f Reba Map',
        'view_map_desc': 'Map eyi nyuto lok, ofisi, na azakoma fele',
        'find_lc_office': '\ufe0f Shaka Ofisi me LC',
        'find_lc_office_desc': 'Shaka ofisi me LC ma kongo nyingi',
        'find_lawyer_gis': '\ufe0f Shaka Lawer',
        'find_lawyer_gis_desc': 'Shaka lawer ma kongo nyingi',
        'find_legal_aid': 'Shaka Kony i Kom Azita',
        'find_legal_aid_desc': 'Shaka ofisi me kony i kom azita ma kongo nyingi',
        'new_submission_title': 'Wandika Lok ',
        'submission_instructions': 'Fe adumun dria ma ibusakinit wansi',
        'jurisdiction_location': 'Kabedo na Azita',
        'location_instructions': 'Yer kabedo \'diyi - ka pe tye, itwero keto',
        'district_label': 'Distrikiti',
        'county_label': 'Kaanti',
        'subcounty_label': 'Sab-kaanti',
        'parish_label': 'Parishi',
        'village_label': 'Kyalo',
        'select_district': '-- Yer Distrikiti --',
        'select_county': '-- Yer Kaanti --',
        'select_subcounty': '-- Yer Sab-kaanti --',
        'select_parish': '-- Yer Parishi --',
        'select_village': '-- Yer Kyalo --',
        'contact_info_title': 'Adumun me Yuak',
        'phone_format_hint': 'Kit ma kite: 07XXXXXXXX (namba 10) onyo +256XXXXXXXXX (namba 13)',
        'your_phone_label': 'Namba me Simu Ma',
        'your_email_label': 'Eriyansi Ma',
        'phone_placeholder': '07XXXXXXXX onyo +256XXXXXXXXX',
        'email_placeholder': 'Eriyansi',
        'next_of_kin_title': '\u200d\u200d Adumun me Wat Ma',
        'next_of_kin_instructions': 'Fe adumun me wat me kony i cung',
        'kin_name_label': 'Nying me Wat dria',
        'kin_phone_label': 'Namba me Simu me Wat',
        'kin_email_label': 'Eriyansi me Wat',
        'kin_name_placeholder': 'Nying dria me wat',
        'relationship_label': 'Lok me Wat',
        'select_relationship': 'Yer Lok me Wat',
        'relationship_spouse': 'Omu / Apedi',
        'relationship_parent': 'Baba / Mama',
        'relationship_child': 'Oku',
        'relationship_sibling': 'Omwony',
        'relationship_relative': 'Wat',
        'relationship_friend': 'Lajok',
        'relationship_other': 'Lok mukene',
        'case_details_title': '\ufe0f Adumun me Lok',
        'statement_label': 'Lok / Adumun',
        'statement_placeholder': 'Wandika lok ni dria. Fe nino, nying, na adumun dria ma tye...',
        'voice_record_label': '\ufe0f Wandika Dwo me Lok',
        'voice_record_btn': '\ufe0f Wandika Dwo',
        'voice_status_idle': 'Dony i kom me wandika dwo',
        'voice_recording': '\u23fa\ufe0f Wandika dwo...',
        'voice_stop_btn': 'Geng',
        'voice_ready': 'Dwo tye',
        'voice_remove_btn': 'Golo',
        'video_record_label': 'Wandika Video me Lok',
        'video_record_btn': 'Wandika Video',
        'video_status_idle': 'Dony i kom me wandika video',
        'video_recording': '\u23fa\ufe0f Wandika video...',
        'video_stop_btn': 'Geng',
        'video_ready': 'Video tye',
        'video_remove_btn': 'Golo',
        'attach_document_label': 'Fe Ebiwandiiko / Video',
        'attach_document_hint': 'Fe cal, video, onyo PDF (Max 5MB i file emu)',
        'file_upload_hint': 'Fe cal, video, onyo PDF (Max 5MB i file emu)',
        'terms_confirmation': 'Ma wandika ngu adumun ma nfe tye adier.',
        'submit_case_btn': 'WANDIKA LOK'
    },

    nyn: {
        welcome: 'Turikukwanira',
        login: 'INGIRA',
        register: 'EEMBAGA',
        home: 'Omuka',
        notifications: 'Obubaka',
        contact: 'Tukubirire',
        myAccount: 'Akaunti Yange',
        logout: 'Hima',
        'welcome_desc_1': 'Platforma ya JusticeLink Digital Justice Platform enyambura abantu okuta obuyambi omu by\'amateeka omu kitundu kyabo.',
        'welcome_desc_2': 'Wandika ebizibu, shaka amagezi g\'amateeka, kora obulambulukusi ku musango gwawe kandi weegatte n\'abakulembeze b\'ekitundu.',
        'explore_services': 'Reeba emirimo yaitu ',
        'how_we_can_help': 'Oku Tukurikubasa Okukuyamba',
        'report_case': 'Okuwandikisa Omusango',
        'report_case_desc': 'Wandika ebizibu n\'okwegarura okukeberwa omu kitundu.',
        'track_case': 'Okukora Obulambulukusi ku Musango',
        'track_case_desc': 'Goberera enkyukakyuka n\'embeera y\'omusango gwawe.',
        'legal_advice': 'Amagezi g\'Amateeka',
        'legal_advice_desc': 'Funa amagezi g\'amateeka n\'obuyambi okuva omu kitundu.',
        'find_help': 'Okunoonya Obuyambi',
        'find_help_desc': 'Weegatte n\'abaha obuyambi omu by\'amateeka n\'abaweesa.',
        'legal_education': 'Okusomesebwa ku Mateeka',
        'legal_education_desc': 'Manyira edembe ryawe, obuvunaanyizibwa n\'amateeka g\'ekitundu.',
        'document_management': 'Ebiwandiiko',
        'document_management_desc': 'Paka, teeka omu nkora, era funa ebiwandiiko byawe omu nsonga z\'amateeka.',
        'gis_services': 'Okulaba Enkula y\'Ensi',
        'gis_services_desc': 'Noonya ofiisi za Lukiiko, abannamateeka, n\'obuyambi omu by\'amateeka okumpi naawe ku maapu.',
        'secure_confidential': 'Omu Kkubo Ery\'ekyama',
        'secure_confidential_desc': 'Ebyawe byakukuumwa',
        'community_focused': 'Ebikwata ku Kitundu',
        'community_focused_desc': 'Tukakolebwera abantu',
        'easy_to_use': 'Kyangu Okukozesa',
        'easy_to_use_desc': 'Kyangu era kisoboka okufuna',
        'always_available': 'Buli Kiseera',
        'always_available_desc': 'Funa buli kiseera, buli wawe',
        'report_menu': 'Okuwandikisa Omusango',
        'track_menu': 'Okukora Obulambulukusi ku Musango',
        'legal_menu': 'Amagezi g\'Amateeka',
        'contact_support': 'Baza Obuyambi',
        'help_menu': 'Okunoonya Obuyambi',
        'education_menu': 'Okusomesebwa ku Mateeka',
        'document_menu': 'Ebiwandiiko',
        'gis_menu': 'Okulaba Enkula y\'Ensi',
        'family_dispute': 'Ebizibu by\'Amaka',
        'land_matter': 'Ebizibu by\'Ettaka',
        'business_matter': 'Ebizibu by\'Amaguzi',
        'community_disputes': 'Ebizibu by\'Abantu',
        'inheritance_dispute': 'Ebizibu by\'Obusika',
        'boundary_dispute': 'Ebizibu by\'Ensalo',
        'marriage_dispute': 'Ebizibu by\'Obufumbo',
        'child_custody': 'Okulabirira Omwana',
        'debt_recovery': 'Okununura Ebisimbo',
        'others': 'Ebirala',
        'know_your_rights': 'Manyira Edembe Ryawe',
        'know_your_rights_desc': 'Buli muntu omu Uganda aine edembe erikukuumwa omu Ssemateeka wa 1995.',
        'common_questions': 'Ebibuzo Ebikwata ku Mateeka',
        'common_questions_desc': 'Ebizibu ebisinga mulimu eby\'ettaka, okutulugunyizibwa omu maka, n\'okugobwa ku mulimu.',
        'ai_guidance': 'Obuyambi bw\'amateeka okuva omu System',
        'ai_guidance_desc': 'Sistema eno eyamba omu by\'amateeka naye si mumateeka.',
        'legal_templates': 'Ebyokureeberaho by\'Ebiwandiiko',
        'legal_templates_desc': 'Ebiwandiiko ebisinga mulimu endagaano z\'enjuba, ebiwandiiko by\'okulayira, n\'ebiwandiiko by\'okwegarura.',
        'find_lawyer': 'Noonya Omunnamateeka',
        'find_lawyer_desc': 'Weegatte n\'abannamateeka abawandiisibwa omu Uganda Law Society.',
        'legal_aid': 'Abaha Obuyambi omu By\'amateeka',
        'legal_aid_desc': 'Obuyambi omu by\'amateeka obutaaha busobora okufuna okuva omu biwawaatiro by\'amateeka n\'ebitongole by\'abantu.',
        'local_councils': 'Ofiisi za Lukiiko',
        'local_councils_desc': 'Ofiisi za Lukiiko 1 na 2 zikora ku bizibu by\'abakiraana n\'okusasura ebisimbo ebitono.',
        'emergency_support': 'Obuyambi Obw\'Amangu',
        'emergency_support_desc': 'Kubira Poliisi ya Uganda oba essimu z\'obuyambi omu by\'amateeka amangu.',
        'land_law': 'Amateeka g\'Ettaka n\'Obumini',
        'family_law': 'Amateeka g\'Amaka n\'Obufumbo',
        'employment_law': 'Amateeka g\'Amaguzi n\'Emirimu',
        'community_law': 'Ebizibu by\'Abantu (Sisitemu ya LC)',
        'my_documents': 'Ebiwandiiko Byange',
        'my_documents_desc': 'Reba era funa ebiwandiiko byawe byona',
        'upload_document': 'Paka Ebiwandiiko',
        'upload_document_desc': 'Paka ebiwandiiko bipya omu kitabo kyawe',
        'categories': 'Ebika by\'Ebiwandiiko',
        'categories_desc': 'Noonya ebiwandiiko okusinziira ku bika',
        'shared_with_me': 'Ebiwandiiko Ebibadde Bikwatibwa Nange',
        'shared_with_me_desc': 'Reba ebiwandiiko ebibadde bikwatibwa naawe',
        'view_map': '\ufe0f Reeba Maapu',
        'view_map_desc': 'Maapu erikwolesa ebizibu, ofiisi, n\'obuyambi',
        'find_lc_office': '\ufe0f Noonya Ofiisi ya Lukiiko',
        'find_lc_office_desc': 'Noonya Ofiisi ya Lukiiko enkuluma',
        'find_lawyer_gis': '\ufe0f Noonya Omunnamateeka',
        'find_lawyer_gis_desc': 'Noonya abannamateeka okumpi naawe',
        'find_legal_aid': 'Noonya Obuyambi omu By\'amateeka',
        'find_legal_aid_desc': 'Noonya ofiisi z\'obuyambi omu by\'amateeka okumpi naawe',
        'new_submission_title': 'Okuwandikisa Omusango ',
        'submission_instructions': 'Tuwe ebisoboka byona ebisabwa wansi',
        'jurisdiction_location': 'Obuyinza n\'Ekifo',
        'location_instructions': 'Salawo ekifo kyawe - bw\'otaba naye osobola okukiwandiika',
        'district_label': 'Disiturikiti',
        'county_label': 'Kaanti',
        'subcounty_label': 'Sab-kaanti',
        'parish_label': 'Parishi',
        'village_label': 'Kyalo',
        'select_district': '-- Salawo Disiturikiti --',
        'select_county': '-- Salawo Kaanti --',
        'select_subcounty': '-- Salawo Sab-kaanti --',
        'select_parish': '-- Salawo Parishi --',
        'select_village': '-- Salawo Kyalo --',
        'contact_info_title': 'Amakulu g\'Okuyungirira',
        'phone_format_hint': 'Ebyokulabirako: 07XXXXXXXX (number 10) oba +256XXXXXXXXX (number 13)',
        'your_phone_label': 'Ensimu Yawe',
        'your_email_label': 'Eriyansi Yawe',
        'phone_placeholder': '07XXXXXXXX oba +256XXXXXXXXX',
        'email_placeholder': 'Eriyansi',
        'next_of_kin_title': '\u200d\u200d Amakulu g\'Owa Maka',
        'next_of_kin_instructions': 'Tuwa amakulu g\'owa maka yawe ku bikwata ku ngenze',
        'kin_name_label': 'Erinnya rya Maka Yawe',
        'kin_phone_label': 'Ensimu ya Maka Yawe',
        'kin_email_label': 'Eriyansi ya Maka Yawe',
        'kin_name_placeholder': 'Erinnya rya maka yawe rya kkono',
        'relationship_label': 'Enkolagana naawe',
        'select_relationship': 'Salawo Enkolagana',
        'relationship_spouse': 'Mukyala / Mwami',
        'relationship_parent': 'Mukadde',
        'relationship_child': 'Mwana',
        'relationship_sibling': 'Mwannyina',
        'relationship_relative': 'Ekiruubirwa',
        'relationship_friend': 'Mukwano',
        'relationship_other': 'Kirala',
        'case_details_title': '\ufe0f Ebikwata ku Musango',
        'statement_label': 'Okunnyonnyola / Obutabo',
        'statement_placeholder': 'Nnyonnyola musango gwawe mu bujjuvu. Teka ennaku, amannya n\'ebirala ebikwata...',
        'voice_record_label': '\ufe0f Okuteeka Eddoboozi',
        'voice_record_btn': '\ufe0f Teeka Eddoboozi',
        'voice_status_idle': 'Kuba okutandika okuteeka eddoboozi',
        'voice_recording': '\u23fa\ufe0f Okuteeka eddoboozi...',
        'voice_stop_btn': 'Koma',
        'voice_ready': 'Eddoboozi liwandiikiddwa',
        'voice_remove_btn': 'Ggyawo',
        'video_record_label': 'Okuteeka Vidiyo',
        'video_record_btn': 'Teeka Vidiyo',
        'video_status_idle': 'Kuba okutandika okuteeka vidiyo',
        'video_recording': '\u23fa\ufe0f Okuteeka vidiyo...',
        'video_stop_btn': 'Koma',
        'video_ready': 'Vidiyo eteeseddwa',
        'video_remove_btn': 'Ggyawo',
        'attach_document_label': 'Teka Ebiwandiiko/Ebifaananyi',
        'attach_document_hint': 'Teka ebifaananyi, vidiyo, oba ebiwandiiko bya PDF (Max 5MB ku fayiro emu)',
        'file_upload_hint': 'Teka ebifaananyi, vidiyo, oba ebiwandiiko bya PDF (Max 5MB ku fayiro emu)',
        'terms_confirmation': 'Nakakasa nti amakulu gampadde ye ga mazima era geesigwa.',
        'submit_case_btn': 'OKUWANDIISA OMUSANGO'
    }
};
    
const API_BASE_URL = LCDJP_API_BASE_URL.replace(/\/+$/, '');
const _regApiBase = `${API_BASE_URL}/api`;
const API_ENDPOINTS = {
  
    login: `${API_BASE_URL}/api/auth/login`,
    jwtValidate: `${API_BASE_URL}/api/auth/jwt/validate`,
    mapConfig: `${API_BASE_URL}/api/map/config`,
    register: `${API_BASE_URL}/api/auth/register`,
    users: `${API_BASE_URL}/api/auth/users`,
    pending: `${API_BASE_URL}/api/auth/users/pending`,
    user: (username) => `${API_BASE_URL}/api/auth/users/${username}`,
    profile: `${API_BASE_URL}/api/auth/profile`,
    
    createLC: `${API_BASE_URL}/api/lc/create`,
    
    
    cases: `${API_BASE_URL}/api/cases`,
    caseAnalytics: `${API_BASE_URL}/api/cases/analytics`,
    case: (caseId) => `${API_BASE_URL}/api/cases/${caseId}`,
    citizenCases: (username) => `${API_BASE_URL}/api/cases/citizen/${username}`,
    
    
    lawyerCases: (username) => `${API_BASE_URL}/api/cases/lawyer/${username}`,
    
    
    availableLawyerCases: (username) => `${API_BASE_URL}/api/cases/available/lawyer/${username}`,

    lcCases: (username) => `${API_BASE_URL}/api/cases/lc/${username}`,
    lcAcceptCase: (caseId) => `${API_BASE_URL}/api/cases/${caseId}/accept/lc`,

    
    
    
    
    
    
    
    aiCaseSubmit:        `${API_BASE_URL}/api/cases`,
    citizenLegalAidStatus: (username, caseType) => `${API_BASE_URL}/api/cases/citizen/${username}/legal-aid-status` + (caseType ? `?caseType=${encodeURIComponent(caseType)}` : ''),
    lawyersByDistrict:   (district) => `${API_BASE_URL}/api/map/lawyers?district=${encodeURIComponent(district)}`,
    
    
    
    
    
    lawyersSearch: (district, specialization) => {
        var params = [];
        if (district) params.push('district=' + encodeURIComponent(district));
        if (specialization) params.push('specialization=' + encodeURIComponent(specialization));
        return `${API_BASE_URL}/api/map/lawyers` + (params.length ? ('?' + params.join('&')) : '');
    },
    offerCaseToLawyer:   (caseId, username) => `${API_BASE_URL}/api/cases/${caseId}/offer-to/${username}`,
    aiCaseRoute:         (caseId) => `${API_BASE_URL}/api/cases/ai/${caseId}/route`,
    lawyerCaseOffers:    (username) => `${API_BASE_URL}/api/cases/offers/lawyer/${username}`,
    lawyerOfferAccept:   (caseId) => `${API_BASE_URL}/api/cases/${caseId}/offer/accept`,
    lawyerOfferDecline:  (caseId) => `${API_BASE_URL}/api/cases/${caseId}/offer/decline`,
    legalOrganizations:  `${API_BASE_URL}/api/legal-orgs/all`,

    
    resolve: (caseId) => `${API_BASE_URL}/api/cases/${caseId}/resolve`,
    advice: (caseId) => `${API_BASE_URL}/api/cases/${caseId}/advice`,
    forward: (caseId) => `${API_BASE_URL}/api/cases/${caseId}/forward`,
    messages: (caseId) => `${API_BASE_URL}/api/cases/${caseId}/messages`,
    markMessageRead: (caseId, messageId) => `${API_BASE_URL}/api/cases/${caseId}/messages/${messageId}/read`,
    assignHandler: (caseId) => `${API_BASE_URL}/api/cases/${caseId}/assign`,
    
  
    legalOrgs: `${API_BASE_URL}/api/legal-orgs`,
    legalOrgsAll: `${API_BASE_URL}/api/legal-orgs/all`,
    legalOrgDelete: (id) => `${API_BASE_URL}/api/legal-orgs/${id}`,
    
    
    
    

    
    documents: `${API_BASE_URL}/api/auth/documents`,
    userDocuments: (username) => `${API_BASE_URL}/api/auth/documents/user/${username}`,
    caseDocuments: (caseId) => `${API_BASE_URL}/api/auth/documents/case/${caseId}`,
    documentLog: (caseId) => `${API_BASE_URL}/api/auth/documents/case/${caseId}/log`,
    uploadDocument: `${API_BASE_URL}/api/auth/documents/upload`,
    shareDocument: (docId) => `${API_BASE_URL}/api/auth/documents/${docId}/share`,
    document: (docId) => `${API_BASE_URL}/api/auth/documents/${docId}`,
    deleteDocument: (docId) => `${API_BASE_URL}/api/auth/documents/${docId}`,
    
  
    notifications: `${API_BASE_URL}/api/auth/notifications`,
    userNotifications: (username) => `${API_BASE_URL}/api/auth/notifications/user/${username}`,
    markAllNotificationsRead: (username) => `${API_BASE_URL}/api/auth/notifications/mark-all-read/${username}`,
    clearNotifications: (username) => `${API_BASE_URL}/api/auth/notifications/clear/${username}`,
    unreadNotifications: (username) => `${API_BASE_URL}/api/auth/notifications/unread/${username}`,
    urgentNotifications: (username) => `${API_BASE_URL}/api/auth/notifications/urgent/${username}`,
    markNotificationRead: (notificationId) => `${API_BASE_URL}/api/auth/notifications/${notificationId}/read`,
    notification: (notificationId) => `${API_BASE_URL}/api/auth/notifications/${notificationId}`,
    checkAdminChatNotification: (username, message) => 
        `${API_BASE_URL}/api/auth/notifications/admin/chat?username=${encodeURIComponent(username)}&message=${encodeURIComponent(message)}`,
    
    
    chatMessages: `${API_BASE_URL}/api/auth/chat/messages`,
    chatUserMessages: (username) => `${API_BASE_URL}/api/auth/chat/messages/user/${username}`,
    markChatRead: (messageId) => `${API_BASE_URL}/api/auth/chat/messages/${messageId}/read`,
    markAdminChatRead: `${API_BASE_URL}/api/auth/chat/messages/mark-admin-read`,
    
    
    adminStatus: `${API_BASE_URL}/api/auth/admin/status`,
    adminOnline: `${API_BASE_URL}/api/auth/admin-online`,
    
   
    subscription: (username) => `${API_BASE_URL}/api/auth/subscriptions/lawyer/${username}`,
    subscriptionStatus: (username) => `${API_BASE_URL}/api/auth/subscriptions/lawyer/${username}/status`,
    subscriptionDays: (username) => `${API_BASE_URL}/api/auth/subscriptions/lawyer/${username}/days-remaining`,
    subscriptionCount: `${API_BASE_URL}/api/auth/subscriptions/count`,
    
   
    mapLCs: `${API_BASE_URL}/api/map/lcs`,
    mapLawyers: `${API_BASE_URL}/api/map/lawyers`,
    mapLegalAid: `${API_BASE_URL}/api/map/legal-aid`,
    
   
    health: `${API_BASE_URL}/api/auth/health`,
    
    
    contactRequests: `${API_BASE_URL}/api/contact-requests`,
    contactRequestIncoming: (username) => `${API_BASE_URL}/api/contact-requests/incoming/${username}`,
    contactRequestUser: (username) => `${API_BASE_URL}/api/contact-requests/user/${username}`,
    acceptContactRequest: (id) => `${API_BASE_URL}/api/contact-requests/${id}/accept`,
    denyContactRequest: (id) => `${API_BASE_URL}/api/contact-requests/${id}/deny`,
    
    
    legalAlertsAPI: `${API_BASE_URL}/api/legal-alerts`,
    
    
    aiChat: `${API_BASE_URL}/api/ai/chat`,
    translate: `${API_BASE_URL}/api/translate`,
    aiEmergencyChat: `${API_BASE_URL}/api/ai/emergency/chat`,
    adminSearch: `${API_BASE_URL}/api/admin/search`,
    
    
    deleteOrganization: (username) => `${API_BASE_URL}/api/auth/organizations/${username}`,

    
    submitVerification:   `${API_BASE_URL}/api/auth/verification/submit`,
    adminStatistics:      `${API_BASE_URL}/api/admin/statistics`,
    verificationStatus:   (username) => `${API_BASE_URL}/api/auth/users/${username}/verification-status`,
    verifyApprove:        (username) => `${API_BASE_URL}/api/auth/users/${username}/verify/approve`,
    verifyReject:         (username) => `${API_BASE_URL}/api/auth/users/${username}/verify/reject`
};


if (typeof determineLawyerSpecialization === 'function') {
    cases.forEach(function(c){
        if (!c.assignedSpecialization) {
            c.assignedSpecialization = determineLawyerSpecialization(c.caseType);
        }
    });
}





const ugandaCoordinates = {
    districts: {
        'Kampala': { lat: 0.3136, lng: 32.5811 },
        'Wakiso': { lat: 0.4042, lng: 32.5292 },
        'Mukono': { lat: 0.3538, lng: 32.7553 },
        'Jinja': { lat: 0.4244, lng: 33.2041 },
        'Mbale': { lat: 1.0821, lng: 34.1750 },
        'Gulu': { lat: 2.7806, lng: 32.2967 },
        'Mbarara': { lat: -0.6072, lng: 30.6545 },
        'Kasese': { lat: 0.1833, lng: 30.0833 },
        'Arua': { lat: 3.0300, lng: 30.9100 },
        'Lira': { lat: 2.2450, lng: 32.9000 },
        'Soroti': { lat: 1.7146, lng: 33.6111 },
        'Fort Portal': { lat: 0.6710, lng: 30.2750 },
        'Kabale': { lat: -1.2500, lng: 29.9900 },
        'Masaka': { lat: -0.3163, lng: 31.7350 },
        'Entebbe': { lat: 0.0512, lng: 32.4637 },
        'Mityana': { lat: 0.4183, lng: 32.0228 },
        'Kayunga': { lat: 0.7025, lng: 32.8886 },
        'Luwero': { lat: 0.8667, lng: 32.4667 },
        'Kamuli': { lat: 0.9472, lng: 33.1197 },
        'Iganga': { lat: 0.6092, lng: 33.4861 },
        'Tororo': { lat: 0.6876, lng: 34.1814 },
        'Bushenyi': { lat: -0.5372, lng: 30.1908 },
        'Kitgum': { lat: 3.2783, lng: 32.8867 },
        'Pader': { lat: 2.8000, lng: 33.0000 },
        'Apac': { lat: 1.9756, lng: 32.5386 },
        'Nebbi': { lat: 2.4783, lng: 31.0883 },
        'Yumbe': { lat: 3.4667, lng: 31.2500 },
        'Koboko': { lat: 3.4167, lng: 30.9667 },
        'Moyo': { lat: 3.6500, lng: 31.7167 },
        'Adjumani': { lat: 3.3667, lng: 31.7833 },
        'Busia': { lat: 0.4600, lng: 34.1100 },
        'Kapchorwa': { lat: 1.3964, lng: 34.4439 },
        'Kumi': { lat: 1.4833, lng: 33.9333 },
        'Pallisa': { lat: 1.1450, lng: 33.7094 },
        'Sironko': { lat: 1.2333, lng: 34.2667 },
        'Manafwa': { lat: 0.8833, lng: 34.2833 },
        'Bududa': { lat: 1.0000, lng: 34.3333 },
        'Bulambuli': { lat: 1.3167, lng: 34.2833 },
        'Budadiri': { lat: 1.0167, lng: 34.3333 },
        'Kween': { lat: 1.4333, lng: 34.5167 },
        'Bukwo': { lat: 1.4500, lng: 34.6000 },
        'Zombo': { lat: 2.5167, lng: 30.9000 },
        'Kyankwanzi': { lat: 0.8667, lng: 31.8000 },
        'Nakasongola': { lat: 1.3167, lng: 32.4667 },
        'Nakapiripirit': { lat: 1.8333, lng: 34.7167 },
        'Moroto': { lat: 2.5333, lng: 34.6667 },
        'Kotido': { lat: 3.0167, lng: 34.1167 },
        'Kaabong': { lat: 3.5167, lng: 34.1333 },
        'Abim': { lat: 2.7000, lng: 33.6667 },
        'Amuru': { lat: 2.8333, lng: 32.0000 },
        'Nwoya': { lat: 2.6333, lng: 32.0000 },
        'Lamwo': { lat: 3.5333, lng: 32.8000 },
        'Agago': { lat: 3.0000, lng: 33.0000 },
        'Otuke': { lat: 2.5000, lng: 33.5000 },
        'Dokolo': { lat: 1.9000, lng: 33.0000 },
        'Amolatar': { lat: 1.6333, lng: 32.8333 },
        'Alebtong': { lat: 2.2333, lng: 33.2167 },
        'Omoro': { lat: 2.7000, lng: 32.5000 },
        'Kole': { lat: 2.3000, lng: 32.8000 },
        'Oyam': { lat: 2.2333, lng: 32.3833 },
        'Kwania': { lat: 2.0000, lng: 33.0000 },
        'Ngora': { lat: 1.4000, lng: 33.8000 },
        'Serere': { lat: 1.5000, lng: 33.5000 },
        'Kaberamaido': { lat: 1.7500, lng: 33.2000 },
        'Bukedea': { lat: 1.3333, lng: 34.0500 },
        'Budaka': { lat: 1.0167, lng: 33.9333 },
        'Butaleja': { lat: 0.9167, lng: 33.9500 },
        'Namutumba': { lat: 0.8333, lng: 33.6833 },
        'Kaliro': { lat: 0.9000, lng: 33.5000 },
        'Buyende': { lat: 1.1500, lng: 33.1500 },
        'Luuka': { lat: 0.7000, lng: 33.3000 },
        'Mayuge': { lat: 0.4500, lng: 33.5000 },
        'Bugiri': { lat: 0.5667, lng: 33.7500 },
        'Busembatia': { lat: 0.5167, lng: 33.6667 },
        'Namayingo': { lat: 0.3833, lng: 33.8500 },
        'Kampala': { lat: 0.3136, lng: 32.5811 },
        'Wakiso': { lat: 0.4042, lng: 32.5292 },
        'Mukono': { lat: 0.3538, lng: 32.7553 }
    },
    
    lcOffices: [
        { name: 'Kampala Central LC1', district: 'Kampala', lat: 0.3136, lng: 32.5811 },
        { name: 'Kampala Central LC2', district: 'Kampala', lat: 0.3150, lng: 32.5830 },
        { name: 'Kampala Central LC3', district: 'Kampala', lat: 0.3165, lng: 32.5850 },
        { name: 'Nakawa LC1', district: 'Kampala', lat: 0.3350, lng: 32.6100 },
        { name: 'Makindye LC1', district: 'Kampala', lat: 0.2900, lng: 32.5700 },
        { name: 'Rubaga LC1', district: 'Kampala', lat: 0.3000, lng: 32.5500 },
        { name: 'Kawempe LC1', district: 'Kampala', lat: 0.3700, lng: 32.5300 },
        { name: 'Wakiso District LC3', district: 'Wakiso', lat: 0.4040, lng: 32.4190 },
        { name: 'Entebbe LC1', district: 'Wakiso', lat: 0.0512, lng: 32.4637 },
        { name: 'Gulu District LC3', district: 'Gulu', lat: 2.7724, lng: 32.2881 },
        { name: 'Jinja District LC3', district: 'Jinja', lat: 0.4244, lng: 33.2042 },
        { name: 'Mbarara District LC3', district: 'Mbarara', lat: -0.6072, lng: 30.6545 },
        { name: 'Masaka District LC3', district: 'Masaka', lat: -0.3163, lng: 31.7351 },
        { name: 'Mbale District LC3', district: 'Mbale', lat: 1.0784, lng: 34.1810 },
        { name: 'Lira District LC3', district: 'Lira', lat: 2.2357, lng: 32.8999 }
    ],
    
    legalAidOffices: [
        { name: 'Legal Aid Clinic - Kampala', lat: 0.3136, lng: 32.5811, phone: '+256 414 531 250' },
        { name: 'Barefoot Law - Kampala', lat: 0.3150, lng: 32.5830, phone: '0800 100 400' },
        { name: 'Uganda Law Society - Kampala', lat: 0.3160, lng: 32.5840, phone: '+256 414 347 594' },
        { name: 'Legal Aid Clinic - Jinja', lat: 0.4244, lng: 33.2042, phone: '+256 434 123 456' },
        { name: 'Legal Aid Clinic - Mbarara', lat: -0.6072, lng: 30.6545, phone: '+256 485 123 456' },
        { name: 'Legal Aid Clinic - Gulu', lat: 2.7724, lng: 32.2881, phone: '+256 471 123 456' }
    ]
};
window._safeUC = function() { try { return ugandaCoordinates; } catch(e) { return null; } };
window._safeUD = function() { try { return ugandaDistricts; } catch(e) { return null; } };