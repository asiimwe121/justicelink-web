



































function updateLawyerStatistics() {}
window.updateLawyerStatistics = updateLawyerStatistics;

function showLawyerForwardForm(caseId) {
    const modal = document.createElement('div');
    modal.setAttribute('data-lcdjp-lawyer-forward-modal', '1');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;max-width:520px;width:100%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;">
            <h3 style="color:#1a4080;margin:0 0 8px;">Forward Case</h3>
            <p style="font-size:13px;color:#666;margin:0 0 14px;">
                Forward case <strong>${caseId}</strong> back for reassignment. This will NOT assign it to another
                lawyer directly — add a short note on what you found and what kind of lawyer this needs. The citizen
                will be notified (email/SMS/in-app) and their AI Assistant will use your note to help pick the next lawyer.
            </p>
            <textarea id="lawyerForwardNotes_${caseId}" placeholder="Advice for the next handler (required)…"
                style="width:100%;min-height:100px;padding:10px;border:1px solid #cfd8ea;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>
            <div id="lawyerForwardErr_${caseId}" style="color:#dc3545;font-size:12px;margin-top:6px;display:none;"></div>
            <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
                <button onclick="_lawyerSubmitForward('${caseId}')" style="flex:1;min-width:140px;padding:10px 16px;background:#e3f2fd;color:#1565c0;border:1px solid #1565c0;border-radius:8px;cursor:pointer;font-weight:600;">
                    Forward Case
                </button>
            </div>
            <div style="margin-top:12px;text-align:right;">
                <button onclick="this.closest('[data-lcdjp-lawyer-forward-modal]').remove();" style="padding:8px 20px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:13px;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}
window.showLawyerForwardForm = showLawyerForwardForm;

async function _lawyerSubmitForward(caseId) {
    const notesEl = document.getElementById('lawyerForwardNotes_' + caseId);
    const errEl = document.getElementById('lawyerForwardErr_' + caseId);
    const notes = ((notesEl && notesEl.value) || '').trim();
    if (!notes) {
        if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Please add a note on what this case needs before continuing.'; }
        return;
    }
    if (!confirm('Forward this case for reassignment? The citizen will be notified and can reopen the AI Assistant to choose a new lawyer.')) return;

    try {
        const headers = (typeof _getLawyerAuthHeaders === 'function') ? _getLawyerAuthHeaders() : { 'Content-Type': 'application/json' };
        const lawyerUsername = sessionStorage.getItem('lcdjp_username') || localStorage.getItem('lcdjp_username') || '';
        const lawyerName = sessionStorage.getItem('lcdjp_fullname') || lawyerUsername;

        const caseResp = await fetch(API_ENDPOINTS.case(caseId), { headers: headers });
        if (!caseResp.ok) { alert('Failed to load case before forwarding.'); return; }
        const caseRaw = await caseResp.json();
        const foundCase = caseRaw.case || caseRaw;

        const priorHandlers = Array.isArray(foundCase.previousHandlers) ? foundCase.previousHandlers.slice() : [];
        priorHandlers.push({
            username: lawyerUsername, name: lawyerName, role: 'Lawyer',
            action: 'forwarded', notes: notes, at: new Date().toISOString()
        });

        let timeline = [];
        try {
            timeline = foundCase.timeline
                ? (typeof foundCase.timeline === 'string' ? JSON.parse(foundCase.timeline) : foundCase.timeline)
                : [];
        } catch (e) { timeline = []; }
        timeline.push({
            action: 'Case Forwarded',
            details: `${lawyerName} (Lawyer) forwarded this case for reassignment. Note: ${notes}`,
            actor: lawyerUsername,
            timestamp: new Date().toLocaleString()
        });

        const combinedComments = (foundCase.legalAdvice || foundCase.lcComments ? (foundCase.legalAdvice || foundCase.lcComments) + '\n\n' : '') +
            `[Forwarded by ${lawyerName}]: ${notes}`;

        const updateData = {
            status: 'Awaiting Lawyer Selection',
            current_handler: null,
            handler_role: null,
            assigned_lawyer: null,
            lcComments: combinedComments,
            lc_referral_notes: notes,
            referred_by_role: 'Lawyer',
            referred_to: 'lawyer',
            referred_by: lawyerUsername,
            messaging_enabled: 0,
            messaging_locked: 1,
            previousHandlers: priorHandlers,
            timeline: JSON.stringify(timeline)
        };

        const updateResp = await fetch(API_ENDPOINTS.case(caseId), {
            method: 'PUT', headers: headers, body: JSON.stringify(updateData)
        });
        if (!updateResp.ok) {
            if (updateResp.status === 401 || updateResp.status === 403) {
                alert('Authentication error. Please login again.');
                return;
            }
            throw new Error('Failed to forward case');
        }

        const citizenUsername = foundCase.citizen_id || foundCase.citizen || foundCase.citizenUsername || foundCase.citizenId;
        const notifMessage = `Your case ${caseId} has been forwarded back by ${lawyerName} (Lawyer). Note: ${notes}. Open your case and reopen the AI Assistant — it will show you this note and help you choose a new lawyer.`;
        if (citizenUsername) {
            if (typeof createEnhancedNotification === 'function') {
                await createEnhancedNotification(citizenUsername, notifMessage, 'case_forwarded', caseId);
            } else {
                await fetch(API_ENDPOINTS.notifications, {
                    method: 'POST', headers: headers,
                    body: JSON.stringify({
                        username: citizenUsername, message: notifMessage, type: 'case_forwarded',
                        caseId: caseId, referredTo: 'lawyer', timestamp: new Date().toISOString(), is_read: false
                    })
                });
            }
        }

        const openModal = document.querySelector('[data-lcdjp-lawyer-forward-modal]');
        if (openModal) openModal.remove();
        alert('Case forwarded. The citizen has been notified and can reopen the AI Assistant to choose a new lawyer.');

        if (typeof closeCaseDetails === 'function') closeCaseDetails();
        if (typeof loadLawyerCases === 'function') loadLawyerCases();
        if (typeof renderNavbarNotifBadge === 'function') renderNavbarNotifBadge();
    } catch (err) {
        console.error('_lawyerSubmitForward:', err);
        alert('Failed to forward case: ' + err.message);
    }
}
window._lawyerSubmitForward = _lawyerSubmitForward;



let _lawyerSearchDebounceTimer = null;
