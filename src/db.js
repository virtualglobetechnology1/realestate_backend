const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

// MySQL Connection Pool Settings
const pool = mysql.createPool({
  host: process.env.DB_HOST || '43.204.109.149  ',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'FThgQzGikOtMmojRBBPc',
  database: process.env.DB_NAME || 'realestate_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // Allows executing multi-statement SQL scripts
});

module.exports = pool;
