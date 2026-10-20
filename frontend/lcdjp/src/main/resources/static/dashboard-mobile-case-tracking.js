





(function () {
  
  function hideFooter () { document.body.classList.remove('mobile-home-active'); }

  

  
  var _prevMore = window.mobileShowMore;
  window.mobileShowMore = function (role) {
    hideFooter();
    if (typeof _prevMore === 'function') _prevMore.call(this, role);

    
    setTimeout(function () {
      var lang = sessionStorage.getItem('lcdjp_language') || 'en';
      if (lang === 'en') return;

      
      var panel = document.getElementById('mobileFullPage');
      if (panel) {
        var tMap = (typeof translations !== 'undefined')
                   ? (translations[lang] || translations['en'])
                   : null;
        if (tMap) {
          panel.querySelectorAll('[data-translate]').forEach(function (el) {
            var key = el.getAttribute('data-translate');
            if (tMap[key] !== undefined) {
              
              if (!el.children.length || el.tagName === 'OPTION') {
                el.textContent = tMap[key];
              }
            }
          });
        }
      }

      
      if (typeof translatePage  === 'function') translatePage(lang);
      if (typeof translateMobileUI === 'function') translateMobileUI(lang);
    }, 300);
  };

  
  var _prevODV = window.openDynamicView;
  window.openDynamicView = function (html) {
    hideFooter();
    if (typeof _prevODV === 'function') _prevODV.call(this, html);
  };

  
  var _prevSMMP = window.showMobileMenuPanel;
  if (typeof _prevSMMP === 'function') {
    window.showMobileMenuPanel = function (menuId) {
      if (window.innerWidth <= 767) hideFooter();
      _prevSMMP.call(this, menuId);
    };
  }

  
  var _prevSvc = window.svcRequireAuth;
  if (typeof _prevSvc === 'function') {
    window.svcRequireAuth = function (action) {
      if (window.innerWidth <= 767) hideFooter();
      _prevSvc.call(this, action);
    };
  }

  
  var _prevVCC = window.viewCitizenCase;
  if (typeof _prevVCC === 'function') {
    window.viewCitizenCase = function (caseId) {
      if (window.innerWidth <= 767) hideFooter();
      return _prevVCC.apply(this, arguments);
    };
  }

  
  var _prevOS = window.openSection;
  if (typeof _prevOS === 'function') {
    window.openSection = function (section) {
      if (window.innerWidth <= 767) hideFooter();
      _prevOS.apply(this, arguments);
    };
  }

  

}());





(function () {

  
  

  function _buildStepper (progressPercentage, statusText) {
    
    var steps = [
      { label: 'Submitted',     threshold: 25  },
      { label: 'Under\nReview', threshold: 40  },
      { label: 'With\nLawyer',  threshold: 60  },
      { label: 'Resolved',      threshold: 100 },
    ];
    var totalSteps = steps.length - 1; 
    
    var activeIdx = 0;
    steps.forEach(function (s, i) { if (progressPercentage >= s.threshold) activeIdx = i; });
    var linePct = (activeIdx / totalSteps) * 100;

    var dots = steps.map(function (s, i) {
      var cls = 'mtp-step';
      if (progressPercentage > s.threshold) cls += ' done';
      else if (progressPercentage === s.threshold || i === activeIdx) cls += ' active';
      var icon = (progressPercentage >= s.threshold) ? '&#10003;' : (i + 1);
      var labelHtml = s.label.split('\n').join('<br>');
      return '<div class="' + cls + '"><div class="mtp-step-dot">' + icon + '</div><div class="mtp-step-label">' + labelHtml + '</div></div>';
    }).join('');

    return '<div class="mtp-stepper">' +
      '<div class="mtp-stepper-track">' +
        '<div class="mtp-stepper-line-fill" style="width:calc(' + linePct + '% - 28px + ' + (linePct > 0 ? '14' : '0') + 'px)"></div>' +
        dots +
      '</div>' +
      '<div class="mtp-status-label">&#9679;&nbsp;' + statusText + '</div>' +
    '</div>';
  }

  function _badgeHtml (status) {
    var cls = 'mtp-badge-pending';
    if (status === 'Resolved') cls = 'mtp-badge-resolved';
    else if (status === 'Accepted by Lawyer' || status === 'Forwarded to Lawyer') cls = 'mtp-badge-lawyer';
    else if (status === 'Forwarded to LC2' || status === 'Awaiting Lawyer Selection') cls = 'mtp-badge-review';
    return '<span class="mtp-rc-badge ' + cls + '">' + escapeHtml(status || 'Pending') + '</span>';
  }

  function _renderMobileResult (container, foundCase) {
    var prog = 25, statusText = 'Pending Review';
    if (foundCase.status === 'Forwarded to LC2' || foundCase.status === 'Awaiting Lawyer Selection') { prog = 40; statusText = 'Under Review'; }
    else if (foundCase.status === 'Accepted by Lawyer' || foundCase.status === 'Forwarded to Lawyer')  { prog = 60; statusText = 'With Lawyer'; }
    else if (foundCase.status === 'Resolved') { prog = 100; statusText = 'Resolved '; }

    var extraNotes = foundCase.extraNotes
      ? '<div class="mtp-info-section"><div class="mtp-section-title">Supplemental Notes</div><div class="mtp-statement">' + escapeHtml(foundCase.extraNotes) + '</div></div>'
      : '';

    var legalAdvice = foundCase.legalAdvice
      ? '<div class="mtp-feedback-row mtp-feedback-adv"><span class="mtp-feedback-label"> Legal Advice From Lawyer</span>' + escapeHtml(foundCase.legalAdvice) + '</div>'
      : '';

    var subDate = foundCase.submissionDate
      ? '<div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:6px;">Submitted: ' + new Date(foundCase.submissionDate).toLocaleDateString() + '</div>'
      : '';

    container.innerHTML =
      '<div class="mtp-result-card">' +
        
        '<div class="mtp-rc-head">' +
          '<div class="mtp-rc-lookup">File Lookup Successful</div>' +
          '<div class="mtp-rc-caseid"> ' + escapeHtml(foundCase.caseId || '') + '</div>' +
          _badgeHtml(foundCase.status) +
          subDate +
        '</div>' +
        
        _buildStepper(prog, statusText) +
        
        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Case Details</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">' +
            '<div class="mtp-info-row"><span class="mtp-info-label">Category</span><span class="mtp-info-value">' + escapeHtml(foundCase.caseType || 'N/A') + '</span></div>' +
            '<div class="mtp-info-row"><span class="mtp-info-label">Complainant</span><span class="mtp-info-value">' + escapeHtml(foundCase.citizen || 'N/A') + '</span></div>' +
            '<div class="mtp-info-row"><span class="mtp-info-label">Assigned Level</span><span class="mtp-info-value">' + escapeHtml(foundCase.level || 'N/A') + '</span></div>' +
            '<div class="mtp-info-row"><span class="mtp-info-label">Location</span><span class="mtp-info-value">' + escapeHtml((foundCase.village || '') + (foundCase.parish ? ', ' + foundCase.parish : '') || 'N/A') + '</span></div>' +
          '</div>' +
        '</div>' +
        
        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Claim Statement</div>' +
          '<div class="mtp-statement">&ldquo;' + escapeHtml(lcdjpReadableDescription(foundCase.description)) + '&rdquo;</div>' +
          (foundCase.attachedMedia ? '<div style="font-size:12px;color:#8899bb;margin-top:8px;"> Media: <strong>' + escapeHtml(foundCase.attachedMedia) + '</strong></div>' : '') +
        '</div>' +
        
        extraNotes +
        
        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Jurisdictional Feedback</div>' +
          '<div class="mtp-feedback-row mtp-feedback-lc"><span class="mtp-feedback-label"> Local Council Comments</span>' + (foundCase.lcComments ? escapeHtml(foundCase.lcComments) : '<span style="color:#aab;font-style:italic;">No comments yet.</span>') + '</div>' +
          '<div class="mtp-feedback-row mtp-feedback-wit"><span class="mtp-feedback-label"> Witness Statements</span>' + (foundCase.lcStatements ? escapeHtml(foundCase.lcStatements) : '<span style="color:#aab;font-style:italic;">No statements yet.</span>') + '</div>' +
          '<div class="mtp-feedback-row mtp-feedback-ev"><span class="mtp-feedback-label"> Evidence Files</span>' + escapeHtml(foundCase.lcEvidenceFile || 'None uploaded') + '</div>' +
          legalAdvice +
        '</div>' +
        
        '<button class="mtp-print-btn" onclick="printCaseDetails(' + escapeHtml(JSON.stringify(String(foundCase.caseId))) + ')"> Print Case File</button>' +
      '</div>';
  }

  
  var _origShowTrack = typeof showTrackCaseTab === 'function' ? showTrackCaseTab : null;

  window.showTrackCaseTab = function () {
    
    if (window.innerWidth >= 768) {
      if (typeof _origShowTrack === 'function') _origShowTrack.call(this);
      return;
    }

    
    document.body.classList.remove('mobile-home-active');

    
    var old = document.getElementById('mobileTrackPanel');
    if (old) old.remove();

    var panel = document.createElement('div');
    panel.id = 'mobileTrackPanel';
    panel.innerHTML =
      
      '<div class="mtp-header">' +
        '<span class="mtp-title"> Track Case</span>' +
        '<button class="mtp-close" aria-label="Close" onclick="(function(){var p=document.getElementById(\'mobileTrackPanel\');if(p)p.remove();document.body.classList.remove(\'mobile-home-active\');if(typeof showHome===\'function\')showHome();})()">&#x2715;</button>' +
      '</div>' +
      
      '<div class="mtp-body">' +
        '<div class="mtp-search-card">' +
          '<div class="mtp-sc-label">Enter Case ID</div>' +
          '<div class="mtp-sc-desc">Type your unique case reference number to look up its current status and history.</div>' +
          '<input id="mobileTrackInput" type="text" placeholder="e.g. CASE001" autocomplete="off" autocapitalize="characters">' +
          '<button class="mtp-search-btn" onclick="_mobileTrackSearch()">Search</button>' +
        '</div>' +
        '<div id="mobileTrackResult"></div>' +
      '</div>';

    document.body.appendChild(panel);

    
    setTimeout(function () {
      var inp = document.getElementById('mobileTrackInput');
      if (inp) inp.focus();
    }, 120);
  };

  
  window._mobileTrackSearch = async function () {
    var inp = document.getElementById('mobileTrackInput');
    var container = document.getElementById('mobileTrackResult');
    if (!inp || !container) return;
    var idValue = inp.value.trim().toUpperCase();
    if (!idValue) {
      container.innerHTML = '<div class="mtp-error"><strong>Please enter a Case ID</strong> (e.g. CASE001) to continue.</div>';
      return;
    }

    
    container.innerHTML = '<div class="mtp-empty"><div style="font-size:32px;margin-bottom:10px;"></div>Looking up case&hellip;</div>';

    try {
      var token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
      if (!token) {
        container.innerHTML = '<div class="mtp-error"><strong>Authentication Error.</strong> Please log in again.</div>';
        return;
      }
      var response = await fetch(API_ENDPOINTS.case(idValue), {  });
      if (!response.ok) {
        if (response.status === 404) {
          container.innerHTML = '<div class="mtp-error"> <strong>No record found</strong> for "<em>' + escapeHtml(idValue) + '</em>".<br>Please verify the Case ID and try again.</div>';
        } else {
          throw new Error('HTTP ' + response.status);
        }
        return;
      }
      var foundCase = await response.json();
      _renderMobileResult(container, foundCase);
    } catch (e) {
      container.innerHTML = '<div class="mtp-error"> <strong>Connection error.</strong> Could not fetch case details.<br>' + escapeHtml(e.message || '') + '</div>';
    }
  };

  
  document.addEventListener('keydown', function (e) {
    var inp = document.getElementById('mobileTrackInput');
    if (inp && document.activeElement === inp && (e.key === 'Enter' || e.keyCode === 13)) {
      window._mobileTrackSearch();
    }
  });

}());





(function () {
  'use strict';

  
  window._renderMobileResult = function (container, foundCase) {
    var prog = 25, statusText = 'Pending Review';
    if (foundCase.status === 'Forwarded to LC2' || foundCase.status === 'Awaiting Lawyer Selection') {
      prog = 40; statusText = 'Under Review';
    } else if (foundCase.status === 'Accepted by Lawyer' || foundCase.status === 'Forwarded to Lawyer') {
      prog = 60; statusText = 'With Lawyer';
    } else if (foundCase.status === 'Resolved') {
      prog = 100; statusText = 'Resolved';
    }
    function _badge(status) {
      var cls = 'mtp-badge-pending';
      if (status === 'Resolved') cls = 'mtp-badge-resolved';
      else if (status === 'Accepted by Lawyer' || status === 'Forwarded to Lawyer') cls = 'mtp-badge-lawyer';
      else if (status === 'Forwarded to LC2' || status === 'Awaiting Lawyer Selection') cls = 'mtp-badge-review';
      return '<span class="mtp-rc-badge ' + cls + '">' + escapeHtml(status || 'Pending') + '</span>';
    }
    var stepperHtml = (typeof window.__mtp_buildStepper === 'function') ? window.__mtp_buildStepper(prog, statusText) : '';
    var subDate = foundCase.submissionDate
      ? '<div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:6px;">Submitted: ' +
        new Date(foundCase.submissionDate).toLocaleDateString() + '</div>' : '';
    function infoRow(label, val) {
      if (!val || String(val) === 'N/A' || String(val) === 'null' || String(val) === 'undefined') val = 'N/A';
      return '<div class="mtp-info-row"><span class="mtp-info-label">' + label +
             '</span><span class="mtp-info-value">' + escapeHtml(val) + '</span></div>';
    }
    var grid =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">' +
        infoRow('Case ID',        foundCase.caseReference || foundCase.caseNumber || 'N/A') +
        infoRow('Category',       foundCase.caseType || 'N/A') +
        infoRow('Complainant',    foundCase.citizen || foundCase.complainant || 'N/A') +
        infoRow('Assigned Level', foundCase.level || 'N/A') +
        infoRow('Status',         foundCase.status || 'N/A') +
        infoRow('Village',        foundCase.village || 'N/A') +
        infoRow('Parish',         foundCase.parish || 'N/A') +
        infoRow('Sub-county',     foundCase.subCounty || foundCase.sub_county || 'N/A') +
        infoRow('District',       foundCase.district || 'N/A') +
        infoRow('Respondent',     foundCase.respondent || foundCase.defendant || 'N/A') +
        infoRow('NIN',            foundCase.nin || 'N/A') +
        infoRow('Phone',          foundCase.phone || foundCase.citizenPhone || 'N/A') +
      '</div>';
    var mediaHtml = foundCase.attachedMedia
      ? '<div style="font-size:12px;color:#5a6a8a;margin-top:8px;">Media: <strong>' + escapeHtml(foundCase.attachedMedia) + '</strong></div>' : '';
    var extraNotes = foundCase.extraNotes
      ? '<div class="mtp-info-section"><div class="mtp-section-title">Supplemental Notes</div><div class="mtp-statement">' + escapeHtml(foundCase.extraNotes) + '</div></div>' : '';
    var legalAdvice = foundCase.legalAdvice
      ? '<div class="mtp-feedback-row mtp-feedback-adv"><span class="mtp-feedback-label">Legal Advice From Lawyer</span>' + escapeHtml(foundCase.legalAdvice) + '</div>' : '';
    container.innerHTML =
      '<div class="mtp-result-card">' +
        '<div class="mtp-rc-head"><div class="mtp-rc-lookup">File Lookup Successful</div>' +
          '<div class="mtp-rc-caseid">' + escapeHtml(foundCase.caseReference || foundCase.caseNumber || '') + '</div>' +
          _badge(foundCase.status) + subDate + '</div>' +
        stepperHtml +
        '<div class="mtp-info-section"><div class="mtp-section-title">Case Details</div>' + grid + '</div>' +
        '<div class="mtp-info-section"><div class="mtp-section-title">Claim Statement</div>' +
          '<div class="mtp-statement">&ldquo;' + escapeHtml(lcdjpReadableDescription(foundCase.description)) + '&rdquo;</div>' + mediaHtml + '</div>' +
        extraNotes +
        '<div class="mtp-info-section"><div class="mtp-section-title">Jurisdictional Feedback</div>' +
          '<div class="mtp-feedback-row mtp-feedback-lc"><span class="mtp-feedback-label">Local Council Comments</span>' +
            (foundCase.lcComments ? escapeHtml(foundCase.lcComments) : '<span style="color:#8899bb;font-style:italic;">No comments yet.</span>') + '</div>' +
          '<div class="mtp-feedback-row mtp-feedback-wit"><span class="mtp-feedback-label">Witness Statements</span>' +
            (foundCase.lcStatements ? escapeHtml(foundCase.lcStatements) : '<span style="color:#8899bb;font-style:italic;">No statements yet.</span>') + '</div>' +
          '<div class="mtp-feedback-row mtp-feedback-ev"><span class="mtp-feedback-label">Evidence Files</span>' +
            escapeHtml(foundCase.lcEvidenceFile || 'None uploaded') + '</div>' +
          legalAdvice + '</div>' +
        '<button class="mtp-print-btn" onclick="printCaseDetails(' + escapeHtml(JSON.stringify(String(foundCase.caseReference || foundCase.caseNumber || ''))) + ')">Print Case File</button>' +
      '</div>';
  };

  
  window.__mtp_buildStepper = function (pct, statusText) {
    var steps = [{label:'Submitted',threshold:25},{label:'Under Review',threshold:40},{label:'With Lawyer',threshold:60},{label:'Resolved',threshold:100}];
    var activeIdx = 0;
    steps.forEach(function(s,i){if(pct>=s.threshold)activeIdx=i;});
    var linePct = (activeIdx/(steps.length-1))*100;
    var dots = steps.map(function(s,i){
      var cls='mtp-step'; if(pct>s.threshold)cls+=' done'; else if(i===activeIdx)cls+=' active';
      var icon=(pct>=s.threshold)?'&#10003;':(i+1);
      return '<div class="'+cls+'"><div class="mtp-step-dot">'+icon+'</div><div class="mtp-step-label">'+s.label+'</div></div>';
    }).join('');
    return '<div class="mtp-stepper"><div class="mtp-stepper-track"><div class="mtp-stepper-line-fill" style="width:calc('+linePct+'% - 28px + '+(linePct>0?'14':'0')+'px)"></div>'+dots+'</div><div class="mtp-status-label">&#9679;&nbsp;'+statusText+'</div></div>';
  };

  
  var _origST7 = window.showTrackCaseTab;
  window.showTrackCaseTab = function() {
    if(window.innerWidth>=768){if(typeof _origST7==='function')_origST7.call(this);return;}
    document.body.classList.remove('mobile-home-active');
    var old=document.getElementById('mobileTrackPanel');if(old)old.remove();
    var lang=sessionStorage.getItem('lcdjp_language')||'en';
    var tMap=(typeof translations!=='undefined')?(translations[lang]||translations['en']):{};
    var panelTitle=tMap['track_menu']||'Track Case';
    var panel=document.createElement('div');
    panel.id='mobileTrackPanel';
    panel.innerHTML='<div class="mtp-header"><span class="mtp-title">'+panelTitle+'</span>'+
      '<button class="mtp-close" aria-label="Close" onclick="(function(){var p=document.getElementById(\'mobileTrackPanel\');if(p)p.remove();document.body.classList.remove(\'mobile-home-active\');if(typeof showHome===\'function\')showHome();})()">&#x2715;</button></div>'+
      '<div class="mtp-body"><div class="mtp-search-card">'+
        '<div class="mtp-sc-label">Enter Case ID</div>'+
        '<div class="mtp-sc-desc">Type your unique case reference number to look up its current status and history.</div>'+
        '<input id="mobileTrackInput" type="text" placeholder="e.g. CASE001" autocomplete="off" autocapitalize="characters">'+
        '<button class="mtp-search-btn" onclick="_mobileTrackSearch()">Search</button>'+
      '</div><div id="mobileTrackResult"></div></div>';
    document.body.appendChild(panel);
    setTimeout(function(){var inp=document.getElementById('mobileTrackInput');if(inp)inp.focus();},120);
  };

  
  window._mobileTrackSearch = async function() {
    var inp=document.getElementById('mobileTrackInput'),container=document.getElementById('mobileTrackResult');
    if(!inp||!container)return;
    var idValue=inp.value.trim().toUpperCase();
    if(!idValue){container.innerHTML='<div class="mtp-error"><strong>Please enter a Case ID</strong> (e.g. CASE001) to continue.</div>';return;}
    container.innerHTML='<div class="mtp-empty"><div style="font-size:26px;margin-bottom:10px;color:#8899bb;">&#8987;</div>Looking up case&hellip;</div>';
    try{
      var token=(typeof getAuthToken==='function')?getAuthToken():null;
      if(!token){container.innerHTML='<div class="mtp-error"><strong>Authentication Error.</strong> Please log in again.</div>';return;}
      var response=await fetch(API_ENDPOINTS.case(idValue),{});
      if(!response.ok){
        if(response.status===404)container.innerHTML='<div class="mtp-error"><strong>No record found</strong> for &ldquo;<em>'+escapeHtml(idValue)+'</em>&rdquo;.<br>Please verify the Case ID and try again.</div>';
        else throw new Error('HTTP '+response.status);
        return;
      }
      var foundCase=await response.json();
      window._renderMobileResult(container,foundCase);
    }catch(e){container.innerHTML='<div class="mtp-error"><strong>Connection error.</strong> Could not fetch case details.<br>'+escapeHtml(e.message||'')+'</div>';}
  };

  
  var _origODV7 = window.openDynamicView;
  window.openDynamicView = function(html) {
    if(typeof _origODV7==='function')_origODV7.call(this,html);
    if(window.innerWidth>=768)return;
    var ul=(sessionStorage.getItem('lcdjp_userlevel')||'').toLowerCase();
    
    
    
    
    
    
    if(ul!=='citizen'&&ul!=='lawyer')return;
    var old=document.getElementById('mobileDynamicOverlay');
    var _hadExisting = !!old;
    if(old)old.remove();
    var overlay=document.createElement('div');overlay.id='mobileDynamicOverlay';
    var lang=sessionStorage.getItem('lcdjp_language')||'en';
    var tMap=(typeof translations!=='undefined')?(translations[lang]||translations['en']):{};
    
    
    
    var title=tMap['new_submission_title']||'Case Submission';
    var _tmp=document.createElement('div');_tmp.innerHTML=html;
    var _heading=_tmp.querySelector('h2,h3');
    if(ul==='lawyer'&&_heading&&_heading.textContent.trim())title=_heading.textContent.trim();
    var hdr=document.createElement('div');hdr.className='mdo-header';
    var te=document.createElement('span');te.className='mdo-title';te.textContent=title;
    var xb=document.createElement('button');xb.className='mdo-close';xb.setAttribute('aria-label','Close');xb.innerHTML='&times;';
    xb.onclick=function(){
      overlay.remove();
      if (typeof window.unlockScroll === 'function') { window.unlockScroll(); }
      else { document.body.style.overflow=''; document.documentElement.style.overflow=''; }
      document.body.classList.remove('mobile-home-active');
      if(ul==='lawyer'&&typeof showLawyerDashboard==='function')showLawyerDashboard();
      else if(typeof showHome==='function')showHome();
    };
    hdr.appendChild(te);hdr.appendChild(xb);overlay.appendChild(hdr);
    var body=document.createElement('div');body.className='mdo-body';body.innerHTML=html;overlay.appendChild(body);
    
    
    
    
    
    
    
    
    
    document.body.insertBefore(overlay, document.body.firstChild);
    
    
    
    
    if (!_hadExisting) lockScroll();
    (function(){
      var t=(typeof translations!=='undefined')?(translations[lang]||translations['en']):{};
      overlay.querySelectorAll('[data-translate]').forEach(function(el){var k=el.getAttribute('data-translate');if(t[k]!==undefined&&!el.children.length)el.textContent=t[k];});
      overlay.querySelectorAll('[data-translate-placeholder]').forEach(function(el){var k=el.getAttribute('data-translate-placeholder');if(t[k])el.placeholder=t[k];});
      overlay.querySelectorAll('select option[data-translate]').forEach(function(el){var k=el.getAttribute('data-translate');if(t[k])el.textContent=t[k];});
      var ds=overlay.querySelector('[id="caseDistrict"]');
      if(ds&&typeof ugandaDistricts!=='undefined'){ds.innerHTML='<option value="">-- Select District --</option>';[].concat(ugandaDistricts).sort().forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;ds.appendChild(o);});}
    })();
  };

  
  var _origSMMP7 = window.showMobileMenuPanel;
  window.showMobileMenuPanel = function(menuId) {
    if(typeof _MOBILE_PANELS!=='undefined'&&_MOBILE_PANELS[menuId]){
      var lang=sessionStorage.getItem('lcdjp_language')||'en';
      if(lang!=='en'&&typeof translations!=='undefined'){
        var t=translations[lang]||translations['en'];
        var lk={'Family Dispute':'family_dispute','Land Matter':'land_matter','Business Matter':'business_matter','Community Disputes':'community_disputes','Inheritance Dispute':'inheritance_dispute','Boundary Dispute':'boundary_dispute','Marriage Dispute':'marriage_dispute','Child Custody':'child_custody','Debt Recovery':'debt_recovery','Others':'others','Know Your Rights':'know_your_rights','Common Legal Questions':'common_questions','AI Legal Guidance':'ai_guidance','Legal Templates':'legal_templates','Find A Lawyer':'find_lawyer','Legal Aid Providers':'legal_aid','Local Council Offices':'local_councils','Emergency Support':'emergency_support','Land & Property Law':'land_law','Family & Marriage Law':'family_law','Business & Employment Law':'employment_law','Community Disputes (LC)':'community_law'};
        var tk={'reportMenu':'report_menu','legalMenu':'legal_menu','sidebarFindHelpMenu':'help_menu','educationMenu':'education_menu'};
        var p=_MOBILE_PANELS[menuId];
        var tr={title:(tk[menuId]&&t[tk[menuId]])?t[tk[menuId]]:p.title,items:p.items.map(function(item){var k=lk[item.label];return{icon:item.icon,label:(k&&t[k])?t[k]:item.label,desc:item.desc,action:item.action};})};
        var orig=_MOBILE_PANELS[menuId];_MOBILE_PANELS[menuId]=tr;
        if(typeof _origSMMP7==='function')_origSMMP7.call(this,menuId);
        _MOBILE_PANELS[menuId]=orig;return;
      }
    }
    if(typeof _origSMMP7==='function')_origSMMP7.call(this,menuId);
  };

  
  var _origTCF7 = window.translateCaseForm;
  window.translateCaseForm = function(lang) {
    if(typeof _origTCF7==='function')_origTCF7.call(this,lang);
    var ov=document.getElementById('mobileDynamicOverlay');if(!ov||typeof translations==='undefined')return;
    var t=translations[lang]||translations['en'];
    ov.querySelectorAll('[data-translate]').forEach(function(el){var k=el.getAttribute('data-translate');if(t[k]!==undefined&&!el.children.length)el.textContent=t[k];});
    ov.querySelectorAll('[data-translate-placeholder]').forEach(function(el){var k=el.getAttribute('data-translate-placeholder');if(t[k])el.placeholder=t[k];});
    ov.querySelectorAll('select option[data-translate]').forEach(function(el){var k=el.getAttribute('data-translate');if(t[k])el.textContent=t[k];});
    var te=ov.querySelector('.mdo-title');if(te&&t['new_submission_title'])te.textContent=t['new_submission_title'];
  };

}());





(function () {
  'use strict';

  
  function _f(obj) {
    return {
      caseId:          obj.caseReference   || obj.caseNumber    || '',
      caseType:        obj.case_type        || obj.caseType       || '',
      citizen:         obj.citizen          || obj.citizen_name   || obj.citizenId    || obj.citizen_id || obj.citizenUsername || '',
      citizenUsername: obj.citizen_id       || obj.citizenUsername|| '',
      citizenPhone:    obj.citizen_phone    || obj.citizenPhone   || '',
      citizenEmail:    obj.citizen_email    || obj.citizenEmail   || '',
      level:           obj.current_level    || obj.level          || '',
      status:          obj.status           || '',
      village:         obj.village          || '',
      parish:          obj.parish           || '',
      subCounty:       obj.sub_county       || obj.subCounty      || '',
      county:          obj.county           || '',
      district:        obj.district         || '',
      fullLocation:    obj.full_location    || obj.fullLocation   || '',
      kinName:         obj.kin_name         || obj.kinName        || '',
      kinPhone:        obj.kin_phone        || obj.kinPhone       || '',
      kinEmail:        obj.kin_email        || obj.kinEmail       || '',
      kinRelationship: obj.kin_relationship || obj.kinRelationship|| '',
      description:     obj.description      || '',
      extraNotes:      obj.extra_notes      || obj.extraNotes     || '',
      lcComments:      obj.lc_comments      || obj.lcComments     || '',
      lcStatements:    obj.lc_statements    || obj.lcStatements   || '',
      lcEvidenceFile:  obj.lc_evidence_file || obj.lcEvidenceFile || '',
      legalAdvice:     obj.legal_advice     || obj.legalAdvice    || '',
      attachedMedia:   obj.attached_media   || obj.attachedMedia  || '',
      submissionDate:  obj.submission_date  || obj.submissionDate || '',
      assignedLawyer:  obj.assigned_lawyer_name || obj.assignedLawyerName || obj.assigned_lawyer || obj.assignedLawyer || '',
      respondent:      obj.respondent       || obj.defendant      || '',
      nin:             obj.nin              || ''
    };
  }

  
  function _mtpSearchCardEl() {
    return document.querySelector('#mobileTrackPanel .mtp-search-card');
  }
  function _mtpHideSearchCard() {
    var el = _mtpSearchCardEl();
    if (el) el.style.display = 'none';
  }
  function _mtpShowSearchCard() {
    var el = _mtpSearchCardEl();
    if (el) el.style.display = '';
  }
  
  window._mobileTrackNewSearch = function () {
    _mtpShowSearchCard();
    var container = document.getElementById('mobileTrackResult');
    if (container) container.innerHTML = '';
    var inp = document.getElementById('mobileTrackInput');
    if (inp) { inp.value = ''; inp.focus(); }
  };

  
  window._mobileTrackSearch = async function () {
    var inp = document.getElementById('mobileTrackInput');
    var container = document.getElementById('mobileTrackResult');
    if (!inp || !container) return;
    var idValue = inp.value.trim().toUpperCase();
    if (!idValue) {
      container.innerHTML = '<div class="mtp-error"><strong>Please enter a Case ID</strong> (e.g. CASE001) to continue.</div>';
      return;
    }
    
    _mtpHideSearchCard();
    container.innerHTML = '<div class="mtp-empty"><div style="font-size:26px;margin-bottom:10px;color:#8899bb;">&#8987;</div>Looking up case&hellip;</div>';
    try {
      var token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
      if (!token) {
        container.innerHTML = '<div class="mtp-error"><strong>Authentication Error.</strong> Please log in and try again.</div>';
        _mtpShowSearchCard();
        return;
      }
      var response = await fetch(API_ENDPOINTS.case(idValue), {  });
      if (!response.ok) {
        if (response.status === 404) {
          container.innerHTML = '<div class="mtp-error"><strong>No record found</strong> for &ldquo;<em>' + escapeHtml(idValue) + '</em>&rdquo;.<br>Please verify the Case ID and try again.</div>';
        } else {
          throw new Error('HTTP ' + response.status);
        }
        _mtpShowSearchCard();
        return;
      }
      var data = await response.json();
      
      var rawCase = (data && data.case) ? data.case : data;
      window._renderMobileResult(container, rawCase);
    } catch (e) {
      container.innerHTML = '<div class="mtp-error"><strong>Connection error.</strong> Could not fetch case details.<br>' + escapeHtml(e.message || '') + '</div>';
      _mtpShowSearchCard();
    }
  };

  
  window._renderMobileResult = function (container, rawCase) {
    var c = _f(rawCase);

    
    var prog = 25, statusText = 'Pending Review';
    if (c.status === 'Forwarded to LC2' || c.status === 'Awaiting Lawyer Selection') {
      prog = 40; statusText = 'Under Review';
    } else if (c.status === 'Accepted by Lawyer' || c.status === 'Forwarded to Lawyer') {
      prog = 60; statusText = 'With Lawyer';
    } else if (c.status === 'Resolved') {
      prog = 100; statusText = 'Resolved';
    }

    var stepperHtml = (typeof window.__mtp_buildStepper === 'function')
      ? window.__mtp_buildStepper(prog, statusText) : '';

    
    function badge(status) {
      var cls = 'mtp-badge-pending';
      if (status === 'Resolved') cls = 'mtp-badge-resolved';
      else if (status === 'Accepted by Lawyer' || status === 'Forwarded to Lawyer') cls = 'mtp-badge-lawyer';
      else if (status === 'Forwarded to LC2' || status === 'Awaiting Lawyer Selection') cls = 'mtp-badge-review';
      return '<span class="mtp-rc-badge ' + cls + '">' + escapeHtml(status || 'Pending') + '</span>';
    }

    
    function row(label, val) {
      var v = (val && String(val).trim() && String(val) !== 'null' && String(val) !== 'undefined') ? val : '';
      if (!v) return '';   
      return '<div class="mtp-info-row"><span class="mtp-info-label">' + label +
             '</span><span class="mtp-info-value">' + escapeHtml(v) + '</span></div>';
    }

    
    var subDate = '';
    if (c.submissionDate) {
      try { subDate = '<div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:6px;">Submitted: ' + new Date(c.submissionDate).toLocaleDateString() + '</div>'; }
      catch(e) {}
    }

    
    var locationVal = c.fullLocation;
    if (!locationVal) {
      locationVal = [c.village, c.parish, c.subCounty, c.county, c.district].filter(Boolean).join(', ');
    }

    
    var grid =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">' +
        row('Case ID',        c.caseId) +
        row('Category',       c.caseType) +
        row('Complainant',    c.citizen) +
        row('Username',       c.citizenUsername) +
        row('Assigned Level', c.level) +
        row('Status',         c.status) +
        row('Village',        c.village) +
        row('Parish',         c.parish) +
        row('Sub-county',     c.subCounty) +
        row('County',         c.county) +
        row('District',       c.district) +
        row('Phone',          c.citizenPhone) +
        row('Email',          c.citizenEmail) +
        row('NIN',            c.nin) +
        row('Respondent',     c.respondent) +
      '</div>';

    
    var kinSection = '';
    if (c.kinName) {
      kinSection =
        '<div class="mtp-info-section"><div class="mtp-section-title">Next of Kin</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">' +
            row('Name',         c.kinName) +
            row('Phone',        c.kinPhone) +
            row('Email',        c.kinEmail) +
            row('Relationship', c.kinRelationship) +
          '</div></div>';
    }

    
    var mediaHtml = (c.attachedMedia && c.attachedMedia !== 'None Uploaded' && c.attachedMedia !== 'None')
      ? '<div style="font-size:12px;color:#5a6a8a;margin-top:8px;">Attached: <strong>' + escapeHtml(c.attachedMedia) + '</strong></div>'
      : '';

    
    var extraSection = c.extraNotes
      ? '<div class="mtp-info-section"><div class="mtp-section-title">Supplemental Notes</div>' +
        '<div class="mtp-statement">' + escapeHtml(c.extraNotes) + '</div></div>'
      : '';

    
    var lcBlock = (c.lcComments || c.lcStatements || c.lcEvidenceFile || c.legalAdvice)
      ? '<div class="mtp-info-section"><div class="mtp-section-title">Jurisdictional Feedback</div>' +
          (c.lcComments
            ? '<div class="mtp-feedback-row mtp-feedback-lc"><span class="mtp-feedback-label">LC Comments</span>' + escapeHtml(c.lcComments) + '</div>'
            : '') +
          (c.lcStatements
            ? '<div class="mtp-feedback-row mtp-feedback-wit"><span class="mtp-feedback-label">Witness Statements</span>' + escapeHtml(c.lcStatements) + '</div>'
            : '') +
          (c.lcEvidenceFile && c.lcEvidenceFile !== 'None Uploaded'
            ? '<div class="mtp-feedback-row mtp-feedback-ev"><span class="mtp-feedback-label">Evidence Files</span>' + escapeHtml(c.lcEvidenceFile) + '</div>'
            : '') +
          (c.legalAdvice
            ? '<div class="mtp-feedback-row mtp-feedback-adv"><span class="mtp-feedback-label">Legal Advice' + (c.assignedLawyer ? ' (' + escapeHtml(c.assignedLawyer) + ')' : '') + '</span>' + escapeHtml(c.legalAdvice) + '</div>'
            : '') +
        '</div>'
      : '';

    container.innerHTML =
      '<div class="mtp-result-card">' +
        '<div class="mtp-rc-head">' +
          '<button type="button" class="mtp-new-search-btn" onclick="_mobileTrackNewSearch()">&larr; New Search</button>' +
          '<div class="mtp-rc-lookup">File Lookup Successful</div>' +
          '<div class="mtp-rc-caseid">' + escapeHtml(c.caseId) + '</div>' +
          badge(c.status) + subDate +
        '</div>' +
        stepperHtml +

        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Case Details</div>' +
          (locationVal ? '<div style="font-size:12px;color:#5a6a8a;margin-bottom:8px;">Location: ' + escapeHtml(locationVal) + '</div>' : '') +
          grid +
        '</div>' +

        '<div class="mtp-info-section">' +
          '<div class="mtp-section-title">Claim Statement</div>' +
          '<div class="mtp-statement">' + (c.description ? '&ldquo;' + escapeHtml(lcdjpReadableDescription(c.description)) + '&rdquo;' : '<span style="color:#8899bb;font-style:italic;">No statement on record.</span>') + '</div>' +
          mediaHtml +
        '</div>' +

        kinSection +
        extraSection +
        lcBlock +

        '<button class="mtp-print-btn" onclick="printCaseDetails(' + escapeHtml(JSON.stringify(String(c.caseId))) + ')">Print Case File</button>' +
      '</div>';
  };

}());