
function saveLegalAlerts() {
    
}

const QUICK_REPLIES = [
    "Thank you for your message. I am reviewing your case and will get back to you shortly.",
    "I have received your case details. I will need the following documents to proceed: National ID, Land Title, and any relevant agreements.",
    "Your case has been forwarded to the appropriate department for review.",
    "I recommend we schedule a meeting to discuss this further. Please let me know your availability.",
    "I have prepared the necessary legal documents. Please review and confirm.",
    "Your case has been successfully resolved. Please confirm receipt of the settlement.",
    "I am waiting for additional information from the other party. I will update you as soon as I hear back.",
    "Please provide me with more details about the incident, including dates and witnesses.",
    "I have consulted with the relevant authorities. Here is the update on your case...",
    "The next step is to file the necessary paperwork. I will prepare it and send it to you for review."
];

const NOTIFICATION_TYPES = {
    CASE_SUBMITTED: 'case_submitted',
    CASE_UPDATED: 'case_updated',
    CASE_RESOLVED: 'case_resolved',
    CASE_FORWARDED: 'case_forwarded',
    CASE_ACCEPTED: 'case_accepted',
    NEW_MESSAGE: 'new_message',
    LEGAL_ADVICE: 'legal_advice',
    SUBSCRIPTION: 'subscription',
    SYSTEM: 'system',
    URGENT: 'urgent'
};

const NOTIFICATION_PRIORITIES = {
    'urgent': 1,
    'case_submitted': 2,
    'case_accepted': 2,
    'new_message': 3,
    'case_forwarded': 3,
    'case_resolved': 3,
    'legal_advice': 4,
    'case_updated': 4,
    'subscription': 5,
    'system': 5
};

const ugandaDistricts = ["Abim", "Adjumani", "Agago", "Alebtong", "Amolatar", "Amudat", "Amuria", "Amuru", "Apac", "Arua", "Arua City", "Budaka", "Bududa", "Bugiri", "Bugweri", "Buhweju", "Buikwe", "Bukedea", "Bukomansimbi", "Bukwo", "Bulambuli", "Buliisa", "Bundibugyo", "Bunyangabu", "Bushenyi", "Busia", "Butaleja", "Butambala", "Butebo", "Buvuma", "Buyende", "Dokolo", "Fort Portal City", "Gomba", "Gulu", "Gulu City", "Hoima", "Hoima City", "Ibanda", "Iganga", "Isingiro", "Jinja", "Jinja City", "Kaabong", "Kabale", "Kabarole", "Kaberamaido", "Kagadi", "Kakumiro", "Kalaki", "Kalangala", "Kaliro", "Kalungu", "Kampala", "Kamuli", "Kamwenge", "Kanungu", "Kapchorwa", "Kapelebyong", "Karenga", "Kasese", "Kassanda", "Katakwi", "Kayunga", "Kazo", "Kibaale", "Kiboga", "Kibuku", "Kikuube", "Kiruhura", "Kiryandongo", "Kisoro", "Kitagwenda", "Kitgum", "Koboko", "Kole", "Kotido", "Kumi", "Kwania", "Kween", "Kyankwanzi", "Kyegegwa", "Kyenjojo", "Kyotera", "Lamwo", "Lira", "Lira City", "Luuka", "Luweero", "Lwengo", "Lyantonde", "Manafwa", "Maracha", "Masaka", "Masaka City", "Masindi", "Mayuge", "Mbale", "Mbale City", "Mbarara", "Mbarara City", "Mitooma", "Mityana", "Moroto", "Moyo", "Mpigi", "Mubende", "Mukono", "Nabilatuk", "Nakapiripirit", "Nakaseke", "Nakasongola", "Namayingo", "Namisindwa", "Namutumba", "Napak", "Nebbi", "Ngora", "Ntoroko", "Ntungamo", "Nwoya", "Obongi", "Omoro", "Otuke", "Oyam", "Pader", "Pakwach", "Pallisa", "Rakai", "Rubanda", "Rubirizi", "Rukiga", "Rukungiri", "Rwampara", "Serere", "Sheema", "Sironko", "Soroti", "Soroti City", "Ssembabule", "Terego", "Tororo", "Wakiso", "Yumbe", "Zombo"];

const ugandaCounties = {"Abim": ["Labwor County"], "Adjumani": ["Adjumani East County", "Adjumani West County"], "Agago": ["Agago County", "Agago North County", "Agago West County"], "Alebtong": ["Ajuri County", "Moroto County"], "Amolatar": ["Kioga County", "Kioga North County"], "Amudat": ["Upe County"], "Amuria": ["Amuria County", "Orungo County"], "Amuru": ["Kilak North County", "Kilak South County"], "Apac": ["Apac Municipality", "Maruzi County", "Maruzi North County"], "Arua": ["Vurra County"], "Arua City": ["Arua Central Division", "Ayivu Division East", "Ayivu Division West"], "Budaka": ["Budaka County", "Iki-Iki County"], "Bududa": ["Bushigai County", "Lutseshe County", "Manjiya County"], "Bugiri": ["Bugiri Municipality", "Bukooli County Central", "Bukooli County North"], "Bugweri": ["Bugweri County"], "Buhweju": ["Buhweju County", "Buhweju West County"], "Buikwe": ["Buikwe County South", "Lugazi Municipality", "Njeru Municipality"], "Bukedea": ["Bukedea County", "Kachumbala County"], "Bukomansimbi": ["Bukomansimbi North County", "Bukomansimbi South County"], "Bukwo": ["Kongasis County", "T'Oo County"], "Bulambuli": ["Bulambuli County", "Elgon County", "Elgon North County"], "Buliisa": ["Buliisa County"], "Bundibugyo": ["Bughendera County", "Bwamba County"], "Bunyangabu": ["Bunyangabu County"], "Bushenyi": ["Bushenyi -Ishaka Municipality", "Igara County East", "Igara County West"], "Busia": ["Busia Municipality", "Samia Bugwe Central County", "Samia Bugwe County North", "Samia Bugwe County South"], "Butaleja": ["Bunyole East County", "Bunyole West County"], "Butambala": ["Butambala County"], "Butebo": ["Butebo County"], "Buvuma": ["Buvuma Islands County"], "Buyende": ["Budiope East County", "Budiope West County"], "Dokolo": ["Dokolo North County", "Dokolo South County"], "Fort Portal City": ["Fort Portal Central Division", "Fort Portal North Division"], "Gomba": ["Gomba East County", "Gomba West County"], "Gulu": ["Aswa County"], "Gulu City": ["Bardege-Layibi Division", "Laroo-Pece Division"], "Hoima": ["Bugahya County", "Kigorobya County"], "Hoima City": ["Hoima East Division", "Hoima West Division"], "Ibanda": ["Ibanda County North", "Ibanda County South", "Ibanda Municipality"], "Iganga": ["Iganga Municipality", "Kigulu County North", "Kigulu County South"], "Isingiro": ["Bukanga County", "Bukanga North County", "Isingiro County North", "Isingiro County South", "Isingiro West County"], "Jinja": ["Butembe County", "Kagoma County", "Kagoma North County"], "Jinja City": ["Jinja North Division", "Jinja South Division East", "Jinja South Division West"], "Kaabong": ["Dodoth East County", "Dodoth North County", "Ik County"], "Kabale": ["Kabale Municipality", "Ndorwa County East", "Ndorwa County West"], "Kabarole": ["Burahya County"], "Kaberamaido": ["Kaberamaido County", "Ochero County"], "Kagadi": ["Buyaga East County", "Buyaga West County"], "Kakumiro": ["Bugangaizi East County", "Bugangaizi South County", "Bugangaizi West County"], "Kalaki": ["Kalaki County"], "Kalangala": ["Bujumba County", "Kyamuswa County"], "Kaliro": ["Bulamogi County", "Bulamogi North West County"], "Kalungu": ["Kalungu East County", "Kalungu West County"], "Kampala": ["Kampala Central Division", "Kawempe Division North", "Kawempe Division South", "Makindye Division East", "Makindye Division West", "Nakawa Division East", "Nakawa Division West", "Rubaga Division North", "Rubaga Division South"], "Kamuli": ["Bugabula County North", "Bugabula County South", "Buzaaya County", "Kamuli Municipality"], "Kamwenge": ["Kibale County", "Kibale East County"], "Kanungu": ["Kinkizi County East", "Kinkizi County West"], "Kapchorwa": ["Kapchorwa Municipality", "Tingey County"], "Kapelebyong": ["Kapelebyong County"], "Karenga": ["Dodoth West County", "Napore West County"], "Kasese": ["Bukonjo County West", "Bukonzo County East", "Busongora County North", "Busongora County South", "Kasese Municipality"], "Kassanda": ["Bukuya County", "Kassanda County North", "Kassanda County South"], "Katakwi": ["Ngariam County", "Toroma County", "Usuk County"], "Kayunga": ["Bbale County", "Ntenjeru County North", "Ntenjeru County South"], "Kazo": ["Kazo County"], "Kibaale": ["Buyanja County", "Buyanja East County"], "Kiboga": ["Kiboga East County", "Kiboga West County"], "Kibuku": ["Kabweri County", "Kibuku County"], "Kikuube": ["Buhaguzi County", "Buhaguzi East County"], "Kiruhura": ["Kashongi County", "Nyabushozi County"], "Kiryandongo": ["Kibanda North County", "Kibanda South County"], "Kisoro": ["Bufumbira County East", "Bufumbira County North", "Bufumbira County South", "Bukimbiri County", "Kisoro Municipality"], "Kitagwenda": ["Kitagwenda County"], "Kitgum": ["Chua East County", "Chua West County", "Kitgum Municipality"], "Koboko": ["Koboko County", "Koboko Municipality", "Koboko North County"], "Kole": ["Kole North County", "Kole South County"], "Kotido": ["Jie County", "Kotido Municipality"], "Kumi": ["Kanyum County", "Kumi County", "Kumi Municipality"], "Kwania": ["Kwania County", "Kwania North County"], "Kween": ["Kween County", "Soi County"], "Kyankwanzi": ["Butemba County", "Ntwetwe County"], "Kyegegwa": ["Kyaka Central County", "Kyaka North County", "Kyaka South County"], "Kyenjojo": ["Mwenge Central County", "Mwenge County North", "Mwenge County South"], "Kyotera": ["Kakuuto County", "Kyotera County"], "Lamwo": ["Lamwo County", "Palabek County"], "Lira": ["Erute County North", "Erute County South"], "Lira City": ["Lira East Division", "Lira West Division"], "Luuka": ["Luuka North County", "Luuka South County"], "Luweero": ["Bamunanika County", "Katikamu County North", "Katikamu County South"], "Lwengo": ["Bukoto County Mid-West", "Bukoto County West", "Bukoto Countysouth"], "Lyantonde": ["Kabula County"], "Manafwa": ["Bubulo County West", "Butiru County"], "Maracha": ["Maracha County", "Maracha East County"], "Masaka": ["Bukoto County Central", "Bukoto County East"], "Masaka City": ["Kimaanya-Kabonera Division", "Nyendo-Mukungwe Division"], "Masindi": ["Bujenje County", "Buruli County", "Masindi Municipality"], "Mayuge": ["Bunya County East", "Bunya County South", "Bunya County West"], "Mbale": ["Bungokho Central County", "Bungokho County North", "Bungokho County South"], "Mbale City": ["Industrial Division", "Northern Division"], "Mbarara": ["Kashari North County", "Kashari South County"], "Mbarara City": ["Mbarara North Division", "Mbarara South Division"], "Mitooma": ["Ruhinda County", "Ruhinda North County", "Ruhinda South County"], "Mityana": ["Busujju County", "Mityana County North", "Mityana County South", "Mityana Municipality"], "Moroto": ["Matheniko County", "Moroto Municipality", "Tepeth County"], "Moyo": ["West Moyo County"], "Mpigi": ["Mawokota County North", "Mawokota County South"], "Mubende": ["Buwekula County", "Buwekula South County", "Kasambya County", "Mubende Municipality"], "Mukono": ["Mukono County North", "Mukono County South", "Mukono Municipality", "Nakifuma County"], "Nabilatuk": ["Pian County"], "Nakapiripirit": ["Chekwii County (Kadam)", "Chekwii East County"], "Nakaseke": ["Nakaseke Central County", "Nakaseke North County", "Nakaseke South County"], "Nakasongola": ["Budyebo County", "Nakasongola County"], "Namayingo": ["Bukooli Island County", "Bukooli South County", "Namayingo South County"], "Namisindwa": ["Bubulo East County", "Namisindwa County"], "Namutumba": ["Bukono County", "Busiki County", "Busiki North County"], "Napak": ["Bokora County", "Bokora East County"], "Nebbi": ["Nebbi Municipality", "Padyere County"], "Ngora": ["Kapir County", "Ngora County"], "Ntoroko": ["Ntoroko County"], "Ntungamo": ["Kajara County", "Ntungamo Municipality", "Ruhaama County", "Ruhaama East County", "Rushenyi County"], "Nwoya": ["Nwoya County", "Nwoya East County"], "Obongi": ["Obongi County"], "Omoro": ["Omoro County", "Tochi County"], "Otuke": ["Otuke County", "Otuke East County"], "Oyam": ["Oyam County North", "Oyam County South"], "Pader": ["Aruu County", "Aruu North County"], "Pakwach": ["Jonam County", "Lower Madi County", "Upper Madi County"], "Pallisa": ["Agule County", "Gogonyo County", "Kibale County", "Pallisa County"], "Rakai": ["Buyamba County", "Kooki County"], "Rubanda": ["Rubanda County East", "Rubanda County West"], "Rubirizi": ["Bunyaruguru County", "Katerera County"], "Rukiga": ["Rukiga County"], "Rukungiri": ["Rubabo County", "Rujumbura County", "Rukungiri Municipality"], "Rwampara": ["Rwampara County", "Rwampara East County"], "Serere": ["Kasilo County", "Pingire County", "Serere County"], "Sheema": ["Sheema County North", "Sheema County South", "Sheema Municipality"], "Sironko": ["Budadiri County East", "Budadiri County West"], "Soroti": ["Dakabela County", "Gweri County", "Soroti County"], "Soroti City": ["Soroti East Division", "Soroti West Division"], "Ssembabule": ["Lwemiyaga County", "Mawogola County", "Mawogola North County", "Mawogola West County"], "Terego": ["Terego East County", "Terego West County"], "Tororo": ["Tororo Municipality", "Tororo North County", "Tororo South County", "West Budama Central County", "West Budama County North", "West Budama County South", "West Budama North East County"], "Wakiso": ["Busiro County East", "Busiro County North", "Busiro County South", "Entebbe Municipality", "Kira Municipality", "Kyadondo County East", "Makindye-Ssabagabo Municipality", "Nansana Municipality"], "Yumbe": ["Aringa County", "Aringa East County", "Aringa North County", "Aringa South County"], "Zombo": ["Okoro County", "Ora County"]};








window.openDesktopFindHelp = function () {
    var old = document.getElementById('desktopFindHelpMenu');
    if (old) {
        old.remove();
        return;
    }

    var menu = document.createElement('div');
    menu.id = 'desktopFindHelpMenu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Find Help');
    menu.style.cssText = [
        'position:fixed',
        'left:232px',
        'top:118px',
        'z-index:10020',
        'width:min(320px,calc(100vw - 256px))',
        'padding:16px',
        'border:1px solid #dce5f3',
        'border-radius:14px',
        'background:#fff',
        'box-shadow:0 16px 42px rgba(15,35,82,.22)'
    ].join(';');

    menu.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">' +
            '<div><strong style="display:block;color:#18224f;font-size:16px;">Find Help</strong>' +
            '<span style="display:block;margin-top:3px;color:#7b8292;font-size:12px;">Choose the support you need.</span></div>' +
            '<button type="button" aria-label="Close Find Help" title="Close" ' +
                'style="width:28px;height:28px;border:0;border-radius:50%;background:#f0f3f9;color:#52617d;font-size:18px;cursor:pointer;">&times;</button>' +
        '</div>' +
        '<div style="display:grid;gap:8px;">' +
            '<button type="button" data-help-section="lawyer" style="padding:11px 12px;border:1px solid #dce5f3;border-radius:9px;background:#f7faff;color:#1a4080;text-align:left;font-weight:700;cursor:pointer;">Find A Lawyer<span style="display:block;margin-top:3px;color:#7b8292;font-size:11px;font-weight:400;">Connect with qualified legal practitioners.</span></button>' +
            '<button type="button" data-help-section="legalAid" style="padding:11px 12px;border:1px solid #dce5f3;border-radius:9px;background:#f7faff;color:#1a4080;text-align:left;font-weight:700;cursor:pointer;">Legal Aid Providers<span style="display:block;margin-top:3px;color:#7b8292;font-size:11px;font-weight:400;">Find free or low-cost legal assistance.</span></button>' +
            '<button type="button" data-help-section="localCouncils" style="padding:11px 12px;border:1px solid #dce5f3;border-radius:9px;background:#f7faff;color:#1a4080;text-align:left;font-weight:700;cursor:pointer;">Local Council Offices<span style="display:block;margin-top:3px;color:#7b8292;font-size:11px;font-weight:400;">Locate local council support offices.</span></button>' +
            '<button type="button" data-help-section="emergency" style="padding:11px 12px;border:1px solid #f3d0d0;border-radius:9px;background:#fff8f8;color:#b42318;text-align:left;font-weight:700;cursor:pointer;">Emergency Support<span style="display:block;margin-top:3px;color:#8f6a6a;font-size:11px;font-weight:400;">View urgent help lines and contacts.</span></button>' +
        '</div>';

    document.body.appendChild(menu);
    menu.querySelector('button[aria-label="Close Find Help"]').onclick = function () {
        menu.remove();
    };
    menu.querySelectorAll('[data-help-section]').forEach(function (button) {
        button.onclick = function () {
            var section = button.getAttribute('data-help-section');
            menu.remove();
            if (typeof openSection === 'function') openSection(section);
        };
    });
    setTimeout(function () {
        document.addEventListener('click', function closeDesktopFindHelp(event) {
            if (!menu.isConnected || menu.contains(event.target)) return;
            menu.remove();
            document.removeEventListener('click', closeDesktopFindHelp);
        });
    }, 0);
};





async function getNotificationsForUser(username, unreadOnly = false) {
    try {
        const token = getAuthToken();
        

        let url = API_ENDPOINTS.userNotifications(username);
        if (unreadOnly) {
            url += '?unreadOnly=true';
        }

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }

       const data = await response.json();
let notifications = [];
if (Array.isArray(data)) {
    notifications = data;
} else if (data && typeof data === 'object') {
    if (Array.isArray(data.notifications)) {
        notifications = data.notifications;
    } else if (Array.isArray(data.data)) {
        notifications = data.data;
    } else {
        notifications = [data];
    }
}
if (Array.isArray(notifications) && notifications.length > 0) {
    notifications.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date || a.createdAt || 0);
        const dateB = new Date(b.timestamp || b.date || b.createdAt || 0);
        return dateB - dateA;
    });
}
return notifications;

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}
async function markNotificationAsRead(notificationId) {
    try {
        const token = getAuthToken();
        

        const response = await fetch(API_ENDPOINTS.markNotificationRead(notificationId), {
            method: 'PUT',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to mark notification as read');
        }

        return await response.json();
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}


async function markAllNotificationsAsRead(username) {
    try {
        const token = getAuthToken();
        

       const response = await fetch(API_ENDPOINTS.markAllNotificationsRead(username), {
            method: 'PUT',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to mark notifications as read');
        }

        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return 0;
    }
}

async function getUnreadCount(username) {
    try {
        const token = getAuthToken();
        if (!token) {
            console.debug('No authentication token found - returning 0');
            return 0;
        }

        const response = await fetch(API_ENDPOINTS.unreadNotifications(username), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.debug('Notifications endpoint not found - returning 0');
                return 0;
            }
            if (response.status === 401) {
                console.debug('Token expired - clearing and returning 0');
                return 0;
            }
            if (response.status === 403) {
                console.debug('Not authorized for this account\'s notifications - returning 0');
                window._lcdjpUnreadForbidden = (window._lcdjpUnreadForbidden || 0) + 1;
                return 0;
            }
            throw new Error('Failed to fetch unread count');
        }
        window._lcdjpUnreadForbidden = 0;

        const data = await response.json();
        if (typeof data.unreadCount === 'number') {
            return data.unreadCount;
        } else if (typeof data.count === 'number') {
            return data.count;
        } else if (Array.isArray(data)) {
            return data.filter(n => !n.read).length;
        }
        return 0;
    } catch (error) {
        console.debug('Error getting unread count:', error.message);
        
        
        
        
        
        
        if (error instanceof TypeError) {
            const networkError = new Error('Notifications server unreachable');
            networkError.isNetworkError = true;
            throw networkError;
        }
        return 0;
    }
}

async function getUrgentNotifications(username) {
    try {
        const token = getAuthToken();
        
        const response = await fetch(API_ENDPOINTS.userNotifications(username), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            console.warn('Notifications endpoint returned:', response.status);
            return [];
        }

        const data = await response.json();
        let notifications = [];
        if (Array.isArray(data)) {
            notifications = data;
        } else if (data && typeof data === 'object') {
            if (Array.isArray(data.notifications)) {
                notifications = data.notifications;
            } else if (Array.isArray(data.data)) {
                notifications = data.data;
            }
        }
        
        return notifications.filter(n => n.type === 'urgent' || n.priority === 'high');
    } catch (error) {
        console.error('Error fetching urgent notifications:', error);
        return [];
    }
}











function lcdjpOpenNotification(notif) {
    if (!notif) return;

    const notifId = notif.id || notif._id || notif.notificationId;
    if (notifId && typeof markNotificationAsRead === 'function') {
        markNotificationAsRead(notifId).catch(() => {});
    }

    const type = notif.type || '';
    
    
    
    
    
    
    const caseId = typeof getNotificationCaseReference === 'function'
        ? getNotificationCaseReference(notif)
        : (notif.caseId || notif.case_id || notif.caseReference || null);

    const messageTypes = ['new_message', 'lawyer_message', 'lc_message', 'citizen_message', 'chat_reply', 'voice_message'];
    const isMessage = messageTypes.indexOf(type) !== -1;
    const userLevel = sessionStorage.getItem('lcdjp_userlevel');

    if (!caseId) {
        
        
        if (typeof refreshAdminNotificationPage === 'function') refreshAdminNotificationPage();
        else if (typeof refreshLawyerNotificationPage === 'function') refreshLawyerNotificationPage();
        else if (typeof loadCitizenNotifications === 'function') loadCitizenNotifications().catch(() => {});
        else if (typeof daLoadNotifications === 'function') daLoadNotifications();
        return;
    }

    
    
    
    
    
    
    if (isMessage && typeof openCitizenMessaging === 'function') {
        if (typeof toggleNotifications === 'function') toggleNotifications();
        setTimeout(() => openCitizenMessaging(caseId), 150);
        return;
    }

    if (typeof viewCase === 'function') {
        viewCase(caseId);
        return;
    }

    if (userLevel === 'Citizen' && typeof viewCitizenCase === 'function') {
        viewCitizenCase(caseId);
    }
}
window.lcdjpOpenNotification = lcdjpOpenNotification;

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioContext.close();
        }, 200);
    } catch (e) {
    }
}

function showNotificationWithSound(message, type) {
    if (Notification.permission === 'granted') {
        const icon = getNotificationIcon(type);
        new Notification(' JusticeLink Notification', {
            body: message,
            icon: icon || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231a4080"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
            tag: type || 'notification',
            requireInteraction: false,
            silent: false
        });
    }
}

function getNotificationIcon(type) {
    const icons = {
        'case_submitted': '',
        'case_accepted': '',
        'case_resolved': '',
        'case_forwarded': '',
        'new_message': '',
        'legal_advice': '',
        'urgent': '',
        'subscription': '',
        'system': ''
    };
    return icons[type] || '';
}


async function getUserByUsername(username) {
    if (!username || username === 'null' || username === 'undefined' || username === 'unknown') {
        return null;
    }
    
    try {
        
        if (window._lcdjpUserCache && window._lcdjpUserCache[username]) {
            return window._lcdjpUserCache[username];
        }
        
        const response = await fetch(API_ENDPOINTS.user(username), {
        });
        
        if (response.status === 404) {
            console.warn('User not found in database:', username);
            
            if (!window._lcdjpUserCache) {
                window._lcdjpUserCache = {};
            }
            window._lcdjpUserCache[username] = null;
            return null;
        }
        
        if (response.status === 401) {
            console.warn('Session expired');
            return null;
        }
        
        if (!response.ok) {
            throw new Error('Failed to fetch user');
        }
        
        const data = await response.json();
        const user = data.user || data;
        
        if (!window._lcdjpUserCache) {
            window._lcdjpUserCache = {};
        }
        window._lcdjpUserCache[username] = user;
        
        return user;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}





async function createEnhancedNotification(username, message, type, caseId = null, link = null) {
    try {
        const notificationId = generateNotificationId();
        const timestamp = new Date().toISOString();

        
        
        
        const _cenAuthHeaders = getAuthHeaders();

        try {
            const response = await fetch(API_ENDPOINTS.userNotifications(username) + '?unreadOnly=true', {
                headers: _cenAuthHeaders
            });
            
            if (response.ok) {
                const _cenRaw = await response.json();

                
                
                
                let existingNotifications = [];
                if (Array.isArray(_cenRaw)) {
                    existingNotifications = _cenRaw;
                } else if (_cenRaw && typeof _cenRaw === 'object') {
                    if (Array.isArray(_cenRaw.notifications)) {
                        existingNotifications = _cenRaw.notifications;
                    } else if (Array.isArray(_cenRaw.data)) {
                        existingNotifications = _cenRaw.data;
                    }
                }

                const isDuplicate = existingNotifications.some(n => 
                    n.message === message && 
                    n.caseId === caseId &&
                    n.type === type &&
                    !n.read
                );
                
                if (isDuplicate) return null;
            }
        } catch (dupError) {
            console.warn('Could not check duplicates:', dupError);
        }
        
        const notificationData = {
            username: username,
            message: message,
            caseId: caseId,
            link: link,
            type: type || 'system',
            priority: NOTIFICATION_PRIORITIES?.[type] || 5,
            timestamp: timestamp,
            read: false,
            delivered: false,
            soundPlayed: false
        };

        const response = await fetch(API_ENDPOINTS.notifications, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(notificationData)
        });

        if (!response.ok) {
            throw new Error('Failed to save notification');
        }

        if (typeof playNotificationSound === 'function') {
            playNotificationSound();
        }

        if (Notification.permission === 'granted') {
            if (typeof showNotificationWithSound === 'function') {
                showNotificationWithSound(message, type);
            }
        }

        return notificationId;

    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}


