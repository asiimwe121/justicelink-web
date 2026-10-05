



function _getAuthToken() {
    try {
        if (typeof getAuthToken === 'function') return getAuthToken();
        var token = localStorage.getItem('jwtToken') ||
            sessionStorage.getItem('jwtToken') || null;
        if (!token || token === 'null' || token === 'undefined') return null;
        return String(token).trim() || null;
    } catch (e) {
        return null;
    }
}

function _isAuthenticated() {
    var token = _getAuthToken();
    if (!token) return false;
    try {
        var parts = token.split('.');
        if (parts.length !== 3) return false;
        var encodedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (encodedPayload.length % 4) encodedPayload += '=';
        var payload = JSON.parse(atob(encodedPayload));
        var now = Math.floor(Date.now() / 1000);
        return (!payload.nbf || payload.nbf <= now) &&
            (!payload.exp || payload.exp > now);
    } catch (e) {
        return false;
    }
}

function _authHeaders(token, additionalHeaders) {
    var headers = Object.assign({
        'Content-Type': 'application/json'
    }, additionalHeaders || {});
    var activeToken = token || _getAuthToken();
    if (activeToken) headers.Authorization = 'Bearer ' + activeToken;
    return headers;
}

function _showAuthError(status, fallbackMessage) {
    var message = status === 401
        ? 'Your session has expired. Please log in again.'
        : status === 403
            ? 'You do not have permission to perform this action.'
            : (fallbackMessage || 'Authentication failed. Please log in again.');
    if (typeof showToast === 'function') showToast(message);
    else if (typeof alert === 'function') alert(message);
    return message;
}

function _handleAuthResponse(response, fallbackMessage) {
    if (!response || (response.status !== 401 && response.status !== 403)) return false;
    _showAuthError(response.status, fallbackMessage);
    return true;
}

function _requireAuth(message) {
    if (_isAuthenticated()) return _getAuthToken();
    _showAuthError(401, message || 'Please log in to continue.');
    return null;
}

function openSection(section) {
  const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    let title = "";
    let content = "";

    
    switch(section) {
        case 'rights':
            title = " Know Your Rights";
            content = `
                <h4>Your Fundamental Rights Under Ugandan Law</h4>
                <ul>
                    <li><strong>Right to Fair Hearing</strong> - Every person has the right to a fair, speedy, and public hearing before an independent court.</li>
                    <li><strong>Right to Legal Representation</strong> - You have the right to be represented by a lawyer of your choice.</li>
                    <li><strong>Freedom from Unlawful Detention</strong> - Police must inform you of charges within 48 hours of arrest.</li>
                    <li><strong>Right to Equality</strong> - All persons are equal before the law regardless of gender, religion, or ethnicity.</li>
                    <li><strong>Right to Property</strong> - No person shall be compulsorily deprived of property without compensation.</li>
                    <li><strong>Freedom of Expression</strong> - You have the right to express yourself within the law.</li>
                </ul>
                <p><strong>Note:</strong> These rights are protected under the 1995 Constitution of Uganda.</p>
            `;
            break;
            
        case 'questions':
            title = " Common Legal Questions";
            content = `
                <h4>Frequently Asked Legal Questions</h4>
                <h4> Land Disputes</h4>
                <p>Start at LC1 level, then escalate to LC2, LC3, then Magistrate Court. Always document boundaries and ownership papers.</p>
                <h4> Family Matters</h4>
                <p>Domestic violence, child custody, and marital disputes can be reported to LC courts or Family and Children's Court.</p>
                <h4> Employment Issues</h4>
                <p>Wrongful termination, unpaid wages, and discrimination cases go to the Industrial Court. File within 3 months.</p>
                <h4> Debt Recovery</h4>
                <p>For amounts under UGX 10 million, start at LC1. Higher amounts go to Magistrate Court.</p>
            `;
            break;
            
        case 'lawyer':
            title = "Find A Lawyer";
            content = `
                <div class="search-modal-intro">Search by specialization and request a lawyer with one tap.</div>
                <div class="search-modal-input-wrap">
                    <svg class="search-modal-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" id="lawyerSpecializationSearch" 
                           class="search-modal-input"
                           placeholder="e.g. Family, Land, Criminal..." 
                           onkeyup="filterSpecializations()">
                </div>
                <div id="specializationList" class="search-modal-list"></div>
            `;
            break;

            
        case 'legalAid':
            
            
            
            
            
            
            if (typeof window._lcdjpShowLegalAidOnMap === 'function') {
                window._lcdjpShowLegalAidOnMap();
            } else if (typeof showToast === 'function') {
                showToast('Legal aid map is unavailable right now. Please try again shortly.');
            }
            return;
            
        case 'localCouncils':
            title = " Local Council Offices";
            content = `
                <h4>LC Court Structure and Jurisdiction</h4>
                <h4>LC1 (Village Level)</h4>
                <ul>
                    <li>Handles minor civil disputes up to UGX 2,000,000</li>
                    <li>Neighbor disputes, noise complaints, small debts</li>
                    <li>Domestic disagreements, family mediation</li>
                </ul>
                <h4>LC2 (Parish Level)</h4>
                <ul>
                    <li>Handles disputes up to UGX 4,000,000</li>
                    <li>Appeals from LC1</li>
                    <li>Land boundary disputes, tenancy issues</li>
                </ul>
                <h4>LC3 (Sub-County Level)</h4>
                <ul>
                    <li>Handles disputes up to UGX 6,000,000</li>
                    <li>More complex civil matters</li>
                </ul>
                <p><strong>Note:</strong> Criminal matters must go directly to police, not LC courts.</p>
            `;
            break;
            
        case 'emergency':
            title = " Emergency Support";
            content = `
                <h4>Immediate Help for Urgent Situations</h4>
                <h4> Uganda Police Force</h4>
                <p><strong>Emergency Numbers:</strong> 999, 112<br>SMS: 820</p>
                <h4> Domestic Violence Hotline</h4>
                <p> Toll-free: 0800 100 100</p>
                <h4> Child Helpline</h4>
                <p> 116 (Toll-free)</p>
                <h4> If You Are Arrested:</h4>
                <ol>
                    <li>Remain calm and respectful</li>
                    <li>Ask for the reason for arrest</li>
                    <li>Request to contact a lawyer or family member</li>
                    <li>Do not sign anything without legal advice</li>
                    <li>Police must bring you to court within 48 hours</li>
                </ol>
            `;
            break;
            
        case 'landLaw':
            title = " Land & Property Law";
            content = `
                <h4>Land Tenure Systems in Uganda</h4>
                <ul>
                    <li><strong>Customary Tenure</strong> - Traditional ownership, most common in rural areas</li>
                    <li><strong>Mailo Tenure</strong> - Perpetual ownership, common in central Uganda</li>
                    <li><strong>Freehold Tenure</strong> - Absolute ownership</li>
                    <li><strong>Leasehold Tenure</strong> - Land held for a specific period (49 or 99 years)</li>
                </ul>
                <h4>Common Land Disputes</h4>
                <ul>
                    <li>Boundary disagreements between neighbors</li>
                    <li>Land ownership claims</li>
                    <li>Unlawful evictions</li>
                    <li>Family inheritance conflicts</li>
                </ul>
                <h4>Important Documents to Keep</h4>
                <ul>
                    <li>Certificate of Title</li>
                    <li>Sale agreements</li>
                    <li>Survey maps</li>
                    <li>Tax receipts</li>
                </ul>
            `;
            break;
            
        case 'familyLaw':
            title = " Family & Marriage Law";
            content = `
                <h4>Types of Marriage in Uganda</h4>
                <ul>
                    <li><strong>Civil Marriage</strong> - Performed by a registrar</li>
                    <li><strong>Customary Marriage</strong> - According to local traditions</li>
                    <li><strong>Religious Marriage</strong> - In church or mosque</li>
                </ul>
                <h4>Grounds for Divorce</h4>
                <ul>
                    <li>Adultery</li>
                    <li>Cruelty (physical or emotional abuse)</li>
                    <li>Desertion (spouse left for 2+ years)</li>
                    <li>Irretrievable breakdown</li>
                </ul>
                <h4>Child Custody</h4>
                <p>The best interests of the child is the primary factor courts consider.</p>
            `;
            break;
            
        case 'employmentLaw':
            title = " Business & Employment Law";
            content = `
                <h4>Employee Rights in Uganda</h4>
                <h4>Employment Contracts</h4>
                <ul>
                    <li>Every employee must have a written contract</li>
                    <li>Probation period cannot exceed 6 months</li>
                </ul>
                <h4>Employee Entitlements</h4>
                <ul>
                    <li>Annual leave - 21 working days per year</li>
                    <li>Sick leave - 45 working days per year with doctor's note</li>
                    <li>Maternity leave - 60 working days with full pay</li>
                </ul>
                <h4>Unfair Dismissal</h4>
                <p>You can challenge unfair termination at the Industrial Court within 3 months.</p>
            `;
            break;
            
        case 'communityLaw':
            title = " Community Disputes (LC System)";
            content = `
                <h4>Resolving Disputes Through LC Courts</h4>
                <h4>Types of Cases LC Courts Handle</h4>
                <ul>
                    <li>Neighbor disputes (noise, trespass)</li>
                    <li>Minor debt recovery (under UGX 6 million)</li>
                    <li>Family disagreements (excluding divorce)</li>
                    <li>Land boundary disputes</li>
                    <li>Tenant-landlord issues</li>
                </ul>
                <h4>LC Court Process</h4>
                <ol>
                    <li><strong>Report</strong> - Present your case to LC Chairperson</li>
                    <li><strong>Mediation</strong> - LC official tries to settle through discussion</li>
                    <li><strong>Hearing</strong> - Both parties present evidence and witnesses</li>
                    <li><strong>Judgment</strong> - LC court issues written decision</li>
                    <li><strong>Appeal</strong> - Appeal to next LC level or Magistrate Court</li>
                </ol>
            `;
            break;
            
        default:
            title = " Legal Information";
            content = `<p>This section provides general legal information and guidance. For specific legal advice, please consult a qualified lawyer.</p>`;
    }
    
    const isSearchModal = (section === 'lawyer');
    const modalHtml = `
        <div class="modal-overlay${isSearchModal ? ' search-modal-overlay' : ''}" onclick="closeModalIfClickedOutside(event)">
            <div class="content-modal${isSearchModal ? ' search-content-modal' : ''}">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body${isSearchModal ? ' search-modal-body' : ''}">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
   document.body.insertAdjacentHTML('beforeend', modalHtml);
    lockScroll();
    
    if (section === 'lawyer') {
        setTimeout(filterSpecializations, 100);
    }
}

function toggleCaseVoiceRecording() {
    console.log(' toggleCaseVoiceRecording called');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast(' Voice recording is not supported in this browser.');
        return;
    }
    
    if (!window.MediaRecorder) {
        showToast(' MediaRecorder API not supported. Please use Chrome or Firefox.');
        return;
    }
    
    if (caseIsRecording) {
        stopCaseVoiceRecording();
    } else {
        startCaseVoiceRecording();
    }
}

function startCaseVoiceRecording() {
    console.log(' startCaseVoiceRecording called');
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log(' Microphone access granted for case recording');
            
            caseMediaRecorder = new MediaRecorder(stream);
            caseAudioChunks = [];
            
            caseMediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    caseAudioChunks.push(event.data);
                }
            };
            
            caseMediaRecorder.onstop = () => {
                console.log(' Case recording stopped, chunks:', caseAudioChunks.length);

                
                stream.getTracks().forEach(track => track.stop());
                
                if (caseAudioChunks.length === 0) {
                    showToast(' No audio recorded. Please try again.');
                    return;
                }
                
                const audioBlob = new Blob(caseAudioChunks, { type: 'audio/webm' });
                caseRecordedBlob = audioBlob;
                showCaseVoicePreview(audioBlob);
            };
            
            caseMediaRecorder.start(100);
            caseIsRecording = true;
            caseRecordingStartTime = Date.now();
            
            const recordBtn = document.getElementById('caseVoiceRecordBtn');
            if (recordBtn) {
                recordBtn.textContent = ' Stop';
                recordBtn.style.background = '#dc3545';
            }
            
            const status = document.getElementById('caseVoiceStatus');
            if (status) {
                status.textContent = ' Recording...';
                status.style.color = '#dc3545';
            }
            
            const timer = document.getElementById('caseVoiceTimer');
            if (timer) {
                timer.style.display = 'block';
            }
            
            let seconds = 0;
            if (caseRecordingTimer) clearInterval(caseRecordingTimer);
            caseRecordingTimer = setInterval(() => {
                seconds++;
                const display = document.getElementById('caseVoiceTimerDisplay');
                if (display) {
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            }, 1000);
            
            setTimeout(() => {
                if (caseIsRecording) {
                    stopCaseVoiceRecording();
                    showToast(' Recording stopped (60 second limit)');
                }
            }, 60000);
            
            showToast(' Recording started... Speak your statement!');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                showToast(' Please allow microphone access to record your statement.');
            } else if (error.name === 'NotFoundError') {
                showToast(' No microphone found. Please connect a microphone.');
            } else {
                showToast(' Could not access microphone: ' + error.message);
            }
        });
}

function showCaseVoicePreview(audioBlob) {
    const preview = document.getElementById('caseVoicePreview');
    const audio = document.getElementById('caseVoiceAudio');
    const dataInput = document.getElementById('caseVoiceData');
    const durationInput = document.getElementById('caseVoiceDuration');
    
    if (!preview || !audio) {
        console.error('Preview elements not found');
        return;
    }
    
    const duration = caseRecordingStartTime ? Math.floor((Date.now() - caseRecordingStartTime) / 1000) : 0;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const audioData = e.target.result;
        if (dataInput) dataInput.value = audioData;
        if (durationInput) durationInput.value = duration;
        
        if (caseRecordedObjectUrl) URL.revokeObjectURL(caseRecordedObjectUrl);
        caseRecordedObjectUrl = URL.createObjectURL(audioBlob);
        audio.src = caseRecordedObjectUrl;
        preview.style.display = 'block';
        
        const status = document.getElementById('caseVoiceStatus');
        if (status) {
            status.textContent = ` Recording ready (${duration}s)`;
            status.style.color = '#28a745';
        }
        
        showToast(' Recording ready! Click Submit to include it with your case.');
    };
    reader.readAsDataURL(audioBlob);
}


function startLawyerVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            lawyerMediaRecorder = new MediaRecorder(stream);
            lawyerAudioChunks = [];
            
            lawyerMediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    lawyerAudioChunks.push(event.data);
                }
            };
            
            lawyerMediaRecorder.onstop = () => {
                if (lawyerAudioChunks.length === 0) {
                    showToast(' No audio recorded.');
                    return;
                }
                
                const audioBlob = new Blob(lawyerAudioChunks, { type: 'audio/webm' });
                lawyerRecordedBlob = audioBlob;
                showLawyerVoicePreview(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            lawyerMediaRecorder.start(100);
            lawyerIsRecording = true;
            lawyerRecordingStartTime = Date.now();
            
            const recordBtn = document.getElementById('lawyerVoiceRecordBtn');
            if (recordBtn) {
                recordBtn.textContent = ' Stop';
                recordBtn.style.background = '#dc3545';
            }
            
            const status = document.getElementById('lawyerVoiceStatus');
            if (status) {
                status.textContent = ' Recording...';
                status.style.color = '#dc3545';
            }
            
            const timer = document.getElementById('lawyerVoiceTimer');
            if (timer) {
                timer.style.display = 'block';
            }
            
            let seconds = 0;
            if (lawyerRecordingTimer) clearInterval(lawyerRecordingTimer);
            lawyerRecordingTimer = setInterval(() => {
                seconds++;
                const display = document.getElementById('lawyerVoiceTimerDisplay');
                if (display) {
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            }, 1000);
            
            setTimeout(() => {
                if (lawyerIsRecording) {
                    stopLawyerVoiceRecording();
                    showToast(' Recording stopped (60 second limit)');
                }
            }, 60000);
            
            showToast(' Recording started...');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            const errName = error.name || '';
            let msg = '🎙 Microphone access failed.';
            if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                msg = ' Microphone permission denied.\n\nTo fix this:\n1. Click the  padlock / camera icon in your browser address bar.\n2. Set Microphone → Allow.\n3. Refresh the page and try again.';
                alert(msg);
            } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                msg = '🎙 No microphone found. Please connect a microphone and try again.';
                if (typeof showToast === 'function') showToast(msg);
            } else if (!window.isSecureContext) {
                msg = ' Voice recording requires HTTPS. Please open this page via a secure (https://) URL.';
                if (typeof showToast === 'function') showToast(msg);
            } else {
                if (typeof showToast === 'function') showToast('🎙 Could not access microphone: ' + error.message);
            }
        });
}

function stopLawyerVoiceRecording() {
    if (!lawyerIsRecording || !lawyerMediaRecorder) return;
    
    lawyerIsRecording = false;
    
    try {
        lawyerMediaRecorder.stop();
    } catch (e) {
        console.error('Error stopping recorder:', e);
    }
    
    if (lawyerRecordingTimer) {
        clearInterval(lawyerRecordingTimer);
        lawyerRecordingTimer = null;
    }
    
    const recordBtn = document.getElementById('lawyerVoiceRecordBtn');
    if (recordBtn) {
        recordBtn.textContent = ' Record';
        recordBtn.style.background = '#dc3545';
    }
    
    const status = document.getElementById('lawyerVoiceStatus');
    if (status) {
        status.textContent = ' Stopped';
        status.style.color = '#888';
    }
    
    const timer = document.getElementById('lawyerVoiceTimer');
    if (timer) {
        timer.style.display = 'none';
    }
}

function showLawyerVoicePreview(audioBlob) {
    const preview = document.getElementById('lawyerVoicePreview');
    const audio = document.getElementById('lawyerVoiceAudio');
    const dataInput = document.getElementById('lawyerVoiceData');
    const durationInput = document.getElementById('lawyerVoiceDuration');
    
    if (!preview || !audio) return;
    
    const duration = lawyerRecordingStartTime ? Math.floor((Date.now() - lawyerRecordingStartTime) / 1000) : 0;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const audioData = e.target.result;
        if (dataInput) dataInput.value = audioData;
        if (durationInput) durationInput.value = duration;
        
        audio.src = URL.createObjectURL(audioBlob);
        preview.style.display = 'block';
        
        const status = document.getElementById('lawyerVoiceStatus');
        if (status) {
            status.textContent = ` Ready (${duration}s)`;
            status.style.color = '#28a745';
        }
        
        showToast(' Recording ready! Click Send to share.');
    };
    reader.readAsDataURL(audioBlob);
}

function clearLawyerVoiceRecording() {
    const preview = document.getElementById('lawyerVoicePreview');
    const audio = document.getElementById('lawyerVoiceAudio');
    const dataInput = document.getElementById('lawyerVoiceData');
    const durationInput = document.getElementById('lawyerVoiceDuration');
    const status = document.getElementById('lawyerVoiceStatus');
    
    if (preview) preview.style.display = 'none';
    if (audio) audio.src = '';
    if (dataInput) dataInput.value = '';
    if (durationInput) durationInput.value = '0';
    if (status) {
        status.textContent = 'Click to record';
        status.style.color = '#888';
    }
    
    lawyerRecordedBlob = null;
}


async function sendLawyerVoiceMessage(caseId, audioBlob, duration, textMessage) {
    const token = _requireAuth('Please log in before sending a voice message.');
    if (!token) return;
    try {
        const username = localStorage.getItem('lcdjp_username');
        const fullname = localStorage.getItem('lcdjp_fullname') || 'Lawyer';
        const _lvmAuth = _authHeaders(token);

        const caseResponse = await fetch(API_ENDPOINTS.case(caseId), {headers: _lvmAuth
        });

        if (_handleAuthResponse(caseResponse, 'Please log in again to access this case.')) return;
        if (!caseResponse.ok) {
            throw new Error('Failed to fetch case');
        }

        const foundCase = await caseResponse.json();
        
        const reader = new FileReader();
        const audioData = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });

        const msgObj = {
            caseId: caseId,
            from: 'Lawyer',
            fromName: fullname,
            fromUsername: username,
            type: 'voice',
            audioData: audioData,
            duration: duration,
            text: textMessage || '',
            timestamp: _lcdjpNow(),
            read: false,
            delivered: true,
            sentTo: foundCase.citizenUsername || foundCase.citizen
        };

        const response = await fetch(API_ENDPOINTS.messages(caseId), {
            method: 'POST',
            headers: _lvmAuth,
            body: JSON.stringify(msgObj)
        });

        if (response.status === 403) {
            if (typeof showToast === 'function') {
                showToast(' You need to accept this case before you can message the citizen.');
            } else {
                alert('You need to accept this case before you can message the citizen.');
            }
            if (typeof closeCaseDetails === 'function') closeCaseDetails();
            if (typeof viewCase === 'function') viewCase(caseId);
            return;
        }
        if (_handleAuthResponse(response, 'Please log in again to send this voice message.')) return;
        if (!response.ok) {
            throw new Error('Failed to send voice message');
        }

        if (foundCase.citizenUsername) {
            await createEnhancedNotification(
                foundCase.citizenUsername,
                ` ${fullname} sent a voice message about case ${caseId}`,
                'voice_message',
                caseId
            );
        }

        clearLawyerVoiceRecording();
        document.getElementById('lawyerMessageText').value = '';
        
        if (typeof showToast === 'function') showToast(' Voice message sent successfully!');
        if (typeof lawyerSendMessage === 'function') { await lawyerSendMessage(caseId); } else if (typeof viewCase === 'function') viewCase(caseId);
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();

    } catch (error) {
        console.error('Error sending lawyer voice message:', error);
        if (typeof showToast === 'function') showToast(' Failed to send voice message: ' + error.message);
    }
}

async function sendLawyerTextMessage(caseId, message) {
    const token = _requireAuth('Please log in before sending a message.');
    if (!token) return;
    try {
        const username = localStorage.getItem('lcdjp_username');
        const fullname = localStorage.getItem('lcdjp_fullname') || 'Lawyer';
        const _ltmAuth = _authHeaders(token);

        const caseResponse = await fetch(API_ENDPOINTS.case(caseId), {headers: _ltmAuth
        });

        if (_handleAuthResponse(caseResponse, 'Please log in again to access this case.')) return;
        if (!caseResponse.ok) {
            throw new Error('Failed to fetch case');
        }

        const foundCase = await caseResponse.json();

        const msgObj = {
            caseId: caseId,
            from: 'Lawyer',
            fromName: fullname,
            fromUsername: username,
            text: message,
            timestamp: _lcdjpNow(),
            read: false,
            delivered: true,
            sentTo: foundCase.citizenUsername || foundCase.citizen
        };

        const response = await fetch(API_ENDPOINTS.messages(caseId), {
            method: 'POST',
            headers: _ltmAuth,
            body: JSON.stringify(msgObj)
        });

        if (response.status === 403) {
            if (typeof showToast === 'function') {
                showToast(' You need to accept this case before you can message the citizen.');
            } else {
                alert('You need to accept this case before you can message the citizen.');
            }
            if (typeof closeCaseDetails === 'function') closeCaseDetails();
            if (typeof viewCase === 'function') viewCase(caseId);
            return;
        }
        if (_handleAuthResponse(response, 'Please log in again to send this message.')) return;
        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        if (foundCase.citizenUsername) {
            await createEnhancedNotification(
                foundCase.citizenUsername,
                ` ${fullname} sent a message about case ${caseId}`,
                'lawyer_message',
                caseId
            );
        }

        document.getElementById('lawyerMessageText').value = '';
        if (typeof showToast === 'function') showToast(' Message sent successfully!');
        if (typeof lawyerSendMessage === 'function') { await lawyerSendMessage(caseId); } else if (typeof viewCase === 'function') viewCase(caseId);
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();

    } catch (error) {
        console.error('Error sending lawyer text message:', error);
        if (typeof showToast === 'function') showToast(' Failed to send message: ' + error.message);
    }
}
function closeModal() {
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio.src = '';
            currentAudio.load();
        } catch (e) {
            console.warn('Could not stop audio:', e);
        }
        currentAudio = null;
        currentPlayBtn = null;
    }
    
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
        unlockScroll();
    }
}

function closeModalIfClickedOutside(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeModal();
    }
}




function showForcePasswordChangeModal(usernameOrData, role) {
    var username, userRole;
    if (usernameOrData && typeof usernameOrData === 'object') {
        username = usernameOrData.username || localStorage.getItem('lcdjp_fpc_username') || '';
        userRole = usernameOrData.role || localStorage.getItem('lcdjp_fpc_role') || '';
    } else {
        username = usernameOrData || localStorage.getItem('lcdjp_fpc_username') || '';
        userRole = role || localStorage.getItem('lcdjp_fpc_role') || '';
    }

    var safeUsername = String(username).replace(/'/g, "\\'");
    var safeRole = String(userRole).replace(/'/g, "\\'");

    var modalHtml = `
        <div class="modal-overlay">
            <div class="content-modal">
                <div class="modal-header">
                    <h3>Password Change Required</h3>
                </div>
                <div class="modal-body">
                    <div id="fpcPasswordStep">
                        <p>For security reasons, you must set a new password before continuing.</p>
                        <div id="fpcError" style="color:#e74c3c; display:none; margin-bottom:10px;"></div>
                        <input type="password" id="fpcCurrentPassword" placeholder="Current password" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">
                        <input type="password" id="fpcNewPassword" placeholder="New password" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">
                        <input type="password" id="fpcConfirmPassword" placeholder="Confirm new password" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">
                    </div>
                    <div id="fpcOtpStep" style="display:none;">
                        <p id="fpcOtpMessage">A verification code was sent to confirm it's you.</p>
                        <div id="fpcOtpError" style="color:#e74c3c; display:none; margin-bottom:10px;"></div>
                        <input type="text" id="fpcOtpInput" placeholder="6-digit code" maxlength="6" inputmode="numeric" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box; letter-spacing:3px;">
                        <button type="button" id="fpcResendBtn" onclick="_fpcResendOtp()" style="background:none; border:none; color:#1a4080; font-size:12.5px; cursor:pointer; padding:0;">Resend code</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="fpcSubmitBtn" onclick="_submitForcePasswordChange('${safeUsername}', '${safeRole}')">Set Password</button>
                </div>
            </div>
        </div>
    `;

    var existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (existing) {
        
        
        
        
    } else {
        lockScroll();
    }
}






function _submitForcePasswordChange(username, role) {
    var currentPwEl = document.getElementById('fpcCurrentPassword');
    var newPwEl = document.getElementById('fpcNewPassword');
    var confirmPwEl = document.getElementById('fpcConfirmPassword');
    var errEl = document.getElementById('fpcError');
    var submitBtn = document.getElementById('fpcSubmitBtn');
    var currentPw = currentPwEl ? currentPwEl.value : '';
    var newPw = newPwEl ? newPwEl.value : '';
    var confirmPw = confirmPwEl ? confirmPwEl.value : '';

    if (errEl) errEl.style.display = 'none';

    if (!currentPw) {
        if (errEl) { errEl.textContent = 'Please enter your current password.'; errEl.style.display = 'block'; }
        return;
    }
    if (!newPw || newPw.length < 8) {
        if (errEl) { errEl.textContent = 'Password must be at least 8 characters.'; errEl.style.display = 'block'; }
        return;
    }
    if (newPw !== confirmPw) {
        if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; }
        return;
    }

    var token = window._lcdjpFpcToken || null;
    var originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending code…'; }

    fetch(API_BASE_URL + '/api/auth/change-password', {
        method: 'POST',
        headers: _authHeaders(token),
        body: JSON.stringify({
            currentPassword: currentPw,
            newPassword: newPw,
            confirmPassword: confirmPw
        })
    })
    .then(function(response) {
        return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Password change failed');
            return data;
        });
    })
    .then(function(data) {
        if (submitBtn) submitBtn.disabled = false;

        if (data.otpRequired) {
            var pwStep = document.getElementById('fpcPasswordStep');
            var otpStep = document.getElementById('fpcOtpStep');
            var otpMsg = document.getElementById('fpcOtpMessage');
            if (pwStep) pwStep.style.display = 'none';
            if (otpStep) otpStep.style.display = 'block';
            if (otpMsg) otpMsg.textContent = data.message || 'A verification code was sent to confirm it\'s you.';
            if (submitBtn) {
                submitBtn.textContent = 'Verify & Finish';
                submitBtn.onclick = function () { _fpcVerifyOtp(); };
            }
            var otpInput = document.getElementById('fpcOtpInput');
            if (otpInput) otpInput.focus();
            return;
        }

        _fpcFinish();
    })
    .catch(function(error) {
        console.error('Force password change error:', error);
        if (errEl) { errEl.textContent = error.message || 'Something went wrong. Please try again.'; errEl.style.display = 'block'; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
    });
}

function _fpcVerifyOtp() {
    var otpInput = document.getElementById('fpcOtpInput');
    var errEl = document.getElementById('fpcOtpError');
    var submitBtn = document.getElementById('fpcSubmitBtn');
    var otp = otpInput ? otpInput.value.trim() : '';

    if (errEl) errEl.style.display = 'none';
    if (!/^\d{6}$/.test(otp)) {
        if (errEl) { errEl.textContent = 'Enter the 6-digit code.'; errEl.style.display = 'block'; }
        return;
    }

    var token = window._lcdjpFpcToken || null;
    var originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Verifying…'; }

    fetch(API_BASE_URL + '/api/auth/change-password/verify-otp', {
        method: 'POST',
        headers: _authHeaders(token),
        body: JSON.stringify({ otp: otp })
    })
    .then(function(response) {
        return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Verification failed');
            return data;
        });
    })
    .then(function() {
        _fpcFinish();
    })
    .catch(function(error) {
        console.error('Force password change OTP error:', error);
        if (errEl) { errEl.textContent = error.message || 'Incorrect or expired code.'; errEl.style.display = 'block'; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
    });
}

function _fpcResendOtp() {
    var token = window._lcdjpFpcToken || null;
    var resendBtn = document.getElementById('fpcResendBtn');
    var errEl = document.getElementById('fpcOtpError');
    if (errEl) errEl.style.display = 'none';
    var original = resendBtn ? resendBtn.textContent : '';
    if (resendBtn) { resendBtn.disabled = true; resendBtn.textContent = 'Resending…'; }

    fetch(API_BASE_URL + '/api/auth/change-password/resend-otp', {
        method: 'POST',
        headers: _authHeaders(token)
    })
    .then(function(response) {
        return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Could not resend code');
            return data;
        });
    })
    .then(function(data) {
        var otpMsg = document.getElementById('fpcOtpMessage');
        if (otpMsg) otpMsg.textContent = data.message || 'A new code was sent.';
    })
    .catch(function(error) {
        if (errEl) { errEl.textContent = error.message || 'Could not resend code.'; errEl.style.display = 'block'; }
    })
    .finally(function() {
        if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = original || 'Resend code'; }
    });
}

function _fpcFinish() {
    localStorage.removeItem('lcdjp_fpc_required');
    sessionStorage.removeItem('lcdjp_fpc_required');
    localStorage.removeItem('lcdjp_fpc_username');
    sessionStorage.removeItem('lcdjp_fpc_username');
    localStorage.removeItem('lcdjp_fpc_role');
    sessionStorage.removeItem('lcdjp_fpc_role');
    window._lcdjpFpcPending = false;
    window._lcdjpFpcToken = null;

    closeModal();

    if (typeof showToast === 'function') {
        showToast('Password updated successfully. Please log in again.');
    } else {
        alert('Password updated successfully. Please log in again.');
    }

    window.location.reload();
}


function showRegister() {
    _lcdjpHideLoginOtpPage();
    document.getElementById("loginPage").style.display = "none";
    const fp = document.getElementById("forgotPage"); if (fp) fp.style.display = "none";
    const idvp = document.getElementById("idVerifyPage"); if (idvp) idvp.style.display = "none";
    const asp = document.getElementById("accountStatusPage"); if (asp) asp.style.display = "none";
    document.getElementById("registerPage").style.display = "block";
    clearRegistrationForm();
    checkAndShowTestButtons();
    window.scrollTo(0, 0);
}

function showForgotPassword() {
    _lcdjpHideLoginOtpPage();
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("registerPage").style.display = "none";
    document.getElementById("forgotPage").style.display = "block";
    window.scrollTo(0, 0);
}














function sendForgotPasswordCode() {
    const username = document.getElementById("forgotUsername").value.trim();
    const email = document.getElementById("forgotEmail").value.trim();
    const statusDiv = document.getElementById("forgotPhoneStatus");
    const sendBtn = document.getElementById("forgotSendBtn");

    if (!username || !email) {
        statusDiv.innerHTML = `<span style="color:#dc3545;">Please enter your username and email.</span>`;
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        statusDiv.innerHTML = `<span style="color:#dc3545;">Please enter a valid email address.</span>`;
        return;
    }

    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = "Sending…"; }
    statusDiv.innerHTML = `<span style="color:#666;">Sending code…</span>`;

    fetch(API_BASE_URL + '/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, email: email })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data: data })))
    .then(({ ok, data }) => {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = "Send Verification Code"; }
        if (!ok) {
            statusDiv.innerHTML = `<span style="color:#dc3545;">${data.error || 'Failed to send code. Please try again.'}</span>`;
            return;
        }
        statusDiv.innerHTML = `<span style="color:#28a745;">Verification code sent! Check your email inbox (it expires in 10 minutes).</span>`;
        const codeField = document.getElementById("forgotCode");
        if (codeField) codeField.focus();
    })
    .catch(err => {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = "Send Verification Code"; }
        statusDiv.innerHTML = `<span style="color:#dc3545;">Network error. Please try again.</span>`;
        console.error('[forgot-password send error]', err);
    });
}

function resetPassword() {
    const username = document.getElementById("forgotUsername").value.trim();
    const code = document.getElementById("forgotCode").value.trim();
    const newPass = document.getElementById("forgotNewPass").value;
    const confirmPass = document.getElementById("forgotConfirmPass").value;
    const statusDiv = document.getElementById("forgotPhoneStatus");

    if (!username) {
        alert("Please enter your username and request a code first.");
        document.getElementById("forgotUsername").focus();
        return;
    }
    if (!code) {
        alert("Please enter the verification code sent to your email.");
        document.getElementById("forgotCode").focus();
        return;
    }
    if (!newPass || newPass.length < 8) {
        alert("Password must be at least 8 characters long.");
        document.getElementById("forgotNewPass").focus();
        return;
    }
    if (newPass !== confirmPass) {
        alert("Passwords do not match. Please try again.");
        document.getElementById("forgotConfirmPass").focus();
        return;
    }

    fetch(API_BASE_URL + '/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: username,
            code: code,
            newPassword: newPass,
            confirmPassword: confirmPass
        })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data: data })))
    .then(({ ok, data }) => {
        if (!ok) {
            alert(data.error || "Could not reset password. Please check the code and try again.");
            return;
        }

        alert("Password reset successful! Please login with your new password.");

        document.getElementById("forgotUsername").value = "";
        document.getElementById("forgotEmail").value = "";
        document.getElementById("forgotCode").value = "";
        document.getElementById("forgotNewPass").value = "";
        document.getElementById("forgotConfirmPass").value = "";
        if (statusDiv) statusDiv.innerHTML = "";

        backToLogin();
    })
    .catch(err => {
        alert("Network error. Please try again.");
        console.error('[reset-password error]', err);
    });
}

function backToLogin() {
    _lcdjpHideLoginOtpPage();
    document.getElementById("registerPage").style.display = "none";
    document.getElementById("forgotPage").style.display = "none";
    document.getElementById("loginPage").style.display = "flex";
    window.scrollTo(0, 0);
}












function _lcdjpClearAccountState() {
    var keys = [
        'jwtToken', 'lcdjp_username', 'lcdjp_userlevel', 'lcdjp_district',
        'lcdjp_fullname', 'userRole', 'username', 'userDistrict', 'fullName',
        'userType', 'isOrganization', 'verificationStatus', 'approvalStatus',
        'requirePasswordChange', 'role', 'lcdjp_userType', 'lcdjp_isOrganization',
        'lcdjp_approval_status', 'lcdjp_verif_status', 'lcdjp_fpc_required',
        'lcdjp_fpc_username', 'lcdjp_fpc_role', 'lcdjp_orgName', 'lcdjp_orgType',
        'lcdjp_orgId', 'lcdjp_orgSpec', 'lcdjp_lawyer_specialization',
        'lcdjp_phone', 'lcdjp_email', 'lcdjp_village', 'lcdjp_parish',
        'lcdjp_subCounty', 'lcdjp_verif_reject_reason', 'lcdjp_chat_conversations',
        'lcdjp_chat_messages', 'lcdjp_chat_backup', 'lcdjp_user_email',
        'lcdjp_selected_lat', 'lcdjp_selected_lng', 'lcdjp_verification_route',
        'lastViewedUser', 'userModalOpen', 'lcdjp_return_to_login'
        
        
        
    ];
    keys.forEach(function(k) {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
    });
    
    
    
    
    window._currentViewUser = null;
    window._lcdjpUser = null;
    if (typeof currentLawyerSpecialization !== 'undefined') currentLawyerSpecialization = '';
    if (typeof currentUserLevel !== 'undefined') currentUserLevel = '';
    var userListContainer = document.getElementById('userListContainer');
    if (userListContainer) delete userListContainer.dataset.users;
}

function _lcdjpInitRecaptcha(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 20;

    var container = document.getElementById('lgRecaptcha');
    if (!container) return;

    if (typeof grecaptcha === 'undefined' || !grecaptcha.render) {
        if (attemptsLeft <= 0) return;
        setTimeout(function() { _lcdjpInitRecaptcha(attemptsLeft - 1); }, 500);
        return;
    }

    fetch(API_BASE_URL + '/api/auth/recaptcha-config')
        .then(function(response) { return response.json(); })
        .then(function(config) {
            if (!config || !config.configured || !config.siteKey) return;
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            window._lcdjpRecaptchaWidgetId = grecaptcha.render(container, {
                sitekey: config.siteKey,
                theme: isDark ? 'dark' : 'light'
            });
            container.style.display = 'block';
        })
        .catch(function(e) {
            console.warn('reCAPTCHA config fetch failed, continuing without it:', e);
        });
}
_lcdjpInitRecaptcha();

function loginUser() {
    console.log("LOGIN FUNCTION STARTED");
    
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;

    if (!username || !password) {
        alert("Please enter your username and password.");
        return;
    }

    const rememberMeEl = document.getElementById("rememberMe");
    const rememberMe = !!(rememberMeEl && rememberMeEl.checked);

    var recaptchaToken = '';
    if (typeof window._lcdjpRecaptchaWidgetId !== 'undefined' && typeof grecaptcha !== 'undefined') {
        recaptchaToken = grecaptcha.getResponse(window._lcdjpRecaptchaWidgetId) || '';
        if (!recaptchaToken) {
            alert("Please complete the reCAPTCHA verification.");
            return;
        }
    }

    
    
    
    
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = ' Logging in...';
    loginBtn.disabled = true;

    
    fetch(API_BASE_URL + '/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password,
            rememberMe: rememberMe,
            recaptchaToken: recaptchaToken
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().catch(() => ({})).then(data => {
                const err = new Error(data.error || 'Login failed');
                err.locked = data.locked === true;
                err.supportEmail = data.supportEmail || '';
                throw err;
            });
        }
        return response.json();
    })
    .then(data => {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;

        if (data.success) {
            console.log(' Login successful:', data);

            
            
            
            _lcdjpClearAccountState();

            const userRole = data.role || data.userRole || data.user_role || 'Citizen';
            const fullName = data.fullName || data.full_name ||
                (((data.firstName || data.first_name || '') + ' ' + (data.lastName || data.last_name || '')).trim()) ||
                username;
            const userType = data.userType || data.user_type || 'individual';
            const isOrganization = userType === 'organization';

            
            
            
            if (data.requirePasswordChange) {
                _lcdjpStartForcedPasswordChange(data, username);
                return;
            }

            if (data.requireOtp) {
                loginBtn.textContent = originalText;
                loginBtn.disabled = false;
                _lcdjpShowLoginOtpPage(data.username || username, data.message);
                return;
            }

            _lcdjpCompleteLogin(data, username);
        } else {
            alert(" Login failed: " + (data.error || "Invalid credentials"));
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            _lcdjpResetRecaptcha();
        }
    })
    .catch(error => {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        console.error(' Login error:', error);
        if (error.locked) {
            alert(error.message + (error.supportEmail ? "\n\nSupport: " + error.supportEmail : ""));
        } else {
            alert(" Login failed: " + error.message + "\n\nPlease check your username, password, and account type.");
        }
        _lcdjpResetRecaptcha();
    });
}

function _lcdjpStartForcedPasswordChange(data, username) {
        
        
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('lcdjp_username');
        localStorage.removeItem('lcdjp_userlevel');
        localStorage.removeItem('lcdjp_district');
        localStorage.removeItem('jwtToken');
        sessionStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        sessionStorage.removeItem('username');
        localStorage.removeItem('role');
        sessionStorage.removeItem('role');
        
        localStorage.setItem('lcdjp_fpc_required', '1');
        sessionStorage.setItem('lcdjp_fpc_required', '1');
        localStorage.setItem('lcdjp_fpc_username', data.username || username);
        sessionStorage.setItem('lcdjp_fpc_username', data.username || username);
        localStorage.setItem('lcdjp_fpc_role',     data.role     || 'SYSTEM_ADMIN');
        sessionStorage.setItem('lcdjp_fpc_role',     data.role     || 'SYSTEM_ADMIN');
        window._lcdjpFpcPending = true;
        window._lcdjpFpcToken   = data.token || null; 
        showForcePasswordChangeModal(data);
        return;
}

function _lcdjpCompleteLogin(data, username) {
            console.log(' Login successful:', data);

            _lcdjpClearAccountState();

            const userRole = data.role || data.userRole || data.user_role || 'Citizen';
            const fullName = data.fullName || data.full_name ||
                (((data.firstName || data.first_name || '') + ' ' + (data.lastName || data.last_name || '')).trim()) ||
                username;
            const userType = data.userType || data.user_type || 'individual';
            const isOrganization = userType === 'organization';

            localStorage.setItem('jwtToken',        data.token);
            localStorage.setItem('lcdjp_username',  data.username);
            localStorage.setItem('lcdjp_userlevel', data.role);
            localStorage.setItem('lcdjp_district',  data.district || '');
            localStorage.setItem('verificationStatus', (data.verificationStatus || data.verification_status || '').toUpperCase());
            localStorage.setItem('approvalStatus', (data.approvalStatus || data.approval_status || '').toUpperCase());
            
            localStorage.setItem('userRole',     data.role);
            localStorage.setItem('username',     data.username);
            localStorage.setItem('userDistrict', data.district || '');
            window.LCDJP_AUTH_VALIDATED = true;
            
            
            
            window.LCDJP_AUTH_READY = false;
            console.log("\u2705 JWT Token saved to localStorage");
            
            localStorage.setItem('jwtToken',   data.token);
            sessionStorage.setItem('jwtToken',   data.token);
            localStorage.setItem('username',   data.username);
            sessionStorage.setItem('username',   data.username);
            localStorage.setItem('role',       data.role);
            sessionStorage.setItem('role',       data.role);
            localStorage.setItem('fullName',   data.fullName);
            sessionStorage.setItem('fullName',   data.fullName);
            
            console.log(' User Type from backend:', userType);
            console.log(' Is Organization?', isOrganization);
            
            
            window._lcdjpUser = {
                username: data.username,
                role: userRole,
                fullName: fullName,
                userType: userType,
                isOrganization: isOrganization,
                phone: data.phone || '',
                district: data.district || '',
                village: data.village || '',
                parish: data.parish || '',
                subCounty: data.subCounty || ''
            };
            
            
            localStorage.setItem("lcdjp_userlevel", userRole);
            sessionStorage.setItem("lcdjp_userlevel", userRole);
            localStorage.setItem("lcdjp_username", data.username);
            sessionStorage.setItem("lcdjp_username", data.username);
            localStorage.setItem("lcdjp_fullname", fullName);
            sessionStorage.setItem("lcdjp_fullname", fullName);
            localStorage.setItem("lcdjp_userType", userType);
            sessionStorage.setItem("lcdjp_userType", userType);
            localStorage.setItem("lcdjp_isOrganization", isOrganization ? 'true' : 'false');
            sessionStorage.setItem("lcdjp_isOrganization", isOrganization ? 'true' : 'false');
            localStorage.setItem("lcdjp_approval_status",
                String(data.approvalStatus || data.approval_status || '').toLowerCase());
            sessionStorage.setItem("lcdjp_approval_status",
                String(data.approvalStatus || data.approval_status || '').toLowerCase());
            
            
            var _verifiedFlag = data.accountVerified === true ||
                data.account_verified === true ||
                data.verified === true ||
                data.isVerified === true ||
                String(data.accountVerified || data.account_verified || data.verified || data.isVerified || '').toLowerCase() === 'true';
            var _rawVerif = data.verificationStatus || data.verif_status || data.verification_status
                         || (_verifiedFlag ? 'VERIFIED'
                            : data.verificationPending === true || data.verification_pending === true ? 'PENDING' : '');
            var _computedVerif = typeof _lcdjpNormalizeVerifStatus === 'function'
                ? _lcdjpNormalizeVerifStatus(_rawVerif)
                : (_rawVerif.toUpperCase() === 'VERIFIED' || _rawVerif.toUpperCase() === 'APPROVED' ? 'verified'
                  : _rawVerif.toUpperCase() === 'PENDING' ? 'pending'
                  : _rawVerif.toUpperCase() === 'REJECTED' ? 'rejected' : 'not-verified');
            
            
            
            
            
            
            
            
            
            
            localStorage.setItem('lcdjp_verif_status', _computedVerif);
            sessionStorage.setItem('lcdjp_verif_status', _computedVerif);
            localStorage.setItem('verificationStatus', _computedVerif.toUpperCase());
            sessionStorage.setItem('verificationStatus', _computedVerif.toUpperCase());
            if (typeof _lcdjpUpdateVerifBanner === 'function') setTimeout(_lcdjpUpdateVerifBanner, 400);
            
            if (isOrganization) {
                localStorage.setItem("lcdjp_orgName", data.organizationName || data.orgName || fullName);
                sessionStorage.setItem("lcdjp_orgName", data.organizationName || data.orgName || fullName);
                localStorage.setItem("lcdjp_orgType", data.organizationType || data.orgType || "Legal Organization");
                sessionStorage.setItem("lcdjp_orgType", data.organizationType || data.orgType || "Legal Organization");
                localStorage.setItem("lcdjp_orgId", String(data.organizationId || data.orgId || ""));
                sessionStorage.setItem("lcdjp_orgId", String(data.organizationId || data.orgId || ""));
                localStorage.setItem("lcdjp_orgSpec", data.specialization || data.orgSpec || "");
                sessionStorage.setItem("lcdjp_orgSpec", data.specialization || data.orgSpec || "");
            }
            
            localStorage.setItem("lcdjp_phone", data.phone || '');
            sessionStorage.setItem("lcdjp_phone", data.phone || '');
            
            
            
            
            
            
            
            localStorage.setItem("lcdjp_email", data.email || '');
            sessionStorage.setItem("lcdjp_email", data.email || '');
            localStorage.setItem("lcdjp_district", data.district || '');
            sessionStorage.setItem("lcdjp_district", data.district || '');
            localStorage.setItem("lcdjp_village", data.village || '');
            sessionStorage.setItem("lcdjp_village", data.village || '');
            localStorage.setItem("lcdjp_parish", data.parish || '');
            sessionStorage.setItem("lcdjp_parish", data.parish || '');
            localStorage.setItem("lcdjp_subCounty", data.subCounty || '');
            sessionStorage.setItem("lcdjp_subCounty", data.subCounty || '');
            
            localStorage.removeItem('lcdjp_return_to_login');
            sessionStorage.removeItem('lcdjp_return_to_login');
            
            var _gLO = document.getElementById("accountMenuLogoutItem"); 
            if (_gLO) { 
                _gLO.textContent = "Logout"; 
                _gLO.onclick = function(e) { 
                    e.stopPropagation(); 
                    logoutUser(); 
                }; 
            }
            currentUserLevel = userRole;

            document.getElementById("loginPage").style.display = "none";
            document.getElementById("dashboardPage").style.display = "block";
            document.getElementById("welcomeUserHeading").innerHTML = "Welcome " + fullName;
            document.getElementById("accountMenuDropdownLabel").innerHTML = fullName;
            
            
            let savedAvatar = localStorage.getItem("lcdjp_avatar_" + data.username);
            if (savedAvatar && savedAvatar !== "undefined" && savedAvatar !== "null") {
                document.getElementById("profilePicture").src = savedAvatar;
            } else {
                document.getElementById("profilePicture").src = defaultAvatar;
                
                
                
                _lcdjpSyncAvatarFromBackend(data.username);
            }

            const footer = document.getElementById("mainFooter");
            document.body.classList.remove('citizen-dashboard-mode', 'lawyer-dashboard-mode', 'admin-dashboard-mode', 'admin-map-active');
            
            if (userRole === "Citizen") {
                document.body.classList.add('citizen-dashboard-mode');
                if (footer) {
                    footer.style.display = "block";
                    footer.style.visibility = "visible";
                    footer.style.opacity = "1";
                    footer.style.height = "auto";
                    footer.style.padding = "30px 20px 20px";
                    footer.style.margin = "0 15px 0 15px";
                    footer.style.overflow = "visible";
                    footer.style.border = "1px solid rgba(26, 64, 128, 0.1)";
                }
            } else if (userRole === "Lawyer") {
                document.body.classList.add('lawyer-dashboard-mode');
                console.log(' Individual Lawyer - showing Lawyer Dashboard');
                if (data.specialization) {
                    localStorage.setItem("lcdjp_lawyer_specialization", data.specialization);
                    sessionStorage.setItem("lcdjp_lawyer_specialization", data.specialization);
                    currentLawyerSpecialization = data.specialization;
                }
                if (footer) {
                    footer.style.display = "none";
                    footer.style.visibility = "hidden";
                    footer.style.opacity = "0";
                    footer.style.height = "0";
                    footer.style.padding = "0";
                    footer.style.margin = "0";
                    footer.style.overflow = "hidden";
                    footer.style.border = "none";
                }
            } else if (userRole === "LC") {
                document.body.classList.add('lawyer-dashboard-mode');
                console.log(' LC Official - showing LC Dashboard');
                if (footer) {
                    footer.style.display = "none";
                    footer.style.visibility = "hidden";
                    footer.style.opacity = "0";
                    footer.style.height = "0";
                    footer.style.padding = "0";
                    footer.style.margin = "0";
                    footer.style.overflow = "hidden";
                    footer.style.border = "none";
                }
            } else if (userRole === "DISTRICT_ADMIN") {
                document.body.classList.add('admin-dashboard-mode');
                if (footer) { footer.style.display="none"; footer.style.visibility="hidden"; footer.style.opacity="0"; footer.style.height="0"; footer.style.padding="0"; footer.style.margin="0"; footer.style.overflow="hidden"; footer.style.border="none"; }
                var _daAdminSidebar = document.getElementById('adminSidebarMenu');
                if (_daAdminSidebar) _daAdminSidebar.style.display = 'none';
                var _daSidebarMenu = document.getElementById('daSidebarMenu');
                if (_daSidebarMenu) _daSidebarMenu.style.display = 'block';
                var citizenMenuDA = document.getElementById('citizenSidebarMenu');
                if (citizenMenuDA) citizenMenuDA.style.display = 'none';
                var lawyerMenuDA = document.getElementById('lawyerSidebarMenu');
                if (lawyerMenuDA) lawyerMenuDA.style.display = 'none';
                
                
                
                
                
                currentUserLevel = 'DISTRICT_ADMIN';
                localStorage.setItem('lcdjp_userlevel', 'DISTRICT_ADMIN');
                sessionStorage.setItem('lcdjp_userlevel', 'DISTRICT_ADMIN');
            } else if (userRole === "Admin" || userRole === "System Administrator" || userRole === "SYSTEM_ADMIN") {
                document.body.classList.add('admin-dashboard-mode');
                if (footer) {
                    footer.style.display = "none";
                    footer.style.visibility = "hidden";
                    footer.style.opacity = "0";
                    footer.style.height = "0";
                    footer.style.padding = "0";
                    footer.style.margin = "0";
                    footer.style.overflow = "hidden";
                    footer.style.border = "none";
                }
                var adminMenu2 = document.getElementById("adminSidebarMenu");
                if (adminMenu2) {
                    adminMenu2.style.display = "block";
                    adminMenu2.style.visibility = "visible";
                    adminMenu2.style.opacity = "1";
                }
                var _adminNavExtrasE = document.getElementById("adminNavExtras"); 
                if (_adminNavExtrasE) _adminNavExtrasE.style.display = "inline-flex";
                var citizenMenu2 = document.getElementById("citizenSidebarMenu");
                if (citizenMenu2) citizenMenu2.style.display = "none";
                var lawyerMenu2 = document.getElementById("lawyerSidebarMenu");
                if (lawyerMenu2) lawyerMenu2.style.display = "none";
                var _lcNavExtras2 = document.getElementById("lcNavExtras"); 
                if (_lcNavExtras2) _lcNavExtras2.style.display = "none";
            } else {
                document.body.classList.add('citizen-dashboard-mode');
                if (footer) {
                    footer.style.display = "block";
                    footer.style.visibility = "visible";
                    footer.style.opacity = "1";
                    footer.style.height = "auto";
                    footer.style.padding = "30px 20px 20px";
                    footer.style.margin = "0 15px 0 15px";
                    footer.style.overflow = "visible";
                    footer.style.border = "1px solid rgba(26, 64, 128, 0.1)";
                }
            }

            setTimeout(function() {
                if (!isAuthenticated()) {
                    if (typeof _stopAllPolling === 'function') _stopAllPolling();
                    return;
                }
                window.LCDJP_AUTH_READY = true;
                
                
                
                
                
                if (typeof _cmActivate === 'function') _cmActivate();
                setupDashboardMenuVisibility(currentUserLevel);
                renderNavbarNotifBadge();

                console.log(' Current user level:', currentUserLevel);
                console.log(' Is Organization:', isOrganization);

                if (currentUserLevel === "Admin" || currentUserLevel === "System Administrator" || currentUserLevel === "SYSTEM_ADMIN") {
                    showAdminHome();
                } else if (currentUserLevel === "Lawyer") {
                    console.log(' Calling showLawyerDashboard()');
                    showLawyerDashboard();
                } else if (currentUserLevel === "LC") {
                    console.log(' Calling showLcDashboard()');
                    showLcDashboard();
                } else if (currentUserLevel === "Citizen") {
                    showHome();
                } else if (currentUserLevel === "DISTRICT_ADMIN") {
                    if (typeof showDistrictAdminDashboard === 'function') showDistrictAdminDashboard();
                } else {
                    showHome();
                }

                ensureSidebarVisibility(currentUserLevel);
            }, 500);
}

var _lcdjpPendingOtpUsername = '';
var _lcdjpOtpResendTimer = null;

function _lcdjpShowLoginOtpPage(username, message) {
    _lcdjpPendingOtpUsername = String(username || '');

    var loginPage = document.getElementById('loginPage');
    if (loginPage) loginPage.style.display = 'none';
    var registerPage = document.getElementById('registerPage');
    if (registerPage) registerPage.style.display = 'none';
    var forgotPage = document.getElementById('forgotPage');
    if (forgotPage) forgotPage.style.display = 'none';

    var otpPage = document.getElementById('loginOtpPage');
    if (!otpPage) {
        console.error('[LCDJP] #loginOtpPage is missing from index.html');
        return;
    }

    var msgEl = document.getElementById('loginOtpMessage');
    if (msgEl) msgEl.textContent = message || 'Enter the 6-digit code we sent you to finish logging in.';
    var errEl = document.getElementById('loginOtpError');
    if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
    var otpInput = document.getElementById('loginOtpInput');
    if (otpInput) otpInput.value = '';
    var submitBtn = document.getElementById('loginOtpSubmitBtn');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Verify & Log In'; }

    otpPage.style.display = 'flex';
    window.scrollTo(0, 0);
    if (otpInput) otpInput.focus();
}

function _lcdjpHideLoginOtpPage() {
    var otpPage = document.getElementById('loginOtpPage');
    if (otpPage) otpPage.style.display = 'none';
    _lcdjpPendingOtpUsername = '';
    if (_lcdjpOtpResendTimer) { clearTimeout(_lcdjpOtpResendTimer); _lcdjpOtpResendTimer = null; }
}

function _lcdjpCancelLoginOtp() {
    _lcdjpHideLoginOtpPage();
    var loginPage = document.getElementById('loginPage');
    if (loginPage) loginPage.style.display = 'flex';
    var pw = document.getElementById('password');
    if (pw) pw.value = '';
    _lcdjpResetRecaptcha();
    window.scrollTo(0, 0);
}

function _lcdjpShowLoginOtpError(message) {
    var errEl = document.getElementById('loginOtpError');
    if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
}

function _lcdjpVerifyLoginOtp() {
    var username = _lcdjpPendingOtpUsername;
    var otpInput = document.getElementById('loginOtpInput');
    var errEl = document.getElementById('loginOtpError');
    var submitBtn = document.getElementById('loginOtpSubmitBtn');
    var otp = otpInput ? otpInput.value.trim() : '';

    if (errEl) errEl.style.display = 'none';
    if (!username) {
        _lcdjpCancelLoginOtp();
        return;
    }
    if (!/^\d{6}$/.test(otp)) {
        _lcdjpShowLoginOtpError('Enter the 6-digit code.');
        return;
    }

    var originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Verifying…'; }

    fetch(API_BASE_URL + '/api/auth/login/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, otp: otp })
    })
    .then(function(response) {
        return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Verification failed');
            return data;
        });
    })
    .then(function(data) {
        _lcdjpHideLoginOtpPage();
        if (data.requirePasswordChange) {
            _lcdjpClearAccountState();
            _lcdjpStartForcedPasswordChange(data, username);
            return;
        }
        _lcdjpCompleteLogin(data, username);
    })
    .catch(function(error) {
        console.error('Login OTP error:', error);
        _lcdjpShowLoginOtpError(error.message || 'Incorrect or expired code.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText || 'Verify & Log In'; }
    });
}

function _lcdjpResendLoginOtp() {
    var username = _lcdjpPendingOtpUsername;
    var resendBtn = document.getElementById('loginOtpResendBtn');
    var errEl = document.getElementById('loginOtpError');
    if (errEl) errEl.style.display = 'none';
    if (!username) {
        _lcdjpCancelLoginOtp();
        return;
    }
    var original = resendBtn ? resendBtn.textContent : '';
    if (resendBtn) { resendBtn.disabled = true; resendBtn.textContent = 'Resending…'; }

    fetch(API_BASE_URL + '/api/auth/login/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
    })
    .then(function(response) {
        return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) throw new Error(data.error || 'Could not resend code');
            return data;
        });
    })
    .then(function(data) {
        var msgEl = document.getElementById('loginOtpMessage');
        if (msgEl) msgEl.textContent = data.message || 'A new code was sent.';
    })
    .catch(function(error) {
        _lcdjpShowLoginOtpError(error.message || 'Could not resend code.');
    })
    .finally(function() {
        if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = original || 'Resend code'; }
    });
}

function _lcdjpResetRecaptcha() {
    if (typeof window._lcdjpRecaptchaWidgetId !== 'undefined' && typeof grecaptcha !== 'undefined') {
        grecaptcha.reset(window._lcdjpRecaptchaWidgetId);
    }
}


function checkAuthStatus() {
    console.log('[LCDJP] Checking authentication status...');
    
    
    var token = _getAuthToken();
    var currentPath = window.location.pathname;

    
    if (!token || !isTokenValid()) {
        if (typeof _stopAllPolling === 'function') _stopAllPolling();
        console.log('[LCDJP] No JWT token found. Showing login screen.');
        if (typeof showLoginScreen === 'function') {
            showLoginScreen();
        }
        return;
    }

    
    fetch(API_ENDPOINTS.jwtValidate, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        suppressAuthRedirect: true
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Token validation failed: ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        if (data.valid === true) {
            console.log('[LCDJP] JWT Token is valid. User:', data.username);
            
            var username = data.username ||
                (typeof getLcdjpActiveUsername === 'function' ? getLcdjpActiveUsername() : '') ||
                localStorage.getItem('username') || '';
            var role = localStorage.getItem('userRole') || 'Citizen';

            
            
            
            window.LCDJP_AUTH_VALIDATED = true;
            window.LCDJP_AUTH_READY = true;
            if (typeof _cmActivate === 'function') _cmActivate();

            
            var _refreshToken = _getAuthToken() || '';
            var _profileUrl = API_BASE_URL + '/api/auth/users/' + encodeURIComponent(username);
            
            fetch(_profileUrl, {
                method: 'GET',
                headers: _authHeaders(_refreshToken)
            })
            .then(function(pr) {
                if (_handleAuthResponse(pr, 'Please log in again to refresh your profile.')) return null;
                return pr.ok ? pr.json() : null;
            })
            .catch(function() { return null; })
            .then(function(profileData) {
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                if (profileData) {
                    window._lcdjpProfileCache = {
                        username: username,
                        data: profileData,
                        ts: Date.now()
                    };
                }
                if (profileData) {
                    var freshUser = profileData.user || profileData;
                    var freshRole = freshUser.role || freshUser.userRole || freshUser.user_role || role;
                    var freshApproval = freshUser.approvalStatus || freshUser.approval_status || '';
                    var freshVerif = freshUser.verificationStatus || freshUser.verification_status || '';
                    
                    localStorage.setItem('userRole', freshRole);
                    var freshFullName = freshUser.fullName || freshUser.full_name ||
                        (((freshUser.firstName || freshUser.first_name || '') + ' ' + (freshUser.lastName || freshUser.last_name || '')).trim());
                    if (freshFullName) {
                        localStorage.setItem('fullName', freshFullName);
                    }
                    localStorage.setItem('approvalStatus', freshApproval);
                    localStorage.setItem('verificationStatus', freshVerif);
                    localStorage.setItem('lcdjp_approval_status', freshApproval.toLowerCase());
                    sessionStorage.setItem('lcdjp_approval_status', freshApproval.toLowerCase());
                    localStorage.setItem('lcdjp_verif_status', freshVerif);
                    sessionStorage.setItem('lcdjp_verif_status', freshVerif);
                    role = freshRole;
                    console.log('[LCDJP] Role refreshed from backend:', freshRole, '| verif:', freshVerif);
                } else {
                    console.warn('[LCDJP] Could not refresh profile from backend; using cached role.');
                }

                
                localStorage.setItem('lcdjp_userlevel', role);
                sessionStorage.setItem('lcdjp_userlevel', role);
                localStorage.setItem('lcdjp_username', username);
                sessionStorage.setItem('lcdjp_username', username);
                localStorage.setItem('lcdjp_fullname', localStorage.getItem('fullName') || username);
                sessionStorage.setItem('lcdjp_fullname', localStorage.getItem('fullName') || username);
                localStorage.setItem('lcdjp_userType', localStorage.getItem('userType') || 'individual');
                sessionStorage.setItem('lcdjp_userType', localStorage.getItem('userType') || 'individual');
                localStorage.setItem('lcdjp_isOrganization', localStorage.getItem('isOrganization') === 'true' ? 'true' : 'false');
                sessionStorage.setItem('lcdjp_isOrganization', localStorage.getItem('isOrganization') === 'true' ? 'true' : 'false');

                
                if (localStorage.getItem('requirePasswordChange') === 'true') {
                    window._lcdjpFpcPending = true;
                    window._lcdjpFpcToken = token;
                    var _lpFpc = document.getElementById('loginPage');
                    var _dpFpc = document.getElementById('dashboardPage');
                    if (_lpFpc) _lpFpc.style.display = 'none';
                    if (_dpFpc) _dpFpc.style.display = 'none';
                    localStorage.setItem('lcdjp_fpc_required', '1');
                    sessionStorage.setItem('lcdjp_fpc_required', '1');
                    localStorage.setItem('lcdjp_fpc_username', username);
                    sessionStorage.setItem('lcdjp_fpc_username', username);
                    localStorage.setItem('lcdjp_fpc_role', role);
                    sessionStorage.setItem('lcdjp_fpc_role', role);
                    if (typeof showForcePasswordChangeModal === 'function') {
                        showForcePasswordChangeModal(username, role);
                    }
                    return;
                }

                
                var loginPage = document.getElementById('loginPage');
                var dashboardPage = document.getElementById('dashboardPage');
                if (loginPage) loginPage.style.display = 'none';
                if (dashboardPage) dashboardPage.style.display = 'block';
                
                var welcomeEl = document.getElementById('welcomeUserHeading');
                if (welcomeEl) {
                    welcomeEl.innerHTML = 'Welcome ' + (localStorage.getItem('fullName') || username);
                }
                
                var dropdownLabel = document.getElementById('accountMenuDropdownLabel');
                if (dropdownLabel) {
                    dropdownLabel.innerHTML = (localStorage.getItem('fullName') || username);
                }

                
                var savedAvatar = localStorage.getItem('lcdjp_avatar_' + username);
                var profilePic = document.getElementById('profilePicture');
                if (profilePic) {
                    if (savedAvatar && savedAvatar !== 'undefined' && savedAvatar !== 'null') {
                        profilePic.src = savedAvatar;
                    } else {
                        profilePic.src = defaultAvatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%231a4080"/%3E%3Ctext x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-family="Arial"%3E%3C/text%3E%3C/svg%3E';
                    }
                }
                
                
                var userLevel = role;
                var isOrganization = localStorage.getItem('isOrganization') === 'true';

                function isAdmin(level) {
                    return level === 'SYSTEM_ADMIN' || level === 'Admin' || level === 'DISTRICT_ADMIN';
                }

                if (userLevel === 'DISTRICT_ADMIN') {
                    var daDistrict = localStorage.getItem('userDistrict') || '';
                    if (!daDistrict && typeof freshUser !== 'undefined' && freshUser) {
                        daDistrict = freshUser.district || freshUser.assignedDistrict || freshUser.assigned_district || '';
                    }
                    if (daDistrict) localStorage.setItem('userDistrict', daDistrict);
                    document.body.classList.add('admin-dashboard-mode');
                    var _daAdminSidebar = document.getElementById('adminSidebarMenu');
                    if (_daAdminSidebar) { _daAdminSidebar.style.display = 'none'; }
                    var _daSidebar = document.getElementById('daSidebarMenu');
                    if (_daSidebar) { _daSidebar.style.display = 'block'; }
                    var _citizenSB = document.getElementById('citizenSidebarMenu');
                    if (_citizenSB) _citizenSB.style.display = 'none';
                    var _lawyerSB = document.getElementById('lawyerSidebarMenu');
                    if (_lawyerSB) _lawyerSB.style.display = 'none';
                    
                    
                    
                    if (typeof showDistrictAdminDashboard === 'function') showDistrictAdminDashboard();
                    
                } else if (userLevel === 'Organization') {
                    
                    showHome();
                    
                } else if (userLevel === 'Lawyer') {
                    document.body.classList.add('lawyer-dashboard-mode');
                    showLawyerDashboard();
                    
                } else if (userLevel === 'LC') {
                    document.body.classList.add('lawyer-dashboard-mode');
                    showLcDashboard();
                    
                } else if (isAdmin(userLevel)) {
                    document.body.classList.add('admin-dashboard-mode');
                    var _adminSidebarRestore = document.getElementById('adminSidebarMenu');
                    if (_adminSidebarRestore) {
                        _adminSidebarRestore.style.display = 'block';
                        _adminSidebarRestore.style.visibility = 'visible';
                        _adminSidebarRestore.style.opacity = '1';
                    }
                    var _citizenSidebarRestore = document.getElementById('citizenSidebarMenu');
                    if (_citizenSidebarRestore) _citizenSidebarRestore.style.display = 'none';
                    var _lawyerSidebarRestore = document.getElementById('lawyerSidebarMenu');
                    if (_lawyerSidebarRestore) _lawyerSidebarRestore.style.display = 'none';
                    var _adminNavExtrasRestore = document.getElementById('adminNavExtras');
                    if (_adminNavExtrasRestore) _adminNavExtrasRestore.style.display = 'inline-flex';
                    showAdminHome();
                    
                } else if (userLevel === 'Citizen') {
                    document.body.classList.add('citizen-dashboard-mode');
                    showHome();
                    
                } else {
                    document.body.classList.add('citizen-dashboard-mode');
                    showHome();
                }
                
                ensureSidebarVisibility(userLevel);
                renderNavbarNotifBadge();
                
                if (isAdmin(userLevel)) {
                    if (typeof startAdminPolling === 'function') {
                        startAdminPolling();
                    }
                    if (typeof loadAdminMessagesList === 'function') {
                        loadAdminMessagesList();
                    }
                }
                
                var _chatEl = document.getElementById('chatContainer');
                var _ambEl = document.getElementById('adminMessagesBtn');
                var _isAdmin = isAdmin(userLevel);
                if (_chatEl) _chatEl.style.display = _isAdmin ? 'none' : 'block';
                if (_ambEl) _ambEl.style.display = _isAdmin ? 'block' : 'none';

            }); 

        } else {
            
            console.log('[LCDJP] JWT invalid. Clearing data.');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            localStorage.removeItem('userDistrict');
            localStorage.removeItem('fullName');
            localStorage.removeItem('userType');
            localStorage.removeItem('isOrganization');
            localStorage.removeItem('requirePasswordChange');
            
            
            if (typeof showLoginScreen === 'function') {
                showLoginScreen();
            }
        }
    })
    .catch(function(error) {
        console.error('[LCDJP] JWT Validation error:', error);
        
        var username = localStorage.getItem('username');
        var role = localStorage.getItem('userRole');
        if (username && role) {
            console.log('[LCDJP] Network error, maintaining current session.');
        } else {
            
            if (typeof showLoginScreen === 'function') {
                showLoginScreen();
            }
        }
    });
}
function ensureSidebarVisibility(userType) {
    var sidebar = document.getElementById("mainSidebar");
    if (userType === "Organization") {
        if (sidebar) { sidebar.style.display="block"; sidebar.style.width="240px"; sidebar.style.minWidth="240px"; sidebar.style.padding="0"; sidebar.style.overflow="visible"; sidebar.style.border="none"; }
        var _ca=document.getElementById("contentArea"); if(_ca) _ca.style.padding="0";
        
        var _orgLangSel2 = document.getElementById("languageSelect");
        if (_orgLangSel2) _orgLangSel2.style.display = "none";
        return;
    }

    
    if (userType === "DISTRICT_ADMIN") {
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "240px";
            sidebar.style.minWidth = "240px";
            sidebar.style.padding = "20px 0";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
        var _daSBE = document.getElementById('daSidebarMenu');
        if (_daSBE) { _daSBE.style.display = 'block'; _daSBE.style.visibility = 'visible'; _daSBE.style.opacity = '1'; }
        var _adminSBE = document.getElementById('adminSidebarMenu');
        if (_adminSBE) _adminSBE.style.display = 'none';
        var _citizenSBE = document.getElementById('citizenSidebarMenu');
        if (_citizenSBE) _citizenSBE.style.display = 'none';
        var _lawyerSBE = document.getElementById('lawyerSidebarMenu');
        if (_lawyerSBE) _lawyerSBE.style.display = 'none';
        
        var _daLangSel = document.getElementById('languageSelect');
        if (_daLangSel) _daLangSel.style.display = 'none';
        return;
    }
    

    console.log(" Ensuring sidebar visibility for:", userType);
    
    const citizenMenu = document.getElementById("citizenSidebarMenu");
    const lawyerMenu = document.getElementById("lawyerSidebarMenu");
    const lcMenu = document.getElementById("lcSidebarMenu");

    
    var _defaultLangSel = document.getElementById("languageSelect");
    if (_defaultLangSel) _defaultLangSel.style.display = (userType === "Citizen") ? "" : "none";

    if (userType === "Citizen" || userType === "Lawyer" || userType === "LC") {
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "280px";
            sidebar.style.minWidth = "280px";
            sidebar.style.padding = "20px";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
    }
    
    if (userType === "Citizen") {
        if (citizenMenu) {
            citizenMenu.style.display = "block";
        }
        if (lawyerMenu) {
            lawyerMenu.style.display = "none";
        }
        if (lcMenu) {
            lcMenu.style.display = "none";
        }
    }

    if (userType === "LC") {
        if (lcMenu) {
            lcMenu.style.display = "block";
        }
        if (citizenMenu) {
            citizenMenu.style.display = "none";
        }
        if (lawyerMenu) {
            lawyerMenu.style.display = "none";
        }
    }
    
    if (userType === "Lawyer") {
        if (lawyerMenu) {
            lawyerMenu.style.display = "block";
        }
        if (citizenMenu) {
            citizenMenu.style.display = "none";
        }
        if (lcMenu) {
            lcMenu.style.display = "none";
        }
    }
    
    console.log(" Sidebar visibility ensured for:", userType);
}

function setupDashboardMenuVisibility(role) {
    if (typeof _lcdjpEnforceAdminNavRestrictions === 'function') _lcdjpEnforceAdminNavRestrictions();

    
    
    
    
    
    
    

    var _citizenNavExtras0 = document.getElementById("citizenNavExtras");
    if (_citizenNavExtras0) _citizenNavExtras0.style.display = (role === "Citizen" && window.innerWidth >= 768) ? "inline-flex" : "none";

    var _lawyerNavExtrasTop = document.getElementById("lawyerNavExtras");
    if (_lawyerNavExtrasTop) _lawyerNavExtrasTop.style.display = (role === "Lawyer") ? "inline-flex" : "none";

    
    
    
    var _adminNavExtrasTop = document.getElementById("adminNavExtras");
    if (_adminNavExtrasTop) _adminNavExtrasTop.style.display = (isAdmin(role) && role !== "DISTRICT_ADMIN") ? "inline-flex" : "none";

    console.log(" Setting up dashboard menu for role:", role);

    const citizenMenu = document.getElementById("citizenSidebarMenu");
    const lawyerMenu = document.getElementById("lawyerSidebarMenu");
    const adminMenu = document.getElementById("adminSidebarMenu");
const citizenLinks = document.getElementById("citizenQuickLinks");
    const citizenGrid = document.getElementById("citizenQuickGrid");
    const notifBtn = document.getElementById("navNotifBtn");
    const sidebar = document.getElementById("mainSidebar");
    const footer = document.getElementById("mainFooter");
    const homeLink = document.getElementById("navHomeLink");
    const resourcesLink = document.getElementById("navResourcesLink");
    const contactLink = document.getElementById("navContactLink");
    const languageSelect = document.getElementById("languageSelect");
    const chatContainer = document.getElementById("chatContainer");
    const adminMsgBtn = document.getElementById('adminMessagesBtn');

    if (citizenMenu) citizenMenu.style.display = "none";
    if (lawyerMenu) lawyerMenu.style.display = "none";
    if (adminMenu) adminMenu.style.display = "none";
    var _adminNavExtrasD = document.getElementById("adminNavExtras"); if (_adminNavExtrasD) _adminNavExtrasD.style.display = "none";  
    if (citizenLinks) citizenLinks.style.display = "none";
    if (citizenGrid) citizenGrid.style.display = "none";
    if (notifBtn) notifBtn.style.display = "none";

    
    if (languageSelect) languageSelect.style.display = (role === "Citizen") ? "" : "none";

    if (footer) {
        if (role === "Citizen") {
            footer.style.display = "block";
            footer.style.visibility = "visible";
            footer.style.opacity = "1";
            footer.style.height = "auto";
            footer.style.padding = "30px 20px 20px";
            footer.style.margin = "0 15px 0 15px";
            footer.style.overflow = "visible";
            footer.style.border = "1px solid rgba(26, 64, 128, 0.1)";
        } else {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
    }

    var _isAdminRole = (role === "Admin" || role === "System Administrator" || role === "SYSTEM_ADMIN");
    
    
    
    if (chatContainer) {
        chatContainer.style.display = (_isAdminRole || role === "Lawyer") ? "none" : "block";
    }
    
    if (adminMsgBtn) {
        adminMsgBtn.style.display = _isAdminRole ? "block" : "none";
    }

    
    if (role === "Citizen") {
        if (citizenMenu) {
            citizenMenu.style.display = "block";
            citizenMenu.style.visibility = "visible";
            citizenMenu.style.opacity = "1";
        }
        if (citizenLinks) {
            citizenLinks.style.display = "block";
            citizenLinks.style.visibility = "visible";
            citizenLinks.style.opacity = "1";
        }
        if (citizenGrid) {
            citizenGrid.style.display = "grid";
            citizenGrid.style.visibility = "visible";
            citizenGrid.style.opacity = "1";
        }
        if (notifBtn) {
            notifBtn.style.display = "inline-block";
            notifBtn.style.visibility = "visible";
            notifBtn.style.opacity = "1";
            notifBtn.innerHTML = 'Notifications <span id="notifCount" style="display:none; background:#dc3545; color:white; border-radius:50%; padding:2px 8px; font-size:11px; font-weight:bold; margin-left:5px; min-width:18px; text-align:center;"></span>';
        }
        if (lawyerMenu) {
            lawyerMenu.style.display = "none";
        }
        if (adminMenu) {
            adminMenu.style.display = "none";
        }
        
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "280px";
            sidebar.style.minWidth = "280px";
            sidebar.style.padding = "20px";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
    }
    else if (role === "Lawyer") {
        if (lawyerMenu) {
            lawyerMenu.style.display = "block";
            lawyerMenu.style.visibility = "visible";
            lawyerMenu.style.opacity = "1";
        }
        if (citizenMenu) {
            citizenMenu.style.display = "none";
        }
        if (adminMenu) {
            adminMenu.style.display = "none";
        }
        if (resourcesLink) {
            resourcesLink.style.display = "none";
        }
        if (notifBtn) {
            notifBtn.style.display = "inline-block";
            notifBtn.style.visibility = "visible";
            notifBtn.style.opacity = "1";
            notifBtn.innerHTML = 'Notifications <span id="notifCount" style="display:none; background:#dc3545; color:white; border-radius:50%; padding:2px 8px; font-size:11px; font-weight:bold; margin-left:5px; min-width:18px; text-align:center;"></span>';
        }
        
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "280px";
            sidebar.style.minWidth = "280px";
            sidebar.style.padding = "20px";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
        
        if (footer) {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
    }
    else if (role === "Admin" || role === "System Administrator" || role === "SYSTEM_ADMIN") {
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.width = "280px";
            sidebar.style.minWidth = "280px";
            sidebar.style.padding = "20px";
            sidebar.style.overflow = "visible";
            sidebar.style.border = "none";
        }
        
        if (adminMenu) {
            adminMenu.style.display = "block";
            adminMenu.style.visibility = "visible";
            adminMenu.style.opacity = "1";
        }
        var _adminNavExtrasC = document.getElementById("adminNavExtras"); if (_adminNavExtrasC) _adminNavExtrasC.style.display = "inline-flex";
        
        if (citizenMenu) {
            citizenMenu.style.display = "none";
        }
        if (lawyerMenu) {
            lawyerMenu.style.display = "none";
        }
        
        if (homeLink) {
            homeLink.style.display = "none";
        }
        if (resourcesLink) {
            resourcesLink.style.display = "none";
        }
        if (contactLink) {
            contactLink.style.display = "none";
        }
        if (languageSelect) {
            languageSelect.style.display = "none";
        }
        if (adminMsgBtn) {
            adminMsgBtn.style.display = "block";
        }
        if (chatContainer) {
            chatContainer.style.display = "none";
        }
        if (footer) {
            footer.style.display = "none";
            footer.style.visibility = "hidden";
            footer.style.opacity = "0";
            footer.style.height = "0";
            footer.style.padding = "0";
            footer.style.margin = "0";
            footer.style.overflow = "hidden";
            footer.style.border = "none";
        }
        if (notifBtn) {
            notifBtn.style.display = "inline-block";
            notifBtn.style.visibility = "visible";
            notifBtn.style.opacity = "1";
            notifBtn.innerHTML = '<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="nav-text-label">Notifications</span><span id="notifCount" style="display:none; background:#dc3545; color:white; border-radius:50%; padding:2px 8px; font-size:11px; font-weight:bold; margin-left:5px; min-width:18px; text-align:center;"></span>';
        }
    }
    
    
    
    
    
    
    
    
    
    
    
    
    if (typeof _lcdjpEnforceAdminNavRestrictions === 'function') _lcdjpEnforceAdminNavRestrictions();

    console.log(" Dashboard menu setup complete for role:", role);
}


function enableManualInput(fieldId) {
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
    
    const label = getFieldLabel(fieldId);
    const containerId = getContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container not found for ${fieldId} (${containerId})`);
        return;
    }
    
    const inputHtml = `
        <div id="${fieldId}_manual_container" style="margin-top: 8px;">
            <input type="text" id="${fieldId}_manual" class="input-box" 
                   placeholder="Type ${label} name..." 
                   style="width:100%; padding:12px; border:1px solid #1a4080; border-radius:8px; font-size:16px; margin-top:5px; background: #f0f5ff;"
                   onchange="handleManualInputChange('${fieldId}')"
                   onkeyup="handleManualInputKeyUp(event, '${fieldId}')">
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                 Manual entry mode
                <span onclick="switchToSelect('${fieldId}')" style="color: #1a4080; cursor: pointer; margin-left: 10px;">← Switch back to dropdown</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', inputHtml);
    const newInput = document.getElementById(`${fieldId}_manual`);
    if (newInput) {
        newInput.focus();
    }
}

function handleManualInputKeyUp(event, fieldId) {
    if (event.key === 'Enter') {
        handleManualInputChange(fieldId);
    }
}

function handleManualInputChange(fieldId) {
    const manualInput = document.getElementById(`${fieldId}_manual`);
    if (!manualInput) return;
    
    const value = manualInput.value.trim();
    if (!value) {
        manualInput.style.borderColor = '#ff6b6b';
        manualInput.style.background = '#fff5f5';
        return;
    }
    
    manualInput.style.borderColor = '#1a4080';
    manualInput.style.background = '#f0f5ff';
    
    switch(fieldId) {
        case 'county':
            const countySelect = document.getElementById('county');
            if (countySelect) {
                let optionExists = false;
                for (let i = 0; i < countySelect.options.length; i++) {
                    if (countySelect.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    countySelect.innerHTML += `<option value="${value}" selected>${value}</option>`;
                } else {
                    countySelect.value = value;
                }
            }
            onCountyChange();
            break;
            
        case 'subCounty':
            const subCountySelect = document.getElementById('subCounty');
            if (subCountySelect) {
                let optionExists = false;
                for (let i = 0; i < subCountySelect.options.length; i++) {
                    if (subCountySelect.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    subCountySelect.innerHTML += `<option value="${value}" selected>${value}</option>`;
                } else {
                    subCountySelect.value = value;
                }
            }
            onSubCountyChange();
            break;
            
        case 'parishLocation':
            const parishSelect = document.getElementById('parishLocation');
            if (parishSelect) {
                let optionExists = false;
                for (let i = 0; i < parishSelect.options.length; i++) {
                    if (parishSelect.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    parishSelect.innerHTML += `<option value="${value}" selected>${value}</option>`;
                } else {
                    parishSelect.value = value;
                }
                parishSelect.dispatchEvent(new Event('change'));
            }
            onParishChange();
            break;
            
        case 'villageLocation':
            const villageSelect = document.getElementById('villageLocation');
            if (villageSelect) {
                let optionExists = false;
                for (let i = 0; i < villageSelect.options.length; i++) {
                    if (villageSelect.options[i].value === value) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    villageSelect.innerHTML += `<option value="${value}" selected>${value}</option>`;
                } else {
                    villageSelect.value = value;
                }
            }
            break;
    }
}

function showManualInput(fieldId, label, parentValue) {
    const containerId = getContainerId(fieldId);
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container not found for ${fieldId} (${containerId})`);
        return;
    }
    
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
                   onchange="handleManualInputChange('${fieldId}')"
                   onkeyup="handleManualInputKeyUp(event, '${fieldId}')">
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                 Manual entry mode - Press Enter or click away to confirm
                <span onclick="switchToSelect('${fieldId}')" style="color: #1a4080; cursor: pointer; margin-left: 10px;">← Switch to dropdown</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', inputHtml);
    
    setTimeout(() => {
        const input = document.getElementById(`${fieldId}_manual`);
        if (input) input.focus();
    }, 100);
}

function switchToSelect(fieldId) {
    removeManualInput(fieldId);
    
    const selectElement = document.getElementById(fieldId);
    if (selectElement) {
        selectElement.style.display = "block";
        selectElement.value = "";
    }
    
    showManualEntryOption(fieldId);
}

function removeManualInput(fieldId) {
    const manualContainer = document.getElementById(`${fieldId}_manual_container`);
    if (manualContainer) manualContainer.remove();
    
    const manualOption = document.getElementById(`${fieldId}_manual_option`);
    if (manualOption) manualOption.remove();
}





function showLoginScreen() {
    
    
    console.log('[LCDJP] No active session, showing login page');

    currentUserLevel = null;

    if (typeof _stopAllPolling === 'function') _stopAllPolling();
    if (typeof hideAllDashboardViews === 'function') hideAllDashboardViews();

    var dashboardPage = document.getElementById('dashboardPage');
    if (dashboardPage) dashboardPage.style.display = 'none';

    var homePage = document.getElementById('homePage');
    if (homePage) homePage.style.display = 'none';

    document.body.classList.remove(
        'lawyer-dashboard-mode', 'admin-dashboard-mode',
        'citizen-dashboard-mode', 'admin-map-active'
    );

    var sidebar = document.getElementById('mainSidebar');
    if (sidebar) sidebar.style.display = 'none';

    var footer = document.getElementById('mainFooter');
    if (footer) footer.style.display = 'none';

    _lcdjpHideLoginOtpPage();

    var loginPage = document.getElementById('loginPage');
    if (loginPage) {
        loginPage.style.display = 'flex';
        loginPage.style.visibility = 'visible';
        loginPage.style.opacity = '1';
    }

    var registerPage = document.getElementById('registerPage');
    if (registerPage) registerPage.style.display = 'none';

    var appLoader = document.getElementById('appLoader');
    if (appLoader) {
        if (typeof hideAppLoader === 'function') {
            hideAppLoader();
        } else {
            appLoader.style.opacity = '0';
            setTimeout(function() {
                appLoader.style.display = 'none';
            }, 300);
        }
    }
}

function _lcdjpActionNeedsVerification(actionKey) {
    return [
        'reportCase', 'trackCase', 'myCases', 'documents', 'uploadDoc', 'docCategories',
        'sharedDocs', 'disputeFamily', 'disputeLand', 'disputeBusiness',
        'disputeCommunity', 'disputeInheritance', 'disputeBoundary',
        'disputeMarriage', 'disputeChildCustody', 'disputeDebt', 'disputeOthers'
    ].indexOf(actionKey) !== -1;
}

function _lcdjpHasApprovedVerification() {
    var values = [
        localStorage.getItem('lcdjp_verif_status'),
        sessionStorage.getItem('lcdjp_verif_status'),
        localStorage.getItem('verificationStatus'),
        sessionStorage.getItem('verificationStatus'),
        localStorage.getItem('approvalStatus'),
        sessionStorage.getItem('approvalStatus'),
        localStorage.getItem('lcdjp_approval_status'),
        sessionStorage.getItem('lcdjp_approval_status')
    ];
    return values.some(function(value) {
        var status = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
        return status === 'APPROVED' || status === 'VERIFIED' ||
            status === 'ACCOUNT_VERIFIED' || status === 'TRUE';
    });
}

function requireAuth(actionKey) {
    if (_lcdjpActionNeedsVerification(actionKey) && typeof _lcdjpCaseFeaturesDisabled === 'function' && _lcdjpCaseFeaturesDisabled()) {
        if (typeof showFeatureUnavailableMessage === 'function') {
            showFeatureUnavailableMessage('This feature is not available at this time.');
        }
        return;
    }
    if (_lcdjpActionNeedsVerification(actionKey) && !_lcdjpHasApprovedVerification()) {
        if (typeof showAccountStatusPage === 'function') {
            showAccountStatusPage();
        } else if (typeof showIdVerifyPage === 'function') {
            showIdVerifyPage();
        }
        return;
    }
    _execProtectedAction(actionKey);
}

function _execProtectedAction(actionKey) {
    
    
    
    
    var actions = {
        'reportCase':          function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant(); else if (typeof openAIAssistant === 'function') openAIAssistant(undefined, 'report'); },
        'trackCase':           function() { showTrackCaseTab(); },
        'myCases':             function() { showMyCases(); },
        'documents':           function() { showDocumentManagementPage(); },
        'uploadDoc':           function() { showDocumentUploadPage(); },
        'docCategories':       function() { showDocumentCategoriesPage(); },
        'sharedDocs':          function() { showSharedDocumentsPage(); },
        'myProfile':           function() {
            
            
            
            
            
            
            
            
            if (typeof isAdmin === 'function' && isAdmin() && typeof showAdminAccountSettings === 'function') {
                showAdminAccountSettings();
            } else {
                showMyProfile();
            }
        },
        'editProfile':         function() { showEditAccount(); },
        'notifications':       function() { toggleNotifications(); },
        'disputeFamily':       function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Family Dispute'); else if (typeof openAIAssistant === 'function') openAIAssistant('Family Dispute', 'report'); },
        'disputeLand':         function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Land Matter'); else if (typeof openAIAssistant === 'function') openAIAssistant('Land Matter', 'report'); },
        'disputeBusiness':     function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Business Matter'); else if (typeof openAIAssistant === 'function') openAIAssistant('Business Matter', 'report'); },
        'disputeCommunity':    function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Community Disputes'); else if (typeof openAIAssistant === 'function') openAIAssistant('Community Disputes', 'report'); },
        'disputeInheritance':  function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Inheritance Dispute'); else if (typeof openAIAssistant === 'function') openAIAssistant('Inheritance Dispute', 'report'); },
        'disputeBoundary':     function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Boundary Dispute'); else if (typeof openAIAssistant === 'function') openAIAssistant('Boundary Dispute', 'report'); },
        'disputeMarriage':     function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Marriage Dispute'); else if (typeof openAIAssistant === 'function') openAIAssistant('Marriage Dispute', 'report'); },
        'disputeChildCustody': function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Child Custody'); else if (typeof openAIAssistant === 'function') openAIAssistant('Child Custody', 'report'); },
        'disputeDebt':         function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Debt Recovery'); else if (typeof openAIAssistant === 'function') openAIAssistant('Debt Recovery', 'report'); },
        'disputeOthers':       function() { if (typeof openReportCaseAssistant === 'function') openReportCaseAssistant('Other Legal Matter'); else if (typeof openAIAssistant === 'function') openAIAssistant('Other Legal Matter', 'report'); }
    };
    if (actions[actionKey]) actions[actionKey]();
}

function _mobileCleanupOnLogout() {
    
    
    if (typeof window._lcdjpCloseMobileFullPage === 'function') window._lcdjpCloseMobileFullPage();

    var sb = document.getElementById('mainSidebar');
    if (sb) sb.classList.remove('mobile-sidebar-open');
    var ov = document.getElementById('lcdjpSidebarOverlay');
    if (ov) {
        ov.classList.remove('active');
        ov.style.display = 'none';
    }

    
    ['cmAccountMenu', 'lcmAccountMenu', 'lmAccountMenu'].forEach(function(id) {
        var m = document.getElementById(id);
        if (m) m.style.display = 'none';
    });

    var accountDrop = document.getElementById('accountMenuDropdown');
    if (accountDrop) accountDrop.style.display = 'none';

    var notifDropdown = document.getElementById('notifDropdown') || document.getElementById('notificationsPanel');
    if (notifDropdown) notifDropdown.style.display = 'none';

    
    ['mobileMenuPanel', 'mobileRolePanel',
     'notifSettingsPanel'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    });

    document.querySelectorAll('.doc-viewer-modal').forEach(function(m) {
        m.remove();
    });

    var _caseModal = document.getElementById('caseDetailsModal');
    if (_caseModal) {
        _caseModal.style.display = 'none';
        _caseModal.innerHTML = '';
    }
    var _docViewer = document.getElementById('docViewerModal');
    if (_docViewer) _docViewer.remove();

    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    
    window._lcdjpScrollLockCount = 0;

    var trackContainer = document.getElementById('trackingResultContainer');
    if (trackContainer) trackContainer.innerHTML = '';
    var trackInput = document.getElementById('trackSearchInput');
    if (trackInput) trackInput.value = '';
    var msgCont = document.getElementById('messagingContainer');
    if (msgCont) msgCont.style.display = 'none';

    
    document.querySelectorAll('.notif-count, .notif-badge, #navNotifCount, #cmNotifBadge, #lcmNotifBadge, #lmNotifBadge').forEach(function(b) {
        b.textContent = '';
        b.style.display = 'none';
    });
    
   
}

function logoutUser() {
    
    if (window.chatInterval) {
        clearInterval(window.chatInterval);
        window.chatInterval = null;
    }
    if (window.notifInterval) {
        clearInterval(window.notifInterval);
        window.notifInterval = null;
    }
    
    _lcdjpClearAccountState();
    
    
    _mobileCleanupOnLogout();

    
    var dashPage = document.getElementById('dashboardPage');
    var loginPage = document.getElementById('loginPage');
    if (dashPage) dashPage.style.display = 'none';
    if (loginPage) loginPage.style.display = 'flex';
    window.scrollTo(0, 0);

    
    document.body.classList.remove(
        'citizen-dashboard-mode', 'lawyer-dashboard-mode',
        'admin-dashboard-mode', 'admin-map-active'
    );
    currentUserLevel = '';

    if (typeof showLoginScreen === 'function') {
        showLoginScreen();
    }

    
    var logoutToken = typeof getAuthToken === 'function'
        ? getAuthToken()
        : (localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken'));
    fetch(API_BASE_URL + '/api/auth/logout', {
        method: 'POST',
        headers: {
            ...(logoutToken ? { 'Authorization': 'Bearer ' + logoutToken } : {})
        },
        suppressAuthRedirect: true
    }).then(function(response) {
        
        if (!response.ok) {
            console.warn('Logout API call failed:', response.status);
        }
    }).catch(function() {
        
        console.log('Logout API call failed, continuing with client-side logout');
    });
}


function showEditAccount() {
    let html = `
    <div class="form-card">
        <h2>Update Profile Picture</h2>
        <p style="margin-bottom:12px;">Choose a local image file to replace your system profile avatar photo dynamically.</p>
        <p style="font-size:13px; color:#888; margin-bottom:12px;">
             Supported formats: JPG, PNG, GIF (Max 5MB)
        </p>
        <label>Upload Profile Photo File</label>
        <input type="file" id="avatarImageFileInput" accept="image/*" onchange="processProfileAvatarChange(this)" style="padding:10px; border:1px solid #ddd; border-radius:6px; width:100%;">

        ${typeof lcdjpRenderThemeToggle === 'function' ? lcdjpRenderThemeToggle() : ''}

        <br><br>
        <button onclick="showHome()" style="padding:10px 20px; background:#1a4080; color:white; border:none; border-radius:6px; cursor:pointer;">
            Finish & Return
        </button>
    </div>`;
    openDynamicView(html);
}







async function _lcdjpSyncAvatarFromBackend(username) {
    if (!username) return;
    try {
        let user = (typeof getUserByUsername === 'function') ? await getUserByUsername(username) : null;
        let avatarData = user && (user.avatarData || user.avatar_data);
        if (avatarData && avatarData !== 'undefined' && avatarData !== 'null') {
            localStorage.setItem("lcdjp_avatar_" + username, avatarData);
            sessionStorage.setItem("lcdjp_avatar_" + username, avatarData);
            let profilePic = document.getElementById("profilePicture");
            if (profilePic) profilePic.src = avatarData;
            if (typeof window.lcdjpApplyAvatarEverywhere === 'function') {
                window.lcdjpApplyAvatarEverywhere();
            }
        }
    } catch (err) {
        console.warn('[LCDJP] Could not sync profile picture from backend:', err);
    }
}

function processProfileAvatarChange(inputElement) {
    const file = inputElement.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("That image is too large. Please choose a photo under 2MB.");
            inputElement.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = async function(e) {
            let currentAvatarImage = e.target.result;
            let username = localStorage.getItem("lcdjp_username");
            
            if (!username) {
                alert("Please login first.");
                return;
            }
            
            
            
            
            document.querySelectorAll('#profilePicture, .js-profile-avatar-img').forEach(function(img) {
                img.src = currentAvatarImage;
            });

            
            
            
            
            
            try {
                const token = (typeof getAuthToken === 'function') ? getAuthToken() :
                    (localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken'));

                const response = await fetch(API_ENDPOINTS.profile, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ avatarData: currentAvatarImage })
                });

                let data = null;
                try { data = await response.json(); } catch (parseErr) { }

                if (!response.ok || !data || data.success !== true) {
                    throw new Error((data && data.error) || ('Server responded with ' + response.status));
                }

                
                localStorage.setItem("lcdjp_avatar_" + username, currentAvatarImage);
                sessionStorage.setItem("lcdjp_avatar_" + username, currentAvatarImage);
                if (window._lcdjpUserCache && window._lcdjpUserCache[username]) {
                    window._lcdjpUserCache[username].avatarData = currentAvatarImage;
                }

                if (typeof window.lcdjpApplyAvatarEverywhere === 'function') {
                    window.lcdjpApplyAvatarEverywhere();
                }

                alert(" Profile Picture successfully updated!");
            } catch (err) {
                console.warn('[LCDJP] Failed to persist profile picture to backend:', err);
                
                document.querySelectorAll('#profilePicture, .js-profile-avatar-img').forEach(function(img) {
                    let saved = sessionStorage.getItem("lcdjp_avatar_" + username) || localStorage.getItem("lcdjp_avatar_" + username) || '';
                    img.src = saved;
                });
                alert(" Could not save your profile picture: " + err.message + "\n\nPlease try again.");
            }
        };
        reader.readAsDataURL(file);
    }
}

function toggleAccountMenu() {
    let menu = document.getElementById("accountMenu");
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}


function toggleCdtProfileMenu(e) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('cdtProfileMenu');
    if (!menu) return;
    
    var username = localStorage.getItem('lcdjp_username');
    var fullName = localStorage.getItem('lcdjp_fullname') || username || '';
    var initials = fullName.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2) || 'U';
    var avatar = document.getElementById('cdtAvatar');
    var nameEl = document.getElementById('cdtUserName');
    var roleEl = document.getElementById('cdtUserRole');
    var userLevel = localStorage.getItem('lcdjp_userlevel') || 'Citizen';
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = fullName || 'My Account';
    if (roleEl) roleEl.textContent = userLevel;
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
document.addEventListener('click', function(e) {
    var wrap = document.querySelector('.cdt-user-wrap');
    var menu = document.getElementById('cdtProfileMenu');
    if (menu && menu.style.display === 'block' && (!wrap || !wrap.contains(e.target))) {
        menu.style.display = 'none';
    }
});




function toggleLwtProfileMenu(e) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('lwtProfileMenu');
    if (!menu) return;

    var username = localStorage.getItem('lcdjp_username');
    var fullName = localStorage.getItem('lcdjp_fullname') || username || '';
    var initials = fullName.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2) || 'L';
    var avatar = document.getElementById('lwtAvatar');
    var nameEl = document.getElementById('lwtUserName');
    var roleEl = document.getElementById('lwtUserRole');
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = fullName || 'My Account';
    if (roleEl) roleEl.textContent = (typeof currentUserLevel !== 'undefined' && currentUserLevel === 'LC') ? 'LC Official' : 'Lawyer';
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
document.addEventListener('click', function(e) {
    var wrap = document.querySelector('#lawyerDesktopTopbarInner .cdt-user-wrap');
    var menu = document.getElementById('lwtProfileMenu');
    if (menu && menu.style.display === 'block' && (!wrap || !wrap.contains(e.target))) {
        menu.style.display = 'none';
    }
});




function toggleAdtProfileMenu(e) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('adtProfileMenu');
    if (!menu) return;

    var username = localStorage.getItem('lcdjp_username');
    var fullName = localStorage.getItem('lcdjp_fullname') || username || '';
    var initials = fullName.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2) || 'A';
    var avatar = document.getElementById('adtAvatar');
    var nameEl = document.getElementById('adtUserName');
    var roleEl = document.getElementById('adtUserRole');
    var userLevel = localStorage.getItem('lcdjp_userlevel') || '';
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = fullName || 'My Account';
    if (roleEl) roleEl.textContent = (userLevel === 'DISTRICT_ADMIN') ? 'District Admin' : 'System Admin';
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
document.addEventListener('click', function(e) {
    var wrap = document.querySelector('#adminDesktopTopbarInner .cdt-user-wrap');
    var menu = document.getElementById('adtProfileMenu');
    if (menu && menu.style.display === 'block' && (!wrap || !wrap.contains(e.target))) {
        menu.style.display = 'none';
    }
});


function syncCdtUserInfo() {
    var username = localStorage.getItem('lcdjp_username');
    var fullName = localStorage.getItem('lcdjp_fullname') || username || '';
    var userLevel = localStorage.getItem('lcdjp_userlevel') || 'Citizen';
    var initials = fullName.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2) || 'U';
    var avatar = document.getElementById('cdtAvatar');
    var nameEl = document.getElementById('cdtUserName');
    var roleEl = document.getElementById('cdtUserRole');
    if (avatar) avatar.textContent = initials;
    if (nameEl) nameEl.textContent = fullName || 'My Account';
    if (roleEl) roleEl.textContent = userLevel;
}

window.addEventListener('click', function(e) {
    if (document.querySelector('.profile-container') && !document.querySelector('.profile-container').contains(e.target)) {
        document.getElementById("accountMenu").style.display = "none";
    }
});

window.addEventListener('click', function(e) {
    var chm = document.getElementById('citizenFindHelpMenu');
    if (chm && chm.style.display === 'block' && !chm.parentElement.contains(e.target)) {
        chm.style.display = 'none';
    }
});

function toggleMenu(menuId) {
    let menu = document.getElementById(menuId);
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}













function _lcdjpEnforceAdminNavRestrictions() {
    var adminOnly = typeof isAdmin === 'function' && isAdmin();
    
    
    
    
    
    
    var _currentUserLevel = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('lcdjp_userlevel'))
        || (typeof localStorage !== 'undefined' && localStorage.getItem('lcdjp_userlevel'))
        || '';
    var isDistrictAdminUser = _currentUserLevel === 'DISTRICT_ADMIN';
    var legalAlertsBtn = document.getElementById('adtLegalAlertsBtn');
    if (legalAlertsBtn) {
        legalAlertsBtn.style.setProperty('display', isDistrictAdminUser ? 'none' : '', 'important');
        if (!isDistrictAdminUser) legalAlertsBtn.style.removeProperty('display');
    }
    var contactLink = document.getElementById('navContactLink');
    var languageSelect = document.getElementById('languageSelect');
    var homeLink = document.getElementById('navHomeLink');
    var brandLogo = document.getElementById('lcdjpBrandLogo');

    
    
    [contactLink, homeLink].forEach(function(el) {
        if (!el) return;
        if (adminOnly) {
            el.style.setProperty('display', 'none', 'important');
        } else {
            el.style.removeProperty('display');
        }
    });

    
    
    if (languageSelect) {
        var _isCitizen = typeof _lcdjpIsCitizenRole === 'function' && _lcdjpIsCitizenRole();
        if (_isCitizen) {
            languageSelect.style.removeProperty('display');
        } else {
            languageSelect.style.setProperty('display', 'none', 'important');
        }
    }

    
    
    
    
    
    

    if (brandLogo) {
        if (adminOnly) {
            brandLogo.style.cursor = 'pointer';
            brandLogo.title = 'Admin Map';
        } else {
            brandLogo.style.cursor = 'pointer';
            brandLogo.title = 'Go to Home';
        }
    }

    
    
    
    var amAdminSlots = document.querySelectorAll('#amBottomNav .am-role-admin');
    var amDaSlots = document.querySelectorAll('#amBottomNav .am-role-da');
    var showAdminSlots = adminOnly && !isDistrictAdminUser;
    var showDaSlots = adminOnly && isDistrictAdminUser;
    amAdminSlots.forEach(function(el) {
        if (showAdminSlots) el.style.removeProperty('display');
        else el.style.setProperty('display', 'none', 'important');
    });
    amDaSlots.forEach(function(el) {
        if (showDaSlots) el.style.removeProperty('display');
        else el.style.setProperty('display', 'none', 'important');
    });
}
window._lcdjpEnforceAdminNavRestrictions = _lcdjpEnforceAdminNavRestrictions;


window.addEventListener('resize', _lcdjpEnforceAdminNavRestrictions);








function _lcdjpGoToOwnAdminHome() {
    if (sessionStorage.getItem('lcdjp_userlevel') === 'DISTRICT_ADMIN'
        && typeof showDistrictAdminDashboard === 'function') {
        showDistrictAdminDashboard();
    } else if (typeof showAdminHome === 'function') {
        showAdminHome();
    }
}
window._lcdjpGoToOwnAdminHome = _lcdjpGoToOwnAdminHome;

function hideAllDashboardViews() {
    
    
    
    
    document.body.classList.remove('admin-map-active');

    var _staleMapView = document.getElementById('adminMapView');
    if (_staleMapView) { _staleMapView.style.height = ''; _staleMapView.style.minHeight = ''; }
    var _staleHomeContainer = document.getElementById('adminHomeContainer');
    if (_staleHomeContainer) { _staleHomeContainer.style.height = ''; }

    
    
    
    
    
    
    
    
    
    
    
    
    
    var _lcdjpOpenOverlay = document.querySelector('.lcdjp-desktop-page-overlay');
    if (_lcdjpOpenOverlay && typeof _lcdjpOpenOverlay._lcdjpClose === 'function') {
        
        
        
        _lcdjpOpenOverlay._lcdjpClose(true);
    }

    _lcdjpEnforceAdminNavRestrictions();

    var _adminContainers = [
        'adminHomeContainer', 'approvalContainer', 'userManagementContainer',
        'adminCasesContainer',
        'lawyerManagementContainer', 'lawyerPerformanceContainer', 'statisticsContainer',
        'pdfExportContainer', 'searchResultsContainer', 'adminNotificationsPage',
        'legalOrgsAdminContainer', 'caseDetailsModal', 'adminMessagesPanel',
        'adminMessagesOverlay', 'adminUserPanel', 'adminConversationModal',
        'auditLogsContainer', 'districtAdminContainer', 'verificationRequestsContainer',
        'daDashboard', 'daHomeContainer', 'daUsersContainer', 'daVerifContainer',
        'daCasesContainer', 'daStatsContainer', 'daNotifContainer', 'daMapContainer'
    ];
    _adminContainers.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.style.visibility = ''; }
    });

    document.querySelectorAll('.dashboard-view').forEach(function(el) {
        el.style.display = 'none';
    });

    var dynamicForm = document.getElementById('dynamicFormPage');
    if (dynamicForm) { dynamicForm.style.display = 'none'; dynamicForm.innerHTML = ''; }
}

var adminMapInstance = null;   
var _adminGMap = null;
var _adminInfoWindow = null;
window._adminMapUsers = {};    







function syncAdminMapHeight() {
    if (!document.body.classList.contains('admin-dashboard-mode')) return;
    if (!document.body.classList.contains('admin-map-active')) return;

    var mapView = document.getElementById('adminMapView');
    if (!mapView) return;

    if (window.innerWidth <= 768) {
        
        
        
        
        
        
        
        
        
        
        if (window.google && google.maps && google.maps.event && _adminGMap) {
            var center = _adminGMap.getCenter();
            requestAnimationFrame(function() {
                google.maps.event.trigger(_adminGMap, 'resize');
                if (center) _adminGMap.setCenter(center);
            });
        }
        return;
    }

    var homeContainer = document.getElementById('adminHomeContainer');
    var footerNote = document.getElementById('adminMapFooterNote');

    var topbar = document.querySelector('.topbar');
    var topbarH = topbar ? Math.round(topbar.getBoundingClientRect().height) : 0;
    var footerH = footerNote ? Math.round(footerNote.getBoundingClientRect().height) : 0;

    var available = Math.round(window.innerHeight - topbarH - footerH);
    if (available < 300) return; 

    mapView.style.height = available + 'px';
    mapView.style.minHeight = available + 'px';
    if (homeContainer) homeContainer.style.height = (available + footerH) + 'px';

    if (window.google && google.maps && google.maps.event && _adminGMap) {
        google.maps.event.trigger(_adminGMap, 'resize');
    }
}
window.addEventListener('resize', syncAdminMapHeight);


function _adminMarkerSVG(color, border, size) {
    var half = size / 2;
    var r    = half - 1.5;
    var svg  = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
             + '<circle cx="' + half + '" cy="' + half + '" r="' + r + '" fill="' + color + '" stroke="' + border + '" stroke-width="2" opacity="0.92"/>'
             + '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function buildAdminMap() {
    console.log('\uD83D\uDDFA buildAdminMap (Google Maps) called');
    var container = document.getElementById('adminMapView');
    if (!container) { console.error('adminMapView container not found'); return; }

    syncAdminMapHeight();

    
    if (_adminGMap) {
        var adminUsersToken = _requireAuth('Please log in to view user locations.');
        if (!adminUsersToken) return;
        fetch(API_ENDPOINTS.users, {
            method: 'GET',
            headers: _authHeaders(adminUsersToken)
        })
            .then(function(r) {
                if (_handleAuthResponse(r, 'Please log in again to view users.')) {
                    return Promise.reject('Authentication required');
                }
                return r.ok ? r.json() : Promise.reject(r.status);
            })
            .then(function(data) { if (data.success && data.users) renderMapUsers(data.users); })
            .catch(function(err) { console.warn('Admin map user refresh failed:', err); });
        google.maps && _adminGMap && google.maps.event.trigger(_adminGMap, 'resize');
        return;
    }

    
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#1a4080;font-size:14px;gap:8px;">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a4080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>'
        + ' Loading map\u2026</div>';

    
    loadGoogleMapsSDK().then(function() {
        _buildAdminMapInner(container);
    }).catch(function(err) {
        console.error('Google Maps SDK failed to load:', err);
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;color:#c62828;">'
            + '<span style="font-size:28px;">\u26a0\ufe0f</span>'
            + '<span style="font-size:14px;font-weight:600;">Map unavailable</span>'
            + '<span style="font-size:12px;color:#888;">Check the Google Maps API key in server settings</span></div>';
    });
}

function _buildAdminMapInner(container) {

    function _doInitAdminMap(center, isLiveLocation) {
        _adminGMap = new google.maps.Map(container, {
            center: center,
            zoom: isLiveLocation ? 15 : 7,
            mapTypeId: 'hybrid',
            styles: (typeof MAP_STYLES !== 'undefined') ? MAP_STYLES : [],
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
            clickableIcons: false,
            gestureHandling: 'cooperative'
        });

        _adminInfoWindow = new google.maps.InfoWindow();
        _adminGMap.addListener('click', function() { _adminInfoWindow.close(); });
        syncAdminMapHeight();

        
        if (isLiveLocation) {
            new google.maps.Circle({
                map: _adminGMap,
                center: center,
                radius: 500,
                strokeColor: '#1a4080',
                strokeOpacity: 0.45,
                strokeWeight: 2,
                fillColor: '#1a4080',
                fillOpacity: 0.07
            });
            new google.maps.Marker({
                position: center,
                map: _adminGMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#1a4080',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3
                },
                title: 'Your Location (Admin)',
                zIndex: 1000
            });
        }

        
        var mapUsersToken = _requireAuth('Please log in to view user locations.');
        if (!mapUsersToken) return;
        fetch(API_ENDPOINTS.users, {
            method: 'GET',
            headers: _authHeaders(mapUsersToken)
        })
        .then(function(response) {
            if (_handleAuthResponse(response, 'Please log in again to view users.')) {
                throw new Error('Authentication required');
            }
            if (!response.ok) throw new Error('Failed to fetch users: ' + response.status);
            return response.json();
        })
        .then(function(data) {
            if (data.success && data.users) {
                console.log('\u2713 Admin map: ' + data.users.length + ' users loaded');
                renderMapUsers(data.users);
            } else {
                console.warn('Admin map: no users data returned');
            }
        })
        .catch(function(err) {
            console.error('Error fetching users for admin map:', err);
        });

        
        [400, 900].forEach(function(ms) {
            setTimeout(function() { if (_adminGMap) google.maps.event.trigger(_adminGMap, 'resize'); }, ms);
        });

        if (typeof applySavedLanguage === 'function') applySavedLanguage();
    }

    
    container.innerHTML = '';
    _doInitAdminMap({ lat: 1.3733, lng: 32.2903 }, false);

    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
            if (!_adminGMap) return;
            var loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            new google.maps.Marker({
                position: loc, map: _adminGMap,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8,
                    fillColor: '#ffffff', fillOpacity: 1,
                    strokeColor: '#1a4080', strokeWeight: 3 },
                title: 'Admin (You)', zIndex: 500
            });
        }, null, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
    }
}

function renderMapUsers(allUsers) {
    if (!_adminGMap) return;

    var citizens = allUsers.filter(function(u) { return (u.role || u.userType) === 'Citizen'; }).length;
    var lawyers  = allUsers.filter(function(u) { return (u.role || u.userType) === 'Lawyer'; }).length;

    
    _adminGMap.controls[google.maps.ControlPosition.TOP_LEFT].clear();
    var summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = 'background:white;padding:10px 14px;border-radius:8px;'
        + 'box-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:13px;border-left:4px solid #1a4080;margin:10px 0 0 10px;'
        + 'max-width:calc(100vw - 40px);box-sizing:border-box;overflow-wrap:break-word;';
    summaryDiv.innerHTML = '<strong style="color:#1a4080;">\uD83D\uDC65 Total Users: ' + allUsers.length + '</strong>'
        + '<div class="lcdjp-map-summary-row">'
        + '<span>\uD83D\uDFE2 Citizens: ' + citizens + '</span>'
        + '<span>\u2696\uFE0F Lawyers: ' + lawyers + '</span>'
        + '</div>';
    _adminGMap.controls[google.maps.ControlPosition.TOP_LEFT].push(summaryDiv);

    
    function _adminGetCoords(districtName) {
        if (!districtName || typeof ugandaCoordinates === 'undefined') return null;
        var d = ugandaCoordinates.districts;
        if (d[districtName]) return d[districtName];
        var lower = districtName.toLowerCase();
        for (var k in d) { if (k.toLowerCase() === lower) return d[k]; }
        for (var k in d) { if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) return d[k]; }
        return { lat: 1.3733, lng: 32.2903 };
    }

    
    var typeConfig = {
        'Citizen':     { color: '#28a745', border: '#1a6b2e', size: 18 },
        'Lawyer':      { color: '#1565C0', border: '#0d47a1', size: 22 }
    };
    var pendingConfig = { color: '#dc3545', border: '#b71c1c', size: 18 };

    var districtCount = {};

    allUsers.forEach(function(user) {
        var coords = _adminGetCoords(user.district);
        if (!coords) return;

        
        var key = user.district || 'unknown';
        districtCount[key] = (districtCount[key] || 0) + 1;
        var n      = districtCount[key];
        var angle  = n * 2.4;
        var r_off  = 0.02 * Math.sqrt(n);
        var lat    = coords.lat + r_off * Math.sin(angle);
        var lng    = coords.lng + r_off * Math.cos(angle);

        var isPending = (user.approval_status === 'Pending' || user.approval_status === null);
        var cfg       = isPending ? pendingConfig : (typeConfig[user.role] || typeConfig[user.userType] || typeConfig['Citizen']);

        var marker = new google.maps.Marker({
            position: { lat: lat, lng: lng },
            map: _adminGMap,
            icon: {
                url: _adminMarkerSVG(cfg.color, cfg.border, cfg.size),
                scaledSize: new google.maps.Size(cfg.size, cfg.size),
                anchor: new google.maps.Point(cfg.size / 2, cfg.size / 2)
            },
            title: ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.username || '',
            zIndex: isPending ? 200 : 100
        });

        
        var nu = {
            firstName:            user.first_name          || user.firstName            || '',
            lastName:             user.last_name           || user.lastName             || '',
            username:             user.username            || '',
            userType:             user.role                || user.userType             || '',
            approvalStatus:       user.approval_status     || user.approvalStatus       || '',
            phoneNumber:          user.phone_number        || user.phoneNumber          || '',
            district:             user.district            || '',
            subCounty:            user.sub_county          || user.subCounty            || '',
            registrationDate:     user.registration_date   || user.registrationDate     || '',
            lawyerSpecialization: user.specialization      || user.lawyerSpecialization || '',
            lawyerRegNumber:      user.reg_number          || user.lawyerRegNumber      || '',
            userLevel:            user.lc_level            || user.userLevel            || ''
        };
        window._adminMapUsers[nu.username] = nu;

        var displayName = (nu.firstName + ' ' + nu.lastName).trim() || nu.username;
        var roleIcon    = nu.userType === 'Lawyer' ? '\u2696\uFE0F' : '\uD83D\uDC64';
        var statusBadge = isPending
            ? '<span style="background:#ff9800;color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">\u23F3 Pending</span>'
            : '<span style="background:#28a745;color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;">\u2713 ' + (nu.approvalStatus || 'Active') + '</span>';

        var infoContent = '<div style="font-family:inherit;padding:4px 2px;min-width:190px;">'
            + '<div style="font-weight:700;font-size:14px;color:#1a237e;margin-bottom:3px;">' + roleIcon + ' ' + displayName + '</div>'
            + '<div style="font-size:12px;color:#555;margin-bottom:3px;">' + (nu.userType || '') + '</div>'
            + '<div style="font-size:12px;color:#555;margin-bottom:4px;">\uD83D\uDCCD ' + (nu.district || 'Unknown District')
                + (nu.subCounty ? ', ' + nu.subCounty : '') + '</div>'
            + '<div style="margin-bottom:8px;">' + statusBadge + '</div>'
            + (isPending
                ? '<button onclick="adminQuickApprove(\'' + nu.username.replace(/'/g,"\\'") + '\')" '
                  + 'style="background:#28a745;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;width:100%;margin-bottom:5px;">'
                  + '\u2714 Approve User</button><br>'
                : '')
            + '<button onclick="showAdminUserPanel(window._adminMapUsers[\'' + nu.username.replace(/'/g,"\\'") + '\']);if(window._adminInfoWindow)window._adminInfoWindow.close();" '
            + 'style="background:#fff;color:#1a4080;border:1px solid #1a4080;border-radius:6px;font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;width:100%;">'
            + '\uD83D\uDC64 View Full Profile</button>'
            + '</div>';

        (function(m, content, normalised) {
            m.addListener('click', function() {
                _adminInfoWindow.setContent(content);
                _adminInfoWindow.open(_adminGMap, m);
            });
        })(marker, infoContent, nu);
    });

    
    
    
    
    
    
    function _strictGetCoordsForBounds(districtName) {
        if (!districtName || typeof ugandaCoordinates === 'undefined') return null;
        var d = ugandaCoordinates.districts;
        if (d[districtName]) return d[districtName];
        var lower = districtName.toLowerCase();
        for (var k in d) { if (k.toLowerCase() === lower) return d[k]; }
        for (var k in d) {
            if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) return d[k];
        }
        return null; 
    }

    var bounds = new google.maps.LatLngBounds();
    var plotted = 0;
    allUsers.forEach(function(user) {
        var coords = _strictGetCoordsForBounds(user.district);
        if (coords) { bounds.extend(coords); plotted++; }
    });
    if (plotted > 0) {
        _adminGMap.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
        google.maps.event.addListenerOnce(_adminGMap, 'idle', function() {
            if (_adminGMap.getZoom() > 13) _adminGMap.setZoom(13);
        });
    }

    
    window._adminInfoWindow = _adminInfoWindow;
}

function showAdminUserPanel(user) {
    var panel = document.getElementById('adminUserPanel');
    if (!panel) return;
    var name = ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || user.username;
    var statusColor = user.approvalStatus === 'Approved' ? '#28a745' : user.approvalStatus === 'Pending' ? '#ff9800' : '#dc3545';
    var typeIcon = user.userType === 'Lawyer' ? '' : '';
    var regDate = user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A';
    var uname = user.username || '';
    
    var html = '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">';
    html += '<div>';
    html += '<div style="font-size:44px;margin-bottom:6px;">' + typeIcon + '</div>';
    html += '<h3 style="color:#1a4080;margin:0 0 6px 0;">' + name + '</h3>';
    html += '<span style="background:' + statusColor + ';color:white;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:bold;">' + (user.approvalStatus || 'N/A') + '</span>';
    html += '</div>';
    html += '<button onclick="document.getElementById(&quot;adminUserPanel&quot;).style.display=&quot;none&quot;" style="background:none;border:none;font-size:24px;cursor:pointer;color:#aaa;line-height:1;"></button>';
    html += '</div>';
    html += '<div style="border-top:2px solid #e5eeff;padding-top:15px;font-size:14px;line-height:2;">';
    html += '<div><strong> Type:</strong> ' + (user.userType || 'N/A') + '</div>';
    html += '<div><strong> Username:</strong> ' + uname + '</div>';
    html += '<div><strong> Phone:</strong> ' + (user.phoneNumber || 'N/A') + '</div>';
    html += '<div><strong> District:</strong> ' + (user.district || 'N/A') + '</div>';
    html += '<div><strong> Sub-County:</strong> ' + (user.subCounty || 'N/A') + '</div>';
    html += '<div><strong> Registered:</strong> ' + regDate + '</div>';
    if (user.userType === 'Lawyer') {
        html += '<div><strong> Specialization:</strong> ' + (user.lawyerSpecialization || 'N/A') + '</div>';
        html += '<div><strong> Reg No:</strong> ' + (user.lawyerRegNumber || 'N/A') + '</div>';
    }
    html += '</div>';
    html += '<div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">';
    if (user.approvalStatus === 'Pending') {
        html += '<button onclick="adminQuickApprove(\'' + uname + '\')" style="padding:11px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;"> Approve User</button>';
    }
    html += '<button onclick="viewUserFromMap(\'' + uname + '\')" style="padding:11px;background:#fff;color:#1a4080;border:1px solid #1a4080;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;"> View Full Profile</button>';
    html += '</div>';
    
    panel.innerHTML = html;
    panel.style.display = 'block';
}

function viewUserFromMap(username) {
    document.getElementById('adminUserPanel').style.display = 'none';
    showUserManagement();
    setTimeout(function() {
        var searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.value = username;
            if (typeof filterUsers === 'function') filterUsers();
        }
    }, 400);
}

function adminQuickApprove(username) {
    var userKey = 'user_' + username;
    var user = JSON.parse(JSON.stringify(_lcdjp_user_index[userKey] || null));
    if (!user) { alert('User not found.'); return; }
    user.approvalStatus = 'Approved';
    _lcdjp_saveUserToAPI(user);
    alert(' ' + (user.firstName || username) + ' has been approved!');
    showAdminUserPanel(user);
    buildAdminMap();
}


function setAdminActiveMenu(menuId) {
    document.querySelectorAll('.admin-menu-item').forEach(function(el) {
        el.classList.remove('admin-active');
    });
    var active = document.getElementById(menuId);
    if (active) active.classList.add('admin-active');
}

(function () {
    var AVATAR_SELECTOR = '#cdtAvatar, #lwtAvatar, #adtAvatar, #cmAvatar, #lmAvatar';
    var IMG_CLASS = 'lcdjp-avatar-img';
    var HAS_CLASS = 'lcdjp-has-avatar';
    var observed = (typeof WeakSet === 'function') ? new WeakSet() : null;

    function currentUsername() {
        return localStorage.getItem('lcdjp_username') ||
               sessionStorage.getItem('lcdjp_username') || '';
    }

    function savedAvatar() {
        var username = currentUsername();
        if (!username) return '';
        var data = sessionStorage.getItem('lcdjp_avatar_' + username) ||
                   localStorage.getItem('lcdjp_avatar_' + username) || '';
        if (!data || data === 'undefined' || data === 'null') return '';
        return data;
    }

    function watch(el) {
        if (!observed || observed.has(el) || typeof MutationObserver !== 'function') return;
        observed.add(el);
        new MutationObserver(function () {
            var src = savedAvatar();
            if (src && !el.querySelector('.' + IMG_CLASS)) paint(el, src);
        }).observe(el, { childList: true });
    }

    function paint(el, src) {
        var img = el.querySelector('.' + IMG_CLASS);
        if (!img) {
            img = document.createElement('img');
            img.className = IMG_CLASS;
            img.alt = '';
            el.appendChild(img);
        }
        if (img.getAttribute('src') !== src) img.src = src;
        el.classList.add(HAS_CLASS);
        watch(el);
    }

    function clear(el) {
        var img = el.querySelector('.' + IMG_CLASS);
        if (img) img.remove();
        el.classList.remove(HAS_CLASS);
    }

    function applyAvatarEverywhere() {
        var src = savedAvatar();

        if (src) {
            Array.prototype.forEach.call(
                document.querySelectorAll('#profilePicture, .js-profile-avatar-img'),
                function (img) {
                    if (img.getAttribute('src') !== src) img.src = src;
                }
            );
        }

        Array.prototype.forEach.call(
            document.querySelectorAll(AVATAR_SELECTOR),
            function (el) { src ? paint(el, src) : clear(el); }
        );
    }

    window.lcdjpApplyAvatarEverywhere = applyAvatarEverywhere;
    window.lcdjpGetSavedAvatarData = savedAvatar;

    function start() {
        applyAvatarEverywhere();
        setInterval(applyAvatarEverywhere, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    window.addEventListener('storage', function (e) {
        if (e && e.key && e.key.indexOf('lcdjp_avatar_') === 0) applyAvatarEverywhere();
    });
})();


(function () {
    var NAME_SPANS = '#bannerUserName, #cmBannerUserName, #cdgUserName';

    function firstName() {
        if (typeof window._lcdjpDisplayFirstName === 'function') {
            var viaDashboard = window._lcdjpDisplayFirstName();
            if (viaDashboard && viaDashboard !== 'there') return viaDashboard;
        }
        var full = sessionStorage.getItem('lcdjp_fullname') || localStorage.getItem('lcdjp_fullname') ||
                   sessionStorage.getItem('fullName') || localStorage.getItem('fullName') || '';
        full = String(full || '').trim();
        if (full) return full.split(' ')[0];
        return sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
    }

    function timeGreeting() {
        var h = new Date().getHours();
        return h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
    }

    function refreshGreetingNames() {
        var name = firstName();

        if (!name) {
            Array.prototype.forEach.call(
                document.querySelectorAll(NAME_SPANS),
                function (el) {
                    if (el.textContent.trim() !== 'there') el.textContent = 'there';
                }
            );
            return;
        }

        Array.prototype.forEach.call(
            document.querySelectorAll(NAME_SPANS),
            function (el) {
                if (el.textContent.trim() !== name) el.textContent = name;
            }
        );

        var greet = timeGreeting();
        Array.prototype.forEach.call(
            document.querySelectorAll('#cdgTimeGreet'),
            function (el) {
                if (el.textContent.trim() !== greet) el.textContent = greet;
            }
        );
    }

    window.lcdjpRefreshGreetingNames = refreshGreetingNames;

    function start() {
        refreshGreetingNames();
        setInterval(refreshGreetingNames, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
