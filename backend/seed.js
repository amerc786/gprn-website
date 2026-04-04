var db = require('./db');
var bcrypt = require('bcryptjs');

function seed() {
    // Check if already seeded
    if (db.count('users') > 0) {
        console.log('Database already seeded (' + db.count('users') + ' users). Skipping.');
        console.log('To reseed, delete gprn-data.json and run again.');
        return;
    }

    console.log('Seeding database...');

    var SALT_ROUNDS = 10;

    // ---- Locums ----
    var locums = [
        { id: 'loc-001', email: 'sarah.williams@gprn.wales', password: 'Locum2026!', role: 'locum', profile: { title: 'Dr', firstName: 'Sarah', lastName: 'Williams', phone: '07891 234567', gmcNumber: '7612345', medicalSchool: 'Cardiff University', yearQualified: 2015, performerList: true, nhsPension: true, computerSystems: ['EMIS', 'Vision'], signingScripts: 'Will sign scripts', healthBoards: ['Cardiff and Vale', 'Cwm Taf Morgannwg', 'Aneurin Bevan'], preferredShiftTypes: ['AM', 'PM', 'Full Day'], travelDistance: 30, bio: 'Experienced GP with over 8 years of locum experience across South Wales.', bookingReliability: 98, responseTime: '1-2 days', totalShifts: 156, rates: { am: 430, pm: 430, fullDay: 820, onCall: 50, housecall: 0 }, practiceRates: {}, documents: { indemnity: { uploaded: true, name: 'Indemnity_Certificate_2026.pdf', expiry: '2026-09-15' }, performerListStatus: { uploaded: true, name: 'Performer_List_Confirmation.pdf', expiry: null }, dbs: { uploaded: true, name: 'DBS_Enhanced_Check.pdf', expiry: '2026-12-01' }, cv: { uploaded: true, name: 'Dr_Williams_CV.pdf', expiry: null } } }},
        { id: 'loc-002', email: 'rhys.parry@gprn.wales', password: 'RhysGP2024', role: 'locum', profile: { title: 'Dr', firstName: 'Rhys', lastName: 'Parry', phone: '07456 789012', gmcNumber: '7623456', medicalSchool: 'Swansea University', yearQualified: 2012, performerList: true, nhsPension: false, computerSystems: ['EMIS'], signingScripts: 'Will sign scripts', healthBoards: ['Swansea Bay', 'Hywel Dda', 'Cwm Taf Morgannwg'], preferredShiftTypes: ['Full Day'], travelDistance: 40, bio: 'Senior locum GP with extensive experience in chronic disease management.', bookingReliability: 95, responseTime: '< 1 day', totalShifts: 230, rates: { am: 450, pm: 450, fullDay: 850, onCall: 60, housecall: 15 }, practiceRates: {}, documents: { indemnity: { uploaded: true, name: 'Indemnity_2026.pdf' }, performerListStatus: { uploaded: true, name: 'PL_Status.pdf' }, dbs: { uploaded: true, name: 'DBS_Check.pdf' }, cv: { uploaded: true, name: 'CV_Dr_Parry.pdf' } } }},
        { id: 'loc-003', email: 'megan.jones@gprn.wales', password: 'MeganJ!456', role: 'locum', profile: { title: 'Dr', firstName: 'Megan', lastName: 'Jones', phone: '07723 456789', gmcNumber: '7634567', medicalSchool: 'University of Bristol', yearQualified: 2018, performerList: true, nhsPension: true, computerSystems: ['Vision', 'TPP'], signingScripts: 'Would negotiate a separate fee', healthBoards: ['Betsi Cadwaladr', 'Powys'], preferredShiftTypes: ['AM', 'PM'], travelDistance: 25, bio: 'Enthusiastic GP locum based in North Wales.', bookingReliability: 100, responseTime: '< 1 day', totalShifts: 78, rates: { am: 400, pm: 400, fullDay: 780, onCall: 40, housecall: 0 }, practiceRates: {}, documents: { indemnity: { uploaded: true, name: 'Indemnity_MJ.pdf' }, performerListStatus: { uploaded: true, name: 'Performer_List.pdf' }, dbs: { uploaded: false, name: null }, cv: { uploaded: true, name: 'CV_Megan_Jones.pdf' } } }},
        { id: 'loc-004', email: 'owen.davies@gprn.wales', password: 'OwenD#2023', role: 'locum', profile: { title: 'Dr', firstName: 'Owen', lastName: 'Davies', phone: '07934 567890', gmcNumber: '7645678', medicalSchool: 'Cardiff University', yearQualified: 2010, performerList: true, nhsPension: true, computerSystems: ['EMIS', 'Vision', 'TPP'], signingScripts: 'Will sign scripts', healthBoards: ['Cardiff and Vale', 'Aneurin Bevan', 'Cwm Taf Morgannwg', 'Swansea Bay'], preferredShiftTypes: ['AM', 'PM', 'Full Day', 'On-Call'], travelDistance: 50, bio: 'Versatile and highly experienced locum GP covering all of South Wales.', bookingReliability: 82, responseTime: '1-2 days', totalShifts: 312, rates: { am: 420, pm: 420, fullDay: 800, onCall: 55, housecall: 10 }, practiceRates: {}, documents: { indemnity: { uploaded: true, name: 'Indemnity_OD.pdf' }, performerListStatus: { uploaded: true, name: 'PL_OD.pdf' }, dbs: { uploaded: true, name: 'DBS_OD.pdf' }, cv: { uploaded: true, name: 'CV_Owen_Davies.pdf' } } }},
        { id: 'loc-005', email: 'elin.morgan@gprn.wales', password: 'ElinM@Wales', role: 'locum', profile: { title: 'Dr', firstName: 'Elin', lastName: 'Morgan', phone: '07612 345678', gmcNumber: '7656789', medicalSchool: 'University of Liverpool', yearQualified: 2019, performerList: true, nhsPension: true, computerSystems: ['EMIS'], signingScripts: 'Will sign scripts', healthBoards: ['Hywel Dda', 'Swansea Bay'], preferredShiftTypes: ['AM', 'Full Day'], travelDistance: 20, bio: 'Welsh-speaking GP locum based in West Wales.', bookingReliability: 100, responseTime: '< 1 day', totalShifts: 45, rates: { am: 410, pm: 410, fullDay: 790, onCall: 45, housecall: 0 }, practiceRates: {}, documents: { indemnity: { uploaded: true, name: 'Indemnity_EM.pdf' }, performerListStatus: { uploaded: true, name: 'PL_EM.pdf' }, dbs: { uploaded: true, name: 'DBS_EM.pdf' }, cv: { uploaded: true, name: 'CV_Elin_Morgan.pdf' } } }},
        { id: 'loc-006', email: 'james.evans@gprn.wales', password: 'JamesE!789', role: 'locum', profile: { title: 'Dr', firstName: 'James', lastName: 'Evans', phone: '07845 678901', gmcNumber: '7667890', medicalSchool: 'Peninsula Medical School', yearQualified: 2016, performerList: true, nhsPension: false, computerSystems: ['Vision'], signingScripts: 'Would negotiate a separate fee', healthBoards: ['Aneurin Bevan', 'Cardiff and Vale'], preferredShiftTypes: ['PM', 'Full Day'], travelDistance: 35, bio: 'Experienced GP with a focus on mental health and substance misuse.', bookingReliability: 74, responseTime: '2-3 days', totalShifts: 189, rates: { am: 440, pm: 440, fullDay: 840, onCall: 60, housecall: 12 }, practiceRates: {}, documents: { indemnity: { uploaded: true, name: 'Indemnity_JE.pdf' }, performerListStatus: { uploaded: true, name: 'PL_JE.pdf' }, dbs: { uploaded: true, name: 'DBS_JE.pdf' }, cv: { uploaded: false, name: null } } }},
        { id: 'loc-007', email: 'carys.thomas@gprn.wales', password: 'CarysT#2025', role: 'locum', profile: { title: 'Dr', firstName: 'Carys', lastName: 'Thomas', phone: '07567 890123', gmcNumber: '7678901', medicalSchool: 'Cardiff University', yearQualified: 2020, performerList: true, nhsPension: true, computerSystems: ['EMIS', 'Vision'], signingScripts: 'Will sign scripts', healthBoards: ['Cwm Taf Morgannwg', 'Cardiff and Vale', 'Swansea Bay'], preferredShiftTypes: ['AM', 'PM'], travelDistance: 20, bio: 'Newly qualified GP eager to build locum experience.', bookingReliability: 100, responseTime: '< 1 day', totalShifts: 23, rates: { am: 380, pm: 380, fullDay: 720, onCall: 35, housecall: 0 }, practiceRates: {}, documents: { indemnity: { uploaded: true, name: 'Indemnity_CT.pdf' }, performerListStatus: { uploaded: true, name: 'PL_CT.pdf' }, dbs: { uploaded: true, name: 'DBS_CT.pdf' }, cv: { uploaded: true, name: 'CV_Carys_Thomas.pdf' } } }},
        { id: 'loc-008', email: 'gareth.hughes@gprn.wales', password: 'GarethH!101', role: 'locum', profile: { title: 'Dr', firstName: 'Gareth', lastName: 'Hughes', phone: '07378 901234', gmcNumber: '7689012', medicalSchool: 'University of Manchester', yearQualified: 2008, performerList: true, nhsPension: true, computerSystems: ['EMIS', 'TPP'], signingScripts: 'Will sign scripts', healthBoards: ['Betsi Cadwaladr', 'Powys', 'Hywel Dda'], preferredShiftTypes: ['Full Day', 'On-Call'], travelDistance: 60, bio: 'Senior GP covering North and Mid Wales. Extensive rural practice experience.', bookingReliability: 91, responseTime: '1-2 days', totalShifts: 410, rates: { am: 460, pm: 460, fullDay: 880, onCall: 70, housecall: 20 }, practiceRates: {}, documents: { indemnity: { uploaded: true, name: 'Indemnity_GH.pdf' }, performerListStatus: { uploaded: true, name: 'PL_GH.pdf' }, dbs: { uploaded: true, name: 'DBS_GH.pdf' }, cv: { uploaded: true, name: 'CV_Gareth_Hughes.pdf' } } }}
    ];

    // ---- Practices ----
    var practices = [
        { id: 'prac-001', email: 'manager@ringland.wales', password: 'Practice2026!', role: 'practice', profile: { practiceName: 'Ringland Medical Practice', healthBoard: 'Aneurin Bevan', address: 'TRHills Health & Wellbein, 282 Ringland Circle', city: 'Newport', postcode: 'NP9 9PS', phone: '01633 274000', website: 'https://ringlandmedical.wales', computerSystem: 'EMIS', partners: 4, patientListSize: 8500, contactName: 'Jane Morgan', contactRole: 'Practice Manager', contactEmail: 'manager@ringland.wales', contactPhone: '01633 274001' }},
        { id: 'prac-002', email: 'admin@whitchurchroad.wales', password: 'Whitchurch!22', role: 'practice', profile: { practiceName: 'Whitchurch Road Surgery', healthBoard: 'Cardiff and Vale', address: '145 Whitchurch Road', city: 'Cardiff', postcode: 'CF14 3JN', phone: '029 2061 5000', website: 'https://whitchurchroadsurgery.wales', computerSystem: 'Vision', partners: 6, patientListSize: 12000, contactName: 'David Lloyd', contactRole: 'Practice Manager', contactEmail: 'admin@whitchurchroad.wales', contactPhone: '029 2061 5001' }},
        { id: 'prac-003', email: 'admin@radyrmedical.wales', password: 'Radyr#Med34', role: 'practice', profile: { practiceName: 'Radyr Medical Centre', healthBoard: 'Cardiff and Vale', address: '34 Station Road', city: 'Cardiff', postcode: 'CF15 8AA', phone: '029 2084 2000', website: 'https://radyrmedical.wales', computerSystem: 'EMIS', partners: 3, patientListSize: 6200, contactName: 'Helen Price', contactRole: 'Practice Manager', contactEmail: 'admin@radyrmedical.wales', contactPhone: '029 2084 2001' }},
        { id: 'prac-004', email: 'admin@malpasbrook.wales', password: 'Malpas!Brook5', role: 'practice', profile: { practiceName: 'Malpas Brook Health Centre', healthBoard: 'Aneurin Bevan', address: 'Pilton Vale', city: 'Newport', postcode: 'NP20 6WB', phone: '01633 855200', website: '', computerSystem: 'EMIS', partners: 5, patientListSize: 9800, contactName: 'Karen Richards', contactRole: 'Assistant Practice Manager', contactEmail: 'admin@malpasbrook.wales', contactPhone: '01633 855201' }},
        { id: 'prac-005', email: 'admin@trosnant.wales', password: 'Trosnant#66', role: 'practice', profile: { practiceName: 'Trosnant Lodge', healthBoard: 'Aneurin Bevan', address: 'Trosnant Street', city: 'Pontypool', postcode: 'NP4 8AT', phone: '01495 762200', website: '', computerSystem: 'Vision', partners: 3, patientListSize: 5400, contactName: 'Susan Evans', contactRole: 'Practice Manager', contactEmail: 'admin@trosnant.wales', contactPhone: '01495 762201' }},
        { id: 'prac-006', email: 'admin@bridgmoresurgery.wales', password: 'Bridgmore!77', role: 'practice', profile: { practiceName: 'Bridgmore Surgery', healthBoard: 'Cardiff and Vale', address: '12 Bridge Street', city: 'Cardiff', postcode: 'CF11 6NR', phone: '029 2039 5000', website: '', computerSystem: 'EMIS', partners: 4, patientListSize: 7600, contactName: 'Tom Jenkins', contactRole: 'Practice Manager', contactEmail: 'admin@bridgmore.wales', contactPhone: '029 2039 5001' }},
        { id: 'prac-007', email: 'admin@kingsroad.wales', password: 'KingsRd#88', role: 'practice', profile: { practiceName: 'Kings Road Surgery', healthBoard: 'Cardiff and Vale', address: '88 Kings Road', city: 'Cardiff', postcode: 'CF11 9DE', phone: '029 2023 4000', website: '', computerSystem: 'EMIS', partners: 2, patientListSize: 4200, contactName: 'Ann Thomas', contactRole: 'Practice Manager', contactEmail: 'admin@kingsroad.wales', contactPhone: '029 2023 4001' }},
        { id: 'prac-008', email: 'admin@clydach.wales', password: 'Clydach!99', role: 'practice', profile: { practiceName: 'Clydach Primary Care Centre', healthBoard: 'Swansea Bay', address: 'Clydach Health Centre, Centenary Way', city: 'Swansea', postcode: 'SA6 5EY', phone: '01792 843500', website: '', computerSystem: 'Vision', partners: 4, patientListSize: 8100, contactName: 'Lowri Griffiths', contactRole: 'Practice Manager', contactEmail: 'admin@clydach.wales', contactPhone: '01792 843501' }},
        { id: 'prac-009', email: 'admin@porttalbot.wales', password: 'PortT#2026', role: 'practice', profile: { practiceName: 'Port Talbot Medical Practice', healthBoard: 'Swansea Bay', address: '15 Commercial Road', city: 'Port Talbot', postcode: 'SA13 1LN', phone: '01639 882400', website: '', computerSystem: 'EMIS', partners: 3, patientListSize: 5800, contactName: 'Mark Edwards', contactRole: 'Practice Manager', contactEmail: 'admin@porttalbot.wales', contactPhone: '01639 882401' }},
        { id: 'prac-010', email: 'admin@wrexhamtown.wales', password: 'Wrexham!Town', role: 'practice', profile: { practiceName: 'Wrexham Town Surgery', healthBoard: 'Betsi Cadwaladr', address: '22 Regent Street', city: 'Wrexham', postcode: 'LL11 1RY', phone: '01978 291500', website: '', computerSystem: 'TPP', partners: 5, patientListSize: 11200, contactName: 'Bethan Williams', contactRole: 'Practice Manager', contactEmail: 'admin@wrexhamtown.wales', contactPhone: '01978 291501' }},
        { id: 'prac-011', email: 'admin@aberystwyth.wales', password: 'Aber#Med123', role: 'practice', profile: { practiceName: 'Aberystwyth Medical Centre', healthBoard: 'Hywel Dda', address: 'Padarn Surgery, Llanbadarn Road', city: 'Aberystwyth', postcode: 'SY23 1EY', phone: '01970 624500', website: '', computerSystem: 'EMIS', partners: 3, patientListSize: 6800, contactName: 'Sian Roberts', contactRole: 'Practice Manager', contactEmail: 'admin@aberystwyth.wales', contactPhone: '01970 624501' }},
        { id: 'prac-012', email: 'admin@brecon.wales', password: 'Brecon!Med45', role: 'practice', profile: { practiceName: 'Brecon Medical Practice', healthBoard: 'Powys', address: 'Cerrigochion Road', city: 'Brecon', postcode: 'LD3 7AB', phone: '01874 622131', website: '', computerSystem: 'Vision', partners: 2, patientListSize: 3900, contactName: 'Gareth Rees', contactRole: 'Practice Manager', contactEmail: 'admin@brecon.wales', contactPhone: '01874 622132' }}
    ];

    // Insert users
    var allUsers = locums.concat(practices);
    for (var i = 0; i < allUsers.length; i++) {
        var u = allUsers[i];
        var hash = bcrypt.hashSync(u.password, SALT_ROUNDS);
        db.insert('users', {
            id: u.id,
            email: u.email,
            password_hash: hash,
            role: u.role,
            profile: u.profile,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    console.log('Seeded ' + locums.length + ' locums and ' + practices.length + ' practices');

    // Generate shifts
    var today = new Date();
    var shiftTypes = ['GP Only', 'Any Qualified', 'GP Only', 'GP Only'];
    var comments = [
        'We are presently doing a daily assessment/triage whereby a lot of calls are over the telephone.',
        'AM session only. Straightforward surgery with experienced nursing team support.',
        'The AM / PM surgery comprises of 15 emergency, book on the day visits.',
        'Busy practice but well-supported. Full nursing team available.',
        'Standard surgery day. Mix of telephone and face-to-face consultations.',
        'Urgent cover needed. Practice will provide full orientation on arrival.',
        'Routine surgery with some home visits in the afternoon if needed.'
    ];

    for (var si = 0; si < 40; si++) {
        var dayOffset = Math.floor(si / 3) + 1;
        var shiftDate = new Date(today);
        shiftDate.setDate(today.getDate() + dayOffset);
        if (shiftDate.getDay() === 0 || shiftDate.getDay() === 6) {
            shiftDate.setDate(shiftDate.getDate() + (shiftDate.getDay() === 0 ? 1 : 2));
        }
        var practice = practices[si % practices.length];
        var isAM = si % 3 === 0;
        var isPM = si % 3 === 1;
        var isFullDay = si % 3 === 2;
        var sessionType = isFullDay ? 'Full Day' : (isAM ? 'AM' : 'PM');
        var startTime = isAM || isFullDay ? '08:30' : '13:00';
        var endTime = isPM || isFullDay ? '17:00' : '12:30';
        var dateStr = shiftDate.toISOString().split('T')[0];

        db.insert('shifts', {
            id: 'shift-' + String(si + 1).padStart(3, '0'),
            practice_id: practice.id,
            practice_name: practice.profile.practiceName,
            health_board: practice.profile.healthBoard,
            city: practice.profile.city,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            session_type: sessionType,
            status: 'open',
            data: {
                shiftType: shiftTypes[si % shiftTypes.length],
                housecalls: si % 4 !== 0,
                computerSystem: practice.profile.computerSystem,
                morningPatients: isAM || isFullDay ? 15 + (si % 6) : 0,
                afternoonPatients: isPM || isFullDay ? 12 + (si % 5) : 0,
                comment: comments[si % comments.length],
                applicants: Math.floor(Math.random() * 4),
                urgent: si % 7 === 0
            },
            created_at: new Date().toISOString()
        });
    }
    console.log('Seeded 40 shifts');

    // Generate offers
    var statuses = ['pending', 'accepted', 'withdrawn', 'completed', 'pending', 'pending'];
    for (var oi = 0; oi < 15; oi++) {
        var oDayOffset = oi < 5 ? (oi + 1) * 2 : -(oi * 3);
        var offerDate = new Date(today);
        offerDate.setDate(today.getDate() + oDayOffset);
        var shiftDate2 = new Date(offerDate);
        shiftDate2.setDate(offerDate.getDate() + (oi < 5 ? 1 : -1));
        var oPractice = practices[oi % practices.length];
        var oStatus = oi < 5 ? statuses[oi] : (oDayOffset < 0 ? 'completed' : 'pending');

        var offerData = {
            startTime: oi % 2 === 0 ? '08:30' : '13:00',
            endTime: oi % 2 === 0 ? '16:00' : '17:00',
            rateAM: 430, ratePM: 430, rateFullDay: 820, rateHousecall: 0,
            offerDate: offerDate.toISOString().split('T')[0],
            comment: oStatus === 'completed' ? 'Booked through Immediate Booking.' : '',
            housecalls: oi % 3 !== 0
        };
        if (oStatus === 'completed') {
            offerData.completedDate = shiftDate2.toISOString().split('T')[0];
        }

        db.insert('offers', {
            id: 'offer-' + String(oi + 1).padStart(3, '0'),
            shift_id: 'shift-' + String((oi % 12) + 1).padStart(3, '0'),
            locum_id: 'loc-001',
            practice_id: oPractice.id,
            practice_name: oPractice.profile.practiceName,
            health_board: oPractice.profile.healthBoard,
            shift_date: shiftDate2.toISOString().split('T')[0],
            session_type: oi % 3 === 0 ? 'Full Day' : (oi % 2 === 0 ? 'AM' : 'PM'),
            status: oStatus,
            data: offerData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }

    // Add 12 historical completed offers for loc-001
    for (var hi = 0; hi < 12; hi++) {
        var weeksAgo = hi + 1;
        var pastDate = new Date(today);
        pastDate.setDate(today.getDate() - (weeksAgo * 7));
        if (pastDate.getDay() === 0) pastDate.setDate(pastDate.getDate() + 1);
        if (pastDate.getDay() === 6) pastDate.setDate(pastDate.getDate() + 2);
        var hPractice = practices[hi % 4];
        var hSessionType = hi % 3 === 0 ? 'Full Day' : (hi % 2 === 0 ? 'AM' : 'PM');

        db.insert('offers', {
            id: 'offer-hist-' + String(hi + 1).padStart(3, '0'),
            shift_id: 'shift-' + String((hi % 12) + 1).padStart(3, '0'),
            locum_id: 'loc-001',
            practice_id: hPractice.id,
            practice_name: hPractice.profile.practiceName,
            health_board: hPractice.profile.healthBoard,
            shift_date: pastDate.toISOString().split('T')[0],
            session_type: hSessionType,
            status: 'completed',
            data: { startTime: '08:30', endTime: '17:00', rateAM: 430, ratePM: 430, rateFullDay: 820, rateHousecall: 0, offerDate: pastDate.toISOString().split('T')[0], completedDate: pastDate.toISOString().split('T')[0], comment: 'Completed successfully.' },
            created_at: pastDate.toISOString(),
            updated_at: pastDate.toISOString()
        });
    }

    // Add 8 completed offers for other locums at prac-001
    for (var pi = 0; pi < 8; pi++) {
        var pLocumId = pi < 4 ? 'loc-002' : 'loc-003';
        var pastDate2 = new Date(today);
        pastDate2.setDate(today.getDate() - ((pi + 2) * 7));
        if (pastDate2.getDay() === 0) pastDate2.setDate(pastDate2.getDate() + 1);
        if (pastDate2.getDay() === 6) pastDate2.setDate(pastDate2.getDate() + 2);

        db.insert('offers', {
            id: 'offer-prac-' + String(pi + 1).padStart(3, '0'),
            shift_id: 'shift-001',
            locum_id: pLocumId,
            practice_id: 'prac-001',
            practice_name: 'Ringland Medical Practice',
            health_board: 'Aneurin Bevan',
            shift_date: pastDate2.toISOString().split('T')[0],
            session_type: pi % 2 === 0 ? 'AM' : 'Full Day',
            status: 'completed',
            data: { startTime: '08:30', endTime: '17:00', rateAM: 450, ratePM: 450, rateFullDay: 850, rateHousecall: 0, completedDate: pastDate2.toISOString().split('T')[0] },
            created_at: pastDate2.toISOString(),
            updated_at: pastDate2.toISOString()
        });
    }
    console.log('Seeded offers (15 + 12 historical + 8 practice history)');

    // Generate notifications
    var notifs = [
        { id: 'notif-001', user_id: 'loc-001', type: 'shift_confirmed', title: 'Shift Confirmed', message: 'Your shift at Ringland Medical Practice has been confirmed.', read: false },
        { id: 'notif-002', user_id: 'loc-001', type: 'new_shifts', title: 'New Shifts Available', message: '5 new shifts matching your preferences have been posted in Cardiff and Vale.', read: false },
        { id: 'notif-003', user_id: 'loc-001', type: 'offer_accepted', title: 'Offer Accepted', message: 'Whitchurch Road Surgery has accepted your offer.', read: true },
        { id: 'notif-004', user_id: 'loc-001', type: 'reliability_warning', title: 'Booking Reliability', message: 'Your booking reliability is 98%. Keep it above 95% for priority access.', read: true },
        { id: 'notif-005', user_id: 'loc-001', type: 'cpd_event', title: 'Upcoming CPD Event', message: 'Emergency Skills Workshop at Royal Gwent Hospital. Register now.', read: true },
        { id: 'notif-006', user_id: 'prac-001', type: 'new_offer', title: 'New Application', message: 'Dr Sarah Williams has applied for your shift.', read: false },
        { id: 'notif-007', user_id: 'prac-001', type: 'shift_confirmed', title: 'Shift Confirmed', message: 'A locum has confirmed attendance for your upcoming shift.', read: false },
        { id: 'notif-008', user_id: 'prac-001', type: 'payment_reminder', title: 'Payment Due', message: 'Invoice INV-001 is due for payment within 7 days.', read: false },
        { id: 'notif-009', user_id: 'prac-001', type: 'new_offer', title: 'New Application', message: 'Dr Rhys Parry has applied for your shift.', read: true },
        { id: 'notif-010', user_id: 'prac-001', type: 'leave_feedback', title: 'Leave Feedback', message: 'Please rate the locum who worked on your recent shift.', read: true }
    ];
    for (var ni = 0; ni < notifs.length; ni++) {
        var n = notifs[ni];
        var d = new Date();
        d.setDate(d.getDate() - ni);
        db.insert('notifications', {
            id: n.id,
            user_id: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            read: n.read,
            data: {},
            created_at: d.toISOString()
        });
    }
    console.log('Seeded 10 notifications');

    // Force save to disk
    db.saveNow();
    console.log('Database seeding complete!');
}

// Run if called directly
if (require.main === module) {
    seed();
}

module.exports = seed;
