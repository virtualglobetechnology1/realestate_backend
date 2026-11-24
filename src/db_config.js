// ============================================================================
// SocietySync Database Connection Configuration Examples (PostgreSQL & MySQL)
// ============================================================================

/*
-------------------------------------------------------------------------------
1. PostgreSQL Connection Setup (using 'pg' package)
-------------------------------------------------------------------------------
Run: npm install pg

const { Pool } = require('pg');

const dbPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'society_sync_db',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

module.exports = dbPool;
*/

/*
-------------------------------------------------------------------------------
2. MySQL Connection Setup (using 'mysql2' package)
-------------------------------------------------------------------------------
Run: npm install mysql2

const mysql = require('mysql2/promise');

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'plot_manage_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = dbPool;
*/
