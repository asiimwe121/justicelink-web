



function _getAuthToken() {
    try {
        if (typeof getAuthToken === 'function') return getAuthToken();
        var token = (typeof getAuthToken === 'function' ? getAuthToken() : null) || null;
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
    console.log('toggleCaseVoiceRecording called');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Voice recording is not supported in this browser.');
        return;
    }
    
    if (!window.MediaRecorder) {
        showToast('MediaRecorder API not supported. Please use Chrome or Firefox.');
        return;
    }
    
    if (caseIsRecording) {
        stopCaseVoiceRecording();
    } else {
        startCaseVoiceRecording();
    }
}

function startCaseVoiceRecording() {
    console.log('startCaseVoiceRecording called');
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log('Microphone access granted for case recording');
            
            caseMediaRecorder = new MediaRecorder(stream);
            caseAudioChunks = [];
            
            caseMediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    caseAudioChunks.push(event.data);
                }
            };
            
            caseMediaRecorder.onstop = () => {
                console.log('Case recording stopped, chunks:', caseAudioChunks.length);

                
                stream.getTracks().forEach(track => track.stop());
                
                if (caseAudioChunks.length === 0) {
                    showToast('No audio recorded. Please try again.');
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
                    showToast('Recording stopped (60 second limit)');
                }
            }, 60000);
            
            showToast('Recording started... Speak your statement!');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                showToast('Please allow microphone access to record your statement.');
            } else if (error.name === 'NotFoundError') {
                showToast('No microphone found. Please connect a microphone.');
            } else {
                showToast('Could not access microphone: ' + error.message);
            }
        });
}

function stopCaseVoiceRecording() {
    if (caseRecordingTimer) { clearInterval(caseRecordingTimer); caseRecordingTimer = null; }
    caseIsRecording = false;
    try {
        if (caseMediaRecorder && caseMediaRecorder.state !== 'inactive') caseMediaRecorder.stop(); // onstop builds the preview
    } catch (e) {
        console.error('Error stopping case recording:', e);
    }
    const recordBtn = document.getElementById('caseVoiceRecordBtn');
    if (recordBtn) {
        recordBtn.textContent = 'Record again';
        recordBtn.style.background = '';
    }
    const timer = document.getElementById('caseVoiceTimer');
    if (timer) timer.style.display = 'none';
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
        
        showToast('Recording ready! Click Submit to include it with your case.');
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
                    showToast('No audio recorded.');
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
                    showToast('Recording stopped (60 second limit)');
                }
            }, 60000);
            
            showToast('Recording started...');
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
        
        showToast('Recording ready! Click Send to share.');
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
                showToast('You need to accept this case before you can message the citizen.');
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
        
        if (typeof showToast === 'function') showToast('Voice message sent successfully!');
        if (typeof lawyerSendMessage === 'function') { await lawyerSendMessage(caseId); } else if (typeof viewCase === 'function') viewCase(caseId);
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();

    } catch (error) {
        console.error('Error sending lawyer voice message:', error);
        if (typeof showToast === 'function') showToast('Failed to send voice message: ' + error.message);
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
                showToast('You need to accept this case before you can message the citizen.');
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
        if (typeof showToast === 'function') showToast('Message sent successfully!');
        if (typeof lawyerSendMessage === 'function') { await lawyerSendMessage(caseId); } else if (typeof viewCase === 'function') viewCase(caseId);
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();

    } catch (error) {
        console.error('Error sending lawyer text message:', error);
        if (typeof showToast === 'function') showToast('Failed to send message: ' + error.message);
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
                    <button id="fpcSubmitBtn" onclick="_submitForcePasswordChange(${escapeHtml(JSON.stringify(String(username)))}, ${escapeHtml(JSON.stringify(String(userRole)))})">Set Password</button>
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


// "Create an account" starts by asking whether the person is an LC or a citizen.
function showRegister() {
    if (typeof lcdjpShowAccountTypeChooser === 'function') {
        lcdjpShowAccountTypeChooser();
        return;
    }
    showCitizenRegister();
}

function showCitizenRegister() {
    _lcdjpHideLoginOtpPage();
    ["accountTypePage", "lcRequestPage"].forEach(function (id) {
        var page = document.getElementById(id);
        if (page) page.style.display = "none";
    });
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
            statusDiv.innerHTML = `<span style="color:#dc3545;">${escapeHtml(data.error || 'Failed to send code. Please try again.')}</span>`;
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
        'jwtToken', 'lcdjp_session', 'lcdjp_username', 'lcdjp_userlevel', 'lcdjp_district',
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

// The "pick all the motorcycles" popup is placed by Google using window scroll, but my login page scrolls
// inside its own box, so on phones the top of the popup ends up off screen. These keep it on screen.
var _LCDJP_CAPTCHA_MARGIN = 8;
var _lcdjpCaptchaFitQueued = false;
var _lcdjpSafeAreaProbe = null;

// Height of the status bar / notch in the installed app (0 in a normal browser tab).
function _lcdjpTopSafeArea() {
    if (!_lcdjpSafeAreaProbe) {
        _lcdjpSafeAreaProbe = document.createElement('div');
        _lcdjpSafeAreaProbe.style.cssText =
            'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px);';
        document.body.appendChild(_lcdjpSafeAreaProbe);
    }
    return parseFloat(getComputedStyle(_lcdjpSafeAreaProbe).paddingTop) || 0;
}

// Works out where the popup should sit: centred, below the status bar, shrunk if the screen is too short.
function _lcdjpCaptchaPlacement(box) {
    var viewport = window.visualViewport;
    var screenW = viewport ? viewport.width : window.innerWidth;
    var screenH = viewport ? viewport.height : window.innerHeight;
    var minTop = _lcdjpTopSafeArea() + _LCDJP_CAPTCHA_MARGIN;
    var boxW = box.offsetWidth || 400;
    var boxH = box.offsetHeight || 580;

    var scale = Math.min(
        1,
        (screenW - _LCDJP_CAPTCHA_MARGIN * 2) / boxW,
        (screenH - minTop - _LCDJP_CAPTCHA_MARGIN) / boxH
    );
    var freeSpace = screenH - minTop - _LCDJP_CAPTCHA_MARGIN - boxH * scale;
    return {
        scale: scale,
        top: minTop + Math.max(0, freeSpace / 2),
        left: Math.max(0, (screenW - boxW * scale) / 2)
    };
}

function _lcdjpFitCaptchaPopup() {
    _lcdjpCaptchaFitQueued = false;
    var frames = document.querySelectorAll('iframe[src*="recaptcha/api2/bframe"]');
    frames.forEach(function(frame) {
        // Google wraps the iframe twice: the inner box is the one that gets positioned.
        var box = frame.parentElement && frame.parentElement.parentElement;
        var wrapper = box && box.parentElement;
        if (!box || !wrapper || wrapper.style.visibility === 'hidden') return;

        var spot = _lcdjpCaptchaPlacement(box);
        var key = Math.round(spot.top) + '|' + Math.round(spot.left) + '|' + spot.scale.toFixed(3);
        if (box.getAttribute('data-lcdjp-fit') === key) return; // already placed, avoids a style-change loop
        box.setAttribute('data-lcdjp-fit', key);

        box.style.position = 'fixed';
        // fixed makes its own stacking layer, so it needs its own z-index or the login card covers it
        box.style.zIndex = '2147483647';
        box.style.margin = '0';
        box.style.top = spot.top + 'px';
        box.style.left = spot.left + 'px';
        box.style.transformOrigin = 'top left';
        box.style.transform = spot.scale < 1 ? 'scale(' + spot.scale + ')' : '';
    });
}

function _lcdjpQueueCaptchaFit() {
    if (_lcdjpCaptchaFitQueued) return;
    _lcdjpCaptchaFitQueued = true;
    requestAnimationFrame(_lcdjpFitCaptchaPopup);
}

// Google creates and restyles the popup whenever it likes, so I watch for it instead of calling this once.
function _lcdjpWatchCaptchaPopup() {
    new MutationObserver(_lcdjpQueueCaptchaFit).observe(document.body, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['style']
    });
    window.addEventListener('resize', _lcdjpQueueCaptchaFit);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', _lcdjpQueueCaptchaFit);
}

if (document.body) _lcdjpWatchCaptchaPopup();
else document.addEventListener('DOMContentLoaded', _lcdjpWatchCaptchaPopup);

// Phone browsers and installed apps often suppress alert() pop-ups, which looks like "nothing happened".
// Show login problems on the page itself instead.
function _lcdjpLoginMessage(message) {
    var box = document.getElementById('loginError');
    if (!box) { alert(message); return; }
    if (!message) { box.style.display = 'none'; box.textContent = ''; return; }
    box.textContent = message;
    box.style.display = 'block';
    try { box.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
}

function loginUser() {
    console.log("LOGIN FUNCTION STARTED");
    // A tap, the keyboard's Go key and form submit can all arrive together; only one login at a time.
    var _inFlightBtn = document.querySelector('.lg-submit');
    if (_inFlightBtn && _inFlightBtn.disabled) return;
    _lcdjpLoginMessage('');
    
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;

    if (!username || !password) {
        _lcdjpLoginMessage("Please enter your username and password.");
        return;
    }

    const rememberMeEl = document.getElementById("rememberMe");
    const rememberMe = !!(rememberMeEl && rememberMeEl.checked);

    var recaptchaToken = '';
    if (typeof window._lcdjpRecaptchaWidgetId !== 'undefined' && typeof grecaptcha !== 'undefined') {
        recaptchaToken = grecaptcha.getResponse(window._lcdjpRecaptchaWidgetId) || '';
        if (!recaptchaToken) {
            _lcdjpLoginMessage("Please tick \"I'm not a robot\" before logging in.");
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
            console.log('Login successful:', data);

            
            
            
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
            _lcdjpLoginMessage("Login failed: " + (data.error || "Invalid credentials"));
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            _lcdjpResetRecaptcha();
        }
    })
    .catch(error => {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        console.error('Login error:', error);
        if (error.locked) {
            _lcdjpLoginMessage(error.message + (error.supportEmail ? " Support: " + error.supportEmail : ""));
        } else if (error instanceof TypeError) {
            _lcdjpLoginMessage("Could not reach the server. Check your internet connection and try again.");
        } else {
            _lcdjpLoginMessage("Login failed: " + error.message + ". Please check your username and password.");
        }
        _lcdjpResetRecaptcha();
    });
}
