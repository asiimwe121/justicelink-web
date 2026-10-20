











var UGANDA_REGION_MAP = {
    'Central': [
        'Kampala', 'Wakiso', 'Mukono', 'Kayunga', 'Luwero', 'Nakaseke',
        'Mityana', 'Mubende', 'Kiboga', 'Kyankwanzi', 'Butambala',
        'Gomba', 'Kalungu', 'Masaka', 'Bukomansimbi', 'Sembabule',
        'Lyantonde', 'Rakai', 'Kyotera', 'Lwengo'
    ],
    'Western': [
        'Mbarara', 'Kiruhura', 'Ntungamo', 'Bushenyi', 'Sheema',
        'Kasese', 'Bundibugyo', 'Kabale', 'Kisoro', 'Kanungu',
        'Rukungiri', 'Ibanda', 'Kamwenge', 'Kyenjojo', 'Kabarole',
        'Buliisa', 'Hoima', 'Masindi', 'Kibaale', 'Kagadi',
        'Kakumiro', 'Rubirizi', 'Rukiga', 'Rubanda', 'Mitooma'
    ],
    'Eastern': [
        'Jinja', 'Kamuli', 'Iganga', 'Mayuge', 'Bugiri', 'Busia',
        'Tororo', 'Mbale', 'Sironko', 'Kapchorwa', 'Kumi', 'Soroti',
        'Katakwi', 'Moroto', 'Nakapiripirit', 'Pallisa', 'Kaberamaido',
        'Bukedea', 'Bulambuli', 'Budaka', 'Butaleja', 'Namutumba',
        'Kibuku', 'Butebo', 'Kapelebyong', 'Serere', 'Ngora'
    ],
    'Northern': [
        'Gulu', 'Lira', 'Apac', 'Oyam', 'Kitgum', 'Pader', 'Kotido',
        'Kaabong', 'Nebbi', 'Arua', 'Moyo', 'Adjumani', 'Amuru',
        'Lamwo', 'Agago', 'Otuke', 'Alebtong', 'Amolatar', 'Dokolo',
        'Kwania', 'Omoro', 'Nwoya', 'Pakwach', 'Zombo', 'Yumbe',
        'Koboko', 'Maracha', 'Terego', 'Madi-Okollo'
    ]
};

function _aiIsSameRegion(district1, district2) {
    if (!district1 || !district2) return false;
    if (district1 === district2) return true;
    var region1 = null, region2 = null;
    for (var region in UGANDA_REGION_MAP) {
        var districts = UGANDA_REGION_MAP[region];
        if (districts.indexOf(district1) !== -1) region1 = region;
        if (districts.indexOf(district2) !== -1) region2 = region;
        if (region1 && region2) break;
    }
    return !!region1 && region1 === region2;
}

function _aiGetAllLawyersFromLocalStorage() {
    var allLawyers = [];
    if (typeof _lcdjp_user_index === 'undefined') return allLawyers;
    Object.keys(_lcdjp_user_index).forEach(function (key) {
        if (!key || key.indexOf('user_') !== 0) return;
        var user = _lcdjp_user_index[key] || {};
        if (user.userType === 'Lawyer' && user.approvalStatus === 'Approved') {
            allLawyers.push(user);
        }
    });
    return allLawyers;
}

async function _aiFetchAllLawyers() {
    try {
        var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
        var response = await fetch(API_ENDPOINTS.users, { headers: headers });
        if (!response.ok) throw new Error('Failed to fetch lawyers from API');
        var data = await response.json();
        return (data.users || []).filter(function (u) {
            return u.role === 'Lawyer' && u.approvalStatus === 'Approved';
        });
    } catch (err) {
        console.warn('[AI Matching] API lawyer list unavailable, using local fallback:', err.message);
        return _aiGetAllLawyersFromLocalStorage();
    }
}

function _aiScoreLawyers(lawyers, allCases) {
    allCases = allCases || (window._lcdjpStore && window._lcdjpStore.cases) || [];
    return lawyers.map(function (lawyer) {
        var activeCases = allCases.filter(function (c) {
            return c.assignedLawyer === lawyer.username && c.status !== 'Resolved';
        }).length;
        var totalCases = allCases.filter(function (c) {
            return c.assignedLawyer === lawyer.username;
        }).length;
        return { lawyer: lawyer, score: activeCases * 10 + totalCases };
    }).sort(function (a, b) { return a.score - b.score; }).map(function (s) { return s.lawyer; });
}







async function aiRankLawyerCandidates(caseData) {
    var district = caseData.district || caseData.userDistrict || '';
    var caseType = caseData.caseType || caseData.category || '';
    var requiredSpecialization = (typeof determineLawyerSpecialization === 'function')
        ? determineLawyerSpecialization(caseType) : 'General';

    var allLawyers = await _aiFetchAllLawyers();
    if (!allLawyers.length) return [];

    var specialized = allLawyers.filter(function (l) {
        return l.specialization === requiredSpecialization ||
            l.lawyerSpecialization === requiredSpecialization ||
            l.specialization === caseType;
    });
    var pool = specialized.length ? specialized : allLawyers;

    var active = pool.filter(function (l) {
        return l.subscriptionStatus === 'Active' &&
            (l.subscriptionDays === undefined || l.subscriptionDays > 0);
    });
    if (!active.length) active = pool;

    var districtTier = district ? active.filter(function (l) {
        return (l.district || '').toLowerCase() === district.toLowerCase();
    }) : [];
    var regionTier = district ? active.filter(function (l) {
        return districtTier.indexOf(l) === -1 && _aiIsSameRegion(l.district || '', district);
    }) : [];
    var restTier = active.filter(function (l) {
        return districtTier.indexOf(l) === -1 && regionTier.indexOf(l) === -1;
    });

    return _aiScoreLawyers(districtTier)
        .concat(_aiScoreLawyers(regionTier))
        .concat(_aiScoreLawyers(restTier));
}








async function getAllLegalOrganizations() {
    try {
        var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
        var response = await fetch(API_ENDPOINTS.legalOrganizations, { headers: headers });
        if (!response.ok) throw new Error('Failed to fetch legal organisations');
        var data = await response.json();
        var orgs = data.organizations || data.data || (Array.isArray(data) ? data : []);
        if (orgs.length) return orgs;
        throw new Error('empty');
    } catch (err) {
        console.warn('[AI Matching] Legal organisation directory unavailable:', err.message);
        try {
            var stored = JSON.parse(localStorage.getItem('lcdjp_legal_organizations') || '[]');
            if (stored.length) return stored;
        } catch (e) {  }
        return [];
    }
}



function _aiGetAllLCOfficialsFromLocalStorage() {
    var allLC = [];
    if (typeof _lcdjp_user_index === 'undefined') return allLC;
    Object.keys(_lcdjp_user_index).forEach(function (key) {
        if (!key || key.indexOf('user_') !== 0) return;
        var user = _lcdjp_user_index[key] || {};
        var role = (user.role || user.userType || '').toString().toLowerCase();
        var isLC = role === 'lc' || role === 'lc official' || role.indexOf('lc1') === 0 ||
            role.indexOf('lc2') === 0 || role.indexOf('lc3') === 0;
        if (isLC && (!user.approvalStatus || user.approvalStatus === 'Approved')) {
            allLC.push(user);
        }
    });
    return allLC;
}

async function _aiFetchAllLCOfficials() {
    try {
        var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
        var response = await fetch(API_ENDPOINTS.users, { headers: headers });
        if (!response.ok) throw new Error('Failed to fetch LC officials from API');
        var data = await response.json();
        return (data.users || []).filter(function (u) {
            var role = (u.role || u.userType || '').toString().toLowerCase();
            var isLC = role === 'lc' || role === 'lc official' || role.indexOf('lc1') === 0 ||
                role.indexOf('lc2') === 0 || role.indexOf('lc3') === 0;
            return isLC && (!u.approvalStatus || u.approvalStatus === 'Approved');
        });
    } catch (err) {
        console.warn('[AI Matching] API LC list unavailable, using local fallback:', err.message);
        return _aiGetAllLCOfficialsFromLocalStorage();
    }
}

function _aiNormalizeLocPart(v) {
    return (v || '').toString().trim().toLowerCase();
}

/**
 * Registered LC officials who serve the citizen's own area at the given level (LC1, LC2 or LC3). The server
 * matches the whole area chain, so the LC of a different village, parish or sub-county is never returned.
 */
async function aiFindRegisteredLCForLevel(location, level) {
    location = location || {};
    level = level || 'LC1';
    if (!location.district) return [];
    var params = { level: level, district: location.district,
        subCounty: location.subCounty || location.sub_county, parish: location.parish, village: location.village };
    var qs = Object.keys(params).filter(function (k) { return params[k]; })
        .map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    try {
        var response = await fetch(API_BASE_URL + '/api/map/lcs?' + qs);
        if (!response.ok) return [];
        var rows = await response.json();
        return Array.isArray(rows) ? rows : [];
    } catch (err) {
        return [];
    }
}

async function aiFindRegisteredLCForVillage(location) {
    return aiFindRegisteredLCForLevel(location, 'LC1');
}

var _AI_ADVICE_SPEC_KEYWORDS = {
    'Family Lawyer': ['family', 'marriage', 'custody', 'divorce', 'inheritance', 'domestic'],
    'Land & Property Lawyer': ['land', 'boundary', 'property', 'title', 'tenant', 'eviction'],
    'Civil Litigation Lawyer': ['debt', 'contract', 'loan', 'civil suit', 'breach'],
    'Corporate & Commercial Lawyer': ['business', 'company', 'commercial', 'trade'],
    'Legal Aid Advocate': ['community', 'mediation'],
    'General Legal Practitioner': []
};

function _aiGuessSpecializationFromText(text) {
    var t = (text || '').toLowerCase();
    if (!t) return null;
    var best = null, bestHits = 0;
    Object.keys(_AI_ADVICE_SPEC_KEYWORDS).forEach(function (spec) {
        var hits = _AI_ADVICE_SPEC_KEYWORDS[spec].filter(function (kw) { return t.indexOf(kw) !== -1; }).length;
        if (hits > bestHits) { bestHits = hits; best = spec; }
    });
    return bestHits > 0 ? best : null;
}

function aiGetLatestHandlerAdvice(caseData) {
    caseData = caseData || {};
    var history = Array.isArray(caseData.previousHandlers) ? caseData.previousHandlers.slice() : [];
    var last = history.length ? history[history.length - 1] : null;

    var noteText = caseData.lc_referral_notes || caseData.previous_handler_advice ||
        (last && (last.notes || last.advice)) || '';
    var advisorRole = (last && last.role) || caseData.referred_by_role || '';
    var advisorName = (last && (last.name || last.username)) || caseData.referred_by || '';

    if (!noteText) return null;

    return {
        advisorName: advisorName,
        advisorRole: advisorRole,
        adviceText: noteText,
        at: (last && last.at) || null
    };
}

function aiEvaluatePreviousAdvice(caseData) {
    caseData = caseData || {};
    var advice = aiGetLatestHandlerAdvice(caseData);
    if (!advice) return null;

    var caseType = caseData.caseType || caseData.case_type || caseData.category || '';
    var expectedSpec = (typeof determineLawyerSpecialization === 'function')
        ? determineLawyerSpecialization(caseType) : null;
    var suggestedSpec = _aiGuessSpecializationFromText(advice.adviceText) || expectedSpec;

    var agrees = !expectedSpec || !suggestedSpec || suggestedSpec === expectedSpec;

    return {
        advisorName: advice.advisorName,
        advisorRole: advice.advisorRole,
        adviceText: advice.adviceText,
        suggestedSpecialization: suggestedSpec,
        expectedSpecialization: expectedSpec,
        agreesWithAdvice: agrees,
        reasoning: agrees
            ? 'The specialization implied by the note lines up with this case type.'
            : ('The note points toward ' + suggestedSpec + ', but this case type usually calls for ' +
                expectedSpec + ' — worth double-checking with the citizen before narrowing the search.')
    };
}

window.aiRankLawyerCandidates = aiRankLawyerCandidates;
window.getAllLegalOrganizations = getAllLegalOrganizations;
window.aiFindRegisteredLCForVillage = aiFindRegisteredLCForVillage;
window.aiFindRegisteredLCForLevel = aiFindRegisteredLCForLevel;
window.aiGetLatestHandlerAdvice = aiGetLatestHandlerAdvice;
window.aiEvaluatePreviousAdvice = aiEvaluatePreviousAdvice;
