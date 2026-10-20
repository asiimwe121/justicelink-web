





(function () {
  'use strict';

  function desktopCitizen() {
    return window.innerWidth >= 768
      && document.body.classList.contains('citizen-dashboard-mode');
  }

  function desktopAdmin() {
    return window.innerWidth >= 768
      && document.body.classList.contains('admin-dashboard-mode');
  }

  function closePage(overlay, page, placeholder, skipShowHome) {
    if (page && placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(page, placeholder);
      page.style.display = 'none';
    }
    if (overlay) overlay.remove();
    if (placeholder) placeholder.remove();
    unlockScroll();
    _lcdjpRestoreFloatingChatForOverlay();
    
    
    
    
    
    
    
    if (skipShowHome) return;
    
    
    
    
    
    
    
    
    if (document.body.classList.contains('admin-dashboard-mode')) {
      if (sessionStorage.getItem('lcdjp_userlevel') === 'DISTRICT_ADMIN'
          && typeof showDistrictAdminDashboard === 'function') {
        showDistrictAdminDashboard();
      } else if (typeof showAdminHome === 'function') {
        showAdminHome();
      } else if (typeof showHome === 'function') {
        showHome();
      }
      return;
    }
    if (typeof showHome === 'function') showHome();
  }

  function openPage(pageId, title, subtitle, afterOpen) {
    var page = document.getElementById(pageId);
    if (!page) return;
    var old = document.querySelector('.lcdjp-desktop-page-overlay');
    if (old) old.remove();
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    var placeholder = document.createComment('lcdjp-' + pageId + '-placeholder');
    page.parentNode.insertBefore(placeholder, page);

    var overlay = document.createElement('div');
    overlay.className = 'lcdjp-desktop-page-overlay';
    overlay.setAttribute('data-page', pageId);
    var shell = document.createElement('section');
    shell.className = 'lcdjp-desktop-page-shell';
    var header = document.createElement('header');
    header.className = 'lcdjp-desktop-page-header';
    
    
    
    
    
    
    
    var includeHeaderClose = (pageId !== 'citizenNotificationsPage');
    header.innerHTML =
      '<div><h2>' + title + '</h2><p>' + subtitle + '</p></div>'
      + (includeHeaderClose ? '<button class="lcdjp-desktop-page-close" type="button" aria-label="Close">&times;</button>' : '');
    var body = document.createElement('div');
    body.className = 'lcdjp-desktop-page-body';
    shell.appendChild(header);
    shell.appendChild(body);
    overlay.appendChild(shell);
    document.body.appendChild(overlay);
    body.appendChild(page);
    page.style.display = 'block';
    lockScroll();
    _lcdjpHideFloatingChatForOverlay();

    var close = function (skipShowHome) { closePage(overlay, page, placeholder, skipShowHome); };
    
    
    
    overlay._lcdjpClose = close;
    var headerCloseBtn = header.querySelector('.lcdjp-desktop-page-close');
    
    
    
    
    
    
    
    
    if (headerCloseBtn) headerCloseBtn.onclick = function () { close(); };
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });
    if (typeof afterOpen === 'function') afterOpen(page, body, close);
  }

  function moveDashboardPieces() {
    if (!desktopCitizen()) return;
    var banner = document.getElementById('cmAiEmergencyBanner');
    var greeting = document.getElementById('cdDesktopGreeting');
    var stats = greeting && greeting.querySelector('.cdg-stats-row');
    if (banner && stats && stats.parentNode !== banner) banner.appendChild(stats);
    if (greeting) greeting.remove();

    var right = document.getElementById('cdDesktopRightPanel');
    var active = document.getElementById('cmActiveCaseCard');
    var nearby = right && right.querySelector('#cdDesktopNearbySection');
    if (right && active && nearby && active.parentNode !== right) {
      right.insertBefore(active, nearby.nextSibling);
    }
  }

  window.openDesktopCitizenMyCases = function () {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
      if (typeof showFeatureUnavailableMessage === 'function') {
        showFeatureUnavailableMessage('This feature is not available at this time.');
      }
      return;
    }
    if (!desktopCitizen()) {
      if (typeof showMyCases === 'function') showMyCases();
      return;
    }
    openPage('myCasesPage', 'My Cases', 'Review your case status, evidence, and next actions.', function () {
      if (typeof updateMyCases === 'function') updateMyCases();
    });
  };

  window.openDesktopCitizenTrackCase = function () {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
      if (typeof showFeatureUnavailableMessage === 'function') {
        showFeatureUnavailableMessage('This feature is not available at this time.');
      }
      return;
    }
    if (!desktopCitizen()) {
      if (typeof showTrackCaseTab === 'function') showTrackCaseTab();
      return;
    }
    openPage('trackCasePage', 'Track Case', 'Enter a case reference to view the latest progress.', function (page) {
      var input = page.querySelector('#trackSearchInput');
      if (input) setTimeout(function () { input.focus(); }, 80);
    });
  };

  
  
  

  var originalShowTrackCase = window.showTrackCaseTab;
  window.showTrackCaseTab = function () {
    if (typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
      if (typeof showFeatureUnavailableMessage === 'function') {
        showFeatureUnavailableMessage('This feature is not available at this time.');
      }
      return;
    }
    if (desktopCitizen()) {
      window.openDesktopCitizenTrackCase();
      return;
    }
    if (typeof originalShowTrackCase === 'function') originalShowTrackCase.apply(this, arguments);
  };

  var originalToggleNotifications = window.toggleNotifications;
  window.toggleNotifications = function () {
    if (desktopCitizen()) {
      var existing = document.querySelector('.lcdjp-desktop-page-overlay[data-page="citizenNotificationsPage"]');
      if (existing) {
        var closeButton = existing.querySelector('.lcdjp-desktop-page-close');
        if (closeButton) closeButton.click();
        return;
      }
      openPage('citizenNotificationsPage', 'Notifications', 'Updates about your cases, messages, and legal support.', function (page) {
        if (typeof loadCitizenNotifications === 'function') loadCitizenNotifications().catch(console.error);
      });
      return;
    }
    if (desktopAdmin()) {
      
      
      
      
      
      var existingAdmin = document.querySelector('.lcdjp-desktop-page-overlay[data-page="adminNotificationsPage"]');
      if (existingAdmin) {
        if (typeof existingAdmin._lcdjpClose === 'function') existingAdmin._lcdjpClose();
        return;
      }
      var page = document.getElementById('adminNotificationsPage');
      if (!page && typeof createAdminNotificationsPage === 'function') {
        createAdminNotificationsPage();
        page = document.getElementById('adminNotificationsPage');
      }
      if (!page) {
        if (typeof originalToggleNotifications === 'function') originalToggleNotifications.apply(this, arguments);
        return;
      }
      openPage('adminNotificationsPage', 'Notifications', 'Alerts and updates for administrators.', function () {
        if (typeof renderAdminNotificationPage === 'function') renderAdminNotificationPage();
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();
      });
      return;
    }
    if (typeof originalToggleNotifications === 'function') {
      originalToggleNotifications.apply(this, arguments);
    }
  };

  
  function _desktopRefreshActiveCase() {
    var uname = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!uname) return;
    if (typeof window._lcdjpSensitiveCaseAccessAllowed === 'function' &&
        !window._lcdjpSensitiveCaseAccessAllowed()) return;
    if (typeof API_ENDPOINTS === 'undefined' || typeof API_ENDPOINTS.citizenCases !== 'function') return;
    fetch(API_ENDPOINTS.citizenCases(uname), {
      suppressAuthRedirect: true,
      headers: getAuthHeaders()
    })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return;
        var list = (data.success && data.cases) ? data.cases : (Array.isArray(data) ? data : []);
        if (!list.length) return;
        list.sort(function(a,b){ return new Date(b.created_at) - new Date(a.created_at); });
        var active = list.find(function(c){ return c.status !== 'Resolved'; }) || list[0];
        if (typeof _cmBuildCaseCard === 'function') _cmBuildCaseCard(active);
      }).catch(function(){});
  }

  
  function _desktopRefreshAlerts() {
    var uname = sessionStorage.getItem('lcdjp_username');
    if (typeof API_ENDPOINTS === 'undefined' || !API_ENDPOINTS.notifications) return;
    var el = document.getElementById('cdDesktopAlertsList');
    if (!el) return;
    
    var storeAll = (window._lcdjpStore && window._lcdjpStore.notifications) || [];
    var storeMine = uname ? storeAll.filter(function(n){ return n.username === uname; }) : storeAll;
    if (storeMine.length > 0 && typeof _renderDesktopAlerts === 'function') {
      _renderDesktopAlerts(storeMine);
    }
    
    fetch(API_ENDPOINTS.notifications, {
      headers: (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {}
    })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data) return;
        var all = Array.isArray(data) ? data : (data.notifications || []);
        var mine = uname ? all.filter(function(n){ return n.username === uname; }) : all;
        
        if (window._lcdjpStore) window._lcdjpStore.notifications = all;
        if (typeof _renderDesktopAlerts === 'function') _renderDesktopAlerts(mine);
      }).catch(function(){});
  }

  function install() {
    if (!desktopCitizen()) return;
    moveDashboardPieces();
    document.querySelectorAll('#citizenDesktopNav .cdn-nav-item').forEach(function (item) {
      var text = (item.textContent || '').trim().toLowerCase();
      if (text === 'my cases') item.onclick = window.openDesktopCitizenMyCases;
      if (text === 'track case') item.onclick = window.openDesktopCitizenTrackCase;
    });
    
    _desktopRefreshActiveCase();
    
    _desktopRefreshAlerts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(install, 250); });
  } else {
    setTimeout(install, 250);
  }
  new MutationObserver(install).observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  window.addEventListener('resize', install);
}());





(function () {
  'use strict';

  window.closeCaseSubmissionForm = function () {
    var mobileOverlay = document.getElementById('mobileDynamicOverlay');
    if (mobileOverlay) mobileOverlay.remove();
    if (typeof clearDynamicView === 'function') clearDynamicView();
    document.body.classList.remove('mobile-form-active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.position = '';
    window._lcdjpScrollLockCount = 0;
    if (typeof showHome === 'function') showHome();
  };

  
  var extras = {
    en: {
      close_button:'Close', draft_saved:'Draft saved', map_point_btn:'Point on Map, Tap Your Area & Fields Fill Automatically',
      map_point_hint:'Perfect if you cannot type, just tap your location on the map',
      quick_location_search:'Quick Location Search',
      quick_location_hint:'Type your village, parish, sub-county or district name and all fields will fill automatically',
      location_search_placeholder:'e.g. Namugongo, Kawempe, Kampala...',
      dashboard:'Dashboard', my_cases:'My Cases', alerts_notices:'Alerts & Notices', nearby_services:'Nearby Services',
      messages:'Messages', quick_links:'Quick Links', partners:'Partners', footer_home:'Home',
      footer_track_case:'Track Case', footer_find_help:'Find Help', footer_education:'Education',
      contact_information:'Contact Information'
    },
    lug: {
      close_button:'Ggalawo', draft_saved:'Ekiwandiiko kikuumiddwa', map_point_btn:'Kuba ku Maapu, Kuba ku Kifo Kyo',
      map_point_hint:'Bw\'otoyinza kuwandiika, kuba ku kifo kyo ku maapu',
      quick_location_search:'Noonya Ekifo Mangu',
      quick_location_hint:'Wandiika ekyalo, parish, sub-county oba disitulikiti okufuna ebifo byonna',
      location_search_placeholder:'okugeza Namugongo, Kawempe, Kampala...',
      dashboard:'Ssandaaki', my_cases:'Ebibuuzo Byange', alerts_notices:'Obubaka n\'Ebirabula', nearby_services:'Obuweereza Obuliraanye',
      messages:'Obubaka', quick_links:'Enkolagana Enzangu', partners:'Abakwanaganya', footer_home:'Waka',
      footer_track_case:'Kulagula Musango', footer_find_help:'Noonya Obuyambi', footer_education:'Okusomesebwa',
      contact_information:'Amakulu g\'Okuyungirira'
    },
    ach: {
      close_button:'Cik', draft_saved:'Lok ki gwoko', map_point_btn:'Ket i Map, Ket kabedo ni',
      map_point_hint:'Ka pe itwero keto, ket kabedo ni i map',
      quick_location_search:'Yeny Kabedo Oyot',
      quick_location_hint:'Ket nying kyalo, parishi, sab-kaanti onyo disitulikiti',
      location_search_placeholder:'lab: Namugongo, Kawempe, Kampala...',
      dashboard:'Got', my_cases:'Lok An', alerts_notices:'Lok ki Jami', nearby_services:'Tic ma Kongo Ningi',
      messages:'Lok Buca', quick_links:'Keto Oyot', partners:'Jok ma Tye Kede', footer_home:'Ot',
      footer_track_case:'Nyil Lok', footer_find_help:'Yeny Kony', footer_education:'Pwony',
      contact_information:'Ngec me Kwan'
    },
    teo: {
      close_button:'Ggalala', draft_saved:'Ekiwandiiko kikuumiddwa', map_point_btn:'Kuba ku Maapu, Kuba ku Kifo Kyo',
      map_point_hint:'Bw\'otayina kuwandiika, kuba ku kifo kyo ku maapu',
      quick_location_search:'Noonya Ekifo Mangu',
      quick_location_hint:'Wandiika ekyalo, parish, sub-county oba disitulikiti',
      location_search_placeholder:'okugeza Namugongo, Kawempe, Kampala...',
      dashboard:'Edebe', my_cases:'Ebia Gwange', alerts_notices:'Ebirukwa na Ebirabula', nearby_services:'Eimoria Ekongo',
      messages:'Emwang\'a', quick_links:'Enkolagana Enzangu', partners:'Abakwanaganya', footer_home:'Awi',
      footer_track_case:'Kuata Ebia', footer_find_help:'Naa Aisak', footer_education:'Pwony',
      contact_information:'Adumun me Yuak'
    },
    lgg: {
      close_button:'Funga', draft_saved:'Rasimu eikumiibwe', map_point_btn:'Kuba ku Maapu, Kuba ku Kifo Kyo',
      map_point_hint:'Bw\'otayina kuwandiika, kuba ku kifo kyo ku maapu',
      quick_location_search:'Noonya Ekifo Mangu',
      quick_location_hint:'Wandiika ekyalo, parish, sub-county oba disitulikiti',
      location_search_placeholder:'okugeza Namugongo, Kawempe, Kampala...',
      dashboard:'Dashibodi', my_cases:'Ebizibu Byange', alerts_notices:'Ebirabura', nearby_services:'Obuheereza Oburi Haihi',
      messages:'Obubaka', quick_links:'Enkolagana Enzangu', partners:'Abakwanaganya', footer_home:'Nyumba',
      footer_track_case:'Kurikirana Kesi', footer_find_help:'Ronda Obuyambi', footer_education:'Okwega',
      contact_information:'Amakuru g\'Okuyungirira'
    },
    nyn: {
      close_button:'Ggalawo', draft_saved:'Ekiwandiiko kikuumiddwa', map_point_btn:'Kuba ku Maapu, Kuba ku Kifo Kyo',
      map_point_hint:'Bw\'otayina kuwandiika, kuba ku kifo kyo ku maapu',
      quick_location_search:'Noonya Ekifo Mangu',
      quick_location_hint:'Wandiika ekyalo, parish, sub-county oba disitulikiti',
      location_search_placeholder:'okugeza Namugongo, Kawempe, Kampala...',
      dashboard:'Dashibodi', my_cases:'Amabuzo Gangu', alerts_notices:'Ebirabula', nearby_services:'Obushaho Oburi Haihi',
      messages:'Ebirukwa', quick_links:'Enkolagana Enzangu', partners:'Abakwanaganya', footer_home:'Akaaro',
      footer_track_case:'Kurikirana Omubuzo', footer_find_help:'Ronda Obuyambi', footer_education:'Okwega',
      contact_information:'Amakulu g\'Okuyungirira'
    }
  };
  Object.keys(extras).forEach(function (lang) {
    if (typeof translations !== 'undefined') {
      translations[lang] = Object.assign({}, translations[lang] || translations.en, extras[lang]);
    }
  });

  var sourceByNode = new WeakMap();
  var sourceByTextNode = new WeakMap();
  var translating = false;
  function normal(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function mapFor(lang) {
    var t = (typeof translations !== 'undefined' && translations[lang]) || {};
    var en = (typeof translations !== 'undefined' && translations.en) || {};
    var reverse = {};
    Object.keys(en).forEach(function (key) {
      var source = normal(en[key]);
      if (source && !reverse[source]) reverse[source] = key;
    });
    return { t: t, reverse: reverse };
  }
  function setDirectText(el, value) {
    if (!el || value == null) return;
    var textNodes = Array.prototype.filter.call(el.childNodes, function (node) {
      return node.nodeType === 3 && node.textContent.trim();
    });
    if (textNodes.length) {
      textNodes[0].textContent = value;
      textNodes.slice(1).forEach(function (node) { node.textContent = ''; });
    } else if (!el.children.length) {
      el.textContent = value;
    }
  }
  function applyLiveTranslations(lang) {
    if (translating) return;
    if (typeof _lcdjpIsCitizenRole === 'function' && !_lcdjpIsCitizenRole()) return;
    var maps = mapFor(lang);
    var t = maps.t;
    if (!t) return;
    translating = true;
    try {
      document.querySelectorAll('[data-translate]').forEach(function (el) {
        var key = el.getAttribute('data-translate');
        if (Object.prototype.hasOwnProperty.call(t, key)) setDirectText(el, t[key]);
      });
      document.querySelectorAll('[data-translate-placeholder]').forEach(function (el) {
        var key = el.getAttribute('data-translate-placeholder');
        if (Object.prototype.hasOwnProperty.call(t, key)) el.setAttribute('placeholder', t[key]);
      });
      document.querySelectorAll('[data-translate-title]').forEach(function (el) {
        var key = el.getAttribute('data-translate-title');
        if (Object.prototype.hasOwnProperty.call(t, key)) el.setAttribute('title', t[key]);
      });
      document.querySelectorAll('[data-translate-aria-label]').forEach(function (el) {
        var key = el.getAttribute('data-translate-aria-label');
        if (Object.prototype.hasOwnProperty.call(t, key)) el.setAttribute('aria-label', t[key]);
      });
      document.querySelectorAll('option[data-translate]').forEach(function (el) {
        var key = el.getAttribute('data-translate');
        if (Object.prototype.hasOwnProperty.call(t, key)) el.textContent = t[key];
      });

      
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      var textNode;
      while ((textNode = walker.nextNode())) {
        var parent = textNode.parentElement;
        if (!parent || parent.closest('script,style,textarea,select,option,[data-translate]')) continue;
        var currentText = textNode.textContent.trim();
        if (!currentText) continue;
        var originalText = sourceByTextNode.get(textNode);
        if (!originalText) {
          var textKey = maps.reverse[normal(currentText)];
          if (!textKey) continue;
          originalText = currentText;
          sourceByTextNode.set(textNode, originalText);
        }
        var keyForText = maps.reverse[normal(originalText)];
        if (keyForText && Object.prototype.hasOwnProperty.call(t, keyForText)) {
          var leading = textNode.textContent.match(/^\s*/)[0];
          var trailing = textNode.textContent.match(/\s*$/)[0];
          textNode.textContent = leading + t[keyForText] + trailing;
        }
      }
    } finally {
      translating = false;
    }
  }

  var oldTranslatePage = window.translatePage;
  window.translatePage = function (lang) {
    if (typeof oldTranslatePage === 'function') oldTranslatePage.call(this, lang);
    applyLiveTranslations(lang);
  };
  window.translateAllViews = applyLiveTranslations;

  var queued = false;
  var observer = new MutationObserver(function () {
    if (queued || translating) return;
    queued = true;
    setTimeout(function () {
      queued = false;
      var lang = sessionStorage.getItem('lcdjp_language') || 'en';
      if (lang !== 'en') applyLiveTranslations(lang);
    }, 30);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', function () {
    var lang = sessionStorage.getItem('lcdjp_language') || 'en';
    applyLiveTranslations(lang);
  });
}());





(function () {
  'use strict';

  
  function _alertTitle(type) {
    var map = {
      case_declined:      'Lawyer Declined',
      case_referred:      'Case Referred',
      case_accepted:      'Case Accepted',
      case_resolved:      'Case Resolved',
      new_message:        'New Message',
      lawyer_message:     'New Message',
      lc_message:         'New Message',
      citizen_message:    'New Message',
      chat_reply:         'Chat Reply',
      voice_message:      'Voice Message',
      appointment:        'Appointment',
      case_forwarded:     'Case Forwarded',
      lawyer_selected:    'Lawyer Selected',
      org_case_interest:  'Organisation Interest'
    };
    return map[type] || 'Notification';
  }

  function _shortBody(text) {
    if (!text) return '';
    var s = text.replace(/<[^>]*>/g, ' ').trim();
    return s.length > 90 ? s.slice(0, 87) + '…' : s;
  }

  
  window._renderDesktopAlerts = function _renderDesktopAlerts(notifications) {
    var el = document.getElementById('cdDesktopAlertsList');
    if (!el) return;
    if (!notifications || notifications.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:14px 0;color:#9ca3af;font-size:12px;">No notifications yet.</div>';
      return;
    }
    var sorted = notifications.slice().sort(function (a, b) {
      return new Date(b.timestamp || b.date || b.created_at || 0) -
             new Date(a.timestamp || a.date || a.created_at || 0);
    });
    var top2 = sorted.slice(0, 2);
    var dotColors = ['cdrp-dot-navy', 'cdrp-dot-navy2'];
    var bgColors  = ['cdrp-alert-navy', 'cdrp-alert-navy2'];
    el.innerHTML = top2.map(function (n, i) {
      var title = _alertTitle(n.type || '');
      var body  = _shortBody(n.message || n.body || n.summary || '');
      var isUnread = !n.is_read && n.is_read !== 1;
      var openJson = JSON.stringify(n).replace(/"/g, '&quot;');
      return '<div class="cdrp-alert-item ' + bgColors[i] + '"'
        + ' onclick="(function(){'
        +   'if(typeof lcdjpOpenNotification===&quot;function&quot;)lcdjpOpenNotification(' + openJson + ');'
        +   'else if(typeof toggleNotifications===&quot;function&quot;)toggleNotifications();'
        + '})()"'
        + ' style="' + (isUnread ? 'font-weight:600;' : '') + '">'
        + '<div class="cdrp-alert-dot ' + dotColors[i] + '"></div>'
        + '<div style="min-width:0;">'
        + '<div class="cdrp-alert-head">' + title + (isUnread ? ' <span style="background:#1a237e;color:white;font-size:9px;padding:1px 5px;border-radius:6px;margin-left:4px;vertical-align:middle;">NEW</span>' : '') + '</div>'
        + (body ? '<div class="cdrp-alert-body">' + escapeHtml(body) + '</div>' : '')
        + '</div></div>';
    }).join('');
  }

  
  function _patchLoader() {
    var _orig = window.loadCitizenNotifications;
    if (typeof _orig !== 'function') return false;
    window.loadCitizenNotifications = async function () {
      var result = await _orig.apply(this, arguments);
      
      var username = sessionStorage.getItem('lcdjp_username');
      var all = (window._lcdjpStore && window._lcdjpStore.notifications) || [];
      var mine = username
        ? all.filter(function (n) { return n.username === username; })
        : all;
      _renderDesktopAlerts(mine);
      return result;
    };
    return true;
  }

  
  window._lcdjpRefreshDesktopAlerts = function () {
    var username = sessionStorage.getItem('lcdjp_username');
    var all = (window._lcdjpStore && window._lcdjpStore.notifications) || [];
    var mine = username
      ? all.filter(function (n) { return n.username === username; })
      : all;
    _renderDesktopAlerts(mine);
  };

  
  if (!_patchLoader()) {
    var _attempts = 0;
    var _interval = setInterval(function () {
      _attempts++;
      if (_patchLoader() || _attempts > 60) clearInterval(_interval);
    }, 300);
  }

  
  function _tryInitialLoad() {
    var u = sessionStorage.getItem('lcdjp_username');
    var all = (window._lcdjpStore && window._lcdjpStore.notifications) || [];
    var mine = u ? all.filter(function(n){ return n.username === u; }) : all;
    if (mine.length > 0) _renderDesktopAlerts(mine);
  }
  setTimeout(_tryInitialLoad, 1500);
  setTimeout(_tryInitialLoad, 5000);

  
  var _origRefreshNotif = window._lcdjpRefreshNotifications;
  if (typeof _origRefreshNotif === 'function') {
    window._lcdjpRefreshNotifications = async function () {
      var res = await _origRefreshNotif.apply(this, arguments);
      window._lcdjpRefreshDesktopAlerts && window._lcdjpRefreshDesktopAlerts();
      return res;
    };
  }
})();