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
        EmailManager.send(data, user.id, 'Password Reset',
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
        const data = getMockData();
        const session = Auth.getSession();
        if (!session || session.role !== 'practice') return { error: 'not_authorized', message: 'Only practices can create session needs' };
        const practice = data.practices.find(p => p.id === session.id);
        if (!practice) return { error: 'not_found', message: 'Practice not found' };
        if (!data.sessionNeeds) data.sessionNeeds = [];
        const need = {
            id: 'need-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            practiceId: session.id,
            practiceName: practice.practiceName,
            healthBoard: practice.healthBoard,
            date: needData.date,
            sessionType: needData.sessionType, // 'AM', 'PM', 'Full Day'
            startTime: needData.startTime || (needData.sessionType === 'PM' ? '14:00' : '08:00'),
            endTime: needData.endTime || (needData.sessionType === 'AM' ? '13:00' : '18:30'),
            budgetRate: needData.budgetRate || null,
            notes: needData.notes || '',
            housecalls: needData.housecalls || false,
            status: 'open', // open, filled, cancelled
            createdDate: DateUtils.toISO(new Date()),
            offersCount: 0
        };
        data.sessionNeeds.push(need);
        saveMockData(data);
        return { success: true, sessionNeed: need };
    },

    // Practice sends an offer to a specific locum
    sendOffer(sessionNeedId, locumId, proposedRate, message) {
        const data = getMockData();
        const session = Auth.getSession();
        if (!session || session.role !== 'practice') return { error: 'not_authorized', message: 'Only practices can send offers' };
        const practice = data.practices.find(p => p.id === session.id);
        if (!practice) return { error: 'not_found', message: 'Practice not found' };
        const locum = data.locums.find(l => l.id === locumId);
        if (!locum) return { error: 'locum_not_found', message: 'Locum not found' };
        // Barred check
        if (BarredList.isBarred(session.id, locumId)) {
            return { error: 'barred', message: 'This locum is on your blocked list' };
        }
        // Find or validate session need
        if (!data.sessionNeeds) data.sessionNeeds = [];
        let need = data.sessionNeeds.find(n => n.id === sessionNeedId);
        if (!need) return { error: 'need_not_found', message: 'Session need not found' };
        if (need.status !== 'open') return { error: 'need_filled', message: 'This session has already been filled' };
        // Duplicate offer check — don't send to same locum for same need
        const existingOffer = data.offers.find(o =>
            o.sessionNeedId === sessionNeedId && o.locumId === locumId &&
            !['declined', 'withdrawn', 'expired', 'cancelled'].includes(o.status)
        );
        if (existingOffer) return { error: 'already_sent', message: 'You already have an active offer to this locum for this session' };
        // Double-booking check
        if (this.isDoubleBooked(locumId, need.date, null, need.sessionType)) {
            return { error: 'double_booked', message: 'This locum already has a confirmed booking for this date/session' };
        }
        // Get locum's published rate for this session type
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
            expiresAt: DateUtils.toISO(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
            practiceMessage: message || '',
            negotiations: []
        };
        data.offers.push(newOffer);
        need.offersCount = (need.offersCount || 0) + 1;
        // Notify locum
        this.addNotification(data, locumId, 'new_offer', 'New Invitation',
            `${practice.practiceName} has invited you to work on ${DateUtils.format(need.date, 'medium')} (${need.sessionType}).`);
        EmailManager.send(data, locumId, 'New Session Invitation',
            `${practice.practiceName} has sent you an invitation for a ${need.sessionType} session on ${DateUtils.format(need.date, 'medium')}. Please review in your invitations.`, 'new_offer');
        saveMockData(data);
        return { success: true, offer: newOffer };
    },

    // Auto-mark offer as viewed when locum opens it
    viewOffer(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        if (offer.status === 'sent') {
            offer.status = 'viewed';
            offer.viewedDate = DateUtils.toISO(new Date());
            // Notify practice that locum has seen their offer
            this.addNotification(data, offer.practiceId, 'offer_viewed', 'Invitation Viewed',
                `The locum has viewed your invitation for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            saveMockData(data);
        }
        return true;
    },

    // Locum responds to an offer: accept, decline, or counter
    respondToOffer(offerId, response, counterRate, message) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return { error: 'not_found', message: 'Offer not found' };
        // Check if offer has expired
        if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
            offer.status = 'expired';
            saveMockData(data);
            return { error: 'expired', message: 'This offer has expired and can no longer be acted on.' };
        }
        if (!['sent', 'viewed', 'negotiating'].includes(offer.status)) {
            return { error: 'invalid_status', message: 'This offer can no longer be responded to' };
        }

        if (response === 'accept') {
            // Double-book check
            const sessionDate = offer.sessionDate || offer.shiftDate;
            if (sessionDate && this.isDoubleBooked(offer.locumId, sessionDate, offer.id, offer.sessionType)) {
                return { error: 'double_booked', message: 'You already have a confirmed booking for this date and session type.' };
            }
            // Accept at the current proposed rate (or last counter rate)
            const agreedRate = offer.agreedRate || offer.proposedRate;
            offer.agreedRate = agreedRate;
            offer.status = 'accepted';
            offer.acceptedDate = DateUtils.toISO(new Date());
            offer.negotiations.push({ from: 'locum', accepted: true, rate: agreedRate, message: message || 'Accepted', date: new Date().toISOString() });
            // Mark session need as filled
            if (data.sessionNeeds) {
                const need = data.sessionNeeds.find(n => n.id === offer.sessionNeedId);
                if (need) need.status = 'filled';
            }
            // Auto-withdraw other sent/viewed offers for same session need
            data.offers.filter(o => o.sessionNeedId === offer.sessionNeedId && o.id !== offerId && ['sent', 'viewed', 'negotiating'].includes(o.status))
                .forEach(o => {
                    o.status = 'withdrawn';
                    o.autoWithdrawn = true;
                    o.withdrawnDate = DateUtils.toISO(new Date());
                    this.addNotification(data, o.locumId, 'offer_withdrawn', 'Invitation Withdrawn',
                        `The invitation from ${offer.practiceName} for ${DateUtils.format(o.sessionDate, 'medium')} has been filled by another locum.`);
                });
            this.addNotification(data, offer.practiceId, 'offer_accepted', 'Invitation Accepted',
                `A locum has accepted your invitation for ${DateUtils.format(offer.sessionDate, 'medium')} (${offer.sessionType}).`);
            EmailManager.send(data, offer.practiceId, 'Invitation Accepted',
                `A locum has accepted your session invitation for ${DateUtils.format(offer.sessionDate, 'medium')}. Please confirm in your dashboard.`, 'offer_accepted');
            saveMockData(data);
            return { success: true, status: 'accepted' };

        } else if (response === 'decline') {
            offer.status = 'declined';
            offer.declinedDate = DateUtils.toISO(new Date());
            offer.negotiations.push({ from: 'locum', declined: true, message: message || 'Declined', date: new Date().toISOString() });
            if (data.sessionNeeds) {
                const need = data.sessionNeeds.find(n => n.id === offer.sessionNeedId);
                if (need && need.offersCount > 0) need.offersCount--;
            }
            this.addNotification(data, offer.practiceId, 'offer_declined', 'Invitation Declined',
                `A locum has declined your invitation for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            EmailManager.send(data, offer.practiceId, 'Invitation Declined',
                `A locum has declined your session invitation for ${DateUtils.format(offer.sessionDate, 'medium')}.`, 'offer_declined');
            saveMockData(data);
            return { success: true, status: 'declined' };

        } else if (response === 'counter') {
            if (!counterRate) return { error: 'missing_rate', message: 'Please provide a counter rate' };
            if (counterRate <= 0 || counterRate > 50000 || isNaN(counterRate)) {
                return { error: 'invalid_rate', message: 'Please enter a valid rate between £1 and £50,000.' };
            }
            offer.status = 'negotiating';
            offer.proposedRate = counterRate;
            offer.negotiations.push({ from: 'locum', rate: counterRate, message: message || '', date: new Date().toISOString() });
            this.addNotification(data, offer.practiceId, 'counter_offer', 'Rate Counter-Offer',
                `A locum has proposed a rate of ${formatCurrency(counterRate)} for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            EmailManager.send(data, offer.practiceId, 'Rate Counter-Offer',
                `A locum has proposed a different rate for your ${offer.sessionType} session on ${DateUtils.format(offer.sessionDate, 'medium')}. Please review.`, 'counter_offer');
            saveMockData(data);
            return { success: true, status: 'negotiating' };
        }
        return { error: 'invalid_response', message: 'Invalid response type' };
    },

    // Practice responds during negotiation: accept locum's counter, counter again, or withdraw
    practiceRespondToNegotiation(offerId, response, counterRate, message) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return { error: 'not_found', message: 'Offer not found' };
        if (offer.status !== 'negotiating') return { error: 'invalid_status', message: 'Offer is not in negotiation' };

        if (response === 'accept') {
            const agreedRate = offer.proposedRate; // Accept the locum's last counter
            offer.agreedRate = agreedRate;
            offer.status = 'accepted';
            offer.acceptedDate = DateUtils.toISO(new Date());
            offer.negotiations.push({ from: 'practice', accepted: true, rate: agreedRate, message: message || 'Rate accepted', date: new Date().toISOString() });
            // Mark session need as filled
            if (data.sessionNeeds) {
                const need = data.sessionNeeds.find(n => n.id === offer.sessionNeedId);
                if (need) need.status = 'filled';
            }
            // Auto-withdraw other offers for same need
            data.offers.filter(o => o.sessionNeedId === offer.sessionNeedId && o.id !== offerId && ['sent', 'viewed', 'negotiating'].includes(o.status))
                .forEach(o => {
                    o.status = 'withdrawn';
                    o.autoWithdrawn = true;
                    o.withdrawnDate = DateUtils.toISO(new Date());
                    this.addNotification(data, o.locumId, 'offer_withdrawn', 'Invitation Withdrawn',
                        `The invitation from ${offer.practiceName} for ${DateUtils.format(o.sessionDate, 'medium')} has been filled by another locum.`);
                });
            this.addNotification(data, offer.locumId, 'rate_agreed', 'Rate Agreed',
                `${offer.practiceName} has accepted your proposed rate of ${formatCurrency(agreedRate)} for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            EmailManager.send(data, offer.locumId, 'Rate Agreed',
                `${offer.practiceName} has agreed to your rate for the session on ${DateUtils.format(offer.sessionDate, 'medium')}.`, 'rate_agreed');
            saveMockData(data);
            return { success: true, status: 'accepted' };

        } else if (response === 'counter') {
            if (!counterRate) return { error: 'missing_rate', message: 'Please provide a counter rate' };
            if (counterRate <= 0 || counterRate > 50000 || isNaN(counterRate)) {
                return { error: 'invalid_rate', message: 'Please enter a valid rate between £1 and £50,000.' };
            }
            offer.proposedRate = counterRate;
            offer.negotiations.push({ from: 'practice', rate: counterRate, message: message || '', date: new Date().toISOString() });
            this.addNotification(data, offer.locumId, 'counter_offer', 'Rate Counter-Offer',
                `${offer.practiceName} has proposed a rate of ${formatCurrency(counterRate)} for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
            EmailManager.send(data, offer.locumId, 'Rate Counter-Offer',
                `${offer.practiceName} has proposed a different rate for the session on ${DateUtils.format(offer.sessionDate, 'medium')}. Please review.`, 'counter_offer');
            saveMockData(data);
            return { success: true, status: 'negotiating' };

        } else if (response === 'withdraw') {
            return this.withdrawOffer(offerId);
        }
        return { error: 'invalid_response', message: 'Invalid response type' };
    },

    // Practice withdraws an offer (pull it back before locum accepts)
    withdrawOffer(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return { error: 'not_found', message: 'Offer not found' };
        if (!['sent', 'viewed', 'negotiating'].includes(offer.status)) {
            return { error: 'cannot_withdraw', message: 'This offer can no longer be withdrawn' };
        }
        offer.status = 'withdrawn';
        offer.withdrawnDate = DateUtils.toISO(new Date());
        if (data.sessionNeeds) {
            const need = data.sessionNeeds.find(n => n.id === offer.sessionNeedId);
            if (need && need.offersCount > 0) need.offersCount--;
        }
        this.addNotification(data, offer.locumId, 'offer_withdrawn', 'Invitation Withdrawn',
            `${offer.practiceName} has withdrawn the invitation for ${DateUtils.format(offer.sessionDate, 'medium')}.`);
        saveMockData(data);
        return { success: true };
    },

    // Practice confirms the booking (after locum accepts)
    confirmBooking(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer || offer.status !== 'accepted') return false;
        offer.status = 'confirmed';
        offer.confirmedDate = DateUtils.toISO(new Date());
        this.addNotification(data, offer.locumId, 'booking_confirmed', 'Booking Confirmed',
            `${offer.practiceName} has confirmed your booking for ${DateUtils.format(offer.sessionDate, 'medium')} (${offer.sessionType}).`);
        EmailManager.send(data, offer.locumId, 'Booking Confirmed',
            `Your booking at ${offer.practiceName} on ${DateUtils.format(offer.sessionDate, 'medium')} has been confirmed.`, 'booking_confirmed');
        saveMockData(data);
        return true;
    },

    // Mark session as complete (either party)
    markComplete(offerId, attended = true, completedBy = 'practice') {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        if (!['accepted', 'confirmed'].includes(offer.status)) return false;
        if (attended) {
            offer.status = 'completed';
            offer.completedDate = DateUtils.toISO(new Date());
            offer.completedBy = completedBy;
            const existingInvoice = data.invoices && data.invoices.find(i => i.offerId === offer.id);
            if (!existingInvoice) {
                InvoiceManager.generateFromOffer(data, offer);
            }
            this.addNotification(data, offer.locumId, 'leave_feedback', 'Leave Feedback',
                `Your session at ${offer.practiceName} is complete. Please leave feedback.`);
            this.addNotification(data, offer.practiceId, 'leave_feedback', 'Leave Feedback',
                `Please rate the locum who worked on ${DateUtils.format(offer.sessionDate, 'medium')}.`);
        } else {
            offer.status = 'no_show';
            offer.noShowDate = DateUtils.toISO(new Date());
            const locum = data.locums.find(l => l.id === offer.locumId);
            if (locum) locum.bookingReliability = Math.max(0, locum.bookingReliability - 10);
            this.addNotification(data, offer.locumId, 'no_show', 'No Show Recorded',
                `A no show was recorded at ${offer.practiceName} on ${DateUtils.format(offer.sessionDate, 'full')}. Your reliability score has been reduced by 10 points.`);
        }
        saveMockData(data);
        return true;
    },

    // Cancel a confirmed booking
    cancelBooking(offerId, cancelledBy) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        if (['cancelled', 'declined', 'withdrawn', 'expired'].includes(offer.status)) {
            return { error: 'already_cancelled', message: 'This booking has already been cancelled.' };
        }
        if (!['accepted', 'confirmed'].includes(offer.status)) return false;
        const daysBefore = Math.ceil((new Date(offer.sessionDate) - new Date()) / (1000 * 60 * 60 * 24));
        offer.status = 'cancelled';
        offer.cancelledBy = cancelledBy;
        offer.cancelledDate = DateUtils.toISO(new Date());
        offer.lateCancellation = daysBefore < 2;
        // Re-open session need
        if (data.sessionNeeds) {
            const need = data.sessionNeeds.find(n => n.id === offer.sessionNeedId);
            if (need) need.status = 'open';
        }
        // Late cancellation penalty for locum
        if (cancelledBy === 'locum' && offer.lateCancellation) {
            const locum = data.locums.find(l => l.id === offer.locumId);
            if (locum) locum.bookingReliability = Math.max(0, locum.bookingReliability - 5);
            this.addNotification(data, offer.locumId, 'late_cancellation', 'Late Cancellation Penalty',
                `Your cancellation at ${offer.practiceName} on ${DateUtils.format(offer.sessionDate, 'full')} was within 48 hours. Your reliability score has been reduced by 5 points.`);
        }
        const notifyId = cancelledBy === 'locum' ? offer.practiceId : offer.locumId;
        this.addNotification(data, notifyId, 'cancellation', 'Booking Cancelled',
            `The booking on ${DateUtils.format(offer.sessionDate, 'medium')} at ${offer.practiceName} has been cancelled.`);
        saveMockData(data);
        return true;
    },

    // Auto-expire offers past their expiry date
    expireOffers() {
        const data = getMockData();
        const now = new Date();
        let expired = 0;
        data.offers.filter(o => ['sent', 'viewed'].includes(o.status) && o.expiresAt && new Date(o.expiresAt) < now)
            .forEach(o => {
                o.status = 'expired';
                o.expiredDate = DateUtils.toISO(now);
                if (data.sessionNeeds) {
                    const need = data.sessionNeeds.find(n => n.id === o.sessionNeedId);
                    if (need && need.offersCount > 0) need.offersCount--;
                }
                this.addNotification(data, o.practiceId, 'offer_expired', 'Invitation Expired',
                    `Your invitation for ${DateUtils.format(o.sessionDate, 'medium')} has expired without a response.`);
                expired++;
            });
        if (expired > 0) saveMockData(data);
        return expired;
    },

    // Double-booking check with half-day awareness
    isDoubleBooked(locumId, date, excludeOfferId, sessionType) {
        const data = getMockData();
        return data.offers.some(o => {
            if (o.locumId !== locumId || o.sessionDate !== date) return false;
            if (!['accepted', 'confirmed'].includes(o.status)) return false;
            if (o.id === excludeOfferId) return false;
            if (sessionType && o.sessionType) {
                if (sessionType === 'Full Day' || o.sessionType === 'Full Day') return true;
                if (sessionType === o.sessionType) return true;
                return false; // AM + PM on same day is fine
            }
            return true;
        });
    },

    // Delete/cancel a session need
    deleteSessionNeed(needId) {
        const data = getMockData();
        if (!data.sessionNeeds) return { error: 'not_found', message: 'Session need not found' };
        const need = data.sessionNeeds.find(n => n.id === needId);
        if (!need) return { error: 'not_found', message: 'Session need not found' };
        // Check for accepted/confirmed offers
        const activeOffers = data.offers.filter(o => o.sessionNeedId === needId && ['accepted', 'confirmed'].includes(o.status));
        if (activeOffers.length > 0) {
            return { error: 'has_active_bookings', message: 'This session has confirmed bookings. Please cancel the booking first.' };
        }
        // Withdraw all pending/sent offers
        data.offers.filter(o => o.sessionNeedId === needId && ['sent', 'viewed', 'negotiating'].includes(o.status))
            .forEach(o => {
                o.status = 'withdrawn';
                o.autoWithdrawn = true;
                o.withdrawnDate = DateUtils.toISO(new Date());
                this.addNotification(data, o.locumId, 'offer_withdrawn', 'Invitation Withdrawn',
                    `The session at ${need.practiceName} on ${DateUtils.format(need.date, 'full')} has been cancelled.`);
            });
        need.status = 'cancelled';
        saveMockData(data);
        return { success: true };
    },

    // Get offers for a specific locum
    getOffersForLocum(locumId) {
        this.expireOffers();
        const data = getMockData();
        return data.offers.filter(o => o.locumId === locumId).sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate));
    },

    // Get offers for a specific practice
    getOffersForPractice(practiceId) {
        this.expireOffers();
        const data = getMockData();
        return data.offers.filter(o => o.practiceId === practiceId).sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate));
    },

    // Get offers for a specific session need
    getOffersForSessionNeed(needId) {
        const data = getMockData();
        return data.offers.filter(o => o.sessionNeedId === needId);
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

    addNotification(data, userId, type, title, message) {
        if (!data.notifications) data.notifications = [];
        data.notifications.push({
            id: 'notif-' + Date.now() + Math.random().toString(36).substr(2, 5),
            userId: userId,
            type: type,
            title: title,
            message: message,
            date: new Date().toISOString(),
            read: false
        });
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
    // Get the role of a user by their ID
    getUserRole(userId) {
        const data = getMockData();
        if (data.locums.find(l => l.id === userId)) return 'locum';
        if (data.practices.find(p => p.id === userId)) return 'practice';
        return null;
    },

    // Check if a locum can message (only reply — must have existing thread initiated by practice)
    canLocumMessage(locumId, practiceId) {
        const data = getMockData();
        if (!data.messages) return false;
        // Check if practice has ever sent a message to this locum (not deleted by locum)
        return data.messages.some(m =>
            m.fromId === practiceId && m.toId === locumId && !this._isDeletedFor(m, locumId)
        );
    },

    // Check if from/to is a valid messaging pair
    canSendMessage(fromId, toId) {
        const fromRole = this.getUserRole(fromId);
        const toRole = this.getUserRole(toId);
        // Same role cannot message each other
        if (fromRole === toRole) return { allowed: false, reason: fromRole === 'locum' ? 'GPs cannot message other GPs.' : 'Practices cannot message other practices.' };
        // Locum can only reply (practice must have messaged first)
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

        // Enforce messaging restrictions
        const check = this.canSendMessage(fromId, toId);
        if (!check.allowed) return { error: 'not_allowed', message: check.reason };

        const data = getMockData();
        if (!data.messages) data.messages = [];

        // Find existing thread between these two users (regardless of shiftId)
        // New thread only created if no thread exists or prior was deleted by sender
        const threadId = this._findActiveThread(data, fromId, toId) || ('thread-' + Date.now());

        data.messages.push({
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
        // Email notification
        EmailManager.send(data, toId, 'New Message: ' + (subject || 'Message'), body.length > 200 ? body.substring(0, 200) + '...' : body, 'message_received');
        Booking.addNotification(data, toId, 'message', 'New Message', 'You have a new message from ' + this.getUserName(fromId));
        saveMockData(data);
        return threadId;
    },

    // Send a system message (e.g. "Offer confirmed · Tue 07, 08:00–13:00")
    sendSystemMessage(threadId, fromId, toId, text) {
        const data = getMockData();
        if (!data.messages) data.messages = [];
        data.messages.push({
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
        saveMockData(data);
    },

    // Find an active (non-deleted) thread between two users
    _findActiveThread(data, user1, user2) {
        if (!data.messages) return null;
        // Get all messages between these two users that are not deleted for user1
        const relevantMsgs = data.messages.filter(m =>
            ((m.fromId === user1 && m.toId === user2) || (m.fromId === user2 && m.toId === user1)) &&
            !this._isDeletedFor(m, user1)
        );
        if (relevantMsgs.length === 0) return null;
        // Return the thread ID of the most recent message
        return relevantMsgs[relevantMsgs.length - 1].threadId;
    },

    // Delete a thread for one user only (soft delete)
    deleteThread(threadId, userId) {
        const data = getMockData();
        if (!data.messages) return;
        data.messages.forEach(m => {
            if (m.threadId === threadId) {
                if (!m._deletedFor) m._deletedFor = [];
                if (!m._deletedFor.includes(userId)) m._deletedFor.push(userId);
            }
        });
        // Clean up messages deleted for all participants
        data.messages = data.messages.filter(m => {
            if (m.threadId !== threadId) return true;
            const participants = new Set();
            data.messages.filter(mm => mm.threadId === threadId).forEach(mm => { participants.add(mm.fromId); participants.add(mm.toId); });
            return !Array.from(participants).every(p => m._deletedFor && m._deletedFor.includes(p));
        });
        saveMockData(data);
    },

    getThreads(userId) {
        const data = getMockData();
        if (!data.messages) return [];
        // Filter messages visible to this user (not deleted for them)
        const userMsgs = data.messages.filter(m =>
            (m.fromId === userId || m.toId === userId) && !this._isDeletedFor(m, userId)
        );
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
        const data = getMockData();
        if (!data.messages) return [];
        return data.messages.filter(m =>
            m.threadId === threadId && !this._isDeletedFor(m, userId)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    markThreadRead(threadId, userId) {
        const data = getMockData();
        if (!data.messages) return;
        data.messages.filter(m => m.threadId === threadId && m.toId === userId && !m.read)
            .forEach(m => { m.read = true; });
        saveMockData(data);
    },

    getUnreadCount(userId) {
        const data = getMockData();
        if (!data.messages) return 0;
        return data.messages.filter(m => m.toId === userId && !m.read && !this._isDeletedFor(m, userId)).length;
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
    send(data, toUserId, subject, body, type) {
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
    },

    getLog(userId) {
        const data = getMockData();
        if (!data.emailLog) return [];
        return data.emailLog.filter(e => e.toUserId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
};

// ---- Invoice Manager ----
const InvoiceManager = {
    generateFromOffer(data, offer) {
        if (!data.invoices) data.invoices = [];
        if (data.invoices.some(i => i.offerId === offer.id)) return; // Already generated
        const locum = data.locums.find(l => l.id === offer.locumId);
        const practice = data.practices.find(p => p.id === offer.practiceId);
        // Use agreed rate from negotiation, or proposed rate, or fall back to locum published rates
        const rate = offer.agreedRate || offer.proposedRate ||
            (offer.sessionType === 'Full Day' ? (locum ? locum.rates.fullDay : 0) :
            offer.sessionType === 'AM' ? (locum ? locum.rates.am : 0) : (locum ? locum.rates.pm : 0));
        const housecallFee = offer.housecalls ? (offer.housecallRate || (locum ? locum.rates.housecall : 0) || 0) : 0;
        const total = rate + housecallFee;
        const existingNums = data.invoices.map(i => parseInt((i.invoiceNumber || '').replace('GPRN-', '')) || 0);
        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 10001;
        const invNum = 'GPRN-' + nextNum;
        const sessionDate = offer.sessionDate || offer.shiftDate; // backwards compat
        data.invoices.push({
            id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            invoiceNumber: invNum,
            offerId: offer.id,
            locumId: offer.locumId,
            locumName: locum ? `${locum.title} ${locum.firstName} ${locum.lastName}` : 'Unknown',
            practiceId: offer.practiceId,
            practiceName: offer.practiceName,
            sessionDate: sessionDate,
            shiftDate: sessionDate, // kept for backwards compat with invoice display pages
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
        const data = getMockData();
        if (!data.invoices) return [];
        return data.invoices.filter(i => i.practiceId === practiceId).sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
    },

    getForLocum(locumId) {
        const data = getMockData();
        if (!data.invoices) return [];
        return data.invoices.filter(i => i.locumId === locumId).sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
    },

    updateStatus(invoiceId, status, reason) {
        const data = getMockData();
        const inv = data.invoices.find(i => i.id === invoiceId);
        if (!inv) return false;
        inv.status = status;
        if (status === 'paid' && !inv.paidDate) inv.paidDate = DateUtils.toISO(new Date());
        if (status === 'disputed') inv.disputeReason = reason;
        saveMockData(data);

        // Send message to the other party about the status change
        if (!data.messages) data.messages = [];
        const threadId = MessageManager._findActiveThread(data, inv.practiceId, inv.locumId)
            || MessageManager._findActiveThread(data, inv.locumId, inv.practiceId)
            || ('thread-' + Date.now());

        if (status === 'paid') {
            // Direct paid (used by confirmPayment) — notify locum: payment confirmed
            data.messages.push({
                id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
                threadId,
                fromId: inv.locumId,
                toId: inv.practiceId,
                subject: '',
                body: `Payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) has been confirmed by the locum. This invoice is now complete.`,
                shiftId: null,
                timestamp: new Date().toISOString(),
                read: false,
                _deletedFor: [],
                _system: true
            });
            Booking.addNotification(data, inv.practiceId, 'payment_confirmed', 'Payment Confirmed',
                `${inv.locumName} has confirmed receipt of payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}).`);
        }

        if (status === 'paid_pending') {
            // Practice says they've paid — locum must confirm receipt
            inv.practiceMarkedPaidDate = DateUtils.toISO(new Date());
            data.messages.push({
                id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
                threadId,
                fromId: inv.practiceId,
                toId: inv.locumId,
                subject: '',
                body: `${inv.practiceName} has marked invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) as paid. Please confirm you have received the payment.`,
                shiftId: null,
                timestamp: new Date().toISOString(),
                read: false,
                _deletedFor: [],
                _system: true,
                _invoiceId: inv.id
            });
            Booking.addNotification(data, inv.locumId, 'payment_awaiting_confirmation', 'Payment Awaiting Confirmation',
                `${inv.practiceName} has marked invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) as paid. Please confirm receipt.`);
            EmailManager.send(data, inv.locumId, 'Confirm Payment Received: ' + inv.invoiceNumber, `${inv.practiceName} has marked invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} as paid. Please log in and confirm you have received the payment.`, 'payment_awaiting_confirmation');
        }

        if (status === 'disputed') {
            // Send dispute message to locum with reason
            data.messages.push({
                id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
                threadId,
                fromId: inv.practiceId,
                toId: inv.locumId,
                subject: 'Invoice Disputed: ' + inv.invoiceNumber,
                body: `Invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) has been disputed.\n\nReason: ${reason}`,
                shiftId: null,
                timestamp: new Date().toISOString(),
                read: false,
                _deletedFor: [],
                _invoiceId: inv.id
            });
            Booking.addNotification(data, inv.locumId, 'invoice_disputed', 'Invoice Disputed',
                `${inv.practiceName} has disputed invoice ${inv.invoiceNumber}. Check your messages.`);
            EmailManager.send(data, inv.locumId, 'Invoice Disputed: ' + inv.invoiceNumber,
                `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} has been disputed by ${inv.practiceName}. Reason: ${reason}`, 'invoice_disputed');
        }

        saveMockData(data);
        return true;
    },

    // GP revises invoice amount after dispute discussion
    reviseAmount(invoiceId, newAmount) {
        const data = getMockData();
        const inv = data.invoices.find(i => i.id === invoiceId);
        if (!inv || inv.status !== 'disputed') return false;
        inv.originalTotal = inv.originalTotal || inv.total;
        inv.revisedTotal = newAmount;
        inv.status = 'revised';
        saveMockData(data);

        // Message practice about revision
        if (!data.messages) data.messages = [];
        const threadId = MessageManager._findActiveThread(data, inv.locumId, inv.practiceId)
            || MessageManager._findActiveThread(data, inv.practiceId, inv.locumId)
            || ('thread-' + Date.now());
        data.messages.push({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId,
            fromId: inv.locumId,
            toId: inv.practiceId,
            subject: 'Invoice Revised: ' + inv.invoiceNumber,
            body: `Invoice ${inv.invoiceNumber} has been revised.\n\nOriginal amount: ${formatCurrency(inv.originalTotal)}\nRevised amount: ${formatCurrency(newAmount)}\n\nPlease review and approve the revised amount.`,
            shiftId: null,
            timestamp: new Date().toISOString(),
            read: false,
            _deletedFor: [],
            _invoiceId: inv.id
        });
        Booking.addNotification(data, inv.practiceId, 'invoice_revised', 'Invoice Revised',
            `Invoice ${inv.invoiceNumber} has been revised to ${formatCurrency(newAmount)}. Please review.`);
        EmailManager.send(data, inv.practiceId, 'Invoice Revised: ' + inv.invoiceNumber,
            `Invoice ${inv.invoiceNumber} has been revised from ${formatCurrency(inv.originalTotal)} to ${formatCurrency(newAmount)}. Please log in to review and approve.`, 'invoice_revised');
        saveMockData(data);
        return true;
    },

    // Practice approves revised amount — invoice goes to pending with new total
    approveRevision(invoiceId) {
        const data = getMockData();
        const inv = data.invoices.find(i => i.id === invoiceId);
        if (!inv || inv.status !== 'revised') return false;
        inv.total = inv.revisedTotal;
        inv.sessionRate = inv.revisedTotal;
        inv.status = 'pending';
        delete inv.revisedTotal;
        saveMockData(data);

        // Notify GP that revision was approved
        if (!data.messages) data.messages = [];
        const threadId = MessageManager._findActiveThread(data, inv.practiceId, inv.locumId)
            || MessageManager._findActiveThread(data, inv.locumId, inv.practiceId)
            || ('thread-' + Date.now());
        data.messages.push({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId,
            fromId: inv.practiceId,
            toId: inv.locumId,
            subject: '',
            body: `Revised amount of ${formatCurrency(inv.total)} for invoice ${inv.invoiceNumber} has been approved. Payment will follow.`,
            shiftId: null,
            timestamp: new Date().toISOString(),
            read: false,
            _deletedFor: [],
            _system: true,
            _invoiceId: inv.id
        });
        Booking.addNotification(data, inv.locumId, 'revision_approved', 'Revision Approved',
            `${inv.practiceName} has approved the revised amount of ${formatCurrency(inv.total)} for invoice ${inv.invoiceNumber}.`);
        EmailManager.send(data, inv.locumId, 'Revision Approved: ' + inv.invoiceNumber,
            `The revised amount of ${formatCurrency(inv.total)} for invoice ${inv.invoiceNumber} has been approved by ${inv.practiceName}.`, 'revision_approved');
        saveMockData(data);
        return true;
    },

    // Practice rejects revised amount — back to disputed for further discussion
    rejectRevision(invoiceId, reason) {
        const data = getMockData();
        const inv = data.invoices.find(i => i.id === invoiceId);
        if (!inv || inv.status !== 'revised') return false;
        inv.status = 'disputed';
        inv.disputeReason = reason || inv.disputeReason;
        delete inv.revisedTotal;
        saveMockData(data);

        // Notify GP that revision was rejected
        if (!data.messages) data.messages = [];
        const threadId = MessageManager._findActiveThread(data, inv.practiceId, inv.locumId)
            || MessageManager._findActiveThread(data, inv.locumId, inv.practiceId)
            || ('thread-' + Date.now());
        data.messages.push({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId,
            fromId: inv.practiceId,
            toId: inv.locumId,
            subject: 'Revision Rejected: ' + inv.invoiceNumber,
            body: `The revised amount for invoice ${inv.invoiceNumber} has been rejected.${reason ? '\n\nReason: ' + reason : ''}\n\nPlease discuss further and submit a new revision.`,
            shiftId: null,
            timestamp: new Date().toISOString(),
            read: false,
            _deletedFor: [],
            _invoiceId: inv.id
        });
        Booking.addNotification(data, inv.locumId, 'revision_rejected', 'Revision Rejected',
            `${inv.practiceName} has rejected the revised amount for invoice ${inv.invoiceNumber}. Check your messages.`);
        EmailManager.send(data, inv.locumId, 'Revision Rejected: ' + inv.invoiceNumber,
            `The revised amount for invoice ${inv.invoiceNumber} has been rejected by ${inv.practiceName}. Please discuss further.`, 'revision_rejected');
        saveMockData(data);
        return true;
    },

    chasePayment(invoiceId) {
        const data = getMockData();
        const inv = data.invoices.find(i => i.id === invoiceId);
        if (!inv) return false;
        inv.status = 'overdue';
        saveMockData(data);

        // Send message to practice inbox (bypasses locum-can't-initiate restriction for system invoicing)
        if (!data.messages) data.messages = [];
        const threadId = MessageManager._findActiveThread(data, inv.locumId, inv.practiceId)
            || MessageManager._findActiveThread(data, inv.practiceId, inv.locumId)
            || ('thread-' + Date.now());
        // Add invoice reminder message with _invoiceId metadata for linking
        data.messages.push({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId,
            fromId: inv.locumId,
            toId: inv.practiceId,
            subject: 'Payment Reminder: ' + inv.invoiceNumber,
            body: `Payment reminder for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) for ${inv.sessionType} session on ${DateUtils.format(inv.sessionDate || inv.shiftDate, 'medium')}. Payment was due on ${DateUtils.format(inv.dueDate, 'medium')}. Please review and arrange payment.`,
            shiftId: null,
            timestamp: new Date().toISOString(),
            read: false,
            _deletedFor: [],
            _invoiceId: inv.id
        });
        // Dashboard notification for the practice
        Booking.addNotification(data, inv.practiceId, 'payment_reminder', 'Payment Reminder',
            `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} is overdue. Check your messages.`);
        // Email notification
        EmailManager.send(data, inv.practiceId, 'Payment Reminder: ' + inv.invoiceNumber,
            `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} is overdue. Session: ${DateUtils.format(inv.sessionDate || inv.shiftDate, 'medium')}, Locum: ${inv.locumName}. Please log in to review.`, 'payment_reminder');
        saveMockData(data);
        return true;
    },

    // GP confirms they received the payment — finalises invoice as paid
    confirmPayment(invoiceId) {
        const data = getMockData();
        const inv = data.invoices.find(i => i.id === invoiceId);
        if (!inv || inv.status !== 'paid_pending') return false;
        inv.status = 'paid';
        inv.paidDate = inv.practiceMarkedPaidDate || DateUtils.toISO(new Date());
        inv.confirmedDate = DateUtils.toISO(new Date());
        saveMockData(data);

        // Notify practice via message and notification
        if (!data.messages) data.messages = [];
        const threadId = MessageManager._findActiveThread(data, inv.locumId, inv.practiceId)
            || MessageManager._findActiveThread(data, inv.practiceId, inv.locumId)
            || ('thread-' + Date.now());
        data.messages.push({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId,
            fromId: inv.locumId,
            toId: inv.practiceId,
            subject: '',
            body: `Payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) has been confirmed. Thank you.`,
            shiftId: null,
            timestamp: new Date().toISOString(),
            read: false,
            _deletedFor: [],
            _system: true
        });
        Booking.addNotification(data, inv.practiceId, 'payment_confirmed', 'Payment Confirmed',
            `${inv.locumName} has confirmed receipt of payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}).`);
        EmailManager.send(data, inv.practiceId, 'Payment Confirmed: ' + inv.invoiceNumber,
            `${inv.locumName} has confirmed receipt of payment for invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}). This invoice is now complete.`, 'payment_confirmed');
        saveMockData(data);
        return true;
    },

    // Auto-detect and flag overdue invoices, create notifications
    checkOverdue(locumId) {
        const data = getMockData();
        if (!data.invoices) return { count: 0, total: 0, invoices: [] };
        const now = new Date();
        let changed = false;
        const overdueInvoices = [];
        data.invoices.forEach(inv => {
            if (inv.locumId === locumId && inv.status === 'pending' && inv.dueDate) {
                const due = new Date(inv.dueDate);
                if (due < now) {
                    inv.status = 'overdue';
                    changed = true;
                    overdueInvoices.push(inv);
                    // Only notify if not already notified (check existing notifications)
                    const existingNotif = (data.notifications || []).find(n =>
                        n.userId === locumId && n.type === 'invoice_overdue' && n.message && n.message.includes(inv.invoiceNumber)
                    );
                    if (!existingNotif) {
                        Booking.addNotification(data, locumId, 'invoice_overdue', 'Invoice Overdue',
                            `Invoice ${inv.invoiceNumber} (${formatCurrency(inv.total)}) to ${inv.practiceName} is past due. Consider sending a payment reminder.`);
                        // Also notify the practice
                        Booking.addNotification(data, inv.practiceId, 'payment_reminder', 'Payment Overdue',
                            `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} from ${inv.locumName} is overdue.`);
                    }
                }
            }
        });
        if (changed) saveMockData(data);
        // Return all overdue invoices for this locum (including previously flagged)
        const allOverdue = data.invoices.filter(i => i.locumId === locumId && i.status === 'overdue');
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
        const data = getMockData();
        if (!data.feedback) data.feedback = [];
        data.feedback.push({
            id: 'fb-' + Date.now(),
            fromId,
            toId,
            offerId,
            ratings,
            comment,
            fromRole,
            timestamp: new Date().toISOString()
        });
        saveMockData(data);
        return true;
    },

    getForUser(userId) {
        const data = getMockData();
        if (!data.feedback) return [];
        return data.feedback.filter(f => f.toId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    getAverageRating(userId) {
        const reviews = this.getForUser(userId);
        if (reviews.length === 0) return null;
        const allScores = reviews.flatMap(r => Object.values(r.ratings || {})).filter(v => typeof v === 'number' && !isNaN(v));
        if (allScores.length === 0) return null;
        return (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
    },

    hasReviewed(fromId, offerId) {
        const data = getMockData();
        if (!data.feedback) return false;
        return data.feedback.some(f => f.fromId === fromId && f.offerId === offerId);
    }
};

// ---- Barred/Preferred List Manager ----
const BarredList = {
    bar(practiceId, locumId, reason) {
        const data = getMockData();
        if (!data.barredLists) data.barredLists = {};
        if (!data.barredLists[practiceId]) data.barredLists[practiceId] = [];
        if (!this.isBarred(practiceId, locumId)) {
            data.barredLists[practiceId].push({ locumId, reason, date: DateUtils.toISO(new Date()) });
            saveMockData(data);
        }
    },

    unbar(practiceId, locumId) {
        const data = getMockData();
        if (!data.barredLists || !data.barredLists[practiceId]) return;
        data.barredLists[practiceId] = data.barredLists[practiceId].filter(b => b.locumId !== locumId);
        saveMockData(data);
    },

    isBarred(practiceId, locumId) {
        const data = getMockData();
        if (!data.barredLists || !data.barredLists[practiceId]) return false;
        return data.barredLists[practiceId].some(b => b.locumId === locumId);
    },

    getBarredList(practiceId) {
        const data = getMockData();
        if (!data.barredLists) return [];
        return data.barredLists[practiceId] || [];
    },

    getBarredPracticesForLocum(locumId) {
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
        const data = getMockData();
        if (!data.barredLists || !data.barredLists[practiceId]) return null;
        const entry = data.barredLists[practiceId].find(b => b.locumId === locumId);
        return entry ? entry.reason : null;
    },

    addPreferred(practiceId, locumId) {
        const data = getMockData();
        if (!data.preferredLists) data.preferredLists = {};
        if (!data.preferredLists[practiceId]) data.preferredLists[practiceId] = [];
        if (!this.isPreferred(practiceId, locumId)) {
            data.preferredLists[practiceId].push(locumId);
            saveMockData(data);
        }
    },

    removePreferred(practiceId, locumId) {
        const data = getMockData();
        if (!data.preferredLists || !data.preferredLists[practiceId]) return;
        data.preferredLists[practiceId] = data.preferredLists[practiceId].filter(id => id !== locumId);
        saveMockData(data);
    },

    isPreferred(practiceId, locumId) {
        const data = getMockData();
        if (!data.preferredLists || !data.preferredLists[practiceId]) return false;
        return data.preferredLists[practiceId].includes(locumId);
    }
};

// ---- Availability Manager (half-day granularity) ----
// Each date stores { am: status, pm: status } where status is 'available', 'unavailable', or 'preferred'
const Availability = {
    set(locumId, date, session, status) {
        // session: 'am', 'pm', or 'both'
        const data = getMockData();
        if (!data.availability) data.availability = {};
        if (!data.availability[locumId]) data.availability[locumId] = {};

        if (session === 'both') {
            if (status === 'none') {
                delete data.availability[locumId][date];
            } else {
                data.availability[locumId][date] = { am: status, pm: status };
            }
        } else {
            if (!data.availability[locumId][date] || typeof data.availability[locumId][date] === 'string') {
                // Migrate old format (simple string) to new format
                const old = data.availability[locumId][date];
                data.availability[locumId][date] = { am: old || 'none', pm: old || 'none' };
            }
            if (status === 'none') {
                data.availability[locumId][date][session] = 'none';
                // Clean up if both are none
                if (data.availability[locumId][date].am === 'none' && data.availability[locumId][date].pm === 'none') {
                    delete data.availability[locumId][date];
                }
            } else {
                data.availability[locumId][date][session] = status;
            }
        }
        saveMockData(data);
    },

    get(locumId, date, session) {
        const data = getMockData();
        if (!data.availability || !data.availability[locumId]) return 'none';
        const entry = data.availability[locumId][date];
        if (!entry) return 'none';
        // Handle old string format gracefully
        if (typeof entry === 'string') {
            return session ? entry : entry;
        }
        if (session) return entry[session] || 'none';
        // Return combined status: if both same return that, otherwise 'mixed'
        if (entry.am === entry.pm) return entry.am || 'none';
        return 'mixed';
    },

    getSlot(locumId, date) {
        // Returns the full { am, pm } object for a date
        const data = getMockData();
        if (!data.availability || !data.availability[locumId]) return { am: 'none', pm: 'none' };
        const entry = data.availability[locumId][date];
        if (!entry) return { am: 'none', pm: 'none' };
        if (typeof entry === 'string') return { am: entry, pm: entry };
        return { am: entry.am || 'none', pm: entry.pm || 'none' };
    },

    getAll(locumId) {
        const data = getMockData();
        if (!data.availability) return {};
        return data.availability[locumId] || {};
    },

    // Check if locum is available for a specific session type on a date
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

    // Get all available dates for a locum within a range
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
