const mysql = require('mysql2/promise');

async function fixDatabaseSchema() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'society_sync_db'
    });

    console.log('1. Ensuring default society soc-101 exists in societies...');
    await conn.query(`
      INSERT INTO societies (id, name, registration_number, address, city, state, pincode, total_wings)
      VALUES ('soc-101', 'PlotSync Real Estate Platform', 'REG-1001', 'Main Boulevard', 'City', 'State', '400001', 2)
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);

    console.log('2. Dropping and re-creating society_masterplan with user_id PRIMARY KEY...');
    await conn.query('DROP TABLE IF EXISTS society_masterplan;');
    await conn.query(`
      CREATE TABLE society_masterplan (
        user_id VARCHAR(100) NOT NULL PRIMARY KEY,
        blueprint_map_url LONGTEXT,
        circle_size INT DEFAULT 44,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('3. Dropping and re-creating plot_pins with user_id column...');
    await conn.query('DROP TABLE IF EXISTS plot_pins;');
    await conn.query(`
      CREATE TABLE plot_pins (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL DEFAULT 'default',
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

    console.log('✅ [MYSQL DB] Database schema updated to support user_id and masterplan uploads successfully!');
    await conn.end();
  } catch (err) {
    console.error('❌ Error updating database schema:', err);
  }
}

fixDatabaseSchema();
