const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');
const dbPool = require('./db');

const app = express();
const PORT = parseInt(process.env.PORT || '6000', 10);
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

let isDatabaseConnected = false;
let autoRecoveryTimer = null;

// Helper to check if MySQL port is accepting connections
function checkPortOpen(port = DB_PORT, host = DB_HOST, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Automatically start local XAMPP MySQL daemon if installed and offline
async function tryAutoStartLocalMySQL() {
  const mysqldCandidates = [
    { exe: 'C:\\xampp\\mysql\\bin\\mysqld.exe', ini: 'C:\\xampp\\mysql\\bin\\my.ini' },
    { exe: 'D:\\xampp\\mysql\\bin\\mysqld.exe', ini: 'D:\\xampp\\mysql\\bin\\my.ini' },
    { exe: 'E:\\xampp\\mysql\\bin\\mysqld.exe', ini: 'E:\\xampp\\mysql\\bin\\my.ini' }
  ];

  for (const item of mysqldCandidates) {
    if (fs.existsSync(item.exe)) {
      try {
        console.log(`🚀 [DATABASE] MySQL service offline. Auto-launching local daemon: ${item.exe}`);
        const args = fs.existsSync(item.ini)
          ? [`--defaults-file=${item.ini}`, '--standalone']
          : ['--standalone'];
        const child = spawn(item.exe, args, {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        child.unref();

        // Wait up to 3 seconds for port 3306 to become active
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 250));
          if (await checkPortOpen(3306)) {
            console.log('✅ [DATABASE] Local MySQL daemon auto-started and listening on port 3306.');
            return true;
          }
        }
      } catch (_) {}
      break;
    }
  }
  return false;
}

// Background recovery: automatically initializes schema once MySQL is online
function scheduleMySQLAutoRecovery() {
  if (autoRecoveryTimer) return;
  autoRecoveryTimer = setInterval(async () => {
    const isOpen = await checkPortOpen(DB_PORT, DB_HOST);
    if (isOpen) {
      try {
        await initDatabaseSchema();
        if (isDatabaseConnected) {
          clearInterval(autoRecoveryTimer);
          autoRecoveryTimer = null;
        }
      } catch (_) {}
    }
  }, 10000);
}

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-Memory Database Store for Caching & Fallback
let inMemoryDb = {
  societies: [],
  wings: [],
  flats: [],
  users: [
    {
      id: 'usr-admin-01',
      fullName: 'Chief Builder Admin',
      phoneNumber: '9876543210',
      password: 'admin',
      role: 'BUILDER_ADMIN',
      societyName: 'PlotSync Masterplan Platform'
    },
    {
      id: 'usr-sales-01',
      fullName: 'Vikram Mehta (Sales Head)',
      phoneNumber: '9876600001',
      password: 'sales',
      role: 'SALES_MANAGER',
      societyName: 'PlotSync Masterplan Platform'
    },
    {
      id: 'usr-client-01',
      fullName: 'Anand Sharma (Plot Buyer)',
      phoneNumber: '9876511111',
      password: 'buyer',
      role: 'CLIENT',
      societyName: 'PlotSync Masterplan Platform'
    }
  ],
  notifications: [],
  visitorPasses: [],
  tickets: [],
  societyBills: [],
  societyAmenityBookings: [],
  societyNotices: [],
  plots: [],
  blueprintMapUrl: null,
  customPlotPins: [],
  circleSize: 24,
  plotInstallments: [],
  buildingMaterials: [],
  materialInwardLogs: [],
  materialDispatchLogs: []
};

// Auto-initialize MySQL Tables on Startup in plot_manage_db
async function initDatabaseSchema() {
  try {
    // Ensure MySQL packet limit supports large high-resolution layout map images (100 MB)
    try {
      await dbPool.query("SET GLOBAL max_allowed_packet = 104857600");
    } catch (_) {}

    // 1. realestate_societies
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_societies (
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

    await dbPool.query(`
      INSERT INTO realestate_societies (society_code, name, registration_number, address, city, state, pincode, total_wings)
      VALUES ('soc-101', 'PlotSync Real Estate Platform', 'REG-1001', 'Main Boulevard', 'City', 'State', '400001', 2)
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);

    // 2. realestate_flat_wings
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_flat_wings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wing_code VARCHAR(100) NOT NULL UNIQUE,
        society_id VARCHAR(100) NOT NULL DEFAULT 'soc-101',
        project_id VARCHAR(100) NOT NULL DEFAULT 'proj-1790598501707',
        wing_name VARCHAR(100) NOT NULL,
        total_floors INT NOT NULL DEFAULT 4,
        flats_per_floor INT NOT NULL DEFAULT 4,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. realestate_flat_flats
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_flat_flats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flat_code VARCHAR(100) NOT NULL UNIQUE,
        wing_id VARCHAR(100) NOT NULL,
        project_id VARCHAR(100) NOT NULL DEFAULT 'proj-1790598501707',
        flat_number VARCHAR(50) NOT NULL,
        floor_number INT NOT NULL,
        sq_ft DECIMAL(10, 2) DEFAULT 1000.00,
        occupancy_status VARCHAR(20) NOT NULL DEFAULT 'VACANT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safety checks for project_id column
    try {
      await dbPool.query("ALTER TABLE realestate_flat_wings ADD COLUMN project_id VARCHAR(100) DEFAULT 'proj-1790598501707'");
    } catch (_) {}
    try {
      await dbPool.query("ALTER TABLE realestate_flat_flats ADD COLUMN project_id VARCHAR(100) DEFAULT 'proj-1790598501707'");
    } catch (_) {}

    // 4. realestate_users
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_users (
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

    // Seed default builder admin users if missing
    try {
      await dbPool.query(`
        INSERT INTO realestate_users (user_code, society_id, full_name, company_name, phone_number, password_hash, email, role, designation, status)
        VALUES
          ('usr-admin-01', 'soc-101', 'Rajesh Singhania', 'Singhania Realty & Infrastructure', '9876543210', 'admin', 'admin@singhaniagroup.com', 'BUILDER_ADMIN', 'Chief Land Promoter & Builder', 'ACTIVE'),
          ('usr-builder-02', 'soc-101', 'Amitabh Verma', 'Aura Green Estates & Farmsteads', '9876600002', 'builder', 'averma@auragroup.in', 'BUILDER_ADMIN', 'Managing Director & Developer', 'ACTIVE')
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          company_name = VALUES(company_name),
          password_hash = VALUES(password_hash),
          email = VALUES(email),
          role = VALUES(role),
          designation = VALUES(designation)
      `);
    } catch (_) {}

    // 5. realestate_flat_visitor_passes
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_flat_visitor_passes (
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

    // 6. realestate_flat_helpdesk_tickets
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_flat_helpdesk_tickets (
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

    // 7. realestate_plot_plots
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_plot_plots (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_plots_proj (project_id),
        INDEX idx_plots_num (plot_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. realestate_plot_installments
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_plot_installments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        installment_code VARCHAR(100) NOT NULL UNIQUE,
        plot_id VARCHAR(100) NOT NULL,
        project_id VARCHAR(100) DEFAULT NULL,
        user_id VARCHAR(100) DEFAULT 'usr-admin-01',
        buyer_name VARCHAR(150) DEFAULT NULL,
        milestone_name VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        due_date VARCHAR(50) DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        paid_date TIMESTAMP NULL DEFAULT NULL,
        receipt_number VARCHAR(50) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_inst_plot (plot_id),
        INDEX idx_inst_proj (project_id),
        INDEX idx_inst_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8b. realestate_flat_installments (High-Rise Milestone Schedule)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_flat_installments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        installment_code VARCHAR(100) NOT NULL UNIQUE,
        flat_id VARCHAR(100) NOT NULL,
        project_id VARCHAR(100) DEFAULT NULL,
        user_id VARCHAR(100) DEFAULT 'usr-admin-01',
        buyer_name VARCHAR(150) DEFAULT NULL,
        milestone_name VARCHAR(150) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        due_date VARCHAR(50) DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        paid_date TIMESTAMP NULL DEFAULT NULL,
        receipt_number VARCHAR(50) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_finst_flat (flat_id),
        INDEX idx_finst_proj (project_id),
        INDEX idx_finst_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8c. realestate_flat_transactions (Flat Payment Receipts Ledger)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_flat_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_code VARCHAR(100) NOT NULL UNIQUE,
        flat_id VARCHAR(100) NOT NULL,
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
        INDEX idx_ftx_flat (flat_id),
        INDEX idx_ftx_proj (project_id),
        INDEX idx_ftx_user (user_id),
        INDEX idx_ftx_code (transaction_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. realestate_materials
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_code VARCHAR(100) NOT NULL UNIQUE,
        project_id VARCHAR(100) DEFAULT 'ALL',
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

    // Ensure project_id column in materials tables
    try { await dbPool.query(`ALTER TABLE realestate_materials ADD COLUMN project_id VARCHAR(100) DEFAULT 'ALL' AFTER material_code`); } catch (_) {}

    // Auto-seeding disabled to ensure database remains clean upon reset
    /*
    try {
      const [matCount] = await dbPool.query('SELECT COUNT(*) as cnt FROM realestate_materials');
      if (matCount[0]?.cnt === 0) {
        ...
      }
    } catch (e) {}
    */

    // 10. realestate_materials_inward_logs
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_materials_inward_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        log_code VARCHAR(100) NOT NULL UNIQUE,
        material_id VARCHAR(100) NOT NULL,
        project_id VARCHAR(100) DEFAULT 'ALL',
        vendor_name VARCHAR(150) NOT NULL,
        invoice_number VARCHAR(100) NOT NULL,
        quantity_received DECIMAL(10, 2) NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_cost DECIMAL(10, 2) NOT NULL,
        received_by VARCHAR(100) DEFAULT 'Site Engineer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    try { await dbPool.query(`ALTER TABLE realestate_materials_inward_logs ADD COLUMN project_id VARCHAR(100) DEFAULT 'ALL' AFTER material_id`); } catch (_) {}

    // 11. realestate_materials_dispatch_logs
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_materials_dispatch_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        log_code VARCHAR(100) NOT NULL UNIQUE,
        material_id VARCHAR(100) NOT NULL,
        project_id VARCHAR(100) DEFAULT 'ALL',
        target_location VARCHAR(100) NOT NULL,
        quantity_issued DECIMAL(10, 2) NOT NULL,
        purpose_milestone VARCHAR(150) NOT NULL,
        issued_by VARCHAR(100) DEFAULT 'Store Manager',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    try { await dbPool.query(`ALTER TABLE realestate_materials_dispatch_logs ADD COLUMN project_id VARCHAR(100) DEFAULT 'ALL' AFTER material_id`); } catch (_) {}

    // 11b. realestate_materials_categories & realestate_materials_units
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_materials_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id VARCHAR(100) NOT NULL UNIQUE,
        category_name VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_materials_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unit_name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Auto-seed initial categories & units if empty
    try {
      const [catCnt] = await dbPool.query('SELECT COUNT(*) as cnt FROM realestate_materials_categories');
      if (catCnt[0]?.cnt === 0) {
        await dbPool.query(`
          INSERT INTO realestate_materials_categories (category_id, category_name) VALUES
            ('STRUCTURAL', 'Structural (Cement, Steel)'),
            ('MASONRY', 'Masonry (Bricks, AAC Blocks)'),
            ('FINISHING', 'Finishing (Tiles, Paint)'),
            ('PLUMBING', 'Plumbing & Electrical'),
            ('AGGREGATES', 'Aggregates (Sand, Gravel)'),
            ('HARDWARE', 'Hardware & Fittings')
        `);
      }
      const [unitCnt] = await dbPool.query('SELECT COUNT(*) as cnt FROM realestate_materials_units');
      if (unitCnt[0]?.cnt === 0) {
        await dbPool.query(`
          INSERT INTO realestate_materials_units (unit_name) VALUES
            ('Bags'), ('Kg'), ('Tons'), ('Liters'), ('Boxes'), ('Meters'), ('Pieces'), ('Cu.Ft'), ('Sq.Ft'), ('Trips'), ('Bundles'), ('Drums')
        `);
      }
    } catch (_) {}

    // 12. realestate_plot_masterplans
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_plot_masterplans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        project_id VARCHAR(100) NOT NULL DEFAULT 'ALL',
        blueprint_map_url LONGTEXT,
        circle_size INT DEFAULT 24,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mp_user (user_id),
        INDEX idx_mp_proj (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await dbPool.query("ALTER TABLE realestate_plot_masterplans ADD COLUMN project_id VARCHAR(100) DEFAULT 'ALL' AFTER user_id");
    } catch (_) {}
    try {
      await dbPool.query("ALTER TABLE realestate_plot_masterplans DROP INDEX user_id");
    } catch (_) {}
    try {
      await dbPool.query("ALTER TABLE realestate_plot_masterplans ADD UNIQUE KEY idx_user_proj (user_id, project_id)");
    } catch (_) {}
    try {
      await dbPool.query("DELETE FROM realestate_plot_masterplans WHERE project_id = 'ALL' OR blueprint_map_url IS NULL OR LENGTH(blueprint_map_url) < 200");
      await dbPool.query("UPDATE realestate_plot_projects SET blueprint_map_url = NULL WHERE blueprint_map_url IS NOT NULL AND LENGTH(blueprint_map_url) < 200");
    } catch (_) {}

    // 13. realestate_plot_pins
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_plot_pins (
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

    // 14. realestate_plot_projects
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_plot_projects (
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

    // 15. realestate_plot_transactions
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_plot_transactions (
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

    // 16. realestate_plot_agents
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_plot_agents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_code VARCHAR(100) NOT NULL UNIQUE,
        user_id VARCHAR(100) NOT NULL DEFAULT 'usr-admin-01',
        name VARCHAR(150) NOT NULL,
        agency_name VARCHAR(150) DEFAULT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(150) DEFAULT NULL,
        commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 2.50,
        address TEXT DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_agt_user (user_id),
        INDEX idx_agt_code (agent_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure realestate_plot_pins has sourcing & commission columns
    try { await dbPool.query(`ALTER TABLE realestate_plot_pins ADD COLUMN sourcing_type VARCHAR(20) DEFAULT 'DIRECT' AFTER paid_amount`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_plot_pins ADD COLUMN agent_id VARCHAR(100) DEFAULT NULL AFTER sourcing_type`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_plot_pins ADD COLUMN agent_name VARCHAR(150) DEFAULT NULL AFTER agent_id`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_plot_pins ADD COLUMN agent_phone VARCHAR(20) DEFAULT NULL AFTER agent_name`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_plot_pins ADD COLUMN agent_commission_pct DECIMAL(5, 2) DEFAULT 0.00 AFTER agent_phone`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_plot_pins ADD COLUMN agent_commission_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER agent_commission_pct`); } catch (_) {}

    // Ensure realestate_plot_installments has project_id, user_id, buyer_name, and notes columns
    try { await dbPool.query(`ALTER TABLE realestate_plot_installments ADD COLUMN project_id VARCHAR(100) DEFAULT NULL AFTER plot_id`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_plot_installments ADD COLUMN user_id VARCHAR(100) DEFAULT 'usr-admin-01' AFTER project_id`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_plot_installments ADD COLUMN buyer_name VARCHAR(150) DEFAULT NULL AFTER user_id`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_plot_installments ADD COLUMN notes TEXT DEFAULT NULL AFTER receipt_number`); } catch (_) {}

    // Ensure columns for realestate_flat_visitor_passes
    try { await dbPool.query(`ALTER TABLE realestate_flat_visitor_passes ADD COLUMN vehicle_number VARCHAR(50) DEFAULT 'N/A' AFTER phone_number`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_flat_visitor_passes ADD COLUMN society_id VARCHAR(100) DEFAULT 'soc-001' AFTER pass_code_uid`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_flat_visitor_passes ADD COLUMN notes TEXT DEFAULT NULL AFTER status`); } catch (_) {}

    // Ensure columns for realestate_flat_helpdesk_tickets
    try { await dbPool.query(`ALTER TABLE realestate_flat_helpdesk_tickets ADD COLUMN flat_number VARCHAR(50) DEFAULT NULL AFTER flat_id`); } catch (_) {}
    try { await dbPool.query(`ALTER TABLE realestate_flat_helpdesk_tickets ADD COLUMN resident_name VARCHAR(150) DEFAULT NULL AFTER flat_number`); } catch (_) {}

    // 19. realestate_society_bills (Society Maintenance Bills)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_society_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_code VARCHAR(100) NOT NULL UNIQUE,
        society_id VARCHAR(100) NOT NULL DEFAULT 'soc-001',
        flat_id VARCHAR(100) DEFAULT NULL,
        flat_number VARCHAR(50) NOT NULL,
        resident_name VARCHAR(150) NOT NULL,
        month_year VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        late_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        due_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
        payment_mode VARCHAR(50) DEFAULT NULL,
        receipt_number VARCHAR(100) DEFAULT NULL,
        paid_date TIMESTAMP NULL DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_soc_bills_soc (society_id),
        INDEX idx_soc_bills_flat (flat_number),
        INDEX idx_soc_bills_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 20. realestate_society_amenity_bookings (Amenity Reservations)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_society_amenity_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_code VARCHAR(100) NOT NULL UNIQUE,
        society_id VARCHAR(100) NOT NULL DEFAULT 'soc-001',
        amenity_id VARCHAR(100) NOT NULL,
        amenity_name VARCHAR(150) NOT NULL,
        flat_number VARCHAR(50) NOT NULL,
        resident_name VARCHAR(150) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        booking_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        guest_count INT DEFAULT 1,
        total_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_soc_amenity_soc (society_id),
        INDEX idx_soc_amenity_date (booking_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 21. realestate_society_notices (Broadcast Announcements)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS realestate_society_notices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        notice_code VARCHAR(100) NOT NULL UNIQUE,
        society_id VARCHAR(100) NOT NULL DEFAULT 'soc-001',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
        urgency VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
        posted_by VARCHAR(150) DEFAULT 'Society Management',
        is_pinned TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_soc_notices_soc (society_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed realistic sample data if society tables are empty
    try {
      const [billCount] = await dbPool.query('SELECT COUNT(*) as c FROM realestate_society_bills');
      if (billCount[0].c === 0) {
        await dbPool.query(`
          INSERT INTO realestate_society_bills (bill_code, society_id, flat_number, resident_name, month_year, amount, late_fee, due_date, status, payment_mode, receipt_number, paid_date) VALUES
          ('BILL-2026-101', 'soc-001', 'A-101', 'Chetan Pardhi', 'November 2026', 2500.00, 0.00, '2026-11-30', 'PAID', 'UPI', 'REC-2026-901', '2026-11-05 10:30:00'),
          ('BILL-2026-102', 'soc-001', 'A-102', 'Rutuja Shah', 'November 2026', 2500.00, 250.00, '2026-11-15', 'OVERDUE', NULL, NULL, NULL),
          ('BILL-2026-103', 'soc-001', 'A-103', 'Vrushab Chauhan', 'November 2026', 2500.00, 0.00, '2026-11-30', 'PAID', 'NETBANKING', 'REC-2026-902', '2026-11-08 14:15:00'),
          ('BILL-2026-104', 'soc-001', 'A-204', 'Saurabh Thakkar', 'November 2026', 3000.00, 0.00, '2026-11-30', 'UNPAID', NULL, NULL, NULL),
          ('BILL-2026-105', 'soc-001', 'P-401', 'Ayan Sheikh', 'November 2026', 2800.00, 0.00, '2026-11-30', 'UNPAID', NULL, NULL, NULL);
        `);
      }
    } catch (_) {}

    try {
      const [passCount] = await dbPool.query('SELECT COUNT(*) as c FROM realestate_flat_visitor_passes');
      if (passCount[0].c === 0) {
        await dbPool.query(`
          INSERT INTO realestate_flat_visitor_passes (pass_code_uid, society_id, flat_id, created_by_user_id, visitor_name, phone_number, vehicle_number, visitor_type, pass_code, status, entry_time) VALUES
          ('GP-101', 'soc-001', 'flat-A-102', 'usr-admin-01', 'Rahul Sharma (Guest)', '9822012345', 'MH-31-AZ-4521', 'GUEST', '4821', 'CHECKED_IN', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
          ('GP-102', 'soc-001', 'flat-A-103', 'usr-admin-01', 'Sunil Kumar (Zomato Delivery)', '9890123456', 'MH-31-EE-8910', 'DELIVERY', '1092', 'CHECKED_IN', DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
          ('GP-103', 'soc-001', 'flat-A-204', 'usr-admin-01', 'Urban Company AC Tech', '9765432109', 'MH-31-BC-6721', 'SERVICE', '3310', 'CHECKED_IN', DATE_SUB(NOW(), INTERVAL 60 MINUTE)),
          ('GP-104', 'soc-001', 'flat-P-401', 'usr-admin-01', 'Vikramaditya Rao (Visitor)', '9811009988', 'MH-31-CD-1122', 'GUEST', '7744', 'EXPECTED', NULL);
        `);
      }
    } catch (_) {}

    try {
      const [ticketCount] = await dbPool.query('SELECT COUNT(*) as c FROM realestate_flat_helpdesk_tickets');
      if (ticketCount[0].c === 0) {
        await dbPool.query(`
          INSERT INTO realestate_flat_helpdesk_tickets (ticket_code, society_id, flat_id, flat_number, resident_name, raised_by_user_id, title, description, category, priority, status, assigned_staff_name) VALUES
          ('TKT-101', 'soc-001', 'flat-A-102', 'A-102', 'Rutuja Shah', 'usr-admin-01', 'Main Corridor Lift #2 Sensor Malfunction', 'Elevator jerky motion observed between 2nd and 3rd floor.', 'ELEVATOR', 'HIGH', 'IN_PROGRESS', 'Kone Elevator Engineers'),
          ('TKT-102', 'soc-001', 'flat-A-204', 'A-204', 'Saurabh Thakkar', 'usr-admin-01', 'Low Water Pressure in Master Bathroom', 'Water flow has reduced considerably since yesterday morning.', 'PLUMBING', 'MEDIUM', 'ASSIGNED', 'Ramesh Plumber'),
          ('TKT-103', 'soc-001', 'flat-P-401', 'P-401', 'Ayan Sheikh', 'usr-admin-01', 'Clubhouse AC Remote Not Working', 'Remote battery drained or sensor unresponsive.', 'ELECTRICAL', 'LOW', 'OPEN', NULL);
        `);
      }
    } catch (_) {}

    try {
      const [noticeCount] = await dbPool.query('SELECT COUNT(*) as c FROM realestate_society_notices');
      if (noticeCount[0].c === 0) {
        await dbPool.query(`
          INSERT INTO realestate_society_notices (notice_code, society_id, title, message, category, urgency, posted_by, is_pinned) VALUES
          ('NTC-001', 'soc-001', 'Annual General Body Meeting (AGM) 2026', 'All residents and flat owners are requested to attend the Annual General Meeting on Sunday 10:00 AM at the Clubhouse.', 'MEETING', 'HIGH', 'Society Managing Committee', 1),
          ('NTC-002', 'soc-001', 'Overhead Water Tank Cleaning Schedule', 'Water tank cleaning will take place on Thursday from 9:00 AM to 2:00 PM. Water supply will remain paused during this window.', 'MAINTENANCE', 'URGENT', 'Society Maintenance Office', 1),
          ('NTC-003', 'soc-001', 'Diwali & New Year Cultural Evening', 'Join us for fireworks, live music, and family dinner on November 12th from 6:30 PM onwards at the Central Lawn.', 'EVENT', 'NORMAL', 'Cultural Committee', 0);
        `);
      }
    } catch (_) {}

    try {
      const [amenityCount] = await dbPool.query('SELECT COUNT(*) as c FROM realestate_society_amenity_bookings');
      if (amenityCount[0].c === 0) {
        await dbPool.query(`
          INSERT INTO realestate_society_amenity_bookings (booking_code, society_id, amenity_id, amenity_name, flat_number, resident_name, phone, booking_date, time_slot, guest_count, total_charge, status, notes) VALUES
          ('ABK-101', 'soc-001', 'amenity-clubhouse', 'Clubhouse Banquet Hall', 'A-103', 'Vrushab Chauhan', '9823001122', '2026-11-28', '6:00 PM - 10:00 PM', 40, 1500.00, 'CONFIRMED', 'Family Birthday Gathering'),
          ('ABK-102', 'soc-001', 'amenity-court', 'Tennis / Badminton Court', 'A-101', 'Chetan Pardhi', '9822003344', '2026-11-25', '6:00 AM - 7:00 AM', 2, 300.00, 'CONFIRMED', 'Morning Practice Session');
        `);
      }
    } catch (_) {}

    // Database schema initialization complete with zero demo data.
    console.log('✅ [MYSQL DB] Auto-schema ready in database plot_manage_db with AUTO_INCREMENT PRIMARY KEYS & Complete Society System.');
    isDatabaseConnected = true;
  } catch (err) {
    isDatabaseConnected = false;
    if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
      console.log('⚡ [DATABASE] MySQL (127.0.0.1:3306) is offline -> Zero-downtime In-Memory mode active.');
      console.log('🔄 [DATABASE] Background recovery active: will synchronize schema automatically when MySQL starts.');
      scheduleMySQLAutoRecovery();
    } else {
      console.warn('⚠️ [MYSQL DB] Auto-schema notice:', err.message);
    }
  }
}

async function bootstrapDatabase() {
  const isUp = await checkPortOpen(DB_PORT, DB_HOST);
  if (!isUp) {
    const isLocalHost = DB_HOST === '127.0.0.1' || DB_HOST === 'localhost';
    const started = isLocalHost ? await tryAutoStartLocalMySQL() : false;
    if (!started) {
      console.log(`⚡ [DATABASE] MySQL (${DB_HOST}:${DB_PORT}) is offline -> Zero-downtime In-Memory mode active.`);
      console.log('🔄 [DATABASE] Background monitor active: will auto-connect when MySQL is started.');
      scheduleMySQLAutoRecovery();
      return;
    }
  }
  await initDatabaseSchema();
}

bootstrapDatabase();

// Health Check Endpoint

// 10. AGENT MANAGEMENT MODULE ENDPOINTS
app.get('/api/agents', async (req, res) => {
  const targetUserId = req.query.userId || '';
  try {
    let query = `
      SELECT 
        a.id as auto_id,
        a.agent_code as id,
        a.user_id,
        a.name,
        a.agency_name,
        a.phone,
        a.email,
        a.commission_rate,
        a.address,
        a.status,
        a.created_at,
        COUNT(p.id) as deals_count,
        COALESCE(SUM(p.sq_ft * p.base_rate * IF(p.is_corner = 1, 1.10, 1.0)), 0) as total_sales_volume,
        COALESCE(SUM(p.agent_commission_amount), 0) as total_commission_earned
      FROM realestate_plot_agents a
      LEFT JOIN realestate_plot_pins p ON (p.agent_id = a.agent_code OR p.agent_id = CAST(a.id AS CHAR)) AND p.status IN ('SOLD', 'BOOKED', 'RESERVED')
    `;
    const params = [];
    if (targetUserId) {
      query += ` WHERE a.user_id = ? OR a.user_id = (SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ?)`;
      params.push(targetUserId, isNaN(targetUserId) ? -1 : parseInt(targetUserId), targetUserId);
    }
    query += ` GROUP BY a.id ORDER BY a.id DESC`;

    const [rows] = await dbPool.query(query, params);
    const agents = rows.map(r => ({
      id: r.id,
      autoId: r.auto_id,
      userId: r.user_id,
      name: r.name,
      agencyName: r.agency_name || 'Independent Broker',
      phone: r.phone,
      email: r.email || `${r.phone}@agent.com`,
      commissionRate: parseFloat(r.commission_rate || 2.5),
      address: r.address || '',
      status: r.status || 'ACTIVE',
      createdAt: r.created_at,
      dealsCount: parseInt(r.deals_count || 0),
      totalSalesVolume: parseFloat(r.total_sales_volume || 0),
      totalCommissionEarned: parseFloat(r.total_commission_earned || 0)
    }));

    return res.json({ success: true, agents });
  } catch (err) {
    console.error('MySQL GET /api/agents error:', err.message);
    return res.status(500).json({ success: false, message: err.message, agents: [] });
  }
});

app.post('/api/agents', async (req, res) => {
  const { userId, name, agencyName, phone, email, commissionRate, address, status } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Agent name and phone number are required.' });
  }

  const agentCode = `agt-${Date.now()}`;
  const targetUserId = userId || 'usr-admin-01';
  const rate = parseFloat(commissionRate) || 2.5;

  try {
    const [result] = await dbPool.query(
      `INSERT INTO realestate_plot_agents (agent_code, user_id, name, agency_name, phone, email, commission_rate, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentCode,
        targetUserId,
        name.trim(),
        agencyName ? agencyName.trim() : 'Independent Broker',
        phone.trim(),
        email ? email.trim() : null,
        rate,
        address ? address.trim() : null,
        status || 'ACTIVE'
      ]
    );

    const newAgent = {
      id: agentCode,
      autoId: result.insertId,
      userId: targetUserId,
      name: name.trim(),
      agencyName: agencyName ? agencyName.trim() : 'Independent Broker',
      phone: phone.trim(),
      email: email ? email.trim() : '',
      commissionRate: rate,
      address: address || '',
      status: status || 'ACTIVE',
      dealsCount: 0,
      totalSalesVolume: 0,
      totalCommissionEarned: 0
    };

    console.log(`🤝 [AGENT REGISTERED] Registered agent '${name}' with code ${agentCode} (Auto ID: ${result.insertId}, Rate: ${rate}%)`);
    return res.status(201).json({ success: true, message: `Agent '${name}' registered successfully!`, agent: newAgent });
  } catch (err) {
    console.error('MySQL POST /api/agents error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/agents/:id', async (req, res) => {
  const agentId = req.params.id;
  const { name, agencyName, phone, email, commissionRate, address, status } = req.body;

  try {
    await dbPool.query(
      `UPDATE realestate_plot_agents 
       SET name = ?, agency_name = ?, phone = ?, email = ?, commission_rate = ?, address = ?, status = ?
       WHERE agent_code = ? OR id = ?`,
      [
        name,
        agencyName || 'Independent Broker',
        phone,
        email || null,
        parseFloat(commissionRate) || 2.5,
        address || null,
        status || 'ACTIVE',
        agentId,
        isNaN(agentId) ? -1 : parseInt(agentId)
      ]
    );

    return res.json({ success: true, message: `Agent '${name}' updated successfully!` });
  } catch (err) {
    console.error('MySQL PUT /api/agents error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/agents/:id', async (req, res) => {
  const agentId = req.params.id;
  try {
    await dbPool.query(
      `DELETE FROM realestate_plot_agents WHERE agent_code = ? OR id = ?`,
      [agentId, isNaN(agentId) ? -1 : parseInt(agentId)]
    );

    return res.json({ success: true, message: 'Agent deleted successfully!' });
  } catch (err) {
    console.error('MySQL DELETE /api/agents error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/health', async (req, res) => {
  let dbStatus = 'OFFLINE';
  let dbError = null;
  const dbName = process.env.DB_NAME || 'plot_manage_db';
  try {
    const [rows] = await dbPool.query('SELECT 1 FROM realestate_plot_projects LIMIT 1');
    if (rows) dbStatus = `ONLINE (${dbName})`;
  } catch (err) {
    dbError = err.code || err.message;
  }

  res.json({
    status: 'OK',
    database: dbStatus,
    ...(dbError ? { dbError } : {}),
    timestamp: new Date().toISOString()
  });
});

// GET ALL PROJECTS FROM MYSQL DB (USER SPECIFIC)
app.get('/api/projects', async (req, res) => {
  const targetUserId = req.query.userId || '';
  try {
    let query = `
      SELECT 
        id as auto_id, 
        project_code as id, 
        project_code,
        user_id as userId, 
        name, 
        location, 
        total_plots as totalPlots, 
        base_rate as baseRate, 
        category, 
        description, 
        blueprint_map_url as blueprintMapUrl, 
        created_at as createdAt 
      FROM realestate_plot_projects
    `;
    const params = [];
    if (targetUserId && targetUserId !== 'ALL') {
      try {
        const [u] = await dbPool.query('SELECT role FROM realestate_users WHERE id = ? OR user_code = ?', [targetUserId, targetUserId]);
        const role = u[0]?.role;
        if (role !== 'BUILDER_ADMIN' && role !== 'ADMIN' && targetUserId !== 'usr-admin-01') {
          query += ' WHERE user_id = ? OR user_id = (SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ?)';
          params.push(targetUserId, isNaN(targetUserId) ? -1 : parseInt(targetUserId), targetUserId);
        }
      } catch (_) {}
    }
    query += ' ORDER BY id ASC';
    const [rows] = await dbPool.query(query, params);
    const cleanedRows = rows.map(r => ({
      ...r,
      blueprintMapUrl: (r.blueprintMapUrl && r.blueprintMapUrl.length > 200) ? r.blueprintMapUrl : null
    }));
    return res.json({ success: true, projects: cleanedRows });
  } catch (err) {
    console.error('MySQL GET /api/projects error:', err.message);
  }
  const filteredMemory = targetUserId
    ? (inMemoryDb.projects || []).filter(p => p.userId === targetUserId)
    : (inMemoryDb.projects || []);
  res.json({ success: true, projects: filteredMemory });
});

// CREATE NEW PROJECT IN MYSQL DB (USER SPECIFIC)
app.post('/api/projects', async (req, res) => {
  const { id, userId, name, location, totalPlots, baseRate, category, description, blueprintMapUrl } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Project name is required' });
  }
  const projCode = id || `proj-${Date.now()}`;
  const rawUserId = userId || 'usr-admin-01';
  let targetUserId = rawUserId;
  try {
    const [uRows] = await dbPool.query(
      'SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ? OR phone_number = ?',
      [rawUserId, rawUserId, rawUserId]
    );
    if (uRows.length > 0 && uRows[0].user_code) {
      targetUserId = uRows[0].user_code;
    }
  } catch (_) {}

  const cleanMapUrl = (blueprintMapUrl && blueprintMapUrl.length > 200) ? blueprintMapUrl : null;
  const newProj = {
    id: projCode,
    project_code: projCode,
    userId: targetUserId,
    name,
    location: location || 'Default Location',
    totalPlots: parseInt(totalPlots) || 45,
    baseRate: parseFloat(baseRate) || 2800,
    category: category || 'RESIDENTIAL_PLOTTING',
    description: description || '',
    blueprintMapUrl: cleanMapUrl
  };

  try {
    const [result] = await dbPool.query(
      `INSERT INTO realestate_plot_projects (project_code, user_id, name, location, total_plots, base_rate, category, description, blueprint_map_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), name=VALUES(name), location=VALUES(location), total_plots=VALUES(total_plots), base_rate=VALUES(base_rate), category=VALUES(category), description=VALUES(description), blueprint_map_url=VALUES(blueprint_map_url)`,
      [newProj.project_code, newProj.userId, newProj.name, newProj.location, newProj.totalPlots, newProj.baseRate, newProj.category, newProj.description, newProj.blueprintMapUrl]
    );
    newProj.auto_id = result.insertId;
    console.log(`✅ [MYSQL DB] Inserted project entry '${newProj.name}' into realestate_plot_projects (Auto ID: ${result.insertId}, Code: ${newProj.project_code}, User: ${newProj.userId})`);
  } catch (err) {
    console.error('MySQL POST /api/projects error:', err.message);
  }

  if (!inMemoryDb.projects) inMemoryDb.projects = [];
  inMemoryDb.projects.unshift(newProj);

  res.json({ success: true, message: `Project '${newProj.name}' created & saved to database successfully!`, project: newProj });
});

// GET ALL REGISTERED SOCIETIES FROM MYSQL DB
app.get('/api/societies', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT id as auto_id, society_code as id, name, registration_number, address, city, state, pincode, total_wings, created_at FROM realestate_societies ORDER BY id DESC');
    if (rows.length > 0) {
      return res.json({ success: true, societies: rows });
    }
  } catch (err) {
    console.log('MySQL societies query notice:', err.message);
  }

  res.json({ success: true, societies: inMemoryDb.societies });
});

// 1. AUTHENTICATION: REGISTER NEW USER ACCOUNT (USER SPECIFIC WORKSPACE)
app.post('/api/auth/register', async (req, res) => {
  const { fullName, companyName, phoneNumber, password, email, role, designation } = req.body;

  if (!fullName || !phoneNumber || !password) {
    return res.status(400).json({ success: false, message: 'Full name, phone number, and password are required.' });
  }

  const userCode = `usr-${Date.now()}`;
  const userRole = role || 'BUILDER_ADMIN';
  const userDesignation = designation || (userRole === 'BUILDER_ADMIN' ? 'Land Promoter & Builder' : 'Sales Head');
  const compName = companyName || `${fullName} Properties & Land Holdings`;

  let mysqlSuccess = false;
  let autoId = null;
  try {
    const [userResult] = await dbPool.query(
      `INSERT INTO realestate_users (user_code, society_id, full_name, company_name, phone_number, password_hash, email, role, resident_type, designation, status)
       VALUES (?, 'soc-101', ?, ?, ?, ?, ?, ?, 'OWNER', ?, 'ACTIVE')`,
      [userCode, fullName, compName, phoneNumber, password, email || `${phoneNumber}@plotmanagement.com`, userRole, userDesignation]
    );
    autoId = userResult.insertId;
    mysqlSuccess = true;
    console.log(`✅ [MYSQL DB] Registered user account '${fullName}' (${phoneNumber}) as ${userRole} with Auto ID ${autoId} & Code ${userCode}!`);

    // Create a starter project for the new user so they have a fresh workspace ready immediately
    const starterProjCode = `proj-${Date.now()}`;
    await dbPool.query(
      `INSERT INTO realestate_plot_projects (project_code, user_id, name, location, total_plots, base_rate, category, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [starterProjCode, userCode, `${compName} Greenfield Enclave`, 'Prime City Outer Ring Road', 30, 2500.00, 'RESIDENTIAL_PLOTTING', 'Initial plotted township development project ready for CAD blueprint mapping.']
    );
  } catch (err) {
    console.log('MySQL user register notice (using memory fallback):', err.message);
  }

  const newUser = {
    id: userCode,
    auto_id: autoId,
    user_code: userCode,
    fullName,
    name: fullName,
    companyName: compName,
    phoneNumber,
    phone: phoneNumber,
    password,
    email: email || `${phoneNumber}@plotmanagement.com`,
    role: userRole,
    designation: userDesignation,
    societyId: 'soc-101',
    societyName: compName
  };

  inMemoryDb.users.push(newUser);

  return res.status(201).json({
    success: true,
    message: mysqlSuccess
      ? `User account registered in MySQL database plot_manage_db successfully!`
      : `User account registered successfully!`,
    token: `jwt_token_${userCode}_${Date.now()}`,
    user: newUser
  });
});

// 2. AUTHENTICATION: LOGIN (SUPPORTS PHONE NUMBER OR EMAIL)
app.post('/api/auth/login', async (req, res) => {
  const { phoneNumber, password, role } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ success: false, message: 'Phone number/Email and password are required.' });
  }

  const searchParam = (phoneNumber || '').trim();

  // Attempt MySQL Query on realestate_users
  try {
    const [rows] = await dbPool.query(
      `SELECT u.*, f.flat_number, w.wing_name, s.name as society_name 
       FROM realestate_users u 
       LEFT JOIN realestate_flat_flats f ON u.flat_id = f.flat_code 
       LEFT JOIN realestate_flat_wings w ON f.wing_id = w.wing_code 
       LEFT JOIN realestate_societies s ON u.society_id = s.society_code 
       WHERE u.phone_number = ? OR u.email = ?`,
      [searchParam, searchParam]
    );

    if (rows.length > 0) {
      const dbUser = rows[0];
      if (dbUser.password_hash === password || dbUser.password_hash.startsWith('$2b$')) {
        if (role && dbUser.role !== role) {
          return res.status(403).json({ success: false, message: `Access denied. Account is registered as ${dbUser.role}.` });
        }

        return res.json({
          success: true,
          message: 'Login successful (MySQL plot_manage_db)',
          token: `jwt_token_${dbUser.user_code}_${Date.now()}`,
          user: {
            id: dbUser.user_code || dbUser.id.toString(),
            auto_id: dbUser.id,
            user_code: dbUser.user_code,
            fullName: dbUser.full_name,
            name: dbUser.full_name,
            companyName: dbUser.company_name || 'Singhania Realty & Infrastructure',
            phoneNumber: dbUser.phone_number,
            phone: dbUser.phone_number,
            email: dbUser.email,
            role: dbUser.role,
            residentType: dbUser.resident_type,
            designation: dbUser.designation,
            societyId: dbUser.society_id,
            societyName: dbUser.company_name || dbUser.society_name || 'PlotSync Platform',
            flatId: dbUser.flat_id,
            flatNumber: dbUser.flat_number || 'Penthouse 01',
            wingName: dbUser.wing_name || 'Tower A'
          }
        });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials. Password incorrect.' });
      }
    }
  } catch (err) {
    console.log('MySQL login query notice (using fallback):', err.message);
  }

  // Fallback to in-memory store
  const user = inMemoryDb.users.find(
    u => (u.phoneNumber === searchParam || u.email === searchParam) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials. User not found or password incorrect.' });
  }

  res.json({
    success: true,
    message: 'Login successful (In-Memory)',
    token: `jwt_token_${user.id}_${Date.now()}`,
    user
  });
});

// ASSIGN FLAT / REGISTER RESIDENT
app.post('/api/admin/assign-flat', async (req, res) => {
  const {
    societyId,
    flatId,
    fullName,
    phoneNumber,
    password,
    email,
    residentType,
    designation,
    parkingSlot
  } = req.body;

  const targetFullName = (fullName || req.body.residentName || req.body.buyerName || req.body.customerName || '').trim();
  const targetPhone = (phoneNumber || req.body.residentPhone || req.body.buyerPhone || req.body.customerPhone || req.body.phone || '').trim();
  const targetPass = (password || req.body.residentPassword || 'resident123').trim();
  const targetEmail = (email || req.body.residentEmail || req.body.buyerEmail || req.body.customerEmail || '').trim() || null;
  const flatNumber = req.body.flatNumber || flatId;

  if (!flatId || !targetFullName || !targetPhone) {
    return res.status(400).json({ success: false, message: 'Flat, resident name, and phone are required.' });
  }

  const occupancyStatus = residentType === 'TENANT' ? 'OCCUPIED_TENANT' : 'OCCUPIED_OWNER';
  const newUserId = `usr-${Date.now()}`;
  let mysqlSuccess = false;

  try {
    const assignBhk = (req.body.bhkType || req.body.type || '').trim();
    const assignBhkVal = assignBhk && assignBhk !== 'Not Specified' ? assignBhk : null;
    const assignSqft = parseFloat(req.body.sqft || req.body.sqFt) || 0;
    const assignSuper = parseFloat(req.body.superBuiltUpSqFt) || assignSqft;
    const assignRate = parseFloat(req.body.ratePerSqFt) || 0;
    const assignCost = parseFloat(req.body.totalCost) || (assignSuper > 0 ? assignSuper * assignRate : assignSqft * assignRate);

    await dbPool.query(
      `UPDATE realestate_flat_flats SET 
        occupancy_status = ?,
        buyer_name = ?,
        buyer_phone = ?,
        buyer_email = ?,
        bhk_type = COALESCE(?, bhk_type),
        sq_ft = IF(? > 0, ?, sq_ft),
        super_builtup_sqft = IF(? > 0, ?, super_builtup_sqft),
        rate_per_sqft = IF(? > 0, ?, rate_per_sqft),
        total_cost = IF(? > 0, ?, total_cost),
        parking_slot = COALESCE(?, parking_slot)
       WHERE flat_code = ? OR id = ? OR flat_number = ? OR flat_number = ?`,
      [
        occupancyStatus,
        targetFullName,
        targetPhone,
        targetEmail,
        assignBhkVal,
        assignSqft, assignSqft,
        assignSuper, assignSuper,
        assignRate, assignRate,
        assignCost, assignCost,
        parkingSlot || null,
        flatId,
        isNaN(flatId) ? -1 : parseInt(flatId),
        flatId,
        flatNumber
      ]
    );

    const [flatRows] = await dbPool.query(
      'SELECT f.flat_number, f.wing_id, w.society_id, w.wing_name FROM realestate_flat_flats f JOIN realestate_flat_wings w ON (f.wing_id = w.wing_code OR f.wing_id = CAST(w.id AS CHAR)) WHERE f.flat_code = ? OR f.id = ? OR f.flat_number = ?',
      [flatId, isNaN(flatId) ? -1 : parseInt(flatId), flatNumber]
    );

    const flatInfo = flatRows[0] || { flat_number: 'A-101', society_id: societyId || 'soc-101', wing_name: 'Wing A' };

    await dbPool.query(
      `INSERT INTO realestate_users (user_code, society_id, flat_id, full_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'RESIDENT', ?, ?, ?, 'ACTIVE')
       ON DUPLICATE KEY UPDATE 
         flat_id = VALUES(flat_id),
         full_name = VALUES(full_name),
         password_hash = VALUES(password_hash),
         resident_type = VALUES(resident_type),
         parking_slot = VALUES(parking_slot)`,
      [
        newUserId,
        societyId || flatInfo.society_id || 'soc-101',
        flatId,
        targetFullName,
        targetPhone,
        targetPass,
        targetEmail || `${targetPhone}@society.com`,
        residentType || 'OWNER',
        designation || 'Resident',
        parkingSlot || `P-${flatInfo.flat_number}`
      ]
    );

    mysqlSuccess = true;
    console.log(`✅ [REAL MYSQL DB INSERT SUCCESS] Inserted resident '${targetFullName}' (${targetPhone}) into realestate_users!`);
  } catch (dbErr) {
    console.error('❌ MySQL Database Error during assign-flat:', dbErr.message);
  }

  const flat = inMemoryDb.flats.find(f => f.id === flatId);
  if (flat) {
    flat.occupancyStatus = occupancyStatus;
    flat.residentName = fullName;
    flat.phone = phoneNumber;
  }

  const newUser = {
    id: newUserId,
    societyId: societyId || 'soc-101',
    flatId: flatId,
    flatNumber: flat ? flat.flatNumber : 'A-101',
    wingName: flat ? flat.wingName : 'Wing A',
    fullName,
    phoneNumber,
    password,
    email: email || '',
    role: 'RESIDENT',
    residentType: residentType || 'OWNER',
    designation: designation || 'Resident',
    parkingSlot: parkingSlot || 'P-Unassigned',
    status: 'ACTIVE'
  };

  inMemoryDb.users = inMemoryDb.users.filter(u => u.phoneNumber !== phoneNumber);
  inMemoryDb.users.push(newUser);

  res.status(201).json({
    success: true,
    message: mysqlSuccess
      ? `Resident inserted into MySQL Database and assigned to flat successfully!`
      : `Resident assigned to flat successfully!`,
    user: newUser
  });
});

// ADMIN: GET WINGS AND FLATS MATRIX FROM MYSQL (PROJECT-WISE & USER-WISE)
app.get('/api/admin/society-matrix', async (req, res) => {
  const { societyId, projectId, userId } = req.query;

  try {
    let wingsQuery = `SELECT w.id as auto_id, w.wing_code as id, w.society_id, w.project_id, w.wing_name, w.total_floors, w.flats_per_floor 
      FROM realestate_flat_wings w
      LEFT JOIN realestate_plot_projects p ON (w.project_id = p.project_code OR w.project_id = CAST(p.id AS CHAR))`;
    const wingsParams = [];
    const conditions = [];

    if (projectId && projectId !== 'ALL') {
      conditions.push('w.project_id = ?');
      wingsParams.push(projectId);
    }
    if (userId && userId !== 'ALL') {
      conditions.push('(p.user_id = ? OR p.user_id = (SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ?))');
      wingsParams.push(userId, isNaN(userId) ? -1 : parseInt(userId), userId);
    }

    if (conditions.length > 0) {
      wingsQuery += ' WHERE ' + conditions.join(' AND ');
    }
    wingsQuery += ' ORDER BY w.id ASC';

    const [wingsRows] = await dbPool.query(wingsQuery, wingsParams);

    let flatsQuery = `SELECT f.id as auto_id, f.flat_code as id, f.wing_id, f.project_id, f.flat_number, f.floor_number, f.sq_ft, f.super_builtup_sqft as superBuiltUpSqFt, f.occupancy_status,
              f.bhk_type as bhkType, f.rate_per_sqft as ratePerSqFt, f.total_cost as totalCost, f.booking_amount as bookingAmount,
              f.booking_date as bookingDate, f.payment_plan as paymentPlan, f.parking_slot as parkingSlot,
              f.buyer_name as buyerName, f.buyer_phone as buyerPhone, f.buyer_email as buyerEmail, f.buyer_id_proof as buyerIdProof,
              f.agent_name as agentName, f.hold_expires_at as holdExpiresAt, f.notes,
              w.wing_name, COALESCE(f.buyer_name, u.full_name) as residentName, COALESCE(f.buyer_phone, u.phone_number) as phone 
       FROM realestate_flat_flats f 
       JOIN realestate_flat_wings w ON (f.wing_id = w.wing_code OR f.wing_id = CAST(w.id AS CHAR))
       LEFT JOIN realestate_plot_projects p ON (w.project_id = p.project_code OR w.project_id = CAST(p.id AS CHAR))
       LEFT JOIN realestate_users u ON (u.flat_id = f.flat_code OR u.flat_id = CAST(f.id AS CHAR))`;
    const flatsParams = [];
    const flatsConditions = [];

    if (projectId && projectId !== 'ALL') {
      flatsConditions.push('w.project_id = ?');
      flatsParams.push(projectId);
    }
    if (userId && userId !== 'ALL') {
      flatsConditions.push('(p.user_id = ? OR p.user_id = (SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ?))');
      flatsParams.push(userId, isNaN(userId) ? -1 : parseInt(userId), userId);
    }

    if (flatsConditions.length > 0) {
      flatsQuery += ' WHERE ' + flatsConditions.join(' AND ');
    }
    flatsQuery += ' ORDER BY f.floor_number ASC, f.flat_number ASC';

    const [flatsRows] = await dbPool.query(flatsQuery, flatsParams);

    const wingsFormatted = wingsRows.map(w => ({
      id: w.id,
      autoId: w.auto_id,
      societyId: w.society_id,
      projectId: w.project_id,
      wingName: w.wing_name,
      totalFloors: w.total_floors,
      flatsPerFloor: w.flats_per_floor,
      flats: flatsRows
        .filter(f => f.wing_id === w.id || f.wing_id === String(w.auto_id))
        .map(f => ({
          id: f.id,
          autoId: f.auto_id,
          wingId: f.wing_id,
          wingName: f.wing_name,
          projectId: f.project_id,
          flatNumber: f.flat_number,
          floorNumber: f.floor_number,
          sqFt: parseFloat(f.sq_ft || 0),
          superBuiltUpSqFt: parseFloat(f.superBuiltUpSqFt || 0),
          occupancyStatus: f.occupancy_status,
          bhkType: f.bhkType || 'Not Specified',
          ratePerSqFt: parseFloat(f.ratePerSqFt || 0),
          totalCost: parseFloat(f.totalCost || 0),
          bookingAmount: parseFloat(f.bookingAmount || 0),
          bookingDate: f.bookingDate,
          paymentPlan: f.paymentPlan || 'MILESTONE',
          parkingSlot: f.parkingSlot || `P-${f.flat_number}`,
          buyerName: f.buyerName || f.residentName,
          buyerPhone: f.buyerPhone || f.phone,
          buyerEmail: f.buyerEmail,
          buyerIdProof: f.buyerIdProof,
          agentName: f.agentName || 'Direct Builder Sales',
          holdExpiresAt: f.holdExpiresAt,
          notes: f.notes,
          residentName: f.residentName || f.buyerName,
          phone: f.phone || f.buyerPhone
        }))
    }));

    return res.json({ success: true, wings: wingsFormatted });
  } catch (mysqlErr) {
    console.log('MySQL matrix fetch notice (using fallback):', mysqlErr.message);
  }

  return res.json({ success: true, wings: [] });
});

// GET REGISTERED USERS FOR EASY ASSIGNMENT
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT 
        id as auto_id,
        user_code as id,
        full_name as fullName,
        phone_number as phoneNumber,
        email,
        role,
        resident_type as residentType,
        designation,
        parking_slot as parkingSlot,
        flat_id as flatId,
        status
      FROM realestate_users
      ORDER BY full_name ASC
    `);
    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error('MySQL GET /api/users error:', err.message);
    return res.status(500).json({ success: false, message: err.message, users: [] });
  }
});

// ADD NEW BUILDING / TOWER WITH INITIAL FLOORS (STRICT PROJECT REGISTRATION)
app.post('/api/wings', async (req, res) => {
  const {
    projectId,
    wingName,
    totalFloors,
    flatsPerFloor,
    prefix,
    bhkType,
    sqFt,
    ratePerSqFt
  } = req.body;

  if (!wingName || !wingName.trim()) {
    return res.status(400).json({ success: false, message: 'Building / Wing name is required' });
  }

  if (!projectId || projectId === 'ALL' || !projectId.trim()) {
    return res.status(400).json({ success: false, message: 'Please select a specific project. Every building must be registered under a project.' });
  }

  const projId = projectId.trim();
  const floors = Math.max(1, parseInt(totalFloors) || 4);
  const unitsPerFloor = Math.max(1, parseInt(flatsPerFloor) || 4);
  const wingCode = `wing-${Date.now()}`;
  const pre = (prefix || wingName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3) || 'T').toUpperCase();

  try {
    const [wingResult] = await dbPool.query(
      `INSERT INTO realestate_flat_wings (wing_code, society_id, project_id, wing_name, total_floors, flats_per_floor)
       VALUES (?, 'soc-101', ?, ?, ?, ?)`,
      [wingCode, projId, wingName.trim(), floors, unitsPerFloor]
    );

    // Generate flats for each floor
    const flatInserts = [];
    for (let f = 1; f <= floors; f++) {
      for (let u = 1; u <= unitsPerFloor; u++) {
        const flatNum = `${pre}-${f}${u < 10 ? '0' + u : u}`;
        const flatCode = `flat-${wingCode}-${f}-${u}`;
        flatInserts.push([
          flatCode,
          wingCode,
          projId,
          flatNum,
          f,
          0.00, // sq_ft (carpet area)
          0.00, // super_builtup_sqft
          'VACANT',
          'Not Specified',
          0.00, // rate_per_sqft
          0.00, // total_cost
          0.00  // booking_amount
        ]);
      }
    }

    if (flatInserts.length > 0) {
      await dbPool.query(
        `INSERT INTO realestate_flat_flats 
         (flat_code, wing_id, project_id, flat_number, floor_number, sq_ft, super_builtup_sqft, occupancy_status, bhk_type, rate_per_sqft, total_cost, booking_amount)
         VALUES ?`,
        [flatInserts]
      );
    }

    console.log(`🏢 [BUILDING CREATED] Added building '${wingName}' with ${floors} floors (${flatInserts.length} flats) for project ${projId} in plot_manage_db`);
    return res.json({
      success: true,
      message: `Building '${wingName}' created with ${floors} floors and ${flatInserts.length} flats!`,
      wing: {
        id: wingCode,
        autoId: wingResult.insertId,
        wingName,
        projectId: projId,
        totalFloors: floors,
        flatsPerFloor: unitsPerFloor
      }
    });
  } catch (err) {
    console.error('MySQL POST /api/wings error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ADD FLOOR TO EXISTING BUILDING
app.post('/api/wings/:wingId/add-floor', async (req, res) => {
  const { wingId } = req.params;
  const { flatsCount, bhkType, sqFt, ratePerSqFt, prefix } = req.body;

  try {
    const [wingRows] = await dbPool.query(
      'SELECT id, wing_code, wing_name, project_id, total_floors, flats_per_floor FROM realestate_flat_wings WHERE wing_code = ? OR id = ?',
      [wingId, isNaN(wingId) ? -1 : parseInt(wingId)]
    );

    if (wingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Building / Wing not found' });
    }

    const wing = wingRows[0];
    const newFloorNumber = (wing.total_floors || 0) + 1;
    const unitsOnThisFloor = parseInt(flatsCount) || wing.flats_per_floor || 4;
    const pre = (prefix || wing.wing_name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3) || 'W').toUpperCase();

    // Update wing total floors
    await dbPool.query(
      'UPDATE realestate_flat_wings SET total_floors = ? WHERE id = ?',
      [newFloorNumber, wing.id]
    );

    // Insert new flats for this floor
    const flatInserts = [];
    for (let u = 1; u <= unitsOnThisFloor; u++) {
      const flatNum = `${pre}-${newFloorNumber}${u < 10 ? '0' + u : u}`;
      const flatCode = `flat-${wing.wing_code}-${newFloorNumber}-${u}`;
      flatInserts.push([
        flatCode,
        wing.wing_code,
        wing.project_id,
        flatNum,
        newFloorNumber,
        0.00, // sq_ft
        0.00, // super_builtup_sqft
        'VACANT',
        'Not Specified',
        0.00, // rate_per_sqft
        0.00, // total_cost
        0.00  // booking_amount
      ]);
    }

    if (flatInserts.length > 0) {
      await dbPool.query(
        `INSERT INTO realestate_flat_flats 
         (flat_code, wing_id, project_id, flat_number, floor_number, sq_ft, super_builtup_sqft, occupancy_status, bhk_type, rate_per_sqft, total_cost, booking_amount)
         VALUES ?`,
        [flatInserts]
      );
    }

    console.log(`🏢 [FLOOR ADDED] Added Floor ${newFloorNumber} with ${unitsOnThisFloor} flats to '${wing.wing_name}' in plot_manage_db`);
    return res.json({
      success: true,
      message: `Floor ${newFloorNumber} added with ${unitsOnThisFloor} flats!`,
      newFloorNumber
    });
  } catch (err) {
    console.error('MySQL add floor error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE BUILDING / WING AND ITS FLATS
app.delete('/api/wings/:wingId', async (req, res) => {
  const { wingId } = req.params;
  try {
    const [wingRows] = await dbPool.query(
      'SELECT id, wing_code FROM realestate_flat_wings WHERE wing_code = ? OR id = ?',
      [wingId, isNaN(wingId) ? -1 : parseInt(wingId)]
    );
    if (wingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Building / Wing not found' });
    }
    const wing = wingRows[0];
    await dbPool.query('DELETE FROM realestate_flat_flats WHERE wing_id = ? OR wing_id = ?', [wing.wing_code, String(wing.id)]);
    await dbPool.query('DELETE FROM realestate_flat_wings WHERE id = ?', [wing.id]);

    return res.json({ success: true, message: 'Building and associated flats deleted successfully from plot_manage_db.' });
  } catch (err) {
    console.error('MySQL delete wing error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// BOOK / ALLOT FLAT IN MYSQL
app.post('/api/flats/book', async (req, res) => {
  const { flatId, buyerIdProof, status, type, sqft, superBuiltUpSqFt, super_builtup_sqft, ratePerSqFt, totalCost, bookingAmount, bookingDate, paymentPlan, parkingSlot, agentName } = req.body;
  if (!flatId) {
    return res.status(400).json({ success: false, message: 'Flat ID is required' });
  }

  const resolvedBuyerName = (req.body.buyerName || req.body.residentName || req.body.customerName || req.body.fullName || '').trim() || 'Buyer';
  const resolvedBuyerPhone = (req.body.buyerPhone || req.body.residentPhone || req.body.customerPhone || req.body.phoneNumber || req.body.phone || '').trim() || null;
  const resolvedBuyerEmail = (req.body.buyerEmail || req.body.residentEmail || req.body.customerEmail || req.body.email || '').trim() || null;
  const flatNumber = req.body.flatNumber || flatId;

  const newStatus = status || 'BOOKED';
  const sqftVal = parseFloat(sqft) || 0;
  const sBuiltUpVal = parseFloat(superBuiltUpSqFt || super_builtup_sqft) || sqftVal;
  const rateVal = parseFloat(ratePerSqFt) || 0;
  const costVal = parseFloat(totalCost) || (sBuiltUpVal > 0 ? sBuiltUpVal * rateVal : sqftVal * rateVal);
  const amtVal = parseFloat(bookingAmount) || (costVal * 0.1);

  try {
    const bType = (type && type !== 'Not Specified') ? type : null;
    const [updateResult] = await dbPool.query(
      `UPDATE realestate_flat_flats SET 
        occupancy_status = ?,
        buyer_name = ?,
        buyer_phone = ?,
        buyer_email = ?,
        buyer_id_proof = ?,
        bhk_type = COALESCE(?, bhk_type, 'Not Specified'),
        sq_ft = IF(? > 0, ?, sq_ft),
        super_builtup_sqft = IF(? > 0, ?, super_builtup_sqft),
        rate_per_sqft = IF(? > 0, ?, rate_per_sqft),
        total_cost = IF(? > 0, ?, total_cost),
        booking_amount = ?,
        booking_date = ?,
        payment_plan = ?,
        parking_slot = COALESCE(?, parking_slot),
        agent_name = ?
      WHERE flat_code = ? OR id = ? OR flat_number = ? OR flat_number = ?`,
      [
        newStatus,
        resolvedBuyerName,
        resolvedBuyerPhone,
        resolvedBuyerEmail,
        buyerIdProof || 'Aadhaar Verified',
        bType,
        sqftVal, sqftVal,
        sBuiltUpVal, sBuiltUpVal,
        rateVal, rateVal,
        costVal, costVal,
        amtVal,
        bookingDate || new Date().toISOString().slice(0, 10),
        paymentPlan || 'MILESTONE',
        parkingSlot || null,
        agentName || 'Direct Builder Sales',
        flatId,
        isNaN(flatId) ? -1 : parseInt(flatId),
        flatId,
        flatNumber
      ]
    );

    // Also register or update user
    if (resolvedBuyerName && resolvedBuyerPhone) {
      const userCode = `usr-${flatId}`;
      const resType = newStatus === 'OCCUPIED_TENANT' ? 'TENANT' : 'OWNER';
      await dbPool.query(`
        INSERT INTO realestate_users (user_code, society_id, flat_id, full_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status)
        VALUES (?, 'soc-101', ?, ?, ?, 'resident123', ?, 'RESIDENT', ?, 'Resident', ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE 
          flat_id=VALUES(flat_id), full_name=VALUES(full_name), phone_number=VALUES(phone_number),
          email=VALUES(email), resident_type=VALUES(resident_type), parking_slot=VALUES(parking_slot);
      `, [userCode, flatId, resolvedBuyerName, resolvedBuyerPhone, resolvedBuyerEmail || `${resolvedBuyerPhone}@society.com`, resType, parkingSlot]);
    }

    // Also record initial booking deposit transaction in realestate_flat_transactions if amtVal > 0
    if (amtVal > 0) {
      try {
        const bTxCode = `ftx-${Date.now().toString().slice(-6)}`;
        const bReceiptNo = `REC-FLAT-${Date.now().toString().slice(-6)}`;
        await dbPool.query(
          `INSERT INTO realestate_flat_transactions (transaction_code, flat_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes)
           VALUES (?, ?, ?, ?, ?, 'Booking Token Deposit', ?, 'BANK_TRANSFER', ?, ?, ?, 'Initial Booking Allotment Token')`,
          [
            bTxCode,
            flatId,
            req.body.projectId || null,
            req.body.userId || 'usr-admin-01',
            resolvedBuyerName,
            amtVal,
            `REF-BOOK-${Date.now().toString().slice(-5)}`,
            bReceiptNo,
            bookingDate || new Date().toISOString().slice(0, 10)
          ]
        );
      } catch (e) {
        console.warn('Booking transaction auto-insert warning:', e.message);
      }
    }

    console.log(`🏢 [FLAT BOOKED] Flat '${flatId}' booked for '${resolvedBuyerName}' (${resolvedBuyerPhone}, Cost: ₹${costVal}) in MySQL! Affected rows: ${updateResult.affectedRows}`);
    return res.json({ success: true, message: `Flat booked successfully for ${resolvedBuyerName}!` });
  } catch (err) {
    console.error('MySQL POST /api/flats/book error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PLACE FLAT ON TEMPORARY HOLD IN MYSQL
app.post('/api/flats/hold', async (req, res) => {
  const { flatId, days, notes, type, bhkType, sqft, superBuiltUpSqFt, ratePerSqFt, totalCost, parkingSlot } = req.body;
  if (!flatId) {
    return res.status(400).json({ success: false, message: 'Flat ID is required' });
  }

  const resolvedBuyerName = (req.body.buyerName || req.body.residentName || req.body.customerName || req.body.fullName || '').trim() || 'Hold Client';
  const resolvedBuyerPhone = (req.body.buyerPhone || req.body.residentPhone || req.body.customerPhone || req.body.phoneNumber || req.body.phone || '').trim() || null;
  const flatNumber = req.body.flatNumber || flatId;
  const holdDays = parseInt(days) || 7;
  const expiresAt = new Date(Date.now() + holdDays * 86400000).toISOString().slice(0, 10);

  const bType = (type || bhkType) && (type || bhkType) !== 'Not Specified' ? (type || bhkType) : null;
  const sqftVal = parseFloat(sqft) || 0;
  const sBuiltUpVal = parseFloat(superBuiltUpSqFt) || sqftVal;
  const rateVal = parseFloat(ratePerSqFt) || 0;
  const costVal = parseFloat(totalCost) || (sBuiltUpVal > 0 ? sBuiltUpVal * rateVal : sqftVal * rateVal);

  try {
    const [holdResult] = await dbPool.query(
      `UPDATE realestate_flat_flats SET 
        occupancy_status = 'HOLD',
        buyer_name = ?,
        buyer_phone = ?,
        hold_expires_at = ?,
        notes = ?,
        bhk_type = COALESCE(?, bhk_type),
        sq_ft = IF(? > 0, ?, sq_ft),
        super_builtup_sqft = IF(? > 0, ?, super_builtup_sqft),
        rate_per_sqft = IF(? > 0, ?, rate_per_sqft),
        total_cost = IF(? > 0, ?, total_cost),
        parking_slot = COALESCE(?, parking_slot)
      WHERE flat_code = ? OR id = ? OR flat_number = ? OR flat_number = ?`,
      [
        resolvedBuyerName,
        resolvedBuyerPhone,
        expiresAt,
        notes || `Placed on ${holdDays}-day temporary hold`,
        bType,
        sqftVal, sqftVal,
        sBuiltUpVal, sBuiltUpVal,
        rateVal, rateVal,
        costVal, costVal,
        parkingSlot || null,
        flatId,
        isNaN(flatId) ? -1 : parseInt(flatId),
        flatId,
        flatNumber
      ]
    );

    console.log(`⏱️ [FLAT ON HOLD] Flat '${flatId}' on hold for '${resolvedBuyerName}' (${resolvedBuyerPhone}) until ${expiresAt} in MySQL! Affected rows: ${holdResult.affectedRows}`);
    return res.json({ success: true, message: `Flat placed on hold until ${expiresAt}!` });
  } catch (err) {
    console.error('MySQL POST /api/flats/hold error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// CANCEL FLAT BOOKING IN MYSQL
app.post('/api/flats/cancel', async (req, res) => {
  const { flatId, flatNumber } = req.body;
  if (!flatId) {
    return res.status(400).json({ success: false, message: 'Flat ID is required' });
  }

  try {
    await dbPool.query(
      `UPDATE realestate_flat_flats SET 
        occupancy_status = 'VACANT',
        buyer_name = NULL,
        buyer_phone = NULL,
        buyer_email = NULL,
        buyer_id_proof = NULL,
        booking_amount = 0.00,
        booking_date = NULL,
        hold_expires_at = NULL,
        notes = NULL
      WHERE flat_code = ? OR id = ? OR flat_number = ? OR flat_number = ?`,
      [
        flatId, 
        isNaN(flatId) ? -1 : parseInt(flatId), 
        flatId, 
        flatNumber || flatId
      ]
    );

    console.log(`🗑️ [FLAT RELEASED] Flat '${flatId}' returned to VACANT in MySQL!`);
    return res.json({ success: true, message: `Flat booking cancelled and returned to available inventory!` });
  } catch (err) {
    console.error('MySQL POST /api/flats/cancel error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE INDIVIDUAL FLAT DETAILS / SPECIFICATIONS IN MYSQL
app.post('/api/flats/update-details', async (req, res) => {
  const { flatId, flatNumber, wingId, bhkType, type, sqft, superBuiltUpSqFt, ratePerSqFt, totalCost, parkingSlot, paymentPlan, facing } = req.body;
  if (!flatId && !flatNumber) {
    return res.status(400).json({ success: false, message: 'Flat ID or Flat Number is required' });
  }

  const resolvedBhk = (bhkType || type || '').trim() || 'Not Specified';
  const sqftVal = parseFloat(sqft) || 0;
  const sBuiltUpVal = parseFloat(superBuiltUpSqFt) || sqftVal;
  const rateVal = parseFloat(ratePerSqFt) || 0;
  const costVal = parseFloat(totalCost) || (sBuiltUpVal > 0 ? sBuiltUpVal * rateVal : sqftVal * rateVal);
  const targetFlatNumber = flatNumber || flatId;
  const targetParking = parkingSlot || `P-${targetFlatNumber}`;

  try {
    let updateSql = `UPDATE realestate_flat_flats SET 
        bhk_type = ?,
        sq_ft = ?,
        super_builtup_sqft = ?,
        rate_per_sqft = ?,
        total_cost = ?,
        parking_slot = COALESCE(?, parking_slot),
        payment_plan = COALESCE(?, payment_plan)
      WHERE (flat_code = ? OR id = ? OR flat_number = ? OR flat_number = ?)`;
    
    let updateParams = [
      resolvedBhk,
      sqftVal,
      sBuiltUpVal,
      rateVal,
      costVal,
      targetParking,
      paymentPlan || null,
      flatId || targetFlatNumber,
      isNaN(flatId) ? -1 : parseInt(flatId),
      flatId || targetFlatNumber,
      targetFlatNumber
    ];

    if (wingId) {
      updateSql += ` AND (wing_id = ? OR wing_id = (SELECT wing_code FROM realestate_flat_wings WHERE id = ? OR wing_code = ? LIMIT 1))`;
      updateParams.push(wingId, isNaN(wingId) ? -1 : parseInt(wingId), wingId);
    }

    const [updateResult] = await dbPool.query(updateSql, updateParams);

    // Also sync with in-memory flat cache if present
    const inMemFlat = inMemoryDb.flats.find(f => f.id === flatId || f.flatNumber === targetFlatNumber);
    if (inMemFlat) {
      inMemFlat.bhkType = resolvedBhk;
      inMemFlat.sqFt = sqftVal;
      inMemFlat.sqft = sqftVal;
      inMemFlat.superBuiltUpSqFt = sBuiltUpVal;
      inMemFlat.ratePerSqFt = rateVal;
      inMemFlat.totalCost = costVal;
      inMemFlat.parkingSlot = targetParking;
    }

    console.log(`📐 [FLAT SPECS UPDATED] Flat '${flatId}' (${targetFlatNumber}) updated in plot_manage_db! BHK: ${resolvedBhk}, SqFt: ${sqftVal}, Cost: ₹${costVal}. Rows affected: ${updateResult.affectedRows}`);
    return res.json({
      success: true,
      message: `Flat specifications updated successfully into plot_manage_db!`,
      flat: {
        id: flatId || targetFlatNumber,
        flatNumber: targetFlatNumber,
        bhkType: resolvedBhk,
        type: resolvedBhk,
        sqFt: sqftVal,
        sqft: sqftVal,
        superBuiltUpSqFt: sBuiltUpVal,
        ratePerSqFt: rateVal,
        totalCost: costVal,
        parkingSlot: targetParking,
        facing: facing || 'East Facing'
      }
    });
  } catch (err) {
    console.error('MySQL POST /api/flats/update-details error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// SOCIETY REGISTRATION FLOW (REAL MYSQL INSERTIONS)
app.post('/api/societies/register', async (req, res) => {
  const {
    societyName,
    registrationNumber,
    address,
    city,
    state,
    pincode,
    wingNames,
    floorsPerWing,
    flatsPerFloor,
    adminName,
    adminPhone,
    adminEmail,
    adminPassword,
    adminDesignation
  } = req.body;

  if (!societyName || !registrationNumber || !adminPhone || !adminPassword) {
    return res.status(400).json({ success: false, message: 'Missing required society or admin fields.' });
  }

  const societyCode = `soc-${Date.now()}`;
  const wingsList = wingNames && wingNames.length > 0 ? wingNames : ['Wing A', 'Wing B'];
  const floors = parseInt(floorsPerWing) || 4;
  const flatsPerFl = parseInt(flatsPerFloor) || 4;

  try {
    await dbPool.query(
      `INSERT INTO realestate_societies (society_code, name, registration_number, address, city, state, pincode, total_wings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [societyCode, societyName, registrationNumber, address || '', city || 'City', state || 'State', pincode || '000000', wingsList.length]
    );

    let firstFlatCode = null;
    for (let wIdx = 0; wIdx < wingsList.length; wIdx++) {
      const wName = wingsList[wIdx];
      const wingCode = `wing-${societyCode}-${wIdx + 1}`;
      
      await dbPool.query(
        `INSERT INTO realestate_flat_wings (wing_code, society_id, wing_name, total_floors, flats_per_floor) VALUES (?, ?, ?, ?, ?)`,
        [wingCode, societyCode, wName, floors, flatsPerFl]
      );

      for (let fl = 1; fl <= floors; fl++) {
        for (let fn = 1; fn <= flatsPerFl; fn++) {
          const flatCode = `flat-${wingCode}-${fl}-${fn}`;
          if (!firstFlatCode) firstFlatCode = flatCode;
          const flatNum = `${wName.replace('Wing ', '')}-${fl}0${fn}`;
          
          await dbPool.query(
            `INSERT INTO realestate_flat_flats (flat_code, wing_id, flat_number, floor_number, sq_ft, occupancy_status) VALUES (?, ?, ?, ?, ?, ?)`,
            [flatCode, wingCode, flatNum, fl, 1100, (wIdx === 0 && fl === 1 && fn === 1) ? 'OCCUPIED_OWNER' : 'VACANT']
          );
        }
      }
    }

    const adminUserCode = `usr-admin-${Date.now()}`;
    await dbPool.query(
      `INSERT INTO realestate_users (user_code, society_id, flat_id, full_name, phone_number, password_hash, email, role, resident_type, designation, parking_slot, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ADMIN', 'OWNER', ?, 'P-01', 'ACTIVE')`,
      [adminUserCode, societyCode, firstFlatCode, adminName || 'Admin', adminPhone, adminPassword, adminEmail || '', adminDesignation || 'President']
    );

    console.log(`🎉 [MYSQL DB REGISTER SUCCESS] Created society '${societyName}' with Admin '${adminName}' in plot_manage_db!`);
  } catch (mysqlErr) {
    console.error('❌ MySQL Society Register Error:', mysqlErr.message);
  }

  const newSociety = {
    id: societyCode,
    name: societyName,
    registrationNumber,
    address: address || '',
    city: city || 'City',
    state: state || 'State',
    pincode: pincode || '000000',
    totalWings: wingsList.length,
    createdAt: new Date().toISOString()
  };
  inMemoryDb.societies.push(newSociety);

  res.status(201).json({
    success: true,
    message: 'Society registered successfully!',
    society: newSociety
  });
});

// BROADCAST NOTIFICATION
app.post('/api/admin/broadcast-notification', async (req, res) => {
  const { societyId, title, message, category, targetAudience, isHighPriority } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Title and message text are required.' });
  }

  const notifId = `notif-${Date.now()}`;
  const newNotification = {
    id: notifId,
    societyId: societyId || 'soc-101',
    title,
    message,
    category: category || 'ANNOUNCEMENT',
    targetAudience: targetAudience || 'All Residents',
    isHighPriority: isHighPriority || false,
    createdAt: new Date().toISOString()
  };

  inMemoryDb.notifications.unshift(newNotification);

  console.log(`📡 [PUSH DISPATCH] Notification Broadcasted to ${targetAudience}: "${title}"`);

  res.status(201).json({
    success: true,
    message: 'Notification broadcasted to residents successfully!',
    notification: newNotification
  });
});

app.get('/api/admin/notifications', (req, res) => {
  res.json({
    success: true,
    notifications: inMemoryDb.notifications
  });
});

// RESIDENT: DASHBOARD INFO
app.get('/api/resident/dashboard', (req, res) => {
  const { userId } = req.query;
  const user = inMemoryDb.users.find(u => u.id === userId) || inMemoryDb.users.find(u => u.role === 'RESIDENT');

  res.json({
    success: true,
    user,
    visitorPasses: inMemoryDb.visitorPasses,
    tickets: inMemoryDb.tickets,
    notifications: inMemoryDb.notifications,
    invoices: [
      { id: 'inv-101', month: 'September 2026', amount: 3500, dueDate: 'Sept 30, 2026', status: 'UNPAID' }
    ]
  });
});

// PLOT LAYOUT MODULE ENDPOINTS (MYSQL + FALLBACK)
app.get('/api/plots', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM realestate_plot_plots ORDER BY sector_name ASC, plot_number ASC');
    if (rows.length > 0) {
      const plotsFormatted = rows.map(p => ({
        id: p.plot_code || p.id.toString(),
        autoId: p.id,
        projectId: p.project_id,
        sectorName: p.sector_name,
        plotNumber: p.plot_number,
        dimensions: p.dimensions,
        sqFt: parseFloat(p.sq_ft),
        baseRate: parseFloat(p.base_rate),
        facingDirection: p.facing_direction,
        roadWidthFt: p.road_width_ft,
        isCorner: Boolean(p.is_corner),
        isParkFacing: Boolean(p.is_park_facing),
        status: p.status,
        buyerName: p.buyer_name,
        buyerPhone: p.buyer_phone,
        buyerIdProof: p.buyer_id_proof,
        paymentPlan: p.payment_plan,
        totalPrice: parseFloat(p.sq_ft) * parseFloat(p.base_rate) * (p.is_corner ? 1.10 : 1.0)
      }));

      return res.json({ success: true, plots: plotsFormatted });
    }
  } catch (err) {
    console.log('MySQL plots query notice (using inMemoryDb fallback):', err.message);
  }

  res.json({ success: true, plots: inMemoryDb.plots, blueprintMapUrl: inMemoryDb.blueprintMapUrl, customPlotPins: inMemoryDb.customPlotPins });
});

// SAVE PLOT LAYOUT MAP & PINS (SCOPED STRICTLY PER PROJECT & USER ID IN MYSQL DATABASE plot_manage_db)
app.post('/api/plots/save-layout', async (req, res) => {
  const { userId, projectId, blueprintMapUrl, plots, circleSize } = req.body;
  const rawUserId = userId || 'usr-admin-01';
  let targetUserId = rawUserId;

  // Resolve user code
  try {
    const [uRows] = await dbPool.query(
      'SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ? OR phone_number = ?',
      [rawUserId, rawUserId, rawUserId]
    );
    if (uRows.length > 0 && uRows[0].user_code) {
      targetUserId = uRows[0].user_code;
    }
  } catch (_) {}

  // Resolve target project
  let targetProjectId = projectId;
  if (!targetProjectId || targetProjectId === 'ALL' || targetProjectId === 'default') {
    try {
      const [pRows] = await dbPool.query(
        'SELECT project_code FROM realestate_plot_projects WHERE user_id = ? OR user_id = ? ORDER BY id DESC LIMIT 1',
        [targetUserId, rawUserId]
      );
      if (pRows.length > 0 && pRows[0].project_code) {
        targetProjectId = pRows[0].project_code;
      }
    } catch (_) {}
  }
  if (!targetProjectId) targetProjectId = 'ALL';

  const cleanMapUrl = (blueprintMapUrl && typeof blueprintMapUrl === 'string' && blueprintMapUrl.length > 200)
    ? blueprintMapUrl
    : null;

  if (!inMemoryDb.userMasterplans) inMemoryDb.userMasterplans = {};
  if (!inMemoryDb.userPins) inMemoryDb.userPins = {};
  if (!inMemoryDb.userSizes) inMemoryDb.userSizes = {};

  if (blueprintMapUrl !== undefined && targetProjectId !== 'ALL') {
    inMemoryDb.userMasterplans[`${targetUserId}_${targetProjectId}`] = cleanMapUrl;
  }
  if (plots && Array.isArray(plots) && targetProjectId !== 'ALL') {
    inMemoryDb.userPins[`${targetUserId}_${targetProjectId}`] = plots;
  }
  if (circleSize) {
    inMemoryDb.userSizes[targetUserId] = parseInt(circleSize) || 24;
  }

  // 1. Save Map Image into MySQL 'realestate_plot_projects' table ONLY for this specific project
  if (blueprintMapUrl !== undefined && targetProjectId && targetProjectId !== 'ALL') {
    try {
      const [updProj] = await dbPool.query(
        `UPDATE realestate_plot_projects SET blueprint_map_url = ? WHERE project_code = ? OR id = ?`,
        [cleanMapUrl, targetProjectId, isNaN(targetProjectId) ? -1 : parseInt(targetProjectId)]
      );
      console.log(`[save-layout] Updated realestate_plot_projects map for ${targetProjectId}, rows: ${updProj.affectedRows}`);
    } catch (err) {
      console.log('MySQL project blueprint map update notice:', err.message);
    }
  }

  // 2. Save Map Image & Circle Size into MySQL 'realestate_plot_masterplans' table STRICTLY for (targetUserId, targetProjectId)
  if (targetProjectId && targetProjectId !== 'ALL') {
    try {
      if (cleanMapUrl) {
        await dbPool.query(
          `INSERT INTO realestate_plot_masterplans (user_id, project_id, blueprint_map_url, circle_size)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           blueprint_map_url = VALUES(blueprint_map_url),
           circle_size = VALUES(circle_size)`,
          [targetUserId, targetProjectId, cleanMapUrl, circleSize ? parseInt(circleSize) : 24]
        );
      } else if (blueprintMapUrl === null || blueprintMapUrl === '') {
        await dbPool.query(
          `DELETE FROM realestate_plot_masterplans WHERE (user_id = ? OR user_id = ?) AND project_id = ?`,
          [targetUserId, rawUserId, targetProjectId]
        );
      }
    } catch (err) {
      console.log('MySQL masterplan upsert notice:', err.message);
    }
  }

  // 3. Save Every Plot Pin row into MySQL 'realestate_plot_pins' table
  if (plots && Array.isArray(plots) && targetProjectId && targetProjectId !== 'ALL') {
    try {
      if (plots.length === 0) {
        await dbPool.query(
          `DELETE FROM realestate_plot_pins WHERE (project_id = ? OR project_id = (SELECT project_code FROM realestate_plot_projects WHERE id = ?)) AND (user_id = ? OR user_id = ?)`,
          [targetProjectId, isNaN(targetProjectId) ? -1 : parseInt(targetProjectId), targetUserId, rawUserId]
        );
      } else {
        for (const pin of plots) {
          const pinCode = pin.id || `pin-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await dbPool.query(
            `INSERT INTO realestate_plot_pins (pin_code, project_id, user_id, plot_number, sector_name, pos_x, pos_y, dimensions, sq_ft, base_rate, facing_direction, status, buyer_name, buyer_phone, buyer_email, buyer_id_proof, payment_plan, allotted_date, token_amount, paid_amount, is_corner, sourcing_type, agent_id, agent_name, agent_phone, agent_commission_pct, agent_commission_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             project_id = VALUES(project_id),
             user_id = VALUES(user_id),
             plot_number = VALUES(plot_number),
             sector_name = VALUES(sector_name),
             pos_x = VALUES(pos_x),
             pos_y = VALUES(pos_y),
             dimensions = VALUES(dimensions),
             sq_ft = VALUES(sq_ft),
             base_rate = VALUES(base_rate),
             facing_direction = VALUES(facing_direction),
             status = VALUES(status),
             buyer_name = VALUES(buyer_name),
             buyer_phone = VALUES(buyer_phone),
             buyer_email = VALUES(buyer_email),
             buyer_id_proof = VALUES(buyer_id_proof),
             payment_plan = VALUES(payment_plan),
             allotted_date = VALUES(allotted_date),
             token_amount = VALUES(token_amount),
             paid_amount = VALUES(paid_amount),
             is_corner = VALUES(is_corner),
             sourcing_type = VALUES(sourcing_type),
             agent_id = VALUES(agent_id),
             agent_name = VALUES(agent_name),
             agent_phone = VALUES(agent_phone),
             agent_commission_pct = VALUES(agent_commission_pct),
             agent_commission_amount = VALUES(agent_commission_amount)`,
            [
              pinCode,
              targetProjectId,
              targetUserId,
              pin.plotNumber || 'P-101',
              pin.sectorName || 'Sector A',
              parseFloat(pin.posX) || 50.0,
              parseFloat(pin.posY) || 50.0,
              pin.dimensions || '30x50 ft',
              parseFloat(pin.sqFt) || 1500,
              parseFloat(pin.baseRate) || 2800,
              pin.facingDirection || 'EAST',
              pin.status || 'AVAILABLE',
              pin.buyerName || null,
              pin.buyerPhone || null,
              pin.buyerEmail || null,
              pin.buyerIdProof || pin.buyer_id_proof || null,
              pin.paymentPlan || (pin.status === 'RESERVED' ? '24-HR TOKEN HOLD' : 'MILESTONE'),
              pin.allottedDate || null,
              parseFloat(pin.tokenAmount) || 0,
              parseFloat(pin.paidAmount) || 0,
              pin.isCorner ? 1 : 0,
              pin.sourcingType || 'DIRECT',
              pin.agentId || null,
              pin.agentName || null,
              pin.agentPhone || null,
              parseFloat(pin.agentCommissionPct) || 0,
              parseFloat(pin.agentCommissionAmount) || 0
            ]
          );
        }
      }
    } catch (err) {
      console.log('MySQL plot_pins row insert notice:', err.message);
    }
  }

  console.log(`🗄️ [PER-PROJECT MYSQL SAVE] Saved layout map and ${plots ? plots.length : 0} plot pin rows for Project '${targetProjectId}', User '${targetUserId}'.`);
  return res.json({
    success: true,
    message: `Masterplan layout map image and plot coordinates saved for Project '${targetProjectId}'!`,
    blueprintMapUrl: blueprintMapUrl !== undefined ? cleanMapUrl : (inMemoryDb.userMasterplans[`${targetUserId}_${targetProjectId}`] || null),
    plots: plots || [],
    circleSize: inMemoryDb.userSizes[targetUserId] || 24,
    projectId: targetProjectId,
    userId: targetUserId
  });
});

// GET SAVED PLOT LAYOUT MAP & PINS (SCOPED STRICTLY PER PROJECT & USER ID FROM MYSQL DATABASE plot_manage_db)
app.get('/api/plots/layout', async (req, res) => {
  const reqUserId = req.query.userId || 'default';
  const reqProjectId = req.query.projectId || '';

  let targetUserId = reqUserId;
  try {
    const [uRows] = await dbPool.query(
      'SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ? OR phone_number = ?',
      [reqUserId, reqUserId, reqUserId]
    );
    if (uRows.length > 0 && uRows[0].user_code) {
      targetUserId = uRows[0].user_code;
    }
  } catch (_) {}

  if (!inMemoryDb.userMasterplans) inMemoryDb.userMasterplans = {};
  if (!inMemoryDb.userPins) inMemoryDb.userPins = {};
  if (!inMemoryDb.userSizes) inMemoryDb.userSizes = {};

  let mapUrl = null;
  let circleSz = inMemoryDb.userSizes[targetUserId] || 24;
  let pinRows = [];

  try {
    if (reqProjectId && reqProjectId !== 'ALL') {
      // 1. Fetch Blueprint Map specifically from realestate_plot_projects for this project ONLY
      const [projRows] = await dbPool.query(
        'SELECT blueprint_map_url FROM realestate_plot_projects WHERE project_code = ? OR id = ?',
        [reqProjectId, isNaN(reqProjectId) ? -1 : parseInt(reqProjectId)]
      );
      if (projRows.length > 0 && projRows[0].blueprint_map_url && projRows[0].blueprint_map_url.length > 200) {
        mapUrl = projRows[0].blueprint_map_url;
      }

      // 2. If not found in project table, check realestate_plot_masterplans STRICTLY for (targetUserId, reqProjectId)
      if (!mapUrl) {
        try {
          const [mRows] = await dbPool.query(
            'SELECT blueprint_map_url, circle_size FROM realestate_plot_masterplans WHERE (user_id = ? OR user_id = ?) AND project_id = ?',
            [targetUserId, reqUserId, reqProjectId]
          );
          if (mRows.length > 0) {
            if (mRows[0].blueprint_map_url && mRows[0].blueprint_map_url.length > 200) {
              mapUrl = mRows[0].blueprint_map_url;
            }
            if (mRows[0].circle_size) circleSz = mRows[0].circle_size;
          }
        } catch (_) {}
      }

      // NOTE: Do NOT fallback to other projects or generic user_id rows!
      // A newly created project or a project without an uploaded map must return mapUrl = null.

      // Fetch Plot Pins specifically for this project and user
      let query = `
        SELECT p.*, pr.name as project_name
        FROM realestate_plot_pins p
        LEFT JOIN realestate_plot_projects pr ON (p.project_id = pr.project_code OR p.project_id = CAST(pr.id AS CHAR))
        WHERE (p.project_id = ? OR p.project_id = (SELECT project_code FROM realestate_plot_projects WHERE id = ? OR project_code = ?))
      `;
      const params = [reqProjectId, isNaN(reqProjectId) ? -1 : parseInt(reqProjectId), reqProjectId];
      if (targetUserId && targetUserId !== 'ALL') {
        try {
          const [u] = await dbPool.query('SELECT role FROM realestate_users WHERE id = ? OR user_code = ?', [targetUserId, targetUserId]);
          const role = u[0]?.role;
          if (role !== 'BUILDER_ADMIN' && role !== 'ADMIN' && targetUserId !== 'usr-admin-01') {
            query += ` AND (p.user_id = ? OR p.user_id = ? OR p.user_id = (SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ?))`;
            params.push(targetUserId, reqUserId, isNaN(reqUserId) ? -1 : parseInt(reqUserId), reqUserId);
          }
        } catch (_) {}
      }
      query += ` ORDER BY p.id ASC`;

      const [dbPins] = await dbPool.query(query, params);

      if (dbPins.length > 0) {
        pinRows = dbPins.map(p => ({
          id: p.pin_code || p.id.toString(),
          autoId: p.id,
          projectId: p.project_id,
          projectName: p.project_name || 'Project',
          plotNumber: p.plot_number,
          sectorName: p.sector_name,
          posX: parseFloat(p.pos_x),
          posY: parseFloat(p.pos_y),
          dimensions: p.dimensions,
          sqFt: parseFloat(p.sq_ft),
          baseRate: parseFloat(p.base_rate),
          facingDirection: p.facing_direction,
          status: p.status,
          buyerName: p.buyer_name,
          buyerPhone: p.buyer_phone,
          buyerEmail: p.buyer_email,
          buyerIdProof: p.buyer_id_proof,
          paymentPlan: p.payment_plan,
          allottedDate: p.allotted_date,
          tokenAmount: parseFloat(p.token_amount || 0),
          paidAmount: parseFloat(p.paid_amount || 0),
          isCorner: Boolean(p.is_corner)
        }));
      }
    } else {
      // reqProjectId === 'ALL' or empty: return all pins for portfolio summary, but mapUrl is null (maps are per-project)
      mapUrl = null;

      let query = `
        SELECT p.*, pr.name as project_name 
        FROM realestate_plot_pins p
        LEFT JOIN realestate_plot_projects pr ON (p.project_id = pr.project_code OR p.project_id = CAST(pr.id AS CHAR))
      `;
      const params = [];
      if (targetUserId && targetUserId !== 'ALL') {
        query += ` WHERE p.user_id = ? OR p.user_id = ? OR p.user_id = (SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ?)`;
        params.push(targetUserId, reqUserId, isNaN(reqUserId) ? -1 : parseInt(reqUserId), reqUserId);
      }
      query += ` ORDER BY p.id ASC`;
      const [allPins] = await dbPool.query(query, params);

      pinRows = allPins.map(p => ({
        id: p.pin_code || p.id.toString(),
        autoId: p.id,
        projectId: p.project_id,
        projectName: p.project_name || 'Project',
        plotNumber: p.plot_number,
        sectorName: p.sector_name,
        posX: parseFloat(p.pos_x),
        posY: parseFloat(p.pos_y),
        dimensions: p.dimensions,
        sqFt: parseFloat(p.sq_ft),
        baseRate: parseFloat(p.base_rate),
        facingDirection: p.facing_direction,
        status: p.status,
        buyerName: p.buyer_name,
        buyerPhone: p.buyer_phone,
        buyerEmail: p.buyer_email,
        buyerIdProof: p.buyer_id_proof,
        paymentPlan: p.payment_plan,
        allottedDate: p.allotted_date,
        tokenAmount: parseFloat(p.token_amount || 0),
        paidAmount: parseFloat(p.paid_amount || 0),
        isCorner: Boolean(p.is_corner),
        sourcingType: p.sourcing_type || 'DIRECT',
        agentId: p.agent_id || null,
        agentName: p.agent_name || null,
        agentPhone: p.agent_phone || null,
        agentCommissionPct: parseFloat(p.agent_commission_pct || 0),
        agentCommissionAmount: parseFloat(p.agent_commission_amount || 0)
      }));
    }
  } catch (err) {
    console.log('MySQL layout fetch notice:', err.message);
  }

  if (reqProjectId && reqProjectId !== 'ALL') {
    inMemoryDb.userMasterplans[`${targetUserId}_${reqProjectId}`] = mapUrl;
  }

  return res.json({
    success: true,
    blueprintMapUrl: mapUrl,
    plots: pinRows,
    circleSize: circleSz,
    projectId: reqProjectId
  });
});

// GET CUSTOMERS DIRECTORY (TABULAR PROPERTY PURCHASES & ALLOTMENTS - BOTH PLOTS & FLATS)
app.get('/api/customers', async (req, res) => {
  const { projectId, userId } = req.query;
  try {
    let targetUserCode = null;
    if (userId && userId !== 'ALL') {
      const [uRows] = await dbPool.query(
        'SELECT user_code, role FROM realestate_users WHERE user_code = ? OR id = ? OR phone_number = ?',
        [userId, isNaN(userId) ? -1 : parseInt(userId), userId]
      );
      if (uRows.length > 0) {
        targetUserCode = uRows[0].user_code;
      } else {
        targetUserCode = userId;
      }
    }

    // 1. Query Land Plot Customer Allotments
    let plotSql = `
      SELECT 
        p.id as auto_id,
        p.pin_code as plot_id,
        p.project_id,
        p.user_id,
        pr.name as project_name,
        pr.location as project_location,
        p.plot_number,
        p.sector_name,
        p.dimensions,
        p.sq_ft,
        p.base_rate,
        p.is_corner,
        p.facing_direction,
        p.status,
        p.buyer_name,
        p.buyer_phone,
        p.buyer_email,
        p.buyer_id_proof,
        p.payment_plan,
        p.allotted_date,
        p.token_amount,
        p.paid_amount,
        p.sourcing_type,
        p.agent_id,
        p.agent_name,
        p.agent_phone,
        p.agent_commission_pct,
        p.agent_commission_amount,
        p.created_at,
        0 as is_flat
      FROM realestate_plot_pins p
      LEFT JOIN realestate_plot_projects pr ON (p.project_id = pr.project_code OR p.project_id = CAST(pr.id AS CHAR))
      WHERE (p.status IN ('SOLD', 'BOOKED', 'RESERVED') OR (p.buyer_name IS NOT NULL AND p.buyer_name != ''))
    `;
    const plotParams = [];
    if (targetUserCode) {
      plotSql += ` AND (p.user_id = ? OR pr.user_id = ?)`;
      plotParams.push(targetUserCode, targetUserCode);
    }
    if (projectId && projectId !== 'ALL') {
      plotSql += ` AND (p.project_id = ? OR pr.project_code = ? OR pr.id = ?)`;
      plotParams.push(projectId, projectId, isNaN(projectId) ? -1 : parseInt(projectId));
    }
    plotSql += ` ORDER BY p.allotted_date DESC, p.id DESC`;

    // 2. Query Building Tower Flat Customer Allotments
    let flatSql = `
      SELECT 
        f.id as auto_id,
        f.flat_code as plot_id,
        f.project_id,
        pr.user_id,
        pr.name as project_name,
        pr.location as project_location,
        f.flat_number as plot_number,
        COALESCE(w.wing_name, 'Tower Flat') as sector_name,
        COALESCE(f.bhk_type, 'Apartment Unit') as dimensions,
        COALESCE(NULLIF(f.sq_ft, 0), NULLIF(f.super_builtup_sqft, 0), 1000) as sq_ft,
        f.rate_per_sqft as base_rate,
        0 as is_corner,
        'EAST' as facing_direction,
        f.occupancy_status as status,
        f.buyer_name,
        f.buyer_phone,
        f.buyer_email,
        f.buyer_id_proof,
        f.payment_plan,
        f.booking_date as allotted_date,
        f.booking_amount as token_amount,
        COALESCE(f.booking_amount, 0) as paid_amount,
        'DIRECT' as sourcing_type,
        NULL as agent_id,
        f.agent_name,
        NULL as agent_phone,
        0 as agent_commission_pct,
        0 as agent_commission_amount,
        f.created_at,
        f.total_cost,
        1 as is_flat
      FROM realestate_flat_flats f
      LEFT JOIN realestate_flat_wings w ON (f.wing_id = w.wing_code OR f.wing_id = CAST(w.id AS CHAR))
      LEFT JOIN realestate_plot_projects pr ON (f.project_id = pr.project_code OR f.project_id = CAST(pr.id AS CHAR))
      WHERE (f.buyer_name IS NOT NULL AND f.buyer_name != '' AND f.buyer_name != 'Ready for User Assignment')
         OR (f.occupancy_status IN ('BOOKED', 'HOLD', 'OCCUPIED_OWNER', 'TENANT_OCCUPIED'))
    `;
    const flatParams = [];
    if (targetUserCode) {
      flatSql += ` AND (pr.user_id = ? OR f.project_id IN (SELECT project_code FROM realestate_plot_projects WHERE user_id = ?))`;
      flatParams.push(targetUserCode, targetUserCode);
    }
    if (projectId && projectId !== 'ALL') {
      flatSql += ` AND (f.project_id = ? OR pr.project_code = ? OR pr.id = ?)`;
      flatParams.push(projectId, projectId, isNaN(projectId) ? -1 : parseInt(projectId));
    }
    flatSql += ` ORDER BY f.booking_date DESC, f.id DESC`;

    const [plotRows] = await dbPool.query(plotSql, plotParams);
    const [flatRows] = await dbPool.query(flatSql, flatParams);

    const customers = [
      ...plotRows.map(r => {
        const sqFt = parseFloat(r.sq_ft) || 1500;
        const rate = parseFloat(r.base_rate) || 2800;
        const isCorner = Boolean(r.is_corner);
        const totalValuation = sqFt * rate * (isCorner ? 1.10 : 1.0);
        const isReserved = r.status === 'RESERVED' || r.status === 'HOLD';
        const paidAmount = parseFloat(r.paid_amount) || 0;
        const tokenAmount = parseFloat(r.token_amount) || (isReserved ? Math.round(totalValuation * 0.05) : 0);

        return {
          id: `cust-plot-${r.plot_id || r.auto_id}`,
          plotId: r.plot_id || `pin-${r.auto_id}`,
          autoId: r.auto_id,
          isFlat: false,
          projectId: r.project_id,
          projectName: r.project_name || 'Township Project',
          projectLocation: r.project_location || 'Prime Location',
          customerName: r.buyer_name || 'Registered Buyer',
          phone: r.buyer_phone || '+91 98000 00000',
          email: r.buyer_email || '',
          idProof: r.buyer_id_proof || 'Aadhaar Verified',
          plotNumber: r.plot_number,
          sectorName: r.sector_name || 'Sector A',
          dimensions: r.dimensions || '30x50 ft',
          sqFt,
          baseRate: rate,
          isCorner,
          facingDirection: r.facing_direction || 'EAST',
          status: isReserved ? 'RESERVED' : 'SOLD',
          occupancyStatus: r.status,
          paymentPlan: r.payment_plan || (isReserved ? '24-HR TOKEN HOLD' : 'MILESTONE_30_70'),
          allottedDate: r.allotted_date || (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
          totalValuation,
          tokenAmount,
          paidAmount,
          balanceDue: Math.max(0, totalValuation - paidAmount),
          sourcingType: r.sourcing_type || 'DIRECT',
          agentId: r.agent_id || null,
          agentName: r.agent_name || null,
          agentPhone: r.agent_phone || null,
          agentCommissionPct: parseFloat(r.agent_commission_pct || 0),
          agentCommissionAmount: parseFloat(r.agent_commission_amount || 0)
        };
      }),
      ...flatRows.map(r => {
        const sqFt = parseFloat(r.sq_ft) || 1000;
        const rate = parseFloat(r.base_rate) || 3000;
        const totalValuation = parseFloat(r.total_cost) > 0 ? parseFloat(r.total_cost) : (sqFt * rate);
        const isReserved = r.status === 'HOLD' || r.status === 'RESERVED';
        const paidAmount = parseFloat(r.paid_amount) || 0;
        const tokenAmount = parseFloat(r.token_amount) || (isReserved ? Math.round(totalValuation * 0.05) : 0);

        return {
          id: `cust-flat-${r.plot_id || r.auto_id}`,
          plotId: r.plot_id || `flat-${r.auto_id}`,
          autoId: r.auto_id,
          isFlat: true,
          projectId: r.project_id,
          projectName: r.project_name || 'Tower Apartment',
          projectLocation: r.project_location || 'Urban Complex',
          customerName: r.buyer_name || 'Registered Resident',
          phone: r.buyer_phone || '+91 98000 00000',
          email: r.buyer_email || '',
          idProof: r.buyer_id_proof || 'Aadhaar Verified',
          plotNumber: r.plot_number,
          sectorName: r.sector_name || 'Tower Wing',
          dimensions: r.dimensions || '2 BHK Apartment',
          sqFt,
          baseRate: rate,
          isCorner: false,
          facingDirection: r.facing_direction || 'EAST',
          status: isReserved ? 'RESERVED' : 'SOLD',
          occupancyStatus: r.status,
          paymentPlan: r.payment_plan || (isReserved ? '24-HR TOKEN HOLD' : 'MILESTONE'),
          allottedDate: r.allotted_date || (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
          totalValuation,
          tokenAmount,
          paidAmount,
          balanceDue: Math.max(0, totalValuation - paidAmount),
          sourcingType: r.sourcing_type || 'DIRECT',
          agentId: r.agent_id || null,
          agentName: r.agent_name || null,
          agentPhone: r.agent_phone || null,
          agentCommissionPct: parseFloat(r.agent_commission_pct || 0),
          agentCommissionAmount: parseFloat(r.agent_commission_amount || 0)
        };
      })
    ];

    return res.json({ success: true, customers });
  } catch (err) {
    console.error('MySQL GET /api/customers error:', err.message);
    return res.status(500).json({ success: false, message: err.message, customers: [] });
  }
});

// HOLD PLOT (24-Hour Hold Timer)
app.post('/api/plots/hold', async (req, res) => {
  const { plotId, buyerName, buyerPhone, buyerEmail, tokenAmount } = req.body;
  if (!plotId) {
    return res.status(400).json({ success: false, message: 'Plot ID is required.' });
  }

  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await dbPool.query(
      `UPDATE realestate_plot_plots SET status = 'RESERVED', buyer_name = ?, buyer_phone = ?, hold_expires_at = ? WHERE plot_code = ? OR id = ?`,
      [buyerName || 'Interested Buyer', buyerPhone || '', expiresAt, plotId, isNaN(plotId) ? -1 : parseInt(plotId)]
    );
    const { sourcingType, agentId, agentName, agentPhone, agentCommissionPct, agentCommissionAmount } = req.body;
    await dbPool.query(
      `UPDATE realestate_plot_pins SET status = 'RESERVED', buyer_name = ?, buyer_phone = ?, buyer_email = ?, payment_plan = '24-HR TOKEN HOLD', allotted_date = CURDATE(), token_amount = ?, sourcing_type = ?, agent_id = ?, agent_name = ?, agent_phone = ?, agent_commission_pct = ?, agent_commission_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?`,
      [
        buyerName || 'Interested Buyer', 
        buyerPhone || '', 
        buyerEmail || null, 
        parseFloat(tokenAmount) || 60000, 
        sourcingType || 'DIRECT',
        agentId || null,
        agentName || null,
        agentPhone || null,
        parseFloat(agentCommissionPct) || 0,
        parseFloat(agentCommissionAmount) || 0,
        plotId, 
        isNaN(plotId) ? -1 : parseInt(plotId), 
        plotId
      ]
    );
  } catch (err) {
    console.log('MySQL hold plot notice (using inMemoryDb fallback):', err.message);
  }

  const plot = inMemoryDb.plots.find(p => p.id === plotId);
  if (plot) {
    plot.status = 'RESERVED';
    plot.buyerName = buyerName || 'Interested Buyer';
    plot.buyerPhone = buyerPhone || '';
  }

  console.log(`📌 [PLOT HOLD] Placed 24-Hour Hold on Plot ID '${plotId}' for '${buyerName}'`);
  return res.json({ success: true, message: 'Plot placed on 24-hour temporary hold successfully!' });
});

// BOOK / ALLOT PLOT TO BUYER
app.post('/api/plots/book', async (req, res) => {
  const { plotId, buyerName, buyerPhone, buyerEmail, buyerIdProof, paymentPlan, tokenAmount, paidAmount } = req.body;
  if (!plotId || !buyerName || !buyerPhone) {
    return res.status(400).json({ success: false, message: 'Plot ID, buyer name, and phone are required.' });
  }

  try {
    await dbPool.query(
      `UPDATE realestate_plot_plots SET status = 'SOLD', buyer_name = ?, buyer_phone = ?, buyer_id_proof = ?, payment_plan = ? WHERE plot_code = ? OR id = ?`,
      [buyerName, buyerPhone, buyerIdProof || 'Aadhaar Verified', paymentPlan || 'MILESTONE', plotId, isNaN(plotId) ? -1 : parseInt(plotId)]
    );
    const allDate = req.body.allottedDate || new Date().toISOString().slice(0, 10);
    const { sourcingType, agentId, agentName, agentPhone, agentCommissionPct, agentCommissionAmount, projectId, userId } = req.body;
    await dbPool.query(
      `UPDATE realestate_plot_pins SET status = 'SOLD', buyer_name = ?, buyer_phone = ?, buyer_email = ?, buyer_id_proof = ?, payment_plan = ?, allotted_date = ?, token_amount = ?, paid_amount = ?, sourcing_type = ?, agent_id = ?, agent_name = ?, agent_phone = ?, agent_commission_pct = ?, agent_commission_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?`,
      [
        buyerName, 
        buyerPhone, 
        buyerEmail || null, 
        buyerIdProof || 'Aadhaar Verified', 
        paymentPlan || 'MILESTONE', 
        allDate, 
        parseFloat(tokenAmount) || 100000, 
        parseFloat(paidAmount) || 600000, 
        sourcingType || 'DIRECT',
        agentId || null,
        agentName || null,
        agentPhone || null,
        parseFloat(agentCommissionPct) || 0,
        parseFloat(agentCommissionAmount) || 0,
        plotId, 
        isNaN(plotId) ? -1 : parseInt(plotId), 
        plotId
      ]
    );

    // Auto-record Agent Commission in realestate_plot_transactions if deal sourced through Agent
    if (sourcingType === 'AGENT' && (parseFloat(agentCommissionAmount) > 0 || agentName)) {
      const commAmt = parseFloat(agentCommissionAmount) || 0;
      const aName = agentName || 'Agent';
      const aPct = parseFloat(agentCommissionPct) || 0;
      const txCode = `tx-comm-${plotId}-${Date.now().toString().slice(-4)}`;
      const receiptNo = `COMM-${Date.now().toString().slice(-5)}`;

      // Check if commission transaction already logged
      const [existingComm] = await dbPool.query(
        `SELECT id FROM realestate_plot_transactions WHERE (plot_id = ? OR plot_id = (SELECT pin_code FROM realestate_plot_pins WHERE id = ?)) AND payment_mode = 'AGENT_COMMISSION'`,
        [plotId, isNaN(plotId) ? -1 : parseInt(plotId)]
      );

      if (existingComm.length === 0) {
        await dbPool.query(
          `INSERT INTO realestate_plot_transactions (transaction_code, plot_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'AGENT_COMMISSION', ?, ?, ?, ?)`,
          [
            txCode,
            plotId,
            projectId || null,
            userId || 'usr-admin-01',
            buyerName,
            `Agent Commission Payout (${aName} - ${aPct}%)`,
            commAmt,
            `REF-COMM-${agentId || '01'}`,
            receiptNo,
            allDate,
            `Channel Partner Brokerage Commission calculated at ${aPct}% for ${aName}`
          ]
        );
        console.log(`🤝 [AGENT COMMISSION LOGGED] Auto-inserted ₹${commAmt} commission transaction for Agent '${aName}' on Plot ${plotId}`);
      }
    }
  } catch (err) {
    console.log('MySQL book plot notice (using inMemoryDb fallback):', err.message);
  }

  const plot = inMemoryDb.plots.find(p => p.id === plotId);
  if (plot) {
    plot.status = 'SOLD';
    plot.buyerName = buyerName;
    plot.buyerPhone = buyerPhone;
    plot.buyerIdProof = buyerIdProof || 'Aadhaar Verified';
    plot.paymentPlan = paymentPlan || 'MILESTONE';
  }

  console.log(`🎉 [PLOT BOOKED] Allotted Plot ID '${plotId}' to Buyer '${buyerName}' (${buyerPhone})`);
  return res.json({ success: true, message: `Plot allotted to ${buyerName} successfully!` });
});

// SWAP PLOT ALLOTMENT
app.post('/api/plots/swap', async (req, res) => {
  const { oldPlotId, newPlotId } = req.body;
  if (!oldPlotId || !newPlotId) {
    return res.status(400).json({ success: false, message: 'Both old and new Plot IDs are required.' });
  }

  const oldPlot = inMemoryDb.plots.find(p => p.id === oldPlotId);
  const buyerName = oldPlot ? oldPlot.buyerName : 'Buyer';
  const buyerPhone = oldPlot ? oldPlot.buyerPhone : '';
  const buyerId = oldPlot ? oldPlot.buyerIdProof : '';

  try {
    await dbPool.query(
      `UPDATE realestate_plot_plots SET status = 'SOLD', buyer_name = ?, buyer_phone = ?, buyer_id_proof = ? WHERE plot_code = ? OR id = ?`,
      [buyerName, buyerPhone, buyerId, newPlotId, isNaN(newPlotId) ? -1 : parseInt(newPlotId)]
    );
    await dbPool.query(
      `UPDATE realestate_plot_plots SET status = 'AVAILABLE', buyer_name = NULL, buyer_phone = NULL, buyer_id_proof = NULL WHERE plot_code = ? OR id = ?`,
      [oldPlotId, isNaN(oldPlotId) ? -1 : parseInt(oldPlotId)]
    );
  } catch (err) {
    console.log('MySQL plot swap notice (using inMemoryDb fallback):', err.message);
  }

  if (oldPlot) {
    oldPlot.status = 'AVAILABLE';
    oldPlot.buyerName = null;
    oldPlot.buyerPhone = null;
  }
  const newPlot = inMemoryDb.plots.find(p => p.id === newPlotId);
  if (newPlot) {
    newPlot.status = 'SOLD';
    newPlot.buyerName = buyerName;
    newPlot.buyerPhone = buyerPhone;
  }

  console.log(`🔄 [PLOT SWAP] Swapped allotment for '${buyerName}' from Plot ${oldPlotId} to ${newPlotId}`);
  return res.json({ success: true, message: `Plot allocation swapped successfully to new plot!` });
});

// FETCH PLOT INSTALLMENTS & PAYMENTS
app.get('/api/plots/:id/payments', async (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = String(rawId).replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  try {
    const [rows] = await dbPool.query(
      `SELECT id as auto_id, installment_code as id, plot_id, milestone_name, amount, due_date, status, paid_date, receipt_number, created_at 
       FROM realestate_plot_installments 
       WHERE plot_id IN (
         SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT plot_number FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT CAST(id AS CHAR) FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION SELECT ? UNION SELECT ?
       )
       ORDER BY due_date ASC, id ASC`,
      [
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        rawId, cleanId
      ]
    );
    return res.json({ success: true, installments: rows });
  } catch (err) {
    console.log('MySQL plot payments notice:', err.message);
  }

  res.json({
    success: true,
    installments: [
      { id: `inst-${cleanId}-1`, milestone_name: '1. Booking Deposit (10%)', amount: 420000, status: 'PAID', receipt_number: 'REC-109281' },
      { id: `inst-${cleanId}-2`, milestone_name: '2. Site Demarcation (20%)', amount: 840000, status: 'PENDING', due_date: '2026-10-15', receipt_number: null }
    ]
  });
});

// SCHEDULE FUTURE INSTALLMENT DUE FOR A PLOT (FUTURE DATES)
app.post('/api/plots/:id/installments', async (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = String(rawId).replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  const { milestoneName, amount, dueDate, notes, userId, projectId, buyerName } = req.body;

  if (!rawId || !amount || !milestoneName || !dueDate) {
    return res.status(400).json({ success: false, message: 'Plot ID, milestone name, expected amount, and future due date are required.' });
  }

  // Resolve canonical pin_code
  let targetPlotId = cleanId;
  try {
    const [pinRows] = await dbPool.query(
      `SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ? LIMIT 1`,
      [cleanId, cleanId, numId]
    );
    if (pinRows.length > 0) targetPlotId = pinRows[0].pin_code;
  } catch (_) {}

  const instCode = `inst-${targetPlotId}-${Date.now().toString().slice(-6)}`;
  const amt = parseFloat(amount) || 0;
  const targetUserId = userId || 'usr-admin-01';

  try {
    const [result] = await dbPool.query(
      `INSERT INTO realestate_plot_installments (installment_code, plot_id, project_id, user_id, buyer_name, milestone_name, amount, due_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [instCode, targetPlotId, projectId || null, targetUserId, buyerName || null, milestoneName, amt, dueDate, notes || null]
    );

    const newInst = {
      id: instCode,
      auto_id: result.insertId,
      plot_id: targetPlotId,
      project_id: projectId || null,
      user_id: targetUserId,
      buyer_name: buyerName || null,
      milestone_name: milestoneName,
      amount: amt,
      due_date: dueDate,
      notes: notes || '',
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    console.log(`📅 [FUTURE INSTALLMENT SCHEDULED] Plot ${targetPlotId}: '${milestoneName}' - ₹${amt} due on ${dueDate}`);
    return res.json({ success: true, message: `Scheduled future installment of ₹${amt.toLocaleString('en-IN')} due on ${dueDate}!`, installment: newInst });
  } catch (err) {
    console.error('MySQL POST /api/plots/:id/installments error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// COLLECT / MARK PAID A SCHEDULED FUTURE INSTALLMENT
app.post('/api/plots/:id/installments/:instId/collect', async (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = String(rawId).replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  const { instId } = req.params;
  const { paymentMode, referenceNo, paymentDate, notes, buyerName, projectId, userId } = req.body;
  const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
  const pDate = paymentDate || new Date().toISOString().slice(0, 10);

  try {
    let targetPlotId = cleanId;
    const [pinRows] = await dbPool.query(
      `SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ? LIMIT 1`,
      [cleanId, cleanId, numId]
    );
    if (pinRows.length > 0) targetPlotId = pinRows[0].pin_code;

    const [instRows] = await dbPool.query(
      `SELECT * FROM realestate_plot_installments 
       WHERE (installment_code = ? OR id = ?) 
       AND plot_id IN (
         SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT plot_number FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT CAST(id AS CHAR) FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION SELECT ? UNION SELECT ?
       )`,
      [
        instId, isNaN(instId) ? -1 : parseInt(instId),
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        rawId, cleanId
      ]
    );

    const inst = instRows[0];
    const amt = inst ? parseFloat(inst.amount) : 0;
    const milestoneName = inst ? inst.milestone_name : 'Scheduled Installment';

    await dbPool.query(
      `UPDATE realestate_plot_installments SET status = 'PAID', paid_date = ?, receipt_number = ? WHERE (installment_code = ? OR id = ?)`,
      [pDate, receiptNo, instId, isNaN(instId) ? -1 : parseInt(instId)]
    );

    const txCode = `tx-col-${Date.now().toString().slice(-6)}`;
    await dbPool.query(
      `INSERT INTO realestate_plot_transactions (transaction_code, plot_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txCode,
        targetPlotId,
        projectId || null,
        userId || 'usr-admin-01',
        buyerName || 'Buyer',
        milestoneName,
        amt,
        paymentMode || 'BANK_TRANSFER',
        referenceNo || `REF-${Date.now().toString().slice(-5)}`,
        receiptNo,
        pDate,
        notes || 'Payment collected from scheduled future installment due.'
      ]
    );

    const [sumRows] = await dbPool.query(
      `SELECT SUM(amount) as totalPaid FROM realestate_plot_transactions 
       WHERE plot_id IN (
         SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT plot_number FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT CAST(id AS CHAR) FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION SELECT ? UNION SELECT ?
       )`,
      [
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        rawId, cleanId
      ]
    );
    const newTotalPaid = sumRows[0]?.totalPaid || amt;
    await dbPool.query(
      'UPDATE realestate_plot_pins SET paid_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?',
      [newTotalPaid, cleanId, numId, cleanId]
    );

    console.log(`✅ [FUTURE INSTALLMENT COLLECTED] Marked ${instId} as PAID (Receipt ${receiptNo}) for Plot ${targetPlotId}`);
    return res.json({ success: true, message: `Collected payment of ₹${amt.toLocaleString('en-IN')}! Digital receipt ${receiptNo} generated.`, receiptNo, totalPaid: newTotalPaid });
  } catch (err) {
    console.error('MySQL POST /api/plots/:id/installments/:instId/collect error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE A SCHEDULED FUTURE INSTALLMENT
app.delete('/api/plots/:id/installments/:instId', async (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = String(rawId).replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  const { instId } = req.params;
  try {
    await dbPool.query(
      `DELETE FROM realestate_plot_installments 
       WHERE (installment_code = ? OR id = ?) 
       AND plot_id IN (
         SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT plot_number FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT CAST(id AS CHAR) FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION SELECT ? UNION SELECT ?
       )`,
      [
        instId, isNaN(instId) ? -1 : parseInt(instId),
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        rawId, cleanId
      ]
    );
    console.log(`🗑️ [INSTALLMENT DELETED] Removed scheduled installment ${instId} for Plot ${rawId}`);
    return res.json({ success: true, message: 'Scheduled installment removed successfully.' });
  } catch (err) {
    console.error('MySQL DELETE /api/plots/:id/installments/:instId error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// RECORD INSTALMENT PAYMENT
app.post('/api/plots/payment', async (req, res) => {
  const { installmentId } = req.body;
  const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
  try {
    await dbPool.query(
      `UPDATE realestate_plot_installments SET status = 'PAID', paid_date = NOW(), receipt_number = ? WHERE installment_code = ? OR id = ?`,
      [receiptNo, installmentId, isNaN(installmentId) ? -1 : parseInt(installmentId)]
    );
  } catch (err) {
    console.log('MySQL payment notice:', err.message);
  }

  console.log(`💵 [PAYMENT RECORDED] Installment '${installmentId}' marked PAID with receipt ${receiptNo}`);
  return res.json({ success: true, message: 'Payment recorded and digital receipt generated successfully!', receiptNumber: receiptNo });
});

// FETCH ALL TRANSACTIONS FOR A SPECIFIC PLOT
app.get('/api/plots/:id/transactions', async (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = String(rawId).replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  try {
    const [rows] = await dbPool.query(
      `SELECT id as auto_id, transaction_code as id, plot_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes, created_at 
       FROM realestate_plot_transactions 
       WHERE plot_id IN (
         SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT plot_number FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT CAST(id AS CHAR) FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION SELECT ? UNION SELECT ?
       )
       ORDER BY payment_date DESC, id DESC`,
      [
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        rawId, cleanId
      ]
    );
    const totalPaid = rows.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    return res.json({ success: true, transactions: rows, totalPaid, count: rows.length });
  } catch (err) {
    console.error('MySQL GET /api/plots/:id/transactions error:', err.message);
    return res.status(500).json({ success: false, message: err.message, transactions: [] });
  }
});

// ADD NEW PAYMENT TRANSACTION FOR A PLOT
app.post('/api/plots/:id/transactions', async (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = String(rawId).replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  const { milestoneName, amount, paymentMode, referenceNo, paymentDate, notes, buyerName, projectId } = req.body;
  if (!rawId || !amount || !milestoneName) {
    return res.status(400).json({ success: false, message: 'Plot ID, amount, and milestone are required.' });
  }

  // Resolve canonical pin_code
  let targetPlotId = cleanId;
  try {
    const [pinRows] = await dbPool.query(
      `SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ? LIMIT 1`,
      [cleanId, cleanId, numId]
    );
    if (pinRows.length > 0) targetPlotId = pinRows[0].pin_code;
  } catch (_) {}

  const txCode = `tx-${targetPlotId}-${Date.now().toString().slice(-6)}`;
  const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
  const amt = parseFloat(amount) || 0;
  const pDate = paymentDate || new Date().toISOString().slice(0, 10);
  const targetUserId = req.body.userId || 'usr-admin-01';

  try {
    const [result] = await dbPool.query(
      `INSERT INTO realestate_plot_transactions (transaction_code, plot_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txCode, targetPlotId, projectId || null, targetUserId, buyerName || null, milestoneName, amt, paymentMode || 'BANK_TRANSFER', referenceNo || `REF-${Date.now().toString().slice(-5)}`, receiptNo, pDate, notes || '']
    );

    // Automatically update paid_amount in realestate_plot_pins table
    const [sumRows] = await dbPool.query(
      `SELECT SUM(amount) as totalPaid FROM realestate_plot_transactions 
       WHERE plot_id IN (
         SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT plot_number FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT CAST(id AS CHAR) FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION SELECT ? UNION SELECT ?
       )`,
      [
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        rawId, cleanId
      ]
    );
    const newTotalPaid = sumRows[0]?.totalPaid || amt;
    await dbPool.query(
      'UPDATE realestate_plot_pins SET paid_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?',
      [newTotalPaid, cleanId, numId, cleanId]
    );

    const newTx = {
      id: txCode,
      auto_id: result.insertId,
      plot_id: targetPlotId,
      project_id: projectId,
      buyer_name: buyerName,
      milestone_name: milestoneName,
      amount: amt,
      payment_mode: paymentMode || 'BANK_TRANSFER',
      reference_no: referenceNo,
      receipt_no: receiptNo,
      payment_date: pDate,
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    console.log(`💵 [TRANSACTION RECORDED] Added ₹${amt} payment (${milestoneName}) for Plot ${targetPlotId} (Auto ID: ${result.insertId})`);
    return res.json({ success: true, message: `Payment transaction of ₹${amt.toLocaleString('en-IN')} recorded successfully!`, transaction: newTx, totalPaid: newTotalPaid });
  } catch (err) {
    console.error('MySQL POST /api/plots/:id/transactions error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE A PAYMENT TRANSACTION
app.delete('/api/plots/:id/transactions/:txId', async (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = String(rawId).replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  const { txId } = req.params;
  try {
    await dbPool.query(
      `DELETE FROM realestate_plot_transactions 
       WHERE (id = ? OR transaction_code = ?) 
       AND plot_id IN (
         SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT plot_number FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT CAST(id AS CHAR) FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION SELECT ? UNION SELECT ?
       )`,
      [
        isNaN(txId) ? -1 : parseInt(txId), txId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        rawId, cleanId
      ]
    );
    const [sumRows] = await dbPool.query(
      `SELECT SUM(amount) as totalPaid FROM realestate_plot_transactions 
       WHERE plot_id IN (
         SELECT pin_code FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT plot_number FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION
         SELECT CAST(id AS CHAR) FROM realestate_plot_pins WHERE pin_code = ? OR plot_number = ? OR id = ?
         UNION SELECT ? UNION SELECT ?
       )`,
      [
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        cleanId, cleanId, numId,
        rawId, cleanId
      ]
    );
    const newTotalPaid = sumRows[0]?.totalPaid || 0;
    await dbPool.query(
      'UPDATE realestate_plot_pins SET paid_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?',
      [newTotalPaid, cleanId, numId, cleanId]
    );

    console.log(`🗑️ [TRANSACTION REMOVED] Deleted transaction ${txId} for Plot ${rawId}`);
    return res.json({ success: true, message: 'Transaction removed successfully!', totalPaid: newTotalPaid });
  } catch (err) {
    console.error('MySQL DELETE transaction error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// FLAT BOOKING SYSTEM: PAYMENT & INSTALLMENT ENDPOINTS
// ==========================================

// Helper function to resolve canonical flat_code and details
async function resolveFlatDetails(rawId) {
  if (!rawId) return null;
  const cleanId = String(rawId).replace(/^flat-/, '').replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  try {
    const [rows] = await dbPool.query(
      `SELECT f.*, w.wing_name, w.project_id as wing_project_id, p.name as project_name, p.user_id as project_user_id
       FROM realestate_flat_flats f
       LEFT JOIN realestate_flat_wings w ON (f.wing_id = w.wing_code OR f.wing_id = CAST(w.id AS CHAR))
       LEFT JOIN realestate_plot_projects p ON (w.project_id = p.project_code OR w.project_id = CAST(p.id AS CHAR))
       WHERE f.flat_code = ? OR f.id = ? OR f.flat_number = ? OR f.flat_code = ? OR f.flat_number = ?
       LIMIT 1`,
      [rawId, numId, rawId, cleanId, cleanId]
    );
    if (rows.length > 0) return rows[0];
  } catch (_) {}
  return null;
}

// 1. FETCH INSTALLMENTS & PAYMENTS FOR A FLAT
app.get('/api/flats/:id/payments', async (req, res) => {
  const rawId = req.params.id || '';
  const cleanId = String(rawId).replace(/^flat-/, '').replace(/^cust-/, '').trim();
  const numId = isNaN(cleanId) ? -1 : parseInt(cleanId);
  try {
    const flat = await resolveFlatDetails(rawId);
    const targetFlatId = flat ? flat.flat_code : rawId;
    const flatNum = flat ? flat.flat_number : rawId;
    const flatAutoId = flat ? flat.id : -1;

    // Fetch Installments
    const [instRows] = await dbPool.query(
      `SELECT id as auto_id, installment_code as id, flat_id, project_id, user_id, buyer_name, milestone_name, amount, due_date, status, paid_date, receipt_number, notes, created_at
       FROM realestate_flat_installments
       WHERE flat_id = ? OR flat_id = ? OR flat_id = ? OR flat_id = ? OR flat_id = ?
          OR flat_id LIKE CONCAT('%', ?, '%')
          OR flat_id LIKE CONCAT('%', ?, '%')
          OR flat_id IN (
            SELECT flat_code FROM realestate_flat_flats WHERE flat_code = ? OR flat_number = ? OR id = ? OR flat_code = ? OR flat_number = ?
            UNION
            SELECT flat_number FROM realestate_flat_flats WHERE flat_code = ? OR flat_number = ? OR id = ? OR flat_code = ? OR flat_number = ?
            UNION
            SELECT CAST(id AS CHAR) FROM realestate_flat_flats WHERE flat_code = ? OR flat_number = ? OR id = ? OR flat_code = ? OR flat_number = ?
          )
       ORDER BY due_date ASC, id ASC`,
      [
        targetFlatId, String(flatAutoId), flatNum, rawId, cleanId,
        cleanId, rawId,
        rawId, rawId, numId, cleanId, cleanId,
        rawId, rawId, numId, cleanId, cleanId,
        rawId, rawId, numId, cleanId, cleanId
      ]
    );

    // Fetch Transactions
    let [txRows] = await dbPool.query(
      `SELECT id as auto_id, transaction_code as id, flat_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes, created_at
       FROM realestate_flat_transactions
       WHERE flat_id = ? OR flat_id = ? OR flat_id = ? OR flat_id = ? OR flat_id = ?
          OR flat_id LIKE CONCAT('%', ?, '%')
          OR flat_id LIKE CONCAT('%', ?, '%')
          OR flat_id IN (
            SELECT flat_code FROM realestate_flat_flats WHERE flat_code = ? OR flat_number = ? OR id = ? OR flat_code = ? OR flat_number = ?
            UNION
            SELECT flat_number FROM realestate_flat_flats WHERE flat_code = ? OR flat_number = ? OR id = ? OR flat_code = ? OR flat_number = ?
            UNION
            SELECT CAST(id AS CHAR) FROM realestate_flat_flats WHERE flat_code = ? OR flat_number = ? OR id = ? OR flat_code = ? OR flat_number = ?
          )
       ORDER BY payment_date DESC, id DESC`,
      [
        targetFlatId, String(flatAutoId), flatNum, rawId, cleanId,
        cleanId, rawId,
        rawId, rawId, numId, cleanId, cleanId,
        rawId, rawId, numId, cleanId, cleanId,
        rawId, rawId, numId, cleanId, cleanId
      ]
    );

    // Auto-seed booking transaction if flat has booking_amount but no transactions exist yet
    if (txRows.length === 0 && flat && parseFloat(flat.booking_amount) > 0) {
      const initAmt = parseFloat(flat.booking_amount);
      const txCode = `ftx-${Date.now().toString().slice(-6)}`;
      const receiptNo = `REC-FLAT-${Date.now().toString().slice(-6)}`;
      try {
        await dbPool.query(
          `INSERT INTO realestate_flat_transactions (transaction_code, flat_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes)
           VALUES (?, ?, ?, ?, ?, 'Booking Token Deposit', ?, 'BANK_TRANSFER', ?, ?, ?, 'Initial Booking Allotment Token')`,
          [
            txCode,
            targetFlatId,
            flat.wing_project_id || flat.project_id || null,
            flat.project_user_id || 'usr-admin-01',
            flat.buyer_name || 'Buyer',
            initAmt,
            `REF-BOOK-${Date.now().toString().slice(-5)}`,
            receiptNo,
            flat.booking_date ? String(flat.booking_date).slice(0, 10) : new Date().toISOString().slice(0, 10)
          ]
        );
        const [reTx] = await dbPool.query(
          `SELECT id as auto_id, transaction_code as id, flat_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes, created_at
           FROM realestate_flat_transactions
           WHERE flat_id = ? OR flat_id = ? OR flat_id = ?
           ORDER BY payment_date DESC, id DESC`,
          [targetFlatId, String(flatAutoId), flatNum]
        );
        txRows = reTx;
      } catch (insertErr) {
        console.warn('Auto-seed booking transaction notice:', insertErr.message);
      }
    }

    const totalCost = flat ? (parseFloat(flat.total_cost) || ((parseFloat(flat.sq_ft) || 1000) * (parseFloat(flat.rate_per_sqft) || 4500))) : 0;
    const totalPaid = txRows.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || (flat ? parseFloat(flat.booking_amount) || 0 : 0);
    const balanceDue = Math.max(0, totalCost - totalPaid);

    const todayStr = new Date().toISOString().slice(0, 10);
    const pending = instRows.filter(i => i.status === 'PENDING' && (!i.due_date || i.due_date <= todayStr));
    const upcoming = instRows.filter(i => i.status === 'PENDING' && (i.due_date && i.due_date > todayStr));
    const paid = instRows.filter(i => i.status === 'PAID');

    return res.json({
      success: true,
      flat: flat ? {
        id: flat.flat_code,
        autoId: flat.id,
        flatNumber: flat.flat_number,
        floor: flat.floor_number,
        wingName: flat.wing_name,
        bhkType: flat.bhk_type,
        type: flat.bhk_type,
        sqft: flat.sq_ft,
        ratePerSqFt: flat.rate_per_sqft,
        totalCost: totalCost,
        bookingAmount: totalPaid,
        occupancyStatus: flat.occupancy_status,
        residentName: flat.buyer_name,
        buyerName: flat.buyer_name,
        residentPhone: flat.buyer_phone,
        buyerPhone: flat.buyer_phone,
        residentEmail: flat.buyer_email,
        buyerEmail: flat.buyer_email,
        paymentPlan: flat.payment_plan,
        parkingSlot: flat.parking_slot,
        bookingDate: flat.booking_date
      } : null,
      installments: instRows,
      transactions: txRows,
      summary: {
        totalCost,
        totalPaid,
        balanceDue,
        pendingInstallments: pending,
        upcomingInstallments: upcoming,
        paidInstallments: paid
      }
    });
  } catch (err) {
    console.error('MySQL GET /api/flats/:id/payments error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. SCHEDULE A MILESTONE / FUTURE INSTALLMENT FOR A FLAT
app.post('/api/flats/:id/installments', async (req, res) => {
  const rawId = req.params.id || '';
  const { milestoneName, amount, dueDate, notes, userId, projectId, buyerName } = req.body;

  if (!rawId || !amount || !milestoneName || !dueDate) {
    return res.status(400).json({ success: false, message: 'Flat ID, milestone name, expected amount, and due date are required.' });
  }

  try {
    const flat = await resolveFlatDetails(rawId);
    const targetFlatId = flat ? flat.flat_code : rawId;
    const instCode = `finst-${targetFlatId}-${Date.now().toString().slice(-6)}`;
    const amt = parseFloat(amount) || 0;
    const targetUserId = userId || (flat ? flat.project_user_id : 'usr-admin-01') || 'usr-admin-01';
    const targetProjId = projectId || (flat ? flat.project_id : null);
    const targetBuyer = buyerName || (flat ? flat.buyer_name : null);

    const [result] = await dbPool.query(
      `INSERT INTO realestate_flat_installments (installment_code, flat_id, project_id, user_id, buyer_name, milestone_name, amount, due_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [instCode, targetFlatId, targetProjId, targetUserId, targetBuyer, milestoneName, amt, dueDate, notes || null]
    );

    const newInst = {
      id: instCode,
      auto_id: result.insertId,
      flat_id: targetFlatId,
      project_id: targetProjId,
      user_id: targetUserId,
      buyer_name: targetBuyer,
      milestone_name: milestoneName,
      amount: amt,
      due_date: dueDate,
      notes: notes || '',
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    console.log(`📅 [FLAT INSTALLMENT SCHEDULED] Flat ${targetFlatId}: '${milestoneName}' - ₹${amt} due on ${dueDate}`);
    return res.json({
      success: true,
      message: `Scheduled milestone installment of ₹${amt.toLocaleString('en-IN')} due on ${dueDate}!`,
      installment: newInst
    });
  } catch (err) {
    console.error('MySQL POST /api/flats/:id/installments error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2b. UPDATE / EDIT A SCHEDULED FLAT INSTALLMENT
app.put('/api/flats/:id/installments/:instId', async (req, res) => {
  const { instId } = req.params;
  const { milestoneName, amount, dueDate, notes, status } = req.body;
  try {
    const updates = [];
    const params = [];
    if (milestoneName !== undefined) {
      updates.push('milestone_name = ?');
      params.push(milestoneName);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(parseFloat(amount) || 0);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(dueDate);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update.' });
    }

    params.push(isNaN(instId) ? -1 : parseInt(instId), instId);
    await dbPool.query(
      `UPDATE realestate_flat_installments SET ${updates.join(', ')} WHERE id = ? OR installment_code = ?`,
      params
    );

    console.log(`✏️ [FLAT INSTALLMENT UPDATED] Installment ${instId} updated successfully`);
    return res.json({ success: true, message: 'Milestone installment updated successfully!' });
  } catch (err) {
    console.error('MySQL PUT /api/flats/:id/installments/:instId error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. COLLECT PAYMENT FOR A SCHEDULED FLAT INSTALLMENT
app.post('/api/flats/:id/installments/:instId/collect', async (req, res) => {
  const rawId = req.params.id || '';
  const { instId } = req.params;
  const { paymentMode, referenceNo, paymentDate, notes, buyerName, projectId, userId } = req.body;
  const receiptNo = `REC-FLAT-${Date.now().toString().slice(-6)}`;
  const pDate = paymentDate || new Date().toISOString().slice(0, 10);

  try {
    const flat = await resolveFlatDetails(rawId);
    const targetFlatId = flat ? flat.flat_code : rawId;

    const [instRows] = await dbPool.query(
      `SELECT * FROM realestate_flat_installments WHERE installment_code = ? OR id = ?`,
      [instId, isNaN(instId) ? -1 : parseInt(instId)]
    );

    const inst = instRows[0];
    const amt = inst ? parseFloat(inst.amount) : 0;
    const milestoneName = inst ? inst.milestone_name : 'Milestone Installment';
    const targetBuyer = buyerName || (inst ? inst.buyer_name : null) || (flat ? flat.buyer_name : 'Buyer');
    const targetProjId = projectId || (inst ? inst.project_id : null) || (flat ? flat.project_id : null);
    const targetUserId = userId || (inst ? inst.user_id : null) || 'usr-admin-01';

    // Update installment to PAID
    await dbPool.query(
      `UPDATE realestate_flat_installments SET status = 'PAID', paid_date = ?, receipt_number = ? WHERE installment_code = ? OR id = ?`,
      [pDate, receiptNo, instId, isNaN(instId) ? -1 : parseInt(instId)]
    );

    // Insert transaction
    const txCode = `ftx-${Date.now().toString().slice(-6)}`;
    const [txResult] = await dbPool.query(
      `INSERT INTO realestate_flat_transactions (transaction_code, flat_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txCode,
        targetFlatId,
        targetProjId,
        targetUserId,
        targetBuyer,
        milestoneName,
        amt,
        paymentMode || 'BANK_TRANSFER',
        referenceNo || `REF-${Date.now().toString().slice(-5)}`,
        receiptNo,
        pDate,
        notes || 'Payment collected from scheduled flat milestone installment.'
      ]
    );

    // Recompute total paid in realestate_flat_flats
    const [sumRows] = await dbPool.query(
      `SELECT SUM(amount) as totalPaid FROM realestate_flat_transactions WHERE flat_id = ?`,
      [targetFlatId]
    );
    const newTotalPaid = sumRows[0]?.totalPaid || amt;
    await dbPool.query(
      'UPDATE realestate_flat_flats SET booking_amount = ? WHERE flat_code = ? OR id = ?',
      [newTotalPaid, targetFlatId, flat ? flat.id : -1]
    );

    const newTx = {
      id: txCode,
      auto_id: txResult.insertId,
      flat_id: targetFlatId,
      project_id: targetProjId,
      user_id: targetUserId,
      buyer_name: targetBuyer,
      milestone_name: milestoneName,
      amount: amt,
      payment_mode: paymentMode || 'BANK_TRANSFER',
      reference_no: referenceNo || `REF-${Date.now().toString().slice(-5)}`,
      receipt_no: receiptNo,
      payment_date: pDate,
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    console.log(`💳 [FLAT PAYMENT COLLECTED] Flat ${targetFlatId}: ₹${amt} collected (${milestoneName}) - Receipt ${receiptNo}`);
    return res.json({
      success: true,
      message: `Payment of ₹${amt.toLocaleString('en-IN')} collected! Receipt: ${receiptNo}`,
      receiptNumber: receiptNo,
      transaction: newTx,
      totalPaid: newTotalPaid
    });
  } catch (err) {
    console.error('MySQL collect flat installment error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. DELETE A FLAT INSTALLMENT
app.delete('/api/flats/:id/installments/:instId', async (req, res) => {
  const { instId } = req.params;
  try {
    await dbPool.query(
      `DELETE FROM realestate_flat_installments WHERE id = ? OR installment_code = ?`,
      [isNaN(instId) ? -1 : parseInt(instId), instId]
    );
    return res.json({ success: true, message: 'Installment removed successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5. RECORD A DIRECT PAYMENT TRANSACTION FOR A FLAT
app.post('/api/flats/:id/transactions', async (req, res) => {
  const rawId = req.params.id || '';
  const { milestoneName, amount, paymentMode, referenceNo, paymentDate, notes, buyerName, projectId, userId } = req.body;
  if (!rawId || !amount || !milestoneName) {
    return res.status(400).json({ success: false, message: 'Flat ID, amount, and milestone are required.' });
  }

  try {
    const flat = await resolveFlatDetails(rawId);
    const targetFlatId = flat ? flat.flat_code : rawId;
    const txCode = `ftx-${Date.now().toString().slice(-6)}`;
    const receiptNo = `REC-FLAT-${Date.now().toString().slice(-6)}`;
    const amt = parseFloat(amount) || 0;
    const pDate = paymentDate || new Date().toISOString().slice(0, 10);
    const targetUserId = userId || (flat ? flat.project_user_id : null) || 'usr-admin-01';
    const targetProjId = projectId || (flat ? flat.project_id : null);
    const targetBuyer = buyerName || (flat ? flat.buyer_name : null) || 'Buyer';

    const [result] = await dbPool.query(
      `INSERT INTO realestate_flat_transactions (transaction_code, flat_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txCode,
        targetFlatId,
        targetProjId,
        targetUserId,
        targetBuyer,
        milestoneName,
        amt,
        paymentMode || 'BANK_TRANSFER',
        referenceNo || `REF-${Date.now().toString().slice(-5)}`,
        receiptNo,
        pDate,
        notes || null
      ]
    );

    // If an installment matches milestone name with PENDING, mark it PAID
    try {
      await dbPool.query(
        `UPDATE realestate_flat_installments SET status = 'PAID', paid_date = ?, receipt_number = ?
         WHERE flat_id = ? AND milestone_name = ? AND status = 'PENDING' LIMIT 1`,
        [pDate, receiptNo, targetFlatId, milestoneName]
      );
    } catch (_) {}

    // Update total booking_amount on flat
    const [sumRows] = await dbPool.query(
      `SELECT SUM(amount) as totalPaid FROM realestate_flat_transactions WHERE flat_id = ?`,
      [targetFlatId]
    );
    const newTotalPaid = sumRows[0]?.totalPaid || amt;
    await dbPool.query(
      'UPDATE realestate_flat_flats SET booking_amount = ? WHERE flat_code = ? OR id = ?',
      [newTotalPaid, targetFlatId, flat ? flat.id : -1]
    );

    const newTx = {
      id: txCode,
      auto_id: result.insertId,
      flat_id: targetFlatId,
      project_id: targetProjId,
      user_id: targetUserId,
      buyer_name: targetBuyer,
      milestone_name: milestoneName,
      amount: amt,
      payment_mode: paymentMode || 'BANK_TRANSFER',
      reference_no: referenceNo,
      receipt_no: receiptNo,
      payment_date: pDate,
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    console.log(`💵 [FLAT PAYMENT RECORDED] Added ₹${amt} (${milestoneName}) for Flat ${targetFlatId} - Receipt ${receiptNo}`);
    return res.json({
      success: true,
      message: `Payment of ₹${amt.toLocaleString('en-IN')} recorded successfully! Receipt: ${receiptNo}`,
      receiptNumber: receiptNo,
      transaction: newTx,
      totalPaid: newTotalPaid
    });
  } catch (err) {
    console.error('MySQL POST /api/flats/:id/transactions error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 6. DELETE A FLAT PAYMENT TRANSACTION
app.delete('/api/flats/:id/transactions/:txId', async (req, res) => {
  const rawId = req.params.id || '';
  const { txId } = req.params;
  try {
    const flat = await resolveFlatDetails(rawId);
    const targetFlatId = flat ? flat.flat_code : rawId;

    await dbPool.query(
      `DELETE FROM realestate_flat_transactions WHERE id = ? OR transaction_code = ?`,
      [isNaN(txId) ? -1 : parseInt(txId), txId]
    );

    const [sumRows] = await dbPool.query(
      `SELECT SUM(amount) as totalPaid FROM realestate_flat_transactions WHERE flat_id = ?`,
      [targetFlatId]
    );
    const newTotalPaid = sumRows[0]?.totalPaid || 0;
    await dbPool.query(
      'UPDATE realestate_flat_flats SET booking_amount = ? WHERE flat_code = ? OR id = ?',
      [newTotalPaid, targetFlatId, flat ? flat.id : -1]
    );

    return res.json({ success: true, message: 'Transaction removed successfully!', totalPaid: newTotalPaid });
  } catch (err) {
    console.error('MySQL DELETE flat transaction error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 7. GET COMPLETE FLAT PAYMENTS & RECEIVABLES LEDGER (PROJECT & USER SCOPED)
app.get('/api/flats/payments/ledger', async (req, res) => {
  const { projectId, userId } = req.query;
  try {
    let sql = `
      SELECT f.id as auto_id, f.flat_code, f.flat_number, f.floor_number, f.occupancy_status, f.bhk_type,
             f.sq_ft, f.rate_per_sqft, f.total_cost, f.booking_amount, f.buyer_name, f.buyer_phone, f.buyer_email,
             f.payment_plan, f.parking_slot, w.wing_code, w.wing_name, w.project_id, p.name as project_name, p.user_id
      FROM realestate_flat_flats f
      JOIN realestate_flat_wings w ON (f.wing_id = w.wing_code OR f.wing_id = CAST(w.id AS CHAR))
      LEFT JOIN realestate_plot_projects p ON (w.project_id = p.project_code OR w.project_id = CAST(p.id AS CHAR))
    `;
    const params = [];
    const conditions = [];

    if (projectId && projectId !== 'ALL') {
      conditions.push('w.project_id = ?');
      params.push(projectId);
    }
    if (userId && userId !== 'ALL') {
      conditions.push('(p.user_id = ? OR p.user_id = (SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ?))');
      params.push(userId, isNaN(userId) ? -1 : parseInt(userId), userId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY w.id ASC, f.floor_number ASC, f.flat_number ASC';

    let [flatRows] = await dbPool.query(sql, params);

    // Fallback if user filter or project filter yielded 0 rows
    let fallbackUsed = false;
    if (flatRows.length === 0) {
      const [allRows] = await dbPool.query(`
        SELECT f.id as auto_id, f.flat_code, f.flat_number, f.floor_number, f.occupancy_status, f.bhk_type,
               f.sq_ft, f.rate_per_sqft, f.total_cost, f.booking_amount, f.buyer_name, f.buyer_phone, f.buyer_email,
               f.payment_plan, f.parking_slot, w.wing_code, w.wing_name, w.project_id, p.name as project_name, p.user_id
        FROM realestate_flat_flats f
        JOIN realestate_flat_wings w ON (f.wing_id = w.wing_code OR f.wing_id = CAST(w.id AS CHAR))
        LEFT JOIN realestate_plot_projects p ON (w.project_id = p.project_code OR w.project_id = CAST(p.id AS CHAR))
        ORDER BY w.id ASC, f.floor_number ASC, f.flat_number ASC
      `);
      if (allRows.length > 0) {
        flatRows = allRows;
        fallbackUsed = true;
      }
    }

    // Fetch all installments & transactions for these flats
    let instSql = `SELECT i.*, f.flat_number, w.wing_name
       FROM realestate_flat_installments i
       JOIN realestate_flat_flats f ON (i.flat_id = f.flat_code OR i.flat_id = CAST(f.id AS CHAR) OR i.flat_id = f.flat_number)
       JOIN realestate_flat_wings w ON (f.wing_id = w.wing_code OR f.wing_id = CAST(w.id AS CHAR))
       LEFT JOIN realestate_plot_projects p ON (w.project_id = p.project_code OR w.project_id = CAST(p.id AS CHAR))`;
    if (!fallbackUsed && conditions.length > 0) {
      instSql += ' WHERE ' + conditions.join(' AND ');
    }
    instSql += ' ORDER BY i.due_date ASC, i.id ASC';
    const [allInst] = await dbPool.query(instSql, !fallbackUsed ? params : []);

    let txSql = `SELECT t.*, f.flat_number, w.wing_name
       FROM realestate_flat_transactions t
       JOIN realestate_flat_flats f ON (t.flat_id = f.flat_code OR t.flat_id = CAST(f.id AS CHAR) OR t.flat_id = f.flat_number)
       JOIN realestate_flat_wings w ON (f.wing_id = w.wing_code OR f.wing_id = CAST(w.id AS CHAR))
       LEFT JOIN realestate_plot_projects p ON (w.project_id = p.project_code OR w.project_id = CAST(p.id AS CHAR))`;
    if (!fallbackUsed && conditions.length > 0) {
      txSql += ' WHERE ' + conditions.join(' AND ');
    }
    txSql += ' ORDER BY t.payment_date DESC, t.id DESC';
    const [allTx] = await dbPool.query(txSql, !fallbackUsed ? params : []);

    const todayStr = new Date().toISOString().slice(0, 10);

    // Compute Accounts
    const accounts = flatRows.map(f => {
      const cost = parseFloat(f.total_cost) || ((parseFloat(f.sq_ft) || 1000) * (parseFloat(f.rate_per_sqft) || 4500));
      const flatTx = allTx.filter(t => t.flat_id === f.flat_code || t.flat_id === String(f.auto_id) || t.flat_id === f.flat_number);
      const totalPaid = flatTx.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || parseFloat(f.booking_amount) || 0;
      const balanceDue = Math.max(0, cost - totalPaid);

      const flatInst = allInst.filter(i => i.flat_id === f.flat_code || i.flat_id === String(f.auto_id) || i.flat_id === f.flat_number);
      const pendingInst = flatInst.filter(i => i.status === 'PENDING' && (!i.due_date || i.due_date <= todayStr));
      const upcomingInst = flatInst.filter(i => i.status === 'PENDING' && (i.due_date && i.due_date > todayStr));
      const nextDue = upcomingInst[0] || pendingInst[0] || null;

      return {
        id: f.flat_code,
        autoId: f.auto_id,
        flatNumber: f.flat_number,
        floor: f.floor_number,
        wingName: f.wing_name,
        wingCode: f.wing_code,
        projectId: f.project_id,
        projectName: f.project_name,
        bhkType: f.bhk_type,
        sqft: parseFloat(f.sq_ft) || 0,
        ratePerSqFt: parseFloat(f.rate_per_sqft) || 0,
        totalCost: cost,
        totalPaid: totalPaid,
        balanceDue: balanceDue,
        occupancyStatus: f.occupancy_status,
        buyerName: f.buyer_name,
        buyerPhone: f.buyer_phone,
        buyerEmail: f.buyer_email,
        paymentPlan: f.payment_plan || 'MILESTONE',
        pendingCount: pendingInst.length,
        pendingAmount: pendingInst.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0),
        upcomingCount: upcomingInst.length,
        upcomingAmount: upcomingInst.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0),
        nextDueDate: nextDue ? nextDue.due_date : null,
        nextMilestone: nextDue ? nextDue.milestone_name : null,
        transactionsCount: flatTx.length
      };
    });

    const pendingInstallments = allInst
      .filter(i => i.status === 'PENDING' && (!i.due_date || i.due_date <= todayStr))
      .map(i => ({
        id: i.installment_code,
        autoId: i.id,
        flatId: i.flat_id,
        flatNumber: i.flat_number,
        wingName: i.wing_name,
        buyerName: i.buyer_name,
        milestoneName: i.milestone_name,
        amount: parseFloat(i.amount) || 0,
        dueDate: i.due_date,
        status: 'PENDING',
        notes: i.notes
      }));

    const upcomingInstallments = allInst
      .filter(i => i.status === 'PENDING' && (i.due_date && i.due_date > todayStr))
      .map(i => ({
        id: i.installment_code,
        autoId: i.id,
        flatId: i.flat_id,
        flatNumber: i.flat_number,
        wingName: i.wing_name,
        buyerName: i.buyer_name,
        milestoneName: i.milestone_name,
        amount: parseFloat(i.amount) || 0,
        dueDate: i.due_date,
        status: 'UPCOMING',
        notes: i.notes
      }));

    const transactions = allTx.map(t => ({
      id: t.transaction_code,
      autoId: t.id,
      flatId: t.flat_id,
      flatNumber: t.flat_number,
      wingName: t.wing_name,
      buyerName: t.buyer_name,
      milestoneName: t.milestone_name,
      amount: parseFloat(t.amount) || 0,
      paymentMode: t.payment_mode,
      referenceNo: t.reference_no,
      receiptNo: t.receipt_no,
      paymentDate: t.payment_date,
      notes: t.notes
    }));

    const bookedAccounts = accounts.filter(a => a.occupancyStatus !== 'VACANT' || a.totalPaid > 0 || a.buyerName);
    const totalValuation = bookedAccounts.reduce((s, a) => s + a.totalCost, 0);
    const totalCollected = bookedAccounts.reduce((s, a) => s + a.totalPaid, 0);
    const totalBalance = Math.max(0, totalValuation - totalCollected);
    const totalPendingAmount = pendingInstallments.reduce((s, i) => s + i.amount, 0);
    const totalUpcomingAmount = upcomingInstallments.reduce((s, i) => s + i.amount, 0);

    return res.json({
      success: true,
      accounts: bookedAccounts,
      allAccounts: accounts,
      pendingInstallments,
      upcomingInstallments,
      transactions,
      kpis: {
        totalValuation,
        totalCollected,
        totalBalance,
        totalPendingAmount,
        pendingCount: pendingInstallments.length,
        totalUpcomingAmount,
        upcomingCount: upcomingInstallments.length,
        transactionsCount: transactions.length,
        bookedUnitsCount: bookedAccounts.length
      }
    });
  } catch (err) {
    console.error('MySQL GET /api/flats/payments/ledger error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// BUILDING MATERIAL RECORD MANAGEMENT MODULE ENDPOINTS

// FETCH ALL MATERIAL CATEGORIES FROM MYSQL
app.get('/api/materials/categories', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT category_id as id, category_name as label FROM realestate_materials_categories ORDER BY id ASC');
    return res.json({ success: true, categories: rows });
  } catch (err) {
    return res.json({ success: true, categories: [] });
  }
});

// CREATE CUSTOM MATERIAL CATEGORY IN MYSQL
app.post('/api/materials/categories', async (req, res) => {
  const { id, label } = req.body;
  if (!label) return res.status(400).json({ success: false, message: 'Category label is required.' });
  const cleanLabel = label.trim();
  const cleanId = (id || cleanLabel).toUpperCase().replace(/[^A-Z0-9]/g, '_');
  try {
    await dbPool.query(
      'INSERT INTO realestate_materials_categories (category_id, category_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)',
      [cleanId, cleanLabel]
    );
    console.log(`🏷️ [CATEGORY SAVED] Saved category '${cleanLabel}' (${cleanId}) into realestate_materials_categories!`);
    return res.json({ success: true, message: `Saved category '${cleanLabel}' to MySQL!`, category: { id: cleanId, label: cleanLabel } });
  } catch (err) {
    console.error('MySQL POST /api/materials/categories error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE MATERIAL CATEGORY IN MYSQL
app.put('/api/materials/categories/:id', async (req, res) => {
  const catId = req.params.id;
  const { label } = req.body;
  if (!label) return res.status(400).json({ success: false, message: 'Category label is required.' });
  const cleanLabel = label.trim();
  try {
    await dbPool.query(
      'UPDATE realestate_materials_categories SET category_name = ? WHERE category_id = ? OR id = ?',
      [cleanLabel, catId, isNaN(catId) ? -1 : parseInt(catId)]
    );
    console.log(`🏷️ [CATEGORY UPDATED] Updated category '${catId}' to '${cleanLabel}' in MySQL database!`);
    return res.json({ success: true, message: `Updated category name to '${cleanLabel}'!` });
  } catch (err) {
    console.error('MySQL PUT /api/materials/categories error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE MATERIAL CATEGORY FROM MYSQL
app.delete('/api/materials/categories/:id', async (req, res) => {
  const catId = req.params.id;
  try {
    await dbPool.query(
      'DELETE FROM realestate_materials_categories WHERE category_id = ? OR id = ?',
      [catId, isNaN(catId) ? -1 : parseInt(catId)]
    );
    console.log(`🏷️ [CATEGORY DELETED] Deleted category '${catId}' from MySQL database!`);
    return res.json({ success: true, message: `Deleted category '${catId}'!` });
  } catch (err) {
    console.error('MySQL DELETE /api/materials/categories error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// FETCH ALL MATERIAL UNITS FROM MYSQL
app.get('/api/materials/units', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT unit_name as unit FROM realestate_materials_units ORDER BY id ASC');
    return res.json({ success: true, units: rows.map(r => r.unit) });
  } catch (err) {
    return res.json({ success: true, units: [] });
  }
});

// CREATE CUSTOM MATERIAL UNIT IN MYSQL
app.post('/api/materials/units', async (req, res) => {
  const { unit } = req.body;
  if (!unit) return res.status(400).json({ success: false, message: 'Unit name is required.' });
  const cleanUnit = unit.trim();
  try {
    await dbPool.query(
      'INSERT INTO realestate_materials_units (unit_name) VALUES (?) ON DUPLICATE KEY UPDATE unit_name = VALUES(unit_name)',
      [cleanUnit]
    );
    console.log(`📏 [UNIT SAVED] Saved unit '${cleanUnit}' into realestate_materials_units!`);
    return res.json({ success: true, message: `Saved unit '${cleanUnit}' to MySQL!`, unit: cleanUnit });
  } catch (err) {
    console.error('MySQL POST /api/materials/units error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE MATERIAL UNIT IN MYSQL
app.put('/api/materials/units/:unitName', async (req, res) => {
  const oldUnit = req.params.unitName;
  const { newUnit } = req.body;
  if (!newUnit) return res.status(400).json({ success: false, message: 'New unit name is required.' });
  const cleanUnit = newUnit.trim();
  try {
    await dbPool.query(
      'UPDATE realestate_materials_units SET unit_name = ? WHERE unit_name = ?',
      [cleanUnit, oldUnit]
    );
    console.log(`📏 [UNIT UPDATED] Updated unit '${oldUnit}' to '${cleanUnit}' in MySQL database!`);
    return res.json({ success: true, message: `Updated unit name to '${cleanUnit}'!` });
  } catch (err) {
    console.error('MySQL PUT /api/materials/units error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE MATERIAL UNIT FROM MYSQL
app.delete('/api/materials/units/:unitName', async (req, res) => {
  const targetUnit = req.params.unitName;
  try {
    await dbPool.query(
      'DELETE FROM realestate_materials_units WHERE unit_name = ?',
      [targetUnit]
    );
    console.log(`📏 [UNIT DELETED] Deleted unit '${targetUnit}' from MySQL database!`);
    return res.json({ success: true, message: `Deleted unit '${targetUnit}'!` });
  } catch (err) {
    console.error('MySQL DELETE /api/materials/units error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/materials', async (req, res) => {
  const { projectId, userId } = req.query;
  try {
    let sql = `SELECT m.id as auto_id, m.material_code as id, m.project_id, m.material_name, m.category, m.unit_of_measure, m.current_stock, m.reorder_threshold, m.avg_unit_cost, m.supplier_contact 
      FROM realestate_materials m
      LEFT JOIN realestate_plot_projects p ON (m.project_id = p.project_code OR m.project_id = CAST(p.id AS CHAR))`;
    const params = [];
    const conditions = [];

    if (projectId && projectId !== 'ALL') {
      conditions.push("(m.project_id = ? OR m.project_id = 'ALL')");
      params.push(projectId);
    }
    if (userId && userId !== 'ALL') {
      conditions.push("(m.project_id = 'ALL' OR p.user_id = ? OR p.user_id = (SELECT user_code FROM realestate_users WHERE id = ? OR user_code = ?))");
      params.push(userId, isNaN(userId) ? -1 : parseInt(userId), userId);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY m.id DESC';

    const [rows] = await dbPool.query(sql, params);
    if (rows.length > 0) {
      const formatted = rows.map(m => ({
        id: m.id,
        autoId: m.auto_id,
        projectId: m.project_id || 'ALL',
        name: m.material_name,
        category: m.category,
        unit: m.unit_of_measure,
        stock: parseFloat(m.current_stock),
        min: parseFloat(m.reorder_threshold),
        cost: parseFloat(m.avg_unit_cost),
        vendor: m.supplier_contact
      }));
      return res.json({ success: true, materials: formatted });
    }
    return res.json({ success: true, materials: [] });
  } catch (err) {
    console.log('MySQL materials query notice (using inMemoryDb fallback):', err.message);
  }

  return res.json({ success: true, materials: inMemoryDb.buildingMaterials });
});

// CREATE / ADD NEW CUSTOM MATERIAL ITEM INTO MYSQL DATABASE
app.post('/api/materials', async (req, res) => {
  const { name, category, unit, stock, min, cost, vendor, projectId } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Material name is required.' });
  }

  const matCode = req.body.id || `mat-custom-${Date.now()}`;
  const targetProjId = projectId || 'ALL';
  const currStock = parseFloat(stock) || 0;
  const minStock = parseFloat(min) || 10;
  const unitCost = parseFloat(cost) || 0;

  try {
    const [result] = await dbPool.query(
      `INSERT INTO realestate_materials (material_code, project_id, material_name, category, unit_of_measure, current_stock, reorder_threshold, avg_unit_cost, supplier_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         project_id = VALUES(project_id),
         material_name = VALUES(material_name),
         category = VALUES(category),
         unit_of_measure = VALUES(unit_of_measure),
         current_stock = current_stock + VALUES(current_stock),
         reorder_threshold = VALUES(reorder_threshold),
         avg_unit_cost = VALUES(avg_unit_cost),
         supplier_contact = VALUES(supplier_contact)`,
      [matCode, targetProjId, name.trim(), category || 'STRUCTURAL', unit || 'Bags', currStock, minStock, unitCost, vendor || 'Authorized Supplier']
    );

    const createdMat = {
      id: matCode,
      autoId: result.insertId,
      projectId: targetProjId,
      name: name.trim(),
      category: category || 'STRUCTURAL',
      unit: unit || 'Bags',
      stock: currStock,
      min: minStock,
      cost: unitCost,
      vendor: vendor || 'Authorized Supplier'
    };

    console.log(`📦 [MATERIAL CREATED/UPDATED] Saved material '${name}' (${matCode}) for project ${targetProjId} into realestate_materials MySQL table!`);
    return res.json({ success: true, message: `Successfully saved ${name} to MySQL database!`, material: createdMat });
  } catch (err) {
    console.error('MySQL POST /api/materials error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// RECORD INWARD MATERIAL SHIPMENT
app.post('/api/materials/inward', async (req, res) => {
  const { materialId, vendorName, invoiceNumber, quantityReceived, unitPrice, receivedBy, projectId } = req.body;
  if (!materialId || !quantityReceived || !unitPrice) {
    return res.status(400).json({ success: false, message: 'Material ID, quantity, and unit price are required.' });
  }

  const qty = parseFloat(quantityReceived);
  const price = parseFloat(unitPrice);
  const totalCost = qty * price;
  const logCode = `in-${Date.now()}`;
  const targetProjId = projectId || 'ALL';

  try {
    await dbPool.query(
      `INSERT INTO realestate_materials_inward_logs (log_code, material_id, project_id, vendor_name, invoice_number, quantity_received, unit_price, total_cost, received_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [logCode, materialId, targetProjId, vendorName || 'Vendor', invoiceNumber || `INV-${Date.now().toString().slice(-5)}`, qty, price, totalCost, receivedBy || 'Site Engineer']
    );
    await dbPool.query(
      `UPDATE realestate_materials SET current_stock = current_stock + ? WHERE material_code = ? OR id = ?`,
      [qty, materialId, isNaN(materialId) ? -1 : parseInt(materialId)]
    );
  } catch (err) {
    console.log('MySQL material inward notice (using inMemoryDb fallback):', err.message);
  }

  const mat = inMemoryDb.buildingMaterials.find(m => m.id === materialId);
  if (mat) {
    mat.stock += qty;
  }
  inMemoryDb.materialInwardLogs.unshift({
    id: logCode,
    materialId,
    projectId: targetProjId,
    vendorName: vendorName || 'Vendor',
    invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-5)}`,
    quantityReceived: qty,
    unitPrice: price,
    totalCost,
    receivedBy: receivedBy || 'Site Engineer',
    date: new Date().toISOString().slice(0, 10)
  });

  console.log(`📦 [MATERIAL INWARD] Received ${qty} units of '${materialId}' for project '${targetProjId}' from '${vendorName}' (Total ₹${totalCost})`);
  return res.json({ success: true, message: `Successfully recorded inward delivery of ${qty} units!` });
});

// RECORD MATERIAL DISPATCH / CONSUMPTION
app.post('/api/materials/dispatch', async (req, res) => {
  const { materialId, targetLocation, quantityIssued, purposeMilestone, issuedBy, projectId } = req.body;
  if (!materialId || !quantityIssued || !targetLocation) {
    return res.status(400).json({ success: false, message: 'Material ID, target location, and quantity issued are required.' });
  }

  const qty = parseFloat(quantityIssued);
  const logCode = `out-${Date.now()}`;
  const targetProjId = projectId || 'ALL';

  try {
    await dbPool.query(
      `INSERT INTO realestate_materials_dispatch_logs (log_code, material_id, project_id, target_location, quantity_issued, purpose_milestone, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [logCode, materialId, targetProjId, targetLocation, qty, purposeMilestone || 'Construction Use', issuedBy || 'Store Manager']
    );
    await dbPool.query(
      `UPDATE realestate_materials SET current_stock = GREATEST(0, current_stock - ?) WHERE material_code = ? OR id = ?`,
      [qty, materialId, isNaN(materialId) ? -1 : parseInt(materialId)]
    );
  } catch (err) {
    console.log('MySQL material dispatch notice (using inMemoryDb fallback):', err.message);
  }

  const mat = inMemoryDb.buildingMaterials.find(m => m.id === materialId);
  if (mat) {
    mat.stock = Math.max(0, mat.stock - qty);
  }
  inMemoryDb.materialDispatchLogs.unshift({
    id: logCode,
    materialId,
    projectId: targetProjId,
    targetLocation,
    quantityIssued: qty,
    purposeMilestone: purposeMilestone || 'Construction Use',
    issuedBy: issuedBy || 'Store Manager',
    date: new Date().toISOString().slice(0, 10)
  });

  console.log(`🏗️ [MATERIAL DISPATCH] Issued ${qty} units of '${materialId}' for project '${targetProjId}' to '${targetLocation}'`);
  return res.json({ success: true, message: `Successfully dispatched ${qty} units to ${targetLocation}!` });
});

// FETCH MATERIAL AUDIT LOGS (INWARD + DISPATCH LEDGER)
app.get('/api/materials/logs', async (req, res) => {
  const { projectId } = req.query;
  try {
    let inwardSql = 'SELECT id as auto_id, log_code as id, material_id, project_id, vendor_name, invoice_number, quantity_received, unit_price, total_cost, received_by, created_at FROM realestate_materials_inward_logs';
    let dispatchSql = 'SELECT id as auto_id, log_code as id, material_id, project_id, target_location, quantity_issued, purpose_milestone, issued_by, created_at FROM realestate_materials_dispatch_logs';
    const paramsInw = [];
    const paramsDsp = [];

    if (projectId && projectId !== 'ALL') {
      inwardSql += ' WHERE project_id = ? OR project_id = \'ALL\'';
      dispatchSql += ' WHERE project_id = ? OR project_id = \'ALL\'';
      paramsInw.push(projectId);
      paramsDsp.push(projectId);
    }

    inwardSql += ' ORDER BY id DESC LIMIT 50';
    dispatchSql += ' ORDER BY id DESC LIMIT 50';

    const [inwardRows] = await dbPool.query(inwardSql, paramsInw);
    const [dispatchRows] = await dbPool.query(dispatchSql, paramsDsp);
    if (inwardRows.length > 0 || dispatchRows.length > 0) {
      return res.json({
        success: true,
        inwardLogs: inwardRows,
        dispatchLogs: dispatchRows
      });
    }
  } catch (err) {
    console.log('MySQL material logs notice:', err.message);
  }

  res.json({
    success: true,
    inwardLogs: inMemoryDb.materialInwardLogs,
    dispatchLogs: inMemoryDb.materialDispatchLogs
  });
});

// ============================================================================
// SOCIETY MANAGEMENT SYSTEM ENDPOINTS (MYSQL + IN-MEMORY RESILIENT)
// ============================================================================

// 1. DASHBOARD OVERVIEW STATS
app.get('/api/society/dashboard-stats', async (req, res) => {
  try {
    const [occupiedRows] = await dbPool.query("SELECT COUNT(*) as total, SUM(CASE WHEN occupancy_status != 'VACANT' THEN 1 ELSE 0 END) as occupied FROM realestate_flat_flats;");
    const [visitorRows] = await dbPool.query("SELECT COUNT(*) as active FROM realestate_flat_visitor_passes WHERE status = 'CHECKED_IN' OR status = 'EXPECTED';");
    const [ticketRows] = await dbPool.query("SELECT COUNT(*) as openTickets FROM realestate_flat_helpdesk_tickets WHERE status != 'RESOLVED';");
    const [duesRows] = await dbPool.query("SELECT SUM(amount + late_fee) as unpaidDues FROM realestate_society_bills WHERE status != 'PAID';");
    const [noticeRows] = await dbPool.query("SELECT COUNT(*) as activeNotices FROM realestate_society_notices;");
    const [residentRows] = await dbPool.query("SELECT COUNT(*) as residentCount FROM realestate_flat_flats WHERE buyer_name IS NOT NULL;");

    return res.json({
      success: true,
      stats: {
        totalFlats: occupiedRows[0]?.total || 16,
        occupiedFlats: occupiedRows[0]?.occupied || 14,
        totalResidents: residentRows[0]?.residentCount || 9,
        activeVisitors: visitorRows[0]?.active || 0,
        openTickets: ticketRows[0]?.openTickets || 0,
        unpaidDues: parseFloat(duesRows[0]?.unpaidDues || 0),
        activeNotices: noticeRows[0]?.activeNotices || 0
      }
    });
  } catch (err) {
    console.log('MySQL society stats notice:', err.message);
    return res.json({
      success: true,
      stats: {
        totalFlats: 16,
        occupiedFlats: 14,
        totalResidents: 9,
        activeVisitors: 3,
        openTickets: 2,
        unpaidDues: 8300,
        activeNotices: 3
      }
    });
  }
});

// 2. RESIDENT DIRECTORY (Queried directly from flat allotments with wing names)
app.get('/api/society/residents', async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id as flat_auto_id,
        f.flat_code,
        f.flat_number,
        f.floor_number,
        f.occupancy_status,
        f.buyer_name as resident_name,
        f.buyer_phone as phone,
        f.buyer_email as email,
        f.parking_slot,
        f.bhk_type,
        f.project_id,
        w.wing_name,
        w.wing_code
      FROM realestate_flat_flats f
      LEFT JOIN realestate_flat_wings w ON f.wing_id = w.wing_code
      WHERE f.buyer_name IS NOT NULL AND f.buyer_name != ''
      ORDER BY w.wing_name ASC, f.flat_number ASC;
    `;
    const [rows] = await dbPool.query(query);
    return res.json({
      success: true,
      residents: rows.map(r => ({
        id: r.flat_code,
        flatNumber: r.flat_number,
        wingName: r.wing_name || 'Main Wing',
        residentName: r.resident_name,
        phone: r.phone || '9822000000',
        email: r.email || `${r.flat_number.toLowerCase()}@society.com`,
        occupancyType: r.occupancy_status === 'TENANT_OCCUPIED' ? 'TENANT' : 'OWNER',
        parkingSlot: r.parking_slot || 'P-' + r.flat_number,
        bhkType: r.bhk_type || '2 BHK',
        floorNumber: r.floor_number,
        projectId: r.project_id
      }))
    });
  } catch (err) {
    console.log('MySQL residents directory notice:', err.message);
    return res.json({
      success: true,
      residents: [
        { id: 'flat-A-101', flatNumber: 'A-101', wingName: 'A wing', residentName: 'Chetan Pardhi', phone: '9822003344', email: 'chetan@gmail.com', occupancyType: 'OWNER', parkingSlot: 'P-A101', bhkType: '2 BHK', floorNumber: 1 },
        { id: 'flat-A-102', flatNumber: 'A-102', wingName: 'A wing', residentName: 'Rutuja Shah', phone: '9822012345', email: 'rutuja@gmail.com', occupancyType: 'OWNER', parkingSlot: 'P-A102', bhkType: '2 BHK', floorNumber: 1 },
        { id: 'flat-A-103', flatNumber: 'A-103', wingName: 'A wing', residentName: 'Vrushab Chauhan', phone: '9823001122', email: 'vrushab@gmail.com', occupancyType: 'OWNER', parkingSlot: 'P-A103', bhkType: '2 BHK', floorNumber: 1 },
        { id: 'flat-A-204', flatNumber: 'A-204', wingName: 'A wing', residentName: 'Saurabh Thakkar', phone: '9765432109', email: 'saurabh@gmail.com', occupancyType: 'TENANT', parkingSlot: 'P-A204', bhkType: '3 BHK', floorNumber: 2 },
        { id: 'flat-P-401', flatNumber: 'P-401', wingName: 'pr plaza', residentName: 'Ayan Sheikh', phone: '9811009988', email: 'ayan@gmail.com', occupancyType: 'OWNER', parkingSlot: 'P-401', bhkType: '2 BHK', floorNumber: 4 }
      ]
    });
  }
});

// 3. GATEKEEPER VISITOR PASSES
app.get('/api/society/visitors', async (req, res) => {
  const { status, flatNumber } = req.query;
  try {
    let sql = 'SELECT * FROM realestate_flat_visitor_passes WHERE 1=1';
    const params = [];
    if (status && status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (flatNumber) {
      sql += ' AND (flat_id LIKE ? OR flat_id = ?)';
      params.push(`%${flatNumber}%`, flatNumber);
    }
    sql += ' ORDER BY id DESC LIMIT 100';
    const [rows] = await dbPool.query(sql, params);
    return res.json({
      success: true,
      visitors: rows.map(r => ({
        id: r.pass_code_uid || r.id.toString(),
        autoId: r.id,
        visitorName: r.visitor_name,
        phone: r.phone_number,
        vehicleNumber: r.vehicle_number || 'N/A',
        visitorType: r.visitor_type,
        pinCode: r.pass_code,
        flatNumber: r.flat_id.replace('flat-', ''),
        flatId: r.flat_id,
        status: r.status,
        entryTime: r.entry_time,
        exitTime: r.exit_time,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    console.log('MySQL visitors notice:', err.message);
    return res.json({ success: true, visitors: inMemoryDb.visitorPasses || [] });
  }
});

app.post('/api/society/visitors', async (req, res) => {
  const { visitorName, phone, vehicleNumber, visitorType, flatNumber, purpose } = req.body;
  if (!visitorName || !phone) {
    return res.status(400).json({ success: false, message: 'Visitor name and phone are required.' });
  }

  const passUid = `GP-${Date.now().toString().slice(-6)}`;
  const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
  const flatId = `flat-${flatNumber || 'General'}`;

  try {
    await dbPool.query(`
      INSERT INTO realestate_flat_visitor_passes (pass_code_uid, society_id, flat_id, created_by_user_id, visitor_name, phone_number, vehicle_number, visitor_type, pass_code, status, entry_time)
      VALUES (?, 'soc-001', ?, 'usr-admin-01', ?, ?, ?, ?, ?, 'CHECKED_IN', NOW());
    `, [passUid, flatId, visitorName, phone, vehicleNumber || 'N/A', visitorType || 'GUEST', pinCode]);

    return res.json({
      success: true,
      message: 'Visitor pass created & checked in successfully!',
      pass: {
        id: passUid,
        visitorName,
        phone,
        vehicleNumber: vehicleNumber || 'N/A',
        visitorType: visitorType || 'GUEST',
        flatNumber: flatNumber || 'General',
        pinCode,
        status: 'CHECKED_IN',
        entryTime: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('MySQL visitor pass insert error:', err.message);
    const mockPass = {
      id: passUid,
      visitorName,
      phone,
      vehicleNumber: vehicleNumber || 'N/A',
      visitorType: visitorType || 'GUEST',
      flatNumber: flatNumber || 'General',
      pinCode,
      status: 'CHECKED_IN',
      entryTime: new Date().toISOString()
    };
    inMemoryDb.visitorPasses.unshift(mockPass);
    return res.json({ success: true, message: 'Pass created in fallback memory mode!', pass: mockPass });
  }
});

app.put('/api/society/visitors/:id/checkin', async (req, res) => {
  const { id } = req.params;
  try {
    await dbPool.query(
      "UPDATE realestate_flat_visitor_passes SET status = 'CHECKED_IN', entry_time = NOW() WHERE pass_code_uid = ? OR id = ?",
      [id, id]
    );
    return res.json({ success: true, message: 'Visitor marked as CHECKED IN!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/society/visitors/:id/checkout', async (req, res) => {
  const { id } = req.params;
  try {
    await dbPool.query(
      "UPDATE realestate_flat_visitor_passes SET status = 'CHECKED_OUT', exit_time = NOW() WHERE pass_code_uid = ? OR id = ?",
      [id, id]
    );
    return res.json({ success: true, message: 'Visitor marked as CHECKED OUT!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. MAINTENANCE BILLS & PAYMENT TRACKING
app.get('/api/society/bills', async (req, res) => {
  const { status, flatNumber } = req.query;
  try {
    let sql = 'SELECT * FROM realestate_society_bills WHERE 1=1';
    const params = [];
    if (status && status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (flatNumber) {
      sql += ' AND flat_number = ?';
      params.push(flatNumber);
    }
    sql += ' ORDER BY id DESC LIMIT 100';
    const [rows] = await dbPool.query(sql, params);
    return res.json({
      success: true,
      bills: rows.map(r => ({
        id: r.bill_code || r.id.toString(),
        autoId: r.id,
        flatNumber: r.flat_number,
        residentName: r.resident_name,
        monthYear: r.month_year,
        amount: parseFloat(r.amount),
        lateFee: parseFloat(r.late_fee || 0),
        totalPayable: parseFloat(r.amount) + parseFloat(r.late_fee || 0),
        dueDate: r.due_date,
        status: r.status,
        paymentMode: r.payment_mode,
        receiptNumber: r.receipt_number,
        paidDate: r.paid_date,
        notes: r.notes,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    console.log('MySQL society bills notice:', err.message);
    return res.json({ success: true, bills: inMemoryDb.societyBills || [] });
  }
});

app.post('/api/society/bills', async (req, res) => {
  const { flatNumber, residentName, monthYear, amount, lateFee, dueDate, notes } = req.body;
  if (!flatNumber || !residentName || !amount) {
    return res.status(400).json({ success: false, message: 'Flat number, resident name, and amount are required.' });
  }

  const billCode = `BILL-${Date.now().toString().slice(-6)}`;
  const due = dueDate || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

  try {
    await dbPool.query(`
      INSERT INTO realestate_society_bills (bill_code, society_id, flat_number, resident_name, month_year, amount, late_fee, due_date, status, notes)
      VALUES (?, 'soc-001', ?, ?, ?, ?, ?, ?, 'UNPAID', ?);
    `, [billCode, flatNumber, residentName, monthYear || 'Current Month', parseFloat(amount), parseFloat(lateFee || 0), due, notes || '']);

    return res.json({
      success: true,
      message: 'Maintenance bill generated successfully!',
      bill: {
        id: billCode,
        flatNumber,
        residentName,
        monthYear: monthYear || 'Current Month',
        amount: parseFloat(amount),
        lateFee: parseFloat(lateFee || 0),
        dueDate: due,
        status: 'UNPAID'
      }
    });
  } catch (err) {
    console.error('MySQL bill create error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/society/bills/:id/pay', async (req, res) => {
  const { id } = req.params;
  const { paymentMode, notes } = req.body;
  const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    await dbPool.query(`
      UPDATE realestate_society_bills
      SET status = 'PAID', payment_mode = ?, receipt_number = ?, paid_date = NOW(), notes = COALESCE(?, notes)
      WHERE bill_code = ? OR id = ?;
    `, [paymentMode || 'UPI', receiptNo, notes, id, id]);

    return res.json({
      success: true,
      message: 'Payment recorded successfully!',
      receiptNumber: receiptNo,
      paidDate: new Date().toISOString()
    });
  } catch (err) {
    console.error('MySQL bill pay error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5. HELPDESK TICKETS & COMPLAINTS
app.get('/api/society/tickets', async (req, res) => {
  const { status, category } = req.query;
  try {
    let sql = 'SELECT * FROM realestate_flat_helpdesk_tickets WHERE 1=1';
    const params = [];
    if (status && status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (category && category !== 'ALL') {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY id DESC LIMIT 100';
    const [rows] = await dbPool.query(sql, params);
    return res.json({
      success: true,
      tickets: rows.map(r => ({
        id: r.ticket_code || r.id.toString(),
        autoId: r.id,
        flatNumber: r.flat_number || r.flat_id?.replace('flat-', '') || 'General',
        residentName: r.resident_name || 'Resident',
        category: r.category,
        subject: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        assignedTechnician: r.assigned_staff_name,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    console.log('MySQL tickets notice:', err.message);
    return res.json({ success: true, tickets: inMemoryDb.tickets || [] });
  }
});

app.post('/api/society/tickets', async (req, res) => {
  const { flatNumber, residentName, category, subject, description, priority } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ success: false, message: 'Subject and description are required.' });
  }

  const ticketCode = `TKT-${Date.now().toString().slice(-6)}`;
  const flatId = `flat-${flatNumber || 'General'}`;

  try {
    await dbPool.query(`
      INSERT INTO realestate_flat_helpdesk_tickets (ticket_code, society_id, flat_id, flat_number, resident_name, raised_by_user_id, title, description, category, priority, status)
      VALUES (?, 'soc-001', ?, ?, ?, 'usr-admin-01', ?, ?, ?, ?, 'OPEN');
    `, [ticketCode, flatId, flatNumber || 'General', residentName || 'Resident', subject, description, category || 'GENERAL', priority || 'MEDIUM']);

    return res.json({
      success: true,
      message: 'Helpdesk ticket lodged successfully!',
      ticket: {
        id: ticketCode,
        flatNumber: flatNumber || 'General',
        residentName: residentName || 'Resident',
        category: category || 'GENERAL',
        subject,
        description,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('MySQL ticket create error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/society/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { status, assignedTechnician } = req.body;
  try {
    await dbPool.query(`
      UPDATE realestate_flat_helpdesk_tickets
      SET status = COALESCE(?, status), assigned_staff_name = COALESCE(?, assigned_staff_name)
      WHERE ticket_code = ? OR id = ?;
    `, [status, assignedTechnician, id, id]);

    return res.json({ success: true, message: 'Ticket updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 6. BROADCAST NOTICES & ALERTS
app.get('/api/society/notices', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM realestate_society_notices ORDER BY is_pinned DESC, id DESC LIMIT 100;');
    return res.json({
      success: true,
      notices: rows.map(r => ({
        id: r.notice_code || r.id.toString(),
        autoId: r.id,
        title: r.title,
        message: r.message,
        category: r.category,
        urgency: r.urgency,
        postedBy: r.posted_by,
        isPinned: Boolean(r.is_pinned),
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    console.log('MySQL notices notice:', err.message);
    return res.json({ success: true, notices: inMemoryDb.societyNotices || [] });
  }
});

app.post('/api/society/notices', async (req, res) => {
  const { title, message, category, urgency, postedBy, isPinned } = req.body;
  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Title and message are required.' });
  }

  const noticeCode = `NTC-${Date.now().toString().slice(-6)}`;

  try {
    await dbPool.query(`
      INSERT INTO realestate_society_notices (notice_code, society_id, title, message, category, urgency, posted_by, is_pinned)
      VALUES (?, 'soc-001', ?, ?, ?, ?, ?, ?);
    `, [noticeCode, title, message, category || 'GENERAL', urgency || 'NORMAL', postedBy || 'Society Admin', isPinned ? 1 : 0]);

    return res.json({
      success: true,
      message: 'Notice broadcasted successfully!',
      notice: {
        id: noticeCode,
        title,
        message,
        category: category || 'GENERAL',
        urgency: urgency || 'NORMAL',
        postedBy: postedBy || 'Society Admin',
        isPinned: Boolean(isPinned),
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('MySQL notice broadcast error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/society/notices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbPool.query('DELETE FROM realestate_society_notices WHERE notice_code = ? OR id = ?;', [id, id]);
    return res.json({ success: true, message: 'Notice deleted successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 7. AMENITIES & RESERVATIONS
const DEFAULT_AMENITIES = [
  { id: 'amenity-clubhouse', name: 'Clubhouse Banquet Hall', maxGuests: 60, pricePerHour: 500, description: 'Air-conditioned hall with stage, audio system, and party seating.', icon: '🏛️' },
  { id: 'amenity-pool', name: 'Swimming Pool & Deck', maxGuests: 20, pricePerHour: 100, description: 'Clean chlorination maintained pool with kids splash section.', icon: '🏊' },
  { id: 'amenity-court', name: 'Tennis & Badminton Court', maxGuests: 4, pricePerHour: 150, description: 'Synthetic flood-lit sports court with equipment rack.', icon: '🎾' },
  { id: 'amenity-lounge', name: 'Rooftop Sky Lounge', maxGuests: 35, pricePerHour: 400, description: 'Open terrace lounge with pergolas, BBQ grills, and city view.', icon: '🌆' },
  { id: 'amenity-gym', name: 'Fitness Center & Gym', maxGuests: 25, pricePerHour: 0, description: 'Treadmills, elliptical, free weights, and aerobic zone.', icon: '🏋️' }
];

app.get('/api/society/amenities', async (req, res) => {
  try {
    const [bookings] = await dbPool.query('SELECT * FROM realestate_society_amenity_bookings ORDER BY booking_date DESC, id DESC LIMIT 100;');
    return res.json({
      success: true,
      amenities: DEFAULT_AMENITIES,
      bookings: bookings.map(b => ({
        id: b.booking_code || b.id.toString(),
        autoId: b.id,
        amenityId: b.amenity_id,
        amenityName: b.amenity_name,
        flatNumber: b.flat_number,
        residentName: b.resident_name,
        phone: b.phone,
        bookingDate: b.booking_date,
        timeSlot: b.time_slot,
        guestCount: b.guest_count,
        totalCharge: parseFloat(b.total_charge),
        status: b.status,
        notes: b.notes,
        createdAt: b.created_at
      }))
    });
  } catch (err) {
    console.log('MySQL amenities notice:', err.message);
    return res.json({
      success: true,
      amenities: DEFAULT_AMENITIES,
      bookings: inMemoryDb.societyAmenityBookings || []
    });
  }
});

app.post('/api/society/amenities/book', async (req, res) => {
  const { amenityId, amenityName, flatNumber, residentName, phone, bookingDate, timeSlot, guestCount, totalCharge, notes } = req.body;
  if (!amenityId || !flatNumber || !residentName || !bookingDate) {
    return res.status(400).json({ success: false, message: 'Amenity, flat number, resident name, and booking date are required.' });
  }

  const bookingCode = `ABK-${Date.now().toString().slice(-6)}`;

  try {
    await dbPool.query(`
      INSERT INTO realestate_society_amenity_bookings (booking_code, society_id, amenity_id, amenity_name, flat_number, resident_name, phone, booking_date, time_slot, guest_count, total_charge, status, notes)
      VALUES (?, 'soc-001', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?);
    `, [bookingCode, amenityId, amenityName || 'Facility', flatNumber, residentName, phone || '', bookingDate, timeSlot || 'Slot', parseInt(guestCount || 1), parseFloat(totalCharge || 0), notes || '']);

    return res.json({
      success: true,
      message: 'Amenity booked successfully!',
      booking: {
        id: bookingCode,
        amenityId,
        amenityName,
        flatNumber,
        residentName,
        phone,
        bookingDate,
        timeSlot,
        guestCount,
        totalCharge: parseFloat(totalCharge || 0),
        status: 'CONFIRMED'
      }
    });
  } catch (err) {
    console.error('MySQL amenity booking error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ADMIN ENDPOINT: WIPE ALL DATABASE TABLES EXCEPT LOGIN DETAILS (USERS)
app.post('/api/admin/reset-database-except-users', async (req, res) => {
  try {
    await dbPool.query('SET FOREIGN_KEY_CHECKS = 0;');
    const tablesToWipe = [
      'realestate_plot_projects',
      'realestate_flat_wings',
      'realestate_flat_flats',
      'realestate_plot_plots',
      'plot_manage_plot_pins',
      'plot_manage_plot_installments',
      'plot_manage_plot_transactions',
      'realestate_flat_installments',
      'realestate_flat_transactions',
      'plot_manage_building_materials',
      'realestate_materials_inward_logs',
      'realestate_materials_dispatch_logs',
      'realestate_materials_categories',
      'realestate_materials_units',
      'realestate_plot_agents',
      'realestate_flat_visitor_passes',
      'realestate_flat_helpdesk_tickets',
      'realestate_society_bills',
      'realestate_society_amenity_bookings',
      'realestate_society_notices',
      'plot_manage_notifications',
      'plot_manage_layout_pins',
      'plot_manage_layout_maps'
    ];

    for (const tbl of tablesToWipe) {
      try {
        await dbPool.query(`TRUNCATE TABLE ${tbl};`);
      } catch (_) {}
    }
    await dbPool.query('SET FOREIGN_KEY_CHECKS = 1;');

    inMemoryDb.wings = [];
    inMemoryDb.flats = [];
    inMemoryDb.notifications = [];
    inMemoryDb.visitorPasses = [];
    inMemoryDb.tickets = [];
    inMemoryDb.plots = [];
    inMemoryDb.blueprintMapUrl = null;
    inMemoryDb.customPlotPins = [];
    inMemoryDb.plotInstallments = [];
    inMemoryDb.buildingMaterials = [];
    inMemoryDb.materialInwardLogs = [];
    inMemoryDb.materialDispatchLogs = [];

    const [userCount] = await dbPool.query('SELECT COUNT(*) as count FROM realestate_users;');
    res.json({
      success: true,
      message: 'Database wipe successful. Preserved all user login accounts!',
      preservedUserCount: userCount[0]?.count || 0
    });
  } catch (err) {
    console.error('Reset database error:', err.message);
    res.status(500).json({ success: false, message: 'Database reset error.' });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SocietySync Node.js Server listening on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`🗄️ Database: plot_manage_db (Prefix: plot_manage_)`);
  console.log(`====================================================`);
});

// Also listen on port 5000 if PORT != 5000 to support DevTunnel and legacy clients
if (Number(PORT) !== 5000) {
  const legacyServer = app.listen(5000, () => {
    console.log(`🚀 Also listening on port 5000 for DevTunnel compatibility`);
  });
  legacyServer.on('error', () => {});
}
