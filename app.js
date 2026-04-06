// ===== GPRN Core Application Logic =====

// ---- HTML Sanitizer (XSS prevention) ----
function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ---- API Client ----
const API = {
    baseUrl: '',

    getToken() {
        var session = localStorage.getItem('gprn_session');
        if (session) {
            try { return JSON.parse(session).token; } catch(e) {}
        }
        return null;
    },

    async request(method, path, body) {
        var headers = { 'Content-Type': 'application/json' };
        var token = this.getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;

        try {
            var opts = { method: method, headers: headers };
            if (body && method !== 'GET') opts.body = JSON.stringify(body);
            var response = await fetch(this.baseUrl + path, opts);
            var data = await response.json();
            if (!response.ok) {
                return { error: data.error || 'Request failed', status: response.status };
            }
            return data;
        } catch (err) {
            console.error('API request failed:', err.message);
            return { error: 'Network error' };
        }
    },

    async get(path) { return this.request('GET', path); },
    async post(path, body) { return this.request('POST', path, body); },
    async put(path, body) { return this.request('PUT', path, body); },
    async del(path) { return this.request('DELETE', path); },

    // Background sync — fire and forget
    syncData(data) {
        var token = this.getToken();
        if (!token) return;
        fetch(this.baseUrl + '/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(data)
        }).catch(function() {}); // Silent fail for background sync
    },

    // Upload file
    async uploadFile(file, type) {
        var token = this.getToken();
        var formData = new FormData();
        formData.append('document', file);
        formData.append('type', type || 'general');

        try {
            var response = await fetch(this.baseUrl + '/api/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            return await response.json();
        } catch (err) {
            return { error: 'Upload failed' };
        }
    }
};

// ---- Auth Manager ----
const Auth = {
    login(email, password, expectedRole) {
        // Try API login first (synchronous wrapper for backwards compatibility)
        var session = null;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/auth/login', false); // synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        try {
            xhr.send(JSON.stringify({ email: email, password: password, role: expectedRole }));
            if (xhr.status === 200) {
                var result = JSON.parse(xhr.responseText);
                if (result.session) {
                    session = result.session;
                    localStorage.setItem('gprn_session', JSON.stringify(session));
                    // Fetch full data from backend
                    var dataXhr = new XMLHttpRequest();
                    dataXhr.open('GET', '/api/data', false);
                    dataXhr.setRequestHeader('Authorization', 'Bearer ' + session.token);
                    dataXhr.send();
                    if (dataXhr.status === 200) {
                        var data = JSON.parse(dataXhr.responseText);
                        localStorage.setItem('gprn_data', JSON.stringify(data));
                    }
                    return session;
                }
            } else if (xhr.status === 401) {
                var err = JSON.parse(xhr.responseText);
                if (err.error === 'wrong_role') return { error: 'wrong_role', actualRole: err.actualRole };
                return null;
            }
        } catch (e) {
            // API unavailable, fall back to mock data login
            console.log('API unavailable, using offline mode');
        }

        // Fallback: mock data login (offline mode)
        if (!session) {
            var data = getMockData();
            var allUsers = [].concat(data.locums, data.practices);
            var user = allUsers.find(function(u) { return u.email === email && u.password === password; });
            if (user) {
                if (expectedRole && user.role !== expectedRole) {
                    return { error: 'wrong_role', actualRole: user.role };
                }
                session = {
                    id: user.id,
                    role: user.role,
                    email: user.email,
                    name: user.role === 'locum'
                        ? user.title + ' ' + user.firstName + ' ' + user.lastName
                        : user.practiceName,
                    firstName: user.role === 'locum' ? user.firstName : user.contactName.split(' ')[0]
                };
                localStorage.setItem('gprn_session', JSON.stringify(session));
                OnlineStatus.setOnline(session.id);
                return session;
            }
            return null;
        }
        return session;
    },

    logout() {
        // Update last seen before logging out
        const sess = Auth.getSession();
        if (sess && sess.id) {
            OnlineStatus.setOffline(sess.id);
        }
        localStorage.removeItem('gprn_session');
        window.location.href = 'login.html';
    },

    getSession() {
        const s = localStorage.getItem('gprn_session');
        return s ? JSON.parse(s) : null;
    },

    isLoggedIn() {
        return !!this.getSession();
    },

    getRole() {
        const s = this.getSession();
        return s ? s.role : null;
    },

    getCurrentUser() {
        const session = this.getSession();
        if (!session) return null;
        const data = getMockData();
        if (session.role === 'locum') {
            return data.locums.find(l => l.id === session.id);
        } else {
            return data.practices.find(p => p.id === session.id);
        }
    },

    requireAuth(allowedRole) {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        if (allowedRole && this.getRole() !== allowedRole) {
            window.location.href = this.getRole() === 'locum' ? 'locum-dashboard.html' : 'practice-dashboard.html';
            return false;
        }
        return true;
    }
};

// ---- Password Reset (Simulated) ----
const PasswordReset = {
    request(email) {
        const data = getMockData();
        const allUsers = [...data.locums, ...data.practices];
        const user = allUsers.find(u => u.email === email);
        if (!user) return { error: 'not_found' };
        var token = 'reset-' + Date.now();
        if (!data.resetTokens) data.resetTokens = [];
        data.resetTokens.push({ email: email, token: token, created: new Date().toISOString(), used: false });
        EmailManager.send(user.id, 'Password Reset',
            'A password reset link has been sent to your email. Use token: ' + token + ' to reset your password. This link expires in 1 hour.', 'password_reset');
        saveMockData(data);
        return { success: true, message: 'Reset link sent to ' + email };
    },

    reset(token, newPassword) {
        const data = getMockData();
        if (!data.resetTokens) return { error: 'invalid_token' };
        const resetEntry = data.resetTokens.find(function(r) { return r.token === token && !r.used; });
        if (!resetEntry) return { error: 'invalid_token' };
        if (new Date() - new Date(resetEntry.created) > 3600000) return { error: 'expired' };
        const allUsers = [...data.locums, ...data.practices];
        const user = allUsers.find(function(u) { return u.email === resetEntry.email; });
        if (!user) return { error: 'not_found' };
        user.password = newPassword;
        resetEntry.used = true;
        if (user.role === 'locum') {
            var idx = data.locums.findIndex(function(l) { return l.id === user.id; });
            if (idx >= 0) data.locums[idx] = user;
        } else {
            var idx2 = data.practices.findIndex(function(p) { return p.id === user.id; });
            if (idx2 >= 0) data.practices[idx2] = user;
        }
        saveMockData(data);
        return { success: true };
    }
};

// ---- Date Utilities ----
const DateUtils = {
    format(dateStr, style = 'medium') {
        const d = new Date(dateStr);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        switch (style) {
            case 'full':
                return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            case 'medium':
                return `${daysShort[d.getDay()]} ${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
            case 'short':
                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            case 'iso':
                return d.toISOString().split('T')[0];
            case 'day':
                return days[d.getDay()];
            case 'dayshort':
                return daysShort[d.getDay()];
            default:
                return d.toLocaleDateString();
        }
    },

    relative(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = d - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
        if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
        return this.format(dateStr, 'medium');
    },

    isToday(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    },

    isFuture(dateStr) {
        return new Date(dateStr) > new Date();
    },

    isPast(dateStr) {
        return new Date(dateStr) < new Date();
    },

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    },

    getFirstDayOfMonth(year, month) {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Monday = 0
    },

    toISO(date) {
        return date.toISOString().split('T')[0];
    },

    timeAgo(dateStr) {
        const now = new Date();
        const d = new Date(dateStr);
        const seconds = Math.floor((now - d) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm ago';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ago';
        const days = Math.floor(hours / 24);
        if (days < 7) return days + 'd ago';
        return this.format(dateStr, 'short');
    }
};

// ---- Form Validator ----
const FormValidator = {
    validate(form) {
        let valid = true;
        const fields = form.querySelectorAll('[required], [data-validate]');
        fields.forEach(field => {
            const error = this.validateField(field);
            const errorEl = field.parentElement.querySelector('.form-error');
            if (error) {
                valid = false;
                field.classList.add('error');
                if (errorEl) errorEl.textContent = error;
            } else {
                field.classList.remove('error');
                if (errorEl) errorEl.textContent = '';
            }
        });
        return valid;
    },

    validateField(field) {
        const value = field.value.trim();
        const type = field.dataset.validate || field.type;

        if (field.required && !value) return 'This field is required';

        if (value) {
            switch (type) {
                case 'email':
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email';
                    break;
                case 'tel':
                    if (!/^[\d\s+()-]{10,}$/.test(value)) return 'Please enter a valid phone number';
                    break;
                case 'gmc':
                    if (!/^\d{7}$/.test(value)) return 'GMC number must be 7 digits';
                    if (value.charAt(0) === '0') return 'GMC number cannot start with 0';
                    break;
                case 'password':
                    if (value.length < 6) return 'Password must be at least 6 characters';
                    break;
                case 'password-confirm':
                    const pw = field.form.querySelector('[data-validate="password"]');
                    if (pw && value !== pw.value) return 'Passwords do not match';
                    break;
            }
        }
        return null;
    }
};

// ---- Notification/Toast Manager ----
const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'success', duration = 3000) {
        this.init();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${sanitizeHTML(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        this.container.appendChild(toast);
        setTimeout(() => toast.classList.add('toast-visible'), 10);
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// ---- Modal Manager ----
const Modal = {
    show(config) {
        // Prevent stacking: close any existing modal first
        const existing = document.querySelector('.modal-overlay');
        if (existing) this.close(existing);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal modal-${config.size || 'medium'}">
                <div class="modal-header">
                    <h3>${config.title}</h3>
                    <button class="modal-close" data-modal-close>&times;</button>
                </div>
                <div class="modal-body">${config.body}</div>
                ${config.footer ? `<div class="modal-footer">${config.footer}</div>` : ''}
            </div>
        `;

        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('modal-visible'), 10);

        overlay.querySelector('[data-modal-close]').addEventListener('click', () => this.close(overlay));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close(overlay);
        });

        // Close on Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close(overlay);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        if (config.onOpen) config.onOpen(overlay);
        return overlay;
    },

    close(overlay) {
        if (!overlay) overlay = document.querySelector('.modal-overlay');
        if (overlay) {
            overlay.classList.remove('modal-visible');
            setTimeout(() => overlay.remove(), 300);
        }
    }
};

// ---- Greeting helper ----
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ---- Currency format ----
function formatCurrency(amount) {
    return '£ ' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ---- Resolve effective rates for a locum given a practice context ----
// Priority: practiceRates[practiceId] > regionRates[practice.healthBoard] > rates (default)
// Returns { rates, source } where source is 'practice', 'region', or 'default', or null if no rates set
function getEffectiveRates(locum, practiceId) {
    if (!locum || !locum.rates) return null;
    // 1. Practice-specific rate
    if (practiceId && locum.practiceRates && locum.practiceRates[practiceId]) {
        var pr = locum.practiceRates[practiceId];
        if (pr.am || pr.pm || pr.fullDay) return { rates: pr, source: 'practice' };
    }
    // 2. Region rate based on practice's health board
    if (practiceId && locum.regionRates) {
        var data = getMockData();
        var practice = data.practices.find(function(p) { return p.id === practiceId; });
        if (practice && practice.healthBoard && locum.regionRates[practice.healthBoard]) {
            var rr = locum.regionRates[practice.healthBoard];
            if (rr.am || rr.pm || rr.fullDay) return { rates: rr, source: 'region' };
        }
    }
    // 3. Default rates
    if (locum.rates.am || locum.rates.pm || locum.rates.fullDay) {
        return { rates: locum.rates, source: 'default' };
    }
    return null;
}

// ---- Initials from name ----
function getInitials(name) {
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().substring(0, 2);
}

// ---- Badge color by status ----
function getStatusBadge(status) {
    const map = {
        // Offer statuses (new model: practice→locum)
        sent: 'badge-info',
        viewed: 'badge-warning',
        negotiating: 'badge-warning',
        accepted: 'badge-success',
        confirmed: 'badge-success',
        completed: 'badge-info',
        declined: 'badge-danger',
        withdrawn: 'badge-neutral',
        expired: 'badge-neutral',
        cancelled: 'badge-danger',
        no_show: 'badge-danger',
        // Session need statuses
        open: 'badge-success',
        filled: 'badge-info',
        // Invoice statuses
        paid: 'badge-success',
        pending: 'badge-warning',
        overdue: 'badge-danger',
        disputed: 'badge-info',
        // Legacy
        rejected_by_locum: 'badge-danger'
    };
    return map[status] || 'badge-neutral';
}

// ---- Status display labels ----
function getStatusLabel(status) {
    const labels = {
        sent: 'Sent',
        viewed: 'Viewed',
        negotiating: 'Negotiating',
        accepted: 'Accepted',
        confirmed: 'Confirmed',
        completed: 'Completed',
        declined: 'Declined',
        withdrawn: 'Withdrawn',
        expired: 'Expired',
        cancelled: 'Cancelled',
        no_show: 'No Show',
        open: 'Open',
        filled: 'Filled',
        paid: 'Paid',
        pending: 'Pending',
        overdue: 'Overdue',
        disputed: 'Disputed'
    };
    return labels[status] || status;
}

// ---- Booking Manager (Practice-approaches-Locum model) ----
const Booking = {

    // Practice creates an internal session need (not publicly visible)
    createSessionNeed(needData) {
        const data = getMockData(); // For profile lookup
        const session = Auth.getSession();
        if (!session || session.role !== 'practice') return { error: 'not_authorized', message: 'Only practices can create session needs' };
        const practice = data.practices.find(p => p.id === session.id);
        if (!practice) return { error: 'not_found', message: 'Practice not found' };
        const need = {
            id: 'need-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            practiceId: session.id,
            practiceName: practice.practiceName,
            healthBoard: practice.healthBoard,
            date: needData.date,
            sessionType: needData.sessionType,
            startTime: needData.startTime || (needData.sessionType === 'PM' ? '14:00' : '08:00'),
            endTime: needData.endTime || (needData.sessionType === 'AM' ? '13:00' : '18:30'),
            budgetRate: needData.budgetRate || null,
            notes: needData.notes || '',
            housecalls: needData.housecalls || false,
            status: 'open',
            createdDate: DateUtils.toISO(new Date()),
            offersCount: 0
        };
        DB.SessionNeeds.insert(need);
        return { success: true, sessionNeed: need };
    },

    // Practice sends an offer to a specific locum
    sendOffer(sessionNeedId, locumId, proposedRate, message) {
        const data = getMockData(); // For profile lookups
        const session = Auth.getSession();
        if (!session || session.role !== 'practice') return { error: 'not_authorized', message: 'Only practices can send offers' };
        const practice = data.practices.find(p => p.id === session.id);
        if (!practice) return { error: 'not_found', message: 'Practice not found' };
        const locum = data.locums.find(l => l.id === locumId);
        if (!locum) return { error: 'locum_not_found', message: 'Locum not found' };
        if (BarredList.isBarred(session.id, locumId)) {
            return { error: 'barred', message: 'This locum is on your blocked list' };
        }
        const need = DB.SessionNeeds.getById(sessionNeedId);
        if (!need) return { error: 'need_not_found', message: 'Session need not found' };
        if (need.status !== 'open') return { error: 'need_filled', message: 'This session has already been filled' };
        // Duplicate offer check
        const needOffers = DB.Offers.getForSessionNeed(sessionNeedId);
        const existingOffer = needOffers.find(o =>
            o.locumId === locumId && !['declined', 'withdrawn', 'expired', 'cancelled'].includes(o.status)
        );
        if (existingOffer) return { error: 'already_sent', message: 'You already have an active offer to this locum for this session' };
        if (this.isDoubleBooked(locumId, need.date, null, need.sessionType)) {
            return { error: 'double_booked', message: 'This locum already has a confirmed booking for this date/session' };
        }
        const locumRates = locum.rates || {};
        let locumPublishedRate = 0;
        if (need.sessionType === 'AM') locumPublishedRate = locumRates.am || 0;
        else if (need.sessionType === 'PM') locumPublishedRate = locumRates.pm || 0;
        else locumPublishedRate = locumRates.fullDay || 0;

        const newOffer = {
            id: 'offer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            sessionNeedId: need.id,
            locumId: locumId,
            practiceId: session.id,
            practiceName: practice.practiceName,
            healthBoard: practice.healthBoard,
            sessionDate: need.date,
            startTime: need.startTime,
            endTime: need.endTime,
            sessionType: need.sessionType,
            proposedRate: proposedRate || locumPublishedRate,
            locumPublishedRate: locumPublishedRate,
            agreedRate: null,
            housecalls: need.housecalls,
            housecallRate: locumRates.housecall || 0,
            status: 'sent',
            initiatedBy: 'practice',
            sentDate: DateUtils.toISO(new Date()),
            viewedDate: null,
            expiresAt: DateUtils.toISO(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
            practiceMessage: message || '',
            negotiations: []
        };
        DB.Offers.insert(newOffer);
        DB.SessionNeeds.update(sessionNeedId, { offersCount: (need.offersCount || 0) + 1 });
        this.addNotification(locumId, 'new_offer', 'New Invitation',
            `${practice.practiceName} has invited you to work on ${DateUtils.format(need.date, 'medium')} (${need.sessionType}).`);
        EmailManager.send(locumId, 'New Session Invitation',
            `${practice.practiceName} has sent you an invitation for a ${need.sessionType} session on ${DateUtils.format(need.date, 'medium')}. Please review in your invitations.`, 'new_offer');
        return { success: true, offer: newOffer };
    },

    // Auto-mark offer as viewed when locum opens it
    viewOffer(offerId) {
        const offer = DB.Offers.getById(offerId);
        if (!offer) return false;
        if (offer.status === 'sent') {
            DB.Offers.update(offerId, { status: 'viewed', viewedDate: DateUtils.toISO(new Date()) });
            this.addNotification(offer.practiceId, 'offer_viewed', 'Invitation Viewed',
                `The locum has viewed your invitation for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
        }
        return true;
    },

    // Locum responds to an offer: accept, decline, or counter
    respondToOffer(offerId, response, counterRate, message) {
        const offer = DB.Offers.getById(offerId);
        if (!offer) return { error: 'not_found', message: 'Offer not found' };
        if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
            DB.Offers.update(offerId, { status: 'expired' });
            return { error: 'expired', message: 'This offer has expired and can no longer be acted on.' };
        }
        if (!['sent', 'viewed', 'negotiating'].includes(offer.status)) {
            return { error: 'invalid_status', message: 'This offer can no longer be responded to' };
        }

        if (response === 'accept') {
            const sessionDate = offer.sessionDate || offer.shiftDate;
            if (sessionDate && this.isDoubleBooked(offer.locumId, sessionDate, offer.id, offer.sessionType)) {
                return { error: 'double_booked', message: 'You already have a confirmed booking for this date and session type.' };
            }
            const agreedRate = offer.agreedRate || offer.proposedRate;
            const negotiations = offer.negotiations || [];
            negotiations.push({ from: 'locum', accepted: true, rate: agreedRate, message: message || 'Accepted', date: new Date().toISOString() });
            DB.Offers.update(offerId, { agreedRate: agreedRate, status: 'accepted', acceptedDate: DateUtils.toISO(new Date()), negotiations: negotiations });
            DB.SessionNeeds.update(offer.sessionNeedId, { status: 'filled' });
            // Auto-withdraw other offers for same session need
            const otherOffers = DB.Offers.getForSessionNeed(offer.sessionNeedId);
            otherOffers.filter(o => o.id !== offerId && ['sent', 'viewed', 'negotiating'].includes(o.status))
                .forEach(o => {
                    DB.Offers.update(o.id, { status: 'withdrawn', autoWithdrawn: true, withdrawnDate: DateUtils.toISO(new Date()) });
                    this.addNotification(o.locumId, 'offer_withdrawn', 'Invitation Withdrawn',
                        `The invitation from ${offer.practiceName} for ${DateUtils.format(o.sessionDate, 'medium')} has been filled by another locum.`);
                });
            this.addNotification(offer.practiceId, 'offer_accepted', 'Invitation Accepted',
                `A locum has accepted your invitation for ${DateUtils.format(offer.sessionDate, 'medium')} (${offer.sessionType}).`);
            EmailManager.send(offer.practiceId, 'Invitation Accepted',
                `A locum has accepted your session invitation for ${DateUtils.format(offer.sessionDate, 'medium')}. Please confirm in your dashboard.`, 'offer_accepted');
            return { success: true, status: 'accepted' };

        } else if (response === 'decline') {
            const negotiations = offer.negotiations || [];
            negotiations.push({ from: 'locum', declined: true, message: message || 'Declined', date: new Date().toISOString() });
            DB.Offers.update(offerId, { status: 'declined', declinedDate: DateUtils.toISO(new Date()), negotiations: negotiations });
            const need = DB.SessionNeeds.getById(offer.sessionNeedId);
            if (need && need.offersCount > 0) DB.SessionNeeds.update(offer.sessionNeedId, { offersCount: need.offersCount - 1 });
            this.addNotification(offer.practiceId, 'offer_declined', 'Invitation Declined',
                `A locum has declined your invitation for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            EmailManager.send(offer.practiceId, 'Invitation Declined',
                `A locum has declined your session invitation for ${DateUtils.format(offer.sessionDate, 'medium')}.`, 'offer_declined');
            return { success: true, status: 'declined' };

        } else if (response === 'counter') {
            if (!counterRate) return { error: 'missing_rate', message: 'Please provide a counter rate' };
            if (counterRate <= 0 || counterRate > 50000 || isNaN(counterRate)) {
                return { error: 'invalid_rate', message: 'Please enter a valid rate between £1 and £50,000.' };
            }
            const negotiations = offer.negotiations || [];
            negotiations.push({ from: 'locum', rate: counterRate, message: message || '', date: new Date().toISOString() });
            DB.Offers.update(offerId, { status: 'negotiating', proposedRate: counterRate, negotiations: negotiations });
            this.addNotification(offer.practiceId, 'counter_offer', 'Rate Counter-Offer',
                `A locum has proposed a rate of ${formatCurrency(counterRate)} for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            EmailManager.send(offer.practiceId, 'Rate Counter-Offer',
                `A locum has proposed a different rate for your ${offer.sessionType} session on ${DateUtils.format(offer.sessionDate, 'medium')}. Please review.`, 'counter_offer');
            return { success: true, status: 'negotiating' };
        }
        return { error: 'invalid_response', message: 'Invalid response type' };
    },

    // Practice responds during negotiation: accept locum's counter, counter again, or withdraw
    practiceRespondToNegotiation(offerId, response, counterRate, message) {
        const offer = DB.Offers.getById(offerId);
        if (!offer) return { error: 'not_found', message: 'Offer not found' };
        if (offer.status !== 'negotiating') return { error: 'invalid_status', message: 'Offer is not in negotiation' };

        if (response === 'accept') {
            const agreedRate = offer.proposedRate;
            const negotiations = offer.negotiations || [];
            negotiations.push({ from: 'practice', accepted: true, rate: agreedRate, message: message || 'Rate accepted', date: new Date().toISOString() });
            DB.Offers.update(offerId, { agreedRate: agreedRate, status: 'accepted', acceptedDate: DateUtils.toISO(new Date()), negotiations: negotiations });
            DB.SessionNeeds.update(offer.sessionNeedId, { status: 'filled' });
            const otherOffers = DB.Offers.getForSessionNeed(offer.sessionNeedId);
            otherOffers.filter(o => o.id !== offerId && ['sent', 'viewed', 'negotiating'].includes(o.status))
                .forEach(o => {
                    DB.Offers.update(o.id, { status: 'withdrawn', autoWithdrawn: true, withdrawnDate: DateUtils.toISO(new Date()) });
                    this.addNotification(o.locumId, 'offer_withdrawn', 'Invitation Withdrawn',
                        `The invitation from ${offer.practiceName} for ${DateUtils.format(o.sessionDate, 'medium')} has been filled by another locum.`);
                });
            this.addNotification(offer.locumId, 'rate_agreed', 'Rate Agreed',
                `${offer.practiceName} has accepted your proposed rate of ${formatCurrency(agreedRate)} for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            EmailManager.send(offer.locumId, 'Rate Agreed',
                `${offer.practiceName} has agreed to your rate for the session on ${DateUtils.format(offer.sessionDate, 'medium')}.`, 'rate_agreed');
            return { success: true, status: 'accepted' };

        } else if (response === 'counter') {
            if (!counterRate) return { error: 'missing_rate', message: 'Please provide a counter rate' };
            if (counterRate <= 0 || counterRate > 50000 || isNaN(counterRate)) {
                return { error: 'invalid_rate', message: 'Please enter a valid rate between £1 and £50,000.' };
            }
            const negotiations = offer.negotiations || [];
            negotiations.push({ from: 'practice', rate: counterRate, message: message || '', date: new Date().toISOString() });
            DB.Offers.update(offerId, { proposedRate: counterRate, negotiations: negotiations });
            this.addNotification(offer.locumId, 'counter_offer', 'Rate Counter-Offer',
                `${offer.practiceName} has proposed a rate of ${formatCurrency(counterRate)} for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            EmailManager.send(offer.locumId, 'Rate Counter-Offer',
                `${offer.practiceName} has proposed a different rate for the session on ${DateUtils.format(offer.sessionDate, 'medium')}. Please review.`, 'counter_offer');
            return { success: true, status: 'negotiating' };

        } else if (response === 'withdraw') {
            return this.withdrawOffer(offerId);
        }
        return { error: 'invalid_response', message: 'Invalid response type' };
    },

    withdrawOffer(offerId) {
        const offer = DB.Offers.getById(offerId);
        if (!offer) return { error: 'not_found', message: 'Offer not found' };
        if (!['sent', 'viewed', 'negotiating'].includes(offer.status)) {
            return { error: 'cannot_withdraw', message: 'This offer can no longer be withdrawn' };
        }
        DB.Offers.update(offerId, { status: 'withdrawn', withdrawnDate: DateUtils.toISO(new Date()) });
        const need = DB.SessionNeeds.getById(offer.sessionNeedId);
        if (need && need.offersCount > 0) DB.SessionNeeds.update(offer.sessionNeedId, { offersCount: need.offersCount - 1 });
        this.addNotification(offer.locumId, 'offer_withdrawn', 'Invitation Withdrawn',
            `${offer.practiceName} has withdrawn the invitation for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
        return { success: true };
    },

    confirmBooking(offerId) {
        const offer = DB.Offers.getById(offerId);
        if (!offer || offer.status !== 'accepted') return false;
        DB.Offers.update(offerId, { status: 'confirmed', confirmedDate: DateUtils.toISO(new Date()) });
        this.addNotification(offer.locumId, 'booking_confirmed', 'Booking Confirmed',
            `${offer.practiceName} has confirmed your booking for ${DateUtils.format(offer.sessionDate, 'medium')} (${offer.sessionType}).`);
        EmailManager.send(offer.locumId, 'Booking Confirmed',
            `Your booking at ${offer.practiceName} on ${DateUtils.format(offer.sessionDate, 'medium')} has been confirmed.`, 'booking_confirmed');
        return true;
    },

    // Mark session as complete (either party)
    markComplete(offerId, attended = true, completedBy = 'practice') {
        const offer = DB.Offers.getById(offerId);
        if (!offer) return false;
        if (!['accepted', 'confirmed'].includes(offer.status)) return false;
        if (attended) {
            DB.Offers.update(offerId, { status: 'completed', completedDate: DateUtils.toISO(new Date()), completedBy: completedBy });
            InvoiceManager.generateFromOffer(offer);
            this.addNotification(offer.locumId, 'leave_feedback', 'Rate This Practice',
                `Your session at ${offer.practiceName} is complete. Please leave a rating.`);
            this.addNotification(offer.practiceId, 'leave_feedback', 'Shift Completed',
                `The shift on ${DateUtils.format(offer.sessionDate, 'medium')} is complete. Report any issues if applicable.`);
        } else {
            DB.Offers.update(offerId, { status: 'no_show', noShowDate: DateUtils.toISO(new Date()) });
            this.applyReliabilityPenalty(offer.locumId, 10);
            this.addNotification(offer.locumId, 'no_show', 'No Show Recorded',
                `A no show was recorded at ${offer.practiceName} on ${DateUtils.format(offer.sessionDate, 'full')}. Your reliability score has been reduced by 10 points.`);
        }
        return true;
    },

    cancelBooking(offerId, cancelledBy) {
        const offer = DB.Offers.getById(offerId);
        if (!offer) return false;
        if (['cancelled', 'declined', 'withdrawn', 'expired'].includes(offer.status)) {
            return { error: 'already_cancelled', message: 'This booking has already been cancelled.' };
        }
        if (!['accepted', 'confirmed'].includes(offer.status)) return false;
        const daysBefore = Math.ceil((new Date(offer.sessionDate) - new Date()) / (1000 * 60 * 60 * 24));
        const lateCancellation = daysBefore < 2;
        DB.Offers.update(offerId, { status: 'cancelled', cancelledBy: cancelledBy, cancelledDate: DateUtils.toISO(new Date()), lateCancellation: lateCancellation });
        DB.SessionNeeds.update(offer.sessionNeedId, { status: 'open' });
        if (cancelledBy === 'locum' && lateCancellation) {
            this.applyReliabilityPenalty(offer.locumId, 5);
            this.addNotification(offer.locumId, 'late_cancellation', 'Late Cancellation Penalty',
                `Your cancellation at ${offer.practiceName} on ${DateUtils.format(offer.sessionDate, 'full')} was within 48 hours. Your reliability score has been reduced by 5 points.`);
        }
        const notifyId = cancelledBy === 'locum' ? offer.practiceId : offer.locumId;
        this.addNotification(notifyId, 'cancellation', 'Booking Cancelled',
            `The booking on ${DateUtils.format(offer.sessionDate, 'medium')} at ${offer.practiceName} has been cancelled.`);
        return true;
    },

    expireOffers() {
        const allOffers = DB.Offers.getAll();
        const now = new Date();
        let expired = 0;
        allOffers.filter(o => ['sent', 'viewed'].includes(o.status) && o.expiresAt && new Date(o.expiresAt) < now)
            .forEach(o => {
                DB.Offers.update(o.id, { status: 'expired', expiredDate: DateUtils.toISO(now) });
                const need = DB.SessionNeeds.getById(o.sessionNeedId);
                if (need && need.offersCount > 0) DB.SessionNeeds.update(o.sessionNeedId, { offersCount: need.offersCount - 1 });
                this.addNotification(o.practiceId, 'offer_expired', 'Invitation Expired',
                    `Your invitation for ${DateUtils.format(o.sessionDate, 'medium')} has expired without a response.`);
                expired++;
            });
        return expired;
    },

    isDoubleBooked(locumId, date, excludeOfferId, sessionType) {
        const locumOffers = DB.Offers.getForLocum(locumId);
        return locumOffers.some(o => {
            if (o.sessionDate !== date) return false;
            if (!['accepted', 'confirmed'].includes(o.status)) return false;
            if (o.id === excludeOfferId) return false;
            if (sessionType && o.sessionType) {
                if (sessionType === 'Full Day' || o.sessionType === 'Full Day') return true;
                if (sessionType === o.sessionType) return true;
                return false;
            }
            return true;
        });
    },

    deleteSessionNeed(needId) {
        const need = DB.SessionNeeds.getById(needId);
        if (!need) return { error: 'not_found', message: 'Session need not found' };
        const dateStr = DateUtils.format(need.date, 'full');
        const needOffers = DB.Offers.getForSessionNeed(needId);
        // Cancel accepted/confirmed bookings
        needOffers.filter(o => ['accepted', 'confirmed'].includes(o.status))
            .forEach(o => {
                DB.Offers.update(o.id, { status: 'cancelled', cancelledBy: 'practice', cancelledDate: DateUtils.toISO(new Date()) });
                this.addNotification(o.locumId, 'cancellation', 'Shift Cancelled',
                    `${need.practiceName} has cancelled the ${need.sessionType} session on ${dateStr}. We apologise for the inconvenience.`);
                const threadId = MessageManager._findActiveThread(need.practiceId, o.locumId) || ('thread-' + Date.now() + Math.random().toString(36).substr(2, 5));
                DB.Messages.insert({
                    id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    threadId,
                    fromId: need.practiceId,
                    toId: o.locumId,
                    subject: '',
                    body: `\u26A0\uFE0F Shift Cancelled \u2014 The ${need.sessionType} session on ${dateStr} has been cancelled by ${need.practiceName}.`,
                    shiftId: null,
                    timestamp: new Date().toISOString(),
                    read: false,
                    _deletedFor: [],
                    _system: true
                });
            });
        // Withdraw pending offers
        needOffers.filter(o => ['sent', 'viewed', 'negotiating'].includes(o.status))
            .forEach(o => {
                DB.Offers.update(o.id, { status: 'withdrawn', autoWithdrawn: true, withdrawnDate: DateUtils.toISO(new Date()) });
                this.addNotification(o.locumId, 'offer_withdrawn', 'Invitation Withdrawn',
                    `The session at ${need.practiceName} on ${dateStr} has been cancelled.`);
            });
        DB.SessionNeeds.update(needId, { status: 'cancelled' });
        return { success: true };
    },

    getOffersForLocum(locumId) {
        this.expireOffers();
        return DB.Offers.getForLocum(locumId).sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate));
    },

    getOffersForPractice(practiceId) {
        this.expireOffers();
        return DB.Offers.getForPractice(practiceId).sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate));
    },

    getOffersForSessionNeed(needId) {
        return DB.Offers.getForSessionNeed(needId);
    },

    // Valid state transitions for the new model
    validTransitions: {
        'sent': ['viewed', 'withdrawn', 'expired'],
        'viewed': ['negotiating', 'accepted', 'declined', 'withdrawn', 'expired'],
        'negotiating': ['accepted', 'declined', 'withdrawn'],
        'accepted': ['confirmed', 'cancelled'],
        'confirmed': ['completed', 'no_show', 'cancelled'],
        'completed': [],
        'declined': [],
        'withdrawn': [],
        'expired': [],
        'cancelled': [],
        'no_show': []
    },

    canTransition(fromStatus, toStatus) {
        const allowed = this.validTransitions[fromStatus];
        return allowed ? allowed.includes(toStatus) : false;
    },

    addNotification(userId, type, title, message) {
        DB.Notifications.insert({
            id: 'notif-' + Date.now() + Math.random().toString(36).substr(2, 5),
            userId: userId,
            type: type,
            title: title,
            message: message,
            date: new Date().toISOString(),
            read: false
        });
    },

    // Apply a weighted reliability penalty based on total shifts completed
    applyReliabilityPenalty(locumId, penalty) {
        const data = getMockData();
        const locum = data.locums ? data.locums.find(l => l.id === locumId) : null;
        if (!locum) return;
        const totalShifts = locum.totalShifts || 1;
        const rawDrop = (penalty / (totalShifts + penalty)) * 100;
        const scaledDrop = totalShifts >= 50 ? Math.min(rawDrop, penalty * 0.2)
                         : totalShifts >= 20 ? Math.min(rawDrop, penalty * 0.5)
                         : Math.min(rawDrop, penalty);
        const actualDrop = Math.max(1, Math.round(scaledDrop));
        locum.bookingReliability = Math.max(0, Math.round((locum.bookingReliability || 100) - actualDrop));
        saveMockData(data);
    }
};

// ---- Online Status Manager ----
const OnlineStatus = {
    _key: 'gprn_online_status',

    _getAll() {
        try { return JSON.parse(localStorage.getItem(this._key) || '{}'); } catch { return {}; }
    },

    _saveAll(statuses) {
        localStorage.setItem(this._key, JSON.stringify(statuses));
    },

    setOnline(userId) {
        const s = this._getAll();
        s[userId] = { online: true, lastSeen: new Date().toISOString() };
        this._saveAll(s);
    },

    setOffline(userId) {
        const s = this._getAll();
        s[userId] = { online: false, lastSeen: new Date().toISOString() };
        this._saveAll(s);
    },

    heartbeat(userId) {
        const s = this._getAll();
        s[userId] = { online: true, lastSeen: new Date().toISOString() };
        this._saveAll(s);
    },

    getStatus(userId) {
        const s = this._getAll();
        if (!s[userId]) return { online: false, lastSeen: null };
        // Consider offline if heartbeat older than 2 minutes
        if (s[userId].online) {
            const elapsed = Date.now() - new Date(s[userId].lastSeen).getTime();
            if (elapsed > 2 * 60 * 1000) {
                s[userId].online = false;
                this._saveAll(s);
            }
        }
        return s[userId];
    },

    formatStatus(userId) {
        const st = this.getStatus(userId);
        if (st.online) return { text: 'Online now', online: true };
        if (!st.lastSeen) return { text: 'Offline', online: false };
        const d = new Date(st.lastSeen);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let when;
        if (diffDays === 0) when = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        else if (diffDays === 1) when = 'yesterday';
        else if (diffDays < 7) when = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        else when = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
        return { text: 'Last seen ' + when, online: false };
    }
};

// ---- Message Manager ----
const MessageManager = {
    getUserRole(userId) {
        const data = getMockData();
        if (data.locums.find(l => l.id === userId)) return 'locum';
        if (data.practices.find(p => p.id === userId)) return 'practice';
        return null;
    },

    canLocumMessage(locumId, practiceId) {
        const msgs = DB.Messages.getAll(locumId);
        return msgs.some(m => m.fromId === practiceId && m.toId === locumId);
    },

    canSendMessage(fromId, toId) {
        const fromRole = this.getUserRole(fromId);
        const toRole = this.getUserRole(toId);
        if (fromRole === toRole) return { allowed: false, reason: fromRole === 'locum' ? 'GPs cannot message other GPs.' : 'Practices cannot message other practices.' };
        if (fromRole === 'locum') {
            if (!this.canLocumMessage(fromId, toId)) {
                return { allowed: false, reason: 'You can only reply to messages from practices. You cannot initiate conversations.' };
            }
        }
        return { allowed: true };
    },

    _isDeletedFor(msg, userId) {
        return msg._deletedFor && msg._deletedFor.includes(userId);
    },

    send(fromId, toId, subject, body, shiftId) {
        if (!body || !body.trim()) return { error: 'empty_message', message: 'Message cannot be empty.' };
        if (!toId) return { error: 'no_recipient', message: 'Please select a recipient.' };

        const check = this.canSendMessage(fromId, toId);
        if (!check.allowed) return { error: 'not_allowed', message: check.reason };

        // Find existing thread
        const allMsgs = DB.Messages.getAll(fromId);
        const relevantMsgs = allMsgs.filter(m =>
            ((m.fromId === fromId && m.toId === toId) || (m.fromId === toId && m.toId === fromId))
        );
        const threadId = relevantMsgs.length > 0 ? relevantMsgs[relevantMsgs.length - 1].threadId : ('thread-' + Date.now());

        DB.Messages.insert({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId,
            fromId,
            toId,
            subject: subject || '',
            body,
            shiftId: shiftId || null,
            timestamp: new Date().toISOString(),
            read: false,
            _deletedFor: []
        });
        EmailManager.send(toId, 'New Message: ' + (subject || 'Message'), body.length > 200 ? body.substring(0, 200) + '...' : body, 'message_received');
        Booking.addNotification(toId, 'message', 'New Message', 'You have a new message from ' + this.getUserName(fromId));
        return threadId;
    },

    sendSystemMessage(threadId, fromId, toId, text) {
        DB.Messages.insert({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId,
            fromId,
            toId,
            subject: '',
            body: text,
            shiftId: null,
            timestamp: new Date().toISOString(),
            read: false,
            _deletedFor: [],
            _system: true
        });
    },

    _findActiveThread(user1, user2) {
        const msgs = DB.Messages.getAll(user1);
        const relevantMsgs = msgs.filter(m =>
            ((m.fromId === user1 && m.toId === user2) || (m.fromId === user2 && m.toId === user1))
        );
        if (relevantMsgs.length === 0) return null;
        return relevantMsgs[relevantMsgs.length - 1].threadId;
    },

    deleteThread(threadId, userId) {
        DB.Messages.softDelete(threadId, userId);
    },

    getThreads(userId) {
        const userMsgs = DB.Messages.getAll(userId);
        if (!userMsgs.length) return [];
        const threads = {};
        userMsgs.forEach(m => {
            if (!threads[m.threadId]) threads[m.threadId] = [];
            threads[m.threadId].push(m);
        });
        return Object.entries(threads).map(([threadId, msgs]) => {
            msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const last = msgs[msgs.length - 1];
            const otherId = last.fromId === userId ? last.toId : last.fromId;
            const unread = msgs.filter(m => m.toId === userId && !m.read).length;
            return { threadId, messages: msgs, lastMessage: last, otherId, unread, subject: msgs[0].subject };
        }).sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));
    },

    getThread(threadId, userId) {
        return DB.Messages.getByThread(threadId, userId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    markThreadRead(threadId, userId) {
        DB.Messages.markRead(threadId, userId);
    },

    getUnreadCount(userId) {
        return DB.Messages.getUnreadCount(userId);
    },

    getUserName(userId) {
        const data = getMockData();
        const locum = data.locums.find(l => l.id === userId);
        if (locum) return `${locum.title} ${locum.firstName} ${locum.lastName}`;
        const practice = data.practices.find(p => p.id === userId);
        if (practice) return practice.practiceName;
        return 'Unknown';
    }
};

// ---- Email Manager (Simulated) ----
const EmailManager = {
    send(toUserId, subject, body, type) {
        const data = getMockData();
        if (!data.emailLog) data.emailLog = [];
        const locum = data.locums.find(l => l.id === toUserId);
        const practice = data.practices.find(p => p.id === toUserId);
        const toEmail = locum ? locum.email : (practice ? practice.email : 'unknown');
        const toName = locum ? `${locum.title} ${locum.firstName} ${locum.lastName}` : (practice ? practice.practiceName : 'Unknown');
        data.emailLog.push({
            id: 'email-' + Date.now() + Math.random().toString(36).substr(2, 5),
            toUserId,
            toEmail,
            toName,
            subject,
            body,
            type,
            timestamp: new Date().toISOString(),
            status: 'sent'
        });
        saveMockData(data);
    },

    getLog(userId) {
        const data = getMockData();
        if (!data.emailLog) return [];
        return data.emailLog.filter(e => e.toUserId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
};

// ---- Invoice Manager ----
const InvoiceManager = {
    generateFromOffer(offer) {
        // Check for duplicate
        const existing = DB.Invoices.getForLocum(offer.locumId);
        if (existing.some(i => i.offerId === offer.id)) return;
        const data = getMockData(); // For locum profile lookup
        const locum = data.locums.find(l => l.id === offer.locumId);
        const rate = offer.agreedRate || offer.proposedRate ||
            (offer.sessionType === 'Full Day' ? (locum ? locum.rates.fullDay : 0) :
            offer.sessionType === 'AM' ? (locum ? locum.rates.am : 0) : (locum ? locum.rates.pm : 0));
        const housecallFee = offer.housecalls ? (offer.housecallRate || (locum ? locum.rates.housecall : 0) || 0) : 0;
        const total = rate + housecallFee;
        const allInvoices = DB.Invoices.getForLocum(offer.locumId).concat(DB.Invoices.getForPractice(offer.practiceId));
        const existingNums = allInvoices.map(i => parseInt((i.invoiceNumber || '').replace('GPRN-', '')) || 0);
        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 10001;
        const sessionDate = offer.sessionDate || offer.shiftDate;
        DB.Invoices.insert({
            id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            invoiceNumber: 'GPRN-' + nextNum,
            offerId: offer.id,
            locumId: offer.locumId,
            locumName: locum ? `${locum.title} ${locum.firstName} ${locum.lastName}` : 'Unknown',
            practiceId: offer.practiceId,
            practiceName: offer.practiceName,
            sessionDate: sessionDate,
            shiftDate: sessionDate,
            sessionType: offer.sessionType,
            startTime: offer.startTime,
            endTime: offer.endTime,
            sessionRate: rate,
            housecallFee: housecallFee,
            total: total,
            status: 'pending',
            generatedDate: DateUtils.toISO(new Date()),
            dueDate: DateUtils.toISO(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            paidDate: null,
            disputeReason: null
        });
    },

    getForPractice(practiceId) {
        return DB.Invoices.getForPractice(practiceId).sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
    },

    getForLocum(locumId) {
        return DB.Invoices.getForLocum(locumId).sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
    },

    updateStatus(invoiceId, status, reason) {
        const inv = DB.Invoices.getById(invoiceId);
        if (!inv) return false;
        const updates = { status: status };
        if (status === 'paid' && !inv.paidDate) updates.paidDate = DateUtils.toISO(new Date());
        if (status === 'disputed') updates.disputeReason = reason;
        if (status === 'paid_pending') updates.practiceMarkedPaidDate = DateUtils.toISO(new Date());
        DB.Invoices.update(invoiceId, updates);

        const threadId = MessageManager._findActiveThread(inv.practiceId, inv.locumId)
            || MessageManager._findActiveThread(inv.locumId, inv.practiceId)
            || ('thread-' + Date.now());

        if (status === 'paid') {
            DB.Messages.insert({
                id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
                threadId, fromId: inv.locumId, toId: inv.practiceId, subject: '',
                body: `Payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) has been confirmed by the locum. This invoice is now complete.`,
                shiftId: null, timestamp: new Date().toISOString(), read: false, _deletedFor: [], _system: true
            });
            Booking.addNotification(inv.practiceId, 'payment_confirmed', 'Payment Confirmed',
                `${inv.locumName} has confirmed receipt of payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}).`);
        }

        if (status === 'paid_pending') {
            DB.Messages.insert({
                id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
                threadId, fromId: inv.practiceId, toId: inv.locumId, subject: '',
                body: `${inv.practiceName} has marked invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) as paid. Please confirm you have received the payment.`,
                shiftId: null, timestamp: new Date().toISOString(), read: false, _deletedFor: [], _system: true, _invoiceId: inv.id
            });
            Booking.addNotification(inv.locumId, 'payment_awaiting_confirmation', 'Payment Awaiting Confirmation',
                `${inv.practiceName} has marked invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) as paid. Please confirm receipt.`);
            EmailManager.send(inv.locumId, 'Confirm Payment Received: ' + inv.invoiceNumber, `${inv.practiceName} has marked invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} as paid. Please log in and confirm you have received the payment.`, 'payment_awaiting_confirmation');
        }

        if (status === 'disputed') {
            DB.Messages.insert({
                id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
                threadId, fromId: inv.practiceId, toId: inv.locumId,
                subject: 'Invoice Disputed: ' + inv.invoiceNumber,
                body: `Invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) has been disputed.\n\nReason: ${reason}`,
                shiftId: null, timestamp: new Date().toISOString(), read: false, _deletedFor: [], _invoiceId: inv.id
            });
            Booking.addNotification(inv.locumId, 'invoice_disputed', 'Invoice Disputed',
                `${inv.practiceName} has disputed invoice ${inv.invoiceNumber}. Check your messages.`);
            EmailManager.send(inv.locumId, 'Invoice Disputed: ' + inv.invoiceNumber,
                `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} has been disputed by ${inv.practiceName}. Reason: ${reason}`, 'invoice_disputed');
        }
        return true;
    },

    reviseAmount(invoiceId, newAmount) {
        const inv = DB.Invoices.getById(invoiceId);
        if (!inv || inv.status !== 'disputed') return false;
        const originalTotal = inv.originalTotal || inv.total;
        DB.Invoices.update(invoiceId, { originalTotal: originalTotal, revisedTotal: newAmount, status: 'revised' });

        const threadId = MessageManager._findActiveThread(inv.locumId, inv.practiceId)
            || MessageManager._findActiveThread(inv.practiceId, inv.locumId)
            || ('thread-' + Date.now());
        DB.Messages.insert({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId, fromId: inv.locumId, toId: inv.practiceId,
            subject: 'Invoice Revised: ' + inv.invoiceNumber,
            body: `Invoice ${inv.invoiceNumber} has been revised.\n\nOriginal amount: ${formatCurrency(originalTotal)}\nRevised amount: ${formatCurrency(newAmount)}\n\nPlease review and approve the revised amount.`,
            shiftId: null, timestamp: new Date().toISOString(), read: false, _deletedFor: [], _invoiceId: inv.id
        });
        Booking.addNotification(inv.practiceId, 'invoice_revised', 'Invoice Revised',
            `Invoice ${inv.invoiceNumber} has been revised to ${formatCurrency(newAmount)}. Please review.`);
        EmailManager.send(inv.practiceId, 'Invoice Revised: ' + inv.invoiceNumber,
            `Invoice ${inv.invoiceNumber} has been revised from ${formatCurrency(originalTotal)} to ${formatCurrency(newAmount)}. Please log in to review and approve.`, 'invoice_revised');
        return true;
    },

    approveRevision(invoiceId) {
        const inv = DB.Invoices.getById(invoiceId);
        if (!inv || inv.status !== 'revised') return false;
        const newTotal = inv.revisedTotal;
        DB.Invoices.update(invoiceId, { total: newTotal, sessionRate: newTotal, status: 'pending', revisedTotal: null });

        const threadId = MessageManager._findActiveThread(inv.practiceId, inv.locumId)
            || MessageManager._findActiveThread(inv.locumId, inv.practiceId)
            || ('thread-' + Date.now());
        DB.Messages.insert({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId, fromId: inv.practiceId, toId: inv.locumId, subject: '',
            body: `Revised amount of ${formatCurrency(newTotal)} for invoice ${inv.invoiceNumber} has been approved. Payment will follow.`,
            shiftId: null, timestamp: new Date().toISOString(), read: false, _deletedFor: [], _system: true, _invoiceId: inv.id
        });
        Booking.addNotification(inv.locumId, 'revision_approved', 'Revision Approved',
            `${inv.practiceName} has approved the revised amount of ${formatCurrency(newTotal)} for invoice ${inv.invoiceNumber}.`);
        EmailManager.send(inv.locumId, 'Revision Approved: ' + inv.invoiceNumber,
            `The revised amount of ${formatCurrency(newTotal)} for invoice ${inv.invoiceNumber} has been approved by ${inv.practiceName}.`, 'revision_approved');
        return true;
    },

    rejectRevision(invoiceId, reason) {
        const inv = DB.Invoices.getById(invoiceId);
        if (!inv || inv.status !== 'revised') return false;
        DB.Invoices.update(invoiceId, { status: 'disputed', disputeReason: reason || inv.disputeReason, revisedTotal: null });

        const threadId = MessageManager._findActiveThread(inv.practiceId, inv.locumId)
            || MessageManager._findActiveThread(inv.locumId, inv.practiceId)
            || ('thread-' + Date.now());
        DB.Messages.insert({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId, fromId: inv.practiceId, toId: inv.locumId,
            subject: 'Revision Rejected: ' + inv.invoiceNumber,
            body: `The revised amount for invoice ${inv.invoiceNumber} has been rejected.${reason ? '\n\nReason: ' + reason : ''}\n\nPlease discuss further and submit a new revision.`,
            shiftId: null, timestamp: new Date().toISOString(), read: false, _deletedFor: [], _invoiceId: inv.id
        });
        Booking.addNotification(inv.locumId, 'revision_rejected', 'Revision Rejected',
            `${inv.practiceName} has rejected the revised amount for invoice ${inv.invoiceNumber}. Check your messages.`);
        EmailManager.send(inv.locumId, 'Revision Rejected: ' + inv.invoiceNumber,
            `The revised amount for invoice ${inv.invoiceNumber} has been rejected by ${inv.practiceName}. Please discuss further.`, 'revision_rejected');
        return true;
    },

    chasePayment(invoiceId) {
        const inv = DB.Invoices.getById(invoiceId);
        if (!inv) return false;
        DB.Invoices.update(invoiceId, { status: 'overdue' });

        const threadId = MessageManager._findActiveThread(inv.locumId, inv.practiceId)
            || MessageManager._findActiveThread(inv.practiceId, inv.locumId)
            || ('thread-' + Date.now());
        DB.Messages.insert({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId, fromId: inv.locumId, toId: inv.practiceId,
            subject: 'Payment Reminder: ' + inv.invoiceNumber,
            body: `Payment reminder for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) for ${inv.sessionType} session on ${DateUtils.format(inv.sessionDate || inv.shiftDate, 'medium')}. Payment was due on ${DateUtils.format(inv.dueDate, 'medium')}. Please review and arrange payment.`,
            shiftId: null, timestamp: new Date().toISOString(), read: false, _deletedFor: [], _invoiceId: inv.id
        });
        Booking.addNotification(inv.practiceId, 'payment_reminder', 'Payment Reminder',
            `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} is overdue. Check your messages.`);
        EmailManager.send(inv.practiceId, 'Payment Reminder: ' + inv.invoiceNumber,
            `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} is overdue. Session: ${DateUtils.format(inv.sessionDate || inv.shiftDate, 'medium')}, Locum: ${inv.locumName}. Please log in to review.`, 'payment_reminder');
        return true;
    },

    confirmPayment(invoiceId) {
        const inv = DB.Invoices.getById(invoiceId);
        if (!inv || inv.status !== 'paid_pending') return false;
        DB.Invoices.update(invoiceId, { status: 'paid', paidDate: inv.practiceMarkedPaidDate || DateUtils.toISO(new Date()), confirmedDate: DateUtils.toISO(new Date()) });

        const threadId = MessageManager._findActiveThread(inv.locumId, inv.practiceId)
            || MessageManager._findActiveThread(inv.practiceId, inv.locumId)
            || ('thread-' + Date.now());
        DB.Messages.insert({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId, fromId: inv.locumId, toId: inv.practiceId, subject: '',
            body: `Payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) has been confirmed. Thank you.`,
            shiftId: null, timestamp: new Date().toISOString(), read: false, _deletedFor: [], _system: true
        });
        Booking.addNotification(inv.practiceId, 'payment_confirmed', 'Payment Confirmed',
            `${inv.locumName} has confirmed receipt of payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}).`);
        EmailManager.send(inv.practiceId, 'Payment Confirmed: ' + inv.invoiceNumber,
            `${inv.locumName} has confirmed receipt of payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}). This invoice is now complete.`, 'payment_confirmed');
        return true;
    },

    checkOverdue(locumId) {
        const invoices = DB.Invoices.getForLocum(locumId);
        if (!invoices.length) return { count: 0, total: 0, invoices: [] };
        const now = new Date();
        const notifications = DB.Notifications.getForUser(locumId);
        invoices.forEach(inv => {
            if (inv.status === 'pending' && inv.dueDate) {
                const due = new Date(inv.dueDate);
                if (due < now) {
                    DB.Invoices.update(inv.id, { status: 'overdue' });
                    inv.status = 'overdue'; // Update local copy
                    const existingNotif = notifications.find(n =>
                        n.type === 'invoice_overdue' && n.message && n.message.includes(inv.invoiceNumber)
                    );
                    if (!existingNotif) {
                        Booking.addNotification(locumId, 'invoice_overdue', 'Invoice Overdue',
                            `Invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) to ${inv.practiceName} is past due. Consider sending a payment reminder.`);
                        Booking.addNotification(inv.practiceId, 'payment_reminder', 'Payment Overdue',
                            `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} from ${inv.locumName} is overdue.`);
                    }
                }
            }
        });
        const allOverdue = invoices.filter(i => i.status === 'overdue');
        return {
            count: allOverdue.length,
            total: allOverdue.reduce((s, i) => s + i.total, 0),
            invoices: allOverdue
        };
    }
};

// ---- Feedback Manager ----
const FeedbackManager = {
    submit(fromId, toId, offerId, ratings, comment, fromRole) {
        if (!ratings || typeof ratings !== 'object' || Object.keys(ratings).length === 0) {
            return { error: 'invalid_ratings', message: 'Please provide at least one rating.' };
        }
        for (const [key, val] of Object.entries(ratings)) {
            if (typeof val !== 'number' || val < 1 || val > 5) {
                return { error: 'invalid_rating_value', message: 'Ratings must be between 1 and 5.' };
            }
        }
        DB.Feedback.insert({
            id: 'fb-' + Date.now(),
            fromId, toId, offerId, ratings, comment, fromRole,
            timestamp: new Date().toISOString()
        });
        return true;
    },

    getForUser(userId) {
        return DB.Feedback.getForUser(userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    getAverageRating(userId) {
        const reviews = this.getForUser(userId);
        if (reviews.length === 0) return null;
        const allScores = reviews.flatMap(r => Object.values(r.ratings || {})).filter(v => typeof v === 'number' && !isNaN(v));
        if (allScores.length === 0) return null;
        return (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
    },

    hasReviewed(fromId, offerId) {
        const all = DB.Feedback.getFromUser(fromId);
        return all.some(f => f.offerId === offerId);
    },

    ratePractice(locumId, practiceId, offerId, stars, comment) {
        if (typeof stars !== 'number' || stars < 1 || stars > 5) {
            return { error: 'invalid_rating', message: 'Rating must be between 1 and 5.' };
        }
        if (comment && comment.length > 200) {
            return { error: 'comment_too_long', message: 'Comment must be 200 characters or less.' };
        }
        const offer = DB.Offers.getById(offerId);
        DB.Feedback.insert({
            id: 'fb-' + Date.now(),
            fromId: locumId, toId: practiceId, offerId,
            ratings: { overall: stars },
            comment: comment || '',
            fromRole: 'locum',
            type: 'practice_rating',
            locumName: offer ? offer.locumName : '',
            timestamp: new Date().toISOString()
        });
        return true;
    },

    reportLocumIssue(practiceId, locumId, offerId, issueType) {
        if (!['no_show', 'late_cancellation'].includes(issueType)) {
            return { error: 'invalid_issue', message: 'Issue must be no_show or late_cancellation.' };
        }
        const offer = DB.Offers.getById(offerId);
        if (!offer || offer.status !== 'completed') {
            return { error: 'invalid_offer', message: 'Can only report issues on completed shifts.' };
        }
        if (issueType === 'late_cancellation') {
            const shiftDate = new Date(offer.sessionDate || offer.shiftDate);
            const hoursSince = (new Date() - shiftDate) / (1000 * 60 * 60);
            if (hoursSince > 24) {
                return { error: 'too_late', message: 'Late cancellation can only be reported within 24 hours of the shift.' };
            }
        }
        const penalty = issueType === 'no_show' ? 10 : 5;
        Booking.applyReliabilityPenalty(locumId, penalty);
        DB.Feedback.insert({
            id: 'fb-' + Date.now(),
            fromId: practiceId, toId: locumId, offerId,
            ratings: {}, comment: '', fromRole: 'practice',
            type: issueType, timestamp: new Date().toISOString()
        });
        const issueLabel = issueType === 'no_show' ? 'No-Show' : 'Late Cancellation';
        const penaltyPts = issueType === 'no_show' ? 10 : 5;
        Booking.addNotification(locumId, issueType, issueLabel + ' Reported',
            `${offer.practiceName} has reported a ${issueLabel.toLowerCase()} for your shift on ${DateUtils.format(offer.sessionDate, 'medium')}. Your reliability score has been reduced by ${penaltyPts} points.`);
        return true;
    },

    getPracticeRatings(practiceId) {
        return DB.Feedback.getForUser(practiceId).filter(f => f.type === 'practice_rating')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    getPracticeAverageRating(practiceId) {
        const ratings = this.getPracticeRatings(practiceId);
        if (ratings.length === 0) return null;
        const total = ratings.reduce((s, r) => s + (r.ratings.overall || 0), 0);
        return (total / ratings.length).toFixed(1);
    }
};

// ---- Barred/Preferred List Manager ----
const BarredList = {
    bar(practiceId, locumId, reason) {
        if (!this.isBarred(practiceId, locumId)) {
            DB.Barred.bar(practiceId, locumId, reason);
        }
    },

    unbar(practiceId, locumId) {
        DB.Barred.unbar(practiceId, locumId);
    },

    isBarred(practiceId, locumId) {
        return DB.Barred.isBarred(practiceId, locumId);
    },

    getBarredList(practiceId) {
        return DB.Barred.getList(practiceId);
    },

    getBarredPracticesForLocum(locumId) {
        // Need practice names from blob (profiles not in tables yet)
        const data = getMockData();
        var barredAt = [];
        Object.keys(data.barredLists || {}).forEach(function(practiceId) {
            var list = data.barredLists[practiceId];
            var entry = list.find(function(b) { return b.locumId === locumId; });
            if (entry) {
                var practice = data.practices.find(function(p) { return p.id === practiceId; });
                barredAt.push({ practiceId: practiceId, practiceName: practice ? practice.practiceName : 'Unknown Practice', reason: entry.reason || 'No reason provided', date: entry.date });
            }
        });
        return barredAt;
    },

    getBarReason(practiceId, locumId) {
        const list = DB.Barred.getList(practiceId);
        const entry = list.find(b => b.locumId === locumId);
        return entry ? entry.reason : null;
    },

    addPreferred(practiceId, locumId) {
        if (!this.isPreferred(practiceId, locumId)) {
            DB.Barred.addPreferred(practiceId, locumId);
        }
    },

    removePreferred(practiceId, locumId) {
        DB.Barred.removePreferred(practiceId, locumId);
    },

    isPreferred(practiceId, locumId) {
        return DB.Barred.isPreferred(practiceId, locumId);
    }
};

// ---- Availability Manager (half-day granularity) ----
// Each date stores { am: status, pm: status } where status is 'available', 'unavailable', or 'preferred'
const Availability = {
    set(locumId, date, session, status) {
        if (session === 'both') {
            DB.Availability.set(locumId, date, 'am', status === 'none' ? 'none' : status);
            DB.Availability.set(locumId, date, 'pm', status === 'none' ? 'none' : status);
        } else {
            DB.Availability.set(locumId, date, session, status);
        }
    },

    get(locumId, date, session) {
        if (session) return DB.Availability.get(locumId, date, session);
        // Combined status
        const am = DB.Availability.get(locumId, date, 'am');
        const pm = DB.Availability.get(locumId, date, 'pm');
        if (am === pm) return am || 'none';
        return 'mixed';
    },

    getSlot(locumId, date) {
        return {
            am: DB.Availability.get(locumId, date, 'am'),
            pm: DB.Availability.get(locumId, date, 'pm')
        };
    },

    getAll(locumId) {
        return DB.Availability.getForLocum(locumId);
    },

    isAvailable(locumId, date, sessionType) {
        const slot = this.getSlot(locumId, date);
        if (sessionType === 'AM') return slot.am === 'available' || slot.am === 'preferred';
        if (sessionType === 'PM') return slot.pm === 'available' || slot.pm === 'preferred';
        if (sessionType === 'Full Day') {
            return (slot.am === 'available' || slot.am === 'preferred') &&
                   (slot.pm === 'available' || slot.pm === 'preferred');
        }
        return false;
    },

    getAvailableDates(locumId, startDate, endDate) {
        const all = this.getAll(locumId);
        const results = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (const [date, entry] of Object.entries(all)) {
            const d = new Date(date);
            if (d >= start && d <= end) {
                const slot = typeof entry === 'string' ? { am: entry, pm: entry } : entry;
                if (slot.am === 'available' || slot.am === 'preferred' || slot.pm === 'available' || slot.pm === 'preferred') {
                    results.push({ date, ...slot });
                }
            }
        }
        return results.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
};

// ---- Page init helper ----
function initPage(role) {
    if (!Auth.requireAuth(role)) return false;
    initMockData();
    // Online status: set online + heartbeat every 60s
    const sess = Auth.getSession();
    if (sess && sess.id) {
        OnlineStatus.setOnline(sess.id);
        setInterval(() => OnlineStatus.heartbeat(sess.id), 60000);
        // Set offline on tab close/navigate away
        window.addEventListener('beforeunload', () => OnlineStatus.setOffline(sess.id));
    }
    return true;
}
