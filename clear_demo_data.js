const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'plot_manage_db',
      port: 3306
    });

    console.log(`🧹 Clearing operational data from XAMPP MySQL database: 'plot_manage_db'...`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tablesToWipe = [
      'plot_manage_projects',
      'plot_manage_wings',
      'plot_manage_flats',
      'plot_manage_plots',
      'plot_manage_pins',
      'plot_manage_installments',
      'plot_manage_transactions',
      'plot_manage_flat_installments',
      'plot_manage_flat_transactions',
      'plot_manage_materials',
      'plot_manage_material_inward_logs',
      'plot_manage_material_dispatch_logs',
      'plot_manage_material_categories',
      'plot_manage_material_units',
      'plot_manage_masterplans',
      'plot_manage_agents',
      'plot_manage_visitor_passes',
      'plot_manage_helpdesk_tickets',
      'plot_manage_societies'
    ];

    for (const tbl of tablesToWipe) {
      try {
        await conn.query(`TRUNCATE TABLE \`${tbl}\`;`);
        console.log(`  ✓ Cleared table: ${tbl}`);
      } catch (e) {
        console.warn(`  Notice for ${tbl}:`, e.message);
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    await conn.end();
    console.log('✅ Demo data cleanup complete for plot_manage_db!');
  } catch (err) {
    console.error('❌ Error clearing demo data:', err.message);
  }
})();
