// ===== GPRN Mock Data =====
// Realistic Welsh GP locum booking platform seed data

const MOCK_DATA = {
    locums: [    ],

    practices: [    ],

    sessionNeeds: [],
    shifts: [], // kept for backwards compat, no longer used
    offers: [],
    notifications: [],
    messages: [],
    emailLog: [],
    invoices: [],
    feedback: [],
    barredLists: {},
    preferredLists: {},
    availability: {},
    shiftTemplates: {},
    reportedShifts: [],

    cpdEvents: [    ],

    jobs: [    ],

    healthBoards: [
        { name: 'Aneurin Bevan', locumCount: 414 },
        { name: 'Betsi Cadwaladr', locumCount: 266 },
        { name: 'Cardiff and Vale', locumCount: 437 },
        { name: 'Cwm Taf Morgannwg', locumCount: 425 },
        { name: 'Hywel Dda', locumCount: 309 },
        { name: 'Powys', locumCount: 276 },
        { name: 'Swansea Bay', locumCount: 354 }
    ]
};

// Initialize mock data
var GPRN_DATA_VERSION = '5.0';

function initMockData() {
    var storedVersion = localStorage.getItem('gprn_data_version');
    if (!localStorage.getItem('gprn_data') || storedVersion !== GPRN_DATA_VERSION) {
        localStorage.setItem('gprn_data', JSON.stringify(MOCK_DATA));
        localStorage.setItem('gprn_data_version', GPRN_DATA_VERSION);
    }
    return JSON.parse(localStorage.getItem('gprn_data'));
}

function getMockData() {
    var data = localStorage.getItem('gprn_data');
    if (!data) {
        // Try fetching from backend if we have a token
        var session = localStorage.getItem('gprn_session');
        if (session) {
            try {
                var parsed = JSON.parse(session);
                if (parsed.token) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', '/api/data', false);
                    xhr.setRequestHeader('Authorization', 'Bearer ' + parsed.token);
                    xhr.send();
                    if (xhr.status === 200) {
                        data = xhr.responseText;
                        localStorage.setItem('gprn_data', data);
                        return JSON.parse(data);
                    }
                }
            } catch (e) {}
        }
        return initMockData();
    }
    return JSON.parse(data);
}

function saveMockData(data) {
    localStorage.setItem('gprn_data', JSON.stringify(data));
    // Background sync to backend if available
    if (typeof API !== 'undefined' && API.syncData) {
        API.syncData(data);
    }
}
