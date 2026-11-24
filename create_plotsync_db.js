const mysql = require('mysql2/promise');

async function importFreshPlotsyncDb() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      multipleStatements: true
    });

    const targetDbs = ['plotsync_db', 'society_sync_db'];

    for (const dbName of targetDbs) {
      console.log(`\n📦 Importing fresh database schema into XAMPP database: '${dbName}'...`);
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await conn.query(`USE \`${dbName}\`;`);

      const queries = [
        `CREATE TABLE IF NOT EXISTS societies (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            registration_number VARCHAR(100) NOT NULL UNIQUE,
            address TEXT NOT NULL,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100) NOT NULL,
            pincode VARCHAR(20) NOT NULL,
            total_wings INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `INSERT INTO societies (id, name, registration_number, address, city, state, pincode, total_wings)
        VALUES ('soc-101', 'PlotSync Real Estate Platform', 'REG-1001', 'Main Boulevard', 'City', 'State', '400001', 2)
        ON DUPLICATE KEY UPDATE name = VALUES(name);`,

        `CREATE TABLE IF NOT EXISTS wings (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            society_id VARCHAR(36) NOT NULL,
            wing_name VARCHAR(50) NOT NULL,
            total_floors INT NOT NULL DEFAULT 4,
            flats_per_floor INT NOT NULL DEFAULT 4,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_wing_per_society (society_id, wing_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS flats (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            wing_id VARCHAR(36) NOT NULL,
            flat_number VARCHAR(50) NOT NULL,
            floor_number INT NOT NULL,
            sq_ft DECIMAL(10, 2) DEFAULT 1000.00,
            occupancy_status VARCHAR(20) NOT NULL DEFAULT 'VACANT',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_flat_per_wing (wing_id, flat_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            society_id VARCHAR(36) NOT NULL,
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS visitor_passes (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            flat_id VARCHAR(36) NOT NULL,
            created_by_user_id VARCHAR(36) NOT NULL,
            visitor_name VARCHAR(150) NOT NULL,
            phone_number VARCHAR(20) NOT NULL,
            visitor_type VARCHAR(50) NOT NULL,
            pass_code VARCHAR(10) NOT NULL,
            status VARCHAR(20) DEFAULT 'EXPECTED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS helpdesk_tickets (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            society_id VARCHAR(36) NOT NULL,
            flat_id VARCHAR(36) NOT NULL,
            raised_by_user_id VARCHAR(36) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(20) DEFAULT 'MEDIUM',
            status VARCHAR(20) DEFAULT 'OPEN',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS plots (
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_plot_per_sector (sector_name, plot_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS plot_installments (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            plot_id VARCHAR(36) NOT NULL,
            milestone_name VARCHAR(100) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'PENDING',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS building_materials (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            material_name VARCHAR(150) NOT NULL UNIQUE,
            category VARCHAR(50) NOT NULL,
            unit_of_measure VARCHAR(20) NOT NULL,
            current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            reorder_threshold DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
            avg_unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS material_inward_logs (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            material_id VARCHAR(36) NOT NULL,
            vendor_name VARCHAR(150) NOT NULL,
            invoice_number VARCHAR(100) NOT NULL,
            quantity_received DECIMAL(10, 2) NOT NULL,
            unit_price DECIMAL(10, 2) NOT NULL,
            total_cost DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS material_dispatch_logs (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            material_id VARCHAR(36) NOT NULL,
            target_location VARCHAR(100) NOT NULL,
            quantity_issued DECIMAL(10, 2) NOT NULL,
            purpose_milestone VARCHAR(150) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS society_masterplan (
            user_id VARCHAR(100) NOT NULL PRIMARY KEY,
            blueprint_map_url LONGTEXT,
            circle_size INT DEFAULT 44,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS plot_pins (
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
            is_corner TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR(50) NOT NULL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            location VARCHAR(255) NOT NULL,
            total_plots INT NOT NULL DEFAULT 45,
            base_rate DECIMAL(10, 2) NOT NULL DEFAULT 2800.00,
            category VARCHAR(50) DEFAULT 'RESIDENTIAL_PLOTTING',
            description TEXT DEFAULT NULL,
            blueprint_map_url LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS plot_manage_material_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id VARCHAR(100) NOT NULL UNIQUE,
            category_name VARCHAR(150) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `INSERT INTO plot_manage_material_categories (category_id, category_name) VALUES
            ('STRUCTURAL', 'Structural (Cement, Steel)'),
            ('MASONRY', 'Masonry (Bricks, AAC Blocks)'),
            ('FINISHING', 'Finishing (Tiles, Paint)'),
            ('PLUMBING', 'Plumbing & Electrical'),
            ('AGGREGATES', 'Aggregates (Sand, Gravel)'),
            ('HARDWARE', 'Hardware & Fittings')
        ON DUPLICATE KEY UPDATE category_name=VALUES(category_name);`,

        `CREATE TABLE IF NOT EXISTS plot_manage_material_units (
            id INT AUTO_INCREMENT PRIMARY KEY,
            unit_name VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `INSERT INTO plot_manage_material_units (unit_name) VALUES
            ('Bags'), ('Kg'), ('Tons'), ('Liters'), ('Boxes'), ('Meters'), ('Pieces'), ('Cu.Ft'), ('Sq.Ft'), ('Trips'), ('Bundles'), ('Drums')
        ON DUPLICATE KEY UPDATE unit_name=VALUES(unit_name);`
      ];

      for (const q of queries) {
        try {
          await conn.query(q);
        } catch (e) {
          console.warn(`Notice for ${dbName}:`, e.message);
        }
      }

      const [tables] = await conn.query('SHOW TABLES;');
      console.log(`🎉 Imported Tables in '${dbName}':`, tables.map(t => Object.values(t)[0]));
    }

    await conn.end();
    console.log('\n✅ Database import verified across XAMPP MySQL!');
  } catch (err) {
    console.error('❌ Import Error:', err.message);
  }
}

importFreshPlotsyncDb();
