





(function() {
  'use strict';

  var _aiState = {
    step: 0,
    category: null,
    qIndex: 0,
    answers: {},
    contactType: null,
    chatMode: false,
    assistantMode: 'incident',
    userLat: null,
    userLng: null,
    lcResults: [],
    policeResults: [],
    placeResults: [],
    kin: { name: '', phone: '', email: '', relationship: '' },
    attachment: null
  };
  var _aiHideTimer = null; 

  
  
  
  
  
  
  var _AI_OUTSIDE_UGANDA_TOKEN = '[[LCDJP_OUTSIDE_UGANDA]]';

  // Short-term memory for the current assistant conversation. It is sent with each free-text message so the
  // assistant can follow up on what was already said, and it is reset whenever a new conversation starts
  // (the code that starts one replaces _aiState, or clears history explicitly).
  function _aiRememberTurn(userText, botText) {
    if (!_aiState.history) _aiState.history = [];
    _aiState.history.push({ role: 'user', content: String(userText || '') });
    if (botText) _aiState.history.push({ role: 'assistant', content: String(botText) });
    if (_aiState.history.length > 12) _aiState.history = _aiState.history.slice(-12);
  }

  async function _callHuggingFaceBackend(userMessage, systemContext, useHistory) {
    try {
      var augmentedContext = (systemContext || '')
        + ' IMPORTANT: If -- and only if -- something the user has actually said (just now or earlier '
        + 'in this conversation) makes it reasonably clear they are currently physically located outside '
        + 'Uganda, append the exact text ' + _AI_OUTSIDE_UGANDA_TOKEN + ' on its own new line at the very '
        + 'end of your reply, after your normal answer. Never mention this marker to the user, never ask '
        + 'them where they are just to check, and do not include it on a mere guess.';
      var payload = {
        message: userMessage,
        context: augmentedContext,
        category: _aiState.category || '',
        answers: _aiState.answers || {},
        history: useHistory ? (_aiState.history || []) : [],
        sessionId: sessionStorage.getItem('lcdjp_username') || 'guest'
      };
      var response = await fetch(API_BASE_URL + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Backend returned ' + response.status);
      var data = await response.json();
      
      
      
      
      
      if (data && data.fallback) return null;
      var reply = data.reply || data.message || data.response || null;
      if (reply && reply.indexOf(_AI_OUTSIDE_UGANDA_TOKEN) !== -1) {
        reply = reply.split(_AI_OUTSIDE_UGANDA_TOKEN).join('').replace(/\s+$/, '');
        _aiMarkOutsideUganda();
      }
      if (useHistory && reply) _aiRememberTurn(userMessage, reply);
      return reply;
    } catch (err) {
      console.warn('[AI] HuggingFace backend unavailable, using local fallback:', err.message);
      return null;
    }
  }

  // Labels double as answer values. Keep them free of apostrophes (they are placed in inline onclick handlers).
  var _AI_INTAKE_NO = 'No, it already happened. I just want to report it';
  var _AI_INTAKE_YES = 'Yes, someone is in danger right now';

  var _aiQuestions = [
    { key: 'what', text: 'What happened? Please describe the incident briefly.' },
    // Report Case asks only for the report itself. There is no typed "where" question (the case details form
    // collects district, sub-county, parish and village) and no "is anyone in danger" choice (emergencies have
    // their own route, and people tend to pick the easiest option rather than the right one). Emergency wording
    // typed here is still caught by the intake service (intent EMERGENCY) and sends the person to nearby help.
    { key: 'when', text: 'When did this happen? (e.g., today at 3pm, this morning)' }
  ];

  
  
  
  
  
  
  var _aiEmergencyQuestions = [
    { key: 'what', text: 'What happened? Please describe briefly, I\'ll take it from here.' }
  ];

  
  
  
  
  
  function _aiCurrentQuestions() {
    return _aiState.emergencyMode ? _aiEmergencyQuestions : _aiQuestions;
  }

  var _aiCategories = [
    { icon: '', label: 'Crime Report' },
    { icon: '', label: 'Accident' },
    { icon: '', label: 'Fire Emergency' },
    { icon: '', label: 'Medical Emergency' },
    { icon: '', label: 'Missing Person' },
    { icon: '', label: 'Road Incident' },
    { icon: '', label: 'Vehicle Breakdown' },
    { icon: '', label: 'Other Emergency' },
    { icon: '', label: 'Family Dispute' },
    { icon: '', label: 'Land Matter' },
    { icon: '', label: 'Business Matter' },
    { icon: '', label: 'Community Disputes' },
    { icon: '', label: 'Inheritance Dispute' },
    { icon: '', label: 'Boundary Dispute' },
    { icon: '', label: 'Marriage Dispute' },
    { icon: '', label: 'Child Custody' },
    { icon: '', label: 'Debt Recovery' },
    { icon: '', label: 'Other Legal Matter' }
  ];

  
  
  
  var _aiLegalCaseLabels = [
    'Family Dispute', 'Land Matter', 'Business Matter', 'Community Disputes',
    'Inheritance Dispute', 'Boundary Dispute', 'Marriage Dispute',
    'Child Custody', 'Debt Recovery', 'Other Legal Matter'
  ];

  
  
  
  
  
  
  
  var _aiCrimeReportLabel = 'Crime Report';

  
  
  
  var _aiEmergencyOnlyLabels = _aiCategories
    .map(function(c) { return c.label; })
    .filter(function(l) { return _aiLegalCaseLabels.indexOf(l) === -1 && l !== _aiCrimeReportLabel; });

  
  
  
  var _aiReportCaseLabels = [_aiCrimeReportLabel].concat(_aiLegalCaseLabels);

  function _getChatArea() { return document.getElementById('aiChatArea'); }

  function _scrollBottom() {
    setTimeout(function() {
      var c = _getChatArea();
      if (c) c.scrollTop = c.scrollHeight;
    }, 60);
  }

  function _setStep(n) {
    _aiState.step = n;
    for (var i = 0; i < 5; i++) {
      var dot = document.getElementById('aiDot' + i);
      if (dot) dot.classList.toggle('active', i <= n);
    }
  }

  function _addBotBubble(html, delay) {
    var area = _getChatArea();
    if (!area) return;
    delay = delay || 0;
    var typing = document.createElement('div');
    typing.className = 'ai-bubble-wrap';
    typing.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    area.appendChild(typing);
    _scrollBottom();
    setTimeout(function() {
      if (!area.contains(typing)) return;
      area.removeChild(typing);
      var wrap = document.createElement('div');
      wrap.className = 'ai-bubble-wrap';
      wrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-bubble">' + html + '</div>';
      area.appendChild(wrap);
      _scrollBottom();
    }, delay + 700);
  }

  function _addUserBubble(text) {
    var area = _getChatArea();
    if (!area) return;
    var wrap = document.createElement('div');
    wrap.className = 'ai-bubble-wrap user';
    wrap.innerHTML = '<div class="ai-bubble user">' + _esc(text) + '</div><div class="ai-avatar" style="background:#1a237e;"></div>';
    area.appendChild(wrap);
    _scrollBottom();
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  










  function _aiIsCitizenVerified() {
    var status = (sessionStorage.getItem('lcdjp_verif_status') || '').toLowerCase();
    return status === 'verified' || status === 'approved';
  }

  
  
  
  
  
  
  async function _aiFetchFreshVerifStatus() {
    try {
      var username = (typeof getLcdjpActiveUsername === 'function')
        ? getLcdjpActiveUsername()
        : (sessionStorage.getItem('lcdjp_username') || '');
      if (!username || typeof API_ENDPOINTS === 'undefined' || !API_ENDPOINTS.verificationStatus) {
        return _aiIsCitizenVerified(); 
      }
      var token = (typeof _getVerificationToken === 'function')
        ? _getVerificationToken()
        : ((typeof getAuthToken === 'function' ? getAuthToken() : null) || '');
      if (!token) return _aiIsCitizenVerified();

      var res = await fetch(API_ENDPOINTS.verificationStatus(username), {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return _aiIsCitizenVerified(); 

      var data = await res.json();
      var raw = data.verificationStatus || data.verification_status || 'not-verified';
      var normalized = typeof _lcdjpNormalizeVerifStatus === 'function'
        ? _lcdjpNormalizeVerifStatus(raw)
        : (raw ? String(raw).toLowerCase() : 'not-verified');
      sessionStorage.setItem('lcdjp_verif_status', normalized);
      localStorage.setItem('lcdjp_verif_status', normalized);
      return normalized === 'verified' || normalized === 'approved';
    } catch (e) {
      console.warn('[LCDJP] Live verification re-check failed, falling back to cached value:', e);
      return _aiIsCitizenVerified();
    }
  }

  function _addWidget(html, delay) {
    var area = _getChatArea();
    if (!area) return;
    delay = delay || 0;
    setTimeout(function() {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'animation:ai-msg-in 0.25s ease; padding-left:44px;';
      wrap.innerHTML = html;
      area.appendChild(wrap);
      _scrollBottom();
    }, delay + 800);
  }

  function _showCategories(mode) {
    _setStep(1);
    var prompt = mode === 'emergency' ? 'What type of emergency are you facing? Please select a category:'
               : mode === 'report'    ? 'What would you like to report? Please select a category:'
               : 'What type of incident would you like to report? Please select a category:';
    _addBotBubble(prompt, 0);
    var cats = mode === 'emergency' ? _aiCategories.filter(function(c) { return _aiEmergencyOnlyLabels.indexOf(c.label) !== -1; })
             : mode === 'report'    ? _aiCategories.filter(function(c) { return _aiReportCaseLabels.indexOf(c.label) !== -1; })
             
             : mode === true        ? _aiCategories.filter(function(c) { return _aiEmergencyOnlyLabels.indexOf(c.label) !== -1; })
             : _aiCategories;
    var html = '<div id="aiCategoryGrid">';
    cats.forEach(function(c) {
      html += '<button class="ai-cat-btn" onclick="window._aiSelectCat(\'' + c.label.replace(/'/g,"\'") + '\')">'
            + '<span class="ai-cat-icon">' + c.icon + '</span>'
            + _esc(c.label)
            + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  






  function _aiPromptVerificationRequired(label) {
    if (label) _addUserBubble(label);
    var what = label ? ('a <strong>' + _esc(label) + '</strong> case') : 'a case';
    _addBotBubble(
      '<div style="background:#fff3e0;border:1.5px solid #f57c00;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:13px;font-weight:700;color:#e65100;margin-bottom:6px;"> Account verification required</div>'
      + '<div style="font-size:13px;color:#333;">To report ' + what + ' and be connected with a legal aid provider or the police, '
      + 'your account needs to be verified first. You can verify now, or continue using this assistant for emergency services only.</div>'
      + '</div>', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#fff3e0; border-color:#f57c00; color:#e65100;" onclick="window._aiGoVerify()"> Verify My Account</button>'
      + '<button class="ai-choice-btn" style="background:#e3f2fd; border-color:#1565c0; color:#1565c0;" onclick="window._aiEmergencyOnly()"> Emergency Services Only</button>'
      + '</div>';
    _addWidget(html, 300);
  }

  window._aiGoVerify = function() {
    _addUserBubble('Verify My Account');
    if (typeof closeAIAssistant === 'function') closeAIAssistant();
    if (typeof showIdVerifyPage === 'function') showIdVerifyPage();
  };

  window._aiEmergencyOnly = function() {
    _addUserBubble('Emergency Services Only');
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addBotBubble('No problem, here are the emergency categories I can help with right now:', 200);
    setTimeout(function() { _showCategories('emergency'); }, 900);
  };

  window._aiSelectCat = function(label) {
    
    
    
    
    
    if ((_aiLegalCaseLabels.indexOf(label) !== -1 || label === _aiCrimeReportLabel) && _aiIsKnownOutsideUganda()) {
      _aiBlockReportCaseOutsideUganda(label);
      return;
    }
    if ((_aiLegalCaseLabels.indexOf(label) !== -1 || label === _aiCrimeReportLabel) && !_aiIsCitizenVerified()) {
      _aiPromptVerificationRequired(label);
      return;
    }
    _aiState.category = label;
    _aiState.qIndex = 0;
    _aiState.answers = {};
    _aiState.history = [];
    
    
    
    
    
    
    _aiState.emergencyMode = _aiLegalCaseLabels.indexOf(label) === -1
      && label !== _aiCrimeReportLabel;
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    _addUserBubble(label);
    _setStep(2);
    if (_aiState.emergencyMode) {
      _addBotBubble(
        '<strong>' + _esc(label) + '</strong> reported. I\'ll locate the nearest help for you now, '
        + 'just tell me what happened and I\'ll take it from there.',
        0
      );
    } else if (label === _aiCrimeReportLabel) {
      _addBotBubble(
        '<strong>' + _esc(label) + '</strong>, got it. I\'ll ask a few quick questions, and if you tell me anyone '
        + 'is in immediate danger I\'ll find the nearest Police or LC office right away.',
        0
      );
    } else {
      _addBotBubble('Understood, <strong>' + _esc(label) + '</strong>. I\'ll help you report this. I just need to ask a few quick questions.', 0);
    }
    setTimeout(function() { _askNextQuestion(); }, 1600);
  };

  function _askNextQuestion() {
    var qs = _aiCurrentQuestions();
    if (_aiState.qIndex >= qs.length) {
      if (_aiState.emergencyMode) { _aiEmergencyAutoLocate(); }
      else if (_aiState.category === _aiCrimeReportLabel) { _aiCrimeReportChoice(); }
      else { _aiCollectCaseDetails(); }
      return;
    }
    var q = qs[_aiState.qIndex];
    if (q.choices) {
      _addBotBubble(q.text, 0);
      var html = '<div class="ai-choices-row">';
      q.choices.forEach(function(ch) {
        html += '<button class="ai-choice-btn" onclick="window._aiAnswerQ(\'' + ch.replace(/'/g,"\'") + '\')">' + _esc(ch) + '</button>';
      });
      html += '</div>';
      _addWidget(html, 0);
    } else {
      _addBotBubble(q.text, 0);
      var input = document.getElementById('aiTextInput');
      if (input) { input.placeholder = 'Type your answer...'; input.focus(); }
    }
  }

  // Second step for a "Yes": people reporting an old incident often tap the first or most urgent-looking button,
  // so confirm before sending anyone looking for emergency help.
  window._aiConfirmUrgent = function(isUrgent) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-confirm-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble(isUrgent ? 'Yes, find help now' : 'No, I only want to report it');
    if (isUrgent) _aiState.urgentConfirmed = true;
    window._aiAnswerQ(isUrgent ? _AI_INTAKE_YES : _AI_INTAKE_NO, true);
  };

  window._aiAnswerQ = function(answer, silent) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    if (!silent) _addUserBubble(answer);
    var q = _aiCurrentQuestions()[_aiState.qIndex];

    if (q.key === 'immediate' && answer === _AI_INTAKE_YES && !_aiState.urgentConfirmed) {
      _addBotBubble('Just to be sure: is someone hurt or in danger <strong>right now</strong>, so that I should look for the nearest Police or emergency help immediately?', 0);
      _addWidget('<div class="ai-choices-row ai-confirm-row">'
        + '<button class="ai-choice-btn" onclick="window._aiConfirmUrgent(false)">No, I only want to report it</button>'
        + '<button class="ai-choice-btn" onclick="window._aiConfirmUrgent(true)">Yes, find help now</button>'
        + '</div>', 0);
      return;
    }

    _aiState.answers[q.key] = answer;
    _aiState.qIndex++;

    
    if (q.key === 'immediate' && answer === _AI_INTAKE_YES) {
      _addBotBubble(
        '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:12px 16px;">'
        + '<div style="font-size:13.5px;font-weight:700;color:#c62828;"> Got it, looking for the nearest help right now...</div>'
        + '</div>',
        0
      );
      _aiImmediateHelpNearby();
      setTimeout(function() { _askNextQuestion(); }, 1500);
      return;
    }

    setTimeout(function() { _askNextQuestion(); }, 600);
  };

  function _aiTypingStart() {
    var area = _getChatArea();
    if (!area) return null;
    var id = 'ai-typing-' + Date.now();
    var wrap = document.createElement('div');
    wrap.id = id;
    wrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
    wrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    area.appendChild(wrap);
    _scrollBottom();
    return id;
  }

  function _aiTypingStop(id) {
    var el = id ? document.getElementById(id) : null;
    if (el) el.remove();
  }

  // Old behaviour, used when the intake service is unavailable: the text answers the question just asked.
  function _aiIntakeFallback(text) {
    var q = _aiCurrentQuestions()[_aiState.qIndex];
    if (!q) return;
    _aiState.answers[q.key] = text;
    _aiState.qIndex++;
    setTimeout(function () { _askNextQuestion(); }, 600);
  }

  // Free text during the report flow. The server reads the message in context and tells us whether it is report
  // details (possibly several fields at once), a question, a correction or an emergency, so we no longer treat
  // every message as the literal answer to whatever the script asked last.
  async function _aiIntakeTurn(text) {
    var stateRef = _aiState;
    var qs = _aiCurrentQuestions();
    var pending = [];
    qs.forEach(function (q) { if (!_aiState.answers[q.key]) pending.push(q.key); });

    var typingId = _aiTypingStart();
    _aiState.intakeBusy = true;
    var data = null;
    try {
      var resp = await fetch(API_BASE_URL + '/api/ai/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          category: _aiState.category || '',
          answers: _aiState.answers || {},
          pendingKeys: pending,
          history: _aiState.history || [],
          sessionId: sessionStorage.getItem('lcdjp_username') || 'guest'
        })
      });
      if (resp.ok) data = await resp.json();
    } catch (e) { data = null; }

    stateRef.intakeBusy = false;
    _aiTypingStop(typingId);
    if (_aiState !== stateRef) return; // the assistant was closed or restarted while we waited

    if (!data || data.fallback) { _aiIntakeFallback(text); return; }

    var ex = data.extracted || {};
    var wasEmergency = _aiState.answers.immediate === _AI_INTAKE_YES;
    var gotField = false;
    qs.forEach(function (q) {
      var v = ex[q.key];
      if (typeof v !== 'string' || !v) return;
      if (q.key === 'immediate') v = (v === 'yes') ? _AI_INTAKE_YES : _AI_INTAKE_NO;
      _aiState.answers[q.key] = v;
      gotField = true;
    });

    var replyText = (typeof data.reply === 'string') ? data.reply.trim() : '';
    _aiRememberTurn(text, replyText);

    // The model called it ANSWER but nothing usable came out: keep the old behaviour rather than looping.
    if (data.intent === 'ANSWER' && !gotField) { _aiIntakeFallback(text); return; }

    var urgent = !_aiState.emergencyMode && !wasEmergency
      && (data.intent === 'EMERGENCY' || _aiState.answers.immediate === _AI_INTAKE_YES);
    if (urgent) _aiState.answers.immediate = _AI_INTAKE_YES;

    if (urgent) {
      _addBotBubble(
        '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:12px 16px;">'
        + '<div style="font-size:13.5px;font-weight:700;color:#c62828;"> Got it, looking for the nearest help right now...</div>'
        + '</div>',
        0
      );
      _aiImmediateHelpNearby();
    } else if (replyText) {
      var html = _esc(replyText).replace(/\n/g, '<br>');
      if (Array.isArray(data.sources) && data.sources.length) {
        html += '<div style="margin-top:8px;font-size:11.5px;color:#667085;"><strong>Sources:</strong> '
          + data.sources.map(function (s) {
              return _esc([s.documentTitle, s.legalSection].filter(Boolean).join(', ') || 'Legal Knowledge library');
            }).join('; ') + '</div>';
      }
      _addBotBubble(html, 0);
    }

    // Ask only for what is still missing.
    var firstOpen = -1;
    for (var i = 0; i < qs.length; i++) {
      if (!_aiState.answers[qs[i].key]) { firstOpen = i; break; }
    }
    _aiState.qIndex = firstOpen === -1 ? qs.length : firstOpen;
    setTimeout(function () { _askNextQuestion(); }, (replyText || urgent) ? 1500 : 600);
  }

  function aiSendMessage() {
    
    
    
    if (_aiState && (_aiState.assistantMode || '').indexOf('lawyer_') === 0) {
      return _lawyerAiSendMessage();
    }
    if (_aiState && (_aiState.assistantMode || '').indexOf('lc_') === 0) {
      return _lcAiSendMessage();
    }

    var input = document.getElementById('aiTextInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';

    var _isLegalAidMode = (_aiState.assistantMode || '').indexOf('legal_aid') === 0;
    var _isFindHelpMode = (_aiState.assistantMode || '').indexOf('find_help') === 0;

    
    
    if (_aiState.assistantMode === 'legal_aid_document_paste') {
      _addUserBubble(text.length > 120 ? text.slice(0, 120) + '…' : text);
      _aiState.assistantMode = 'legal_aid_document';
      _legalAidExplainDocumentCommon(text);
      return;
    }

    
    
    if (!_aiState.chatMode && _aiState.assistantMode === 'legal_aid_complaint') {
      window._legalAidAnswerComplaintQ(text);
      return;
    }

    if (_isLegalAidMode && _legalAidCheckEmergency(text)) {
      _addUserBubble(text);
      _legalAidShowEmergencyRedirect();
      return;
    }

    if (_isFindHelpMode && _legalAidCheckEmergency(text)) {
      _addUserBubble(text);
      _findHelpShowEmergencyRedirect();
      return;
    }

    
    
    
    
    
    
    
    
    
    if (_isLegalAidMode && !_aiState.chatMode) {
      _aiState.chatMode = true;
      var _leftoverGrid = _getChatArea();
      var _grid = _leftoverGrid ? _leftoverGrid.querySelector('#aiCategoryGrid') : null;
      if (_grid && _grid.parentElement) _grid.parentElement.remove();
    }

    if (_aiState.chatMode) {
      _addUserBubble(text);
      var area = _getChatArea();
      var typingId = 'ai-typing-' + Date.now();
      var typingWrap = document.createElement('div');
      typingWrap.id = typingId;
      typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
      typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
      if (area) { area.appendChild(typingWrap); _scrollBottom(); }

      var sysCtx;
      if (_isLegalAidMode) {
        if (_aiState.assistantMode === 'legal_aid_mycase_chat') {
          sysCtx = 'You are the "Understand My Case" tool inside Legal Aid, for LCDJP. Continue helping the citizen understand their own case. '
            + 'Do not invent any case status, date, decision, document, official, or outcome beyond what has already been shared in this conversation. '
            + _legalAidResponseStyle;
        } else if (_aiState.assistantMode === 'legal_aid_terms') {
          sysCtx = 'You are the "Legal Terms" glossary tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
            + 'Explain the legal term(s) the citizen asks about using simple language and a short example. Keep it concise. '
            + _legalAidResponseStyle;
        } else if (_aiState.assistantMode === 'legal_aid_rights') {
          sysCtx = 'You are the "Know Your Rights" tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
            + 'Continue answering the citizen\'s follow-up question about their rights, procedures, and next steps. ' + _legalAidResponseStyle;
        } else if (_aiState.assistantMode === 'legal_aid_findhelp') {
          sysCtx = 'You are the "Find Legal Help" tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
            + 'The citizen is looking for legal help/organisations near them and may also ask a general legal question while they wait to be '
            + 'connected. Answer the legal question itself first, then, where relevant, mention they can view nearby legal organisations on the '
            + 'map or ask to be connected with a lawyer. ' + _legalAidResponseStyle;
        } else {
          
          sysCtx = 'You are the "Ask for Legal Guidance" assistant inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
            + 'Understand the citizen\'s issue, identify the general legal topic, explain it in simple language, explain relevant rights where '
            + 'appropriate, explain possible procedures, suggest practical next steps, and identify what type of authority or professional may be '
            + 'appropriate. Recommend professional legal assistance where necessary. ' + _legalAidResponseStyle;
        }
      } else if (_isFindHelpMode) {
        sysCtx = _aiState.assistantMode === 'find_help_government' ? _findHelpGovernmentSysCtx()
          : _aiState.assistantMode === 'find_help_mediation' ? _findHelpMediationSysCtx()
          : _findHelpNavigatorSysCtx();
      } else if (_aiState.assistantMode === 'legal_help') {
        
        
        
        
        
        sysCtx = 'You are a legal information assistant for LCDJP, a Ugandan digital justice platform. '
          + 'You ONLY answer general legal information questions for citizens: explaining laws, legal rights, '
          + 'legal processes and procedures, how to access legal aid, what documents are needed for legal matters, '
          + 'and similar informational topics. '
          + 'You must NOT ask the user to describe a crime, incident, or emergency, and you must NOT collect '
          + 'details such as what happened, where, when, or information about a victim or suspect. '
          + 'If the user tries to report a crime or emergency, or describes being a victim of or witness to an '
          + 'incident, do not engage with those details, briefly explain that this assistant is for legal '
          + 'information only, and tell them to use the "Report Case" option (or call 999 / 112 if in Uganda -- or their local '
          + 'emergency number if outside Uganda -- for a life-threatening emergency) instead. Then, if relevant, offer to answer any general legal question they might have. '
          + 'Keep responses concise (2-4 sentences) and in plain, easy-to-understand language.';
      } else {
        sysCtx = 'You are an emergency response assistant for LCDJP in Uganda. '
          + 'The user has reported a ' + (_aiState.category || 'general') + ' incident. '
          + 'Incident details: ' + JSON.stringify(_aiState.answers) + '. '
          + 'Provide calm, professional, empathetic assistance. Keep responses concise (2-4 sentences). '
          + 'If the situation is life-threatening remind them to call 999 or 112 immediately if they are in Uganda, or their local emergency number if they are not.';
      }

      _callHuggingFaceBackend(text, sysCtx, true).then(function(reply) {
        var el = document.getElementById(typingId);
        if (el) el.remove();
        if (reply && _isLegalAidMode) {
          _addBotBubble(_legalAidFormatReply(reply), 0);
          _legalAidShowFollowupActions();
        } else if (_isLegalAidMode) {
          _addBotBubble('I\'m having trouble reaching the legal information service right now. Please try again shortly, or contact a local legal aid provider directly.', 0);
        } else if (reply && _isFindHelpMode) {
          _addBotBubble(_findHelpFormatReply(reply), 0);
          if (_aiState.assistantMode === 'find_help_government') { _findHelpShowGovernmentActions(); }
          else if (_aiState.assistantMode === 'find_help_mediation') { _findHelpShowMediationActions(); }
          else { _findHelpShowRouterActions(); }
        } else if (_isFindHelpMode) {
          _addBotBubble('I\'m having trouble reaching the service right now. Please try again shortly, or choose a category below.', 0);
          setTimeout(function () { _showFindHelpMenu(); }, 600);
        } else if (reply) {
          _addBotBubble(reply, 0);
        } else if (_aiState.assistantMode === 'legal_help') {
          _addBotBubble('I\'m having trouble reaching the legal information service right now, so I can\'t give you a considered answer to that. '
            + 'Please try again shortly, or contact a local legal aid provider directly. For crime reports or emergencies, please use the '
            + '<strong>Report Case</strong> option, or call ' + _aiEmergencyInlineHtml() + ' if it\'s life-threatening.', 0);
        } else {
          var _cat = (_aiState.category || '').toLowerCase();
          var _fb = 'I\'m having trouble reaching the assistant right now, so I can\'t review the details you gave me, but here\'s general guidance while you wait: ';
          if (_cat.includes('fire'))    _fb += 'Please evacuate if safe to do so and keep everyone away from the building. ';
          if (_cat.includes('medical')) _fb += 'Keep the patient still and warm, do not give food or water. ';
          if (_cat.includes('crime'))   _fb += 'Do not approach any suspect, your safety is the priority. ';
          if (_cat.includes('missing')) _fb += 'Avoid disturbing the last known location of the missing person. ';
          _fb += 'If life-threatening, call ' + _aiEmergencyInlineHtml() + ' immediately.';
          _addBotBubble(_fb, 0);
        }
      });
      return;
    }

    
    
    
    
    if (_isFindHelpMode) {
      _addUserBubble(text);
      _findHelpRouteFreeText(text);
      return;
    }

    if (_aiState.step === 1) {
      _addUserBubble(text);
      _aiClassifyFreeText(text);
      return;
    }
    if (_aiState.step !== 2) return;
    if (_aiState.qIndex >= _aiCurrentQuestions().length) return;
    if (_aiState.intakeBusy) { input.value = text; return; }
    _addUserBubble(text);
    _aiIntakeTurn(text);
  }
  window.aiSendMessage = aiSendMessage;

  
  
  var _aiLcRecommendedLabels = ['Community Disputes', 'Boundary Dispute', 'Marriage Dispute'];
  
  var _aiPoliceRecommendedLabels = ['Crime Report', 'Accident', 'Road Incident'];

  function _aiRecommendServiceType() {
    var cat = _aiState.category;
    if (!cat) return null;
    if (_aiLcRecommendedLabels.indexOf(cat) !== -1) return 'lc';
    if (_aiPoliceRecommendedLabels.indexOf(cat) !== -1) return 'police';
    if (_aiLegalCaseLabels.indexOf(cat) !== -1) return 'legal_aid';
    return null;
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  var _aiLegalLibrary = {
    'Crime Report':        { lawArea: 'Penal Code Act (Cap 128)', body: 'the Uganda Police Force', recommend: 'police',
      note: 'Criminal matters like theft, assault or burglary are reported directly to the Police, not an LC court.' },
    'Accident':             { lawArea: 'Traffic and Road Safety Act', body: 'Uganda Police (Traffic Department)', recommend: 'police',
      note: 'Road traffic accidents are handled by Police traffic officers, who file the report needed for any insurance or legal follow-up.' },
    'Road Incident':        { lawArea: 'Traffic and Road Safety Act', body: 'Uganda Police (Traffic Department)', recommend: 'police',
      note: 'Road-related incidents fall under Police traffic jurisdiction.' },
    'Family Dispute':       { lawArea: 'Domestic Relations law & the Children Act (Cap 59)', body: 'your Local Council (LC1/LC2)', recommend: 'lc',
      note: 'Domestic and family matters are usually mediated at LC level first, before escalating to the Family Court.' },
    'Land Matter':          { lawArea: 'Land Act (Cap 227) & the Registration of Titles Act', body: 'your Local Council (LC1/LC2)', recommend: 'lc',
      note: 'Most land disputes start with LC mediation; unresolved title or boundary disputes go to the Land Division of the Magistrates/High Court.' },
    'Business Matter':      { lawArea: 'the Contracts Act & Companies Act', body: 'a lawyer, or the Commercial Court', recommend: 'legal_aid',
      note: 'Contract and business disputes are civil matters best guided by a lawyer, with the Commercial Court as the formal venue if needed.' },
    'Community Disputes':   { lawArea: 'the Local Council Courts Act', body: 'your Local Council (LC1)', recommend: 'lc',
      note: 'Neighbour and community disputes fall under LC Court jurisdiction for mediation.' },
    'Inheritance Dispute':  { lawArea: 'the Succession Act (Cap 162)', body: 'a lawyer, or the Administrator General', recommend: 'legal_aid',
      note: 'Inheritance and estate matters are governed by the Succession Act and usually need a lawyer\'s guidance on letters of administration.' },
    'Boundary Dispute':     { lawArea: 'the Land Act (Cap 227)', body: 'your Local Council (LC1/LC2)', recommend: 'lc',
      note: 'Boundary disagreements are typically resolved through LC-level mediation before any surveying or court action.' },
    'Marriage Dispute':     { lawArea: 'the Marriage Act & Divorce Act', body: 'your Local Council (LC1/LC2) or a family lawyer', recommend: 'lc',
      note: 'Marital disputes are usually taken to the LC for mediation first.' },
    'Child Custody':        { lawArea: 'the Children Act (Cap 59)', body: 'a family lawyer, or the Family and Children Court', recommend: 'legal_aid',
      note: 'Custody is decided in the child\'s best interest under the Children Act, and generally needs a lawyer\'s help.' },
    'Debt Recovery':        { lawArea: 'the Contracts Act & Civil Procedure Act', body: 'a lawyer', recommend: 'legal_aid',
      note: 'Recovering money owed is a civil claim -- a lawyer can advise on the Small Claims Procedure for smaller amounts.' },
    'Other Legal Matter':   { lawArea: 'general civil/criminal law', body: 'a lawyer', recommend: 'legal_aid',
      note: 'This doesn\'t fit a specific category above -- a lawyer can advise on the right next step.' }
  };

  function _aiLocalLegalLookup(category) {
    var entry = _aiLegalLibrary[category];
    if (entry) return entry;
    var rec = _aiRecommendServiceType();
    return rec ? { lawArea: null, body: null, recommend: rec, note: null } : null;
  }

  
  
  
  
  
  
  async function _aiSearchLegalLibrary(category, description) {
    var local = _aiLocalLegalLookup(category);
    if (!description) return local;

    var libraryText = Object.keys(_aiLegalLibrary).map(function (k) {
      var e = _aiLegalLibrary[k];
      return k + ': ' + e.lawArea + ' -> handled by ' + e.body + ' (recommend: ' + e.recommend + ')';
    }).join('\n');
    var sysCtx = 'You are consulting LCDJP\'s legal library for a Ugandan justice-and-emergency platform, to work out '
      + 'where a citizen\'s case falls and who it should be reported to. Legal library (case type: relevant law -> handling body '
      + '(recommended channel)):\n' + libraryText + '\n\n'
      + 'The citizen\'s case category is "' + category + '" and they described what happened as: "' + description + '". '
      + 'Using the legal library above as your primary reference, reply in EXACTLY this format and nothing else:\n'
      + 'LAW: <short law/act name>\nBODY: <who typically handles it>\nRECOMMEND: <one of: police, lc, legal_aid>\nNOTE: <one short sentence for the citizen>';

    var reply = null;
    try { reply = await _callHuggingFaceBackend(description, sysCtx); } catch (e) { reply = null; }
    if (!reply) return local ? Object.assign({}, local, { usedFallback: true }) : local;

    var law = (reply.match(/LAW:\s*(.+)/i) || [])[1];
    var body = (reply.match(/BODY:\s*(.+)/i) || [])[1];
    var rec = (reply.match(/RECOMMEND:\s*(police|lc|legal_aid)/i) || [])[1];
    var note = (reply.match(/NOTE:\s*(.+)/i) || [])[1];
    if (!rec) return local ? Object.assign({}, local, { usedFallback: true }) : local;

    return {
      lawArea: law ? law.trim() : (local && local.lawArea),
      body: body ? body.trim() : (local && local.body),
      recommend: rec.toLowerCase(),
      note: note ? note.trim() : (local && local.note)
    };
  }

  
  
  
  
  
  
  
  
  
  
  
  
  var _aiCategoryLabels = _aiCategories.map(function(c) { return c.label; });

  var _aiCategoryKeywords = {
    'Crime Report': ['theft', 'stolen', 'robbed', 'robbery', 'burglary', 'assault', 'attacked', 'crime'],
    'Accident': ['accident', 'crash', 'collision'],
    'Fire Emergency': ['fire', 'burning', 'smoke'],
    'Medical Emergency': ['medical', 'injured', 'injury', 'sick', 'collapsed', 'bleeding', 'unconscious'],
    'Missing Person': ['missing', 'disappeared', "can't find", 'cannot find', 'lost person'],
    'Road Incident': ['road', 'traffic', 'pothole', 'highway'],
    'Vehicle Breakdown': ['breakdown', 'broke down', 'broken down', 'car trouble', 'flat tyre', 'flat tire', 'tow', 'towing', 'engine failure', "won't start", 'wont start', 'stuck on the road', 'stalled', 'garage', 'mechanic'],
    'Family Dispute': ['family', 'husband', 'wife', 'spouse', 'domestic'],
    'Land Matter': ['land', 'plot', 'title deed', 'encroach', 'grabbed my land'],
    'Business Matter': ['business', 'contract', 'supplier', 'partner', 'company'],
    'Community Disputes': ['neighbor', 'neighbour', 'community', 'noise'],
    'Inheritance Dispute': ['inheritance', 'will', 'estate', 'deceased'],
    'Boundary Dispute': ['boundary', 'fence', 'border dispute'],
    'Marriage Dispute': ['marriage', 'divorce', 'separation'],
    'Child Custody': ['custody', 'child support'],
    'Debt Recovery': ['debt', 'owes me', 'loan', 'unpaid', 'money owed']
  };

  function _aiLocalClassify(text) {
    var lower = text.toLowerCase();
    for (var label in _aiCategoryKeywords) {
      var kws = _aiCategoryKeywords[label];
      for (var i = 0; i < kws.length; i++) {
        if (lower.indexOf(kws[i]) !== -1) return label;
      }
    }
    return null;
  }

  async function _aiClassifyFreeText(text) {
    var sysCtx = 'You are triaging an incident report for a Ugandan justice-and-emergency '
      + 'platform. The user just described their situation in free text. Reply with EXACTLY ONE '
      + 'of the following category labels, verbatim and nothing else: '
      + _aiCategoryLabels.join(' | ') + '. '
      + 'If genuinely none of these fit, reply with exactly: NONE';
    var reply = null;
    try { reply = await _callHuggingFaceBackend(text, sysCtx); } catch (e) { reply = null; }
    var matched = null;
    if (reply) {
      var cleaned = reply.trim();
      matched = _aiCategoryLabels.filter(function(l) {
        return l.toLowerCase() === cleaned.toLowerCase();
      })[0] || null;
    }
    if (!matched) matched = _aiLocalClassify(text);

    if (matched) {
      _addBotBubble('That sounds like a <strong>' + _esc(matched) + '</strong> to me. Let\'s go with that.', 200);
      setTimeout(function() { window._aiSelectCat(matched); }, 1400);
    } else {
      _addBotBubble('I\'m not fully sure which category best fits that yet, could you pick one from the list above, or tell me a little more?', 200);
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  function _aiCrimeReportChoice() {
    _setStep(3);
    _addBotBubble(
      'Thanks for the details. Would you like me to <strong>file this as a case</strong> so it can be recorded and followed up, '
      + 'or would you rather just get directions to the nearest <strong>Police</strong> or <strong>LC</strong> station right now?',
      0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#e3f2fd;border-color:#1565c0;color:#1565c0;" onclick="window._aiCrimeReportFileCase()"> File as a Case</button>'
      + '<button class="ai-choice-btn" style="background:#fce4ec;border-color:#c62828;color:#c62828;" onclick="window._aiCrimeReportQuickNearby()"> Just Show Nearby Help</button>'
      + '</div>';
    _addWidget(html, 300);
  }

  window._aiCrimeReportFileCase = function() {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble('File as a Case');
    _aiCollectCaseDetails();
  };

  window._aiCrimeReportQuickNearby = function() {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble('Just Show Nearby Help');
    _setStep(4);
    _addBotBubble('Would you like the nearest Police station or LC office?', 200);
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#fce4ec;border-color:#c62828;color:#c62828;" onclick="window._aiCrimeReportQuickPick(\'police\')"> Police</button>'
      + '<button class="ai-choice-btn" style="background:#e3f2fd;border-color:#1565c0;color:#1565c0;" onclick="window._aiCrimeReportQuickPick(\'lc\')"> Local Council (LC)</button>'
      + '</div>';
    _addWidget(html, 300);
  };

  window._aiCrimeReportQuickPick = function(type) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble(type === 'lc' ? 'Local Council (LC)' : 'Police');
    
    
    
    _addBotBubble('One moment, finding the nearest ' + (type === 'lc' ? 'LC offices' : 'police stations') + ' near you...', 100);
    _aiFetchNearbyServiceProviders(type);
  };

  // Every district, as <option>s. A native <datalist> only shows entries matching what is already typed, so a
  // pre-filled value hid all the others; a <select> always offers the full list.
  function _aiDistrictOptions(selected) {
    var list = (typeof regGetDistricts === 'function') ? regGetDistricts() : [];
    var current = (typeof regFindDistrict === 'function') ? regFindDistrict(selected) : selected;
    return list.map(function (d) {
      return '<option value="' + _esc(d) + '"' + (d === current ? ' selected' : '') + '>' + _esc(d) + '</option>';
    }).join('');
  }

  function _aiCollectCaseDetails() {
    _setStep(3);
    var storedVillage = sessionStorage.getItem('lcdjp_village') || '';
    var storedDistrict = sessionStorage.getItem('lcdjp_district') || '';
    var storedEmail = sessionStorage.getItem('lcdjp_email') || '';
    _addBotBubble('A couple more details so the right office can reach you.', 0);
    var html = ''
      + '<div class="ai-location-form" style="background:#f8f9fa;border:1px solid #ddd;border-radius:10px;padding:14px;margin-left:44px;max-width:420px;">'
      + _aiLocationFieldsHtml(storedVillage, storedDistrict)
      + '<label style="display:block;font-size:11px;font-weight:600;color:#555;margin-bottom:4px;">Email' + (storedEmail ? ' <span style="font-weight:400;color:#888;">(from your account &mdash; update if needed)</span>' : '') + '</label>'
      + '<input id="aiCaseEmail" type="email" value="' + _esc(storedEmail) + '" placeholder="you@example.com" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<div id="aiCaseDetailsError" style="display:none;color:#c62828;font-size:11px;margin-bottom:8px;"></div>'
      + '<button class="ai-choice-btn" style="background:#1a4080;color:white;border-color:#1a4080;" onclick="window._aiSubmitCaseDetails()">Continue</button>'
      + '</div>';
    _addWidget(html, 300);
    if (typeof LcdjpGeo !== 'undefined') {
      setTimeout(function () {
        LcdjpGeo.afterMount('aiGeo', { onPosition: function (lat, lng) { _aiSetUserPosition(lat, lng); } });
      }, 1300);
    }
  }

  // Where did it happen? Detected from GPS and matched to the Uganda hierarchy, then just confirmed from lists.
  // Falls back to the old typed village + district if the picker script is unavailable.
  function _aiLocationFieldsHtml(storedVillage, storedDistrict) {
    if (typeof LcdjpGeo !== 'undefined') {
      var initial = LcdjpGeo.cleanChain({
        district: storedDistrict,
        subCounty: sessionStorage.getItem('lcdjp_subCounty') || '',
        parish: sessionStorage.getItem('lcdjp_parish') || '',
        village: storedVillage
      });
      return '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px;">Where did this happen?</div>'
        + LcdjpGeo.html('aiGeo', initial)
        + '<div style="height:10px;"></div>';
    }
    return ''
      + '<label style="display:block;font-size:11px;font-weight:600;color:#555;margin-bottom:4px;">Village</label>'
      + '<input id="aiCaseVillage" type="text" value="' + _esc(storedVillage) + '" placeholder="Village" style="width:100%;padding:8px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<label style="display:block;font-size:11px;font-weight:600;color:#555;margin-bottom:4px;">District</label>'
      + '<select id="aiCaseDistrict" style="width:100%;padding:8px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;background:#fff;">'
      + '<option value="">Select your district</option>'
      + _aiDistrictOptions(storedDistrict)
      + '</select>'
      + '';
  }

  window._aiSubmitCaseDetails = function () {
    var area = _getChatArea();
    var form = area ? area.querySelector('.ai-location-form') : null;
    var emailEl = document.getElementById('aiCaseEmail');
    var errEl = document.getElementById('aiCaseDetailsError');
    var email = emailEl ? emailEl.value.trim() : '';
    function fail(msg) {
      if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    }

    var loc;
    if (typeof LcdjpGeo !== 'undefined' && document.getElementById('aiGeo')) {
      var problem = LcdjpGeo.validate('aiGeo');
      if (problem) { fail(problem); return; }
      loc = LcdjpGeo.getValue('aiGeo');
    } else {
      var villageEl = document.getElementById('aiCaseVillage');
      var districtEl = document.getElementById('aiCaseDistrict');
      var village = villageEl ? villageEl.value.trim() : '';
      var districtRaw = districtEl ? districtEl.value.trim() : '';
      if (!village || !districtRaw) { fail('Please fill in both village and district.'); return; }
      var d = (typeof regFindDistrict === 'function') ? regFindDistrict(districtRaw) : districtRaw;
      if (!d) { fail('Please select your district from the list.'); return; }
      // Only the typed village and district are known here; sub-county and parish are left for the server rules.
      loc = { district: d, subCounty: '', parish: '', village: village, county: '', source: 'typed' };
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail('That email address doesn\'t look right -- please check it.');
      return;
    }

    _aiState.answers.village = loc.village;
    _aiState.answers.district = loc.district;
    _aiState.answers.email = email;
    // The whole chain is kept together so the Local Council / provider lookup never mixes places.
    // Detected-and-confirmed or picked from the lists are both person-confirmed; the source tells them apart.
    _aiState.incidentLocation = {
      district: loc.district, county: loc.county || '', subCounty: loc.subCounty || '',
      parish: loc.parish || '', village: loc.village || '', source: 'confirmed_incident:' + (loc.source || 'selected')
    };
    _aiState.lcLocationOverride = _aiState.incidentLocation;
    // Nearby offices are searched around the confirmed place: the GPS fix only when that is what was detected
    // and kept, otherwise the place the person picked (geocoded from its name).
    if (/:detected$/.test(_aiState.incidentLocation.source) && isFinite(loc.lat) && isFinite(loc.lng)) {
      _aiSetUserPosition(loc.lat, loc.lng);
    } else {
      _aiState.userLat = null; _aiState.userLng = null;
    }

    if (form && form.parentElement) form.parentElement.remove();
    _addUserBubble(_esc([loc.village, loc.parish, loc.subCounty, loc.district].filter(Boolean).join(', ')) + (email ? ' &mdash; ' + _esc(email) : ''));
    _aiAskKinAndAttachment();
  };

  
  
  
  
  
  
  
  
  
  function _aiAskKinAndAttachment() {
    _setStep(3);
    _addBotBubble('One last thing before I connect you, it helps to have a next of kin on file for emergencies, and you can attach a supporting photo, video, or document if you have one. Both are optional.', 0);
    var relOptions = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Other'];
    var relHtml = '<option value="">Select Relationship</option>' + relOptions.map(function (r) {
      return '<option value="' + r + '">' + r + '</option>';
    }).join('');
    var html = ''
      + '<div class="ai-kin-form" style="background:#f8f9fa;border:1px solid #ddd;border-radius:10px;padding:14px;margin-left:44px;max-width:420px;">'
      + '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:8px;"> Next of Kin (optional)</div>'
      + '<input id="aiKinName" type="text" placeholder="Full name" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<input id="aiKinPhone" type="tel" placeholder="Phone number" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<input id="aiKinEmail" type="email" placeholder="Email" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'
      + '<select id="aiKinRelationship" style="width:100%;padding:8px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">' + relHtml + '</select>'
      + '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px;"> Attach a file (optional, max 5MB, one file only)</div>'
      + '<label for="aiAttachFile" id="aiAttachFileLabel" style="display:flex;align-items:center;justify-content:center;min-height:44px;padding:12px;border:2px dashed #ccc;border-radius:8px;text-align:center;cursor:pointer;color:#666;font-size:13px;margin-bottom:10px;box-sizing:border-box;">Choose File</label>'
      + '<input id="aiAttachFile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.wav" style="display:none;" onchange="window._aiOnAttachFileChosen(this)">'
      + '<div style="display:flex;gap:8px;">'
      + '<button class="ai-choice-btn" style="background:#1a4080;color:white;border-color:#1a4080;" onclick="window._aiSubmitKinAndAttachment()">Continue</button>'
      + '<button class="ai-choice-btn" style="background:#f5f5f5;color:#555;border-color:#ccc;" onclick="window._aiSkipKinAndAttachment()">Skip</button>'
      + '</div>'
      + '</div>';
    _addWidget(html, 300);
  }

  
  
  
  window._aiOnAttachFileChosen = function (inputEl) {
    var labelEl = document.getElementById('aiAttachFileLabel');
    if (!labelEl) return;
    var file = inputEl && inputEl.files && inputEl.files[0];
    labelEl.textContent = file ? file.name : 'Choose File';
  };

  window._aiSubmitKinAndAttachment = function () {
    var area = _getChatArea();
    var form = area ? area.querySelector('.ai-kin-form') : null;

    var nameEl = document.getElementById('aiKinName');
    var phoneEl = document.getElementById('aiKinPhone');
    var emailEl = document.getElementById('aiKinEmail');
    var relEl = document.getElementById('aiKinRelationship');
    var fileEl = document.getElementById('aiAttachFile');

    _aiState.kin = {
      name: nameEl ? nameEl.value.trim() : '',
      phone: phoneEl ? phoneEl.value.trim() : '',
      email: emailEl ? emailEl.value.trim() : '',
      relationship: relEl ? relEl.value : ''
    };

    
    
    var file = (fileEl && fileEl.files && fileEl.files[0]) ? fileEl.files[0] : null;

    if (form && form.parentElement) form.parentElement.remove();
    _addUserBubble((_aiState.kin.name || file) ? 'Details provided' : 'Continue');

    if (!file) { _showContactChoice(); return; }

    if (file.size > 5 * 1024 * 1024) {
      _addBotBubble('That file is over the 5MB limit, so I couldn\'t attach it, continuing without it.', 200);
      _showContactChoice();
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      _aiState.attachment = { name: file.name, size: file.size, type: file.type, data: e.target.result };
      _showContactChoice();
    };
    reader.onerror = function () {
      _addBotBubble('I couldn\'t read that file, so I\'m continuing without it.', 200);
      _showContactChoice();
    };
    reader.readAsDataURL(file);
  };

  window._aiSkipKinAndAttachment = function () {
    var area = _getChatArea();
    var form = area ? area.querySelector('.ai-kin-form') : null;
    if (form && form.parentElement) form.parentElement.remove();
    _addUserBubble('Skip');
    _showContactChoice();
  };

  async function _showContactChoice() {
    _setStep(3);
    
    
    
    
    
    
    
    _aiState.chatMode = true;

    
    
    
    
    _addBotBubble('Thank you for providing the details. One moment, checking the legal library to see where this falls...', 200);
    var finding = await _aiSearchLegalLibrary(_aiState.category, _aiState.answers && _aiState.answers.what);
    var recommended = finding ? finding.recommend : null;

    if (finding && (finding.lawArea || finding.note)) {
      var findingHtml = '<div style="background:#f3f6fb;border:1px solid #dbe3f0;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#333;">'
        + (finding.usedFallback ? '<div style="color:#996a00;font-size:11px;margin-bottom:4px;">General guidance for this case type (the assistant couldn\'t analyze your specific details right now):</div>' : '')
        + (finding.lawArea ? '<strong> ' + _esc(finding.lawArea) + '</strong>' + (finding.body ? ', usually handled by ' + _esc(finding.body) : '') + '<br>' : '')
        + (finding.note ? '<span style="color:#555;">' + _esc(finding.note) + '</span>' : '')
        + '</div>';
      _addBotBubble(findingHtml, 0);
    }

    var recLabel = recommended === 'lc' ? 'a Local Council (LC) office'
      : recommended === 'police' ? 'the Police'
      : recommended === 'legal_aid' ? 'a Lawyer' : null;
    var introMsg = recLabel
      ? 'Based on that, this looks like something ' + recLabel + ' would be best placed to help with. Who would you like to reach out to?'
      : 'Who would you like to reach out to for help?';
    _addBotBubble(introMsg, 900);
    function btn(type, bg, border, color, label) {
      var isRec = recommended === type;
      var recBadge = isRec ? ' <span style="background:' + color + ';color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;vertical-align:middle;margin-left:4px;">RECOMMENDED</span>' : '';
      var extraStyle = isRec ? 'box-shadow:0 0 0 2px ' + color + ';' : '';
      return '<button class="ai-choice-btn" style="background:' + bg + '; border-color:' + border + '; color:' + color + ';' + extraStyle + '" onclick="window._aiShowContacts(\'' + type + '\')">' + label + recBadge + '</button>';
    }
    var html = '<div class="ai-choices-row">'
             + btn('legal_aid', '#e8f5e9', '#2e7d32', '#2e7d32', ' Talk to a Lawyer')
             + btn('lc', '#e3f2fd', '#1565c0', '#1565c0', ' Local Council (LC)')
             + btn('police', '#fce4ec', '#c62828', '#c62828', ' Police')
             + '</div>';
    _addWidget(html, 900);
    _addBotBubble('You can also just type any question below, and I\'ll do my best to help, no need to only use the buttons.', 1900);
  }

  window._aiShowContacts = function(type) {
    _aiState.contactType = type;
    _setStep(4);
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    if (type === 'legal_aid') {
      
      
      _addUserBubble('Talk to a Lawyer');
      _aiStartLegalAidMatching();
      return;
    }
    
    
    
    
    
    
    
    
    
    
    
    
    if (type === 'legal_org') {
      _addUserBubble('Legal Organisation');
      
      
      
      
      _aiSubmitCaseForRouting('legal_aid').then(function (filed) {
        if (filed) _addBotBubble('One moment, finding legal organisations that can help...', 100);
      });
      _aiFetchNearbyServiceProviders(type);
      return;
    }
    if (type === 'lc') {
      _addUserBubble('Local Council (LC)');
      if (_aiState.incidentLocation) { window._aiChooseLCLocation('confirmed'); return; }
      _aiPromptLCLocationChoice();
      return;
    }
    _addUserBubble('Police');
    _aiSubmitCaseForRouting(type).then(function (filed) {
      if (filed) _addBotBubble('One moment, finding the nearest police stations near you...', 100);
    });
    _aiFetchNearbyServiceProviders(type);
  };

  function _aiPromptLCLocationChoice() {
    _addBotBubble('Which Local Council should this go to, the one for your current location, or the one for your registered / verification address?', 400);
    var html = '<div class="ai-choices-row" data-ai-lc-location-row="1">'
      + '<button class="ai-choice-btn" style="background:#e3f2fd;border-color:#1565c0;color:#1565c0;" onclick="window._aiChooseLCLocation(\'current\')"> Use My Current Location</button>'
      + '<button class="ai-choice-btn" style="background:#e8f0fe;border-color:#1a4080;color:#1a4080;" onclick="window._aiChooseLCLocation(\'verification\')"> Use My Registered Address</button>'
      + '</div>';
    _addWidget(html, 500);
  }

  window._aiChooseLCLocation = function (choice) {
    var area = _getChatArea();
    var row = area ? area.querySelector('[data-ai-lc-location-row]') : null;
    if (row && row.parentElement) row.parentElement.remove();

    _aiState.lcLocationChoice = choice;

    function proceed() {
      if (choice === 'confirmed') _addBotBubble('Using the place you confirmed: <strong>' + _esc(_aiLocText(_aiState.incidentLocation)) + '</strong>.', 100);
      else _addUserBubble(choice === 'current' ? 'Use my current location' : 'Use my registered address');
      var location = _aiState.lcLocationOverride || {
        district: sessionStorage.getItem('lcdjp_district') || '',
        subCounty: sessionStorage.getItem('lcdjp_subCounty') || '',
        parish: sessionStorage.getItem('lcdjp_parish') || '',
        village: sessionStorage.getItem('lcdjp_village') || ''
      };
      _aiRouteLCByVillage(location);
    }

    if (choice === 'confirmed' && _aiState.incidentLocation) {
      _aiState.lcLocationOverride = _aiState.incidentLocation;
      proceed();
      return;
    }

    if (choice !== 'current') {
      
      _aiState.lcLocationOverride = null;
      proceed();
      return;
    }

    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I don\'t have access to your current location, so I\'ll use your registered address instead.', 200);
      _aiState.lcLocationOverride = null;
      proceed();
      return;
    }

    _aiGetCurrentPosition(
      function (position) {
        var lat = position.coords.latitude, lng = position.coords.longitude;
        _aiSetUserPosition(lat, lng);
        _aiReverseGeocodeVillage(lat, lng).then(function (loc) {
          if (loc && (loc.village || loc.district)) {
            _aiState.lcLocationOverride = {
              district: loc.district, subCounty: loc.subCounty, parish: loc.parish,
              village: loc.village, source: 'current_gps'
            };
          } else {
            var nearestDistrict = (typeof findNearestDistrict === 'function') ? findNearestDistrict(lat, lng) : '';
            _aiState.lcLocationOverride = nearestDistrict
              ? { district: nearestDistrict, village: '', parish: '', subCounty: '', source: 'current_gps' }
              : null;
          }
          proceed();
        });
      },
      function () {
        _addBotBubble('I couldn\'t access your current location, so I\'ll use your registered address instead.', 300);
        _aiState.lcLocationOverride = null;
        proceed();
      }
    );
  };

  function _aiReverseGeocodeVillage(lat, lng) {
    try {
      return fetch(API_BASE_URL + '/api/map/reverse-geocode?lat=' + lat + '&lng=' + lng)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || data.status !== 'OK') return null;
          return {
            district: data.district || '',
            subCounty: data.sub_county || data.subCounty || '',
            parish: data.parish || '',
            village: data.village || ''
          };
        })
        .catch(function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  // Local Council levels the assistant can point to. LC4 (county) and LC5 (district) are administrative
  // councils, not courts, so they are never chosen as the place to take a dispute.
  var _AI_LC_LEVELS = {
    LC1: { name: 'LC1 (village)',    who: 'the LC1 (village) chairperson',                 areaKeys: ['village', 'parish', 'subCounty', 'district'], map: { type: 'local_government_office', keyword: 'LC1 chairman village', label: 'LC1 office' } },
    LC2: { name: 'LC2 (parish)',     who: 'the LC2 (parish) chairperson or parish court',  areaKeys: ['parish', 'subCounty', 'district'],            map: { type: 'local_government_office', keyword: 'parish office',       label: 'Parish office' } },
    LC3: { name: 'LC3 (sub-county)', who: 'the LC3 (sub-county) office or sub-county court', areaKeys: ['subCounty', 'district'],                      map: { type: 'local_government_office', keyword: 'sub county headquarters', label: 'Sub-county office' } }
  };
  // Used only if the jurisdiction service cannot be reached.
  var _AI_DEFAULT_LC_PATH = [
    { level: 'LC1', role: 'Start here: the village executive tries to mediate between the two sides.' },
    { level: 'LC2', role: 'If mediation fails: the parish Local Council court hears the matter.' },
    { level: 'LC3', role: 'If you are not satisfied with the parish court: appeal to the sub-county court.' }
  ];

  function _aiAreaForLevel(location, level) {
    var info = _AI_LC_LEVELS[level] || _AI_LC_LEVELS.LC1;
    location = location || {};
    return info.areaKeys.map(function (k) { return location[k]; })
      .filter(function (v) { return v && String(v).trim(); }).join(', ');
  }

  /** Ask the server which LC level handles this kind of report first (rule-based, nothing is stored). */
  function _aiGetLcAssessment() {
    var payload = _aiBuildCasePayload();
    var headers = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
    return fetch(API_ENDPOINTS.aiJurisdiction, {
      method: 'POST', headers: headers,
      body: JSON.stringify({ caseType: payload.caseType, description: payload.description })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (a) {
        if (a && typeof a === 'object' && 'lcFirstLevel' in a) return a;
        return { lcFirstLevel: 'LC1', lcPath: _AI_DEFAULT_LC_PATH, lcNote: '', track: 'LC_MEDIATION', advisory: '' };
      });
  }

  function _aiLcPathHtml(path, note) {
    var rows = (path || []).map(function (st) {
      var info = _AI_LC_LEVELS[st.level];
      return '<div style="margin-bottom:4px;"><strong>' + _esc(info ? info.name : st.level) + '</strong>: ' + _esc(st.role) + '</div>';
    }).join('');
    return '<div style="background:#e8f0fe;border:1.5px solid #1a4080;border-radius:12px;padding:14px 16px;font-size:13px;color:#333;">'
      + '<div style="font-weight:700;color:#1a4080;margin-bottom:6px;">Which Local Council level handles this</div>'
      + rows
      + (note ? '<div style="margin-top:6px;font-size:12px;color:#666;">' + _esc(note) + '</div>' : '')
      + '</div>';
  }

  function _aiRouteLCByVillage(location) {
    _addBotBubble('One moment, working out which Local Council level should handle your matter...', 200);
    _aiGetLcAssessment().then(function (assessment) {
      var level = assessment.lcFirstLevel;
      if (!level || !_AI_LC_LEVELS[level]) {
        // The rules say LCs are not the right place (serious crime, violence, fraud, employment...).
        _aiState.lcAssessment = assessment;
        _addBotBubble(
          '<div style="background:#fff3e0;border:1.5px solid #f57c00;border-radius:12px;padding:14px 16px;font-size:13px;color:#333;">'
          + '<div style="font-weight:700;color:#e65100;margin-bottom:6px;">A Local Council is not the right first step</div>'
          + _esc(assessment.advisory || 'This kind of matter is not handled by Local Council mediation.') + '</div>', 300);
        var html = '<div class="ai-choices-row" data-ai-lc-fallback-row="1">'
          + '<button class="ai-choice-btn" style="background:#fce4ec;border-color:#c62828;color:#c62828;" onclick="window._aiFallbackToPolice()"> Police Near Me</button>'
          + '<button class="ai-choice-btn" style="background:#e8f5e9;border-color:#2e7d32;color:#2e7d32;" onclick="window._aiFallbackToLawyer(\'' + _esc((location && location.district) || '') + '\')"> Lawyer</button>'
          + '</div>';
        _addWidget(html, 500);
        return;
      }
      _aiState.lcAssessment = assessment;
      _aiState.lcLevel = level;
      _addBotBubble(_aiLcPathHtml(assessment.lcPath, assessment.lcNote), 300);
      var area = _aiAreaForLevel(location, level);
      _addBotBubble(
        'Starting with <strong>' + _esc(_AI_LC_LEVELS[level].name) + '</strong>'
        + (area ? ' for <strong>' + _esc(area) + '</strong>' : '') + '. Checking for a registered office...', 400);

      var lookup = (typeof aiFindRegisteredLCForLevel === 'function')
        ? aiFindRegisteredLCForLevel(location, level)
        : Promise.resolve([]);
      Promise.resolve(lookup).then(function (matches) {
        if (matches && matches.length) _aiOfferMatchedLC(matches, location, level);
        else _aiOfferLCFallback(location, level);
      }).catch(function () { _aiOfferLCFallback(location, level); });
    });
  }

  function _aiOfferMatchedLC(matches, location, level) {
    _aiState.lcCandidates = matches;
    level = level || 'LC1';
    _aiSubmitCaseForRouting('lc').then(function (filed) {
      if (!filed) return;
      var areaLabel = _aiAreaForLevel(location, level) || 'your area';
      var info = _AI_LC_LEVELS[level];
      _addBotBubble(
        'Good news, ' + (matches.length === 1 ? 'there is a registered ' + _esc(info.name) + ' office' : 'there are registered ' + _esc(info.name) + ' offices')
        + ' for <strong>' + _esc(areaLabel) + '</strong>. Choose one to forward your case to:',
        200
      );
      var html = '<div class="ai-service-cards" style="padding-left:44px;">';
      matches.forEach(function (lc, idx) {
        var name = ((lc.first_name || lc.firstName || '') + ' ' + (lc.last_name || lc.lastName || '')).trim() || lc.username;
        var locLabel = [lc.village, lc.parish].filter(Boolean).join(', ');
        html += '<div class="ai-contact-card">'
          + '<div class="ai-contact-icon" style="background:#e3f2fd;"></div>'
          + '<div style="flex:1; min-width:0;">'
          + '<div style="font-weight:700; font-size:14px; color:#1a1a2e;">' + _esc(name) + '</div>'
          + '<div style="font-size:12px; color:#666;"> ' + _esc(info.name) + ' official' + (locLabel ? ' &middot; ' + _esc(locLabel) : '') + '</div>'
          + '</div>'
          + '<button onclick="window._aiSelectLC(' + idx + ')" style="background:#1565c0; color:white; border:none; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;">Select</button>'
          + '</div>';
      });
      html += '</div>';
      _addWidget(html, 300);
    });
  }

  window._aiSelectLC = async function (idx) {
    var lc = _aiState.lcCandidates && _aiState.lcCandidates[idx];
    if (!lc || !_aiState.caseReference) return;
    var area = _getChatArea();
    var cards = area ? area.querySelector('.ai-service-cards') : null;
    if (cards && cards.parentElement) cards.parentElement.remove();
    var name = ((lc.first_name || lc.firstName || '') + ' ' + (lc.last_name || lc.lastName || '')).trim() || lc.username;
    _addUserBubble('Selected ' + name);

    try {
      var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(API_ENDPOINTS.offerCaseToLc(_aiState.caseReference, lc.username), {
        method: 'PUT', headers: headers
      });
      var data = await res.json();
      if (res.ok && data.success) {
        _addBotBubble(
          '<div style="background:#e8f5e9;border:1.5px solid #2e7d32;border-radius:12px;padding:14px 16px;">'
          + '<div style="font-size:13px;font-weight:700;color:#1b5e20;margin-bottom:6px;"> Case sent to your LC</div>'
          + '<div style="font-size:13px;color:#333;">Your case (<strong>' + _esc(_aiState.caseReference) + '</strong>) has been sent to <strong>' + _esc(name) + '</strong>. '
          + 'They need to accept it first. You\'ll be notified here as soon as they respond.</div>'
          + '</div>', 200
        );
      } else {
        _addBotBubble('That LC office could not take your case (' + _esc(data.error || 'unknown error') + '). Please choose another, or try again.', 200);
      }
    } catch (e) {
      _addBotBubble('Something went wrong sending your case. Please try again.', 200);
    }
  };

  /** Tell district / system admins this area has no registered office at the needed level (fire and forget). */
  function _aiReportCoverageGap(level) {
    if (!_aiState.caseReference) return;
    try {
      var h = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
      fetch(API_ENDPOINTS.caseCoverageGap(_aiState.caseReference), { method: 'POST', headers: h, body: JSON.stringify({ level: level }) }).catch(function () {});
    } catch (e) { /* the citizen's flow must not depend on this */ }
  }

  function _aiOfferLCFallback(location, level) {
    level = level || 'LC1';
    var district = (location && location.district) || '';
    var area = _aiAreaForLevel(location, level);
    _addBotBubble(
      'There is no registered <strong>' + _esc(_AI_LC_LEVELS[level].name) + '</strong> office'
      + (area ? ' for <strong>' + _esc(area) + '</strong>' : '') + ' on JusticeLink yet. '
      + 'I\'ll save your report, then look for that office near you, or for someone nearby who can point you to it.',
      300
    );
    // File the report first so it is never lost, then search. The Police / Lawyer buttons stay available.
    _aiSubmitCaseForRouting('lc').then(function (filed) {
      if (!filed) return;
      _aiReportCoverageGap(level);
      _aiReferralChain('lc', location, false, { level: level }).then(function () {
        var html = '<div class="ai-choices-row" data-ai-lc-fallback-row="1">'
          + '<button class="ai-choice-btn" style="background:#fce4ec;border-color:#c62828;color:#c62828;" onclick="window._aiFallbackToPolice()"> Police Near Me</button>'
          + '<button class="ai-choice-btn" style="background:#e8f5e9;border-color:#2e7d32;color:#2e7d32;" onclick="window._aiFallbackToLawyer(\'' + _esc(district) + '\')"> Lawyer' + (district ? ' in ' + _esc(district) : '') + '</button>'
          + '</div>';
        _addBotBubble('You can also take this to the Police or a Lawyer instead:', 600);
        _addWidget(html, 700);
      });
    });
  }

  window._aiFallbackToPolice = function () {
    var area = _getChatArea();
    var row = area ? area.querySelector('[data-ai-lc-fallback-row]') : null;
    if (row && row.parentElement) row.parentElement.remove();
    _addUserBubble('Police Near Me');
    _aiState.contactType = 'police';
    _aiSubmitCaseForRouting('police').then(function (filed) {
      if (!filed) return;
      // The report may already be filed (as an LC report); record that the citizen now chose Police.
      if (_aiState.caseReference) {
        var h = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
        fetch(API_ENDPOINTS.aiCaseRoute(_aiState.caseReference), { method: 'POST', headers: h, body: JSON.stringify({ choice: 'police' }) }).catch(function () {});
      }
      _addBotBubble('One moment, finding the nearest police stations in your area...', 100);
    });
    _aiFetchNearbyServiceProviders('police');
  };

  window._aiFallbackToLawyer = function (district) {
    var area = _getChatArea();
    var row = area ? area.querySelector('[data-ai-lc-fallback-row]') : null;
    if (row && row.parentElement) row.parentElement.remove();
    _addUserBubble('Lawyer' + (district ? ' in ' + district : ''));
    _aiState.contactType = 'legal_aid';
    _aiSubmitCaseForRouting('legal_aid').then(function (filed) {
      if (!filed) return;
      _addBotBubble('Searching for lawyers covering ' + (district ? district : 'your district') + '...', 100);
      _aiShowLawyerList(district, _aiState.caseReference, []);
    });
  };

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  window._aiSaveOfflineDraft = function (type) {
    var payload = _aiBuildCasePayload();
    if (type) payload.routingChoice = type;
    window.JusticeLinkDrafts.saveFromPayload(payload).then(function () {
      _addBotBubble('Saved on this phone. It will be sent automatically as soon as you are back online. You can see it under <strong>Case drafts</strong>.', 200);
      window.JusticeLinkDrafts.syncNow();
    }).catch(function () {
      _addBotBubble('I could not save this on your phone. Please free some storage space and try again.', 200);
    });
  };

  async function _aiSubmitCaseForRouting(type) {
    if (_aiState.caseReference) return true;
    var result = null;
    try {
      var payload = _aiBuildCasePayload();
      if (type) payload.routingChoice = type;
      var headers = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(API_ENDPOINTS.aiCaseSubmit, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
      if (res.ok) result = await res.json();
    } catch (e) {  }

    if (!result || !result.success) {
      _addBotBubble('We couldn\'t file your case just now, the connection to JusticeLink may be offline. Please check your connection and try again; nothing has been submitted yet.', 200);
      var retryHtml = '<button class="ai-choice-btn" onclick="window._aiShowContacts(\'' + _esc(type || '') + '\')"> Try Again</button>';
      if (window.JusticeLinkDrafts) {
        retryHtml += '<button class="ai-choice-btn" onclick="window._aiSaveOfflineDraft(\'' + _esc(type || '') + '\')"> Save and send when online</button>';
      }
      _addWidget(retryHtml, 300);
      return false;
    }

    _aiState.caseReference = result.caseReference;
    if (typeof window._lcdjpRefreshCitizenCaseData === 'function') {
      window._lcdjpRefreshCitizenCaseData();
    }
    return true;
  }

  
  
  
  
  
  
  
  
  
  
  
  var _aiContactPlaceQueries = {
    'lc':          [{ type: 'local_government_office', label: 'LC Office' }],
    'police':      [{ type: 'police', label: 'Police' }],
    'legal_org':   [{ type: 'lawyer', keyword: 'legal aid organization', label: 'Legal Organisation' }],
    
    
    
    
    'court':       [{ type: 'courthouse', label: 'Court / Tribunal' }],
    'legal_firm':  [{ type: 'lawyer', keyword: 'advocates law firm', label: 'Law firm' }],
    'mediation':   [{ keyword: 'mediation center', label: 'Mediation Service' }],
    'community':   [{ keyword: 'community organization', label: 'Community Organization' }]
  };

  function _aiContactTypeLabel(type) {
    return type === 'lc' ? 'LC offices' : type === 'police' ? 'police stations'
      : type === 'court' ? 'courts / tribunals' : type === 'mediation' ? 'mediation services'
      : type === 'community' ? 'community organizations' : 'legal organisations';
  }

  
  
  
  
  
  
  
  
  
  
  
  
  function _aiGetCurrentPosition(onSuccess, onError) {
    if (window._lcdjpUserPosition &&
        isFinite(window._lcdjpUserPosition.lat) && isFinite(window._lcdjpUserPosition.lng)) {
      onSuccess({ coords: { latitude: window._lcdjpUserPosition.lat, longitude: window._lcdjpUserPosition.lng } });
      return;
    }
    if (!navigator.geolocation) { onError(); return; }
    navigator.geolocation.getCurrentPosition(
      onSuccess, onError,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Referral chain. When the person who should handle a report (LC, police, lawyer) is not on
  // JusticeLink and not on the map, we never stop at "nobody is available". We try, in order:
  //   1. registered people/offices of that kind nearby (LC: same parish, then sub-county, then district)
  //   2. the same kind of office on the live map (Places), 25 km then 50 km
  //   3. another kind of office that will know where to go (police, LC or court), with an explicit
  //      "go there and ask for directions / contacts of <the right office> for <this area>" instruction
  //   4. the national emergency numbers
  // ---------------------------------------------------------------------------------------------
  var _AI_REF_TARGETS = {
    lc:     { label: 'LC office',      plural: 'LC offices',      phrase: 'the Local Council office' },
    police: { label: 'police station', plural: 'police stations', phrase: 'the nearest police station or post' },
    legal:  { label: 'legal aid provider', plural: 'legal aid providers', phrase: 'a lawyer or legal aid office' },
    court:  { label: 'court',          plural: 'courts',          phrase: 'the nearest court' }
  };
  // Where to send the person when the target itself cannot be found. Order matters.
  var _AI_REF_SOURCES = { lc: ['police', 'court'], police: ['lc', 'court'], legal: ['police', 'lc', 'court'], court: ['police', 'lc'] };
  // Coordinates the map endpoint used to invent when it could not locate a row; never treat them as real.
  var _AI_PLACEHOLDER_LAT = 1.3733, _AI_PLACEHOLDER_LNG = 32.2903;

  /** Wording and area for the target; a Local Council target is specific to one level. */
  function _aiTargetInfo(target, level, location) {
    var base = _AI_REF_TARGETS[target] || _AI_REF_TARGETS.police;
    if (target === 'lc' && _AI_LC_LEVELS[level]) {
      var info = _AI_LC_LEVELS[level];
      return { label: info.name + ' office', plural: info.name + ' offices', phrase: info.who,
               area: _aiAreaForLevel(location, level) || _aiLocText(location) || 'your area' };
    }
    return { label: base.label, plural: base.plural, phrase: base.phrase, area: _aiLocText(location) || 'your area' };
  }

  function _aiRefQueries(kind, level) {
    if (kind === 'lc' && _AI_LC_LEVELS[level]) return [_AI_LC_LEVELS[level].map];
    if (kind === 'legal') return _aiContactPlaceQueries['legal_firm'].concat(_aiContactPlaceQueries['legal_org']);
    return _aiContactPlaceQueries[kind] || [];
  }

  function _aiLocText(location) {
    location = location || {};
    return [location.village, location.parish, location.subCounty, location.district]
      .filter(function (part) { return part && String(part).trim(); }).join(', ');
  }

  function _aiCurrentLocation() {
    return _aiState.lcLocationOverride || {
      district: sessionStorage.getItem('lcdjp_district') || '',
      subCounty: sessionStorage.getItem('lcdjp_subCounty') || '',
      parish: sessionStorage.getItem('lcdjp_parish') || '',
      village: sessionStorage.getItem('lcdjp_village') || ''
    };
  }

  /** Where to search from: GPS, or the geocoded registered address (whichever the person chose first). */
  function _aiReferralCenter(location) {
    return new Promise(function (resolve) {
      if (_aiState.userLat != null && _aiState.userLng != null) {
        resolve({ lat: _aiState.userLat, lng: _aiState.userLng });
        return;
      }
      function fromGps(next) {
        if (!navigator.geolocation && !window._lcdjpUserPosition) { next(); return; }
        _aiGetCurrentPosition(function (position) {
          _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        }, next);
      }
      function fromAddress(next) {
        var text = _aiLocText(location);
        if (!text) { next(); return; }
        fetch(API_BASE_URL + '/api/map/geocode?address=' + encodeURIComponent(text + ', Uganda'))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (g) {
            if (g && g.status === 'OK' && isFinite(g.lat) && isFinite(g.lng)) {
              _aiState.userLat = Number(g.lat); _aiState.userLng = Number(g.lng);
              resolve({ lat: _aiState.userLat, lng: _aiState.userLng });
            } else { next(); }
          })
          .catch(next);
      }
      var home = _aiState.lcLocationChoice === 'verification'
        || !!(_aiState.incidentLocation && !/:detected$/.test(_aiState.incidentLocation.source));
      var none = function () { resolve(null); };
      if (home) fromAddress(function () { fromGps(none); });
      else fromGps(function () { fromAddress(none); });
    });
  }

  /**
   * Registered LC officials who serve exactly the citizen's area at the required level. The server checks the whole
   * chain (LC1: village+parish+sub-county+district, LC2: parish+sub-county+district, LC3: sub-county+district), so
   * a citizen is never shown an LC from another village, parish or sub-county.
   */
  function _aiFetchRegisteredLCsNear(location, level) {
    location = location || {};
    level = level || 'LC1';
    if (!location.district) return Promise.resolve([]);
    var params = { level: level, district: location.district, subCounty: location.subCounty,
                   parish: location.parish, village: location.village };
    var qs = Object.keys(params).filter(function (k) { return params[k]; })
      .map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(API_BASE_URL + '/api/map/lcs?' + qs)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; })
      .catch(function () { return []; })
      .then(function (rows) {
      return rows.slice(0, 8).map(function (lc) {
        var name = ((lc.first_name || '') + ' ' + (lc.last_name || '')).trim() || lc.username;
        var lat = Number(lc.latitude), lng = Number(lc.longitude);
        var real = isFinite(lat) && isFinite(lng) && !(lat === _AI_PLACEHOLDER_LAT && lng === _AI_PLACEHOLDER_LNG);
        var where = [lc.village, lc.parish, lc.sub_county, lc.district].filter(Boolean).join(', ');
        return {
          officeName: _AI_LC_LEVELS[level].name + ': ' + name,
          address: where,
          latitude: real ? lat : null,
          longitude: real ? lng : null,
          phone: lc.phone || '',
          place_id: '',
          _aiType: 'lc', _aiPlaceLabel: _AI_LC_LEVELS[level].name, _aiSource: 'registered'
        };
      });
    });
  }

  /** Map search for one kind of office: 25 km first, then 50 km. Resolves to directory entities, nearest first. */
  function _aiSearchKindOnMap(kind, level) {
    var queries = _aiRefQueries(kind, level);
    var type = kind === 'lc' ? 'lc' : kind === 'police' ? 'police' : kind;
    function run(radius) {
      return _aiEmergencyFetchLiveMap(queries, radius).then(function (places) {
        return places.map(function (p) { return _aiPlaceToDirectoryEntity(p, type); });
      });
    }
    return run(25000).then(function (found) {
      return found.length ? found : run(50000);
    }).then(function (found) { return found.sort(_aiDistanceSort); });
  }

  function _aiStoreResults(kind, results) {
    if (kind === 'lc') _aiState.lcResults = results;
    else if (kind === 'police') _aiState.policeResults = results;
    else _aiState.placeResults = results;
  }

  function _aiReferralNote(t, source, area, first) {
    var s = _AI_REF_TARGETS[source];
    var ref = _aiState.caseReference
      ? ' Tell them your JusticeLink reference <strong>' + _esc(_aiState.caseReference) + '</strong> if they ask.' : '';
    return '<div style="background:#fff8e1;border:1.5px solid #f9a825;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:13px;font-weight:700;color:#8d6e00;margin-bottom:6px;">How to reach ' + _esc(t.phrase) + ' for ' + _esc(area) + '</div>'
      + '<div style="font-size:13px;color:#333;">I couldn\'t find ' + _esc(t.phrase) + ' for <strong>' + _esc(area) + '</strong> on JusticeLink or on the map. '
      + 'The nearest ' + _esc(s.label) + ' is <strong>' + _esc(first && (first.officeName || first.stationName || first.name) || s.label) + '</strong>. '
      + '<strong>Go there and ask them for directions, or a phone number, for ' + _esc(t.phrase) + ' that covers ' + _esc(area) + '.</strong>'
      + ref + '</div></div>';
  }

  /**
   * @param target 'lc' | 'police' | 'legal' | 'court' (who should have handled the report)
   * @param skipDirect true when the caller already searched for the target itself and found nothing
   */
  function _aiReferralChain(target, location, skipDirect, opts) {
    location = location || _aiCurrentLocation();
    var level = (opts && opts.level) || (target === 'lc' ? (_aiState.lcLevel || 'LC1') : null);
    var t = _aiTargetInfo(target, level, location);
    var area = t.area;
    return _aiReferralCenter(location).then(function (center) {
      if (!center) {
        _addBotBubble('I couldn\'t work out where you are, so I can\'t search the map. Please enable location access, or go to your nearest police station and ask them for directions or a phone number for ' + _esc(t.phrase) + ' for ' + _esc(area) + '.', 300);
        _aiShowNationalFallback();
        return;
      }
      var direct = skipDirect ? Promise.resolve([]) : Promise.all([
        target === 'lc' ? _aiFetchRegisteredLCsNear(location, level) : Promise.resolve([]),
        // Map results cannot be tied to the citizen's village/parish/sub-county, so an LC office is never
        // suggested from the map; only the registered, jurisdiction-checked ones above are.
        target === 'lc' ? Promise.resolve([]) : _aiSearchKindOnMap(target, level)
      ]).then(function (parts) { return parts[0].concat(parts[1]); });

      return direct.then(function (found) {
        if (found.length) {
          found.sort(function (a, b) {
            // entities without a usable map pin go last
            var ap = a.latitude == null ? 1 : 0, bp = b.latitude == null ? 1 : 0;
            return ap - bp || _aiDistanceSort(a, b);
          });
          _aiStoreResults(target, found);
          _addBotBubble('There is no registered ' + _esc(t.label) + ' for <strong>' + _esc(area) + '</strong> yet, but here ' + (found.length === 1 ? 'is the nearest one' : 'are the nearest ones') + '. Call them or get directions, and ask them to take your matter or point you to the right office. If this level cannot resolve it, the next step is the one listed above:', 200);
          _aiEmergencyRenderMerged(found);
          return;
        }
        var sources = (_AI_REF_SOURCES[target] || ['police']).slice();
        function next() {
          var kind = sources.shift();
          if (!kind) {
            _addBotBubble('I couldn\'t find any office nearby on JusticeLink or on the map. Please go to the police station or sub-county headquarters nearest you and ask them for directions or a phone number for ' + _esc(t.phrase) + ' for ' + _esc(area) + '. In an emergency, use the numbers below.', 300);
            _aiShowNationalFallback();
            return;
          }
          return _aiSearchKindOnMap(kind).then(function (places) {
            if (!places.length) return next();
            _aiStoreResults(kind, places);
            _addBotBubble(_aiReferralNote(t, kind, area, places[0]), 200);
            _aiEmergencyRenderMerged(places);
          });
        }
        return next();
      });
    }).catch(function () {
      _addBotBubble('I ran into a problem looking for offices near you. Please go to your nearest police station and ask them for directions or a phone number for ' + _esc(t.phrase) + ' for ' + _esc(area) + '.', 200);
      _aiShowNationalFallback();
    });
  }

  function _aiFetchNearbyServiceProviders(type) {
    var label = _aiContactTypeLabel(type);
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I need location access to find nearby ' + label + '. Please enable location access and try again.', 300);
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        var placeQueries = _aiContactPlaceQueries[type] || [{ type: type, label: label }];

        _aiEmergencyFetchLiveMap(placeQueries, 25000).then(function (places) {
          var results = places.map(function (p) { return _aiPlaceToDirectoryEntity(p, type); }).sort(_aiDistanceSort);
          if (type === 'lc') { _aiState.lcResults = results; }
          else if (type === 'police') { _aiState.policeResults = results; }
          else { _aiState.placeResults = results; }
          if (!results.length) {
            var refTarget = type === 'lc' ? 'lc' : type === 'police' ? 'police' : 'legal';
            _addBotBubble('I couldn\'t find a nearby ' + label.replace(/s$/, '') + ' on the map. Let me look for someone who can point you to the right office.', 200);
            _aiReferralChain(refTarget, _aiCurrentLocation(), true, { level: _aiState.lcLevel });
            return;
          }
          _addBotBubble('Here ' + (results.length === 1 ? 'is the nearest' : 'are the nearest') + ' ' + label + '. Would you like directions, or their contact details?', 200);
          _aiEmergencyRenderMerged(results);
        }).catch(function () {
          _addBotBubble('I ran into a problem looking up nearby ' + label + '. Please try again.', 200);
        });
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please enable location access and try again.', 300);
      }
    );
  }

  function _aiDistanceLabel(lat, lng) {
    if (_aiState.userLat == null || _aiState.userLng == null) return '';
    if (lat == null || lng == null || !isFinite(Number(lat)) || !isFinite(Number(lng))) return '';
    if (typeof cmCalculateDistance !== 'function' || typeof cmFormatDistance !== 'function') return '';
    var km = cmCalculateDistance(_aiState.userLat, _aiState.userLng, Number(lat), Number(lng));
    return cmFormatDistance(km);
  }

  




































  
  
  
  
  var _aiEmergencyPlaceQueries = {
    'Fire Emergency':    [{ type: 'fire_station', label: 'Fire Station' }],
    'Medical Emergency': [{ type: 'hospital', label: 'Hospital' }],
    'Crime Report':      [{ type: 'police', label: 'Police' }],
    'Accident':          [{ type: 'police', label: 'Police' }, { type: 'hospital', label: 'Hospital' }],
    'Road Incident':     [{ type: 'police', label: 'Police' }, { type: 'hospital', label: 'Hospital' }],
    'Missing Person':    [{ type: 'police', label: 'Police' }],
    'Vehicle Breakdown': [{ type: 'car_repair', label: 'Motor Garage' }]
    
    
    
    
  };

  function _aiEmergencyPlaceQueriesFor(category) {
    return _aiEmergencyPlaceQueries[category] || [{ type: 'police', label: 'Police' }, { type: 'local_government_office', label: 'Local Council' }];
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  function _aiCoordInUganda(lat, lng) {
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return true;
    return lat >= -1.6 && lat <= 4.3 && lng >= 29.4 && lng <= 35.1;
  }
  function _aiUserInUganda() {
    var lat = (_aiState && _aiState.userLat != null) ? _aiState.userLat
      : (window._lcdjpUserPosition && window._lcdjpUserPosition.lat);
    var lng = (_aiState && _aiState.userLng != null) ? _aiState.userLng
      : (window._lcdjpUserPosition && window._lcdjpUserPosition.lng);
    return _aiCoordInUganda(lat, lng);
  }

  
  
  
  
  
  
  
  
  
  
  
  
  window._lcdjpOutsideUganda = window._lcdjpOutsideUganda || false;

  function _aiSetUserPosition(lat, lng) {
    if (_aiState) { _aiState.userLat = lat; _aiState.userLng = lng; }
    if (!_aiCoordInUganda(lat, lng)) _aiMarkOutsideUganda();
  }

  function _aiIsKnownOutsideUganda() {
    if (window._lcdjpOutsideUganda) return true;
    if (_aiState && _aiState.locationOutsideUganda) return true;
    return false;
  }

  function _aiMarkOutsideUganda() {
    var alreadyKnown = _aiIsKnownOutsideUganda();
    window._lcdjpOutsideUganda = true;
    if (_aiState) _aiState.locationOutsideUganda = true;
    
    
    
    if (!alreadyKnown && _aiState && _aiState.mode === 'report'
        && typeof _aiBlockReportCaseOutsideUganda === 'function') {
      _aiBlockReportCaseOutsideUganda();
    }
  }

  






  function _aiBlockReportCaseOutsideUganda(label) {
    if (label) _addUserBubble(label);
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _setStep(1);
    _addBotBubble(
      '<div style="background:#fce4ec;border:1.5px solid #c62828;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:13px;font-weight:700;color:#c62828;margin-bottom:6px;"> Report Case isn\'t available outside Uganda</div>'
      + '<div style="font-size:13px;color:#333;">It looks like you\'re currently outside Uganda. LCDJP files cases to Ugandan LC offices, '
      + 'police, and lawyers only, so I can\'t take a case report from here -- please contact your local police or legal services directly. '
      + 'If this is a life-threatening emergency, use Emergency Help below instead.</div>'
      + '</div>', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#e3f2fd; border-color:#1565c0; color:#1565c0;" onclick="window._aiEmergencyOnly()"> Emergency Services Only</button>'
      + '</div>';
    _addWidget(html, 300);
  }
  
  function _aiEmergencyButtonsHtml(size) {
    if (!_aiUserInUganda()) {
      return '<div style="background:#fff3e0;border:1.5px solid #ffb74d;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#7a4a00;max-width:320px;">'
        + 'You appear to be outside Uganda, 999/112 are Uganda\'s emergency numbers and may not work here. Please contact your local emergency services directly.</div>';
    }
    var pad = size === 'small' ? '9px 18px' : '10px 22px';
    var radius = size === 'small' ? '20px' : '24px';
    var font = size === 'small' ? '13px' : '15px';
    return '<a href="tel:999" style="background:#c62828;color:white;text-decoration:none;padding:' + pad + ';border-radius:' + radius + ';font-weight:700;font-size:' + font + ';display:inline-block;"> Call 999</a>'
         + '<a href="tel:112" style="background:#1a237e;color:white;text-decoration:none;padding:' + pad + ';border-radius:' + radius + ';font-weight:700;font-size:' + font + ';display:inline-block;"> Call 112</a>';
  }
  
  function _aiEmergencyButtonHtml999() {
    if (!_aiUserInUganda()) {
      return '<span style="font-size:12.5px;color:#7a4a00;">Outside Uganda, please contact your local emergency services.</span>';
    }
    return '<a href="tel:999" style="background:#c62828;color:white;text-decoration:none;padding:9px 18px;border-radius:20px;font-weight:700;font-size:13px;display:inline-block;"> Call 999</a>';
  }
  
  function _aiEmergencyInlineHtml() {
    if (!_aiUserInUganda()) {
      return 'your local emergency number (999/112 are Uganda-only)';
    }
    return '<a href="tel:999" style="color:#c62828;font-weight:700;">999</a> or <a href="tel:112" style="color:#1a237e;font-weight:700;">112</a>';
  }
  function _aiEmergencyInlinePlain() {
    if (!_aiUserInUganda()) {
      return 'your local emergency number (999/112 are Uganda-only)';
    }
    return '<strong>999</strong> or <strong>112</strong>';
  }

  function _aiEmergencyRoutingChoice(contactType) {
    return (contactType === 'lc' || contactType === 'police' || contactType === 'legal_aid')
      ? contactType
      : 'police';
  }

  
  
  
  
  
  
  
  
  
  
  function _aiImmediateHelpNearby() {
    var placeQueries = [{ type: 'police', label: 'Police' }, { type: 'local_government_office', label: 'Local Council' }];
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _aiShowNationalFallback();
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        _aiEmergencyFetchNearby(placeQueries, 20000, 0);
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please use the number below right away.', 300);
        _aiShowNationalFallback();
      }
    );
  }

  function _aiEmergencyAutoLocate() {
    _setStep(3);
    _aiState.chatMode = true;
    var placeQueries = _aiEmergencyPlaceQueriesFor(_aiState.category);
    _aiState.contactType = (placeQueries[0] && placeQueries[0].type) || 'police';
    
    
    
    

    _addBotBubble('Got it, locating you now to find the nearest help...', 200);

    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I can\'t access location on this device. Please use the number below right away.', 500);
      _aiShowNationalFallback();
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        _aiEmergencyFetchNearby(placeQueries, 20000, 0);
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please enable location access, or use the number below right away.', 500);
        _aiShowNationalFallback();
      }
    );
  }

  
  
  
  
  
  
  
  
  
  var _aiIrrelevantGovOfficeNamePattern = new RegExp(
    '\\b(nssf|social security|surveyors?|surveying|insurance|sacco|' +
    'microfinance|\\bbank\\b|co-?operative|\\blimited\\b|\\bltd\\b|\\bco\\.|' +
    '\\bcompany\\b|enterprises?|ventures?|investments?|properties|' +
    'real estate|solutions|technologies|logistics|\\bmotors\\b|garage|' +
    'hardware|electronics|supermarket|\\bhotel\\b|restaurant|pharmacy|' +
    '\\bclinic\\b|chambers|advocates|law firm|forex|consult(ing|ants)?)\\b',
    'i'
  );

  function _aiIsRelevantGovOfficeName(name) {
    return !_aiIrrelevantGovOfficeNamePattern.test(String(name || ''));
  }

  
  
  
  
  
  function _aiEmergencyFetchLiveMap(placeQueries, placeRadius) {
    if (!placeQueries.length || _aiState.userLat == null) return Promise.resolve([]);
    return loadGoogleMapsSDK().then(function () {
      // Shared helper in maps.js: uses Places API (New), falls back to legacy PlacesService.
      if (typeof window.lcdjpPlacesNearby !== 'function') return [];
      var center = { lat: _aiState.userLat, lng: _aiState.userLng };
      var pending = placeQueries.map(function (q) {
        return new Promise(function (resolve) {
          window.lcdjpPlacesNearby({
            center: center,
            radiusM: Math.min(placeRadius, 50000),
            type: q.type,
            keyword: q.keyword,
            max: 8
          }, function (items) {
            resolve((items || []).map(function (place) {
              return {
                _aiType: 'place',
                _aiPlaceLabel: q.label || 'Nearby Service',
                name: place.name || 'Nearby service',
                address: place.vicinity || '',
                latitude: place.lat,
                longitude: place.lng,
                place_id: place.place_id || '',
                phone: ''
              };
            }).filter(function (p) {
              if (p.latitude == null || p.longitude == null) return false;
              if (q.type === 'local_government_office' && !_aiIsRelevantGovOfficeName(p.name)) return false;
              return true;
            }));
          });
        });
      });
      return Promise.all(pending).then(function (lists) { return [].concat.apply([], lists); });
    }).catch(function () { return []; });
  }


  
  
  
  
  
  
  
  function _aiPlaceToDirectoryEntity(place, type) {
    var entity = {
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      place_id: place.place_id,
      phone: '',
      _aiType: type,
      _aiPlaceLabel: place._aiPlaceLabel || (type === 'lc' ? 'LC Office' : type === 'police' ? 'Police' : 'Legal Organisation'),
      _aiSource: 'place'
    };
    if (type === 'lc') { entity.officeName = place.name; } else if (type === 'police') { entity.stationName = place.name; }
    return entity;
  }

  
  
  
  
  
  
  
  
  
  function _aiEmergencyBroadenedQueries(category) {
    var already = _aiEmergencyPlaceQueriesFor(category).map(function (q) { return q.type; });
    var candidates = [{ type: 'police', label: 'Police' }, { type: 'local_government_office', label: 'Local Council' }];
    var next = candidates.filter(function (c) { return already.indexOf(c.type) === -1; });
    return next.length ? next : [{ type: 'police', label: 'Police' }];
  }

  function _aiEmergencyFetchNearby(placeQueries, placeRadius, tier) {
    tier = tier || 0;
    _aiEmergencyFetchLiveMap(placeQueries, placeRadius).then(function (merged) {
      if (merged.length) {
        _aiState.placeResults = merged;
        _aiState.lcResults = [];
        _aiState.policeResults = [];
        _addBotBubble(
          (tier > 0 ? 'Found ' : 'Here ') + (merged.length === 1 ? 'is the nearest help' : 'are the nearest services') + ' I could find. Tap Contact to call, or Directions to get there:',
          200
        );
        _aiEmergencyRenderMerged(merged);
        return;
      }
      if (tier === 0) {
        
        
        
        
        
        _addBotBubble('Nothing nearby yet, widening the search across the district...', 200);
        _aiEmergencyFetchNearby(placeQueries, 50000, 1);
        return;
      }
      if (tier === 1) {
        
        
        
        
        
        
        var broadened = _aiEmergencyBroadenedQueries(_aiState.category);
        _addBotBubble('Nothing specific to that nearby, checking the closest Police post and Local Council office instead...', 200);
        _aiEmergencyFetchNearby(broadened, 50000, 2);
        return;
      }
      
      
      _aiShowNationalFallback();
    });
  }

  function _aiDistanceSort(a, b) {
    if (_aiState.userLat == null || typeof cmCalculateDistance !== 'function') return 0;
    var aNo = a.latitude == null || a.longitude == null, bNo = b.latitude == null || b.longitude == null;
    if (aNo || bNo) return (aNo ? 1 : 0) - (bNo ? 1 : 0);
    var da = cmCalculateDistance(_aiState.userLat, _aiState.userLng, Number(a.latitude), Number(a.longitude));
    var db = cmCalculateDistance(_aiState.userLat, _aiState.userLng, Number(b.latitude), Number(b.longitude));
    return da - db;
  }

  function _aiEmergencyRenderMerged(merged) {
    merged = merged.slice().sort(_aiDistanceSort);
    setTimeout(function () {
      var area = _getChatArea();
      if (!area) return;
      var wrap = document.createElement('div');
      wrap.className = 'ai-service-cards';
      wrap.style.cssText = 'animation:ai-msg-in 0.3s ease; padding-left:44px;';
      merged.slice(0, 6).forEach(function (entity) {
        var type = entity._aiType;
        var srcList = type === 'lc' ? _aiState.lcResults : (type === 'police' ? _aiState.policeResults : _aiState.placeResults);
        var idx = srcList.indexOf(entity);
        if (idx === -1) return;
        var name = type === 'lc' ? (entity.officeName || 'LC Office')
          : type === 'police' ? (entity.stationName || 'Police Station')
          : (entity.name || 'Nearby Service');
        var address = entity.address || entity.jurisdiction || entity.jurisdictionArea || '';
        var distLabel = _aiDistanceLabel(entity.latitude, entity.longitude);
        var typeLabel = type === 'lc' ? 'LC Office' : type === 'police' ? 'Police' : (entity._aiPlaceLabel || 'Nearby');
        var iconBg = type === 'lc' ? '#e3f2fd' : type === 'police' ? '#fce4ec' : '#e8f5e9';
        var contactBg = type === 'lc' ? '#5c6bc0' : type === 'police' ? '#e53935' : '#2e7d32';
        var dirColor = type === 'lc' ? '#1a237e' : type === 'police' ? '#c62828' : '#1b5e20';
        var dirBorder = type === 'lc' ? '#c5cae9' : type === 'police' ? '#ffcdd2' : '#c8e6c9';
        var card = document.createElement('div');
        card.className = 'ai-contact-card';
        card.innerHTML =
          '<div class="ai-contact-icon" style="background:' + iconBg + ';"></div>'
          + '<div style="flex:1; min-width:0;">'
          + '<div style="font-weight:700; font-size:14px; color:#1a1a2e; margin-bottom:2px;">' + _esc(name)
          + ' <span style="font-size:10px;font-weight:700;color:#888;">&middot; ' + typeLabel + '</span></div>'
          + '<div style="font-size:12px; color:#666;"> ' + _esc(address) + (distLabel ? ' &middot; ' + _esc(distLabel) : '') + '</div>'
          + '</div>'
          + '<div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">'
          + '<button onclick="window._aiContactDirect(\'' + type + '\',' + idx + ')" style="background:' + contactBg + '; color:white; border:none; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;"> Contact</button>'
          + '<button onclick="window._aiViewDirections(\'' + type + '\',' + idx + ')" style="background:white; color:' + dirColor + '; border:1.5px solid ' + dirBorder + '; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;"> Directions</button>'
          + '</div>';
        wrap.appendChild(card);
      });
      area.appendChild(wrap);
      _scrollBottom();
      _addBotBubble(
        '<div style="padding-left:44px;font-size:12px;color:#888;">Still in danger? '
        + _aiEmergencyInlineHtml() + ' is always available too.</div>',
        200
      );
      _addBotBubble('You can also just type any more details below, and I\'ll keep helping, no need to wait.', 1400);
    }, 900);
  }

  
  
  
  
  function _aiShowNationalFallback() {
    _addBotBubble(
      '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:14px 16px;">'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
      + _aiEmergencyButtonsHtml('large')
      + '</div>'
      + '</div>', 400
    );
  }

  function _aiEntityFor(type, idx) {
    if (type === 'lc') return _aiState.lcResults[idx];
    if (type === 'police') return _aiState.policeResults[idx];
    return _aiState.placeResults[idx];
  }

  function _aiRenderContactCard(name, address, phone, noPhoneNote, placeId) {
    var phonePlain = (phone || '').replace(/\s/g, '');
    var contactButton = phone
      ? '<a href="tel:' + phonePlain + '" style="background:#1a237e;color:white;text-decoration:none;padding:9px 18px;border-radius:20px;font-weight:700;font-size:13px;display:inline-block;"> ' + _esc(phone) + '</a>'
      : (placeId
        ? '<a href="https://www.google.com/maps/place/?q=place_id:' + encodeURIComponent(placeId) + '" target="_blank" rel="noopener" style="background:#eef0f8;color:#1a237e;text-decoration:none;padding:9px 18px;border-radius:20px;font-weight:700;font-size:13px;display:inline-block;"> Open in Maps</a>'
        : '<span style="font-size:13px;color:#888;">' + noPhoneNote + '</span>');
    _addBotBubble(
      '<div style="background:#f5f7ff;border:1.5px solid #1a4080;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">' + _esc(name) + '</div>'
      + '<div style="font-size:13px;color:#555;margin-bottom:12px;"> ' + _esc(address) + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + contactButton
      + _aiEmergencyButtonHtml999()
      + '</div>'
      + '<div style="margin-top:10px;font-size:12px;color:#888;">For urgent life-threatening emergencies, ' + (_aiUserInUganda() ? 'always call <strong>999</strong> or <strong>112</strong>.' : 'contact your local emergency services.') + '</div>'
      + '</div>',
      0
    );
  }

  window._aiContactDirect = function(type, idx) {
    var entity = _aiEntityFor(type, idx);
    if (!entity) return;

    
    
    
    
    
    
    
    
    
    
    

    var name = type === 'lc' ? (entity.officeName || 'LC Office')
      : type === 'police' ? (entity.stationName || 'Police Station')
      : (entity.name || 'Nearby service');
    var address = entity.address || entity.jurisdiction || entity.jurisdictionArea || '';
    var noPhoneNote = type === 'lc' ? 'No phone number on file for this office.'
      : type === 'police' ? 'No phone number on file for this station.'
      : 'No phone number on file for this service.';

    if (entity.phone) { _aiRenderContactCard(name, address, entity.phone, noPhoneNote, entity.place_id); return; }

    
    
    
    
    
    if (entity.place_id && typeof window.lcdjpPlacePhone === 'function') {
      window.lcdjpPlacePhone(entity.place_id, function (phone) {
        entity.phone = phone || '';
        _aiRenderContactCard(name, address, entity.phone, noPhoneNote, entity.place_id);
      });
      return;
    }
    _aiRenderContactCard(name, address, '', noPhoneNote, entity.place_id);
  };

  window._aiViewDirections = function(type, idx) {
    var entity = _aiEntityFor(type, idx);
    if (!entity) return;
    var name = type === 'lc' ? (entity.officeName || 'LC Office')
      : type === 'police' ? (entity.stationName || 'Police Station')
      : (entity.name || 'Nearby Service');
    var address = entity.address || entity.jurisdiction || entity.jurisdictionArea || '';
    if (entity.latitude == null || entity.longitude == null) {
      _addBotBubble('<div style="background:#fff8e1;border:1.5px solid #f9a825;border-radius:12px;padding:14px 16px;font-size:13px;color:#333;">I don\'t have a map pin for <strong>' + _esc(name) + '</strong>' + (address ? ' (' + _esc(address) + ')' : '') + '. Please call them, or ask at the nearest police station or sub-county office how to get there.</div>', 0);
      return;
    }
    if (Number.isFinite(Number(entity.latitude)) && Number.isFinite(Number(entity.longitude))
        && typeof window._lcdjpGetDirectionsInApp === 'function') {
      window._lcdjpGetDirectionsInApp(
        Number(entity.latitude), Number(entity.longitude), name, 'WALKING'
      );
      _addBotBubble(
        '<div style="color:#1b5e20;font-weight:600;">Drawing an in-app route to '
        + _esc(name) + '.</div>', 0
      );
      return;
    }
    var distLabel = _aiDistanceLabel(entity.latitude, entity.longitude);
    _addBotBubble(
      '<div style="background:#e8f5e9;border:1.5px solid #43a047;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:4px;"> ' + _esc(name) + '</div>'
      + '<div style="font-size:13px;color:#555;margin-bottom:12px;"> ' + _esc(address) + (distLabel ? ' · ' + _esc(distLabel) + ' away' : '') + '</div>'
      + '<div style="font-size:12px;color:#777;">The in-app map is still loading. Please try Directions again shortly.</div>'
      + '</div>',
      0
    );
  };

  









  
  
  
  
  var _aiStructuredAnswerKeys = ['village', 'district', 'email'];

  function _aiBuildCasePayload() {
    var uname = sessionStorage.getItem('lcdjp_username') || '';
    var answers = _aiState.answers || {};
    var descriptionParts = [];
    Object.keys(answers).forEach(function (q) {
      if (answers[q] && _aiStructuredAnswerKeys.indexOf(q) === -1) descriptionParts.push(q + ': ' + answers[q]);
    });
    var kin = _aiState.kin || {};
    
    
    var attachment = _aiState.attachment || null;
    
    
    
    
    
    
    
    
    
    var _lcOverride = _aiState.lcLocationOverride || null;
    var _confirmed = !!(_lcOverride && String(_lcOverride.source || '').indexOf('confirmed_incident') === 0);
    var _district = (_lcOverride && _lcOverride.district) || answers.district || sessionStorage.getItem('lcdjp_district') || '';
    // A person-confirmed chain is used exactly as chosen: filling a gap from the registered address would pair
    // a village here with a parish from somewhere else and send the case to the wrong office.
    var _subCounty = _confirmed ? (_lcOverride.subCounty || '') : ((_lcOverride && _lcOverride.subCounty) || sessionStorage.getItem('lcdjp_subCounty') || '');
    var _parish = _confirmed ? (_lcOverride.parish || '') : ((_lcOverride && _lcOverride.parish) || sessionStorage.getItem('lcdjp_parish') || '');
    var _village = _confirmed ? (_lcOverride.village || '') : ((_lcOverride && _lcOverride.village) || answers.village || sessionStorage.getItem('lcdjp_village') || '');
    
    
    
    
    
    var _fullLocation = [_village, _parish, _subCounty, _district]
      .filter(function (part) { return part && part.trim(); })
      .join(', ');
    return {
      caseType: _aiState.category || 'General',
      citizenId: uname,
      description: descriptionParts.join(' | ') || (_aiState.category || 'General case reported via AI Assistant'),
      district: _district,
      subCounty: _subCounty,
      parish: _parish,
      village: _village,
      fullLocation: _fullLocation,
      citizenPhone: sessionStorage.getItem('lcdjp_phone') || '',
      
      
      
      
      citizenEmail: answers.email || sessionStorage.getItem('lcdjp_email') || '',
      kinName: kin.name || '',
      kinPhone: kin.phone || '',
      kinEmail: kin.email || '',
      kinRelationship: kin.relationship || '',
      attachedMedia: attachment ? attachment.name : '',
      attachedFileData: attachment ? attachment.data : '',
      
      
      
      
      
      
      
      
      
      
      
      attachedFileSize: attachment ? attachment.size : 0,
      attachedFileType: attachment ? attachment.type : '',
      
      
      
      
      routingChoice: _aiState.contactType || '',
      lcLocationChoice: _aiState.lcLocationChoice || '',
      lcLocationSource: _lcOverride ? _lcOverride.source : (_aiState.lcLocationChoice === 'verification' ? 'verification' : '')
    };
  }

  
  
  
  
  function _aiSuggestLegalOrg(caseRef) {
    var refLabel = caseRef ? ' (<strong>' + _esc(caseRef) + '</strong>)' : '';

    function runSearch() {
      var placeQueries = _aiContactPlaceQueries['legal_org'];
      _aiEmergencyFetchLiveMap(placeQueries, 25000).then(function (places) {
        var results = places.map(function (p) { return _aiPlaceToDirectoryEntity(p, 'legal_org'); }).sort(_aiDistanceSort);
        _aiState.placeResults = results;
        if (!results.length) {
          _addBotBubble('I couldn\'t find a legal aid organisation near you' + refLabel + ' on the map. Let me find someone nearby who can point you to one.', 200);
          _aiReferralChain('legal', _aiCurrentLocation(), true);
          return;
        }
        _addBotBubble(
          (caseRef ? 'None of the matched lawyers were able to take your case' + refLabel + ' right now. ' : '')
          + 'Here ' + (results.length === 1 ? 'is a nearby legal organisation' : 'are nearby legal organisations') + ' that may be able to help:',
          200
        );
        _aiEmergencyRenderMerged(results);
      }).catch(function () {
        _addBotBubble('I ran into a problem looking up legal organisations near you. Please try again.', 200);
      });
    }

    if (_aiState.userLat != null && _aiState.userLng != null) { runSearch(); return; }
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I need location access to find legal organisations near you. Please enable location access and try again.', 300);
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        runSearch();
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please enable location access and try again.', 300);
      }
    );
  }

  // Used when no lawyer can take the case. Legal organisations do not resolve cases, so instead of listing them we
  // point to places that can act: the nearest court and Police station.
  function _aiSuggestCourtAndPolice(caseRef) {
    var refLabel = caseRef ? ' (<strong>' + _esc(caseRef) + '</strong>)' : '';

    function runSearch() {
      var queries = _aiContactPlaceQueries['court'].concat(_aiContactPlaceQueries['police']);
      _aiEmergencyFetchLiveMap(queries, 25000).then(function (places) {
        var courts = [], police = [];
        places.forEach(function (p) {
          if (p._aiPlaceLabel === 'Police') police.push(_aiPlaceToDirectoryEntity(p, 'police'));
          else courts.push(_aiPlaceToDirectoryEntity(p, 'court'));
        });
        _aiState.policeResults = police;
        _aiState.placeResults = courts;
        var results = courts.concat(police).sort(_aiDistanceSort);
        if (!results.length) {
          _addBotBubble('I couldn\'t find a court or Police station on the map near you. Let me look for the nearest office that can point you to one.', 200);
          _aiReferralChain('legal', _aiCurrentLocation(), true);
          return;
        }
        _addBotBubble(
          (caseRef ? 'Your case' + refLabel + ' is saved. ' : '')
          + 'No lawyer is available right now, but you can take this to the nearest court or Police station. '
          + 'Go there and ask them for the nearest legal aid office or lawyer for your area. '
          + 'Would you like directions, or their contact details?',
          200
        );
        _aiEmergencyRenderMerged(results);
      }).catch(function () {
        _addBotBubble('I ran into a problem looking up courts and Police stations near you. Please try again.', 200);
      });
    }

    if (_aiState.userLat != null && _aiState.userLng != null) { runSearch(); return; }
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _addBotBubble('I need location access to find the nearest court and Police station. Please enable location access and try again.', 300);
      return;
    }
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        runSearch();
      },
      function () {
        _addBotBubble('I couldn\'t access your location. Please enable location access and try again.', 300);
      }
    );
  }

  window._aiStartLegalAidMatching = async function () {
    
    
    
    
    
    
    
    if (!(await _aiFetchFreshVerifStatus())) {
      _aiPromptVerificationRequired(_aiState.category || 'this');
      return;
    }

    var username = (typeof getLcdjpActiveUsername === 'function') ? getLcdjpActiveUsername() : (sessionStorage.getItem('lcdjp_username') || '');

    
    
    
    
    
    
    if (username) {
      try {
        var statusHeaders = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
        var statusResp = await fetch(API_ENDPOINTS.citizenLegalAidStatus(username, _aiState.category), { headers: statusHeaders });
        if (statusResp.ok) {
          var statusData = await statusResp.json();
          if (statusData && statusData.hasActiveCase) {
            _aiState._pendingOldCase = statusData; 
            _addBotBubble(
              'You have an open request, case <strong>' + _esc(statusData.case_reference) + '</strong>, that hasn\'t been picked up yet. '
              + 'Is this new report about that same issue, or a separate matter?',
              0
            );
            var choiceHtml = '<div class="ai-choices-row">'
                 + '<button class="ai-choice-btn" onclick="window._aiResumeOrStartNew(true)">Continue that case</button>'
                 + '<button class="ai-choice-btn" onclick="window._aiResumeOrStartNew(false)">File a new, separate case</button>'
                 + '</div>';
            _addWidget(choiceHtml, 200);
            return;
          }
        }
      } catch (e) {  }
    }

    _addBotBubble('I can help connect you with a lawyer registered on the system. Would you like me to do that?', 0);
    var html = '<div class="ai-choices-row">'
             + '<button class="ai-choice-btn" style="background:#e8f5e9; border-color:#2e7d32; color:#2e7d32;" onclick="window._aiLegalAidConsent(true)">Yes, connect me</button>'
             + '<button class="ai-choice-btn" style="background:#f5f5f5; border-color:#999; color:#555;" onclick="window._aiLegalAidConsent(false)">No thanks</button>'
             + '</div>';
    _addWidget(html, 200);
  };

  
  
  
  
  
  
  
  
  
  window._aiResumeOrStartNew = async function(continueOld) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();

    var statusData = _aiState._pendingOldCase;
    delete _aiState._pendingOldCase;

    if (continueOld && statusData) {
      _addUserBubble('Continue that case');
      _aiState.caseReference = statusData.case_reference;
      _aiState.category = statusData.case_type || _aiState.category;
      var declinedSoFar = (statusData.declined_lawyers || '').split(',').map(function(s){return s.trim();}).filter(Boolean);

      var _priorAdvice = (typeof aiEvaluatePreviousAdvice === 'function') ? aiEvaluatePreviousAdvice(statusData) : null;
      if (_priorAdvice) {
        _addBotBubble(
          (_priorAdvice.advisorRole || 'The previous handler') +
          (_priorAdvice.advisorName ? ' (' + _esc(_priorAdvice.advisorName) + ')' : '') +
          ' forwarded this case back with this note: &ldquo;' + _esc(_priorAdvice.adviceText) + '&rdquo;',
          0
        );
        _addBotBubble(
          _priorAdvice.agreesWithAdvice
            ? 'That matches what this case usually needs, so I\'ll search with that in mind.'
            : _priorAdvice.reasoning,
          250
        );
      }

      _addBotBubble('Continuing with case <strong>' + _esc(statusData.case_reference) + '</strong>. Let\'s find you another lawyer for it.', _priorAdvice ? 500 : 0);
      _aiShowLawyerList(statusData.district, statusData.case_reference, declinedSoFar);
      return;
    }

    _addUserBubble('File a new, separate case');
    _aiState.caseReference = null;
    _addBotBubble('Understood, I\'ll file this as a new, separate case. Would you like me to connect you with a lawyer for it?', 0);
    var html = '<div class="ai-choices-row">'
             + '<button class="ai-choice-btn" style="background:#e8f5e9; border-color:#2e7d32; color:#2e7d32;" onclick="window._aiLegalAidConsent(true)">Yes, connect me</button>'
             + '<button class="ai-choice-btn" style="background:#f5f5f5; border-color:#999; color:#555;" onclick="window._aiLegalAidConsent(false)">No thanks</button>'
             + '</div>';
    _addWidget(html, 200);
  };

  window._aiLegalAidConsent = async function(accepted) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble(accepted ? 'Yes, connect me' : 'No thanks');

    if (!accepted) {
      await _aiSuggestCourtAndPolice(null);
      return;
    }

    var regDistrict = sessionStorage.getItem('lcdjp_district') || '';
    _addBotBubble(
      'Which district should I search for a lawyer, your current location, or '
      + (regDistrict ? 'your registration district (<strong>' + _esc(regDistrict) + '</strong>)' : 'your registration district') + '?',
      200
    );
    var html = '<div class="ai-choices-row">'
             + '<button class="ai-choice-btn" onclick="window._aiPickDistrict(\'current\')"> Current location</button>'
             + '<button class="ai-choice-btn" onclick="window._aiPickDistrict(\'registration\')"> Registration district</button>'
             + '</div>';
    _addWidget(html, 300);
  };

  window._aiPickDistrict = async function(choice) {
    var area = _getChatArea();
    var choices = area ? area.querySelector('.ai-choices-row') : null;
    if (choices && choices.parentElement) choices.parentElement.remove();
    _addUserBubble(choice === 'current' ? 'Current location' : 'Registration district');

    var district = '';
    if (choice === 'registration') {
      district = sessionStorage.getItem('lcdjp_district') || '';
      if (!district) {
        _addBotBubble('I don\'t have a registration district on file for you, using your current location instead.', 200);
        choice = 'current';
      }
    }
    if (choice === 'current') {
      _addBotBubble('Finding your current district…', 200);
      district = await _aiResolveCurrentDistrict();
      if (!district) {
        _addBotBubble('I couldn\'t determine your current district. Please enable location access and try again.', 300);
        return;
      }
    }
    _aiFindAndOfferLawyers(district);
  };

  function _aiResolveCurrentDistrict() {
    return new Promise(function(resolve) {
      if (!navigator.geolocation && !window._lcdjpUserPosition) { resolve(null); return; }
      _aiGetCurrentPosition(
        function (position) {
          fetch(API_BASE_URL + '/api/map/reverse-geocode?lat=' + position.coords.latitude + '&lng=' + position.coords.longitude)
            .then(function (r) { return r.json(); })
            .then(function (data) { resolve(data && data.district ? data.district : null); })
            .catch(function () { resolve(null); });
        },
        function () { resolve(null); }
      );
    });
  }

  async function _aiFindAndOfferLawyers(district) {
    _addBotBubble('Filing your case and searching for lawyers in <strong>' + _esc(district) + '</strong>…', 200);
    var payload = _aiBuildCasePayload();
    payload.district = district;
    var caseResult = null;
    try {
      var headers = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(API_ENDPOINTS.aiCaseSubmit, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
      if (res.ok) caseResult = await res.json();
    } catch (e) {  }

    if (!caseResult || !caseResult.success) {
      _addBotBubble('We couldn\'t reach the case system just now. Please try again shortly.', 300);
      return;
    }
    _aiState.caseReference = caseResult.caseReference;
    
    
    if (typeof window._lcdjpRefreshCitizenCaseData === 'function') {
      window._lcdjpRefreshCitizenCaseData();
    }
    _aiShowLawyerList(district, caseResult.caseReference, []);
  }

  
  
  
  
  
  
  
  
  
  var _aiLawyerSearchHadError = false;

  async function _aiFetchLawyersDb(district, specialization) {
    try {
      var url = API_ENDPOINTS.lawyersSearch(district, specialization);
      var res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        console.warn('[AI Lawyer Search] /api/map/lawyers returned ' + res.status + ' (district=' + district + ', specialization=' + specialization + ')');
        _aiLawyerSearchHadError = true;
        return [];
      }
      var data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[AI Lawyer Search] /api/map/lawyers request failed:', e && e.message);
      _aiLawyerSearchHadError = true;
      return [];
    }
  }

  
  
  
  
  function _aiSameDistrict(a, b) {
    return !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  
  
  
  
  
  function _aiListHasDistrict(list, district) {
    if (!district) return false;
    return list.some(function (d) { return _aiSameDistrict(d, district); });
  }

  
  
  
  
  
  function _aiExcludeLawyers(lawyers, excludeUsernames) {
    if (!excludeUsernames || !excludeUsernames.length) return lawyers;
    return lawyers.filter(function (l) { return excludeUsernames.indexOf(l.username) === -1; });
  }

  async function _aiSearchLawyersTiered(district, caseType, excludeUsernames) {
    excludeUsernames = excludeUsernames || [];
    _aiLawyerSearchHadError = false;

    
    
    
    
    
    
    var normalizedDistrict = (district && typeof regFindDistrict === 'function')
      ? (regFindDistrict(district) || district)
      : district;

    var specialization = (typeof determineLawyerSpecialization === 'function')
      ? determineLawyerSpecialization(caseType) : null;

    
    if (normalizedDistrict) {
      var districtMatch = specialization ? await _aiFetchLawyersDb(normalizedDistrict, specialization) : [];
      var districtMatchAvail = _aiExcludeLawyers(districtMatch, excludeUsernames);
      if (districtMatchAvail.length) return { lawyers: districtMatchAvail, tier: 'district', district: normalizedDistrict };
      var districtAny = await _aiFetchLawyersDb(normalizedDistrict, null);
      var districtAnyAvail = _aiExcludeLawyers(districtAny, excludeUsernames);
      if (districtAnyAvail.length) return { lawyers: districtAnyAvail, tier: 'district', district: normalizedDistrict };
    }

    
    
    
    if (normalizedDistrict && typeof UGANDA_REGION_MAP === 'object') {
      var region = null;
      for (var r in UGANDA_REGION_MAP) {
        if (_aiListHasDistrict(UGANDA_REGION_MAP[r], normalizedDistrict)) { region = r; break; }
      }
      if (region) {
        var regionDistricts = UGANDA_REGION_MAP[region];
        var poolSpec = specialization ? await _aiFetchLawyersDb(null, specialization) : [];
        var regionMatchSpec = poolSpec.filter(function (l) {
          return _aiListHasDistrict(regionDistricts, l.district) && !_aiSameDistrict(l.district, normalizedDistrict);
        });
        var regionMatchSpecAvail = _aiExcludeLawyers(regionMatchSpec, excludeUsernames);
        if (regionMatchSpecAvail.length) return { lawyers: regionMatchSpecAvail, tier: 'region', region: region };

        var poolAny = await _aiFetchLawyersDb(null, null);
        var regionMatchAny = poolAny.filter(function (l) {
          return _aiListHasDistrict(regionDistricts, l.district) && !_aiSameDistrict(l.district, normalizedDistrict);
        });
        var regionMatchAnyAvail = _aiExcludeLawyers(regionMatchAny, excludeUsernames);
        if (regionMatchAnyAvail.length) return { lawyers: regionMatchAnyAvail, tier: 'region', region: region };
      }
    }

    
    var nationalSpec = specialization ? await _aiFetchLawyersDb(null, specialization) : [];
    var nationalSpecAvail = _aiExcludeLawyers(nationalSpec, excludeUsernames);
    if (nationalSpecAvail.length) return { lawyers: nationalSpecAvail, tier: 'national' };
    var nationalAny = await _aiFetchLawyersDb(null, null);
    var nationalAnyAvail = _aiExcludeLawyers(nationalAny, excludeUsernames);
    if (nationalAnyAvail.length) return { lawyers: nationalAnyAvail, tier: 'national' };

    return { lawyers: [], tier: 'none', hadError: _aiLawyerSearchHadError };
  }

  function _aiShowLawyerList(district, caseReference, excludeUsernames) {
    var caseType = (_aiState.answers && (_aiState.answers.category || _aiState.category)) || _aiState.category;
    _aiSearchLawyersTiered(district, caseType, excludeUsernames).then(async function (result) {
        var lawyers = result.lawyers || [];
        if (!lawyers.length) {
          if (result.hadError) {
            _addBotBubble('I ran into a problem reaching the lawyer directory just now. Please try again in a moment.', 200);
            return;
          }
          
          
          
          
          
          
          
          
          
          
          
          
          
          try {
            var routeHeaders = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
            var routeRes = await fetch(API_ENDPOINTS.aiCaseRoute(caseReference), {
              method: 'POST', headers: routeHeaders, body: JSON.stringify({ choice: 'legal_aid' })
            });
            var routeData = routeRes.ok ? await routeRes.json() : null;
            if (routeData && routeData.matched) {
              _addBotBubble('Good news, a lawyer just became available and your case (<strong>' + _esc(caseReference) + '</strong>) has been sent to them. You\'ll be notified as soon as they respond.', 200);
              return;
            }
          } catch (e) {  }
          _addBotBubble('There\'s no available lawyer for this case right now, anywhere in the system.', 200);
          _aiSuggestCourtAndPolice(caseReference);
          return;
        }
        
        
        
        lawyers.sort(function (a, b) {
          return (Number(a.active_count) || 0) - (Number(b.active_count) || 0);
        });
        _aiState.lawyerCandidates = lawyers;
        var effectiveDistrict = result.district || district;
        var areaLabel = result.tier === 'district' ? effectiveDistrict
          : result.tier === 'region' ? ('the ' + result.region + ' region')
          : 'the country';
        _addBotBubble(
          'Here ' + (lawyers.length === 1 ? 'is a lawyer' : 'are lawyers') + ' ' + (result.tier === 'district' ? 'in' : 'from') + ' <strong>' + _esc(areaLabel) + '</strong>'
          + (result.tier !== 'district' && effectiveDistrict ? (', none were available in <strong>' + _esc(effectiveDistrict) + '</strong> itself') : '')
          + '. Choose one to forward your case to:',
          200
        );
        var html = '<div class="ai-service-cards" style="padding-left:44px;">';
        lawyers.forEach(function (l, idx) {
          var name = ((l.first_name || l.firstName || '') + ' ' + (l.last_name || l.lastName || '')).trim() || l.username;
          var spec = l.lawyer_specialization || l.lawyerSpecialization || 'General Practice';
          var locLabel = l.district || '';
          html += '<div class="ai-contact-card">'
            + '<div class="ai-contact-icon" style="background:#e3f2fd;"></div>'
            + '<div style="flex:1; min-width:0;">'
            + '<div style="font-weight:700; font-size:14px; color:#1a1a2e;">' + _esc(name) + '</div>'
            + '<div style="font-size:12px; color:#666;"> ' + _esc(spec) + (locLabel ? ' &middot; ' + _esc(locLabel) : '') + '</div>'
            + '</div>'
            + '<button onclick="window._aiSelectLawyer(' + idx + ')" style="background:#1a4080; color:white; border:none; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;">Select</button>'
            + '</div>';
        });
        html += '</div>';
        _addWidget(html, 300);
      })
      .catch(function () {
        _addBotBubble('I ran into a problem searching for lawyers. Please try again.', 200);
      });
  }

  window._aiSelectLawyer = async function (idx) {
    var lawyer = _aiState.lawyerCandidates && _aiState.lawyerCandidates[idx];
    if (!lawyer || !_aiState.caseReference) return;
    var area = _getChatArea();
    var cards = area ? area.querySelector('.ai-service-cards') : null;
    if (cards && cards.parentElement) cards.parentElement.remove();
    var name = ((lawyer.first_name || lawyer.firstName || '') + ' ' + (lawyer.last_name || lawyer.lastName || '')).trim() || lawyer.username;
    _addUserBubble('Selected ' + name);

    try {
      var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(API_ENDPOINTS.offerCaseToLawyer(_aiState.caseReference, lawyer.username), {
        method: 'PUT', headers: headers
      });
      var data = await res.json();
      if (res.ok && data.success) {
        _addBotBubble(
          '<div style="background:#e8f5e9;border:1.5px solid #2e7d32;border-radius:12px;padding:14px 16px;">'
          + '<div style="font-size:13px;font-weight:700;color:#1b5e20;margin-bottom:6px;"> Case forwarded</div>'
          + '<div style="font-size:13px;color:#333;">Your case (<strong>' + _esc(_aiState.caseReference) + '</strong>) has been sent to <strong>' + _esc(name) + '</strong>. '
          + 'You\'ll be notified here as soon as they respond. If they\'re unable to take it, just reopen the Assistant and I\'ll help you pick someone else for the same case.</div>'
          + '</div>', 200
        );
      } else {
        _addBotBubble('That lawyer is no longer available (' + _esc(data.error || 'unknown error') + '). Please choose another from the list, or reopen the Assistant.', 200);
      }
    } catch (e) {
      _addBotBubble('Something went wrong sending your case. Please try again.', 200);
    }
  };

  

  
  
  
  function openFindMoreAssistance(caseReference, caseType, district) {
    if (!caseReference) return;
    _aiLockBodyScroll();
    _aiState = { step: 4, category: caseType || null, qIndex: 0, answers: {}, contactType: null,
      chatMode: true, assistantMode: 'more_help', mode: 'report', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [],
      caseReference: caseReference, lawyerCandidates: [] };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(4);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) input.value = '';
    _addBotBubble(
      'Let\'s find more help for your case <strong>' + _esc(caseReference) + '</strong>. Searching for available options...',
      0
    );
    setTimeout(function () { _aiShowLawyerList(district || null, caseReference, []); }, 1200);
  }
  window.openFindMoreAssistance = openFindMoreAssistance;





























  var _aiScrollLockY = 0;
  var _aiScrollLocked = false;
  function _aiLockBodyScroll() {
    if (_aiScrollLocked) return; 
    _aiScrollLocked = true;
    if (typeof window.lockScroll === 'function') window.lockScroll();
    _aiScrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = (-_aiScrollLockY) + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function _aiUnlockBodyScroll() {
    if (!_aiScrollLocked) return; 
    _aiScrollLocked = false;
    if (typeof window.unlockScroll === 'function') window.unlockScroll();
    if (window._lcdjpScrollLockCount > 0) return; 
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, _aiScrollLockY);
  }

  function openAIAssistant(preCategory, mode) {
    
    
    
    
    
    
    
    mode = mode || 'all';
    if (mode === 'report' && typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
      if (typeof showFeatureUnavailableMessage === 'function') {
        showFeatureUnavailableMessage('Reporting a case is not available at this time.');
      }
      return;
    }
    _aiLockBodyScroll();
    _aiState = { step: 0, category: preCategory || null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'incident', mode: mode, userLat: null, userLng: null, lcResults: [], policeResults: [], placeResults: [],
      caseReference: null, lawyerCandidates: [] };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      
      
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth; 
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) input.value = '';
    _aiState.chatMode = false;  
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    var catLabel = preCategory ? ' with a <strong>' + _esc(preCategory) + '</strong>' : '';
    var introRole = mode === 'report' ? 'Report Case Assistant' : 'Emergency Assistant';
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '! <br>'
      + 'I\'m your ' + introRole + '. I\'m here to help you' + catLabel + '.<br><br>'
      + '<span style="font-size:13px; color:#666;">For life-threatening emergencies, please call ' + _aiEmergencyInlinePlain() + ' immediately.</span>',
      0
    );
    
    
    
    
    
    
    
    
    if (mode === 'report' && _aiIsKnownOutsideUganda()) {
      setTimeout(function() { _aiBlockReportCaseOutsideUganda(null); }, 1800);
      return;
    }
    if (mode === 'report' && !preCategory && !_aiIsCitizenVerified() && !_lawyerRoleAllowed()) {
      setTimeout(function() { _setStep(1); _aiPromptVerificationRequired(null); }, 1800);
      return;
    }
    if (preCategory) {
      
      setTimeout(function() { window._aiSelectCat(preCategory); }, 1800);
    } else {
      setTimeout(function() { _showCategories(mode); }, 1800);
    }
  }
  window.openAIAssistant = openAIAssistant;

  
  
  
  
  window.openEmergencyAssistant = function(preCategory) { openAIAssistant(preCategory, 'emergency'); };
  window.openReportCaseAssistant = function(preCategory) { openAIAssistant(preCategory, 'report'); };

  









  function openLegalHelpAssistant() {
    _aiLockBodyScroll();
    _aiState = { step: 4, category: 'Legal Help', qIndex: 0, answers: {}, contactType: null,
      chatMode: true, assistantMode: 'legal_help', userLat: null, userLng: null, lcResults: [], policeResults: [], placeResults: [],
      caseReference: null, lawyerCandidates: [] };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(4);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Ask a legal question...'; }
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '! <br>'
      + 'I\'m your Legal Help Assistant. Ask me any general legal question, your rights, legal processes, '
      + 'documents you need, or how to get legal aid.<br><br>'
      + '<span style="font-size:13px; color:#666;">I can\'t take crime reports or emergency details here, for those, '
      + 'please use <strong>Report Case</strong>, or call ' + _aiEmergencyInlinePlain() + ' for a life-threatening emergency.</span>',
      0
    );
  }
  window.openLegalHelpAssistant = openLegalHelpAssistant;

  



















  var LEGAL_AID_DISCLAIMER = 'Legal Aid provides general legal information and guidance. It does not replace advice or representation from a qualified lawyer or legal professional. For matters requiring professional legal assistance, you can use JusticeLink to find appropriate help.';

  var _legalAidRightsCategories = [
    'Police and Arrest', 'Criminal Matters', 'Land and Property', 'Employment',
    'Family and Marriage', 'Domestic Violence', 'Child Protection', 'Contracts',
    'Debt and Financial Disputes', 'Consumer Complaints', 'Human Rights', 'Local Council Matters'
  ];

  var _legalAidComplaintQuestions = [
    { key: 'what', text: 'What happened? Please describe the incident briefly.' },
    { key: 'when', text: 'When did it happen?' },
    { key: 'where', text: 'Where did it happen?' },
    { key: 'who', text: 'Who was involved?' },
    { key: 'affected', text: 'Who was affected?' },
    { key: 'witnesses', text: 'Were there any witnesses? If so, who? (or type "none")' },
    { key: 'evidence', text: 'Do you have any documents or evidence? Briefly describe them (or type "none").' },
    { key: 'reportedBefore', text: 'Have you already reported this matter to anyone (e.g. police, an LC office)?' },
    { key: 'outcome', text: 'What outcome are you seeking?' }
  ];

  
  
  
  
  var _legalAidEmergencyPatterns = [
    /attack(ing|ed)? me/i, /being attacked/i, /he'?s attacking/i, /she'?s attacking/i,
    /trying to kill/i, /has a (gun|knife|weapon)/i, /pointing a (gun|knife)/i,
    /immediate danger/i, /right now.*(help|danger|attack)/i, /(fire|burning) (in|at) my/i,
    /house is on fire/i, /not breathing/i, /unconscious/i, /heart attack/i,
    /bleeding (badly|heavily|a lot)/i, /overdose/i, /going to (kill|hurt) (myself|herself|himself)/i,
    /missing (child|kid|daughter|son)\b.*(now|today|hours? ago)/i, /kidnap/i
  ];

  function _legalAidCheckEmergency(text) {
    return _legalAidEmergencyPatterns.some(function (re) { return re.test(text); });
  }

  function _legalAidShowEmergencyRedirect() {
    _addBotBubble(
      '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:15px;font-weight:700;color:#c62828;margin-bottom:10px;"> This sounds urgent</div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
      + _aiEmergencyButtonsHtml('large')
      + '</div>'
      + '<div style="font-size:13px;color:#555;">Legal Aid is for general legal information, not emergencies. Please use <strong>Report Case</strong> now so this can be routed for immediate help.</div>'
      + '</div>', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#c62828;border-color:#c62828;color:white;" onclick="window._legalAidGoToReportCase()"> Report This Case Now</button>'
      + '</div>';
    _addWidget(html, 200);
  }

  window._legalAidGoToReportCase = function () {
    _addUserBubble('Report This Case Now');
    
    
    
    
    if (typeof openEmergencyAssistant === 'function') openEmergencyAssistant();
    else if (typeof openAIAssistant === 'function') openAIAssistant(undefined, 'emergency');
  };

  function _legalAidFormatReply(reply) {
    var text = _esc(reply || '');
    
    
    ['WHAT THIS MEANS', 'YOUR POSSIBLE OPTIONS', 'WHAT YOU MAY NEED', 'WHAT TO DO NEXT', 'WHEN TO SEEK PROFESSIONAL HELP'].forEach(function (h) {
      text = text.replace(new RegExp(h, 'g'), '<strong>' + h + '</strong>');
    });
    return text.replace(/\n/g, '<br>');
  }

  var _legalAidResponseStyle = 'Format your answer using these section headers where relevant (skip a header if it does not apply): '
    + 'WHAT THIS MEANS / YOUR POSSIBLE OPTIONS / WHAT YOU MAY NEED / WHAT TO DO NEXT / WHEN TO SEEK PROFESSIONAL HELP. '
    + 'Avoid unnecessary legal jargon. Keep it concise and in plain, easy-to-understand language. '
    + 'Never claim to be a lawyer and never state legal outcomes with false certainty. '
    + 'If the answer genuinely depends on facts you do not have, ask a brief follow-up question instead of guessing.';

  
  
  
  function _legalAidShowFollowupActions() {
    
    
    
    
    var hasOpenCase = !!_aiState.caseReference;
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + (hasOpenCase
          ? '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._aiLegalAidResumeFromHub()"> Find Me A Lawyer</button>'
          : '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._legalAidReportThisCase()"> Report This Case</button>')
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._legalAidFindHelp()"> Find Legal Help</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  
  
  
  
  
  async function _aiFetchLegalAidCaseStatus(username) {
    if (!username) return null;
    try {
      var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
      var resp = await fetch(API_ENDPOINTS.citizenLegalAidStatus(username), { headers: headers });
      if (!resp.ok) return null;
      var data = await resp.json();
      return (data && data.hasActiveCase) ? data : null;
    } catch (e) { return null; }
  }

  
  
  window._aiLegalAidResumeFromHub = function () {
    _addUserBubble('Find Me A Lawyer');
    _aiStartLegalAidMatching();
  };

  async function openLegalAidHub(startMode) {
    _aiLockBodyScroll();
    _aiState = {
      step: 0, category: null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'legal_aid_menu', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [], caseReference: null, lawyerCandidates: [],
      legalAid: { complaintIndex: 0 }
    };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Describe your legal problem...'; }
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '! I\'m <strong>Legal Aid</strong>.<br>'
      + '<span style="font-size:12px;color:#666;">' + LEGAL_AID_DISCLAIMER + '</span>',
      0
    );
    if (startMode === 'rights') {
      setTimeout(function () { window._legalAidSelect('rights'); }, 1400);
      return;
    }

    
    
    
    var existingCaseStatus = await _aiFetchLegalAidCaseStatus(uname);
    var menuDelay = 1400, hintDelay = 1900;
    if (existingCaseStatus) {
      _aiState.caseReference = existingCaseStatus.case_reference;
      menuDelay = 3600; hintDelay = 4100;
      setTimeout(function () {
        _addBotBubble(
          'You already have an open case, <strong>' + _esc(existingCaseStatus.case_reference) + '</strong>, that hasn\'t been picked up by a lawyer yet. '
          + 'Would you like me to look for one now?',
          1400
        );
        var html = '<div class="ai-choices-row">'
          + '<button class="ai-choice-btn" style="background:#e8f5e9; border-color:#2e7d32; color:#2e7d32;" onclick="window._aiLegalAidResumeFromHub()"> Find Me A Lawyer</button>'
          + '</div>';
        _addWidget(html, 1600);
      }, 1400);
    }
    setTimeout(function () { _showLegalAidMenu(); }, menuDelay);
    setTimeout(function () {
      _addBotBubble('Pick an option below, or just describe your legal problem in your own words below, for example, "My landlord has refused to return my deposit. What can I do?"', 0);
    }, hintDelay);
  }
  window.openLegalAidHub = openLegalAidHub;

  function _showLegalAidMenu() {
    var opts = [
      { label: 'Ask for Legal Guidance', key: 'guidance' },
      { label: 'Know Your Rights', key: 'rights' },
      { label: 'Explain a Legal Document', key: 'document' },
      { label: 'Prepare a Complaint', key: 'complaint' },
      { label: 'Find Legal Help', key: 'findHelp' },
      { label: 'Understand My Case', key: 'myCase' },
      { label: 'Legal Terms', key: 'terms' }
    ];
    var html = '<div id="aiCategoryGrid">';
    opts.forEach(function (o) {
      html += '<button class="ai-cat-btn" onclick="window._legalAidSelect(\'' + o.key + '\')">' + _esc(o.label) + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  window._legalAidSelect = function (key) {
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();

    if (key === 'guidance') return _legalAidStartGuidance();
    if (key === 'rights') return _legalAidShowRightsCategories();
    if (key === 'document') return _legalAidStartDocument();
    if (key === 'complaint') return _legalAidStartComplaint();
    if (key === 'findHelp') return window._legalAidFindHelp();
    if (key === 'myCase') return _legalAidStartMyCase();
    if (key === 'terms') return _legalAidStartTerms();
  };

  
  function _legalAidStartGuidance() {
    _addUserBubble('Ask for Legal Guidance');
    _aiState.assistantMode = 'legal_aid_guidance';
    _aiState.chatMode = true;
    _aiState.category = 'Legal Aid Guidance';
    _aiState.answers = {};
    _setStep(2);
    _addBotBubble('Go ahead and describe your legal problem, for example, "What are my rights if I am arrested?" or "My landlord is refusing to return my deposit."', 0);
    var input = document.getElementById('aiTextInput');
    if (input) input.focus();
  }

  
  
  
  
  window._legalAidReportThisCase = function () {
    _addUserBubble('Report This Case');
    var transcriptEl = _getChatArea();
    var userLines = [];
    if (transcriptEl) {
      transcriptEl.querySelectorAll('.ai-bubble-wrap.user .ai-bubble.user').forEach(function (b) {
        if (b.textContent) userLines.push(b.textContent.trim());
      });
    }
    _aiState.category = _aiState.category || 'Legal Aid';
    _aiState.answers = { issue: userLines[0] || '', details: userLines.join(' | ') };
    _addBotBubble('Thanks, I\'ll carry this into Report Case so you can review the details and submit when ready.', 200);
    setTimeout(function () { _aiCollectCaseDetails(); }, 1200);
  };

  
  function _legalAidShowRightsCategories() {
    _addUserBubble('Know Your Rights');
    _aiState.assistantMode = 'legal_aid_rights';
    _aiState.category = 'Know Your Rights';
    _setStep(2);
    _addBotBubble('Which area would you like to know about?', 0);
    var html = '<div id="aiCategoryGrid">';
    _legalAidRightsCategories.forEach(function (c) {
      html += '<button class="ai-cat-btn" onclick="window._legalAidSelectRightsCategory(\'' + c.replace(/'/g, "\\'") + '\')">' + _esc(c) + '</button>';
    });
    html += '</div>';
    _addWidget(html, 200);
  }

  window._legalAidSelectRightsCategory = function (category) {
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    _addUserBubble(category);
    _aiState.chatMode = true;
    _aiState.answers = { category: category };
    var typingId = 'ai-typing-' + Date.now();
    var area2 = _getChatArea();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area2) { area2.appendChild(typingWrap); _scrollBottom(); }

    var sysCtx = 'You are the "Know Your Rights" section of Legal Aid, a legal information assistant for LCDJP, a Ugandan digital justice platform. '
      + 'The citizen selected the category "' + category + '". Explain, for this category: basic rights, common procedures, possible next steps, '
      + 'documents or evidence that may be useful, which authority typically handles this (e.g. police, LC office, courts), and when professional legal '
      + 'assistance may be necessary. ' + _legalAidResponseStyle;

    _callHuggingFaceBackend('Tell me about my rights regarding: ' + category, sysCtx).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (reply) {
        _addBotBubble(_legalAidFormatReply(reply), 0);
      } else {
        _addBotBubble('I\'m having trouble reaching the legal information service right now. Please try again shortly, or contact a local legal aid provider directly.', 0);
      }
      _legalAidShowFollowupActions();
      _addBotBubble('You can ask a follow-up question about "' + _esc(category) + '" below, or pick another right/topic.', 600);
    });
  };

  
  function _legalAidStartDocument() {
    _addUserBubble('Explain a Legal Document');
    _aiState.assistantMode = 'legal_aid_document';
    _aiState.category = 'Explain a Legal Document';
    _setStep(2);
    _addBotBubble(
      'You can upload a plain text (.txt) file, or simply paste/type the text of the document below, and I\'ll help explain it. '
      + '<span style="font-size:12px;color:#666;">I only read the file to answer your question, it is not stored.</span>', 0
    );
    var html = '<div style="padding-left:44px;">'
      + '<input id="legalAidDocFile" type="file" accept=".txt,text/plain" style="font-size:13px;">'
      + '</div>';
    _addWidget(html, 300);
    setTimeout(function () {
      var fileEl = document.getElementById('legalAidDocFile');
      if (fileEl) {
        fileEl.onchange = function () {
          var file = fileEl.files && fileEl.files[0];
          if (!file) return;
          if (!/\.txt$|^text\/plain$/i.test(file.type) && !/\.txt$/i.test(file.name)) {
            _addBotBubble('I can only read plain .txt files directly right now. Please paste the document\'s text into the message box instead.', 0);
            return;
          }
          var reader = new FileReader();
          reader.onload = function (e) { _legalAidExplainDocumentText(e.target.result, file.name); };
          reader.onerror = function () { _addBotBubble('I couldn\'t read that file. Please try pasting the text instead.', 0); };
          reader.readAsText(file);
        };
      }
    }, 350);
    _aiState.chatMode = true;
    _aiState.assistantMode = 'legal_aid_document_paste';
  }

  function _legalAidExplainDocumentText(text, fileName) {
    _addUserBubble('Uploaded: ' + fileName);
    _legalAidExplainDocumentCommon(text);
  }

  function _legalAidExplainDocumentCommon(text) {
    var typingId = 'ai-typing-' + Date.now();
    var area = _getChatArea();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }

    var sysCtx = 'You are the "Explain a Legal Document" tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
      + 'The citizen has provided the text of a document below. Explain: what type of document it appears to be, its important sections, '
      + 'any important dates or deadlines, apparent obligations, important clauses, and things the citizen may need to clarify with a lawyer. '
      + 'This is general information only, not a legally binding interpretation, say so plainly. ' + _legalAidResponseStyle
      + '\n\nDOCUMENT TEXT:\n' + String(text).slice(0, 6000);

    _callHuggingFaceBackend('Please explain this document.', sysCtx).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (reply) {
        _addBotBubble(_legalAidFormatReply(reply) + '<br><br><span style="font-size:11px;color:#888;">' + LEGAL_AID_DISCLAIMER + '</span>', 0);
      } else {
        _addBotBubble('I\'m having trouble reaching the legal information service right now. Please try again shortly.', 0);
      }
      _legalAidShowFollowupActions();
    });
  }

  
  function _legalAidStartComplaint() {
    _addUserBubble('Prepare a Complaint');
    _aiState.assistantMode = 'legal_aid_complaint';
    _aiState.category = 'Legal Aid Complaint';
    _aiState.chatMode = false;
    _aiState.legalAid = { complaintIndex: 0, complaintAnswers: {} };
    _setStep(2);
    _addBotBubble('I\'ll ask a few questions to help you prepare a complaint. You\'ll be able to review and edit everything before anything is submitted.', 0);
    setTimeout(_legalAidAskComplaintQ, 1200);
  }

  function _legalAidAskComplaintQ() {
    var idx = _aiState.legalAid.complaintIndex;
    if (idx >= _legalAidComplaintQuestions.length) return _legalAidShowComplaintSummary();
    _addBotBubble(_legalAidComplaintQuestions[idx].text, 0);
    var input = document.getElementById('aiTextInput');
    if (input) { input.placeholder = 'Type your answer...'; input.focus(); }
  }

  window._legalAidAnswerComplaintQ = function (text) {
    var idx = _aiState.legalAid.complaintIndex;
    var q = _legalAidComplaintQuestions[idx];
    _addUserBubble(text);
    _aiState.legalAid.complaintAnswers[q.key] = text;
    _aiState.legalAid.complaintIndex++;
    setTimeout(_legalAidAskComplaintQ, 500);
  };

  function _legalAidShowComplaintSummary() {
    var a = _aiState.legalAid.complaintAnswers;
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    var today = new Date().toLocaleDateString();
    var draft = 'COMPLAINT SUMMARY\n\n'
      + 'Complainant: ' + (uname || '') + '\n'
      + 'Date: ' + today + '\n'
      + 'Location: ' + (a.where || '') + '\n'
      + 'Person/Organisation involved: ' + (a.who || '') + '\n'
      + 'Description of incident: ' + (a.what || '') + (a.when ? (' (When: ' + a.when + ')') : '') + '\n'
      + 'Affected: ' + (a.affected || '') + '\n'
      + 'Evidence available: ' + (a.evidence || '') + '\n'
      + 'Witnesses: ' + (a.witnesses || '') + '\n'
      + 'Previously reported: ' + (a.reportedBefore || '') + '\n'
      + 'Requested action: ' + (a.outcome || '');
    _addBotBubble('Here\'s a draft based on what you told me. Please review it below and edit anything that isn\'t right before continuing.', 0);
    var html = '<div style="padding-left:44px;max-width:460px;">'
      + '<textarea id="legalAidComplaintDraft" style="width:100%;min-height:220px;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:12.5px;font-family:monospace;box-sizing:border-box;">' + _esc(draft) + '</textarea>'
      + '<div style="display:flex;gap:8px;margin-top:8px;">'
      + '<button class="ai-choice-btn" style="background:#1a4080;color:white;border-color:#1a4080;" onclick="window._legalAidConfirmComplaint()"> Report This Case</button>'
      + '<button class="ai-choice-btn" onclick="window._legalAidFindHelp()"> Find Legal Help Instead</button>'
      + '</div></div>';
    _addWidget(html, 300);
  }

  window._legalAidConfirmComplaint = function () {
    var draftEl = document.getElementById('legalAidComplaintDraft');
    var edited = draftEl ? draftEl.value : '';
    var a = _aiState.legalAid.complaintAnswers || {};
    var area = _getChatArea();
    var box = area ? area.querySelector('#legalAidComplaintDraft') : null;
    if (box && box.closest('div') && box.parentElement.parentElement) box.parentElement.parentElement.remove();
    _addUserBubble('Report This Case');

    
    
    
    
    _aiState.category = 'Legal Aid Complaint';
    _aiState.answers = {
      what: a.what || '', where: a.where || '', when: a.when || '',
      who: a.who || '', affected: a.affected || '', witnesses: a.witnesses || '',
      evidence: a.evidence || '', reportedBefore: a.reportedBefore || '',
      outcome: a.outcome || '', complaintDraft: edited
    };
    _addBotBubble('Thanks, I\'ll carry these details into Report Case so you can finish reviewing and submit when ready.', 200);
    setTimeout(function () { _aiCollectCaseDetails(); }, 1200);
  };

  
  
  
  
  
  window._lcdjpShowLegalAidOnMap = function () {
    if (typeof closeAIAssistant === 'function') closeAIAssistant();
    var section = document.getElementById('cmMobileMapSection');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () {
      var chip = section.querySelector('.cm-map-chip[onclick*="legalAid"]');
      if (chip && typeof window.cmMapFilter === 'function') {
        window.cmMapFilter({ currentTarget: chip }, 'legalAid');
      }
    }, 350);
  };

  
  window._legalAidFindHelp = function () {
    _addUserBubble('Find Legal Help');
    _aiState.assistantMode = 'legal_aid_findhelp';
    _aiState.category = 'Find Legal Help';
    _aiState.chatMode = true;
    _addBotBubble('One moment, looking for legal organisations near you...', 0);
    
    
    _aiSuggestLegalOrg(null);
    setTimeout(function () {
      var html2 = '<div class="ai-choices-row">'
        + '<button class="ai-choice-btn" onclick="window._lcdjpShowLegalAidOnMap()"> View All On Map</button>'
        + '</div>';
      _addWidget(html2, 100);
    }, 1200);
    setTimeout(function () {
      _addBotBubble('While you wait, you can also type a legal question below and I\'ll answer it from our Legal Knowledge library.', 0);
      var input = document.getElementById('aiTextInput');
      if (input) { input.placeholder = 'Type your legal question...'; input.focus(); }
    }, 1700);
  };

  
  async function _legalAidStartMyCase() {
    _addUserBubble('Understand My Case');
    _aiState.assistantMode = 'legal_aid_mycase';
    _setStep(2);
    var username = (typeof getLcdjpActiveUsername === 'function') ? getLcdjpActiveUsername() : (sessionStorage.getItem('lcdjp_username') || '');
    if (!username || typeof API_ENDPOINTS === 'undefined' || typeof API_ENDPOINTS.citizenCases !== 'function') {
      _addBotBubble('Please sign in to view your case information.', 0);
      return;
    }
    _addBotBubble('One moment, pulling up your case information...', 0);
    try {
      var res = await fetch(API_ENDPOINTS.citizenCases(username), { headers: getAuthHeaders() });
      var data = res.ok ? await res.json() : null;
      var cases = data && data.success && Array.isArray(data.cases) ? data.cases : (Array.isArray(data) ? data : []);
      if (!cases.length) {
        _addBotBubble('You don\'t currently have any cases on file. If you\'d like, I can help you report one.', 400);
        _legalAidShowFollowupActions();
        return;
      }
      if (cases.length === 1) {
        _legalAidExplainCase(cases[0]);
        return;
      }
      var html = '<div style="padding-left:44px;display:flex;flex-direction:column;gap:6px;max-width:400px;">';
      cases.forEach(function (c, i) {
        var ref = c.caseReference || c.caseNumber || c.id || ('Case ' + (i + 1));
        var type = c.case_type || c.caseType || '';
        html += '<button class="ai-choice-btn" style="text-align:left;" onclick=\'window._legalAidPickCase(' + i + ')\'>' + _esc(String(ref)) + (type ? ', ' + _esc(type) : '') + '</button>';
      });
      html += '</div>';
      _aiState._legalAidCases = cases;
      _addBotBubble('You have a few cases on file. Which one would you like me to explain?', 300);
      _addWidget(html, 400);
    } catch (e) {
      _addBotBubble('I couldn\'t load your case information right now. Please try again shortly, or use My Cases to view it directly.', 400);
    }
  }

  window._legalAidPickCase = function (idx) {
    var c = (_aiState._legalAidCases || [])[idx];
    if (!c) return;
    var ref = c.caseReference || c.caseNumber || c.id || '';
    _addUserBubble(String(ref));
    _legalAidExplainCase(c);
  };

  async function _legalAidExplainCase(c) {
    var typingId = 'ai-typing-' + Date.now();
    var area = _getChatArea();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }

    
    
    
    var caseData = {
      reference: c.caseReference || c.caseNumber || c.id || '',
      type: c.case_type || c.caseType || '',
      status: c.status || c.caseStatus || '',
      stage: c.stage || c.currentStage || '',
      district: c.district || '', description: c.description || '',
      dateSubmitted: c.dateSubmitted || c.createdAt || c.date || '',
      pendingActions: c.pendingActions || c.requestedDocuments || '',
      legalAdvice: c.legal_advice || c.legalAdvice || ''
    };
    var sysCtx = 'You are the "Understand My Case" tool inside Legal Aid, for LCDJP, a Ugandan digital justice platform. '
      + 'Below is the ONLY information available about this citizen\'s case. Explain, in plain language: the current status, what the current '
      + 'stage means, any pending actions or documents needed, and what the citizen may need to do next. '
      + 'You must NOT invent or guess any case status, date, decision, document, official, or outcome that is not present below, if something '
      + 'is not present, say it is not currently on record instead of guessing. ' + _legalAidResponseStyle
      + '\n\nCASE DATA (JSON, authoritative and complete for this case):\n' + JSON.stringify(caseData);

    _callHuggingFaceBackend('Please explain my case.', sysCtx).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (reply) {
        _addBotBubble(_legalAidFormatReply(reply), 0);
      } else {
        _addBotBubble('Status: ' + _esc(caseData.status || 'not currently on record') + '. Stage: ' + _esc(caseData.stage || 'not currently on record') + '. For full details, please use My Cases.', 0);
      }
      _aiState.chatMode = true;
      _aiState.assistantMode = 'legal_aid_mycase_chat';
      _addBotBubble('You can ask me a follow-up question about this case below.', 500);
    });
  }

  
  function _legalAidStartTerms() {
    _addUserBubble('Legal Terms');
    _aiState.assistantMode = 'legal_aid_terms';
    _aiState.category = 'Legal Terms';
    _aiState.chatMode = true;
    _setStep(2);
    _addBotBubble('Ask me what any legal term means, for example "What does bail mean?" or "What is an affidavit?"', 0);
    var examples = ['Bail', 'Mediation', 'Summons', 'Affidavit', 'Statement'];
    var html = '<div class="ai-choices-row">' + examples.map(function (t) {
      return '<button class="ai-choice-btn" onclick="window._legalAidAskTerm(\'' + t + '\')">' + t + '</button>';
    }).join('') + '</div>';
    _addWidget(html, 300);
  }

  window._legalAidAskTerm = function (term) {
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = 'What does ' + term.toLowerCase() + ' mean?'; }
    aiSendMessage();
  };

  




















  var _findHelpCategories = [
    { key: 'courts',       label: 'Courts & Tribunals',                desc: 'Find the appropriate court or tribunal and learn where to access it.' },
    { key: 'localCouncil', label: 'Local Council Services',             desc: 'Find the relevant local council office or service.' },
    { key: 'government',   label: 'Government Services',                desc: 'Find the government office or department responsible for a service.' },
    { key: 'mediation',    label: 'Mediation & Dispute Resolution',     desc: 'Find appropriate mediation or dispute-resolution services.' },
    { key: 'community',    label: 'Community & Support Organizations',  desc: 'Find relevant community organizations and support services.' },
    { key: 'justicelink',  label: 'JusticeLink Services',               desc: 'Find a JusticeLink office, service point, or available JusticeLink service.' },
    { key: 'notSure',      label: 'Not Sure Where to Go?',              desc: 'Describe your situation and let JusticeLink help identify the right place to go.' }
  ];

  function openFindHelpHub() {
    _aiLockBodyScroll();
    _aiState = { step: 0, category: null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'find_help_menu', mode: 'find_help', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [], caseReference: null, lawyerCandidates: [] };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Describe what you need help with...'; }
    var uname = sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '. I\'m <strong>JusticeLink Find Help</strong>.',
      0
    );
    _addBotBubble(
      'I can help you identify the right service, office, institution, or organization to contact. Choose an option below, or describe what you need help with in your own words.',
      600
    );
    setTimeout(function () { _showFindHelpMenu(); }, 1800);
  }
  window.openFindHelpHub = openFindHelpHub;

  function _showFindHelpMenu() {
    _aiState.assistantMode = 'find_help_menu';
    _aiState.chatMode = false;
    var html = '<div id="aiCategoryGrid">';
    _findHelpCategories.forEach(function (c) {
      html += '<button class="ai-cat-btn" title="' + _esc(c.desc) + '" onclick="window._findHelpSelect(\'' + c.key + '\')">'
        + '<span class="ai-cat-icon">' + '</span>' + _esc(c.label) + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  window._findHelpSelect = function (key) {
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    var cat = _findHelpCategories.filter(function (c) { return c.key === key; })[0];
    if (!cat) return;
    _addUserBubble(cat.label);
    _aiState.category = cat.label;
    if (key === 'courts')       return _findHelpLocationLookup('court', 'Courts & Tribunals', 'court or tribunal');
    if (key === 'localCouncil') return _findHelpLocationLookup('lc', 'Local Council Services', 'local council office');
    if (key === 'community')    return _findHelpLocationLookup('community', 'Community & Support Organizations', 'community or support organization');
    if (key === 'mediation')    return _findHelpMediation();
    if (key === 'justicelink')  return _findHelpJusticeLinkServices();
    if (key === 'government')   return _findHelpStartGovernment();
    if (key === 'notSure')      return _findHelpStartNavigator();
  };

  
  
  
  
  
  
  
  
  function _findHelpLocationLookup(type, categoryLabel, serviceNoun) {
    _aiState.assistantMode = 'find_help_location';
    _aiState.chatMode = false;
    _setStep(2);
    if (!navigator.geolocation && !window._lcdjpUserPosition) {
      _findHelpNoLocation(type, categoryLabel, serviceNoun);
      return;
    }
    _addBotBubble('One moment, looking for a nearby verified ' + serviceNoun + '...', 0);
    _aiGetCurrentPosition(
      function (position) {
        _aiSetUserPosition(position.coords.latitude, position.coords.longitude);
        _findHelpRunSearch(type, categoryLabel, serviceNoun);
      },
      function () { _findHelpNoLocation(type, categoryLabel, serviceNoun); }
    );
  }

  function _findHelpNoLocation(type, categoryLabel, serviceNoun) {
    _addBotBubble(
      'I need your location to find a nearby ' + serviceNoun + '. You can enable location access, or set your location on the map.',
      300
    );
    var esc = function (s) { return _esc(s).replace(/'/g, "\\'"); };
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" onclick="window._findHelpOpenMapPicker(\'' + type + '\',\'' + esc(categoryLabel) + '\',\'' + esc(serviceNoun) + '\')"> Set My Location</button>'
      + '<button class="ai-choice-btn" onclick="window._findHelpRetryLocation(\'' + type + '\',\'' + esc(categoryLabel) + '\',\'' + esc(serviceNoun) + '\')"> Try Again</button>'
      + '</div>';
    _addWidget(html, 400);
  }

  window._findHelpOpenMapPicker = function (type, categoryLabel, serviceNoun) {
    if (typeof openMapPicker === 'function') openMapPicker();
  };

  window._findHelpRetryLocation = function (type, categoryLabel, serviceNoun) {
    _addUserBubble('Try Again');
    _findHelpLocationLookup(type, categoryLabel, serviceNoun);
  };

  function _findHelpRunSearch(type, categoryLabel, serviceNoun) {
    var placeQueries = _aiContactPlaceQueries[type] || [];
    _aiEmergencyFetchLiveMap(placeQueries, 25000).then(function (places) {
      var results = places.map(function (p) { return _aiPlaceToDirectoryEntity(p, type); }).sort(_aiDistanceSort);
      if (type === 'lc') { _aiState.lcResults = results; } else { _aiState.placeResults = results; }
      if (!results.length) {
        _findHelpNoResults(serviceNoun);
        return;
      }
      _addBotBubble(
        'Here ' + (results.length === 1 ? 'is the nearest verified ' + serviceNoun : 'are the nearest verified ' + serviceNoun + 's')
        + ' I could find. Tap Contact or Directions below.', 200
      );
      _aiEmergencyRenderMerged(results);
      setTimeout(function () { _findHelpShowMoreActions(); }, 1700);
    }).catch(function () {
      _addBotBubble('I ran into a problem looking that up. Please try again shortly.', 200);
      _findHelpShowMoreActions();
    });
  }

  function _findHelpNoResults(serviceNoun) {
    _addBotBubble(
      'I could not find a verified ' + serviceNoun + ' matching your request in the available JusticeLink directory. '
      + 'You can try another location, or describe your situation so I can help identify the appropriate service category.',
      200
    );
    _findHelpShowMoreActions();
  }

  function _findHelpShowMoreActions() {
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpBackToMenu()"> Back to Find Help</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  window._findHelpBackToMenu = function () {
    _addUserBubble('Back to Find Help');
    _addBotBubble('Sure, what else can I help you find?', 0);
    setTimeout(function () { _showFindHelpMenu(); }, 900);
  };

  
  
  
  
  window._findHelpOpenFeature = function (which) {
    var labels = { legalAid: 'Open Legal Aid', report: 'Report a Case', emergency: 'Open Emergency Assistance' };
    _addUserBubble(labels[which] || which);
    if (which === 'legalAid' && typeof openLegalAidHub === 'function') { openLegalAidHub(); return; }
    if (which === 'report' && typeof openReportCaseAssistant === 'function') { openReportCaseAssistant(); return; }
    if (which === 'emergency' && typeof openEmergencyAssistant === 'function') { openEmergencyAssistant(); return; }
  };

  function _findHelpShowEmergencyRedirect() {
    _addBotBubble(
      '<div style="background:#fce4ec;border:1.5px solid #e53935;border-radius:12px;padding:14px 16px;">'
      + '<div style="font-size:15px;font-weight:700;color:#c62828;margin-bottom:10px;"> This sounds urgent</div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
      + _aiEmergencyButtonsHtml('large')
      + '</div>'
      + '<div style="font-size:13px;color:#555;">Find Help is for locating the right service, not emergencies. Please use <strong>Emergency Assistance</strong> now.</div>'
      + '</div>', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" style="background:#c62828;border-color:#c62828;color:white;" onclick="window._findHelpOpenFeature(\'emergency\')"> Open Emergency Assistance</button>'
      + '</div>';
    _addWidget(html, 200);
  }

  
  
  
  
  
  
  
  
  
  function _findHelpMediation() {
    _aiState.assistantMode = 'find_help_mediation';
    _aiState.chatMode = true;
    _aiState.category = 'Mediation & Dispute Resolution';
    _setStep(2);
    _addBotBubble(
      'Local Council (LC) offices commonly handle mediation for community, boundary, and family-related disputes, and independent mediation '
      + 'centers are also available. You can ask me how mediation works, or just pick which one you\'re looking for below.', 0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" onclick="window._findHelpMediationLC()"> Local Council (LC) Mediation</button>'
      + '<button class="ai-choice-btn" onclick="window._findHelpMediationCenter()"> Independent Mediation Center</button>'
      + '</div>';
    _addWidget(html, 300);
    var input = document.getElementById('aiTextInput');
    if (input) { input.placeholder = 'Or ask a question about mediation...'; input.focus(); }
  }

  function _findHelpMediationSysCtx() {
    return 'You are the "Mediation & Dispute Resolution" tool inside JusticeLink Find Help, for LCDJP, a Ugandan digital justice platform. '
      + 'Answer the citizen\'s question about mediation and dispute resolution -- how Local Council (LC) mediation or independent mediation works, '
      + 'what to expect, what it is typically used for, and what may be required -- using the verified legal materials supplied to you as the '
      + 'primary basis for your answer. Do not invent laws, procedures, fees, or requirements not supported by that material. This is general '
      + 'information only, not legal advice or a case determination -- say so where relevant. Keep responses concise (2-4 short sentences where '
      + 'possible), plain language, no jargon. If this is actually a broader legal question beyond mediation itself, tell them to use Legal Aid. '
      + 'If it is an incident to report, tell them to use Report a Case. If it is an emergency, tell them to use Emergency Assistance.';
  }

  function _findHelpShowMediationActions() {
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpMediationLC()"> Local Council (LC) Mediation</button>'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpMediationCenter()"> Independent Mediation Center</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  window._findHelpMediationLC = function () {
    _addUserBubble('Local Council (LC) Mediation');
    _aiState.category = 'Local Council Services';
    _findHelpLocationLookup('lc', 'Local Council Services', 'local council office');
  };

  window._findHelpMediationCenter = function () {
    _addUserBubble('Independent Mediation Center');
    _findHelpLocationLookup('mediation', 'Mediation & Dispute Resolution', 'mediation center');
  };

  
  
  
  
  
  function _findHelpJusticeLinkServices() {
    _aiState.assistantMode = 'find_help_justicelink';
    _setStep(2);
    _addBotBubble(
      'I could not find a verified JusticeLink service-point directory for your area yet. As JusticeLink service points are added, they will appear '
      + 'here. In the meantime, you can go directly to an existing JusticeLink service below, or describe your situation and I\'ll help you find the right one.',
      0
    );
    var html = '<div class="ai-choices-row">'
      + '<button class="ai-choice-btn" onclick="window._findHelpOpenFeature(\'legalAid\')"> Open Legal Aid</button>'
      + '<button class="ai-choice-btn" onclick="window._findHelpOpenFeature(\'report\')"> Report a Case</button>'
      + '</div>';
    _addWidget(html, 400);
    setTimeout(function () { _findHelpShowMoreActions(); }, 1200);
  }

  
  function _findHelpStartGovernment() {
    _aiState.assistantMode = 'find_help_government';
    _aiState.chatMode = true;
    _aiState.category = 'Government Services';
    _setStep(2);
    _addBotBubble(
      'Tell me what you need, for example, "I need help replacing an official document", and I\'ll help you identify the responsible government office or department.',
      0
    );
    var input = document.getElementById('aiTextInput');
    if (input) input.focus();
  }

  function _findHelpGovernmentSysCtx() {
    return 'You are the "Government Services" tool inside JusticeLink Find Help, for LCDJP, a Ugandan digital justice platform. '
      + 'Find Help ONLY identifies the correct office to approach -- it must NOT collect an incident report, must NOT give legal advice or explain the law, '
      + 'and must NOT handle emergencies. The citizen has described what they need. Identify what TYPE of government office or department in Uganda is '
      + 'typically responsible, briefly explain why, and tell them what to do next. Keep responses to 2-4 short sentences, plain language, no jargon. '
      + 'Never invent a specific office name, address, phone number, or opening hours -- describe the TYPE of office responsible only. If this is actually '
      + 'a legal question, tell them to use Legal Aid instead. If it is an incident to report, tell them to use Report a Case. If it is an emergency, tell '
      + 'them to use Emergency Assistance.';
  }

  function _findHelpShowGovernmentActions() {
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpGovNearby()"> Find Nearby Government Office</button>'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpOpenFeature(\'legalAid\')"> Open Legal Aid</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  window._findHelpGovNearby = function () {
    _addUserBubble('Find Nearby Government Office');
    _findHelpLocationLookup('lc', 'Government Services', 'government or local council office');
  };

  
  function _findHelpStartNavigator() {
    _aiState.assistantMode = 'find_help_navigator';
    _aiState.chatMode = true;
    _aiState.category = 'Not Sure Where to Go?';
    _setStep(2);
    _addBotBubble(
      'Describe your situation in your own words, for example, "I have a dispute with my neighbor and I don\'t know where to go", and I\'ll help point you to the right service.',
      0
    );
    var input = document.getElementById('aiTextInput');
    if (input) input.focus();
  }

  function _findHelpNavigatorSysCtx() {
    return 'You are "JusticeLink Find Help", an intelligent service navigator for LCDJP, a Ugandan digital justice platform. '
      + 'Find Help ONLY identifies which service, office, institution, or organization a citizen should approach -- it must NOT collect an incident report '
      + '(what/where/when/who happened -- that belongs to Report a Case), must NOT give legal advice or explain the law (that belongs to Legal Aid), and '
      + 'must NOT handle emergencies (that belongs to Emergency Assistance). Read the citizen\'s situation, briefly explain which type of service fits best '
      + '-- choosing from: Courts & Tribunals, Local Council Services, Government Services, Mediation & Dispute Resolution, Community & Support '
      + 'Organizations, or JusticeLink Services -- and tell them what to do next. If their situation is actually a legal question, tell them to use Legal '
      + 'Aid. If they are describing an incident they want to report, tell them to use Report a Case. Keep responses to 2-4 short sentences, plain '
      + 'language, no legal jargon. Never invent a specific organization, office, court, address, phone number, opening hours, or service provider -- '
      + 'describe the TYPE of service only.';
  }

  function _findHelpShowRouterActions() {
    var html = '<div class="ai-choices-row" style="margin-top:2px;">'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpBackToMenu()"> Show Categories</button>'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpOpenFeature(\'legalAid\')"> Open Legal Aid</button>'
      + '<button class="ai-choice-btn" style="font-size:11px;padding:6px 12px;" onclick="window._findHelpOpenFeature(\'report\')"> Report a Case</button>'
      + '</div>';
    _addWidget(html, 100);
  }

  
  
  
  
  function _findHelpRouteFreeText(text) {
    var area = _getChatArea();
    var grid = area ? area.querySelector('#aiCategoryGrid') : null;
    if (grid && grid.parentElement) grid.parentElement.remove();
    if (_legalAidCheckEmergency(text)) { _findHelpShowEmergencyRedirect(); return; }
    _aiState.chatMode = true;
    _aiState.assistantMode = 'find_help_navigator';
    _aiState.category = _aiState.category || 'Not Sure Where to Go?';
    _setStep(2);
    var typingId = 'ai-typing-' + Date.now();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }
    _callHuggingFaceBackend(text, _findHelpNavigatorSysCtx(), true).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (reply) {
        _addBotBubble(_findHelpFormatReply(reply), 0);
      } else {
        _addBotBubble('Based on what you\'ve described, pick a category below and I\'ll help you find the right service:', 0);
      }
      _findHelpShowRouterActions();
    });
  }

  function _findHelpFormatReply(reply) {
    return _esc(reply || '').replace(/\n/g, '<br>');
  }

  













  var LAWYER_AI_DISCLAIMER = 'AI-generated information is provided for legal support and should be verified against applicable law and professional judgment.';

  var _lawyerQuickActions = [
    { key: 'urgent',    label: 'Urgent Case',        desc: 'Assess and organize an urgent legal situation.' },
    { key: 'guidance',  label: 'Legal Guidance',      desc: 'Get immediate legal information and procedural guidance.' },
    { key: 'findCase',  label: 'Find Client / Case',  desc: 'Locate an authorized JusticeLink client or case.' },
    { key: 'nearby',    label: 'Find Nearby Support', desc: 'Locate nearby courts, police stations, legal-aid resources and other justice services.' },
    { key: 'research',  label: 'Research the Law',    desc: 'Find relevant laws, procedures, cases and legal resources.' },
    { key: 'note',      label: 'Create Case Note',    desc: 'Turn the emergency information into a structured case note.' },
    { key: 'escalate',  label: 'Escalate Matter',     desc: 'Send an urgent matter to an authorized JusticeLink support channel.' }
  ];

  
  
  
  var _lawyerLawLibraryTopics = [
    { key: 'constitution', words: ['constitution', 'fundamental right', 'human right', 'fair hearing'] },
    { key: 'landLaws', words: ['land', 'mailo', 'tenure', 'property dispute', 'boundary'] },
    { key: 'familyLaws', words: ['family', 'domestic'] },
    { key: 'marriageDivorce', words: ['marriage', 'divorce'] },
    { key: 'successionInheritance', words: ['succession', 'inheritance', 'will', 'estate'] },
    { key: 'childrenRights', words: ['child', 'children', 'custody', 'juvenile'] },
    { key: 'employmentLaws', words: ['employment', 'labour', 'labor', 'workplace'] },
    { key: 'criminalLaw', words: ['crime', 'criminal', 'arrest', 'detention', 'bail', 'charge'] },
    { key: 'humanRights', words: ['human rights', 'torture', 'abuse'] },
    { key: 'localCouncilLaws', words: ['local council', 'lc1', 'lc2', 'lc3'] },
    { key: 'courtProcedures', words: ['court procedure', 'filing', 'hearing', 'trial'] },
    { key: 'legalForms', words: ['form', 'affidavit', 'template'] }
  ];
  var _lawyerLegalResearchTopics = [
    { key: 'constitution', words: ['constitution', 'fundamental right'] },
    { key: 'landAct', words: ['land act', 'land', 'tenure'] },
    { key: 'successionAct', words: ['succession', 'inheritance', 'estate'] },
    { key: 'marriageAct', words: ['marriage', 'divorce'] },
    { key: 'childrenAct', words: ['child', 'children', 'custody'] }
  ];

  function _lawyerMatchTopics(list, text) {
    var t = (text || '').toLowerCase();
    var matched = [];
    list.forEach(function (topic) {
      if (topic.words.some(function (w) { return t.indexOf(w) !== -1; })) matched.push(topic.key);
    });
    return matched;
  }

  function _lawyerCurrentUsername() {
    return sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
  }

  function _lawyerSetHeader(title, subtitle) {
    // Heading stays "JusticeLink" (logo + brand); the mode name goes in the subtitle line.
    var t = document.getElementById('aiHeaderTitle');
    var s = document.getElementById('aiHeaderSubtitle');
    if (t) t.textContent = 'JusticeLink';
    if (s) s.textContent = title === 'Emergency Assistant' ? subtitle : title;
  }

  function _lawyerResetHeader() {
    _lawyerSetHeader('Emergency Assistant', 'Online \u00B7 Ready to help');
  }

  
  
  
  function _lawyerRoleAllowed() {
    var role = sessionStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('lcdjp_role') || '';
    return role === 'Lawyer';
  }

  function openLawyerEmergencyAssistant() {
    if (!_lawyerRoleAllowed()) {
      if (typeof showToast === 'function') showToast('The Lawyer Emergency Assistant is only available to authorized lawyers.');
      return;
    }
    _aiLockBodyScroll();
    _aiState = {
      step: 0, category: null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'lawyer_menu', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [], caseReference: null, lawyerCandidates: [],
      lawyer: {
        transcript: [], category: null, urgency: null, urgencyReason: null,
        caseId: null, caseSummary: null
      }
    };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    _lawyerSetHeader('Lawyer Emergency Assistant', 'Rapid legal assistance, case support and emergency response');
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Type your message...'; }
    var uname = _lawyerCurrentUsername();
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '!<br>'
      + '<strong>How can I assist with this urgent legal matter?</strong>'
      + '<br><br><span style="font-size:11px;color:#777;">' + LAWYER_AI_DISCLAIMER + '</span>',
      0
    );
    setTimeout(_lawyerShowMenu, 1200);
  }
  window.openLawyerEmergencyAssistant = openLawyerEmergencyAssistant;

  function _lawyerShowMenu() {
    _aiState.assistantMode = 'lawyer_menu';
    _aiState.chatMode = false;
    var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    _lawyerQuickActions.forEach(function (a) {
      html += '<button class="ai-choice-btn" style="text-align:left;width:100%;" onclick="window._lawyerSelectAction(\'' + a.key + '\')">'
        + '<strong>' + _esc(a.label) + '</strong><br><span style="font-size:11px;color:#666;font-weight:400;">' + _esc(a.desc) + '</span>'
        + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  function _lawyerActionsBar() {
    return '<div class="ai-choices-row" style="margin-top:8px;">'
      + '<button class="ai-choice-btn" onclick="window._lawyerSelectAction(\'note\')">Create Case Note</button>'
      + '<button class="ai-choice-btn" onclick="window._lawyerSelectAction(\'escalate\')">Escalate Matter</button>'
      + '<button class="ai-choice-btn" onclick="window._lawyerSelectAction(\'research\')">Research the Law</button>'
      + '<button class="ai-choice-btn" onclick="_lawyerShowMenu()">Back to Menu</button>'
      + '</div>';
  }

  window._lawyerSelectAction = function (key) {
    _addUserBubble(_lawyerQuickActions.filter(function (a) { return a.key === key; }).map(function (a) { return a.label; })[0] || key);
    if (key === 'urgent') return _lawyerStartUrgentCase();
    if (key === 'guidance') return _lawyerStartGuidance();
    if (key === 'findCase') return _lawyerStartFindCase();
    if (key === 'nearby') return _lawyerFindNearby();
    if (key === 'research') return _lawyerStartResearch();
    if (key === 'note') return _lawyerCreateCaseNote();
    if (key === 'escalate') return _lawyerEscalate();
  };

  function _lawyerStartUrgentCase() {
    _aiState.assistantMode = 'lawyer_urgent_case';
    _aiState.chatMode = true;
    _aiState.lawyer.transcript = [];
    _addBotBubble(
      'Let\'s assess this urgent matter. Tell me what happened, who is involved, and who your client is, '
      + 'I\'ll ask follow-up questions as needed and let you know how urgent this looks.',
      0
    );
  }

  function _lawyerStartGuidance() {
    _aiState.assistantMode = 'lawyer_guidance';
    _aiState.chatMode = true;
    _addBotBubble('What legal question can I help with? For example: "My client has been arrested. What information should I establish first?"', 0);
  }

  function _lawyerStartResearch() {
    _aiState.assistantMode = 'lawyer_research';
    _aiState.chatMode = true;
    _addBotBubble('What would you like to research? Give me a topic, law, or question and I\'ll point you to relevant JusticeLink resources.', 0);
  }

  
  
  
  
  function _lawyerTranscriptText() {
    var t = _aiState.lawyer.transcript.slice(-8);
    if (!t.length) return '';
    return 'Conversation so far:\n' + t.map(function (turn) {
      return (turn.role === 'lawyer' ? 'Lawyer' : 'Assistant') + ': ' + turn.text;
    }).join('\n') + '\n\n';
  }

  var _lawyerSafetyRules =
    'You must not invent legal authorities, case law, sections, or procedures -- if you are not certain a legal source is correct, '
    + 'say so plainly and tell the lawyer to verify it. Distinguish clearly between established law and your own analysis. '
    + 'Never claim to be a court, government authority, or human lawyer, and never state that a matter has been escalated, filed, '
    + 'or sent anywhere -- you cannot take those actions yourself. Keep responses concise and professional.';

  function _lawyerUrgentCaseSysCtx() {
    return 'You are the Lawyer Emergency Assistant inside JusticeLink, helping a verified Uganda-based lawyer triage an urgent legal matter for their client. '
      + _lawyerTranscriptText()
      + 'Ask short, progressive follow-up questions (not all at once) to establish: what happened, who is involved, who the client is, where and when it '
      + 'occurred, whether anyone is in immediate danger, whether anyone is detained or arrested, which authority/institution is involved, what action has '
      + 'already been taken, what assistance the lawyer needs, and whether there is an existing JusticeLink case. Only ask what is still missing. '
      + 'Once you have enough information to judge urgency, begin your reply with exactly one line "URGENCY_LEVEL: Critical", "URGENCY_LEVEL: High", or '
      + '"URGENCY_LEVEL: Standard" (Critical = immediate danger to life/ongoing violence/urgent detention issue; High = serious matter needing prompt action '
      + 'but no immediate threat to life; Standard = important but not emergency-level), then on the next line a one-sentence reason, then a blank line, '
      + 'then a short "Immediate priorities" numbered list. Do not include the URGENCY_LEVEL line until you actually have enough information to assess it. '
      + _lawyerSafetyRules;
  }

  function _lawyerGuidanceSysCtx() {
    return 'You are the Lawyer Emergency Assistant inside JusticeLink, answering a Uganda-based lawyer\'s legal question during an urgent matter. '
      + _lawyerTranscriptText()
      + 'Structure your reply with these bolded section headers where relevant, using **Header** markdown-style bold: **Immediate priorities**, '
      + '**Relevant legal considerations**, **Information to document**, **Possible next steps**, **Relevant JusticeLink resources**. Keep it concise -- '
      + 'this is an emergency context, avoid unnecessarily long answers. ' + _lawyerSafetyRules;
  }

  
  
  
  
  

  function _lawyerFormatReply(text) {
    var esc = _esc(text || '');
    esc = esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    return esc;
  }

  var _lawyerUrgencyColors = { Critical: '#c62828', High: '#e65100', Standard: '#2e7d32' };

  function _lawyerRenderUrgentReply(reply) {
    var m = /^URGENCY_LEVEL:\s*(Critical|High|Standard)\s*\n?([^\n]*)\n*/i.exec(reply);
    var body = reply;
    var badge = '';
    if (m) {
      var level = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      var reason = (m[2] || '').trim();
      _aiState.lawyer.urgency = level;
      _aiState.lawyer.urgencyReason = reason;
      body = reply.slice(m[0].length);
      var color = _lawyerUrgencyColors[level] || '#555';
      badge = '<div style="background:#f5f5f5;border-left:4px solid ' + color + ';border-radius:6px;padding:8px 12px;margin-bottom:8px;">'
        + '<div style="font-weight:700;color:' + color + ';">Urgency: ' + _esc(level.toUpperCase()) + '</div>'
        + (reason ? '<div style="font-size:12px;color:#555;margin-top:2px;"><strong>Reason:</strong> ' + _esc(reason) + '</div>' : '')
        + '</div>';
    }
    return badge + _lawyerFormatReply(body);
  }

  function _lawyerAiUnavailableMessage() {
    return 'The assistant is temporarily unavailable. You can still access your cases, law library, court forms and other JusticeLink services.';
  }

  function _lawyerAiSendMessage() {
    var input = document.getElementById('aiTextInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    _addUserBubble(text);
    _aiState.lawyer.transcript.push({ role: 'lawyer', text: text });

    var area = _getChatArea();
    var typingId = 'ai-typing-' + Date.now();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }

    var mode = _aiState.assistantMode;

    
    
    
    
    
    
    
    
    
    if (mode === 'lawyer_research') {
      if (typeof _lawLibraryQuery !== 'function') {
        var elMissing = document.getElementById(typingId);
        if (elMissing) elMissing.remove();
        _addBotBubble(_lawyerAiUnavailableMessage(), 0);
        _addWidget(_lawyerActionsBar(), 200);
        return;
      }
      _lawLibraryQuery(text, 'Legal Research').then(function (res) {
        var el = document.getElementById(typingId);
        if (el) el.remove();
        if (!res || !res.reply) {
          _addBotBubble(_lawyerAiUnavailableMessage(), 0);
          _addWidget(_lawyerActionsBar(), 200);
          return;
        }
        _aiState.lawyer.transcript.push({ role: 'assistant', text: res.reply });
        var sourcesHtml = '';
        if (Array.isArray(res.sources) && res.sources.length) {
          sourcesHtml = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eef1f8;font-size:11px;color:#777;">'
            + '<strong>Sources:</strong> ' + res.sources.map(function (s) {
              return _esc([s.documentTitle, s.legalSection].filter(Boolean).join(' \u2014 ') || 'Legal Knowledge library');
            }).join('; ') + '</div>';
        }
        _addBotBubble(_lawyerFormatReply(res.reply) + sourcesHtml, 0);
        _addWidget(
          '<div class="ai-choices-row" style="margin-top:6px;">'
          + '<button class="ai-choice-btn" onclick="window._lawyerMoreDetail()">More detail</button>'
          + '</div>', 150
        );
        setTimeout(function () { _lawyerShowResearchResources(text + ' ' + res.reply); }, 250);
        _addWidget(_lawyerActionsBar(), 300);
      });
      return;
    }

    var sysCtx = mode === 'lawyer_urgent_case' ? _lawyerUrgentCaseSysCtx()
      : _lawyerGuidanceSysCtx();

    _callHuggingFaceBackend(text, sysCtx, true).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (!reply) {
        _addBotBubble(_lawyerAiUnavailableMessage(), 0);
        _addWidget(_lawyerActionsBar(), 200);
        return;
      }
      _aiState.lawyer.transcript.push({ role: 'assistant', text: reply });
      var html = mode === 'lawyer_urgent_case' ? _lawyerRenderUrgentReply(reply) : _lawyerFormatReply(reply);
      _addBotBubble(html, 0);
      if (mode === 'lawyer_guidance') {
        _addWidget(
          '<div class="ai-choices-row" style="margin-top:6px;">'
          + '<button class="ai-choice-btn" onclick="window._lawyerMoreDetail()">More detail</button>'
          + '<button class="ai-choice-btn" onclick="window._lawyerShowSources()">Show sources</button>'
          + '</div>', 150
        );
      }
      _addWidget(_lawyerActionsBar(), 300);
    });
  }

  window._lawyerMoreDetail = function () {
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = 'Please give more detail on that.'; }
    _lawyerAiSendMessage();
  };
  window._lawyerShowSources = function () {
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = 'What sources or JusticeLink resources support that?'; }
    _lawyerAiSendMessage();
  };

  
  
  
  function _lawyerShowResearchResources(text) {
    var libTopics = _lawyerMatchTopics(_lawyerLawLibraryTopics, text);
    var researchTopics = _lawyerMatchTopics(_lawyerLegalResearchTopics, text);
    if (!libTopics.length && !researchTopics.length) {
      _addBotBubble('<span style="font-size:12px;color:#777;">I couldn\'t confidently match this to a specific JusticeLink resource -- please verify the applicable law directly.</span>', 0);
      return;
    }
    var html = '<div style="font-size:12px;font-weight:700;color:#1a237e;margin-bottom:6px;">Relevant legal resources</div><div class="ai-choices-row">';
    libTopics.forEach(function (k) {
      html += '<button class="ai-choice-btn" onclick="closeAIAssistant();showLawLibrary(\'' + k + '\')">Open in Law Library</button>';
    });
    researchTopics.forEach(function (k) {
      html += '<button class="ai-choice-btn" onclick="closeAIAssistant();showLegalResearch(\'' + k + '\')">Open in Legal Research</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  
  function _lawyerStartFindCase() {
    _aiState.assistantMode = 'lawyer_find_case';
    _aiState.chatMode = false;
    var html = '<div style="display:flex;gap:6px;margin-top:4px;">'
      + '<input id="lawyerCaseSearchInput" type="text" placeholder="Client name or case ID..." style="flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;" onkeydown="if(event.key===\'Enter\')window._lawyerRunCaseSearch();">'
      + '<button class="ai-choice-btn" onclick="window._lawyerRunCaseSearch()">Search</button>'
      + '</div>';
    _addBotBubble('Who or which case are you looking for?', 0);
    _addWidget(html, 200);
  }

  window._lawyerRunCaseSearch = async function () {
    var input = document.getElementById('lawyerCaseSearchInput');
    var q = (input && input.value || '').trim().toLowerCase();
    if (!q) return;
    _addUserBubble(q);
    var uname = _lawyerCurrentUsername();
    if (!uname) { _addBotBubble(_lawyerAiUnavailableMessage(), 0); return; }
    try {
      var resp = await fetch(API_ENDPOINTS.lawyerCases(uname), { headers: getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to load cases');
      var data = await resp.json();
      var cases = Array.isArray(data) ? data : (data.cases || data.data || []);
      var matches = cases.filter(function (c) {
        var hay = ((c.caseReference || c.caseId || '') + ' ' + (c.citizen_name || c.citizen || '') + ' ' + (c.case_type || c.caseType || '')).toLowerCase();
        return hay.indexOf(q) !== -1;
      }).slice(0, 5);
      if (!matches.length) {
        _addBotBubble('No matching case found among your authorized cases for "' + _esc(q) + '".', 0);
        _addWidget(_lawyerActionsBar(), 150);
        return;
      }
      var html = matches.map(function (c) {
        var ref = c.caseReference || c.caseId || '';
        return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafbff;">'
          + '<div style="font-weight:700;color:#1a237e;">' + _esc(ref) + '</div>'
          + '<div style="font-size:12px;color:#444;">Client: ' + _esc(c.citizen_name || c.citizen || 'Unknown') + '</div>'
          + '<div style="font-size:12px;color:#444;">Type: ' + _esc(c.case_type || c.caseType || 'N/A') + '</div>'
          + '<div style="font-size:12px;color:#444;">Status: ' + _esc(c.status || 'N/A') + '</div>'
          + '<div style="font-size:12px;color:#444;">Assigned lawyer: ' + _esc(c.assigned_lawyer || uname) + '</div>'
          + '<div style="font-size:12px;color:#444;">Location: ' + _esc((c.village || '') + (c.parish ? ', ' + c.parish : '')) + '</div>'
          + '<div style="font-size:12px;color:#444;">Latest update: ' + _esc(c.updatedAt || c.updated_at || 'N/A') + '</div>'
          + '<div style="margin-top:6px;display:flex;gap:6px;">'
          + '<button class="ai-choice-btn" onclick="viewCase(\'' + _esc(ref).replace(/'/g, "\\'") + '\')">Open Case</button>'
          + '<button class="ai-choice-btn" onclick="window._lawyerLinkCase(\'' + _esc(ref).replace(/'/g, "\\'") + '\')">Link to This Matter</button>'
          + '</div></div>';
      }).join('');
      _addWidget(html, 0);
      _addWidget(_lawyerActionsBar(), 200);
    } catch (e) {
      _addBotBubble(_lawyerAiUnavailableMessage(), 0);
    }
  };

  window._lawyerLinkCase = function (caseRef) {
    _aiState.lawyer.caseId = caseRef;
    _addBotBubble('Linked this matter to case <strong>' + _esc(caseRef) + '</strong>. You can now create a case note against it.', 0);
    _addWidget(_lawyerActionsBar(), 150);
  };

  
  function _lawyerFindNearby() {
    _aiState.assistantMode = 'lawyer_nearby';
    _aiState.chatMode = false;
    _addBotBubble('Looking for nearby justice resources...', 0);
    if (!navigator.geolocation) {
      _addBotBubble('Location information cannot currently be determined on this device.', 400);
      _addWidget(_lawyerActionsBar(), 500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) { _lawyerRenderNearby(pos.coords.latitude, pos.coords.longitude); },
      function () {
        _addBotBubble('Location information cannot currently be determined -- please check location permissions.', 300);
        _addWidget(_lawyerActionsBar(), 400);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }

  async function _lawyerRenderNearby(lat, lng) {
    var results = [];
    
    
    _aiState.userLat = lat;
    _aiState.userLng = lng;
    try {
      
      
      
      
      
      var live = typeof _aiEmergencyFetchLiveMap === 'function'
        ? await _aiEmergencyFetchLiveMap(
            [
              { type: 'police', label: 'Police Station' },
              { type: 'local_government_office', label: 'Local Council Office' },
              { type: 'lawyer', keyword: 'legal aid organization', label: 'Legal Aid Organization' }
            ],
            25000
          )
        : [];
      results = (Array.isArray(live) ? live : []).map(function (p) {
        return { _type: p._aiPlaceLabel || 'Nearby Service', name: p.name, latitude: p.latitude, longitude: p.longitude, place_id: p.place_id };
      });
    } catch (e) { results = []; }

    if (!results.length) {
      _addBotBubble('No justice services found near your current location.', 0);
      _addWidget(_lawyerActionsBar(), 150);
      return;
    }
    var html = results.slice(0, 8).map(function (s) {
      var sLat = parseFloat(s.latitude || s.lat), sLng = parseFloat(s.longitude || s.lng);
      var dist = isFinite(sLat) && isFinite(sLng) ? distanceKm(lat, lng, sLat, sLng).toFixed(1) + ' km' : '';
      var name = s.name || s.officeName || s.orgName || s._type;
      var mapUrl = isFinite(sLat) && isFinite(sLng) ? 'https://www.google.com/maps/search/?api=1&query=' + sLat + ',' + sLng : null;
      var dirUrl = isFinite(sLat) && isFinite(sLng) ? 'https://www.google.com/maps/dir/?api=1&destination=' + sLat + ',' + sLng : null;
      return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafbff;">'
        + '<div style="font-weight:700;color:#1a237e;">' + _esc(name) + '</div>'
        + '<div style="font-size:11px;color:#888;">' + _esc(s._type) + (dist ? ' &middot; ' + dist : '') + '</div>'
        + '<div style="margin-top:6px;display:flex;gap:6px;">'
        + (mapUrl ? '<a class="ai-choice-btn" style="text-decoration:none;" href="' + mapUrl + '" target="_blank" rel="noopener">View on Map</a>' : '')
        + (dirUrl ? '<a class="ai-choice-btn" style="text-decoration:none;" href="' + dirUrl + '" target="_blank" rel="noopener">Get Directions</a>' : '')
        + '</div></div>';
    }).join('');
    _addWidget(html, 0);
    _addWidget(_lawyerActionsBar(), 150);
  }

  
  function _lawyerCreateCaseNote() {
    _aiState.assistantMode = 'lawyer_note';
    _aiState.chatMode = false;
    if (!_aiState.lawyer.transcript.length) {
      _addBotBubble('Let\'s gather a few details first -- tell me what happened, or use Urgent Case to walk through it.', 0);
      _addWidget(_lawyerActionsBar(), 150);
      return;
    }
    _addBotBubble('Drafting a structured case note from this conversation...', 0);
    var sysCtx = 'You are drafting an emergency case note for a Uganda-based lawyer inside JusticeLink, based on the conversation transcript below. '
      + _lawyerTranscriptText()
      + 'Write the note using exactly these section headers (plain text, one per line, blank line between sections): '
      + 'Incident Summary / People and Institutions Involved / Immediate Risk / Actions Already Taken / Legal Issue / Suggested Next Steps / Evidence and Documents. '
      + 'Only include information actually present in the conversation -- write "Not yet established" for anything missing. Do not invent facts. Keep it concise and factual.';
    _callHuggingFaceBackend('Draft the emergency case note now.', sysCtx).then(function (reply) {
      var noteText = reply || _lawyerFallbackNote();
      var caseInfoHeader = 'Case: ' + (_aiState.lawyer.caseId || 'Not yet linked to a JusticeLink case')
        + (_aiState.lawyer.urgency ? '\nUrgency: ' + _aiState.lawyer.urgency + (_aiState.lawyer.urgencyReason ? ' -- ' + _aiState.lawyer.urgencyReason : '') : '')
        + '\nDate: ' + new Date().toLocaleString();
      var fullDraft = caseInfoHeader + '\n\n' + noteText;
      var html = '<div style="font-size:11px;font-weight:700;color:#b42318;margin-bottom:4px;">Draft &mdash; Requires Lawyer Review</div>'
        + '<textarea id="lawyerCaseNoteDraft" style="width:100%;min-height:220px;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:12px;font-family:inherit;line-height:1.5;">' + _esc(fullDraft) + '</textarea>'
        + '<div style="margin-top:8px;display:flex;gap:6px;">'
        + '<button class="ai-choice-btn" style="background:#1a237e;color:#fff;border-color:#1a237e;" onclick="window._lawyerSaveCaseNote()">Save to Case</button>'
        + '<button class="ai-choice-btn" onclick="_lawyerShowMenu()">Cancel</button>'
        + (!_aiState.lawyer.caseId ? '<button class="ai-choice-btn" onclick="window._lawyerSelectAction(\'findCase\')">Find Case to Link</button>' : '')
        + '</div>';
      _addWidget(html, 0);
    });
  }

  function _lawyerFallbackNote() {
    return _aiState.lawyer.transcript.filter(function (t) { return t.role === 'lawyer'; })
      .map(function (t) { return '- ' + t.text; }).join('\n') || 'No details captured yet.';
  }

  
  
  
  window._lawyerSaveCaseNote = async function () {
    var caseId = _aiState.lawyer.caseId;
    if (!caseId) {
      _addBotBubble('Please link this matter to a case first using "Find Case to Link".', 0);
      return;
    }
    var textarea = document.getElementById('lawyerCaseNoteDraft');
    var noteText = textarea ? textarea.value : '';
    if (!noteText.trim()) { _addBotBubble('The case note is empty.', 0); return; }
    var uname = _lawyerCurrentUsername();
    try {
      var resp = await fetch(API_ENDPOINTS.advice(caseId), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          legalAdvice: '[Emergency Case Note]\n\n' + noteText,
          legalAdviceDate: new Date().toISOString(),
          legalAdviceProvidedBy: uname,
          legal_advice_provided_by: uname
        })
      });
      if (!resp.ok) throw new Error('Save failed');
      _addBotBubble('Case note saved to <strong>' + _esc(caseId) + '</strong>.', 0);
      _addWidget(_lawyerActionsBar(), 150);
    } catch (e) {
      _addBotBubble(_lawyerAiUnavailableMessage(), 0);
    }
  };

  
  function _lawyerEscalate() {
    _aiState.assistantMode = 'lawyer_escalate';
    _aiState.chatMode = false;
    var summary = _aiState.lawyer.transcript.filter(function (t) { return t.role === 'lawyer'; })
      .map(function (t) { return t.text; }).join(' ').slice(0, 400) || 'No details captured yet -- please describe the matter first.';
    var urgency = _aiState.lawyer.urgency || 'Not yet assessed';
    var html = '<div style="border:1.5px solid #b42318;border-radius:10px;padding:12px 14px;background:#fff5f5;">'
      + '<div style="font-weight:700;color:#b42318;margin-bottom:8px;">Escalate this matter?</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Matter:</strong> ' + _esc(summary) + '</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Urgency:</strong> ' + _esc(urgency) + '</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Recipient:</strong> JusticeLink Support (Admin)</div>'
      + (_aiState.lawyer.caseId ? '<div style="font-size:12px;margin-bottom:4px;"><strong>Linked case:</strong> ' + _esc(_aiState.lawyer.caseId) + '</div>' : '')
      + '<div style="margin-top:10px;display:flex;gap:6px;">'
      + '<button class="ai-choice-btn" style="background:#b42318;color:#fff;border-color:#b42318;" onclick="window._lawyerConfirmEscalate()">Confirm Escalation</button>'
      + '<button class="ai-choice-btn" onclick="_lawyerShowMenu()">Cancel</button>'
      + '</div></div>';
    _addBotBubble('Please review before this is sent.', 0);
    _addWidget(html, 200);
  }

  
  
  
  window._lawyerConfirmEscalate = async function () {
    var uname = _lawyerCurrentUsername();
    var fullname = sessionStorage.getItem('lcdjp_fullname') || uname;
    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || 'Lawyer';
    var summary = _aiState.lawyer.transcript.filter(function (t) { return t.role === 'lawyer'; })
      .map(function (t) { return t.text; }).join(' ').slice(0, 500);
    var urgency = _aiState.lawyer.urgency || 'Not yet assessed';
    var msgObj = {
      fromName: fullname, fromRole: userLevel,
      message: '[URGENT - Lawyer Emergency Assistant] Urgency: ' + urgency
        + (_aiState.lawyer.caseId ? ' | Case: ' + _aiState.lawyer.caseId : '')
        + ' | Summary: ' + (summary || 'No details captured.'),
      type: 'text', sentTo: 'admin', timestamp: new Date().toISOString(),
      isRead: false, delivered: false
    };
    try {
      var resp = await fetch(API_ENDPOINTS.chatMessages, _chatFetchOpts({ 'Content-Type': 'application/json' }, JSON.stringify(toChatServerPayload(msgObj)), 'POST'));
      if (!resp.ok) throw new Error('Escalation failed');
      
      
      
      
      
      
      
      if (typeof createEnhancedNotification === 'function') {
        resp.clone().json().then(function (row) {
          var recipient = (row && (row.recipient || row.sent_to || row.sentTo)) || '';
          if (!recipient) return;
          createEnhancedNotification(
            recipient,
            fullname + ' escalated an urgent matter' + (_aiState.lawyer.caseId ? ' (case ' + _aiState.lawyer.caseId + ')' : ''),
            'urgent',
            _aiState.lawyer.caseId || null
          ).catch(function (e) { console.warn('Could not notify recipient of escalation:', e); });
        }).catch(function (e) { console.warn('Could not read escalation recipient:', e); });
      }
      _addBotBubble('This matter has been escalated to JusticeLink Support. They will follow up as soon as possible.', 0);
      _addWidget(_lawyerActionsBar(), 150);
    } catch (e) {
      _addBotBubble('Escalation could not be sent right now -- please use Contact Support directly, or call emergency services if this is life-threatening.', 0);
      _addWidget(_lawyerActionsBar(), 150);
    }
  };

  
  
  
  var LC_AI_DISCLAIMER = 'AI-generated information is provided for guidance and should be verified against Local Council procedure and applicable law.';

  var _lcQuickActions = [
    { key: 'urgent',    label: 'Urgent Case',        desc: 'Assess and organize an urgent community matter.' },
    { key: 'guidance',  label: 'LC Guidance',         desc: 'Get immediate guidance on Local Council procedure and mediation.' },
    { key: 'findCase',  label: 'Find Case',           desc: 'Locate a case assigned to you or unclaimed in your area.' },
    { key: 'nearby',    label: 'Find Nearby Support', desc: 'Locate nearby police stations, LC offices and legal-aid resources.' },
    { key: 'research',  label: 'Research LC Law',     desc: 'Find relevant Local Council Courts Act provisions and procedures.' },
    { key: 'note',      label: 'Create Case Note',    desc: 'Turn this conversation into a structured case note.' },
    { key: 'escalate',  label: 'Escalate Matter',     desc: 'Send an urgent matter to an authorized JusticeLink support channel.' }
  ];

  function _lcCurrentUsername() {
    return sessionStorage.getItem('lcdjp_username') || sessionStorage.getItem('lcdjp_name') || sessionStorage.getItem('lcdjp_fullname') || '';
  }

  function _lcSetHeader(title, subtitle) {
    // Heading stays "JusticeLink" (logo + brand); the mode name goes in the subtitle line.
    var t = document.getElementById('aiHeaderTitle');
    var s = document.getElementById('aiHeaderSubtitle');
    if (t) t.textContent = 'JusticeLink';
    if (s) s.textContent = title === 'Emergency Assistant' ? subtitle : title;
  }

  function _lcResetHeader() {
    _lcSetHeader('Emergency Assistant', 'Online \u00B7 Ready to help');
  }

  function _lcRoleAllowed() {
    var role = sessionStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('lcdjp_role') || '';
    return role === 'LC' || role === 'LC Official' || role === 'LC1' || role === 'LC2' || role === 'LC3';
  }

  function openLCEmergencyAssistant() {
    if (!_lcRoleAllowed()) {
      if (typeof showToast === 'function') showToast('The LC Emergency Assistant is only available to authorized Local Council officials.');
      return;
    }
    _aiLockBodyScroll();
    _aiState = {
      step: 0, category: null, qIndex: 0, answers: {}, contactType: null,
      chatMode: false, assistantMode: 'lc_menu', userLat: null, userLng: null,
      lcResults: [], policeResults: [], placeResults: [], caseReference: null, lawyerCandidates: [],
      lc: {
        transcript: [], category: null, urgency: null, urgencyReason: null,
        caseId: null, caseSummary: null
      }
    };
    var area = _getChatArea();
    if (area) area.innerHTML = '';
    _setStep(0);
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      if (_aiHideTimer) { clearTimeout(_aiHideTimer); _aiHideTimer = null; }
      if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
      modal.classList.remove('open');
      modal.style.display = 'flex';
      void modal.offsetWidth;
      modal.classList.add('open');
    }
    _lcSetHeader('LC Emergency Assistant', 'Rapid assistance for urgent community matters');
    var input = document.getElementById('aiTextInput');
    if (input) { input.value = ''; input.placeholder = 'Type your message...'; }
    var uname = _lcCurrentUsername();
    _addBotBubble(
      'Hello' + (uname ? ', <strong>' + _esc(uname) + '</strong>' : '') + '!<br>'
      + '<strong>How can I assist with this urgent community matter?</strong>'
      + '<br><br><span style="font-size:11px;color:#777;">' + LC_AI_DISCLAIMER + '</span>',
      0
    );
    setTimeout(_lcShowMenu, 1200);
  }
  window.openLCEmergencyAssistant = openLCEmergencyAssistant;

  function _lcShowMenu() {
    _aiState.assistantMode = 'lc_menu';
    _aiState.chatMode = false;
    var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    _lcQuickActions.forEach(function (a) {
      html += '<button class="ai-choice-btn" style="text-align:left;width:100%;" onclick="window._lcSelectAction(\'' + a.key + '\')">'
        + '<strong>' + _esc(a.label) + '</strong><br><span style="font-size:11px;color:#666;font-weight:400;">' + _esc(a.desc) + '</span>'
        + '</button>';
    });
    html += '</div>';
    _addWidget(html, 0);
  }

  function _lcActionsBar() {
    return '<div class="ai-choices-row" style="margin-top:8px;">'
      + '<button class="ai-choice-btn" onclick="window._lcSelectAction(\'note\')">Create Case Note</button>'
      + '<button class="ai-choice-btn" onclick="window._lcSelectAction(\'escalate\')">Escalate Matter</button>'
      + '<button class="ai-choice-btn" onclick="window._lcSelectAction(\'research\')">Research LC Law</button>'
      + '<button class="ai-choice-btn" onclick="_lcShowMenu()">Back to Menu</button>'
      + '</div>';
  }

  window._lcSelectAction = function (key) {
    _addUserBubble(_lcQuickActions.filter(function (a) { return a.key === key; }).map(function (a) { return a.label; })[0] || key);
    if (key === 'urgent') return _lcStartUrgentCase();
    if (key === 'guidance') return _lcStartGuidance();
    if (key === 'findCase') return _lcStartFindCase();
    if (key === 'nearby') return _lcFindNearby();
    if (key === 'research') return _lcStartResearch();
    if (key === 'note') return _lcCreateCaseNote();
    if (key === 'escalate') return _lcEscalate();
  };

  function _lcStartUrgentCase() {
    _aiState.assistantMode = 'lc_urgent_case';
    _aiState.chatMode = true;
    _aiState.lc.transcript = [];
    _addBotBubble(
      'Let\'s assess this urgent matter. Tell me what happened, who is involved, and what village or parish it concerns, '
      + 'I\'ll ask follow-up questions as needed and let you know how urgent this looks.',
      0
    );
  }

  function _lcStartGuidance() {
    _aiState.assistantMode = 'lc_guidance';
    _aiState.chatMode = true;
    _addBotBubble('What LC procedure or mediation question can I help with? For example: "A family dispute was reported to me. What should I establish first?"', 0);
  }

  function _lcStartResearch() {
    _aiState.assistantMode = 'lc_research';
    _aiState.chatMode = true;
    _addBotBubble('What would you like to research? Give me a topic, law, or question and I\'ll point you to relevant JusticeLink resources.', 0);
  }

  function _lcTranscriptText() {
    var t = _aiState.lc.transcript.slice(-8);
    if (!t.length) return '';
    return 'Conversation so far:\n' + t.map(function (turn) {
      return (turn.role === 'lc' ? 'LC Official' : 'Assistant') + ': ' + turn.text;
    }).join('\n') + '\n\n';
  }

  var _lcSafetyRules =
    'You must not invent legal authorities, sections, or procedures -- if you are not certain a legal source is correct, '
    + 'say so plainly and tell the LC official to verify it. Distinguish clearly between established law/procedure and your own analysis. '
    + 'Remember that Local Council courts only have jurisdiction over specified civil, minor and mediation matters at village/parish/sub-county level -- '
    + 'criminal matters, serious violence, gender-based violence, matters involving minors at risk, and matters beyond LC jurisdiction must be referred to '
    + 'the Police or the Magistrate\'s Court, not handled or mediated at LC level. Never claim to be a court, government authority, or the Magistrate, and '
    + 'never state that a matter has been escalated, filed, or sent anywhere -- you cannot take those actions yourself. Keep responses concise and practical.';

  function _lcUrgentCaseSysCtx() {
    return 'You are the LC Emergency Assistant inside JusticeLink, helping a verified Local Council (LC) official in Uganda triage an urgent community matter. '
      + _lcTranscriptText()
      + 'Ask short, progressive follow-up questions (not all at once) to establish: what happened, who is involved, which village/parish/sub-county it '
      + 'concerns, where and when it occurred, whether anyone is in immediate danger, whether it involves a criminal matter that should go straight to '
      + 'Police, whether it is within LC Court jurisdiction or should be referred to the Magistrate\'s Court, what action has already been taken, and '
      + 'whether there is an existing JusticeLink case. Only ask what is still missing. Once you have enough information to judge urgency, begin your '
      + 'reply with exactly one line "URGENCY_LEVEL: Critical", "URGENCY_LEVEL: High", or "URGENCY_LEVEL: Standard" (Critical = immediate danger to '
      + 'life/ongoing violence/matter needing immediate Police involvement; High = serious matter needing prompt action but no immediate threat to life; '
      + 'Standard = an ordinary community matter suited to LC-level mediation), then on the next line a one-sentence reason, then a blank line, then a '
      + 'short "Immediate priorities" numbered list. Do not include the URGENCY_LEVEL line until you actually have enough information to assess it. '
      + _lcSafetyRules;
  }

  function _lcGuidanceSysCtx() {
    return 'You are the LC Emergency Assistant inside JusticeLink, answering a Local Council (LC) official\'s procedural or mediation question in Uganda during an urgent community matter. '
      + _lcTranscriptText()
      + 'Structure your reply with these bolded section headers where relevant, using **Header** markdown-style bold: **Immediate priorities**, '
      + '**Relevant LC procedure / mediation guidance**, **Information to document**, **Possible next steps**, **Relevant JusticeLink resources**. Keep it '
      + 'concise -- this is an emergency context, avoid unnecessarily long answers. ' + _lcSafetyRules;
  }

  function _lcRenderUrgentReply(reply) {
    var m = /^URGENCY_LEVEL:\s*(Critical|High|Standard)\s*\n?([^\n]*)\n*/i.exec(reply);
    var body = reply;
    var badge = '';
    if (m) {
      var level = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      var reason = (m[2] || '').trim();
      _aiState.lc.urgency = level;
      _aiState.lc.urgencyReason = reason;
      body = reply.slice(m[0].length);
      var color = _lawyerUrgencyColors[level] || '#555';
      badge = '<div style="background:#f5f5f5;border-left:4px solid ' + color + ';border-radius:6px;padding:8px 12px;margin-bottom:8px;">'
        + '<div style="font-weight:700;color:' + color + ';">Urgency: ' + _esc(level.toUpperCase()) + '</div>'
        + (reason ? '<div style="font-size:12px;color:#555;margin-top:2px;"><strong>Reason:</strong> ' + _esc(reason) + '</div>' : '')
        + '</div>';
    }
    return badge + _lawyerFormatReply(body);
  }

  function _lcAiUnavailableMessage() {
    return 'The assistant is temporarily unavailable. You can still access your cases, law library, LC forms and other JusticeLink services.';
  }

  function _lcAiSendMessage() {
    var input = document.getElementById('aiTextInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    _addUserBubble(text);
    _aiState.lc.transcript.push({ role: 'lc', text: text });

    var area = _getChatArea();
    var typingId = 'ai-typing-' + Date.now();
    var typingWrap = document.createElement('div');
    typingWrap.id = typingId;
    typingWrap.style.cssText = 'display:flex; align-items:flex-end; gap:8px; margin-bottom:12px; animation:ai-msg-in 0.3s ease;';
    typingWrap.innerHTML = '<div class="ai-avatar"></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    if (area) { area.appendChild(typingWrap); _scrollBottom(); }

    var mode = _aiState.assistantMode;

    if (mode === 'lc_research') {
      if (typeof _lawLibraryQuery !== 'function') {
        var elMissing = document.getElementById(typingId);
        if (elMissing) elMissing.remove();
        _addBotBubble(_lcAiUnavailableMessage(), 0);
        _addWidget(_lcActionsBar(), 200);
        return;
      }
      _lawLibraryQuery(text, 'LC Legal Research', 'Local Council officials').then(function (res) {
        var el = document.getElementById(typingId);
        if (el) el.remove();
        if (!res || !res.reply) {
          _addBotBubble(_lcAiUnavailableMessage(), 0);
          _addWidget(_lcActionsBar(), 200);
          return;
        }
        _aiState.lc.transcript.push({ role: 'assistant', text: res.reply });
        var sourcesHtml = '';
        if (Array.isArray(res.sources) && res.sources.length) {
          sourcesHtml = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eef1f8;font-size:11px;color:#777;">'
            + '<strong>Sources:</strong> ' + res.sources.map(function (s) {
              return _esc([s.documentTitle, s.legalSection].filter(Boolean).join(' \u2014 ') || 'Legal Knowledge library');
            }).join('; ') + '</div>';
        }
        _addBotBubble(_lawyerFormatReply(res.reply) + sourcesHtml, 0);
        _addWidget(_lcActionsBar(), 300);
      });
      return;
    }

    var sysCtx = mode === 'lc_urgent_case' ? _lcUrgentCaseSysCtx()
      : _lcGuidanceSysCtx();

    _callHuggingFaceBackend(text, sysCtx, true).then(function (reply) {
      var el = document.getElementById(typingId);
      if (el) el.remove();
      if (!reply) {
        _addBotBubble(_lcAiUnavailableMessage(), 0);
        _addWidget(_lcActionsBar(), 200);
        return;
      }
      _aiState.lc.transcript.push({ role: 'assistant', text: reply });
      var html = mode === 'lc_urgent_case' ? _lcRenderUrgentReply(reply) : _lawyerFormatReply(reply);
      _addBotBubble(html, 0);
      _addWidget(_lcActionsBar(), 300);
    });
  }

  function _lcStartFindCase() {
    _aiState.assistantMode = 'lc_find_case';
    _aiState.chatMode = false;
    var html = '<div style="display:flex;gap:6px;margin-top:4px;">'
      + '<input id="lcCaseSearchInputAi" type="text" placeholder="Citizen name or case ID..." style="flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;" onkeydown="if(event.key===\'Enter\')window._lcRunCaseSearch();">'
      + '<button class="ai-choice-btn" onclick="window._lcRunCaseSearch()">Search</button>'
      + '</div>';
    _addBotBubble('Who or which case are you looking for?', 0);
    _addWidget(html, 200);
  }

  window._lcRunCaseSearch = async function () {
    var input = document.getElementById('lcCaseSearchInputAi');
    var q = (input && input.value || '').trim().toLowerCase();
    if (!q) return;
    _addUserBubble(q);
    var uname = _lcCurrentUsername();
    if (!uname) { _addBotBubble(_lcAiUnavailableMessage(), 0); return; }
    try {
      var resp = await fetch(API_ENDPOINTS.lcCases(uname), { headers: getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to load cases');
      var data = await resp.json();
      var cases = Array.isArray(data) ? data : (data.cases || data.data || []);
      var matches = cases.filter(function (c) {
        var hay = ((c.case_reference || c.caseId || '') + ' ' + (c.citizen_name || c.citizen || '') + ' ' + (c.case_type || c.caseType || '')).toLowerCase();
        return hay.indexOf(q) !== -1;
      }).slice(0, 5);
      if (!matches.length) {
        _addBotBubble('No matching case found among your assigned or unclaimed cases for "' + _esc(q) + '".', 0);
        _addWidget(_lcActionsBar(), 150);
        return;
      }
      var html = matches.map(function (c) {
        var ref = c.case_reference || c.caseId || '';
        return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafbff;">'
          + '<div style="font-weight:700;color:#1a237e;">' + _esc(ref) + '</div>'
          + '<div style="font-size:12px;color:#444;">Citizen: ' + _esc(c.citizen_name || c.citizen || 'Unknown') + '</div>'
          + '<div style="font-size:12px;color:#444;">Type: ' + _esc(c.case_type || c.caseType || 'N/A') + '</div>'
          + '<div style="font-size:12px;color:#444;">Status: ' + _esc(c.status || 'N/A') + '</div>'
          + '<div style="font-size:12px;color:#444;">Assigned LC: ' + _esc(c.assigned_lc || uname) + '</div>'
          + '<div style="font-size:12px;color:#444;">Location: ' + _esc((c.village || '') + (c.parish ? ', ' + c.parish : '')) + '</div>'
          + '<div style="font-size:12px;color:#444;">Latest update: ' + _esc(c.updatedAt || c.updated_at || 'N/A') + '</div>'
          + '<div style="margin-top:6px;display:flex;gap:6px;">'
          + '<button class="ai-choice-btn" onclick="viewCase(\'' + _esc(ref).replace(/'/g, "\\'") + '\')">Open Case</button>'
          + '<button class="ai-choice-btn" onclick="window._lcLinkCase(\'' + _esc(ref).replace(/'/g, "\\'") + '\')">Link to This Matter</button>'
          + '</div></div>';
      }).join('');
      _addWidget(html, 0);
      _addWidget(_lcActionsBar(), 200);
    } catch (e) {
      _addBotBubble(_lcAiUnavailableMessage(), 0);
    }
  };

  window._lcLinkCase = function (caseRef) {
    _aiState.lc.caseId = caseRef;
    _addBotBubble('Linked this matter to case <strong>' + _esc(caseRef) + '</strong>. You can now create a case note against it.', 0);
    _addWidget(_lcActionsBar(), 150);
  };

  function _lcFindNearby() {
    _aiState.assistantMode = 'lc_nearby';
    _aiState.chatMode = false;
    _addBotBubble('Looking for nearby justice resources...', 0);
    if (!navigator.geolocation) {
      _addBotBubble('Location information cannot currently be determined on this device.', 400);
      _addWidget(_lcActionsBar(), 500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) { _lcRenderNearby(pos.coords.latitude, pos.coords.longitude); },
      function () {
        _addBotBubble('Location information cannot currently be determined -- please check location permissions.', 300);
        _addWidget(_lcActionsBar(), 400);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }

  async function _lcRenderNearby(lat, lng) {
    var results = [];
    _aiState.userLat = lat;
    _aiState.userLng = lng;
    try {
      var live = typeof _aiEmergencyFetchLiveMap === 'function'
        ? await _aiEmergencyFetchLiveMap(
            [
              { type: 'local_government_office', label: 'Local Council Office' },
              { type: 'police', label: 'Police Station' },
              { type: 'lawyer', keyword: 'legal aid organization', label: 'Legal Aid Organization' }
            ],
            25000
          )
        : [];
      results = (Array.isArray(live) ? live : []).map(function (p) {
        return { _type: p._aiPlaceLabel || 'Nearby Service', name: p.name, latitude: p.latitude, longitude: p.longitude, place_id: p.place_id };
      });
    } catch (e) { results = []; }

    if (!results.length) {
      _addBotBubble('No justice services found near your current location.', 0);
      _addWidget(_lcActionsBar(), 150);
      return;
    }
    var html = results.slice(0, 8).map(function (s) {
      var sLat = parseFloat(s.latitude || s.lat), sLng = parseFloat(s.longitude || s.lng);
      var dist = isFinite(sLat) && isFinite(sLng) ? distanceKm(lat, lng, sLat, sLng).toFixed(1) + ' km' : '';
      var name = s.name || s.officeName || s.orgName || s._type;
      var mapUrl = isFinite(sLat) && isFinite(sLng) ? 'https://www.google.com/maps/search/?api=1&query=' + sLat + ',' + sLng : null;
      var dirUrl = isFinite(sLat) && isFinite(sLng) ? 'https://www.google.com/maps/dir/?api=1&destination=' + sLat + ',' + sLng : null;
      return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafbff;">'
        + '<div style="font-weight:700;color:#1a237e;">' + _esc(name) + '</div>'
        + '<div style="font-size:11px;color:#888;">' + _esc(s._type) + (dist ? ' &middot; ' + dist : '') + '</div>'
        + '<div style="margin-top:6px;display:flex;gap:6px;">'
        + (mapUrl ? '<a class="ai-choice-btn" style="text-decoration:none;" href="' + mapUrl + '" target="_blank" rel="noopener">View on Map</a>' : '')
        + (dirUrl ? '<a class="ai-choice-btn" style="text-decoration:none;" href="' + dirUrl + '" target="_blank" rel="noopener">Get Directions</a>' : '')
        + '</div></div>';
    }).join('');
    _addWidget(html, 0);
    _addWidget(_lcActionsBar(), 150);
  }

  function _lcCreateCaseNote() {
    _aiState.assistantMode = 'lc_note';
    _aiState.chatMode = false;
    if (!_aiState.lc.transcript.length) {
      _addBotBubble('Let\'s gather a few details first -- tell me what happened, or use Urgent Case to walk through it.', 0);
      _addWidget(_lcActionsBar(), 150);
      return;
    }
    _addBotBubble('Drafting a structured case note from this conversation...', 0);
    var sysCtx = 'You are drafting an emergency case note for a Uganda-based Local Council official inside JusticeLink, based on the conversation transcript below. '
      + _lcTranscriptText()
      + 'Write the note using exactly these section headers (plain text, one per line, blank line between sections): '
      + 'Incident Summary / People and Villages Involved / Immediate Risk / Actions Already Taken / LC Jurisdiction Assessment / Suggested Next Steps / Evidence and Documents. '
      + 'Only include information actually present in the conversation -- write "Not yet established" for anything missing. Do not invent facts. Keep it concise and factual.';
    _callHuggingFaceBackend('Draft the emergency case note now.', sysCtx).then(function (reply) {
      var noteText = reply || _lcFallbackNote();
      var caseInfoHeader = 'Case: ' + (_aiState.lc.caseId || 'Not yet linked to a JusticeLink case')
        + (_aiState.lc.urgency ? '\nUrgency: ' + _aiState.lc.urgency + (_aiState.lc.urgencyReason ? ' -- ' + _aiState.lc.urgencyReason : '') : '')
        + '\nDate: ' + new Date().toLocaleString();
      var fullDraft = caseInfoHeader + '\n\n' + noteText;
      var html = '<div style="font-size:11px;font-weight:700;color:#b42318;margin-bottom:4px;">Draft &mdash; Requires LC Official Review</div>'
        + '<textarea id="lcCaseNoteDraft" style="width:100%;min-height:220px;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:12px;font-family:inherit;line-height:1.5;">' + _esc(fullDraft) + '</textarea>'
        + '<div style="margin-top:8px;display:flex;gap:6px;">'
        + '<button class="ai-choice-btn" style="background:#1a237e;color:#fff;border-color:#1a237e;" onclick="window._lcSaveCaseNote()">Save to Case</button>'
        + '<button class="ai-choice-btn" onclick="_lcShowMenu()">Cancel</button>'
        + (!_aiState.lc.caseId ? '<button class="ai-choice-btn" onclick="window._lcSelectAction(\'findCase\')">Find Case to Link</button>' : '')
        + '</div>';
      _addWidget(html, 0);
    });
  }

  function _lcFallbackNote() {
    return _aiState.lc.transcript.filter(function (t) { return t.role === 'lc'; })
      .map(function (t) { return '- ' + t.text; }).join('\n') || 'No details captured yet.';
  }

  window._lcSaveCaseNote = async function () {
    var caseId = _aiState.lc.caseId;
    if (!caseId) {
      _addBotBubble('Please link this matter to a case first using "Find Case to Link".', 0);
      return;
    }
    var textarea = document.getElementById('lcCaseNoteDraft');
    var noteText = textarea ? textarea.value : '';
    if (!noteText.trim()) { _addBotBubble('The case note is empty.', 0); return; }
    var uname = _lcCurrentUsername();
    try {
      var resp = await fetch(API_ENDPOINTS.advice(caseId), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          legalAdvice: '[Emergency Case Note]\n\n' + noteText,
          legalAdviceDate: new Date().toISOString(),
          legalAdviceProvidedBy: uname,
          legal_advice_provided_by: uname
        })
      });
      if (!resp.ok) throw new Error('Save failed');
      _addBotBubble('Case note saved to <strong>' + _esc(caseId) + '</strong>.', 0);
      _addWidget(_lcActionsBar(), 150);
    } catch (e) {
      _addBotBubble(_lcAiUnavailableMessage(), 0);
    }
  };

  function _lcEscalate() {
    _aiState.assistantMode = 'lc_escalate';
    _aiState.chatMode = false;
    var summary = _aiState.lc.transcript.filter(function (t) { return t.role === 'lc'; })
      .map(function (t) { return t.text; }).join(' ').slice(0, 400) || 'No details captured yet -- please describe the matter first.';
    var urgency = _aiState.lc.urgency || 'Not yet assessed';
    var html = '<div style="border:1.5px solid #b42318;border-radius:10px;padding:12px 14px;background:#fff5f5;">'
      + '<div style="font-weight:700;color:#b42318;margin-bottom:8px;">Escalate this matter?</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Matter:</strong> ' + _esc(summary) + '</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Urgency:</strong> ' + _esc(urgency) + '</div>'
      + '<div style="font-size:12px;margin-bottom:4px;"><strong>Recipient:</strong> JusticeLink Support (Admin)</div>'
      + (_aiState.lc.caseId ? '<div style="font-size:12px;margin-bottom:4px;"><strong>Linked case:</strong> ' + _esc(_aiState.lc.caseId) + '</div>' : '')
      + '<div style="margin-top:10px;display:flex;gap:6px;">'
      + '<button class="ai-choice-btn" style="background:#b42318;color:#fff;border-color:#b42318;" onclick="window._lcConfirmEscalate()">Confirm Escalation</button>'
      + '<button class="ai-choice-btn" onclick="_lcShowMenu()">Cancel</button>'
      + '</div></div>';
    _addBotBubble('Please review before this is sent.', 0);
    _addWidget(html, 200);
  }

  window._lcConfirmEscalate = async function () {
    var uname = _lcCurrentUsername();
    var fullname = sessionStorage.getItem('lcdjp_fullname') || uname;
    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || 'LC';
    var summary = _aiState.lc.transcript.filter(function (t) { return t.role === 'lc'; })
      .map(function (t) { return t.text; }).join(' ').slice(0, 500);
    var urgency = _aiState.lc.urgency || 'Not yet assessed';
    var msgObj = {
      fromName: fullname, fromRole: userLevel,
      message: '[URGENT - LC Emergency Assistant] Urgency: ' + urgency
        + (_aiState.lc.caseId ? ' | Case: ' + _aiState.lc.caseId : '')
        + ' | Summary: ' + (summary || 'No details captured.'),
      type: 'text', sentTo: 'admin', timestamp: new Date().toISOString(),
      isRead: false, delivered: false
    };
    try {
      var resp = await fetch(API_ENDPOINTS.chatMessages, _chatFetchOpts({ 'Content-Type': 'application/json' }, JSON.stringify(toChatServerPayload(msgObj)), 'POST'));
      if (!resp.ok) throw new Error('Escalation failed');
      if (typeof createEnhancedNotification === 'function') {
        resp.clone().json().then(function (row) {
          var recipient = (row && (row.recipient || row.sent_to || row.sentTo)) || '';
          if (!recipient) return;
          createEnhancedNotification(
            recipient,
            fullname + ' escalated an urgent matter' + (_aiState.lc.caseId ? ' (case ' + _aiState.lc.caseId + ')' : ''),
            'urgent',
            _aiState.lc.caseId || null
          ).catch(function (e) { console.warn('Could not notify recipient of escalation:', e); });
        }).catch(function (e) { console.warn('Could not read escalation recipient:', e); });
      }
      _addBotBubble('This matter has been escalated to JusticeLink Support. They will follow up as soon as possible.', 0);
      _addWidget(_lcActionsBar(), 150);
    } catch (e) {
      _addBotBubble('Escalation could not be sent right now -- please use Contact Support directly, or call emergency services if this is life-threatening.', 0);
      _addWidget(_lcActionsBar(), 150);
    }
  };

  function closeAIAssistant() {
    var modal = document.getElementById('aiAssistantModal');
    if (modal) {
      modal.classList.remove('open');
      _aiHideTimer = setTimeout(function() {
        modal.style.display = 'none';
        _aiHideTimer = null;
      }, 300);
    }
    _aiUnlockBodyScroll();
    if (_aiState && _aiState.assistantMode && _aiState.assistantMode.indexOf('lawyer_') === 0) {
      _lawyerResetHeader();
    }
    if (_aiState && _aiState.assistantMode && _aiState.assistantMode.indexOf('lc_') === 0) {
      _lcResetHeader();
    }
  }
  window.closeAIAssistant = closeAIAssistant;

  document.addEventListener('click', function(e) {
    var modal = document.getElementById('aiAssistantModal');
    if (modal && e.target === modal) closeAIAssistant();
  });

  function _lcdjpDisplayFirstName() {
    var full = sessionStorage.getItem('lcdjp_fullname') || localStorage.getItem('lcdjp_fullname') ||
               sessionStorage.getItem('fullName') || localStorage.getItem('fullName') ||
               sessionStorage.getItem('lcdjp_name') || localStorage.getItem('lcdjp_name') || '';
    full = String(full || '').trim();
    if (full) return full.split(' ')[0];
    var uname = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    return uname || 'there';
  }
  window._lcdjpDisplayFirstName = _lcdjpDisplayFirstName;

  function _updateBannerName() {
    var name = _lcdjpDisplayFirstName();
    var el = document.getElementById('bannerUserName');
    if (el) el.textContent = name || 'there';
  }

  var _origLogin = window.loginUser;
  if (typeof _origLogin === 'function') {
    window.loginUser = function() {
      var r = _origLogin.apply(this, arguments);
      setTimeout(_updateBannerName, 500);
      return r;
    };
  }
  
  function _updateMobileBannerName() {
    var name = _lcdjpDisplayFirstName();
    var el = document.getElementById('cmBannerUserName');
    if (el) el.textContent = name || 'there';
  }
  document.addEventListener('DOMContentLoaded', function() {
    
    var _m = document.getElementById('aiAssistantModal');
    if (_m && _m.parentElement !== document.body) { document.body.appendChild(_m); }
    _updateBannerName();
    _updateMobileBannerName();
  });
  setTimeout(function() { _updateBannerName(); _updateMobileBannerName(); }, 1000);
  
  var _origLogin2 = window.loginUser;
  if (typeof _origLogin2 === 'function') {
    window.loginUser = function() {
      var r = _origLogin2.apply(this, arguments);
      setTimeout(_updateMobileBannerName, 500);
      return r;
    };
  }

})();