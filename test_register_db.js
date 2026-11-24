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

    console.log('Inserting default society soc-101 into societies table...');
    await db.query(`
      INSERT INTO societies (id, name, registration_number, address, city, state, pincode, total_wings)
      VALUES ('soc-101', 'PlotSync Real Estate Platform', 'REG-1001', 'Main Boulevard', 'City', 'State', '400001', 2)
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);
    console.log('✅ Default society soc-101 inserted into societies table!');

    const phone = '98' + Math.floor(10000000 + Math.random() * 90000000);
    console.log('Testing SQL user registration with phone:', phone);

    const [res] = await db.query(
      `INSERT INTO users (id, society_id, full_name, phone_number, password_hash, email, role, resident_type, designation, status)
       VALUES (?, 'soc-101', ?, ?, ?, ?, ?, 'OWNER', ?, 'ACTIVE')`,
      ['usr-' + Date.now(), 'Direct Test User', phone, 'pass123', phone + '@test.com', 'BUILDER_ADMIN', 'Builder Administrator']
    );
    console.log('✅ User Inserted into XAMPP MySQL users table! ID:', res.insertId || 'Success');

    const [allUsers] = await db.query('SELECT id, full_name, phone_number, role, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('📊 Recent Users in XAMPP MySQL users table:', allUsers);

    await db.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
