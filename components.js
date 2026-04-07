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
        { id: 'invitations', label: 'Invitations', href: 'available-shifts.html' },
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
                    <span class="logo-prn text-[#101524] font-black text-[32px] leading-[0.8] tracking-[-0.05em]">PRN</span>
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
function renderProfileDropdown(initials, displayName, settingsHref) {
    return `
        <div class="relative" id="profileDropdownWrap">
            <button onclick="document.getElementById('profileDropMenu').classList.toggle('hidden')" class="bg-[#0B0F19] rounded-full p-1 pl-1.5 pr-4 flex items-center gap-2.5 hover:bg-slate-800 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B0F19] group">
                <div class="bg-[#059669] text-white w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold tracking-wider">${initials}</div>
                <span class="text-white text-[13px] font-semibold pr-1">${displayName}</span>
                <i class="ph-bold ph-caret-down text-slate-400 text-[10px] group-hover:text-white transition-colors"></i>
            </button>
            <div id="profileDropMenu" class="hidden absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50" style="font-family:'Plus Jakarta Sans',sans-serif;">
                <div class="px-4 py-3 border-b border-slate-100">
                    <div class="text-[13px] font-bold text-[#0B0F19]">${displayName}</div>
                    <div class="text-[11px] text-slate-400">Signed in</div>
                </div>
                <a href="${settingsHref}" class="flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0B0F19] transition-colors">
                    <i class="ph ph-gear text-base"></i> Settings
                </a>
                <button onclick="toggleDarkMode()" class="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0B0F19] transition-colors cursor-pointer">
                    <span class="flex items-center gap-3"><i class="ph ph-moon text-base"></i> Dark Mode</span>
                    <div id="darkModeToggle" class="w-9 h-5 rounded-full ${document.documentElement.classList?.contains?.('dark') ? 'bg-[#059669]' : 'bg-slate-300'} relative transition-colors">
                        <div class="absolute top-0.5 ${document.documentElement.classList?.contains?.('dark') ? 'left-[18px]' : 'left-0.5'} w-4 h-4 bg-white rounded-full shadow transition-all"></div>
                    </div>
                </button>
                <div class="border-t border-slate-100 mt-1 pt-1">
                    <button onclick="Auth.logout()" class="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors cursor-pointer text-left">
                        <i class="ph ph-sign-out text-base"></i> Log Out
                    </button>
                </div>
            </div>
        </div>`;
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('gprn_dark_mode', isDark ? 'true' : 'false');
    // Update toggle visual
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.className = toggle.className.replace(/bg-\[#059669\]|bg-slate-300/, isDark ? 'bg-[#059669]' : 'bg-slate-300');
        const dot = toggle.querySelector('div');
        if (dot) dot.className = dot.className.replace(/left-\[18px\]|left-0\.5/, isDark ? 'left-[18px]' : 'left-0.5');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const menu = document.getElementById('profileDropMenu');
    const wrap = document.getElementById('profileDropdownWrap');
    if (menu && wrap && !wrap.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// Apply saved dark mode on load
if (localStorage.getItem('gprn_dark_mode') === 'true') {
    document.documentElement.classList.add('dark');
}

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
            ${renderProfileDropdown(initials, displayName, settingsHref)}
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
    const phMap = {
        'grid': 'ph-squares-four',
        'search': 'ph-magnifying-glass',
        'calendar': 'ph-calendar-blank',
        'file-text': 'ph-file-text',
        'pound': 'ph-currency-gbp',
        'user': 'ph-user',
        'users': 'ph-users',
        'plus-circle': 'ph-plus-circle',
        'award': 'ph-certificate',
        'briefcase': 'ph-briefcase',
        'link': 'ph-link-simple',
        'help-circle': 'ph-question',
        'settings': 'ph-gear',
        'log-out': 'ph-sign-out',
        'bell': 'ph-bell',
        'clock': 'ph-clock',
        'monitor': 'ph-monitor',
        'tag': 'ph-tag',
        'check': 'ph-check',
        'x': 'ph-x',
        'chevron-left': 'ph-caret-left',
        'chevron-right': 'ph-caret-right',
        'chevron-down': 'ph-caret-down',
        'map-pin': 'ph-map-pin',
        'list': 'ph-list-bullets',
        'download': 'ph-download-simple',
        'upload': 'ph-upload-simple',
        'mail': 'ph-envelope-simple',
        'phone': 'ph-phone',
        'activity': 'ph-chart-line-up',
        'home': 'ph-house',
        'eye': 'ph-eye',
        'eye-off': 'ph-eye-slash',
        'filter': 'ph-funnel',
        'external-link': 'ph-arrow-square-out',
        'arrow-left': 'ph-arrow-left'
    };
    const cls = phMap[name];
    if (!cls) return '';
    return `<i class="ph ${cls}" style="font-size:20px;line-height:1"></i>`;
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
