// ===== GPRN Core Application Logic =====

// ---- Auth Manager ----
const Auth = {
    login(email, password, expectedRole) {
        const data = getMockData();
        const allUsers = [...data.locums, ...data.practices];
        const user = allUsers.find(u => u.email === email && u.password === password);
        if (user) {
            if (expectedRole && user.role !== expectedRole) {
                return { error: 'wrong_role', actualRole: user.role };
            }
            const session = {
                id: user.id,
                role: user.role,
                email: user.email,
                name: user.role === 'locum'
                    ? `${user.title} ${user.firstName} ${user.lastName}`
                    : user.practiceName,
                firstName: user.role === 'locum' ? user.firstName : user.contactName.split(' ')[0]
            };
            localStorage.setItem('gprn_session', JSON.stringify(session));
            return session;
        }
        return null;
    },

    logout() {
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
            <span class="toast-message">${message}</span>
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
        pending: 'badge-warning',
        accepted: 'badge-success',
        confirmed: 'badge-success',
        withdrawn: 'badge-neutral',
        completed: 'badge-info',
        open: 'badge-success',
        filled: 'badge-info',
        expired: 'badge-neutral',
        cancelled: 'badge-danger',
        paid: 'badge-success',
        overdue: 'badge-danger',
        disputed: 'badge-info',
        declined: 'badge-danger',
        no_show: 'badge-danger',
        acknowledged: 'badge-success',
        negotiating: 'badge-warning',
        rejected_by_locum: 'badge-danger'
    };
    return map[status] || 'badge-neutral';
}

// ---- Booking Manager ----
const Booking = {
    acceptOffer(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        offer.status = 'accepted';
        offer.acceptedDate = DateUtils.toISO(new Date());
        // Mark shift as filled
        const shift = data.shifts.find(s => s.id === offer.shiftId);
        if (shift) shift.status = 'filled';
        // Auto-withdraw other pending offers for same shift
        data.offers.filter(o => o.shiftId === offer.shiftId && o.id !== offerId && o.status === 'pending')
            .forEach(o => { o.status = 'declined'; });
        // Auto-withdraw locum's other offers for same date
        data.offers.filter(o => o.locumId === offer.locumId && o.shiftDate === offer.shiftDate && o.id !== offerId && o.status === 'pending')
            .forEach(o => { o.status = 'withdrawn'; o.autoWithdrawn = true; });
        // Generate notification
        this.addNotification(data, offer.locumId, 'offer_accepted', 'Offer Accepted',
            `${offer.practiceName} has accepted your offer for ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        // Generate email
        EmailManager.send(data, offer.locumId, 'Offer Accepted', `Your offer at ${offer.practiceName} for ${DateUtils.format(offer.shiftDate, 'medium')} has been accepted.`, 'offer_accepted');
        saveMockData(data);
        return true;
    },

    declineOffer(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        offer.status = 'declined';
        offer.declinedDate = DateUtils.toISO(new Date());
        // Decrement the shift's applicant count
        const shift = data.shifts.find(s => s.id === offer.shiftId);
        if (shift && shift.applicants > 0) {
            shift.applicants--;
        }
        this.addNotification(data, offer.locumId, 'offer_declined', 'Offer Declined',
            `${offer.practiceName} has declined your offer for ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        EmailManager.send(data, offer.locumId, 'Offer Declined', `Your offer at ${offer.practiceName} for ${DateUtils.format(offer.shiftDate, 'medium')} was not successful.`, 'offer_declined');
        saveMockData(data);
        return true;
    },

    confirmAttendance(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        offer.status = 'confirmed';
        offer.confirmedDate = DateUtils.toISO(new Date());
        saveMockData(data);
        return true;
    },

    markComplete(offerId, attended = true) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        if (attended) {
            offer.status = 'completed';
            offer.completedDate = DateUtils.toISO(new Date());
            // Auto-generate invoice
            InvoiceManager.generateFromOffer(data, offer);
            // Prompt for feedback
            this.addNotification(data, offer.locumId, 'leave_feedback', 'Leave Feedback',
                `Your shift at ${offer.practiceName} is complete. Please leave feedback.`);
            this.addNotification(data, offer.practiceId, 'leave_feedback', 'Leave Feedback',
                `Please rate the locum who worked on ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        } else {
            offer.status = 'no_show';
            offer.noShowDate = DateUtils.toISO(new Date());
            // Affect reliability
            const locum = data.locums.find(l => l.id === offer.locumId);
            if (locum) locum.bookingReliability = Math.max(0, locum.bookingReliability - 10);
            this.addNotification(data, offer.locumId, 'no_show', 'No-Show Recorded',
                `A no-show was recorded for your shift at ${offer.practiceName} on ${DateUtils.format(offer.shiftDate, 'medium')}. Your reliability score has been affected.`);
        }
        saveMockData(data);
        return true;
    },

    cancelShift(offerId, cancelledBy) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        const daysBefore = Math.ceil((new Date(offer.shiftDate) - new Date()) / (1000*60*60*24));
        offer.status = 'cancelled';
        offer.cancelledBy = cancelledBy;
        offer.cancelledDate = DateUtils.toISO(new Date());
        offer.lateCancellation = daysBefore < 2;
        // Re-open shift
        const shift = data.shifts.find(s => s.id === offer.shiftId);
        if (shift) shift.status = 'open';
        // Late cancellation penalty
        if (cancelledBy === 'locum' && offer.lateCancellation) {
            const locum = data.locums.find(l => l.id === offer.locumId);
            if (locum) locum.bookingReliability = Math.max(0, locum.bookingReliability - 5);
        }
        const notifyId = cancelledBy === 'locum' ? offer.practiceId : offer.locumId;
        this.addNotification(data, notifyId, 'cancellation', 'Shift Cancelled',
            `The shift on ${DateUtils.format(offer.shiftDate, 'medium')} at ${offer.practiceName} has been cancelled.`);
        saveMockData(data);
        return true;
    },

    isDoubleBooked(locumId, date, excludeOfferId) {
        const data = getMockData();
        return data.offers.some(o => o.locumId === locumId && o.shiftDate === date &&
            ['accepted', 'confirmed'].includes(o.status) && o.id !== excludeOfferId);
    },

    acknowledgeOffer(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer || offer.status !== 'accepted') return false;
        offer.status = 'acknowledged';
        offer.acknowledgedDate = DateUtils.toISO(new Date());
        this.addNotification(data, offer.practiceId, 'offer_accepted', 'Offer Acknowledged',
            `The locum has acknowledged the shift on ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        EmailManager.send(data, offer.practiceId, 'Offer Acknowledged',
            `The locum has acknowledged and confirmed they will attend the shift on ${DateUtils.format(offer.shiftDate, 'medium')}.`, 'offer_acknowledged');
        saveMockData(data);
        return true;
    },

    rejectAcceptedOffer(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer || !['accepted', 'acknowledged', 'confirmed'].includes(offer.status)) return false;
        const daysBefore = Math.ceil((new Date(offer.shiftDate) - new Date()) / (1000*60*60*24));
        offer.status = 'rejected_by_locum';
        offer.rejectedDate = DateUtils.toISO(new Date());
        offer.lateCancellation = daysBefore < 2;
        if (offer.lateCancellation) {
            const locum = data.locums.find(l => l.id === offer.locumId);
            if (locum) locum.bookingReliability = Math.max(0, locum.bookingReliability - 5);
        }
        const shift = data.shifts.find(s => s.id === offer.shiftId);
        if (shift) shift.status = 'open';
        this.addNotification(data, offer.practiceId, 'cancellation', 'Locum Rejected Shift',
            `The locum has rejected the previously accepted shift on ${DateUtils.format(offer.shiftDate, 'medium')}. The shift has been automatically relisted.`);
        EmailManager.send(data, offer.practiceId, 'Shift Relisted',
            `The locum has rejected the shift on ${DateUtils.format(offer.shiftDate, 'medium')}. The shift has been automatically relisted.`, 'shift_relisted');
        saveMockData(data);
        return true;
    },

    confirmCompletion(offerId) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer || !['accepted', 'acknowledged', 'confirmed'].includes(offer.status)) return false;
        offer.status = 'completed';
        offer.completedDate = DateUtils.toISO(new Date());
        offer.completedByLocum = true;
        InvoiceManager.generateFromOffer(data, offer);
        this.addNotification(data, offer.practiceId, 'shift_confirmed', 'Shift Completed',
            `The locum has confirmed completion of the shift on ${DateUtils.format(offer.shiftDate, 'medium')}. An invoice has been generated.`);
        this.addNotification(data, offer.locumId, 'leave_feedback', 'Leave Feedback',
            `Your shift at ${offer.practiceName} is complete. Please leave feedback.`);
        this.addNotification(data, offer.practiceId, 'leave_feedback', 'Leave Feedback',
            `Please rate the locum who worked on ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        EmailManager.send(data, offer.practiceId, 'Shift Completed',
            `The shift on ${DateUtils.format(offer.shiftDate, 'medium')} has been confirmed as completed. An invoice has been generated.`, 'shift_completed');
        saveMockData(data);
        return true;
    },

    counterOffer(offerId, counterRate, message) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        if (!offer.negotiations) offer.negotiations = [];
        offer.negotiations.push({ from: 'practice', rate: counterRate, message: message, date: new Date().toISOString() });
        offer.status = 'negotiating';
        offer.counterRate = counterRate;
        this.addNotification(data, offer.locumId, 'new_offer', 'Rate Counter-Offer',
            `${offer.practiceName} has proposed a rate of ${formatCurrency(counterRate)} for the shift on ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        EmailManager.send(data, offer.locumId, 'Rate Counter-Offer',
            `${offer.practiceName} has proposed a different rate for your shift on ${DateUtils.format(offer.shiftDate, 'medium')}. Please review in your offers.`, 'counter_offer');
        saveMockData(data);
        return true;
    },

    respondToCounter(offerId, accepted, counterRate, message) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        if (!offer.negotiations) offer.negotiations = [];
        if (accepted) {
            const agreedRate = offer.counterRate;
            if (offer.sessionType === 'AM') offer.rateAM = agreedRate;
            else if (offer.sessionType === 'PM') offer.ratePM = agreedRate;
            else offer.rateFullDay = agreedRate;
            offer.agreedRate = agreedRate;
            offer.status = 'pending';
            offer.negotiations.push({ from: 'locum', accepted: true, rate: agreedRate, message: message || 'Rate accepted', date: new Date().toISOString() });
            this.addNotification(data, offer.practiceId, 'offer_accepted', 'Rate Agreed',
                `The locum has accepted the proposed rate of ${formatCurrency(agreedRate)} for ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        } else {
            offer.negotiations.push({ from: 'locum', rate: counterRate, message: message, date: new Date().toISOString() });
            offer.counterRate = counterRate;
            this.addNotification(data, offer.practiceId, 'new_offer', 'Rate Counter-Offer',
                `The locum has proposed a rate of ${formatCurrency(counterRate)} for the shift on ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        }
        saveMockData(data);
        return true;
    },

    practiceRespondToCounter(offerId, accepted, counterRate, message) {
        const data = getMockData();
        const offer = data.offers.find(o => o.id === offerId);
        if (!offer) return false;
        if (!offer.negotiations) offer.negotiations = [];
        if (accepted) {
            const agreedRate = offer.counterRate;
            if (offer.sessionType === 'AM') offer.rateAM = agreedRate;
            else if (offer.sessionType === 'PM') offer.ratePM = agreedRate;
            else offer.rateFullDay = agreedRate;
            offer.agreedRate = agreedRate;
            offer.status = 'pending';
            offer.negotiations.push({ from: 'practice', accepted: true, rate: agreedRate, message: message || 'Rate accepted', date: new Date().toISOString() });
            this.addNotification(data, offer.locumId, 'offer_accepted', 'Rate Agreed',
                `${offer.practiceName} has accepted the proposed rate of ${formatCurrency(agreedRate)} for ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        } else {
            offer.negotiations.push({ from: 'practice', rate: counterRate, message: message, date: new Date().toISOString() });
            offer.counterRate = counterRate;
            this.addNotification(data, offer.locumId, 'new_offer', 'Rate Counter-Offer',
                `${offer.practiceName} has proposed a rate of ${formatCurrency(counterRate)} for the shift on ${DateUtils.format(offer.shiftDate, 'medium')}.`);
        }
        saveMockData(data);
        return true;
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

// ---- Message Manager ----
const MessageManager = {
    send(fromId, toId, subject, body, shiftId) {
        const data = getMockData();
        if (!data.messages) data.messages = [];
        const threadId = this.findThread(data, fromId, toId, shiftId) || ('thread-' + Date.now());
        data.messages.push({
            id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
            threadId,
            fromId,
            toId,
            subject,
            body,
            shiftId: shiftId || null,
            timestamp: new Date().toISOString(),
            read: false
        });
        // Email notification
        EmailManager.send(data, toId, 'New Message: ' + subject, body.substring(0, 100) + '...', 'message_received');
        Booking.addNotification(data, toId, 'message', 'New Message', `You have a new message: "${subject}"`);
        saveMockData(data);
        return threadId;
    },

    findThread(data, user1, user2, shiftId) {
        if (!data.messages) return null;
        const msg = data.messages.find(m =>
            ((m.fromId === user1 && m.toId === user2) || (m.fromId === user2 && m.toId === user1)) &&
            (shiftId ? m.shiftId === shiftId : true)
        );
        return msg ? msg.threadId : null;
    },

    getThreads(userId) {
        const data = getMockData();
        if (!data.messages) return [];
        const userMsgs = data.messages.filter(m => m.fromId === userId || m.toId === userId);
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

    getThread(threadId) {
        const data = getMockData();
        if (!data.messages) return [];
        return data.messages.filter(m => m.threadId === threadId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
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
        return data.messages.filter(m => m.toId === userId && !m.read).length;
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
        const locum = data.locums.find(l => l.id === offer.locumId);
        const practice = data.practices.find(p => p.id === offer.practiceId);
        const rate = offer.sessionType === 'Full Day' ? (offer.rateFullDay || locum.rates.fullDay) :
            offer.sessionType === 'AM' ? (offer.rateAM || locum.rates.am) : (offer.ratePM || locum.rates.pm);
        const housecallFee = offer.housecalls ? (offer.rateHousecall || locum.rates.housecall || 0) : 0;
        const total = rate + housecallFee;
        const existingNums = data.invoices.map(i => parseInt((i.invoiceNumber || '').replace('GPRN-', '')) || 0);
        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 10001;
        const invNum = 'GPRN-' + nextNum;
        data.invoices.push({
            id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            invoiceNumber: invNum,
            offerId: offer.id,
            locumId: offer.locumId,
            locumName: locum ? `${locum.title} ${locum.firstName} ${locum.lastName}` : 'Unknown',
            practiceId: offer.practiceId,
            practiceName: offer.practiceName,
            shiftDate: offer.shiftDate,
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
        if (status === 'paid') inv.paidDate = DateUtils.toISO(new Date());
        if (status === 'disputed') inv.disputeReason = reason;
        saveMockData(data);
        try {
            if (status === 'paid') {
                EmailManager.send(data, inv.locumId, 'Payment Received', `Payment of ${formatCurrency(inv.total)} for shift on ${DateUtils.format(inv.shiftDate, 'medium')} at ${inv.practiceName} has been received.`, 'payment_received');
                saveMockData(data);
            }
        } catch(e) { /* email notification is non-critical */ }
        return true;
    },

    chasePayment(invoiceId) {
        const data = getMockData();
        const inv = data.invoices.find(i => i.id === invoiceId);
        if (!inv) return false;
        inv.status = 'overdue';
        EmailManager.send(data, inv.practiceId, 'Payment Reminder', `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} is overdue. Shift: ${DateUtils.format(inv.shiftDate, 'medium')}, Locum: ${inv.locumName}.`, 'payment_reminder');
        Booking.addNotification(data, inv.practiceId, 'payment_reminder', 'Payment Reminder',
            `Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} is overdue.`);
        saveMockData(data);
        return true;
    }
};

// ---- Feedback Manager ----
const FeedbackManager = {
    submit(fromId, toId, offerId, ratings, comment, fromRole) {
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
        const allScores = reviews.flatMap(r => Object.values(r.ratings));
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

// ---- Availability Manager ----
const Availability = {
    set(locumId, date, status) { // status: 'available', 'unavailable', 'preferred'
        const data = getMockData();
        if (!data.availability) data.availability = {};
        if (!data.availability[locumId]) data.availability[locumId] = {};
        if (status === 'none') {
            delete data.availability[locumId][date];
        } else {
            data.availability[locumId][date] = status;
        }
        saveMockData(data);
    },

    get(locumId, date) {
        const data = getMockData();
        if (!data.availability || !data.availability[locumId]) return 'none';
        return data.availability[locumId][date] || 'none';
    },

    getAll(locumId) {
        const data = getMockData();
        if (!data.availability) return {};
        return data.availability[locumId] || {};
    }
};

// ---- Page init helper ----
function initPage(role) {
    if (!Auth.requireAuth(role)) return false;
    initMockData();
    return true;
}
