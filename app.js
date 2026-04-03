// ===== GPRN Core Application Logic =====

// ---- Auth Manager ----
const Auth = {
    login(email, password) {
        const data = getMockData();
        const allUsers = [...data.locums, ...data.practices];
        const user = allUsers.find(u => u.email === email && u.password === password);
        if (user) {
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
        cancelled: 'badge-danger'
    };
    return map[status] || 'badge-neutral';
}

// ---- Page init helper ----
function initPage(role) {
    if (!Auth.requireAuth(role)) return false;
    initMockData();
    return true;
}
