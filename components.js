// ===== GPRN Shared Components =====

// ---- Phosphor icon class map (replaces old SVG getIcon for sidebar) ----
const _phIcons = {
    'dashboard': 'ph-squares-four',
    'invitations': 'ph-envelope-simple',
    'calendar': 'ph-calendar-blank',
    'bookings': 'ph-clipboard-text',
    'rates': 'ph-currency-gbp',
    'profile': 'ph-user-circle',
    'report': 'ph-plus-circle',
    'invoices': 'ph-receipt',
    'messages': 'ph-chat-circle-dots',
    'cpd': 'ph-certificate',
    'jobs': 'ph-buildings',
    'links': 'ph-link-simple',
    'help': 'ph-question',
    'settings': 'ph-gear',
    'logout': 'ph-sign-out',
    'create-session': 'ph-calendar-plus',
    'my-sessions': 'ph-clipboard-text',
    'find-locums': 'ph-users',
    'billing': 'ph-receipt',
};

// ---- Sidebar Navigation ----
function renderSidebar(role, activePage) {
    const session = Auth.getSession();
    const locumNav = [
        { id: 'dashboard', label: 'Dashboard', href: 'locum-dashboard.html' },
        { id: 'invitations', label: 'My Shifts', href: 'available-shifts.html' },
        { id: 'calendar', label: 'My Calendar', href: 'my-calendar.html' },
        { id: 'bookings', label: 'My Bookings', href: 'my-offers.html' },
        { id: 'rates', label: 'My Rates', href: 'my-rates.html' },
        { id: 'profile', label: 'My Profile', href: 'my-profile.html' },
        { id: 'report', label: 'Log Outside Work', href: 'report-extra-shifts.html' },
        { id: 'invoices', label: 'My Invoices', href: 'my-invoices.html' },
        { id: 'messages', label: 'Messages', href: 'messages.html' },
    ];
    const locumResources = [
        { id: 'cpd', label: 'CPD Events', href: 'cpd-events.html' },
        { id: 'jobs', label: 'Jobs Board', href: 'jobs-board.html' },
        { id: 'links', label: 'Links & Resources', href: 'links-resources.html' },
        { id: 'help', label: 'Help / FAQ', href: 'help-faq.html' },
    ];

    const practiceNav = [
        { id: 'dashboard', label: 'Dashboard', href: 'practice-dashboard.html' },
        { id: 'create-session', label: 'Create Session', href: 'post-shift.html' },
        { id: 'my-sessions', label: 'Manage Shifts', href: 'view-requested-shifts.html' },
        { id: 'find-locums', label: 'Locum Network', href: 'find-locums.html' },
        { id: 'billing', label: 'Compliance & Billing', href: 'billing.html' },
        { id: 'messages', label: 'Messages', href: 'messages.html' },
    ];

    const mainNav = role === 'locum' ? locumNav : practiceNav;
    const resourceNav = role === 'locum' ? locumResources : [];
    const settingsHref = role === 'locum' ? 'my-settings.html' : 'practice-settings.html';
    const settingsLabel = role === 'locum' ? 'Settings' : 'Practice Settings';

    function navItem(item, isActive) {
        const iconBase = _phIcons[item.id] || 'ph-circle';
        const iconClass = isActive ? `ph-fill ${iconBase}` : `ph ${iconBase}`;
        if (isActive) {
            return `<a href="${item.href}" class="sidebar-active-bar relative flex items-center gap-3 px-4 py-2.5 bg-slate-50 text-[#0B0F19] rounded-xl text-[14px] font-bold transition-all">
                <i class="${iconClass} text-lg"></i> ${item.label}
            </a>`;
        }
        return `<a href="${item.href}" class="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-[#0B0F19] hover:bg-slate-50 rounded-xl text-[14px] font-semibold transition-colors group">
            <i class="${iconClass} text-lg group-hover:text-[#0B0F19] transition-colors"></i> ${item.label}
        </a>`;
    }

    const unreadMsgCount = MessageManager.getUnreadCount(session.id);
    const msgBadge = unreadMsgCount > 0
        ? `<span class="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">${unreadMsgCount}</span>`
        : '';

    return `
    <div id="sidebarBackdrop" class="fixed inset-0 bg-black/40 z-40 hidden lg:hidden" onclick="document.getElementById('appSidebar').classList.add('-translate-x-full');this.classList.add('hidden');"></div>
    <aside id="appSidebar" class="fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-200 flex flex-col -translate-x-full lg:translate-x-0 lg:relative lg:w-[260px] lg:z-20 lg:shrink-0 transition-transform duration-300 ease-in-out">
        <div class="h-20 px-6 flex items-center justify-between">
            <a href="index.html" class="flex items-center gap-[8px] select-none">
                <div class="w-[38px] h-[38px] bg-[#101524] rounded-[12px] flex items-center justify-center shadow-sm">
                    <span class="text-white font-black text-[24px] leading-none tracking-tight pt-[2px]">G</span>
                </div>
                <div class="flex items-baseline pt-1">
                    <span class="text-[#101524] font-black text-[32px] leading-[0.8] tracking-[-0.05em]">PRN</span>
                    <div class="w-[9px] h-[9px] bg-[#0F8B5A] ml-[4px] mb-[3px]"></div>
                </div>
            </a>
            <button class="lg:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600" onclick="document.getElementById('appSidebar').classList.add('-translate-x-full');document.getElementById('sidebarBackdrop').classList.add('hidden');">
                <i class="ph ph-x text-xl"></i>
            </button>
        </div>

        <div class="flex-1 overflow-y-auto custom-scroll py-6 px-4 flex flex-col gap-8">
            <nav class="flex flex-col gap-1.5">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-4 mb-2">Platform</p>
                ${mainNav.map(item => {
                    if (item.id === 'messages') {
                        const isActive = activePage === 'messages';
                        const iconBase = _phIcons.messages;
                        const iconClass = isActive ? `ph-fill ${iconBase}` : `ph ${iconBase}`;
                        const cls = isActive
                            ? 'sidebar-active-bar relative flex items-center justify-between px-4 py-2.5 bg-slate-50 text-[#0B0F19] rounded-xl text-[14px] font-bold transition-all'
                            : 'flex items-center justify-between px-4 py-2.5 text-slate-500 hover:text-[#0B0F19] hover:bg-slate-50 rounded-xl text-[14px] font-semibold transition-colors group';
                        return `<a href="${item.href}" class="${cls}">
                            <div class="flex items-center gap-3">
                                <i class="${iconClass} text-lg${isActive ? '' : ' group-hover:text-[#0B0F19]'} transition-colors"></i> ${item.label}
                            </div>
                            ${msgBadge}
                        </a>`;
                    }
                    return navItem(item, activePage === item.id);
                }).join('')}
            </nav>

            ${resourceNav.length > 0 ? `
            <nav class="flex flex-col gap-1.5">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-4 mb-2">Resources</p>
                ${resourceNav.map(item => navItem(item, activePage === item.id)).join('')}
            </nav>` : ''}

            <nav class="flex flex-col gap-1.5 mt-auto">
                ${navItem({ id: 'settings', label: settingsLabel, href: settingsHref }, activePage === 'settings')}
                <button onclick="Auth.logout()" class="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-[14px] font-semibold transition-colors group cursor-pointer text-left">
                    <i class="ph ph-sign-out text-lg"></i> Log Out
                </button>
            </nav>
        </div>
    </aside>`;
}

// ---- Top Header Bar ----
function renderTopHeader(title, breadcrumbs) {
    const session = Auth.getSession();
    const settingsHref = session.role === 'locum' ? 'my-settings.html' : 'practice-settings.html';
    const initials = getInitials(session.name);
    const displayName = session.firstName || (session.name || 'User').split(' ')[0];
    const searchPlaceholder = session.role === 'locum' ? 'Search shifts, bookings...' : 'Search locums, shifts, or invoices...';

    return `
    <header class="h-16 lg:h-20 px-4 lg:px-10 flex items-center justify-between shrink-0 z-10 sticky top-0 bg-[#F8F9FA]/80 backdrop-blur-md">
        <div class="flex items-center gap-3 flex-1 min-w-0">
            <button class="lg:hidden w-10 h-10 flex items-center justify-center text-slate-600 hover:text-[#0B0F19] rounded-xl hover:bg-slate-100 transition-colors shrink-0" onclick="document.getElementById('appSidebar').classList.remove('-translate-x-full');document.getElementById('sidebarBackdrop').classList.remove('hidden');">
                <i class="ph ph-list text-2xl"></i>
            </button>
            <a href="index.html" class="lg:hidden flex items-center gap-[6px] select-none shrink-0">
                <div class="w-[32px] h-[32px] bg-[#101524] rounded-[10px] flex items-center justify-center">
                    <span class="text-white font-black text-[18px] leading-none tracking-tight pt-[2px]">G</span>
                </div>
                <div class="flex items-baseline pt-0.5">
                    <span class="text-[#101524] font-black text-[24px] leading-[0.8] tracking-[-0.05em]">PRN</span>
                    <div class="w-[7px] h-[7px] bg-[#0F8B5A] ml-[3px] mb-[2px]"></div>
                </div>
            </a>
            <div class="relative w-full max-w-96 group hidden sm:block">
                <i class="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-[#0B0F19] transition-colors"></i>
                <input type="text" placeholder="${searchPlaceholder}" class="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-11 pr-4 text-[14px] font-medium text-[#0B0F19] placeholder-slate-400 focus:outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            </div>
        </div>
        <div class="flex items-center gap-3 lg:gap-5 shrink-0">
            <button onclick="window.location.href='${settingsHref}'" class="bg-[#0B0F19] rounded-full p-1 pl-1.5 pr-4 flex items-center gap-2.5 hover:bg-slate-800 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B0F19] group">
                <div class="bg-[#059669] text-white w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold tracking-wider">${initials}</div>
                <span class="text-white text-[13px] font-semibold pr-1">${displayName}</span>
                <i class="ph-bold ph-caret-down text-slate-400 text-[10px] group-hover:text-white transition-colors"></i>
            </button>
        </div>
    </header>`;
}

// ---- App Layout Wrapper ----
function initAppLayout(role, activePage, pageTitle, breadcrumbs) {
    // Set body to match practice page design
    document.body.className = 'gprn-app bg-[#F8F9FA] text-slate-800 h-screen w-screen overflow-hidden flex selection:bg-[#059669] selection:text-white';
    document.body.style.fontFamily = "'Plus Jakarta Sans', sans-serif";

    document.body.innerHTML = `
        ${renderSidebar(role, activePage)}
        <main class="flex-1 flex flex-col relative w-full h-full">
            ${renderTopHeader(pageTitle, breadcrumbs)}
            <div class="flex-1 overflow-y-auto custom-scroll px-4 lg:px-10 pb-20 pt-4">
                <div class="max-w-[1400px] mx-auto w-full relative" id="pageContent"></div>
            </div>
        </main>
    `;

    return document.getElementById('pageContent');
}

// ---- Session Need Card Component (Practice view) ----
function renderSessionNeedCard(need, showActions = true) {
    const housecallBadge = need.housecalls ? '<span class="badge badge-info">Housecalls</span>' : '';
    const statusBadge = `<span class="badge ${getStatusBadge(need.status)}">${getStatusLabel(need.status)}</span>`;

    return `
    <div class="shift-card-full" data-need-id="${need.id}">
        <div class="shift-card-header">
            <div>
                <h3 class="shift-card-title">${DateUtils.format(need.date, 'full')}</h3>
                <p class="shift-card-location">${sanitizeHTML(need.practiceName)} &bull; ${sanitizeHTML(need.healthBoard)}</p>
            </div>
            <div class="shift-card-badges">
                ${statusBadge}
                <span class="badge badge-primary">${need.sessionType}</span>
                ${housecallBadge}
            </div>
        </div>
        <div class="shift-card-details">
            <div class="shift-card-detail">
                ${getIcon('clock')}
                <span>${need.startTime} - ${need.endTime}</span>
            </div>
            ${need.budgetRate ? `<div class="shift-card-detail">
                ${getIcon('pound')}
                <span>Budget: ${formatCurrency(need.budgetRate)}</span>
            </div>` : ''}
            <div class="shift-card-detail">
                ${getIcon('users')}
                <span>${need.offersCount || 0} offer${(need.offersCount || 0) !== 1 ? 's' : ''} sent</span>
            </div>
        </div>
        ${showActions && need.status === 'open' ? `
        <div class="shift-card-footer">
            <div style="display:flex;align-items:center;gap:8px;">
                <a href="find-locums.html?needId=${need.id}" class="btn btn-primary btn-small">Find Locum</a>
                <button class="btn btn-small btn-ghost" onclick="cancelSessionNeed('${need.id}')">Cancel</button>
            </div>
        </div>` : ''}
        ${need.notes ? `<div class="offer-comment"><strong>Notes:</strong> ${sanitizeHTML(need.notes)}</div>` : ''}
    </div>`;
}

// ---- Legacy alias for any pages still calling renderShiftCard ----
function renderShiftCard(shift, showActions) {
    // Convert old shift format to session need format for backward compat
    return renderSessionNeedCard(shift, showActions);
}

// ---- Stat Card Component ----
function renderStatCard(icon, label, value, trend, color, helpText) {
    return `
    <div class="dash-stat-card">
        <div class="dash-stat-icon" style="background: ${color || 'rgba(91,77,255,0.1)'}; color: ${color ? '#fff' : 'var(--primary)'}">
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

// ---- Offer Card (Locum view — invitations received from practices) ----
function renderOfferCard(offer) {
    const sessionDate = offer.sessionDate || offer.shiftDate;
    const rate = offer.agreedRate || offer.proposedRate || 0;
    const sentDate = offer.sentDate || offer.offerDate;
    return `
    <div class="offer-card" data-offer-id="${offer.id}">
        <div class="offer-card-header">
            <div>
                <h3 class="offer-card-title">${sanitizeHTML(offer.practiceName)}</h3>
                <p class="offer-card-location">${sanitizeHTML(offer.healthBoard)}</p>
            </div>
            <span class="badge ${getStatusBadge(offer.status)}">${getStatusLabel(offer.status)}</span>
        </div>
        <div class="offer-card-details">
            <div class="offer-detail">
                ${getIcon('calendar')}
                <span>${DateUtils.format(sessionDate, 'full')}</span>
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
                <span>Offered rate: ${formatCurrency(rate)}/${offer.sessionType} session</span>
                ${offer.locumPublishedRate && offer.locumPublishedRate !== rate ? `<span style="font-size:0.75rem;color:var(--dark-600);margin-left:8px;">(Your rate: ${formatCurrency(offer.locumPublishedRate)})</span>` : ''}
            </div>
            <span class="offer-date">Sent: ${DateUtils.format(sentDate, 'medium')}</span>
        </div>
        ${offer.practiceMessage ? `<div class="offer-comment"><strong>Message:</strong> ${sanitizeHTML(offer.practiceMessage)}</div>` : ''}
        ${['sent', 'viewed'].includes(offer.status) ? `
        <div class="offer-actions">
            <button class="btn btn-small btn-primary" onclick="respondToInvitation('${offer.id}', 'accept')">Accept</button>
            <button class="btn btn-small btn-warning" onclick="respondToInvitation('${offer.id}', 'counter')">Counter</button>
            <button class="btn btn-small btn-ghost" onclick="respondToInvitation('${offer.id}', 'decline')">Decline</button>
        </div>` : ''}
        ${offer.status === 'negotiating' ? `
        <div class="offer-actions">
            <button class="btn btn-small btn-primary" onclick="respondToInvitation('${offer.id}', 'accept')">Accept Rate</button>
            <button class="btn btn-small btn-warning" onclick="respondToInvitation('${offer.id}', 'counter')">Counter</button>
            <button class="btn btn-small btn-ghost" onclick="respondToInvitation('${offer.id}', 'decline')">Decline</button>
        </div>` : ''}
        ${['accepted', 'confirmed'].includes(offer.status) ? `
        <div class="offer-actions">
            <a href="shift-detail.html?id=${offer.id}" class="btn btn-small btn-primary">View Booking</a>
        </div>` : ''}
    </div>`;
}

// ---- Offer Card (Practice view — offers sent to locums) ----
function renderPracticeOfferCard(offer) {
    const data = getMockData();
    const locum = data.locums.find(l => l.id === offer.locumId);
    const locumName = locum ? `${locum.title} ${locum.firstName} ${locum.lastName}` : 'Unknown';
    const sessionDate = offer.sessionDate || offer.shiftDate;
    const rate = offer.agreedRate || offer.proposedRate || 0;
    return `
    <div class="offer-card" data-offer-id="${offer.id}">
        <div class="offer-card-header">
            <div>
                <h3 class="offer-card-title">${sanitizeHTML(locumName)}</h3>
                <p class="offer-card-location">${offer.sessionType} &bull; ${DateUtils.format(sessionDate, 'medium')}</p>
            </div>
            <span class="badge ${getStatusBadge(offer.status)}">${getStatusLabel(offer.status)}</span>
        </div>
        <div class="offer-card-details">
            <div class="offer-detail">
                ${getIcon('clock')}
                <span>${offer.startTime} - ${offer.endTime}</span>
            </div>
            <div class="offer-detail">
                ${getIcon('pound')}
                <span>Rate: ${formatCurrency(rate)}</span>
                ${offer.locumPublishedRate ? `<span style="font-size:0.75rem;color:var(--dark-600);margin-left:4px;">(Locum asks: ${formatCurrency(offer.locumPublishedRate)})</span>` : ''}
            </div>
        </div>
        ${['sent', 'viewed'].includes(offer.status) ? `
        <div class="offer-actions">
            <button class="btn btn-small btn-ghost" onclick="withdrawSentOffer('${offer.id}')">Withdraw</button>
        </div>` : ''}
        ${offer.status === 'negotiating' ? `
        <div class="offer-actions">
            <button class="btn btn-small btn-primary" onclick="practiceRespondNegotiation('${offer.id}', 'accept')">Accept Rate</button>
            <button class="btn btn-small btn-warning" onclick="practiceRespondNegotiation('${offer.id}', 'counter')">Counter</button>
            <button class="btn btn-small btn-ghost" onclick="practiceRespondNegotiation('${offer.id}', 'withdraw')">Withdraw</button>
        </div>` : ''}
        ${offer.status === 'accepted' ? `
        <div class="offer-actions">
            <button class="btn btn-small btn-primary" onclick="confirmOffer('${offer.id}')">Confirm Booking</button>
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
        const fill = i <= Math.round(rating) ? '#F59E0B' : '#E2E8F0';
        stars += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${fill}" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return `<span class="rating-stars">${stars}</span>`;
}

// ---- Barred Warning Component ----
function renderBarredWarning(practiceId, locumId) {
    if (BarredList.isBarred(practiceId, locumId)) {
        const reason = BarredList.getBarReason(practiceId, locumId);
        return `<div class="barred-warning"><span class="badge badge-danger">BLOCKED</span> <span class="barred-reason">${sanitizeHTML(reason) || 'This locum is on your blocked list'}</span></div>`;
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
        <td>${DateUtils.format(inv.sessionDate || inv.shiftDate, 'medium')}</td>
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
