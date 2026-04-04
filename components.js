// ===== GPRN Shared Components =====

// ---- Sidebar Navigation ----
function renderSidebar(role, activePage) {
    const session = Auth.getSession();
    const locumNav = [
        { id: 'dashboard', label: 'Dashboard', icon: 'grid', href: 'locum-dashboard.html' },
        { id: 'shifts', label: 'Available Shifts', icon: 'search', href: 'available-shifts.html' },
        { id: 'calendar', label: 'My Calendar', icon: 'calendar', href: 'my-calendar.html' },
        { id: 'offers', label: 'My Offers', icon: 'file-text', href: 'my-offers.html' },
        { id: 'rates', label: 'My Rates', icon: 'pound', href: 'my-rates.html' },
        { id: 'profile', label: 'My Profile', icon: 'user', href: 'my-profile.html' },
        { id: 'report', label: 'Report Extra Shifts', icon: 'plus-circle', href: 'report-extra-shifts.html' },
        { id: 'invoices', label: 'My Invoices', icon: 'pound', href: 'my-invoices.html' },
        { id: 'messages', label: 'Messages', icon: 'mail', href: 'messages.html' },
        { divider: true, label: 'Resources' },
        { id: 'cpd', label: 'CPD Events', icon: 'award', href: 'cpd-events.html' },
        { id: 'jobs', label: 'Jobs Board', icon: 'briefcase', href: 'jobs-board.html' },
        { id: 'links', label: 'Links & Resources', icon: 'link', href: 'links-resources.html' },
        { id: 'help', label: 'Help / FAQ', icon: 'help-circle', href: 'help-faq.html' },
    ];

    const practiceNav = [
        { id: 'dashboard', label: 'Dashboard', icon: 'grid', href: 'practice-dashboard.html' },
        { id: 'post-shift', label: 'Post a Shift', icon: 'plus-circle', href: 'post-shift.html' },
        { id: 'view-shifts', label: 'View Shifts', icon: 'list', href: 'view-requested-shifts.html' },
        { id: 'find-locums', label: 'Find Locums', icon: 'search', href: 'find-locums.html' },
        { id: 'billing', label: 'Billing', icon: 'pound', href: 'billing.html' },
        { id: 'messages', label: 'Messages', icon: 'mail', href: 'messages.html' },
        { divider: true, label: 'Resources' },
        { id: 'cpd', label: 'CPD Events', icon: 'award', href: 'cpd-events.html' },
        { id: 'jobs', label: 'Jobs Board', icon: 'briefcase', href: 'jobs-board.html' },
        { id: 'links', label: 'Links & Resources', icon: 'link', href: 'links-resources.html' },
        { id: 'help', label: 'Help / FAQ', icon: 'help-circle', href: 'help-faq.html' },
    ];

    const nav = role === 'locum' ? locumNav : practiceNav;
    const settingsHref = role === 'locum' ? 'my-settings.html' : 'practice-settings.html';

    return `
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <a href="index.html" class="logo">
                <span class="logo-icon">GP</span><span class="logo-text">RN</span>
            </a>
            <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">&times;</button>
        </div>
        <nav class="sidebar-nav">
            ${nav.map(item => {
                if (item.divider) {
                    return `<div class="sidebar-divider"><span>${item.label}</span></div>`;
                }
                return `<a href="${item.href}" class="sidebar-link ${activePage === item.id ? 'active' : ''}">
                    ${getIcon(item.icon)}
                    <span>${item.label}</span>
                </a>`;
            }).join('')}
        </nav>
        <div class="sidebar-footer">
            <a href="${settingsHref}" class="sidebar-link ${activePage === 'settings' ? 'active' : ''}">
                ${getIcon('settings')}
                <span>Settings</span>
            </a>
            <button class="sidebar-link" onclick="Auth.logout()">
                ${getIcon('log-out')}
                <span>Log Out</span>
            </button>
        </div>
    </aside>`;
}

// ---- Top Header Bar ----
function renderTopHeader(title, breadcrumbs) {
    const session = Auth.getSession();
    const data = getMockData();
    const userNotifs = data.notifications ? data.notifications.filter(n => !n.userId || n.userId === session.id).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
    const unreadNotifs = userNotifs.filter(n => !n.read).length;
    const unreadMsgs = MessageManager.getUnreadCount(session.id);
    const unreadCount = unreadNotifs + unreadMsgs;

    const notifTypeIcons = {
        'shift_confirmed': 'check', 'new_shifts': 'calendar', 'offer_accepted': 'check',
        'offer_declined': 'x', 'reliability_warning': 'activity', 'cpd_event': 'award',
        'message': 'mail', 'no_show': 'x', 'cancellation': 'x',
        'leave_feedback': 'award', 'payment_reminder': 'pound', 'new_offer': 'briefcase'
    };

    const settingsHref = session.role === 'locum' ? 'my-settings.html' : 'practice-settings.html';
    const profileHref = session.role === 'locum' ? 'my-profile.html' : 'practice-settings.html';

    return `
    <header class="top-header">
        <div class="top-header-left">
            <button class="sidebar-toggle" id="sidebarToggle" aria-label="Open menu">
                <span></span><span></span><span></span>
            </button>
            ${breadcrumbs ? `<nav class="breadcrumbs">${breadcrumbs.map((b, i) =>
                i === breadcrumbs.length - 1
                    ? `<span class="breadcrumb-current">${b.label}</span>`
                    : `<a href="${b.href}" class="breadcrumb-link">${b.label}</a><span class="breadcrumb-sep">/</span>`
            ).join('')}</nav>` : `<h1 class="page-title">${title || ''}</h1>`}
        </div>
        <div class="top-header-right">
            <div class="header-notifications">
                <button class="notification-bell" id="notifBell">
                    ${getIcon('bell')}
                    ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount}</span>` : ''}
                </button>
                <div class="header-dropdown notif-dropdown" id="notifDropdown">
                    <div class="dropdown-header">
                        <h3>Notifications</h3>
                        ${unreadNotifs > 0 ? `<button class="dropdown-action" id="markAllRead">Mark all read</button>` : ''}
                    </div>
                    <div class="dropdown-list" id="notifList">
                        ${userNotifs.length === 0 ? '<div class="dropdown-empty">No notifications</div>' :
                        userNotifs.slice(0, 8).map(n => `
                            <div class="dropdown-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
                                <div class="dropdown-item-icon ${n.read ? '' : 'icon-unread'}">
                                    ${getIcon(notifTypeIcons[n.type] || 'bell')}
                                </div>
                                <div class="dropdown-item-content">
                                    <div class="dropdown-item-title">${n.title}</div>
                                    <div class="dropdown-item-text">${n.message}</div>
                                    <div class="dropdown-item-time">${DateUtils.timeAgo(n.date)}</div>
                                </div>
                                ${n.read ? '' : '<div class="dropdown-item-dot"></div>'}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="header-user" id="userMenuBtn">
                <div class="header-avatar">${getInitials(session.name)}</div>
                <span class="header-name">${session.name}</span>
                <svg class="header-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                <div class="header-dropdown user-dropdown" id="userDropdown">
                    <div class="dropdown-user-info">
                        <div class="header-avatar" style="width:40px;height:40px;font-size:0.85rem;">${getInitials(session.name)}</div>
                        <div>
                            <div class="dropdown-user-name">${session.name}</div>
                            <div class="dropdown-user-role">${session.role === 'locum' ? 'Locum GP' : 'Practice Manager'}</div>
                        </div>
                    </div>
                    <div class="dropdown-divider"></div>
                    <a href="${profileHref}" class="dropdown-menu-item">
                        ${getIcon('user')}
                        <span>My Profile</span>
                    </a>
                    <a href="${settingsHref}" class="dropdown-menu-item">
                        ${getIcon('settings')}
                        <span>Settings</span>
                    </a>
                    <a href="help-faq.html" class="dropdown-menu-item">
                        ${getIcon('help-circle')}
                        <span>Help & FAQ</span>
                    </a>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-menu-item dropdown-logout" id="dropdownLogout">
                        ${getIcon('log-out')}
                        <span>Log Out</span>
                    </button>
                </div>
            </div>
        </div>
    </header>`;
}

// ---- App Layout Wrapper ----
function initAppLayout(role, activePage, pageTitle, breadcrumbs) {
    document.body.innerHTML = `
        ${renderSidebar(role, activePage)}
        <div class="main-content">
            ${renderTopHeader(pageTitle, breadcrumbs)}
            <main class="page-content" id="pageContent"></main>
        </div>
    `;

    // Sidebar toggle
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const close = document.getElementById('sidebarClose');
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
        if (close) close.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // Notification dropdown
    const notifBell = document.getElementById('notifBell');
    const notifDropdown = document.getElementById('notifDropdown');
    if (notifBell && notifDropdown) {
        notifBell.addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById('userDropdown')?.classList.remove('open');
            notifDropdown.classList.toggle('open');
        });
        const markAllBtn = document.getElementById('markAllRead');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const data = getMockData();
                const session = Auth.getSession();
                if (data.notifications) {
                    data.notifications.forEach(n => {
                        if (!n.userId || n.userId === session.id) n.read = true;
                    });
                    saveMockData(data);
                }
                notifDropdown.querySelectorAll('.dropdown-item.unread').forEach(el => {
                    el.classList.remove('unread');
                    const dot = el.querySelector('.dropdown-item-dot');
                    if (dot) dot.remove();
                    const icon = el.querySelector('.dropdown-item-icon');
                    if (icon) icon.classList.remove('icon-unread');
                });
                const badge = document.querySelector('.notification-badge');
                if (badge) badge.remove();
                this.remove();
            });
        }
    }

    // User menu dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            notifDropdown?.classList.remove('open');
            userDropdown.classList.toggle('open');
        });
        const logoutBtn = document.getElementById('dropdownLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                Auth.logout();
            });
        }
    }

    // Close dropdowns on outside click
    document.addEventListener('click', function() {
        notifDropdown?.classList.remove('open');
        userDropdown?.classList.remove('open');
    });

    return document.getElementById('pageContent');
}

// ---- Shift Card Component ----
function renderShiftCard(shift, showActions = true) {
    const urgentBadge = shift.urgent ? '<span class="badge badge-danger">Urgent</span>' : '';
    const housecallBadge = !shift.housecalls ? '<span class="badge badge-neutral">No Housecalls</span>' : '';

    return `
    <div class="shift-card-full" data-shift-id="${shift.id}">
        <div class="shift-card-header">
            <div>
                <h3 class="shift-card-title">${sanitizeHTML(shift.practiceName)}</h3>
                <p class="shift-card-location">${sanitizeHTML(shift.city)} &bull; ${sanitizeHTML(shift.healthBoard)}</p>
            </div>
            <div class="shift-card-badges">
                ${urgentBadge}
                <span class="badge badge-primary">${shift.sessionType}</span>
                ${housecallBadge}
            </div>
        </div>
        <div class="shift-card-details">
            <div class="shift-card-detail">
                ${getIcon('calendar')}
                <span>${DateUtils.format(shift.date, 'full')}</span>
            </div>
            <div class="shift-card-detail">
                ${getIcon('clock')}
                <span>${shift.startTime} - ${shift.endTime}</span>
            </div>
            <div class="shift-card-detail">
                ${getIcon('monitor')}
                <span>${shift.computerSystem}</span>
            </div>
            <div class="shift-card-detail">
                ${getIcon('users')}
                <span>${shift.applicants} applicant${shift.applicants !== 1 ? 's' : ''}</span>
            </div>
        </div>
        ${showActions ? `
        <div class="shift-card-footer">
            <span class="badge ${shift.shiftType === 'GP Only' ? 'badge-info' : 'badge-neutral'}">${shift.shiftType}</span>
            <div style="display:flex;align-items:center;gap:8px;">
                ${shift.applicants >= 3 ? '<span class="badge badge-warning" style="font-size:0.72rem;padding:2px 8px;">High demand</span>' : ''}
                <a href="shift-detail.html?id=${shift.id}" class="btn btn-primary btn-small">View Details</a>
            </div>
        </div>` : ''}
    </div>`;
}

// ---- Stat Card Component ----
function renderStatCard(icon, label, value, trend, color, helpText) {
    return `
    <div class="dash-stat-card">
        <div class="dash-stat-icon" style="background: ${color || 'rgba(79,70,229,0.1)'}; color: ${color ? '#fff' : 'var(--primary)'}">
            ${getIcon(icon)}
        </div>
        <div class="dash-stat-info">
            <span class="dash-stat-value">${value}</span>
            <span class="dash-stat-label">${label}</span>
            ${helpText ? `<span style="font-size: 0.72rem; color: var(--dark-600); display: block; margin-top: 2px;">${helpText}</span>` : ''}
        </div>
        ${trend ? `<span class="dash-stat-trend ${trend.startsWith('+') ? 'trend-up' : 'trend-down'}">${trend}</span>` : ''}
    </div>`;
}

// ---- Empty State ----
function renderEmptyState(icon, title, message, actionLabel, actionHref) {
    return `
    <div class="empty-state">
        <div class="empty-state-icon">${getIcon(icon)}</div>
        <h3>${title}</h3>
        <p>${message}</p>
        ${actionLabel ? `<a href="${actionHref}" class="btn btn-primary">${actionLabel}</a>` : ''}
    </div>`;
}

// ---- Pagination ----
function renderPagination(current, total) {
    if (total <= 1) return '';
    let pages = '';
    for (let i = 1; i <= total; i++) {
        pages += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    return `
    <div class="pagination">
        <button class="page-btn" data-page="${Math.max(1, current - 1)}" ${current === 1 ? 'disabled' : ''}>${getIcon('chevron-left')}</button>
        ${pages}
        <button class="page-btn" data-page="${Math.min(total, current + 1)}" ${current === total ? 'disabled' : ''}>${getIcon('chevron-right')}</button>
    </div>`;
}

// ---- Offer Card ----
function renderOfferCard(offer) {
    return `
    <div class="offer-card" data-offer-id="${offer.id}">
        <div class="offer-card-header">
            <div>
                <h3 class="offer-card-title">${sanitizeHTML(offer.practiceName)}</h3>
                <p class="offer-card-location">${sanitizeHTML(offer.healthBoard)}</p>
            </div>
            <span class="badge ${getStatusBadge(offer.status)}">${offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}</span>
        </div>
        <div class="offer-card-details">
            <div class="offer-detail">
                ${getIcon('calendar')}
                <span>${DateUtils.format(offer.shiftDate, 'full')}</span>
            </div>
            <div class="offer-detail">
                ${getIcon('clock')}
                <span>${offer.startTime} - ${offer.endTime}</span>
            </div>
            <div class="offer-detail">
                ${getIcon('tag')}
                <span>${offer.sessionType}</span>
            </div>
        </div>
        <div class="offer-card-footer">
            <div class="offer-rates">
                <span>Your rate: ${offer.sessionType === 'Full Day' ? formatCurrency(offer.rateFullDay) : offer.sessionType === 'PM' ? formatCurrency(offer.ratePM) : formatCurrency(offer.rateAM)}/${offer.sessionType} session</span>
            </div>
            <span class="offer-date">Offer made: ${DateUtils.format(offer.offerDate, 'medium')}</span>
        </div>
        ${offer.comment ? `<div class="offer-comment"><strong>Your comment:</strong> ${sanitizeHTML(offer.comment)}</div>` : ''}
        ${offer.status === 'pending' ? `
        <div class="offer-actions">
            <button class="btn btn-small btn-ghost" onclick="withdrawOffer('${offer.id}')">Withdraw</button>
        </div>` : ''}
    </div>`;
}

// ---- SVG Icons ----
function getIcon(name) {
    const icons = {
        'grid': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        'search': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        'calendar': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        'file-text': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        'pound': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 20h10M7 20c0-4 2-6 2-10a5 5 0 0 1 9-3M5 14h10"/></svg>',
        'user': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        'users': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        'plus-circle': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        'award': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
        'briefcase': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
        'link': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        'help-circle': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        'settings': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        'log-out': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
        'bell': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
        'clock': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        'monitor': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
        'tag': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
        'check': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        'x': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        'chevron-left': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
        'chevron-right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
        'chevron-down': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
        'map-pin': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        'list': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
        'download': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        'upload': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
        'mail': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        'phone': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        'activity': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        'home': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        'eye': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        'eye-off': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
        'filter': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
        'external-link': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        'arrow-left': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>'
    };
    return icons[name] || '';
}

// ---- Common page head ----
function getPageHead(title) {
    return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - GPRN</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">`;
}

// ---- Rating Stars Component ----
function renderRatingStars(rating, size = 16) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        const fill = i <= Math.round(rating) ? '#F97316' : '#E2E8F0';
        stars += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${fill}" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return `<span class="rating-stars">${stars}</span>`;
}

// ---- Barred Warning Component ----
function renderBarredWarning(practiceId, locumId) {
    if (BarredList.isBarred(practiceId, locumId)) {
        const reason = BarredList.getBarReason(practiceId, locumId);
        return `<div class="barred-warning"><span class="badge badge-danger">BARRED</span> <span class="barred-reason">${sanitizeHTML(reason) || 'This locum is on your barred list'}</span></div>`;
    }
    if (BarredList.isPreferred(practiceId, locumId)) {
        return `<div class="preferred-indicator"><span class="badge badge-success">PREFERRED</span></div>`;
    }
    return '';
}

// ---- Message Thread Component ----
function renderMessageBubble(msg, currentUserId) {
    const isMine = msg.fromId === currentUserId;
    const time = new Date(msg.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = DateUtils.format(msg.timestamp, 'medium');
    return `<div class="message-bubble ${isMine ? 'sent' : 'received'}">
        <div class="message-content">${sanitizeHTML(msg.body)}</div>
        <div class="message-time">${dateStr} ${timeStr}${isMine ? ' <span style="color:var(--gray-400);margin-left:6px;">Delivered</span>' : ''}</div>
    </div>`;
}

// ---- Invoice Component ----
function renderInvoiceRow(inv) {
    return `<tr>
        <td><strong>${inv.invoiceNumber}</strong></td>
        <td>${DateUtils.format(inv.generatedDate, 'short')}</td>
        <td>${sanitizeHTML(inv.locumName)}</td>
        <td>${DateUtils.format(inv.shiftDate, 'medium')}</td>
        <td>${inv.sessionType}</td>
        <td><strong>${formatCurrency(inv.total)}</strong></td>
        <td><span class="badge ${getStatusBadge(inv.status)}">${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span></td>
        <td>
            <a href="invoice-view.html?id=${inv.id}" class="btn btn-small btn-ghost">View</a>
        </td>
    </tr>`;
}

// ---- Document Expiry Check ----
function getDocumentExpiryStatus(expiryDate) {
    if (!expiryDate) return { status: 'ok', label: 'No expiry' };
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { status: 'expired', label: 'EXPIRED', badge: 'badge-danger' };
    if (daysUntil <= 30) return { status: 'expiring', label: `Expires in ${daysUntil} days`, badge: 'badge-warning' };
    return { status: 'ok', label: `Expires ${DateUtils.format(expiryDate, 'medium')}`, badge: 'badge-neutral' };
}

// ---- Common scripts ----
function getPageScripts() {
    return `
    <script src="mock-data.js"><\/script>
    <script src="app.js"><\/script>
    <script src="components.js"><\/script>`;
}
