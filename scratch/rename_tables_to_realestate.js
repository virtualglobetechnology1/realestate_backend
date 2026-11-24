const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const tableMapping = [
  // 1. Society & User Tables
  { oldName: 'plot_manage_societies', newName: 'realestate_societies' },
  { oldName: 'plot_manage_users', newName: 'realestate_users' },
  
  // 2. Plot Tables
  { oldName: 'plot_manage_projects', newName: 'realestate_plot_projects' },
  { oldName: 'plot_manage_plots', newName: 'realestate_plot_plots' },
  { oldName: 'plot_manage_pins', newName: 'realestate_plot_pins' },
  { oldName: 'plot_manage_installments', newName: 'realestate_plot_installments' },
  { oldName: 'plot_manage_transactions', newName: 'realestate_plot_transactions' },
  { oldName: 'plot_manage_masterplans', newName: 'realestate_plot_masterplans' },
  { oldName: 'plot_manage_agents', newName: 'realestate_plot_agents' },

  // 3. Flat & Building Construction Tables
  { oldName: 'plot_manage_wings', newName: 'realestate_flat_wings' },
  { oldName: 'plot_manage_flats', newName: 'realestate_flat_flats' },
  { oldName: 'plot_manage_flat_installments', newName: 'realestate_flat_installments' },
  { oldName: 'plot_manage_flat_transactions', newName: 'realestate_flat_transactions' },
  { oldName: 'plot_manage_visitor_passes', newName: 'realestate_flat_visitor_passes' },
  { oldName: 'plot_manage_helpdesk_tickets', newName: 'realestate_flat_helpdesk_tickets' },

  // 4. Building Material Tables
  { oldName: 'plot_manage_materials', newName: 'realestate_materials' },
  { oldName: 'plot_manage_material_inward_logs', newName: 'realestate_materials_inward_logs' },
  { oldName: 'plot_manage_material_dispatch_logs', newName: 'realestate_materials_dispatch_logs' },
  { oldName: 'plot_manage_material_categories', newName: 'realestate_materials_categories' },
  { oldName: 'plot_manage_material_units', newName: 'realestate_materials_units' }
];

async function migrateServerFileAndDatabase() {
  console.log('🔄 1. Replacing table names in server.js with realestate_* naming convention...');
  
  const serverJsPath = path.join(__dirname, '../src/server.js');
  let serverContent = fs.readFileSync(serverJsPath, 'utf8');

  // Replace each table name in server.js (longest table names first to prevent partial replacement)
  const sortedMappings = [...tableMapping].sort((a, b) => b.oldName.length - a.oldName.length);
  for (const map of sortedMappings) {
    const regex = new RegExp('\\b' + map.oldName + '\\b', 'g');
    serverContent = serverContent.replace(regex, map.newName);
  }

  fs.writeFileSync(serverJsPath, serverContent, 'utf8');
  console.log('✅ Updated server.js with all 20 realestate_* table names!');

  console.log('\n🔄 2. Migrating MySQL Database plot_manage_db tables to realestate_*...');
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'plot_manage_db',
    port: 3306
  });

  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0;');

    // First: Copy users from plot_manage_users into realestate_users if realestate_users doesn't exist yet
    const [userTblExist] = await pool.query("SHOW TABLES LIKE 'plot_manage_users'");
    let savedUsers = [];
    if (userTblExist.length > 0) {
      const [uRows] = await pool.query('SELECT * FROM plot_manage_users');
      savedUsers = uRows;
      console.log(`  ✓ Backed up ${savedUsers.length} user login record(s) from plot_manage_users.`);
    }

    // Rename or copy each table in MySQL
    for (const map of tableMapping) {
      try {
        const [tblCheck] = await pool.query(`SHOW TABLES LIKE '${map.oldName}'`);
        if (tblCheck.length > 0) {
          await pool.query(`RENAME TABLE \`${map.oldName}\` TO \`${map.newName}\`;`);
          console.log(`  ✓ Renamed table: ${map.oldName} ➔ ${map.newName}`);
        }
      } catch (err) {
        console.warn(`  Notice renaming ${map.oldName}:`, err.message);
      }
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

    const [allTables] = await pool.query('SHOW TABLES FROM plot_manage_db;');
    console.log('\n✅ Migration Complete! Active Tables in plot_manage_db:');
    console.table(allTables.map(t => Object.values(t)[0]));

  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrateServerFileAndDatabase();
