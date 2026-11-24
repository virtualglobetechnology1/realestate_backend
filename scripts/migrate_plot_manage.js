const mysql = require('mysql2/promise');

async function migrate() {
  const rootConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    multipleStatements: true
  });

  console.log('1. Creating database plot_manage_db...');
  await rootConn.query('CREATE DATABASE IF NOT EXISTS plot_manage_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  await rootConn.end();

  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'plot_manage_db',
    multipleStatements: true
  });

  console.log('2. Creating all tables with plot_manage_ prefix and AUTO_INCREMENT PRIMARY KEY...');

  // 1. plot_manage_users
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_code VARCHAR(100) NOT NULL UNIQUE,
      society_id VARCHAR(50) DEFAULT 'soc-101',
      flat_id VARCHAR(50) DEFAULT NULL,
      full_name VARCHAR(150) NOT NULL,
      company_name VARCHAR(150) DEFAULT NULL,
      phone_number VARCHAR(20) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(150) DEFAULT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'BUILDER_ADMIN',
      resident_type VARCHAR(50) DEFAULT 'OWNER',
      designation VARCHAR(100) DEFAULT 'Member',
      parking_slot VARCHAR(50) DEFAULT 'N/A',
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_usr_phone (phone_number),
      INDEX idx_usr_code (user_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. plot_manage_projects
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_code VARCHAR(100) NOT NULL UNIQUE,
      user_id VARCHAR(100) NOT NULL DEFAULT 'usr-admin-01',
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      total_plots INT NOT NULL DEFAULT 45,
      base_rate DECIMAL(10, 2) NOT NULL DEFAULT 2800.00,
      category VARCHAR(50) DEFAULT 'RESIDENTIAL_PLOTTING',
      description TEXT DEFAULT NULL,
      blueprint_map_url LONGTEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_proj_user (user_id),
      INDEX idx_proj_code (project_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. plot_manage_pins
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_pins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pin_code VARCHAR(100) NOT NULL UNIQUE,
      project_id VARCHAR(100) NOT NULL DEFAULT 'default',
      user_id VARCHAR(100) NOT NULL DEFAULT 'usr-admin-01',
      plot_number VARCHAR(50) NOT NULL,
      sector_name VARCHAR(50) DEFAULT 'Sector A',
      pos_x DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
      pos_y DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
      dimensions VARCHAR(50) DEFAULT '30x50 ft',
      sq_ft DECIMAL(10, 2) DEFAULT 1500.00,
      base_rate DECIMAL(10, 2) DEFAULT 2800.00,
      facing_direction VARCHAR(20) DEFAULT 'EAST',
      status VARCHAR(20) DEFAULT 'AVAILABLE',
      buyer_name VARCHAR(150) DEFAULT NULL,
      buyer_phone VARCHAR(20) DEFAULT NULL,
      buyer_email VARCHAR(150) DEFAULT NULL,
      buyer_id_proof VARCHAR(100) DEFAULT NULL,
      is_corner TINYINT(1) DEFAULT 0,
      payment_plan VARCHAR(50) DEFAULT 'MILESTONE',
      allotted_date VARCHAR(50) DEFAULT NULL,
      token_amount DECIMAL(10, 2) DEFAULT 0.00,
      paid_amount DECIMAL(10, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pin_proj (project_id),
      INDEX idx_pin_user (user_id),
      INDEX idx_pin_status (status),
      INDEX idx_pin_code (pin_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. plot_manage_transactions
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_code VARCHAR(100) NOT NULL UNIQUE,
      plot_id VARCHAR(100) NOT NULL,
      project_id VARCHAR(100) DEFAULT NULL,
      user_id VARCHAR(100) NOT NULL DEFAULT 'usr-admin-01',
      buyer_name VARCHAR(150) DEFAULT NULL,
      milestone_name VARCHAR(150) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      payment_mode VARCHAR(50) DEFAULT 'BANK_TRANSFER',
      reference_no VARCHAR(100) DEFAULT NULL,
      receipt_no VARCHAR(50) NOT NULL,
      payment_date VARCHAR(50) NOT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tx_plot (plot_id),
      INDEX idx_tx_proj (project_id),
      INDEX idx_tx_user (user_id),
      INDEX idx_tx_code (transaction_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. plot_manage_masterplans
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_masterplans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL UNIQUE,
      blueprint_map_url LONGTEXT,
      circle_size INT DEFAULT 44,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_mp_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. plot_manage_societies
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_societies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      society_code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      registration_number VARCHAR(100) NOT NULL UNIQUE,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(20) DEFAULT '400001',
      total_wings INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. plot_manage_wings
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_wings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      wing_code VARCHAR(100) NOT NULL UNIQUE,
      society_id VARCHAR(100) NOT NULL,
      wing_name VARCHAR(50) NOT NULL,
      total_floors INT NOT NULL DEFAULT 4,
      flats_per_floor INT NOT NULL DEFAULT 4,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. plot_manage_flats
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_flats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      flat_code VARCHAR(100) NOT NULL UNIQUE,
      wing_id VARCHAR(100) NOT NULL,
      flat_number VARCHAR(50) NOT NULL,
      floor_number INT NOT NULL,
      sq_ft DECIMAL(10, 2) DEFAULT 1000.00,
      occupancy_status VARCHAR(20) NOT NULL DEFAULT 'VACANT',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. plot_manage_plots
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_plots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plot_code VARCHAR(100) NOT NULL UNIQUE,
      project_id VARCHAR(100) NOT NULL DEFAULT 'proj-101',
      sector_name VARCHAR(50) NOT NULL DEFAULT 'Sector A',
      plot_number VARCHAR(50) NOT NULL,
      dimensions VARCHAR(50) NOT NULL DEFAULT '30x50 ft',
      sq_ft DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
      base_rate DECIMAL(10, 2) NOT NULL DEFAULT 2500.00,
      facing_direction VARCHAR(20) DEFAULT 'EAST',
      road_width_ft INT DEFAULT 40,
      is_corner TINYINT(1) DEFAULT 0,
      is_park_facing TINYINT(1) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'AVAILABLE',
      buyer_name VARCHAR(150) DEFAULT NULL,
      buyer_phone VARCHAR(20) DEFAULT NULL,
      buyer_id_proof VARCHAR(100) DEFAULT NULL,
      payment_plan VARCHAR(50) DEFAULT 'MILESTONE',
      hold_expires_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. plot_manage_installments
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_installments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      installment_code VARCHAR(100) NOT NULL UNIQUE,
      plot_id VARCHAR(100) NOT NULL,
      milestone_name VARCHAR(100) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      due_date VARCHAR(50) DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      paid_date TIMESTAMP NULL DEFAULT NULL,
      receipt_number VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 11. plot_manage_materials
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      material_code VARCHAR(100) NOT NULL UNIQUE,
      material_name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL,
      unit_of_measure VARCHAR(20) NOT NULL,
      current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      reorder_threshold DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
      avg_unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      supplier_contact VARCHAR(150) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 12. plot_manage_material_inward_logs
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_material_inward_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      log_code VARCHAR(100) NOT NULL UNIQUE,
      material_id VARCHAR(100) NOT NULL,
      vendor_name VARCHAR(150) NOT NULL,
      invoice_number VARCHAR(100) NOT NULL,
      quantity_received DECIMAL(10, 2) NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_cost DECIMAL(10, 2) NOT NULL,
      received_by VARCHAR(100) DEFAULT 'Site Engineer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 13. plot_manage_material_dispatch_logs
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_material_dispatch_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      log_code VARCHAR(100) NOT NULL UNIQUE,
      material_id VARCHAR(100) NOT NULL,
      target_location VARCHAR(100) NOT NULL,
      quantity_issued DECIMAL(10, 2) NOT NULL,
      purpose_milestone VARCHAR(150) NOT NULL,
      issued_by VARCHAR(100) DEFAULT 'Store Manager',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 14. plot_manage_visitor_passes
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_visitor_passes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pass_code_uid VARCHAR(100) NOT NULL UNIQUE,
      flat_id VARCHAR(100) NOT NULL,
      created_by_user_id VARCHAR(100) NOT NULL,
      visitor_name VARCHAR(150) NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      visitor_type VARCHAR(50) NOT NULL,
      pass_code VARCHAR(10) NOT NULL,
      status VARCHAR(20) DEFAULT 'EXPECTED',
      entry_time TIMESTAMP NULL DEFAULT NULL,
      exit_time TIMESTAMP NULL DEFAULT NULL,
      valid_until TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 15. plot_manage_helpdesk_tickets
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plot_manage_helpdesk_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_code VARCHAR(100) NOT NULL UNIQUE,
      society_id VARCHAR(100) NOT NULL,
      flat_id VARCHAR(100) NOT NULL,
      raised_by_user_id VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      priority VARCHAR(20) DEFAULT 'MEDIUM',
      status VARCHAR(20) DEFAULT 'OPEN',
      assigned_staff_name VARCHAR(150) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('3. Copying data from plotsync_db into plot_manage_db...');

  // Copy users
  await conn.query(`
    INSERT INTO plot_manage_users (user_code, society_id, flat_id, full_name, company_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status, created_at)
    SELECT id, society_id, flat_id, full_name, company_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status, created_at
    FROM plotsync_db.users
    ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), company_name = VALUES(company_name);
  `);

  // Copy projects
  await conn.query(`
    INSERT INTO plot_manage_projects (project_code, user_id, name, location, total_plots, base_rate, category, description, blueprint_map_url, created_at)
    SELECT id, user_id, name, location, total_plots, base_rate, category, description, blueprint_map_url, created_at
    FROM plotsync_db.projects
    ON DUPLICATE KEY UPDATE name = VALUES(name), user_id = VALUES(user_id);
  `);

  // Copy pins
  await conn.query(`
    INSERT INTO plot_manage_pins (pin_code, project_id, user_id, plot_number, sector_name, pos_x, pos_y, dimensions, sq_ft, base_rate, facing_direction, status, buyer_name, buyer_phone, buyer_email, buyer_id_proof, is_corner, payment_plan, allotted_date, token_amount, paid_amount, created_at)
    SELECT id, project_id, user_id, plot_number, sector_name, pos_x, pos_y, dimensions, sq_ft, base_rate, facing_direction, status, buyer_name, buyer_phone, buyer_email, buyer_id_proof, is_corner, payment_plan, allotted_date, token_amount, paid_amount, created_at
    FROM plotsync_db.plot_pins
    ON DUPLICATE KEY UPDATE status = VALUES(status), paid_amount = VALUES(paid_amount);
  `);

  // Copy transactions
  await conn.query(`
    INSERT INTO plot_manage_transactions (transaction_code, plot_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes, created_at)
    SELECT id, plot_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes, created_at
    FROM plotsync_db.plot_transactions
    ON DUPLICATE KEY UPDATE amount = VALUES(amount);
  `);

  // Copy masterplans
  await conn.query(`
    INSERT INTO plot_manage_masterplans (user_id, blueprint_map_url, circle_size)
    SELECT user_id, blueprint_map_url, circle_size
    FROM plotsync_db.society_masterplan
    ON DUPLICATE KEY UPDATE circle_size = VALUES(circle_size);
  `);

  // Copy societies
  await conn.query(`
    INSERT INTO plot_manage_societies (society_code, name, registration_number, address, city, state, total_wings, created_at)
    SELECT id, name, registration_number, address, city, state, total_wings, created_at
    FROM plotsync_db.societies
    ON DUPLICATE KEY UPDATE name = VALUES(name);
  `);

  console.log('4. Verification: counting records in plot_manage_db...');
  const [userCount] = await conn.query('SELECT COUNT(*) as c FROM plot_manage_users');
  const [projCount] = await conn.query('SELECT COUNT(*) as c FROM plot_manage_projects');
  const [pinCount] = await conn.query('SELECT COUNT(*) as c FROM plot_manage_pins');
  const [txCount] = await conn.query('SELECT COUNT(*) as c FROM plot_manage_transactions');

  console.log('Users count:', userCount[0].c);
  console.log('Projects count:', projCount[0].c);
  console.log('Pins count:', pinCount[0].c);
  console.log('Transactions count:', txCount[0].c);

  const [sampleProjs] = await conn.query('SELECT id, project_code, name, user_id FROM plot_manage_projects LIMIT 3');
  console.log('Sample Projects with Auto-Increment ID:\n', sampleProjs);

  const [samplePins] = await conn.query('SELECT id, pin_code, plot_number, status FROM plot_manage_pins LIMIT 3');
  console.log('Sample Pins with Auto-Increment ID:\n', samplePins);

  const [sampleUsers] = await conn.query('SELECT id, user_code, full_name, phone_number, company_name FROM plot_manage_users');
  console.log('Sample Users with Auto-Increment ID:\n', sampleUsers);

  await conn.end();
  console.log('Migration completed successfully!');
}

migrate().catch(console.error);
