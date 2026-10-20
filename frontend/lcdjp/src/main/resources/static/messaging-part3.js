
async function updateLawyerDashboardCases() {
    let table = document.getElementById("lawyerCasesTable");
    if (!table) return;
    table.innerHTML = "";
    const _mCards = document.getElementById('lawyerMobileCards');
    if (_mCards) _mCards.innerHTML = '';

    
    
    
    
    
    
    
    
    
    
    
    
    
    const _lawyerUsernameForFetch = sessionStorage.getItem('lcdjp_username');

    
    
    
    
    
    
    
    
    
    
    
    const _cachedProfile = (window._lcdjpProfileCache &&
        window._lcdjpProfileCache.username === _lawyerUsernameForFetch &&
        (Date.now() - window._lcdjpProfileCache.ts) < 5000)
        ? window._lcdjpProfileCache.data
        : null;
    if (_cachedProfile) window._lcdjpProfileCache = null;

    const _offersRequest = _lawyerFetchAiOffers();
    const _userRequest = _cachedProfile
        ? Promise.resolve({ ok: true, json: function () { return Promise.resolve(_cachedProfile); } })
        : (_lawyerUsernameForFetch
            ? fetch(API_ENDPOINTS.user(_lawyerUsernameForFetch), { headers: getAuthHeaders() })
            : null);
    const _casesRequest = _lawyerUsernameForFetch
        ? fetch(API_ENDPOINTS.availableLawyerCases(_lawyerUsernameForFetch), { headers: getAuthHeaders() })
        : null;

    const _allMatchedOffers = await _offersRequest;
    const _offerSearchText = (document.getElementById('lawyerCaseSearch')?.value || document.getElementById('lmCaseSearch')?.value || '').toLowerCase();
    const _matchedOffers = _offerSearchText ? _allMatchedOffers.filter(function (c) {
        const _offerSearchable = [c.caseId, c.citizenName, c.village, c.parish || c.district, c.caseType]
            .filter(Boolean).join(' ').toLowerCase();
        return _offerSearchable.includes(_offerSearchText);
    }) : _allMatchedOffers;
    let offersRowsHtml = '';
    let offersCardsHtml = '';
    _matchedOffers.forEach(function (c) {
        const citizen = c.citizenName || 'Unknown';
        const loc = [c.village, c.parish || c.district].filter(Boolean).join(', ') || 'N/A';
        offersRowsHtml += `
                <tr style="background: #fff8e1; border-left: 4px solid #ff9800;">
                    <td><strong>${escapeHtml(c.caseId || '')}</strong> <span class="badge badge-warning">New</span></td>
                    <td>${escapeHtml(c.caseType || 'N/A')}</td>
                    <td><strong>${escapeHtml(citizen)}</strong></td>
                    <td>${escapeHtml(loc)}</td>
                    <td><span class="badge badge-warning">Awaiting Acceptance</span></td>
                    <td>
                        <button onclick="aiOfferAccept(${escapeHtml(JSON.stringify(String(c.caseId || '')))})" class="btn btn-sm btn-success" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Accept</button>
                        <button onclick="aiOfferDecline(${escapeHtml(JSON.stringify(String(c.caseId || '')))})" class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Decline</button>
                    </td>
                </tr>`;
        if (_mCards) {
            offersCardsHtml += `<div class="lm-case">
  <div class="lm-case-head"><div><div class="lm-eyebrow">Case ID</div><div class="lm-case-id">${escapeHtml(c.caseId || '')}</div></div>
  <span class="lm-badge lm-badge-orange">Awaiting Acceptance</span></div>
  <div class="lm-case-type">${escapeHtml(c.caseType || 'N/A')}</div>
  <div class="lm-details">
    <div><label>Citizen</label><strong>${escapeHtml(citizen)}</strong></div>
    <div><label>Location</label><strong>${loc}</strong></div>
  </div><div class="lm-case-actions">
    <button class="lm-btn lm-btn-success" onclick="aiOfferAccept(${escapeHtml(JSON.stringify(String(c.caseId || '')))})">&#10003; Accept</button>
    <button class="lm-btn lm-btn-danger" onclick="aiOfferDecline(${escapeHtml(JSON.stringify(String(c.caseId || '')))})">&#10007; Decline</button>
  </div></div>`;
        }
    });
    table.innerHTML = offersRowsHtml;
    if (_mCards) _mCards.innerHTML = offersCardsHtml;

    let searchText = (document.getElementById('lawyerCaseSearch')?.value || document.getElementById('lmCaseSearch')?.value || '').toLowerCase();

    let totalCases = _matchedOffers.length;
    let activeCases = _matchedOffers.length;
    let resolvedCases = 0;

    try {
        const currentUsername = sessionStorage.getItem('lcdjp_username');
        if (!currentUsername) {
            if (typeof showAlert === 'function') showAlert('Please login first', 'error'); else if (typeof showToast === 'function') showToast('Please login first');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            showAlert('Authentication token not found', 'error');
            return;
        }

        
        
        
        const userResponse = await _userRequest;

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user details');
        }

        const userResult = await userResponse.json();
        const currentUser = userResult.user || {};
        const currentLawyerSpecialization = currentUser.specialization || '';
        
        const lawyerLocation = {
            district: currentUser.district || '',
            county: currentUser.county || '',
            subCounty: currentUser.subCounty || '',
            parish: currentUser.parish || '',
            village: currentUser.village || ''
        };

        
        
        const casesResponse = await _casesRequest;

        if (!casesResponse.ok) {
            throw new Error('Failed to fetch lawyer cases');
        }

        const data = await casesResponse.json();
        
        let cases = [];
        if (data.success === true && Array.isArray(data.cases)) {
            cases = data.cases;
        } else if (Array.isArray(data)) {
            cases = data;
        } else if (data.data && Array.isArray(data.data)) {
            cases = data.data;
        } else {
            console.warn('Unexpected cases response format:', data);
            cases = [];
        }

        
        
        
        
        
        
        
        
        
        
        
        let _rowsHtml = '';
        let _cardsHtml = '';
        cases.forEach(function(c) {

            
            
            
            
            
            
            const caseRef = getCaseReference(c) || c.caseId || '';

            
            
            
            
            const _cVillage  = c.village    || c.villageRaw    || c.villageDisplay    || '';
            const _cParish   = c.parish     || c.parishRaw     || c.parishDisplay     || '';
            const _cSubCounty = c.subCounty || c.subCountyRaw  || c.subCountyDisplay  || '';
            const _cDistrict = c.district   || c.districtRaw   || c.districtDisplay   || '';

            let searchableText = [
                caseRef, c.case_type, c.citizen_name, c.citizen_id,
                _cVillage, _cParish, _cSubCounty, _cDistrict, c.status
            ].filter(Boolean).join(' ').toLowerCase();
            if (searchText && !searchableText.includes(searchText)) {
                return;
            }

           
            const isAssignedToThisLawyer = c.assigned_lawyer === currentUsername;
            const isSelectedForCase = c.selected_lawyer === currentUsername && c.selected_lawyer_status === 'Pending';
            const isAtLawyerLevel = c.current_level === "Lawyer Panel Desk" || c.assigned_level === "Lawyer Panel Desk";
            
            const caseLocation = {
                district: _cDistrict,
                subCounty: _cSubCounty,
                parish: _cParish
            };
            
            const sameDistrict = lawyerLocation.district && caseLocation.district && 
                                 lawyerLocation.district.toLowerCase() === caseLocation.district.toLowerCase();
            
            
            if (!isAssignedToThisLawyer && !isSelectedForCase && !sameDistrict) {
                return;
            }

            totalCases++;
            
            let isResolved = (c.status === "Resolved" || c.status === "Closed");
            let isAccepted = (c.status === "Accepted by Lawyer");
            let isPendingAcceptance = isSelectedForCase && c.selected_lawyer_status === 'Pending';
            
            
            const locationBadge = `
                <span style="font-size:10px; background:${sameDistrict ? '#d4edda' : '#fff3cd'}; padding:2px 8px; border-radius:10px; color:#666; display:inline-block;">
                     ${sameDistrict ? 'Local' : 'Other District'}
                </span>
            `;
            
            if (isResolved) {
                resolvedCases++;
                _rowsHtml += `
                <tr>
                    <td><strong>${caseRef}</strong></td>
                    <td>${escapeHtml(c.case_type || 'N/A')}</td>
                    <td>${escapeHtml(c.citizen_name || c.citizen_id || 'Unknown')}</td>
                    <td>${escapeHtml(_cVillage || 'N/A')}, ${escapeHtml(_cParish || 'N/A')} ${locationBadge}</td>
                    <td><span class="badge badge-resolved">Resolved</span></td>
                    <td>
                        <button onclick="viewCase(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>
                    </td>
                </tr>`;
                
            } else if (isAccepted) {
                activeCases++;
                _rowsHtml += `
                <tr>
                    <td><strong>${escapeHtml(caseRef)}</strong></td>
                    <td>${escapeHtml(c.case_type || 'N/A')}</td>
                    <td>${escapeHtml(c.citizen_name || c.citizen_id || 'Unknown')}</td>
                    <td>${escapeHtml(_cVillage || 'N/A')}, ${escapeHtml(_cParish || 'N/A')} ${locationBadge}</td>
                    <td><span class="badge badge-success">Accepted</span></td>
                    <td>
                        <button onclick="viewCase(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>
                        <button onclick="openLegalAdvice(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm" style="background:#1a237e;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;" title="You are the current handler for this case">Advice</button>
                        <button onclick="resolveCase(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm" style="background:#1a237e;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Resolve</button>
                        <button onclick="lawyerSendMessage(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm" style="background:#1a237e;color:white;border:none;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Message</button>
                        <button onclick="showLawyerForwardForm(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm" style="background:#fff;color:#1565c0;border:1px solid #1565c0;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Forward</button>
                    </td>
                </tr>`;
                
            } else if (isPendingAcceptance) {
                activeCases++;
                _rowsHtml += `
                <tr style="background: #fff8e1; border-left: 4px solid #ff9800;">
                    <td><strong>${escapeHtml(caseRef)}</strong> <span class="badge badge-warning">New</span></td>
                    <td>${escapeHtml(c.case_type || 'N/A')}</td>
                    <td><strong>${escapeHtml(c.citizen_name || c.citizen_id || 'Unknown')}</strong> <small style="color:#888;">Selected you</small></td>
                    <td>${escapeHtml(_cVillage || 'N/A')}, ${escapeHtml(_cParish || 'N/A')} ${locationBadge}</td>
                    <td><span class="badge badge-warning">Awaiting Acceptance</span></td>
                    <td>
                        <button onclick="viewCase(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;" title="View case, Accept/Decline inside">View</button>
                         <button onclick="acceptSelectedCase(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm btn-success" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Accept</button>
                         <button onclick="declineSelectedCase(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">Decline</button>
                    </td>
                </tr>`;
                
            } else {
                activeCases++;
                
               
                const canAccept = !isAssignedToThisLawyer && !isSelectedForCase && 
                                  (isAtLawyerLevel || sameDistrict) && 
                                  c.status !== 'Resolved' && c.status !== 'Closed';
                
                _rowsHtml += `
                <tr>
                    <td><strong>${escapeHtml(caseRef)}</strong></td>
                    <td>${escapeHtml(c.case_type || 'N/A')}</td>
                    <td>${escapeHtml(c.citizen_name || c.citizen_id || 'Unknown')}</td>
                    <td>${escapeHtml(_cVillage || 'N/A')}, ${escapeHtml(_cParish || 'N/A')} ${locationBadge}</td>
                    <td><span class="badge badge-info">${escapeHtml(c.status || 'Pending')}</span></td>
                    <td>
                        <button onclick="viewCase(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm" style="background:#fff;color:#1a237e;border:1px solid #1a237e;padding:2px 6px;font-size:11px;border-radius:3px;margin:1px;">View</button>
                        ${canAccept ? `
                            <button onclick="acceptAvailableCase(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn btn-sm btn-success">Accept</button>
                        ` : ''}
                    </td>
                </tr>`;
            }
            
            if (_mCards) {
                const _mRef  = caseRef;
                const _mStat = c.status || 'Pending';
                const _mBadgeColor = isResolved          ? '#28a745'
                                    : isPendingAcceptance ? '#ff9800'
                                    : '#1a4080';
                const _mCitizen = c.citizen_name || c.citizen_id || 'Unknown';
                const _mLoc = [_cVillage, _cParish].filter(Boolean).join(', ') || 'N/A';
                const _mOther = lawyerLocation.district && _cDistrict &&
                                lawyerLocation.district.toLowerCase() !== _cDistrict.toLowerCase();
                const _canAccM = !isAssignedToThisLawyer && !isSelectedForCase &&
                                 (isAtLawyerLevel || sameDistrict) &&
                                 c.status !== 'Resolved' && c.status !== 'Closed';

                
                
                
                const _lmPill = function (label, color, onclick, solid) {
                    return '<button type="button" onclick="' + onclick + '" ' +
                        'style="flex:1;min-width:70px;padding:7px 0;font-size:12px;border-radius:8px;cursor:pointer;' +
                        (solid
                            ? 'background:' + color + ';color:#fff;border:1px solid ' + color + ';'
                            : 'background:#fff;color:' + color + ';border:1px solid ' + color + ';') +
                        '">' + label + '</button>';
                };

                let _mActs = '';
                if (isPendingAcceptance) {
                    _mActs = _lmPill('Accept', '#28a745', "acceptSelectedCase('" + _mRef + "')", true) +
                             _lmPill('Decline', '#dc3545', "declineSelectedCase('" + _mRef + "')", true) +
                             _lmPill('View', '#16305c', "viewCase('" + _mRef + "')", false);
                } else if (isAccepted) {
                    _mActs = _lmPill('View', '#16305c', "viewCase('" + _mRef + "')", false) +
                             _lmPill('Advise', '#23508f', "openLegalAdvice('" + _mRef + "')", false) +
                             _lmPill('Message', '#2c5fa3', "lawyerSendMessage('" + _mRef + "')", false) +
                             _lmPill('Resolve', '#3a6bc7', "resolveCase('" + _mRef + "')", false) +
                             _lmPill('Forward', '#1565c0', "showLawyerForwardForm('" + _mRef + "')", false);
                } else if (isResolved) {
                    _mActs = _lmPill('View', '#16305c', "viewCase('" + _mRef + "')", false);
                } else {
                    _mActs = _lmPill('View', '#16305c', "viewCase('" + _mRef + "')", false) +
                             (_canAccM ? _lmPill('Accept', '#28a745', "acceptAvailableCase('" + _mRef + "')", true) : '');
                }

                const _mOtherChip = _mOther
                    ? '<span style="display:inline-flex;align-items:center;margin-left:6px;padding:2px 8px;' +
                      'background:#fff3cd;color:#af7100;border-radius:10px;font-size:10px;font-weight:700;">Other District</span>'
                    : '';

                _cardsHtml += '<article class="lm-case" style="background:#fff;border:none;border-radius:12px;' +
                    'box-shadow:0 1px 6px rgba(0,0,0,.08);padding:14px 16px;margin-top:12px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
                        '<div>' +
                            '<strong style="font-size:14px;color:#1a237e;">' + _mRef + '</strong>' +
                            '<div style="font-size:12px;color:#555;margin-top:2px;">' + (c.case_type || 'N/A') + '</div>' +
                        '</div>' +
                        '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:12px;' +
                              'background:' + _mBadgeColor + ';color:#fff;white-space:nowrap;">' + _mStat + '</span>' +
                    '</div>' +
                    '<div style="font-size:12px;color:#555;margin-top:10px;">' +
                        '<strong style="color:#142047;">' + _mCitizen + '</strong> &middot; ' + _mLoc + _mOtherChip +
                    '</div>' +
                    '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">' + _mActs + '</div>' +
                '</article>';
            }
        });

        
        
        table.innerHTML += _rowsHtml;
        if (_mCards) _mCards.innerHTML += _cardsHtml;

        
        document.getElementById("lawyerTotalCases").innerHTML = totalCases;
        document.getElementById("lawyerActiveCases").innerHTML = activeCases;
        document.getElementById("lawyerResolvedCases").innerHTML = resolvedCases;
        const _lmT = document.getElementById('lmTotalCases');
        const _lmA = document.getElementById('lmActiveCases');
        const _lmR = document.getElementById('lmResolvedCases');
        if (_lmT) _lmT.textContent = totalCases;
        if (_lmA) _lmA.textContent = activeCases;
        if (_lmR) _lmR.textContent = resolvedCases;
        if (_mCards && !_mCards.innerHTML.trim()) {
            _mCards.innerHTML = searchText
                ? '<p style="text-align:center;color:#667085;padding:24px 0;">No cases match your search.</p>'
                : '<p style="text-align:center;color:#667085;padding:24px 0;">No assigned referrals found.</p>';
        }
        if (table && !table.innerHTML.trim()) {
            table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">
                ${searchText ? 'No cases match your search.' : 'No assigned referrals found.'}
            </td></tr>`;
        }

        
        
        
        
        
        
        
        
        if (_mCards) {
            const _inCasesOverlay = !!_mCards.closest('#mobileFullPage');
            if (_inCasesOverlay) {
                _mCards.classList.remove('lmc-collapsed');
            } else {
                _mCards.classList.add('lmc-collapsed');
            }
            const _moreLink = document.getElementById('lawyerMobileCardsMore');
            if (_moreLink) {
                const _totalCardCount = _mCards.querySelectorAll('.lm-case').length;
                _moreLink.style.display = (!_inCasesOverlay && _totalCardCount > 1) ? 'block' : 'none';
            }
        }

    } catch (error) {
        console.error('Error updating lawyer dashboard:', error);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#dc3545;">
            Error loading cases. Please try again.
        </td></tr>`;
    }
}


function closeDynamicView() {
    console.log('Closing dynamic view...');
    
    clearDynamicView();
    
    const overlays = document.querySelectorAll('.modal-overlay, .dynamic-overlay, #dynamicViewOverlay, .dynamic-view-container');
    overlays.forEach(function(overlay) {
        overlay.remove();
    });
    
    const containers = document.querySelectorAll('.form-card, #dynamicViewContainer');
    containers.forEach(function(container) {
        if (container.parentNode) {
            container.remove();
        }
    });
    
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    
    const dynPage = document.getElementById('dynamicFormPage');
    if (dynPage) {
        dynPage.innerHTML = '';
        dynPage.style.display = 'none';
    }
    
    const currentUserLevel = sessionStorage.getItem('lcdjp_userlevel');
    if (isAdmin(currentUserLevel)) {
        if (typeof showAdminHome === 'function') {
            showAdminHome();
        }
    } else if (currentUserLevel === 'Lawyer') {
        if (typeof showLawyerDashboard === 'function') {
            showLawyerDashboard();
        }
    } else if (currentUserLevel === 'LC') {
        if (typeof showLcDashboard === 'function') {
            showLcDashboard();
        }
    } else {
        
        
        if (typeof showHome === 'function') {
            showHome();
        }
    }
    
    console.log('Dynamic view closed');
}






async function loadContactRequestsForUser() {
    const username = sessionStorage.getItem('lcdjp_username');
    const role = sessionStorage.getItem('lcdjp_userlevel');
    if (!username || role !== 'Lawyer') return;
    
    try {
        const token = getAuthToken();
        const resp = await fetch(API_ENDPOINTS.contactRequestIncoming(username), {
            
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!resp.ok) {
            if (resp.status === 404) {
                console.log('Contact requests endpoint not found');
            }
            return;
        }
        
        const requests = await resp.json();
        
        if (!requests || !Array.isArray(requests) || requests.length === 0) return;
        
        const dash = document.getElementById('lawyerDashboard');
        if (!dash) return;
        
        let panel = document.getElementById('contactRequestsPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'contactRequestsPanel';
            panel.style.cssText = 'margin:20px 0; padding:20px; background:white; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.08); border-left:4px solid #dc3545;';
            const firstSection = dash.querySelector('div[style]');
            if (firstSection) firstSection.insertAdjacentElement('afterend', panel);
            else dash.insertAdjacentElement('afterbegin', panel);
        }
        
        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; color:#dc3545;"> Contact Requests (${escapeHtml(requests.length)})</h3>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; font-size:20px; cursor:pointer; color:#999;">×</button>
        </div>`;
        
        requests.forEach(r => {
            const fromUser = r.from_username || r.sender || r.fromUsername || 'Unknown';
            const messageText = r.message || '';
            const createdAt = r.created_at || r.createdAt || new Date().toISOString();
            
            html += `<div style="padding:14px; border:1px solid #f0d0d0; border-radius:10px; margin-bottom:10px; background:#fff9f9;">
                <div style="font-weight:600; color:#333; margin-bottom:6px;"> From: ${escapeHtml(fromUser)}</div>
                ${messageText ? `<p style="margin:0 0 10px; color:#555; font-size:14px;">"${escapeHtml(messageText)}"</p>` : ''}
                <div style="font-size:12px; color:#999; margin-bottom:10px;">${new Date(createdAt).toLocaleString()}</div>
                <div style="display:flex; gap:10px;">
                    <button onclick="acceptContactRequest(${r.id}, ${escapeHtml(JSON.stringify(String(fromUser)))})"
                        style="padding:8px 18px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                         Accept</button>
                    <button onclick="denyContactRequest(${r.id})"
                        style="padding:8px 18px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                         Decline</button>
                </div>
            </div>`;
        });
        
        panel.innerHTML = html;
    } catch (err) {
        console.error('loadContactRequestsForUser error:', err);
    }
}


async function acceptContactRequest(requestId, fromUsername) {
    try {
        const token = getAuthToken();
        const resp = await fetch(API_ENDPOINTS.acceptContactRequest(requestId), {
            
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (resp.ok) {
            showToast('Request accepted! You can now message ' + fromUsername);
            const panel = document.getElementById('contactRequestsPanel');
            if (panel) panel.remove();
            loadContactRequestsForUser();
            if (typeof startChatWithUser === 'function') {
                startChatWithUser(fromUsername);
            }
        } else {
            showToast('Failed to accept request');
        }
    } catch (err) {
        showToast('Network error');
    }
}


async function denyContactRequest(requestId) {
    if (!confirm('Decline this contact request?')) return;
    try {
        const token = getAuthToken();
        const resp = await fetch(API_ENDPOINTS.denyContactRequest(requestId), {
            
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (resp.ok) {
            showToast('Request declined.');
            loadContactRequestsForUser();
        } else {
            showToast('Failed to decline request');
        }
    } catch (err) {
        showToast('Network error');
    }
}









































function _lawyerResEsc(v) {
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _lawyerResPlaceholder(title) {
    return '<div class="form-card">' +
        '<h2>' + _lawyerResEsc(title) + '</h2>' +
        '<p style="color:#667085;">This resource is still being put together and isn&#39;t available yet. Check back soon.</p>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>';
}

function _lawyerRenderFormFields(title, subtitle, fields) {
    var html = '<div class="form-card"><h2>' + _lawyerResEsc(title) + '</h2>';
    if (subtitle) html += '<p style="color:#667085;font-size:13px;margin-top:-8px;">' + _lawyerResEsc(subtitle) + '</p>';
    fields.forEach(function (f, i) {
        var id = 'lcf_' + i;
        html += '<label for="' + id + '">' + _lawyerResEsc(f.label) + '</label>';
        html += (f.type === 'textarea')
            ? '<textarea id="' + id + '" rows="4" placeholder="' + _lawyerResEsc(f.placeholder || '') + '"></textarea>'
            : '<input type="text" id="' + id + '" placeholder="' + _lawyerResEsc(f.placeholder || '') + '">';
    });
    html += '<div class="form-card-btn-row">' +
        '<button type="button" onclick="window.print()">Print / Save as PDF</button>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>';
    html += '</div>';
    return html;
}

window._lawyerCopyDraftText = function () {
    var t = document.getElementById('lawyerDraftText');
    if (!t) return;
    var done = function () {
        if (typeof showToast === 'function') showToast('Copied to clipboard');
        else alert('Copied to clipboard');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t.value).then(done).catch(function () {
            t.select(); document.execCommand('copy'); done();
        });
    } else {
        t.select(); document.execCommand('copy'); done();
    }
};

function _lawyerRenderDraftTemplate(title, template) {
    return '<div class="form-card"><h2>' + _lawyerResEsc(title) + '</h2>' +
        '<p style="color:#667085;font-size:13px;margin-top:-8px;">Starting template -- edit the bracketed placeholders and review against your case facts before use.</p>' +
        '<label for="lawyerDraftText">Draft</label>' +
        '<textarea id="lawyerDraftText" rows="16" style="font-family:inherit;white-space:pre-wrap;">' + _lawyerResEsc(template) + '</textarea>' +
        '<div class="form-card-btn-row">' +
        '<button type="button" onclick="_lawyerCopyDraftText()">Copy to Clipboard</button>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>' +
        '</div>';
}


window._LAWYER_COURT_FORMS = {
    caseIntake: { title: 'Case Intake Form', fields: [
        { label: 'Client Full Name' }, { label: 'Case Reference / File No.' },
        { label: 'Nature of Matter', type: 'textarea' }, { label: 'Date Opened' },
        { label: 'Referring Party / Source' }, { label: 'Initial Notes', type: 'textarea' }
    ]},
    clientInfo: { title: 'Client Information Form', fields: [
        { label: 'Full Name' }, { label: 'Date of Birth' }, { label: 'National ID / Passport No.' },
        { label: 'Phone Number' }, { label: 'Physical Address' }, { label: 'District' },
        { label: 'Occupation' }, { label: 'Next of Kin / Emergency Contact' }
    ]},
    witnessStatement: { title: 'Witness Statement Form', fields: [
        { label: 'Witness Full Name' }, { label: 'Relationship to Case' }, { label: 'Date of Statement' },
        { label: 'Statement', type: 'textarea' }, { label: 'Signature (type full name to sign)' }
    ]},
    affidavit: { title: 'Affidavit Template', fields: [
        { label: 'Deponent Full Name' }, { label: 'Deponent Address' }, { label: 'Case Reference' },
        { label: 'Sworn Statement', type: 'textarea' }, { label: 'Date Sworn' }, { label: 'Commissioner for Oaths' }
    ]},
    landComplaint: { title: 'Land Dispute Complaint Form', fields: [
        { label: 'Complainant Name' }, { label: 'Respondent Name' }, { label: 'Land Location / Plot Description' },
        { label: 'Nature of Dispute', type: 'textarea' }, { label: 'Supporting Documents Held' }, { label: 'Date of Incident' }
    ]},
    familyComplaint: { title: 'Family Dispute Complaint Form', fields: [
        { label: 'Complainant Name' }, { label: 'Respondent Name' }, { label: 'Relationship Between Parties' },
        { label: 'Nature of Dispute', type: 'textarea' }, { label: 'Children Involved (if any)' }, { label: 'Date of Incident' }
    ]},
    debtRecovery: { title: 'Debt Recovery Claim Form', fields: [
        { label: 'Creditor Name' }, { label: 'Debtor Name' }, { label: 'Amount Owed' },
        { label: 'Date Debt Incurred' }, { label: 'Basis of Debt', type: 'textarea' }, { label: 'Prior Recovery Attempts' }
    ]},
    mediationRequest: { title: 'Community Mediation Request Form', fields: [
        { label: 'Requesting Party' }, { label: 'Other Party' }, { label: 'Nature of Dispute', type: 'textarea' },
        { label: 'Preferred Mediation Date' }, { label: 'Venue Preference' }
    ]},
    noticeOfHearing: { title: 'Notice of Hearing Form', fields: [
        { label: 'Case Reference' }, { label: 'Parties' }, { label: 'Hearing Date' }, { label: 'Hearing Time' },
        { label: 'Venue' }, { label: 'Presiding Officer' }
    ]},
    settlementAgreement: { title: 'Settlement Agreement Form', fields: [
        { label: 'Party A' }, { label: 'Party B' }, { label: 'Terms of Settlement', type: 'textarea' },
        { label: 'Date of Agreement' }, { label: 'Witness(es)' }
    ]},
    consentAgreement: { title: 'Consent Agreement Form', fields: [
        { label: 'Party A' }, { label: 'Party B' }, { label: 'Matter Consented To', type: 'textarea' },
        { label: 'Date' }, { label: 'Witness(es)' }
    ]},
    appealRequest: { title: 'Appeal Request Form', fields: [
        { label: 'Appellant Name' }, { label: 'Case Reference Being Appealed' }, { label: 'Original Decision Date' },
        { label: 'Grounds for Appeal', type: 'textarea' }, { label: 'Relief Sought', type: 'textarea' }
    ]}
};
window.showCourtForm = function (key) {
    var def = window._LAWYER_COURT_FORMS[key];
    if (typeof openDynamicView !== 'function') return;
    if (!def) { openDynamicView(_lawyerResPlaceholder('Court Form')); return; }
    openDynamicView(_lawyerRenderFormFields(def.title,
        'Standard field layout -- fill in, then print or save as PDF.', def.fields));
};


window._LC_FORMS = {
    complaintRegistration: { title: 'Complaint Registration Form (LC)', fields: [
        { label: 'Complainant Name' }, { label: 'Complainant Village / Parish' }, { label: 'Respondent Name' },
        { label: 'Nature of Complaint', type: 'textarea' }, { label: 'Date Received' }, { label: 'Received By (LC Official)' }
    ]},
    lcSummons: { title: 'LC Court Summons Form', fields: [
        { label: 'Case Reference' }, { label: 'Party Being Summoned' }, { label: 'Hearing Date' },
        { label: 'Hearing Time' }, { label: 'Venue' }, { label: 'Issued By' }
    ]},
    mediationSessionRecord: { title: 'Mediation Session Record Form', fields: [
        { label: 'Case Reference' }, { label: 'Parties Present', type: 'textarea' }, { label: 'Date of Session' },
        { label: 'Summary of Discussion', type: 'textarea' }, { label: 'Outcome', type: 'textarea' }, { label: 'Next Steps' }
    ]},
    minuteBookEntry: { title: 'LC Minute Book Entry Form', fields: [
        { label: 'Meeting / Session Date' }, { label: 'Members Present', type: 'textarea' },
        { label: 'Matters Discussed', type: 'textarea' }, { label: 'Decisions Made', type: 'textarea' }, { label: 'Recorded By' }
    ]},
    witnessStatementLc: { title: 'Witness Statement Form (LC)', fields: [
        { label: 'Case Reference' }, { label: 'Witness Name' }, { label: 'Witness Village' },
        { label: 'Statement', type: 'textarea' }, { label: 'Date Taken' }, { label: 'Taken By' }
    ]},
    referralToPolice: { title: 'Referral to Police Form', fields: [
        { label: 'Case Reference' }, { label: 'Parties Involved' }, { label: 'Reason for Referral', type: 'textarea' },
        { label: 'Police Station Referred To' }, { label: 'Date Referred' }, { label: 'Referred By' }
    ]},
    referralToCourt: { title: "Referral to Magistrate's Court Form", fields: [
        { label: 'Case Reference' }, { label: 'Parties Involved' }, { label: 'Reason for Referral', type: 'textarea' },
        { label: 'Court Referred To' }, { label: 'Date Referred' }, { label: 'Referred By' }
    ]},
    lcJudgmentOrder: { title: 'LC Court Judgment / Order Form', fields: [
        { label: 'Case Reference' }, { label: 'Parties' }, { label: 'Findings', type: 'textarea' },
        { label: 'Order / Judgment', type: 'textarea' }, { label: 'Date' }, { label: 'Presiding LC Official' }
    ]},
    communityServiceOrder: { title: 'Community Service Order Form', fields: [
        { label: 'Case Reference' }, { label: 'Party Subject to Order' }, { label: 'Nature of Service', type: 'textarea' },
        { label: 'Duration' }, { label: 'Supervising Official' }, { label: 'Date Issued' }
    ]},
    settlementAgreementLc: { title: 'Settlement Agreement Form (LC)', fields: [
        { label: 'Party A' }, { label: 'Party B' }, { label: 'Terms of Settlement', type: 'textarea' },
        { label: 'Date of Agreement' }, { label: 'Witness(es)' }
    ]},
    noticeOfHearingLc: { title: 'Notice of Hearing Form (LC)', fields: [
        { label: 'Case Reference' }, { label: 'Parties' }, { label: 'Hearing Date' }, { label: 'Hearing Time' },
        { label: 'Venue' }, { label: 'Presiding LC Official' }
    ]}
};
window.showLCForm = function (key) {
    var def = window._LC_FORMS[key];
    if (typeof openDynamicView !== 'function') return;
    if (!def) { openDynamicView(_lawyerResPlaceholder('LC Form')); return; }
    openDynamicView(_lawyerRenderFormFields(def.title,
        'Standard LC field layout -- fill in, then print or save as PDF.', def.fields));
};


window._LAWYER_CASE_DRAFTS = {
    demandLetter: { title: 'Demand Letter', template:
"Date: [Date]\n\nTo: [Recipient Name]\n[Recipient Address]\n\nRE: DEMAND FOR [PAYMENT / ACTION]\n\nDear [Recipient Name],\n\nWe act on behalf of [Client Name] in the above matter. Our client instructs us that [state facts / basis of claim].\n\nYou are hereby required to [state demand -- e.g. pay the sum of ______ / vacate the premises / cease the conduct] within [X] days of the date of this letter, failing which our client shall take further action without further notice to you.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    noticeToVacate: { title: 'Notice To Vacate Property', template:
"Date: [Date]\n\nTo: [Tenant Name]\n[Property Address]\n\nRE: NOTICE TO VACATE\n\nDear [Tenant Name],\n\nYou are hereby given notice to vacate the premises at [Property Address] on or before [Vacate Date], on the following grounds: [state grounds].\n\nPlease ensure the property is left in good condition and all keys are returned to [Landlord/Agent Name] by the above date.\n\nYours faithfully,\n\n[Lawyer Name] on behalf of [Landlord Name]" },
    landComplaintDraft: { title: 'Land Ownership Complaint', template:
"IN THE MATTER OF A LAND DISPUTE BETWEEN\n[Complainant Name] AND [Respondent Name]\n\nCOMPLAINT\n\n1. The Complainant is [description -- e.g. registered owner / occupant] of land located at [Location / Plot Description].\n2. The Respondent has [state alleged conduct -- e.g. trespassed on / encroached on] the said land since on or about [Date].\n3. The Complainant seeks [relief sought -- e.g. an order restraining the Respondent from further encroachment, and/or a determination of boundaries].\n\nDated this [Date].\n\n[Complainant Name / Signature]" },
    debtRecoveryDraft: { title: 'Debt Recovery Demand', template:
"Date: [Date]\n\nTo: [Debtor Name]\n[Debtor Address]\n\nRE: DEMAND FOR PAYMENT OF OUTSTANDING DEBT\n\nDear [Debtor Name],\n\nOur client, [Creditor Name], instructs us that you are indebted to them in the sum of [Amount], arising from [basis of debt -- e.g. a loan advanced on / goods supplied on] [Date].\n\nDespite [prior demand(s) made on Date(s), if any], the amount remains unpaid. You are required to settle this debt in full within [X] days, failing which our client will pursue further recovery action, which may include the costs of such action.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    breachAgreement: { title: 'Breach Of Agreement Letter', template:
"Date: [Date]\n\nTo: [Other Party Name]\n[Address]\n\nRE: NOTICE OF BREACH OF AGREEMENT DATED [Agreement Date]\n\nDear [Other Party Name],\n\nWe act on behalf of [Client Name]. Under the agreement between you and our client dated [Agreement Date], you were obligated to [state obligation breached].\n\nYou have failed to [state the specific breach], and our client has suffered [state effect/loss, if applicable] as a result.\n\nYou are required to remedy this breach by [state remedy sought] within [X] days, failing which our client reserves the right to pursue all available remedies.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    childCustody: { title: 'Child Custody Application', template:
"IN THE MATTER OF THE CHILD(REN): [Child Name(s), Date(s) of Birth]\nAND IN THE MATTER OF AN APPLICATION FOR CUSTODY BY [Applicant Name]\n\nAPPLICATION\n\n1. The Applicant is the [relationship -- e.g. mother / father / guardian] of the above-named child(ren).\n2. The present custody arrangement is [describe current arrangement].\n3. The Applicant seeks [relief sought -- e.g. sole custody / joint custody / defined access] on the grounds that [state grounds, focused on the best interests of the child].\n4. Proposed arrangements for the child(ren)'s welfare, education, and maintenance: [describe].\n\nDated this [Date].\n\n[Applicant Name / Signature]" },
    maintenanceRequest: { title: 'Maintenance & Support Request', template:
"Date: [Date]\n\nTo: [Respondent Name]\n[Address]\n\nRE: REQUEST FOR MAINTENANCE AND SUPPORT\n\nDear [Respondent Name],\n\nWe act on behalf of [Client Name] regarding the maintenance of [Child Name(s) / dependent(s)].\n\nOur client requests that you contribute [Amount / description of support] per [period] towards the maintenance of [Child Name(s)], with effect from [Date].\n\nPlease confirm your position within [X] days, failing which our client will pursue this matter through the appropriate forum.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    inheritanceDispute: { title: 'Inheritance Dispute Draft', template:
"IN THE MATTER OF THE ESTATE OF [Deceased's Name] (DECEASED)\nAND IN THE MATTER OF A DISPUTE BETWEEN [Party A] AND [Party B]\n\nCOMPLAINT / NOTICE OF DISPUTE\n\n1. The deceased, [Deceased's Name], passed away on [Date of Death], leaving [estate description, if known].\n2. The dispute concerns [state nature of dispute -- e.g. distribution of the estate / validity of a will / appointment of an administrator].\n3. The Complainant's position is that [state position and grounds].\n4. Relief sought: [state relief sought].\n\nDated this [Date].\n\n[Complainant Name / Signature]" },
    boundaryDispute: { title: 'Boundary Dispute Draft', template:
"IN THE MATTER OF A BOUNDARY DISPUTE BETWEEN\n[Party A] AND [Party B]\n\nCOMPLAINT\n\n1. The Complainant is the owner/occupant of land at [Location], adjoining land occupied by the Respondent at [Location].\n2. A dispute has arisen concerning the boundary between the two parcels, specifically [describe -- e.g. location of a fence, encroachment].\n3. The Complainant requests [relief sought -- e.g. a joint survey, a determination of the correct boundary].\n\nDated this [Date].\n\n[Complainant Name / Signature]" },
    employmentComplaint: { title: 'Employment Complaint Draft', template:
"Date: [Date]\n\nTo: [Employer Name]\n[Employer Address]\n\nRE: EMPLOYMENT COMPLAINT -- [Employee Name]\n\nDear Sir/Madam,\n\nWe act on behalf of [Employee Name], employed by you as [Position] since [Start Date].\n\nOur client raises the following complaint(s): [state complaint -- e.g. unpaid wages, wrongful termination, unsafe working conditions], which occurred on or around [Date].\n\nOur client seeks [relief sought -- e.g. payment of [Amount], reinstatement, a written explanation] within [X] days.\n\nYours faithfully,\n\n[Lawyer Name]\n[Firm Name]" },
    mediationAgreement: { title: 'Mediation Agreement Draft', template:
"MEDIATION AGREEMENT\n\nBETWEEN: [Party A]\nAND: [Party B]\n\n1. The parties agree to resolve the dispute concerning [describe dispute] through mediation facilitated by [Mediator Name].\n2. The parties agree to participate in good faith and to keep the proceedings confidential.\n3. Any agreement reached will be reduced to writing and signed by both parties.\n\nDated this [Date].\n\n[Party A Signature]                              [Party B Signature]\n\n[Mediator Signature]" },
    finalSettlement: { title: 'Final Settlement Draft', template:
"FINAL SETTLEMENT AGREEMENT\n\nBETWEEN: [Party A]\nAND: [Party B]\n\nWHEREAS a dispute arose between the parties concerning [describe dispute];\n\nAND WHEREAS the parties, through mediation/negotiation, have reached a full and final settlement on the following terms:\n\n1. [Term 1]\n2. [Term 2]\n3. [Term 3]\n\nThe parties agree that this settlement is in full and final resolution of the above dispute, and neither party shall bring further claims arising from it.\n\nDated this [Date].\n\n[Party A Signature]                              [Party B Signature]\n\nWitnessed by: [Witness Name / Signature]" }
};
window.showCaseDraft = function (key) {
    var def = window._LAWYER_CASE_DRAFTS[key];
    if (typeof openDynamicView !== 'function') return;
    if (!def) { openDynamicView(_lawyerResPlaceholder('Case Draft')); return; }
    openDynamicView(_lawyerRenderDraftTemplate(def.title, def.template));
};


window._LC_CASE_DRAFTS = {
    complaintDraft: { title: 'Complaint Draft (LC)', template:
"TO THE LOCAL COUNCIL [I / II / III] COURT OF [Village/Parish/Sub-county]\n\nCOMPLAINT\n\nComplainant: [Complainant Name], of [Village]\nRespondent: [Respondent Name], of [Village]\n\n1. The Complainant states that on or about [Date], the Respondent [describe conduct complained of].\n2. The Complainant requests that the LC Court [state relief sought -- e.g. summon the Respondent, mediate the dispute, make an order].\n\nDated this [Date].\n\n[Complainant Name / Signature]" },
    noticeOfHearingDraft: { title: 'Notice of Hearing Draft (LC)', template:
"LOCAL COUNCIL [I / II / III] COURT\n[Village/Parish/Sub-county]\n\nNOTICE OF HEARING\n\nTo: [Party Name]\n\nYou are hereby notified to appear before this LC Court on [Date] at [Time], at [Venue], in the matter of [Case Reference / brief description], to [state purpose -- e.g. respond to a complaint / attend mediation].\n\nFailure to appear may result in [state consequence per local procedure].\n\nIssued by: [LC Official Name/Title]\nDate: [Date]" },
    mediationOutcomeDraft: { title: 'Mediation Outcome Record Draft', template:
"MEDIATION OUTCOME RECORD\n\nCase Reference: [Reference]\nParties: [Party A] and [Party B]\nDate of Mediation: [Date]\nMediator(s): [Name(s)]\n\n1. Summary of dispute: [describe].\n2. Points discussed: [summarize].\n3. Outcome/Agreement reached: [describe terms, or state 'No agreement reached'].\n4. Next steps: [e.g. referred to Magistrate's Court / referred to Police / case closed].\n\nSigned:\n[Party A]                              [Party B]\n\n[Mediator Signature]" },
    referralToPoliceDraft: { title: 'Referral Letter to Police (Draft)', template:
"Date: [Date]\n\nTo: The Officer in Charge\n[Police Station Name]\n\nRE: REFERRAL OF CASE -- [Case Reference / Parties]\n\nDear Sir/Madam,\n\nThis Local Council [I / II / III] refers the above matter to your office, as it falls outside the jurisdiction of the LC Court / involves a criminal element requiring police attention.\n\nSummary of the matter: [describe facts].\n\nWe request that you take appropriate action and keep this office informed of progress.\n\nYours faithfully,\n\n[LC Official Name/Title]\n[Village/Parish/Sub-county]" },
    referralToCourtDraft: { title: "Referral Letter to Magistrate's Court (Draft)", template:
"Date: [Date]\n\nTo: The Magistrate\n[Court Name]\n\nRE: REFERRAL OF CASE -- [Case Reference / Parties]\n\nDear Sir/Madam,\n\nThis Local Council [I / II / III] refers the above matter to your Court, as [state reason -- e.g. mediation was unsuccessful / the matter exceeds LC Court jurisdiction].\n\nSummary of the matter and steps taken at LC level: [describe].\n\nYours faithfully,\n\n[LC Official Name/Title]\n[Village/Parish/Sub-county]" },
    lcJudgmentDraft: { title: 'LC Court Judgment Draft', template:
"LOCAL COUNCIL [I / II / III] COURT\n[Village/Parish/Sub-county]\n\nJUDGMENT / ORDER\n\nCase Reference: [Reference]\nParties: [Party A] and [Party B]\nDate of Hearing: [Date]\n\n1. Findings of fact: [summarize].\n2. Decision: [state the order or judgment].\n3. Any party dissatisfied with this decision may appeal to [next level, e.g. LC II / Magistrate's Court] within the time allowed by law.\n\nDated this [Date].\n\n[Presiding LC Official Name/Title/Signature]" },
    warningLetterDraft: { title: 'Warning / Caution Letter Draft', template:
"Date: [Date]\n\nTo: [Party Name]\n[Village]\n\nRE: WARNING -- [Brief Description of Conduct]\n\nDear [Party Name],\n\nIt has come to the attention of this Local Council that [describe conduct], reported on/around [Date].\n\nYou are hereby cautioned to desist from this conduct with immediate effect. Failure to do so may result in [state consequence -- e.g. referral to the Magistrate's Court or Police].\n\nYours faithfully,\n\n[LC Official Name/Title]" },
    boundaryDisputeDraftLc: { title: 'Village Land Boundary Dispute Draft', template:
"IN THE MATTER OF A LAND BOUNDARY DISPUTE BEFORE THE LOCAL COUNCIL [I / II / III] COURT OF [Village]\n\nBETWEEN [Party A] AND [Party B]\n\n1. The parties occupy adjoining parcels of land at [Location].\n2. The dispute concerns [describe -- e.g. the position of a boundary marker/fence].\n3. A site visit/joint inspection was conducted on [Date] with [names of LC members present].\n4. Findings and proposed resolution: [describe].\n\nDated this [Date].\n\n[LC Official Name/Title/Signature]" },
    familyDisputeMediationDraft: { title: 'Domestic / Family Dispute Mediation Draft', template:
"FAMILY DISPUTE MEDIATION RECORD\n\nCase Reference: [Reference]\nParties: [Party A] and [Party B]\nDate: [Date]\n\n1. Nature of dispute: [describe -- e.g. maintenance, custody, domestic conflict].\n2. Note: matters involving suspected violence or abuse must be referred to Police / the Probation and Social Welfare Officer without delay -- do not mediate such matters at LC level.\n3. Points discussed: [summarize].\n4. Outcome/Agreement: [describe, or state referral made].\n\nSigned:\n[Party A]                              [Party B]\n\n[LC Official Signature]" },
    debtDisputeSettlementDraftLc: { title: 'Debt Dispute Settlement Draft (LC)', template:
"DEBT DISPUTE SETTLEMENT AGREEMENT\n\nBETWEEN: [Creditor Name]\nAND: [Debtor Name]\n\nBefore the Local Council [I / II / III] of [Village], the parties agree as follows:\n\n1. The Debtor acknowledges owing the Creditor the sum of [Amount], arising from [basis of debt].\n2. The Debtor agrees to repay this amount as follows: [repayment terms/schedule].\n3. Both parties agree this settles the matter in full upon completion of payment.\n\nDated this [Date].\n\n[Creditor Signature]                              [Debtor Signature]\n\nWitnessed by: [LC Official Name/Signature]" },
    finalSettlementDraftLc: { title: 'Final Settlement Draft (LC)', template:
"FINAL SETTLEMENT AGREEMENT (LOCAL COUNCIL LEVEL)\n\nBETWEEN: [Party A]\nAND: [Party B]\n\nWHEREAS a dispute arose between the parties concerning [describe dispute], brought before the Local Council [I / II / III] of [Village];\n\nAND WHEREAS the parties, through LC mediation, have reached a full and final settlement on the following terms:\n\n1. [Term 1]\n2. [Term 2]\n3. [Term 3]\n\nThe parties agree that this settlement is in full and final resolution of the above dispute at Local Council level.\n\nDated this [Date].\n\n[Party A Signature]                              [Party B Signature]\n\nWitnessed by: [LC Official Name/Signature]" }
};
window.showLCCaseDraft = function (key) {
    var def = window._LC_CASE_DRAFTS[key];
    if (typeof openDynamicView !== 'function') return;
    if (!def) { openDynamicView(_lawyerResPlaceholder('LC Case Draft')); return; }
    openDynamicView(_lawyerRenderDraftTemplate(def.title, def.template));
};


window._lawyerCalcInterest = function () {
    var p = parseFloat(document.getElementById('lcPrincipal').value) || 0;
    var r = parseFloat(document.getElementById('lcRate').value) || 0;
    var t = parseFloat(document.getElementById('lcTime').value) || 0;
    var interest = p * (r / 100) * t;
    var total = p + interest;
    var out = document.getElementById('lcResult');
    if (out) out.innerHTML = '<strong>Interest:</strong> ' + interest.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
        '<br><strong>Total (Principal + Interest):</strong> ' + total.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
function _lawyerRenderCaseCalculator() {
    return '<div class="form-card"><h2>Case Calculator</h2>' +
        '<p style="color:#667085;font-size:13px;margin-top:-8px;">Simple interest calculator for claim amounts. Enter your own principal and applicable rate -- this tool does not set or verify legal interest rates for any case.</p>' +
        '<label for="lcPrincipal">Principal Amount</label><input type="number" id="lcPrincipal" placeholder="e.g. 2000000">' +
        '<label for="lcRate">Interest Rate (% per period)</label><input type="number" id="lcRate" placeholder="e.g. 5">' +
        '<label for="lcTime">Number of Periods</label><input type="number" id="lcTime" placeholder="e.g. 12">' +
        '<button type="button" onclick="_lawyerCalcInterest()">Calculate</button>' +
        '<div id="lcResult" style="margin-top:14px;font-size:14px;color:#1a3270;"></div>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>';
}
window._LAWYER_EVIDENCE_CHECKLIST_ITEMS = [
    'Signed witness statements collected',
    'Photographic evidence labelled and dated',
    'Original documents secured (contracts, receipts, correspondence)',
    'Copies made of all originals',
    'Chain of custody noted for physical evidence',
    'Relevant dates and timeline documented',
    'Expert or professional opinions obtained (if applicable)',
    'Evidence cross-checked against case facts',
    'All evidence organised and indexed for the case file'
];
window.showEvidenceChecklist = function () {
    if (typeof openDynamicView !== 'function') return;
    var rows = window._LAWYER_EVIDENCE_CHECKLIST_ITEMS.map(function (item, i) {
        var id = 'lec_' + i;
        return '<li style="list-style:none;padding:10px 4px;border-bottom:1px solid #eef1f8;display:flex;align-items:center;gap:10px;">' +
            '<input type="checkbox" id="' + id + '" style="width:18px;height:18px;flex-shrink:0;">' +
            '<label for="' + id + '" style="margin:0;font-weight:400;flex:1;">' + _lawyerResEsc(item) + '</label></li>';
    }).join('');
    openDynamicView('<div class="form-card"><h2>Evidence Checklist</h2>' +
        '<p style="color:#667085;font-size:13px;margin-top:-8px;">General checklist -- add or skip items as relevant to your case.</p>' +
        '<ul style="padding:0;margin:0;">' + rows + '</ul>' +
        '<button type="button" onclick="closeDynamicView()" style="margin-top:16px;background:#eee;color:#333;">Back</button>' +
        '</div>');
};
window._LAWYER_TOOLKIT_TITLES = {
    legalFeesGuide: 'Legal Fees Guide', courtFeeGuide: 'Court Fee Guide',
    timelineTracker: 'Case Timeline Tracker', clientMeetingNotes: 'Client Meeting Notes',
    appointmentScheduler: 'Appointment Scheduler', documentVault: 'Document Vault'
};
window.showToolkit = function (key) {
    if (typeof openDynamicView !== 'function') return;
    if (key === 'caseCalculator') { openDynamicView(_lawyerRenderCaseCalculator()); return; }
    if (key === 'evidenceChecklist') { window.showEvidenceChecklist(); return; }
    openDynamicView(_lawyerResPlaceholder(window._LAWYER_TOOLKIT_TITLES[key] || 'Toolkit'));
};









window._LAWYER_LEGAL_RESEARCH_TITLES = {
    constitution: 'Constitution of Uganda', landAct: 'Land Act', successionAct: 'Succession Act',
    marriageAct: 'Marriage Act', childrenAct: 'Children Act'
};
window.showLegalResearch = function (key) {
    var label = window._LAWYER_LEGAL_RESEARCH_TITLES[key];
    _lawyerOpenKnowledgePanel({
        panelTitle: 'Legal Research',
        subtitle: 'Search verified statutes and legal provisions, or start with a topic:',
        category: 'Legal Research',
        suggestions: Object.keys(window._LAWYER_LEGAL_RESEARCH_TITLES).map(function (k) {
            var t = window._LAWYER_LEGAL_RESEARCH_TITLES[k];
            return { q: 'Explain the ' + t + ' and its key provisions relevant to a lawyer\'s practice in Uganda.', label: t };
        }),
        prefillQuery: label ? ('Explain the ' + label + ' and its key provisions relevant to a lawyer\'s practice in Uganda.') : null
    });
};

window._LAWYER_MEDIATION_GUIDELINE_TITLES = {
    principles: 'Principles of Mediation', roleOfMediator: 'Role of the Mediator',
    preparing: 'Preparing for Mediation', conducting: 'Conducting a Mediation Session',
    familyDisputes: 'Managing Family Disputes', landDisputes: 'Managing Land Disputes',
    communityConflicts: 'Managing Community Conflicts', debtDisputes: 'Managing Debt Disputes',
    sensitiveCases: 'Handling Sensitive Cases', recordingOutcomes: 'Recording Mediation Outcomes',
    settlementAgreements: 'Writing Settlement Agreements', referToCourt: 'When to Refer Cases to Court',
    referToPolice: 'When to Refer Cases to Police'
};
window.showMediationGuideline = function (key) {
    var label = window._LAWYER_MEDIATION_GUIDELINE_TITLES[key];
    _lawyerOpenKnowledgePanel({
        panelTitle: 'Mediation Guidelines',
        subtitle: "Search Uganda's community mediation guidance, or start with a topic:",
        category: 'Mediation Guidelines',
        suggestions: Object.keys(window._LAWYER_MEDIATION_GUIDELINE_TITLES).map(function (k) {
            var t = window._LAWYER_MEDIATION_GUIDELINE_TITLES[k];
            return { q: 'Explain best practice for ' + t + ' for a community mediator in Uganda.', label: t };
        }),
        prefillQuery: label ? ('Explain best practice for ' + label + ' for a community mediator in Uganda.') : null
    });
};

window._LC_MEDIATION_GUIDELINE_TITLES = {
    jurisdiction: 'Jurisdiction of LC Courts', principles: 'Principles of Mediation at LC Level',
    roleOfMediator: 'Role of the LC Chairperson as Mediator', preparing: 'Preparing for a Mediation Session',
    conducting: 'Conducting a Mediation Session', familyDisputes: 'Managing Family & Domestic Disputes',
    landDisputes: 'Managing Land & Boundary Disputes', debtDisputes: 'Managing Debt & Property Disputes',
    communityConflicts: 'Managing Community & Neighbour Conflicts', sensitiveCases: 'Handling Sensitive Cases (GBV & Minors)',
    recordingOutcomes: 'Recording Mediation Outcomes & LC Minutes', settlementAgreements: 'Writing Settlement Agreements',
    referToCourt: "When to Refer Cases to the Magistrate's Court", referToPolice: 'When to Refer Cases to Police'
};
window.showLCMediationGuideline = function (key) {
    var label = window._LC_MEDIATION_GUIDELINE_TITLES[key];
    _lawyerOpenKnowledgePanel({
        panelTitle: 'Mediation Guidelines (LC Level)',
        subtitle: "Search Local Council mediation guidance from the Law Library, or start with a topic:",
        category: 'LC Mediation Guidelines',
        role: 'Local Council officials',
        suggestions: Object.keys(window._LC_MEDIATION_GUIDELINE_TITLES).map(function (k) {
            var t = window._LC_MEDIATION_GUIDELINE_TITLES[k];
            return { q: 'Explain best practice for ' + t + ' for a Local Council (LC) official in Uganda.', label: t };
        }),
        prefillQuery: label ? ('Explain best practice for ' + label + ' for a Local Council (LC) official in Uganda.') : null
    });
};







window._LAWYER_LAW_LIBRARY_TITLES = {
    constitution: 'Constitution', landLaws: 'Land Laws', familyLaws: 'Family Laws',
    marriageDivorce: 'Marriage & Divorce', successionInheritance: 'Succession & Inheritance',
    childrenRights: "Children's Rights", employmentLaws: 'Employment Laws', criminalLaw: 'Criminal Law Basics',
    humanRights: 'Human Rights', localCouncilLaws: 'Local Council Laws', courtProcedures: 'Court Procedures',
    legalForms: 'Legal Forms'
};




window._LAW_LIBRARY_SUGGESTIONS = [
    'What are the legal requirements for a valid marriage in Uganda?',
    'What does the law say about child custody after separation?',
    'What is the procedure for registering land under the Land Act?',
    'What are the grounds for divorce under Ugandan law?',
    "What are an employee's rights if dismissed without notice?",
    'How is an estate distributed when someone dies without a will?'
];




window.showLawLibrarySearch = function (prefillQuery) {
    _lawyerOpenKnowledgePanel({
        panelTitle: 'Law Library',
        subtitle: 'Search the Legal Knowledge library, or start with a common question:',
        category: 'Law Library',
        suggestions: window._LAW_LIBRARY_SUGGESTIONS.map(function (q) { return { q: q, label: q }; }),
        prefillQuery: prefillQuery || null
    });
};





window.showLawLibrary = function (key) {
    var label = window._LAWYER_LAW_LIBRARY_TITLES[key];
    window.showLawLibrarySearch(label ? ('Tell me about ' + label + ' under Ugandan law.') : null);
};










var _lawyerKnowledgeCategory = 'Law Library';
var _lawyerKnowledgeRole = 'lawyers';
function _lawyerOpenKnowledgePanel(opts) {
    if (typeof openDynamicView !== 'function') return;
    _lawyerKnowledgeCategory = opts.category || 'Law Library';
    _lawyerKnowledgeRole = opts.role || 'lawyers';
    var chips = (opts.suggestions || []).map(function (s) {
        return '<li class="lr-item" onclick="_lawLibraryAsk(\'' + s.q.replace(/'/g, "\\'") + '\')">'
            + _lawyerResEsc(s.label) + '</li>';
    }).join('');
    var html = '<div class="form-card" id="lawLibraryPanel">' +
        '<h2>' + _lawyerResEsc(opts.panelTitle) + '</h2>' +
        '<p style="color:#667085;font-size:13px;margin-top:-8px;">' + _lawyerResEsc(opts.subtitle) + '</p>' +
        '<label for="lawLibraryQuery" style="margin-top:12px;">Ask a legal question</label>' +
        '<input type="text" id="lawLibraryQuery" placeholder="e.g. What is the process for a land title transfer?" onkeypress="if(event.key===\'Enter\'){event.preventDefault();_lawLibrarySubmit();}">' +
        '<div class="form-card-btn-row">' +
        '<button type="button" id="lawLibrarySearchBtn" onclick="_lawLibrarySubmit()">Search</button>' +
        '<button type="button" class="form-card-btn-secondary" onclick="closeDynamicView()">Back</button>' +
        '</div>' +
        '<div id="lawLibrarySuggestionsWrap" style="margin-top:16px;">' +
        '<p style="color:#667085;font-size:12px;margin:0 0 6px;">Or start with a common question:</p>' +
        '<ul id="lawLibrarySuggestions">' + chips + '</ul>' +
        '</div>' +
        '<div id="lawLibraryResult" style="margin-top:18px;"></div>' +
        '</div>';
    openDynamicView(html);
    if (opts.prefillQuery) {
        setTimeout(function () {
            var field = document.getElementById('lawLibraryQuery');
            if (field) field.value = opts.prefillQuery;
            window._lawLibrarySubmit();
        }, 0);
    }
}

window._lawLibraryAsk = function (question) {
    var field = document.getElementById('lawLibraryQuery');
    if (field) field.value = question;
    window._lawLibrarySubmit();
};

window._lawLibrarySubmit = function () {
    var field = document.getElementById('lawLibraryQuery');
    var q = field ? field.value.trim() : '';
    var out = document.getElementById('lawLibraryResult');
    if (!q) {
        if (out) out.innerHTML = '<p style="color:#c0392b;font-size:13px;">Type a question or tap a suggestion above.</p>';
        return;
    }
    var btn = document.getElementById('lawLibrarySearchBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Searching…'; }
    if (out) out.innerHTML = '<p style="color:#667085;font-size:13px;">Searching the Legal Knowledge library…</p>';
    
    
    var suggWrap = document.getElementById('lawLibrarySuggestionsWrap');
    if (suggWrap) suggWrap.style.display = 'none';

    _lawLibraryQuery(q, _lawyerKnowledgeCategory, _lawyerKnowledgeRole).then(function (res) {
        if (btn) { btn.disabled = false; btn.textContent = 'Search'; }
        if (!out) return;
        if (!res || !res.reply) {
            out.innerHTML = '<p style="color:#c0392b;font-size:13px;">The Legal Knowledge library is unavailable right now. Please try again shortly.</p>';
            return;
        }
        var sourcesHtml = '';
        if (Array.isArray(res.sources) && res.sources.length) {
            sourcesHtml = '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #eef1f8;font-size:12px;color:#667085;">' +
                '<strong>Sources:</strong><ul style="margin:6px 0 0;padding-left:18px;">' +
                res.sources.map(function (s) {
                    var lbl = [s.documentTitle, s.legalSection].filter(Boolean).join(', ');
                    return '<li>' + _lawyerResEsc(lbl || 'Legal Knowledge library') + '</li>';
                }).join('') + '</ul></div>';
        }
        out.innerHTML = '<div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">' +
            _lawyerResEsc(res.reply) + '</div>' + sourcesHtml;
    });
};










function _lawLibraryQuery(question, category, role) {
    var cat = category || 'Law Library';
    var aud = role || 'lawyers';
    var sysCtx = 'You are the ' + cat + ', a Legal Knowledge lookup feature inside JusticeLink (LCDJP), used by '
        + 'verified ' + aud + ' to search the platform\'s verified legal knowledge base. Answer the question directly '
        + 'and precisely, citing the relevant law, section, or procedure where the material supports it. Never '
        + 'refer to yourself as an AI, assistant, chatbot, model, or automated system, and never mention that a '
        + 'model or automated system produced this answer -- respond simply as the ' + cat + ' / Legal Knowledge '
        + 'library itself.';
    var payload = {
        message: question,
        context: sysCtx,
        category: cat,
        sessionId: sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || 'lawyer'
    };
    return fetch(API_BASE_URL + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
          if (!data || data.fallback) return null;
          return { reply: data.reply, sources: data.sources || [] };
      })
      .catch(function () { return null; });
}