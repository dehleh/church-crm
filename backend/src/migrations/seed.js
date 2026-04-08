require('dotenv').config();
const { pool, query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const CHURCH_ID   = uuidv4();
const BRANCH_HQ   = uuidv4();
const BRANCH_VI   = uuidv4();
const ADMIN_ID    = uuidv4();
const PASTOR_ID   = uuidv4();
const STAFF_ID    = uuidv4();

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const FIRST_NAMES_M = ['Emmanuel','David','Samuel','Joshua','Daniel','Michael','Joseph','Elijah','Isaac','Caleb','Aaron','Nathan','Andrew','Peter','Philip'];
const FIRST_NAMES_F = ['Grace','Faith','Joy','Peace','Mercy','Blessing','Esther','Ruth','Deborah','Hannah','Sarah','Miriam','Lydia','Priscilla','Abigail'];
const LAST_NAMES    = ['Okonkwo','Adeyemi','Nwachukwu','Babatunde','Eze','Okafor','Adeleke','Chukwu','Obi','Fashola','Emeka','Adesanya','Nwosu','Taiwo','Oluwaseun'];
const OCCUPATIONS   = ['Teacher','Engineer','Doctor','Nurse','Accountant','Lawyer','Pastor','Business Owner','Civil Servant','Student','Trader','Banker'];
const DENOMINATIONS = 'Baptist';

async function seed() {
  console.log('🌱 Seeding ChurchOS demo data...\n');
  const hash = await bcrypt.hash('password123', 10);

  // ── Church
  await query(
    `INSERT INTO churches (id, name, slug, denomination, city, state, country, phone, email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
    [CHURCH_ID, 'TBC (The Baptizing Church)', 'tbc-lekki-igbo-efon', DENOMINATIONS,
     'Lagos', 'Lagos', 'Nigeria', '+234 801 234 5678', 'info@tbclekki.ng']
  );

  // ── Branches
  await query(
    `INSERT INTO branches (id, church_id, name, code, is_headquarters, city, state, pastor_name)
     VALUES ($1,$2,$3,$4,true,$5,$6,$7) ON CONFLICT DO NOTHING`,
    [BRANCH_HQ, CHURCH_ID, 'TBC Lekki-Igbo-efon (HQ)', 'HQ', 'Lagos', 'Lagos', 'Pastor Emmanuel Okafor']
  );
  await query(
    `INSERT INTO branches (id, church_id, name, code, city, state, pastor_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
    [BRANCH_VI, CHURCH_ID, 'TBC Victoria Island', 'VI', 'Lagos', 'Lagos', 'Pastor Sarah Adeyemi']
  );

  // ── Users
  await query(
    `INSERT INTO users (id, church_id, branch_id, first_name, last_name, email, password_hash, role, phone)
     VALUES ($1,$2,$3,'Emmanuel','Okafor','admin@tbclekki.ng',$4,'head_pastor','+234 801 000 0001')
     ON CONFLICT DO NOTHING`,
    [ADMIN_ID, CHURCH_ID, BRANCH_HQ, hash]
  );
  await query(
    `INSERT INTO users (id, church_id, branch_id, first_name, last_name, email, password_hash, role, phone)
     VALUES ($1,$2,$3,'Sarah','Adeyemi','pastor@tbclekki.ng',$4,'director','+234 801 000 0002')
     ON CONFLICT DO NOTHING`,
    [PASTOR_ID, CHURCH_ID, BRANCH_VI, hash]
  );
  await query(
    `INSERT INTO users (id, church_id, branch_id, first_name, last_name, email, password_hash, role, phone)
     VALUES ($1,$2,$3,'Daniel','Nwachukwu','staff@tbclekki.ng',$4,'hod','+234 801 000 0003')
     ON CONFLICT DO NOTHING`,
    [STAFF_ID, CHURCH_ID, BRANCH_HQ, hash]
  );

  // ── Departments
  const deptData = [
    { name: 'Choir',           cat: 'music',    id: uuidv4() },
    { name: 'Ushering Unit',   cat: 'service',  id: uuidv4() },
    { name: 'Media & Tech',    cat: 'media',    id: uuidv4() },
    { name: 'Prayer Team',     cat: 'ministry', id: uuidv4() },
    { name: 'Welfare',         cat: 'welfare',  id: uuidv4() },
    { name: 'Children Church', cat: 'ministry', id: uuidv4() },
    { name: 'Youth Ministry',  cat: 'ministry', id: uuidv4() },
    { name: 'Men Fellowship',  cat: 'ministry', id: uuidv4() },
    { name: 'Women Fellowship',cat: 'ministry', id: uuidv4() },
    { name: 'Admin Team',      cat: 'admin',    id: uuidv4() },
  ];
  for (const d of deptData) {
    await query(
      `INSERT INTO departments (id, church_id, branch_id, name, category)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [d.id, CHURCH_ID, BRANCH_HQ, d.name, d.cat]
    );
  }

  // ── Giving categories (already seeded by register, but add if missing)
  const cats = [
    { id: uuidv4(), name: 'Tithe' }, { id: uuidv4(), name: 'Offering' },
    { id: uuidv4(), name: 'Building Fund' }, { id: uuidv4(), name: 'Welfare' },
    { id: uuidv4(), name: 'Missions' },
  ];
  for (const c of cats) {
    await query(
      `INSERT INTO giving_categories (id, church_id, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [c.id, CHURCH_ID, c.name]
    );
  }
  const catIds = (await query('SELECT id FROM giving_categories WHERE church_id=$1', [CHURCH_ID])).rows.map(r => r.id);

  // ── Finance accounts
  const acctHQ = uuidv4();
  const acctVI = uuidv4();
  await query(
    `INSERT INTO finance_accounts (id, church_id, branch_id, name, account_type, bank_name, balance, currency)
     VALUES ($1,$2,$3,'HQ Main Account','bank','Access Bank',5250000,'NGN') ON CONFLICT DO NOTHING`,
    [acctHQ, CHURCH_ID, BRANCH_HQ]
  );
  await query(
    `INSERT INTO finance_accounts (id, church_id, branch_id, name, account_type, bank_name, balance, currency)
     VALUES ($1,$2,$3,'VI Branch Account','bank','GTBank',1800000,'NGN') ON CONFLICT DO NOTHING`,
    [acctVI, CHURCH_ID, BRANCH_VI]
  );

  // ── Members (60 members)
  const memberIds = [];
  const genders = ['male', 'female'];
  const statuses = ['active', 'active', 'active', 'active', 'inactive'];
  const classes = ['full', 'full', 'full', 'associate', 'youth', 'child'];
  for (let i = 0; i < 60; i++) {
    const gender = rand(genders);
    const fn = gender === 'male' ? rand(FIRST_NAMES_M) : rand(FIRST_NAMES_F);
    const ln = rand(LAST_NAMES);
    const branchId = i < 40 ? BRANCH_HQ : BRANCH_VI;
    const id = uuidv4();
    const num = `MBR-${String(i + 1).padStart(5, '0')}`;
    const dob = `${randInt(1960, 2000)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`;
    const joined = `${randInt(2015, 2024)}-${String(randInt(1, 12)).padStart(2, '0')}-01`;
    memberIds.push(id);
    await query(
      `INSERT INTO members
        (id, church_id, branch_id, member_number, first_name, last_name, email, phone,
         gender, date_of_birth, membership_status, membership_class, join_date,
         occupation, water_baptized, holy_ghost_baptized)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING`,
      [
        id, CHURCH_ID, branchId, num, fn, ln,
        `${fn.toLowerCase()}.${ln.toLowerCase()}@email.com`,
        `+234 80${randInt(1, 9)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
        gender, dob, rand(statuses), rand(classes), joined,
        rand(OCCUPATIONS), Math.random() > 0.3, Math.random() > 0.4
      ]
    );
    // Assign to dept
    if (Math.random() > 0.4) {
      const dept = rand(deptData);
      await query(
        `INSERT INTO member_departments (id, church_id, member_id, department_id, role)
         VALUES ($1,$2,$3,$4,'member') ON CONFLICT DO NOTHING`,
        [uuidv4(), CHURCH_ID, id, dept.id]
      );
    }
  }

  // ── First Timers (20 visitors)
  const ftStatuses = ['pending', 'contacted', 'converted', 'inactive'];
  const sources = ['social_media', 'friend', 'walk_in', 'online_service', 'flyer'];
  for (let i = 0; i < 20; i++) {
    const gender = rand(genders);
    const fn = gender === 'male' ? rand(FIRST_NAMES_M) : rand(FIRST_NAMES_F);
    const ln = rand(LAST_NAMES);
    const daysAgo = randInt(1, 90);
    const visitDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
    await query(
      `INSERT INTO first_timers
        (id, church_id, branch_id, first_name, last_name, phone, gender,
         visit_date, how_did_you_hear, follow_up_status, follow_up_assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
      [
        uuidv4(), CHURCH_ID, rand([BRANCH_HQ, BRANCH_VI]), fn, ln,
        `+234 81${randInt(1, 9)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
        gender, visitDate, rand(sources), rand(ftStatuses),
        rand([ADMIN_ID, PASTOR_ID, STAFF_ID])
      ]
    );
  }

  // ── Events (12 events: past + future)
  const eventTypes = ['sunday_service', 'midweek', 'special', 'conference', 'outreach'];
  const eventTitles = [
    'Sunday Service', 'Midweek Bible Study', 'Easter Celebration',
    'Workers Conference', 'Community Outreach', 'Youth Sunday',
    'Women Conference', 'Night of Glory', 'Prayer & Fasting',
    'Thanksgiving Service', 'Christmas Carol', 'New Year Service'
  ];
  const eventIds = [];
  for (let i = 0; i < 12; i++) {
    const id = uuidv4();
    const isPast = i < 8;
    const daysOffset = isPast ? -(8 - i) * 7 : (i - 8 + 1) * 7;
    const dt = new Date(Date.now() + daysOffset * 86400000);
    dt.setHours(9, 0, 0, 0);
    const attendance = isPast ? randInt(80, 350) : null;
    eventIds.push({ id, isPast });
    await query(
      `INSERT INTO events
        (id, church_id, branch_id, title, event_type, start_datetime,
         expected_attendance, actual_attendance, status, location, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
      [
        id, CHURCH_ID, BRANCH_HQ, eventTitles[i % eventTitles.length],
        rand(eventTypes), dt.toISOString(), randInt(200, 500),
        attendance, isPast ? 'completed' : 'upcoming',
        'Main Auditorium', ADMIN_ID
      ]
    );
    // Attendance records for past events
    if (isPast && attendance) {
      const shuffled = [...memberIds].sort(() => Math.random() - 0.5).slice(0, Math.min(attendance, memberIds.length));
      for (const mId of shuffled) {
        await query(
          `INSERT INTO attendance (id, church_id, event_id, member_id, check_in_method)
           VALUES ($1,$2,$3,$4,'manual') ON CONFLICT DO NOTHING`,
          [uuidv4(), CHURCH_ID, id, mId]
        );
      }
    }
  }

  // ── Transactions (6 months of giving)
  const payMethods = ['cash', 'transfer', 'card', 'ussd'];
  for (let month = 5; month >= 0; month--) {
    const d = new Date();
    d.setMonth(d.getMonth() - month);
    // Sunday offerings (4 per month)
    for (let s = 0; s < 4; s++) {
      const txDate = new Date(d.getFullYear(), d.getMonth(), (s + 1) * 7);
      // Income: tithe + offering
      await query(
        `INSERT INTO transactions
          (id, church_id, branch_id, account_id, category_id, transaction_type,
           amount, description, payment_method, transaction_date, recorded_by, status)
         VALUES ($1,$2,$3,$4,$5,'income',$6,$7,$8,$9,$10,'completed') ON CONFLICT DO NOTHING`,
        [
          uuidv4(), CHURCH_ID, BRANCH_HQ, acctHQ, catIds[1],
          randInt(180000, 450000), `Sunday Offering - Week ${s + 1}`,
          rand(payMethods), txDate.toISOString().split('T')[0], STAFF_ID
        ]
      );
      await query(
        `INSERT INTO transactions
          (id, church_id, branch_id, account_id, category_id, transaction_type,
           amount, description, payment_method, transaction_date, recorded_by, status)
         VALUES ($1,$2,$3,$4,$5,'income',$6,$7,$8,$9,$10,'completed') ON CONFLICT DO NOTHING`,
        [
          uuidv4(), CHURCH_ID, BRANCH_HQ, acctHQ, catIds[0],
          randInt(350000, 900000), `Tithes - Week ${s + 1}`,
          'transfer', txDate.toISOString().split('T')[0], STAFF_ID
        ]
      );
    }
    // Monthly expenses
    const expenses = [
      { desc: 'Church Utility Bills', amount: randInt(80000, 150000) },
      { desc: 'Staff Salaries', amount: randInt(400000, 600000) },
      { desc: 'Sound Equipment Maintenance', amount: randInt(20000, 60000) },
    ];
    for (const exp of expenses) {
      const txDate = new Date(d.getFullYear(), d.getMonth(), randInt(1, 28));
      await query(
        `INSERT INTO transactions
          (id, church_id, branch_id, account_id, transaction_type,
           amount, description, payment_method, transaction_date, recorded_by, status)
         VALUES ($1,$2,$3,$4,'expense',$5,$6,'transfer',$7,$8,'completed') ON CONFLICT DO NOTHING`,
        [uuidv4(), CHURCH_ID, BRANCH_HQ, acctHQ, exp.amount, exp.desc,
         txDate.toISOString().split('T')[0], ADMIN_ID]
      );
    }
  }

  // ── Budgets
  const thisYear = new Date().getFullYear();
  await query(
    `INSERT INTO budgets (id, church_id, name, period_type, start_date, end_date, total_amount, spent_amount, created_by)
     VALUES ($1,$2,$3,'annual',$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [uuidv4(), CHURCH_ID, `${thisYear} Annual Budget`,
     `${thisYear}-01-01`, `${thisYear}-12-31`, 15000000, 8750000, ADMIN_ID]
  );
  await query(
    `INSERT INTO budgets (id, church_id, name, period_type, start_date, end_date, total_amount, spent_amount, created_by)
     VALUES ($1,$2,$3,'monthly',$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [uuidv4(), CHURCH_ID, 'Monthly Operations Budget',
     `${thisYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
     `${thisYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-30`,
     1200000, 780000, ADMIN_ID]
  );

  // ── Prayer Requests
  const prayerCats = ['healing', 'finances', 'family', 'salvation', 'others'];
  const prayerTexts = [
    'Praying for complete healing from illness',
    'Seeking God\'s provision for business breakthrough',
    'Trusting God for family reconciliation',
    'Interceding for my unsaved children',
    'Praying for a new job opportunity',
    'Thanksgiving and praise for God\'s faithfulness',
    'Prayer for upcoming surgery to be successful',
  ];
  for (let i = 0; i < 10; i++) {
    await query(
      `INSERT INTO prayer_requests
        (id, church_id, branch_id, member_id, request, category, is_anonymous, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [
        uuidv4(), CHURCH_ID, BRANCH_HQ,
        Math.random() > 0.3 ? rand(memberIds) : null,
        rand(prayerTexts), rand(prayerCats),
        Math.random() > 0.7,
        rand(['open', 'praying', 'answered'])
      ]
    );
  }

  // ── Media items
  const sermonTitles = [
    { title: 'The Power of Faith', minister: 'Pastor Emmanuel Okafor', scripture: 'Hebrews 11:1' },
    { title: 'Walking in Purpose', minister: 'Pastor Sarah Adeyemi', scripture: 'Jeremiah 29:11' },
    { title: 'Overflow of Blessings', minister: 'Pastor Emmanuel Okafor', scripture: 'Malachi 3:10' },
    { title: 'The Grace of God', minister: 'Pastor Emmanuel Okafor', scripture: 'Ephesians 2:8' },
    { title: 'Rising Above Challenges', minister: 'Pastor Sarah Adeyemi', scripture: 'Isaiah 40:31' },
  ];
  for (const s of sermonTitles) {
    await query(
      `INSERT INTO media_items
        (id, church_id, branch_id, title, media_type, minister_name, scripture_reference,
         series_name, is_published, published_at, view_count, created_by)
       VALUES ($1,$2,$3,$4,'sermon',$5,$6,'Faith Series',true,NOW(),$7,$8) ON CONFLICT DO NOTHING`,
      [uuidv4(), CHURCH_ID, BRANCH_HQ, s.title, s.minister, s.scripture, randInt(50, 800), ADMIN_ID]
    );
  }

  // ── Follow-ups
  for (let i = 0; i < 8; i++) {
    const daysAhead = randInt(0, 14);
    const scheduled = new Date(Date.now() + daysAhead * 86400000);
    await query(
      `INSERT INTO follow_ups
        (id, church_id, member_id, assigned_to, follow_up_type, status, scheduled_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [
        uuidv4(), CHURCH_ID, rand(memberIds),
        rand([ADMIN_ID, PASTOR_ID, STAFF_ID]),
        rand(['call', 'visit', 'whatsapp']),
        rand(['pending', 'pending', 'in_progress']),
        scheduled.toISOString(),
        'Check in on member wellbeing and church involvement'
      ]
    );
  }

  console.log('✅ Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Church:  TBC (The Baptizing Church), Lekki-Igbo-efon');
  console.log('  Login:   admin@tbclekki.ng');
  console.log('  Password: password123');
  console.log('');
  console.log('  Also try:');
  console.log('  pastor@tbclekki.ng / password123');
  console.log('  staff@tbclekki.ng  / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed()
  .catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); })
  .finally(() => pool.end());
