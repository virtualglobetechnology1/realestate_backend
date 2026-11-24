const mysql = require('mysql2/promise');

async function wipeDatabaseExceptUsers() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'plot_manage_db',
    port: 3306,
    multipleStatements: true
  });

  try {
    console.log('🔄 Connecting to MySQL plot_manage_db to clear database except login details (realestate_users)...');
    
    // Disable foreign key checks for clean truncation
    await pool.query('SET FOREIGN_KEY_CHECKS = 0;');

    // List of realestate_* operational tables to wipe (EXCEPT realestate_users)
    const tablesToWipe = [
      'realestate_plot_projects',
      'realestate_flat_wings',
      'realestate_flat_flats',
      'realestate_plot_plots',
      'realestate_plot_pins',
      'realestate_plot_installments',
      'realestate_plot_transactions',
      'realestate_flat_installments',
      'realestate_flat_transactions',
      'realestate_materials',
      'realestate_materials_inward_logs',
      'realestate_materials_dispatch_logs',
      'realestate_materials_categories',
      'realestate_materials_units',
      'realestate_plot_masterplans',
      'realestate_plot_agents',
      'realestate_flat_visitor_passes',
      'realestate_flat_helpdesk_tickets',
      'realestate_societies'
    ];

    for (const tbl of tablesToWipe) {
      try {
        await pool.query(`TRUNCATE TABLE \`${tbl}\`;`);
        console.log(`  ✓ Cleared table: ${tbl}`);
      } catch (err) {
        console.warn(`  ⚠️ Table ${tbl} notice: ${err.message}`);
      }
    }

    // Re-enable foreign key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

    // Verify realestate_users row count
    const [userRows] = await pool.query('SELECT id, user_code, full_name, phone_number, role FROM realestate_users;');
    console.log(`\n✅ Database wipe complete! Preserved ${userRows.length} user login account(s) in realestate_users:`);
    console.table(userRows);

  } catch (err) {
    console.error('❌ Database wipe error:', err.message);
  } finally {
    await pool.end();
  }
}

wipeDatabaseExceptUsers();
