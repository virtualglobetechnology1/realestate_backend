const mysql = require('mysql2/promise');

async function syncBothDatabases() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    const dbNames = ['society_sync_db', 'society_sync_database'];

    for (const dbName of dbNames) {
      console.log(`Setting up tables for database: ${dbName}...`);
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await conn.query(`USE \`${dbName}\`;`);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS societies (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          registration_number VARCHAR(100) NOT NULL UNIQUE,
          address TEXT NOT NULL,
          city VARCHAR(100) NOT NULL,
          state VARCHAR(100) NOT NULL,
          total_wings INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        INSERT INTO societies (id, name, registration_number, address, city, state, pincode, total_wings)
        VALUES ('soc-101', 'PlotSync Real Estate Platform', 'REG-1001', 'Main Boulevard', 'City', 'State', '400001', 2)
        ON DUPLICATE KEY UPDATE name = VALUES(name);
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS society_masterplan (
          user_id VARCHAR(100) NOT NULL PRIMARY KEY,
          blueprint_map_url LONGTEXT,
          circle_size INT DEFAULT 44,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS plot_pins (
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
    }

    console.log('✅ Both databases (society_sync_db & society_sync_database) now have society_masterplan and plot_pins tables!');
    await conn.end();
  } catch (err) {
    console.error('❌ Error syncing databases:', err);
  }
}

syncBothDatabases();
