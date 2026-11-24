const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeMySQLDatabase() {
  console.log('====================================================');
  console.log('🔄 Initializing MySQL Database for SocietySync...');
  console.log('====================================================');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true,
  };

  try {
    // Step 1: Connect to MySQL Server (without selecting DB)
    console.log(`Connecting to MySQL at ${config.host}:${config.port} as user '${config.user}'...`);
    const connection = await mysql.createConnection(config);

    // Step 2: Create Database if not exists
    const dbName = process.env.DB_NAME || 'society_sync_db';
    console.log(`Creating database '${dbName}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);

    // Step 3: Execute Schema (schema.sql)
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('Reading database/schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log('Executing schema tables creation...');
      await connection.query(schemaSql);
      console.log('✅ Tables created successfully!');
    } else {
      console.error('❌ Error: schema.sql file not found at:', schemaPath);
    }

    // Step 4: Execute Seed Data (seed.sql)
    const seedPath = path.join(__dirname, '../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('Reading database/seed.sql...');
      let seedSql = fs.readFileSync(seedPath, 'utf8');
      
      // Replace PostgreSQL specific syntax if any for MySQL compatibility
      seedSql = seedSql.replace(/ON CONFLICT DO NOTHING/gi, '/* IGNORE */');
      
      console.log('Populating seed data...');
      try {
        await connection.query(seedSql);
        console.log('✅ Seed data inserted successfully!');
      } catch (seedErr) {
        console.log('Note: Seed data insertion warning (data may already exist):', seedErr.message);
      }
    }

    await connection.end();
    console.log('====================================================');
    console.log('🎉 MySQL Database Setup Complete!');
    console.log('Database Name: society_sync_db');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Failed to initialize MySQL Database:');
    console.error(error.message);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Ensure MySQL Server (XAMPP / WampServer / MySQL Service) is RUNNING.');
    console.log('2. Check your MySQL password. Set DB_PASSWORD environment variable if root has a password:');
    console.log('   set DB_PASSWORD=your_mysql_password');
    console.log('   node src/init_db.js');
  }
}

initializeMySQLDatabase();
