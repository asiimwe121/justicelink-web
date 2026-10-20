


(function () {
  
  
  
  
  
  window.closeCaseDetails = function () {

    if (typeof currentAudio !== 'undefined' && currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.src = '';
        currentAudio.load();
      } catch (_e) {}
      currentAudio = null;
      if (typeof currentPlayBtn !== 'undefined') currentPlayBtn = null;
    }

    var modal = document.getElementById('caseDetailsModal');
    
    
    
    
    if (modal && modal.style.display === 'block' && typeof window.unlockScroll === 'function') window.unlockScroll();
    if (modal) modal.style.display = 'none';
    var content = document.getElementById('caseDetailsContent');
    if (content) content.innerHTML = '';

    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();

    var mp = document.getElementById('mobileCitizenMessagesPanel');
    if (mp) mp.remove();

    var cp = document.getElementById('mobileCitizenCasesPanel');
    if (cp) cp.remove();

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    ['mobileLawyerNotificationsPanel', 'mobileAdminNotificationsPanel'].forEach(function (id) {
      var panel = document.getElementById(id);
      if (!panel) return;
      var closeBtn = panel.querySelector('.mobile-role-panel-close');
      if (closeBtn) closeBtn.click();
      else panel.remove();
    });

    var userLevel = sessionStorage.getItem('lcdjp_userlevel');

    if (userLevel === 'LC' || userLevel === 'LC Official' || userLevel === 'LC1' || userLevel === 'LC2' || userLevel === 'LC3') {
      
      if (typeof showLcDashboard === 'function') {
        showLcDashboard();
      } else if (typeof showHome === 'function') showHome();
    } else if (userLevel === 'Citizen') {
      
      
      
      if (typeof showHome === 'function') showHome();
    } else if (userLevel === 'Lawyer') {
      if (typeof showLawyerDashboard === 'function') showLawyerDashboard();
      setTimeout(function () { if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases(); }, 300);
    } else if (isAdmin(userLevel)) {
      if (typeof showAdminApprovals === 'function') showAdminApprovals();
    } else {
      if (typeof showHome === 'function') showHome();
    }
  };
}());


(function () {
  
  if (typeof showHome === 'function') {
    var _origSH = showHome;
    window.showHome = function () {
      _origSH.apply(this, arguments);
      if (window.innerWidth <= 767 && sessionStorage.getItem('lcdjp_userlevel') === 'Citizen') {
        document.body.classList.add('mobile-home-active');
      } else {
        document.body.classList.remove('mobile-home-active');
      }
    };
  }
  
  var _origOpenMob = window.openMobileSection;
  window.openMobileSection = function (role, title, fn) {
    document.body.classList.remove('mobile-home-active');
    if (typeof _origOpenMob === 'function') _origOpenMob.call(this, role, title, fn);
    else if (typeof fn === 'function') fn();
  };
  var _origMobMsg = window.mobileCitizenMessages;
  window.mobileCitizenMessages = function () {
    document.body.classList.remove('mobile-home-active');
    if (typeof _origMobMsg === 'function') _origMobMsg.call(this);
  };
}());


window.mobileCitizenCases = function () {
  if (window.innerWidth > 767) {
    if (typeof showMyCases === 'function') showMyCases();
    return;
  }
  document.body.classList.remove('mobile-home-active');

  var content = document.getElementById('contentArea');
  if (!content) return;
  if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

  
  var old = document.getElementById('mobileCitizenCasesPanel');
  if (old) old.remove();

  var panel = document.createElement('section');
  panel.id = 'mobileCitizenCasesPanel';
  panel.className = 'mobile-messages-panel';
  panel.innerHTML =
    '<div class="mobile-role-panel-head">' +
      '<h2>My Cases</h2>' +
      '<button class="mobile-role-panel-close" aria-label="Back">&times;</button>' +
    '</div>' +
    '<div id="mobileCitizenCasesList" style="margin-top:14px;">Loading cases…</div>';

  panel.querySelector('button').onclick = function () {
    panel.remove();
    if (typeof showHome === 'function') showHome();
  };
  content.appendChild(panel);

  var username = typeof getLcdjpActiveUsername === 'function'
    ? getLcdjpActiveUsername()
    : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
  if (!username) {
    document.getElementById('mobileCitizenCasesList').textContent = 'Please sign in to view cases.';
    return;
  }

  var apiOk = (typeof API_ENDPOINTS !== 'undefined') && typeof API_ENDPOINTS.citizenCases === 'function';
  if (!apiOk) {
    document.getElementById('mobileCitizenCasesList').textContent = 'Service unavailable, please refresh.';
    return;
  }
    if (typeof window._lcdjpProtectedDataAccessAllowed === 'function' &&
        !window._lcdjpProtectedDataAccessAllowed()) {
        document.getElementById('mobileCitizenCasesList').innerHTML =
          '<div class="mobile-role-panel-empty">' +
            '<div class="mobile-role-panel-empty-icon">&#128274;</div>' +
            '<p>Identity verification is required to view your cases.</p>' +
            '<button type="button" onclick="typeof _lcdjpStartVerification===\'function\' ? _lcdjpStartVerification() : null">Verify Now</button>' +
          '</div>';
        return;
    }

  
  
  
  var token = typeof getLcdjpActiveToken === 'function'
    ? getLcdjpActiveToken()
    : ((typeof getAuthToken === 'function' ? getAuthToken() : null));
  
    fetch(API_ENDPOINTS.citizenCases(username), {
    suppressAuthRedirect: true,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      
      var cases = (data && data.success && Array.isArray(data.cases))
        ? data.cases
        : (Array.isArray(data) ? data : []);

      var list = document.getElementById('mobileCitizenCasesList');
      if (!list) return;

      if (!cases.length) {
        list.innerHTML =
          '<p style="text-align:center;color:#667085;padding:24px 0;">You haven\'t filed any cases yet.</p>';
        return;
      }

      list.innerHTML = cases.map(function (c) {
        var ref   = c.caseReference || c.caseNumber || (c.id ? String(c.id) : '') || '';
        var type  = c.case_type  || c.caseType  || 'Case';
        var status = c.status || 'Pending';
        var statusColor = status === 'Resolved' ? '#28a745'
                        : status.startsWith('Forwarded') ? '#ff9800'
                        : '#1a4080';
        var escapedRef = ref ? String(ref).replace(/'/g, '\\\'') : '';
        var actionMarkup = ref
          ? '<button type="button" ' +
              'onclick="viewCitizenCase(\'' + escapedRef + '\')" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#16305c;' +
                     'border:1px solid #16305c;border-radius:8px;cursor:pointer;">View</button>' +
            '<button type="button" ' +
              
              
              
              
              
              
              'onclick="openCitizenMessaging(\'' + escapedRef + '\')" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#1a4080;' +
                     'border:1px solid #1a4080;border-radius:8px;cursor:pointer;">Message</button>' +
            '<button type="button" ' +
              'onclick="typeof showDocumentManager===\'function\' ? showDocumentManager(\'' + escapedRef + '\') : null" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#23508f;' +
                     'border:1px solid #23508f;border-radius:8px;cursor:pointer;">Docs</button>' +
            '<button type="button" ' +
              'onclick="typeof showAppendDetailsForm===\'function\' ? showAppendDetailsForm(\'' + escapedRef + '\') : null" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#2c5fa3;' +
                     'border:1px solid #2c5fa3;border-radius:8px;cursor:pointer;">Add Info</button>' +
            '<button type="button" ' +
              'onclick="typeof printCaseDetails===\'function\' ? printCaseDetails(\'' + escapedRef + '\') : null" ' +
              'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;background:#fff;color:#3a6bc7;' +
                     'border:1px solid #3a6bc7;border-radius:8px;cursor:pointer;">Print</button>'
          : '<span style="color:#888;font-size:12px;padding:7px 0;">N/A</span>';
        return (
          '<article style="background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.08);' +
                          'padding:14px 16px;margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
              '<div>' +
                '<strong style="font-size:14px;color:#1a237e;">' + (ref || 'N/A') + '</strong>' +
                '<div style="font-size:12px;color:#555;margin-top:2px;">' + type + '</div>' +
              '</div>' +
              '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:12px;' +
                           'background:' + statusColor + ';color:#fff;white-space:nowrap;">' + status + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">' +
              actionMarkup +
            '</div>' +
          '</article>'
        );
      }).join('');
    })
    .catch(function (error) {
      console.error('Error loading cases:', error);
      var list = document.getElementById('mobileCitizenCasesList');
      if (list) list.innerHTML =
        '<p style="color:#dc3545;text-align:center;">Could not load cases. <button onclick="mobileCitizenCases()" ' +
        'style="margin-top:8px;padding:6px 14px;background:#1a4080;color:#fff;border:none;border-radius:6px;cursor:pointer;">Retry</button></p>';
    });
};


document.addEventListener('click', function (e) {
  var nav = e.target.closest('.cm-nav');
  if (!nav) return;
  var span = nav.querySelector('span');
  if (!span) return;
  
  if (span.textContent.trim().toLowerCase() === 'my cases' && window.innerWidth <= 767) {
    e.stopImmediatePropagation();
    document.querySelectorAll('.cm-nav').forEach(function (n) { n.classList.remove('active'); });
    nav.classList.add('active');
    mobileCitizenCases();
  }
}, true);


(function () {
  if (typeof updateMyCases !== 'function') return;
  var _orig = updateMyCases;
  window.updateMyCases = function () {
    
    var _origFetch = window.fetch;
    window.fetch = function (url, opts) {
      return _origFetch.call(this, url, opts).then(function (resp) {
        if (typeof url === 'string' && url.indexOf('/api/cases/citizen/') !== -1) {
          
          var _origJson = resp.json.bind(resp);
          resp.json = function () {
            return _origJson().then(function (data) {
              if (Array.isArray(data)) {
                return { success: true, cases: data };
              }
              return data;
            });
          };
        }
        return resp;
      });
    };
    try { _orig.apply(this, arguments); } finally { window.fetch = _origFetch; }
  };
}());





document.addEventListener('click', function(e) {
  if (window.innerWidth > 767) return;
  var nav = e.target.closest('.cm-nav');
  if (!nav) return;
  var span = nav.querySelector('span');
  if (!span) return;
  var label = span.textContent.trim().toLowerCase();

  if (label === 'messages') {
    e.stopImmediatePropagation();
    
    document.querySelectorAll('.cm-nav').forEach(function(n) { n.classList.remove('active'); });
    nav.classList.add('active');
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();
    
    document.body.classList.remove('mobile-home-active');
    
    if (typeof mobileCitizenMessages === 'function') mobileCitizenMessages();
  }
}, true);


(function() {
  var _orig = window.mobileCitizenMessages;
  window.mobileCitizenMessages = function() {
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();
    
    var old = document.getElementById('mobileCitizenMessagesPanel');
    if (old) old.remove();
    document.body.classList.remove('mobile-home-active');
    if (typeof _orig === 'function') _orig.apply(this, arguments);
  };
}());







































document.addEventListener('click', function(e) {
  if (window.innerWidth > 767) return;
  var nav = e.target.closest('.lm-nav-item');
  if (!nav) return;
  var span = nav.querySelector('span');
  if (!span) return;
  var label = span.textContent.trim().toLowerCase();

  if (label === 'messages' || label === 'library') {
    e.stopImmediatePropagation();

    document.querySelectorAll('.lm-nav-item').forEach(function(n) { n.classList.remove('active'); });
    nav.classList.add('active');

    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();

    if (label === 'messages') {
      if (typeof mobileLawyerMessages === 'function') mobileLawyerMessages();
    } else {
      if (typeof lawyerOpenResourceCategory === 'function') lawyerOpenResourceCategory('lawLibrary');
    }
  }
}, true);


(function() {
  var _origLawyerMsg = window.mobileLawyerMessages;
  window.mobileLawyerMessages = function() {
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();
    
    var old = document.getElementById('mobileLawyerMessagesPanel');
    if (old) old.remove();
    if (typeof _origLawyerMsg === 'function') _origLawyerMsg.apply(this, arguments);
  };
}());


(function() {
  var mobileStrings = {
    en: {
      portal_citizen:    'CITIZEN PORTAL',
      portal_lc:         'LC OFFICIAL PORTAL',
      portal_lawyer:     'LAWYER PORTAL',
      nav_home:          'Home',
      nav_dashboard:     'Dashboard',
      nav_my_cases:      'My cases',
      nav_messages:      'Messages',
      nav_cases:         'Cases',
      nav_reports:       'Reports',
      nav_more:          'More',
      quick_services:    'Quick services',
      recent_activity:   'Recent activity',
      report_case_short: 'Report case',
      track_case_short:  'Track case',
      find_help_short:   'Find help',
      start_case_btn:    '+ Start a new case',
      no_active_cases:   'No active cases yet.',
      welcome_activity:  'Welcome to JusticeLink',
      use_services:      'Use the services above to report a case or find legal help.',
      messages_hint:     'Open a case conversation to read and send messages.',
      loading_cases:     'Loading cases\u2026',
      no_cases_yet:      "You haven't filed any cases yet.",
      my_cases_title:    'My Cases',
      messages_title:    'Messages',
    },
    lug: {
      portal_citizen:    'OLWEYO LW\'OMUBAKA',
      portal_lc:         'OLWEYO LW\'OMUKULU W\'ESSAZA',
      portal_lawyer:     'OLWEYO LW\'OMUVUUZI',
      nav_home:          'Amatuuze',
      nav_dashboard:     'Ssandaaki',
      nav_my_cases:      'Ebibuuzo byange',
      nav_messages:      'Obubaka',
      nav_cases:         'Ebibuuzo',
      nav_reports:       'Emirimu',
      nav_more:          'Ebirala',
      quick_services:    'Obuweereza obwangu',
      recent_activity:   'Ebikolebwa bino',
      report_case_short: 'Teekateeka omusango',
      track_case_short:  'Kulakulana n\'omusango',
      find_help_short:   'Nonya obuyambi',
      start_case_btn:    '+ Tandika omusango omupya',
      no_active_cases:   'Tewali misango erimu.',
      welcome_activity:  'Tukusanyukidde ku JusticeLink',
      use_services:      'Kozesa obuweereza okuteekateeka omusango oba kunonya obuyambi.',
      messages_hint:     'Ggula okuganana kw\'omusango okusoma n\'okutuma obubaka.',
      loading_cases:     'Ebibuuzo biri ku kulondebwa\u2026',
      no_cases_yet:      'Towandise musango naali.',
      my_cases_title:    'Ebibuuzo byange',
      messages_title:    'Obubaka',
    },
    ach: {
      portal_citizen:    'WANGOO ME JO',
      portal_lc:         'WANGOO ME JAMI ME LC',
      portal_lawyer:     'WANGOO ME LAWER',
      nav_home:          'Ot',
      nav_dashboard:     'Got',
      nav_my_cases:      'Lok an',
      nav_messages:      'Lok buca',
      nav_cases:         'Lok',
      nav_reports:       'Pingo',
      nav_more:          'Mukene',
      quick_services:    'Tic ma oyot',
      recent_activity:   'Gin ma timme nino ni',
      report_case_short: 'Nyer lok',
      track_case_short:  'Nyil lok',
      find_help_short:   'Yeny kony',
      start_case_btn:    '+ Cak lok manyen',
      no_active_cases:   'Lok mo peke.',
      welcome_activity:  'Bin JusticeLink',
      use_services:      'Tic kede tic mewa me nyer lok onyo yeny kony.',
      messages_hint:     'Yab lok me lok buca me willo ki tero lok.',
      loading_cases:     'Tye ka nongo lok\u2026',
      no_cases_yet:      'Pe iketo lok mo pud.',
      my_cases_title:    'Lok an',
      messages_title:    'Lok buca',
    },
    teo: {
      portal_citizen:    'PORTAL YA MUNTU',
      portal_lc:         'PORTAL YA AKITUR LC',
      portal_lawyer:     'PORTAL YA ERIAT',
      nav_home:          'Awi',
      nav_dashboard:     'Edebe',
      nav_my_cases:      'Ebia gwange',
      nav_messages:      'Emwang\'a',
      nav_cases:         'Ebia',
      nav_reports:       'Etamani',
      nav_more:          'Aike',
      quick_services:    'Eimoria kwoton',
      recent_activity:   'Eitim ejore',
      report_case_short: 'Loosa ebia',
      track_case_short:  'Kuata ebia',
      find_help_short:   'Naa aisak',
      start_case_btn:    '+ Dorop ebia emam',
      no_active_cases:   'Ebia peke.',
      welcome_activity:  'Atabo JusticeLink',
      use_services:      'Tur eimoria loosa ebia bo naa aisak.',
      messages_hint:     'Agwal emwanga ya ebia kadio nuk bo tos emwanga.',
      loading_cases:     'Tye ka nongo ebia\u2026',
      no_cases_yet:      'Iyat loosa ebia mo peke.',
      my_cases_title:    'Ebia gwange',
      messages_title:    'Emwang\'a',
    },
    lgg: {
      portal_citizen:    'PORTAL YA MZEE WA JAMII',
      portal_lc:         'PORTAL YA AFISA WA LC',
      portal_lawyer:     'PORTAL YA WAKILI',
      nav_home:          'Nyumba',
      nav_dashboard:     'Dashibodi',
      nav_my_cases:      'Kesi zangu',
      nav_messages:      'Ujumbe',
      nav_cases:         'Kesi',
      nav_reports:       'Ripoti',
      nav_more:          'Zaidi',
      quick_services:    'Huduma za haraka',
      recent_activity:   'Shughuli za hivi karibuni',
      report_case_short: 'Ripoti kesi',
      track_case_short:  'Fuatilia kesi',
      find_help_short:   'Tafuta msaada',
      start_case_btn:    '+ Anza kesi mpya',
      no_active_cases:   'Hakuna kesi zinazoendelea.',
      welcome_activity:  'Karibu JusticeLink',
      use_services:      'Tumia huduma hii kuripoti kesi au kutafuta msaada wa kisheria.',
      messages_hint:     'Fungua mazungumzo ya kesi kusoma na kutuma ujumbe.',
      loading_cases:     'Inasomea kesi\u2026',
      no_cases_yet:      'Bado haujafungua kesi yoyote.',
      my_cases_title:    'Kesi zangu',
      messages_title:    'Ujumbe',
    },
    nyn: {
      portal_citizen:    'PORTAL Y\'OMUNTU',
      portal_lc:         'PORTAL Y\'OMUKURU W\'ESSAZA',
      portal_lawyer:     'PORTAL Y\'OMUVUUZI',
      nav_home:          'Akaaro',
      nav_dashboard:     'Dashibodi',
      nav_my_cases:      'Amabuzo gangu',
      nav_messages:      'Ebirukwa',
      nav_cases:         'Amabuzo',
      nav_reports:       'Ripoti',
      nav_more:          'Ebirala',
      quick_services:    'Obushaho obuteebwa',
      recent_activity:   'Ibyakozwe buno',
      report_case_short: 'Bwira omubuzo',
      track_case_short:  'Kurikirana omubuzo',
      find_help_short:   'Ronda obuyambi',
      start_case_btn:    '+ Tandika omubuzo omushya',
      no_active_cases:   'Nta mubuzo uri gukorwa.',
      welcome_activity:  'Turakwakira kuri JusticeLink',
      use_services:      'Kozesa obushaho kubwira omubuzo oba kuronda obuyambi.',
      messages_hint:     'Gura okukweganaiza kw\'omubuzo okusoma no kutuma ebirukwa.',
      loading_cases:     'Amabuzo ari gushakishwa\u2026',
      no_cases_yet:      'Ntawe wabuza omubuzo nawe.',
      my_cases_title:    'Amabuzo gangu',
      messages_title:    'Ebirukwa',
    },
  };

  function translateEl(sel, key, t) {
    var els = document.querySelectorAll(sel);
    els.forEach(function(el) {
      if (t[key] !== undefined) el.textContent = t[key];
    });
  }
  

  window.translateMobileUI = function(lang) {
    var t = mobileStrings[lang] || mobileStrings.en;

    
    translateEl('.cm-greeting p',                               'portal_citizen',    t);
    translateEl('#cmGreeting',                                  'nav_home',          t);
    
    var cmNavs = document.querySelectorAll('.cm-bottom-nav .cm-nav span');
    var cmLabels = ['nav_home', 'nav_my_cases', 'nav_messages', 'nav_more'];
    cmNavs.forEach(function(span, i) { if (cmLabels[i] && t[cmLabels[i]]) span.textContent = t[cmLabels[i]]; });
    
    var cmHeads = document.querySelectorAll('.cm-section-head h2');
    if (cmHeads[0]) cmHeads[0].textContent = t.quick_services    || cmHeads[0].textContent;
    if (cmHeads[1]) cmHeads[1].textContent = t.recent_activity   || cmHeads[1].textContent;
    
    var cmShortcuts = document.querySelectorAll('.cm-shortcut span');
    var shortcutKeys = ['report_case_short','track_case_short','find_help_short'];
    cmShortcuts.forEach(function(span, i) { if (shortcutKeys[i] && t[shortcutKeys[i]]) span.textContent = t[shortcutKeys[i]]; });
    
    var cmNewBtn = document.querySelector('.cm-new-btn');
    if (cmNewBtn) cmNewBtn.textContent = t.start_case_btn || cmNewBtn.textContent;
    
    var cmNoCase = document.querySelector('.cm-no-case');
    if (cmNoCase) cmNoCase.textContent = t.no_active_cases || cmNoCase.textContent;
    var cmActivityStrong = document.querySelector('.cm-activity .cm-activity-row strong');
    if (cmActivityStrong) cmActivityStrong.textContent = t.welcome_activity || cmActivityStrong.textContent;
    var cmActivityP = document.querySelector('.cm-activity .cm-activity-row p');
    if (cmActivityP) cmActivityP.textContent = t.use_services || cmActivityP.textContent;

    
    

    var msgTitle = document.querySelector('#mobileCitizenMessagesPanel .mobile-role-panel-head h2');
    if (msgTitle) msgTitle.textContent = t.messages_title || msgTitle.textContent;
    var msgHint = document.querySelector('#mobileCitizenMessagesPanel > p');
    if (msgHint) msgHint.textContent = t.messages_hint || msgHint.textContent;
    var caseTitle = document.querySelector('#mobileCitizenCasesPanel .mobile-role-panel-head h2');
    if (caseTitle) caseTitle.textContent = t.my_cases_title || caseTitle.textContent;
  };

  
  if (typeof translatePage === 'function') {
    var _origTP = translatePage;
    window.translatePage = function(lang) {
      _origTP.call(this, lang);
      window.translateMobileUI(lang);
    };
  }

  
  var _prevMobileLang = window.changeMobileLang;
  window.changeMobileLang = function(val) {
    if (typeof _prevMobileLang === 'function') _prevMobileLang(val);
    window.translateMobileUI(val);
  };

  
  var _savedLang = sessionStorage.getItem('lcdjp_language');
  if (_savedLang && _savedLang !== 'en') {
    window.translateMobileUI(_savedLang);
  }
}());





(function () {
  var _origODV = typeof openDynamicView === 'function' ? openDynamicView : null;
  if (!_origODV) return;
  window.openDynamicView = function (htmlContent) {
    _origODV.call(this, htmlContent);
    if (window.innerWidth <= 767 && sessionStorage.getItem('lcdjp_userlevel') === 'Citizen') {
      document.body.classList.add('mobile-form-active');
      
      var cmBody = document.querySelector('.cm-body');
      if (cmBody) {
        var dynPage = document.getElementById('dynamicFormPage');
        if (dynPage) { cmBody.appendChild(dynPage); }
      }
    }
  };
  
  var _origCDV = typeof clearDynamicView === 'function' ? clearDynamicView : null;
  if (_origCDV) {
    window.clearDynamicView = function () {
      _origCDV.call(this);
      document.body.classList.remove('mobile-form-active');
    };
  }
  if (typeof showHome === 'function') {
    var _origSH2 = showHome;
    window.showHome = function () {
      document.body.classList.remove('mobile-form-active');
      _origSH2.apply(this, arguments);
    };
  }
}());


(function () {
  var _origPrint = typeof printCaseDetails === 'function' ? printCaseDetails : null;
  if (!_origPrint) return;
  window.printCaseDetails = async function (caseId) {
    
    if (window.innerWidth > 767) { return _origPrint.call(this, caseId); }
    
    await _origPrint.call(this, caseId);
    
  };

  
  var _origWindowOpen = window.open;
  window.open = function (url, target, features) {
    
    
    
    
    
    
    
    
    
    
    
    
    if (typeof features === 'string' && features.indexOf('width=900') !== -1 && window.innerWidth <= 767) {
      features = '';
    }
    return _origWindowOpen.call(this, url, target, features);
  };

  
  var _origWrite = null;
  var _origWindowOpen2 = window.open;
  window.open = function (url, target, features) {
    var win = _origWindowOpen2.call(this, url, target, features);
    if (win && !url && window.innerWidth <= 767) {
      
      var _origWinWrite = win.document.write.bind(win.document);
      win.document.write = function (html) {
        if (typeof html === 'string' && html.indexOf('<html>') !== -1) {
          html = html.replace('<html>', '<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head>');
          html = html.replace(/body\s*\{([^}]*)padding:\s*40px;([^}]*max-width:[^}]*)}/,
            'body {$1padding: 10px;$2}');
        }
        _origWinWrite(html);
      };
    }
    return win;
  };
}());


(function () {
  var _origMobileShowMore = typeof mobileShowMore === 'function' ? mobileShowMore : null;
  if (!_origMobileShowMore) return;
  window.mobileShowMore = function (role) {
    _origMobileShowMore.call(this, role);
    
    setTimeout(function () {
      var lang = sessionStorage.getItem('lcdjp_language') || 'en';
      if (lang !== 'en') {
        if (typeof translatePage  === 'function') translatePage(lang);
        if (typeof translateMobileUI === 'function') translateMobileUI(lang);
      }
    }, 80);
  };
}());