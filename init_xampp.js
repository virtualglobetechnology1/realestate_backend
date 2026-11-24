const mysql = require('mysql2/promise');

(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'society_sync_db',
      port: 3306
    });

    console.log('✅ Connected to database society_sync_db in XAMPP MySQL!');

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        society_id VARCHAR(36) NOT NULL DEFAULT 'soc-101',
        flat_id VARCHAR(36) DEFAULT NULL,
        full_name VARCHAR(150) NOT NULL,
        phone_number VARCHAR(20) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(150) DEFAULT NULL,
        role VARCHAR(20) NOT NULL,
        resident_type VARCHAR(20) DEFAULT 'OWNER',
        designation VARCHAR(100) DEFAULT 'Member',
        parking_slot VARCHAR(50) DEFAULT 'N/A',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS society_masterplan (
        id INT PRIMARY KEY DEFAULT 1,
        blueprint_map_url LONGTEXT,
        circle_size INT DEFAULT 44,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS plot_pins (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
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
        is_corner TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS plots (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL DEFAULT 'proj-101',
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Tables created/verified in XAMPP MySQL successfully!');

    // Show tables list
    const [tables] = await db.query('SHOW TABLES');
    console.log('📊 Current Tables in XAMPP society_sync_db:', tables.map(t => Object.values(t)[0]));

    await db.end();
  } catch (err) {
    console.error('❌ XAMPP DB Error:', err);
  }
})();
