
function onCaseParishChange() {
    const parish = getCaseLocationValue('caseParish');
    const villageContainer = document.getElementById("caseVillageContainer");
    const villageWrapper = document.getElementById("caseVillageWrapper");
    
    removeCaseManualInput('caseVillage');
    
    if (parish) {
        villageContainer.style.display = "block";
        
        const caseVillageList = (typeof ugandaGeo !== 'undefined')
            ? ugandaGeo.villages(document.getElementById("caseDistrict").value, getCaseLocationValue('caseCounty'), getCaseLocationValue('caseSubCounty'), parish) : [];
        if (caseVillageList.length > 0) {
            villageWrapper.innerHTML = `
                <select id="caseVillage" class="input-select" style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;">
                    <option value="">-- Select Village --</option>
                    ${caseVillageList.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}
                </select>
            `;
            showCaseManualEntryOption('caseVillage');
        } else {
            villageWrapper.innerHTML = `
                <div id="caseVillage_manual_container">
                    <input type="text" id="caseVillage_manual" class="input-box" 
                           placeholder="Type village name..." 
                           style="width:100%; padding:12px; border:2px solid #1a4080; border-radius:8px; font-size:16px; margin-top:5px; background: #f0f5ff;">
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                         Manual entry mode - Type your village name
                    </div>
                </div>
            `;
        }
    } else {
        villageContainer.style.display = "none";
    }
}

function getCaseLocationValue(fieldId) {
    const selectElement = document.getElementById(fieldId);
    const manualInput = document.getElementById(`${fieldId}_manual`);
    
    if (manualInput && manualInput.style.display !== 'none' && manualInput.value.trim() !== '') {
        return manualInput.value.trim();
    }
    
    if (selectElement && selectElement.style.display !== 'none') {
        return selectElement.value;
    }
    
    return '';
}
function showCaseManualEntryOption(fieldId) {
    const containerId = getCaseContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const existingOption = document.getElementById(`${fieldId}_manual_option`);
    if (existingOption) existingOption.remove();
    
    const label = getCaseFieldLabel(fieldId);
    const optionHtml = `
        <div id="${fieldId}_manual_option" style="margin-top: 5px; font-size: 12px;">
            <span style="color: #999;">Can't find your ${label.toLowerCase()}?</span>
            <span onclick="enableCaseManualInput(${escapeHtml(JSON.stringify(String(fieldId)))})" style="color: #1a4080; cursor: pointer; font-weight: bold;"> Type it manually →</span>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', optionHtml);
}

function enableCaseManualInput(fieldId) {
    const option = document.getElementById(`${fieldId}_manual_option`);
    if (option) option.remove();
    
    const selectElement = document.getElementById(fieldId);
    if (!selectElement) return;
    
    selectElement.style.display = "none";
    
    let manualInput = document.getElementById(`${fieldId}_manual`);
    if (manualInput) {
        manualInput.style.display = "block";
        manualInput.value = '';
        manualInput.focus();
        return;
    }
    
    const label = getCaseFieldLabel(fieldId);
    const containerId = getCaseContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const inputHtml = `
        <div id="${fieldId}_manual_container" style="margin-top: 8px;">
            <input type="text" id="${fieldId}_manual" class="input-box" 
                   placeholder="Type ${label} name..." 
                   style="width:100%; padding:12px; border:2px solid #1a4080; border-radius:8px; font-size:16px; margin-top:5px; background: #f0f5ff;"
                   onchange="handleCaseManualInputChange(${escapeHtml(JSON.stringify(String(fieldId)))})"
                   onkeyup="if(event.key==='Enter') handleCaseManualInputChange(${escapeHtml(JSON.stringify(String(fieldId)))})">
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                 Manual entry mode
                <span onclick="switchCaseToSelect(${escapeHtml(JSON.stringify(String(fieldId)))})" style="color: #1a4080; cursor: pointer; margin-left: 10px;">← Switch back to dropdown</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', inputHtml);
    setTimeout(() => {
        const input = document.getElementById(`${fieldId}_manual`);
        if (input) input.focus();
    }, 100);
}

function showCaseManualInput(fieldId, label, parentValue) {
    const containerId = getCaseContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (document.getElementById(`${fieldId}_manual`)) {
        document.getElementById(`${fieldId}_manual`).style.display = "block";
        document.getElementById(`${fieldId}_manual`).focus();
        return;
    }
    
    const existingOption = document.getElementById(`${fieldId}_manual_option`);
    if (existingOption) existingOption.remove();
    
    const inputHtml = `
        <div id="${fieldId}_manual_container" style="margin-top: 8px;">
            <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #ffc107;">
                <strong> No ${label.toLowerCase()} data available for "${parentValue}"</strong>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #555;">Please type your ${label.toLowerCase()} name manually below.</p>
            </div>
            <input type="text" id="${fieldId}_manual" class="input-box" 
                   placeholder="Type ${label} name..." 
                   style="width:100%; padding:12px; border:2px solid #1a4080; border-radius:8px; font-size:16px; margin-top:5px; background: #f0f5ff;"
                   onchange="handleCaseManualInputChange(${escapeHtml(JSON.stringify(String(fieldId)))})"
                   onkeyup="if(event.key==='Enter') handleCaseManualInputChange(${escapeHtml(JSON.stringify(String(fieldId)))})">
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                 Manual entry mode - Press Enter or click away to confirm
                <span onclick="switchCaseToSelect(${escapeHtml(JSON.stringify(String(fieldId)))})" style="color: #1a4080; cursor: pointer; margin-left: 10px;">← Switch to dropdown</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', inputHtml);
    setTimeout(() => {
        const input = document.getElementById(`${fieldId}_manual`);
        if (input) input.focus();
    }, 100);
}

function handleCaseManualInputChange(fieldId) {
    var manualInput = document.getElementById(fieldId + '_manual');
    if (!manualInput) return;

    var value = manualInput.value.trim();
    if (!value) {
        manualInput.style.borderColor = '#ff6b6b';
        manualInput.style.background  = '#fff5f5';
        return;
    }
    manualInput.style.borderColor = '#1a4080';
    manualInput.style.background  = '#f0f5ff';

    var fieldMap = {
        'caseCounty':    { selectId:'caseCounty',    nextFunc:'onCaseCountyChange',    downstream:['caseSubCounty','caseParish','caseVillage'] },
        'caseSubCounty': { selectId:'caseSubCounty',  nextFunc:'onCaseSubCountyChange', downstream:['caseParish','caseVillage'] },
        'caseParish':    { selectId:'caseParish',     nextFunc:'onCaseParishChange',    downstream:['caseVillage'] },
        'caseVillage':   { selectId:'caseVillage',    nextFunc:null,                    downstream:[] }
    };
    var fieldInfo = fieldMap[fieldId];
    if (!fieldInfo) return;

    var saved = {};
    (fieldInfo.downstream || []).forEach(function(fid) {
        var v = (typeof getCaseLocationValue === 'function') ? getCaseLocationValue(fid) : '';
        if (v) saved[fid] = v;
    });

    var sel = document.getElementById(fieldInfo.selectId);
    if (sel) {
        var exists = false;
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === value) { exists = true; break; }
        }
        if (!exists) {
            var opt = document.createElement('option');
            opt.value = value; opt.text = value;
            sel.appendChild(opt);
        }
        sel.value = value;
    }

    if (fieldInfo.nextFunc && typeof window[fieldInfo.nextFunc] === 'function') {
        window[fieldInfo.nextFunc]();
    }

    if (Object.keys(saved).length > 0) {
        setTimeout(function() {
            var containerMap = { caseSubCounty:'caseSubCountyContainer', caseParish:'caseParishContainer', caseVillage:'caseVillageContainer' };
            Object.keys(saved).forEach(function(fid) {
                var v = saved[fid];
                var cid = containerMap[fid];
                if (cid) { var c = document.getElementById(cid); if (c) c.style.display = 'block'; }
                var mi = document.getElementById(fid + '_manual');
                if (mi) { mi.style.display = 'block'; mi.value = v; return; }
                var s = document.getElementById(fid);
                if (s) {
                    var found = false;
                    for (var j = 0; j < s.options.length; j++) {
                        if (s.options[j].value.toLowerCase() === v.toLowerCase()) { s.value = s.options[j].value; found = true; break; }
                    }
                    if (!found) { var o = document.createElement('option'); o.value = v; o.text = v; o.selected = true; s.appendChild(o); s.value = v; }
                }
            });
        }, 420);
    }
}
function switchCaseToSelect(fieldId) {
    removeCaseManualInput(fieldId);
    
    const selectElement = document.getElementById(fieldId);
    if (selectElement) {
        selectElement.style.display = "block";
        selectElement.value = "";
    }
    
    showCaseManualEntryOption(fieldId);
}

function removeCaseManualInput(fieldId) {
    const manualContainer = document.getElementById(`${fieldId}_manual_container`);
    if (manualContainer) manualContainer.remove();
    
    const manualOption = document.getElementById(`${fieldId}_manual_option`);
    if (manualOption) manualOption.remove();
}

function getCaseContainerId(fieldId) {
    const containerMap = {
        'caseCounty': 'caseCountyContainer',
        'caseSubCounty': 'caseSubCountyContainer',
        'caseParish': 'caseParishContainer',
        'caseVillage': 'caseVillageContainer',
        'caseDistrict': 'caseDistrictContainer'
    };
    return containerMap[fieldId] || `${fieldId}Container`;
}

function getCaseFieldLabel(fieldId) {
    const labels = {
        'caseCounty': 'County',
        'caseSubCounty': 'Sub-county',
        'caseParish': 'Parish',
        'caseVillage': 'Village'
    };
    return labels[fieldId] || fieldId.replace('case', '');
}


function validatePhoneInput(input, statusDiv) {
    const phone = input.value.trim();
    
    if (phone.length === 0) {
        if (statusDiv) statusDiv.innerHTML = '';
        input.style.borderColor = '#ccc';
        input.style.background = '#eef4f3';
        return;
    }
    
    const isValid = /^07\d{8}$/.test(phone) || /^\+256\d{9}$/.test(phone);
    
    if (isValid) {
        if (statusDiv) statusDiv.innerHTML = `<span style="color:#28a745;"> Valid phone number</span>`;
        input.style.borderColor = '#28a745';
        input.style.background = '#f0fff4';
    } else {
        let errorMsg = ' Invalid format. ';
        if (phone.startsWith('07')) {
            errorMsg += 'Use 07XXXXXXXX (10 digits)';
        } else if (phone.startsWith('+256')) {
            errorMsg += 'Use +256XXXXXXXXX (13 characters)';
        } else {
            errorMsg += 'Use 07XXXXXXXX or +256XXXXXXXXX';
        }
        if (statusDiv) statusDiv.innerHTML = `<span style="color:#dc3545;">${errorMsg}</span>`;
        input.style.borderColor = '#dc3545';
        input.style.background = '#fff5f5';
    }
}


async function showAdminNotificationsPanel() {
    const notifications = await getNotificationsForUser('admin');
    const notifList   = Array.isArray(notifications) ? notifications : [];
    const unreadCount = await getUnreadCount('admin');
    const urgentArr   = await getUrgentNotifications('admin');
    const urgentCount = Array.isArray(urgentArr) ? urgentArr.length : 0;
    
    let html = `
        <div id="adminNotificationsPanel" style="background:white; border-radius:12px; padding:20px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #1a4080; padding-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <h3 style="color:#1a4080; margin:0;"> Admin Notifications</h3>
                    ${unreadCount > 0 ? `<span style="background:#dc3545; color:white; padding:2px 12px; border-radius:12px; font-size:12px; font-weight:bold; animation:pulse 1.5s infinite;">${unreadCount} New</span>` : ''}
                    ${urgentCount > 0 ? `<span style="background:#dc3545; color:white; padding:2px 12px; border-radius:12px; font-size:12px; font-weight:bold; animation:pulse 1.5s infinite; background:#dc3545 !important;"> ${urgentCount} Urgent</span>` : ''}
                </div>
                <div style="display:flex; gap:10px;">
                    ${unreadCount > 0 ? `<button onclick="markAllAdminNotificationsAsRead()" style="padding:6px 15px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">Mark All Read</button>` : ''}
                </div>
            </div>
            
            <div id="adminNotificationsList" style="max-height:500px; overflow-y:auto;">
    `;
    
    if (notifications.length === 0) {
        html += `
            <div style="text-align:center; padding:40px; color:#999;">
                <div style="font-size:48px; margin-bottom:10px;"></div>
                <p>No notifications yet</p>
            </div>
        `;
    } else {
        notifications.forEach(notif => {
            const isUrgent = notif.priority <= 2;
            const bgColor = notif.read ? '#f8f9fa' : (isUrgent ? '#fff3cd' : '#f0f5ff');
            const borderColor = isUrgent ? '#dc3545' : (notif.read ? '#ccc' : '#1a4080');
            const icon = getNotificationIcon(notif.type);
            
            html += `
                <div onclick="lcdjpOpenNotification(${escapeHtml(JSON.stringify(notif))})" 
                     style="background:${bgColor}; 
                            padding:15px; 
                            margin-bottom:10px; 
                            border-radius:8px; 
                            cursor:pointer;
                            transition: all 0.2s ease;
                            ${!notif.read ? 'box-shadow: 0 2px 8px rgba(26,64,128,0.1);' : ''}"
                     onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                     onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none';">
                    <div style="display:flex; align-items:flex-start; gap:12px;">
                        <div style="font-size:24px;">${icon}</div>
                        <div style="flex:1;">
                            <div style="font-weight:${notif.read ? 'normal' : 'bold'}; color:${notif.read ? '#555' : '#333'};">
                                ${escapeHtml(notif.message)}
                            </div>
                            ${notif.caseId ? `<div style="font-size:12px; color:#1a4080; font-weight:bold;">Case: ${escapeHtml(notif.caseId)}</div>` : ''}
                            ${(notif.link && /^(https?:\/\/|\/|#)/.test(String(notif.link))) ? `<div style="font-size:12px; color:#007bff; cursor:pointer; text-decoration:underline;" onclick="event.stopPropagation(); window.location.href=${escapeHtml(JSON.stringify(String(notif.link)))};">View Details →</div>` : ''}
                            <div style="font-size:11px; color:#999; margin-top:4px;">
                                ${new Date(notif.timestamp).toLocaleString()}
                                ${!notif.read ? ' • <span style="color:#dc3545; font-weight:bold;">New</span>' : ''}
                                ${isUrgent ? ' • <span style="color:#dc3545; font-weight:bold;"> Urgent</span>' : ''}
                            </div>
                        </div>
                        ${!notif.read ? `<div style="width:10px; height:10px; background:#dc3545; border-radius:50%; flex-shrink:0; margin-top:5px;"></div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        const existingPanel = document.getElementById('adminNotificationsPanel');
        if (existingPanel) existingPanel.remove();
        
        const header = adminDashboard.querySelector('.admin-header');
        if (header) {
            header.insertAdjacentHTML('afterend', html);
        } else {
            adminDashboard.insertAdjacentHTML('afterbegin', html);
        }
    }
}

async function markAllAdminNotificationsAsRead() {
    const count = await markAllNotificationsAsRead('admin');
    if (count > 0) {
        showToast(`${count} notifications marked as read`);
        refreshAdminNotifications();
        renderNavbarNotifBadge();
    }
}

function refreshAdminNotifications() {
    showAdminNotificationsPanel();
    renderNavbarNotifBadge();
}


function notifyEscalatedLCOfficials(officials, caseData, level, locationType) {
    if (officials.length === 0) return;
    officials.forEach(lc => {
        _lcdjpCreateNotification(lc.username,
            ` Escalated case: ${caseData.caseType} from ${caseData.village}, ${caseData.parish} (No LC1 in parish)`,
            'new_case', caseData.caseId);
    });
}








function findCaseById(caseId) {
    var caseRef = String(caseId == null ? '' : caseId).trim();
    if (!caseRef || /^(n\/a|null|undefined|none)$/i.test(caseRef)) return null;

    let found = cases.find(c => String(getCaseReference(c) || '') === caseRef);
    if (found) return found;

    return fetchCaseFromAPI(caseRef);
}
async function fetchCaseFromAPI(caseRef) {
    try {
        if (!caseRef || /^(n\/a|null|undefined|none)$/i.test(String(caseRef))) return null;
        const response = await fetch(API_ENDPOINTS.case(encodeURIComponent(caseRef)), {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.success && data.case) {
            const fetchedCase = data.case;
            cases.push(fetchedCase);
            _lcdjpStore.cases = cases;
            return fetchedCase;
        }
        return null;
    } catch (error) {
        console.warn('Failed to fetch case from API:', error);
        return null;
    }
}













function viewCase(caseId) {
    return viewCitizenCase(caseId);
}
window.viewCase = viewCase;









function lawyerSendMessage(caseId) {
    return openCitizenMessaging(caseId);
}
window.lawyerSendMessage = lawyerSendMessage;








async function openLegalAdvice(caseId) {
    var caseRef = String(caseId == null ? '' : caseId).trim();
    if (!caseRef || /^(n\/a|null|undefined|none)$/i.test(caseRef)) {
        alert('No case reference available.');
        return;
    }

    var foundCase = typeof findCaseById === 'function' ? findCaseById(caseRef) : null;
    if (foundCase instanceof Promise) foundCase = await foundCase;
    var existingAdvice = foundCase ? (foundCase.legal_advice || foundCase.legalAdvice || '') : '';

    var html = `
    <div class="form-card" style="max-width:700px; margin:0 auto;">
        <h2 style="color:#1a4080; text-align:center;">Legal Advice</h2>
        <p style="text-align:center; color:#666; margin-bottom:20px;">Case: <strong>${_cmEsc(caseRef)}</strong></p>
        <label style="font-weight:600; display:block; margin-bottom:6px;">Legal Advice</label>
        <textarea id="legalAdviceInput" rows="8" class="input-box"
            placeholder="Write the legal advice for this case..."
            style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:15px; resize:vertical; box-sizing:border-box;">${_cmEsc(existingAdvice)}</textarea>
        <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="saveLegalAdvice(${escapeHtml(JSON.stringify(String(caseRef)))})" class="btn login-btn"
                style="flex:1; padding:14px; background:#1a237e; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px; font-weight:bold;">
                Save Advice
            </button>
            <button onclick="closeDynamicView(); if (typeof viewCase === 'function') viewCase(${escapeHtml(JSON.stringify(String(caseRef)))});" class="btn back-btn"
                style="padding:14px 20px; background:#999; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px;">
                ← Back to Case
            </button>
        </div>
    </div>`;

    openDynamicView(html);
}
window.openLegalAdvice = openLegalAdvice;

async function saveLegalAdvice(caseId) {
    var caseRef = String(caseId == null ? '' : caseId).trim();
    var textarea = document.getElementById('legalAdviceInput');
    var adviceText = textarea ? textarea.value.trim() : '';
    if (!adviceText) {
        alert('Please write the legal advice before saving.');
        return;
    }
    var uname = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    try {
        var resp = await fetch(API_ENDPOINTS.advice(caseRef), {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                legalAdvice: adviceText,
                legalAdviceDate: new Date().toISOString(),
                legalAdviceProvidedBy: uname,
                legal_advice_provided_by: uname
            })
        });
        if (!resp.ok) throw new Error('Failed to save advice');
        if (typeof showToast === 'function') showToast('Legal advice saved.');
        else alert('Legal advice saved.');
        closeDynamicView();
        if (typeof viewCase === 'function') viewCase(caseRef);
    } catch (error) {
        console.error('saveLegalAdvice error:', error);
        alert('Could not save legal advice. Please try again.');
    }
}
window.saveLegalAdvice = saveLegalAdvice;

async function showAppendDetailsForm(caseId) {
    console.log('showAppendDetailsForm called with caseId:', caseId);
    
    let foundCase = findCaseById(caseId);
    if (foundCase instanceof Promise) foundCase = await foundCase;
    if (!foundCase) {
        alert("Case not found. Please refresh and try again.");
        return;
    }

    let html = `
    <div class="form-card" style="max-width:800px; margin:0 auto;">
        <h2 style="color:#1a4080; text-align:center;"> Add Additional Information</h2>
        <p style="text-align:center; color:#666; margin-bottom:20px;">Case: <strong>${getCaseReference(foundCase) || 'N/A'}</strong> - ${escapeHtml(foundCase.caseType)}</p>
        
        <div style="background:#f0f5ff; padding:15px; border-radius:8px; margin-bottom:20px; border-left:4px solid #1a4080;">
            <p style="margin:0;"><strong>Original Description:</strong></p>
            <p style="margin:5px 0 0 0; color:#555; font-style:italic;">${escapeHtml(lcdjpReadableDescription(foundCase.description))}</p>
            ${foundCase.extraNotes ? `<p style="margin:10px 0 0 0; background:#fff3cd; padding:10px; border-left:3px solid #ffc107; border-radius:4px;"><strong>Previously Added:</strong> ${escapeHtml(foundCase.extraNotes)}</p>` : ''}
        </div>
        
        <div style="background:#fff3cd; padding:10px 15px; border-radius:8px; margin-bottom:15px; border-left:4px solid #ff9800;">
            <p style="margin:0; font-size:13px; color:#856404;">
                 <strong>Tip:</strong> You can add notes OR upload files OR record a voice message. 
                At least one of these is required.
            </p>
        </div>
        
        <label style="font-weight:600; display:block; margin-top:10px;"> Additional Notes</label>
        
        <div style="position:relative;">
            <textarea id="supplementaryNotesInput" rows="4" class="input-box" placeholder="Type any forgotten facts, additional evidence, or new information here..." style="width:100%; padding:12px 12px 46px 12px; border:1px solid #ccc; border-radius:8px; font-size:16px; resize:vertical; box-sizing:border-box;"></textarea>
            <button type="button" id="appendVoiceRecordBtn" onclick="toggleAppendVoiceRecording(${escapeHtml(JSON.stringify(String(caseId)))})"
                    title="Record a voice note"
                    style="position:absolute; bottom:10px; left:10px; display:flex; align-items:center; gap:6px; padding:5px 12px 5px 8px; background:#e0e0e0; color:#444; border:none; border-radius:20px; cursor:pointer; font-size:13px; font-weight:500; transition:background 0.2s;" onmouseover="this.style.background='#d0d0d0'" onmouseout="this.style.background='#e0e0e0'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                Voice note
            </button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px; min-height:18px;">
            <span id="appendVoiceStatus" style="font-size:11px; color:#6b7280; flex:1;"></span>
        </div>
        <div id="appendVoiceTimer" style="display:none; padding:8px 12px; background:#fff3cd; border-radius:6px; text-align:center; font-size:13px; color:#856404; margin-top:6px;">
            &#128308; Recording… <span id="appendVoiceTimerDisplay">0:00</span>
            <button onclick="stopAppendVoiceRecording()" style="margin-left:10px; padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">Stop</button>
        </div>
        <div id="appendVoicePreview" style="display:none; margin-top:8px; padding:10px; background:#e8f5e9; border-radius:8px; border-left:4px solid #28a745;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <audio id="appendVoiceAudio" controls style="flex:1; max-width:280px; height:36px;"></audio>
                <button onclick="clearAppendVoiceRecording()" style="padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px; flex-shrink:0;">Remove</button>
            </div>
        </div>
        <input type="hidden" id="appendVoiceData" value="">
        <input type="hidden" id="appendVoiceDuration" value="0">

        <div style="background:#f8f9fa; border-radius:8px; padding:15px; margin:15px 0; border:1px solid #ddd;">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                <span style="font-size:14px; font-weight:bold; color:#555;"> Attach a File</span>
                <span style="font-size:11px; color:#888;">Max 5MB, one file only</span>
            </div>
            <input type="file" id="appendFileInput" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp3,.mp4,.wav,.txt" 
                   style="width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:16px; background:white;" 
                   onchange="prependFilesPreview(this)">
            <div id="appendFilesPreview" style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
            <div style="font-size:12px; color:#666; margin-top:5px;">
                 Supported: PDF, Word, Images, Audio, Video, Text (Max 5MB). Attaching a new file replaces any file already on this case.
            </div>
        </div>
        
        <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="saveExtraCaseDetails(${escapeHtml(JSON.stringify(String(caseId)))})" class="btn login-btn" 
                    style="flex:1; padding:14px; background:#1a4080; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px; font-weight:bold;">
                 Save & Add to Case
            </button>
            <button onclick="closeDynamicView(); showMyCases();" class="btn back-btn" 
                    style="padding:14px 20px; background:#999; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px;">
                ← Back to My Cases
            </button>
        </div>
    </div>`;
    
    openDynamicView(html);
}

function toggleAppendVoiceRecording(caseId) {
    appendCurrentCaseId = caseId;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Voice recording is not supported in this browser.');
        return;
    }
    
    if (!window.MediaRecorder) {
        showToast('MediaRecorder API not supported. Please use Chrome or Firefox.');
        return;
    }
    
    if (appendIsRecording) {
        stopAppendVoiceRecording();
    } else {
        startAppendVoiceRecording();
    }
}

function startAppendVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            appendMediaRecorder = new MediaRecorder(stream);
            appendAudioChunks = [];
            
            appendMediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    appendAudioChunks.push(event.data);
                }
            };
            
            appendMediaRecorder.onstop = () => {
                if (appendAudioChunks.length === 0) {
                    showToast('No audio recorded. Please try again.');
                    return;
                }
                
                const audioBlob = new Blob(appendAudioChunks, { type: 'audio/webm' });
                appendRecordedBlob = audioBlob;
                showAppendVoicePreview(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            appendMediaRecorder.start(100);
            appendIsRecording = true;
            appendRecordingStartTime = Date.now();
            
            const recordBtn = document.getElementById('appendVoiceRecordBtn');
            if (recordBtn) {
                recordBtn.textContent = ' Stop';
                recordBtn.style.background = '#dc3545';
            }
            
            const status = document.getElementById('appendVoiceStatus');
            if (status) {
                status.textContent = ' Recording...';
                status.style.color = '#dc3545';
            }
            
            const timer = document.getElementById('appendVoiceTimer');
            if (timer) {
                timer.style.display = 'block';
            }
            
            let seconds = 0;
            if (appendRecordingTimer) clearInterval(appendRecordingTimer);
            appendRecordingTimer = setInterval(() => {
                seconds++;
                const display = document.getElementById('appendVoiceTimerDisplay');
                if (display) {
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            }, 1000);
            
            setTimeout(() => {
                if (appendIsRecording) {
                    stopAppendVoiceRecording();
                    showToast('Recording stopped (60 second limit)');
                }
            }, 60000);
            
            showToast('Recording started... Speak your additional information!');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                showToast('Please allow microphone access to record.');
            } else if (error.name === 'NotFoundError') {
                showToast('No microphone found. Please connect a microphone.');
            } else {
                showToast('Could not access microphone: ' + error.message);
            }
        });
}

function stopAppendVoiceRecording() {
    if (!appendIsRecording || !appendMediaRecorder) return;
    
    appendIsRecording = false;
    
    try {
        appendMediaRecorder.stop();
    } catch (e) {
        console.error('Error stopping recorder:', e);
    }
    
    if (appendRecordingTimer) {
        clearInterval(appendRecordingTimer);
        appendRecordingTimer = null;
    }
    
    const recordBtn = document.getElementById('appendVoiceRecordBtn');
    if (recordBtn) {
        recordBtn.textContent = ' Record';
        recordBtn.style.background = '#dc3545';
    }
    
    const status = document.getElementById('appendVoiceStatus');
    if (status) {
        status.textContent = ' Stopped';
        status.style.color = '#888';
    }
    
    const timer = document.getElementById('appendVoiceTimer');
    if (timer) {
        timer.style.display = 'none';
    }
}

function showAppendVoicePreview(audioBlob) {
    const preview = document.getElementById('appendVoicePreview');
    const audio = document.getElementById('appendVoiceAudio');
    const dataInput = document.getElementById('appendVoiceData');
    const durationInput = document.getElementById('appendVoiceDuration');
    
    if (!preview || !audio) return;
    
    const duration = appendRecordingStartTime ? Math.floor((Date.now() - appendRecordingStartTime) / 1000) : 0;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const audioData = e.target.result;
        if (dataInput) dataInput.value = audioData;
        if (durationInput) durationInput.value = duration;
        
        audio.src = URL.createObjectURL(audioBlob);
        preview.style.display = 'block';
        
        const status = document.getElementById('appendVoiceStatus');
        if (status) {
            status.textContent = ` Ready (${duration}s)`;
            status.style.color = '#28a745';
        }
        
        showToast('Recording ready! Click Save to add it to your case.');
    };
    reader.readAsDataURL(audioBlob);
}

function clearAppendVoiceRecording() {
    const preview = document.getElementById('appendVoicePreview');
    const audio = document.getElementById('appendVoiceAudio');
    const dataInput = document.getElementById('appendVoiceData');
    const durationInput = document.getElementById('appendVoiceDuration');
    const status = document.getElementById('appendVoiceStatus');
    
    if (preview) preview.style.display = 'none';
    if (audio) audio.src = '';
    if (dataInput) dataInput.value = '';
    if (durationInput) durationInput.value = '0';
    if (status) {
        status.textContent = 'Click to record';
        status.style.color = '#888';
    }
    
    appendRecordedBlob = null;
    showToast('Recording cleared');
}

async function saveExtraCaseDetails(caseId) {
    console.log('saveExtraCaseDetails called with caseId:', caseId);
    
    let foundCase = findCaseById(caseId);
    if (foundCase instanceof Promise) foundCase = await foundCase;
    if (!foundCase) {
        alert("Case not found. Please refresh and try again.");
        return;
    }

    const extraNotes = document.getElementById("supplementaryNotesInput")?.value.trim() || '';
    const voiceData = document.getElementById('appendVoiceData')?.value || '';
    const voiceDuration = parseInt(document.getElementById('appendVoiceDuration')?.value) || 0;
    
    const fileInput = document.getElementById('appendFileInput');
    
    
    
    let file = fileInput?.files?.[0] || null;
    if (file) file = await window.lcdjpCompressImageFile(file);
    
    if (!extraNotes && !file && !voiceData) {
        alert("Please enter some information, attach a file, or record a voice note before saving.");
        return;
    }

    if (!_isLawyerAuthenticated()) {
        if (typeof showToast === 'function') showToast('Please login first.');
        return;
    }

    const actor = sessionStorage.getItem("lcdjp_fullname") || "Citizen";
    const headers = _getLawyerAuthHeaders();

    let fileData = null;
    if (file) {
        try {
            fileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } catch (e) {
            alert('Error reading the attached file. Please try again.');
            return;
        }
    }

    try {
        
        
        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) {
            alert('Failed to load the latest case details. Please try again.');
            return;
        }
        const caseData = await caseResp.json();
        const serverCase = caseData.case || caseData;

        let timeline = serverCase.timeline
            ? (typeof serverCase.timeline === 'string' ? JSON.parse(serverCase.timeline) : serverCase.timeline)
            : [];

        let updateDetails = [];
        if (extraNotes) updateDetails.push(' Added notes');
        if (voiceData) updateDetails.push(' Voice recording');
        if (fileData) updateDetails.push(' File attached');

        timeline.push({
            action: "Additional Information Added",
            actor: actor,
            details: updateDetails.join(' • ') + (extraNotes ? `\n ${extraNotes}` : ''),
            timestamp: new Date().toLocaleString()
        });

        if (fileData) {
            timeline.push({
                action: "File Attached",
                actor: actor,
                details: ` ${fileData.name} (${formatFileSize(fileData.size)})`,
                timestamp: new Date().toLocaleString()
            });
        }

        if (voiceData) {
            timeline.push({
                action: "Voice Note Added",
                actor: actor,
                details: ` Voice recording (${voiceDuration} seconds)`,
                timestamp: new Date().toLocaleString()
            });
        }

        const updateData = {
            extraNotes: extraNotes || serverCase.extra_notes || serverCase.extraNotes || '',
            timeline: JSON.stringify(timeline)
        };
        if (fileData) {
            updateData.attachedMedia = fileData.name;
            updateData.attachedFileData = fileData.data;
            updateData.attachedFileSize = fileData.size;
            updateData.attachedFileType = fileData.type;
        }
        if (voiceData) {
            updateData.voiceNoteData = voiceData;
            updateData.voiceNoteDuration = voiceDuration;
        }

        const updateResp = await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(updateData)
        });

        if (!updateResp.ok) {
            if (updateResp.status === 401 || updateResp.status === 403) {
                alert('Authentication error. Please login again.');
                return;
            }
            throw new Error('Failed to save additional information');
        }

        const updatedCase = await updateResp.json();
        Object.assign(foundCase, updatedCase.case || updatedCase);
        _lcdjpStore.cases = cases;

        const handler = foundCase.currentHandler || foundCase.current_handler;
        if (handler) {
            createEnhancedNotification(
                handler,
                ` ${actor} added information to case ${caseId}`,
                'case_updated',
                caseId
            );
        }
        
        let successMsg = " Additional information saved to the case!\n\n";
        if (extraNotes) successMsg += ` Notes: ${extraNotes.substring(0, 100)}${extraNotes.length > 100 ? '...' : ''}\n`;
        if (voiceData) successMsg += ` Voice recording (${voiceDuration}s) saved\n`;
        if (fileData) successMsg += ` File attached: ${fileData.name}\n`;
        
        alert(successMsg);
        closeDynamicView();
        viewCitizenCase(caseId);
        renderNavbarNotifBadge();
    } catch (error) {
        console.error('Error saving additional case details:', error);
        alert('Failed to save additional information: ' + error.message);
    }
}


function showAuditLogsPage() {
    
    hideAllDashboardViews();
    
    const adminDashEl = document.getElementById('adminDashboard');
    if (adminDashEl) adminDashEl.style.display = 'block';
    setAdminActiveMenu('auditlogs');
    
    hideAdminContainers();
    
    
    const container = document.getElementById('auditLogsContainer');
    if (container) {
        container.style.display = 'block';
        loadAuditLogs();
    }
}

function hideAdminContainers() {
    const containers = [
        'adminHomeContainer',
        'approvalContainer',
        'userManagementContainer',
        'lawyerManagementContainer',
        'lawyerPerformanceContainer',
        'statisticsContainer',
        'pdfExportContainer',
        'searchResultsContainer',
        'auditLogsContainer'
    ];
    
    containers.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    });
}

function loadAuditLogs() {
    const container = document.getElementById('auditLogsList');
    if (!container) {
        console.error('auditLogsList not found');
        return;
    }
    
    
    if (!_isLawyerAuthenticated()) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#dc3545;">Please login to view audit logs.</div>';
        return;
    }
    
    const token = _getLawyerToken();
    if (!token) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#dc3545;">Please login to view audit logs.</div>';
        return;
    }
    
    const search = document.getElementById('auditLogSearch')?.value || '';
    const actionFilter = document.getElementById('auditLogActionFilter')?.value || '';
    
    let url = `${API_BASE_URL}/api/auth/audit-logs`;
    const params = new URLSearchParams();
    if (search) params.append('username', search);
    if (actionFilter) params.append('action', actionFilter);
    if (params.toString()) url += '?' + params.toString();
    
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Loading audit logs...</div>';
    
    const headers = _getLawyerAuthHeaders();
    fetch(url, {
        headers: headers
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication error. Please login again.');
            }
            if (response.status === 404) {
                throw new Error('Audit logs endpoint not found. Please check backend configuration.');
            }
            throw new Error('Failed to fetch audit logs');
        }
        return response.json();
    })
    .then(data => {
        const logs = data.logs || [];
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#999;">
                    <div style="font-size:36px; margin-bottom:10px;"></div>
                    <p>No audit logs found.</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div style="overflow:auto; max-height:60vh; padding:10px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#1a237e; color:white;">
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">User</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Role</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Action</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Entity</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Details</th>
                            <th style="padding:10px 12px; text-align:left; position:sticky; top:0; background:#1a237e; z-index:1;">Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        logs.forEach(log => {
            const actionColor = getActionColor(log.action);
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px 12px; font-weight:500;">${escapeHtml(log.username || 'N/A')}</td>
                    <td style="padding:10px 12px;">${escapeHtml(log.user_role || 'N/A')}</td>
                    <td style="padding:10px 12px;">
                        <span style="background:${actionColor}; color:white; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600;">
                            ${escapeHtml(log.action || 'N/A')}
                        </span>
                    </td>
                    <td style="padding:10px 12px;">${escapeHtml(log.entity_type || 'N/A')} ${escapeHtml(log.entity_id ? '#' + log.entity_id : '')}</td>
                    <td style="padding:10px 12px; max-width:300px; word-wrap:break-word;">${escapeHtml(log.details || 'N/A')}</td>
                    <td style="padding:10px 12px; font-size:12px; color:#888;">${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            <div style="padding:12px; background:#f8f9fa; border-top:1px solid #ddd; text-align:center; font-size:12px; color:#888;">
                Showing ${escapeHtml(logs.length)} entries
            </div>
        `;
        
        container.innerHTML = html;
    })
    .catch(error => {
        console.error('Error loading audit logs:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#dc3545;">
                <div style="font-size:36px; margin-bottom:10px;"></div>
                <p style="font-weight:bold;">${escapeHtml(error.message)}</p>
                <p style="font-size:12px; color:#888; margin-top:10px;">Make sure the backend is running and audit logs are configured.</p>
                <button onclick="loadAuditLogs()" style="margin-top:15px; padding:8px 20px; background:#1a237e; color:white; border:none; border-radius:6px; cursor:pointer;">
                    Retry
                </button>
            </div>
        `;
    });
}


function getActionColor(action) {
    const colors = {
        'LOGIN': '#28a745',
        'LOGIN_FAILED': '#dc3545',
        'REGISTER': '#17a2b8',
        'CASE_CREATED': '#6f157d',
        'CASE_ACCEPTED': '#28a745',
        'CASE_FORWARDED': '#ff9800',
        'CASE_RESOLVED': '#28a745',
        'CASE_DELETED': '#dc3545',
        'LEGAL_ADVICE_ADDED': '#007bff',
        'MESSAGE_ADDED': '#17a2b8',
        'USER_APPROVED': '#28a745',
        'USER_REJECTED': '#dc3545',
        'USER_DELETED': '#dc3545',
        'USER_DEACTIVATED': '#e8730a',
        'USER_AUTO_DELETED': '#dc3545',
        'USER_UPDATED': '#007bff'
    };
    return colors[action] || '#6c757d';
}

function refreshAuditLogs() {
    document.getElementById('auditLogSearch').value = '';
    document.getElementById('auditLogActionFilter').value = '';
    loadAuditLogs();
}

function loadAuditLogsByDate() {
    const fromDate = document.getElementById('auditLogDateFrom')?.value;
    const toDate = document.getElementById('auditLogDateTo')?.value;
    
    if (!fromDate || !toDate) {
        alert('Please select both date fields.');
        return;
    }
    
    const token = getAuthToken();
    if (!token) {
        alert('Please login first.');
        return;
    }
    
    const container = document.getElementById('auditLogsList');
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Loading...</div>';
    
    fetch(`${API_BASE_URL}/api/auth/audit-logs?startDate=${fromDate}&endDate=${toDate}`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        const logs = data.logs || [];
        displayAuditLogs(logs);
    })
    .catch(error => {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#dc3545;">Error: ${escapeHtml(error.message)}</div>`;
    });
}

function displayAuditLogs(logs) {
    const container = document.getElementById('auditLogsList');
    if (!container) return;
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999;">
                <div style="font-size:36px; margin-bottom:10px;"></div>
                <p>No audit logs found.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x:auto; padding:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="background:#1a237e; color:white;">
                        <th style="padding:10px 12px; text-align:left;">User</th>
                        <th style="padding:10px 12px; text-align:left;">Role</th>
                        <th style="padding:10px 12px; text-align:left;">Action</th>
                        <th style="padding:10px 12px; text-align:left;">Entity</th>
                        <th style="padding:10px 12px; text-align:left;">Details</th>
                        <th style="padding:10px 12px; text-align:left;">Time</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    logs.forEach(log => {
        const actionColor = getActionColor(log.action);
        html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px 12px; font-weight:500;">${escapeHtml(log.username || 'N/A')}</td>
                <td style="padding:10px 12px;">${escapeHtml(log.user_role || 'N/A')}</td>
                <td style="padding:10px 12px;">
                    <span style="background:${actionColor}; color:white; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600;">
                        ${escapeHtml(log.action || 'N/A')}
                    </span>
                </td>
                <td style="padding:10px 12px;">${escapeHtml(log.entity_type || 'N/A')} ${escapeHtml(log.entity_id ? '#' + log.entity_id : '')}</td>
                <td style="padding:10px 12px; max-width:300px; word-wrap:break-word;">${escapeHtml(log.details || 'N/A')}</td>
                <td style="padding:10px 12px; font-size:12px; color:#888;">${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="padding:12px; background:#f8f9fa; border-top:1px solid #ddd; text-align:center; font-size:12px; color:#888;">
            Showing ${escapeHtml(logs.length)} entries
        </div>
    `;
    
    container.innerHTML = html;
}
function debugAdditionalInfo(caseId) {
    const foundCase = cases.find(c => c.caseId === caseId);
    if (!foundCase) {
        console.log('Case not found');
        return;
    }
    
    console.log('=== ADDITIONAL INFO DEBUG ===');
    console.log('Case ID:', caseId);
    console.log('Has additionalInfo:', !!foundCase.additionalInfo);
    console.log('Additional Info count:', foundCase.additionalInfo ? foundCase.additionalInfo.length : 0);
    
    if (foundCase.additionalInfo) {
        foundCase.additionalInfo.forEach((info, index) => {
            console.log(`Entry ${index + 1}:`);
            console.log('- Timestamp:', info.timestamp);
            console.log('- Has notes:', !!info.extraNotes);
            console.log('- Has voice:', !!info.voiceData);
            console.log('- Files count:', info.files ? info.files.length : 0);
            if (info.files) {
                info.files.forEach((file, fIdx) => {
                    console.log(`File ${fIdx + 1}:`, file.name, formatFileSize(file.size || 0));
                    console.log('Has data:', !!file.data);
                });
            }
        });
    }
    console.log('===============================');
    
    const html = typeof renderAdditionalInfoDocuments === 'function' ? renderAdditionalInfoDocuments(foundCase) : '';
    if (html) {
        console.log('HTML generated successfully, length:', html.length);
        console.log('Preview:', html.substring(0, 500) + '...');
    } else {
        console.log('No HTML generated');
    }
    
    return foundCase;
}

window.debugAdditionalInfo = debugAdditionalInfo;

function prependFilesPreview(input) {
    const previewContainer = document.getElementById('appendFilesPreview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    
    const file = input.files[0];
    
    if (!file) {
        previewContainer.innerHTML = `<span style="font-size:12px; color:#999;">No file selected</span>`;
        return;
    }
    
    const fileIcon = getFileIcon(file.name);
    const isImage = file.type.startsWith('image/');
    
    const fileCard = document.createElement('div');
    fileCard.style.cssText = `
        background: white;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #ddd;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
    `;
    
    let previewHtml = `
        <span style="font-size:20px;">${fileIcon}</span>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;">${escapeHtml(file.name)}</span>
        <span style="color:#888; font-size:10px;">${formatFileSize(file.size)}</span>
    `;
    
    if (isImage) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = 'width:30px; height:30px; object-fit:cover; border-radius:4px;';
            const textSpan = fileCard.querySelector('span:nth-child(2)');
            if (textSpan) {
                fileCard.insertBefore(img, textSpan);
            }
        };
        reader.readAsDataURL(file);
    }
    
    fileCard.innerHTML = previewHtml;
    previewContainer.appendChild(fileCard);
}

async function processInlineTableUpload(inputElement, caseId) {
    const file = inputElement.files[0] ? await window.lcdjpCompressImageFile(inputElement.files[0]) : null;
    if (!file) return;

    
    if (!_isLawyerAuthenticated()) {
        if (typeof showToast === 'function') showToast('Please login first.');
        return;
    }

    const username = sessionStorage.getItem('lcdjp_username');
    const token = _getLawyerToken();
    if (!username || !token) {
        if (typeof showToast === 'function') showToast('Authentication error. Please login again.');
        return;
    }

    try {
        const headers = _getLawyerAuthHeaders();
        const fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const response = await fetch(API_ENDPOINTS.uploadDocument, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                file_data: fileData,
                owner: username,
                case_id: caseId,
                category: 'case_attachment',
                description: 'Inline case attachment'
            })
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                if (typeof showToast === 'function') showToast('Authentication error. Please login again.');
                return;
            }
            throw new Error('Upload failed');
        }
        if (typeof showToast === 'function') showToast(`Media attached: ${file.name}`);
    } catch (err) {
        console.error('processInlineTableUpload error:', err);
        if (typeof showToast === 'function') showToast('Failed to upload media file.');
    }
    updateMyCases();
}











function updateLawyerDashboardCasesDebounced() {
    clearTimeout(_lawyerSearchDebounceTimer);
    _lawyerSearchDebounceTimer = setTimeout(function () {
        updateLawyerDashboardCases();
    }, 250);
}
