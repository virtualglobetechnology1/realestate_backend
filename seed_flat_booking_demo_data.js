const mysql = require('mysql2/promise');

async function seedFlatBookingDemoData() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      multipleStatements: true
    });

    console.log('🔗 Connected to XAMPP MySQL server...');

    // 1. Target Database: 'plot_manage_db' exclusively
    const targetDatabases = ['plot_manage_db'];

    for (const dbName of targetDatabases) {
      console.log(`\n======================================================`);
      console.log(`🏢 Seeding Flat Booking Demo Data into '${dbName}'...`);
      console.log(`======================================================`);

      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await conn.query(`USE \`${dbName}\`;`);

      // Determine table names for this db
      const isPlotManage = dbName === 'plot_manage_db';
      const socTable = isPlotManage ? 'plot_manage_societies' : 'societies';
      const wingTable = isPlotManage ? 'plot_manage_wings' : 'wings';
      const flatTable = isPlotManage ? 'plot_manage_flats' : 'flats';
      const userTable = isPlotManage ? 'plot_manage_users' : 'users';

      // Ensure society exists
      if (isPlotManage) {
        await conn.query(`
          INSERT INTO ${socTable} (society_code, name, registration_number, address, city, state, pincode, total_wings)
          VALUES ('soc-101', 'Skyhigh Meadows & Luxury Towers', 'REG-1001', 'Main High Street Boulevard', 'Mumbai', 'Maharashtra', '400001', 3)
          ON DUPLICATE KEY UPDATE name=VALUES(name), total_wings=VALUES(total_wings);
        `);
      } else {
        await conn.query(`
          INSERT INTO ${socTable} (id, name, registration_number, address, city, state, pincode, total_wings)
          VALUES ('soc-101', 'Skyhigh Meadows & Luxury Towers', 'REG-1001', 'Main High Street Boulevard', 'Mumbai', 'Maharashtra', '400001', 3)
          ON DUPLICATE KEY UPDATE name=VALUES(name), total_wings=VALUES(total_wings);
        `);
      }

      // Add columns to flats table if missing
      const alterCols = [
        `ALTER TABLE ${flatTable} ADD COLUMN bhk_type VARCHAR(50) DEFAULT '2 BHK'`,
        `ALTER TABLE ${flatTable} ADD COLUMN rate_per_sqft DECIMAL(10,2) DEFAULT 4500.00`,
        `ALTER TABLE ${flatTable} ADD COLUMN total_cost DECIMAL(12,2) DEFAULT 5175000.00`,
        `ALTER TABLE ${flatTable} ADD COLUMN booking_amount DECIMAL(12,2) DEFAULT 0.00`,
        `ALTER TABLE ${flatTable} ADD COLUMN booking_date VARCHAR(50) DEFAULT NULL`,
        `ALTER TABLE ${flatTable} ADD COLUMN payment_plan VARCHAR(50) DEFAULT 'MILESTONE'`,
        `ALTER TABLE ${flatTable} ADD COLUMN parking_slot VARCHAR(50) DEFAULT NULL`,
        `ALTER TABLE ${flatTable} ADD COLUMN buyer_name VARCHAR(150) DEFAULT NULL`,
        `ALTER TABLE ${flatTable} ADD COLUMN buyer_phone VARCHAR(50) DEFAULT NULL`,
        `ALTER TABLE ${flatTable} ADD COLUMN buyer_email VARCHAR(150) DEFAULT NULL`,
        `ALTER TABLE ${flatTable} ADD COLUMN buyer_id_proof VARCHAR(100) DEFAULT NULL`,
        `ALTER TABLE ${flatTable} ADD COLUMN agent_name VARCHAR(150) DEFAULT 'Direct Builder Sales'`,
        `ALTER TABLE ${flatTable} ADD COLUMN hold_expires_at VARCHAR(50) DEFAULT NULL`,
        `ALTER TABLE ${flatTable} ADD COLUMN notes TEXT DEFAULT NULL`
      ];

      for (const colQuery of alterCols) {
        try {
          await conn.query(colQuery);
        } catch (_) {
          // Column already exists, ignore
        }
      }

      // 3 Wings / Towers Definition
      const wingsData = [
        { id: 'wing-a', code: 'wing-a', name: 'Tower A (Orchid Heights)', floors: 4, flatsPerFloor: 4 },
        { id: 'wing-b', code: 'wing-b', name: 'Tower B (Lotus Crest)', floors: 4, flatsPerFloor: 4 },
        { id: 'wing-c', code: 'wing-c', name: 'Tower C (Cypress Suites)', floors: 4, flatsPerFloor: 4 }
      ];

      for (const w of wingsData) {
        if (isPlotManage) {
          await conn.query(`
            INSERT INTO ${wingTable} (wing_code, society_id, wing_name, total_floors, flats_per_floor)
            VALUES (?, 'soc-101', ?, ?, ?)
            ON DUPLICATE KEY UPDATE wing_name=VALUES(wing_name), total_floors=VALUES(total_floors), flats_per_floor=VALUES(flats_per_floor);
          `, [w.code, w.name, w.floors, w.flatsPerFloor]);
        } else {
          await conn.query(`
            INSERT INTO ${wingTable} (id, society_id, wing_name, total_floors, flats_per_floor)
            VALUES (?, 'soc-101', ?, ?, ?)
            ON DUPLICATE KEY UPDATE wing_name=VALUES(wing_name), total_floors=VALUES(total_floors), flats_per_floor=VALUES(flats_per_floor);
          `, [w.id, w.name, w.floors, w.flatsPerFloor]);
        }
      }

      // 48 Detailed Flat Units with Realistic Real Estate Demographics
      const demoFlats = [
        // ==================== TOWER A (Orchid Heights) ====================
        // Floor 1
        {
          code: 'flat-a-101', wingId: 'wing-a', num: 'A-101', fl: 1, type: '2 BHK', sqft: 1150, rate: 4500, cost: 5175000,
          status: 'BOOKED', bName: 'Vikramaditya Roy', bPhone: '9820199201', bEmail: 'v.roy@gmail.com', bId: 'Aadhaar Verified',
          bAmt: 517500, bDate: '2026-09-18', plan: 'MILESTONE', park: 'P-A101', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-a-102', wingId: 'wing-a', num: 'A-102', fl: 1, type: '2 BHK', sqft: 1150, rate: 4500, cost: 5175000,
          status: 'OCCUPIED_OWNER', bName: 'Dr. Aruna Deshmukh', bPhone: '9820144512', bEmail: 'aruna.d@deshmukhhospital.in', bId: 'PAN Card Verified',
          bAmt: 5175000, bDate: '2026-08-10', plan: 'FULL_PAYMENT', park: 'P-A102', agent: 'Prime Properties'
        },
        {
          code: 'flat-a-103', wingId: 'wing-a', num: 'A-103', fl: 1, type: '3 BHK', sqft: 1450, rate: 4650, cost: 6742500,
          status: 'OCCUPIED_TENANT', bName: 'Sanjay Kulkarni', bPhone: '9819233445', bEmail: 'sanjay.k@techcorp.com', bId: 'Aadhaar Verified',
          bAmt: 6742500, bDate: '2026-07-22', plan: 'MILESTONE', park: 'P-A103', agent: 'Independent Broker'
        },
        {
          code: 'flat-a-104', wingId: 'wing-a', num: 'A-104', fl: 1, type: '3 BHK', sqft: 1450, rate: 4650, cost: 6742500,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-A104', agent: 'Direct Builder Sales'
        },
        // Floor 2
        {
          code: 'flat-a-201', wingId: 'wing-a', num: 'A-201', fl: 2, type: '2 BHK', sqft: 1150, rate: 4500, cost: 5175000,
          status: 'HOLD', bName: 'Rahul Singhania', bPhone: '9833455112', bEmail: 'rahul.s@corp.in', bId: null,
          bAmt: 50000, bDate: '2026-10-02', plan: 'DOWN_PAYMENT', park: 'P-A201', agent: 'Direct Builder Sales', notes: 'Token deposit Rs 50,000 paid. Hold valid 7 days.'
        },
        {
          code: 'flat-a-202', wingId: 'wing-a', num: 'A-202', fl: 2, type: '2 BHK', sqft: 1150, rate: 4500, cost: 5175000,
          status: 'BOOKED', bName: 'Neha Kapadia', bPhone: '9821122334', bEmail: 'neha.k@designstudio.in', bId: 'Aadhaar Verified',
          bAmt: 517500, bDate: '2026-09-29', plan: 'MILESTONE', park: 'P-A202', agent: 'Shree Sai Estates'
        },
        {
          code: 'flat-a-203', wingId: 'wing-a', num: 'A-203', fl: 2, type: '3 BHK', sqft: 1450, rate: 4650, cost: 6742500,
          status: 'OCCUPIED_OWNER', bName: 'Col. Pradeep Bakshi', bPhone: '9820011223', bEmail: 'p.bakshi@defenceret.org', bId: 'Armed Forces ID',
          bAmt: 6742500, bDate: '2026-08-15', plan: 'FULL_PAYMENT', park: 'P-A203', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-a-204', wingId: 'wing-a', num: 'A-204', fl: 2, type: '3 BHK', sqft: 1450, rate: 4650, cost: 6742500,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-A204', agent: 'Direct Builder Sales'
        },
        // Floor 3
        {
          code: 'flat-a-301', wingId: 'wing-a', num: 'A-301', fl: 3, type: '2 BHK', sqft: 1150, rate: 4550, cost: 5232500,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-A301', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-a-302', wingId: 'wing-a', num: 'A-302', fl: 3, type: '2 BHK', sqft: 1150, rate: 4550, cost: 5232500,
          status: 'BOOKED', bName: 'Deepak & Ananya Joshi', bPhone: '9870022334', bEmail: 'd.joshi@infosys.com', bId: 'Passport Verified',
          bAmt: 523250, bDate: '2026-09-25', plan: 'MILESTONE', park: 'P-A302', agent: 'Prime Properties'
        },
        {
          code: 'flat-a-303', wingId: 'wing-a', num: 'A-303', fl: 3, type: '3 BHK', sqft: 1450, rate: 4700, cost: 6815000,
          status: 'OCCUPIED_OWNER', bName: 'Meera Nair', bPhone: '9822344556', bEmail: 'meera.nair@banking.in', bId: 'Aadhaar Verified',
          bAmt: 6815000, bDate: '2026-08-01', plan: 'DOWN_PAYMENT', park: 'P-A303', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-a-304', wingId: 'wing-a', num: 'A-304', fl: 3, type: '3 BHK', sqft: 1450, rate: 4700, cost: 6815000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-A304', agent: 'Direct Builder Sales'
        },
        // Floor 4
        {
          code: 'flat-a-401', wingId: 'wing-a', num: 'A-401', fl: 4, type: '3 BHK', sqft: 1500, rate: 4800, cost: 7200000,
          status: 'BOOKED', bName: 'Gaurav Tandon', bPhone: '9811223344', bEmail: 'gaurav.tandon@capital.com', bId: 'PAN Card Verified',
          bAmt: 720000, bDate: '2026-10-01', plan: 'DOWN_PAYMENT', park: 'P-A401', agent: 'Independent Broker'
        },
        {
          code: 'flat-a-402', wingId: 'wing-a', num: 'A-402', fl: 4, type: '3 BHK', sqft: 1500, rate: 4800, cost: 7200000,
          status: 'OCCUPIED_TENANT', bName: 'Rishi Kapoor', bPhone: '9820556677', bEmail: 'rishi.k@mediahouse.in', bId: 'Aadhaar Verified',
          bAmt: 7200000, bDate: '2026-08-20', plan: 'MILESTONE', park: 'P-A402', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-a-403', wingId: 'wing-a', num: 'A-403', fl: 4, type: '4 BHK Penthouse', sqft: 1850, rate: 5200, cost: 9620000,
          status: 'OCCUPIED_OWNER', bName: 'Harshvardhan Goenka', bPhone: '9821889900', bEmail: 'h.goenka@indiatrade.com', bId: 'Verified',
          bAmt: 9620000, bDate: '2026-07-15', plan: 'FULL_PAYMENT', park: 'P-A403', agent: 'Shree Sai Estates'
        },
        {
          code: 'flat-a-404', wingId: 'wing-a', num: 'A-404', fl: 4, type: '4 BHK Penthouse', sqft: 1850, rate: 5200, cost: 9620000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-A404', agent: 'Direct Builder Sales'
        },

        // ==================== TOWER B (Lotus Crest) ====================
        // Floor 1
        {
          code: 'flat-b-101', wingId: 'wing-b', num: 'B-101', fl: 1, type: '2 BHK', sqft: 1150, rate: 4400, cost: 5060000,
          status: 'OCCUPIED_OWNER', bName: 'Manish Aggarwal', bPhone: '9821334455', bEmail: 'manish@aggarwaltraders.com', bId: 'Aadhaar Verified',
          bAmt: 5060000, bDate: '2026-08-12', plan: 'FULL_PAYMENT', park: 'P-B101', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-b-102', wingId: 'wing-b', num: 'B-102', fl: 1, type: '2 BHK', sqft: 1150, rate: 4400, cost: 5060000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-B102', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-b-103', wingId: 'wing-b', num: 'B-103', fl: 1, type: '3 BHK', sqft: 1420, rate: 4600, cost: 6532000,
          status: 'BOOKED', bName: 'Pooja Sundaram', bPhone: '9840112233', bEmail: 'pooja.s@chennaicap.com', bId: 'Aadhaar Verified',
          bAmt: 653200, bDate: '2026-09-22', plan: 'MILESTONE', park: 'P-B103', agent: 'Prime Properties'
        },
        {
          code: 'flat-b-104', wingId: 'wing-b', num: 'B-104', fl: 1, type: '3 BHK', sqft: 1420, rate: 4600, cost: 6532000,
          status: 'OCCUPIED_TENANT', bName: 'Ankit Bansal', bPhone: '9811445566', bEmail: 'ankit.b@delhitechs.com', bId: 'Verified',
          bAmt: 6532000, bDate: '2026-08-05', plan: 'MILESTONE', park: 'P-B104', agent: 'Direct Builder Sales'
        },
        // Floor 2
        {
          code: 'flat-b-201', wingId: 'wing-b', num: 'B-201', fl: 2, type: '2 BHK', sqft: 1150, rate: 4400, cost: 5060000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-B201', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-b-202', wingId: 'wing-b', num: 'B-202', fl: 2, type: '2 BHK', sqft: 1150, rate: 4400, cost: 5060000,
          status: 'HOLD', bName: 'Sunil Chawla', bPhone: '9820778899', bEmail: 's.chawla@finance.in', bId: null,
          bAmt: 50000, bDate: '2026-10-04', plan: 'DOWN_PAYMENT', park: 'P-B202', agent: 'Shree Sai Estates', notes: 'Token deposit Rs 50,000 paid. Hold valid 7 days.'
        },
        {
          code: 'flat-b-203', wingId: 'wing-b', num: 'B-203', fl: 2, type: '3 BHK', sqft: 1420, rate: 4600, cost: 6532000,
          status: 'OCCUPIED_OWNER', bName: 'Dr. Rajesh Rao', bPhone: '9845012345', bEmail: 'dr.rao@apollo.in', bId: 'Doctor License',
          bAmt: 6532000, bDate: '2026-07-28', plan: 'FULL_PAYMENT', park: 'P-B203', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-b-204', wingId: 'wing-b', num: 'B-204', fl: 2, type: '3 BHK', sqft: 1420, rate: 4600, cost: 6532000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-B204', agent: 'Direct Builder Sales'
        },
        // Floor 3
        {
          code: 'flat-b-301', wingId: 'wing-b', num: 'B-301', fl: 3, type: '2 BHK', sqft: 1150, rate: 4450, cost: 5117500,
          status: 'BOOKED', bName: 'Kavita Menon', bPhone: '9847112233', bEmail: 'kavita.m@wipro.com', bId: 'Aadhaar Verified',
          bAmt: 511750, bDate: '2026-09-15', plan: 'MILESTONE', park: 'P-B301', agent: 'Independent Broker'
        },
        {
          code: 'flat-b-302', wingId: 'wing-b', num: 'B-302', fl: 3, type: '2 BHK', sqft: 1150, rate: 4450, cost: 5117500,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-B302', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-b-303', wingId: 'wing-b', num: 'B-303', fl: 3, type: '3 BHK', sqft: 1420, rate: 4650, cost: 6603000,
          status: 'OCCUPIED_TENANT', bName: 'Naveen Reddy', bPhone: '9849011223', bEmail: 'n.reddy@hyderabaddev.com', bId: 'Verified',
          bAmt: 6603000, bDate: '2026-08-18', plan: 'MILESTONE', park: 'P-B303', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-b-304', wingId: 'wing-b', num: 'B-304', fl: 3, type: '3 BHK', sqft: 1420, rate: 4650, cost: 6603000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-B304', agent: 'Direct Builder Sales'
        },
        // Floor 4
        {
          code: 'flat-b-401', wingId: 'wing-b', num: 'B-401', fl: 4, type: '3 BHK', sqft: 1480, rate: 4750, cost: 7030000,
          status: 'BOOKED', bName: 'Siddharth Jain', bPhone: '9820667788', bEmail: 'sid.jain@jainjewellers.in', bId: 'Aadhaar Verified',
          bAmt: 703000, bDate: '2026-09-30', plan: 'DOWN_PAYMENT', park: 'P-B401', agent: 'Prime Properties'
        },
        {
          code: 'flat-b-402', wingId: 'wing-b', num: 'B-402', fl: 4, type: '3 BHK', sqft: 1480, rate: 4750, cost: 7030000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-B402', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-b-403', wingId: 'wing-b', num: 'B-403', fl: 4, type: '4 BHK Penthouse', sqft: 1820, rate: 5150, cost: 9373000,
          status: 'OCCUPIED_OWNER', bName: 'Anand Mahindra & Co', bPhone: '9820990011', bEmail: 'anand.m@mahindra.com', bId: 'Corporate ID',
          bAmt: 9373000, bDate: '2026-06-30', plan: 'FULL_PAYMENT', park: 'P-B403', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-b-404', wingId: 'wing-b', num: 'B-404', fl: 4, type: '4 BHK Penthouse', sqft: 1820, rate: 5150, cost: 9373000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-B404', agent: 'Direct Builder Sales'
        },

        // ==================== TOWER C (Cypress Suites) ====================
        // Floor 1
        {
          code: 'flat-c-101', wingId: 'wing-c', num: 'C-101', fl: 1, type: '1 BHK Luxury', sqft: 950, rate: 4300, cost: 4085000,
          status: 'OCCUPIED_OWNER', bName: 'Shruti Iyer', bPhone: '9820114477', bEmail: 'shruti.iyer@fintech.com', bId: 'Aadhaar Verified',
          bAmt: 4085000, bDate: '2026-08-25', plan: 'FULL_PAYMENT', park: 'P-C101', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-c-102', wingId: 'wing-c', num: 'C-102', fl: 1, type: '1 BHK Luxury', sqft: 950, rate: 4300, cost: 4085000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-C102', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-c-103', wingId: 'wing-c', num: 'C-103', fl: 1, type: '2 BHK', sqft: 1180, rate: 4400, cost: 5192000,
          status: 'BOOKED', bName: 'Sameer Merchant', bPhone: '9821223399', bEmail: 'sameer.m@tata.com', bId: 'Passport Verified',
          bAmt: 519200, bDate: '2026-09-12', plan: 'MILESTONE', park: 'P-C103', agent: 'Shree Sai Estates'
        },
        {
          code: 'flat-c-104', wingId: 'wing-c', num: 'C-104', fl: 1, type: '2 BHK', sqft: 1180, rate: 4400, cost: 5192000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-C104', agent: 'Direct Builder Sales'
        },
        // Floor 2
        {
          code: 'flat-c-201', wingId: 'wing-c', num: 'C-201', fl: 2, type: '1 BHK Luxury', sqft: 950, rate: 4300, cost: 4085000,
          status: 'OCCUPIED_TENANT', bName: 'Aditya Saxena', bPhone: '9810334455', bEmail: 'aditya.s@startup.io', bId: 'Aadhaar Verified',
          bAmt: 4085000, bDate: '2026-08-30', plan: 'MILESTONE', park: 'P-C201', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-c-202', wingId: 'wing-c', num: 'C-202', fl: 2, type: '1 BHK Luxury', sqft: 950, rate: 4300, cost: 4085000,
          status: 'HOLD', bName: 'Prashant Verma', bPhone: '9818445566', bEmail: 'p.verma@advocate.in', bId: null,
          bAmt: 50000, bDate: '2026-10-05', plan: 'DOWN_PAYMENT', park: 'P-C202', agent: 'Prime Properties', notes: 'Token deposit Rs 50,000 paid. Hold valid 7 days.'
        },
        {
          code: 'flat-c-203', wingId: 'wing-c', num: 'C-203', fl: 2, type: '2 BHK', sqft: 1180, rate: 4400, cost: 5192000,
          status: 'OCCUPIED_OWNER', bName: 'Tarun Mittal', bPhone: '9811998877', bEmail: 'tarun@mittals.com', bId: 'Aadhaar Verified',
          bAmt: 5192000, bDate: '2026-07-10', plan: 'FULL_PAYMENT', park: 'P-C203', agent: 'Independent Broker'
        },
        {
          code: 'flat-c-204', wingId: 'wing-c', num: 'C-204', fl: 2, type: '2 BHK', sqft: 1180, rate: 4400, cost: 5192000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-C204', agent: 'Direct Builder Sales'
        },
        // Floor 3
        {
          code: 'flat-c-301', wingId: 'wing-c', num: 'C-301', fl: 3, type: '1 BHK Luxury', sqft: 950, rate: 4350, cost: 4132500,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-C301', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-c-302', wingId: 'wing-c', num: 'C-302', fl: 3, type: '1 BHK Luxury', sqft: 950, rate: 4350, cost: 4132500,
          status: 'BOOKED', bName: 'Tanvi Deshpande', bPhone: '9820887766', bEmail: 'tanvi.d@puneit.com', bId: 'Aadhaar Verified',
          bAmt: 413250, bDate: '2026-09-19', plan: 'MILESTONE', park: 'P-C302', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-c-303', wingId: 'wing-c', num: 'C-303', fl: 3, type: '2 BHK', sqft: 1180, rate: 4450, cost: 5251000,
          status: 'OCCUPIED_OWNER', bName: 'Kishore Somani', bPhone: '9820554433', bEmail: 'k.somani@textiles.in', bId: 'PAN Card Verified',
          bAmt: 5251000, bDate: '2026-08-08', plan: 'DOWN_PAYMENT', park: 'P-C303', agent: 'Shree Sai Estates'
        },
        {
          code: 'flat-c-304', wingId: 'wing-c', num: 'C-304', fl: 3, type: '2 BHK', sqft: 1180, rate: 4450, cost: 5251000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-C304', agent: 'Direct Builder Sales'
        },
        // Floor 4
        {
          code: 'flat-c-401', wingId: 'wing-c', num: 'C-401', fl: 4, type: '2 BHK', sqft: 1200, rate: 4550, cost: 5460000,
          status: 'BOOKED', bName: 'Alok Narang', bPhone: '9810776655', bEmail: 'alok.n@narangpharma.com', bId: 'Aadhaar Verified',
          bAmt: 546000, bDate: '2026-09-28', plan: 'MILESTONE', park: 'P-C401', agent: 'Prime Properties'
        },
        {
          code: 'flat-c-402', wingId: 'wing-c', num: 'C-402', fl: 4, type: '2 BHK', sqft: 1200, rate: 4550, cost: 5460000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-C402', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-c-403', wingId: 'wing-c', num: 'C-403', fl: 4, type: '3 BHK', sqft: 1500, rate: 4900, cost: 7350000,
          status: 'OCCUPIED_OWNER', bName: 'Brijesh Khandelwal', bPhone: '9820332211', bEmail: 'b.khandelwal@steels.in', bId: 'Aadhaar Verified',
          bAmt: 7350000, bDate: '2026-07-01', plan: 'FULL_PAYMENT', park: 'P-C403', agent: 'Direct Builder Sales'
        },
        {
          code: 'flat-c-404', wingId: 'wing-c', num: 'C-404', fl: 4, type: '3 BHK', sqft: 1500, rate: 4900, cost: 7350000,
          status: 'VACANT', bName: null, bPhone: null, bEmail: null, bId: null, bAmt: 0, bDate: null, plan: 'MILESTONE', park: 'P-C404', agent: 'Direct Builder Sales'
        }
      ];

      for (const f of demoFlats) {
        if (isPlotManage) {
          await conn.query(`
            INSERT INTO ${flatTable} (
              flat_code, wing_id, flat_number, floor_number, sq_ft, occupancy_status,
              bhk_type, rate_per_sqft, total_cost, booking_amount, booking_date, payment_plan,
              parking_slot, buyer_name, buyer_phone, buyer_email, buyer_id_proof, agent_name, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              wing_id=VALUES(wing_id),
              flat_number=VALUES(flat_number),
              floor_number=VALUES(floor_number),
              sq_ft=VALUES(sq_ft),
              occupancy_status=VALUES(occupancy_status),
              bhk_type=VALUES(bhk_type),
              rate_per_sqft=VALUES(rate_per_sqft),
              total_cost=VALUES(total_cost),
              booking_amount=VALUES(booking_amount),
              booking_date=VALUES(booking_date),
              payment_plan=VALUES(payment_plan),
              parking_slot=VALUES(parking_slot),
              buyer_name=VALUES(buyer_name),
              buyer_phone=VALUES(buyer_phone),
              buyer_email=VALUES(buyer_email),
              buyer_id_proof=VALUES(buyer_id_proof),
              agent_name=VALUES(agent_name),
              notes=VALUES(notes);
          `, [
            f.code, f.wingId, f.num, f.fl, f.sqft, f.status,
            f.type, f.rate, f.cost, f.bAmt, f.bDate, f.plan,
            f.park, f.bName, f.bPhone, f.bEmail, f.bId, f.agent, f.notes || null
          ]);

          // Also insert resident into plot_manage_users if occupied or booked
          if (f.bName && f.bPhone) {
            const userCode = `usr-${f.code}`;
            const resType = f.status === 'OCCUPIED_TENANT' ? 'TENANT' : 'OWNER';
            await conn.query(`
              INSERT INTO ${userTable} (user_code, society_id, flat_id, full_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status)
              VALUES (?, 'soc-101', ?, ?, ?, 'resident123', ?, 'RESIDENT', ?, 'Resident', ?, 'ACTIVE')
              ON DUPLICATE KEY UPDATE
                flat_id=VALUES(flat_id),
                full_name=VALUES(full_name),
                phone_number=VALUES(phone_number),
                email=VALUES(email),
                resident_type=VALUES(resident_type),
                parking_slot=VALUES(parking_slot);
            `, [userCode, f.code, f.bName, f.bPhone, f.bEmail || `${f.bPhone}@society.com`, resType, f.park]);
          }
        } else {
          await conn.query(`
            INSERT INTO ${flatTable} (
              id, wing_id, flat_number, floor_number, sq_ft, occupancy_status,
              bhk_type, rate_per_sqft, total_cost, booking_amount, booking_date, payment_plan,
              parking_slot, buyer_name, buyer_phone, buyer_email, buyer_id_proof, agent_name, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              wing_id=VALUES(wing_id),
              flat_number=VALUES(flat_number),
              floor_number=VALUES(floor_number),
              sq_ft=VALUES(sq_ft),
              occupancy_status=VALUES(occupancy_status),
              bhk_type=VALUES(bhk_type),
              rate_per_sqft=VALUES(rate_per_sqft),
              total_cost=VALUES(total_cost),
              booking_amount=VALUES(booking_amount),
              booking_date=VALUES(booking_date),
              payment_plan=VALUES(payment_plan),
              parking_slot=VALUES(parking_slot),
              buyer_name=VALUES(buyer_name),
              buyer_phone=VALUES(buyer_phone),
              buyer_email=VALUES(buyer_email),
              buyer_id_proof=VALUES(buyer_id_proof),
              agent_name=VALUES(agent_name),
              notes=VALUES(notes);
          `, [
            f.code, f.wingId, f.num, f.fl, f.sqft, f.status,
            f.type, f.rate, f.cost, f.bAmt, f.bDate, f.plan,
            f.park, f.bName, f.bPhone, f.bEmail, f.bId, f.agent, f.notes || null
          ]);

          if (f.bName && f.bPhone) {
            const resType = f.status === 'OCCUPIED_TENANT' ? 'TENANT' : 'OWNER';
            await conn.query(`
              INSERT INTO ${userTable} (id, society_id, flat_id, full_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status)
              VALUES (?, 'soc-101', ?, ?, ?, 'resident123', ?, 'RESIDENT', ?, 'Resident', ?, 'ACTIVE')
              ON DUPLICATE KEY UPDATE
                flat_id=VALUES(flat_id),
                full_name=VALUES(full_name),
                phone_number=VALUES(phone_number),
                email=VALUES(email),
                resident_type=VALUES(resident_type),
                parking_slot=VALUES(parking_slot);
            `, [`usr-${f.code}`, f.code, f.bName, f.bPhone, f.bEmail || `${f.bPhone}@society.com`, resType, f.park]);
          }
        }
      }

      const [wCnt] = await conn.query(`SELECT COUNT(*) as cnt FROM ${wingTable};`);
      const [fCnt] = await conn.query(`SELECT COUNT(*) as cnt FROM ${flatTable};`);
      console.log(`🎉 [SUCCESS] '${dbName}' seeded: ${wCnt[0].cnt} Wings, ${fCnt[0].cnt} Flats with complete booking ledger!`);
    }

    await conn.end();
    console.log('\n✅ All Flat Booking Demo Data successfully seeded across XAMPP MySQL databases!');
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
  }
}

seedFlatBookingDemoData();
