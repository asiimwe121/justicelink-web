










var _lcdjpChatHiddenForOverlay = false;
var _lcdjpChatPrevDisplay = null;

function _lcdjpHideFloatingChatForOverlay() {
    if (_lcdjpChatHiddenForOverlay) return;
    var chat = document.getElementById('chatContainer');
    if (!chat) return;
    _lcdjpChatPrevDisplay = chat.style.display;
    chat.style.display = 'none';
    _lcdjpChatHiddenForOverlay = true;
}

function _lcdjpRestoreFloatingChatForOverlay() {
    if (!_lcdjpChatHiddenForOverlay) return;
    var chat = document.getElementById('chatContainer');
    if (chat) chat.style.display = _lcdjpChatPrevDisplay || '';
    _lcdjpChatHiddenForOverlay = false;
    _lcdjpChatPrevDisplay = null;
}
window._lcdjpHideFloatingChatForOverlay = _lcdjpHideFloatingChatForOverlay;
window._lcdjpRestoreFloatingChatForOverlay = _lcdjpRestoreFloatingChatForOverlay;














(function () {
    function _lcdjpSyncContactSupportVisibility() {
        var chat = document.getElementById('chatContainer');
        if (!chat) return;
        
        
        
        
        if (_lcdjpChatHiddenForOverlay) return;

        var role = sessionStorage.getItem('lcdjp_userlevel') || '';
        var isAdminRole = (typeof isAdmin === 'function') && isAdmin(role);
        
        
        
        
        var isLawyerRole = role === 'Lawyer';

        var homePage = document.getElementById('homePage');
        var onHomePage = !!homePage && homePage.style.display === 'block';

        
        
        
        
        
        
        
        var caseModal = document.getElementById('caseDetailsModal');
        var caseModalOpen = !!caseModal && caseModal.style.display === 'block';

        
        
        
        
        
        
        
        
        
        var chatWindow = document.getElementById('chatWindow');
        var chatWindowOpen = !!chatWindow && chatWindow.style.display === 'flex';

        chat.style.display = ((!isAdminRole && !isLawyerRole && onHomePage && !caseModalOpen) || chatWindowOpen) ? 'block' : 'none';
    }

    var _homePageEl = document.getElementById('homePage');
    if (_homePageEl && window.MutationObserver) {
        new MutationObserver(_lcdjpSyncContactSupportVisibility)
            .observe(_homePageEl, { attributes: true, attributeFilter: ['style'] });
    }

    var _caseModalEl = document.getElementById('caseDetailsModal');
    if (_caseModalEl && window.MutationObserver) {
        new MutationObserver(_lcdjpSyncContactSupportVisibility)
            .observe(_caseModalEl, { attributes: true, attributeFilter: ['style'] });
    }

    
    
    setInterval(_lcdjpSyncContactSupportVisibility, 800);

    window._lcdjpSyncContactSupportVisibility = _lcdjpSyncContactSupportVisibility;
})();


(function () {
  var menuHomes = {};

  function restoreMobileMenu(role) {
    var saved = menuHomes[role];
    if (!saved || !saved.menu) return;
    if (saved.next && saved.next.parentNode === saved.parent) saved.parent.insertBefore(saved.menu, saved.next);
    else saved.parent.appendChild(saved.menu);
    saved.menu.style.display = saved.display;
    delete menuHomes[role];
  }

  window.mobileCloseMore = function (role) {
    var panel = document.getElementById('mobileRolePanel');
    if (panel) {
      var p = panel.parentNode;
      panel.remove();
      if (p) p.style.position = '';
    } else if (typeof window._lcdjpCloseMobileFullPage === 'function') {
      window._lcdjpCloseMobileFullPage();
    }
    restoreMobileMenu(role);
    _lcdjpRestoreFloatingChatForOverlay();
    
    var dashBtn = document.getElementById(role === 'citizen' ? 'cmNavHome' : 'lmNavDash');
    if (dashBtn) { dashBtn.closest('nav').querySelectorAll('[class*="-nav"]').forEach(function(n){n.classList.remove('active');}); dashBtn.classList.add('active'); }
  };

  
  function _mobileFullPage(role, title, buildFn) {
    var wrapper = role === 'citizen'
      ? document.getElementById('citizenMobileView')
      : document.querySelector('#lawyerDashboard .lm-wrap');
    if (!wrapper) { if (typeof buildFn === 'function') buildFn(null); return; }

    
    var old = document.getElementById('mobileFullPage');
    if (old) {
      old.remove();
      wrapper.style.position = '';
      document.body.style.overflow = old._fpPrevBodyOverflow || '';
      document.documentElement.style.overflow = old._fpPrevHtmlOverflow || '';
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    ['mobileLawyerNotificationsPanel', 'mobileAdminNotificationsPanel'].forEach(function (id) {
      var panel = document.getElementById(id);
      if (!panel) return;
      var closeBtn = panel.querySelector('.mobile-role-panel-close');
      if (closeBtn) closeBtn.click();
      else panel.remove();
    });

    
    var hdr = wrapper.querySelector('.cm-header, .lm-header');
    var hdrVisible = !!hdr && window.getComputedStyle(hdr).display !== 'none' && hdr.offsetHeight > 0;
    var hdrH = hdrVisible ? hdr.offsetHeight : 0;
    
    
    var barTopPad = hdrVisible ? '13px' : 'calc(13px + env(safe-area-inset-top))';

    wrapper.style.position = 'relative';
    var fp = document.createElement('div');
    fp.id = 'mobileFullPage';

    
    
    
    
    
    
    
    
    
    fp.style.cssText = 'position:fixed;top:' + hdrH + 'px;left:0;right:0;bottom:0;height:calc(100vh - ' + hdrH + 'px);height:calc(100dvh - ' + hdrH + 'px);background:#f5f7fb;z-index:1200;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;';

    
    
    fp._fpPrevBodyOverflow = document.body.style.overflow;
    fp._fpPrevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    _lcdjpHideFloatingChatForOverlay();

    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:' + barTopPad + ' 16px 13px;background:#202a85;color:#fff;flex-shrink:0;position:sticky;top:0;z-index:2;';
    bar.innerHTML = '<span style="font-size:16px;font-weight:700;">' + title + '</span>';
    var xBtn = document.createElement('button');
    xBtn.setAttribute('aria-label','Close');
    xBtn.style.cssText = 'background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    xBtn.innerHTML = '&times;';
    xBtn.onclick = function() {
      restoreMobileMenu(role);
      fp.remove();
      wrapper.style.position = '';
      document.body.style.overflow = fp._fpPrevBodyOverflow || '';
      document.documentElement.style.overflow = fp._fpPrevHtmlOverflow || '';
      _lcdjpRestoreFloatingChatForOverlay();
      
      if (typeof closeAIAssistant === 'function') closeAIAssistant();
      var homeNav = document.getElementById('cmNavHome');
      if (homeNav && window.innerWidth <= 767) {
        document.querySelectorAll('.cm-nav').forEach(function(n){n.classList.remove('active');});
        homeNav.classList.add('active');
        var bd = wrapper.querySelector('.cm-body');
        if (bd) bd.scrollTop = 0;
      }
    };
    bar.appendChild(xBtn);
    fp.appendChild(bar);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;padding:14px 14px 40px;';
    fp.appendChild(body);
    wrapper.appendChild(fp);

    if (typeof buildFn === 'function') buildFn(body);
  }

  window.openMobileSection = function(role, title, fn) {
    if (window.innerWidth > 767) { if (typeof fn === 'function') fn(); return; }
    _mobileFullPage(role, title, function(body) {
      if (!body || typeof fn !== 'function') return;
      
      fn(body);
      if (role === 'lawyer') return; 
      setTimeout(function() {
        var ca = document.getElementById('contentArea');
        if (!ca) return;
        ca.querySelectorAll('.dashboard-view').forEach(function(v) {
          if (v.style.display === 'block' && v.id !== 'lawyerDashboard' && v.id !== 'homePage') {
            body.appendChild(v);
          }
        });
      }, 250);
    });
  };

  window.mobileShowMore = function (role) {
    if (window.innerWidth > 767) return;
    var menuId = { citizen: 'citizenSidebarMenu', lawyer: 'lawyerSidebarMenu' }[role];
    var menu = document.getElementById(menuId);
    if (!menu) return;
    Object.keys(menuHomes).forEach(restoreMobileMenu);
    menuHomes[role] = { menu: menu, parent: menu.parentNode, next: menu.nextSibling, display: menu.style.display };
    _mobileFullPage(role, 'More services', function(body) {
      menu.style.display = 'block';
      body.appendChild(menu);
    });
  };

  
  
  
  
  
  
  
  window._LAWYER_RESOURCE_CATEGORIES = {
    
    
    
    
    
    
    
    lawLibrary: { title: 'Uganda Law Library' },
    courtForms: { title: 'Court Forms', fn: 'showCourtForm', items: [
      ['caseIntake', 'Case Intake Form'], ['clientInfo', 'Client Information Form'],
      ['witnessStatement', 'Witness Statement Form'], ['affidavit', 'Affidavit Template'],
      ['landComplaint', 'Land Dispute Complaint Form'], ['familyComplaint', 'Family Dispute Complaint Form'],
      ['debtRecovery', 'Debt Recovery Claim Form'], ['mediationRequest', 'Community Mediation Request Form'],
      ['noticeOfHearing', 'Notice of Hearing Form'], ['settlementAgreement', 'Settlement Agreement Form'],
      ['consentAgreement', 'Consent Agreement Form'], ['appealRequest', 'Appeal Request Form']
    ]},
    caseDrafts: { title: 'Case Drafts', fn: 'showCaseDraft', items: [
      ['demandLetter', 'Demand Letter'], ['noticeToVacate', 'Notice To Vacate Property'],
      ['landComplaintDraft', 'Land Ownership Complaint'], ['debtRecoveryDraft', 'Debt Recovery Demand'],
      ['breachAgreement', 'Breach Of Agreement Letter'], ['childCustody', 'Child Custody Application'],
      ['maintenanceRequest', 'Maintenance & Support Request'], ['inheritanceDispute', 'Inheritance Dispute Draft'],
      ['boundaryDispute', 'Boundary Dispute Draft'], ['employmentComplaint', 'Employment Complaint Draft'],
      ['mediationAgreement', 'Mediation Agreement Draft'], ['finalSettlement', 'Final Settlement Draft']
    ]},
    legalResearch: { title: 'Legal Research', fn: 'showLegalResearch', items: [
      ['constitution', 'Constitution of Uganda'], ['landAct', 'Land Act'], ['successionAct', 'Succession Act'],
      ['marriageAct', 'Marriage Act'], ['childrenAct', 'Children Act']
    ]},
    mediationGuidelines: { title: 'Mediation Guidelines', fn: 'showMediationGuideline', items: [
      ['principles', 'Principles of Mediation'], ['roleOfMediator', 'Role of the Mediator'],
      ['preparing', 'Preparing for Mediation'], ['conducting', 'Conducting a Mediation Session'],
      ['familyDisputes', 'Managing Family Disputes'], ['landDisputes', 'Managing Land Disputes'],
      ['communityConflicts', 'Managing Community Conflicts'], ['debtDisputes', 'Managing Debt Disputes'],
      ['sensitiveCases', 'Handling Sensitive Cases'], ['recordingOutcomes', 'Recording Mediation Outcomes'],
      ['settlementAgreements', 'Writing Settlement Agreements'], ['referToCourt', 'When to Refer Cases to Court'],
      ['referToPolice', 'When to Refer Cases to Police']
    ]},
    lawyerToolkit: { title: 'Lawyer Toolkit', fn: 'showToolkit', items: [
      ['caseCalculator', 'Case Calculator'], ['legalFeesGuide', 'Legal Fees Guide'],
      ['courtFeeGuide', 'Court Fee Guide'], ['timelineTracker', 'Case Timeline Tracker'],
      ['evidenceChecklist', 'Evidence Checklist'], ['clientMeetingNotes', 'Client Meeting Notes'],
      ['appointmentScheduler', 'Appointment Scheduler'], ['documentVault', 'Document Vault']
    ]}
  };

  window.lawyerOpenResourceCategory = function (key) {
    
    
    
    if (key === 'lawLibrary') {
      if (typeof window.showLawLibrarySearch === 'function') window.showLawLibrarySearch();
      return;
    }
    var cat = window._LAWYER_RESOURCE_CATEGORIES[key];
    if (!cat || typeof openDynamicView !== 'function') return;
    var rows = cat.items.map(function (it) {
      return '<li class="lr-item" onclick="' + cat.fn + '(\'' + it[0] + '\')">'
        + it[1].replace(/</g, '&lt;') + '</li>';
    }).join('');
    openDynamicView('<div class="form-card"><h2>' + cat.title + '</h2><ul>' + rows + '</ul></div>');
  };

  
  
  
  window._LC_RESOURCE_CATEGORIES = {
    lawLibrary: { title: 'Uganda Law Library' },
    lcForms: { title: 'LC Forms', fn: 'showLCForm', items: [
      ['complaintRegistration', 'Complaint Registration Form'], ['lcSummons', 'LC Court Summons Form'],
      ['mediationSessionRecord', 'Mediation Session Record Form'], ['minuteBookEntry', 'LC Minute Book Entry Form'],
      ['witnessStatementLc', 'Witness Statement Form'], ['referralToPolice', 'Referral to Police Form'],
      ['referralToCourt', "Referral to Magistrate's Court Form"], ['lcJudgmentOrder', 'LC Court Judgment / Order Form'],
      ['communityServiceOrder', 'Community Service Order Form'], ['settlementAgreementLc', 'Settlement Agreement Form'],
      ['noticeOfHearingLc', 'Notice of Hearing Form']
    ]},
    lcCaseDrafts: { title: 'LC Case Drafts', fn: 'showLCCaseDraft', items: [
      ['complaintDraft', 'Complaint Draft'], ['noticeOfHearingDraft', 'Notice of Hearing Draft'],
      ['mediationOutcomeDraft', 'Mediation Outcome Record Draft'], ['referralToPoliceDraft', 'Referral Letter to Police'],
      ['referralToCourtDraft', "Referral Letter to Magistrate's Court"], ['lcJudgmentDraft', 'LC Court Judgment Draft'],
      ['warningLetterDraft', 'Warning / Caution Letter Draft'], ['boundaryDisputeDraftLc', 'Village Land Boundary Dispute Draft'],
      ['familyDisputeMediationDraft', 'Domestic / Family Dispute Mediation Draft'],
      ['debtDisputeSettlementDraftLc', 'Debt Dispute Settlement Draft'], ['finalSettlementDraftLc', 'Final Settlement Draft']
    ]},
    mediationGuidelines: { title: 'Mediation Guidelines (LC Level)', fn: 'showLCMediationGuideline', items: [
      ['jurisdiction', 'Jurisdiction of LC Courts'], ['principles', 'Principles of Mediation at LC Level'],
      ['roleOfMediator', 'Role of the LC Chairperson as Mediator'], ['preparing', 'Preparing for a Mediation Session'],
      ['conducting', 'Conducting a Mediation Session'], ['familyDisputes', 'Managing Family & Domestic Disputes'],
      ['landDisputes', 'Managing Land & Boundary Disputes'], ['debtDisputes', 'Managing Debt & Property Disputes'],
      ['communityConflicts', 'Managing Community & Neighbour Conflicts'], ['sensitiveCases', 'Handling Sensitive Cases (GBV & Minors)'],
      ['recordingOutcomes', 'Recording Mediation Outcomes & LC Minutes'], ['settlementAgreements', 'Writing Settlement Agreements'],
      ['referToCourt', "When to Refer Cases to the Magistrate's Court"], ['referToPolice', 'When to Refer Cases to Police']
    ]}
  };

  window.lcOpenResourceCategory = function (key) {
    if (key === 'lawLibrary') {
      if (typeof window.showLawLibrarySearch === 'function') window.showLawLibrarySearch();
      return;
    }
    var cat = window._LC_RESOURCE_CATEGORIES[key];
    if (!cat || typeof openDynamicView !== 'function') return;
    var rows = cat.items.map(function (it) {
      return '<li class="lr-item" onclick="' + cat.fn + '(\'' + it[0] + '\')">'
        + it[1].replace(/</g, '&lt;') + '</li>';
    }).join('');
    openDynamicView('<div class="form-card"><h2>' + cat.title + '</h2><ul>' + rows + '</ul></div>');
  };

  
  
  
  
  window.mobileShowLawyerCases = function (body) {
    
    
    
    
    var lawyerDashEl = document.getElementById('lawyerDashboard');
    if (lawyerDashEl && typeof showLawyerDashboard === 'function') {
        showLawyerDashboard();
    }

    var cardsHost = document.getElementById('lawyerMobileCards');
    var searchLabel = document.querySelector('#lawyerDashboard .lm-search');
    var moreLink = document.getElementById('lawyerMobileCardsMore');

    
    
    
    if (body && cardsHost) {
        if (moreLink) moreLink.style.display = 'none';

        var cardsHomeParent = cardsHost.parentNode;
        var cardsHomeNext = cardsHost.nextSibling;
        var searchHomeParent = searchLabel ? searchLabel.parentNode : null;
        var searchHomeNext = searchLabel ? searchLabel.nextSibling : null;

        
        
        var wasCollapsed = cardsHost.classList.contains('lmc-collapsed');
        cardsHost.classList.remove('lmc-collapsed');

        if (searchLabel) body.appendChild(searchLabel);
        body.appendChild(cardsHost);

        var overlay = document.getElementById('mobileFullPage');
        var closeBtn = overlay ? overlay.querySelector('button[aria-label="Close"]') : null;
        if (closeBtn) {
            closeBtn.addEventListener('click', function restoreCases() {
                if (searchLabel && searchHomeParent) searchHomeParent.insertBefore(searchLabel, searchHomeNext);
                if (cardsHomeParent) cardsHomeParent.insertBefore(cardsHost, cardsHomeNext);
                if (wasCollapsed) cardsHost.classList.add('lmc-collapsed');
                
                
                if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases();
                closeBtn.removeEventListener('click', restoreCases);
            });
        }
    }

    
    
    
    if (typeof updateLawyerDashboardCases === 'function') updateLawyerDashboardCases();

    if (!body) {
        setTimeout(function () {
          document.getElementById('lawyerMobileCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
    }
  };

  
  
  window.lawyerOpenCasesOverlay = function () {
    document.querySelectorAll('.lm-nav-item').forEach(function (n) { n.classList.remove('active'); });
    var navCases = document.getElementById('lmNavCases');
    if (navCases) navCases.classList.add('active');
    if (typeof openMobileSection === 'function') {
        openMobileSection('lawyer', 'My Cases', mobileShowLawyerCases);
    }
  };

  window.mobileCitizenMessages = function () {
    if (window.innerWidth > 767) return;
    var content = document.getElementById('contentArea');
    if (!content) return;
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    var panel = document.createElement('section');
    panel.id = 'mobileCitizenMessagesPanel';
    panel.className = 'mobile-messages-panel';
    panel.innerHTML = '<div class="mobile-role-panel-head"><h2>Messages</h2><button class="mobile-role-panel-close" aria-label="Back">&times;</button></div><p style="margin:0;color:#667085;font-size:12px;">Open a case conversation to read and send messages.</p><div id="mobileCitizenMessageList" style="margin-top:14px;">Loading conversations...</div>';
    panel.querySelector('button').onclick = function () { panel.remove(); if (typeof showHome === 'function') showHome(); };
    content.appendChild(panel);

    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    var _apiOk = (typeof API_ENDPOINTS !== 'undefined') && (typeof API_ENDPOINTS.citizenCases === 'function');
    var verificationStatus = String(
      sessionStorage.getItem('lcdjp_verif_status') ||
      localStorage.getItem('verificationStatus') || ''
    ).trim().toUpperCase();
    var normalizedRole = String(
      sessionStorage.getItem('lcdjp_userlevel') ||
      localStorage.getItem('userRole') || ''
    ).trim().toUpperCase();
    var canViewCases = normalizedRole === 'ADMIN' ||
      normalizedRole === 'SYSTEM_ADMIN' ||
      normalizedRole === 'SYSTEM_ADMINISTRATOR' ||
      normalizedRole === 'DISTRICT_ADMIN' ||
      verificationStatus === 'APPROVED' ||
      verificationStatus === 'VERIFIED';
    if (!username || !_apiOk || !canViewCases) {
      document.getElementById('mobileCitizenMessageList').textContent =
        !username ? 'Please sign in to view messages.'
          : !canViewCases ? 'Identity verification is required to view case conversations.'
          : 'Service unavailable, please refresh the page.';
      return;
    }
      fetch(API_ENDPOINTS.citizenCases(username), {
        suppressAuthRedirect: true,
        headers: getAuthHeaders()
      })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        var cases = data && data.success && Array.isArray(data.cases) ? data.cases : (Array.isArray(data) ? data : []);
        var list = document.getElementById('mobileCitizenMessageList');
        if (!list) return;
        if (!cases.length) { list.textContent = 'No case conversations yet.'; return; }
        list.innerHTML = cases.map(function (item) {
          
          
          
          
          
          
          
          
          var ref = item.case_reference || item.caseReference || item.case_number || item.caseNumber || (item.id ? String(item.id) : '') || '';
          var title = item.case_type || item.caseType || 'Case conversation';
          return '<article class="mobile-message-card"><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(ref) + '</p><button type="button" data-case-id="' + escapeHtml(ref) + '">Open conversation</button></article>';
        }).join('');
        list.querySelectorAll('button[data-case-id]').forEach(function (button) {
          button.onclick = function () { if (typeof openCitizenMessaging === 'function') openCitizenMessaging(button.dataset.caseId); };
        });
      })
      .catch(function () {
        var list = document.getElementById('mobileCitizenMessageList');
        if (list) list.textContent = 'Messages could not be loaded. Please try again.';
      });
  };

  window.mobileLawyerMessages = function () {
    if (window.innerWidth > 767) return;
    var content = document.getElementById('contentArea');
    if (!content) return;
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    var panel = document.createElement('section');
    panel.id = 'mobileLawyerMessagesPanel';
    panel.className = 'mobile-messages-panel';
    panel.innerHTML = '<div class="mobile-role-panel-head"><h2>Messages</h2><button class="mobile-role-panel-close" aria-label="Back">&times;</button></div><p style="margin:0;color:#667085;font-size:12px;">Open a case conversation to read and send messages.</p><div id="mobileLawyerMessageList" style="margin-top:14px;">Loading conversations...</div>';
    panel.querySelector('button').onclick = function () { panel.remove(); if (typeof showLawyerDashboard === 'function') showLawyerDashboard(); };
    content.appendChild(panel);

    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    var _apiOk = (typeof API_ENDPOINTS !== 'undefined') && (typeof API_ENDPOINTS.lawyerCases === 'function');
    if (!username || !_apiOk) {
      document.getElementById('mobileLawyerMessageList').textContent =
        !username ? 'Please sign in to view messages.' : 'Service unavailable, please refresh the page.';
      return;
    }
      fetch(API_ENDPOINTS.lawyerCases(username), {
        suppressAuthRedirect: true,
        headers: getAuthHeaders()
      })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        var cases = data && data.success && Array.isArray(data.cases) ? data.cases : (Array.isArray(data) ? data : []);
        var list = document.getElementById('mobileLawyerMessageList');
        if (!list) return;
        if (!cases.length) { list.textContent = 'No case conversations yet.'; return; }
        list.innerHTML = cases.map(function (item) {
          var ref = item.case_reference || item.caseReference || item.case_number || item.caseNumber || (item.id ? String(item.id) : '') || '';
          var title = item.case_type || item.caseType || 'Case conversation';
          var citizen = item.citizenName || item.citizen_name || '';
          return '<article class="mobile-message-card"><strong>' + escapeHtml(title) + '</strong><p>' + (citizen ? escapeHtml(citizen) + ' &middot; ' : '') + escapeHtml(ref) + '</p><button type="button" data-case-id="' + escapeHtml(ref) + '">Open conversation</button></article>';
        }).join('');
        list.querySelectorAll('button[data-case-id]').forEach(function (button) {
          button.onclick = function () { if (typeof viewCase === 'function') viewCase(button.dataset.caseId); };
        });
      })
      .catch(function () {
        var list = document.getElementById('mobileLawyerMessageList');
        if (list) list.textContent = 'Messages could not be loaded. Please try again.';
      });
  };


  window.addEventListener('resize', function () {
    if (window.innerWidth > 767) Object.keys(menuHomes).forEach(restoreMobileMenu);
  });
}());











function _lcdjpIsCitizenRole() {
  var role = localStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('role') || '';
  return role === 'Citizen';
}
window._lcdjpIsCitizenRole = _lcdjpIsCitizenRole;

window.changeMobileLang = function (val) {
  if (!_lcdjpIsCitizenRole()) return;

  ['languageSelect','lcLanguageSelect','cmLanguageSelect','lmLanguageSelect','lcmLanguageSelect'].forEach(function (id) {
    var s = document.getElementById(id);
    if (s) s.value = val;
  });
  
  sessionStorage.setItem('lcdjp_language', val);
  if (typeof window.currentLang !== 'undefined') window.currentLang = val;
  
  if (typeof translatePage === 'function') {
    translatePage(val);
  }
  if (typeof showToast === 'function') showToast('Language changed to ' + val.toUpperCase());
};








window.changeLawyerLang = function (val) {
  sessionStorage.setItem('lcdjp_language', val);
  if (typeof window.currentLang !== 'undefined') window.currentLang = val;
  if (typeof translatePage === 'function') translatePage(val);
  if (typeof showToast === 'function') showToast('Language changed to ' + val.toUpperCase());
};