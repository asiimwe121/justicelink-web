






(function () {
  'use strict';

  function cdSync() {
    
    var h = new Date().getHours();
    var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    var tg = document.getElementById('cdgTimeGreet');
    if (tg) tg.textContent = greet;

    
    var src = document.getElementById('bannerUserName');
    var dst = document.getElementById('cdgUserName');
    if (src && dst && src.textContent && src.textContent.trim() !== 'there') {
      dst.textContent = src.textContent.trim();
    }

    
    var lbl = document.getElementById('accountMenuDropdownLabel');
    var cdtName = document.getElementById('cdtUserName');
    var cdtAv = document.getElementById('cdtAvatar');
    if (lbl && cdtName && lbl.textContent && lbl.textContent !== 'My Account') {
      var nm = lbl.textContent.trim();
      cdtName.textContent = nm.split(' ')[0] || nm;
      if (cdtAv) {
        var parts = nm.split(' ');
        cdtAv.textContent = (parts[0][0] || '') + (parts[1] ? parts[1][0] : '');
        cdtAv.textContent = cdtAv.textContent.toUpperCase() || 'U';
      }
    }

    
    function syncStat(srcId, dstId) {
      var s = document.getElementById(srcId);
      var d = document.getElementById(dstId);
      if (s && d) d.textContent = s.textContent;
    }
    syncStat('cmStatCases',  'cdgStatCases');
    syncStat('cmStatMsg',    'cdgStatMsg');
    syncStat('cmStatAlerts', 'cdgStatAlerts');
    syncStat('cmStatNearby', 'cdgStatNearby');

    
    var cmBadge = document.getElementById('cmMsgBadge');
    var cdnBadge = document.getElementById('cdnMsgBadge');
    var cdtMsgBadge = document.getElementById('cdtMsgBadge');
    if (cmBadge && cdnBadge) {
      var shown = cmBadge.style.display !== 'none' && cmBadge.textContent.trim() !== '0';
      cdnBadge.textContent = cmBadge.textContent;
      cdnBadge.style.display = shown ? 'inline-block' : 'none';
    }
    
    if (cmBadge && cdtMsgBadge) {
      var mShown = cmBadge.style.display !== 'none' && cmBadge.textContent.trim() !== '0';
      cdtMsgBadge.textContent = cmBadge.textContent;
      cdtMsgBadge.style.display = mShown ? 'inline-block' : 'none';
    }

    
    var notifEl = document.getElementById('notifCount');
    var cdtNotif = document.getElementById('cdtNotifBadge');
    if (notifEl && cdtNotif) {
      var nShown = notifEl.style.display !== 'none' && notifEl.textContent.trim() !== '0' && notifEl.textContent.trim() !== '';
      cdtNotif.textContent = notifEl.textContent;
      cdtNotif.style.display = nShown ? 'inline-block' : 'none';
    }

    
    var roleEl = document.getElementById('cdtUserRole');
    if (roleEl) {
      var storedRole = localStorage.getItem('lcdjp_userlevel') || sessionStorage.getItem('userRole') || sessionStorage.getItem('currentRole') || 'Citizen';
      if (typeof currentUserRole !== 'undefined' && currentUserRole) storedRole = currentUserRole;
      roleEl.textContent = storedRole.charAt(0).toUpperCase() + storedRole.slice(1);
    }

    
    
    
    
    var adtName = document.getElementById('adtUserName');
    var adtAv = document.getElementById('adtAvatar');
    if (lbl && adtName && lbl.textContent && lbl.textContent !== 'My Account') {
      var admNm = lbl.textContent.trim();
      adtName.textContent = admNm.split(' ')[0] || admNm;
      if (adtAv) {
        var admParts = admNm.split(' ');
        adtAv.textContent = ((admParts[0][0] || '') + (admParts[1] ? admParts[1][0] : '')).toUpperCase() || 'A';
      }
    }

    var adminMsgBadgeEl = document.getElementById('adminMsgBadge');
    var adtMsgBadge = document.getElementById('adtMsgBadge');
    var amMsgBadge = document.getElementById('amMsgBadge');
    if (adminMsgBadgeEl && adtMsgBadge) {
      var admMShown = adminMsgBadgeEl.style.display !== 'none' && adminMsgBadgeEl.textContent.trim() !== '0';
      adtMsgBadge.textContent = adminMsgBadgeEl.textContent;
      adtMsgBadge.style.display = admMShown ? 'inline-block' : 'none';
      if (amMsgBadge) {
        amMsgBadge.textContent = adminMsgBadgeEl.textContent;
        amMsgBadge.style.display = admMShown ? 'flex' : 'none';
      }
    }

    var adtNotif = document.getElementById('adtNotifBadge');
    if (notifEl && adtNotif) {
      var admNShown = notifEl.style.display !== 'none' && notifEl.textContent.trim() !== '0' && notifEl.textContent.trim() !== '';
      adtNotif.textContent = notifEl.textContent;
      adtNotif.style.display = admNShown ? 'inline-block' : 'none';
    }

    
    
    
    

    var adtRoleEl = document.getElementById('adtUserRole');
    if (adtRoleEl) {
      var admLevel = localStorage.getItem('lcdjp_userlevel') || '';
      adtRoleEl.textContent = (admLevel === 'DISTRICT_ADMIN') ? 'District Admin' : 'System Admin';
    }
  }

  
  cdSync();
  setInterval(cdSync, 1500);

  
  var targets = ['cmStatCases','cmStatMsg','cmStatAlerts','cmStatNearby','bannerUserName','accountMenuDropdownLabel','cmMsgBadge','notifCount','adminMsgBadge'];
  var obs = new MutationObserver(cdSync);
  var moOpts = { childList: true, characterData: true, subtree: true, attributes: true };
  function observeTarget(id) {
    var el = document.getElementById(id);
    if (el) obs.observe(el, moOpts);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { targets.forEach(observeTarget); cdSync(); });
  } else {
    targets.forEach(observeTarget);
    cdSync();
  }
})();





(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function serviceType(service) {
    var raw = String(service.type || service.serviceType || service.category || '').toLowerCase();
    if (raw.indexOf('police') !== -1) return 'Police';
    if (raw.indexOf('hospital') !== -1 || raw.indexOf('medical') !== -1) return 'Hospital';
    if (raw.indexOf('court') !== -1) return 'Court';
    if (raw.indexOf('legal') !== -1 || raw.indexOf('law') !== -1) return 'Legal Aid';
    if (raw.indexOf('council') !== -1 || raw.indexOf('lc') !== -1) return 'Local Council';
    return service.type || service.serviceType || 'Public Service';
  }

  var meta = {
    'Local Council': { icon: '', bg: '#e8f0fe' },
    'Police': { icon: '', bg: '#e8eaf6' },
    'Court': { icon: '', bg: '#fff3e0' },
    'Hospital': { icon: '', bg: '#fce4ec' },
    'Legal Aid': { icon: '', bg: '#f3e5f5' },
    'Public Service': { icon: '', bg: '#f4f6f8' }
  };

  function distanceKm(lat1, lng1, lat2, lng2) {
    var r = 6371, rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * rad) * Math.cos(lat2 * rad)
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function distanceLabel(km) {
    return km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km';
  }

  function mapIdFor(type, service) {
    if (service.mapId) return service.mapId;
    return {
      'Local Council': 'localCouncil',
      'Police': 'police',
      'Court': 'courts',
      'Hospital': 'hospitals',
      'Legal Aid': 'legalAid'
    }[type] || null;
  }

  function setMapCounts(services) {
    var counts = { localCouncil: 0, police: 0, courts: 0, hospitals: 0, legalAid: 0 };
    services.forEach(function (service) {
      var type = serviceType(service);
      var key = {
        'Local Council': 'localCouncil',
        'Police': 'police',
        'Court': 'courts',
        'Hospital': 'hospitals',
        'Legal Aid': 'legalAid'
      }[type];
      if (key) counts[key] += 1;
    });
    Object.keys(counts).forEach(function (key) {
      document.querySelectorAll('[data-map-count="' + key + '"]').forEach(function (el) {
        el.textContent = counts[key];
      });
    });
  }

  function renderLocationServices(lat, lng, source) {
    var services = (Array.isArray(source) ? source : []).map(function (service) {
      var serviceLat = parseFloat(service.latitude || service.lat);
      var serviceLng = parseFloat(service.longitude || service.lng || service.lon);
      if (!isFinite(serviceLat) || !isFinite(serviceLng)) return null;
      var copy = Object.assign({}, service);
      copy.lat = serviceLat;
      copy.lng = serviceLng;
      copy.type = serviceType(copy);
      copy._km = distanceKm(lat, lng, serviceLat, serviceLng);
      copy.mapId = mapIdFor(copy.type, copy);
      return copy;
    }).filter(Boolean).sort(function (a, b) { return a._km - b._km; });

    setMapCounts(services);
    window._lcdjpNearbySvcs = services.slice(0, 6);
    var mobileList = document.getElementById('cmNearbyServicesList');
    var desktopList = document.getElementById('cdDesktopNearbyList');
    var visible = services.slice(0, 6);
    if (!visible.length) {
      var empty = '<div class="desktop-nearby-loading">No services were found near your current location.</div>';
      if (mobileList) mobileList.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#888;font-size:11px;">No nearby services found.</div>';
      if (desktopList) desktopList.innerHTML = empty;
      var stat = document.getElementById('cmStatNearby');
      if (stat) stat.textContent = '0';
      return;
    }

    if (mobileList) {
      mobileList.innerHTML = visible.map(function (service, index) {
        var serviceMeta = meta[service.type] || meta['Public Service'];
        var label = service.label || service.name || service.orgName || 'Service';
        return '<div class="cm-nearby-item" style="cursor:pointer;" onclick="window._lcdjpNearbyClick(window._lcdjpNearbySvcs[' + index + '])">'
          + '<div class="cm-nearby-dot" style="background:' + serviceMeta.bg + ';font-size:14px;text-align:center;">' + serviceMeta.icon + '</div>'
          + '<div class="cm-nearby-info"><div class="cm-nearby-name">' + esc(label) + '</div>'
          + '<div class="cm-nearby-type">' + esc(service.type) + '</div></div>'
          + '<div class="cm-nearby-dist">' + distanceLabel(service._km) + '</div></div>';
      }).join('');
    }
    if (desktopList) {
      desktopList.innerHTML = visible.map(function (service, index) {
        var serviceMeta = meta[service.type] || meta['Public Service'];
        var label = service.label || service.name || service.orgName || 'Service';
        return '<div class="desktop-nearby-item" onclick="window._lcdjpNearbyClick(window._lcdjpNearbySvcs[' + index + '])">'
          + '<div class="desktop-nearby-icon" style="background:' + serviceMeta.bg + ';">' + serviceMeta.icon + '</div>'
          + '<div class="desktop-nearby-copy"><div class="desktop-nearby-name">' + esc(label) + '</div>'
          + '<div class="desktop-nearby-type">' + esc(service.type) + '</div></div>'
          + '<div class="desktop-nearby-distance">' + distanceLabel(service._km) + '</div>'
          + '<span style="color:#9ca3af;font-size:16px;">›</span></div>';
      }).join('');
    }
    var stat = document.getElementById('cmStatNearby');
    if (stat) stat.textContent = String(visible.length);
  }

  function loadingNearby() {
    var mobileList = document.getElementById('cmNearbyServicesList');
    var desktopList = document.getElementById('cdDesktopNearbyList');
    if (mobileList) mobileList.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#888;font-size:11px;">Detecting your location…</div>';
    if (desktopList) desktopList.innerHTML = '<div class="desktop-nearby-loading">Detecting your location…</div>';
  }

  
  function _showNoServices(msg) {
    var _ml = document.getElementById('cmNearbyServicesList');
    var _dl = document.getElementById('cdDesktopNearbyList');
    var txt = msg || 'No registered services found near this location.';
    if (_ml) _ml.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#64748b;font-size:11px;">' + txt + '</div>';
    if (_dl) _dl.innerHTML = '<div class="desktop-nearby-loading">' + txt + '</div>';
  }

  
  
  
  
  
  
  
  
  
  
  var _nearbyLiveMapQueries = [
    { type: 'local_government_office', label: 'Local Council' },
    { type: 'police',                  label: 'Police' },
    { type: 'lawyer',                  label: 'Legal Aid' },
    { type: 'courthouse',              label: 'Court' },
    { type: 'hospital',                label: 'Hospital' }
  ];

  function _nearbyFetchLiveMap(lat, lng, radiusMeters) {
    return loadGoogleMapsSDK().then(function () {
      // Shared helper in maps.js: uses Places API (New), falls back to legacy PlacesService.
      if (typeof window.lcdjpPlacesNearby !== 'function') return [];
      var pending = _nearbyLiveMapQueries.map(function (q) {
        return new Promise(function (resolve) {
          window.lcdjpPlacesNearby({
            center: { lat: lat, lng: lng },
            radiusM: Math.min(radiusMeters, 50000),
            type: q.type,
            max: 8
          }, function (items) {
            resolve((items || []).map(function (place) {
              return {
                latitude: place.lat,
                longitude: place.lng,
                label: place.name || q.label,
                type: q.label,
                place_id: place.place_id || ''
              };
            }));
          });
        });
      });
      return Promise.all(pending).then(function (lists) { return [].concat.apply([], lists); });
    }).catch(function () { return []; });
  }

  function fetchNearbyAtLocation(lat, lng) {
    _nearbyFetchLiveMap(lat, lng, 20000).then(function (results) {
        if (results.length) { renderLocationServices(lat, lng, results); return; }
        
        
        
        
        _nearbyFetchLiveMap(lat, lng, 50000).then(function (wider) {
            if (wider.length) renderLocationServices(lat, lng, wider);
            else _showNoServices('No services found on the map near this location.');
        });
    }).catch(function () {
        _showNoServices('Could not load services. Check your connection.');
    });
}

  
  window._lcdjpFetchNearby   = fetchNearbyAtLocation;
  window._lcdjpRenderNearby  = renderLocationServices;
  window._lcdjpLoadingNearby = loadingNearby;

  window.initNearbyServices = function () {
    loadingNearby();

    
    
    
    
    
    
    
    if (window._lcdjpUserPosition &&
        isFinite(window._lcdjpUserPosition.lat) && isFinite(window._lcdjpUserPosition.lng)) {
      fetchNearbyAtLocation(window._lcdjpUserPosition.lat, window._lcdjpUserPosition.lng);
      return;
    }

    if (!navigator.geolocation) {
      var noGeo = '<div class="desktop-nearby-loading">Location access is required to show nearby services.</div>';
      var desktopList = document.getElementById('cdDesktopNearbyList');
      var mobileList = document.getElementById('cmNearbyServicesList');
      if (desktopList) desktopList.innerHTML = noGeo;
      if (mobileList) mobileList.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#888;font-size:11px;">Allow location access to find services.</div>';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (position) { fetchNearbyAtLocation(position.coords.latitude, position.coords.longitude); },
      function () {
        var desktopList = document.getElementById('cdDesktopNearbyList');
        var mobileList = document.getElementById('cmNearbyServicesList');
        if (desktopList) desktopList.innerHTML = '<div class="desktop-nearby-loading">Location unavailable. Allow access to find services near you.</div>';
        if (mobileList) mobileList.innerHTML = '<div class="cm-nearby-item" style="justify-content:center;color:#888;font-size:11px;">Location unavailable.</div>';
        var stat = document.getElementById('cmStatNearby');
        if (stat) stat.textContent = '0';
      },
      
      
      
      
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  };

  
  
  
  
  
  
  
  
  window.toggleChat = function () {
    var chatWindow = document.getElementById('chatWindow');
    var labels = document.getElementById('chatLabels');
    var container = document.getElementById('chatContainer');
    if (!chatWindow) return;
    var opening = chatWindow.style.display !== 'flex';
    chatWindow.style.display = opening ? 'flex' : 'none';
    if (labels) labels.style.display = opening ? 'none' : '';
    
    
    
    
    
    if (container) container.classList.toggle('lcdjp-chat-open', opening);

    
    
    
    
    
    if (opening) {
        if (typeof window._loadSupportChatHistory === 'function') window._loadSupportChatHistory();
        if (window._supportChatHistoryTimer) clearInterval(window._supportChatHistoryTimer);
        window._supportChatHistoryTimer = setInterval(function () {
            if (typeof window._loadSupportChatHistory === 'function') window._loadSupportChatHistory();
        }, 8000);
    } else if (window._supportChatHistoryTimer) {
        clearInterval(window._supportChatHistoryTimer);
        window._supportChatHistoryTimer = null;
    }
  };

  
  
  
  window._renderSupportChatMessages = function (msgs, username) {
    var messagesEl = document.getElementById('chatMessages');
    if (!messagesEl) return;
    if (!msgs.length) {
        messagesEl.innerHTML = '<div class="welcome-msg" style="text-align:center; color:#6b7280; padding:15px 0; font-size:13px; display:flex; flex-direction:column; align-items:center; gap:3px;">' +
            '<div style="font-weight:500; color:#999; font-size:13px;">Welcome to JusticeLink Support</div>' +
            '<div style="font-size:12px; color:#6b7280;">Send us a message</div>' +
        '</div>';
        return;
    }
    msgs.sort(function (a, b) { return new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0); });
    messagesEl.innerHTML = msgs.map(function (m) {
        
        
        var fromUser = m.from_user || m.fromUser || m.from || '';
        var isMine = fromUser === username;
        var text = m.message || m.text || m.message_text || '';
        var audioSrc = m.audio_data || m.audioData || '';
        var style = isMine
            ? 'margin:4px 0 4px auto;background:#1a4080;color:#fff;border-radius:12px 12px 2px 12px;'
            : 'margin:4px auto 4px 0;background:#eef1f6;color:#333;border-radius:12px 12px 12px 2px;';
        return '<div style="' + style + 'padding:6px 10px;max-width:80%;font-size:13px;word-wrap:break-word;">' +
            (audioSrc && /^(data:audio\/|\/api\/voice\/)/.test(audioSrc)
                ? '<audio controls preload="none" src="' + audioSrc + '" style="height:28px;max-width:100%;"></audio>'
                : (typeof _cmEsc === 'function' ? _cmEsc(text) : text)) +
        '</div>';
    }).join('');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  window._loadSupportChatHistory = async function () {
    var username = typeof getLcdjpActiveUsername === 'function'
        ? getLcdjpActiveUsername()
        : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!username) return;
    try {
        var resp = await fetch(API_ENDPOINTS.chatUserMessages(username), {
            method: 'GET',
            headers: (typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' })
        });
        if (!resp.ok) return;
        var raw = await resp.json();
        var msgs = Array.isArray(raw) ? raw : (raw.messages || []);
        window._renderSupportChatMessages(msgs, username);
    } catch (e) {
        console.error('Error loading support chat history:', e);
    }
  };

  window.openEmbeddedSupportChat = function () {
    var container = document.getElementById('chatContainer');
    var labels = document.getElementById('chatLabels');
    var chatWindow = document.getElementById('chatWindow');
    if (!container || !chatWindow) return;
    container.style.display = 'block';
    container.classList.add('lcdjp-chat-open');
    if (labels) labels.style.display = 'none';
    if (chatWindow.style.display !== 'flex') {
      if (typeof toggleChat === 'function') toggleChat();
      else chatWindow.style.display = 'flex';
    }
  };

  window.sendChatMessage = function () {
    var input = document.getElementById('chatInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    if (!username) {
      if (typeof showToast === 'function') showToast('Please sign in to send a message.');
      else alert('Please sign in to send a message.');
      return;
    }

    var fullname = sessionStorage.getItem('lcdjp_fullname') || username;
    var userLevel = sessionStorage.getItem('lcdjp_userlevel') || 'Citizen';

    var messagesEl = document.getElementById('chatMessages');
    if (messagesEl) {
      var welcome = messagesEl.querySelector('.welcome-msg');
      if (welcome) welcome.remove();
      var bubble = document.createElement('div');
      bubble.style.cssText = 'margin:4px 0 4px auto;padding:6px 10px;background:#1a4080;color:#fff;' +
        'border-radius:12px 12px 2px 12px;max-width:80%;font-size:13px;word-wrap:break-word;';
      bubble.textContent = text;
      messagesEl.appendChild(bubble);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    input.value = '';

    var payload = {
      fromName: fullname,
      fromRole: userLevel,
      message: text,
      type: 'text',
      sentTo: 'admin',
      timestamp: new Date().toISOString(),
      isRead: false,
      delivered: false,
      reply: null,
      replyTimestamp: null
    };

    fetch(API_ENDPOINTS.chatMessages, {
      method: 'POST',
      headers: (typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    }).then(function (resp) {
      
      
      
      
      if (resp.ok && typeof window._loadSupportChatHistory === 'function') {
        window._loadSupportChatHistory();
      }

    }).catch(function (err) {
      console.error('Error sending chat message:', err);
      if (messagesEl) {
        var errNote = document.createElement('div');
        errNote.style.cssText = 'text-align:center;font-size:9px;color:#dc3545;margin:4px 0;';
        errNote.textContent = 'Message could not be sent. Please check your connection and try again.';
        messagesEl.appendChild(errNote);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });
  };

  window.openCitizenDesktopMessages = function () {
    if (window.innerWidth < 768) {
      if (typeof openMobileSection === 'function') openMobileSection('citizen', 'Messages', mobileCitizenMessages);
      return;
    }
    var old = document.getElementById('desktopCitizenMessagesPanel');
    if (old) old.remove();
    var panel = document.createElement('div');
    panel.id = 'desktopCitizenMessagesPanel';
    panel.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(11,18,50,.42);display:flex;align-items:flex-start;justify-content:flex-end;padding:76px 24px 24px;';
    panel.innerHTML = '<section style="width:min(460px,calc(100vw - 48px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 55px rgba(0,0,0,.22);">'
      + '<header style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #edf0f6;"><div><h2 style="margin:0;color:#111827;font-size:18px;">Messages</h2><p style="margin:4px 0 0;color:#7b8292;font-size:12px;">Open a case conversation to read and send messages.</p></div><button type="button" aria-label="Close" style="border:0;background:#f3f4f6;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;">&times;</button></header>'
      + '<div id="desktopCitizenMessageList" style="padding:16px 20px;">Loading conversations…</div></section>';
    panel.querySelector('button').onclick = function () { panel.remove(); };
    panel.addEventListener('click', function (event) { if (event.target === panel) panel.remove(); });
    document.body.appendChild(panel);
    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    var list = panel.querySelector('#desktopCitizenMessageList');
    if (!username || typeof API_ENDPOINTS === 'undefined' || typeof API_ENDPOINTS.citizenCases !== 'function') {
      list.textContent = 'Please sign in to view messages.';
      return;
    }
    if (typeof window._lcdjpProtectedDataAccessAllowed === 'function' &&
        !window._lcdjpProtectedDataAccessAllowed()) {
      list.textContent = 'Identity verification is required to view case conversations.';
      return;
    }
      fetch(API_ENDPOINTS.citizenCases(username), {
        suppressAuthRedirect: true,
        headers: getAuthHeaders()
      })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        var cases = payload && payload.success && Array.isArray(payload.cases) ? payload.cases : (Array.isArray(payload) ? payload : []);
        if (!cases.length) { list.textContent = 'No case conversations yet.'; return; }
        list.innerHTML = cases.map(function (item) {
          var ref = item.case_reference || item.caseReference || item.case_number || item.caseNumber || (item.id ? String(item.id) : '') || '';
          var title = item.case_type || item.caseType || 'Case conversation';
          return '<article style="padding:13px 0;border-bottom:1px solid #edf0f6;"><strong style="display:block;color:#1a237e;font-size:13px;">' + esc(title) + '</strong><span style="display:block;margin:4px 0 9px;color:#7b8292;font-size:11px;">' + esc(ref) + '</span><button type="button" data-case-id="' + esc(ref) + '" style="border:0;border-radius:8px;background:#1a237e;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;">Open conversation</button></article>';
        }).join('');
        list.querySelectorAll('[data-case-id]').forEach(function (button) {
          button.onclick = function () {
            panel.remove();
            if (typeof openCitizenMessaging === 'function') openCitizenMessaging(button.getAttribute('data-case-id'));
          };
        });
      })
      .catch(function () { list.textContent = 'Messages could not be loaded. Please try again.'; });
  };

  
  
  
  
  window.openLawyerDesktopMessages = function () {
    if (window.innerWidth < 768) {
      if (typeof mobileLawyerMessages === 'function') mobileLawyerMessages();
      return;
    }
    var old = document.getElementById('desktopLawyerMessagesPanel');
    if (old) old.remove();
    var panel = document.createElement('div');
    panel.id = 'desktopLawyerMessagesPanel';
    panel.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(11,18,50,.42);display:flex;align-items:flex-start;justify-content:flex-end;padding:76px 24px 24px;';
    panel.innerHTML = '<section style="width:min(460px,calc(100vw - 48px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 55px rgba(0,0,0,.22);">'
      + '<header style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #edf0f6;"><div><h2 style="margin:0;color:#111827;font-size:18px;">Messages</h2><p style="margin:4px 0 0;color:#7b8292;font-size:12px;">Open a case conversation to read and send messages.</p></div><button type="button" aria-label="Close" style="border:0;background:#f3f4f6;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;">&times;</button></header>'
      + '<div id="desktopLawyerMessageList" style="padding:16px 20px;">Loading conversations…</div></section>';
    panel.querySelector('button').onclick = function () { panel.remove(); };
    panel.addEventListener('click', function (event) { if (event.target === panel) panel.remove(); });
    document.body.appendChild(panel);
    var username = typeof getLcdjpActiveUsername === 'function'
      ? getLcdjpActiveUsername()
      : (sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username'));
    var list = panel.querySelector('#desktopLawyerMessageList');
    var _lvl = sessionStorage.getItem('lcdjp_userlevel') || '';
    var _isLcUser = _lvl === 'LC' || _lvl === 'LC Official' || _lvl === 'LC1' || _lvl === 'LC2' || _lvl === 'LC3';
    var _casesFn = (_isLcUser && typeof API_ENDPOINTS !== 'undefined' && typeof API_ENDPOINTS.lcCases === 'function')
      ? API_ENDPOINTS.lcCases
      : (typeof API_ENDPOINTS !== 'undefined' ? API_ENDPOINTS.lawyerCases : null);
    if (!username || typeof _casesFn !== 'function') {
      list.textContent = 'Please sign in to view messages.';
      return;
    }
    fetch(_casesFn(username), {
      suppressAuthRedirect: true,
      headers: getAuthHeaders()
    })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        var cases = payload && payload.success && Array.isArray(payload.cases) ? payload.cases : (Array.isArray(payload) ? payload : []);
        if (!cases.length) { list.textContent = 'No case conversations yet.'; return; }
        list.innerHTML = cases.map(function (item) {
          var ref = item.case_reference || item.caseReference || item.case_number || item.caseNumber || (item.id ? String(item.id) : '') || '';
          var title = item.case_type || item.caseType || 'Case conversation';
          var citizen = item.citizenName || item.citizen_name || '';
          return '<article style="padding:13px 0;border-bottom:1px solid #edf0f6;"><strong style="display:block;color:#1a237e;font-size:13px;">' + esc(title) + '</strong><span style="display:block;margin:4px 0 9px;color:#7b8292;font-size:11px;">' + (citizen ? esc(citizen) + ' &middot; ' : '') + esc(ref) + '</span><button type="button" data-case-id="' + esc(ref) + '" style="border:0;border-radius:8px;background:#1a237e;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;">Open conversation</button></article>';
        }).join('');
        list.querySelectorAll('[data-case-id]').forEach(function (button) {
          button.onclick = function () {
            panel.remove();
            if (typeof lawyerSendMessage === 'function') lawyerSendMessage(button.getAttribute('data-case-id'));
            else if (typeof openCitizenMessaging === 'function') openCitizenMessaging(button.getAttribute('data-case-id'));
          };
        });
      })
      .catch(function () { list.textContent = 'Messages could not be loaded. Please try again.'; });
  };

  window.openDesktopReportCase = function () {
    
    
    
    
    if (typeof _lcdjpHasApprovedVerification === 'function' && !_lcdjpHasApprovedVerification()) {
      if (typeof requireAuth === 'function') requireAuth('reportCase');
      return;
    }
    if (typeof window.openReportCaseAssistant === 'function') {
      window.openReportCaseAssistant();
    } else if (typeof window.openAIAssistant === 'function') {
      window.openAIAssistant(undefined, 'report');
    }
  };

  
  function startCitizenDesktopFeatures() {
    
    if (!isAuthenticated()) {
        console.log('[LCDJP] Not authenticated - skipping citizen desktop features');
        return false;
    }
    
    if (document.body.classList.contains('citizen-dashboard-mode')) {
        console.log('[LCDJP] Starting citizen desktop features');
        
        
        if (typeof window.initNearbyServices === 'function') {
            window.initNearbyServices();
        }
        
        
        if (typeof window.initCitizenMobileMap === 'function') {
            setTimeout(function () { 
                
                if (isAuthenticated()) {
                    window.initCitizenMobileMap(false); 
                }
            }, 250);
        }
        return true;
    }
    return false;
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { 
        setTimeout(function() {
            
            if (isAuthenticated()) {
                startCitizenDesktopFeatures();
            }
        }, 450); 
    });
} else {
    setTimeout(function() {
        if (isAuthenticated()) {
            startCitizenDesktopFeatures();
        }
    }, 450);
}


var bodyObserver = new MutationObserver(function () {
    if (isAuthenticated()) {
        if (startCitizenDesktopFeatures()) {
            bodyObserver.disconnect();
        }
    }
});
bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });


var originalMapFilter = window.cmMapFilter;
if (typeof originalMapFilter === 'function') {
    window.cmMapFilter = function (event, id) {
        
        if (!isAuthenticated()) {
            console.log('[LCDJP] Skipping map filter - not authenticated');
            return;
        }
        
        if (window._lcdjpMapGroups || id === 'all') {
            originalMapFilter(event, id);
            return;
        }
        
        
        if (typeof window.initCitizenMobileMap === 'function') {
            window.initCitizenMobileMap(false);
        }
        
        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            if (window._lcdjpMapGroups) {
                clearInterval(timer);
                originalMapFilter(event, id);
            } else if (tries > 30) {
                clearInterval(timer);
            }
        }, 200);
    };
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { 
        setTimeout(function() {
            
            if (isAuthenticated()) {
                startCitizenDesktopFeatures();
            }
        }, 450); 
    });
} else {
    setTimeout(function() {
        if (isAuthenticated()) {
            startCitizenDesktopFeatures();
        }
    }, 450);
}


var bodyObserver = new MutationObserver(function () {
    if (isAuthenticated()) {
        if (startCitizenDesktopFeatures()) {
            bodyObserver.disconnect();
        }
    }
});
bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });


var originalMapFilter = window.cmMapFilter;
if (typeof originalMapFilter === 'function') {
    window.cmMapFilter = function (event, id) {
        
        if (!isAuthenticated()) {
            console.log('[LCDJP] Skipping map filter - not authenticated');
            return;
        }
        
        if (window._lcdjpMapGroups || id === 'all') {
            originalMapFilter(event, id);
            return;
        }
        
        if (typeof window.initCitizenMobileMap === 'function') {
            window.initCitizenMobileMap(false);
        }
        
        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            if (window._lcdjpMapGroups) {
                clearInterval(timer);
                originalMapFilter(event, id);
            } else if (tries > 30) {
                clearInterval(timer);
            }
        }, 200);
    };
}
}());