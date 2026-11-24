const db = require('./src/db');

async function seed() {
  try {
    await db.query(`
      INSERT INTO users (id, society_id, full_name, company_name, phone_number, password_hash, email, role, designation, status)
      VALUES
        ('usr-admin-01', 'soc-101', 'Rajesh Singhania', 'Singhania Realty & Infrastructure', '9876543210', 'admin', 'admin@singhaniagroup.com', 'BUILDER_ADMIN', 'Chief Land Promoter & Builder', 'ACTIVE'),
        ('usr-builder-02', 'soc-101', 'Amitabh Verma', 'Aura Green Estates & Farmsteads', '9876500002', 'builder', 'averma@auragroup.in', 'BUILDER_ADMIN', 'Managing Director & Developer', 'ACTIVE')
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        company_name = VALUES(company_name),
        password_hash = VALUES(password_hash),
        email = VALUES(email),
        role = VALUES(role),
        designation = VALUES(designation);
    `);
    console.log('✅ Demo users seeded into MySQL users table.');

    // Seed distinct projects for User 2 (usr-builder-02) if not already existing
    const [existingU2Projs] = await db.query('SELECT count(*) as count FROM projects WHERE user_id = "usr-builder-02"');
    if (existingU2Projs[0].count === 0) {
      await db.query(`
        INSERT INTO projects (id, user_id, name, location, total_plots, base_rate, category, description)
        VALUES
          ('proj-aura-01', 'usr-builder-02', 'Aura Meadows Golf & Country Club', 'North Hills Corridor, Sector 88', 40, 3200.00, 'LUXURY_GATED_COMMUNITY', 'Elite country club plotted township with 18-hole putting green and club membership.'),
          ('proj-aura-02', 'usr-builder-02', 'Silver Springs Agro Farmsteads', 'Lakeside Expressway, Sector 12', 30, 2400.00, 'FARMHOUSE_PLOTTING', 'Organic agro-farm plots with natural perennial water streams and fruit orchards.'),
          ('proj-aura-03', 'usr-builder-02', 'Verma Pinecrest Villas', 'Airport Bypass Boulevard, Sector 4', 25, 3600.00, 'RESIDENTIAL_PLOTTING', 'Boutique gated enclave near international airport with 50ft tree-lined avenue roads.');
      `);
      console.log('✅ Seeded 3 distinct projects for User 2 (Amitabh Verma).');

      // Seed plot pins for User 2
      await db.query(`
        INSERT INTO plot_pins (id, user_id, project_id, plot_number, sector_name, pos_x, pos_y, dimensions, sq_ft, base_rate, facing_direction, status, buyer_name, buyer_phone, buyer_email, buyer_id_proof, payment_plan, allotted_date, token_amount, paid_amount, is_corner)
        VALUES
          ('pin-aura-1', 'usr-builder-02', 'proj-aura-01', 'A-01', 'Golf Fairway A', 22.50, 28.00, '40x60 ft', 2400.00, 3200.00, 'NORTH', 'SOLD', 'Sunil Grover', '9811122233', 'sunil.grover@gmail.com', 'Aadhaar 8821-9921', 'MILESTONE_30_70', '2026-09-15', 200000.00, 2400000.00, 1),
          ('pin-aura-2', 'usr-builder-02', 'proj-aura-01', 'A-02', 'Golf Fairway A', 34.00, 32.50, '35x55 ft', 1925.00, 3200.00, 'EAST', 'RESERVED', 'Meera Rajput', '9822233344', 'meera.rajput@yahoo.com', 'PAN ABCDE1234F', '24-HR TOKEN HOLD', '2026-09-28', 100000.00, 100000.00, 0),
          ('pin-aura-3', 'usr-builder-02', 'proj-aura-01', 'A-03', 'Golf Fairway A', 46.50, 38.00, '30x50 ft', 1500.00, 3200.00, 'EAST', 'AVAILABLE', NULL, NULL, NULL, NULL, 'MILESTONE', NULL, 0.00, 0.00, 0),
          ('pin-aura-4', 'usr-builder-02', 'proj-aura-01', 'A-04', 'Golf Fairway A', 58.00, 42.00, '30x50 ft', 1500.00, 3200.00, 'NORTH', 'AVAILABLE', NULL, NULL, NULL, NULL, 'MILESTONE', NULL, 0.00, 0.00, 0),
          ('pin-aura-5', 'usr-builder-02', 'proj-aura-02', 'S-10', 'Orchard Block', 25.00, 35.00, '50x80 ft', 4000.00, 2400.00, 'EAST', 'SOLD', 'Karan Johar', '9833344455', 'kjohar@dharma.in', 'Aadhaar 1122-3344', 'CUSTOM_PLAN', '2026-09-10', 500000.00, 4800000.00, 1),
          ('pin-aura-6', 'usr-builder-02', 'proj-aura-02', 'S-11', 'Orchard Block', 45.00, 40.00, '40x70 ft', 2800.00, 2400.00, 'NORTH', 'AVAILABLE', NULL, NULL, NULL, NULL, 'MILESTONE', NULL, 0.00, 0.00, 0),
          ('pin-aura-7', 'usr-builder-02', 'proj-aura-03', 'P-01', 'Avenue 1', 30.00, 30.00, '30x60 ft', 1800.00, 3600.00, 'EAST', 'SOLD', 'Rohit Dhawan', '9844455566', 'rdhawan@outlook.com', 'Aadhaar 7788-9900', 'MILESTONE', '2026-09-18', 250000.00, 3500000.00, 0);
      `);
      console.log('✅ Seeded plot pins for User 2.');

      // Seed transactions for User 2
      await db.query(`
        INSERT INTO plot_transactions (id, user_id, plot_id, project_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes)
        VALUES
          ('tx-aura-1', 'usr-builder-02', 'pin-aura-1', 'proj-aura-01', 'Sunil Grover', '1. Booking Token (10%)', 800000.00, 'NEFT', 'NEFT-AURA-101', 'REC-AUR-01', '2026-09-15', 'Initial token advance'),
          ('tx-aura-2', 'usr-builder-02', 'pin-aura-1', 'proj-aura-01', 'Sunil Grover', '2. Land Demarcation (20%)', 1600000.00, 'BANK_TRANSFER', 'RTGS-AURA-102', 'REC-AUR-02', '2026-09-22', 'Agreement consideration instalment'),
          ('tx-aura-3', 'usr-builder-02', 'pin-aura-5', 'proj-aura-02', 'Karan Johar', '1. Booking Token (10%)', 1000000.00, 'CHEQUE', 'CHQ-981203', 'REC-AUR-03', '2026-09-10', 'Initial token cheque cleared');
      `);
      console.log('✅ Seeded plot transactions for User 2.');
    }

    console.log('🎉 All users and user-specific test data ready!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seed:', err);
    process.exit(1);
  }
}

seed();
