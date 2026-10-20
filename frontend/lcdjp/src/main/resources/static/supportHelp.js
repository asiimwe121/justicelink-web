/*
 * Support bot.
 *
 * Opening Contact Support no longer drops people straight into the live chat. They first talk to a help assistant
 * inside the same window: it asks what the problem is (tap a topic or type it), suggests what usually fixes it,
 * asks "did that solve it?", tries a few more checks if not, and only when the person is still stuck does it offer
 * to hand them over to customer care. The handover sends the first live-chat message for them, containing the topic,
 * what the bot already suggested and their description, so customer care does not start from zero.
 *
 * Rule based (keyword matching + the TOPICS list below), no AI service needed. Wraps window.toggleChat
 * (dashboard-citizen-desktop.js), so every "Contact Support" button gets it. Contact Support is only reachable once
 * signed in. Administrators skip the bot (they are the support team).
 */
(function () {
    'use strict';

    var ENGAGED_KEY = 'lcdjp_support_engaged';
    var ENGAGED_MS = 24 * 60 * 60 * 1000;
    var MIN_DETAILS = 10;

    // ------------------------------------------------------------------ content (edit the wording here)
    // roles: omitted = everyone. keywords: lower-case words/phrases matched against what the person types.
    // steps: first suggestions. more: extra checks offered if the first ones did not work.
    var TOPICS = [
        {
            id: 'pending', icon: '⏳', title: 'My account is waiting for approval',
            keywords: ['approval', 'approve', 'approved', 'pending', 'verification', 'verify', 'verified', 'identity', 'waiting', 'activate', 'activated'],
            steps: {
                citizen: [
                    'Identity verification is reviewed by an administrator. You will get an <b>alert and an email</b> when a decision is made, so check <b>Alerts</b> too.',
                    'Blurry or cropped ID photos are often sent back. Make sure all corners are visible and the text is readable.',
                    'Some services, like reporting or tracking a case, stay locked until verification is approved. Emergency help does not need verification.'
                ],
                other: [
                    'New accounts are approved by an administrator after your details and documents are checked. You will get an email when a decision is made.',
                    'Make sure the email on your account is correct.',
                    'Documents that are unclear or incomplete can delay approval.'
                ]
            },
            more: ['Check your email <b>Spam or Junk</b> folder for a message from JusticeLink.', 'Look in <b>Alerts</b> for a message about your verification.'],
            actions: ['alerts']
        },
        {
            id: 'case', icon: '📁', title: 'Where is my case?', roles: ['citizen'],
            keywords: ['case', 'status', 'progress', 'track', 'tracking', 'update', 'forwarded', 'resolved', 'handler', 'my cases'],
            steps: [
                'Open <b>My Cases</b> to see the current status. If it says the feature is unavailable, your identity verification has not been approved yet.',
                '<b>Pending</b> means your Local Council has not finished reviewing it. <b>Forwarded</b> means it has moved up to the next level. <b>Accepted by Lawyer</b> means a lawyer has taken it on. <b>Resolved</b> means it is closed.',
                'Every change creates an alert, so check <b>Alerts</b>. You can also message whoever is handling the case from inside the case, when messaging is switched on.'
            ],
            more: ['Open the case itself and read its status and any messages.', 'Check that you are looking at the right case if you have more than one.'],
            actions: ['mycases', 'alerts']
        },
        {
            id: 'report', icon: '📝', title: 'I want to report a case or an emergency', roles: ['citizen'], urgent: true,
            keywords: ['report', 'complaint', 'complain', 'emergency', 'submit', 'new case', 'file a case', 'dispute', 'land', 'family', 'debt', 'theft', 'stole'],
            steps: [
                '<b>In danger right now?</b> Call <a href="tel:999">999</a> or <a href="tel:112">112</a> first. Emergency reports in the app do not need identity verification.',
                'To report a dispute (land, family, debt and so on), tap <b>Report</b>. You may be asked to finish identity verification first.',
                'No internet? You can write your case offline. It is saved on your phone and sent when you are connected again.'
            ],
            more: ['Check that your identity verification has been approved (see <b>Alerts</b>).', 'Try the <b>Report</b> button again with a stronger connection.'],
            actions: ['report', 'emergency']
        },
        {
            id: 'upload', icon: '📎', title: "I can't upload a photo, document or recording",
            keywords: ['upload', 'photo', 'picture', 'image', 'document', 'attach', 'attachment', 'file', 'video', 'voice', 'recording', 'camera', 'microphone', 'mic', 'pdf'],
            steps: [
                'Files up to about <b>15 MB</b> can be sent. Photos are shrunk automatically, but a long video or a very large file will not go through.',
                'When your browser asks to use the <b>camera or microphone</b>, tap Allow. If you said no earlier, tap the lock icon next to the address bar to change it.',
                'A slow connection can time out. Move to better signal and try again. You can add more evidence to a case later from <b>My Cases</b>.'
            ],
            more: ['Try a smaller file, or take the photo again at a lower quality.', 'Close other apps and try again, a phone that is low on storage can fail to attach files.']
        },
        {
            id: 'find', icon: '🗺️', title: 'I need a lawyer or my Local Council', roles: ['citizen'],
            keywords: ['lawyer', 'advocate', 'lc', 'local council', 'council', 'court', 'police', 'map', 'legal aid', 'nearby', 'find'],
            steps: [
                'Open the <b>map</b> to see nearby Local Councils, lawyers, police and courts. Tap a pin to see names and choose one.',
                'For free legal help you can call a Legal Aid Clinic: <a href="tel:+256414531250">Kampala +256 414 531 250</a>, or the <a href="tel:+256414347594">Uganda Law Society +256 414 347 594</a>.',
                'To have a lawyer take your matter through JusticeLink, report the case. It can be forwarded to a lawyer from there.'
            ],
            more: ['Zoom the map out to see more services, pins close together are grouped and list their names when tapped.'],
            actions: ['report']
        },
        {
            id: 'payment', icon: '💳', title: 'Subscription or payment problem', roles: ['lawyer'],
            keywords: ['pay', 'paid', 'payment', 'subscription', 'subscribe', 'mobile money', 'momo', 'mtn', 'airtel', 'money', 'invoice', 'expired'],
            steps: [
                'Open your dashboard and check your <b>subscription status</b> and the days remaining.',
                'If you have just paid, wait a few minutes and refresh the page.',
                'Make sure the mobile money number you paid with is the one on your subscription.'
            ],
            more: ['Reload the app once more after waiting a few minutes.', 'Keep your transaction ID and the time you paid ready, customer care will ask for them.'],
            actions: ['reload']
        },
        {
            id: 'app', icon: '🛠️', title: "Something isn't loading or working",
            keywords: ['slow', 'loading', 'load', 'error', 'crash', 'crashing', 'bug', 'blank', 'stuck', 'freeze', 'frozen', 'not working', "doesn't work", 'broken', 'fail', 'failed', 'problem'],
            steps: [
                'Check your internet connection, then <b>reload</b> the app.',
                'Still stuck? Close the app or tab completely and open it again, or try a different browser.',
                'If an error message appears, note exactly what it says. It helps us find the problem faster.'
            ],
            more: ['Switch between Wi-Fi and mobile data, then try again.', 'Clear the browser data for this site and sign in again.'],
            actions: ['reload']
        }
    ];

    var EMERGENCY_WORDS = ['danger', 'attack', 'attacked', 'beat', 'beaten', 'abuse', 'abused', 'threat', 'threaten', 'threatened', 'kill', 'weapon', 'rape', 'kidnap', 'violence', 'violent'];
    var HUMAN_WORDS = ['customer care', 'agent', 'human', 'person', 'admin', 'someone', 'representative', 'support team', 'talk to'];

    // ------------------------------------------------------------------ helpers
    function $(id) { return document.getElementById(id); }

    function h(tag, attrs, kids) {
        var e = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) {
            if (k === 'class') e.className = attrs[k];
            else if (k === 'html') e.innerHTML = attrs[k];   // only ever static strings from TOPICS above
            else if (k === 'text') e.textContent = attrs[k];
            else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
            else e.setAttribute(k, attrs[k]);
        });
        (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }

    function readKey(k) {
        var v = null;
        try { v = sessionStorage.getItem(k); } catch (e) { /* storage blocked */ }
        if (!v) { try { v = localStorage.getItem(k); } catch (e) { /* storage blocked */ } }
        return v;
    }
    function username() {
        if (typeof getLcdjpActiveUsername === 'function') { try { var u = getLcdjpActiveUsername(); if (u) return u; } catch (e) { /* fall through */ } }
        return readKey('lcdjp_username') || '';
    }
    function roleKey() {
        var r = String(readKey('lcdjp_userlevel') || 'Citizen').toLowerCase();
        if (r.indexOf('lawyer') > -1) return 'lawyer';
        if (r.indexOf('system') > -1 || r.indexOf('admin') > -1) return 'admin';
        if (r.indexOf('lc') === 0) return 'lc';
        if (r.indexOf('org') > -1) return 'org';
        return 'citizen';
    }
    function roleLabel() { return readKey('lcdjp_userlevel') || 'Citizen'; }
    function firstName() { return String(readKey('lcdjp_fullname') || '').trim().split(/\s+/)[0] || ''; }

    function topicsForRole() {
        var rk = roleKey();
        return TOPICS.filter(function (t) { return !t.roles || t.roles.indexOf(rk) > -1; });
    }
    function stepsFor(t) {
        if (Array.isArray(t.steps)) return t.steps;
        return t.steps[roleKey()] || t.steps.other || t.steps.citizen || [];
    }
    function engagedRecently() {
        var v = parseInt(readKey(ENGAGED_KEY) || '0', 10);
        return v && Date.now() - v < ENGAGED_MS;
    }
    function markEngaged() { try { sessionStorage.setItem(ENGAGED_KEY, String(Date.now())); } catch (e) { /* blocked */ } }

    function words(text) { return ' ' + String(text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '; }
    function has(text, list) { var w = words(text); return list.some(function (k) { return w.indexOf(' ' + k + ' ') > -1; }); }

    /** Best topic for free text, or null when nothing matches. */
    function matchTopic(text) {
        var w = words(text), best = null, bestScore = 0;
        topicsForRole().forEach(function (t) {
            var score = 0;
            t.keywords.forEach(function (k) { if (w.indexOf(' ' + k + ' ') > -1) score += k.indexOf(' ') > -1 ? 2 : 1; });
            if (score > bestScore) { best = t; bestScore = score; }
        });
        return best;
    }

    // ------------------------------------------------------------------ actions (hidden when the app can't do them)
    function closeSupportWindow() {
        var cw = $('chatWindow');
        if (cw && cw.style.display === 'flex' && typeof window.toggleChat === 'function') window.toggleChat();
    }
    var ACTIONS = {
        reload: { label: 'Reload the app', ok: function () { return true; }, run: function () { window.location.reload(); } },
        mycases: { label: 'Open My Cases', ok: function () { return !!$('cmNavCases'); }, run: function () { closeSupportWindow(); $('cmNavCases').click(); } },
        alerts: { label: 'Open Alerts', ok: function () { return typeof window.toggleNotifications === 'function'; }, run: function () { closeSupportWindow(); window.toggleNotifications(); } },
        report: { label: 'Report a case', ok: function () { return typeof window.svcRequireAuth === 'function'; }, run: function () { closeSupportWindow(); window.svcRequireAuth('reportCase'); } },
        emergency: { label: 'Emergency help', ok: function () { return typeof window.openEmergencyAssistant === 'function'; }, run: function () { closeSupportWindow(); window.openEmergencyAssistant(); } }
    };

    // ------------------------------------------------------------------ the conversation
    var overlay = null, msgsEl = null, inputEl = null, sendBtn = null, origToggle = null;
    var bot = null;   // conversation state, null when closed

    function delay() { return typeof window.lcdjpSupportBotDelay === 'number' ? window.lcdjpSupportBotDelay : 450; }

    function removeOverlay() {
        bot = null;
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = msgsEl = inputEl = sendBtn = null;
    }

    function scrollDown() { if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight; }
    // A new bot message (plus its chips) that is taller than the window scrolls to its top, so it is read from the start;
    // anything shorter scrolls to the bottom as in a normal chat.
    function scrollToMessage(bubble) {
        if (!msgsEl || !bubble) return;
        var offset = bubble.getBoundingClientRect().top - msgsEl.getBoundingClientRect().top + msgsEl.scrollTop;
        if (msgsEl.scrollHeight - offset > msgsEl.clientHeight) msgsEl.scrollTop = Math.max(0, offset - 8);
        else scrollDown();
    }
    function clearChips() { if (msgsEl) Array.prototype.forEach.call(msgsEl.querySelectorAll('.sh-chips'), function (c) { c.parentNode.removeChild(c); }); }

    function userSays(text) {
        clearChips();
        msgsEl.appendChild(h('div', { class: 'sh-msg user', text: text }));
        scrollDown();
    }

    /** Queue a bot message (typing dots first), optionally followed by quick-reply chips. */
    function botSays(content, chips, opts) {
        if (!bot) return;
        var token = bot;
        bot.queue = bot.queue.then(function () {
            return new Promise(function (resolve) {
                if (bot !== token || !msgsEl) return resolve();
                var typing = h('div', { class: 'sh-msg bot' }, [h('span', { class: 'sh-typing', 'aria-hidden': 'true' }, [h('i'), h('i'), h('i')])]);
                msgsEl.appendChild(typing); scrollDown();
                setTimeout(function () {
                    if (bot !== token || !msgsEl) return resolve();
                    var bubble = h('div', { class: 'sh-msg bot' + (opts && opts.urgent ? ' urgent' : '') });
                    (Array.isArray(content) ? content : [content]).forEach(function (c) {
                        if (c && c.steps) {
                            var ol = h('ol');
                            c.steps.forEach(function (s) { ol.appendChild(h('li', { html: s })); });
                            bubble.appendChild(ol);
                        } else bubble.appendChild(h('p', { html: c }));
                    });
                    msgsEl.replaceChild(bubble, typing);
                    if (chips && chips.length) {
                        var row = h('div', { class: 'sh-chips' });
                        chips.forEach(function (c) {
                            row.appendChild(h('button', { class: 'sh-chip' + (c.kind ? ' ' + c.kind : ''), type: 'button', text: c.label, onclick: function () {
                                if (bot !== token) return;
                                userSays(c.echo || c.label);
                                c.run();
                            } }));
                        });
                        msgsEl.appendChild(row);
                    }
                    scrollToMessage(bubble); resolve();
                }, delay());
            });
        });
    }

    function actionChips(topic) {
        return (topic.actions || []).filter(function (k) { return ACTIONS[k] && ACTIONS[k].ok(); }).map(function (k) {
            return { label: ACTIONS[k].label, kind: 'soft', echo: ACTIONS[k].label, run: ACTIONS[k].run };
        });
    }

    function topicChips() {
        var chips = topicsForRole().map(function (t) {
            return { label: t.icon + ' ' + t.title, run: function () { bot.firstText = bot.firstText || t.title; suggest(t); } };
        });
        chips.push({ label: '💬 Something else', run: function () { askSomethingElse(); } });
        return chips;
    }

    function start() {
        var name = firstName();
        var intro = ['Hi' + (name ? ' ' + name : '') + '! I\'m the JusticeLink help assistant. Tell me what\'s wrong and I\'ll try to sort it out with you. If I can\'t, I\'ll connect you to customer care.',
                     'Tap a topic below or just type your problem.'];
        var chips = topicChips();
        if (username() && engagedRecently()) {
            chips.unshift({ label: '↩ Continue with customer care', kind: 'primary', run: function () { showLiveChat(); } });
        }
        botSays(intro, chips);
    }

    function askSomethingElse() {
        bot.topic = null;
        botSays('Sure. Describe the problem in a sentence or two and I\'ll see how I can help.');
        focusInput();
    }

    function emergency() {
        botSays('<b>If you or someone else is in danger right now, call <a href="tel:999">999</a> or <a href="tel:112">112</a> first.</b> Emergency reports in the app do not need identity verification.', actionChips(TOPICS[2]).slice(-1), { urgent: true });
    }

    function suggest(topic) {
        bot.topic = topic; bot.round = 1;
        var lead = bot.topic.id === 'app' ? 'Let\'s try these:' : 'Here\'s what usually fixes this:';
        var parts = [lead, { steps: stepsFor(topic) }];
        botSays(parts, actionChips(topic));
        botSays('Did that solve it?', [
            { label: '👍 Yes, solved', kind: 'primary', run: solved },
            { label: '👎 No, still stuck', run: function () { stillStuck(); } }
        ]);
    }

    function solved() {
        botSays('Glad that worked! Is there anything else I can help with?', [
            { label: 'Yes, another problem', run: function () { bot.topic = null; bot.round = 0; bot.strikes = 0; botSays('Okay, what else is going on?', topicChips()); } },
            { label: 'No, thank you', kind: 'primary', run: function () { botSays('You\'re welcome. Take care!'); bot.queue.then(function () { setTimeout(closeSupportWindow, 900); }); } }
        ]);
    }

    function stillStuck() {
        var t = bot.topic;
        if (t && bot.round === 1 && t.more && t.more.length) {
            bot.round = 2;
            botSays(['Sorry about that. Let\'s try a few more things:', { steps: t.more.concat(['Close and reopen the app, then try again.']) }], actionChips(t));
            botSays('Any luck?', [
                { label: '👍 Yes, solved', kind: 'primary', run: solved },
                { label: '👎 Still not working', run: function () { offerHandover(); } }
            ]);
        } else {
            offerHandover();
        }
    }

    function offerHandover() {
        botSays('I\'m sorry I couldn\'t fix this one here. Would you like me to hand you over to <b>customer care</b>? They will see everything we\'ve covered, so you won\'t have to repeat yourself.', [
            { label: '✅ Yes, connect me', kind: 'primary', run: beginHandover },
            { label: 'Not now', run: function () { botSays('No problem. You can come back any time. Is there anything else I can try?', topicChips()); } }
        ]);
    }

    function beginHandover() {
        var first = (bot.firstText || '').trim();
        if (first.length >= 20 && bot.typedFirst) {
            bot.details = first;
            handOver();
            return;
        }
        bot.mode = 'details';
        botSays('Please tell customer care in a sentence or two what is happening (include your case number if it is about a case).');
        focusInput();
    }

    function handOver() {
        botSays('Connecting you to customer care now…');
        var token = bot;
        bot.queue.then(function () { setTimeout(function () { if (bot === token) startLiveChat(); }, 500); });
    }

    function compose() {
        var t = bot.topic;
        var parts = ['[Customer care request] ' + (t ? t.title : 'Something else'),
            'From: ' + (readKey('lcdjp_fullname') || username()) + ' (' + roleLabel() + ', @' + username() + ')'];
        if (t) parts.push('Bot suggested the fix' + (bot.round > 1 ? 'es and extra checks' : 'es') + ', still not solved');
        else parts.push('Bot could not match a topic');
        parts.push('Details: ' + String(bot.details || '').trim().replace(/\s*\n\s*/g, ' '));
        return parts.join(' | ');
    }

    function showLiveChat() {
        removeOverlay();
        var input = $('chatInput');
        if (input) { try { input.focus(); } catch (e) { /* ignore */ } }
    }

    function startLiveChat() {
        var input = $('chatInput');
        var text = compose();
        if (!input || typeof window.sendChatMessage !== 'function') { showLiveChat(); return; }
        input.value = text;
        window.sendChatMessage();
        markEngaged();
        showLiveChat();
    }

    // What the person types in the bot's own box.
    function onSend() {
        if (!bot || !inputEl) return;
        var text = inputEl.value.trim();
        if (!text) return;
        inputEl.value = '';
        userSays(text);

        if (bot.mode === 'details') {
            if (text.length < MIN_DETAILS) { botSays('Could you add a little more detail? A sentence or two helps customer care a lot.'); return; }
            bot.details = text; bot.mode = null; handOver(); return;
        }

        if (has(text, EMERGENCY_WORDS)) { emergency(); }

        if (has(text, HUMAN_WORDS) && !matchTopic(text)) {
            bot.humanAsks = (bot.humanAsks || 0) + 1;
            if (bot.humanAsks >= 2 || bot.topic) { offerHandover(); return; }
            botSays('I can connect you to customer care. First, let me check whether this is something I can fix right away, which is usually quicker. What is it about?', topicChips());
            return;
        }

        var topic = matchTopic(text);
        if (!bot.firstText || !bot.typedFirst) { bot.firstText = text; bot.typedFirst = true; }
        if (topic) { bot.strikes = 0; suggest(topic); return; }

        bot.strikes = (bot.strikes || 0) + 1;
        if (bot.strikes >= 2) { offerHandover(); return; }
        botSays('I\'m not sure I understood. Which of these is closest to your problem?', topicChips());
    }

    function focusInput() { if (inputEl) { try { inputEl.focus(); } catch (e) { /* ignore */ } } }

    function open() {
        var cw = $('chatWindow');
        if (!cw) return;
        removeOverlay();
        bot = { queue: Promise.resolve(), topic: null, round: 0, strikes: 0, humanAsks: 0, mode: null, firstText: '', typedFirst: false, details: '' };
        var head = cw.firstElementChild;
        overlay = h('div', { class: 'sh-overlay', role: 'region', 'aria-label': 'Help assistant' });
        overlay.style.top = (head ? head.offsetHeight : 52) + 'px';
        msgsEl = h('div', { class: 'sh-msgs', role: 'log', 'aria-live': 'polite' });
        inputEl = h('input', { class: 'sh-input', type: 'text', maxlength: '500', placeholder: 'Type your problem…', 'aria-label': 'Describe your problem', autocomplete: 'off' });
        sendBtn = h('button', { class: 'sh-send', type: 'button', text: 'Send', onclick: onSend });
        inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); onSend(); } });
        overlay.appendChild(msgsEl);
        overlay.appendChild(h('div', { class: 'sh-inputrow' }, [inputEl, sendBtn]));
        cw.appendChild(overlay);
        start();
    }

    // ------------------------------------------------------------------ hook into the existing open/close
    function install() {
        if (typeof window.toggleChat !== 'function' || window.toggleChat.__shWrapped) return;
        origToggle = window.toggleChat;
        window.toggleChat = function () {
            var cw = $('chatWindow');
            var wasOpen = !!cw && cw.style.display === 'flex';
            var result = origToggle.apply(this, arguments);
            if (!cw) return result;
            var isOpen = cw.style.display === 'flex';
            if (isOpen && !wasOpen) { if (roleKey() !== 'admin') open(); }
            else if (!isOpen) removeOverlay();
            return result;
        };
        window.toggleChat.__shWrapped = true;
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay) closeSupportWindow(); });
    }

    window.lcdjpSupportHelp = { open: open, topics: TOPICS, match: matchTopic };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
