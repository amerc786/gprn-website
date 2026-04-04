// ===== GPRN Mock Data =====
// Realistic Welsh GP locum booking platform seed data

const MOCK_DATA = {
    locums: [
        {
            id: 'loc-001',
            email: 'sarah.williams@gprn.wales',
            password: 'Locum2026!',
            role: 'locum',
            title: 'Dr',
            firstName: 'Sarah',
            lastName: 'Williams',
            phone: '07891 234567',
            gmcNumber: '7612345',
            medicalSchool: 'Cardiff University',
            yearQualified: 2015,
            performerList: true,
            nhsPension: true,
            computerSystems: ['EMIS', 'Vision'],
            signingScripts: 'Will sign scripts',
            healthBoards: ['Cardiff and Vale', 'Cwm Taf Morgannwg', 'Aneurin Bevan'],
            preferredShiftTypes: ['AM', 'PM', 'Full Day'],
            travelDistance: 30,
            bio: 'Experienced GP with over 8 years of locum experience across South Wales. Comfortable with all age groups and skilled in minor surgery. Flexible and reliable.',
            avatar: null,
            bookingReliability: 98,
            responseTime: '1-2 days',
            totalShifts: 156,
            documents: {
                indemnity: { uploaded: true, name: 'Indemnity_Certificate_2026.pdf', expiry: '2026-09-15' },
                performerListStatus: { uploaded: true, name: 'Performer_List_Confirmation.pdf', expiry: null },
                dbs: { uploaded: true, name: 'DBS_Enhanced_Check.pdf', expiry: '2026-12-01' },
                cv: { uploaded: true, name: 'Dr_Williams_CV.pdf', expiry: null }
            },
            rates: {
                am: 430,
                pm: 430,
                fullDay: 820,
                onCall: 50,
                housecall: 0
            },
            practiceRates: {}
        },
        {
            id: 'loc-002',
            email: 'rhys.parry@gprn.wales',
            password: 'RhysGP2024',
            role: 'locum',
            title: 'Dr',
            firstName: 'Rhys',
            lastName: 'Parry',
            phone: '07456 789012',
            gmcNumber: '7623456',
            medicalSchool: 'Swansea University',
            yearQualified: 2012,
            performerList: true,
            nhsPension: false,
            computerSystems: ['EMIS'],
            signingScripts: 'Will sign scripts',
            healthBoards: ['Swansea Bay', 'Hywel Dda', 'Cwm Taf Morgannwg'],
            preferredShiftTypes: ['Full Day'],
            travelDistance: 40,
            bio: 'Senior locum GP with extensive experience in chronic disease management and geriatric care. Available for long-term placements.',
            avatar: null,
            bookingReliability: 95,
            responseTime: '< 1 day',
            totalShifts: 230,
            documents: {
                indemnity: { uploaded: true, name: 'Indemnity_2026.pdf' },
                performerListStatus: { uploaded: true, name: 'PL_Status.pdf' },
                dbs: { uploaded: true, name: 'DBS_Check.pdf' },
                cv: { uploaded: true, name: 'CV_Dr_Parry.pdf' }
            },
            rates: {
                am: 450,
                pm: 450,
                fullDay: 850,
                onCall: 60,
                housecall: 15
            },
            practiceRates: {}
        },
        {
            id: 'loc-003',
            email: 'megan.jones@gprn.wales',
            password: 'MeganJ!456',
            role: 'locum',
            title: 'Dr',
            firstName: 'Megan',
            lastName: 'Jones',
            phone: '07723 456789',
            gmcNumber: '7634567',
            medicalSchool: 'University of Bristol',
            yearQualified: 2018,
            performerList: true,
            nhsPension: true,
            computerSystems: ['Vision', 'TPP'],
            signingScripts: 'Would negotiate a separate fee',
            healthBoards: ['Betsi Cadwaladr', 'Powys'],
            preferredShiftTypes: ['AM', 'PM'],
            travelDistance: 25,
            bio: 'Enthusiastic GP locum based in North Wales. Special interests in women\'s health and paediatrics.',
            avatar: null,
            bookingReliability: 100,
            responseTime: '< 1 day',
            totalShifts: 78,
            documents: {
                indemnity: { uploaded: true, name: 'Indemnity_MJ.pdf' },
                performerListStatus: { uploaded: true, name: 'Performer_List.pdf' },
                dbs: { uploaded: false, name: null },
                cv: { uploaded: true, name: 'CV_Megan_Jones.pdf' }
            },
            rates: {
                am: 400,
                pm: 400,
                fullDay: 780,
                onCall: 40,
                housecall: 0
            },
            practiceRates: {}
        },
        {
            id: 'loc-004',
            email: 'owen.davies@gprn.wales',
            password: 'OwenD#2023',
            role: 'locum',
            title: 'Dr',
            firstName: 'Owen',
            lastName: 'Davies',
            phone: '07934 567890',
            gmcNumber: '7645678',
            medicalSchool: 'Cardiff University',
            yearQualified: 2010,
            performerList: true,
            nhsPension: true,
            computerSystems: ['EMIS', 'Vision', 'TPP'],
            signingScripts: 'Will sign scripts',
            healthBoards: ['Cardiff and Vale', 'Aneurin Bevan', 'Cwm Taf Morgannwg', 'Swansea Bay'],
            preferredShiftTypes: ['AM', 'PM', 'Full Day', 'On-Call'],
            travelDistance: 50,
            bio: 'Versatile and highly experienced locum GP covering all of South Wales. Over 300 locum sessions completed. Skilled in all clinical systems.',
            avatar: null,
            bookingReliability: 82,
            responseTime: '1-2 days',
            totalShifts: 312,
            documents: {
                indemnity: { uploaded: true, name: 'Indemnity_OD.pdf' },
                performerListStatus: { uploaded: true, name: 'PL_OD.pdf' },
                dbs: { uploaded: true, name: 'DBS_OD.pdf' },
                cv: { uploaded: true, name: 'CV_Owen_Davies.pdf' }
            },
            rates: {
                am: 420,
                pm: 420,
                fullDay: 800,
                onCall: 55,
                housecall: 10
            },
            practiceRates: {}
        },
        {
            id: 'loc-005',
            email: 'elin.morgan@gprn.wales',
            password: 'ElinM@Wales',
            role: 'locum',
            title: 'Dr',
            firstName: 'Elin',
            lastName: 'Morgan',
            phone: '07612 345678',
            gmcNumber: '7656789',
            medicalSchool: 'University of Liverpool',
            yearQualified: 2019,
            performerList: true,
            nhsPension: true,
            computerSystems: ['EMIS'],
            signingScripts: 'Will sign scripts',
            healthBoards: ['Hywel Dda', 'Swansea Bay'],
            preferredShiftTypes: ['AM', 'Full Day'],
            travelDistance: 20,
            bio: 'Welsh-speaking GP locum based in West Wales. Committed to providing bilingual healthcare services.',
            avatar: null,
            bookingReliability: 100,
            responseTime: '< 1 day',
            totalShifts: 45,
            documents: {
                indemnity: { uploaded: true, name: 'Indemnity_EM.pdf' },
                performerListStatus: { uploaded: true, name: 'PL_EM.pdf' },
                dbs: { uploaded: true, name: 'DBS_EM.pdf' },
                cv: { uploaded: true, name: 'CV_Elin_Morgan.pdf' }
            },
            rates: {
                am: 410,
                pm: 410,
                fullDay: 790,
                onCall: 45,
                housecall: 0
            },
            practiceRates: {}
        },
        {
            id: 'loc-006',
            email: 'james.evans@gprn.wales',
            password: 'JamesE!789',
            role: 'locum',
            title: 'Dr',
            firstName: 'James',
            lastName: 'Evans',
            phone: '07845 678901',
            gmcNumber: '7667890',
            medicalSchool: 'Peninsula Medical School',
            yearQualified: 2016,
            performerList: true,
            nhsPension: false,
            computerSystems: ['Vision'],
            signingScripts: 'Would negotiate a separate fee',
            healthBoards: ['Aneurin Bevan', 'Cardiff and Vale'],
            preferredShiftTypes: ['PM', 'Full Day'],
            travelDistance: 35,
            bio: 'Experienced GP with a focus on mental health and substance misuse. Happy to cover complex caseloads.',
            avatar: null,
            bookingReliability: 74,
            responseTime: '2-3 days',
            totalShifts: 189,
            documents: {
                indemnity: { uploaded: true, name: 'Indemnity_JE.pdf' },
                performerListStatus: { uploaded: true, name: 'PL_JE.pdf' },
                dbs: { uploaded: true, name: 'DBS_JE.pdf' },
                cv: { uploaded: false, name: null }
            },
            rates: {
                am: 440,
                pm: 440,
                fullDay: 840,
                onCall: 60,
                housecall: 12
            },
            practiceRates: {}
        },
        {
            id: 'loc-007',
            email: 'carys.thomas@gprn.wales',
            password: 'CarysT#2025',
            role: 'locum',
            title: 'Dr',
            firstName: 'Carys',
            lastName: 'Thomas',
            phone: '07567 890123',
            gmcNumber: '7678901',
            medicalSchool: 'Cardiff University',
            yearQualified: 2020,
            performerList: true,
            nhsPension: true,
            computerSystems: ['EMIS', 'Vision'],
            signingScripts: 'Will sign scripts',
            healthBoards: ['Cwm Taf Morgannwg', 'Cardiff and Vale', 'Swansea Bay'],
            preferredShiftTypes: ['AM', 'PM'],
            travelDistance: 20,
            bio: 'Newly qualified GP eager to build locum experience. Strong interest in urgent care and minor injuries.',
            avatar: null,
            bookingReliability: 100,
            responseTime: '< 1 day',
            totalShifts: 23,
            documents: {
                indemnity: { uploaded: true, name: 'Indemnity_CT.pdf' },
                performerListStatus: { uploaded: true, name: 'PL_CT.pdf' },
                dbs: { uploaded: true, name: 'DBS_CT.pdf' },
                cv: { uploaded: true, name: 'CV_Carys_Thomas.pdf' }
            },
            rates: {
                am: 380,
                pm: 380,
                fullDay: 720,
                onCall: 35,
                housecall: 0
            },
            practiceRates: {}
        },
        {
            id: 'loc-008',
            email: 'gareth.hughes@gprn.wales',
            password: 'GarethH!101',
            role: 'locum',
            title: 'Dr',
            firstName: 'Gareth',
            lastName: 'Hughes',
            phone: '07378 901234',
            gmcNumber: '7689012',
            medicalSchool: 'University of Manchester',
            yearQualified: 2008,
            performerList: true,
            nhsPension: true,
            computerSystems: ['EMIS', 'TPP'],
            signingScripts: 'Will sign scripts',
            healthBoards: ['Betsi Cadwaladr', 'Powys', 'Hywel Dda'],
            preferredShiftTypes: ['Full Day', 'On-Call'],
            travelDistance: 60,
            bio: 'Senior GP covering North and Mid Wales. Extensive rural practice experience. Happy to travel and cover remote practices.',
            avatar: null,
            bookingReliability: 91,
            responseTime: '1-2 days',
            totalShifts: 410,
            documents: {
                indemnity: { uploaded: true, name: 'Indemnity_GH.pdf' },
                performerListStatus: { uploaded: true, name: 'PL_GH.pdf' },
                dbs: { uploaded: true, name: 'DBS_GH.pdf' },
                cv: { uploaded: true, name: 'CV_Gareth_Hughes.pdf' }
            },
            rates: {
                am: 460,
                pm: 460,
                fullDay: 880,
                onCall: 70,
                housecall: 20
            },
            practiceRates: {}
        }
    ],

    practices: [
        {
            id: 'prac-001',
            email: 'manager@ringland.wales',
            password: 'Practice2026!',
            role: 'practice',
            practiceName: 'Ringland Medical Practice',
            healthBoard: 'Aneurin Bevan',
            address: 'TRHills Health & Wellbein, 282 Ringland Circle',
            city: 'Newport',
            postcode: 'NP9 9PS',
            phone: '01633 274000',
            website: 'https://ringlandmedical.wales',
            computerSystem: 'EMIS',
            partners: 4,
            patientListSize: 8500,
            contactName: 'Jane Morgan',
            contactRole: 'Practice Manager',
            contactEmail: 'manager@ringland.wales',
            contactPhone: '01633 274001'
        },
        {
            id: 'prac-002',
            email: 'admin@whitchurchroad.wales',
            password: 'Whitchurch!22',
            role: 'practice',
            practiceName: 'Whitchurch Road Surgery',
            healthBoard: 'Cardiff and Vale',
            address: '145 Whitchurch Road',
            city: 'Cardiff',
            postcode: 'CF14 3JN',
            phone: '029 2061 5000',
            website: 'https://whitchurchroadsurgery.wales',
            computerSystem: 'Vision',
            partners: 6,
            patientListSize: 12000,
            contactName: 'David Lloyd',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@whitchurchroad.wales',
            contactPhone: '029 2061 5001'
        },
        {
            id: 'prac-003',
            email: 'admin@radyrmedical.wales',
            password: 'Radyr#Med34',
            role: 'practice',
            practiceName: 'Radyr Medical Centre',
            healthBoard: 'Cardiff and Vale',
            address: '34 Station Road',
            city: 'Cardiff',
            postcode: 'CF15 8AA',
            phone: '029 2084 2000',
            website: 'https://radyrmedical.wales',
            computerSystem: 'EMIS',
            partners: 3,
            patientListSize: 6200,
            contactName: 'Helen Price',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@radyrmedical.wales',
            contactPhone: '029 2084 2001'
        },
        {
            id: 'prac-004',
            email: 'admin@malpasbrook.wales',
            password: 'Malpas!Brook5',
            role: 'practice',
            practiceName: 'Malpas Brook Health Centre',
            healthBoard: 'Aneurin Bevan',
            address: 'Pilton Vale',
            city: 'Newport',
            postcode: 'NP20 6WB',
            phone: '01633 855200',
            website: '',
            computerSystem: 'EMIS',
            partners: 5,
            patientListSize: 9800,
            contactName: 'Karen Richards',
            contactRole: 'Assistant Practice Manager',
            contactEmail: 'admin@malpasbrook.wales',
            contactPhone: '01633 855201'
        },
        {
            id: 'prac-005',
            email: 'admin@trosnant.wales',
            password: 'Trosnant#66',
            role: 'practice',
            practiceName: 'Trosnant Lodge',
            healthBoard: 'Aneurin Bevan',
            address: 'Trosnant Street',
            city: 'Pontypool',
            postcode: 'NP4 8AT',
            phone: '01495 762200',
            website: '',
            computerSystem: 'Vision',
            partners: 3,
            patientListSize: 5400,
            contactName: 'Susan Evans',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@trosnant.wales',
            contactPhone: '01495 762201'
        },
        {
            id: 'prac-006',
            email: 'admin@bridgmoresurgery.wales',
            password: 'Bridgmore!77',
            role: 'practice',
            practiceName: 'Bridgmore Surgery',
            healthBoard: 'Cardiff and Vale',
            address: '12 Bridge Street',
            city: 'Cardiff',
            postcode: 'CF11 6NR',
            phone: '029 2039 5000',
            website: '',
            computerSystem: 'EMIS',
            partners: 4,
            patientListSize: 7600,
            contactName: 'Tom Jenkins',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@bridgmore.wales',
            contactPhone: '029 2039 5001'
        },
        {
            id: 'prac-007',
            email: 'admin@kingsroad.wales',
            password: 'KingsRd#88',
            role: 'practice',
            practiceName: 'Kings Road Surgery',
            healthBoard: 'Cardiff and Vale',
            address: '88 Kings Road',
            city: 'Cardiff',
            postcode: 'CF11 9DE',
            phone: '029 2023 4000',
            website: '',
            computerSystem: 'EMIS',
            partners: 2,
            patientListSize: 4200,
            contactName: 'Ann Thomas',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@kingsroad.wales',
            contactPhone: '029 2023 4001'
        },
        {
            id: 'prac-008',
            email: 'admin@clydach.wales',
            password: 'Clydach!99',
            role: 'practice',
            practiceName: 'Clydach Primary Care Centre',
            healthBoard: 'Swansea Bay',
            address: 'Clydach Health Centre, Centenary Way',
            city: 'Swansea',
            postcode: 'SA6 5EY',
            phone: '01792 843500',
            website: '',
            computerSystem: 'Vision',
            partners: 4,
            patientListSize: 8100,
            contactName: 'Lowri Griffiths',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@clydach.wales',
            contactPhone: '01792 843501'
        },
        {
            id: 'prac-009',
            email: 'admin@porttalbot.wales',
            password: 'PortT#2026',
            role: 'practice',
            practiceName: 'Port Talbot Medical Practice',
            healthBoard: 'Swansea Bay',
            address: '15 Commercial Road',
            city: 'Port Talbot',
            postcode: 'SA13 1LN',
            phone: '01639 882400',
            website: '',
            computerSystem: 'EMIS',
            partners: 3,
            patientListSize: 5800,
            contactName: 'Mark Edwards',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@porttalbot.wales',
            contactPhone: '01639 882401'
        },
        {
            id: 'prac-010',
            email: 'admin@wrexhamtown.wales',
            password: 'Wrexham!Town',
            role: 'practice',
            practiceName: 'Wrexham Town Surgery',
            healthBoard: 'Betsi Cadwaladr',
            address: '22 Regent Street',
            city: 'Wrexham',
            postcode: 'LL11 1RY',
            phone: '01978 291500',
            website: '',
            computerSystem: 'TPP',
            partners: 5,
            patientListSize: 11200,
            contactName: 'Bethan Williams',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@wrexhamtown.wales',
            contactPhone: '01978 291501'
        },
        {
            id: 'prac-011',
            email: 'admin@aberystwyth.wales',
            password: 'Aber#Med123',
            role: 'practice',
            practiceName: 'Aberystwyth Medical Centre',
            healthBoard: 'Hywel Dda',
            address: 'Padarn Surgery, Llanbadarn Road',
            city: 'Aberystwyth',
            postcode: 'SY23 1EY',
            phone: '01970 624500',
            website: '',
            computerSystem: 'EMIS',
            partners: 3,
            patientListSize: 6800,
            contactName: 'Sian Roberts',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@aberystwyth.wales',
            contactPhone: '01970 624501'
        },
        {
            id: 'prac-012',
            email: 'admin@brecon.wales',
            password: 'Brecon!Med45',
            role: 'practice',
            practiceName: 'Brecon Medical Practice',
            healthBoard: 'Powys',
            address: 'Cerrigochion Road',
            city: 'Brecon',
            postcode: 'LD3 7AB',
            phone: '01874 622131',
            website: '',
            computerSystem: 'Vision',
            partners: 2,
            patientListSize: 3900,
            contactName: 'Gareth Rees',
            contactRole: 'Practice Manager',
            contactEmail: 'admin@brecon.wales',
            contactPhone: '01874 622132'
        }
    ],

    shifts: [],
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

    cpdEvents: [
        {
            id: 'cpd-001',
            title: 'Revalidation Support Unit (RSU)',
            provider: 'Health Education and Improvement Wales (HEIW)',
            type: 'web',
            description: 'For eLearning resources, webinars and events please register on Y Ty Dysgu.',
            url: 'https://heiw.nhs.wales',
            healthBoard: null
        },
        {
            id: 'cpd-002',
            title: 'Emergency Skills Workshop',
            provider: 'Aneurin Bevan UHB',
            type: 'event',
            date: '2026-04-25',
            time: '09:00 - 17:00',
            location: 'Royal Gwent Hospital, Newport',
            description: 'Hands-on workshop covering emergency procedures for primary care GPs. Includes BLS refresher and anaphylaxis management.',
            healthBoard: 'Aneurin Bevan'
        },
        {
            id: 'cpd-003',
            title: 'Dermatology Masterclass',
            provider: 'Cardiff and Vale UHB',
            type: 'event',
            date: '2026-05-10',
            time: '13:00 - 17:00',
            location: 'University Hospital of Wales, Cardiff',
            description: 'Advanced dermatology session covering common and rare presentations in primary care.',
            healthBoard: 'Cardiff and Vale'
        },
        {
            id: 'cpd-004',
            title: 'Mental Health in Primary Care',
            provider: 'Swansea Bay UHB',
            type: 'event',
            date: '2026-05-22',
            time: '09:30 - 16:30',
            location: 'Singleton Hospital, Swansea',
            description: 'Full day course on managing mental health conditions in GP settings. Includes CBT fundamentals and prescribing update.',
            healthBoard: 'Swansea Bay'
        },
        {
            id: 'cpd-005',
            title: 'Safeguarding Level 3 Update',
            provider: 'Betsi Cadwaladr UHB',
            type: 'event',
            date: '2026-06-05',
            time: '09:00 - 13:00',
            location: 'Wrexham Maelor Hospital',
            description: 'Mandatory safeguarding training update for all GPs. Covers adults and children.',
            healthBoard: 'Betsi Cadwaladr'
        }
    ],

    jobs: [
        {
            id: 'job-001',
            practiceName: 'Trosnant Lodge',
            healthBoard: 'Aneurin Bevan',
            title: 'Salaried GP - Maternity Cover',
            type: 'Maternity Cover',
            sessions: '4-6 sessions per week',
            duration: 'From July 2026 for minimum 6 months',
            salary: 'Competitive, dependent on experience',
            closingDate: '2026-05-01',
            description: 'We are looking for a reliable salaried GP to cover maternity leave starting July 2026. The practice has a friendly team and uses Vision clinical system.',
            contactEmail: 'admin@trosnant.wales'
        },
        {
            id: 'job-002',
            practiceName: 'Wrexham Town Surgery',
            healthBoard: 'Betsi Cadwaladr',
            title: 'GP Partner',
            type: 'Partnership',
            sessions: '8 sessions per week',
            duration: 'Permanent',
            salary: 'Full PMS contract share',
            closingDate: '2026-05-15',
            description: 'Exciting opportunity to join a forward-thinking practice as a full partner. Large patient list with scope for development.',
            contactEmail: 'admin@wrexhamtown.wales'
        },
        {
            id: 'job-003',
            practiceName: 'Radyr Medical Centre',
            healthBoard: 'Cardiff and Vale',
            title: 'Salaried GP',
            type: 'Permanent',
            sessions: '6 sessions per week',
            duration: 'Permanent',
            salary: '£70,000 - £80,000 pro rata',
            closingDate: '2026-04-30',
            description: 'Friendly semi-rural practice seeking a salaried GP to join our established team. Special interests welcome. EMIS clinical system.',
            contactEmail: 'admin@radyrmedical.wales'
        },
        {
            id: 'job-004',
            practiceName: 'Aberystwyth Medical Centre',
            healthBoard: 'Hywel Dda',
            title: 'Locum GP - Long Term',
            type: 'Long-Term Locum',
            sessions: '5 sessions per week',
            duration: '12 months initially',
            salary: '£450 per session',
            closingDate: '2026-04-20',
            description: 'We need a reliable long-term locum to support the practice while we recruit a permanent GP. Beautiful coastal location.',
            contactEmail: 'admin@aberystwyth.wales'
        }
    ],

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

// Generate dynamic shifts based on today's date
function generateShifts() {
    const today = new Date();
    const shifts = [];
    const practices = MOCK_DATA.practices;
    const shiftTypes = ['GP Only', 'Any Qualified', 'GP Only', 'GP Only'];
    const comments = [
        'We are presently doing a daily assessment/triage whereby a lot of calls are over the telephone and patients brought in where needed.',
        'AM session only. Straightforward surgery with experienced nursing team support.',
        'The AM / PM surgery comprises of 15 emergency, book on the day visits.',
        'Busy practice but well-supported. Full nursing team available.',
        'Standard surgery day. Mix of telephone and face-to-face consultations.',
        'Urgent cover needed. Practice will provide full orientation on arrival.',
        'Routine surgery with some home visits in the afternoon if needed.'
    ];

    for (let i = 0; i < 40; i++) {
        const dayOffset = Math.floor(i / 3) + 1;
        const shiftDate = new Date(today);
        shiftDate.setDate(today.getDate() + dayOffset);
        if (shiftDate.getDay() === 0 || shiftDate.getDay() === 6) {
            shiftDate.setDate(shiftDate.getDate() + (shiftDate.getDay() === 0 ? 1 : 2));
        }

        const practice = practices[i % practices.length];
        const isAM = i % 3 === 0;
        const isPM = i % 3 === 1;
        const isFullDay = i % 3 === 2;

        shifts.push({
            id: `shift-${String(i + 1).padStart(3, '0')}`,
            practiceId: practice.id,
            practiceName: practice.practiceName,
            healthBoard: practice.healthBoard,
            city: practice.city,
            date: shiftDate.toISOString().split('T')[0],
            startTime: isAM || isFullDay ? '08:30' : '13:00',
            endTime: isPM || isFullDay ? '17:00' : '12:30',
            sessionType: isFullDay ? 'Full Day' : (isAM ? 'AM' : 'PM'),
            shiftType: shiftTypes[i % shiftTypes.length],
            housecalls: i % 4 !== 0,
            computerSystem: practice.computerSystem,
            morningPatients: isAM || isFullDay ? 15 + (i % 6) : 0,
            afternoonPatients: isPM || isFullDay ? 12 + (i % 5) : 0,
            comment: comments[i % comments.length],
            applicants: Math.floor(Math.random() * 4),
            urgent: i % 7 === 0,
            status: 'open'
        });
    }
    return shifts;
}

function generateOffers() {
    const today = new Date();
    const offers = [];
    const statuses = ['pending', 'accepted', 'withdrawn', 'completed', 'pending', 'pending'];

    for (let i = 0; i < 15; i++) {
        const dayOffset = i < 5 ? (i + 1) * 2 : -(i * 3);
        const offerDate = new Date(today);
        offerDate.setDate(today.getDate() + dayOffset);

        const shiftDate = new Date(offerDate);
        shiftDate.setDate(offerDate.getDate() + (i < 5 ? 1 : -1));

        const practice = MOCK_DATA.practices[i % MOCK_DATA.practices.length];
        const status = i < 5 ? statuses[i] : (dayOffset < 0 ? 'completed' : 'pending');

        offers.push({
            id: `offer-${String(i + 1).padStart(3, '0')}`,
            shiftId: `shift-${String((i % 12) + 1).padStart(3, '0')}`,
            locumId: 'loc-001',
            practiceId: practice.id,
            practiceName: practice.practiceName,
            healthBoard: practice.healthBoard,
            shiftDate: shiftDate.toISOString().split('T')[0],
            startTime: i % 2 === 0 ? '08:30' : '13:00',
            endTime: i % 2 === 0 ? '16:00' : '17:00',
            sessionType: i % 3 === 0 ? 'Full Day' : (i % 2 === 0 ? 'AM' : 'PM'),
            rateAM: 430,
            ratePM: 430,
            rateFullDay: 820,
            rateHousecall: 0,
            status: status,
            offerDate: offerDate.toISOString().split('T')[0],
            comment: status === 'completed' ? 'Booked through Immediate Booking. Agreed morning: 12 patients starting at 09:00.' : '',
            housecalls: i % 3 !== 0
        });
    }
    // Add 12 completed historical offers for loc-001 across last 3 months
    var histPractices = [MOCK_DATA.practices[0], MOCK_DATA.practices[1], MOCK_DATA.practices[2], MOCK_DATA.practices[3]];
    var histSessions = ['AM', 'PM', 'Full Day', 'AM', 'PM', 'Full Day', 'AM', 'PM', 'Full Day', 'AM', 'PM', 'Full Day'];
    for (var h = 0; h < 12; h++) {
        var daysBack = 7 + (h * 7); // spread across ~12 weeks
        var histShiftDate = new Date(today);
        histShiftDate.setDate(today.getDate() - daysBack);
        // Skip weekends
        if (histShiftDate.getDay() === 0) histShiftDate.setDate(histShiftDate.getDate() - 2);
        if (histShiftDate.getDay() === 6) histShiftDate.setDate(histShiftDate.getDate() - 1);
        var histPractice = histPractices[h % histPractices.length];
        var histSession = histSessions[h];
        var histRate = histSession === 'Full Day' ? 820 : 430;
        offers.push({
            id: 'offer-hist-loc001-' + String(h + 1).padStart(2, '0'),
            shiftId: 'shift-hist-' + String(h + 1).padStart(3, '0'),
            locumId: 'loc-001',
            practiceId: histPractice.id,
            practiceName: histPractice.practiceName,
            healthBoard: histPractice.healthBoard,
            shiftDate: histShiftDate.toISOString().split('T')[0],
            startTime: histSession === 'PM' ? '13:00' : '08:30',
            endTime: histSession === 'AM' ? '12:30' : '17:00',
            sessionType: histSession,
            rateAM: 430,
            ratePM: 430,
            rateFullDay: 820,
            rateHousecall: 0,
            status: 'completed',
            offerDate: new Date(histShiftDate.getTime() - 7 * 86400000).toISOString().split('T')[0],
            completedDate: histShiftDate.toISOString().split('T')[0],
            completedByPractice: true,
            comment: 'Booked through Immediate Booking. Agreed morning: 12 patients starting at 09:00.',
            housecalls: h % 3 !== 0
        });
    }

    // Add 8 completed offers for loc-002 and loc-003 at prac-001
    var otherLocums = ['loc-002', 'loc-003'];
    var otherSessions = ['AM', 'Full Day', 'PM', 'AM', 'Full Day', 'PM', 'AM', 'Full Day'];
    for (var j = 0; j < 8; j++) {
        var daysBack2 = 5 + (j * 10);
        var histDate2 = new Date(today);
        histDate2.setDate(today.getDate() - daysBack2);
        if (histDate2.getDay() === 0) histDate2.setDate(histDate2.getDate() - 2);
        if (histDate2.getDay() === 6) histDate2.setDate(histDate2.getDate() - 1);
        var locId = otherLocums[j % otherLocums.length];
        var sess2 = otherSessions[j];
        var rate2 = locId === 'loc-002' ? (sess2 === 'Full Day' ? 850 : 450) : (sess2 === 'Full Day' ? 780 : 400);
        offers.push({
            id: 'offer-hist-prac001-' + String(j + 1).padStart(2, '0'),
            shiftId: 'shift-hist-p-' + String(j + 1).padStart(3, '0'),
            locumId: locId,
            practiceId: 'prac-001',
            practiceName: 'Ringland Medical Practice',
            healthBoard: 'Aneurin Bevan',
            shiftDate: histDate2.toISOString().split('T')[0],
            startTime: sess2 === 'PM' ? '13:00' : '08:30',
            endTime: sess2 === 'AM' ? '12:30' : '17:00',
            sessionType: sess2,
            rateAM: locId === 'loc-002' ? 450 : 400,
            ratePM: locId === 'loc-002' ? 450 : 400,
            rateFullDay: locId === 'loc-002' ? 850 : 780,
            rateHousecall: 0,
            status: 'completed',
            offerDate: new Date(histDate2.getTime() - 5 * 86400000).toISOString().split('T')[0],
            completedDate: histDate2.toISOString().split('T')[0],
            completedByPractice: true,
            comment: 'Standard surgery day. Good session.',
            housecalls: j % 4 === 0
        });
    }

    return offers;
}

function generateNotifications() {
    const today = new Date();
    return [
        {
            id: 'notif-001',
            userId: 'loc-001',
            type: 'shift_confirmed',
            title: 'Shift Confirmed',
            message: 'Your shift at Ringland Medical Practice on ' + formatDateShort(addDays(today, 2)) + ' has been confirmed.',
            date: addDays(today, -1).toISOString(),
            read: false
        },
        {
            id: 'notif-002',
            userId: 'loc-001',
            type: 'new_shifts',
            title: 'New Shifts Available',
            message: '5 new shifts matching your preferences have been posted in Cardiff and Vale.',
            date: addDays(today, -1).toISOString(),
            read: false
        },
        {
            id: 'notif-003',
            userId: 'loc-001',
            type: 'offer_accepted',
            title: 'Offer Accepted',
            message: 'Whitchurch Road Surgery has accepted your offer for ' + formatDateShort(addDays(today, 5)) + '.',
            date: addDays(today, -2).toISOString(),
            read: true
        },
        {
            id: 'notif-004',
            userId: 'loc-001',
            type: 'reliability_warning',
            title: 'Booking Reliability',
            message: 'Your booking reliability is 98%. Keep it above 95% to maintain priority access.',
            date: addDays(today, -3).toISOString(),
            read: true
        },
        {
            id: 'notif-005',
            userId: 'loc-001',
            type: 'cpd_event',
            title: 'Upcoming CPD Event',
            message: 'Emergency Skills Workshop at Royal Gwent Hospital on April 25th. Register now.',
            date: addDays(today, -4).toISOString(),
            read: true
        },
        // Practice notifications for prac-001
        {
            id: 'notif-p001',
            userId: 'prac-001',
            type: 'new_offer',
            title: 'New Application Received',
            message: 'Dr Sarah Williams has applied for your shift on ' + formatDateShort(addDays(today, 3)) + '.',
            date: addDays(today, -1).toISOString(),
            read: false
        },
        {
            id: 'notif-p002',
            userId: 'prac-001',
            type: 'shift_confirmed',
            title: 'Shift Confirmed',
            message: 'Dr Rhys Parry has acknowledged and confirmed attendance for ' + formatDateShort(addDays(today, 5)) + '.',
            date: addDays(today, -1).toISOString(),
            read: false
        },
        {
            id: 'notif-p003',
            userId: 'prac-001',
            type: 'payment_reminder',
            title: 'Payment Due',
            message: 'Invoice GPRN-10001 for Dr Sarah Williams is due within 7 days. Amount: \u00a3820.00.',
            date: addDays(today, -2).toISOString(),
            read: false
        },
        {
            id: 'notif-p004',
            userId: 'prac-001',
            type: 'new_offer',
            title: 'New Application Received',
            message: 'Dr Megan Jones has applied for your shift on ' + formatDateShort(addDays(today, 7)) + '.',
            date: addDays(today, -3).toISOString(),
            read: true
        },
        {
            id: 'notif-p005',
            userId: 'prac-001',
            type: 'leave_feedback',
            title: 'Leave Feedback',
            message: 'Please rate Dr Rhys Parry who worked on ' + formatDateShort(addDays(today, -5)) + '.',
            date: addDays(today, -5).toISOString(),
            read: true
        }
    ];
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function formatDateShort(date) {
    const d = new Date(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Initialize mock data
var GPRN_DATA_VERSION = '2.1';

function initMockData() {
    MOCK_DATA.shifts = generateShifts();
    MOCK_DATA.offers = generateOffers();
    MOCK_DATA.notifications = generateNotifications();

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
