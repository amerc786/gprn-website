const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'gprn-data.json');

// In-memory data store
var store = {
    users: [],
    shifts: [],
    session_needs: [],
    offers: [],
    invoices: [],
    notifications: [],
    messages: [],
    documents: [],
    availability: [],
    barred_lists: [],
    preferred_lists: [],
    feedback: [],
    email_log: [],
    reset_tokens: [],
    cpd_interests: [],
    job_applications: [],
    user_settings: [],
    shift_templates: [],
    audit_log: []
};

// Load from disk on startup
function load() {
    try {
        if (fs.existsSync(DB_PATH)) {
            var raw = fs.readFileSync(DB_PATH, 'utf8');
            var parsed = JSON.parse(raw);
            // Merge with defaults (in case new tables added)
            for (var key in store) {
                if (parsed[key]) store[key] = parsed[key];
            }
            return true;
        }
    } catch (e) {
        console.error('Failed to load database:', e.message);
    }
    return false;
}

// Save to disk (debounced)
var saveTimer = null;
function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
        try {
            fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
        } catch (e) {
            console.error('Failed to save database:', e.message);
        }
    }, 100);
}

// Force immediate save
function saveNow() {
    if (saveTimer) clearTimeout(saveTimer);
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save database:', e.message);
    }
}

// ---- Query helpers ----

function findOne(tableName, predicate) {
    var table = store[tableName];
    if (!table) return null;
    for (var i = 0; i < table.length; i++) {
        if (predicate(table[i])) return table[i];
    }
    return null;
}

function findAll(tableName, predicate) {
    var table = store[tableName];
    if (!table) return [];
    if (!predicate) return table.slice();
    return table.filter(predicate);
}

function insert(tableName, record) {
    if (!store[tableName]) store[tableName] = [];
    store[tableName].push(record);
    save();
    return record;
}

function update(tableName, predicate, changes) {
    var table = store[tableName];
    if (!table) return 0;
    var count = 0;
    for (var i = 0; i < table.length; i++) {
        if (predicate(table[i])) {
            for (var key in changes) {
                table[i][key] = changes[key];
            }
            count++;
        }
    }
    if (count > 0) save();
    return count;
}

function upsert(tableName, keyField, record) {
    var table = store[tableName];
    if (!table) { store[tableName] = []; table = store[tableName]; }
    var keyVal = record[keyField];
    for (var i = 0; i < table.length; i++) {
        if (table[i][keyField] === keyVal) {
            // Update existing
            for (var key in record) {
                table[i][key] = record[key];
            }
            save();
            return table[i];
        }
    }
    // Insert new
    table.push(record);
    save();
    return record;
}

// Insert only if no matching record exists
function insertIgnore(tableName, predicate, record) {
    var existing = findOne(tableName, predicate);
    if (existing) return existing;
    return insert(tableName, record);
}

function remove(tableName, predicate) {
    var table = store[tableName];
    if (!table) return 0;
    var before = table.length;
    store[tableName] = table.filter(function(row) { return !predicate(row); });
    var removed = before - store[tableName].length;
    if (removed > 0) save();
    return removed;
}

function count(tableName, predicate) {
    var table = store[tableName];
    if (!table) return 0;
    if (!predicate) return table.length;
    var c = 0;
    for (var i = 0; i < table.length; i++) {
        if (predicate(table[i])) c++;
    }
    return c;
}

// Load on require
load();

module.exports = {
    store: store,
    load: load,
    save: save,
    saveNow: saveNow,
    findOne: findOne,
    findAll: findAll,
    insert: insert,
    update: update,
    upsert: upsert,
    insertIgnore: insertIgnore,
    remove: remove,
    count: count
};
